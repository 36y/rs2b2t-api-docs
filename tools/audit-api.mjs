#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import ts from 'typescript';

function usage() {
  console.error(`Usage: node tools/audit-api.mjs <rs2b0t-root> [--docs <docs-root>] [--out <report.md>] [--json <report.json>]\n\nAudits every exported value/class/function under src/bot/api/** against:\n  src/bot/runtime/abi.ts\n  packages/rs2b0t-api/index.js\n  packages/rs2b0t-api/index.d.ts\n  docs/**/*.md in the documentation repository\n`);
}

const args = process.argv.slice(2);
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  usage();
  process.exit(args.length === 0 ? 1 : 0);
}

const upstreamRoot = path.resolve(args[0]);
let docsRoot = process.cwd();
let outPath = null;
let jsonPath = null;
for (let i = 1; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--docs') docsRoot = path.resolve(args[++i]);
  else if (arg === '--out') outPath = path.resolve(args[++i]);
  else if (arg === '--json') jsonPath = path.resolve(args[++i]);
  else throw new Error(`Unknown argument: ${arg}`);
}

const apiRoot = path.join(upstreamRoot, 'src/bot/api');
const abiPath = path.join(upstreamRoot, 'src/bot/runtime/abi.ts');
const runtimePath = path.join(upstreamRoot, 'packages/rs2b0t-api/index.js');
const dtsPath = path.join(upstreamRoot, 'packages/rs2b0t-api/index.d.ts');
for (const required of [apiRoot, abiPath, runtimePath, dtsPath]) {
  if (!fs.existsSync(required)) throw new Error(`Missing required upstream path: ${required}`);
}

function walk(dir, predicate = () => true) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, predicate));
    else if (predicate(full)) out.push(full);
  }
  return out.sort();
}

function sourceFile(file, scriptKind) {
  return ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    scriptKind ?? (file.endsWith('.js') ? ts.ScriptKind.JS : ts.ScriptKind.TS)
  );
}

function hasModifier(node, kind) {
  return Boolean(node.modifiers?.some(m => m.kind === kind));
}

function nodeName(node) {
  const name = node.name;
  if (!name) return null;
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  if (ts.isComputedPropertyName(name)) {
    if (ts.isStringLiteral(name.expression) || ts.isNumericLiteral(name.expression)) return name.expression.text;
    return `[${name.expression.getText()}]`;
  }
  return name.getText();
}

function visibility(node) {
  if (hasModifier(node, ts.SyntaxKind.PrivateKeyword)) return 'private';
  if (hasModifier(node, ts.SyntaxKind.ProtectedKeyword)) return 'protected';
  return 'public';
}

function memberKind(node) {
  if (ts.isConstructorDeclaration(node)) return 'constructor';
  if (ts.isGetAccessorDeclaration(node)) return 'getter';
  if (ts.isSetAccessorDeclaration(node)) return 'setter';
  if (ts.isMethodDeclaration(node) || ts.isMethodSignature(node)) return 'method';
  if (ts.isPropertyDeclaration(node) || ts.isPropertySignature(node)) return 'property';
  return 'member';
}

function collectClassMembers(cls) {
  const rows = [];
  for (const member of cls.members) {
    const name = ts.isConstructorDeclaration(member) ? 'constructor' : nodeName(member);
    if (!name) continue;
    rows.push({
      name,
      kind: memberKind(member),
      visibility: visibility(member),
      static: hasModifier(member, ts.SyntaxKind.StaticKeyword),
      optional: Boolean(member.questionToken)
    });
  }
  return rows;
}

function collectObjectMembers(obj) {
  const rows = [];
  for (const prop of obj.properties) {
    if (ts.isSpreadAssignment(prop)) {
      rows.push({ name: `...${prop.expression.getText()}`, kind: 'spread', visibility: 'public', static: false, optional: false });
      continue;
    }
    const name = nodeName(prop);
    if (!name) continue;
    let kind = 'property';
    if (ts.isMethodDeclaration(prop)) kind = 'method';
    else if (ts.isGetAccessorDeclaration(prop)) kind = 'getter';
    else if (ts.isSetAccessorDeclaration(prop)) kind = 'setter';
    rows.push({ name, kind, visibility: 'public', static: false, optional: false });
  }
  return rows;
}

function unwrapObjectLiteral(expr) {
  if (!expr) return null;
  if (ts.isObjectLiteralExpression(expr)) return expr;
  if (ts.isParenthesizedExpression(expr)) return unwrapObjectLiteral(expr.expression);
  if (ts.isAsExpression(expr) || ts.isTypeAssertionExpression(expr) || ts.isSatisfiesExpression?.(expr)) return unwrapObjectLiteral(expr.expression);
  if (ts.isCallExpression(expr) && expr.arguments.length > 0) return unwrapObjectLiteral(expr.arguments[0]);
  return null;
}

function collectApiExports() {
  const files = walk(apiRoot, f => f.endsWith('.ts') && !f.endsWith('.d.ts'));
  const symbols = [];
  for (const file of files) {
    const sf = sourceFile(file);
    const rel = path.relative(upstreamRoot, file).replaceAll(path.sep, '/');
    for (const stmt of sf.statements) {
      const exported = hasModifier(stmt, ts.SyntaxKind.ExportKeyword);
      const isDefault = hasModifier(stmt, ts.SyntaxKind.DefaultKeyword);
      if (!exported) continue;

      if (ts.isVariableStatement(stmt)) {
        for (const decl of stmt.declarationList.declarations) {
          if (!ts.isIdentifier(decl.name)) continue;
          const obj = unwrapObjectLiteral(decl.initializer);
          symbols.push({
            name: decl.name.text,
            kind: 'const',
            default: false,
            file: rel,
            members: obj ? collectObjectMembers(obj) : []
          });
        }
      } else if (ts.isClassDeclaration(stmt)) {
        const name = stmt.name?.text ?? (isDefault ? '<default-class>' : '<anonymous-class>');
        symbols.push({ name, kind: 'class', default: isDefault, file: rel, members: collectClassMembers(stmt) });
      } else if (ts.isFunctionDeclaration(stmt)) {
        if (!stmt.name) continue;
        symbols.push({ name: stmt.name.text, kind: 'function', default: isDefault, file: rel, members: [] });
      } else if (ts.isEnumDeclaration(stmt)) {
        symbols.push({ name: stmt.name.text, kind: 'enum', default: false, file: rel, members: stmt.members.map(m => ({ name: nodeName(m), kind: 'enum-member', visibility: 'public', static: true, optional: false })).filter(m => m.name) });
      }
    }
  }
  return { files, symbols };
}

function collectAbiValues() {
  const sf = sourceFile(abiPath);
  for (const stmt of sf.statements) {
    if (!ts.isFunctionDeclaration(stmt) || stmt.name?.text !== 'installAbi' || !stmt.body) continue;
    for (const child of stmt.body.statements) {
      if (!ts.isVariableStatement(child)) continue;
      for (const decl of child.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name) || decl.name.text !== 'abi') continue;
        const obj = unwrapObjectLiteral(decl.initializer);
        if (!obj) continue;
        return new Set(collectObjectMembers(obj).filter(m => !m.name.startsWith('...')).map(m => m.name));
      }
    }
  }
  throw new Error('Could not locate installAbi() ABI object');
}

function collectRuntimeExports() {
  const sf = sourceFile(runtimePath, ts.ScriptKind.JS);
  const names = new Set();
  for (const stmt of sf.statements) {
    if (!ts.isExportDeclaration(stmt) || !stmt.exportClause || !ts.isNamedExports(stmt.exportClause)) continue;
    for (const element of stmt.exportClause.elements) names.add(element.name.text);
  }
  return names;
}

function collectDeclaredValuesAndMembers() {
  const sf = sourceFile(dtsPath);
  const values = new Map();
  const types = new Set();

  for (const stmt of sf.statements) {
    if (!hasModifier(stmt, ts.SyntaxKind.ExportKeyword)) continue;

    if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name)) continue;
        const members = new Set();
        if (decl.type && ts.isTypeLiteralNode(decl.type)) {
          for (const m of decl.type.members) {
            const name = nodeName(m);
            if (name) members.add(name);
          }
        }
        values.set(decl.name.text, { kind: 'const', members });
      }
    } else if (ts.isClassDeclaration(stmt) && stmt.name) {
      values.set(stmt.name.text, {
        kind: 'class',
        members: new Set(collectClassMembers(stmt).filter(m => m.visibility === 'public').map(m => m.name))
      });
    } else if (ts.isFunctionDeclaration(stmt) && stmt.name) {
      values.set(stmt.name.text, { kind: 'function', members: new Set() });
    } else if (ts.isEnumDeclaration(stmt)) {
      values.set(stmt.name.text, { kind: 'enum', members: new Set(stmt.members.map(nodeName).filter(Boolean)) });
    } else if ((ts.isInterfaceDeclaration(stmt) || ts.isTypeAliasDeclaration(stmt)) && stmt.name) {
      types.add(stmt.name.text);
    }
  }
  return { values, types };
}

function collectDocs() {
  const docsDir = path.join(docsRoot, 'docs');
  if (!fs.existsSync(docsDir)) return [];
  return walk(docsDir, f => f.endsWith('.md')).map(file => ({
    file: path.relative(docsRoot, file).replaceAll(path.sep, '/'),
    text: fs.readFileSync(file, 'utf8')
  }));
}

function docsFor(symbol, member, docs) {
  const symbolNeedle = symbol.toLowerCase();
  const memberNeedle = member?.toLowerCase();
  return docs
    .filter(d => {
      const text = d.text.toLowerCase();
      if (!text.includes(symbolNeedle)) return false;
      return memberNeedle ? text.includes(memberNeedle) : true;
    })
    .map(d => d.file);
}

const api = collectApiExports();
const abiValues = collectAbiValues();
const runtimeExports = collectRuntimeExports();
const declarations = collectDeclaredValuesAndMembers();
const docs = collectDocs();

function classifySymbol(name) {
  if (runtimeExports.has(name)) return declarations.values.has(name) ? 'public' : 'runtime-drift';
  if (abiValues.has(name)) return 'client-abi-only';
  return 'internal';
}

function classifyMember(symbolName, memberName, visibilityName) {
  if (visibilityName !== 'public') return 'internal-member';
  if (!abiValues.has(symbolName)) return 'internal';
  if (!runtimeExports.has(symbolName)) return 'client-abi-only';
  const declared = declarations.values.get(symbolName);
  if (!declared) return 'runtime-drift';
  return declared.members.has(memberName) ? 'public' : 'runtime-drift';
}

const symbolRows = api.symbols.map(symbol => ({
  ...symbol,
  classification: classifySymbol(symbol.name),
  inAbi: abiValues.has(symbol.name),
  runtimeExported: runtimeExports.has(symbol.name),
  declared: declarations.values.has(symbol.name),
  docs: docsFor(symbol.name, null, docs),
  members: symbol.members.map(member => ({
    ...member,
    classification: classifyMember(symbol.name, member.name, member.visibility),
    declared: declarations.values.get(symbol.name)?.members.has(member.name) ?? false,
    docs: docsFor(symbol.name, member.name, docs)
  }))
}));

const declarationBugs = [...declarations.values.keys()]
  .filter(name => !runtimeExports.has(name))
  .sort()
  .map(name => ({ name, kind: declarations.values.get(name).kind, inAbi: abiValues.has(name) }));

const abiOnly = [...abiValues].filter(name => !runtimeExports.has(name)).sort();
const runtimeNotDeclared = [...runtimeExports].filter(name => !declarations.values.has(name)).sort();
const runtimeNotAbi = [...runtimeExports].filter(name => !abiValues.has(name)).sort();

const allMembers = symbolRows.flatMap(s => s.members.map(m => ({ symbol: s.name, file: s.file, ...m })));
const counts = {
  apiFiles: api.files.length,
  exportedSymbols: symbolRows.length,
  exportedMembers: allMembers.length,
  publicSymbols: symbolRows.filter(s => s.classification === 'public').length,
  runtimeDriftSymbols: symbolRows.filter(s => s.classification === 'runtime-drift').length,
  abiOnlySymbolsInApiTree: symbolRows.filter(s => s.classification === 'client-abi-only').length,
  internalSymbols: symbolRows.filter(s => s.classification === 'internal').length,
  publicMembers: allMembers.filter(m => m.classification === 'public').length,
  runtimeDriftMembers: allMembers.filter(m => m.classification === 'runtime-drift').length,
  abiOnlyMembers: allMembers.filter(m => m.classification === 'client-abi-only').length,
  internalMembers: allMembers.filter(m => m.classification === 'internal' || m.classification === 'internal-member').length,
  undocumentedPublicOrDriftMembers: allMembers.filter(m => ['public', 'runtime-drift', 'client-abi-only'].includes(m.classification) && m.docs.length === 0).length,
  declarationBugs: declarationBugs.length
};

const report = {
  generatedAt: new Date().toISOString(),
  upstreamRoot,
  apiRoot,
  counts,
  abiOnly,
  runtimeNotDeclared,
  runtimeNotAbi,
  declarationBugs,
  symbols: symbolRows
};

function esc(value) {
  return String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function markdown() {
  const lines = [];
  lines.push('# Automated rs2b2t API symbol/member audit', '');
  lines.push(`Generated: ${report.generatedAt}`, '');
  lines.push('This report is generated from the TypeScript AST. It inventories every exported `const`, class, function and enum under `src/bot/api/**`, then cross-checks the symbol and its public members against the installed client ABI, the external runtime shim, package declarations, and Markdown documentation.', '');
  lines.push('## Counts', '');
  lines.push('| Metric | Count |', '| --- | ---: |');
  for (const [key, value] of Object.entries(counts)) lines.push(`| ${esc(key)} | ${value} |`);
  lines.push('', '## Boundary mismatches', '');
  lines.push(`- ABI-only values (all sources, not only api tree): ${abiOnly.length ? abiOnly.map(x => `\`${x}\``).join(', ') : 'none'}`);
  lines.push(`- Runtime exports without value declarations: ${runtimeNotDeclared.length ? runtimeNotDeclared.map(x => `\`${x}\``).join(', ') : 'none'}`);
  lines.push(`- Runtime exports absent from ABI object: ${runtimeNotAbi.length ? runtimeNotAbi.map(x => `\`${x}\``).join(', ') : 'none'}`);
  lines.push(`- Declared values not exported by runtime shim: ${declarationBugs.length ? declarationBugs.map(x => `\`${x.name}\``).join(', ') : 'none'}`);
  lines.push('', '## Exported source symbols', '');
  lines.push('| Symbol | Kind | Classification | ABI | Runtime | Declared | Docs | Source |', '| --- | --- | --- | :---: | :---: | :---: | --- | --- |');
  for (const s of symbolRows) {
    lines.push(`| \`${esc(s.name)}\` | ${s.kind} | **${s.classification}** | ${s.inAbi ? 'yes' : 'no'} | ${s.runtimeExported ? 'yes' : 'no'} | ${s.declared ? 'yes' : 'no'} | ${s.docs.length ? s.docs.map(esc).join('<br>') : '—'} | \`${esc(s.file)}\` |`);
  }
  lines.push('', '## Runtime/API-relevant member matrix', '');
  lines.push('Private/protected and source-internal members remain in the JSON report; this table focuses on public members of package-public, runtime-drift and ABI-only symbols.', '');
  lines.push('| Symbol.member | Kind | Classification | Declared | Docs | Source |', '| --- | --- | --- | :---: | --- | --- |');
  for (const m of allMembers.filter(m => ['public', 'runtime-drift', 'client-abi-only'].includes(m.classification))) {
    lines.push(`| \`${esc(m.symbol)}.${esc(m.name)}\` | ${m.kind}${m.static ? ' static' : ''} | **${m.classification}** | ${m.declared ? 'yes' : 'no'} | ${m.docs.length ? m.docs.map(esc).join('<br>') : '—'} | \`${esc(m.file)}\` |`);
  }
  lines.push('', '## Undocumented runtime/API-relevant members', '');
  const missing = allMembers.filter(m => ['public', 'runtime-drift', 'client-abi-only'].includes(m.classification) && m.docs.length === 0);
  if (missing.length === 0) lines.push('None detected by the same-file symbol/member text heuristic.');
  else for (const m of missing) lines.push(`- \`${m.symbol}.${m.name}\` — ${m.classification} — \`${m.file}\``);
  lines.push('', '## Notes', '');
  lines.push('- “Public” means the top-level value is runtime-exported and the member is represented in the package declaration.');
  lines.push('- “Runtime-drift” means the top-level value is externally exported but the implementation member is absent from the package declaration.');
  lines.push('- “Client-ABI-only” means installed on `globalThis.__rs2b0t` but omitted by the external runtime shim.');
  lines.push('- “Internal” means the exported source symbol is not installed in the client ABI. Exported-from-a-module is not the same as exported-to-third-party scripts.');
  lines.push('- Documentation detection is intentionally conservative: a docs file must contain both the symbol name and member name. Review reported misses manually for aliases and prose-only references.');
  lines.push('- Computed runtime mutation/monkey-patching after module initialization is outside static AST coverage and requires runtime inspection.');
  return `${lines.join('\n')}\n`;
}

const md = markdown();
if (outPath) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, md);
}
if (jsonPath) {
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
}

console.log(JSON.stringify(counts, null, 2));
if (!outPath) process.stdout.write(`\n${md}`);

# Script Development Setup

This guide takes you from a fresh machine to a compiled external script running in rs2b2t.

The recommended starting point is the upstream [`docs/script-template/`](https://github.com/rs2b2t/rs2b0t/tree/main/docs/script-template). It is already configured for TypeScript, Bun, `@rs2b0t/api`, ESM output, and the external-script bundle format expected by the client.

You do **not** need to create a TypeScript project from scratch, and for your first script you do **not** need to run a web server. The client can load the built `bot.js` file directly from your computer.

## Your Script Workspace

The rs2b0t repository contains many other files and directories used to build the client itself. You do not need to understand or modify them to write an external script.

After copying the template, the parts of the repository relevant to this guide will look like this:

```text
rs2b0t/
├─ ...                         # rest of the rs2b0t repository
├─ packages/
│  └─ rs2b0t-api/              # API used by your external script
├─ docs/
│  └─ script-template/         # original template — leave unchanged
└─ my-scripts/
   └─ my-first-script/         # your script workspace
      ├─ src/
      │  └─ ExampleBot.ts      # your TypeScript source
      ├─ package.json
      ├─ tsconfig.json
      ├─ bun.lock
      └─ dist/
         └─ bot.js             # generated build loaded into rs2b2t
```

For this guide, your work happens inside `my-scripts/my-first-script/`. The template references `packages/rs2b0t-api/` for the external scripting API. `src/ExampleBot.ts` is the TypeScript source you edit, and `dist/bot.js` is the generated file you load into rs2b2t.

## 1. Install the Basic Tools

You need:

- **Git** — to clone and update your fork.
- **Bun** — the package manager and bundler used by the official template.
- **A code editor** — VS Code is a common choice, but any TypeScript-capable editor works.
- **rs2b2t** — the easiest option is the official web client.

### Use the Official Web Client

You do not need to build the rs2b2t client locally just to develop an external script. You can use the official web client at:

[rs2b2t Web Client](https://rs2b2t.com/rs2b0t)

Choose whichever layout suits you:

| Client | Best for | Link |
| --- | --- | --- |
| **Single Bot** | One account in one tab. The classic client. | [Open Single Bot](https://w1.rs2b2t.com/rs2b0t) |
| **Multi Bot** | Several accounts in one tab with a live thumbnail of each. | [Open Multi Bot](https://w1.rs2b2t.com/rs2b0t/wall) |

Reference images are available for the [Single Bot](https://rs2b2t.com/img/rs2b0t/single.jpg) and [Multi Bot](https://rs2b2t.com/img/rs2b0t/multi.jpg) layouts.

### Check Git

Open PowerShell, Terminal, or your preferred shell and run:

```bash
git --version
```

If Git is installed you will see a version number. If the command is not found, install Git first and reopen your terminal.

### Install Bun

On macOS or Linux:

```bash
curl -fsSL https://bun.sh/install | bash
```

On Windows PowerShell:

```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

Close and reopen your terminal after installation, then verify it:

```bash
bun --version
```

A version number means Bun is ready.

## 2. Fork rs2b2t/rs2b0t

Open:

[rs2b2t/rs2b0t on GitHub](https://github.com/rs2b2t/rs2b0t)

Use GitHub's **Fork** button to create your own copy. Your fork will normally be available at:

```text
https://github.com/<your-username>/rs2b0t
```

The upstream template can also be copied into a completely separate repository, but keeping your first script inside your fork makes its local `@rs2b0t/api` dependency work without extra package setup.

## 3. Clone Your Fork

Choose a folder where you keep development projects, open a terminal there, and run:

```bash
git clone https://github.com/<your-username>/rs2b0t.git
cd rs2b0t
```

Replace `<your-username>` with your GitHub username.

Confirm you are in the repository root:

```bash
git status
```

You should see the current branch and a clean working tree.

Confirm the script template exists.

macOS / Linux:

```bash
ls docs/script-template
```

Windows PowerShell:

```powershell
Get-ChildItem docs/script-template
```

The template contains `README.md`, `package.json`, `tsconfig.json`, `bun.lock`, and `src/`.

## 4. Copy the Official Template

Do not edit `docs/script-template/` directly. Copy it and turn the copy into your own script project.

### macOS / Linux

From the `rs2b0t` repository root:

```bash
mkdir -p my-scripts
cp -R docs/script-template my-scripts/my-first-script
cd my-scripts/my-first-script
```

### Windows PowerShell

From the `rs2b0t` repository root:

```powershell
New-Item -ItemType Directory -Force my-scripts | Out-Null
Copy-Item -Recurse docs/script-template my-scripts/my-first-script
Set-Location my-scripts/my-first-script
```

The template currently depends on the API package with:

```json
"@rs2b0t/api": "file:../../packages/rs2b0t-api"
```

Because `my-scripts/my-first-script` is still two directories below the repository root, that path correctly resolves to:

```text
rs2b0t/packages/rs2b0t-api
```

You do not need to change it for the layout used in this guide.

## 5. Understand the Template

The important files are:

```text
package.json         build commands and @rs2b0t/api dependency
tsconfig.json        TypeScript compiler settings
src/ExampleBot.ts    example external bot
bun.lock             locked dependency versions
dist/bot.js          generated after the first build
```

The supplied `package.json` contains:

```json
"scripts": {
  "build": "bun build src/ExampleBot.ts --outfile dist/bot.js --format esm",
  "watch": "bun build src/ExampleBot.ts --outfile dist/bot.js --format esm --watch"
}
```

`bun run build` creates one ESM bundle at `dist/bot.js`. `bun run watch` stays running and rebuilds whenever you save the source file.

The TypeScript configuration uses strict checking and includes DOM types, which is why browser types such as `CanvasRenderingContext2D` are available to `onPaint()`.

## 6. Install the Script Dependencies

Still inside:

```text
rs2b0t/my-scripts/my-first-script
```

run:

```bash
bun install
```

This installs the template's development dependencies and links your script to the `@rs2b0t/api` package in your fork.

If installation fails with an error mentioning `../../packages/rs2b0t-api`, confirm your script is in the directory layout shown above and that `rs2b0t/packages/rs2b0t-api` exists.

## 7. Build the Untouched Example First

Before writing your own code, prove that the development environment works:

```bash
bun run build
```

A successful build creates:

```text
dist/bot.js
```

Check it exists.

macOS / Linux:

```bash
ls -lh dist/bot.js
```

Windows PowerShell:

```powershell
Get-Item dist/bot.js
```

If the untouched template does not build, fix that first. This keeps environment problems separate from bugs in your own script.

## 8. What the Example Bot Does

Open:

```text
src/ExampleBot.ts
```

The supplied example is an external `BoneBurier`. It demonstrates public `@rs2b0t/api` imports, `LoopingBot`, `Execution` waits, inventory state, ground-item queries, interactions, state verification, bot-scoped events, logging, and an `onPaint()` overlay.

The end of the file default-exports a `defineBot({...})` manifest:

```ts
export default defineBot({
  name: 'BoneBurier',
  version: '0.1.0',
  description: 'External example: loots and buries nearby bones',
  create: () => new BoneBurier()
});
```

That default export is how the external-script loader discovers your bot. Keep this pattern when creating your own script.

## 9. Load `dist/bot.js` Directly — Easiest Method

For your first script, **you do not need to serve the file over HTTP**.

The current rs2b2t script library has a **Load local script…** button that accepts `.js` and `.mjs` files. Internally, the client creates a temporary browser URL for the file and imports it for you.

After `bun run build`:

1. Open the official Single Bot or Multi Bot web client.
2. Open the rs2b2t script panel / script library.
3. Find **load external script**.
4. Click **Load local script…**.
5. Browse to your project folder.
6. Open:

```text
my-scripts/my-first-script/dist/bot.js
```

7. The client should report that the script loaded and select it.
8. Start the bot from the client UI.

That is the complete first-run path:

```text
bun run build
        ↓
dist/bot.js
        ↓
Load local script…
        ↓
select dist/bot.js
        ↓
start the bot
```

No localhost server, hosting account, upload, port number, or networking knowledge is required.

::: tip Start with local loading
Use **Load local script…** while learning and developing. **Load URL** is useful later if you specifically want the client to fetch your built bundle from a URL.
:::

## 10. Make Your First Safe Change

Once the untouched example builds and loads, change something simple so you can prove the edit/build/load cycle works.

For example, change the manifest metadata:

```ts
export default defineBot({
  name: 'My First Script',
  version: '0.1.0',
  description: 'My first external rs2b2t script',
  create: () => new BoneBurier()
});
```

You could also change the text drawn in `onPaint()`.

Save the file and rebuild:

```bash
bun run build
```

If the old copy is currently loaded, stop it before reloading. Then use **Load local script…** again and select the newly rebuilt `dist/bot.js`.

Confirm the new script name or paint text appears.

You have now completed the normal development cycle:

```text
edit TypeScript → build → load local file → test
```

## 11. Use Watch Mode While Developing

Re-running the build command after every edit becomes repetitive. Instead run:

```bash
bun run watch
```

Leave that terminal open. Every time you save `src/ExampleBot.ts`, Bun rebuilds `dist/bot.js` automatically.

Your normal workflow becomes:

```text
1. bun run watch
2. edit and save ExampleBot.ts
3. stop the old running script if necessary
4. Load local script…
5. choose dist/bot.js
6. test
```

You only need one terminal for this workflow.

## 12. Optional: Load From a URL

The script library also supports **Load URL**. This is useful when you intentionally want to host or serve `dist/bot.js`, but it is not required for beginner development.

The upstream template describes this workflow as serving `dist/bot.js` over HTTP and giving the client its URL. If you later want to use that method, the important idea is simply that the URL must point directly to the built JavaScript module.

For example:

```text
https://example.com/my-bot/bot.js
```

For day-to-day local development, **Load local script…** is simpler and avoids local-server and browser cross-origin setup entirely.

## 13. Turn the Example Into Your Own Bot

For your first experiments it is fine to keep the filename `ExampleBot.ts`.

When you want a real name, rename it, for example:

```text
src/CasketOpener.ts
```

Then update both commands in `package.json`:

```json
"scripts": {
  "build": "bun build src/CasketOpener.ts --outfile dist/bot.js --format esm",
  "watch": "bun build src/CasketOpener.ts --outfile dist/bot.js --format esm --watch"
}
```

You can also rename the package:

```json
"name": "casket-opener"
```

Run another build after changing the entry filename:

```bash
bun run build
```

## 14. A Good First Script Structure

Start with something small enough that you can see it working before adding game interactions:

```ts
import { defineBot, Execution, Game, LoopingBot } from '@rs2b0t/api';

class MyFirstBot extends LoopingBot {
  override async onStart(): Promise<void> {
    await Execution.delayUntil(() => Game.ingame(), 0);
    this.log('MyFirstBot started');
  }

  override async loop(): Promise<void> {
    const tile = Game.tile();
    if (tile) {
      this.log(`Standing at ${tile.x}, ${tile.z}, level ${tile.level}`);
    }

    await Execution.delayTicks(2);
  }

  override onPaint(ctx: CanvasRenderingContext2D): void {
    ctx.font = '12px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('MyFirstBot is running', 12, 22);
  }
}

export default defineBot({
  name: 'My First Bot',
  version: '0.1.0',
  description: 'First external rs2b2t script',
  create: () => new MyFirstBot()
});
```

Build this, load `dist/bot.js`, and confirm you see its log/overlay before adding inventory actions, NPC interactions, banking, navigation, or other automation.

## 15. Keep Your Script in Git

From the repository root, inspect what changed:

```bash
git status
```

When you are happy with your first version:

```bash
git add my-scripts/my-first-script
git commit -m "add my first external script"
git push
```

Your source is now backed up in your fork.

When upstream changes, review updates to `packages/rs2b0t-api` and `docs/script-template`. They may contain new API capabilities, declaration fixes, or improvements to the recommended project setup.

## 16. Using AI or a Coding Assistant

AI tools can be useful for external scripts, but rs2b2t has its own API and runtime rules. A model that guesses based on another RuneScape client can produce convincing TypeScript that simply does not exist in `@rs2b0t/api`.

Give the assistant this documentation site and the current rs2b2t source, then make the package boundary explicit. A useful starting prompt is:

```text
I am writing an external rs2b2t TypeScript script based on the official
rs2b0t docs/script-template project.

The script compiles against @rs2b0t/api.
Use the rs2b2t API documentation and current rs2b2t/rs2b0t source as the
source of truth.

Do not invent APIs or substitute APIs from RuneLite, OSBot, DreamBot, or
other clients. Prefer documented public external APIs. If something is
runtime/declaration drift, client-ABI-only, internal, or unavailable,
explicitly tell me before using it.

Use Execution for waits. Await interactions and verify important outcomes
from game state instead of assuming a click succeeded.

Keep long-running game logic out of onPaint().
```

When asking an AI to change your bot, give it your existing source file rather than asking it to recreate the whole project. The official template already provides the bundling, module, TypeScript, and API setup.

A useful review prompt is:

```text
Audit this external rs2b2t script for invented or undocumented API calls,
unsafe waits, unverified interactions, and state transitions that can get
stuck. Do not rewrite it until you have listed the issues.
```

## Troubleshooting

### `bun: command not found`

Reopen your terminal after installing Bun. If it still fails, make sure Bun's install directory has been added to your `PATH`.

### `Cannot find module '@rs2b0t/api'`

Run:

```bash
bun install
```

Then confirm `package.json` contains the correct relative dependency for the layout used here:

```json
"@rs2b0t/api": "file:../../packages/rs2b0t-api"
```

and confirm this folder exists:

```text
rs2b0t/packages/rs2b0t-api
```

### `dist/bot.js` does not exist

Run:

```bash
bun run build
```

Read the first build error in the terminal and fix that before trying to load the script.

### I cannot find `dist/bot.js` in the file picker

Make sure you built the script first. The file is generated; it does not exist in a fresh template until `bun run build` succeeds.

The expected path is:

```text
rs2b0t/my-scripts/my-first-script/dist/bot.js
```

### The client says the module default export is not a `defineBot(...)` manifest

Check the bottom of your entry file. It must default-export `defineBot({...})`.

### The client says the script is already running or paused

Stop the currently loaded copy before reloading the same script. The loader deliberately refuses to replace an active script with the same name.

### The script builds but fails when loaded

The `@rs2b0t/api` package is a runtime shim over the API installed by the client. A client/API ABI-version mismatch can therefore fail at load time even though TypeScript compilation succeeded.

### TypeScript accepts something but the bot behaves incorrectly

Compilation only proves the types are acceptable. A dispatched interaction is not proof that the game completed the action. Verify important outcomes from game state and continue with [Writing Reliable Scripts](/guide/patterns).

## Next Steps

Once you can repeatedly edit, build, load `dist/bot.js`, and test your changes, your development environment is ready.

Continue with:

- [Writing Reliable Scripts](/guide/patterns) for state verification, waits, recovery, and bot structure.
- [API Reference](/api/) to discover supported external scripting APIs.
- [Canvas & Overlays](/api/canvas) for `onPaint()` displays.
- [Coverage & Drift Audit](/api/coverage) before relying on unusual or under-typed runtime behavior.

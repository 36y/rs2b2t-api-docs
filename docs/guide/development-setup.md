# Script Development Setup

This guide takes you from a fresh machine and a fork of `rs2b2t/rs2b0t` to a compiled external script that the client can load.

The recommended starting point is the upstream [`docs/script-template/`](https://github.com/rs2b2t/rs2b0t/tree/main/docs/script-template). It is already configured for TypeScript, Bun, `@rs2b0t/api`, ESM output, and the external-script bundle format expected by the client.

You do **not** need to build a TypeScript project from scratch.

## What You Will End Up With

By the end of this guide you will have:

```text
rs2b0t/
├─ packages/
│  └─ rs2b0t-api/
├─ docs/
│  └─ script-template/
└─ my-scripts/
   └─ my-first-script/
      ├─ src/
      │  └─ ExampleBot.ts
      ├─ package.json
      ├─ tsconfig.json
      ├─ bun.lock
      └─ dist/
         └─ bot.js
```

`src/ExampleBot.ts` is the source you edit. `dist/bot.js` is the bundle you load into rs2b2t.

## 1. Install the Basic Tools

You need:

- **Git** — to clone and update your fork.
- **Bun** — the package manager and bundler used by the official template.
- **A code editor** — VS Code is a common choice, but any TypeScript-capable editor works.
- **rs2b2t** — running far enough that you can open its script panel and use **Load URL**.

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

Open the upstream repository:

[rs2b2t/rs2b0t on GitHub](https://github.com/rs2b2t/rs2b0t)

Use GitHub's **Fork** button to create your own copy. Your fork will normally be available at:

```text
https://github.com/<your-username>/rs2b0t
```

Keeping your first external scripts inside your fork makes the template's local `@rs2b0t/api` dependency easy to use while you are learning.

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

It is also useful to confirm the template exists:

```bash
ls docs/script-template
```

On PowerShell you can use:

```powershell
Get-ChildItem docs/script-template
```

The template contains `README.md`, `package.json`, `tsconfig.json`, `bun.lock`, and `src/`.

## 4. Copy the Official Template

Do not edit `docs/script-template/` directly. Copy it and turn the copy into your script project.

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

The template's dependency is currently:

```json
"@rs2b0t/api": "file:../../packages/rs2b0t-api"
```

Because `my-scripts/my-first-script` is still two directory levels below the repository root, that path continues to resolve correctly to the fork's `packages/rs2b0t-api/` directory. You do not need to change it for this layout.

If you later move the script into a completely separate repository, you must repoint that `file:` dependency to a reachable copy of `@rs2b0t/api`.

## 5. Understand the Template Before Changing It

The important files are:

```text
package.json         build commands and @rs2b0t/api dependency
tsconfig.json        TypeScript compiler settings
src/ExampleBot.ts    example external bot
bun.lock             locked dependency versions
dist/bot.js          generated after the first build
```

The supplied `package.json` has two useful commands:

```json
"build": "bun build src/ExampleBot.ts --outfile dist/bot.js --format esm",
"watch": "bun build src/ExampleBot.ts --outfile dist/bot.js --format esm --watch"
```

`bun run build` creates one ESM bundle at `dist/bot.js`. `bun run watch` stays running and rebuilds whenever you save the source file.

The TypeScript configuration enables strict checking and includes DOM types, which is why things such as `CanvasRenderingContext2D` work in `onPaint()`.

## 6. Install the Script Dependencies

Still inside `my-scripts/my-first-script`, run:

```bash
bun install
```

This installs TypeScript and links your script to the `@rs2b0t/api` package in the fork.

If installation fails with an error mentioning `../../packages/rs2b0t-api`, first check that your current folder really is:

```text
rs2b0t/my-scripts/my-first-script
```

and that this exists:

```text
rs2b0t/packages/rs2b0t-api
```

## 7. Build the Untouched Example First

Before writing any code, prove that the toolchain works:

```bash
bun run build
```

The template builds:

```text
dist/bot.js
```

Check that it exists.

macOS / Linux:

```bash
ls -lh dist/bot.js
```

PowerShell:

```powershell
Get-Item dist/bot.js
```

If the untouched template does not build, fix the environment before changing `ExampleBot.ts`. This prevents setup problems and script problems from becoming mixed together.

## 8. What the Example Bot Does

Open:

```text
src/ExampleBot.ts
```

The supplied example is a small external `BoneBurier` bot. It demonstrates several important rs2b2t patterns in one file:

- imports exclusively from `@rs2b0t/api`;
- extends `LoopingBot`;
- waits for the game using `Execution`;
- reads inventory state;
- queries nearby ground items;
- interacts with entities;
- verifies that actions actually changed game state;
- listens to bot-scoped events;
- logs useful progress;
- draws an overlay with `onPaint()`;
- default-exports a `defineBot({...})` registration.

The final export is important:

```ts
export default defineBot({
  name: 'BoneBurier',
  version: '0.1.0',
  description: 'External example: loots and buries nearby bones',
  create: () => new BoneBurier()
});
```

The client loads that default export from your bundle. Do not replace it with a normal `new BoneBurier()` export.

## 9. Serve `dist/bot.js`

The client loads external bundles by URL, so the built JavaScript file must be available over HTTP.

A convenient development option is to serve the `dist` directory with Bun. From the script directory, open a second terminal and run:

```bash
bunx serve dist -l 8000
```

Leave that terminal running.

Your bundle should then be available at:

```text
http://localhost:8000/bot.js
```

Open that URL in your browser. If you see JavaScript source or the file downloads successfully, the server is reaching the bundle.

If port `8000` is already occupied, choose another port, for example:

```bash
bunx serve dist -l 8080
```

and use `http://localhost:8080/bot.js` instead.

## 10. Load the Script in rs2b2t

With rs2b2t running:

1. Open the client's script panel.
2. Choose **Load URL**.
3. Enter the bundle URL, for example:

```text
http://localhost:8000/bot.js
```

4. Load the script.
5. Select/start the bot from the client UI.

The package shim expects the rs2b2t client to have installed its scripting ABI at `globalThis.__rs2b0t`. If you try to execute the bundle as an ordinary webpage or Node/Bun program, it is expected to fail because that client ABI is not present.

## 11. Make Your First Safe Change

Once the untouched example builds and loads, change something that cannot break game logic. For example, change the metadata:

```ts
export default defineBot({
  name: 'My First Script',
  version: '0.1.0',
  description: 'My first external rs2b2t script',
  create: () => new BoneBurier()
});
```

You could also change the overlay text in `onPaint()`.

Then rebuild:

```bash
bun run build
```

Reload the URL/script in the client and confirm your new name or paint text appears.

At this point you have completed the entire development cycle:

```text
edit TypeScript → build → serve → load → test
```

## 12. Use Watch Mode While Developing

Re-running the build command after every edit gets tedious. Use the template's watch command:

```bash
bun run watch
```

A useful development setup is therefore two terminals.

Terminal 1:

```bash
cd rs2b0t/my-scripts/my-first-script
bun run watch
```

Terminal 2:

```bash
cd rs2b0t/my-scripts/my-first-script
bunx serve dist -l 8000
```

Now saving `src/ExampleBot.ts` automatically rebuilds `dist/bot.js`. Reload the script in rs2b2t when you want to test the new bundle.

## 13. Rename the Example Into Your Own Bot

For your first script it is fine to leave the filename as `ExampleBot.ts`. Once you are comfortable, you can rename it, for example:

```text
src/CasketOpener.ts
```

If you rename the entry file, update both build commands in `package.json`:

```json
"scripts": {
  "build": "bun build src/CasketOpener.ts --outfile dist/bot.js --format esm",
  "watch": "bun build src/CasketOpener.ts --outfile dist/bot.js --format esm --watch"
}
```

You should also give the project a useful package name:

```json
"name": "casket-opener"
```

Then run another clean build:

```bash
bun run build
```

## 14. Keep Your Script in Git

From the repository root, inspect what you created:

```bash
git status
```

When you are happy with the first version:

```bash
git add my-scripts/my-first-script
git commit -m "add my first external script"
git push
```

Your script source is now backed up in your fork and can evolve independently of the upstream template.

When you later pull changes from upstream, review changes to `packages/rs2b0t-api` and the official template because they can expose new API capabilities or template improvements.

## 15. A Good First Script Structure

Do not try to automate an entire activity in your first edit. Start with a small observable loop:

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

Build and load this before adding interactions. Then add one API family at a time: inventory, entities, navigation, banking, dialogue, and so on.

## 16. Using AI or a Coding Assistant

AI tools can be useful for external scripts, but rs2b2t has its own API and runtime rules. A model that guesses based on other RuneScape clients can produce convincing code that does not exist in `@rs2b0t/api`.

Give the assistant this documentation site and the source repository, and make the boundary explicit. A useful starting prompt is:

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

When asking AI to change your bot, include the current script rather than asking it to recreate the whole project. The official template already solves the bundling, TypeScript, module, and ABI setup.

A particularly useful request is:

```text
Audit this external rs2b2t script for invented or undocumented API calls,
unsafe waits, unverified interactions, and state transitions that can get
stuck. Do not rewrite it until you have listed the issues.
```

## Troubleshooting

### `bun: command not found`

Reopen the terminal after installing Bun. If it still fails, follow Bun's installer instructions for adding Bun to your `PATH`.

### `Cannot find module '@rs2b0t/api'`

Run:

```bash
bun install
```

If that does not fix it, check `package.json` and confirm the relative path still reaches:

```text
rs2b0t/packages/rs2b0t-api
```

For the layout used in this guide it should be:

```json
"@rs2b0t/api": "file:../../packages/rs2b0t-api"
```

### `dist/bot.js` does not exist

Run:

```bash
bun run build
```

Read the first TypeScript/build error shown in the terminal. Fix that error before worrying about the client.

### The browser cannot open `localhost:8000/bot.js`

Make sure the static-file server is still running:

```bash
bunx serve dist -l 8000
```

Also verify that `dist/bot.js` exists before starting the server.

### The URL loads, but rs2b2t rejects the bundle

Check that the script still default-exports `defineBot({...})`. Also check for an ABI-version mismatch: `@rs2b0t/api` is a shim over the API installed by the client and refuses incompatible ABI versions.

### TypeScript accepts something but the behavior is wrong

Compilation only proves the types are acceptable. Interaction success should normally be verified by observing game state with `Execution.delayUntil()` or tick-based waits. Continue with [Writing Reliable Scripts](/guide/patterns).

## Next Steps

Once you can repeatedly edit, build, serve, and load the script, your environment is finished. From there:

- read [Writing Reliable Scripts](/guide/patterns) before building longer action sequences;
- use the [API Reference](/api/) to discover supported script APIs;
- use [Canvas & Overlays](/api/canvas) for status displays;
- check [Coverage & Drift Audit](/api/coverage) before relying on unusual or under-typed runtime behavior.

# ABI and package boundary

The rs2b0t scripting system has two related but distinct runtime surfaces, plus declarations and source implementation that can occasionally drift from them.

## Client ABI

At runtime the client installs an object at:

```ts
globalThis.__rs2b0t
```

The ABI has a numeric version. The current source uses API version 1.

## `@rs2b0t/api`

The external package reads `globalThis.__rs2b0t`, validates the version and re-exports the supported external symbols.

Conceptually:

```text
external bot
    |
    v
@rs2b0t/api
    |
    v
globalThis.__rs2b0t
    |
    v
rs2b0t client
```

The package is therefore not a standalone game-client SDK. It expects to run inside an rs2b0t bot bundle.

## Why this documentation classifies symbols

The client ABI contains facilities that the external package does not export, and exported runtime classes/objects can also contain members that the external `.d.ts` does not accurately describe.

A symbol existing somewhere under `src/bot/**` does **not** make it a public scripting API.

The documentation uses these classifications:

| Classification | Meaning |
| --- | --- |
| Public External API | Runtime package export and external declaration agree |
| Runtime/Declaration Drift | Runtime and `.d.ts` disagree about a member, signature, type or reachable behavior |
| Reachable Implementation Detail | Reachable through an exported runtime object/class, but intended for host or low-level implementation work rather than normal scripts |
| Client ABI Only | Installed on `globalThis.__rs2b0t`, but not re-exported by `@rs2b0t/api` |
| Internal | Source-only implementation detail that does not cross the package/ABI boundary |
| Pending | Proposed or unmerged external API |

A declaration bug is recorded when the `.d.ts` promises something the runtime package shim does not actually provide.

See [Source of Truth](/contributing/source-of-truth) and [Coverage & Drift Audit](/api/coverage).

# ABI and package boundary

The rs2b0t scripting system has two related but distinct surfaces.

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

The client ABI contains a few facilities that the external package does not export, including client/debug/harness-oriented members.

A symbol existing somewhere under `src/bot/**` does **not** make it a public scripting API.

The documentation uses these classifications:

| Classification | Meaning |
| --- | --- |
| Public | Exported by `@rs2b0t/api` and documented for external scripts |
| Client ABI | Installed on `globalThis.__rs2b0t`, but not guaranteed as a normal external package export |
| Internal | Source implementation detail |
| Pending | Proposed in an unmerged change |

See [Source of truth](/contributing/source-of-truth).

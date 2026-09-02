# Source of truth

The goal of rs2b2t.com is to avoid becoming another stale API site. Documentation changes should be checked against the current `rs2b2t/rs2b0t` source.

## Required sources

1. `src/bot/runtime/abi.ts` — what the client installs into `globalThis.__rs2b0t`.
2. `packages/rs2b0t-api/index.js` — what an external script actually receives at runtime.
3. `packages/rs2b0t-api/index.d.ts` — what TypeScript believes the external package exposes.
4. `src/bot/api/**` — real implementation semantics.
5. `docs/reference/**` and architecture decisions — intended behavior and operational caveats.

## Classification

Every documented symbol belongs to one category: **Public external API**, **Client ABI only**, **Internal**, or **Pending**.

## Handling drift

If `abi.ts`, `index.js`, `index.d.ts`, implementation, and reference docs disagree, the documentation should **describe the disagreement explicitly**, not silently choose whichever file is easiest.

## Updating this site

When rs2b0t changes, identify changed API/runtime files, verify whether the change is client-only or public, update signatures and semantics, update examples, and only document an open PR as stable after it merges.

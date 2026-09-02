# Source of Truth

The goal of this documentation site is to avoid becoming another stale API site. Documentation changes should be checked against the current `rs2b2t/rs2b0t` source.

## Required Sources

1. `src/bot/runtime/abi.ts` — what the client installs into `globalThis.__rs2b0t`.
2. `packages/rs2b0t-api/index.js` — what an external script actually receives at runtime.
3. `packages/rs2b0t-api/index.d.ts` — what TypeScript believes the external package exposes.
4. `src/bot/api/**` — real implementation semantics.
5. `docs/reference/**` and architecture decisions — intended behavior and operational caveats.

## Classification

Every documented symbol belongs to one category: **Public External API**, **Runtime/Declaration Drift**, **Client ABI Only**, **Internal**, or **Pending**.

A source module being exported does not by itself make it external API. The runtime package boundary and installed ABI decide reachability.

## Handling Drift

If `abi.ts`, `index.js`, `index.d.ts`, implementation, and reference docs disagree, the documentation should **describe the disagreement explicitly**, not silently choose whichever file is easiest.

The automated member audit is a discovery tool, not a substitute for source review. Generic maps such as `Readonly<Record<string, number>>` and settings schemas can produce apparent per-key declaration misses unless the auditor resolves their container type. Those findings must be normalized before being called runtime drift.

## Updating This Site

When rs2b0t changes, run the generated symbol/member audit, manually verify every new boundary mismatch against source and declarations, update signatures and semantics, update examples, and only document an open PR as stable after it merges.

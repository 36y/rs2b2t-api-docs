# Source of Truth

The goal of this documentation site is to avoid becoming another stale API site. Documentation changes should be checked against the current `rs2b2t/rs2b0t` source.

## Required Sources

1. `src/bot/runtime/abi.ts` — what the client installs into `globalThis.__rs2b0t`.
2. `packages/rs2b0t-api/index.js` — what an external script actually receives at runtime.
3. `packages/rs2b0t-api/index.d.ts` — what TypeScript believes the external package exposes.
4. `src/bot/api/**` — real implementation semantics.
5. `docs/reference/**` and architecture decisions — intended behavior and operational caveats.

## Classification

Every documented symbol or behavior belongs to one category:

- **Public External API** — runtime package export and external declaration agree.
- **Runtime/Declaration Drift** — runtime behavior and the external declaration disagree about a member, signature, type or reachable behavior.
- **Reachable Implementation Detail** — reachable through an exported runtime object/class but intended for host plumbing or low-level implementation rather than normal scripts.
- **Client ABI Only** — installed in `globalThis.__rs2b0t` but not re-exported by `@rs2b0t/api`.
- **Internal** — source-only implementation that does not cross the external package/ABI boundary.
- **Pending** — proposed or unmerged external API.

A **declaration bug** is an audit finding, not a separate surface category: the declaration promises a value or shape that the runtime package does not actually provide.

A source module being exported does not by itself make it external API. The runtime package boundary and installed ABI decide reachability.

## Handling Drift

If `abi.ts`, `index.js`, `index.d.ts`, implementation, and reference docs disagree, the documentation should **describe the disagreement explicitly**, not silently choose whichever file is easiest.

The automated member audit is a discovery tool, not a substitute for source review. Generic maps such as `Readonly<Record<string, number>>` and settings schemas can produce apparent per-key declaration misses unless the auditor resolves their container type. Those findings must be normalized before being called runtime drift.

Member presence is also not enough to prove API equality. Parameter lists, callback types, return types, access modifiers, interface fields and runtime semantics need separate comparison. For example, a method can exist in both implementation and `.d.ts` while still having signature drift.

## Updating This Site

When rs2b0t changes, run the generated symbol/member audit, manually verify every new boundary mismatch against source and declarations, check signature/type drift, update semantics and examples, and only document an open PR as stable after it merges.

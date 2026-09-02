---
layout: home

hero:
  name: rs2b2t
  text: scripting API documentation
  tagline: Independent, source-grounded documentation for the rs2b2t client API.
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: API reference
      link: /api/
    - theme: alt
      text: Source on GitHub
      link: https://github.com/rs2b2t/rs2b0t

features:
  - title: Based on rs2b2t source
    details: The current rs2b2t source, ABI and external package are the authority; older/reference sites are comparison material, not the contract.
  - title: External API vs client internals
    details: Surfaces are classified so script authors can distinguish package exports, declaration drift, client-ABI capabilities, implementation details and pending changes.
  - title: Runtime semantics included
    details: Covers waits, action confirmation, scene readiness, bank readiness, navigation, loop cadence and watchdog behavior.
---

## What this site documents

This is independent developer documentation for the **rs2b2t client and scripting API**, whose source currently lives in the `rs2b2t/rs2b0t` repository.

rs2b2t is based on the rsb0t/rs2b0t lineage, but this documentation follows the current rs2b2t source rather than assuming another project's API remains identical.

The primary external scripting package in the current source is:

```ts
import { ... } from '@rs2b0t/api';
```

The site uses the same boundary classifications throughout:

- **Public external API** — runtime package export and external declaration agree.
- **Runtime/declaration drift** — the current runtime and external TypeScript declaration disagree about a member, signature, type or other reachable behavior.
- **Reachable implementation detail** — technically reachable through an exported runtime object/class, but intended for host plumbing or low-level implementation rather than ordinary scripts.
- **Client ABI only** — installed on `globalThis.__rs2b0t` but not re-exported by `@rs2b0t/api`.
- **Internal** — source-only implementation that does not cross the external package/ABI boundary.
- **Pending** — proposed or unmerged external API.

A declaration bug is recorded as an audit finding when the `.d.ts` promises something the runtime package shim does not actually export.

The current rs2b2t source is the primary authority. The 2004bot API site is useful historical/reference material, but differences are resolved in favor of the current rs2b2t source and package boundary and are called out explicitly.

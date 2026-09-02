---
layout: home

hero:
  name: rs2b2t
  text: rs2b0t client documentation
  tagline: Complete, source-grounded documentation for the rs2b0t scripting API and runtime.
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: API reference
      link: /api/
    - theme: alt
      text: rs2b0t on GitHub
      link: https://github.com/rs2b2t/rs2b0t

features:
  - title: Based on the source
    details: Documents what rs2b0t actually installs and exports instead of inheriting stale third-party API notes.
  - title: External API vs client internals
    details: Every surface is classified so script authors know what is stable and what is client-only.
  - title: Runtime semantics included
    details: Covers waits, action confirmation, scene transitions, bank readiness, navigation and watchdog behavior.
---

## What this site documents

This is the independent documentation site for the
[`rs2b2t/rs2b0t`](https://github.com/rs2b2t/rs2b0t) client.

The primary public scripting package is:

```ts
import { ... } from '@rs2b0t/api';
```

The docs distinguish three important surfaces:

- **Public external API** — exported by `@rs2b0t/api` and intended for external scripts.
- **Client ABI only** — installed by the client at `globalThis.__rs2b0t` but not necessarily exported by the package.
- **Internal implementation** — source implementation details that third-party scripts should not import directly.

That distinction is intentional and is central to keeping this documentation accurate.

# rs2b2t Documentation

Independent documentation site for the [rs2b2t/rs2b0t](https://github.com/rs2b2t/rs2b0t) client and its external scripting API.

The intended production domain is:

- https://rs2b2t.com/

The documentation is source-grounded against the rs2b0t repository. The supported external scripting contract is determined by all of:

1. `src/bot/runtime/abi.ts`
2. `packages/rs2b0t-api/index.js`
3. `packages/rs2b0t-api/index.d.ts`
4. `src/bot/api/**`
5. `docs/reference/**`

See `docs/contributing/source-of-truth.md` for the API classification policy.

## Local development

```bash
npm install
npm run docs:dev
```

Build:

```bash
npm run docs:build
```

Preview:

```bash
npm run docs:preview
```

## Deployment

A GitHub Pages workflow is included in `.github/workflows/docs.yml`.

The VitePress public directory includes a `CNAME` for `rs2b2t.com`.

# Skills

```ts
Skills.index(name): number
Skills.level(name): number
Skills.effective(name): number
Skills.xp(name): number
Skills.hpFraction(): number
```

`level()` is the base/unboosted level.

`effective()` is the current boosted/drained level.

`xp()` returns current experience.

`hpFraction()` returns effective hitpoints divided by base hitpoints. Treat login/stat-readiness separately rather than using this as a login detector.

## Prayer note

The current client source and ABI contain a typed `Prayer` object, but the external `@rs2b0t/api` shim inspected on upstream `main` does not currently re-export it. See [Client-ABI-only APIs](/api/client-only).

# Navigation

## `Traversal`

World-scale navigation over the baked collision/transport graph.

```ts
Traversal.walkTo(dest, opts?): Promise<boolean>
Traversal.walkResilient(dest, opts): Promise<boolean>
Traversal.preload(): void
Traversal.remaining(): number
```

`walkTo()` supports arrival radius, timeout, logging, A* expansion budget, teleport policy, bank counts, and danger/no-go zones.

```ts
await Traversal.walkTo(new Tile(3208, 3220, 0), {
  radius: 2,
  avoidZones: ['white-wolf-mountain'],
  log: msg => this.log(msg)
});
```

`walkResilient()` adds an escalation/recovery ladder and is preferable for long unattended trips. Its current implementation can fall through baked walking, same-scene walking, nearby-door recovery, local unstick steps, backoff and reachability verification before declaring a destination unreachable.

## Teleport policy helpers

The current `Traversal` implementation exposes:

```ts
Traversal.pureWalk
Traversal.withTeles
Traversal.teleportsEnabled(): boolean
```

`pureWalk` forces teleport edges off for one walk. `withTeles` forces them on. `teleportsEnabled()` reads the current global `navTeleports` setting.

Example:

```ts
await Traversal.walkTo(dest, {
  ...Traversal.pureWalk,
  radius: 2
});
```

The source also defines top-level `NAV_PURE_WALK` and `NAV_WITH_TELES` constants, but the inspected `packages/rs2b0t-api/index.js` runtime shim does **not** export those names directly. External scripts should therefore prefer `Traversal.pureWalk` and `Traversal.withTeles` when their installed declaration supports them, rather than importing the top-level constants.

## Forced repath

Current implementation:

```ts
Traversal.requestRepath(reason?: string): void
```

This asks the active or next world walk to abandon path stickiness and repath immediately.

**Compatibility note:** `pureWalk`, `withTeles`, `teleportsEnabled()` and `requestRepath()` exist in the current client implementation. If the installed `@rs2b0t/api` declaration does not yet list them, that is package declaration drift; do not assume older external packages type them correctly.

## `DirectNavigator`

Same-scene only:

```ts
DirectNavigator.walk(dest)
DirectNavigator.walkTo(dest, radius?, timeoutMs?)
```

Use it only when you deliberately want a local-scene movement action rather than world navigation.

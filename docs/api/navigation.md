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

Both the current runtime and package declaration expose:

```ts
Traversal.pureWalk
Traversal.withTeles
```

`pureWalk` forces teleport edges off for one walk. `withTeles` forces them on.

```ts
await Traversal.walkTo(dest, {
  ...Traversal.pureWalk,
  radius: 2
});
```

The current implementation additionally provides:

```ts
Traversal.teleportsEnabled(): boolean
```

It reads the current global `navTeleports` setting. This method is runtime-backed but is missing from the inspected package `.d.ts`.

### Top-level constant declaration bug

The package `.d.ts` also declares top-level `NAV_PURE_WALK` and `NAV_WITH_TELES` exports. The current `packages/rs2b0t-api/index.js` runtime shim does **not** export those top-level names. A direct import can therefore type-check but fail at runtime.

Prefer the real runtime properties:

```ts
Traversal.pureWalk
Traversal.withTeles
```

## Forced repath

Current implementation:

```ts
Traversal.requestRepath(reason?: string): void
```

This asks the active or next world walk to abandon path stickiness and repath immediately. It is runtime-backed but not yet declared in the inspected package `.d.ts`.

## `DirectNavigator`

Same-scene only:

```ts
DirectNavigator.walk(dest)
DirectNavigator.walkTo(dest, radius?, timeoutMs?)
```

Use it only when you deliberately want a local-scene movement action rather than world navigation.

# Navigation

## `Traversal`

World-scale navigation over the baked collision/transport graph.

```ts
Traversal.walkTo(dest, opts?): Promise<boolean>
Traversal.walkResilient(dest, opts): Promise<boolean>
Traversal.preload(): void
Traversal.remaining(): number
```

`walkTo()` supports arrival radius, timeout, logging, A* expansion budget, teleport policy, ships/shortcuts, bank counts, and danger/no-go zones.

```ts
await Traversal.walkTo(new Tile(3208, 3220, 0), {
  radius: 2,
  avoidZones: ['white-wolf-mountain'],
  log: msg => this.log(msg)
});
```

`walkResilient()` adds an escalation/recovery ladder and is preferable for long unattended trips.

## `DirectNavigator`

Same-scene only:

```ts
DirectNavigator.walk(dest)
DirectNavigator.walkTo(dest, radius?, timeoutMs?)
```

Use it only when you deliberately want a local scene click rather than world navigation.

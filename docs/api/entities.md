# Entities and queries

## Entity classes

### `Npc`

Declared members include:

```ts
name: string | null
level: number
index: number
inCombat: boolean
health: number

tile(): Tile
distance(): number
actions(): string[]
valid(): boolean
interact(action): boolean | Promise<boolean>
```

Current runtime additionally exposes:

```ts
id: number
targetsAnotherPlayer(): boolean
targetsMe(): boolean
```

These are useful for exact NPC identification and combat ownership. They are missing from the inspected external `.d.ts`.

### `Player`

Declared surface:

```ts
name: string | null
inCombat: boolean

tile(): Tile
distance(): number
actions(): string[]
```

Current runtime additionally exposes:

```ts
index: number
targetsMe(): boolean
```

`targetsMe()` tests the player's face target against the local player's slot. The `index` is useful when interoperating with lower-level player operations.

### `Loc`

Scenery/world object.

```ts
name: string | null
id: number

tile()
distance()
actions()
interact(action)
```

### `GroundItem`

```ts
name: string | null
id: number
count: number

tile()
distance()
actions()
interact(action)
```

### Runtime snapshots

The implementation classes retain their constructor snapshot as a public `snap` property at runtime. This exposes fields such as NPC animation/face target, loc typecode and raw operation arrays. `snap` is not part of the package declaration; prefer named API members when available and treat snapshot access as an implementation-level escape hatch.

## Queries

```ts
const target = Npcs.query()
  .name('Guard')
  .action('Attack')
  .within(10)
  .where(n => !n.inCombat)
  .nearest();
```

Declared filters:

```ts
name(...names)
action(action)
within(dist)
inside({ minX, maxX, minZ, maxZ })
where(predicate)
```

Current implementation additionally provides:

```ts
withinOf(origin: WorldTile, dist: number)
nearestPreferLocal(preferRadius: number)
```

`withinOf()` uses a Chebyshev-radius disk around an arbitrary world tile, useful for camp anchors, bank stands and furnaces.

`nearestPreferLocal()` first restricts to entities within `preferRadius` of the player when that local cluster is non-empty, then chooses the nearest from that pool.

Both methods exist on the current runtime-exported `EntityQuery` implementation, but the inspected `packages/rs2b0t-api/index.d.ts` does not declare them yet.

Terminals:

```ts
results()
nearest()
first()
exists()
count()
```

Roots:

```ts
Npcs.query()
Npcs.all()
Npcs.nearest(count?)

Players.query()
Locs.query()
GroundItems.query()
```

`Npcs.all()` and `Npcs.nearest()` are NPC-specific convenience methods; the other root objects currently expose `query()` only.

### Scene-transition caveat

Scenery queries can be temporarily empty for roughly a tick after a level/plane change. Do not immediately interpret one empty `Locs` result after a transition as proof that the object does not exist.

# Entities and queries

## Entity classes

### `Npc`

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

### `Player`

```ts
name: string | null
inCombat: boolean

tile(): Tile
distance(): number
actions(): string[]
```

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

## Queries

```ts
const target = Npcs.query()
  .name('Guard')
  .action('Attack')
  .within(10)
  .where(n => !n.inCombat)
  .nearest();
```

Filters:

```ts
name(...names)
action(action)
within(dist)
inside({ minX, maxX, minZ, maxZ })
where(predicate)
```

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

### Scene-transition caveat

Scenery queries can be temporarily empty for roughly a tick after a level/plane change. Do not immediately interpret one empty `Locs` result after a transition as proof that the object does not exist.

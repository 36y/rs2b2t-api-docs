# Low-level `reader`

The external package currently exports:

```ts
reader: Record<string, (...args: never[]) => unknown>
```

This is a low-level adapter escape hatch.

Prefer the typed APIs whenever possible:

```ts
Game
Inventory
Skills
Npcs
Locs
Bank
Quests
```

## Why use it sparingly?

Typed APIs provide stable names, meaningful return types, readiness/translation logic, and reduced dependency on client component/varp internals.

When a required state is not represented by the typed API, keep raw `reader` usage isolated behind a small helper so it can be replaced when a supported typed API becomes available.

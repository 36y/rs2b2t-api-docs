# Client-ABI-only APIs

The client currently installs several useful objects/helpers into `globalThis.__rs2b0t` that are **not all re-exported by the public `@rs2b0t/api` shim**.

They should not be documented as normal stable external imports unless the package exports and declarations are intentionally updated.

## `Prayer`

```ts
Prayer.points()
Prayer.max()
Prayer.full()
Prayer.known(name)
Prayer.available(name)
Prayer.active(name)
Prayer.set(name, on)
Prayer.clear()
```

## `Loadouts`

```ts
Loadouts.all()
Loadouts.names()
Loadouts.byName(name)
Loadouts.save(list)
```

## Navigation/harness surfaces

```ts
Reachability
EssenceSession
questLive
PathPublish
isNavPathPaintEnabled
SettingsStore
```

## Danger-zone utilities

```ts
KNOWN_DANGER_ZONES
knownDangerZone
knownDangerZoneIds
resolveDangerZones
tileInDangerZones
```

Normal external scripts can already pass danger zones through `Traversal` options without importing these internals directly.

## Build metadata

```ts
BUILD_INFO
```

A source symbol is public only when the intended external package surface exports and types it. See [Source of truth](/contributing/source-of-truth).

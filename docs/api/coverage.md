# API Coverage and Drift Audit

This page records the current `rs2b2t/rs2b0t` scripting surface against four layers:

1. `src/bot/runtime/abi.ts` — installed client ABI.
2. `packages/rs2b0t-api/index.js` — runtime exports external scripts actually receive.
3. `packages/rs2b0t-api/index.d.ts` — TypeScript declarations.
4. `src/bot/api/**` and `docs/reference/**` — implementation and intended behavior.

Auditing a top-level export such as `Bank` is not enough. Every reachable member must also be compared with the package declaration. That member-level pass is what exposed capabilities such as `Bank.close()`.

## Status Meanings

- **Public** — exported by `index.js` and represented by the package declarations.
- **Runtime drift** — reachable through an exported object/class at runtime but missing from the current `.d.ts` member surface.
- **Declaration bug** — declared as a package value, but the runtime shim does not export that top-level value.
- **Reachable implementation detail** — present on an exported runtime class/object, but intended for host/internal plumbing rather than ordinary script logic.
- **Client ABI only** — installed on `globalThis.__rs2b0t` but not re-exported by `@rs2b0t/api`.
- **Internal** — source-only implementation detail, not installed in the public ABI.
- **Pending** — proposed/unmerged external API.

## Automated Audit Result

The corrected AST audit of upstream commit `56bb1baab48bd77f0d57125a73bb6189f04aae7b` scanned **453** files under `src/bot/api/**`, finding **2,962 exported source symbols** and **5,197 source members**. At the package boundary it found 137 public source symbols, two API-tree ABI-only symbols, and no top-level runtime exports missing declarations.

The raw member pass reported **83 runtime/declaration drift candidates**. Manual review reduced that number because 33 were container-key false positives: the implementation spells out keys of `Readonly<Record<string, number>>` price/smithing maps and `SettingsSchema` objects while the declaration correctly types the container rather than enumerating every key. Those keys are **not declaration drift**.

The remaining **50 member-level mismatches are real implementation/declaration differences**. Some are useful hidden scripting capabilities; others are reachable constructors or runtime-host plumbing and are documented as such rather than promoted as recommended API.

## Verified Runtime Drift

### `Bank`

```ts
Bank.ready()
Bank.waitReady(timeoutMs?, log?)
Bank.snapshotReady()
Bank.snapshotGeneration()
Bank.waitSnapshotAfter(generation, timeoutMs?)
Bank.normalBackpackSnapshot()
Bank.backpackReady(expected, log?)
Bank.countById(id)
Bank.withdrawById(id, op?)
Bank.withdrawXById(id, count, landsAsId?)
Bank.openNpcAccess(...)
Bank.close(timeoutMs?)
```

`Bank.close()` is especially important: it closes the bank modal and verifies that both the bank and its side-backpack modal are gone before returning. See [Banking](/api/banking).

`Bank.withdrawLoad()` and `Bank.openNearestAccess()` were also checked during this pass and are **already declared**; they are not runtime drift.

### `Game`

```ts
Game.sceneReady()
Game.sceneState()
Game.autoRetaliateOn()
Game.attackedByPlayer()
Game.combatStyles()
Game.setAutoRetaliate(on)
Game.castOnLoc(spell, loc)
Game.castOnItem(spell, item)
```

See [Game](/api/game).

### `Inventory` and `InvItem`

```ts
Inventory.countById(id)
Inventory.free()
```

The implementation also accepts `GroundItem` in `InvItem.useOn(...)`, although the declaration's target union omits it. `InvItem` has a runtime snapshot constructor/state shape that is not represented by the package declaration; treat direct construction/snapshot access as an implementation escape hatch. See [Inventory](/api/inventory).

### Entity Classes and Queries

```ts
Npc.id
Npc.targetsAnotherPlayer()
Npc.targetsMe()

Player.index
Player.targetsMe()

EntityQuery.withinOf(origin, dist)
EntityQuery.nearestPreferLocal(preferRadius)
```

`Npc`, `Player`, `Loc`, and `GroundItem` are implemented with snapshot-taking constructors that the declaration omits. These constructors are reachable JavaScript behavior but are not recommended as the normal way to obtain entities; use `Npcs`, `Players`, `Locs`, and `GroundItems` queries.

`EntityQuery.fromSnapshots(...)` is also reachable as a static runtime method but exists to build snapshot-first query adapters. It is classified as a **reachable implementation detail**, not a recommended external query primitive. See [Entities & Queries](/api/entities).

### `Shop`, `Trade`, `ChatDialog`, and `Quests`

```ts
Shop.buyById(id, n)
Trade.removeAll()

ChatDialog.texts()
ChatDialog.makeX(match, count)
ChatDialog.isMainMakePanel()
ChatDialog.mainMakeProducts()
ChatDialog.makeFromPanel(match, op?)
ChatDialog.makeFromPanelMax(match)

Quests.journal(name)
```

These methods are all present in current implementation objects exported through the runtime shim but absent from the inspected `.d.ts`. See [Shops](/api/shops), [Trade](/api/trade), [Dialogue](/api/dialogue), and [Quests](/api/quests).

### `Traversal`

```ts
Traversal.teleportsEnabled()
Traversal.requestRepath(reason?)
```

`Traversal.pureWalk` and `Traversal.withTeles` are both runtime-backed **and declared**. See [Navigation](/api/navigation).

### `AbstractBot`

```ts
loopCadence
on(event, callback)
bindLog(sink)
disposeSubscriptions()
```

`loopCadence` is useful script-facing runtime behavior and is documented in [Bots](/api/bots). `bindLog()` and `disposeSubscriptions()` are host lifecycle plumbing; they are reachable because the class is exported, but scripts should not normally take ownership of them. `on()` is likewise runtime-backed but subscription lifecycle should be handled carefully.

## Top-Level Declaration Bugs

The audit confirms exactly two declared package values that the runtime shim does not export:

```ts
NAV_PURE_WALK
NAV_WITH_TELES
```

Direct imports can therefore type-check and fail at runtime. Use the actual runtime properties instead:

```ts
Traversal.pureWalk
Traversal.withTeles
```

There are no runtime-shim exports absent from the installed ABI, and no runtime-shim top-level exports lacking a value declaration in the current package file.

## Client-ABI-Only Surface

The client ABI additionally installs names that the external shim does not re-export:

`questLive`, `Reachability`, `EssenceSession`, `Prayer`, `Loadouts`, `PathPublish`, `isNavPathPaintEnabled`, `SettingsStore`, `KNOWN_DANGER_ZONES`, `knownDangerZone`, `knownDangerZoneIds`, `resolveDangerZones`, `tileInDangerZones`, `BUILD_INFO`.

See [Client-ABI-Only APIs](/api/client-only).

## Other Declaration Anomalies

`AcquireTask` is declared with optional `options` and `group` fields, but the current implementation class does not define those fields. Do not rely on them as real instance state.

The current source also has `LoopCadence`/`loopCadence` behavior that is not represented by the external package declaration.

## Internal Source-Only Surface

The source tree contains a much larger internal API than the external package. Exporting a symbol from a TypeScript source module does **not** make it third-party scripting API. A symbol must cross the ABI/package boundary before this site calls it public or runtime drift.

`Paint`, for example, is an in-client HUD toolkit but is neither installed by the ABI nor exported by `packages/rs2b0t-api/index.js`.

## 2004bot Reference Comparison

The public 2004bot API page is useful historical/reference material, but it is not authoritative for rs2b2t. Current source has evolved beyond it in loop scheduling, banking readiness/closure, Game state, navigation, dialogue/make helpers, and other areas.

For this site, current rs2b2t source wins whenever the older web reference disagrees.

## Audit Rule

A change is not considered comprehensively documented until all applicable layers are checked at **member level**: runtime shim, `.d.ts`, client ABI, implementation, upstream reference docs, and this site's detailed API page.

The generated report is deliberately a discovery aid. Generic records/settings schemas and implementation plumbing still require manual classification before a finding is presented as external API drift.

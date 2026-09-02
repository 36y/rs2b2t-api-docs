# API coverage and drift audit

This page records the current `rs2b2t/rs2b0t` scripting surface against four layers:

1. `src/bot/runtime/abi.ts` — installed client ABI.
2. `packages/rs2b0t-api/index.js` — runtime exports external scripts actually receive.
3. `packages/rs2b0t-api/index.d.ts` — TypeScript declarations.
4. `src/bot/api/**` and `docs/reference/**` — implementation and intended behavior.

The audit is performed against upstream `main`. The important rule is that auditing a top-level export such as `Bank` is not enough: every member of the runtime object/class must also be compared with its package declaration. That member-level pass is what exposes capabilities such as `Bank.close()`.

## Status meanings

- **Public** — exported by `index.js` and represented by the package declarations.
- **Runtime drift** — reachable through an exported object/class at runtime but missing from the current `.d.ts` member surface.
- **Declaration bug** — declared as a package value, but the runtime shim does not export that top-level value.
- **Reachable implementation detail** — technically present on an exported runtime class/object, but intended for host plumbing rather than script logic.
- **Client ABI only** — installed on `globalThis.__rs2b0t` but not re-exported by `@rs2b0t/api`.
- **Internal** — source-only implementation detail, not installed in the public ABI.
- **Pending** — proposed/unmerged external API.

## Public runtime exports

The current `packages/rs2b0t-api/index.js` runtime shim exports these groups:

| Group | Runtime exports |
| --- | --- |
| ABI / registration | `apiVersion`, `Execution`, `defineBot`, `registerScript`, `events` |
| World / game | `Game`, `Tile`, `Area` |
| Navigation | `Traversal`, `DirectNavigator` |
| Entities | `Npcs`, `Players`, `Locs`, `GroundItems`, `EntityQuery`, `Npc`, `Player`, `Loc`, `GroundItem` |
| Inventory / equipment | `Inventory`, `InvItem`, `Equipment` |
| Banking | `Bank`, `withdrawOp`, `Banking`, banking rules/routes/catalog helpers |
| UI / player interaction | `Shop`, `Trade`, `Skills`, `ChatDialog`, `Quests` |
| Item/tool acquisition | `AcquireTask`, `hasAll`, `held`, tool requirements and acquisition planners |
| World catalogs | pickpocket, gathering, fishing, mining, woodcutting, walking, cow and runecrafting catalogs |
| Bot classes | `AbstractBot`, `LoopingBot`, `TaskBot`, `TreeBot`, `BranchTask`, `LeafTask` |
| Escape hatch | `reader` |

The detailed [Acquisition & Tools](/api/acquisition) and [World Catalogs](/api/catalogs) pages enumerate the large pure-data/helper families.

## High-value runtime drift found by member audit

These are particularly useful for writing comprehensive external scripts. They exist on objects/classes that the runtime shim already exports, but the inspected package `.d.ts` does not fully describe them.

| Object | Runtime member | Why it matters |
| --- | --- | --- |
| `Bank` | `close(timeoutMs?)` | Properly close bank + side backpack before Wield/Use/Bury |
| `Bank` | `ready()`, `waitReady()` | Distinguish an empty bank from a bank whose item snapshot has not arrived |
| `Bank` | `snapshotReady()`, `snapshotGeneration()`, `waitSnapshotAfter()` | Synchronize exact bank snapshot generations |
| `Bank` | `normalBackpackSnapshot()`, `backpackReady()` | Verify the side backpack matches the pre-open inventory |
| `Bank` | `countById()`, `withdrawById()`, `withdrawXById()` | Work with exact item IDs and noted/unnoted variants |
| `Bank` | `withdrawLoad()` | Fill available backpack capacity from one bank item efficiently |
| `Bank` | `openNpcAccess()`, `openNearestAccess()` | Banks opened through NPC dialogue or special objects |
| `Inventory` | `countById()` | Exact-ID inventory counts |
| `Inventory` | `free()` | Free-slot count, including bank-side backpack semantics |
| `InvItem` | `useOn(GroundItem)` | Use a held item on a ground item |
| `Shop` | `buyById()` | Buy the correct object when duplicate display names exist |
| `Trade` | `removeAll()` | Clear your current offer before rebuilding it |
| `ChatDialog` | `texts()` | Read current chat-modal/NPC text |
| `ChatDialog` | `makeX()` | Drive Make-X and its amount dialog safely |
| `ChatDialog` | main-panel make helpers | Operate production interfaces that are not chat make menus |
| `Quests` | `journal()` | Read mid-stage quest journal text |
| `Npc` | `id`, `targetsMe()`, `targetsAnotherPlayer()` | Exact identity and combat-target ownership |
| `Player` | `index`, `targetsMe()` | Low-level player targeting and PvP state |
| `EntityQuery` | `withinOf()`, `nearestPreferLocal()` | Anchor-relative and local-cluster queries |
| `Game` | scene readiness, retaliation/PvP, extra spell targets | Safer scene actions and richer combat/magic control |
| `Traversal` | `teleportsEnabled()`, `requestRepath()` | Inspect global teleport policy and force path refresh |
| `AbstractBot` | `loopCadence` | Explicit frame/server-tick/time loop scheduling |

Each affected detailed API page includes signatures and recommended narrow TypeScript casts.

## `Bank.close()` example

The runtime implementation closes through the client's modal-close operation and then waits until both the main bank and its side backpack modal are gone:

```ts
const BankRuntime = Bank as typeof Bank & {
  close(timeoutMs?: number): Promise<boolean>;
};

await BankRuntime.close();
```

This is the model for documenting runtime drift: do not pretend the method is typed, but do not hide a useful working runtime capability merely because `index.d.ts` is behind.

## Top-level declaration bug: navigation constants

`index.d.ts` declares top-level `NAV_PURE_WALK` and `NAV_WITH_TELES` exports, but the current `packages/rs2b0t-api/index.js` shim does not export those names. Direct imports can therefore type-check and fail at runtime.

Use the actual runtime properties:

```ts
Traversal.pureWalk
Traversal.withTeles
```

## Other confirmed runtime drift

### `Game`

```ts
Game.sceneReady()
Game.sceneState()
Game.combatStyles()
Game.autoRetaliateOn()
Game.attackedByPlayer()
Game.setAutoRetaliate(on)
Game.castOnLoc(spell, loc)
Game.castOnItem(spell, item)
```

### `Traversal`

```ts
Traversal.teleportsEnabled()
Traversal.requestRepath(reason?)
```

### `EntityQuery`

```ts
query.withinOf(origin, dist)
query.nearestPreferLocal(preferRadius)
```

### `AbstractBot`

`loopCadence` exists in the implementation and runtime class but is not declared in the inspected package `.d.ts`.

### `AcquireTask` declaration anomaly

The package `.d.ts` places optional `options` and `group` fields on `AcquireTask`, but the implementation class contains only its constructor, `validate()` and `execute()`. Do not rely on those fields as real instance state.

## Reachable but not recommended as script API

Exporting a class exposes all its JavaScript methods even when some are runtime-host plumbing. For example, `AbstractBot.bindLog()` and `disposeSubscriptions()` are callable on the class at runtime, but the host owns logging/subscription lifecycle. They should not be treated like useful hidden scripting features.

Likewise, source-level `snap` properties on entity/item classes are reachable and sometimes valuable for advanced work, but they couple a script directly to adapter snapshot shapes. Prefer named members first.

## The `reader` escape hatch

`reader` is itself a runtime export, while its package type is intentionally only a generic record. The real reader has a broad member surface including hint-arrow state, raw entity/inventory snapshots, object catalog metadata, modal introspection, trade-confirm snapshots, collision/path information, projection helpers and snapshot-readiness state.

See [Low-level reader](/api/reader) for the useful families and safe isolation pattern.

## Client-ABI-only surface

The client ABI additionally installs names that the external shim does not re-export, including:

`questLive`, `Reachability`, `EssenceSession`, `Prayer`, `Loadouts`, `PathPublish`, `isNavPathPaintEnabled`, `SettingsStore`, `KNOWN_DANGER_ZONES`, `knownDangerZone`, `knownDangerZoneIds`, `resolveDangerZones`, `tileInDangerZones`, `BUILD_INFO`.

See [Client-ABI-only APIs](/api/client-only) for the stability warning.

## Internal source-only surface

A symbol can have upstream documentation and still not be external API. `Paint`, for example, is an in-client HUD toolkit but is neither installed by the ABI nor exported by `packages/rs2b0t-api/index.js`.

Do not import arbitrary internal source modules from third-party bundles unless you intentionally accept source-tree coupling.

## 2004bot reference comparison

The public 2004bot API page is useful historical/reference material, but it is not authoritative for rs2b2t. The current source has evolved beyond it in loop scheduling, banking readiness/closure, Game state, navigation, dialogue/make helpers and other areas.

For this site, current rs2b2t source wins whenever the older web reference disagrees.

## Audit rule

A change is not considered comprehensively documented until all applicable layers are checked at **member level**: runtime shim, `.d.ts`, client ABI, implementation, upstream reference docs, and this site's detailed API page.

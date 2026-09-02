# API coverage and drift audit

This page records the current `rs2b2t/rs2b0t` scripting surface against four layers:

1. `src/bot/runtime/abi.ts` — installed client ABI.
2. `packages/rs2b0t-api/index.js` — runtime exports external scripts actually receive.
3. `packages/rs2b0t-api/index.d.ts` — TypeScript declarations.
4. `src/bot/api/**` and `docs/reference/**` — implementation and intended behavior.

The audit snapshot used here is upstream `main` at tree `56bb1baab48bd77f0d57125a73bb6189f04aae7b`.

## Status meanings

- **Public** — exported by `index.js` and represented by the package declarations.
- **Runtime drift** — reachable through an exported object/class at runtime but missing from the current `.d.ts` member surface.
- **Declaration bug** — declared as a package value, but the runtime shim does not export that top-level value.
- **Client ABI only** — installed on `globalThis.__rs2b0t` but not re-exported by `@rs2b0t/api`.
- **Internal** — source-only implementation detail, not installed in the public ABI.
- **Pending** — proposed/unmerged external API.

## Public runtime exports

The following names are destructured and exported by `packages/rs2b0t-api/index.js`.

| Group | Runtime exports |
| --- | --- |
| ABI / registration | `apiVersion`, `Execution`, `defineBot`, `registerScript`, `events` |
| World / game | `Game`, `Tile`, `Area` |
| Navigation | `Traversal`, `DirectNavigator` |
| Entities | `Npcs`, `Players`, `Locs`, `GroundItems`, `EntityQuery`, `Npc`, `Player`, `Loc`, `GroundItem` |
| Inventory / equipment | `Inventory`, `InvItem`, `Equipment` |
| Banking | `Bank`, `withdrawOp`, `Banking`, `depositAllExcept`, `depositMatcher`, `matchesCommonBankLoot`, `shouldBankNow`, `parseBankStrategy`, `PERIODIC_BANK_SETTINGS`, `COMMON_BANK_LOOT`, `RANDOM_EVENT_CASKET_ID`, `NEARBY_BANK_RADIUS`, `resolveBankOpenRoute`, `BANK_LOCATIONS`, `bankDistance`, `bankUnlocked`, `nearestBank`, `nearestUsableBank` |
| UI / player interaction | `Shop`, `Trade`, `Skills`, `ChatDialog`, `Quests` |
| Item acquisition | `AcquireTask`, `hasAll`, `held` |
| Tool catalog | `PICKAXES`, `AXES`, `TINDERBOX`, `HAMMER`, `KNIFE`, `CHISEL`, `NEEDLE`, `pickaxeReq`, `axeReq`, `exactTool`, `tinderboxReq`, `toolAttackLevel`, `canWieldTool`, `bestFromTiers`, `bestPickaxe`, `bestAxe`, `toolKeepNames`, `hasToolReq`, `hasAllTools`, `missingToolLabels`, `toolKitLabel`, `toolRestockPlan`, `bankHasBetterGatherTool`, `toolsNeedingEquip`, `bestHeldToolNames`, `surplusHeldToolNames` |
| Tool acquisition planning | `COINS`, `BROKEN_PICKAXE`, `BROKEN_AXE`, `parseToolAcquireMode`, `TOOL_ACQUIRE_OPTIONS`, `TOOL_ACQUIRE_SETTING`, `FORGETFUL_BANK_ODDS`, `FORGETFUL_BANK_SETTING`, `BOB_VENDOR`, `NURMOF_VENDOR`, `GERRANT_VENDOR`, `HARRY_VENDOR`, `GERRANT_ONLY_FISHING`, `VARROCK_ANVIL_STAND`, `VARROCK_ANVIL_BANK`, `PICKAXE_SHOP_COSTS`, `AXE_SHOP_COSTS`, `FISHING_SHOP_COSTS`, `AXE_SMITH_LEVEL`, `AXE_BAR_FOR`, `bestOwnedTier`, `pickaxeShopOffers`, `axeShopOffers`, `bestAffordableShopTier`, `bestSmithableAxe`, `planBrokenToolRepair`, `planPickaxeAcquire`, `planAxeAcquire`, `fishingVendorFor`, `fishingShopCost`, `isFishingBaitPiece`, `withBaitTarget`, `planFishingGearBuys`, `planFishingGearAcquire`, `buyPlansCost`, `fishingGearShopCart`, `planGatherToolAcquire`, `coinsToWithdraw`, `canFundPlan`, `acquireKeepNames`, `shopableMissingFishingGear` |
| Pickpocket catalog | `PICKPOCKET_TARGETS`, `PICKPOCKET_TARGET_NAMES`, `ARDOUGNE_PICKPOCKET_TARGETS` |
| Gathering locations | `DEFAULT_BOOTH_NAME`, `DEFAULT_BOOTH_OP`, `MAP_SQUARE`, `sameMapSquare`, `locationOptions`, `boothFields`, `resolveGatheringLocation`, `FISHING_LOCATIONS`, `FISHING_LOCATION_OPTIONS`, `resolveFishingLocation`, `MINING_LOCATIONS`, `MINING_LOCATION_OPTIONS`, `MINING_LOCATION_OPTION_LABELS`, `miningLocationLabel`, `resolveMiningLocation`, `WOODCUTTING_LOCATIONS`, `WOODCUTTING_LOCATION_OPTIONS`, `resolveWoodcuttingLocation` |
| Fishing / mining data | `WHIRLPOOL_IDS`, `FISHING_METHODS`, `FISHING_METHOD_OPTIONS`, `ALL_FISHING_GEAR_NAMES`, `resolveFishMethod`, `gearKeepNames`, `hasFishingGear`, `missingFishingGear`, `gearLabel`, `fishingRestockPlan`, `spotMatchesMethod`, `ROCK_TYPES`, `ROCK_OPTIONS`, `GAS_ROCK_IDS`, `GAS_ROCK_TICKS`, `resolveRockIds` |
| Walk destinations | `WALK_DESTINATIONS`, `WALK_OPTIONS`, `resolveDestination` |
| Cow locations | `COW_LOCATIONS`, `COW_LOCATION_OPTIONS`, `AL_KHARID_BANK`, `TOLL_COIN_TARGET`, `isCowFieldLootTile`, `resolveCowLocation`, `nearestCowLocation`, `needsTollCoins`, `shouldBootstrapTollCoins` |
| Runecrafting routes | `RUNES`, `RUNE_OPTIONS`, `DEFAULT_RUNE` |
| Bot classes | `AbstractBot`, `LoopingBot`, `TaskBot`, `TreeBot`, `BranchTask`, `LeafTask` |
| Escape hatch | `reader` |

Every name in this table has a home in the detailed API pages, with the large pure-data/planning families grouped under [Acquisition & Tools](/api/acquisition) and [World Catalogs](/api/catalogs).

## Type-only package exports

These exist only at TypeScript compile time and therefore are not expected as JavaScript values:

`WorldTile`, `MeleeCombatStyle`, `CombatStyleResolution`, `Interactable`, `Locatable`, `BankItemSnapshot`, `BankObjectAccess`, `BankStrategy`, `BankDestination`, `BankTriggerState`, `OpenBankOpts`, `BankOpenRoute`, `QuestStatus`, `TradeItem`, `WalkOptions`, `WalkResilientOptions`, `ChatLine`, `EventMap`, `SettingsBag`, `Task`, `ItemSource`, `ItemNeed`, `TreeNode`, `SettingType`, `SettingDef`, `SettingsSchema`, `BotManifestInput`, `BotManifest`, `BankRequirement`, `BankLocation`, `ToolTier`, `ToolReq`, `ToolRestockStep`, `ToolAcquireMode`, `ToolVendor`, `ShopOffer`, `ToolAcquirePlan`, `AcquireWorld`, `FishingVendorNear`, `PlanFishingGearOpts`, `FishingGearBuyPlan`, `PickpocketTarget`, `GatheringLocation`, `FishingLocation`, `MiningLocation`, `WoodcuttingLocation`, `FishingGearPiece`, `FishingMethod`, `WalkDestination`, `CowLocation`, `RuneRoute`, `RuneType`.

## Confirmed declaration/runtime drift

### `NAV_PURE_WALK` and `NAV_WITH_TELES`

`index.d.ts` declares both as top-level exported values, but the current `packages/rs2b0t-api/index.js` destructuring list does not export either name. Direct imports of those top-level constants can therefore type-check and still fail at runtime.

Use the runtime-backed properties instead:

```ts
Traversal.pureWalk
Traversal.withTeles
```

Those properties are declared and are present on the current `Traversal` implementation.

### `AbstractBot.loopCadence`

The current implementation and upstream reference docs expose:

```ts
loopCadence:
  | { kind: 'frame' }
  | { kind: 'server-tick'; ticks?: number }
  | { kind: 'time'; ms: number }
  | null
```

The current package `.d.ts` still only declares `loopDelay`. The property is runtime-accessible because the whole class is exported, but external TypeScript packages are under-typed.

### `Game` implementation members missing from `.d.ts`

Current runtime-backed members include:

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

They are on the exported `Game` object at runtime but absent from the inspected package declaration.

### `EntityQuery` implementation members missing from `.d.ts`

The exported class currently also implements:

```ts
query.withinOf(origin, dist)
query.nearestPreferLocal(preferRadius)
```

Both work through the runtime-exported `EntityQuery` class, but neither is declared in the current package `.d.ts`.

### `Traversal` implementation members missing from `.d.ts`

Current implementation additionally exposes:

```ts
Traversal.teleportsEnabled()
Traversal.requestRepath(reason?)
```

They are runtime-backed object members but are not in the current `.d.ts`.

### `AcquireTask` declaration anomaly

The current `.d.ts` places optional `options?: string[]` and `group?: string` properties on `AcquireTask`. The implementation class contains only its constructor, `validate()` and `execute()`. Those two fields appear to be declaration drift and should not be relied on as real `AcquireTask` instance state.

## Client-ABI-only surface

The current client ABI additionally installs these names without re-exporting them from the external shim:

`questLive`, `Reachability`, `EssenceSession`, `Prayer`, `Loadouts`, `PathPublish`, `isNavPathPaintEnabled`, `SettingsStore`, `KNOWN_DANGER_ZONES`, `knownDangerZone`, `knownDangerZoneIds`, `resolveDangerZones`, `tileInDangerZones`, `BUILD_INFO`.

See [Client-ABI-only APIs](/api/client-only) for the stability warning and available signatures.

## Internal source-only surface

A symbol can have excellent upstream reference documentation and still not be an external package API. One example is `Paint`: `src/bot/paint/Paint.ts` and `docs/reference/api-paint.md` document the in-client immediate-mode HUD toolkit, but `Paint` is not installed by `abi.ts` and is not exported by `packages/rs2b0t-api/index.js`.

Do not import internal source modules from third-party bundles unless you intentionally accept source-tree coupling.

## 2004bot reference comparison

The public 2004bot API page remains useful historical/reference material, but it is not authoritative for rs2b2t. Known stale examples include its description of `loopDelay` as plain wall-clock milliseconds, its smaller `Game` surface, its older movement options, and omission of newer helpers such as `ChatDialog.makeOne()` and `Bank.loaded()`.

For this site, source code wins whenever the older web reference disagrees.

## Audit rule

A future change is not considered fully documented until all applicable layers are checked: runtime shim, `.d.ts`, client ABI, implementation, upstream reference docs, and this site's page for the affected group.

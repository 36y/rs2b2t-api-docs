# Acquisition and tools

The public package exports both a small task-level item acquisition API and a much larger set of pure tool/gear planning helpers.

## Item needs

```ts
type ItemSource =
  | { kind: 'shop'; npc: string; near: WorldTile }
  | { kind: 'ground'; at: WorldTile }
  | { kind: 'gather' }
  | { kind: 'make' };

type ItemNeed = { name: string; count: number; source: ItemSource };
```

```ts
held(name: string): number
hasAll(needs: ItemNeed[]): boolean
new AcquireTask(bot, needs)
```

`AcquireTask` obtains the first unmet need. The current implementation supports `shop` and `ground` sources. `gather` and `make` are part of the `ItemSource` type but currently throw `ItemSource.<kind>: not implemented yet` when `AcquireTask.execute()` reaches them.

**Declaration anomaly:** the current package `.d.ts` shows optional `options` and `group` properties on `AcquireTask`, but those fields do not exist in the implementation class. Do not rely on them as instance API.

## Tool requirement catalogs

```ts
PICKAXES
AXES
TINDERBOX
HAMMER
KNIFE
CHISEL
NEEDLE
```

Requirement helpers:

```ts
pickaxeReq
axeReq
exactTool
tinderboxReq
toolAttackLevel
canWieldTool
bestFromTiers
bestPickaxe
bestAxe
toolKeepNames
hasToolReq
hasAllTools
missingToolLabels
toolKitLabel
toolRestockPlan
bankHasBetterGatherTool
toolsNeedingEquip
bestHeldToolNames
surplusHeldToolNames
```

## Tool acquisition configuration

The external package also exports:

```ts
COINS
BROKEN_PICKAXE
BROKEN_AXE
parseToolAcquireMode
TOOL_ACQUIRE_OPTIONS
TOOL_ACQUIRE_SETTING
FORGETFUL_BANK_ODDS
FORGETFUL_BANK_SETTING
```

Vendor/location constants:

```ts
BOB_VENDOR
NURMOF_VENDOR
GERRANT_VENDOR
HARRY_VENDOR
GERRANT_ONLY_FISHING
VARROCK_ANVIL_STAND
VARROCK_ANVIL_BANK
PICKAXE_SHOP_COSTS
AXE_SHOP_COSTS
FISHING_SHOP_COSTS
AXE_SMITH_LEVEL
AXE_BAR_FOR
```

## Acquisition planners

These helpers calculate what should happen; callers still own the actual banking, shopping, walking or smithing workflow unless a higher-level task performs it.

```ts
bestOwnedTier
pickaxeShopOffers
axeShopOffers
bestAffordableShopTier
bestSmithableAxe
planBrokenToolRepair
planPickaxeAcquire
planAxeAcquire
fishingVendorFor
fishingShopCost
isFishingBaitPiece
withBaitTarget
planFishingGearBuys
planFishingGearAcquire
buyPlansCost
fishingGearShopCart
planGatherToolAcquire
coinsToWithdraw
canFundPlan
acquireKeepNames
shopableMissingFishingGear
```

The package declarations also expose the associated planning types such as `ToolTier`, `ToolReq`, `ToolRestockStep`, `ToolVendor`, `ShopOffer`, `ToolAcquirePlan`, `AcquireWorld`, `FishingVendorNear`, `PlanFishingGearOpts` and `FishingGearBuyPlan`.

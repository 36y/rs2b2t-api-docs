# World catalogs

The external package exposes shared world/data tables and pure resolver helpers so scripts do not need to duplicate common metadata.

## Banks

```ts
BANK_LOCATIONS
bankDistance
bankUnlocked
nearestBank
nearestUsableBank
```

`bankDistance()` is Euclidean same-plane distance; do not assume it is the same metric as `Tile.distanceTo()`/game walking.

## Pickpocket targets

```ts
PICKPOCKET_TARGETS
PICKPOCKET_TARGET_NAMES
ARDOUGNE_PICKPOCKET_TARGETS
```

## Generic gathering locations

```ts
DEFAULT_BOOTH_NAME
DEFAULT_BOOTH_OP
MAP_SQUARE
sameMapSquare
locationOptions
boothFields
resolveGatheringLocation
```

## Fishing

Location data:

```ts
FISHING_LOCATIONS
FISHING_LOCATION_OPTIONS
resolveFishingLocation
```

Methods/gear:

```ts
WHIRLPOOL_IDS
FISHING_METHODS
FISHING_METHOD_OPTIONS
ALL_FISHING_GEAR_NAMES
resolveFishMethod
gearKeepNames
hasFishingGear
missingFishingGear
gearLabel
fishingRestockPlan
spotMatchesMethod
```

## Mining

```ts
MINING_LOCATIONS
MINING_LOCATION_OPTIONS
MINING_LOCATION_OPTION_LABELS
miningLocationLabel
resolveMiningLocation
ROCK_TYPES
ROCK_OPTIONS
GAS_ROCK_IDS
GAS_ROCK_TICKS
resolveRockIds
```

## Woodcutting

```ts
WOODCUTTING_LOCATIONS
WOODCUTTING_LOCATION_OPTIONS
resolveWoodcuttingLocation
```

## Walking destinations

```ts
WALK_DESTINATIONS
WALK_OPTIONS
resolveDestination
```

These are destination catalogs; actual movement is performed by `Traversal`.

## Cow/combat locations

```ts
COW_LOCATIONS
COW_LOCATION_OPTIONS
AL_KHARID_BANK
TOLL_COIN_TARGET
isCowFieldLootTile
resolveCowLocation
nearestCowLocation
needsTollCoins
shouldBootstrapTollCoins
```

## Runecrafting routes

```ts
RUNES
RUNE_OPTIONS
DEFAULT_RUNE
```

The declarations also expose the corresponding data types, including `BankLocation`, `GatheringLocation`, `FishingLocation`, `MiningLocation`, `WoodcuttingLocation`, `FishingGearPiece`, `FishingMethod`, `WalkDestination`, `CowLocation`, `RuneRoute` and `RuneType`.

## Scope warning

The source tree contains additional catalogs used by in-tree scripts, quests and cooking systems. They are not automatically external API. This page lists the catalog families actually exported by the current `packages/rs2b0t-api/index.js` shim; see [API coverage and drift](/api/coverage) for the full runtime export matrix.

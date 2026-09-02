# World catalogs

The external API exposes shared world/data tables so scripts do not need to duplicate common metadata.

## Banks
`BANK_LOCATIONS`, `bankDistance`, `bankUnlocked`, `nearestBank`, `nearestUsableBank`.

## Fishing
`FISHING_LOCATIONS`, `FISHING_LOCATION_OPTIONS`, `resolveFishingLocation`, `FISHING_METHODS`, `FISHING_METHOD_OPTIONS`, `ALL_FISHING_GEAR_NAMES`, `WHIRLPOOL_IDS`, `resolveFishMethod`, `hasFishingGear`, `missingFishingGear`, `fishingRestockPlan`, `spotMatchesMethod`.

## Mining
`MINING_LOCATIONS`, `MINING_LOCATION_OPTIONS`, `MINING_LOCATION_OPTION_LABELS`, `ROCK_TYPES`, `ROCK_OPTIONS`, `GAS_ROCK_IDS`, `GAS_ROCK_TICKS`, `resolveMiningLocation`, `resolveRockIds`.

## Woodcutting and gathering
`WOODCUTTING_LOCATIONS`, `WOODCUTTING_LOCATION_OPTIONS`, `resolveWoodcuttingLocation`, `DEFAULT_BOOTH_NAME`, `DEFAULT_BOOTH_OP`, `MAP_SQUARE`, `sameMapSquare`, `locationOptions`, `boothFields`, `resolveGatheringLocation`.

## Other catalogs
Pickpocket targets, walking destinations, cow/combat locations, and runecrafting routes are also exported through shared catalog constants and resolver helpers.

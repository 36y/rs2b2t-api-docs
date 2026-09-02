# API reference

The supported external surface is defined by the intersection of the client ABI, runtime shim and package declarations. When those layers disagree, the detailed pages identify the drift instead of silently treating implementation details as portable package API.

## Main external modules

| Area | Primary API |
| --- | --- |
| Bot lifecycle | `AbstractBot`, `LoopingBot`, `TaskBot`, `TreeBot`, `defineBot` |
| Waiting | `Execution` |
| Game state | `Game`, `Tile`, `Area` |
| Entities | `Npcs`, `Players`, `Locs`, `GroundItems`, `EntityQuery` |
| Inventory | `Inventory`, `InvItem` |
| Equipment | `Equipment` |
| Skills | `Skills` |
| Banking | `Bank`, `Banking`, helpers |
| Shops | `Shop` |
| Player trade | `Trade` |
| Dialogue | `ChatDialog` |
| Quests | `Quests` |
| Navigation | `Traversal`, `DirectNavigator` |
| Events | `events` and bot-scoped `this.on(...)` |
| Settings | `SettingsBag`, `SettingsSchema` |
| Acquisition | `AcquireTask`, tool and gear planners |
| Catalogs | Banks, fishing, mining, woodcutting, walking, cows, runecrafting |
| Escape hatch | `reader` |

## Audit matrix

See [API coverage and drift](/api/coverage) for the symbol-by-symbol runtime export inventory, type-only exports, client-ABI-only names, and confirmed mismatches between `index.js`, `index.d.ts` and current implementation source.

Use the left navigation for detailed API pages.

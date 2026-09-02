# API reference

The supported external surface is defined by the intersection of the client ABI, runtime shim and package declarations.

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

Use the left navigation for detailed pages.

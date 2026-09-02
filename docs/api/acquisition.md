# Acquisition and tools

The public API contains shared acquisition and tool-planning helpers used by gatherer-style scripts.

## Item needs

```ts
type ItemSource =
  | { kind: 'shop'; npc: string; near: WorldTile }
  | { kind: 'ground'; at: WorldTile }
  | { kind: 'gather' }
  | { kind: 'make' };

type ItemNeed = { name: string; count: number; source: ItemSource };
```

Helpers include `held`, `hasAll`, and `AcquireTask`.

## Tool catalogs

```ts
PICKAXES
AXES
TINDERBOX
HAMMER
KNIFE
CHISEL
NEEDLE
```

Requirement/planning helpers include `pickaxeReq`, `axeReq`, `exactTool`, `tinderboxReq`, `bestPickaxe`, `bestAxe`, `hasToolReq`, `hasAllTools`, `toolRestockPlan`, `toolsNeedingEquip`, `bestHeldToolNames`, and `surplusHeldToolNames`.

Acquisition planning includes `planBrokenToolRepair`, `planPickaxeAcquire`, `planAxeAcquire`, `planGatherToolAcquire`, `coinsToWithdraw`, `canFundPlan`, and `acquireKeepNames`.

These are primarily decision/planning utilities. A returned plan does not mean every world interaction has already happened.

# Game

`Game` exposes local-player, scene, combat, camera and spell-dispatch state.

## Core state

```ts
Game.ingame(): boolean
Game.tile(): WorldTile | null
Game.energy(): number
Game.runEnabled(): boolean
Game.weight(): number
Game.inCombat(): boolean
Game.animating(): boolean
Game.tick(): number
Game.myName(): string | null
```

`Game.tile()` can be `null` before login or scene initialization.

## Scene readiness

The current client implementation also provides:

```ts
Game.sceneReady(): boolean
Game.sceneState(): number
```

`sceneState()` is the raw client build state: `0` idle/loading, `1` building, `2` ready.

`sceneReady()` requires all three of: logged in, `sceneState() === 2`, and a known world tile. This is the safer readiness test before dispatching menu or movement actions. Current `TaskBot` and `TreeBot` use this gate internally during scene rebuilds.

**Compatibility note:** these methods are present on the current `Game` implementation installed through the client ABI, but the inspected `packages/rs2b0t-api/index.d.ts` declaration snapshot does not yet declare them. TypeScript external scripts may therefore need a package declaration update before using them without a type error.

## Camera

```ts
Game.cameraYaw(): number
Game.cameraPitch(): number
Game.setCameraYaw(yaw: number): boolean
```

Yaw uses the client's 0–2047 orbit scale. Pitch is client-side orbit pitch.

## Combat

Named melee styles:

```ts
type MeleeCombatStyle =
  | 'attack'
  | 'strength'
  | 'controlled'
  | 'defence';
```

Declared external methods include:

```ts
Game.combatMode(): number
Game.combatStyleResolution(style): CombatStyleResolution | null
Game.combatStyleMode(style): number | null
Game.hasCombatStyle(style): boolean
Game.setCombatStyle(style): boolean
Game.setCombatMode(mode): boolean
```

The current client implementation additionally has:

```ts
Game.combatStyles(): readonly CombatModeLabel[] | null
Game.autoRetaliateOn(): boolean
Game.attackedByPlayer(): boolean
Game.setAutoRetaliate(on: boolean): boolean
```

`combatStyles()` reflects the labels actually offered by the currently loaded weapon interface. `attackedByPlayer()` tests whether the local player's face target is encoded as a player target.

These additional methods are implementation/ABI capabilities not present in the inspected external `.d.ts`; treat them as declaration-drift rather than universally portable package API until the package surface catches up.

## Side tabs and magic

The external declaration includes:

```ts
Game.openSideTab(tab: number): Promise<boolean>
Game.castOnNpc(spell: string, npc: Npc): Promise<boolean>
Game.teleport(name: string): Promise<boolean>
```

The current implementation also contains:

```ts
Game.castOnLoc(spell: string, loc: Loc): Promise<boolean>
Game.castOnItem(spell: string, item: InvItem): Promise<boolean>
```

Those two targeted-spell helpers are currently declaration-drift: useful client capabilities, but not in the inspected external package declaration.

A successful `teleport()` call confirms dispatch, not arrival. Verify the resulting location separately.

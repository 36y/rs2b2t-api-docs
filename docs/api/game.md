# Game

`Game` exposes local-player and basic client state.

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

## World tile readiness

`Game.tile()` can be `null` before login or scene initialization.

Always handle that state.

## Camera

```ts
Game.cameraYaw(): number
Game.cameraPitch(): number
Game.setCameraYaw(yaw: number): boolean
```

Yaw uses the client's 0–2047 orbit scale. Pitch is client-side orbit pitch.

## Combat style

Named melee styles:

```ts
type MeleeCombatStyle =
  | 'attack'
  | 'strength'
  | 'controlled'
  | 'defence';
```

Methods:

```ts
Game.combatMode()
Game.combatStyleResolution(style)
Game.combatStyleMode(style)
Game.hasCombatStyle(style)
Game.setCombatStyle(style)
Game.setCombatMode(mode)
```

`combatStyleResolution()` accounts for the actual style labels available on the current weapon interface.

## Magic

```ts
Game.castOnNpc(spell, npc): Promise<boolean>
Game.teleport(name): Promise<boolean>
```

A successful teleport call confirms dispatch, not arrival. Verify the resulting location separately.

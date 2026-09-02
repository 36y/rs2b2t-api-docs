# Low-level `reader`

The external package currently types the runtime reader only as:

```ts
reader: Record<string, (...args: never[]) => unknown>
```

That declaration deliberately provides almost no useful TypeScript information, but the actual exported object is the current `ClientAdapter.reader`. It is a powerful read-only escape hatch when a higher-level API has not caught up yet.

Prefer typed APIs such as `Game`, `Inventory`, `Skills`, `Npcs`, `Locs`, `Bank` and `Quests` whenever they expose the state you need.

## Useful runtime reader families

The current reader includes substantially more than the package type reveals. Script-relevant examples include:

```ts
reader.attached()
reader.ingame()
reader.sceneState()
reader.worldTile()
reader.hintTile()
reader.mapBuildBase()
reader.selfAnim()
reader.selfChat()
reader.energy()
reader.weight()
reader.cameraYaw()
reader.cameraPitch()
reader.statsReady()
reader.stat(index)
reader.varp(index)
reader.chat(count)
reader.playerCount()
reader.npcCount()
reader.npcs()
reader.players()
reader.locs()
reader.groundItems()
reader.inventory()
reader.inventorySize()
reader.inventorySnapshotReady()
reader.equipment()
reader.objCatalog()
reader.bankItems()
reader.bankSideItems()
reader.bankSnapshotReady()
reader.bankSideSnapshotReady()
reader.bankSnapshotGeneration()
reader.chatOptions()
reader.chatModalTexts()
reader.mainModalTexts()
reader.makeProducts()
reader.mainSkillMultiItems()
reader.toWorld(lx, lz)
reader.toLocal(x, z)
reader.collisionFlags(lx, lz)
reader.lastWalkPathWorld()
reader.localPlayerName()
reader.combatLevel()
reader.loginMessage()
reader.menuEntries()
reader.modals()
reader.countDialogOpen()
reader.tradeConfirmOffers()
reader.tradeConfirmReady()
reader.modalButtons(rootComId)
reader.mainModalButtonNearText(label)
reader.sideTabInterface(tab)
reader.questStatuses()
```

There are also overlay/debug helpers such as `overlayPosWorld()`, `projectAreaGameWorld()`, `npcBox()`, `locBox()` and `itemIconPixels()`.

## Why this matters for comprehensive scripts

The reader can expose state that the higher-level API does not yet wrap. Examples include:

- `hintTile()` for hint-arrow-driven activities.
- `objCatalog()` for exact object metadata including IDs, costs, noted links, stackability and equippability.
- `modalButtons()` / `mainModalButtonNearText()` for quest-specific interfaces.
- `tradeConfirmOffers()` / `tradeConfirmReady()` for verifying the second trade screen.
- `lastWalkPathWorld()` and collision flags for navigation diagnostics.
- snapshot-readiness methods for distinguishing a real empty inventory/bank from an interface that has not populated yet.

## Typing a reader helper

Do not cast the entire reader to an enormous guessed interface. Isolate only the capability you need:

```ts
const ReaderRuntime = reader as unknown as {
  hintTile(): { x: number; z: number; level: number } | null;
};

const hint = ReaderRuntime.hintTile();
```

## Stability warning

`reader` is intentionally lower-level than the normal API. Its methods expose component IDs, raw snapshots, client varps and interface state. Those details can change more readily than `Game`, `Bank`, `Inventory`, etc.

Use it when it unlocks something the typed API cannot express, but keep each use behind a small helper so a future first-class API can replace it easily.

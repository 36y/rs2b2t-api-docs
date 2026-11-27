# Incoming packet subscriptions: developer reference

> **Rendered-host InTree API (not the external `@rs2b0t/api` package).** This page mirrors [the versioned source guide](https://github.com/36y/rs2b0t/blob/a91886084e858041951bd4aa0c74decb2590298a/docs/how-to/packet-subscriptions.md). API implementation baseline: `37aaec65`. This reference is not a Blackbox/Thin API contract.


**Implementation baseline: `37aaec652e9741066fcddb085c8fa5e683b237cc`.** This guide
describes the rendered rs2b0t host on `feature/intree-script-hot-reload`, not
Blackbox/Thin or a general RuneScape protocol. The host exposes all **69** incoming
opcodes declared and decoded at that baseline. Equipment, dialogue and movement
use the real inventory, interface and entity packets; there are no invented
equipment-change, trade-success or movement-complete opcodes.

This is an observation API. A decoded packet is evidence of what the server sent
and what this client decoded, not automatic proof that a requested action succeeded.

## Contents

1. [Architecture and timing](#1-architecture-and-timing)
2. [Complete API reference](#2-complete-api-reference)
3. [Incoming packet catalogue](#3-incoming-packet-catalogue)
4. [Lifecycle and action safety](#4-lifecycle-and-action-safety)
5. [Practical TypeScript examples](#5-practical-typescript-examples)
6. [Performance and best practices](#6-performance-and-best-practices)
7. [Script development workflow and troubleshooting](#7-script-development-workflow-and-troubleshooting)
8. [Quick reference](#8-quick-reference)

### Authority and confidence

The authoritative implementation is:

- [`ServerProt.ts`](https://github.com/36y/rs2b0t/blob/37aaec652e9741066fcddb085c8fa5e683b237cc/src/client/io/ServerProt.ts): numeric opcode definitions
  and packet sizes. This generated file is not a script configuration file.
- [`ServerPacketEvents.ts`](https://github.com/36y/rs2b0t/blob/37aaec652e9741066fcddb085c8fa5e683b237cc/src/client/io/ServerPacketEvents.ts): exact public
  payload types, runtime opcode maps and decoded-record capture representation.
- [`Client.ts`](https://github.com/36y/rs2b0t/blob/37aaec652e9741066fcddb085c8fa5e683b237cc/src/client/shell/Client.ts): framing, `tcpInDispatch`,
  `zonePacket`, player/NPC decoding and the placement of each capture site.
  [`ClientEntity.ts`](https://github.com/36y/rs2b0t/blob/37aaec652e9741066fcddb085c8fa5e683b237cc/src/client/dash3d/ClientEntity.ts),
  [`ClientPlayer.ts`](https://github.com/36y/rs2b0t/blob/37aaec652e9741066fcddb085c8fa5e683b237cc/src/client/dash3d/ClientPlayer.ts),
  [`ClientNpc.ts`](https://github.com/36y/rs2b0t/blob/37aaec652e9741066fcddb085c8fa5e683b237cc/src/client/dash3d/ClientNpc.ts) and
  [`ClientProj.ts`](https://github.com/36y/rs2b0t/blob/37aaec652e9741066fcddb085c8fa5e683b237cc/src/client/dash3d/ClientProj.ts) establish the movement,
  appearance, mask and projectile interpretations used below.
- [`ClientAdapter.ts`](https://github.com/36y/rs2b0t/blob/37aaec652e9741066fcddb085c8fa5e683b237cc/src/bot/adapter/ClientAdapter.ts): the post-decode hook,
  client-identity fencing and public API bindings.
- [`BotHost.ts`](https://github.com/36y/rs2b0t/blob/37aaec652e9741066fcddb085c8fa5e683b237cc/src/bot/runtime/BotHost.ts),
  [`ScriptContext.ts`](https://github.com/36y/rs2b0t/blob/37aaec652e9741066fcddb085c8fa5e683b237cc/src/bot/runtime/ScriptContext.ts) and
  [`ScriptRunner.ts`](https://github.com/36y/rs2b0t/blob/37aaec652e9741066fcddb085c8fa5e683b237cc/src/bot/runtime/ScriptRunner.ts): dispatch and ownership.

Unless marked otherwise, descriptions below are established by those sources.
**Received when** describes the purpose of the decoded command; it does not
promise a particular server cadence or ordering against every other command.
The original coverage test checked the enum against all capture sites, and offline
fixtures exercised representative formats and lifecycle boundaries. That is not
live validation of every field, content trigger, action or script. Compressed-text
failures, resource-dependent interpretation and unverified timing units are called
out explicitly. The examples here are source-reviewed, not newly built or run.

## 1. Architecture and timing

### 1.1 The receive-to-send path

```text
ClientStream receives bytes
  -> Client.tcpInDispatch reads/decrypts opcode and reads payload length
  -> waits until the complete payload is available
  -> optional interested-subscriber capture is created
  -> the existing client decoder reads the payload and applies its state changes
     -> player/NPC/zone records are captured in their existing decode order
  -> adapter's wrapped tcpIn returns from the decoder
  -> BotHost bookkeeping and compatible legacy listeners
  -> eligible subscribePackets callbacks, synchronously
  -> remaining packets in this client logic iteration, if any
  -> remainder of Client.gameLoop
  -> Client.gameLoop writes the outbound buffer to the stream
  -> BotClient calls BotHost.onFrame
     -> producer pump / frame listeners / Scheduler.pump
```

BotHost is the sole production owner of the adapter's packet hook. Scripts use
`subscribePackets`; they do not replace `setPacketListener`, install a competing
decoder, call `tcpIn`, or flush the client stream themselves.

The client drains **at most five incoming packets per logic iteration**. This is
an inbound client-side drain limit, not an outbound action budget or a server
tick limit. A burst can span multiple logic frames. A frame can also drain packets
that originated in different server cycles.

The decoder builds an event only for interested, eligible subscriptions. Fields
come from the existing decoder's local values/state at its capture sites. There
is no second player, NPC or zone decoder. Ignored compressed chat is the exception
to reusing an already-decoded value: when necessary, it is unpacked using the
existing `WordPack` codec with a separate cursor.

### 1.2 Dispatch order within one packet

Existing bookkeeping remains first:

1. The handled-packet sequence advances.
2. Invalid owned subscriptions are reconciled with the runtime/session.
3. Producer caches are marked dirty.
4. Legacy `addInterfaceTextListener` callbacks run for `IF_SETTEXT`.
5. Relevant location-cache invalidation and game-message recording occur.
6. For `PLAYER_INFO`, `tickCount` advances and legacy tick listeners run.
7. Generic `subscribePackets` callbacks run in registration order, subject to their
   filters and eligibility checks.

There is a separate terminal path for `LOGOUT`: it can notify an eligible existing
subscriber once, after the client has logged out, and then removes registrations.
Its decoder returns `false`; that does not prevent this terminal notification.

Consequences:

- Generic callbacks are post-decode, but do **not** precede the compatible legacy
  text or tick listeners. A legacy listener may already have enqueued an action.
- Client state for this packet has been applied when a generic callback runs.
  Later queued packets have not necessarily been processed.
- Producers have been invalidated, not necessarily rescanned. Frame-based event-bus
  notifications and the normal task loop may not have run yet.
- Removing a registration during dispatch prevents its later invocation. A new
  registration cannot receive the packet whose capture already started.

### 1.3 Packet-driven versus scheduler-driven work

| Work | Execution point | Appropriate use |
| --- | --- | --- |
| `subscribePackets` callback | Inside receive processing, after this decode | Fresh evidence, bounded state transitions, carefully guarded synchronous dispatch |
| `addTickListener` | Post-`PLAYER_INFO`, before generic packet callbacks | Existing tick observers; manually owned compatibility API |
| `addFrameListener` / Scheduler | After the client loop and its outbound flush | Normal task selection, waits and asynchronous gameplay APIs |
| Draw listener | When a draw actually occurs | Rendering-related observers, not gameplay timing |

An action synchronously enqueued in a packet callback can enter the current client
iteration's outbound flush. Actions created by the subsequent scheduler normally
wait for a later flush. This is an earlier client execution point, **not a promise
to save a server tick**. Network transit, backlog, server input cutoffs, per-player
processing order, action limits and server-side delays still determine execution.
Even immediately adjacent outbound commands need not both succeed.

Do not infer a fixed elapsed time from callback timing. Focused/background logic
rates differ, and the server's commonly observed approximately 600 ms cadence is
not a timestamp supplied by these events. Client animation-cycle delays are not
`Game.tick()` delays.

### 1.4 Observed tick ordering

`event.tick` is BotHost's observed `PLAYER_INFO` count. For that packet it already
includes the increment; packets received before it carry the preceding count.
It is not a server tick ID or a guarantee that all updates for a cycle are ready.
For example, inventory and XP updates can follow `PLAYER_INFO`; a listener at
that point can still read the preceding inventory/XP values.

Neither `tickCount` nor `sequence` is promised to reset on reconnect. Use
`session` and `connection` to scope script evidence, and use the packet carrying
the required value rather than waiting for, or guessing from, a tick boundary.

## 2. Complete API reference

### 2.1 Imports and runtime values

For a script at `src/bot/scripts/MyScript/MyScript.ts`:

```ts
import {
    BotHost, PacketOpcodes, serverPacketNames,
    type BotHostImpl, type PacketSubscriptionOptions,
    type PacketEvent, type PacketOpcode, type ServerPacketPayloads,
    type PacketSubEvent, type ZoneOpcode, type ZoneSubEvent,
    type EntityUpdate, type PlayerPacketUpdate, type NpcPacketUpdate,
    type InventorySlot, type Immutable
} from '../../runtime/BotHost.js';
import { ScriptRunner } from '../../runtime/ScriptRunner.js';
import type { ScriptContext } from '../../runtime/ScriptContext.js';
```

`BotHost` is the shared singleton, not something a script constructs. `BotHostImpl`
is its exported TypeScript type. `PacketOpcodes` is a frozen name-to-number object;
for example `PacketOpcodes.IF_SETTEXT` is the numeric literal `59`.
`serverPacketNames` is the frozen inverse map. Prefer named constants to numeric
arguments so code remains searchable and type inference stays precise.

The host entrypoint `src/bot/main.ts` also exports `BotHost`, the opcode maps,
`PacketSubscriptionOptions` and the packet/payload types listed above. Script
modules should use the shared runtime import rather than importing the startup
entrypoint for its side effects. `ScriptContext` is imported from its own module.
There is no new package name, `BotHost.packets` object or `onPacket` method.

### 2.2 `subscribePackets`

```ts
subscribePackets<K extends PacketOpcode>(
    owner: ScriptContext,
    opcodes: K | readonly K[],
    listener: (event: PacketEvent<K>) => void,
    options?: PacketSubscriptionOptions
): () => void;

subscribePackets(
    owner: ScriptContext,
    opcodes: '*',
    listener: (event: PacketEvent) => void,
    options?: PacketSubscriptionOptions
): () => void;

interface PacketSubscriptionOptions {
    raw?: boolean;
}
```

- **`owner`:** the exact current, non-aborted `ScriptContext`. Registration also
  requires the client to be in game. Capture it during `onStart`; a non-null
  assertion is not a substitute for checking it in delayed or external code.
- **`opcodes`:** one supported numeric opcode, a readonly array of supported
  opcodes, or the string `'*'` for all supported parent wire opcodes. An array is
  deduplicated within that registration. An empty array has no matching packets;
  it is not a wildcard. Unsupported numeric opcodes throw during registration.
- **`listener`:** a synchronous callback. Its event type is inferred from the
  filter. Separate calls register separately, even if given the same function.
- **`options.raw`:** only literal `true` requests raw payload bytes. Omitted/false
  uses typed payloads without requesting that copy.
- **Return:** an idempotent early-unsubscribe function. STOP/session cleanup owns
  removal automatically; scripts need not remember a handle just to stop safely.

```ts
// Inside onStart, where this.log is the bot's ordinary log method:
const owner = ScriptRunner.ctx;
if (!owner) throw new Error('No script context');

const removeText = BotHost.subscribePackets(owner, PacketOpcodes.IF_SETTEXT, event => {
    this.log(`${event.data.comId}: ${event.data.text}`);
});

BotHost.subscribePackets(owner, [PacketOpcodes.UPDATE_STAT, PacketOpcodes.VARP_SMALL], event => {
    if (event.opcode === PacketOpcodes.UPDATE_STAT) {
        this.log(`skill ${event.data.stat}, XP ${event.data.xp}`);
    } else {
        this.log(`varp ${event.data.varpId} = ${event.data.value}`);
    }
});

BotHost.subscribePackets(owner, '*', event => {
    // event is a discriminated union covering the whole supported protocol.
    // Do bounded work here; do not log every player/NPC update in a real script.
}, { raw: true });

removeText();
```

Use `as const` for a stored array of literal opcodes when needed. Do not cast an
arbitrary `number` to `PacketOpcode` to silence an unsupported-opcode problem.
Unsubscription is permanent for that registration; resume only restores eligibility
of registrations that still exist.

### 2.3 All event fields

The actual type is a distributed union, so checking `opcode` narrows `data`:

```ts
type PacketOpcode = keyof ServerPacketPayloads;
type Immutable<T> = T extends object
    ? { readonly [K in keyof T]: Immutable<T[K]> }
    : T;

type PacketEvent<K extends PacketOpcode = PacketOpcode> =
    K extends PacketOpcode ? Immutable<{
        opcode: K;
        name: (typeof serverPacketNames)[K];
        data: ServerPacketPayloads[K];
        sequence: number;
        tick: number;
        session: number;
        connection: number;
        raw: readonly number[] | null;
        subEvents: PacketSubEvent[];
    }> : never;
```

| Field | Meaning and scope |
| --- | --- |
| `opcode` | Numeric parent wire opcode. It is not replaced by an enclosed child opcode. |
| `name` | Matching literal name from `serverPacketNames`. |
| `data` | This packet's decoded payload from the catalogue. Empty-wire commands have an empty object, not an invented result. |
| `sequence` | Monotonically increasing BotHost handled-packet counter for this host lifetime. Gaps are normal for filtered/ineligible listeners. It is not a server sequence, request ID or cross-client ordering key. |
| `tick` | Observed `PLAYER_INFO` count after processing this packet; see section 1.4. |
| `session` | Client login/stat-session generation. It is a local provenance number, not an authentication token. |
| `connection` | Client transport-attempt generation, incremented when a login stream is installed. A reconnect can change it while preserving the stat session. It is not an account identifier. |
| `raw` | Frozen independent array of payload bytes, or `null`. No opcode, length header or cipher state is included. |
| `subEvents` | Ordered decoded child records. Usually empty except for entity updates and enclosed zones. Children are associated with this parent's sequence/session/connection through this array. |

Metadata is local to one rendered host. Do not compare sequence/tick values across
accounts as though they came from a shared server clock. An event contains no
receipt timestamp, action result, retry count, owner field or server tick number.

### 2.4 Payload types and immutability

`ServerPacketPayloads[typeof PacketOpcodes.UPDATE_STAT]` selects a payload type.
The map's array fields are mutable construction types internally; the delivered
`PacketEvent` wraps the entire structure in `Immutable` and freezes it recursively.
Use `Immutable<ServerPacketPayloads[K]>` for a retained standalone payload.

Events, nested objects, slot lists, entity arrays, child records, appearance bytes
and requested raw bytes are frozen snapshots. They do not alias mutable client
entity arrays or the reused network buffer. Retaining a bounded number is safe;
retaining every event indefinitely is a script memory leak.

`raw` can be non-null for a listener that did not request it if another matching
registration requested it at capture time. All matching subscribers share the
same frozen event. Mutating a sliced/copied array is fine; mutating the delivered
snapshot is not. A raw copy preserves exact wire bytes when decoded numeric
fields use sentinel normalization or other transformations.

### 2.5 Compound records

```ts
type ZoneOpcode =
    typeof PacketOpcodes.P_LOCMERGE | typeof PacketOpcodes.LOC_ANIM |
    typeof PacketOpcodes.OBJ_DEL | typeof PacketOpcodes.OBJ_REVEAL |
    typeof PacketOpcodes.LOC_ADD_CHANGE | typeof PacketOpcodes.MAP_PROJANIM |
    typeof PacketOpcodes.LOC_DEL | typeof PacketOpcodes.OBJ_COUNT |
    typeof PacketOpcodes.MAP_ANIM | typeof PacketOpcodes.OBJ_ADD;

type ZoneSubEvent = {
    [K in ZoneOpcode]: {
        kind: 'zone';
        opcode: K;
        data: ServerPacketPayloads[K];
    }
}[ZoneOpcode];

type PacketSubEvent = ZoneSubEvent | { kind: 'entity'; data: EntityUpdate };
```

These definitions describe the unfrozen construction types; delivered children are
deeply immutable. `PlayerPacketUpdate`, `NpcPacketUpdate` and their union
`EntityUpdate` are expanded in section 3.11.

Filters match **parent packets only**. Subscribing to `OBJ_ADD` does not also
subscribe to `OBJ_ADD` children inside `UPDATE_ZONE_PARTIAL_ENCLOSED`. Subscribe
to both parent opcodes and inspect the enclosed parent's `subEvents`.
A standalone zone packet puts its payload in `event.data`; it does not create a
second zone child for itself. Entity records are exposed both in `data.updates`
and as ordered `{ kind: 'entity', data }` children. Do not count both as separate
updates. Children have no separate `sequence`, `tick`, raw buffer or owner.

### 2.6 Compatible listeners and other public BotHost members

```ts
addInterfaceTextListener(cb: (comId: number, text: string) => void): () => void;
addTickListener(cb: () => void): () => void;
addFrameListener(cb: () => void): () => void;
addDrawListener(cb: () => void): () => void;

tickCount: number;
get tickMeanMs(): number;
selfTestMissing: string[];
```

- Text listeners see fresh `IF_SETTEXT`, not cached-text polling, and run before
  generic subscribers. Tick listeners run after `PLAYER_INFO` applies movement
  and increments `tickCount`. Frame/draw listeners run at their named host phases.
- These legacy listeners keep their **manual** unsubscribe/guard contracts. They
  are not automatically owned or pause-gated by `subscribePackets`. Remove them
  from `onStop`; add lifecycle/random-event guards when they perform script work.
- `tickMeanMs` is the mean of up to the last ten observed tick intervals, or zero
  before enough observations. Backlog, frame rate and reconnect gaps affect it;
  it is not a server latency or timing guarantee. Treat `tickCount` as read-only
  in scripts despite its public property declaration. `selfTestMissing` reports
  adapter-internal binding checks, not game readiness or protocol coverage.

The following methods are public for host plumbing, **not script execution hooks**:

```ts
attach(client: unknown): void;
configurePacketRuntime(
    owner: () => ScriptContext | null,
    eligible: () => boolean
): void;
onFrame(): void;
onDraw(): void;
```

The client/runner calls them. A script must not call them to impersonate ownership,
advance the scheduler or manufacture frame/tick delivery. Similarly,
`ScriptContext.ownPacketSubscription(dispose: () => void): () => void` and
`disposePacketSubscriptions(): void` are runtime cleanup helpers; ordinary scripts
use the returned subscription handle. `PacketCapture` and adapter hook setters
are internal implementation machinery, not alternate subscription APIs.

## 3. Incoming packet catalogue

### Reading the catalogue

All payload structures below are exact delivered field names. They are shown
without `readonly` for readability; section 2.4 applies to every delivered value.
`number` does not itself imply an ID, a world coordinate, milliseconds or a server
tick. Unless a row says otherwise, fields are the decoder's captured numeric
values, not resource-resolved names or final rendered state.

Component IDs and opcode IDs are different namespaces. A modal root component,
an inventory component and a button component are also different things.
Numeric constants below are established for the committed rendered bindings;
they are not universal across protocol/resource revisions.

### 3.1 Interfaces, dialogue and tutorial commands — 21 opcodes

#### IF_OPENCHAT (81)

Payload: `{ comId: number }`.

- **Fields:** `comId` is the unsigned root interface ID to open in the chat area.
- **Receipt/use:** received when content opens/reopens chat dialogue; observe a
  fresh dialogue page and query `ChatDialog.texts()`/`canContinue()` afterward.
- **Pitfalls:** the decoder also clears the main modal and a side modal. Text can
  have arrived earlier in separate packets. Opening is not permission to continue
  every dialogue, nor proof a server pause-button trigger is ready.

#### IF_OPENMAIN_SIDE (55)

Payload: `{ mainComId: number; sideComId: number }`.

- **Fields:** root main-viewport and side-panel component IDs respectively.
- **Receipt/use:** opens paired interfaces, such as the trade offer screen.
  Trade uses main `3323`, side `3321`; its side inventory is a separate `3322`.
- **Pitfalls:** clears chat/count-input state locally. Root visibility does not
  prove inventory components have received a full update or acceptance occurred.

#### IF_CLOSE (23)

Payload: `{}` (`Record<string, never>` in the type map).

- **Receipt/use:** closes main/side/chat modals and count-input state. Use to
  invalidate interface observations or follow a known transaction transition.
- **Pitfalls:** carries no reason, root ID, success flag or transaction ID. It can
  occur during a successful transition, cancellation or an unrelated modal change.
  In the established trade path a close can precede the confirmation prompt.

#### IF_SETICON (63)

Payload: `{ comId: number; icon: number }`.

- **Fields:** `icon` is the side-tab slot; `comId` is its interface assignment.
- **Receipt/use:** binds/rebinds a side-tab interface; useful when locating the
  current backpack/equipment interfaces instead of assuming fixed components.
- **Pitfalls:** event `comId` preserves unsigned `65535`; the decoder subsequently
  converts that value to `-1` for an absent tab interface. This is not item equipment.

#### IF_SHOWICON (189)

Payload: `{ icon: number }`.

- **Fields:** `icon` is the active side-tab index read from the packet.
- **Receipt/use:** server-requested tab selection; observe a changed active tab.
- **Pitfalls:** does not fill the tab's inventory or prove all interface data ready.

#### IF_OPENMAIN (119)

Payload: `{ comId: number }`.

- **Fields:** unsigned main-viewport root ID.
- **Receipt/use:** opens a main interface and closes side/chat/count-input state.
  `3443` is the trade confirmation root in the current Trade binding.
- **Pitfalls:** the confirmation prompt can arrive before this root becomes
  locally visible. Waiting for this packet can be later than text-based evidence;
  neither packet proves both final trade acceptances completed.

#### IF_OPENSIDE (252)

Payload: `{ comId: number }`.

- **Fields:** unsigned side-panel root ID.
- **Receipt/use:** opens a side modal; useful for observing interface-mode changes.
- **Pitfalls:** clears main/chat/count-input state; it does not update item slots.

#### IF_OPENOVERLAY (127)

Payload: `{ comId: number }`.

- **Fields:** signed 16-bit overlay root ID; `-1` represents no overlay in the
  client's stored overlay state. Nonnegative IDs have animation state reset.
- **Receipt/use:** installs/removes a main overlay; observe overlay transitions.
- **Pitfalls:** an overlay is not the main modal and does not imply a blocking
  dialogue or an interaction target is ready.

#### IF_SETCOLOUR (160)

Payload: `{ comId: number; colour: number }`.

- **Fields:** target component and packed colour. The client expands 5-bit RGB
  channels with `(r << 19) + (g << 11) + (b << 3)` for its stored display colour.
- **Receipt/use:** updates interface colour; useful for content whose UI state
  is explicitly encoded by that component's colour.
- **Pitfalls:** `colour` is the packed input value, not the expanded display RGB
  or a generic accepted/ready boolean. Content-specific meanings need evidence.

#### IF_SETHIDE (138)

Payload: `{ comId: number; hide: boolean }`.

- **Fields:** component and `hide`, decoded as input byte exactly equal to `1`.
- **Receipt/use:** changes a component's hidden flag; observe a known button or
  display element being enabled/hidden by content.
- **Pitfalls:** `hide: false` does not prove the root or every ancestor is visible,
  or that pressing the component will be accepted server-side.

#### IF_SETOBJECT (18)

Payload: `{ comId: number; objId: number; zoom: number }`.

- **Fields:** component, item definition ID and unsigned zoom input. The client
  loads the item's model/angles and derives model zoom as `type.zoom2d * 100 / zoom`.
- **Receipt/use:** sets a component's item model; useful for item-dialogue/model UI.
- **Pitfalls:** this is **not an inventory item transfer**. `zoom` is a divisor,
  not a ready-to-use screen scale; the definition resources affect the result.

#### IF_SETMODEL (222)

Payload: `{ comId: number; modelId: number }`.

- **Fields:** component and model definition ID.
- **Receipt/use:** assigns an interface model; observe a content-specific model change.
- **Pitfalls:** a model ID is not an item ID, actor index or server action result.

#### IF_SETANIM (211)

Payload: `{ comId: number; seqId: number }`.

- **Fields:** component and signed 16-bit sequence ID. `-1` clears the component
  animation and resets its local frame/cycle state.
- **Receipt/use:** changes interface-model animation; observe UI animation state.
- **Pitfalls:** not a player/NPC animation and not evidence that gameplay finished.

#### IF_SETPLAYERHEAD (30)

Payload: `{ comId: number }`.

- **Fields:** target component only; the client derives its head model from the
  current local player's appearance if that player exists.
- **Receipt/use:** requests the local player head in an interface/dialogue.
- **Pitfalls:** there is no incoming player ID, appearance block or name here.
  A missing local player prevents the model assignment without adding fields.

#### IF_SETTEXT (59)

Payload: `{ comId: number; text: string }`.

- **Fields:** component ID and the fresh newline-terminated protocol string,
  already assigned to that component when callbacks run.
- **Receipt/use:** interface labels, dialogue lines, trade status and prompt text.
  Use the **event's** identity/text for fresh evidence rather than polling cached text.
- **Pitfalls:** text assignment need not coincide with opening the containing
  interface. Empty strings are real updates. Text may include client formatting
  tags; there is no automatic dialogue classification, markup removal or content ID.

#### IF_SETNPCHEAD (244)

Payload: `{ comId: number; npcId: number }`.

- **Fields:** component and NPC **definition** ID.
- **Receipt/use:** assigns an NPC head model to dialogue/interface UI.
- **Pitfalls:** `npcId` is not an instance index and does not prove that NPC is
  present in the scene, close enough, or the current interaction partner.

#### IF_SETPOSITION (79)

Payload: `{ comId: number; x: number; y: number }`.

- **Fields:** component and signed 16-bit interface position values.
- **Receipt/use:** moves interface components; useful for observing a known UI layout.
- **Pitfalls:** these are interface positions, not world/scene coordinates or a
  player's movement. Do not use them as click coordinates without layout context.

#### IF_SETSCROLLPOS (184)

Payload: `{ comId: number; pos: number }`.

- **Fields:** component and requested unsigned scroll position.
- **Receipt/use:** changes a scrollable interface layer's position.
- **Pitfalls:** the event preserves the request **before clamping**. The client
  checks the component is a layer and clamps to its height/scroll range; stored
  scroll position can therefore differ from `pos`.

#### TUT_FLASH (181)

Payload: `{ icon: number }`.

- **Fields:** side-tab icon index to flash.
- **Receipt/use:** tutorial tab guidance; observe which tab content requests.
- **Pitfalls:** if the flashed tab is already selected, the client selects tab
  `1` when the flashed icon is `3`, otherwise tab `3`. This is guidance/display
  state, not quest or tutorial completion.

#### TUT_OPEN (12)

Payload: `{ comId: number }`.

- **Fields:** signed 16-bit tutorial interface ID; `-1` is an absent interface.
- **Receipt/use:** changes the tutorial interface rendered in the chat area.
- **Pitfalls:** distinct from `IF_OPENCHAT`; do not assume `ChatDialog.canContinue()`
  becomes true, or interpret the root ID as a progress varp.

#### P_COUNTDIALOG (35)

Payload: `{}`.

- **Receipt/use:** opens the count input and clears social-input mode. Useful for
  observing that an Offer-X/Withdraw-X style operation requested a quantity.
- **Pitfalls:** no amount, item ID or originating action is supplied. Correlate
  with the script's own operation before answering; do not assume every count
  prompt belongs to the most recently observed inventory packet.

#### Established interface component IDs

| Component ID | Established use | Important distinction |
| --- | --- | --- |
| `3323` | Trade offer main root | `Trade.onOfferScreen()` checks this root. |
| `3321` | Trade side root | The side inventory component is `3322`, not this root. |
| `3322` | Trade-side backpack / Offer-All source | Not the normal main backpack. |
| `3415`, `3416` | Own / partner offer inventories | Not confirmation-screen inventories. |
| `3417` | Offer-screen partner header | `Trade.partner()` parses this cached label. |
| `3420`, `3546` | First / confirmation accept buttons | Buttons, not incoming opcodes or screen roots. |
| `3422` | Offer-screen decline component | Its presence is not proof of a working server button trigger. |
| `3443` | Trade confirmation main root | Can become visible after the prompt text arrives. |
| `3535` | Confirmation prompt/status text | Fresh prompt `Are you sure you want to make this trade?` is used by the existing Crafter experiment. |
| `3542`, `3538` | Own confirmation inventories, small / large | Small below 14 offered items; large at 14 or more. Consider both components. |
| `3532`, `3539` | Partner confirmation inventories, small / large | Do not read `3416` as the confirmation offer. |
| `3557`, `3558` | Own / partner confirmation "nothing" labels | An empty offer is legal; "Absolutely nothing!" distinguishes it from unfilled UI. |
| `3214` | Normal backpack component used in the existing Crafter integration | The general inventory API discovers the current binding dynamically; do not generalize it to bank/trade-side views. |

The equipment binding is discovered from side-tab index `4`; the normal backpack
uses tab index `3`. The current adapter does **not** establish a universal fixed
equipment component ID for scripts. Bank inventories are also located dynamically
from the current interface's withdraw/deposit operations.

### 3.2 Inventory and equipment transmission — 3 opcodes

Shared element type: `InventorySlot = { slot: number; id: number; count: number }`.
`slot` is a zero-based component slot. `id` is normalized from the wire's unsigned
item-ID-plus-one to the item definition ID; `-1` means empty. `count` is the
decoded quantity: an unsigned byte unless byte `255` introduces a signed 32-bit
quantity. Do not turn an empty slot into an item merely because a cached count exists.

#### UPDATE_INV_STOP_TRANSMIT (28)

Payload: `{ comId: number }`.

- **Fields:** inventory component whose transmission stops.
- **Receipt/use:** invalidates a component stream when interfaces/content change;
  current readiness bookkeeping marks it non-transmitting and clears full readiness.
- **Pitfalls:** this does not say the player's authoritative inventory is empty.
  Old component quantities can be cached. It occurs during both successful trade
  progression and cancellation, so is not standalone trade-success evidence.

#### UPDATE_INV_FULL (107)

Payload: `{ comId: number; size: number; slots: InventorySlot[] }`.

- **Fields:** component, encoded slot count and entries for slots `0..size-1`.
  The client clears the remainder of the component's arrays after that prefix.
- **Receipt/use:** a full transmission, commonly the initial snapshot for a bound
  backpack, equipment, bank, trade or other inventory component. Use to establish
  the relevant component's baseline or invalidate item-derived script work.
- **Pitfalls:** `size` is not the number of occupied slots or a universal capacity
  of 28. Entries can be empty. A full **trade** inventory is not a full backpack.

#### UPDATE_INV_PARTIAL (76)

Payload: `{ comId: number; slots: InventorySlot[] }`.

- **Fields:** component and ordered changed-slot entries; `slot` is read using
  the existing unsigned smart integer codec. Item IDs/counts normalize as above.
- **Receipt/use:** patches transmitted inventories as items/quantities change;
  useful for spotting updated backpack, worn equipment, bank or offer contents.
- **Pitfalls:** omitted slots are unchanged, not empty. The event can include
  an out-of-range slot the client ignores for its arrays. A partial update alone
  does not establish a full current-session inventory baseline. There is no
  separate equipment opcode: resolve the component or query `Equipment.items()`.

### 3.3 Players, NPCs, identity and animation reset — 4 opcodes

#### PLAYER_INFO (188)

Payload: `{ updates: PlayerPacketUpdate[] }`.

- **Fields:** ordered decoded records detailed in section 3.11: local movement,
  retained/removed/added visible players, update masks and individual mask fields.
  The same records appear as entity children in `subEvents`.
- **Receipt/use:** updates the player block; BotHost uses it as its observed-tick
  signal. Subscribe for fresh movement, appearance, chat, hits or tick-driven work.
- **Pitfalls:** an event can contain no actual movement. The local player uses
  client index `2047`, not necessarily the server `UPDATE_PID.slot`. It is not a
  full snapshot of all world players, nor proof that animation/walking has finished
  or that the cycle's following inventory/stat packets were processed.

#### NPC_INFO (65)

Payload: `{ updates: NpcPacketUpdate[] }`.

- **Fields:** ordered count, visibility/movement, additions, masks and decoded NPC
  mask fields, also exposed as entity children. See section 3.11.
- **Receipt/use:** updates locally visible NPC instances; useful for tracking
  movement, identity changes, speech, hits, facing and animation.
- **Pitfalls:** NPC indices are instances and can be reused. NPC type IDs are
  definitions. An NPC packet does **not** increment BotHost's observed tick.
  Removal/visibility is not proof of death or a completed interaction.

#### RESET_ANIMS (201)

Payload: `{}`.

- **Receipt/use:** clears primary animation IDs on existing client players and NPCs.
  Use to invalidate animation-dependent assumptions across a reset.
- **Pitfalls:** no entity list or success reason is supplied. It does not reset
  the script's transaction state or prove every other animation/effect disappeared.

#### UPDATE_PID (120)

Payload: `{ slot: number; members: number }`.

- **Fields:** unsigned server self-slot and membership-account byte, stored by the client.
- **Receipt/use:** establishes/updates local identity metadata, often during login.
- **Pitfalls:** `slot` is not a player name or the special client-local index
  `2047`. `members` is kept as a number, not converted to boolean or a guarantee
  that the current world/content supports every members action.

### 3.4 Chat, private messages, friends and ignores — 6 opcodes

#### FRIENDLIST_LOADED (235)

Payload: `{ status: number }`.

- **Fields:** friend-server status byte, passed through without enum conversion.
- **Receipt/use:** updates friend-list service/readiness state.
- **Pitfalls:** numeric meanings are not formalized by this API; do not infer a
  complete friend list or logged-in gameplay readiness from one status byte.

#### MESSAGE_GAME (196)

Payload: `{ message: string }`.

- **Fields:** the original decoded protocol string, before display-message rewriting.
- **Receipt/use:** game messages and request notifications. The client recognizes
  `:tradereq:` and `:duelreq:` suffixes and may display rewritten request text.
- **Pitfalls:** a typed subscriber sees the original string even if normal chat
  display filters suppress it. It need not equal the latest chat-box line or
  `GameMessages` record. Match a proven exact message/pattern and correlate it with
  your operation; text alone is not a universal transaction/action-success API.

#### UPDATE_IGNORELIST (47)

Payload: `{ users: bigint[] }`.

- **Fields:** list of signed 64-bit protocol username hashes, one per eight bytes.
- **Receipt/use:** replaces the ignore-list values decoded by this client.
- **Pitfalls:** these are bigint encoded usernames, not player indices, strings
  or authentication tokens. JSON serialization needs an explicit bigint policy.

#### CHAT_FILTER_SETTINGS (13)

Payload: `{ publicMode: number; privateMode: number; tradeMode: number }`.

- **Fields:** public-chat, private-chat and trade filter mode bytes.
- **Receipt/use:** updates chat-mode state; useful for distinguishing UI filtering
  from whether a raw game/private-message packet actually arrived.
- **Pitfalls:** values are numeric protocol modes, not booleans. The API does not
  supply a named enum or guarantee that a mode change suppresses protocol exposure.

#### MESSAGE_PRIVATE (243)

Payload: `{ from: bigint; messageId: number; staffModLevel: number; packed: readonly number[]; text: string | null }`.

- **Fields:** `from` is the encoded username hash (`g8`); `messageId` is the signed
  32-bit incoming message ID; `staffModLevel` is the privilege byte. `packed` is
  the compressed message body after the 13-byte header. `text` is unpacked,
  unfiltered text, or `null` if the codec fails.
- **Receipt/use:** private-message receipt. A normal decoded value is reused;
  otherwise an interested subscriber can obtain text the display path skipped
  because of ignore/duplicate/chat-disabled checks.
- **Pitfalls:** receiving an event does not mean a chat line was displayed or the
  message was new to the display's duplicate-ID ring. Current display code treats
  staff values `1` and `2`/`3` specially; do not use them as authorization proof
  for commands. The API does not authenticate a sender beyond packet provenance.

#### UPDATE_FRIENDLIST (168)

Payload: `{ username: bigint; world: number }`.

- **Fields:** encoded username hash and world byte; the client treats world `0`
  as offline and positive worlds as online for its friend list.
- **Receipt/use:** inserts/updates a friend entry; useful for friend presence observers.
- **Pitfalls:** it is not a scene-player update. The client can sort the list
  afterward, so a UI row position is not a stable identity. Display names are
  resolved separately from the encoded username.

### 3.5 Status, login, hints and player options — 11 opcodes

#### UNSET_MAP_FLAG (164)

Payload: `{}`.

- **Receipt/use:** clears the client's destination map flag by resetting its X flag.
  Useful for invalidating a displayed destination/operation assumption.
- **Pitfalls:** it can accompany rejected actions. It is neither movement-complete
  evidence nor proof that the player has arrived at a requested tile.

#### UPDATE_RUNWEIGHT (46)

Payload: `{ weight: number }`.

- **Fields:** signed 16-bit value stored as the client's run-weight display value.
- **Receipt/use:** weight display updates; use alongside equipment/backpack observations.
- **Pitfalls:** no item breakdown is included. The packet API applies no further
  unit conversion; do not infer fractional underlying weight or item changes.

#### HINT_ARROW (115)

Payload: `{ type: number; npc?: number; player?: number; x?: number; z?: number; height?: number }`.

- **Fields:** `type` preserves the original byte. Type `1` supplies `npc` instance
  index; type `10` supplies `player` index; types `2..6` supply unsigned target
  coordinates `x`, `z` and a height byte. Other types add none of those fields.
- **Receipt/use:** server hint targets; useful for content that explicitly uses
  hint arrows to identify an actor or location.
- **Pitfalls:** only read fields appropriate to `type`. The client normalizes
  types `2..6` to its tile-hint mode `2` after choosing offsets: type `2` `(64,64)`,
  `3` `(0,64)`, `4` `(128,64)`, `5` `(64,0)`, `6` `(64,128)` in tile fine units.
  These derived offsets are not additional event fields. A hinted entity can be absent.

#### UPDATE_REBOOT_TIMER (204)

Payload: `{ ticks: number }`.

- **Fields:** unsigned wire countdown value. Despite the field name, the decoder
  stores `value * 30` in its local reboot counter and the event captures that
  counter divided by 30, recovering the original input value.
- **Receipt/use:** reboot/shutdown countdown updates; use for a script's own
  planned shutdown policy.
- **Pitfalls:** this is not `event.tick`, an absolute deadline or an API guarantee
  of wall-clock milliseconds. Logic cadence affects the local countdown.

#### UPDATE_STAT (154)

Payload: `{ stat: number; xp: number; level: number }`.

- **Fields:** skill index byte, cumulative signed 32-bit XP value stored by the
  client, and effective-level byte. The client independently derives its base
  level from its experience table and marks that stat seen for the login session.
- **Receipt/use:** skill initialization and later XP/effective-level changes;
  useful for actual XP deltas or a skill-specific operation's progress evidence.
- **Pitfalls:** first receipt is a baseline, not earned XP. A level update may be
  boosted/drained and need not change XP. One stat does not establish all-stats
  readiness. A positive XP delta must still be attributed to the intended action.

Skill indices from `Skill.ts`: `0` attack, `1` defence, `2` strength, `3` hitpoints,
`4` ranged, `5` prayer, `6` magic, `7` cooking, `8` woodcutting, `9` fletching,
`10` fishing, `11` firemaking, `12` crafting, `13` smithing, `14` mining,
`15` herblore, `16` agility, `17` thieving, `18` slayer (marked unused there),
`19` unused, `20` runecraft, and `21..24` unused. Do not assume all 25 slots are
active or use a client's effective level as its base level.

#### UPDATE_RUNENERGY (195)

Payload: `{ energy: number }`.

- **Fields:** unsigned run-energy byte stored by the client.
- **Receipt/use:** energy updates; useful for run/rest/route policy inputs.
- **Pitfalls:** an energy observation is not a run-toggle acknowledgment or
  evidence of movement. The subscription API does not clamp the byte to a percentage.

#### LAST_LOGIN_INFO (253)

Payload: `{ address: number; daysSinceLogin: number; daysSinceRecoveries: number; unreadMessages: number; warnMembers: number }`.

- **Fields:** `address` is the signed 32-bit encoded last-login IPv4 value;
  `daysSinceLogin` and `unreadMessages` are unsigned 16-bit values;
  `daysSinceRecoveries` and `warnMembers` are bytes.
- **Receipt/use:** login-information UI data. The client can use it to select a
  login screen/interface and initiate reverse DNS work for a non-local address.
- **Pitfalls:** it is not the current connection's address or authentication
  evidence. The existing UI treats recovery value `201` specially; the API does
  not interpret every recovery-status code. Avoid logging personal login data.

#### LOGOUT (121)

Payload: `{}`.

- **Receipt/use:** explicit server logout. An eligible existing subscription can
  receive one final terminal event, then runtime-owned registrations are removed.
- **Pitfalls:** `Game.ingame()` is already false during that notification; normal
  action transport rejects actions. No reason or reconnect promise is included.
  A transport failure/local logout can remove subscriptions without a `LOGOUT`
  packet; a paused/interrupted owner is not guaranteed a terminal callback.

#### SET_MULTIWAY (247)

Payload: `{ multiway: number }`.

- **Fields:** multiway-zone byte stored without boolean conversion.
- **Receipt/use:** updates multiway-area state; useful as one input to combat policy.
- **Pitfalls:** no opponents, attacks, location or permission to initiate combat
  is conveyed. Do not manufacture a broader enum from this single numeric field.

#### SET_PLAYER_OP (21)

Payload: `{ index: number; priority: number; op: string }`.

- **Fields:** one-based player-option slot, priority byte and original option
  label. The client only applies slots `1..5`, maps case-insensitive `"null"`
  to an absent label, and treats priority byte `0` as its priority flag being true.
- **Receipt/use:** installs player menu operations; current Trade uses option `4`.
- **Pitfalls:** the event is captured **before** those transformations and range
  checks. It can contain `op: 'null'` or an ignored index. It does not identify
  a player or execute the option.

#### MINIMAP_TOGGLE (136)

Payload: `{ state: number }`.

- **Fields:** minimap-state byte.
- **Receipt/use:** changes minimap display mode; observe a known content's map mode.
- **Pitfalls:** no named state enum is exported by this API. A display mode does
  not establish scene readiness, world position, reachability or route completion.

### 3.6 Configuration variables — 3 opcodes

#### VARP_SMALL (75)

Payload: `{ varpId: number; value: number }`.

- **Fields:** unsigned 16-bit varp ID and **signed** 8-bit value (`-128..127`).
- **Receipt/use:** server configuration-variable update; useful for a known run,
  banking, quest or gameplay-state contract with an established varp definition.
- **Pitfalls:** the client can perform additional local reactions to the varp.
  The API supplies no varp-name database, varbit interpretation or action-success
  meaning. Do not reinterpret a negative byte as unsigned.

#### VARP_LARGE (97)

Payload: `{ varpId: number; value: number }`.

- **Fields:** unsigned 16-bit varp ID and signed 32-bit value.
- **Receipt/use:** larger server varp values; same content-definition requirement
  as `VARP_SMALL`.
- **Pitfalls:** do not infer a different variable namespace from the encoding
  width or use JavaScript unsigned coercion unless that varp's contract requires it.

#### VARP_SYNC (172)

Payload: `{}`.

- **Receipt/use:** reconciles the client's current varps with its server-varp
  table, invoking local reactions for differences. Useful for invalidating
  script-local assumptions after configuration reconciliation.
- **Pitfalls:** no changed-varp list is supplied. Read the existing gameplay API
  for the specific varp/state you need; do not invent per-varp child events.

### 3.7 Regions and zone containers — 4 opcodes

#### REBUILD_NORMAL (219)

Payload: `{ zoneX: number; zoneZ: number }`.

- **Fields:** unsigned 16-bit build-centre zone coordinates. When rebuilding,
  the client computes scene tile base as `((zoneX - 6) * 8, (zoneZ - 6) * 8)`.
- **Receipt/use:** scene-region rebuild request; invalidate scene-relative work
  and await `Game.sceneReady()` before new world interactions.
- **Pitfalls:** capture occurs even if the client short-circuits an identical
  already-ready rebuild. Receipt does not mean map resources loaded or the new
  scene built. Payload coordinates are zones, not tile or map-square coordinates.

#### UPDATE_ZONE_PARTIAL_FOLLOWS (155)

Payload: `{ x: number; z: number }`.

- **Fields:** unsigned byte scene-local tile origin for subsequent zone updates.
- **Receipt/use:** establishes the base used to decode later standalone zone opcodes.
- **Pitfalls:** no children are contained in this packet. It is neither a player
  position update nor a statement that all following updates are available now.

#### UPDATE_ZONE_FULL_FOLLOWS (144)

Payload: `{ x: number; z: number }`.

- **Fields:** unsigned byte scene-local tile origin of an 8-by-8 zone.
- **Receipt/use:** establishes the update base, clears ground-item state in that
  area on the current level and expires matching queued location changes.
- **Pitfalls:** the two-byte payload is not a complete serialized scene snapshot.
  There are no fabricated per-item deletion children; following packets can refill it.

#### UPDATE_ZONE_PARTIAL_ENCLOSED (112)

Payload: `{ x: number; z: number }`, plus ordered zone records in `subEvents`.

- **Fields:** unsigned byte scene-local origin; each child uses that origin to
  resolve its local position. Child payloads are the corresponding types in 3.8.
- **Receipt/use:** a container holding multiple zone commands; subscribe when
  monitoring ground items, locations, map effects or merged-player effects.
- **Pitfalls:** `event.data` contains only the origin, not a `children` field.
  The children are not dispatched as independent top-level subscriptions and
  cannot be given distinct server tick IDs. Unknown future child formats are not
  decoded by this API merely because a wildcard subscription exists.

### 3.8 Zone commands, ground items and locations — 10 opcodes

The following aliases expand all shared fields in these payloads:

```ts
// Documentation aliases; select exported payload types through ServerPacketPayloads.
type Zone = { x: number; z: number; level: number };
type Loc = Zone & { shape: number; rotate: number; layer: number };
```

`x` and `z` are **scene-local tiles**, computed as current zone origin plus the
packed offset's high/low 3-bit coordinates. `level` is the client's current level,
not a separate field read from each zone command. `shape = info >> 2`,
`rotate = info & 3`; `layer` is the existing shape-to-scene-layer lookup result
(wall, wall decoration, ground location or ground decoration). Use established
map/base APIs to convert scene coordinates; do not compare them directly with
`Game.tile()` world coordinates.

All ten commands can arrive standalone or inside an enclosed container. Out-of-scene
commands can still be captured although the client declines to apply their scene
mutation. Resource availability, current level and definition data can also affect
rendering. An observed command is not proof an interactable model/collision change
is already usable by a script.

#### LOC_ADD_CHANGE (90)

Payload: `Loc & { id: number }`.

- **Fields:** shared local position/level/shape/rotation/layer plus location definition ID.
- **Receipt/use:** creates/changes a queued scene location; monitor door/object changes.
- **Pitfalls:** the client can queue the change rather than rendering it immediately.
  `id` is not the packed scene `typecode` used by direct interaction APIs.

#### LOC_DEL (194)

Payload: `Loc`.

- **Fields:** shared local position/level and the location's shape/rotation/layer.
- **Receipt/use:** queues deletion of the location in that scene slot/layer.
- **Pitfalls:** no definition ID is supplied. Do not guess which object disappeared
  from coordinates alone without a prior legitimate scene observation.

#### LOC_ANIM (106)

Payload: `Loc & { seq: number }`.

- **Fields:** shared location fields and unsigned sequence ID.
- **Receipt/use:** animates an existing wall/decor/location model; useful for
  observing content-specific object animation.
- **Pitfalls:** `shape` is captured before rendering adjustments such as shape
  `11` being treated as `10` for a ground location. An absent model can prevent
  rendering. The event does not normalize `seq` to a player animation sentinel.

#### OBJ_ADD (60)

Payload: `Zone & { type: number; count: number }`.

- **Fields:** local tile/level, unsigned item definition value `type` and unsigned
  16-bit quantity `count`.
- **Receipt/use:** adds a ground-item entry; useful for loot/ground-state observers.
- **Pitfalls:** `OBJ` means a ground item here, not a scene location. The packet
  does not include ownership, takeability, reachability or proof the item was taken.

#### OBJ_DEL (71)

Payload: `Zone & { type: number }`.

- **Fields:** local tile/level and the original unsigned item type value. The
  client compares ground-item IDs against `type & 0x7fff` when deleting.
- **Receipt/use:** removes a ground-item entry matching that tile/type.
- **Pitfalls:** event `type` retains the original bits. Disappearance does not
  prove this player picked it up; it can expire or be removed for another reason.

#### OBJ_COUNT (117)

Payload: `Zone & { type: number; oldCount: number; count: number }`.

- **Fields:** local tile/level, original unsigned item type and unsigned 16-bit
  old/new quantities. The client matches `type & 0x7fff` and `oldCount` before replacing.
- **Receipt/use:** ground-stack quantity change; useful for refreshing an existing loot view.
- **Pitfalls:** an unmatched old stack is not created as a fallback. The type's
  high bit is not removed from the event, and this is not a backpack quantity delta.

#### OBJ_REVEAL (176)

Payload: `Zone & { id: number; count: number; pid: number }`.

- **Fields:** local tile/level, item definition ID, unsigned 16-bit quantity and
  player ID used by the reveal command.
- **Receipt/use:** reveals/adds a ground-item entry; the client skips creating
  that entry when `pid === selfSlot`.
- **Pitfalls:** subscribers can still receive the command in that skipped case.
  Do not interpret `pid` as proof that this player owns or can take the item.

#### MAP_ANIM (233)

Payload: `Zone & { spotanim: number; height: number; time: number }`.

- **Fields:** local tile/level, unsigned spot-animation definition, height byte
  and unsigned delay `time`. The client schedules it at `Client.loopCycle + time`
  and offsets its sampled terrain height by `height`.
- **Receipt/use:** schedules a stationary map effect; useful for content/effect observers.
- **Pitfalls:** this is a presentation effect, not an item or collision object.
  `time` is a client animation-cycle delay, not an observed server tick count.

#### MAP_PROJANIM (87)

Payload: `Zone & { x2: number; z2: number; targetEntity: number; spotanim: number; h1: number; h2: number; t1: number; t2: number; angle: number; startpos: number }`.

- **Fields:** `x,z` are source local tiles; `x2,z2` are destination tiles after
  adding signed byte offsets. `targetEntity` is a signed 16-bit target code;
  `spotanim` is the effect definition. `h1,h2` are source/destination heights
  **already multiplied by four** from their input bytes. `t1,t2` are unsigned
  start/end offsets added to `Client.loopCycle`. `angle` is the slope byte used
  in `-horizontalVelocity * tan(angle * 0.02454369)` for initial vertical velocity;
  `startpos` is the initial distance along the horizontal source-to-target vector
  in fine coordinate units.
- **Receipt/use:** creates a map projectile; observe a known projectile/effect.
- **Pitfalls:** source/destination are captured before conversion to fine
  coordinates (`tile * 128 + 64`). Target `0` keeps the supplied destination without
  entity retargeting; positive target `n` tracks NPC index `n - 1`; negative target
  `n` tracks player index `-n - 1`, resolving the self-slot to the local player.
  This is **not** the face-entity target encoding. The API does not resolve the
  target into an entity object or confirm a hit. Do not multiply heights twice or
  convert `t1,t2` into 600 ms server delays.

#### P_LOCMERGE (83)

Payload: `Loc & { id: number; t1: number; t2: number; pid: number; east: number; south: number; west: number; north: number }`.

- **Fields:** shared local location fields, location definition `id`, unsigned
  animation-cycle offsets `t1,t2`, target player `pid`, and signed byte bounds
  offsets `east,south,west,north`. The client resolves `pid === selfSlot` to the
  local player and uses resource/model data to attach the temporary location model.
- **Receipt/use:** player/location merged effects; useful for known transformation
  or temporary model interactions.
- **Pitfalls:** bounds are captured **before** the client sorts opposing offsets.
  They are not absolute world bounds. A missing player/model prevents the effect;
  the command does not establish an independent interactable scene location.

### 3.9 Camera commands — 4 opcodes

#### CAM_LOOKAT (82)

Payload: `{ x: number; z: number; height: number; rate: number; rate2: number }`.

- **Fields:** unsigned byte local tile `x,z`, unsigned height offset, and two
  camera-rate bytes. The client samples the target at tile centre (`*128 + 64`)
  relative to terrain height and enters cinematic-camera mode.
- **Receipt/use:** server camera look-at request; useful for recognizing a cutscene phase.
- **Pitfalls:** rate2 `>=100` causes an immediate angle calculation; otherwise
  later client logic interpolates. These fields do not describe player movement
  or guarantee the camera has reached its target when the callback runs.

#### CAM_MOVETO (73)

Payload: `{ x: number; z: number; height: number; rate: number; rate2: number }`.

- **Fields:** local tile camera destination, terrain-relative height offset and
  rate bytes, as for `CAM_LOOKAT` but controlling camera position.
- **Receipt/use:** cinematic camera movement/position request.
- **Pitfalls:** rate2 `>=100` assigns the position immediately; otherwise movement
  continues in client logic. Camera coordinates are not the player's destination.

#### CAM_SHAKE (208)

Payload: `{ axis: number; random: number; amplitude: number; rate: number }`.

- **Fields:** shake-axis index, random jitter magnitude, sinusoidal amplitude
  and rate bytes. The client enables that axis and resets its shake cycle.
- **Receipt/use:** camera-shake effect, potentially useful as a known cutscene cue.
- **Pitfalls:** there are five client shake slots; this is not gameplay damage
  evidence. The shake combines random jitter in approximately `[-random,+random]`
  with `sin(clientShakeCycle * rate / 100) * amplitude`, rounded to an integer.
  Numeric amplitudes/rates are effect parameters, not milliseconds.

#### CAM_RESET (133)

Payload: `{}`.

- **Receipt/use:** leaves cinematic camera mode and disables all five shake slots.
- **Pitfalls:** no final position or gameplay-ready flag is supplied. A camera
  reset does not establish a scene rebuild, movement or transaction completion.

### 3.10 Audio commands — 3 opcodes

#### SYNTH_SOUND (177)

Payload: `{ soundId: number; loops: number; delay: number }`.

- **Fields:** unsigned sound definition ID, loop byte and unsigned delay input.
  The client adds the sound resource's intrinsic delay before queueing playback.
- **Receipt/use:** requests a synthesized sound effect; observe a proven content cue.
- **Pitfalls:** disabled audio, low-memory mode or a full local sound queue can
  prevent playback. Exact delay-to-wall-time conversion is not an API contract;
  a received sound command is not action-success evidence by itself.

#### MIDI_SONG (187)

Payload: `{ songId: number }`.

- **Fields:** unsigned song ID captured before the client's `65535 -> -1`
  absent-song normalization.
- **Receipt/use:** changes desired background music, subject to client music state.
- **Pitfalls:** resource fetching, disabled music, low-memory mode and jingle
  timing affect playback. Receipt does not prove a particular track is audible.

#### MIDI_JINGLE (29)

Payload: `{ jingleId: number; delay: number }`.

- **Fields:** unsigned jingle definition ID and unsigned delay value assigned to
  the client's following-music delay state.
- **Receipt/use:** requests a jingle and adjusts music sequencing.
- **Pitfalls:** playback is resource/audio-setting dependent. The API does not
  establish wall-clock delay units or imply a skill/quest completion from a jingle.

### 3.11 Complete entity sub-event reference

Every record in this section includes `entity: 'player' | 'npc'` and
`index: number`, plus exactly the fields of its `kind`. In the actual types,
`PlayerPacketUpdate` fixes `entity: 'player'` and excludes `change-type`;
`NpcPacketUpdate` fixes `entity: 'npc'` and excludes `appearance`, `chat`,
`exact-move` and `teleport`. `EntityUpdate` is their union. Both support `say`.

The player-local record uses index `2047`. Ordinary player/NPC indices identify
instances within the current visibility/session, not permanent identities.
`count` is metadata with index `-1`. These records are emitted by existing decode
steps, not synthesized by comparing two whole-world snapshots.

| `kind` and complete additional structure | Meaning, receipt and interpretation |
| --- | --- |
| `{ kind: 'retain' }` | No movement information for this existing/local entity in this part of the block. It is not a claim of indefinite idleness or action completion. |
| `{ kind: 'remove' }` | A removal entry/candidate from explicit removal or a reduced old-visible count. The normal decoder can re-add the index in the same packet; do not infer death or final absence from this record alone. |
| `{ kind: 'extended' }` | Existing/local entity retained with an extended update but no movement operation at this point. The actual mask/field records follow later. |
| `{ kind: 'count'; count: number }` | Number of old-visible entries in this block. Index is `-1`. This is not the final count after additions, nor the number of all world entities. |
| `{ kind: 'walk'; walkDir: number; extended: boolean }` | A directional step passed to the existing route queue, and whether a mask is scheduled. It does not mean interpolated movement already finished. |
| `{ kind: 'run'; walkDir: number; runDir: number; extended: boolean }` | Two route directions, both queued as running, plus whether a mask follows. These are direction codes, not coordinates or a run-toggle acknowledgment. |
| `{ kind: 'teleport'; x: number; z: number; level: number; jump: boolean; extended: boolean }` | Local-player absolute scene-local tile/level update; `jump` is the decoded route-reset/jump flag. Player only. Does not prove the surrounding scene is ready. |
| `{ kind: 'add'; dx: number; dz: number; jump: boolean; extended: boolean; typeId: number | null }` | New-visible entity positioned relative to the local player's route tile. Signed 5-bit offsets are normalized to `-16..15`. Player `typeId` is null; NPC `typeId` is its decoded definition where available. This can reuse a previous index. |
| `{ kind: 'mask'; mask: number }` | The full decoded update bitmask. A player mask includes the expanded high byte when `BIG_UPDATE` is set. The flag announces following fields; it is not a field value or action result. |
| `{ kind: 'appearance'; bytes: readonly number[]; name: string | null; combatLevel: number; skillLevel: number; gender: number; headicons: number; transmog: number | null; appearance: readonly number[]; colours: readonly number[]; animations: readonly number[] }` | Player only. `bytes` is the original appearance block, not the whole parent payload. Other fields snapshot the decoded appearance: display name, combat/skill level values, gender code, head-icon bits, NPC transformation definition or null, 12 appearance-part codes, five palette indices and seven animation IDs. Appearance parts are not plain item IDs. Resource-dependent values and cached parts follow the genuine decoder; use `bytes` for exact original representation. |
| `{ kind: 'animation'; id: number; delay: number }` | Requested primary sequence and delay byte. `id` has already normalized `65535` to `-1`. The client can reject/restart differently according to sequence priority/restart settings, so this is the requested update, not a promise of the resulting primary animation. |
| `{ kind: 'face-entity'; target: number }` | Unsigned target code captured before `65535 -> -1` normalization. Other values below `32768` address NPC indices; values at/above `32768` address player index `target - 32768`, with self-slot remapped locally to `2047`. Facing is not proof of attacking or trading. |
| `{ kind: 'say'; text: string }` | Plain decoded speech string. Player SAY can add a normal chat line when named; NPC SAY sets the overhead chat state. There is no sender-name field in this record beyond the entity index. |
| `{ kind: 'hit'; secondary: boolean; damage: number; damageType: number; health: number; totalHealth: number }` | One hit update and the decoded current/maximum-health bytes. `secondary` distinguishes the second hit mask. Damage-type numeric meanings are not enumerated here. This does not establish loot ownership or a final death state. |
| `{ kind: 'face-square'; x: number; z: number }` | Unsigned facing-target coordinate values. Client fine target is `(value - 2 * sceneBase) * 64`, so these are half-tile world-coordinate units, not direct `Game.tile()` values. No movement is requested by this record. |
| `{ kind: 'chat'; colourEffect: number; staffLevel: number; packed: readonly number[]; text: string | null }` | Player only. Packed colour/effect (`high byte` colour, `low byte` effect), privilege byte and compressed body, plus unfiltered unpacked text or null on failure. Can be exposed even when ordinary display skips it. Not an authenticated script command channel. |
| `{ kind: 'spotanim'; id: number; height: number; delay: number }` | Requested spot-animation definition, signed high-16-bit height and unsigned low-16-bit cycle delay. `id` is captured before `65535 -> -1`. This is an effect update, not a success marker. |
| `{ kind: 'exact-move'; startX: number; startZ: number; endX: number; endZ: number; start: number; end: number; facing: number }` | Player only. Byte scene-local endpoints, time offsets relative to the current client animation cycle and facing byte. Names follow the client fields exactly: its first time read populates `end`, the second populates `start`. Do not reorder them based on an assumed conventional wire layout or treat them as server tick IDs. |
| `{ kind: 'change-type'; typeId: number }` | NPC only. The decoded new NPC definition ID; the client also updates size/turn/animation attributes from that definition. This changes an instance's type, not its instance index. |

The appearance animation array order is `readyanim`, `turnanim`, `walkanim`,
`walkanim_b`, `walkanim_l`, `walkanim_r`, `runanim`; absent sequence values follow
the decoder's `-1` normalization. `gender`, `headicons`, appearance-part codes and
palette indices retain client/resource semantics rather than invented enums.
For ordinary appearance parts, `0` is empty, codes `256..511` refer to identity-kit
definitions by subtracting `256`, and codes at/above `512` refer to item definitions
by subtracting `512`. The special first-part `65535` appearance encoding instead
introduces an NPC transformation. Do not apply ordinary part decoding to that
sentinel or assume appearance-part indices equal the public equipment slot indices.

Direction codes from `ClientEntity.moveCode`:

| Code | Delta `(x,z)` | Direction |
| --- | --- | --- |
| `0` | `(-1,+1)` | northwest |
| `1` | `(0,+1)` | north |
| `2` | `(+1,+1)` | northeast |
| `3` | `(-1,0)` | west |
| `4` | `(+1,0)` | east |
| `5` | `(-1,-1)` | southwest |
| `6` | `(0,-1)` | south |
| `7` | `(+1,-1)` | southeast |

Mask values and field-decode order are established by the existing decoders:

| Player mask flag | Value | Record |
| --- | --- | --- |
| APPEARANCE | `0x1` | `appearance` |
| ANIM | `0x2` | `animation` |
| FACEENTITY | `0x4` | `face-entity` |
| SAY | `0x8` | `say` |
| HITMARK | `0x10` | `hit`, secondary false |
| FACESQUARE | `0x20` | `face-square` |
| CHAT | `0x40` | `chat` |
| BIG_UPDATE | `0x80` | high mask byte follows; no separate gameplay-field record |
| SPOTANIM | `0x100` | `spotanim` |
| EXACTMOVE | `0x200` | `exact-move` |
| HITMARK2 | `0x400` | `hit`, secondary true |

| NPC mask flag, in decode order | Value | Record |
| --- | --- | --- |
| HITMARK2 | `0x1` | `hit`, secondary true |
| ANIM | `0x2` | `animation` |
| FACEENTITY | `0x4` | `face-entity` |
| SAY | `0x8` | `say` |
| HITMARK | `0x10` | `hit`, secondary false |
| CHANGETYPE | `0x20` | `change-type` |
| SPOTANIM | `0x40` | `spotanim` |
| FACESQUARE | `0x80` | `face-square` |

Player records begin with local information, old-visible count/removal/retention
and movement records, new-visible additions, then extended masks and their fields.
NPC records begin with old-visible count information, old entries, additions,
then masks and their fields. Use array order, not a sort by entity index or kind.
A sub-event describes an intermediate decode step; the callback sees client state
after the **whole parent packet** has finished applying.

## 4. Lifecycle and action safety

### 4.1 Register for one exact script incarnation

Register during `onStart`, after the runner has created the current context.
Keep that context in closures or a field if delayed work will register another
listener. Never let an obsolete asynchronous continuation look up a replacement
`ScriptRunner.ctx` and pretend to be the replacement script.

Registration is refused for a non-current or aborted owner, or a logged-out client.
A current paused owner is not rejected just for being paused, but no callbacks
will run until eligible. Runtime ownership is distinct from any script-local
trade/quest/action transaction: the API does not create or validate those for you.

| Boundary | What happens to generic subscriptions | What the script should do |
| --- | --- | --- |
| START / `onStart` | Register explicitly for the new current context. No old packets are replayed. | Initialize needed baselines from current gameplay APIs. |
| Pause | Registrations remain but callbacks are suppressed. | Invalidate pending action intent and any state that must not cross an interruption. |
| Resume, same session | Remaining registrations become eligible again. Missed packets are not replayed. | Reconcile current state if continuity matters; do not assume a callback ran while paused. |
| Random-event handling / `EventSignal.pending()` | Capture/delivery is suppressed while the existing runtime interrupt policy blocks it; eligibility is checked again during dispatch. | Yield to the runtime. Do not disable providers to force a callback or keep stale queued work. |
| STOP / crash | Context-owned disposal removes registrations; a stopping/aborted owner cannot receive later callbacks. | Release script-local state/resources. Manual legacy listeners still need their own unsubscribe. |
| Explicit `LOGOUT` | One eligible fresh terminal event can be delivered, then owned registrations are removed. | Do no gameplay actions; the client is already out of game. Do not depend on this callback as the only cleanup mechanism. |
| Local logout / connection loss | Transport lifecycle notification removes registrations directly, without polling or a required server logout packet. | Drop stale packet-derived intent. |
| Reconnect / new login session | Transport or stat-session provenance changes invalidate old registrations. They are not silently rebound. | Explicitly register again for the still-current context only if the script intentionally supports reconnect, or start a fresh run. |
| Script replacement / InTree hot reload | STOP is required before reload; the old context's owned registrations are removed. A new run registers its own listeners. | Keep no cross-run mutable callback state in module globals. |
| Early unsubscribe | Removal is immediate and idempotent, including within another callback. | Register a new handle if observation is needed again; resume does not recreate a removed handle. |

An owner/session change between capture and dispatch fences the captured event.
The adapter also prevents an obsolete client object from delivering into a
replacement client's packet hook. Registration changes made by legacy listeners
do not make a new runtime incarnation receive an already-started packet.

This is an **in-game script-scoped API**, not a pre-login network sniffer. The
normal runner waits for playable state/stat readiness before `onStart`. Initial
`UPDATE_PID`, `LAST_LOGIN_INFO`, inventory or stat packets may already have arrived
by then. Protocol coverage does not mean every startup packet will be observable
from an ordinary script's `onStart`. Use current APIs for initial state; wildcard
or raw subscriptions do not recover earlier packets.

### 4.2 Synchronous callbacks only

Use a bounded synchronous callback to record evidence or synchronously dispatch a
carefully validated operation. Do not use `await`, start an `Execution.delay*`
chain, call an async gameplay API and ignore its promise, or wait in a busy loop
inside the listener. A callback that does not return also blocks receive processing
and the current outbound flush.

The implementation catches a synchronous listener exception, records it in the
owning script's existing error log and continues to other eligible listeners.
It attaches a rejection handler to a returned native `Promise`, but **does not
await it, cancel it, order its continuation, or fence actions after an `await`**.
That rejection handler is error containment, not asynchronous callback support.
Use the hybrid pattern in section 5.10 for async work.

Do not assume returning `false`, `true`, a number or a promise controls dispatch.
The callback contract returns `void`; there is no cancel-packet, stop-propagation
or action-success return channel. Use the unsubscribe handle or normal runtime
controls for their actual purposes.

### 4.3 Actions still need ownership, readiness and budgets

`subscribePackets` does not install an action scheduler or grant a new action
allowance. The existing transport, interfaces, server rules and script-specific
guards still apply. In particular:

- The runtime checks current ownership, running state, game/session provenance,
  random-event handling and `EventSignal` eligibility. It does not assert
  `Game.sceneReady()`, all-stat readiness, proximity, allowed partner, offer
  contents, inventory capacity, interface visibility or a content-specific action
  stall for your operation. Apply those guards when they matter.
- Use existing `Game`, `Trade`, `Inventory`, `Equipment`, navigation and input
  APIs. Do not synthesize server state, mutate decoder buffers or bypass normal
  transport by writing/flush-calling the socket yourself.
- Keep a single script-local owner for the transaction/action path. A packet
  callback and the normal task loop must not both dispatch the same operation.
  Consume an attempt/transition guard **before** dispatching, then let actual
  server evidence advance or invalidate the transaction.
- Count the real work an action generates. A normal interaction may enqueue
  `MOVE_OPCLICK` before its operation; one API call is not necessarily one server
  input packet. Returned `true` usually establishes dispatch, not acceptance.
- Existing script budgets stay in force. For example, AIORunecrafting has its
  own five-action guard; this is not a generic BotHost allowance or an API promise
  about the deployed server's input budget. The host does not share, reserve,
  reset or enforce that script's budget for new listeners.
- A per-`event.tick` attempt guard can suppress duplicates, but is not proof of
  a fresh server input budget. Observed ticks can lag, or several can be drained
  before one flush. Do not invent fixed tick delays to cover unknown ordering.

### 4.4 Trade and failed-craft interpretation

The existing Crafter uses fresh confirmation prompt evidence at component `3535`
and a separately validated transaction. That prompt establishes a confirmation-stage
transition in the investigated content; it is not a generic final-settlement signal.
In particular, both first acceptances do not prove that the partner's final
acceptance will be processed before an ordinary altar interaction. Sending an
early ordinary OPLOC can still cancel an incomplete trade.

`Trade.partner()` reads a cached header, `Trade.onConfirmScreen()` reads the current
modal root, and confirmation inventory components have their own stream updates.
They are related observations with different arrival points, not interchangeable
proofs. Bind them to a current allowed partner and current transaction before an
action. `IF_CLOSE` alone cannot distinguish cancellation from transition/settlement.

The exact dialogue `You do not have any rune stones to bind.` is established
failed-craft evidence in the current runecrafting content. The current script's
recovery deliberately replaces that dialogue with a new trade request rather than
continuing it. This guide's dialogue examples are opt-in policies for an exact
expected page, not instructions to change AIORunecrafting or continue every modal.
The host itself contains no runecrafting-specific recovery logic.

## 5. Practical TypeScript examples

### 5.1 Minimal InTree scaffold

This is a complete observation-only script file. The following short `onStart`
examples replace its `onStart` method and add their stated imports. Full class
examples later replace the class but reuse this `ownerForExample` helper and the
common imports. Copy only the subscriptions needed for the actual script.

```ts
import { LoopingBot } from '../../api/bot/Bot.js';
import { BotHost, PacketOpcodes } from '../../runtime/BotHost.js';
import { ScriptRunner } from '../../runtime/ScriptRunner.js';
import type { ScriptContext } from '../../runtime/ScriptContext.js';

function ownerForExample(): ScriptContext {
    const owner = ScriptRunner.ctx;
    if (!owner || owner.aborted) throw new Error('No current script context');
    return owner;
}

export default class PacketObserver extends LoopingBot {
    override onStart(): void {
        const owner = ownerForExample();
        BotHost.subscribePackets(owner, PacketOpcodes.MESSAGE_GAME, event => {
            this.log(event.data.message);
        });
    }

    override loop(): void {}
}
```

This scaffold logs game messages to illustrate receipt, not to infer success.
Real scripts should filter expected messages. The handles are runtime-owned, so
an otherwise empty `onStop` is not required for these generic registrations.
Example settings keys below are illustrative configuration inputs, not new built-in
settings. Defaults are intentionally inert for examples that can send an action;
define the appropriate schema through the normal script registration when adapting.

### 5.2 Interface and dialogue observation

Add `ChatDialog` from `../../api/ui/dialogue/ChatDialog.js`:

```ts
override onStart(): void {
    const owner = ownerForExample();
    const componentId = this.settings.num('componentId', -1);
    let lastText: string | null = null;

    BotHost.subscribePackets(owner, PacketOpcodes.IF_SETTEXT, event => {
        if (event.data.comId !== componentId) return;
        if (event.data.text === lastText) return;
        lastText = event.data.text;
        this.log(`Fresh component ${componentId}: ${lastText}`);
    });
    BotHost.subscribePackets(owner, PacketOpcodes.IF_OPENCHAT, event => {
        this.log(`Chat root ${event.data.comId}: ${ChatDialog.texts().join(' / ')}`);
    });
}
```

The first listener identifies fresh text before relying on component state. The
second observes an actual root open and queries current dialogue lines. Neither
calls continue. Repeated equal text can still be a new protocol event; dropping
it here is only a logging policy, not a general transaction-freshness rule.

### 5.3 Game-message reactions

```ts
override onStart(): void {
    const owner = ownerForExample();
    const expected = this.settings.str('messageText', '');
    BotHost.subscribePackets(owner, PacketOpcodes.MESSAGE_GAME, event => {
        if (expected.length === 0 || event.data.message !== expected) return;
        this.log(`Expected server message observed in session ${event.session}`);
        // Record a script-specific transition here; do not declare success
        // without the contract required by the operation being performed.
    });
}
```

This matches the original wire message, not a display-rewritten trade request.
It intentionally uses no arbitrary message as an authenticated command to act.

### 5.4 Trade progression observation

Add `Trade` from `../../api/trade/Trade.js`:

```ts
override onStart(): void {
    const owner = ownerForExample();
    BotHost.subscribePackets(owner, [
        PacketOpcodes.IF_OPENMAIN_SIDE,
        PacketOpcodes.IF_OPENMAIN,
        PacketOpcodes.IF_SETTEXT,
        PacketOpcodes.IF_CLOSE
    ], event => {
        if (event.opcode === PacketOpcodes.IF_OPENMAIN_SIDE) {
            if (event.data.mainComId === 3323) {
                this.log(`Offer root opened; cached partner: ${Trade.partner() ?? 'unknown'}`);
            }
        } else if (event.opcode === PacketOpcodes.IF_OPENMAIN) {
            if (event.data.comId === 3443) this.log('Confirmation root is now local');
        } else if (event.opcode === PacketOpcodes.IF_SETTEXT) {
            if (event.data.comId === 3535 &&
                event.data.text === 'Are you sure you want to make this trade?') {
                this.log('Fresh confirmation prompt; final settlement is not proven');
            }
        } else {
            this.log('A modal closed; this packet gives no trade result');
        }
    });
}
```

This observes both the earlier prompt and later local-root observation without
auto-accepting an unvalidated trade. `Trade.partner()` in the log is explicitly
cached. A production actor must already own a fresh allowed-partner transaction,
validate the required offer/readiness contracts and coordinate its task loop.
Do not reset every transaction solely on an intervening `IF_CLOSE`.

### 5.5 Backpack and equipment changes without guessing a worn-inventory ID

Add `Inventory` from `../../api/inventory/Inventory.js` and `Equipment` from
`../../api/equipment/Equipment.js`:

```ts
override onStart(): void {
    const owner = ownerForExample();
    const signature = (items: ReturnType<typeof Inventory.items>): string =>
        items.map(item => `${item.slot}:${item.id}:${item.count}`).join(';');
    let backpack = signature(Inventory.items());
    let worn = signature(Equipment.items());

    BotHost.subscribePackets(owner, [
        PacketOpcodes.UPDATE_INV_FULL, PacketOpcodes.UPDATE_INV_PARTIAL
    ], event => {
        const nextBackpack = signature(Inventory.items());
        const nextWorn = signature(Equipment.items());
        if (nextBackpack !== backpack) this.log(`Backpack changed after component ${event.data.comId}`);
        if (nextWorn !== worn) this.log(`Equipment changed after component ${event.data.comId}`);
        backpack = nextBackpack;
        worn = nextWorn;
    });
}
```

This uses the existing mutable-state owner through its public snapshots; it does
not build a second inventory framework from partial packets. The inventory API
can select the bank-side backpack while banking. Reading both small inventories
for every subscribed inventory packet is an observation example, not the cheapest
possible policy: narrow to established component IDs when appropriate. Rebaseline
after pause/reconnect if it matters whether a change occurred during the gap.
Observe `UPDATE_INV_STOP_TRANSMIT` separately when transmission/readiness matters.

### 5.6 XP and effective-level updates

```ts
override onStart(): void {
    const owner = ownerForExample();
    const xpBySkill = new Map<number, number>();
    BotHost.subscribePackets(owner, PacketOpcodes.UPDATE_STAT, event => {
        const { stat, xp, level } = event.data;
        const previous = xpBySkill.get(stat);
        xpBySkill.set(stat, xp);
        if (previous !== undefined && xp > previous) {
            this.log(`Skill ${stat}: +${xp - previous} XP; effective level ${level}`);
        }
    });
}
```

The map is bounded by skill indices and treats first receipt as a baseline. It
does not attribute the XP to a particular craft/kill automatically. If observation
continues across pause, explicitly decide whether the first resumed value should
be a new baseline rather than a delta spanning missed packets.

### 5.7 Movement and entity updates

Add `Game` from `../../api/game/Game.js`:

```ts
override onStart(): void {
    const owner = ownerForExample();
    BotHost.subscribePackets(owner, [PacketOpcodes.PLAYER_INFO, PacketOpcodes.NPC_INFO], event => {
        let localMovement = false;
        let npcSpeech = 0;
        for (const update of event.data.updates) {
            if (update.entity === 'player' && update.index === 2047 &&
                (update.kind === 'walk' || update.kind === 'run' || update.kind === 'teleport')) {
                localMovement = true;
            }
            if (update.entity === 'npc' && update.kind === 'say') npcSpeech++;
        }
        if (localMovement) {
            const tile = Game.tile();
            this.log(`Local route update at observed tick ${event.tick}; world tile ${tile?.x},${tile?.z}`);
        }
        if (npcSpeech > 0) this.log(`${npcSpeech} NPC speech record(s)`);
    });
}
```

World position is queried from the existing API rather than reconstructed from
direction codes. Neither the movement record nor the log labels walking complete.
Do not retain an NPC/player index across a removal/session boundary as a permanent ID.

### 5.8 Standalone and enclosed ground/location changes

Add `type PacketEvent` and `type ZoneSubEvent` to the BotHost import:

```ts
override onStart(): void {
    const owner = ownerForExample();
    const observe = (change:
        PacketEvent<typeof PacketOpcodes.OBJ_ADD | typeof PacketOpcodes.LOC_ADD_CHANGE> |
        Extract<ZoneSubEvent, { opcode: typeof PacketOpcodes.OBJ_ADD | typeof PacketOpcodes.LOC_ADD_CHANGE }>
    ): void => {
        if (change.opcode === PacketOpcodes.OBJ_ADD) {
            this.log(`Ground item ${change.data.type} x${change.data.count} at local ${change.data.x},${change.data.z}`);
        } else {
            this.log(`Location definition ${change.data.id}, layer ${change.data.layer}`);
        }
    };

    BotHost.subscribePackets(owner, [
        PacketOpcodes.OBJ_ADD, PacketOpcodes.LOC_ADD_CHANGE,
        PacketOpcodes.UPDATE_ZONE_PARTIAL_ENCLOSED
    ], event => {
        if (event.opcode !== PacketOpcodes.UPDATE_ZONE_PARTIAL_ENCLOSED) {
            observe(event);
            return;
        }
        for (const child of event.subEvents) {
            if (child.kind === 'zone' &&
                (child.opcode === PacketOpcodes.OBJ_ADD || child.opcode === PacketOpcodes.LOC_ADD_CHANGE)) {
                observe(child);
            }
        }
    });
}
```

This handles each representation once, preserving parent-child order. Add deletion,
count and full-zone invalidation opcodes for a real persistent view. Do not convert
an item ID into a location typecode or use local coordinates as world coordinates.

### 5.9 Tick-driven, synchronous actions with fresh-page intent

Add these imports. Replace the scaffold class with the class below; it still
uses the scaffold's `ownerForExample()` helper and common imports:

```ts
import { Game } from '../../api/game/Game.js';
import { ChatDialog } from '../../api/ui/dialogue/ChatDialog.js';
import { Input } from '../../input/Input.js';
import { reader } from '../../adapter/ClientAdapter.js';
```

```ts
export default class ExactPageTickContinuer extends LoopingBot {
    private expected = '';
    private armed = false;
    private lastAttemptTick = -1;

    override onStart(): void {
        const owner = ownerForExample();
        this.expected = this.settings.str('continueText', '');
        BotHost.subscribePackets(owner, PacketOpcodes.IF_OPENCHAT, () => {
            this.armed = this.expected.length > 0 && ChatDialog.texts().includes(this.expected);
        });
        BotHost.subscribePackets(owner, PacketOpcodes.PLAYER_INFO, event => {
            if (!this.armed || this.lastAttemptTick === event.tick) return;
            if (!Game.sceneReady() || !reader.statsReady() || !ChatDialog.canContinue()) return;
            if (!ChatDialog.texts().includes(this.expected)) { this.armed = false; return; }
            this.armed = false;
            this.lastAttemptTick = event.tick;
            const dispatched = Input.continueDialog(); // Synchronous input API.
            this.log(`Expected-page continue dispatched: ${dispatched}`);
        });
    }

    override onPause(): void { this.armed = false; }
    override onResume(): void { this.armed = false; }
    override loop(): void {}
}
```

This is an explicit **exact-page** continuation policy, disabled by an empty
configured string. It consumes fresh-page intent before dispatch and makes at
most one attempt for that open page, even if the send returns false. It does not
retry based on cached text or wait asynchronously in a callback. It also does not
claim that a continue button was accepted. Do not combine it with another task
that owns continuation, or configure it for a dialogue whose required recovery is
replacement rather than continue.

Subscribing to `PLAYER_INFO` constructs its full typed update payload. If only
an inexpensive legacy tick observer is needed, `addTickListener` avoids that
generic payload capture, but requires the script's own guard/unsubscribe lifecycle.

### 5.10 A packet-driven state machine and a hybrid scheduler actor

The first class tracks only a configured component's observed transmission phase.
It does not manufacture inventory contents or assume a partial update is a full
baseline. It uses the scaffold's common imports/helper:

```ts
export default class ComponentStreamObserver extends LoopingBot {
    private phase: 'unknown' | 'full-seen' | 'transmission-stopped' = 'unknown';

    override onStart(): void {
        const owner = ownerForExample();
        const componentId = this.settings.num('componentId', -1);
        BotHost.subscribePackets(owner, [
            PacketOpcodes.UPDATE_INV_FULL,
            PacketOpcodes.UPDATE_INV_PARTIAL,
            PacketOpcodes.UPDATE_INV_STOP_TRANSMIT
        ], event => {
            if (event.data.comId !== componentId) return;
            const before = this.phase;
            if (event.opcode === PacketOpcodes.UPDATE_INV_STOP_TRANSMIT) {
                this.phase = 'transmission-stopped';
            } else if (event.opcode === PacketOpcodes.UPDATE_INV_FULL) {
                this.phase = 'full-seen';
            }
            // PARTIAL deliberately cannot promote unknown/stopped to full-seen.
            if (before !== this.phase) this.log(`${componentId}: ${before} -> ${this.phase}`);
        });
    }

    override onPause(): void { this.phase = 'unknown'; }
    override onResume(): void { this.phase = 'unknown'; }
    override loop(): void {}
}
```

After an interruption this observer conservatively stays unknown until a full
packet is seen. A real actor needing immediate reconciliation should query the
existing current-session readiness/state API for its specific inventory instead
of requiring the server to resend a full packet merely because a script resumed.

The following hybrid records fresh page evidence in a callback and performs the
async high-level continuation in `loop()`. Add these imports to the common
scaffold/helper. It deliberately supports explicit rebinding after reconnect
while retaining the original runtime owner:

```ts
import { Game } from '../../api/game/Game.js';
import { ChatDialog } from '../../api/ui/dialogue/ChatDialog.js';
import { reader } from '../../adapter/ClientAdapter.js';
import { EventSignal } from '../../api/execution/EventSignal.js';
import { RandomEvents } from '../../runtime/randomevents/RandomEvents.js';
```

```ts
export default class HybridExactPageContinuer extends LoopingBot {
    override loopDelay = 0; // Existing frame cadence, not a new polling timer.
    private owner: ScriptContext | null = null;
    private binding = '';
    private remove: (() => void) | null = null;
    private expected = '';
    private pending = false;

    override onStart(): void {
        this.owner = ownerForExample();
        this.expected = this.settings.str('continueText', '');
        this.bindCurrentSession();
    }

    private bindCurrentSession(): void {
        const owner = this.owner;
        if (!owner || owner !== ScriptRunner.ctx || owner.state !== 'running' || !Game.ingame()) return;
        const binding = `${reader.sessionGeneration()}:${reader.connectionGeneration()}`;
        if (binding === this.binding) return;
        this.remove?.();
        this.pending = false;
        this.binding = binding;
        this.remove = BotHost.subscribePackets(owner, PacketOpcodes.IF_OPENCHAT, () => {
            this.pending = this.expected.length > 0 && ChatDialog.texts().includes(this.expected);
        });
    }

    override async loop(): Promise<number> {
        this.bindCurrentSession();
        if (!this.owner || this.owner !== ScriptRunner.ctx || this.owner.state !== 'running') return 0;
        if (!this.pending || !Game.sceneReady() || !reader.statsReady()) return 0;
        if (RandomEvents.handling || EventSignal.pending()) return 0;
        this.pending = false; // Consume before entering the async operation.
        if (ChatDialog.canContinue() && ChatDialog.texts().includes(this.expected)) {
            await ChatDialog.continue();
        }
        return 0;
    }

    override onPause(): void { this.pending = false; }
    override onResume(): void { this.pending = false; }
    override onStop(): void {
        this.remove?.();
        this.remove = null;
        this.owner = null;
        this.pending = false;
    }
}
```

This uses a single bounded pending flag rather than an unbounded action queue.
The callback never awaits. The loop rechecks current state/priority before acting;
normal API waits and abort semantics remain applicable. The first page arriving
before rebinding can still be missed, by design: there is no replay. A production
workflow can reconcile a known current operation explicitly instead of treating
any cached page as fresh intent. If the script changes world state after an async
wait, recheck its owner and operation guards after that wait as well.

## 6. Performance and best practices

### 6.1 Cost model

- Subscribe to the few opcodes required by the script. A wildcard asks for typed
  data from every eligible supported packet, including potentially large entity
  blocks; it is not a cheap metadata-only tap.
- Leave `raw` off unless exact wire bytes are required. Header identity, decoded
  strings, inventory slots and ordinary field inspection do not require it.
- With no interested eligible subscriber there is no capture object, payload
  construction, raw copy, entity/zone record construction or extra chat unpack.
  There are still small fixed hook/counter/eligibility bookkeeping costs; this
  is not a claim of literally zero executed instructions.
- Interest lookup uses fixed opcode counters. Payloads and child lists are bounded
  by the current received packet/decoder work; the host keeps no packet history,
  replay queue, background timer or polling task.
- Snapshots are allocated/frozen only when needed. A raw subscription adds a byte
  copy represented as a frozen numeric array; large player/NPC subscriptions can
  allocate many decoded records. No account-capacity or RAM target is established
  by the offline fixtures.

### 6.2 Freshness, duplicate suppression and coordination

1. Use the event payload for **which packet changed**, not a cached component
   string that may survive many frames, root changes or an earlier transaction.
2. Use normal APIs for **current playable state** after the packet. Later fields
   in the parent may supersede an earlier child; subsequent packets may not yet
   have arrived.
3. Scope intent to the exact owner, session/connection and script transaction.
   Packet `sequence` is useful for local freshness/deduplication, not attribution
   to an outbound action without a matching protocol/content contract.
4. Pick one action owner. If packet and scheduler code both observe a transition,
   share one attempt/transaction guard and consume it before the input call.
5. Do not replay missed events after pause or reconnect. Re-read the specific
   current state needed and decide whether the operation is still valid.
6. Keep callbacks synchronous and bounded. Aggregate counts or set a dirty flag;
   avoid per-player logging, pathfinding, banking loops, resource loads, network
   fetches and retained event histories in the receive path.
7. Treat equal repeated packets according to the operation. Equal text can be a
   fresh page; repeated quantities can be a resync. Neither automatically permits
   repeating an irreversible action.
8. Keep runtime interrupt providers and adapter hooks owned by their existing
   components. Replacing them is not a way to make a blocked callback eligible.

Do not sort sub-events to make a state machine easier, or reconstruct an alternate
authoritative entity/inventory model merely because packet records are available.
Reuse the existing client/reader/gameplay state owners. A small script-local
transaction/dirty flag is different from a second game client.

### 6.3 Timing evidence is operation-specific

An interface opening, an accepted-looking label, an outbound send returning true,
a map flag clearing, an animation starting and an item disappearing are different
facts. None is a universal success signal. Define what the unchanged gameplay
contract actually requires: for example, a relevant XP delta, a server varp change,
a verified transfer or server-confirmed movement state. Do not substitute logging,
elapsed time, a guessed fixed delay or `event.tick` arithmetic for that evidence.

Use `(session, connection, sequence)` for observations within one host, and store
only bounded recent evidence. Do not align sibling accounts by their local tick
counters, or assume a packet callback can change cross-player server input ordering.

## 7. Script development workflow and troubleshooting

### 7.1 Add an InTree script

1. Work in the existing rendered script tree and use shared imports as in section 5.
   Register observers during `onStart`, retaining that run's context.
2. Add the script's class import and metadata through the existing
   `src/bot/scripts/index.ts` registration pattern. `ScriptRegistry.register`
   accepts `name`, `description`, `create`, and optional `version`, `category`,
   `tags`, `origin`, `settingsSchema`. For example, in that index:

   ```ts
   import PacketObserver from './PacketObserver/PacketObserver.js';

   ScriptRegistry.register({
       name: 'Packet observer example',
       description: 'Observes selected incoming server messages',
       create: () => new PacketObserver()
   });
   ```

   Use the existing `ScriptRegistry` import there; do not also register the same
   script as a side effect in its class module. Register metadata at module load,
   **not live packet subscriptions**.
3. Choose opcodes and required baselines from this catalogue. State the operation's
   real confirmation contract before adding an action to a callback.
4. Keep action/lifecycle/settings policy local to the script. New subscribers to
   existing opcodes do not need a new host method, decoder or BotHost special case.

### 7.2 Build and reload scripts

After the host containing `37aaec65` has been installed with one full host build
and page restart, ordinary InTree edits use:

```powershell
bun run build:bot:scripts
```

That command reuses the installed build identity/target/public key from `out`,
recompiles in memory and verifies that the host entrypoint and shared host chunks
remain identical. It only publishes script-side outputs if compatibility checks
pass. It does not itself reload a running script or start gameplay.

Stop the active script and wait for its stopped state, then choose
**Browse → Reload InTree scripts**, select/start the updated script and let its new
`onStart` register the new subscriptions. Reload is rejected while the current
script is running, paused or stopping. The loader also checks the runtime chunk
fingerprint and captures new metadata registrations before replacing the old set.

Adding a listener/filter for any of the existing 69 opcodes, changing a callback
or importing the already-exported packet types/constants is intended to remain
script-only. This is not a promise that arbitrary module-graph/dependency changes
can never alter bundler output; the compatibility guard is authoritative.

### 7.3 When a full host rebuild is required

A host build/page restart is required when the actual shared host changes, such as:

- a new or changed server protocol definition/format or genuine decoder behaviour;
- a new capture field, snapshot transformation, dispatch or lifecycle rule;
- a new runtime API/export not already present in the installed host;
- changed host build defines, target or shared runtime chunks.

The project's full host build is `bun run build:bot`, using the correct deployment
target/key configuration through the existing workflow. Do not silently build a
different target, bypass chunk checks, or instantiate duplicate runtime singletons
to make a script reload appear compatible. For operator details see
[InTree script reload](https://github.com/36y/rs2b0t/blob/a91886084e858041951bd4aa0c74decb2590298a/docs/how-to/intree-script-reload.md).

### 7.4 Common problems

| Symptom | Source-established explanation / next check |
| --- | --- |
| `subscribePackets` is missing | The running page predates this host API. A scripts build cannot install new host code; install the full host once and restart that page. |
| Registration says it requires the current live context | Register in `onStart`/the valid run, check `Game.ingame()`, and use the original current non-aborted context. Do not register at module import or use an old context after replacement. |
| A listener stops during pause/random handling | Expected eligibility suppression. No replay occurs; reconcile before resuming transaction work. |
| No callbacks after reconnect | Old subscriptions were intentionally removed. Explicitly rebind for the still-current run/session, or start a fresh run. See the hybrid example. |
| No first-login/stat/identity packets | The runner can finish login/readiness before `onStart`. Use present state as a baseline; the API does not replay startup traffic. |
| Ground/location packets are missing | Subscribe to `UPDATE_ZONE_PARTIAL_ENCLOSED` as well as standalone commands, and inspect `subEvents`. |
| `data.xp`/`data.text` fails type checking for a multi-filter | Narrow `event.opcode` first. Keep stored opcode arrays literal/`as const` rather than widening to arbitrary numbers. |
| `raw` is null | It was not requested by a matching eligible registration at capture time. Use `{ raw: true }` only when required. |
| A mutation throws or has no effect | Delivered events are immutable. Copy the needed data into bounded script-local state; never write into the client decoder buffer. |
| A listener registered inside a callback misses that same packet | Intentional capture-start cutoff. It can receive subsequent eligible packets only. |
| Observed tick is unchanged for a packet | Only `PLAYER_INFO` increments it. Text, inventory, NPC and XP packets can share the preceding/current observed count. |
| Action sent early still executes next server tick, or fails | Client dispatch timing is not server scheduling/acceptance. Check actual packet ordering, operation guards, action budget and server confirmation requirements. |
| Continue/action repeats | Check duplicate registrations, wildcard plus specific listeners, a normal task doing the same action, and whether the attempt guard is consumed before dispatch. |
| A legacy listener fires while paused | Legacy frame/text/tick listeners retain their old manual guard/cleanup contracts. Prefer owned generic subscriptions for new packet-specific work. |
| A callback failure does not crash the bot | Exceptions are isolated and recorded in the owner's existing error log. Correct the script; do not depend on an exception to abort/decline a transaction. |
| Scripts-only build reports host/chunk change | Stop and follow the normal full-host deployment workflow if the change is intended. Do not reload incompatible script chunks into the old page. |

## 8. Quick reference

### 8.1 Searchable opcode index

All entries below refer to the payloads in section 3. The catalogue groups contain
21 + 3 + 4 + 6 + 11 + 3 + 4 + 10 + 4 + 3 = **69** opcodes. Equipment, trade and
dialogue references are component/content interpretations of those packets.

| Name | Opcode | Catalogue group |
| --- | --- | --- |
| `CAM_LOOKAT` | `82` | 3.9 Camera |
| `CAM_MOVETO` | `73` | 3.9 Camera |
| `CAM_RESET` | `133` | 3.9 Camera |
| `CAM_SHAKE` | `208` | 3.9 Camera |
| `CHAT_FILTER_SETTINGS` | `13` | 3.4 Chat |
| `FRIENDLIST_LOADED` | `235` | 3.4 Chat |
| `HINT_ARROW` | `115` | 3.5 Status |
| `IF_CLOSE` | `23` | 3.1 Interfaces |
| `IF_OPENCHAT` | `81` | 3.1 Interfaces |
| `IF_OPENMAIN` | `119` | 3.1 Interfaces |
| `IF_OPENMAIN_SIDE` | `55` | 3.1 Interfaces |
| `IF_OPENOVERLAY` | `127` | 3.1 Interfaces |
| `IF_OPENSIDE` | `252` | 3.1 Interfaces |
| `IF_SETANIM` | `211` | 3.1 Interfaces |
| `IF_SETCOLOUR` | `160` | 3.1 Interfaces |
| `IF_SETHIDE` | `138` | 3.1 Interfaces |
| `IF_SETICON` | `63` | 3.1 Interfaces |
| `IF_SETMODEL` | `222` | 3.1 Interfaces |
| `IF_SETNPCHEAD` | `244` | 3.1 Interfaces |
| `IF_SETOBJECT` | `18` | 3.1 Interfaces |
| `IF_SETPLAYERHEAD` | `30` | 3.1 Interfaces |
| `IF_SETPOSITION` | `79` | 3.1 Interfaces |
| `IF_SETSCROLLPOS` | `184` | 3.1 Interfaces |
| `IF_SETTEXT` | `59` | 3.1 Interfaces |
| `IF_SHOWICON` | `189` | 3.1 Interfaces |
| `LAST_LOGIN_INFO` | `253` | 3.5 Status |
| `LOC_ADD_CHANGE` | `90` | 3.8 Zones |
| `LOC_ANIM` | `106` | 3.8 Zones |
| `LOC_DEL` | `194` | 3.8 Zones |
| `LOGOUT` | `121` | 3.5 Status |
| `MAP_ANIM` | `233` | 3.8 Zones |
| `MAP_PROJANIM` | `87` | 3.8 Zones |
| `MESSAGE_GAME` | `196` | 3.4 Chat |
| `MESSAGE_PRIVATE` | `243` | 3.4 Chat |
| `MIDI_JINGLE` | `29` | 3.10 Audio |
| `MIDI_SONG` | `187` | 3.10 Audio |
| `MINIMAP_TOGGLE` | `136` | 3.5 Status |
| `NPC_INFO` | `65` | 3.3 Entities |
| `OBJ_ADD` | `60` | 3.8 Zones |
| `OBJ_COUNT` | `117` | 3.8 Zones |
| `OBJ_DEL` | `71` | 3.8 Zones |
| `OBJ_REVEAL` | `176` | 3.8 Zones |
| `PLAYER_INFO` | `188` | 3.3 Entities |
| `P_COUNTDIALOG` | `35` | 3.1 Interfaces |
| `P_LOCMERGE` | `83` | 3.8 Zones |
| `REBUILD_NORMAL` | `219` | 3.7 Regions |
| `RESET_ANIMS` | `201` | 3.3 Entities |
| `SET_MULTIWAY` | `247` | 3.5 Status |
| `SET_PLAYER_OP` | `21` | 3.5 Status |
| `SYNTH_SOUND` | `177` | 3.10 Audio |
| `TUT_FLASH` | `181` | 3.1 Interfaces |
| `TUT_OPEN` | `12` | 3.1 Interfaces |
| `UNSET_MAP_FLAG` | `164` | 3.5 Status |
| `UPDATE_FRIENDLIST` | `168` | 3.4 Chat |
| `UPDATE_IGNORELIST` | `47` | 3.4 Chat |
| `UPDATE_INV_FULL` | `107` | 3.2 Inventory |
| `UPDATE_INV_PARTIAL` | `76` | 3.2 Inventory |
| `UPDATE_INV_STOP_TRANSMIT` | `28` | 3.2 Inventory |
| `UPDATE_PID` | `120` | 3.3 Entities |
| `UPDATE_REBOOT_TIMER` | `204` | 3.5 Status |
| `UPDATE_RUNENERGY` | `195` | 3.5 Status |
| `UPDATE_RUNWEIGHT` | `46` | 3.5 Status |
| `UPDATE_STAT` | `154` | 3.5 Status |
| `UPDATE_ZONE_FULL_FOLLOWS` | `144` | 3.7 Regions |
| `UPDATE_ZONE_PARTIAL_ENCLOSED` | `112` | 3.7 Regions |
| `UPDATE_ZONE_PARTIAL_FOLLOWS` | `155` | 3.7 Regions |
| `VARP_LARGE` | `97` | 3.6 Configuration |
| `VARP_SMALL` | `75` | 3.6 Configuration |
| `VARP_SYNC` | `172` | 3.6 Configuration |

### 8.2 Task-to-packet lookup

| Scripting requirement | Start with | Required distinction / companion evidence |
| --- | --- | --- |
| Fresh interface label / dialogue line | `IF_SETTEXT` | Component ID + event text, not cached-text equality alone |
| Dialogue root is actually open | `IF_OPENCHAT` | Query current page/continue state; do not auto-continue unrelated content |
| Count/quantity prompt | `P_COUNTDIALOG` | Correlate with the operation that requested it |
| Interface closes | `IF_CLOSE` | No reason or result supplied |
| Main/side/overlay changes | `IF_OPENMAIN`, `IF_OPENMAIN_SIDE`, `IF_OPENSIDE`, `IF_OPENOVERLAY` | Roots are not inventory components or buttons |
| Hidden button/UI state | `IF_SETHIDE`, possibly `IF_SETCOLOUR`/`IF_SETMODEL` | Content contract + ancestor/root visibility still matter |
| Trade offer/confirmation progression | `IF_OPENMAIN_SIDE`, `IF_OPENMAIN`, `IF_SETTEXT`, inventory packets | Use current allowed transaction; prompt, visibility, offer contents and final settlement are distinct |
| Trade request notification | `MESSAGE_GAME` | Original `:tradereq:` string can differ from displayed text |
| Backpack / bank / trade inventory changes | `UPDATE_INV_FULL`, `UPDATE_INV_PARTIAL`, `UPDATE_INV_STOP_TRANSMIT` | Resolve the right component and full/current-session readiness |
| Worn equipment changes | Same inventory packets; `IF_SETICON` when bindings change | No standalone equipment opcode; use existing `Equipment` binding |
| XP / boosted or drained skill level | `UPDATE_STAT` | First value is baseline; distinguish cumulative XP, effective level and derived base level |
| Tick-driven work | `PLAYER_INFO` or legacy `addTickListener` | Observed tick only; following XP/inventory may not yet be applied |
| Local movement / teleport | `PLAYER_INFO` entity records | Client-local index `2047`; route update is not movement-complete proof |
| Other player appearance/chat/hits | `PLAYER_INFO` masks/records | Scope instance indices to visibility/session; no generic action-success meaning |
| NPC appearance/type/movement/speech/hits | `NPC_INFO` records | Instance index versus definition ID; no observed-tick increment |
| Region changes / scene invalidation | `REBUILD_NORMAL` | Wait for actual scene readiness; coordinates are build-centre zones |
| Ground loot add/remove/count/reveal | `OBJ_ADD`, `OBJ_DEL`, `OBJ_COUNT`, `OBJ_REVEAL`, `UPDATE_ZONE_PARTIAL_ENCLOSED`, `UPDATE_ZONE_FULL_FOLLOWS` | Handle standalone and enclosed forms, local coordinates and reset boundaries |
| Door/location changes | `LOC_ADD_CHANGE`, `LOC_DEL`, `LOC_ANIM`, `UPDATE_ZONE_PARTIAL_ENCLOSED` | Queued/rendered/collision state can differ; definition ID is not typecode |
| Map effect/projectile/player merge | `MAP_ANIM`, `MAP_PROJANIM`, `P_LOCMERGE`, enclosed zones | Effect timing is client-cycle based; effects are not confirmed damage/interactions |
| Server-backed configuration state | `VARP_SMALL`, `VARP_LARGE`, `VARP_SYNC` | Use established varp meanings; signed values and sync semantics matter |
| Energy / weight / multiway status | `UPDATE_RUNENERGY`, `UPDATE_RUNWEIGHT`, `SET_MULTIWAY` | Status observation is not an action acknowledgment |
| Hint target | `HINT_ARROW` | Branch on original type; instance can be missing |
| Local identity/membership metadata | `UPDATE_PID` | Often arrives before onStart; server slot differs from local client index |
| Explicit server logout / shutdown notice | `LOGOUT`, `UPDATE_REBOOT_TIMER` | Local/transport loss need not deliver LOGOUT; runtime cleanup is not callback-dependent |
| Private messages / friends / ignores | `MESSAGE_PRIVATE`, `UPDATE_FRIENDLIST`, `FRIENDLIST_LOADED`, `UPDATE_IGNORELIST`, `CHAT_FILTER_SETTINGS` | Encoded usernames, duplicate/display filtering and nullable compressed text |
| Cutscene camera/audio cue | `CAM_*`, `SYNTH_SOUND`, `MIDI_SONG`, `MIDI_JINGLE` | Presentation/resource-dependent; no gameplay-success inference without content evidence |

### 8.3 Remaining limits at this baseline

All 69 declared opcodes have typed capture support; there is no knowingly omitted
declared format. This does not add support for future/unknown opcodes, unknown
compound formats, pre-registration replay or arbitrary malformed packets. Normal
client decode/resource-error handling remains authoritative. Compressed chat can
have a null text result with packed bytes preserved.

Live server ordering, every content-specific meaning, audio timing in wall-clock
units, arbitrary future resource/component revisions, and live browser hot-reload
behaviour are not certified by this document. Existing offline coverage and the
successful full-host/scripts-only build checks establish a narrower implementation
baseline. Do not upgrade an unverified content hypothesis into an API guarantee.

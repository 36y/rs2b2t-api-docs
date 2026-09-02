# Quests

```ts
type QuestStatus =
  | 'notStarted'
  | 'inProgress'
  | 'complete'
  | 'unknown';
```

Declared package surface:

```ts
Quests.all(): { name: string; status: QuestStatus }[]
Quests.status(name): QuestStatus
Quests.points(): number
```

The quest-list colour gives only coarse state: red = not started, yellow = some in-progress state, green = complete. `unknown` means the quest tab has not provided a usable row; it does not mean not-started.

## Runtime-only journal text

Current source additionally implements:

```ts
Quests.journal(name: string): Promise<string[]>
```

It finds the quest row, opens that quest's journal main modal and returns its rendered text lines. This is particularly useful because most quest mid-stage state is not transmitted as a convenient varp.

The method is not present in the inspected external `.d.ts`:

```ts
const QuestsRuntime = Quests as typeof Quests & {
  journal(name: string): Promise<string[]>;
};

const lines = await QuestsRuntime.journal('Some Quest');
```

Opening a journal visibly changes the main modal, so do not poll it continuously. Prefer a unique inventory item, message, object state or other cheap oracle when one proves the same stage; use journal text when the interface is the only durable client-side evidence.

Prefer `Quests.status()` to scripts that guess quest completion from unrelated varps.

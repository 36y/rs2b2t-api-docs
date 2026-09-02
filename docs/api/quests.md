# Quests

```ts
type QuestStatus =
  | 'notStarted'
  | 'inProgress'
  | 'complete'
  | 'unknown';
```

```ts
Quests.all(): { name: string; status: QuestStatus }[]
Quests.status(name): QuestStatus
Quests.points(): number
```

The quest-tab journal color/status is the supported source of quest progression.

Prefer `Quests.status()` to scripts that guess quest completion from unrelated varps.

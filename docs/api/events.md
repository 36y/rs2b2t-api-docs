# Events

Event map:

```ts
interface EventMap {
  tick: { tick: number };

  'chat.message': { type: number; username: string | null; text: string };
  'skill.xp': { skill: number; name: string; xp: number; delta: number };
  'skill.level': { skill: number; name: string; level: number; previous: number };
  'inventory.changed': { slot: number; id: number; name: string | null; count: number; previousId: number; previousCount: number };
  'varp.changed': { index: number; value: number; previous: number };
}
```

Global bus:

```ts
const unsubscribe = events.on('chat.message', line => {
  // ...
});

unsubscribe();
```

Inside a bot, prefer the bot-scoped subscription:

```ts
this.on('skill.xp', event => {
  this.lastXp = event.xp;
});
```

Callbacks fire during client processing. Keep them short: set flags/store state, then perform real actions from `loop()`.

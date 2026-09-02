# Writing reliable scripts

## Dispatch, then observe

Do not treat an interaction returning `true` as proof of server-side completion.

```ts
const before = Inventory.count('Bones');

await groundBones.interact('Take');

const pickedUp = await Execution.delayUntil(
  () => Inventory.count('Bones') > before,
  4000
);
```

## Query scene entities fresh

Scene objects can become invalid after movement, despawns or scene rebuilds.

```ts
const npc = Npcs.query()
  .name('Guard')
  .action('Attack')
  .within(10)
  .nearest();

if (npc?.valid()) {
  await npc.interact('Attack');
}
```

## Use resilient world walking

```ts
await Traversal.walkResilient(target, {
  radius: 2,
  log: msg => this.log(msg)
});
```

## Wait for bank readiness

Opening the bank and receiving its item snapshot are separate states. Do not use `Bank.loaded()` as the readiness oracle: it means the current bank item list is non-empty, so a legitimately empty bank never becomes "loaded".

The current runtime provides the authoritative readiness helper:

```ts
if (await Banking.open()) {
  const ready = await BankRuntime.waitReady(3000, msg => this.log(msg));

  if (!ready) {
    this.log('Bank opened but its snapshot did not become ready');
    return;
  }
}
```

Until `Bank.waitReady()` is added to the external declaration, expose only that runtime member locally:

```ts
const BankRuntime = Bank as typeof Bank & {
  waitReady(timeoutMs?: number, log?: (msg: string) => void): Promise<boolean>;
};
```

## Keep event callbacks short

```ts
class ChatBot extends LoopingBot {
  private sawCommand = false;

  override onStart() {
    this.on('chat.message', line => {
      if (line.text.includes('command')) {
        this.sawCommand = true;
      }
    });
  }

  override async loop() {
    if (this.sawCommand) {
      this.sawCommand = false;
      // do actual work here
    }

    await Execution.delayTicks(1);
  }
}
```

## Stationary service scripts

For market-making, chat processing, advertising or API-service scripts, movement/XP may not reflect useful work.

PR #776 proposes `Execution.noteProgress()` so these scripts can explicitly report useful progress without disabling watchdog detection. Until merged upstream, treat it as pending.

# Execution

`Execution` is the client-scheduled waiting API.

## `delay(ms)`

```ts
Execution.delay(ms: number): Promise<void>
```

Wait for at least the specified wall-clock duration through the client scheduler.

## `delayTicks(n)`

```ts
Execution.delayTicks(n: number): Promise<void>
```

Wait for `n` observed server ticks.

Prefer this to approximating server ticks with raw timers.

## `delayUntil(cond, timeoutMs?)`

```ts
Execution.delayUntil(
  cond: () => boolean,
  timeoutMs?: number
): Promise<boolean>
```

Checks `cond()` once per client frame.

Returns `true` when the condition becomes true, otherwise `false` after the timeout (default 6000 ms).

Recommended action-confirmation pattern:

```ts
const before = Inventory.count('Bones');

await bones.interact('Bury');

const consumed = await Execution.delayUntil(
  () => Inventory.count('Bones') < before,
  3000
);
```

## `delayUntilTicks(cond, maxTicks)`

```ts
Execution.delayUntilTicks(
  cond: () => boolean,
  maxTicks: number
): Promise<boolean>
```

Tick-driven equivalent for state transitions expected on server ticks.

## Do not use raw timers for bot sleeps

Avoid:

```ts
await new Promise(resolve => setTimeout(resolve, 1000));
```

That wait is not owned by the rs2b0t scheduler and does not participate correctly in runtime Stop/unwind behavior.

## `noteProgress()` — pending

PR #776 proposes:

```ts
Execution.noteProgress(): void
```

for healthy external scripts that intentionally remain stationary and may not generate XP.

Until that PR is merged into upstream `main`, this method should be treated as **pending**, not part of the released upstream API.

# Banking

There are two layers: `Bank` for raw bank UI and `Banking` for higher-level routing/session helpers. Prefer `Banking.open()` for normal scripts.

## Bank readiness

The current runtime implementation provides several readiness levels:

```ts
Bank.isOpen(): boolean
Bank.loaded(): boolean
Bank.ready(): boolean
Bank.waitReady(timeoutMs?, log?): Promise<boolean>
Bank.snapshotReady(): boolean
Bank.snapshotGeneration(): number
Bank.waitSnapshotAfter(generation, timeoutMs?): Promise<boolean>
```

`isOpen()` only means the bank component exists. `loaded()` means the bank item list is non-empty, which is insufficient for a genuinely empty bank. Prefer `ready()` / `waitReady()` when you need authoritative state.

## Contents

```ts
Bank.items(): BankItemSnapshot[]
Bank.count(name): number
Bank.countById(id): number
```

The ID-based method is present at runtime even though older package declarations may not include it.

## Withdrawal and deposit

```ts
Bank.setNoteMode(on): Promise<void>
Bank.withdraw(name, op?)
Bank.withdrawById(id, op?)
Bank.withdrawX(name, count)
Bank.withdrawXById(id, count, landsAsId?)
Bank.withdrawLoad(name)
Bank.deposit(name, op?)
Bank.depositInventory()
Bank.depositAllMatching(predicate, log?)
```

Helpers include `withdrawOp`, `depositAllExcept`, `depositMatcher`, and `matchesCommonBankLoot`.

## Closing the bank

The current `Bank` implementation has:

```ts
Bank.close(timeoutMs = 3000): Promise<boolean>
```

It closes the bank modal through the client modal-close action and confirms that both the bank component and the bank-side backpack modal have disappeared before resolving `true`.

Current external TypeScript declarations do **not** expose `close()`, even though the method exists on the runtime `Bank` object. Until the package declaration is corrected, external TypeScript scripts can use a narrow cast:

```ts
const BankRuntime = Bank as typeof Bank & {
  close(timeoutMs?: number): Promise<boolean>;
};

if (Bank.isOpen()) {
  const closed = await BankRuntime.close();
  if (!closed) {
    this.log('Bank interface did not close');
  }
}
```

A simpler `const BankAny = Bank as any` also works, but the narrow structural cast above preserves type checking for the rest of `Bank`.

You normally do **not** need an extra wall-clock delay after a successful `close()`: the method already waits for closure confirmation. If the next operation is deliberately tick-driven, an `Execution.delayTicks(1)` can still be appropriate for that operation's own semantics.

Walking away is not a supported way to close the interface. Code that needs backpack ops such as Wield, Use or Bury should explicitly close the bank first.

## High-level opening

```ts
Banking.open(opts?): Promise<boolean>
```

Options can include a preset stand, booth name/op, obstacles, a forced destination, nearby-bank preference and logging.

## One-shot bank trip

```ts
await Banking.bankNearest({
  deposit: name => name !== 'Pickaxe',
  commonJunk: true,
  returnTo: workTile,
  log: msg => this.log(msg)
});
```

The current high-level banking implementation itself uses `Bank.close()` when ending sessions, which confirms that this is an intentional runtime capability rather than an accidental hidden property.

Periodic helpers include `shouldBankNow`, `parseBankStrategy`, and `PERIODIC_BANK_SETTINGS`.

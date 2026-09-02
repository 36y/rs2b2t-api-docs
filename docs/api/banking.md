# Banking

There are two layers: `Bank` for raw bank UI and `Banking` for higher-level routing/session helpers. Prefer `Banking.open()` for normal scripts.

## Bank readiness

```ts
Bank.isOpen(): boolean
Bank.loaded(): boolean
```

`isOpen()` is **not** enough to trust item counts. Wait for `Bank.loaded()`.

## Contents

```ts
Bank.items(): BankItemSnapshot[]
Bank.count(name): number
```

## Withdrawal and deposit

```ts
Bank.setNoteMode(on): Promise<void>
Bank.withdraw(name, op?)
Bank.withdrawX(name, count)
Bank.withdrawLoad(name)
Bank.deposit(name, op?)
Bank.depositInventory()
Bank.depositAllMatching(predicate, log?)
```

Helpers include `withdrawOp`, `depositAllExcept`, `depositMatcher`, and `matchesCommonBankLoot`.

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

Periodic helpers include `shouldBankNow`, `parseBankStrategy`, and `PERIODIC_BANK_SETTINGS`.

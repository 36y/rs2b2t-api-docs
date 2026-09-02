# Inventory

## `InvItem`

```ts
name: string | null
id: number
slot: number
count: number

actions(): string[]
interact(action): boolean | Promise<boolean>
useOn(target: InvItem | Loc | Npc): boolean | Promise<boolean>
```

Always await `interact()` and `useOn()`.

Example:

```ts
const knife = Inventory.first('Knife');
const logs = Inventory.first('Logs');

if (knife && logs) {
  await knife.useOn(logs);
}
```

## `Inventory`

```ts
Inventory.items(): InvItem[]
Inventory.first(name): InvItem | null
Inventory.contains(name): boolean
Inventory.count(name): number
Inventory.used(): number
Inventory.isFull(): boolean
```

`count(name)` totals quantities across matching slots.

`used()` counts occupied backpack slots.

## Confirming interactions

```ts
const before = Inventory.count('Logs');

await tree.interact('Chop down');

await Execution.delayUntil(
  () => Inventory.count('Logs') > before,
  15000
);
```

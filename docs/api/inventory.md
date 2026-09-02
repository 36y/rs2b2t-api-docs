# Inventory

## `InvItem`

Declared package surface:

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

```ts
const knife = Inventory.first('Knife');
const logs = Inventory.first('Logs');

if (knife && logs) {
  await knife.useOn(logs);
}
```

### Runtime-only `GroundItem` target

The current implementation accepts one additional target that the package declaration omits:

```ts
InvItem.useOn(target: GroundItem)
```

This sends the client `use item on ground object` operation. It is used by source features where an inventory item must be used on an item lying on the ground.

For external TypeScript scripts:

```ts
const itemRuntime = item as typeof item & {
  useOn(target: GroundItem): boolean | Promise<boolean>;
};

await itemRuntime.useOn(groundItem);
```

`InvItem` instances also carry a public source-level `snap` snapshot at runtime, including the component id and raw operation list. It is not declared by `@rs2b0t/api`; treat it as an implementation escape hatch rather than stable API.

## `Inventory`

Declared package surface:

```ts
Inventory.items(): InvItem[]
Inventory.first(name): InvItem | null
Inventory.contains(name): boolean
Inventory.count(name): number
Inventory.used(): number
Inventory.isFull(): boolean
```

Current runtime adds:

```ts
Inventory.countById(id: number): number
Inventory.free(): number
```

`countById()` is useful when two item variants share a display name. `free()` reports free backpack slots and understands the bank-side backpack view while the bank is open.

Until the package declaration catches up:

```ts
const InventoryRuntime = Inventory as typeof Inventory & {
  countById(id: number): number;
  free(): number;
};
```

`count(name)` totals quantities across matching slots. `used()` counts occupied backpack slots.

## Bank-side behavior

When the bank is open, `Inventory.items()` reads the bank's side-backpack component. Those slots expose `Deposit-*` component actions rather than ordinary held-item actions. Consequently `InvItem.useOn()` refuses to start or receive a Use operation while either item is represented by that bank-side component. Close the bank first when you need Wield, Use, Bury, or similar backpack operations.

## Confirming interactions

```ts
const before = Inventory.count('Logs');

await tree.interact('Chop down');

await Execution.delayUntil(
  () => Inventory.count('Logs') > before,
  15000
);
```

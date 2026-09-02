# Shops

Declared package surface:

```ts
Shop.isOpen(): boolean
Shop.open(npcName): Promise<boolean>
Shop.stock(): { name: string; count: number; slot: number }[]
Shop.buy(name, n): Promise<number>
Shop.sell(name, n, pick?): Promise<number>
Shop.close(): Promise<void>
```

`Shop.open()` does not walk to the shopkeeper. Be near the NPC first.

`buy()` and `sell()` return the quantity actually transacted, which may be lower than the requested amount.

The optional `sell(..., pick)` callback selects among same-name backpack slots, useful for noted versus unnoted variants.

## Runtime-only exact-ID purchase

Current source additionally implements:

```ts
Shop.buyById(id: number, n: number): Promise<number>
```

This matters for shops containing multiple objects with the same display name. The source specifically calls out Thessalia's two `Priest gown` halves: buying by name can select the first matching slot twice, whereas `buyById()` targets the exact object id.

The method is not present in the inspected package `.d.ts`. External TypeScript scripts can expose only this missing member:

```ts
const ShopRuntime = Shop as typeof Shop & {
  buyById(id: number, n: number): Promise<number>;
};

const bought = await ShopRuntime.buyById(428, 1);
```

## Transaction pacing

The implementation batches Buy/Sell 10, 5 and 1 operations while respecting the engine's per-tick user-event packet limit, then waits a server tick before recounting. Prefer `Shop.buy()` / `buyById()` / `sell()` over manually spamming component operations.

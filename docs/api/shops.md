# Shops

Declared package surface:

```ts
Shop.isOpen(): boolean
Shop.open(npcName): Promise<boolean>
Shop.stock(): { name: string; count: number; slot: number }[]
Shop.buy(name, n): Promise<number>
Shop.sell(name, n): Promise<number>
Shop.close(): Promise<void>
```

`Shop.open()` does not walk to the shopkeeper. Be near the NPC first.

`buy()` and `sell()` return the quantity actually transacted, which may be lower than the requested amount. Always add the returned number to counters rather than assuming the full requested `n` was completed.

## Buying or selling more than 10

The `n` argument is a **target quantity**, not a single menu-operation size. Current shop menus expose 10, 5 and 1 operations, and the API combines those operations for you.

For example:

```ts
const bought = await Shop.buy('Bronze arrow', 50);
const sold = await Shop.sell('Oak longbow', 50);
```

A request for 50 does not require a literal `Buy 50` or `Sell 50` menu option. The current implementation can build a batch from repeated 10/5/1 operations, with at most five user-event packets in one player tick. If `Buy 10`/`Sell 10` is available, a target of 50 can therefore be dispatched as five x10 operations in one batch before the API waits a server tick and recounts.

This is why values above 10 can be substantially faster than calling `Shop.buy(..., 10)` or `Shop.sell(..., 10)` from five separate bot loops. The API still returns the **actual** amount moved, so stock, inventory space, shop rules, missing menu operations or another state change can make the result lower than 50.

A robust counter looks like:

```ts
const sold = await Shop.sell('Oak longbow', 50);
if (sold > 0) {
  this.totalSold += sold;
}
```

Do not write `this.totalSold += 50` merely because 50 was requested.

## Runtime signature drift: `sell(..., pick)`

The runtime implementation accepts an additional optional selector that the current package declaration omits:

```ts
Shop.sell(
  name: string,
  n: number,
  pick?: (item: { id: number; count: number; slot: number }) => boolean
): Promise<number>
```

`pick` selects among same-name backpack slots, which is useful for noted versus unnoted variants. Ordinary calls such as `Shop.sell('Oak longbow', 50)` are fully declared and need no cast. Only scripts using the third argument need to expose the signature drift locally:

```ts
const ShopRuntime = Shop as typeof Shop & {
  sell(
    name: string,
    n: number,
    pick?: (item: { id: number; count: number; slot: number }) => boolean
  ): Promise<number>;
};
```

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

The current implementation understands 10, 5 and 1 shop operations and sends at most five user-event packets per player tick because extra packets would be dropped by the engine. It then waits for inventory movement, settles for one server tick, recounts, and continues if the requested target has not yet been reached.

Prefer `Shop.buy()` / `buyById()` / `sell()` with the full quantity you want over manually spamming component operations or adding tiny delays between individual x10 calls. The shop API already owns the batching and server-tick pacing.

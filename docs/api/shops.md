# Shops

```ts
Shop.isOpen(): boolean
Shop.open(npcName): Promise<boolean>
Shop.stock(): { name: string; count: number; slot: number }[]
Shop.buy(name, n): Promise<number>
Shop.sell(name, n): Promise<number>
Shop.close(): Promise<void>
```

`Shop.open()` does not walk to the shopkeeper. Be near the NPC first.

`buy()` and `sell()` return the quantity actually transacted, which may be lower than the requested amount.

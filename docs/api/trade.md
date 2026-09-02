# Player trade

```ts
Trade.onOfferScreen(): boolean
Trade.onConfirmScreen(): boolean
Trade.active(): boolean
Trade.partner(): string | null
Trade.myOffer(): TradeItem[]
Trade.theirOffer(): TradeItem[]
Trade.request(playerName): Promise<boolean>
Trade.offerAll(itemName, pick?): Promise<boolean>
Trade.offer(itemName, n, pick?): Promise<boolean>
Trade.accept(): Promise<boolean>
Trade.decline(): Promise<void>
```

```ts
interface TradeItem {
  id: number;
  name: string | null;
  count: number;
}
```

Player trading has an offer screen and a confirmation screen.

Use the optional `pick` callback when multiple same-name item slots need disambiguation, for example noted versus unnoted variants.

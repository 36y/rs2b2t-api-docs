# Player trade

Declared package surface:

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

## Runtime-only `removeAll()`

Current source additionally provides:

```ts
Trade.removeAll(): Promise<boolean>
```

It removes everything from your side of the offer screen, one offered stack at a time, waiting a server tick between removals. This is useful when rebuilding an offer from scratch instead of trying to calculate incremental corrections against whatever is already offered.

The current package declaration does not list it:

```ts
const TradeRuntime = Trade as typeof Trade & {
  removeAll(): Promise<boolean>;
};

await TradeRuntime.removeAll();
```

## Declining safely

`Trade.decline()` is more robust than blindly clicking the visible decline component. Current content can leave that button without a usable `if_button` trigger, so the implementation briefly tries it and then falls back to the modal-close action, waiting for the trade to disappear.

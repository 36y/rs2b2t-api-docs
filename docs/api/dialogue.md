# Dialogue and make menus

Declared package surface:

```ts
ChatDialog.isOpen(): boolean
ChatDialog.canContinue(): boolean
ChatDialog.continue(): Promise<boolean>
ChatDialog.options(): string[]
ChatDialog.chooseOption(match?): Promise<boolean>
ChatDialog.isMakeMenu(): boolean
ChatDialog.makeProducts(): string[]
ChatDialog.make(match?): Promise<boolean>
ChatDialog.makeOne(match?): Promise<boolean>
```

## Runtime members missing from the package declaration

Current source additionally implements:

```ts
ChatDialog.texts(): string[]
ChatDialog.makeX(match: string, count: number): Promise<boolean>
ChatDialog.isMainMakePanel(): boolean
ChatDialog.mainMakeProducts(): string[]
ChatDialog.makeFromPanel(match: string, op?: string): Promise<boolean>
ChatDialog.makeFromPanelMax(match: string): Promise<boolean>
```

For external TypeScript scripts, use a narrow runtime type when you need these:

```ts
const DialogRuntime = ChatDialog as typeof ChatDialog & {
  texts(): string[];
  makeX(match: string, count: number): Promise<boolean>;
  isMainMakePanel(): boolean;
  mainMakeProducts(): string[];
  makeFromPanel(match: string, op?: string): Promise<boolean>;
  makeFromPanelMax(match: string): Promise<boolean>;
};
```

## Continue and dialogue text

```ts
if (ChatDialog.canContinue()) {
  await ChatDialog.continue();
}
```

The helper waits for the current page to change.

`texts()` returns the text lines currently rendered in the chat modal, including NPC text. This can be useful when a quest/dialogue state is only visible in the interface.

## Options

```ts
await ChatDialog.chooseOption('Yes');
```

Matching is text/substring-oriented.

## Chat/main make menus

`make()` selects the matching product and prefers the largest fixed quantity offered.

`makeOne()` explicitly chooses Make-1 and does not open a Make-X count dialog.

`makeX()` explicitly chooses the product's Make-X button, waits for the amount dialog, submits the requested count, then waits for the count dialog to close. This avoids racing a still-open make interface.

Some production interfaces are main-modal inventory panels rather than the ordinary chat make menu. For those use:

```ts
DialogRuntime.isMainMakePanel()
DialogRuntime.mainMakeProducts()
DialogRuntime.makeFromPanel('product', 'Make 10')
DialogRuntime.makeFromPanelMax('product')
```

`makeFromPanelMax()` scans the available Make operations and chooses the largest numeric quantity it can find.

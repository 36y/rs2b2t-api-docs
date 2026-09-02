# Dialogue and make menus

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

## Continue

```ts
if (ChatDialog.canContinue()) {
  await ChatDialog.continue();
}
```

The helper waits for the current page to change.

## Options

```ts
await ChatDialog.chooseOption('Yes');
```

Matching is text/substring-oriented.

## Make menu

`make()` selects the matching product and prefers the largest fixed quantity offered.

`makeOne()` explicitly chooses Make-1 and does not open a Make-X count dialog.

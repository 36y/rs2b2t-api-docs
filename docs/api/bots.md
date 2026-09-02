# Bots

## `AbstractBot`

All standard bots ultimately extend `AbstractBot`.

```ts
abstract class AbstractBot {
  loopDelay: number;
  readonly settings: SettingsBag;
  onStart?(): void | Promise<void>;
  onStop?(): void;
  onPause?(): void;
  onResume?(): void;
  onPaint?(ctx: CanvasRenderingContext2D): void;
  recoveryAnchor?(): Tile | null;
  grindTargets(): string[];
  ignoredRandoms(): string[];
  log(msg: string): void;
}
```

`onStart()` runs before the first normal loop. `onStop()` runs after both a normal stop and a crash. `onPaint()` is for overlay drawing, not long-running game logic.

## `LoopingBot`

```ts
abstract class LoopingBot extends AbstractBot {
  abstract loop(): number | void | Promise<number | void>;
}
```

The runtime repeatedly invokes `loop()`.

## Bot-scoped events

Inside an `AbstractBot`, prefer `this.on(...)`; bot-owned subscriptions are removed when the run ends.

## `TaskBot`

Runs the first task whose validator succeeds.

```ts
interface Task {
  validate(): boolean | Promise<boolean>;
  execute(): void | Promise<void>;
}
```

## `TreeBot`

Behavior-tree-style bot using `BranchTask` and `LeafTask`; the tree is evaluated until a leaf is reached, then the leaf executes.

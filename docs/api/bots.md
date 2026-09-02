# Bots

## `AbstractBot`

All standard bots ultimately extend `AbstractBot`.

```ts
type LoopCadence =
  | { kind: 'frame' }
  | { kind: 'server-tick'; ticks?: number }
  | { kind: 'time'; ms: number };

abstract class AbstractBot {
  loopDelay: number;
  loopCadence: LoopCadence | null;
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

### Loop pacing

`loopDelay` remains supported for compatibility, but the runtime now resolves it into an explicit cadence:

- `loopDelay <= 0` means next client frame.
- `loopDelay === 600` means one observed server tick, not a drifting 600 ms timer.
- Other numeric values are wall-clock pacing.
- Setting `loopCadence` explicitly overrides `loopDelay`.

Examples:

```ts
this.loopCadence = { kind: 'frame' };
this.loopCadence = { kind: 'server-tick', ticks: 2 };
this.loopCadence = { kind: 'time', ms: 1500 };
```

This behavior is implemented by `resolveLoopCadence()` in the client source. The repository reference docs describe the same policy.

## `LoopingBot`

```ts
abstract class LoopingBot extends AbstractBot {
  abstract loop(): number | void | Promise<number | void>;
}
```

The runtime repeatedly invokes `loop()`. Returning a number keeps the legacy one-iteration pacing override behavior: `0` = next frame, `600` = next server tick, and other values are wall-clock milliseconds.

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

Current client behavior also gates task execution on `Game.sceneReady()`. During a scene rebuild, `TaskBot` waits instead of dispatching actions into a partially built scene.

## `TreeBot`

Behavior-tree-style bot using `BranchTask` and `LeafTask`; the tree is evaluated until a leaf is reached, then the leaf executes.

`TreeBot` uses the same `Game.sceneReady()` gate as `TaskBot` before evaluating the tree.

## Surface classification

The client implementation contains some lifecycle/runtime details that can precede package declaration updates. For external scripts, treat the installed package declaration and runtime shim as the compatibility boundary; this page calls out implementation behavior where it affects how public bot classes actually run.

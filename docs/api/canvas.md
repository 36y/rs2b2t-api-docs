# Canvas & Overlays

rs2b2t gives every bot an immediate-mode HTML Canvas drawing hook through `AbstractBot.onPaint()`:

```ts
override onPaint(ctx: CanvasRenderingContext2D): void {
  // Draw the current frame here.
}
```

The client calls `onPaint()` with a standard browser `CanvasRenderingContext2D`. This means external scripts can use normal Canvas 2D operations directly: text, rectangles, paths, strokes, fills, transforms, gradients, images, and the other APIs provided by `CanvasRenderingContext2D`.

`onPaint()` is a rendering hook. Keep game actions, waits, banking, movement, and other long-running work in `loop()`/tasks rather than starting asynchronous game logic from paint.

## Direct Canvas Drawing

You do not need an rs2b2t-specific drawing API for a simple HUD. Drawing directly to `ctx` is part of the public bot surface.

```ts
import { Bank, Inventory, LoopingBot } from '@rs2b0t/api';

export default class CasketOpener extends LoopingBot {
  private opened = 0;
  private target = 100;
  private phase = 'withdraw';

  override onPaint(ctx: CanvasRenderingContext2D): void {
    const caskets = Inventory.count('Casket');
    const used = Inventory.used();

    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#ffaa00';
    ctx.fillText('Casket Opener', 12, 22);

    ctx.font = '14px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`Opened: ${this.opened}`, 12, 44);
    ctx.fillText(`Phase: ${this.phase}`, 12, 66);
    ctx.fillText(`Caskets: ${caskets}`, 12, 88);
    ctx.fillText(`Inventory: ${used}/28`, 12, 110);

    ctx.fillStyle = Bank.isOpen() ? '#ff4444' : '#88ff88';
    ctx.fillText(`Bank: ${Bank.isOpen() ? 'OPEN' : 'Closed'}`, 12, 132);

    const progress = Math.min(this.opened / this.target, 1);
    ctx.fillStyle = '#333333';
    ctx.fillRect(12, 146, 200, 10);
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(12, 146, 200 * progress, 10);
  }
}
```

The context is reused for client drawing, so set the state your overlay depends on (`font`, `fillStyle`, `strokeStyle`, etc.) each frame rather than assuming values from a previous paint call.

For larger drawings, `save()` / `restore()` is a useful isolation pattern:

```ts
override onPaint(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  try {
    ctx.font = '12px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`Tick: ${Game.tick()}`, 12, 22);
  } finally {
    ctx.restore();
  }
}
```

## Common Canvas 2D Operations

Useful standard methods and properties include:

```ts
ctx.fillStyle = '#ffffff';
ctx.strokeStyle = '#00ff00';
ctx.lineWidth = 2;
ctx.font = '12px monospace';
ctx.textAlign = 'left';
ctx.globalAlpha = 0.8;

ctx.fillText('Status', x, y);
ctx.strokeText('Status', x, y);
ctx.fillRect(x, y, w, h);
ctx.strokeRect(x, y, w, h);

ctx.beginPath();
ctx.moveTo(x1, y1);
ctx.lineTo(x2, y2);
ctx.arc(x, y, radius, 0, Math.PI * 2);
ctx.stroke();

ctx.save();
ctx.translate(x, y);
ctx.rotate(angle);
ctx.restore();
```

`CanvasRenderingContext2D` is a browser/DOM type rather than a special rs2b2t class, so TypeScript's normal DOM typings provide the complete low-level drawing API.

## Frame Behavior

Treat the overlay as immediate mode: redraw everything that should be visible on every `onPaint()` call. Do not depend on pixels from a previous frame remaining present.

It is fine to calculate display-only values in paint, such as rates, elapsed time, progress percentages, inventory counts, current phase text, or status colours. Avoid expensive searches or state-changing game operations on every paint frame.

```ts
private startedAt = Date.now();
private processed = 0;

override onPaint(ctx: CanvasRenderingContext2D): void {
  const elapsedSeconds = Math.max(1, (Date.now() - this.startedAt) / 1000);
  const perSecond = this.processed / elapsedSeconds;

  ctx.font = '12px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`Processed: ${this.processed}`, 12, 22);
  ctx.fillText(`Rate: ${perSecond.toFixed(1)}/sec`, 12, 38);
}
```

## The Internal `Paint` HUD Toolkit

The rs2b2t source also contains an immediate-mode helper called `Paint`. Internal bots use it extensively for consistent panels:

```ts
const p = Paint.begin(ctx, { dock: 'chatbox', accent: '#c8a2ff' });
p.title(`MyBot — ${this.status}`);
p.text('Running');
p.bar('Progress', 0.65);
p.end();
```

The current toolkit supports titles, tabs, text, rows/cells, wrapping, scrollable lists, filling lists, grids, progress bars, buttons, selects, steppers, gaps, and panel-width measurement. It also publishes hit regions from `end()` so its interactive widgets can receive mouse and wheel input.

**Boundary warning:** `Paint` is source-exported from `src/bot/paint/Paint.ts`, but it is not currently installed by the external client ABI and is not re-exported by `@rs2b0t/api`. External scripts should therefore use the public `onPaint(ctx)` Canvas API unless they deliberately accept coupling to internal source modules.

This distinction is important: **Canvas painting through `onPaint()` is public API; the convenience `Paint` widget toolkit is currently internal.**

## Interactive GUIs

Direct Canvas drawing is ideal for informational HUDs. A Canvas does not automatically turn painted rectangles into buttons: direct `ctx.fillRect()`/`fillText()` calls only draw pixels.

The client's internal `Paint` toolkit has its own hit-region/input plumbing for interactive widgets, but that plumbing is not part of the external package boundary. For portable external scripts, treat `onPaint()` primarily as a display/overlay surface unless a separately documented public input API is available.

## Practical Pattern

A useful separation is:

```ts
class MyBot extends LoopingBot {
  private status = 'Starting';
  private completed = 0;

  override async loop(): Promise<void> {
    // Game logic changes state.
    this.status = 'Working';
    // ... actions / Execution waits ...
  }

  override onPaint(ctx: CanvasRenderingContext2D): void {
    // Paint only reads that state and renders it.
    ctx.font = '12px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`Status: ${this.status}`, 12, 22);
    ctx.fillText(`Completed: ${this.completed}`, 12, 38);
  }
}
```

This keeps the overlay responsive and prevents frame-rate-dependent game behavior.

## See Also

- [Bots](/api/bots) — `AbstractBot`, lifecycle hooks, and loop scheduling.
- [Game](/api/game) — game state commonly displayed in overlays.
- [Inventory](/api/inventory) and [Skills](/api/skills) — common HUD statistics.
- [API Internals & Audit](/concepts/abi) — why internal source exports such as `Paint` are not automatically external API.

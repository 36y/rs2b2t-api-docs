# Getting started

If you have not created a script project yet, start with [Script Development Setup](/guide/development-setup). It walks through the template, Bun, building `dist/bot.js`, and loading the file directly into the rs2b2t client. Come back here once the project builds successfully.

rs2b0t external scripts compile against `@rs2b0t/api`. The package is a runtime shim over the API object installed by the rs2b0t client at `globalThis.__rs2b0t`.

## Minimal bot

```ts
import {
  defineBot,
  LoopingBot,
  Game,
  Npcs,
  Execution
} from '@rs2b0t/api';

class ChickenBot extends LoopingBot {
  override async loop(): Promise<void> {
    if (!Game.ingame() || Game.inCombat()) {
      await Execution.delayTicks(1);
      return;
    }

    const chicken = Npcs.query()
      .name('Chicken')
      .action('Attack')
      .within(12)
      .nearest();

    if (!chicken) {
      await Execution.delayTicks(1);
      return;
    }

    await chicken.interact('Attack');
    await Execution.delayUntil(() => Game.inCombat(), 3000);
  }
}

export default defineBot({
  name: 'Example Chicken Bot',
  category: 'Combat',
  create: () => new ChickenBot()
});
```

## Core rules

1. **Always await interactions.** Interactable methods are typed as `boolean | Promise<boolean>` to preserve ABI headroom.
2. **Confirm effects from game state.** A dispatched click is not proof that the server completed the action.
3. **Use `Execution` for waits.** Raw `setTimeout` escapes the runtime scheduler.
4. **Use `Traversal` for world-scale walking.** `DirectNavigator` is same-scene only.
5. **Treat transient UI/scene states as transient.** In particular, bank contents and scenery can populate a beat after the surrounding interface/scene appears.

## Recommended imports

```ts
import {
  defineBot,
  LoopingBot,
  Execution,
  Game,
  Tile,
  Npcs,
  Locs,
  GroundItems,
  Inventory,
  Equipment,
  Skills,
  Banking,
  Bank,
  Traversal
} from '@rs2b0t/api';
```

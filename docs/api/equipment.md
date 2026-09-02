# Equipment

```ts
Equipment.items(): InvItem[]
Equipment.contains(name): boolean
Equipment.equip(name): Promise<boolean>
Equipment.unequip(name): Promise<boolean>
```

`equip()` uses the supported inventory equip action (`Wield`, `Wear`, `Equip` as applicable).

`unequip()` moves an equipped item back into the backpack.

Check inventory capacity when removing equipment.

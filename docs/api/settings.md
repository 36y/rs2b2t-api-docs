# Settings and manifests

## Manifest

```ts
interface BotManifestInput {
  name: string;
  description?: string;
  version?: string;
  category?: string;
  tags?: string[];
  settingsSchema?: SettingsSchema;
  create(): AbstractBot;
}
```

Normal registration:

```ts
export default defineBot({
  name: 'My Bot',
  category: 'Mining',
  create: () => new MyBot()
});
```

`defineBot()` is the normal external-script entry point and returns the validated `BotManifest` that should be default-exported.

The package also declares the lower-level imperative helper:

```ts
registerScript(manifest, origin?): void
```

The current runtime implementation actually returns its internal `ScriptMeta` registration object. That return type is not represented by the package declaration and `ScriptMeta` is not part of the normal external package surface, so external scripts should not depend on the return value.

## Setting types

```ts
type SettingType =
  | 'boolean'
  | 'number'
  | 'string'
  | 'string[]'
  | 'tile';
```

Declared package definition:

```ts
interface SettingDef {
  type: SettingType;
  default: unknown;
  label?: string;
  min?: number;
  max?: number;
  help?: string;
  options?: string[];
  optionLabels?: Record<string, string>;
  group?: string;
  showIf?: { key: string; anyOf: string[] };
}
```

### Runtime type-field drift

The current client-side `SettingDef` additionally supports four presentation fields that the inspected external `.d.ts` omits:

```ts
step?: number
color?: boolean
optionsFrom?: 'loadouts' | 'priceBooks'
csvToggle?: string
```

Their current meanings are:

- `step` — step size for numeric/range controls, such as `0.05` for an opacity setting.
- `color` — render a freeform string setting with a colour picker and hex field.
- `optionsFrom` — refresh options from player data when the parameters modal opens; currently `loadouts` or `priceBooks`.
- `csvToggle` — for `string[]`, switch to a CSV textarea when the named setting has the value `csv`.

These fields are real current runtime capabilities but are declaration drift. If an external script needs one, extend only the schema type locally rather than assuming every installed client version supports it.

## Reading settings

Every bot receives `this.settings` with:

```ts
bool(key, fallback?)
num(key, fallback?)
str(key, fallback?)
list(key, fallback?)
tile(key, fallback)
raw()
```

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

## Setting types

```ts
type SettingType =
  | 'boolean'
  | 'number'
  | 'string'
  | 'string[]'
  | 'tile';
```

Definition:

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

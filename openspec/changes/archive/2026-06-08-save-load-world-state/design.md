## Context

The game has zero persistence — all `GameWorld` state (map, colonists, entities, build queue, camera, speed) lives in memory only. Adding save/load requires:

- A serialization layer that snapshots every stateful object into plain JSON
- A storage layer for `localStorage` persistence and file-based import/export
- Integration into `GameWorld`'s constructor to accept saved state instead of generating fresh
- Minimal UI surface for triggering save/load

All state is class-based (no Redux), so serialization must extract values from class instances and reconstruct them on load. No external serialization libraries are needed — the data shapes are simple and the browser's `JSON.stringify`/`JSON.parse` suffice.

## Goals / Non-Goals

**Goals:**
- Serialize the entire game world (map, colonists, foods, beds, buildings, build queue, camera offset, speed/pause) to a portable JSON format
- Save to `localStorage` (one auto-save slot + named manual slots)
- Export save as `.json` file download
- Load from `localStorage` and from `.json` file upload
- Wire saved state into `GameWorld` construction to restore a game
- Add Save/Load UI buttons in the TopBar
- Auto-save on `beforeunload`

**Non-Goals:**
- Cloud sync, multiple profiles, save slot management UI beyond basic load/delete
- Migration of saves across schema versions (initial version only; forward compat deferred)
- Save compression or encryption
- Undo/redo

## Decisions

### 1. `WorldSerializer` — centralized encode/decode

A standalone class (`src/game/persistence/worldSerializer.ts`) handles all serialization. Each stateful class gets a `toJSON()` method returning a plain object; `WorldSerializer.fromJSON(data)` reconstructs the full `GameWorld` tree.

Rationale: Keeps serialization logic out of `GameWorld` and entity classes. The serializer owns the schema version, validation, and migration path.

```typescript
// Save file structure:
interface SaveData {
  version: 1
  timestamp: number
  gameName: 'expedition-l'
  map: {
    width: number           // 30
    height: number          // 20
    tiles: TileData[][]     // type + occupantId per cell
  }
  colonists: SerializedColonist[]
  foods: SerializedEntity[]
  beds: SerializedEntity[]
  buildings: SerializedBuilding[]
  buildQueue: SerializedBuildTask[]
  camera: { offsetX: number; offsetY: number }
  speed: GameSpeed          // 0 | 1 | 2
}
```

### 2. `toJSON()` on each entity class

Each stateful class gets a minimal `toJSON()` that returns only the data needed to reconstruct it:

- `Colonist.toJSON()` → `{ id, name, color, position, state, needs, currentJob, path, buildType, pendingBuildTaskId, moveProgress, jobTimer }`
- `GameMap.toJSON()` → `{ tiles: T[][], width, height }`
- `Camera.toJSON()` → `{ offsetX, offsetY }`
- `Food.toJSON()`, `Bed.toJSON()` → `{ id, x, y }`
- `Building.toJSON()` → `{ id, type, x, y }`
- `BuildQueue.toJSON()` → `{ tasks: BuildTask[] }`

`JsonValue` / `Jsonify` utility types ensure type safety without adding a dependency.

### 3. Storage abstraction (`src/game/persistence/storage.ts`)

A thin module exposing:

- `saveToLocalStorage(key, data)` — `localStorage.setItem` with JSON stringify
- `loadFromLocalStorage(key)` — parse + validate against schema version
- `downloadSaveFile(data, filename)` — trigger file download via `Blob` + `URL.createObjectURL`
- `uploadSaveFile(): Promise<SaveData>` — `<input type="file">` wrapped in a promise

Constants:
- `AUTOSAVE_KEY = 'expedition-autosave'`
- `SAVE_PREFIX = 'expedition-save-'`
- `SAVE_EXTENSION = '.json'`

### 4. GameWorld constructor overload

`GameWorld` currently takes only `canvas`. Add an optional second parameter:

```typescript
constructor(canvas: HTMLCanvasElement, savedState?: SaveData)
```

When `savedState` is provided, skip `generateMap()` / `createInitialColonists()` / `placeInitialFood()` / `placeInitialBeds()` and instead call `WorldSerializer.fromJSON(savedState)` to populate `this.map`, `this.colonists`, etc.

The existing constructor body becomes the "new game" path. The "load game" path skips the random generation and entity placement steps.

### 5. UI: Save/Load buttons in TopBar

Two new buttons after the speed controls: **Save** (disk icon) and **Load** (folder icon).

- **Save**: Serialize current world → save to `localStorage` (autosave slot) + trigger file download. Show brief toast/feedback.
- **Load**: Open native file picker → read `.json` → validate → call `loadGame(data)` which destroys current `GameWorld` and creates a new one with `savedState`.

The `App.tsx` holds the `GameWorld` reference. A `loadGame(saveData)` method on the App (or a callback passed to `TopBar`) tears down the old world and boots a new one.

### 6. Auto-save on beforeunload

In `GameWorld` constructor, register a `beforeunload` handler that snapshots and writes to `localStorage` under the autosave key. The handler is removed in `destroy()`. On app startup, check for an autosave in `localStorage` and offer to restore.

```typescript
window.addEventListener('beforeunload', () => {
  const data = WorldSerializer.toJSON(this)
  saveToLocalStorage(AUTOSAVE_KEY, data)
})
```

### 7. Skip GameLoop and InputHandler in serialization

`GameLoop`, `InputHandler`, and `JobSystem` are runtime systems — they carry no state that needs persisting beyond what's already captured (speed, build queue, colonist jobs). On load, these are reconstructed fresh with the deserialized data driving their behavior.

## Risks / Trade-offs

- **[Size] `localStorage` has a ~5 MB limit.** A 30×20 tile grid with simple JSON is well under that (~10-20 KB). File export covers the case where users want durable backups.
- **[Callbacks] `Colonist.onArrive` is a closure — not serializable.** On save, `onArrive` is lost. On load, `onArrive` must be `null`. The job system will re-assign the colonist on the next tick. This is acceptable: the colonist stays idle for at most 2 seconds.
- **[Race condition] `beforeunload` may not fire in all browsers** (some mobile browsers). File export remains the reliable save mechanism.
- **[Breaking change] Adding `toJSON()` to entity classes is non-breaking** — it's additive. Changing constructors to accept optional saved state is additive.

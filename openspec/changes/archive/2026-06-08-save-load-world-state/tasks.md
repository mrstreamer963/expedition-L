## 1. Serialization layer — toJSON on entities

- [x] 1.1 Add `toJSON()` to `GameMap` — export tiles grid as `{ tiles: { type, occupantId }[][] }`
- [x] 1.2 Add `toJSON()` to `Camera` — export `{ offsetX, offsetY }`
- [x] 1.3 Add `toJSON()` to `Colonist` — export all fields including `position`, `needs`, `currentJob`, `path`, `moveProgress`, `jobTimer`
- [x] 1.4 Add `toJSON()` to `Food` and `Bed` — export `{ id, x, y }`
- [x] 1.5 Add `toJSON()` to `Building` — export `{ id, type, x, y }`
- [x] 1.6 Add `toJSON()` to `BuildQueue` — export `{ tasks: BuildTask[] }`

## 2. WorldSerializer — encode/decode

- [x] 2.1 Create `src/game/persistence/worldSerializer.ts` with `WorldSerializer.toJSON(gameWorld: GameWorld): SaveData` that collects all entity `toJSON()` output plus version, timestamp, and speed
- [x] 2.2 Implement `WorldSerializer.fromJSON(data: SaveData): GameWorldInit` that validates version, deserializes tiles back into a `Tile[][]`, reconstructs colonist/entity arrays, restores camera and speed
- [x] 2.3 Add schema validation: reject saves with missing/unsupported `version` field

## 3. Storage layer

- [x] 3.1 Create `src/game/persistence/storage.ts` with `saveToLocalStorage(key, data)` and `loadFromLocalStorage(key)`
- [x] 3.2 Implement `downloadSaveFile(data, filename)` using `Blob` + `URL.createObjectURL` + temporary `<a>` click
- [x] 3.3 Implement `uploadSaveFile(): Promise<SaveData>` using hidden `<input type="file">` wrapped in a promise, filtered to `.json`

## 4. GameWorld load path

- [x] 4.1 Modify `GameWorld` constructor to accept optional `SaveData`; when provided, skip map generation and initial entity placement, instead use deserialized data from `WorldSerializer.fromJSON()`
- [x] 4.2 Clear `onArrive` on all loaded colonists (callbacks are not serializable)
- [x] 4.3 Add auto-save `beforeunload` handler in constructor, remove it in `destroy()`

## 5. Save/Load UI

- [x] 5.1 Add Save button to `TopBar.tsx` with click handler that calls `worldSerializer.toJSON()`, saves to localStorage, and triggers file download
- [x] 5.2 Add Load button to `TopBar.tsx` with click handler that opens file picker, reads `.json`, validates, and calls `loadGame(data)` on the parent
- [x] 5.3 Wire `loadGame(saveData)` in `App.tsx` — destroy current `GameWorld`, create new one with saved state, update React state

## 6. Autosave prompt on startup

- [x] 6.1 On app mount in `App.tsx`, check for autosave in localStorage; if found, prompt user with confirm dialog
- [x] 6.2 On accept: load from autosave; on decline: start new game

## 7. Error handling and polish

- [x] 7.1 Add save/load error feedback in the UI (brief message on failure)
- [x] 7.2 Add save success feedback ("Saved!" for 1.5s)
- [x] 7.3 Catch localStorage quota errors gracefully

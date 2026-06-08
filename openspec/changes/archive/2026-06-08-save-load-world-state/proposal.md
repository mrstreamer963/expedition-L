## Why

The colony simulation has no persistence — all progress is lost on page reload. Save/load is essential for any meaningful play session beyond a single sitting.

## What Changes

- Add world state serialization: snapshot the entire `GameWorld` state (map, colonists, entities, build queue, camera, game speed) into a portable JSON format
- Add save to `localStorage` and file download (`.json`)
- Add load from `localStorage` and file upload
- Add a `WorldSerializer` class for encode/decode logic with versioning and validation
- Add save/load UI controls (Save / Load buttons in the top bar or a dedicated menu)
- Seed the `GameWorld` constructor to accept optional saved state; when provided, replay it instead of generating a new world
- Add auto-save on browser unload (`beforeunload`) with configurable opt-out

## Capabilities

### New Capabilities

- `world-save`: Serialize `GameWorld` state to JSON and persist to `localStorage` or download as `.json` file
- `world-load`: Load a saved state from `localStorage` or uploaded `.json` file, deserialize, and restore `GameWorld`
- `save-load-ui`: User-facing buttons/menu to trigger save, load, and manage save slots with feedback

### Modified Capabilities

<!-- None — no existing specs change behavior -->

## Impact

- `src/game/gameWorld.ts` — constructor must accept optional saved state; add `toJSON()`/`fromJSON()` or delegate to serializer
- `src/game/world/map.ts` — add `toJSON()`/`fromJSON()` to `GameMap`
- `src/game/colony/colonist.ts` — add serialization to `Colonist`
- `src/game/entities/*.ts` — add serialization to entity classes (Food, Bed, Building, BuildQueue)
- `src/game/camera.ts` — add serialization to `Camera`
- New file: `src/game/persistence/worldSerializer.ts` — `WorldSerializer` class
- New file: `src/game/persistence/storage.ts` — `localStorage` read/write and file download/upload helpers
- `src/ui/TopBar.tsx` — add Save/Load buttons
- `src/game/gameLoop.ts` — add auto-save hook on `beforeunload`
- `package.json` — likely no new dependencies (native browser APIs: `localStorage`, `Blob`, `URL.createObjectURL`, `<input type="file">`)

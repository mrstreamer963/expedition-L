## 1. Create shared utilities

- [x] 1.1 Extract `roundRect()` from `gameWorld.ts` into `src/render/roundRect.ts` (note: `drawColonist.ts` also has a `roundRect` — migrate both to the shared util)
- [x] 1.2 Update `gameWorld.ts` and `drawColonist.ts` to import `roundRect` from the shared module, remove local definitions

## 2. Define RenderSnapshot and collector

- [x] 2.1 Create `RenderSnapshot` interface in `src/render/worldRenderer.ts` with fields: offsetX, offsetY, canvasWidth, canvasHeight, map, colonists, foods, beds, buildings, buildQueueTasks, hoveredTile, selectedColonistId, buildMode
- [x] 2.2 Add `collectSnapshot()` private method to `GameWorld` that returns a `RenderSnapshot`

## 3. Extract entity rendering

- [x] 3.1 Create `src/render/renderEntities.ts` — move `renderEntities()` from `GameWorld` here as `export function renderEntities(ctx, snapshot)`. Include food drawing, bed drawing, wall drawing (3D), and shadow calls
- [x] 3.2 Update `GameWorld.renderEntities()` to delegate to the new function (or restructure in step 5)

## 4. Extract overlay rendering

- [x] 4.1 Create `src/render/renderOverlay.ts` — move `renderBuildQueueGhosts()`, `renderHighlight()`, `renderSelection()`, `renderPaths()` from `GameWorld` here as standalone exported functions accepting `(ctx, snapshot)`
- [x] 4.2 Each function reads its needed data from the snapshot instead of `this.*`

## 5. Create main renderWorld orchestrator

- [x] 5.1 In `src/render/worldRenderer.ts`, add `export function renderWorld(ctx: CanvasRenderingContext2D, snapshot: RenderSnapshot): void` that: clears canvas, draws background, calls `renderMap()`, depth-sorts and draws colonists, calls `renderEntities()`, `renderBuildQueueGhosts()`, `renderHighlight()`, `renderSelection()`, `renderPaths()`
- [x] 5.2 Replace `GameWorld.render()` body with: `inputHandler.update(realDt)` + `renderWorld(ctx, this.collectSnapshot())`

## 6. Remove dead code and verify

- [x] 6.1 Delete the 6 render methods from `GameWorld` (`renderEntities`, `renderBuildQueueGhosts`, `renderHighlight`, `renderSelection`, `renderPaths`)
- [x] 6.2 Remove the local `roundRect` definition
- [x] 6.3 Run `npx vitest run` and confirm all existing tests pass
- [x] 6.4 Run `npm run build` to confirm TypeScript compiles cleanly (note: `tsc -b` errors are pre-existing in test files, `vite build` compiles clean)

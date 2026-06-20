# Render System

## Purpose

The render system provides a clean separation between game logic and visual output. It accepts a snapshot of game state and draws all visual elements onto a Canvas 2D context, including the isometric map, entities (food, beds, walls), colonists with HUD overlays, build queue previews, selection indicators, and movement paths.

## Requirements

### Requirement: Renderer accepts a snapshot of game state
The renderer SHALL accept a `RenderSnapshot` value object containing all data needed to draw a frame: map tiles, colonist states, entity positions, camera offset, and UI overlay state.

#### Scenario: renderWorld renders a complete frame
- **WHEN** `renderWorld(ctx, snapshot)` is called with a valid snapshot and canvas context
- **THEN** it SHALL clear the canvas, draw the background, map tiles (back-to-front), colonists (depth-sorted), entities, build queue ghosts, overlay highlights, selection indicator, and movement paths

### Requirement: Snapshot contains all renderable state
The `RenderSnapshot` SHALL contain: camera offset, canvas dimensions, map reference, colonist array, food/bed/building arrays, build queue tasks, hovered tile, selected colonist ID, and build mode.

#### Scenario: Snapshot decouples renderer from GameWorld
- **WHEN** the renderer accesses game data
- **THEN** it SHALL do so only through the `RenderSnapshot`, never through a `GameWorld` reference

### Requirement: Entity rendering covers all entity types
The renderer SHALL draw food (berry clusters), beds (brown mattress with pillow), and walls (pseudo-3D with 3 faces), each with appropriate shadows.

#### Scenario: Food is drawn as red berry cluster
- **WHEN** a food entity is rendered
- **THEN** it SHALL appear as a cluster of 3 red circles with yellow highlights, with an elliptical shadow beneath

#### Scenario: Bed is drawn as brown mattress with pillow
- **WHEN** a bed entity is rendered
- **THEN** it SHALL appear as a brown rounded rectangle with a smaller rounded rectangle pillow, with an elliptical shadow beneath

#### Scenario: Wall is drawn as pseudo-3D block
- **WHEN** a wall building is rendered
- **THEN** it SHALL appear as a 3-faced pseudo-3D block (top, front gradient, right gradient)

### Requirement: Colonist render reads FSM phase
DrawColonist SHALL read `colonist.state.phase` instead of `colonist.state` (string) to determine visual appearance.

#### Scenario: Working phase shows eyes open
- **WHEN** a colonist is in `working` phase
- **THEN** eyes SHALL be rendered (open)

#### Scenario: Working phase with sleep job shows eyes closed
- **WHEN** a colonist is in `working` phase with `job === 'sleep'`
- **THEN** eyes SHALL NOT be rendered (closed)

#### Scenario: Idle phase shows eyes open
- **WHEN** a colonist is in `idle` phase
- **THEN** eyes SHALL be rendered (open)

### Requirement: Overlays render build previews and highlights
The renderer SHALL draw: semi-transparent ghost previews for queued build tasks, green/red highlight diamond on hover (in build mode), yellow selection diamond on selected colonist, and semi-transparent path lines for moving colonists.

#### Scenario: Hover tile shows valid/invalid indicator
- **WHEN** player hovers a tile in build mode
- **THEN** a diamond outline SHALL appear at that tile: green with ghost preview if buildable, red if blocked

### Requirement: Path overlay reads moving phase
RenderOverlay SHALL check `colonist.state.phase === 'moving'` instead of `colonist.state === 'walking'`.

#### Scenario: Moving phase shows path
- **WHEN** a colonist is in `moving` phase with non-empty path
- **THEN** the path line SHALL be rendered

#### Scenario: Non-moving phase hides path
- **WHEN** a colonist is not in `moving` phase
- **THEN** the path line SHALL NOT be rendered

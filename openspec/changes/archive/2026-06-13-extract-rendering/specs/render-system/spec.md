## ADDED Requirements

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

### Requirement: Colonists are rendered with need bars and names
Each colonist SHALL be drawn as a stick figure (legs, body, head) with color-coded hunger/sleep bars above the head, a name label, and eyes (hidden when sleeping).

#### Scenario: Colonist is drawn with full HUD
- **WHEN** a colonist is rendered
- **THEN** it SHALL show: colored body/head/legs, hunger bar (green > 40, red ≤ 40), sleep bar (blue > 25, orange ≤ 25), name label, and eyes if not sleeping

### Requirement: Overlays render build previews and highlights
The renderer SHALL draw: semi-transparent ghost previews for queued build tasks, green/red highlight diamond on hover (in build mode), yellow selection diamond on selected colonist, and semi-transparent path lines for moving colonists.

#### Scenario: Hover tile shows valid/invalid indicator
- **WHEN** player hovers a tile in build mode
- **THEN** a diamond outline SHALL appear at that tile: green with ghost preview if buildable, red if blocked

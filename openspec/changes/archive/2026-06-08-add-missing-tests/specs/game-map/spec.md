## ADDED Requirements

### Requirement: GameMap provides tile access
GameMap SHALL return the correct tile at any valid coordinate, and a default Water tile for out-of-bounds coordinates.

#### Scenario: tileAt returns correct tile
- **WHEN** a tile was set at position (5, 5)
- **THEN** tileAt(5, 5) returns that tile

#### Scenario: tileAt out of bounds returns water
- **WHEN** queried at (-1, 0) or (30, 0) or (0, 20)
- **THEN** returns a Water tile

### Requirement: GameMap supports tile modification
setTile SHALL change the tile type and walkability at the given position.

#### Scenario: setTile changes tile type
- **WHEN** setTile changes a Floor to Wall at (3, 3)
- **THEN** tileAt(3, 3) returns Wall type and isWalkable(3, 3) is false

#### Scenario: setTile out of bounds is no-op
- **WHEN** setTile is called at (-1, 0)
- **THEN** no error is thrown and state is unchanged

### Requirement: GameMap tracks tile occupancy
GameMap SHALL track which colonist occupies each tile via setOccupant/getOccupant.

#### Scenario: setOccupant marks tile
- **WHEN** setOccupant(5, 5, "colonist-1")
- **THEN** getOccupant(5, 5) returns "colonist-1"

#### Scenario: setOccupant to null clears tile
- **WHEN** setOccupant(5, 5, null)
- **THEN** getOccupant(5, 5) returns null

### Requirement: GameMap serializes to JSON
toJSON SHALL produce a tiles array matching the grid dimensions.

#### Scenario: toJSON preserves dimensions
- **WHEN** toJSON is called on a 30x20 map
- **THEN** result.tiles has 20 rows of 30 tiles each

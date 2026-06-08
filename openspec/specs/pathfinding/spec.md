# Pathfinding

## Purpose

A* pathfinding on the game grid — finding valid paths between tiles while avoiding unwalkable terrain and occupied positions.

## Requirements

### Requirement: Pathfinding finds paths on walkable terrain
The A* pathfinder SHALL find a valid path from start to end on walkable terrain. The path SHALL consist of adjacent tiles (4-directional movement). The first step SHALL be adjacent to start; the last step SHALL be the end tile.

#### Scenario: Simple path on open ground
- **WHEN** start is (0, 0) and end is (2, 0) on a floor-only map
- **THEN** findPath returns `[{x:1,y:0}, {x:2,y:0}]`

#### Scenario: Start equals end
- **WHEN** start equals end
- **THEN** findPath returns empty array

### Requirement: Pathfinding handles obstacles
The pathfinder SHALL find paths that route around unwalkable tiles (Wall, Rock, Water). If no path exists it SHALL return empty array.

#### Scenario: Path around a wall
- **WHEN** a wall blocks the direct line between start and end
- **THEN** findPath returns a path that goes around the wall

#### Scenario: No path to unreachable area
- **WHEN** end tile is surrounded by unwalkable tiles
- **THEN** findPath returns empty array

### Requirement: Pathfinding respects occupancy
The pathfinder SHALL treat occupied positions as blocked tiles, except for the start position.

#### Scenario: Avoids occupied position mid-path
- **WHEN** a tile on the direct path is in occupiedPositions
- **THEN** findPath routes around the occupied tile

#### Scenario: Does not block start position
- **WHEN** the start position is in occupiedPositions
- **THEN** findPath still finds a path (start is excluded from occupied set)

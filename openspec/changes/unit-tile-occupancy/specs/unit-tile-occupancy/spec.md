## ADDED Requirements

### Requirement: Tile occupancy tracking
The system SHALL track which colonist occupies each tile. A colonist in `idle` or `working` state SHALL occupy its current tile. A colonist in `walking` state SHALL NOT occupy any tile.

#### Scenario: Colonist occupies tile on idle/working
- **WHEN** a colonist transitions to `idle` or `working` state at a position (x, y)
- **THEN** tile (x, y) SHALL be marked as occupied by that colonist's id

#### Scenario: Colonist releases tile on walking
- **WHEN** a colonist transitions from `idle`/`working` to `walking` state
- **THEN** the colonist's previous tile SHALL be released (no longer occupied)

### Requirement: Pathfinding blocks only occupied target tile
The system SHALL allow colonists to pathfind through tiles occupied by other walking colonists. The pathfinding SHALL only treat a tile as blocked if it is the occupied target destination of another job.

#### Scenario: Path through walking colonist allowed
- **WHEN** a colonist pathfinds and an intermediate tile is occupied by a walking colonist
- **THEN** the pathfinder SHALL NOT treat that tile as blocked

#### Scenario: Path to occupied target blocked
- **WHEN** a colonist pathfinds to a target tile that is occupied by another colonist in `idle` or `working` state
- **THEN** the pathfinder SHALL treat that tile as blocked

### Requirement: Destination check on movement step
The system SHALL check, on each movement step (tile shift), whether the final tile of the current path is still free. If the final tile is occupied, the colonist SHALL cancel its current job and return to `idle`.

#### Scenario: Final tile becomes occupied mid-transit
- **WHEN** a colonist moves along a path and at the moment of shifting to a new tile the final path tile is occupied by another non-walking colonist
- **THEN** the colonist SHALL stop moving, cancel current job, and enter `idle` state

#### Scenario: Final tile stays free
- **WHEN** a colonist moves along a path and the final path tile remains free
- **THEN** the colonist SHALL continue moving normally and occupy the tile on arrival

#### Scenario: Walking colonist does not block final tile
- **WHEN** a colonist checks the final tile and it is occupied by a walking colonist
- **THEN** the tile SHALL be considered free (walking colonists do not occupy tiles)

# Unit Tile Occupancy

## Purpose

Track tile occupancy for colonists based on FSM phase (assigned/moving/working/done/idle) and use occupancy information to guide pathfinding and movement decisions.

## Requirements

### Requirement: Tile occupancy tracking
The system SHALL track which colonist occupies each tile. Occupancy SHALL be managed by FSM phase transitions, not by external calls.

#### Scenario: Colonist occupies tile on working/done/idle
- **WHEN** a colonist transitions to `working`, `done`, or `idle` phase at a position (x, y)
- **THEN** tile (x, y) SHALL be marked as occupied by that colonist's id

#### Scenario: Colonist releases tile on assigned/moving
- **WHEN** a colonist transitions from `idle` to `assigned` or from `working` to `moving` (via re-assignment)
- **THEN** the colonist's previous tile SHALL be released (no longer occupied)

### Requirement: Pathfinding blocks only occupied target tile
The system SHALL allow colonists to pathfind through tiles occupied by other colonists in `moving` phase. The pathfinder SHALL only treat a tile as blocked if it is occupied by a colonist in `working`, `done`, or `idle` phase.

#### Scenario: Path through moving colonist allowed
- **WHEN** a colonist pathfinds and an intermediate tile is occupied by a `moving` colonist
- **THEN** the pathfinder SHALL NOT treat that tile as blocked

#### Scenario: Path to occupied working target blocked
- **WHEN** a colonist pathfinds to a target tile that is occupied by another colonist in `working` or `idle` phase
- **THEN** the pathfinder SHALL treat that tile as blocked

### Requirement: Destination check on movement step
The system SHALL check, on each movement step (tile shift), whether the final tile of the current path is still free. If the final tile is occupied, the colonist SHALL cancel its current job and return to `idle`.

#### Scenario: Final tile becomes occupied mid-transit
- **WHEN** a colonist moves along a path and at the moment of shifting to a new tile the final path tile is occupied by another non-moving colonist
- **THEN** the colonist SHALL transition to `idle` (job cancelled)

#### Scenario: Final tile stays free
- **WHEN** a colonist moves along a path and the final path tile remains free
- **THEN** the colonist SHALL continue moving normally and occupy the tile on arrival (transition to `working`)

#### Scenario: Moving colonist does not block final tile
- **WHEN** a colonist checks the final tile and it is occupied by a moving colonist
- **THEN** the tile SHALL be considered free (moving colonists do not occupy tiles)

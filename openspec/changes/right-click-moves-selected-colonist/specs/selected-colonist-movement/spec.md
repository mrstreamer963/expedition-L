## ADDED Requirements

### Requirement: Right-click moves selected colonist

When a colonist is selected and the player right-clicks a walkable tile, the selected colonist SHALL move to that tile.

#### Scenario: Selected colonist moves on right-click
- **WHEN** a colonist is selected and the player right-clicks a walkable tile
- **THEN** the selected colonist moves toward that tile

#### Scenario: No selection falls back to nearest
- **WHEN** no colonist is selected and the player right-clicks a walkable tile
- **THEN** the nearest colonist to the click target moves toward that tile (existing behavior)

#### Scenario: Selected colonist is ignored if invalid
- **WHEN** a non-existent colonistId is provided in the right-click action
- **THEN** the system falls back to moving the nearest colonist

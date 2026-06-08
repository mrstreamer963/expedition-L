## Purpose

Camera pan speed SHALL be decoupled from the game speed setting, so that keyboard panning feels consistent regardless of whether the game is paused or running at high speed.

## Requirements

### Requirement: Camera pan speed independent of game speed
The system SHALL ensure camera panning speed is constant regardless of the current game speed setting. At GameSpeed 0 (paused), keyboard panning SHALL still function at normal speed. At GameSpeed 3 (10×), keyboard panning SHALL move at the same speed as at GameSpeed 1 (1×).

#### Scenario: Panning at high game speed
- **WHEN** the game speed is set to 10× and the user holds the W key
- **THEN** the camera SHALL pan downward at the same rate as at 1× speed

#### Scenario: Panning while paused
- **WHEN** the game is paused (GameSpeed 0) and the user holds the A key
- **THEN** the camera SHALL pan right at normal speed

#### Scenario: Middle-mouse drag unaffected
- **WHEN** the user middle-mouse drags to pan at any game speed
- **THEN** the drag panning speed SHALL be identical to dragging at 1× speed

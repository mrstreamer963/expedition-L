## Purpose

Allow the user to pan the camera using keyboard controls (W/A/S/D) for isometric map navigation. W/S are inverted relative to conventional screen-space — W pans downward, S pans upward — to match player expectations in isometric perspective.

## Requirements

### Requirement: Keyboard map panning with inverted W/S
The system SHALL allow the user to pan the camera using W/A/S/D keys. W SHALL pan the camera downward, S SHALL pan the camera upward. Cyrillic keyboard equivalents (`ц`, `ф`, `ы`, `в`) SHALL behave identically to their Latin counterparts.

#### Scenario: W pans camera down
- **WHEN** the user presses and holds the W key (or `ц`)
- **THEN** the camera SHALL pan downward (positive Y offset) at the configured CAMERA_SPEED

#### Scenario: S pans camera up
- **WHEN** the user presses and holds the S key (or `ы`)
- **THEN** the camera SHALL pan upward (negative Y offset) at the configured CAMERA_SPEED

#### Scenario: A and D unaffected
- **WHEN** the user presses A or D keys
- **THEN** the camera SHALL continue to pan horizontally as before (A = right, D = left)

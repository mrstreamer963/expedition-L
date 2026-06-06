## ADDED Requirements

### Requirement: Speed buttons show active state
The system SHALL visually indicate which simulation speed is currently active among the speed control buttons.

#### Scenario: Pause button shows active state
- **WHEN** the simulation speed is 0 (paused)
- **THEN** the stop/pause button SHALL display an active highlight style

#### Scenario: Normal speed button shows active state
- **WHEN** the simulation speed is 1 (normal)
- **THEN** the single-arrow play button SHALL display an active highlight style

#### Scenario: Fast speed button shows active state
- **WHEN** the simulation speed is 2 (fast)
- **THEN** the double-arrow play button SHALL display an active highlight style

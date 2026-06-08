## Purpose

UI components and user interface behavior for the colony simulation game, including controls and information display.

## Requirements

### Requirement: Speed buttons show active state
The system SHALL provide speed control buttons for all speed tiers (pause, 1x, 5x, 10x) and SHALL visually indicate which simulation speed is currently active.

#### Scenario: Pause button shows active state
- **WHEN** the simulation speed is 0 (paused)
- **THEN** the stop/pause button SHALL display an active highlight style

#### Scenario: Normal speed button shows active state
- **WHEN** the simulation speed is 1 (normal)
- **THEN** the single-arrow play button SHALL display an active highlight style

#### Scenario: Fast speed button shows active state
- **WHEN** the simulation speed is 2 (fast)
- **THEN** the double-arrow play button SHALL display an active highlight style

#### Scenario: 10x speed button shows active state
- **WHEN** the simulation speed is 3 (10x)
- **THEN** the 10x speed button SHALL display an active highlight style matching the other speed buttons

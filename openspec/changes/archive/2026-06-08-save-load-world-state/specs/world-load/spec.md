## ADDED Requirements

### Requirement: Deserialize and restore game state
The system SHALL deserialize a `SaveData` JSON object and reconstruct a fully functional `GameWorld`.

#### Scenario: Load restores map tiles
- **WHEN** a save is loaded
- **THEN** `GameWorld.map` SHALL contain the exact tile grid from the save, with all tile types and occupant IDs matching the saved values

#### Scenario: Load restores colonists
- **WHEN** a save is loaded containing 3 colonists with specific states, positions, and needs
- **THEN** `GameWorld.colonists` SHALL contain 3 `Colonist` instances with matching `id`, `name`, `color`, `position`, `state`, `needs`, `currentJob`, `path`, `buildType`, and `pendingBuildTaskId`

#### Scenario: Load restores entities
- **WHEN** a save is loaded containing foods, beds, and buildings
- **THEN** `GameWorld.foods`, `GameWorld.beds`, and `GameWorld.buildings` SHALL contain the correct entities at the correct positions

#### Scenario: Load restores build queue
- **WHEN** a save is loaded with pending build tasks
- **THEN** `GameWorld.buildQueue` SHALL contain all tasks in the same order, with `reservedBy` set to `null` (reservations are not restored)

#### Scenario: Load restores camera and speed
- **WHEN** a save is loaded with camera at (200, 150) and speed 2
- **THEN** the camera SHALL be at offset (200, 150) and the game SHALL run at speed 2

#### Scenario: Colonist onArrive callbacks are null after load
- **WHEN** a save is loaded
- **THEN** all colonists SHALL have `onArrive` set to `null` (callbacks are not serializable)

### Requirement: Load from localStorage
The system SHALL restore game state from `localStorage`.

#### Scenario: Load autosave from localStorage
- **WHEN** the player triggers Load and an autosave exists under `'expedition-autosave'`
- **THEN** the game SHALL deserialize and restore that state

#### Scenario: Graceful handling of missing or corrupt localStorage data
- **WHEN** `localStorage` has no data under the requested key, or the stored data fails version validation
- **THEN** the load operation SHALL show an error message and NOT modify the current game state

### Requirement: Load from file upload
The system SHALL restore game state from a `.json` file selected by the player.

#### Scenario: Load from uploaded file
- **WHEN** the player clicks Load and selects a valid `.json` save file via the file picker
- **THEN** the game SHALL deserialize and restore that state

#### Scenario: Reject invalid save files
- **WHEN** the player selects a file that is not valid JSON, lacks `version`, or has an unsupported `version`
- **THEN** the load SHALL fail with an error message and NOT modify the current game state

### Requirement: Schema version validation
The system SHALL validate the save file schema version before loading.

#### Scenario: Reject unsupported version
- **WHEN** a save file with `version: 0` or `version: 2` (any value other than `1`) is loaded
- **THEN** the system SHALL reject the save with an error: "Unsupported save version"

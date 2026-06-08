## ADDED Requirements

### Requirement: World state serialization
The system SHALL serialize the full `GameWorld` state into a portable JSON format that captures all data needed to restore the game.

#### Scenario: Serialize map tiles
- **WHEN** `WorldSerializer.toJSON()` is called on a `GameWorld` with a 30×20 map containing a mix of Floor, Wall, Rock, Water tiles
- **THEN** the resulting `SaveData.map.tiles` array SHALL contain all 600 tiles with their `type` and `occupantId` fields preserved exactly

#### Scenario: Serialize colonists
- **WHEN** `WorldSerializer.toJSON()` is called on a `GameWorld` with 3 colonists at various positions, states, and need levels
- **THEN** the resulting `SaveData.colonists` SHALL contain 3 entries, each with the colonist's `id`, `name`, `color`, `position`, `state`, `needs`, `currentJob`, `path`, `buildType`, and `pendingBuildTaskId`

#### Scenario: Serialize entities
- **WHEN** `WorldSerializer.toJSON()` is called on a `GameWorld` with foods, beds, and buildings placed
- **THEN** the resulting `SaveData` SHALL contain `foods`, `beds`, and `buildings` arrays with each entity's `id`, `x`, and `y` (and `type` for buildings)

#### Scenario: Serialize build queue
- **WHEN** `WorldSerializer.toJSON()` is called on a `GameWorld` with pending build tasks in the queue
- **THEN** the resulting `SaveData.buildQueue` SHALL contain all tasks with `id`, `type`, `x`, `y`, and `reservedBy` fields preserved

#### Scenario: Serialize camera and speed
- **WHEN** `WorldSerializer.toJSON()` is called on a `GameWorld` at speed 2 with camera panned to (200, 150)
- **THEN** `SaveData.camera` SHALL be `{ offsetX: 200, offsetY: 150 }` and `SaveData.speed` SHALL be `2`

#### Scenario: Save file includes version and metadata
- **WHEN** any save is created
- **THEN** the `SaveData` SHALL include `version: 1`, a `timestamp` (ms since epoch), and `gameName: 'expedition-l'`

### Requirement: Persist to localStorage
The system SHALL persist serialized game state to the browser's `localStorage`.

#### Scenario: Save to autosave slot
- **WHEN** the player triggers a save
- **THEN** the serialized state SHALL be written to `localStorage` under the key `'expedition-autosave'`

#### Scenario: Save does not throw on localStorage failure
- **WHEN** `localStorage` is full or unavailable
- **THEN** the save operation SHALL catch the error and surface it to the UI without breaking the game loop

### Requirement: Export save as file download
The system SHALL allow the player to download the save as a `.json` file.

#### Scenario: Download save file
- **WHEN** the player clicks Save
- **THEN** a `.json` file SHALL be downloaded containing the complete serialized game state, with a filename like `expedition-save-<timestamp>.json`

### Requirement: Auto-save on page unload
The system SHALL automatically save on `beforeunload`.

#### Scenario: Auto-save before page close
- **WHEN** the page is closed or reloaded
- **THEN** the current game state SHALL be serialized and persisted to `localStorage` under `'expedition-autosave'`

#### Scenario: Auto-save does not block unload
- **WHEN** `beforeunload` fires
- **THEN** the serialization SHALL complete synchronously without blocking the unload event

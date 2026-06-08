## ADDED Requirements

### Requirement: Save button in TopBar
The TopBar SHALL contain a Save button that triggers world state serialization and persistence.

#### Scenario: Save button visible
- **WHEN** the game is running
- **THEN** the TopBar SHALL display a Save button with a disk icon or label "Save"

#### Scenario: Clicking Save serializes and persists
- **WHEN** the player clicks the Save button
- **THEN** the game state SHALL be serialized, written to `localStorage`, and downloaded as a `.json` file

#### Scenario: Save feedback
- **WHEN** a save completes successfully
- **THEN** a brief visual feedback (e.g., button text changes to "Saved!" for 1.5 seconds) SHALL indicate success

#### Scenario: Save error feedback
- **WHEN** a save fails (e.g., `localStorage` full)
- **THEN** an error message SHALL be shown to the player

### Requirement: Load button in TopBar
The TopBar SHALL contain a Load button that opens a file picker and restores game state from the selected `.json` file.

#### Scenario: Load button visible
- **WHEN** the game is running
- **THEN** the TopBar SHALL display a Load button with a folder icon or label "Load"

#### Scenario: Clicking Load opens file picker
- **WHEN** the player clicks the Load button
- **THEN** a native file picker SHALL open, filtered to `.json` files

#### Scenario: Successful load restarts game
- **WHEN** the player selects a valid `.json` save file
- **THEN** the current game SHALL be destroyed and a new `GameWorld` SHALL be created with the saved state, and the UI SHALL update to reflect the restored state

#### Scenario: Failed load shows error
- **WHEN** the player selects an invalid `.json` file
- **THEN** an error message SHALL be shown and the current game SHALL continue unchanged

### Requirement: Autosave prompt on startup
The system SHALL check for an autosave on app startup and offer to restore it.

#### Scenario: Autosave exists on load
- **WHEN** the app starts and an autosave exists in `localStorage`
- **THEN** the player SHALL be prompted with "Обнаружено автосохранение. Загрузить?" (Autosave found. Load?) with Yes/No options

#### Scenario: Autosave prompt accepted
- **WHEN** the player accepts the autosave prompt
- **THEN** the game SHALL load from the autosave and the `localStorage` entry SHALL be preserved

#### Scenario: Autosave prompt declined
- **WHEN** the player declines the autosave prompt
- **THEN** the game SHALL start a new game and the autosave SHALL remain in `localStorage` for later manual loading

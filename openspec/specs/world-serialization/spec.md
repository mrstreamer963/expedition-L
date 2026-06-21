# World Serialization

## Purpose

Save/load round-trip integrity and data validation — serializing game state to JSON and restoring it reliably.

## Requirements

### Requirement: WorldSerializer produces valid JSON structure
toJSON SHALL produce a SaveData object with all required fields: version, timestamp, gameName, map, colonists, foods, beds, buildings, buildQueue, camera, speed. Version SHALL be 3.

#### Scenario: toJSON includes all sections
- **WHEN** toJSON is called with a valid world state
- **THEN** the result contains map, colonists, foods, beds, buildings, buildQueue, camera, speed fields

#### Scenario: toJSON includes systemData
- **WHEN** toJSON is called with system data from the pipeline
- **THEN** the result contains a `systemData` field with system-persisted state

#### Scenario: toJSON default systemData
- **WHEN** toJSON is called without system data
- **THEN** the result SHALL contain `systemData: {}` (empty object)

### Requirement: WorldSerializer validates data integrity
validate SHALL return true only for complete and correct SaveData objects.

#### Scenario: Valid data passes validation
- **WHEN** validate receives a correctly structured SaveData with current version
- **THEN** returns true

#### Scenario: Invalid data fails validation
- **WHEN** validate receives null, non-object, wrong version, or missing fields
- **THEN** returns false

#### Scenario: Valid v3 data passes validation
- **WHEN** validate receives a correctly structured SaveData with version 3 and `systemData` field
- **THEN** returns true

### Requirement: WorldSerializer round-trip preserves state
fromJSON(toJSON(world)) SHALL produce a world state equivalent to the original — same map dimensions, same number of colonists, foods, beds, buildings, same speed.

#### Scenario: Round-trip preserves map dimensions
- **WHEN** a GameWorld is serialized then deserialized
- **THEN** the resulting map has the same width and height

#### Scenario: Round-trip preserves entity counts
- **WHEN** a GameWorld is serialized then deserialized
- **THEN** colonist count, food count, bed count, building count match the original

### Requirement: Colonist serialization uses FSM state format
Colonist toJSON SHALL serialize the FSM state discriminant and phase-specific fields instead of flat `state`, `currentJob`, `path`, `onArrive`, `pendingBuildTaskId`, `moveProgress`, `jobTimer`.

#### Scenario: FSM state serialization format
- **WHEN** `colonist.toJSON()` is called
- **THEN** the returned object SHALL contain a `fsmState` field with the discriminated union phase and phase-specific data, and SHALL NOT contain `state`, `currentJob`, `onArrive`, `pendingBuildTaskId`, `moveProgress`, or `jobTimer` fields

#### Scenario: Idle state serialized
- **WHEN** a colonist in `idle` phase is serialized
- **THEN** `fsmState` SHALL be `{ phase: 'idle' }`

#### Scenario: Moving state serialized
- **WHEN** a colonist in `moving` phase is serialized
- **THEN** `fsmState` SHALL contain `phase: 'moving'`, `job`, and `path` array

#### Scenario: Working state serialized
- **WHEN** a colonist in `working` phase is serialized
- **THEN** `fsmState` SHALL contain `phase: 'working'`, `job`, `progress`, and `duration`

#### Scenario: Done state serialized
- **WHEN** a colonist in `done` phase is serialized
- **THEN** `fsmState` SHALL contain `phase: 'done'` and `job`

### Requirement: Colonist deserialization restores FSM state
Colonist fromJSON SHALL reconstruct the FSM state object from the serialized `fsmState` field.

#### Scenario: FSM state deserialization
- **WHEN** a colonist is deserialized from JSON with `fsmState`
- **THEN** the colonist's state SHALL be the reconstructed discriminated union

### Requirement: Backward compatibility with legacy format
WorldSerializer SHALL support loading saves from the previous format (flat `state`/`currentJob`/`path`) by converting to the new FSM format.

#### Scenario: Legacy format conversion
- **WHEN** loaded save data has `state` and `currentJob` instead of `fsmState`
- **THEN** the serializer SHALL convert to the equivalent FSM state (e.g., `state: 'walking'` + `path: [...]` → `{ phase: 'moving', job: 'walk', path }`)

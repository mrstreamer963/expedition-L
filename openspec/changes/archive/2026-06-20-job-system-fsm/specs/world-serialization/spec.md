## MODIFIED Requirements

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

## MODIFIED Requirements

### Requirement: Colonist render reads FSM phase
DrawColonist SHALL read `colonist.state.phase` instead of `colonist.state` (string) to determine visual appearance.

#### Scenario: Working phase shows eyes open
- **WHEN** a colonist is in `working` phase
- **THEN** eyes SHALL be rendered (open)

#### Scenario: Working phase with sleep job shows eyes closed
- **WHEN** a colonist is in `working` phase with `job === 'sleep'`
- **THEN** eyes SHALL NOT be rendered (closed)

#### Scenario: Idle phase shows eyes open
- **WHEN** a colonist is in `idle` phase
- **THEN** eyes SHALL be rendered (open)

### Requirement: Path overlay reads moving phase
RenderOverlay SHALL check `colonist.state.phase === 'moving'` instead of `colonist.state === 'walking'`.

#### Scenario: Moving phase shows path
- **WHEN** a colonist is in `moving` phase with non-empty path
- **THEN** the path line SHALL be rendered

#### Scenario: Non-moving phase hides path
- **WHEN** a colonist is not in `moving` phase
- **THEN** the path line SHALL NOT be rendered

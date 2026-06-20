# Colonist FSM

## Purpose

Manage colonist behavior through a finite state machine with explicit phase transitions for idle, assigned, moving, working, and done states.

## Requirements

### Requirement: Colonist has FSM-based state
Colonist state SHALL be a discriminated union type with phases: `idle`, `assigned`, `moving`, `working`, `done`. Each phase SHALL carry only the data relevant to that phase.

#### Scenario: Colonist starts in idle phase
- **WHEN** a colonist is created
- **THEN** its state SHALL be `{ phase: 'idle' }`

#### Scenario: Colonist in idle has no extra fields
- **WHEN** a colonist is in `idle` phase
- **THEN** the state object SHALL have only the `phase` property

#### Scenario: Colonist in moving has path and job
- **WHEN** a colonist transitions to `moving` phase
- **THEN** its state SHALL contain `job` (string) and `path` (Vec2[])

#### Scenario: Colonist in working has progress and duration
- **WHEN** a colonist is in `working` phase
- **THEN** its state SHALL contain `job` (string), `progress` (number 0-1), and `duration` (number in seconds)

### Requirement: Colonist transitions through FSM phases explicitly
The colonist SHALL provide a `transition(targetPhase, ...data)` method that validates and applies state changes. Direct mutation of `state` property outside transitions SHALL be prohibited.

#### Scenario: Full lifecycle transitions
- **WHEN** a colonist is assigned a job, walks to target, works, and completes
- **THEN** the phase sequence SHALL be: idle → assigned → moving → working → done → idle

#### Scenario: Idle to assigned transition
- **WHEN** `transition('assigned', { job, target })` is called on an idle colonist
- **THEN** the colonist state SHALL be `{ phase: 'assigned', job, target }`

#### Scenario: Invalid transition throws
- **WHEN** `transition('working', ...)` is called on an idle colonist
- **THEN** the call SHALL throw or return false (invalid transition)

### Requirement: Colonist updates state each tick
Colonist SHALL have a single `update(dt, context)` method that handles movement, job progress, and phase transitions internally.

#### Scenario: Moving colonist progresses along path
- **WHEN** `update(dt, context)` is called on a colonist in `moving` phase
- **THEN** the colonist SHALL advance along its path by `speed * dt` tiles

#### Scenario: Moving colonist arrives at destination
- **WHEN** a colonist in `moving` phase reaches the end of its path
- **THEN** its state SHALL transition to `working` with `progress: 0`

#### Scenario: Working colonist progresses job timer
- **WHEN** `update(dt, context)` is called on a colonist in `working` phase
- **THEN** `progress` SHALL increase by `dt / duration`

#### Scenario: Working colonist completes job
- **WHEN** a colonist in `working` phase reaches `progress >= 1`
- **THEN** its state SHALL transition to `done`

#### Scenario: Done calls onComplete and transitions to idle
- **WHEN** `update(dt, context)` is called on a colonist in `done` phase
- **THEN** the colonist SHALL invoke `JobRegistry.get(job).onComplete(colonist, context)` and transition to `idle`

#### Scenario: Moving colonist finds final tile occupied
- **WHEN** a colonist in `moving` phase shifts to a new tile and the final path tile is occupied by another non-moving colonist
- **THEN** the colonist SHALL transition to `idle` (job cancelled)

### Requirement: Colonist provides getInterpolatedPosition for render
Colonist SHALL provide `getInterpolatedPosition()` that returns smooth sub-tile position when in `moving` phase, and exact tile position otherwise.

#### Scenario: Moving returns interpolated
- **WHEN** colonist is in `moving` phase with non-empty path
- **THEN** `getInterpolatedPosition()` SHALL return position interpolated between current tile and next path tile

#### Scenario: Non-moving returns exact position
- **WHEN** colonist is not in `moving` phase
- **THEN** `getInterpolatedPosition()` SHALL return `{ ...this.position }`

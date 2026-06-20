# Job Registry

## Purpose

Define and register job types with lifecycle callbacks for findTarget, onStart, onComplete, onCancel, and onTick.

## Requirements

### Requirement: JobDefinition defines job lifecycle
A JobDefinition SHALL be an object with `type`, `duration`, and lifecycle methods: `findTarget`, `onStart`, `onComplete`, `onCancel`, `onTick`.

#### Scenario: JobDefinition has required fields
- **WHEN** a JobDefinition is registered
- **THEN** it SHALL have `type` (string), `duration` (number), `findTarget` (function), `onStart` (function), and `onComplete` (function)

#### Scenario: findTarget returns target position or null
- **WHEN** `findTarget(needs, context)` is called
- **THEN** it SHALL return `Vec2` if a suitable target exists, or `null` if none available

#### Scenario: onComplete applies effects
- **WHEN** `onComplete(colonist, context)` is called
- **THEN** it SHALL apply the job's effects (e.g., consume food, place building, restore sleep)

#### Scenario: onCancel cleans up resources
- **WHEN** `onCancel(colonist, context)` is called
- **THEN** it SHALL release any reserved resources (e.g., release build task reservation)

### Requirement: JobRegistry is a singleton registry of job definitions
JobRegistry SHALL provide `register(def)`, `get(type)`, and `getAll()` for accessing job definitions.

#### Scenario: Register adds a job definition
- **WHEN** `register(def)` is called with a valid JobDefinition
- **THEN** `get(def.type)` SHALL return that definition

#### Scenario: Get returns undefined for unknown type
- **WHEN** `get('unknown')` is called
- **THEN** it SHALL return `undefined`

#### Scenario: Duplicate type throws
- **WHEN** `register(def)` is called with a type that already exists
- **THEN** it SHALL throw an error

### Requirement: Built-in jobs are registered on startup
The system SHALL register at least these jobs: `eat`, `sleep`, `build`, `walk`.

#### Scenario: Eat job defined
- **WHEN** `get('eat')` is called after initialization
- **THEN** the definition SHALL have `duration: 0.5` and `findTarget` that locates nearest food

#### Scenario: Eat onComplete consumes food
- **WHEN** a colonist completes the `eat` job
- **THEN** `onComplete` SHALL remove the nearest food at colonist's position and restore hunger by 40

#### Scenario: Sleep job defined
- **WHEN** `get('sleep')` is called after initialization
- **THEN** the definition SHALL have `duration: 10` and `findTarget` that locates nearest bed

#### Scenario: Sleep onComplete restores energy
- **WHEN** a colonist completes the `sleep` job
- **THEN** `onComplete` SHALL increase colonist's sleep need by 60 (capped at 100)

#### Scenario: Build job defined
- **WHEN** `get('build')` is called after initialization
- **THEN** the definition SHALL have `duration: 0.5` and `findTarget` that returns the build task's coordinates

#### Scenario: Build onComplete places building
- **WHEN** a colonist completes the `build` job
- **THEN** `onComplete` SHALL remove the task from BuildQueue and add the appropriate entity (Wall/Bed/Food)

#### Scenario: Walk job defined
- **WHEN** `get('walk')` is called after initialization
- **THEN** the definition SHALL have `duration: 0` (instant) and `findTarget` that returns the right-click target

#### Scenario: Walk onComplete is no-op
- **WHEN** a colonist completes the `walk` job
- **THEN** `onComplete` SHALL do nothing (walk has no effects)

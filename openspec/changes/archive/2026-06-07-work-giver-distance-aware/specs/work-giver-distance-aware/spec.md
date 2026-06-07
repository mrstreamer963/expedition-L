## ADDED Requirements

### Requirement: Build tasks assign to nearest idle colonist

The system SHALL iterate build tasks and assign each to the nearest idle colonist (task-first), not iterate colonists and assign the first available task (colonist-first).

#### Scenario: Nearest colonist gets the task
- **WHEN** a build queue has a task at position `(16, 11)`, Alice at `(10, 10)`, and Vera at `(16, 10)`
- **THEN** Vera SHALL be assigned the task (distance 1) before Alice (distance 7)

#### Scenario: All tasks equally distant from colonists
- **WHEN** multiple idle colonists are at equal distance from a task
- **THEN** the first such colonist in array order SHALL be assigned

#### Scenario: No idle colonists available
- **WHEN** the build queue has pending tasks but no colonists are idle
- **THEN** no task SHALL be assigned until a colonist becomes idle

### Requirement: Distance uses Manhattan metric

The system SHALL use Manhattan distance (`|x1 - x2| + |y1 - y2|`) for proximity comparison, consistent with `findNearestFood` and `findNearestBed`.

#### Scenario: Distance computed correctly
- **WHEN** computing distance between a colonist at `(10, 10)` and a task at `(13, 14)`
- **THEN** the distance SHALL be `|10 - 13| + |10 - 14| = 7`

### Requirement: Reservation integrity preserved

The system SHALL NOT assign a task to a colonist who is already walking to a different build task (`pendingBuildTaskId`). The existing `reserve`/`release` semantics SHALL remain unchanged.

#### Scenario: Colonist with pending task skipped
- **WHEN** iterating tasks and an idle colonist has a non-null `pendingBuildTaskId`
- **THEN** that colonist SHALL be skipped for further task assignment

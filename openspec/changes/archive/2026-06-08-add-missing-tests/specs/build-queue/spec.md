## ADDED Requirements

### Requirement: BuildQueue manages FIFO task order
BuildQueue SHALL maintain tasks in FIFO (first-in-first-out) order.

#### Scenario: Add increases length
- **WHEN** a task is added to empty BuildQueue
- **THEN** length equals 1

#### Scenario: Pop returns first added task
- **WHEN** two tasks are added and pop is called
- **THEN** pop returns the first task added and length decreases by 1

#### Scenario: Peek returns first task without removing
- **WHEN** two tasks are added and peek is called
- **THEN** peek returns the first task and length does not change

#### Scenario: Pop from empty queue
- **WHEN** pop is called on empty BuildQueue
- **THEN** returns null

### Requirement: WorkGiver reserves and releases tasks
WorkGiver SHALL allow a colonist to reserve a task, and prevent other colonists from reserving the same task.

#### Scenario: Reserve succeeds on unreserved task
- **WHEN** a task is unreserved
- **THEN** reserve returns true and task.reservedBy is set

#### Scenario: Reserve fails on already reserved task
- **WHEN** a task is already reserved by another colonist
- **THEN** reserve returns false and task.reservedBy is unchanged

#### Scenario: Release clears reservation
- **WHEN** a reserved task is released
- **THEN** task.reservedBy is null

### Requirement: BuildQueue serializes to JSON
BuildQueue SHALL serialize its tasks to a JSON-compatible object.

#### Scenario: toJSON returns tasks array
- **WHEN** toJSON is called on BuildQueue with tasks
- **THEN** returned object has a tasks array with correct count

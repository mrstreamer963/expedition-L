## ADDED Requirements

### Requirement: WorkGiver scans and pools build tasks
The system SHALL provide a `WorkGiver` class that, on each tick, scans the build queue and collects all incomplete build tasks into a `TaskPool`. Each task in the pool SHALL have a `reservedBy: string | null` field.

#### Scenario: WorkGiver scans build queue
- **WHEN** the game ticks and the build queue has pending tasks
- **THEN** WorkGiver SHALL populate the TaskPool with one entry per pending build task, each entry marked unreserved (`reservedBy = null`)

#### Scenario: Completed builds excluded from pool
- **WHEN** a build task is completed and popped from the queue
- **THEN** WorkGiver SHALL remove it from the TaskPool on the next scan

### Requirement: Reservation prevents duplicate assignment
The system SHALL allow a colonist to reserve a task from the pool. A reserved task SHALL NOT be assigned to another colonist until released.

#### Scenario: Colonist reserves a build task
- **WHEN** an idle colonist requests a build task from WorkGiver and the task is unreserved
- **THEN** the task SHALL be marked as `reservedBy = colonist.id` and returned to the colonist

#### Scenario: Reserved task not assignable
- **WHEN** an idle colonist requests a build task from WorkGiver and all tasks are reserved
- **THEN** WorkGiver SHALL return null (no available task)

#### Scenario: Task released on arrival
- **WHEN** a colonist arrives at the build target and starts building
- **THEN** the task SHALL be released from the pool (reservedBy = null) as it is no longer in transit

#### Scenario: Task released on cancel
- **WHEN** a colonist cancels a job mid-transit (e.g., target becomes occupied)
- **THEN** the task SHALL be released back to the pool and become available for other colonists

### Requirement: Needs override WorkGiver
The system SHALL bypass the WorkGiver when a colonist has critical needs. A colonist with hunger below threshold or sleep below threshold SHALL autonomously find the nearest food or bed, reserve its tile via occupantId, and path to it without consulting the WorkGiver.

#### Scenario: Hungry colonist ignores WorkGiver
- **WHEN** a colonist has `hunger < 40`
- **THEN** the colonist SHALL search for the nearest food, reserve the destination tile, and path to it directly — bypassing WorkGiver entirely

#### Scenario: Sleepy colonist ignores WorkGiver
- **WHEN** a colonist has `sleep < 25`
- **THEN** the colonist SHALL search for the nearest bed, reserve the destination tile, and path to it directly — bypassing WorkGiver entirely

#### Scenario: Need fulfilled, returns to WorkGiver
- **WHEN** a colonist finishes eating or sleeping and has no critical needs remaining
- **THEN** the colonist SHALL return to idle and be eligible for WorkGiver assignment

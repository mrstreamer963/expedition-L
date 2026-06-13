## ADDED Requirements

### Requirement: JobDispatcher reacts to game events
JobDispatcher SHALL expose an `onEvent(event)` method that handles game events and assigns jobs to idle colonists.

#### Scenario: Colonist idle triggers job assignment
- **WHEN** a `colonist_idle` event is received with a colonist ID
- **THEN** the dispatcher SHALL attempt to assign the best available job to that colonist

#### Scenario: Build queued triggers assignment
- **WHEN** a `build_queued` event is received with a BuildTask
- **THEN** the dispatcher SHALL find the nearest idle colonist and assign the build job

#### Scenario: Food consumed triggers emergency check
- **WHEN** a `food_consumed` event is received
- **THEN** the dispatcher SHALL check if any colonist is critically hungry with no food available, and if so, queue emergency food build

### Requirement: JobDispatcher assigns jobs by priority
The dispatcher SHALL assign jobs in priority order: critical needs first, then build tasks, then free walk.

#### Scenario: Critical hunger precedes build
- **WHEN** a colonist is idle with hunger < 20 and there are both food and build tasks
- **THEN** the dispatcher SHALL assign the `eat` job first

#### Scenario: Build precedes idle
- **WHEN** a colonist is idle with no critical needs and there are pending build tasks
- **THEN** the dispatcher SHALL assign the `build` job

#### Scenario: No pending jobs results in idle
- **WHEN** a colonist is idle with no critical needs and no pending build tasks
- **THEN** the dispatcher SHALL leave the colonist in `idle` phase

### Requirement: JobDispatcher uses JobRegistry for job details
The dispatcher SHALL call `JobRegistry.get(type).findTarget()` to determine if a job type has an available target.

#### Scenario: Eat job only if food exists
- **WHEN** the dispatcher considers assigning `eat`
- **THEN** it SHALL call `findTarget` on the eat definition; if returns null, skip to next priority

#### Scenario: Build job only if build tasks exist
- **WHEN** the dispatcher considers assigning `build`
- **THEN** it SHALL check if `buildQueue.all` has unreserved tasks

#### Scenario: FindTarget returns null fallback
- **WHEN** no job type has an available target
- **THEN** the colonist SHALL remain `idle`

### Requirement: JobDispatcher emits events for new jobs
When the dispatcher assigns a job, the game SHALL emit a `colonist_assigned` event.

#### Scenario: Job assigned event
- **WHEN** the dispatcher assigns a job to a colonist
- **THEN** the dispatcher SHALL trigger the colonist's `transition('assigned', { job, target })`

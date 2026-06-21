# Game System Pipeline

## Purpose

Standardized lifecycle and execution order for game logic systems via GameSystem interface and SystemPipeline.

## Requirements

### Requirement: Systems register via priority-sorted pipeline
The system pipeline SHALL execute `GameSystem.update()` calls in priority order (ascending) each tick.

#### Scenario: Systems run in priority order
- **WHEN** two GameSystem instances with priority 10 and 20 are registered
- **THEN** the priority-10 system SHALL run before the priority-20 system

### Requirement: GameSystem interface provides lifecycle hooks
Each GameSystem SHALL implement `type` (unique string identifier), `priority` (number), and `update(world: WorldState)`. Optional hooks: `init()`, `serialize() → unknown`, `deserialize(data: unknown)`, `destroy()`.

#### Scenario: Optional serializer hooks
- **WHEN** a GameSystem implements `serialize()` and `deserialize()`
- **THEN** the pipeline SHALL call them during WorldSerializer toJSON/fromJSON

#### Scenario: Lifecycle hooks propagate to all systems
- **WHEN** `pipeline.init()` is called
- **THEN** each registered system's `init()` SHALL be called if implemented

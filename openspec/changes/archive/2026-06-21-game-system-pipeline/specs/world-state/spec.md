## ADDED Requirements

### Requirement: WorldState holds all game entities
WorldState SHALL contain map, colonists (array), buildQueue (BuildQueue instance), foods (array), beds (array), and buildings (array).

#### Scenario: WorldState is constructable from partial data
- **WHEN** WorldState is created with a map, colonists array, and buildQueue
- **THEN** the remaining fields (foods, beds, buildings) SHALL default to empty arrays

### Requirement: WorldState properties are mutable
All array properties on WorldState SHALL be directly assignable (mutable) to allow systems and tests to modify state.

#### Scenario: Direct array assignment
- **WHEN** a test assigns `world.foods = []`
- **THEN** the foods array SHALL be empty thereafter

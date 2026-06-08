## ADDED Requirements

### Requirement: WorldSerializer produces valid JSON structure
toJSON SHALL produce a SaveData object with all required fields: version, timestamp, gameName, map, colonists, foods, beds, buildings, buildQueue, camera, speed.

#### Scenario: toJSON includes all sections
- **WHEN** toJSON is called with a valid world state
- **THEN** the result contains map, colonists, foods, beds, buildings, buildQueue, camera, speed fields

### Requirement: WorldSerializer validates data integrity
validate SHALL return true only for complete and correct SaveData objects.

#### Scenario: Valid data passes validation
- **WHEN** validate receives a correctly structured SaveData with current version
- **THEN** returns true

#### Scenario: Invalid data fails validation
- **WHEN** validate receives null, non-object, wrong version, or missing fields
- **THEN** returns false

### Requirement: WorldSerializer round-trip preserves state
fromJSON(toJSON(world)) SHALL produce a world state equivalent to the original — same map dimensions, same number of colonists, foods, beds, buildings, same speed.

#### Scenario: Round-trip preserves map dimensions
- **WHEN** a GameWorld is serialized then deserialized
- **THEN** the resulting map has the same width and height

#### Scenario: Round-trip preserves entity counts
- **WHEN** a GameWorld is serialized then deserialized
- **THEN** colonist count, food count, bed count, building count match the original

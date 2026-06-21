## MODIFIED Requirements

### Requirement: WorldSerializer produces valid JSON structure
toJSON SHALL produce a SaveData object with all required fields: version, timestamp, gameName, map, colonists, foods, beds, buildings, buildQueue, camera, speed. Version SHALL be 3.

#### Scenario: toJSON includes systemData
- **WHEN** toJSON is called with system data from the pipeline
- **THEN** the result contains a `systemData` field with system-persisted state

#### Scenario: toJSON default systemData
- **WHEN** toJSON is called without system data
- **THEN** the result SHALL contain `systemData: {}` (empty object)

### Requirement: WorldSerializer validates data integrity
validate SHALL return true only for complete and correct SaveData objects.

#### Scenario: Valid v3 data passes validation
- **WHEN** validate receives a correctly structured SaveData with version 3 and `systemData` field
- **THEN** returns true

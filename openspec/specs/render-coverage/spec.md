# Render Coverage

## Purpose

Map renderer iterates all tiles correctly — ensuring the full tile grid is drawn in back-to-front isometric order.

## Requirements

### Requirement: renderMap iterates all map tiles
renderMap SHALL call drawTile for every tile on the map, in back-to-front (y then x) order.

#### Scenario: renderMap calls drawTile for each tile
- **WHEN** renderMap is called with a 30x20 map
- **THEN** drawTile is called exactly 600 times

#### Scenario: drawTile receives correct tile data
- **WHEN** renderMap renders tile at (x, y)
- **THEN** drawTile is called with the tile at that position and correct screen coordinates

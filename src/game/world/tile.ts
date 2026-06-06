// Tile types for the game map
export enum TileType {
  Floor = 'Floor',
  Wall = 'Wall',
  Rock = 'Rock',
  Water = 'Water',
  Bed = 'Bed',
  Food = 'Food',
}

export interface Tile {
  type: TileType
  walkable: boolean
}

export interface TileData {
  color: string
  walkable: boolean
  pattern: string // name of procedural pattern
}

// Tile definitions with colors, walkability, and pattern name
export const TILE_DATA: Record<TileType, TileData> = {
  [TileType.Floor]: { color: '#5a8c69', walkable: true, pattern: 'grass' },
  [TileType.Wall]: { color: '#9a8b6a', walkable: false, pattern: 'brick' },
  [TileType.Rock]: { color: '#6b6b6b', walkable: false, pattern: 'crack' },
  [TileType.Water]: { color: '#4a7fa9', walkable: false, pattern: 'wave' },
  [TileType.Bed]: { color: '#c49a6c', walkable: true, pattern: 'stripe' },
  [TileType.Food]: { color: '#e8d44d', walkable: true, pattern: 'dot' },
}

// Tile dimensions for isometric rendering
export const TILE_WIDTH = 48  // screen width of one tile (48×24 diamond)
export const TILE_HEIGHT = 24 // screen height of one tile

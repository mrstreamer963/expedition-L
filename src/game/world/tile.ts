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

// Tile definitions with colors and walkability
export const TILE_DATA: Record<TileType, { color: string; walkable: boolean }> = {
  [TileType.Floor]: { color: '#4a7c59', walkable: true },
  [TileType.Wall]: { color: '#8b7355', walkable: false },
  [TileType.Rock]: { color: '#6b6b6b', walkable: false },
  [TileType.Water]: { color: '#5b8fb9', walkable: false },
  [TileType.Bed]: { color: '#c49a6c', walkable: true },
  [TileType.Food]: { color: '#e8d44d', walkable: true },
}

// Tile dimensions for isometric rendering
export const TILE_WIDTH = 32  // screen width of one tile (32px for a 32x16 diamond)
export const TILE_HEIGHT = 16 // screen height of one tile

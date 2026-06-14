export interface TileData {
  color: string
  walkable: boolean
  pattern: string
}

export const TILE_DATA: Record<string, TileData> = {
  Floor: { color: '#5a8c69', walkable: true, pattern: 'grass' },
  Wall: { color: '#9a8b6a', walkable: false, pattern: 'brick' },
  Rock: { color: '#6b6b6b', walkable: false, pattern: 'crack' },
  Water: { color: '#4a7fa9', walkable: false, pattern: 'wave' },
  Bed: { color: '#c49a6c', walkable: true, pattern: 'stripe' },
  Food: { color: '#e8d44d', walkable: true, pattern: 'dot' },
}

export const TILE_WIDTH = 48
export const TILE_HEIGHT = 24

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
  occupantId: string | null
}

export const TILE_BEHAVIOR: Record<TileType, { walkable: boolean }> = {
  Floor: { walkable: true },
  Wall:  { walkable: false },
  Rock:  { walkable: false },
  Water: { walkable: false },
  Bed:   { walkable: true },
  Food:  { walkable: true },
}

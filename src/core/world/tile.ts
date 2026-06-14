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

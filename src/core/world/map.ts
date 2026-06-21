import { Tile, TileType, TILE_BEHAVIOR } from './tile'

export const MAP_WIDTH = 30
export const MAP_HEIGHT = 20

export class GameMap {
  private grid: Tile[][]

  constructor(grid?: Tile[][]) {
    this.grid = grid ?? this.generateMap()
  }

  private generateMap(): Tile[][] {
    const grid: Tile[][] = []
    for (let y = 0; y < MAP_HEIGHT; y++) {
      const row: Tile[] = []
      for (let x = 0; x < MAP_WIDTH; x++) {
        const edgeDistance = Math.min(x, y, MAP_WIDTH - 1 - x, MAP_HEIGHT - 1 - y)
        if (edgeDistance === 0 && Math.random() < 0.6) {
          row.push({ type: TileType.Water, walkable: false, occupantId: null })
        } else if (edgeDistance <= 2 && Math.random() < 0.3) {
          row.push({ type: TileType.Rock, walkable: false, occupantId: null })
        } else if (Math.random() < 0.05) {
          row.push({ type: TileType.Rock, walkable: false, occupantId: null })
        } else {
          row.push({ type: TileType.Floor, walkable: true, occupantId: null })
        }
      }
      grid.push(row)
    }
    return grid
  }

  tileAt(x: number, y: number): Tile {
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) {
      return { type: TileType.Water, walkable: false, occupantId: null }
    }
    return this.grid[y][x]
  }

  setTile(x: number, y: number, type: TileType): void {
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return
    const walkable = TILE_BEHAVIOR[type]?.walkable ?? true
    this.grid[y][x] = { type, walkable, occupantId: null }
  }

  isWalkable(x: number, y: number): boolean {
    return this.tileAt(x, y).walkable
  }

  setOccupant(x: number, y: number, id: string | null): void {
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return
    this.grid[y][x].occupantId = id
  }

  getOccupant(x: number, y: number): string | null {
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return null
    return this.grid[y][x].occupantId
  }

  clearOccupantFor(id: string): void {
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        if (this.grid[y][x].occupantId === id) {
          this.grid[y][x].occupantId = null
        }
      }
    }
  }

  getGrid(): Tile[][] {
    return this.grid
  }

  get width(): number { return MAP_WIDTH }
  get height(): number { return MAP_HEIGHT }

  toJSON(): { tiles: { type: TileType; occupantId: string | null }[][] } {
    return {
      tiles: this.grid.map(row =>
        row.map(tile => ({
          type: tile.type,
          occupantId: tile.occupantId,
        }))
      ),
    }
  }
}

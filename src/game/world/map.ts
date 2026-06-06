import { Tile, TileType, TILE_DATA } from './tile'

export const MAP_WIDTH = 30
export const MAP_HEIGHT = 20

export class GameMap {
  private grid: Tile[][]

  constructor() {
    this.grid = this.generateMap()
  }

  // Generate initial map: grass floor with rocks and water on edges
  private generateMap(): Tile[][] {
    const grid: Tile[][] = []
    for (let y = 0; y < MAP_HEIGHT; y++) {
      const row: Tile[] = []
      for (let x = 0; x < MAP_WIDTH; x++) {
        // Water on edges (border 1-2 tiles from edge, randomly)
        const edgeDistance = Math.min(x, y, MAP_WIDTH - 1 - x, MAP_HEIGHT - 1 - y)
        if (edgeDistance === 0 && Math.random() < 0.6) {
          row.push({ type: TileType.Water, walkable: false })
        }
        // Rocks near edges
        else if (edgeDistance <= 2 && Math.random() < 0.3) {
          row.push({ type: TileType.Rock, walkable: false })
        }
        // Scattered rocks in interior (5% chance)
        else if (Math.random() < 0.05) {
          row.push({ type: TileType.Rock, walkable: false })
        }
        // Default: grass floor
        else {
          row.push({ type: TileType.Floor, walkable: true })
        }
      }
      grid.push(row)
    }
    return grid
  }

  // Get tile at position (returns floor if out of bounds)
  tileAt(x: number, y: number): Tile {
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) {
      return { type: TileType.Water, walkable: false }
    }
    return this.grid[y][x]
  }

  // Set tile at position
  setTile(x: number, y: number, type: TileType): void {
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) return
    const data = TILE_DATA[type]
    this.grid[y][x] = { type, walkable: data.walkable }
  }

  // Check if a tile is walkable
  isWalkable(x: number, y: number): boolean {
    return this.tileAt(x, y).walkable
  }

  // Get the full grid (for iteration during rendering)
  getGrid(): Tile[][] {
    return this.grid
  }

  get width(): number { return MAP_WIDTH }
  get height(): number { return MAP_HEIGHT }
}

import { describe, it, expect } from 'vitest'
import { findPath, manhattan } from '../core/world/pathfinding'
import { GameMap } from '../core/world/map'
import { Tile, TileType } from '../core/world/tile'

const TEST_W = 30
const TEST_H = 20

function createFloorGrid(): Tile[][] {
  return Array.from({ length: TEST_H }, () =>
    Array.from({ length: TEST_W }, () => ({
      type: TileType.Floor,
      walkable: true,
      occupantId: null,
    }))
  )
}

function setTile(grid: Tile[][], x: number, y: number, type: TileType, walkable: boolean): void {
  if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) {
    grid[y][x] = { type, walkable, occupantId: null }
  }
}

describe('Pathfinding', () => {
  it('finds a straight path on open terrain', () => {
    const grid = createFloorGrid()
    const map = new GameMap(grid)
    const path = findPath(map, { x: 0, y: 0 }, { x: 3, y: 0 })
    expect(path).toEqual([
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ])
  })

  it('returns empty array when start equals end', () => {
    const grid = createFloorGrid()
    const map = new GameMap(grid)
    const path = findPath(map, { x: 5, y: 5 }, { x: 5, y: 5 })
    expect(path).toEqual([])
  })

  it('returns empty array when target is unwalkable', () => {
    const grid = createFloorGrid()
    setTile(grid, 3, 3, TileType.Wall, false)
    const map = new GameMap(grid)
    const path = findPath(map, { x: 0, y: 0 }, { x: 3, y: 3 })
    expect(path).toEqual([])
  })

  it('routes around a wall obstacle', () => {
    const grid = createFloorGrid()
    setTile(grid, 2, 0, TileType.Wall, false)
    setTile(grid, 2, 1, TileType.Wall, false)
    const map = new GameMap(grid)
    const path = findPath(map, { x: 0, y: 0 }, { x: 4, y: 0 })
    expect(path.length).toBeGreaterThan(0)
    const last = path[path.length - 1]
    expect(last).toEqual({ x: 4, y: 0 })
  })

  it('returns empty array for unreachable area surrounded by walls', () => {
    const grid = createFloorGrid()
    // Create a box of walls around (3,3)
    setTile(grid, 2, 2, TileType.Wall, false)
    setTile(grid, 3, 2, TileType.Wall, false)
    setTile(grid, 4, 2, TileType.Wall, false)
    setTile(grid, 2, 3, TileType.Wall, false)
    setTile(grid, 4, 3, TileType.Wall, false)
    setTile(grid, 2, 4, TileType.Wall, false)
    setTile(grid, 3, 4, TileType.Wall, false)
    setTile(grid, 4, 4, TileType.Wall, false)
    const map = new GameMap(grid)
    const path = findPath(map, { x: 0, y: 0 }, { x: 3, y: 3 })
    expect(path).toEqual([])
  })

  it('avoids occupied positions mid-path', () => {
    const grid = createFloorGrid()
    const map = new GameMap(grid)
    const occupied = [{ x: 2, y: 0 }]
    const path = findPath(map, { x: 0, y: 0 }, { x: 4, y: 0 }, occupied)
    expect(path.length).toBeGreaterThan(0)
    const hasOccupied = path.some(p => p.x === 2 && p.y === 0)
    expect(hasOccupied).toBe(false)
    const last = path[path.length - 1]
    expect(last).toEqual({ x: 4, y: 0 })
  })

  it('does not block start position when it is in occupied set', () => {
    const grid = createFloorGrid()
    const map = new GameMap(grid)
    const occupied = [{ x: 0, y: 0 }]
    const path = findPath(map, { x: 0, y: 0 }, { x: 3, y: 0 }, occupied)
    expect(path.length).toBeGreaterThan(0)
    const last = path[path.length - 1]
    expect(last).toEqual({ x: 3, y: 0 })
  })

  it('manhattan returns correct distance', () => {
    expect(manhattan(0, 0, 3, 4)).toBe(7)
    expect(manhattan(1, 2, 1, 2)).toBe(0)
    expect(manhattan(5, 5, 0, 0)).toBe(10)
  })
})

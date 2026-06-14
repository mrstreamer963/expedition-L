import { describe, it, expect } from 'vitest'
import { GameMap } from '../core/world/map'
import { TileType } from '../core/world/tile'

describe('GameMap', () => {
  it('tileAt returns correct tile for valid coordinates', () => {
    const map = new GameMap()
    const tile = map.tileAt(5, 3)
    expect(tile.type).toBeDefined()
  })

  it('tileAt out of bounds returns Water tile', () => {
    const map = new GameMap()
    expect(map.tileAt(-1, 0).type).toBe(TileType.Water)
    expect(map.tileAt(30, 0).type).toBe(TileType.Water)
    expect(map.tileAt(0, 20).type).toBe(TileType.Water)
  })

  it('setTile changes tile type and walkability', () => {
    const map = new GameMap()
    map.setTile(3, 3, TileType.Wall)
    const tile = map.tileAt(3, 3)
    expect(tile.type).toBe(TileType.Wall)
    expect(map.isWalkable(3, 3)).toBe(false)
  })

  it('setTile out of bounds is no-op', () => {
    const grid = Array.from({ length: 20 }, () =>
      Array.from({ length: 30 }, () => ({
        type: TileType.Floor,
        walkable: true,
        occupantId: null,
      }))
    )
    const map = new GameMap(grid)
    expect(() => map.setTile(-1, 0, TileType.Wall)).not.toThrow()
    expect(map.tileAt(0, 0).type).toBe(TileType.Floor)
  })

  it('setOccupant/getOccupant track occupancy', () => {
    const map = new GameMap()
    map.setOccupant(5, 5, 'colonist-1')
    expect(map.getOccupant(5, 5)).toBe('colonist-1')
    map.setOccupant(5, 5, null)
    expect(map.getOccupant(5, 5)).toBeNull()
  })

  it('isWalkable returns correct value for known tile types', () => {
    const grid = Array.from({ length: 20 }, () =>
      Array.from({ length: 30 }, () => ({
        type: TileType.Floor,
        walkable: true,
        occupantId: null,
      }))
    )
    grid[0][0] = { type: TileType.Floor, walkable: true, occupantId: null }
    grid[0][1] = { type: TileType.Wall, walkable: false, occupantId: null }
    grid[0][2] = { type: TileType.Rock, walkable: false, occupantId: null }
    grid[0][3] = { type: TileType.Water, walkable: false, occupantId: null }
    const map = new GameMap(grid)
    expect(map.isWalkable(0, 0)).toBe(true)
    expect(map.isWalkable(1, 0)).toBe(false)
    expect(map.isWalkable(2, 0)).toBe(false)
    expect(map.isWalkable(3, 0)).toBe(false)
  })

  it('toJSON returns correct dimensions (20 rows, 30 cols)', () => {
    const map = new GameMap()
    const json = map.toJSON()
    expect(json.tiles).toHaveLength(20)
    expect(json.tiles[0]).toHaveLength(30)
  })
})

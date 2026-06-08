import { describe, it, expect, vi } from 'vitest'
import { renderMap } from '../render/canvas'
import * as drawTileModule from '../render/drawTile'
import { GameMap } from '../game/world/map'
import { Tile, TileType } from '../game/world/tile'

describe('renderMap', () => {
  const map = new GameMap()

  function makeCtx() {
    return {
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
    } as unknown as CanvasRenderingContext2D
  }

  it('calls drawTile for every tile (600 calls for 30x20 map)', () => {
    const ctx = makeCtx()
    const spy = vi.spyOn(drawTileModule, 'drawTile').mockImplementation(() => {})
    renderMap(ctx, map, 0, 0)
    expect(spy).toHaveBeenCalledTimes(600)
    spy.mockRestore()
  })

  it('drawTile receives correct tile type and coordinates', () => {
    const ctx = makeCtx()
    const spy = vi.spyOn(drawTileModule, 'drawTile').mockImplementation(() => {})

    // Set tile (1, 0) to Water via the map
    map.setTile(1, 0, TileType.Water)

    renderMap(ctx, map, 50, 100)
    expect(spy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ type: TileType.Water }),
      1,
      0,
      50,
      100,
    )
    spy.mockRestore()
  })
})

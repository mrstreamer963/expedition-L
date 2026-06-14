import { describe, it, expect, vi } from 'vitest'
import { renderMap } from '../render/canvas'
import * as drawTileModule from '../render/drawTile'
import { GameMap } from '../core/world/map'
import { TileType } from '../core/world/tile'
import { ClientSnapshot } from '../core'

function makeSnapshotMap(map: GameMap): ClientSnapshot['map'] {
  return {
    width: map.width,
    height: map.height,
    tiles: Array.from({ length: map.height }, (_, y) =>
      Array.from({ length: map.width }, (_, x) => {
        const tile = map.tileAt(x, y)
        return { type: tile.type, occupant: tile.occupantId, walkable: tile.walkable }
      })
    ),
  }
}

describe('renderMap', () => {
  const map = new GameMap()
  const snapshotMap = makeSnapshotMap(map)

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
    renderMap(ctx, snapshotMap, 0, 0)
    expect(spy).toHaveBeenCalledTimes(600)
    spy.mockRestore()
  })

  it('drawTile receives correct tile type and coordinates', () => {
    const ctx = makeCtx()
    const spy = vi.spyOn(drawTileModule, 'drawTile').mockImplementation(() => {})

    map.setTile(1, 0, TileType.Water)
    const updatedSnapshot = makeSnapshotMap(map)

    renderMap(ctx, updatedSnapshot, 50, 100)
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

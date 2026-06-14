import { ClientSnapshot } from '../core'
import { drawTile } from './drawTile'

export function renderMap(
  ctx: CanvasRenderingContext2D,
  map: ClientSnapshot['map'],
  offsetX: number,
  offsetY: number
): void {
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const tile = map.tiles[y][x]
      drawTile(ctx, tile, x, y, offsetX, offsetY)
    }
  }
}

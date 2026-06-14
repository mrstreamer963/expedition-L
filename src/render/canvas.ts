import { GameMap } from '../core/world/map'
import { drawTile } from './drawTile'

/**
 * Render the entire map on canvas in back-to-front order
 */
export function renderMap(
  ctx: CanvasRenderingContext2D,
  map: GameMap,
  offsetX: number,
  offsetY: number
): void {
  // Back-to-front: iterate y then x for proper isometric depth order
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const tile = map.tileAt(x, y)
      drawTile(ctx, tile, x, y, offsetX, offsetY)
    }
  }
}

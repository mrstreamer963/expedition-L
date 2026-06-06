import { Tile, TILE_DATA, TILE_WIDTH, TILE_HEIGHT } from '../game/world/tile'
import { tileToScreen } from '../game/isoUtils'

/**
 * Draw a single isometric tile on canvas
 * Tile is drawn as a diamond (rhombus) of 32×16px
 */
export function drawTile(
  ctx: CanvasRenderingContext2D,
  tile: Tile,
  tileX: number,
  tileY: number,
  offsetX: number = 0,
  offsetY: number = 0
): void {
  const { x: sx, y: sy } = tileToScreen(tileX, tileY)
  const screenX = sx + offsetX
  const screenY = sy + offsetY

  const hw = TILE_WIDTH / 2  // half width (16)
  const hh = TILE_HEIGHT / 2 // half height (8)

  const color = TILE_DATA[tile.type].color

  // Draw the diamond shape
  ctx.beginPath()
  ctx.moveTo(screenX, sy - hh)           // top
  ctx.lineTo(screenX + hw, screenY)      // right
  ctx.lineTo(screenX, screenY + hh)      // bottom
  ctx.lineTo(screenX - hw, screenY)      // left
  ctx.closePath()

  ctx.fillStyle = color
  ctx.fill()

  // Subtle border for depth
  ctx.strokeStyle = 'rgba(0,0,0,0.15)'
  ctx.lineWidth = 0.5
  ctx.stroke()
}

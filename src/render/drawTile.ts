import { TILE_DATA, TILE_WIDTH, TILE_HEIGHT } from '../game/world/tile'
import { tileToScreen } from '../geometry/isoUtils'
import { getTilePattern } from './textures'

export function drawTile(
  ctx: CanvasRenderingContext2D,
  tile: { type: string; occupant: string | null; walkable: boolean },
  tileX: number,
  tileY: number,
  offsetX: number = 0,
  offsetY: number = 0
): void {
  const { x: sx, y: sy } = tileToScreen(tileX, tileY)
  const screenX = sx + offsetX
  const screenY = sy + offsetY

  const hw = TILE_WIDTH / 2
  const hh = TILE_HEIGHT / 2

  ctx.beginPath()
  ctx.moveTo(screenX, screenY - hh)
  ctx.lineTo(screenX + hw, screenY)
  ctx.lineTo(screenX, screenY + hh)
  ctx.lineTo(screenX - hw, screenY)
  ctx.closePath()

  const pattern = getTilePattern(tile.type)
  if (pattern) {
    ctx.fillStyle = pattern
  } else {
    ctx.fillStyle = TILE_DATA[tile.type]?.color ?? '#333'
  }
  ctx.fill()

  ctx.strokeStyle = 'rgba(0,0,0,0.12)'
  ctx.lineWidth = 0.5
  ctx.stroke()
}

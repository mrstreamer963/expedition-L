import { Colonist } from '../game/colony/colonist'
import { tileToScreen } from '../game/isoUtils'

/**
 * Draw a colonist on canvas
 * Visual: colored rectangle 12×16px + name label above
 */
export function drawColonist(
  ctx: CanvasRenderingContext2D,
  colonist: Colonist,
  offsetX: number,
  offsetY: number
): void {
  const pos = colonist.getInterpolatedPosition()
  const { x: sx, y: sy } = tileToScreen(pos.x, pos.y)
  const screenX = sx + offsetX
  const screenY = sy + offsetY

  // Colonist body: rectangle
  const w = 12
  const h = 16
  ctx.fillStyle = colonist.color
  ctx.fillRect(screenX - w / 2, screenY - h, w, h)

  // Outline
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'
  ctx.lineWidth = 1
  ctx.strokeRect(screenX - w / 2, screenY - h, w, h)

  // Name label above
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.font = '10px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(colonist.name, screenX, screenY - h - 6)

  // State indicator
  const stateEmoji: Record<string, string> = {
    idle: '',
    walking: '',
    eating: '🍖',
    sleeping: '💤',
    building: '🔨',
  }
  const emoji = stateEmoji[colonist.state]
  if (emoji) {
    ctx.font = '10px sans-serif'
    ctx.fillText(emoji, screenX + 10, screenY - h - 6)
  }
}

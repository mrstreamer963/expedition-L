import { TILE_WIDTH, TILE_HEIGHT } from '../game/world/tile'

const WALL_HEIGHT = TILE_HEIGHT / 2 // 12px

export function drawWall3D(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
): void {
  const hw = TILE_WIDTH / 2
  const hh = TILE_HEIGHT / 2

  // Top face
  ctx.beginPath()
  ctx.moveTo(screenX, screenY - hh - WALL_HEIGHT)
  ctx.lineTo(screenX + hw, screenY - WALL_HEIGHT)
  ctx.lineTo(screenX, screenY + hh - WALL_HEIGHT)
  ctx.lineTo(screenX - hw, screenY - WALL_HEIGHT)
  ctx.closePath()
  ctx.fillStyle = '#b8a87e'
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.15)'
  ctx.lineWidth = 0.5
  ctx.stroke()

  // Front face
  ctx.beginPath()
  ctx.moveTo(screenX - hw, screenY - WALL_HEIGHT)
  ctx.lineTo(screenX + hw, screenY - WALL_HEIGHT)
  ctx.lineTo(screenX + hw, screenY)
  ctx.lineTo(screenX - hw, screenY)
  ctx.closePath()
  const frontGrad = ctx.createLinearGradient(screenX, screenY - WALL_HEIGHT, screenX, screenY)
  frontGrad.addColorStop(0, '#8a7a5e')
  frontGrad.addColorStop(1, '#7a6e52')
  ctx.fillStyle = frontGrad
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.2)'
  ctx.lineWidth = 0.5
  ctx.stroke()

  // Right face
  ctx.beginPath()
  ctx.moveTo(screenX + hw, screenY - WALL_HEIGHT)
  ctx.lineTo(screenX, screenY + hh - WALL_HEIGHT)
  ctx.lineTo(screenX, screenY + hh)
  ctx.lineTo(screenX + hw, screenY)
  ctx.closePath()
  const rightGrad = ctx.createLinearGradient(screenX, screenY - WALL_HEIGHT, screenX + hw, screenY)
  rightGrad.addColorStop(0, '#7a6e52')
  rightGrad.addColorStop(1, '#6a5e42')
  ctx.fillStyle = rightGrad
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.2)'
  ctx.lineWidth = 0.5
  ctx.stroke()
}

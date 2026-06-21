import { TILE_HEIGHT } from '../game/world/tile'
import { tileToScreen } from '../geometry/isoUtils'
import { drawShadow } from './drawShadow'
import { drawWall3D } from './drawWall3D'
import { roundRect } from './roundRect'
import { ClientSnapshot } from '../core'

export function renderEntities(ctx: CanvasRenderingContext2D, snap: ClientSnapshot, offsetX: number, offsetY: number): void {
  const hh = TILE_HEIGHT / 2

  for (const food of snap.entities.filter(e => e.type === 'food')) {
    const { x: sx, y: sy } = tileToScreen(food.x, food.y)
    drawShadow(ctx, sx + offsetX, sy + offsetY, 12, 5)
  }
  for (const bed of snap.entities.filter(e => e.type === 'bed')) {
    const { x: sx, y: sy } = tileToScreen(bed.x, bed.y)
    drawShadow(ctx, sx + offsetX, sy + offsetY, 24, 8)
  }

  for (const food of snap.entities.filter(e => e.type === 'food')) {
    const { x: sx, y: sy } = tileToScreen(food.x, food.y)
    const fx = sx + offsetX
    const fy = sy + offsetY - hh - 4
    ctx.fillStyle = '#d44040'
    ctx.beginPath()
    ctx.arc(fx - 3, fy, 3, 0, Math.PI * 2)
    ctx.arc(fx + 3, fy - 1, 3, 0, Math.PI * 2)
    ctx.arc(fx + 1, fy + 2, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#e8d44d'
    ctx.beginPath()
    ctx.arc(fx - 3, fy, 1.5, 0, Math.PI * 2)
    ctx.arc(fx + 3, fy - 1, 1.5, 0, Math.PI * 2)
    ctx.arc(fx + 1, fy + 2, 1.5, 0, Math.PI * 2)
    ctx.fill()
  }

  for (const bed of snap.entities.filter(e => e.type === 'bed')) {
    const { x: sx, y: sy } = tileToScreen(bed.x, bed.y)
    const bx = sx + offsetX
    const by = sy + offsetY - hh - 4
    ctx.fillStyle = '#c49a6c'
    roundRect(ctx, bx - 14, by - 6, 28, 16, 3)
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'
    ctx.lineWidth = 0.5
    ctx.stroke()
    ctx.fillStyle = '#d4b080'
    roundRect(ctx, bx + 4, by - 4, 10, 8, 2)
    ctx.fill()
  }

  for (const building of snap.entities.filter(e => e.type === 'wall')) {
    const { x: sx, y: sy } = tileToScreen(building.x, building.y)
    drawWall3D(ctx, sx + offsetX, sy + offsetY)
  }
}

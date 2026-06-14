import { TILE_WIDTH, TILE_HEIGHT, TileType } from '../game/world/tile'
import { tileToScreen } from '../geometry/isoUtils'
import { drawWall3D } from './drawWall3D'
import { roundRect } from './roundRect'
import { RenderSnapshot } from './snapshot'

function canBuildAt(x: number, y: number, snap: RenderSnapshot): boolean {
  const tile = snap.map.tileAt(x, y)
  if (tile.type === TileType.Rock || tile.type === TileType.Water) return false
  if (snap.foods.some(f => f.x === x && f.y === y)) return false
  if (snap.beds.some(b => b.x === x && b.y === y)) return false
  if (snap.buildings.some(b => b.x === x && b.y === y)) return false
  return true
}

export function renderBuildQueueGhosts(ctx: CanvasRenderingContext2D, snap: RenderSnapshot): void {
  if (snap.buildQueueTasks.length === 0) return
  const hh = TILE_HEIGHT / 2

  ctx.save()
  ctx.globalAlpha = 0.35

  for (const task of snap.buildQueueTasks) {
    const { x: sx, y: sy } = tileToScreen(task.x, task.y)
    const cx = sx + snap.offsetX
    const cy = sy + snap.offsetY

    if (task.type === 'wall') {
      drawWall3D(ctx, cx, cy)
    } else if (task.type === 'bed') {
      ctx.fillStyle = '#c49a6c'
      roundRect(ctx, cx - 14, cy - hh - 10, 28, 16, 3)
      ctx.fill()
      ctx.fillStyle = '#d4b080'
      roundRect(ctx, cx + 4, cy - hh - 12, 10, 8, 2)
      ctx.fill()
    } else if (task.type === 'food') {
      ctx.fillStyle = '#d44040'
      ctx.beginPath()
      ctx.arc(cx - 3, cy - hh - 4, 3, 0, Math.PI * 2)
      ctx.arc(cx + 3, cy - hh - 5, 3, 0, Math.PI * 2)
      ctx.arc(cx + 1, cy - hh - 2, 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  ctx.restore()
}

export function renderHighlight(ctx: CanvasRenderingContext2D, snap: RenderSnapshot): void {
  if (!snap.hoveredTile) return
  const { x: sx, y: sy } = tileToScreen(snap.hoveredTile.x, snap.hoveredTile.y)
  const cx = sx + snap.offsetX
  const cy = sy + snap.offsetY
  const hw = TILE_WIDTH / 2, hh = TILE_HEIGHT / 2

  ctx.beginPath()
  ctx.moveTo(cx, cy - hh)
  ctx.lineTo(cx + hw, cy)
  ctx.lineTo(cx, cy + hh)
  ctx.lineTo(cx - hw, cy)
  ctx.closePath()

  if (snap.buildMode !== 'none') {
    const canBuild = canBuildAt(snap.hoveredTile.x, snap.hoveredTile.y, snap)
    ctx.fillStyle = canBuild ? 'rgba(0, 255, 0, 0.15)' : 'rgba(255, 0, 0, 0.2)'
    ctx.fill()
    ctx.strokeStyle = canBuild ? 'rgba(0, 255, 0, 0.8)' : 'rgba(255, 0, 0, 0.8)'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.save()
    ctx.globalAlpha = 0.35
    if (snap.buildMode === 'wall') {
      drawWall3D(ctx, cx, cy)
    } else if (snap.buildMode === 'bed') {
      ctx.fillStyle = '#c49a6c'
      roundRect(ctx, cx - 14, cy - hh - 10, 28, 16, 3)
      ctx.fill()
      ctx.fillStyle = '#d4b080'
      roundRect(ctx, cx + 4, cy - hh - 12, 10, 8, 2)
      ctx.fill()
    } else if (snap.buildMode === 'food') {
      ctx.fillStyle = '#d44040'
      ctx.beginPath()
      ctx.arc(cx - 3, cy - hh - 4, 3, 0, Math.PI * 2)
      ctx.arc(cx + 3, cy - hh - 5, 3, 0, Math.PI * 2)
      ctx.arc(cx + 1, cy - hh - 2, 3, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  } else {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
    ctx.lineWidth = 1
    ctx.stroke()
  }
}

export function renderSelection(ctx: CanvasRenderingContext2D, snap: RenderSnapshot): void {
  if (!snap.selectedColonistId) return
  const colonist = snap.colonists.find(c => c.id === snap.selectedColonistId)
  if (!colonist) return

  const pos = colonist.getInterpolatedPosition()
  const { x: sx, y: sy } = tileToScreen(pos.x, pos.y)
  const hw = TILE_WIDTH / 2, hh = TILE_HEIGHT / 2

  ctx.beginPath()
  ctx.moveTo(sx + snap.offsetX, sy + snap.offsetY - hh)
  ctx.lineTo(sx + snap.offsetX + hw, sy + snap.offsetY)
  ctx.lineTo(sx + snap.offsetX, sy + snap.offsetY + hh)
  ctx.lineTo(sx + snap.offsetX - hw, sy + snap.offsetY)
  ctx.closePath()
  ctx.strokeStyle = '#ffff00'
  ctx.lineWidth = 2
  ctx.stroke()
}

export function renderPaths(ctx: CanvasRenderingContext2D, snap: RenderSnapshot): void {
  for (const colonist of snap.colonists) {
    if (colonist.state.phase !== 'moving') continue
    const path = colonist.state.path
    if (path.length === 0) continue

    ctx.beginPath()
    ctx.strokeStyle = colonist.color + '40'
    ctx.lineWidth = 1

    for (let i = 0; i <= path.length; i++) {
      const pos = i === 0
        ? colonist.getInterpolatedPosition()
        : path[i - 1]
      const { x: sx, y: sy } = tileToScreen(pos.x, pos.y)

      if (i === 0) {
        ctx.moveTo(sx + snap.offsetX, sy + snap.offsetY - 8)
      } else {
        ctx.lineTo(sx + snap.offsetX, sy + snap.offsetY - 8)
      }
    }
    ctx.stroke()
  }
}

import { TILE_WIDTH, TILE_HEIGHT } from '../game/world/tile'
import { tileToScreen } from '../geometry/isoUtils'
import { ClientSnapshot } from '../core'
import { getBuildingVisual } from '../game/buildingVisuals'

function canBuildAt(x: number, y: number, snap: ClientSnapshot): boolean {
  const tile = snap.map.tiles[y]?.[x]
  if (!tile) return false
  if (tile.type === 'Rock' || tile.type === 'Water') return false
  if (snap.entities.some(e => e.x === x && e.y === y)) return false
  return true
}

export function renderBuildQueueGhosts(
  ctx: CanvasRenderingContext2D,
  snap: ClientSnapshot,
  renderCtx: { offsetX: number; offsetY: number }
): void {
  if (snap.buildQueue.length === 0) return

  ctx.save()
  ctx.globalAlpha = 0.35

  for (const task of snap.buildQueue) {
    const { x: sx, y: sy } = tileToScreen(task.x, task.y)
    const cx = sx + renderCtx.offsetX
    const cy = sy + renderCtx.offsetY

    const visual = getBuildingVisual(task.type)
    if (visual) visual.renderGhost(ctx, cx, cy)
  }

  ctx.restore()
}

export function renderHighlight(
  ctx: CanvasRenderingContext2D,
  snap: ClientSnapshot,
  renderCtx: { offsetX: number; offsetY: number; hoveredTile: { x: number; y: number } | null; buildMode: string }
): void {
  if (!renderCtx.hoveredTile) return
  const { x: sx, y: sy } = tileToScreen(renderCtx.hoveredTile.x, renderCtx.hoveredTile.y)
  const cx = sx + renderCtx.offsetX
  const cy = sy + renderCtx.offsetY
  const hw = TILE_WIDTH / 2, hh = TILE_HEIGHT / 2

  ctx.beginPath()
  ctx.moveTo(cx, cy - hh)
  ctx.lineTo(cx + hw, cy)
  ctx.lineTo(cx, cy + hh)
  ctx.lineTo(cx - hw, cy)
  ctx.closePath()

  if (renderCtx.buildMode !== 'none') {
    const canBuild = canBuildAt(renderCtx.hoveredTile.x, renderCtx.hoveredTile.y, snap)
    ctx.fillStyle = canBuild ? 'rgba(0, 255, 0, 0.15)' : 'rgba(255, 0, 0, 0.2)'
    ctx.fill()
    ctx.strokeStyle = canBuild ? 'rgba(0, 255, 0, 0.8)' : 'rgba(255, 0, 0, 0.8)'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.save()
    ctx.globalAlpha = 0.35
    const visual = getBuildingVisual(renderCtx.buildMode)
    if (visual) visual.renderGhost(ctx, cx, cy)
    ctx.restore()
  } else {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
    ctx.lineWidth = 1
    ctx.stroke()
  }
}

export function renderSelection(
  ctx: CanvasRenderingContext2D,
  snap: ClientSnapshot,
  renderCtx: { offsetX: number; offsetY: number; selectedColonistId: string | null }
): void {
  if (!renderCtx.selectedColonistId) return
  const colonist = snap.colonists.find(c => c.id === renderCtx.selectedColonistId)
  if (!colonist) return

  const pos = colonist.position
  const { x: sx, y: sy } = tileToScreen(pos.x, pos.y)
  const hw = TILE_WIDTH / 2, hh = TILE_HEIGHT / 2

  ctx.beginPath()
  ctx.moveTo(sx + renderCtx.offsetX, sy + renderCtx.offsetY - hh)
  ctx.lineTo(sx + renderCtx.offsetX + hw, sy + renderCtx.offsetY)
  ctx.lineTo(sx + renderCtx.offsetX, sy + renderCtx.offsetY + hh)
  ctx.lineTo(sx + renderCtx.offsetX - hw, sy + renderCtx.offsetY)
  ctx.closePath()
  ctx.strokeStyle = '#ffff00'
  ctx.lineWidth = 2
  ctx.stroke()
}

export function renderPaths(
  ctx: CanvasRenderingContext2D,
  snap: ClientSnapshot,
  renderCtx: { offsetX: number; offsetY: number }
): void {
  for (const colonist of snap.colonists) {
    if (colonist.state.phase !== 'moving') continue
    const path = colonist.state.path
    if (!path || path.length === 0) continue

    ctx.beginPath()
    ctx.strokeStyle = colonist.color + '40'
    ctx.lineWidth = 1

    for (let i = 0; i <= path.length; i++) {
      const pos = i === 0 ? colonist.position : path[i - 1]
      const { x: sx, y: sy } = tileToScreen(pos.x, pos.y)

      if (i === 0) {
        ctx.moveTo(sx + renderCtx.offsetX, sy + renderCtx.offsetY - 8)
      } else {
        ctx.lineTo(sx + renderCtx.offsetX, sy + renderCtx.offsetY - 8)
      }
    }
    ctx.stroke()
  }
}

import { renderMap } from './canvas'
import { drawColonist } from './drawColonist'
import { drawShadow } from './drawShadow'
import { tileToScreen } from '../geometry/isoUtils'
import { renderEntities } from './renderEntities'
import { renderBuildQueueGhosts, renderHighlight, renderSelection, renderPaths } from './renderOverlay'
import { ClientSnapshot } from '../core'

export interface RenderContext {
  offsetX: number
  offsetY: number
  canvasWidth: number
  canvasHeight: number
  hoveredTile: { x: number; y: number } | null
  selectedColonistId: string | null
  buildMode: string
}

export function renderWorld(ctx: CanvasRenderingContext2D, snap: ClientSnapshot, renderCtx: RenderContext): void {
  ctx.clearRect(0, 0, renderCtx.canvasWidth, renderCtx.canvasHeight)

  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, renderCtx.canvasWidth, renderCtx.canvasHeight)

  renderMap(ctx, snap.map, renderCtx.offsetX, renderCtx.offsetY)

  const sortedColonists = [...snap.colonists].sort(
    (a, b) => (a.position.x + a.position.y) - (b.position.x + b.position.y)
  )
  for (const colonist of sortedColonists) {
    const pos = colonist.position
    const { x: sx, y: sy } = tileToScreen(pos.x, pos.y)
    drawShadow(ctx, sx + renderCtx.offsetX, sy + renderCtx.offsetY)
    drawColonist(ctx, colonist, renderCtx.offsetX, renderCtx.offsetY)
  }

  renderEntities(ctx, snap, renderCtx.offsetX, renderCtx.offsetY)
  renderBuildQueueGhosts(ctx, snap, renderCtx)
  renderHighlight(ctx, snap, renderCtx)
  renderSelection(ctx, snap, renderCtx)
  renderPaths(ctx, snap, renderCtx)
}

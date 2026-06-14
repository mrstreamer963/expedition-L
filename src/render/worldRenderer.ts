import { renderMap } from './canvas'
import { drawColonist } from './drawColonist'
import { drawShadow } from './drawShadow'
import { tileToScreen } from '../game/isoUtils'
import { renderEntities } from './renderEntities'
import { renderBuildQueueGhosts, renderHighlight, renderSelection, renderPaths } from './renderOverlay'
import { RenderSnapshot } from './snapshot'

export function renderWorld(ctx: CanvasRenderingContext2D, snap: RenderSnapshot): void {
  ctx.clearRect(0, 0, snap.canvasWidth, snap.canvasHeight)

  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, snap.canvasWidth, snap.canvasHeight)

  renderMap(ctx, snap.map, snap.offsetX, snap.offsetY)

  const sortedColonists = [...snap.colonists].sort(
    (a, b) => (a.position.x + a.position.y) - (b.position.x + b.position.y)
  )
  for (const colonist of sortedColonists) {
    const pos = colonist.getInterpolatedPosition()
    const { x: sx, y: sy } = tileToScreen(pos.x, pos.y)
    drawShadow(ctx, sx + snap.offsetX, sy + snap.offsetY)
    drawColonist(ctx, colonist, snap.offsetX, snap.offsetY)
  }

  renderEntities(ctx, snap)
  renderBuildQueueGhosts(ctx, snap)
  renderHighlight(ctx, snap)
  renderSelection(ctx, snap)
  renderPaths(ctx, snap)
}

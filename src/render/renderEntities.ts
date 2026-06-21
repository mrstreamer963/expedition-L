import { tileToScreen } from '../geometry/isoUtils'
import { getBuildingVisual } from '../game/buildingVisuals'
import { ClientSnapshot } from '../core'

export function renderEntities(ctx: CanvasRenderingContext2D, snap: ClientSnapshot, offsetX: number, offsetY: number): void {
  for (const entity of snap.entities) {
    const visual = getBuildingVisual(entity.type)
    if (!visual) continue
    const { x: sx, y: sy } = tileToScreen(entity.x, entity.y)
    visual.renderEntity(ctx, sx + offsetX, sy + offsetY)
  }
}

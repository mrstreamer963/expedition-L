import { drawWall3D } from '../render/drawWall3D'
import { roundRect } from '../render/roundRect'

export interface BuildingVisualDef {
  label: string
  renderEntity(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void
  renderGhost(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void
}

const registry = new Map<string, BuildingVisualDef>()

export function registerBuildingVisual(type: string, def: BuildingVisualDef): void {
  registry.set(type, def)
}

export function getBuildingVisual(type: string): BuildingVisualDef | undefined {
  return registry.get(type)
}

export function getAllBuildingTypes(): string[] {
  return Array.from(registry.keys())
}

function buildWall3D(ctx: CanvasRenderingContext2D, sx: number, sy: number): void {
  drawWall3D(ctx, sx, sy)
}

function buildFood(ctx: CanvasRenderingContext2D, sx: number, sy: number, alpha: number = 1): void {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = '#d44040'
  ctx.beginPath()
  ctx.arc(sx - 3, sy - 14, 3, 0, Math.PI * 2)
  ctx.arc(sx + 3, sy - 15, 3, 0, Math.PI * 2)
  ctx.arc(sx + 1, sy - 12, 3, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#e8d44d'
  ctx.beginPath()
  ctx.arc(sx - 3, sy - 14, 1.5, 0, Math.PI * 2)
  ctx.arc(sx + 3, sy - 15, 1.5, 0, Math.PI * 2)
  ctx.arc(sx + 1, sy - 12, 1.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function buildBed(ctx: CanvasRenderingContext2D, sx: number, sy: number, alpha: number = 1): void {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = '#c49a6c'
  roundRect(ctx, sx - 14, sy - 20, 28, 16, 3)
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.2)'
  ctx.lineWidth = 0.5
  ctx.stroke()
  ctx.fillStyle = '#d4b080'
  roundRect(ctx, sx + 4, sy - 18, 10, 8, 2)
  ctx.fill()
  ctx.restore()
}

registerBuildingVisual('wall', {
  label: 'Стена',
  renderEntity: (ctx, sx, sy) => buildWall3D(ctx, sx, sy),
  renderGhost: (ctx, sx, sy) => buildWall3D(ctx, sx, sy),
})

registerBuildingVisual('food', {
  label: 'Еда',
  renderEntity: (ctx, sx, sy) => buildFood(ctx, sx, sy, 1),
  renderGhost: (ctx, sx, sy) => buildFood(ctx, sx, sy, 0.35),
})

registerBuildingVisual('bed', {
  label: 'Кровать',
  renderEntity: (ctx, sx, sy) => buildBed(ctx, sx, sy, 1),
  renderGhost: (ctx, sx, sy) => buildBed(ctx, sx, sy, 0.35),
})

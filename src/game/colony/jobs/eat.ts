import { JobDefinition, JobContext, ColonistLike } from '../types'

export const eatJob: JobDefinition = {
  type: 'eat',
  label: 'Еда',
  duration: 0.5,

  findTarget(colonist: ColonistLike, context: JobContext): { x: number; y: number } | null {
    const occupied = new Set(
      context.colonists
        .filter(c => c.id !== colonist.id && c.state.phase !== 'moving')
        .map(c => `${Math.round(c.position.x)},${Math.round(c.position.y)}`)
    )
    let nearest: { x: number; y: number } | null = null
    let minDist = Infinity
    for (const food of context.foods) {
      if (occupied.has(`${food.x},${food.y}`)) continue
      const dist = Math.abs(food.x - colonist.position.x) + Math.abs(food.y - colonist.position.y)
      if (dist < minDist) {
        minDist = dist
        nearest = { x: food.x, y: food.y }
      }
    }
    return nearest
  },

  onStart(_colonist: ColonistLike, _context: JobContext): void {},

  onComplete(colonist: ColonistLike, context: JobContext): void {
    const c = colonist as any
    const foods: any[] = context.foods as any[]
    const idx = foods.findIndex(f =>
      Math.round(f.x) === Math.round(c.position.x) &&
      Math.round(f.y) === Math.round(c.position.y)
    )
    if (idx !== -1) {
      foods.splice(idx, 1)
      c.needs.hunger = Math.min(100, c.needs.hunger + 40)
    }
  },

  onCancel(_colonist: ColonistLike, _context: JobContext): void {},

  onTick(_colonist: ColonistLike, _dt: number): void {},
}

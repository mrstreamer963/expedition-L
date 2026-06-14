import { JobDefinition, JobContext, ColonistLike } from '../types'
import { eventBus } from '../../eventBus'

export const eatJob: JobDefinition = {
  type: 'eat',
  label: 'Еда',
  duration: 0.5,

  findTarget(colonist: ColonistLike, context: JobContext): { x: number; y: number } | null {
    const all = this.findAllTargets!(colonist, context)
    return all.length > 0 ? all[0] : null
  },

  findAllTargets(colonist: ColonistLike, context: JobContext): { x: number; y: number }[] {
    const occupied = new Set(
      context.colonists
        .filter(c => c.id !== colonist.id && c.state.phase !== 'moving')
        .map(c => `${Math.round(c.position.x)},${Math.round(c.position.y)}`)
    )
    const foods = context.foods
      .filter(f => !occupied.has(`${f.x},${f.y}`))
      .map(f => ({ x: f.x, y: f.y }))
    const cx = colonist.position.x
    const cy = colonist.position.y
    foods.sort((a, b) =>
      (Math.abs(a.x - cx) + Math.abs(a.y - cy)) - (Math.abs(b.x - cx) + Math.abs(b.y - cy))
    )
    return foods
  },

  onStart(_colonist: ColonistLike, _context: JobContext): void {},

  onComplete(colonist: ColonistLike, context: JobContext): void {
    const foods = context.foods
    const idx = foods.findIndex(f =>
      Math.round(f.x) === Math.round(colonist.position.x) &&
      Math.round(f.y) === Math.round(colonist.position.y)
    )
    if (idx !== -1) {
      const food = foods[idx]
      foods.splice(idx, 1)
      colonist.needs.hunger = Math.min(100, colonist.needs.hunger + 40)
      eventBus.emit('food_consumed', { position: { x: food.x, y: food.y } })
    }
  },

  onCancel(_colonist: ColonistLike, _context: JobContext): void {},

  onTick(_colonist: ColonistLike, _dt: number): void {},
}

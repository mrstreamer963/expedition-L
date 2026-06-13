import { JobDefinition, JobContext, ColonistLike } from '../types'

export const sleepJob: JobDefinition = {
  type: 'sleep',
  label: 'Сон',
  duration: 10,

  findTarget(colonist: ColonistLike, context: JobContext): { x: number; y: number } | null {
    const occupied = new Set(
      context.colonists
        .filter(c => c.id !== colonist.id && c.state.phase !== 'moving')
        .map(c => `${Math.round(c.position.x)},${Math.round(c.position.y)}`)
    )
    let nearest: { x: number; y: number } | null = null
    let minDist = Infinity
    for (const bed of context.beds) {
      if (occupied.has(`${bed.x},${bed.y}`)) continue
      const dist = Math.abs(bed.x - colonist.position.x) + Math.abs(bed.y - colonist.position.y)
      if (dist < minDist) {
        minDist = dist
        nearest = { x: bed.x, y: bed.y }
      }
    }
    return nearest
  },

  onStart(_colonist: ColonistLike, _context: JobContext): void {},

  onComplete(colonist: ColonistLike, _context: JobContext): void {
    const c = colonist as any
    c.needs.sleep = Math.min(100, c.needs.sleep + 60)
  },

  onCancel(_colonist: ColonistLike, _context: JobContext): void {},

  onTick(_colonist: ColonistLike, _dt: number): void {},
}

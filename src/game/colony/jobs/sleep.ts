import { JobDefinition, JobContext, ColonistLike } from '../types'

export const sleepJob: JobDefinition = {
  type: 'sleep',
  label: 'Сон',
  duration: 10,

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
    const beds = context.beds
      .filter(b => !occupied.has(`${b.x},${b.y}`))
      .map(b => ({ x: b.x, y: b.y }))
    const cx = colonist.position.x
    const cy = colonist.position.y
    beds.sort((a, b) =>
      (Math.abs(a.x - cx) + Math.abs(a.y - cy)) - (Math.abs(b.x - cx) + Math.abs(b.y - cy))
    )
    return beds
  },

  onStart(_colonist: ColonistLike, _context: JobContext): void {},

  onComplete(colonist: ColonistLike, _context: JobContext): void {
    const c = colonist as any
    c.needs.sleep = Math.min(100, c.needs.sleep + 60)
  },

  onCancel(_colonist: ColonistLike, _context: JobContext): void {},

  onTick(_colonist: ColonistLike, _dt: number): void {},
}

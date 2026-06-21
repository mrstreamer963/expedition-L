import { query } from 'bitecs'
import { JobDefinition, ColonistLike } from '../types'
import { WorldState } from '../../worldState'
import { Position, Sleepable } from '../../components'

export const sleepJob: JobDefinition = {
  type: 'sleep',
  label: 'Сон',
  duration: 10,

  findTarget(colonist: ColonistLike, context: WorldState): { x: number; y: number } | null {
    const all = this.findAllTargets!(colonist, context)
    return all.length > 0 ? all[0] : null
  },

  findAllTargets(colonist: ColonistLike, context: WorldState): { x: number; y: number }[] {
    const occupied = new Set(
      context.colonists
        .filter(c => c.id !== colonist.id && c.state.phase === 'working' && c.state.job === 'sleep')
        .map(c => `${Math.round(c.position.x)},${Math.round(c.position.y)}`)
    )
    const { ecs } = context
    const beds = Array.from(query(ecs, [Sleepable, Position]))
      .filter(eid => !occupied.has(`${Position.x[eid]},${Position.y[eid]}`))
      .map(eid => ({ x: Position.x[eid], y: Position.y[eid] }))
    const cx = colonist.position.x
    const cy = colonist.position.y
    beds.sort((a, b) =>
      (Math.abs(a.x - cx) + Math.abs(a.y - cy)) - (Math.abs(b.x - cx) + Math.abs(b.y - cy))
    )
    return beds
  },

  onStart(_colonist: ColonistLike, _context: WorldState): void {},

  onComplete(colonist: ColonistLike, _context: WorldState): void {
    colonist.needs.sleep = Math.min(100, colonist.needs.sleep + 60)
  },

  onCancel(_colonist: ColonistLike, _context: WorldState): void {},

  onTick(_colonist: ColonistLike, _dt: number): void {},
}

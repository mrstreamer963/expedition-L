import { query, removeEntity } from 'bitecs'
import { JobDefinition, ColonistLike } from '../types'
import { WorldState } from '../../worldState'
import { Position, Edible } from '../../components'

export const eatJob: JobDefinition = {
  type: 'eat',
  label: 'Еда',
  duration: 0.5,

  findTarget(colonist: ColonistLike, context: WorldState): { x: number; y: number } | null {
    const all = this.findAllTargets!(colonist, context)
    return all.length > 0 ? all[0] : null
  },

  findAllTargets(colonist: ColonistLike, context: WorldState): { x: number; y: number }[] {
    const occupied = new Set(
      context.colonists
        .filter(c => c.id !== colonist.id && c.state.phase !== 'moving')
        .map(c => `${Math.round(c.position.x)},${Math.round(c.position.y)}`)
    )
    const { ecs } = context
    const foods = Array.from(query(ecs, [Edible, Position]))
      .filter(eid => !occupied.has(`${Position.x[eid]},${Position.y[eid]}`))
      .map(eid => ({ x: Position.x[eid], y: Position.y[eid] }))
    const cx = colonist.position.x
    const cy = colonist.position.y
    foods.sort((a, b) =>
      (Math.abs(a.x - cx) + Math.abs(a.y - cy)) - (Math.abs(b.x - cx) + Math.abs(b.y - cy))
    )
    return foods
  },

  onStart(_colonist: ColonistLike, _context: WorldState): void {},

  onComplete(colonist: ColonistLike, context: WorldState): void {
    const { ecs } = context
    const cx = Math.round(colonist.position.x)
    const cy = Math.round(colonist.position.y)
    for (const eid of query(ecs, [Edible, Position])) {
      if (Position.x[eid] === cx && Position.y[eid] === cy) {
        removeEntity(ecs, eid)
        break
      }
    }
    colonist.needs.hunger = Math.min(100, colonist.needs.hunger + 40)
  },

  onCancel(_colonist: ColonistLike, _context: WorldState): void {},

  onTick(_colonist: ColonistLike, _dt: number): void {},
}

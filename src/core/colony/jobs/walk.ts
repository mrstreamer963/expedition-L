import { JobDefinition, ColonistLike } from '../types'
import { WorldState } from '../../worldState'

export const walkJob: JobDefinition = {
  type: 'walk',
  label: 'Прогулка',
  duration: 0,

  findTarget(_colonist: ColonistLike, _context: WorldState): { x: number; y: number } | null {
    return null
  },

  onStart(_colonist: ColonistLike, _context: WorldState): void {},

  onComplete(_colonist: ColonistLike, _context: WorldState): void {},

  onCancel(_colonist: ColonistLike, _context: WorldState): void {},

  onTick(_colonist: ColonistLike, _dt: number): void {},
}

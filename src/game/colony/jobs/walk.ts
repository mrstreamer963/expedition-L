import { JobDefinition, JobContext, ColonistLike } from '../types'

export const walkJob: JobDefinition = {
  type: 'walk',
  label: 'Прогулка',
  duration: 0,

  findTarget(_colonist: ColonistLike, _context: JobContext): { x: number; y: number } | null {
    return null
  },

  onStart(_colonist: ColonistLike, _context: JobContext): void {},

  onComplete(_colonist: ColonistLike, _context: JobContext): void {},

  onCancel(_colonist: ColonistLike, _context: JobContext): void {},

  onTick(_colonist: ColonistLike, _dt: number): void {},
}

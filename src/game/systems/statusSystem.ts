import { STATUS_REGISTRY } from '../colony/statusRegistry'
import { StatusUpdatable, ColonistLike } from '../colony/types'

export class StatusSystem {
  update(dt: number, colonists: StatusUpdatable[]): void {
    for (const colonist of colonists) {
      for (const def of STATUS_REGISTRY.getAll()) {
        const like: ColonistLike = {
          id: '',
          position: { x: 0, y: 0 },
          needs: colonist.needs,
          state: { phase: 'idle' },
          statuses: colonist.statuses,
        }
        if (def.condition(like)) {
          colonist.statuses.add(def.type)
        } else {
          colonist.statuses.delete(def.type)
        }
      }
    }
  }
}

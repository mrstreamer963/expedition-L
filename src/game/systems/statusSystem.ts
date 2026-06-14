import { STATUS_REGISTRY } from '../colony/statusRegistry'
import { ColonistLike } from '../colony/types'

export class StatusSystem {
  update(_dt: number, colonists: ColonistLike[]): void {
    for (const colonist of colonists) {
      for (const def of STATUS_REGISTRY.getAll()) {
        if (def.condition(colonist)) {
          colonist.statuses.add(def.type)
        } else {
          colonist.statuses.delete(def.type)
        }
      }
    }
  }
}

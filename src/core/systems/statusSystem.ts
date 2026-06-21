import { STATUS_REGISTRY } from '../colony/statusRegistry'
import { GameSystem } from './types'
import { WorldState } from '../worldState'

export class StatusSystem implements GameSystem {
  readonly type = 'status'
  readonly priority = 20

  update(_dt: number, world: WorldState): void {
    for (const colonist of world.colonists) {
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

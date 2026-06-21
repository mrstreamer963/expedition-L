import { GameSystem } from './types'
import { WorldState } from '../worldState'

export class NeedSystem implements GameSystem {
  readonly type = 'need'
  readonly priority = 10

  update(dt: number, world: WorldState): void {
    for (const colonist of world.colonists) {
      colonist.needs.hunger = Math.max(0, colonist.needs.hunger - 0.5 * dt)
      colonist.needs.sleep = Math.max(0, colonist.needs.sleep - 0.3 * dt)
    }
  }
}

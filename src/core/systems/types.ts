import { WorldState } from '../worldState'

export interface GameSystem {
  readonly type: string
  readonly priority: number

  init?(world: WorldState): void
  update(dt: number, world: WorldState): void
  serialize?(): unknown
  deserialize?(data: unknown, world: WorldState): void
  destroy?(): void
}

import { GameWorld } from './gameWorld'
import { GameServer, SaveData } from './types'

export type { GameServer, ClientSnapshot, PlayerAction, SaveData } from './types'
export type { GameSystem } from './systems/types'
export { SystemPipeline } from './systems/systemPipeline'
export { WorldState } from './worldState'

export function createGameServer(savedState?: SaveData): GameServer {
  return new GameWorld(savedState)
}

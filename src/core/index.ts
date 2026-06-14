import { GameWorld } from './gameWorld'
import { GameServer, SaveData } from './types'

export type { GameServer, ClientSnapshot, PlayerAction, SaveData, Vec2 } from './types'

export function createGameServer(savedState?: SaveData): GameServer {
  return new GameWorld(savedState)
}

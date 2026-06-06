export type GameSpeed = 0 | 1 | 2

export interface GameState {
  timeScale: number // 0 = paused, 1 = normal, 2 = fast
  speed: GameSpeed
  foodCount: number
  colonistCount: number
  selectedColonistId: string | null
}

export const INITIAL_GAME_STATE: GameState = {
  timeScale: 1,
  speed: 1,
  foodCount: 0,
  colonistCount: 0,
  selectedColonistId: null,
}

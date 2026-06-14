import { GameState } from '../store/types'

export interface UIState extends GameState {
  colonists: UIColonist[]
  buildMode: BuildMode
  hoveredTile: { x: number; y: number } | null
}

export interface UIColonist {
  id: string
  name: string
  color: string
  stateLabel: string
  hunger: number
  sleep: number
  currentJob: string | null
  position: { x: number; y: number }
  statuses: string[]
}

export type BuildMode = 'none' | 'wall' | 'bed' | 'food'

export const INITIAL_UI_STATE: UIState = {
  ...({} as GameState),
  timeScale: 1,
  speed: 1,
  foodCount: 0,
  colonistCount: 0,
  selectedColonistId: null,
  colonists: [],
  buildMode: 'none',
  hoveredTile: null,
}

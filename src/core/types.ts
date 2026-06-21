import { Vec2 } from './colony/types'
import { SaveData } from './worldSerializer'
import { BuildingType } from './colony/buildingTypes'

export type { SaveData, Vec2 }

export interface GameServer {
  create(): ClientSnapshot
  load(data: SaveData): ClientSnapshot
  update(dt: number): ClientSnapshot
  handleAction(action: PlayerAction): ClientSnapshot
  getSnapshot(): ClientSnapshot
  save(): SaveData
  destroy(): void
}

export type PlayerAction =
  | { type: 'right-click'; x: number; y: number }
  | { type: 'build'; x: number; y: number; buildingType: BuildingType }

export interface ClientSnapshot {
  speed: number
  timeScale: number
  paused: boolean
  map: {
    width: number
    height: number
    tiles: { type: string; occupant: string | null; walkable: boolean }[][]
  }
  colonists: {
    id: string
    name: string
    color: string
    position: Vec2
    needs: { hunger: number; sleep: number }
    statuses: string[]
    state: { phase: string; job?: string; path?: Vec2[] }
  }[]
  foods: { id: string; x: number; y: number }[]
  beds: { id: string; x: number; y: number }[]
  buildings: { id: string; x: number; y: number }[]
  buildQueue: { id: string; type: string; x: number; y: number }[]
}

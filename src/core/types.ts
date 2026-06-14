import { Vec2 } from './colony/types'

export interface CoreStateSnapshot {
  speed: number
  timeScale: number
  colonists: Array<{
    id: string
    name: string
    color: string
    stateLabel: string
    hunger: number
    sleep: number
    currentJob: string | null
    position: Vec2
    statuses: string[]
  }>
  foodCount: number
  bedCount: number
  buildQueueLength: number
}

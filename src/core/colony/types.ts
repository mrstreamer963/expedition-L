import { BuildQueue, BuildingType } from '../entities/building'
import { GameMap } from '../world/map'

export interface Vec2 {
  x: number
  y: number
}

export type ColonistStatus = 'hungry' | 'tired'

export interface ColonistNeeds {
  hunger: number
  sleep: number
}

export interface StatusDefinition {
  type: ColonistStatus
  label: string
  priority: number
  condition: (colonist: ColonistLike) => boolean
  jobType: string
}

export interface StatusUpdatable {
  needs: ColonistNeeds
  statuses: Set<ColonistStatus>
}

export type ColonistState =
  | { phase: 'idle' }
  | { phase: 'assigned'; job: string; target: Vec2 }
  | { phase: 'moving';   job: string; path: Vec2[] }
  | { phase: 'working';  job: string; progress: number; duration: number }
  | { phase: 'done';     job: string }

export interface JobContext {
  map: GameMap
  colonists: ColonistLike[]
  foods: { id: string; x: number; y: number }[]
  beds: { id: string; x: number; y: number }[]
  buildings: { id: string; type: BuildingType; x: number; y: number }[]
  buildQueue: BuildQueue
}

export interface ColonistLike {
  id: string
  position: Vec2
  needs: ColonistNeeds
  state: ColonistState
  statuses: Set<ColonistStatus>
}

export interface JobDefinition<C = JobContext> {
  type: string
  label: string
  duration: number

  findTarget(colonist: ColonistLike, context: C): Vec2 | null
  findAllTargets?(colonist: ColonistLike, context: C): Vec2[]
  onStart(colonist: ColonistLike, context: C): void
  onComplete(colonist: ColonistLike, context: C): void
  onCancel(colonist: ColonistLike, context: C): void
  onTick(colonist: ColonistLike, dt: number): void
}

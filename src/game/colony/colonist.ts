import { GameMap } from '../world/map'

export type ColonistState = 'idle' | 'walking' | 'eating' | 'sleeping' | 'building'

export interface Vec2 {
  x: number
  y: number
}

export interface ColonistNeeds {
  hunger: number // 0-100, 100 = full
  sleep: number  // 0-100, 100 = rested
}

export interface ColonistJob {
  type: 'eat' | 'sleep' | 'walk' | 'build'
  targetX?: number
  targetY?: number
  progress?: number // 0-1 for building animation
  taskId?: string // build task id for WorkGiver release
}

export class Colonist {
  id: string
  name: string
  color: string
  position: Vec2
  targetPosition: Vec2 | null
  path: Vec2[]
  speed: number // tiles per second
  state: ColonistState
  needs: ColonistNeeds
  currentJob: ColonistJob | null

  // Callback invoked when colonist reaches path destination
  onArrive: (() => void) | null = null
  // Building type when performing a build job (wall/bed/food)
  buildType: string | null = null
  // Build task id for WorkGiver release — persists across cancelJob
  pendingBuildTaskId: string | null = null

  // Internal movement tracking
  private moveProgress: number = 0 // progress along current path step
  private jobTimer: number = 0 // timer for current job (eating/sleeping)

  constructor(id: string, name: string, color: string, x: number, y: number) {
    this.id = id
    this.name = name
    this.color = color
    this.position = { x, y }
    this.targetPosition = null
    this.path = []
    this.speed = 3 // tiles per second
    this.state = 'idle'
    this.needs = { hunger: 80, sleep: 80 }
    this.currentJob = null
  }

  // Set a path to follow
  setPath(path: Vec2[]): void {
    this.path = path
    this.moveProgress = 0
    if (path.length > 0) {
      this.targetPosition = { x: path[path.length - 1].x, y: path[path.length - 1].y }
    }
  }

  cancelJob(): void {
    this.path = []
    this.moveProgress = 0
    this.targetPosition = null
    this.currentJob = null
    this.onArrive = null
    this.state = 'idle'
  }

  // Update movement
  move(dt: number, map: GameMap): boolean {
    if (this.state !== 'walking' || this.path.length === 0) return false

    this.moveProgress += this.speed * dt

    while (this.moveProgress >= 1 && this.path.length > 0) {
      this.moveProgress -= 1

      const finalIdx = this.path.length - 1
      const finalTile = this.path[finalIdx]
      const occupant = map.getOccupant(Math.round(finalTile.x), Math.round(finalTile.y))
      if (occupant !== null && occupant !== this.id) {
        this.cancelJob()
        return true
      }

      const next = this.path.shift()!
      this.position = { x: next.x, y: next.y }
    }

    if (this.path.length === 0) {
      this.state = 'idle'
      this.targetPosition = null
      return true // reached destination
    }

    return false
  }

  // Get interpolated screen position (for smooth rendering)
  getInterpolatedPosition(): Vec2 {
    if (this.path.length > 0 && this.state === 'walking') {
      const next = this.path[0]
      return {
        x: this.position.x + (next.x - this.position.x) * this.moveProgress,
        y: this.position.y + (next.y - this.position.y) * this.moveProgress,
      }
    }
    return { ...this.position }
  }

  // Set job state with timer
  startJob(type: 'eat' | 'sleep' | 'build', targetX?: number, targetY?: number, taskId?: string): void {
    this.currentJob = { type, targetX, targetY, progress: 0, taskId }
    this.state = type === 'eat' ? 'eating' : type === 'sleep' ? 'sleeping' : 'building'
    this.jobTimer = 0
  }

  // Update job timer
  updateJob(dt: number): boolean {
    if (!this.currentJob || (this.state !== 'eating' && this.state !== 'sleeping' && this.state !== 'building')) {
      return false
    }

    const duration = this.currentJob.type === 'sleep' ? 10 : 0.5 // sleep = 10s, eat/build = 0.5s
    this.jobTimer += dt
    this.currentJob.progress = Math.min(1, this.jobTimer / duration)

    if (this.jobTimer >= duration) {
      this.currentJob = null
      this.state = 'idle'
      return true // job complete
    }
    return false
  }

  // Check if a need is critical
  isNeedCritical(need: 'hunger' | 'sleep'): boolean {
    return this.needs[need] < 20
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      color: this.color,
      position: { ...this.position },
      state: this.state,
      needs: { ...this.needs },
      currentJob: this.currentJob ? { ...this.currentJob } : null,
      path: this.path.map(p => ({ ...p })),
      buildType: this.buildType,
      pendingBuildTaskId: this.pendingBuildTaskId,
      moveProgress: this.moveProgress,
      jobTimer: this.jobTimer,
    }
  }
}

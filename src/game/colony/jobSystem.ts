import { Colonist } from './colonist'
import { findPath } from '../world/pathfinding'

export class JobSystem {
  private assignTimer: number = 0
  private readonly ASSIGN_INTERVAL = 2 // seconds between job assignments

  tick(dt: number, world: any): void {
    this.assignTimer += dt
    if (this.assignTimer < this.ASSIGN_INTERVAL) return
    this.assignTimer = 0

    for (const colonist of world.colonists) {
      this.tryAssignJob(colonist, world)
    }
  }

  private tryAssignJob(colonist: Colonist, world: any): void {
    // Skip if busy (eating, sleeping, building)
    if (colonist.state === 'eating' || colonist.state === 'sleeping' || colonist.state === 'building') return
    // Skip if already walking
    if (colonist.state === 'walking') return

    // Priority 1: Hunger
    if (colonist.needs.hunger < 40) {
      const food = this.findNearestFood(colonist, world)
      if (food) {
        this.sendTo(colonist, food, world, () => {
          colonist.startJob('eat')
        })
        return
      }
    }

    // Priority 2: Sleep
    if (colonist.needs.sleep < 25) {
      const bed = this.findNearestBed(colonist, world)
      if (bed) {
        this.sendTo(colonist, bed, world, () => {
          colonist.startJob('sleep')
        })
        return
      }
    }

    // Priority 3: Build from queue
    if (world.buildQueue.length > 0) {
      // Assign to nearest idle colonist (only the closest one)
      const task = world.buildQueue.peek()
      if (task && this.isNearestColonist(colonist, task, world)) {
        this.sendTo(colonist, { x: task.x, y: task.y }, world, () => {
          colonist.startJob('build')
        })
        return
      }
    }
  }

  assignBuildJob(world: any, task: any): void {
    // Find nearest idle colonist for a new build task
    let nearest: Colonist | null = null
    let minDist = Infinity

    for (const c of world.colonists) {
      if (c.state !== 'idle') continue
      const dist = Math.abs(c.position.x - task.x) + Math.abs(c.position.y - task.y)
      if (dist < minDist) {
        minDist = dist
        nearest = c
      }
    }

    if (nearest) {
      nearest.buildType = task.type
      this.sendTo(nearest, { x: task.x, y: task.y }, world, () => {
        nearest.startJob('build', task.x, task.y)
      })
    }
  }

  private findNearestFood(colonist: Colonist, world: any): { x: number; y: number } | null {
    let nearest: { x: number; y: number } | null = null
    let minDist = Infinity
    for (const food of world.foods) {
      const dist = Math.abs(colonist.position.x - food.x) + Math.abs(colonist.position.y - food.y)
      if (dist < minDist) {
        minDist = dist
        nearest = { x: food.x, y: food.y }
      }
    }
    return nearest
  }

  private findNearestBed(colonist: Colonist, world: any): { x: number; y: number } | null {
    let nearest: { x: number; y: number } | null = null
    let minDist = Infinity
    for (const bed of world.beds) {
      const dist = Math.abs(colonist.position.x - bed.x) + Math.abs(colonist.position.y - bed.y)
      if (dist < minDist) {
        minDist = dist
        nearest = { x: bed.x, y: bed.y }
      }
    }
    return nearest
  }

  private isNearestColonist(colonist: Colonist, target: { x: number; y: number }, world: any): boolean {
    let minDist = Infinity
    for (const c of world.colonists) {
      if (c.state !== 'idle') continue
      const dist = Math.abs(c.position.x - target.x) + Math.abs(c.position.y - target.y)
      if (dist < minDist) minDist = dist
    }
    const thisDist = Math.abs(colonist.position.x - target.x) + Math.abs(colonist.position.y - target.y)
    return thisDist === minDist
  }

  private sendTo(colonist: Colonist, target: { x: number; y: number }, world: any, onArrive?: () => void): void {
    if (!world.map.isWalkable(target.x, target.y)) return

    const occupied = world.colonists
      .filter((c: Colonist) => c.id !== colonist.id)
      .map((c: Colonist) => ({ x: Math.round(c.position.x), y: Math.round(c.position.y) }))

    const path = findPath(world.map, colonist.position, target, occupied)
    if (path.length === 0) return

    colonist.setPath(path)
    colonist.state = 'walking'
    colonist.onArrive = onArrive || null
  }
}

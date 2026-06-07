import { Colonist } from './colonist'
import { findPath } from '../world/pathfinding'
import { WorkGiver } from './workGiver'

export class JobSystem {
  private assignTimer: number = 0
  private readonly ASSIGN_INTERVAL = 2 // seconds between job assignments

  tick(dt: number, world: any, workGiver: WorkGiver): void {
    this.assignTimer += dt
    if (this.assignTimer < this.ASSIGN_INTERVAL) return
    this.assignTimer = 0

    // Phase 1: Self-preservation (hunger/sleep) — per-colonist
    for (const colonist of world.colonists) {
      if (colonist.state === 'eating' || colonist.state === 'sleeping' ||
          colonist.state === 'building' || colonist.state === 'walking') continue

      if (colonist.needs.hunger < 40) {
        const food = this.findNearestFood(colonist, world)
        if (food) {
          this.sendTo(colonist, food, world, () => {
            colonist.startJob('eat')
          })
          continue
        }
      }

      if (colonist.needs.sleep < 25) {
        const bed = this.findNearestBed(colonist, world)
        if (bed) {
          this.sendTo(colonist, bed, world, () => {
            colonist.startJob('sleep')
          })
          continue
        }
      }
    }

    // Phase 2: Build tasks — task-first, assign each to nearest idle colonist
    const idleColonists = world.colonists.filter(
      (c: Colonist) => c.state === 'idle'
    )

    for (const task of world.buildQueue.all) {
      if (task.reservedBy !== null) continue

      let nearest: Colonist | null = null
      let minDist = Infinity
      for (const colonist of idleColonists) {
        if (colonist.pendingBuildTaskId) continue
        const dist = Math.abs(colonist.position.x - task.x) + Math.abs(colonist.position.y - task.y)
        if (dist < minDist) {
          minDist = dist
          nearest = colonist
        }
      }

      if (!nearest) break

      workGiver.reserve(task, nearest.id)
      nearest.pendingBuildTaskId = task.id
      const taskTarget = { x: task.x, y: task.y }
      this.sendTo(nearest, taskTarget, world, () => {
        workGiver.releaseByPosition(world.buildQueue.all, task.x, task.y)
        nearest!.pendingBuildTaskId = null
        nearest!.currentJob = {
          type: 'build',
          targetX: task.x,
          targetY: task.y,
          taskId: task.id,
          progress: 0,
        }
        nearest!.startJob('build', task.x, task.y)
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

  private sendTo(colonist: Colonist, target: { x: number; y: number }, world: any, onArrive?: () => void): void {
    if (!world.map.isWalkable(target.x, target.y)) return

    // Already at target — fire callback immediately
    if (Math.round(colonist.position.x) === Math.round(target.x) &&
        Math.round(colonist.position.y) === Math.round(target.y)) {
      if (onArrive) onArrive()
      return
    }

    const occupied = world.colonists
      .filter((c: Colonist) => c.id !== colonist.id && c.state !== 'walking')
      .map((c: Colonist) => ({ x: Math.round(c.position.x), y: Math.round(c.position.y) }))

    const path = findPath(world.map, colonist.position, target, occupied)
    if (path.length === 0) return

    if (world.map.getOccupant(Math.round(colonist.position.x), Math.round(colonist.position.y)) === colonist.id) {
      world.map.setOccupant(Math.round(colonist.position.x), Math.round(colonist.position.y), null)
    }
    colonist.setPath(path)
    colonist.state = 'walking'
    colonist.onArrive = onArrive || null
  }
}

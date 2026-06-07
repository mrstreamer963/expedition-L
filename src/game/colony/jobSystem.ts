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

    for (const colonist of world.colonists) {
      // Skip if busy (eating, sleeping, building) or already walking
      if (colonist.state === 'eating' || colonist.state === 'sleeping' ||
          colonist.state === 'building' || colonist.state === 'walking') continue

      // Self-preservation: hunger overrides everything
      if (colonist.needs.hunger < 40) {
        const food = this.findNearestFood(colonist, world)
        if (food) {
          this.sendTo(colonist, food, world, () => {
            colonist.startJob('eat')
          })
          continue
        }
      }

      // Self-preservation: sleep
      if (colonist.needs.sleep < 25) {
        const bed = this.findNearestBed(colonist, world)
        if (bed) {
          this.sendTo(colonist, bed, world, () => {
            colonist.startJob('sleep')
          })
          continue
        }
      }

      // WorkGiver: build tasks
      const task = workGiver.getAvailableTask(world.buildQueue.all, colonist)
      if (task) {
        workGiver.reserve(task, colonist.id)
        colonist.pendingBuildTaskId = task.id
        const taskTarget = { x: task.x, y: task.y }
        this.sendTo(colonist, taskTarget, world, () => {
          workGiver.releaseByPosition(world.buildQueue.all, task.x, task.y)
          colonist.pendingBuildTaskId = null
          colonist.currentJob = {
            type: 'build',
            targetX: task.x,
            targetY: task.y,
            taskId: task.id,
            progress: 0,
          }
          colonist.startJob('build', task.x, task.y)
        })
      }
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

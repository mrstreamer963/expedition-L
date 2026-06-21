import { ColonistLike } from './types'
import { JOB_REGISTRY } from './jobRegistry'
import { STATUS_REGISTRY } from './statusRegistry'
import { findPath } from '../world/pathfinding'
import { WorldState } from '../worldState'

export class JobDispatcher {
  assignBestJob(colonistId: string, context: WorldState): void {
    const colonist = context.colonists.find(c => c.id === colonistId)
    if (!colonist || colonist.state.phase !== 'idle') return

    const statuses = STATUS_REGISTRY.getAll()
      .filter(def => colonist.statuses.has(def.type))
      .sort((a, b) => a.priority - b.priority)

    for (const status of statuses) {
      if (this.tryAssignJob(colonist, status.jobType, context)) return
    }

    if (this.tryAssignBuild(colonist, context)) return
  }

  onBuildQueued(
    task: { id: string; type: string; x: number; y: number; reservedBy: string | null },
    context: WorldState
  ): void {
    const idle = this.findIdleColonist(context, task.x, task.y)
    if (!idle) return
    task.reservedBy = idle.id
    idle.reservedBuildTaskId = task.id
    this.sendTo(idle, { x: task.x, y: task.y }, 'build', context)
  }

  private tryAssignJob(colonist: ColonistLike, jobType: string, context: WorldState): boolean {
    const def = JOB_REGISTRY.get(jobType)
    if (!def) return false
    const targets = def.findAllTargets?.(colonist, context) ?? (() => {
      const t = def.findTarget(colonist, context)
      return t ? [t] : []
    })()
    for (const target of targets) {
      if (this.sendTo(colonist, target, jobType, context)) return true
    }
    return false
  }

  private tryAssignBuild(colonist: ColonistLike, context: WorldState): boolean {
    const existing = context.buildQueue.all.find(t => t.reservedBy === colonist.id)
    if (existing) {
      colonist.reservedBuildTaskId = existing.id
      return this.sendTo(colonist, { x: existing.x, y: existing.y }, 'build', context)
    }
    const tasks = context.buildQueue.all
      .filter(t => t.reservedBy === null)
      .sort((a, b) => {
        const da = Math.abs(a.x - colonist.position.x) + Math.abs(a.y - colonist.position.y)
        const db = Math.abs(b.x - colonist.position.x) + Math.abs(b.y - colonist.position.y)
        return da - db
      })
    const task = tasks[0]
    if (!task) return false
    task.reservedBy = colonist.id
    colonist.reservedBuildTaskId = task.id
    return this.sendTo(colonist, { x: task.x, y: task.y }, 'build', context)
  }

  private findIdleColonist(context: WorldState, x: number, y: number): ColonistLike | null {
    let nearest: ColonistLike | null = null
    let minDist = Infinity
    for (const c of context.colonists) {
      if (c.state.phase !== 'idle') continue
      const dist = Math.abs(c.position.x - x) + Math.abs(c.position.y - y)
      if (dist < minDist) {
        minDist = dist
        nearest = c
      }
    }
    return nearest
  }

  private sendTo(
    colonist: ColonistLike,
    target: { x: number; y: number },
    jobType: string,
    context: WorldState
  ): boolean {
    const def = JOB_REGISTRY.get(jobType)
    if (!def) return false
    const map = context.map
    if (!map.isWalkable(target.x, target.y)) {
      this.cancelReservation(colonist, context)
      return false
    }
    if (
      Math.round(colonist.position.x) === Math.round(target.x) &&
      Math.round(colonist.position.y) === Math.round(target.y)
    ) {
      const occupant = map.getOccupant(target.x, target.y)
      if (occupant !== null && occupant !== colonist.id) {
        this.cancelReservation(colonist, context)
        return false
      }
      colonist.transition({
        phase: 'working',
        job: jobType,
        progress: 0,
        duration: def.duration,
      })
      def.onStart(colonist, context)
      return true
    }
    const occupied = context.colonists
      .filter(c => c.id !== colonist.id && c.state.phase !== 'moving')
      .map(c => ({ x: Math.round(c.position.x), y: Math.round(c.position.y) }))
    const path = findPath(map, colonist.position, target, occupied)
    if (path.length === 0) {
      this.cancelReservation(colonist, context)
      return false
    }
    this.releaseTile(colonist, context)
    colonist.transition({ phase: 'moving', job: jobType, path })
    def.onStart(colonist, context)
    return true
  }

  cancelReservation(colonist: ColonistLike, context: WorldState): void {
    const task = context.buildQueue.all.find(t => t.reservedBy === colonist.id)
    if (task) task.reservedBy = null
    colonist.reservedBuildTaskId = null
  }

  private releaseTile(colonist: ColonistLike, context: WorldState): void {
    const map = context.map
    const tx = Math.round(colonist.position.x)
    const ty = Math.round(colonist.position.y)
    if (map.getOccupant(tx, ty) === colonist.id) {
      map.setOccupant(tx, ty, null)
    }
  }
}

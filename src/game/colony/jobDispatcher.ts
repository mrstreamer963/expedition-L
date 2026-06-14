import { GameEvent, JobContext, ColonistLike } from './types'
import { JOB_REGISTRY } from './jobRegistry'
import { findPath } from '../world/pathfinding'
import { Colonist } from './colonist'

export class JobDispatcher {
  onEvent(event: GameEvent, context: JobContext): void {
    switch (event.type) {
      case 'colonist_idle':
        this.assignBestJob(event.colonistId, context)
        break
      case 'build_queued':
        this.onBuildQueued(event.task, context)
        break
      case 'food_consumed':
        this.checkEmergencyFood(context)
        break
      case 'food_built':
        break
    }
  }

  private onBuildQueued(
    task: { id: string; type: string; x: number; y: number; reservedBy: string | null },
    context: JobContext
  ): void {
    const idle = this.findIdleColonist(context)
    if (!idle) return
    task.reservedBy = idle.id
    idle.reservedBuildTaskId = task.id
    this.sendTo(idle, { x: task.x, y: task.y }, 'build', context)
  }

  private checkEmergencyFood(context: JobContext): void {
    if (context.foods.length > 0) return
    const hungryIdle = context.colonists.find(
      c => c.state.phase === 'idle' && c.needs.hunger < 40
    )
    if (!hungryIdle) return
    const foodTask = context.buildQueue.all.find(t => t.type === 'food' && t.reservedBy === null)
    if (!foodTask) return
    foodTask.reservedBy = hungryIdle.id
    ;(hungryIdle as Colonist).reservedBuildTaskId = foodTask.id
    this.sendTo(hungryIdle, { x: foodTask.x, y: foodTask.y }, 'build', context)
  }

  assignBestJob(colonistId: string, context: JobContext): void {
    const colonist = context.colonists.find(c => c.id === colonistId)
    if (!colonist || colonist.state.phase !== 'idle') return
    const hungerBelow = colonist.needs.hunger < 40
    const sleepBelow = colonist.needs.sleep < 25
    if (hungerBelow && sleepBelow) {
      const hungerRatio = colonist.needs.hunger / 40
      const sleepRatio = colonist.needs.sleep / 25
      if (sleepRatio < hungerRatio) {
        if (this.tryAssignNeed(colonist, 'sleep', context)) return
        if (this.tryAssignNeed(colonist, 'hunger', context)) return
      } else {
        if (this.tryAssignNeed(colonist, 'hunger', context)) return
        if (this.tryAssignNeed(colonist, 'sleep', context)) return
      }
    } else {
      if (this.tryAssignNeed(colonist, 'hunger', context)) return
      if (this.tryAssignNeed(colonist, 'sleep', context)) return
    }
    if (this.tryAssignBuild(colonist, context)) return
  }

  private tryAssignNeed(colonist: ColonistLike, need: 'hunger' | 'sleep', context: JobContext): boolean {
    const threshold = need === 'hunger' ? 40 : 25
    if (colonist.needs[need] >= threshold) return false
    const jobType = need === 'hunger' ? 'eat' : 'sleep'
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

  private tryAssignBuild(colonist: ColonistLike, context: JobContext): boolean {
    const task = context.buildQueue.all.find(t => t.reservedBy === null)
    if (!task) return false
    task.reservedBy = colonist.id
    ;(colonist as Colonist).reservedBuildTaskId = task.id
    return this.sendTo(colonist, { x: task.x, y: task.y }, 'build', context)
  }

  private findIdleColonist(context: JobContext): Colonist | null {
    const idle = context.colonists.filter(c => c.state.phase === 'idle')
    return idle.length > 0 ? (idle[0] as Colonist) : null
  }

  private sendTo(
    colonist: ColonistLike,
    target: { x: number; y: number },
    jobType: string,
    context: JobContext
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
      ;(colonist as Colonist).transition({
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
    ;(colonist as Colonist).transition({ phase: 'moving', job: jobType, path })
    def.onStart(colonist, context)
    return true
  }

  private cancelReservation(colonist: ColonistLike, context: JobContext): void {
    const task = context.buildQueue.all.find(t => t.reservedBy === colonist.id)
    if (task) task.reservedBy = null
    ;(colonist as Colonist).reservedBuildTaskId = null
  }

  private releaseTile(colonist: ColonistLike, context: JobContext): void {
    const map = context.map
    const tx = Math.round(colonist.position.x)
    const ty = Math.round(colonist.position.y)
    if (map.getOccupant(tx, ty) === colonist.id) {
      map.setOccupant(tx, ty, null)
    }
  }
}

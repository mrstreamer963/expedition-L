import { GameEvent, JobContext } from './types'
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

  private onBuildQueued(task: { id: string; type: string; x: number; y: number; reservedBy: string | null }, context: JobContext): void {
    const idle = this.findIdleColonist(context)
    if (!idle) return

    task.reservedBy = idle.id
    ;(idle as any)._buildTaskId = task.id

    this.sendTo(idle, { x: task.x, y: task.y }, 'build', context)
  }

  private checkEmergencyFood(context: JobContext): void {
    if ((context.foods as any[]).length > 0) return

    const hungryIdle = (context.colonists as Colonist[]).find(
      c => c.state.phase === 'idle' && c.needs.hunger < 40
    )
    if (!hungryIdle) return

    const foodTask = (context.buildQueue.all as any[]).find(
      (t: any) => t.type === 'food' && t.reservedBy === null
    )
    if (!foodTask) return

    foodTask.reservedBy = hungryIdle.id
    ;(hungryIdle as any)._buildTaskId = foodTask.id

    this.sendTo(hungryIdle, { x: foodTask.x, y: foodTask.y }, 'build', context)
  }

  assignBestJob(colonistId: string, context: JobContext): void {
    const colonist = (context.colonists as Colonist[]).find(c => c.id === colonistId)
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

  private tryAssignNeed(colonist: Colonist, need: 'hunger' | 'sleep', context: JobContext): boolean {
    const threshold = need === 'hunger' ? 40 : 25
    if (colonist.needs[need] >= threshold) return false

    const jobType = need === 'hunger' ? 'eat' : 'sleep'
    const def = JOB_REGISTRY.get(jobType)
    if (!def) return false

    const target = def.findTarget(colonist, context)
    if (!target) return false

    return this.sendTo(colonist, target, jobType, context)
  }

  private tryAssignBuild(colonist: Colonist, context: JobContext): boolean {
    const task = (context.buildQueue.all as any[]).find(
      (t: any) => t.reservedBy === null
    )
    if (!task) return false

    task.reservedBy = colonist.id
    ;(colonist as any)._buildTaskId = task.id

    return this.sendTo(colonist, { x: task.x, y: task.y }, 'build', context)
  }

  private findIdleColonist(context: JobContext): Colonist | null {
    const idle = (context.colonists as Colonist[]).filter(c => c.state.phase === 'idle')
    if (idle.length === 0) return null
    return idle[0]
  }

  private sendTo(colonist: Colonist, target: { x: number; y: number }, jobType: string, context: JobContext): boolean {
    const def = JOB_REGISTRY.get(jobType)
    if (!def) return false

    const map: any = context.map
    if (!map.isWalkable(target.x, target.y)) {
      this.cancelReservation(colonist, context)
      return false
    }

    if (Math.round(colonist.position.x) === Math.round(target.x) &&
        Math.round(colonist.position.y) === Math.round(target.y)) {
      colonist.transition({
        phase: 'working',
        job: jobType,
        progress: 0,
        duration: def.duration,
      })
      def.onStart(colonist, context as any)
      return true
    }

    const occupied = (context.colonists as Colonist[])
      .filter(c => c.id !== colonist.id && c.state.phase !== 'moving')
      .map(c => ({ x: Math.round(c.position.x), y: Math.round(c.position.y) }))

    const path = findPath(map, colonist.position, target, occupied)
    if (path.length === 0) {
      this.cancelReservation(colonist, context)
      return false
    }

    this.releaseTile(colonist, context)
    colonist.transition({ phase: 'moving', job: jobType, path })
    def.onStart(colonist, context as any)
    return true
  }

  private cancelReservation(colonist: Colonist, context: JobContext): void {
    const task = (context.buildQueue.all as any[]).find(
      (t: any) => t.reservedBy === colonist.id
    )
    if (task) task.reservedBy = null
    ;(colonist as any)._buildTaskId = null
  }

  private releaseTile(colonist: Colonist, context: JobContext): void {
    const map: any = context.map
    const tx = Math.round(colonist.position.x)
    const ty = Math.round(colonist.position.y)
    if (map.getOccupant(tx, ty) === colonist.id) {
      map.setOccupant(tx, ty, null)
    }
  }
}

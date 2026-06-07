import { BuildTask } from '../entities/building'

export class WorkGiver {
  reserve(task: BuildTask, colonistId: string): boolean {
    if (task.reservedBy !== null) return false
    task.reservedBy = colonistId
    return true
  }

  release(task: BuildTask): void {
    task.reservedBy = null
  }

  releaseByPosition(buildQueueAll: BuildTask[], x: number, y: number): void {
    for (const task of buildQueueAll) {
      if (task.x === x && task.y === y) {
        task.reservedBy = null
        return
      }
    }
  }

}

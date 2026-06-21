import { addEntity, addComponent } from 'bitecs'
import { JobDefinition, ColonistLike } from '../types'
import { WorldState } from '../../worldState'
import { Position, Renderable } from '../../components'
import { BUILDING_CONFIGS } from '../buildingTypes'

export const buildJob: JobDefinition = {
  type: 'build',
  label: 'Стройка',
  duration: 0.5,

  findTarget(colonist: ColonistLike, context: WorldState): { x: number; y: number } | null {
    const task = context.buildQueue.all.find(t => t.reservedBy === colonist.id)
    if (task) return { x: task.x, y: task.y }
    const firstUnreserved = context.buildQueue.all.find(t => t.reservedBy === null)
    if (!firstUnreserved) return null
    firstUnreserved.reservedBy = colonist.id
    return { x: firstUnreserved.x, y: firstUnreserved.y }
  },

  onStart(_colonist: ColonistLike, _context: WorldState): void {},

  onComplete(colonist: ColonistLike, context: WorldState): void {
    const { ecs, buildQueue, map } = context
    const taskId = resolveTaskId(colonist, context)
    if (!taskId) return
    const task = buildQueue.removeById(taskId)
    if (!task) return
    const config = BUILDING_CONFIGS[task.type]
    if (!config) return
    const tx = Math.round(colonist.position.x)
    const ty = Math.round(colonist.position.y)

    const eid = addEntity(ecs)
    Position.x[eid] = tx; Position.y[eid] = ty
    addComponent(ecs, eid, Position)
    addComponent(ecs, eid, Renderable)
    addComponent(ecs, eid, config.component)
    Renderable[eid] = { type: task.type }
    map.setTile(tx, ty, config.tileType)

    colonist.reservedBuildTaskId = null
  },

  onCancel(colonist: ColonistLike, context: WorldState): void {
    for (const task of context.buildQueue.all) {
      if (task.reservedBy === colonist.id) {
        task.reservedBy = null
        break
      }
    }
  },

  onTick(_colonist: ColonistLike, _dt: number): void {},
}

function resolveTaskId(colonist: ColonistLike, context: WorldState): string | undefined {
  if (colonist.reservedBuildTaskId) return colonist.reservedBuildTaskId
  const task = context.buildQueue.all.find(t => t.reservedBy === colonist.id)
  return task?.id
}

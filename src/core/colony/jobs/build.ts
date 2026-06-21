import { JobDefinition, ColonistLike } from '../types'
import { WorldState } from '../../worldState'
import { Building } from '../../entities/building'
import { Bed } from '../../entities/bed'
import { Food } from '../../entities/food'
import { TileType } from '../../world/tile'

interface ColonistWithBuildTask extends ColonistLike {
  reservedBuildTaskId: string | null
}

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
    const { buildQueue, buildings, map, foods, beds } = context
    const taskId = resolveTaskId(colonist, context)
    if (!taskId) return
    const task = buildQueue.removeById(taskId)
    if (!task) return
    const tx = Math.round(colonist.position.x)
    const ty = Math.round(colonist.position.y)
    switch (task.type) {
      case 'wall':
        buildings.push(new Building(task.id, 'wall', tx, ty))
        map.setTile(tx, ty, TileType.Wall)
        break
      case 'bed':
        beds.push(new Bed(task.id, tx, ty))
        map.setTile(tx, ty, TileType.Bed)
        break
      case 'food':
        foods.push(new Food(task.id, tx, ty))
        map.setTile(tx, ty, TileType.Food)
        break
    }
    ;(colonist as ColonistWithBuildTask).reservedBuildTaskId = null
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
  const c = colonist as ColonistWithBuildTask
  if (c.reservedBuildTaskId) return c.reservedBuildTaskId
  const task = context.buildQueue.all.find(t => t.reservedBy === colonist.id)
  return task?.id
}

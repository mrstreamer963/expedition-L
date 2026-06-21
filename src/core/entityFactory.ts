import { World, addEntity, addComponent, query, removeEntity as removeEcsEntity } from 'bitecs'
import { Position, Renderable } from './components'
import { BUILDING_CONFIGS, BuildingType } from './colony/buildingTypes'

export function createBuildingEntity(
  ecs: World,
  x: number,
  y: number,
  type: BuildingType,
): number {
  const config = BUILDING_CONFIGS[type]
  if (!config) return -1

  const eid = addEntity(ecs)
  Position.x[eid] = x
  Position.y[eid] = y
  addComponent(ecs, eid, Position)
  addComponent(ecs, eid, Renderable)
  addComponent(ecs, eid, config.component)
  Renderable[eid] = { type }
  return eid
}

export function removeEntityAt(
  ecs: World,
  x: number,
  y: number,
  component: unknown,
): boolean {
  for (const eid of query(ecs, [component, Position])) {
    if (Position.x[eid] === x && Position.y[eid] === y) {
      removeEcsEntity(ecs, eid)
      return true
    }
  }
  return false
}

export function findEntityAt(
  ecs: World,
  x: number,
  y: number,
  component: unknown,
): number | null {
  for (const eid of query(ecs, [component, Position])) {
    if (Position.x[eid] === x && Position.y[eid] === y) {
      return eid
    }
  }
  return null
}

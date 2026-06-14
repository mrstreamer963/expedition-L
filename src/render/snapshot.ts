import { GameMap } from '../game/world/map'
import { Colonist } from '../game/colony/colonist'
import { Food } from '../game/entities/food'
import { Bed } from '../game/entities/bed'
import { Building, BuildTask } from '../game/entities/building'
import { BuildMode } from '../ui/types'

export interface RenderSnapshot {
  offsetX: number
  offsetY: number
  canvasWidth: number
  canvasHeight: number
  map: GameMap
  colonists: Colonist[]
  foods: Food[]
  beds: Bed[]
  buildings: Building[]
  buildQueueTasks: BuildTask[]
  hoveredTile: { x: number; y: number } | null
  selectedColonistId: string | null
  buildMode: BuildMode
}

export function collectSnapshot(params: {
  camera: { offsetX: number; offsetY: number }
  canvasWidth: number
  canvasHeight: number
  map: GameMap
  colonists: Colonist[]
  foods: Food[]
  beds: Bed[]
  buildings: Building[]
  buildQueue: { all: BuildTask[] }
  hoveredTile: { x: number; y: number } | null
  selectedColonistId: string | null
  buildMode: BuildMode
}): RenderSnapshot {
  return {
    offsetX: params.camera.offsetX,
    offsetY: params.camera.offsetY,
    canvasWidth: params.canvasWidth,
    canvasHeight: params.canvasHeight,
    map: params.map,
    colonists: params.colonists,
    foods: params.foods,
    beds: params.beds,
    buildings: params.buildings,
    buildQueueTasks: params.buildQueue.all,
    hoveredTile: params.hoveredTile,
    selectedColonistId: params.selectedColonistId,
    buildMode: params.buildMode,
  }
}

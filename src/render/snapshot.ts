import { GameMap } from '../core/world/map'
import { Colonist } from '../core/colony/colonist'
import { Food } from '../core/entities/food'
import { Bed } from '../core/entities/bed'
import { Building, BuildTask } from '../core/entities/building'
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

import { TileType } from '../world/tile'
import { Solid, Edible, Sleepable } from '../components'

export const BuildingType = {
  Wall: 'wall',
  Bed: 'bed',
  Food: 'food',
} as const

export type BuildingType = (typeof BuildingType)[keyof typeof BuildingType]

interface BuildingConfig {
  readonly tileType: TileType
  readonly component: unknown
}

export const BUILDING_CONFIGS: Record<BuildingType, BuildingConfig> = {
  [BuildingType.Wall]: { tileType: TileType.Wall, component: Solid },
  [BuildingType.Bed]: { tileType: TileType.Bed, component: Sleepable },
  [BuildingType.Food]: { tileType: TileType.Food, component: Edible },
}

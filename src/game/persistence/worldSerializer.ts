import { GameMap } from '../world/map'
import { TileType } from '../world/tile'
import { Colonist } from '../colony/colonist'
import { Camera } from '../camera'
import { Food } from '../entities/food'
import { Bed } from '../entities/bed'
import { Building, BuildingType, BuildQueue, BuildTask } from '../entities/building'
import { GameSpeed } from '../../store/types'

export interface SaveData {
  version: number
  timestamp: number
  gameName: string
  map: {
    tiles: { type: TileType; occupantId: string | null }[][]
  }
  colonists: any[]
  foods: { id: string; x: number; y: number }[]
  beds: { id: string; x: number; y: number }[]
  buildings: { id: string; type: BuildingType; x: number; y: number }[]
  buildQueue: { tasks: BuildTask[] }
  camera: { offsetX: number; offsetY: number }
  speed: GameSpeed
}

export interface GameWorldInit {
  map: GameMap
  colonists: Colonist[]
  foods: Food[]
  beds: Bed[]
  buildings: Building[]
  buildQueue: BuildQueue
  camera: Camera
  speed: GameSpeed
}

export interface SerializableWorld {
  map: GameMap
  colonists: Colonist[]
  foods: Food[]
  beds: Bed[]
  buildings: Building[]
  buildQueue: BuildQueue
  camera: Camera
  speed: GameSpeed
}

const CURRENT_VERSION = 2

export class WorldSerializer {
  static toJSON(world: SerializableWorld): SaveData {
    return {
      version: CURRENT_VERSION,
      timestamp: Date.now(),
      gameName: 'expedition-l',
      map: world.map.toJSON(),
      colonists: world.colonists.map(c => c.toJSON()),
      foods: world.foods.map(f => f.toJSON()),
      beds: world.beds.map(b => b.toJSON()),
      buildings: world.buildings.map(b => b.toJSON()),
      buildQueue: world.buildQueue.toJSON(),
      camera: world.camera.toJSON(),
      speed: world.speed,
    }
  }

  static validate(data: unknown): data is SaveData {
    if (!data || typeof data !== 'object') return false
    const d = data as Record<string, unknown>
    const version = d.version as number
    if (version !== 1 && version !== 2) return false
    if (d.gameName !== 'expedition-l') return false
    if (!d.map || !d.colonists || !d.foods || !d.beds || !d.buildings) return false
    if (!d.buildQueue || !d.camera || d.speed === undefined) return false
    return true
  }

  static fromJSON(data: SaveData): GameWorldInit {
    const map = new GameMap(
      data.map.tiles.map(row =>
        row.map(t => {
          const tileData = TILE_DATA_BY_TYPE[t.type]
          return { type: t.type, walkable: tileData.walkable, occupantId: t.occupantId }
        })
      )
    )

    const colonists = data.colonists.map(c => Colonist.fromJSON(c))

    const foods = data.foods.map(f => new Food(f.id, f.x, f.y))
    const beds = data.beds.map(b => new Bed(b.id, b.x, b.y))
    const buildings = data.buildings.map(b => new Building(b.id, b.type, b.x, b.y))

    const buildQueue = new BuildQueue()
    for (const task of data.buildQueue.tasks) {
      buildQueue.add({ ...task, reservedBy: null })
    }

    const camera = new Camera(data.camera.offsetX, data.camera.offsetY)

    return { map, colonists, foods, beds, buildings, buildQueue, camera, speed: data.speed }
  }
}

const TILE_DATA_BY_TYPE: Record<string, { walkable: boolean }> = {
  Floor: { walkable: true },
  Wall: { walkable: false },
  Rock: { walkable: false },
  Water: { walkable: false },
  Bed: { walkable: true },
  Food: { walkable: true },
}

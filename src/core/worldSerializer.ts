import { World, createWorld, addEntity, addComponent, query } from 'bitecs'
import { GameMap } from './world/map'
import { TileType, Tile } from './world/tile'
import { Colonist } from './colony/colonist'
import { ColonistState } from './colony/types'
import { BuildQueue, BuildTask } from './colony/buildQueue'
import { BuildingType, BUILDING_CONFIGS } from './colony/buildingTypes'
import { Position, Renderable, Edible, Sleepable, Solid } from './components'

export interface SerializableTile {
  type: TileType
  occupantId: string | null
}

export interface SerializableColonist {
  id: string
  name: string
  color: string
  position: { x: number; y: number }
  fsmState: ColonistState
  needs: { hunger: number; sleep: number }
  statuses: string[]
}

export interface SerializableFood {
  id: string
  x: number
  y: number
}

export interface SerializableBed {
  id: string
  x: number
  y: number
}

export interface SerializableBuilding {
  id: string
  type: BuildingType
  x: number
  y: number
}

export interface SaveData {
  version: number
  timestamp: number
  gameName: string
  map: { tiles: SerializableTile[][] }
  colonists: SerializableColonist[]
  foods: SerializableFood[]
  beds: SerializableBed[]
  buildings: SerializableBuilding[]
  buildQueue: { tasks: BuildTask[] }
  speed: number
  systemData?: Record<string, unknown>
}

export interface GameWorldInit {
  ecs: World
  map: GameMap
  colonists: Colonist[]
  buildQueue: BuildQueue
  speed: number
}

export interface SerializableWorld {
  map: { toJSON(): { tiles: SerializableTile[][] }; tileAt(x: number, y: number): Tile }
  colonists: { toJSON(): SerializableColonist }[]
  buildQueue: { toJSON(): { tasks: BuildTask[] }; all: BuildTask[] }
  speed: number
}

const CURRENT_VERSION = 4

export class WorldSerializer {
  static toJSON(world: SerializableWorld, ecs: World, systemData?: Record<string, unknown>): SaveData {
    return {
      version: CURRENT_VERSION,
      timestamp: Date.now(),
      gameName: 'expedition-l',
      map: world.map.toJSON(),
      colonists: world.colonists.map(c => c.toJSON()),
      foods: Array.from(query(ecs, [Edible, Position])).map(eid => ({ id: `e${eid}`, x: Position.x[eid], y: Position.y[eid] })),
      beds: Array.from(query(ecs, [Sleepable, Position])).map(eid => ({ id: `e${eid}`, x: Position.x[eid], y: Position.y[eid] })),
      buildings: Array.from(query(ecs, [Solid, Position])).map(eid => ({ id: `e${eid}`, type: (Renderable[eid]?.type ?? BuildingType.Wall) as BuildingType, x: Position.x[eid], y: Position.y[eid] })),
      buildQueue: world.buildQueue.toJSON(),
      speed: world.speed,
      systemData,
    }
  }

  static validate(data: unknown): data is SaveData {
    if (!data || typeof data !== 'object') return false
    const d = data as Record<string, unknown>
    const version = d.version as number
    if (version !== 1 && version !== 2 && version !== 3 && version !== 4) return false
    if (d.gameName !== 'expedition-l') return false
    if (!d.map || !d.colonists || !d.foods || !d.beds || !d.buildings) return false
    if (!d.buildQueue || d.speed === undefined) return false
    return true
  }

  static fromJSON(data: SaveData): GameWorldInit {
    const WALKABLE: Record<string, boolean> = {
      Floor: true, Wall: false, Rock: false,
      Water: false, Bed: true, Food: true,
    }

    const map = new GameMap(
      data.map.tiles.map(row =>
        row.map(t => ({
          type: t.type,
          walkable: WALKABLE[t.type] ?? true,
          occupantId: t.occupantId,
        }))
      )
    )

    const colonists = data.colonists.map(c => Colonist.fromJSON(c))

    const ecs = createWorld()
    for (const f of data.foods) {
      const eid = addEntity(ecs)
      Position.x[eid] = f.x; Position.y[eid] = f.y
      addComponent(ecs, eid, Position)
      addComponent(ecs, eid, Renderable)
      Renderable[eid] = { type: BuildingType.Food }
      const config = BUILDING_CONFIGS[BuildingType.Food]
      if (config) addComponent(ecs, eid, config.component)
    }
    for (const b of data.beds) {
      const eid = addEntity(ecs)
      Position.x[eid] = b.x; Position.y[eid] = b.y
      addComponent(ecs, eid, Position)
      addComponent(ecs, eid, Renderable)
      Renderable[eid] = { type: BuildingType.Bed }
      const config = BUILDING_CONFIGS[BuildingType.Bed]
      if (config) addComponent(ecs, eid, config.component)
    }
    for (const b of data.buildings) {
      const eid = addEntity(ecs)
      Position.x[eid] = b.x; Position.y[eid] = b.y
      addComponent(ecs, eid, Position)
      addComponent(ecs, eid, Renderable)
      Renderable[eid] = { type: b.type }
      const config = BUILDING_CONFIGS[b.type]
      if (config) addComponent(ecs, eid, config.component)
    }

    const buildQueue = new BuildQueue()
    for (const task of data.buildQueue.tasks) {
      buildQueue.add({ ...task, reservedBy: null })
    }

    return { ecs, map, colonists, buildQueue, speed: data.speed }
  }
}



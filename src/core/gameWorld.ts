import { World, createWorld, query } from 'bitecs'
import { GameMap } from './world/map'
import { TileType } from './world/tile'
import { Colonist, Vec2 } from './colony/colonist'
import { createInitialColonists } from './colony/colonistFactory'
import { JobDispatcher } from './colony/jobDispatcher'
import { JOB_REGISTRY } from './colony/jobRegistry'
import { STATUS_REGISTRY } from './colony/statusRegistry'
import { eatJob } from './colony/jobs/eat'
import { sleepJob } from './colony/jobs/sleep'
import { buildJob } from './colony/jobs/build'
import { walkJob } from './colony/jobs/walk'
import { hungryStatus } from './colony/statuses/hungry'
import { tiredStatus } from './colony/statuses/tired'
import { ColonistState } from './colony/types'
import { BuildQueue, BuildTask } from './colony/buildQueue'
import { NeedSystem } from './systems/needSystem'
import { StatusSystem } from './systems/statusSystem'
import { SystemPipeline } from './systems/systemPipeline'
import { WorldState } from './worldState'
import { WorldSerializer, SaveData } from './worldSerializer'
import { findPath } from './world/pathfinding'
import { GameServer, ClientSnapshot, PlayerAction } from './types'
import { Position, Renderable } from './components'
import { BuildingType, BUILDING_CONFIGS } from './colony/buildingTypes'
import { createBuildingEntity } from './entityFactory'

export class GameWorld implements GameServer {
  readonly state: WorldState
  readonly jobDispatcher = new JobDispatcher()
  readonly pipeline = new SystemPipeline()

  paused: boolean = false
  speed: number = 1
  timeScale: number = 1

  constructor(savedState?: SaveData) {
    JOB_REGISTRY.register(eatJob)
    JOB_REGISTRY.register(sleepJob)
    JOB_REGISTRY.register(buildJob)
    JOB_REGISTRY.register(walkJob)
    STATUS_REGISTRY.register(hungryStatus)
    STATUS_REGISTRY.register(tiredStatus)

    this.pipeline.add(new NeedSystem())
    this.pipeline.add(new StatusSystem())

    if (savedState) {
      const init = WorldSerializer.fromJSON(savedState)
      this.state = new WorldState({
        ecs: init.ecs,
        map: init.map,
        colonists: init.colonists,
        buildQueue: init.buildQueue,
      })
      this.speed = [0, 1, 2, 3].includes(init.speed) ? init.speed : 2
      this.timeScale = this.speed === 2 ? 5 : this.speed === 3 ? 10 : this.speed
      this.paused = this.speed === 0

      for (let y = 0; y < this.state.map.height; y++) {
        for (let x = 0; x < this.state.map.width; x++) {
          this.state.map.setOccupant(x, y, null)
        }
      }
      for (const c of this.state.colonists) {
        this.occupyTile(c.position.x, c.position.y, c.id)
      }

      if (savedState.systemData) {
        this.pipeline.deserialize(savedState.systemData, this.state)
      }
    } else {
      const ecs = createWorld()
      const map = new GameMap()
      const colonists = createInitialColonists()
      const buildQueue = new BuildQueue()
      this.placeInitialEntities(ecs, map, BuildingType.Food, [
        { x: 8, y: 8 }, { x: 12, y: 8 }, { x: 8, y: 12 }, { x: 12, y: 12 }, { x: 10, y: 10 },
      ])
      this.placeInitialEntities(ecs, map, BuildingType.Bed, [
        { x: 6, y: 6 }, { x: 14, y: 14 },
      ])
      this.state = new WorldState({
        ecs,
        map,
        colonists,
        buildQueue,
      })
      for (const c of this.state.colonists) {
        this.occupyTile(c.position.x, c.position.y, c.id)
      }
    }

    this.pipeline.init(this.state)
  }

  get map(): GameMap { return this.state.map }
  get colonists(): Colonist[] { return this.state.colonists }
  get buildQueue(): BuildQueue { return this.state.buildQueue }

  create(): ClientSnapshot {
    return this.generateSnapshot()
  }

  load(_savedState: SaveData): ClientSnapshot {
    return this.generateSnapshot()
  }

  getSnapshot(): ClientSnapshot {
    return this.generateSnapshot()
  }

  save(): SaveData {
    return WorldSerializer.toJSON(this, this.state.ecs, this.pipeline.serialize())
  }

  private generateSnapshot(): ClientSnapshot {
    return {
      speed: this.speed,
      timeScale: this.timeScale,
      paused: this.paused,
      map: {
        width: this.state.map.width,
        height: this.state.map.height,
        tiles: Array.from({ length: this.state.map.height }, (_, y) =>
          Array.from({ length: this.state.map.width }, (_, x) => {
            const tile = this.state.map.tileAt(x, y)
            return { type: tile.type, occupant: tile.occupantId, walkable: tile.walkable }
          })
        ),
      },
      colonists: this.state.colonists.map(c => ({
        id: c.id,
        name: c.name,
        color: c.color,
        position: { ...c.position },
        needs: { ...c.needs },
        statuses: [...c.statuses],
        state: serializeState(c.state),
      })),
      entities: Array.from(query(this.state.ecs, [Renderable, Position])).map(eid => ({
        id: `e${eid}`,
        type: Renderable[eid].type,
        x: Position.x[eid],
        y: Position.y[eid],
      })),
      buildQueue: this.state.buildQueue.all.map(t => ({ id: t.id, type: t.type, x: t.x, y: t.y })),
    }
  }

  handleAction(action: PlayerAction): ClientSnapshot {
    if (action.type === 'right-click') {
      this.handleRightClick(action.x, action.y)
    } else if (action.type === 'build') {
      this.addBuildTask(action.x, action.y, action.buildingType)
    }
    return this.generateSnapshot()
  }

  private handleRightClick(x: number, y: number): void {
    const target = { x, y }
    const colonist = this.getNearestColonist(target)
    if (colonist && this.state.map.isWalkable(x, y)) {
      if (colonist.state.phase !== 'idle') {
        colonist.transition({ phase: 'idle' })
      }
      this.releaseTile(colonist.position.x, colonist.position.y, colonist.id)
      const occupied = this.state.colonists
        .filter(c => c.id !== colonist.id && c.state.phase !== 'moving')
        .map(c => ({ x: Math.round(c.position.x), y: Math.round(c.position.y) }))
      const path = findPath(this.state.map, colonist.position, target, occupied)
      if (path.length > 0) {
        colonist.transition({ phase: 'moving', job: 'walk', path })
      }
    }
  }

  private placeInitialEntities(ecs: World, map: GameMap, type: BuildingType, positions: Vec2[]): void {
    const config = BUILDING_CONFIGS[type]
    for (const p of positions) {
      createBuildingEntity(ecs, p.x, p.y, type)
      map.setTile(p.x, p.y, config.tileType)
    }
  }

  private buildTaskCounter = 0

  addBuildTask(tileX: number, tileY: number, type: BuildingType): void {
    if (!this.canBuildAt(tileX, tileY)) return

    const task: BuildTask = {
      id: `build-${Date.now()}-${++this.buildTaskCounter}`,
      type,
      x: tileX,
      y: tileY,
      reservedBy: null,
    }
    this.state.buildQueue.add(task)
    this.jobDispatcher.onBuildQueued(task, this.state)
  }

  private canBuildAt(x: number, y: number): boolean {
    const tile = this.state.map.tileAt(x, y)
    if (tile.type === TileType.Rock || tile.type === TileType.Water) return false
    for (const eid of query(this.state.ecs, [Position])) {
      if (Position.x[eid] === x && Position.y[eid] === y) return false
    }
    return true
  }

  getNearestColonist(target: Vec2): Colonist | null {
    let nearest: Colonist | null = null
    let minDist = Infinity
    for (const c of this.state.colonists) {
      const dist = Math.abs(c.position.x - target.x) + Math.abs(c.position.y - target.y)
      if (dist < minDist) {
        minDist = dist
        nearest = c
      }
    }
    return nearest
  }

  togglePause(): void {
    if (this.paused) {
      this.speed = 1
      this.paused = false
      this.timeScale = 1
    } else {
      this.speed = 0
      this.paused = true
      this.timeScale = 0
    }
  }

  setSpeed(speed: number): void {
    this.speed = speed
    this.paused = speed === 0
    this.timeScale = speed === 2 ? 5 : speed === 3 ? 10 : speed
  }

  occupyTile(x: number, y: number, id: string): void {
    const tx = Math.round(x)
    const ty = Math.round(y)
    const occ = this.state.map.getOccupant(tx, ty)
    if (occ === null || occ === id) {
      this.state.map.clearOccupantFor(id)
      this.state.map.setOccupant(tx, ty, id)
    }
  }

  releaseTile(x: number, y: number, id: string): void {
    const tx = Math.round(x)
    const ty = Math.round(y)
    if (this.state.map.getOccupant(tx, ty) === id) {
      this.state.map.setOccupant(tx, ty, null)
    }
  }

  private findFreeNeighbor(x: number, y: number, maxRadius: number = 5): { x: number; y: number } | null {
    for (let r = 1; r <= maxRadius; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || nx >= this.state.map.width || ny < 0 || ny >= this.state.map.height) continue
          if (this.state.map.isWalkable(nx, ny) && this.state.map.getOccupant(nx, ny) === null) {
            return { x: nx, y: ny }
          }
        }
      }
    }
    return null
  }

  update(dt: number): ClientSnapshot {
    this.pipeline.update(dt, this.state)

    for (const colonist of this.state.colonists) {
      const s = colonist.state
      colonist.update(dt, this.state.map)
      const sAfter = colonist.state

      if (s.phase !== 'done' && sAfter.phase === 'done') {
        const job = sAfter.job
        const def = JOB_REGISTRY.get(job)
        if (def) {
          def.onComplete(colonist, this.state)
        }
        colonist.transition({ phase: 'idle' })
        if (job === 'sleep') {
          this.releaseTile(colonist.position.x, colonist.position.y, colonist.id)
          const free = this.findFreeNeighbor(
            Math.round(colonist.position.x),
            Math.round(colonist.position.y),
          )
          if (free) {
            colonist.position = free
            this.occupyTile(free.x, free.y, colonist.id)
          }
        } else {
          this.occupyTile(colonist.position.x, colonist.position.y, colonist.id)
        }
        this.jobDispatcher.assignBestJob(colonist.id, this.state)
      } else if (sAfter.phase === 'idle' && s.phase === 'moving') {
        this.jobDispatcher.cancelReservation(colonist, this.state)
        this.jobDispatcher.assignBestJob(colonist.id, this.state)
      }
    }

    for (const colonist of this.state.colonists) {
      if (colonist.state.phase === 'idle') {
        this.jobDispatcher.assignBestJob(colonist.id, this.state)
      }
    }

    return this.generateSnapshot()
  }

  destroy(): void {
    this.pipeline.destroy()
    JOB_REGISTRY.clear()
    STATUS_REGISTRY.clear()
  }
}

function serializeState(state: ColonistState): ClientSnapshot['colonists'][0]['state'] {
  if (state.phase === 'moving') return { phase: 'moving', job: state.job, path: state.path.map(p => ({ ...p })) }
  if (state.phase === 'working') return { phase: 'working', job: state.job }
  if (state.phase === 'done') return { phase: 'done', job: state.job }
  return { phase: 'idle' }
}

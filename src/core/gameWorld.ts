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
import { JobContext, ColonistState } from './colony/types'
import { Food } from './entities/food'
import { Bed } from './entities/bed'
import { Building, BuildQueue, BuildTask } from './entities/building'
import { NeedSystem } from './systems/needSystem'
import { StatusSystem } from './systems/statusSystem'
import { WorldSerializer, SaveData } from './worldSerializer'
import { findPath } from './world/pathfinding'
import { GameServer, ClientSnapshot, PlayerAction } from './types'

export class GameWorld implements GameServer {
  map: GameMap
  colonists: Colonist[]
  jobDispatcher: JobDispatcher
  buildQueue: BuildQueue

  foods: Food[]
  beds: Bed[]
  buildings: Building[]

  paused: boolean = false
  speed: number = 1
  timeScale: number = 1

  private needSystem = new NeedSystem()
  private statusSystem = new StatusSystem()

  constructor(savedState?: SaveData) {
    JOB_REGISTRY.register(eatJob)
    JOB_REGISTRY.register(sleepJob)
    JOB_REGISTRY.register(buildJob)
    JOB_REGISTRY.register(walkJob)
    STATUS_REGISTRY.register(hungryStatus)
    STATUS_REGISTRY.register(tiredStatus)

    this.jobDispatcher = new JobDispatcher()
    this.buildQueue = new BuildQueue()

    if (savedState) {
      const init = WorldSerializer.fromJSON(savedState)
      this.map = init.map
      this.colonists = init.colonists
      this.foods = init.foods
      this.beds = init.beds
      this.buildings = init.buildings
      this.buildQueue = init.buildQueue
      this.speed = [0, 1, 2, 3].includes(init.speed) ? init.speed : 2
      this.timeScale = this.speed === 2 ? 5 : this.speed === 3 ? 10 : this.speed
      this.paused = this.speed === 0
      for (let y = 0; y < this.map.height; y++) {
        for (let x = 0; x < this.map.width; x++) {
          this.map.setOccupant(x, y, null)
        }
      }
      for (const c of this.colonists) {
        this.occupyTile(c.position.x, c.position.y, c.id)
      }
    } else {
      this.map = new GameMap()
      this.colonists = createInitialColonists()
      for (const c of this.colonists) {
        this.occupyTile(c.position.x, c.position.y, c.id)
      }
      this.foods = this.placeInitialFood()
      this.beds = this.placeInitialBeds()
      this.buildings = []
    }
  }

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
    return WorldSerializer.toJSON(this)
  }

  private generateSnapshot(): ClientSnapshot {
    return {
      speed: this.speed,
      timeScale: this.timeScale,
      paused: this.paused,
      map: {
        width: this.map.width,
        height: this.map.height,
        tiles: Array.from({ length: this.map.height }, (_, y) =>
          Array.from({ length: this.map.width }, (_, x) => {
            const tile = this.map.tileAt(x, y)
            return { type: tile.type, occupant: tile.occupantId, walkable: tile.walkable }
          })
        ),
      },
      colonists: this.colonists.map(c => ({
        id: c.id,
        name: c.name,
        color: c.color,
        position: { ...c.position },
        needs: { ...c.needs },
        statuses: [...c.statuses],
        state: serializeState(c.state),
      })),
      foods: this.foods.map(f => ({ id: f.id, x: f.x, y: f.y })),
      beds: this.beds.map(b => ({ id: b.id, x: b.x, y: b.y })),
      buildings: this.buildings.map(b => ({ id: b.id, x: b.x, y: b.y })),
      buildQueue: this.buildQueue.all.map(t => ({ id: t.id, type: t.type, x: t.x, y: t.y })),
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
    if (colonist && this.map.isWalkable(x, y)) {
      if (colonist.state.phase !== 'idle') {
        colonist.transition({ phase: 'idle' })
      }
      this.releaseTile(colonist.position.x, colonist.position.y, colonist.id)
      const occupied = this.colonists
        .filter(c => c.id !== colonist.id && c.state.phase !== 'moving')
        .map(c => ({ x: Math.round(c.position.x), y: Math.round(c.position.y) }))
      const path = findPath(this.map, colonist.position, target, occupied)
      if (path.length > 0) {
        colonist.transition({ phase: 'moving', job: 'walk', path })
      }
    }
  }

  private placeInitialFood(): Food[] {
    const positions: Vec2[] = [
      { x: 8, y: 8 }, { x: 12, y: 8 }, { x: 8, y: 12 }, { x: 12, y: 12 }, { x: 10, y: 10 },
    ]
    return positions.map((p, i) => {
      this.map.setTile(p.x, p.y, TileType.Food)
      return new Food(`food-${i}`, p.x, p.y)
    })
  }

  private placeInitialBeds(): Bed[] {
    const positions: Vec2[] = [
      { x: 6, y: 6 }, { x: 14, y: 14 },
    ]
    return positions.map((p, i) => {
      this.map.setTile(p.x, p.y, TileType.Bed)
      return new Bed(`bed-${i}`, p.x, p.y)
    })
  }

  private buildTaskCounter = 0

  addBuildTask(tileX: number, tileY: number, type: 'wall' | 'bed' | 'food'): void {
    if (!this.canBuildAt(tileX, tileY)) return

    const task: BuildTask = {
      id: `build-${Date.now()}-${++this.buildTaskCounter}`,
      type,
      x: tileX,
      y: tileY,
      reservedBy: null,
    }
    this.buildQueue.add(task)
    this.jobDispatcher.onBuildQueued(task, this.getJobContext())
  }

  private canBuildAt(x: number, y: number): boolean {
    const tile = this.map.tileAt(x, y)
    if (tile.type === TileType.Rock || tile.type === TileType.Water) return false
    if (this.foods.some(f => f.x === x && f.y === y)) return false
    if (this.beds.some(b => b.x === x && b.y === y)) return false
    if (this.buildings.some(b => b.x === x && b.y === y)) return false
    return true
  }

  getNearestColonist(target: Vec2): Colonist | null {
    let nearest: Colonist | null = null
    let minDist = Infinity
    for (const c of this.colonists) {
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
    const occ = this.map.getOccupant(tx, ty)
    if (occ === null || occ === id) {
      this.map.clearOccupantFor(id)
      this.map.setOccupant(tx, ty, id)
    }
  }

  releaseTile(x: number, y: number, id: string): void {
    const tx = Math.round(x)
    const ty = Math.round(y)
    if (this.map.getOccupant(tx, ty) === id) {
      this.map.setOccupant(tx, ty, null)
    }
  }

  private findFreeNeighbor(x: number, y: number, maxRadius: number = 5): { x: number; y: number } | null {
    for (let r = 1; r <= maxRadius; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || nx >= this.map.width || ny < 0 || ny >= this.map.height) continue
          if (this.map.isWalkable(nx, ny) && this.map.getOccupant(nx, ny) === null) {
            return { x: nx, y: ny }
          }
        }
      }
    }
    return null
  }

  private getJobContext(): JobContext {
    return {
      map: this.map,
      colonists: this.colonists,
      foods: this.foods,
      beds: this.beds,
      buildings: this.buildings,
      buildQueue: this.buildQueue,
    }
  }

  update(dt: number): ClientSnapshot {
    const context = this.getJobContext()

    for (const colonist of this.colonists) {
      const s = colonist.state
      colonist.update(dt, this.map)
      const sAfter = colonist.state

      if (s.phase !== 'done' && sAfter.phase === 'done') {
        const job = sAfter.job
        const def = JOB_REGISTRY.get(job)
        if (def) {
          def.onComplete(colonist, context)
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
        this.jobDispatcher.assignBestJob(colonist.id, context)
      } else if (sAfter.phase === 'idle' && s.phase === 'moving') {
        this.jobDispatcher.cancelReservation(colonist, context)
        this.jobDispatcher.assignBestJob(colonist.id, context)
      }
    }

    this.needSystem.update(dt, this.colonists)
    this.statusSystem.update(dt, this.colonists)

    for (const colonist of this.colonists) {
      if (colonist.state.phase === 'idle') {
        this.jobDispatcher.assignBestJob(colonist.id, context)
      }
    }

    return this.generateSnapshot()
  }

  destroy(): void {
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

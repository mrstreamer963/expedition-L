import { GameMap } from './world/map'
import { TileType } from './world/tile'
import { Colonist, Vec2 } from './colony/colonist'
import { createInitialColonists } from './colony/colonistFactory'
import { Camera } from './camera'
import { UIState, BuildMode } from '../ui/types'
import { GameSpeed } from '../store/types'
import { JobDispatcher } from './colony/jobDispatcher'
import { eventBus } from './eventBus'
import { JOB_REGISTRY } from './colony/jobRegistry'
import { STATUS_REGISTRY } from './colony/statusRegistry'
import { eatJob } from './colony/jobs/eat'
import { sleepJob } from './colony/jobs/sleep'
import { buildJob } from './colony/jobs/build'
import { walkJob } from './colony/jobs/walk'
import { hungryStatus } from './colony/statuses/hungry'
import { tiredStatus } from './colony/statuses/tired'
import { JobContext } from './colony/types'
import { Food } from './entities/food'
import { Bed } from './entities/bed'
import { Building, BuildQueue, BuildTask } from './entities/building'
import { NeedSystem } from './systems/needSystem'
import { StatusSystem } from './systems/statusSystem'
import { WorldSerializer, SaveData } from './persistence/worldSerializer'

export class GameWorld {
  map: GameMap
  colonists: Colonist[]
  camera: Camera
  jobDispatcher: JobDispatcher
  buildQueue: BuildQueue

  foods: Food[]
  beds: Bed[]
  buildings: Building[]

  paused: boolean = false
  speed: GameSpeed = 1
  timeScale: number = 1

  selectedColonistId: string | null = null
  buildMode: BuildMode = 'none'
  hoveredTile: { x: number; y: number } | null = null
  onUiUpdate: ((state: UIState) => void) | null = null

  private uiUpdateTimer: number = 0
  private readonly UI_UPDATE_INTERVAL = 0.5

  private needSystem = new NeedSystem()
  private statusSystem = new StatusSystem()
  private autoSaveHandler: (() => void) | null = null
  private cleanupFns: (() => void)[] = []

  constructor(camera: Camera, savedState?: SaveData) {
    JOB_REGISTRY.register(eatJob)
    JOB_REGISTRY.register(sleepJob)
    JOB_REGISTRY.register(buildJob)
    JOB_REGISTRY.register(walkJob)
    STATUS_REGISTRY.register(hungryStatus)
    STATUS_REGISTRY.register(tiredStatus)

    this.jobDispatcher = new JobDispatcher()
    const idleHandler = (data: { colonistId: string }) => {
      this.jobDispatcher.assignBestJob(data.colonistId, this.getJobContext())
    }
    eventBus.on('colonist_idle', idleHandler)
    this.cleanupFns.push(() => eventBus.off('colonist_idle', idleHandler))

    const buildHandler = (data: { task: BuildTask }) => {
      this.jobDispatcher.onEvent({ type: 'build_queued', task: data.task }, this.getJobContext())
    }
    eventBus.on('build_queued', buildHandler)
    this.cleanupFns.push(() => eventBus.off('build_queued', buildHandler))

    const foodConsumedHandler = (data: { position: Vec2 }) => {
      this.jobDispatcher.onEvent({ type: 'food_consumed', position: data.position }, this.getJobContext())
    }
    eventBus.on('food_consumed', foodConsumedHandler)
    this.cleanupFns.push(() => eventBus.off('food_consumed', foodConsumedHandler))

    const foodBuiltHandler = (data: { position: Vec2 }) => {
      this.jobDispatcher.onEvent({ type: 'food_built', position: data.position }, this.getJobContext())
    }
    eventBus.on('food_built', foodBuiltHandler)
    this.cleanupFns.push(() => eventBus.off('food_built', foodBuiltHandler))

    this.buildQueue = new BuildQueue()

    if (savedState) {
      const init = WorldSerializer.fromJSON(savedState)
      this.map = init.map
      this.colonists = init.colonists
      this.foods = init.foods
      this.beds = init.beds
      this.buildings = init.buildings
      this.buildQueue = init.buildQueue
      this.camera = camera
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
      this.camera = camera
      this.foods = this.placeInitialFood()
      this.beds = this.placeInitialBeds()
      this.buildings = []
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

  addBuildTask(tileX: number, tileY: number): void {
    if (!this.canBuildAt(tileX, tileY)) {
      this.emitUiState()
      return
    }

    const task: BuildTask = {
      id: `build-${Date.now()}-${++this.buildTaskCounter}`,
      type: this.buildMode as 'wall' | 'bed' | 'food',
      x: tileX,
      y: tileY,
      reservedBy: null,
    }
    this.buildQueue.add(task)
    eventBus.emit('build_queued', { task })
    this.emitUiState()
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
    this.emitUiState()
  }

  setSpeed(speed: GameSpeed): void {
    this.speed = speed
    this.paused = speed === 0
    this.timeScale = speed === 2 ? 5 : speed === 3 ? 10 : speed
    this.emitUiState()
  }

  setBuildMode(mode: BuildMode): void {
    this.buildMode = mode
    this.emitUiState()
  }

  occupyTile(x: number, y: number, id: string): void {
    const tx = Math.round(x)
    const ty = Math.round(y)
    if (this.map.getOccupant(tx, ty) === null) {
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

  update(dt: number): void {
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
        this.occupyTile(colonist.position.x, colonist.position.y, colonist.id)
        eventBus.emit('colonist_idle', { colonistId: colonist.id })
      } else if (sAfter.phase === 'idle' && s.phase === 'moving') {
        this.jobDispatcher.cancelReservation(colonist, context)
        eventBus.emit('colonist_idle', { colonistId: colonist.id })
      }
    }

    this.needSystem.update(dt, this.colonists)
    this.statusSystem.update(dt, this.colonists)

    for (const colonist of this.colonists) {
      if (colonist.state.phase === 'idle') {
        this.jobDispatcher.assignBestJob(colonist.id, context)
      }
    }

    this.uiUpdateTimer += dt
    if (this.uiUpdateTimer >= this.UI_UPDATE_INTERVAL) {
      this.emitUiState()
      this.uiUpdateTimer = 0
    }
  }

  emitUiState(): void {
    if (!this.onUiUpdate) return

    const state: UIState = {
      timeScale: this.timeScale,
      speed: this.speed,
      foodCount: this.foods.length,
      colonistCount: this.colonists.length,
      selectedColonistId: this.selectedColonistId,
      colonists: this.colonists.map(c => ({
        id: c.id,
        name: c.name,
        color: c.color,
        stateLabel: c.state.phase,
        hunger: Math.round(c.needs.hunger),
        sleep: Math.round(c.needs.sleep),
        currentJob: c.state.phase === 'working' || c.state.phase === 'moving' || c.state.phase === 'done' ? c.state.job : null,
        position: c.position,
        statuses: [...c.statuses],
      })),
      buildMode: this.buildMode,
      hoveredTile: this.hoveredTile,
    }
    this.onUiUpdate(state)
  }

  destroy(): void {
    this.cleanupFns.forEach(fn => fn())
    this.cleanupFns = []
    if (this.autoSaveHandler) {
      window.removeEventListener('beforeunload', this.autoSaveHandler)
      this.autoSaveHandler = null
    }
  }
}

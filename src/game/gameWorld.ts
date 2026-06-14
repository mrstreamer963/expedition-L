import { GameMap } from './world/map'
import { TileType } from './world/tile'
import { Colonist, Vec2 } from './colony/colonist'
import { createInitialColonists } from './colony/colonistFactory'
import { Camera } from './camera'
import { GameLoop } from './gameLoop'
import { InputHandler } from './input/inputHandler'
import { findPath } from './world/pathfinding'
import { renderWorld } from '../render/worldRenderer'
import { UIState, BuildMode } from '../ui/types'
import { GameSpeed } from '../store/types'
import { JobDispatcher } from './colony/jobDispatcher'
import { eventBus } from './eventBus'
import { JOB_REGISTRY } from './colony/jobRegistry'
import { eatJob } from './colony/jobs/eat'
import { sleepJob } from './colony/jobs/sleep'
import { buildJob } from './colony/jobs/build'
import { walkJob } from './colony/jobs/walk'
import { JobContext } from './colony/types'
import { Food } from './entities/food'
import { Bed } from './entities/bed'
import { Building, BuildQueue, BuildTask } from './entities/building'
import { NeedSystem } from './systems/needSystem'
import { WorldSerializer, SaveData } from './persistence/worldSerializer'
import { saveToLocalStorage, AUTOSAVE_KEY } from './persistence/storage'
import { RenderSnapshot } from '../render/worldRenderer'

export class GameWorld {
  map: GameMap
  colonists: Colonist[]
  camera: Camera
  gameLoop: GameLoop
  inputHandler: InputHandler
  jobDispatcher: JobDispatcher
  buildQueue: BuildQueue

  foods: Food[]
  beds: Bed[]
  buildings: Building[]

  canvas: HTMLCanvasElement
  width: number
  height: number
  paused: boolean = false
  speed: GameSpeed = 1

  selectedColonistId: string | null = null
  buildMode: BuildMode = 'none'
  hoveredTile: { x: number; y: number } | null = null
  onUiUpdate: ((state: UIState) => void) | null = null

  private uiUpdateTimer: number = 0
  private readonly UI_UPDATE_INTERVAL = 0.5

  private needSystem = new NeedSystem()
  private autoSaveHandler: (() => void) | null = null
  private cleanupFns: (() => void)[] = []

  constructor(canvas: HTMLCanvasElement, savedState?: SaveData) {
    this.canvas = canvas
    this.width = canvas.width
    this.height = canvas.height

    JOB_REGISTRY.register(eatJob)
    JOB_REGISTRY.register(sleepJob)
    JOB_REGISTRY.register(buildJob)
    JOB_REGISTRY.register(walkJob)

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
    this.buildQueue = new BuildQueue()

    if (savedState) {
      const init = WorldSerializer.fromJSON(savedState)
      this.map = init.map
      this.colonists = init.colonists
      this.foods = init.foods
      this.beds = init.beds
      this.buildings = init.buildings
      this.buildQueue = init.buildQueue
      this.camera = init.camera
      this.speed = [0, 1, 2, 3].includes(init.speed) ? init.speed : 2
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
      this.camera = new Camera(this.width / 2, 100)
      this.foods = this.placeInitialFood()
      this.beds = this.placeInitialBeds()
      this.buildings = []
    }

    this.inputHandler = new InputHandler(this.camera, this.map, canvas)
    this.setupInputCallbacks()

    const initialSpeed = this.speed === 2 ? 5 : this.speed === 3 ? 10 : this.speed
    this.gameLoop = new GameLoop({
      canvas,
      onUpdate: (dt) => this.update(dt),
      onRender: (ctx, realDt) => this.render(ctx, realDt),
    })
    this.gameLoop.setSpeed(initialSpeed)
    this.gameLoop.start()
    this.emitUiState()

    this.autoSaveHandler = () => {
      const data = WorldSerializer.toJSON(this)
      saveToLocalStorage(AUTOSAVE_KEY, data)
    }
    window.addEventListener('beforeunload', this.autoSaveHandler)
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

  private setupInputCallbacks(): void {
    this.inputHandler.onTileClick = (tileX, tileY) => {
      if (this.buildMode !== 'none') {
        this.addBuildTask(tileX, tileY)
        return
      }
      const colonist = this.colonists.find(c =>
        Math.round(c.position.x) === tileX && Math.round(c.position.y) === tileY
      )
      this.selectedColonistId = colonist ? colonist.id : null
      this.emitUiState()
    }

    this.inputHandler.onRightClick = (tileX, tileY) => {
      const target = { x: tileX, y: tileY }
      const colonist = this.getNearestColonist(target)
      if (colonist && this.map.isWalkable(tileX, tileY)) {
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

    this.inputHandler.onTileHover = (tileX, tileY) => {
      if (tileX >= 0 && tileX < this.map.width && tileY >= 0 && tileY < this.map.height) {
        this.hoveredTile = { x: tileX, y: tileY }
      } else {
        this.hoveredTile = null
      }
    }

    this.inputHandler.onKey = (key) => {
      switch (key) {
        case ' ':
        case 'p':
        case 'P':
          this.togglePause()
          break
        case '1':
          this.setSpeed(0)
          break
        case '2':
          this.setSpeed(1)
          break
        case '3':
          this.setSpeed(2)
          break
        case '4':
          this.setSpeed(3)
          break
      }
    }
  }

  private addBuildTask(tileX: number, tileY: number): void {
    if (!this.canBuildAt(tileX, tileY)) {
      this.emitUiState()
      return
    }

    const task: BuildTask = {
      id: `build-${Date.now()}`,
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

  private getNearestColonist(target: Vec2): Colonist | null {
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
      this.gameLoop.setSpeed(1)
    } else {
      this.speed = 0
      this.paused = true
      this.gameLoop.setSpeed(0)
    }
    this.emitUiState()
  }

  setSpeed(speed: GameSpeed): void {
    this.speed = speed
    this.paused = speed === 0
    const timeScale = speed === 2 ? 5 : speed === 3 ? 10 : speed
    this.gameLoop.setSpeed(timeScale)
    this.emitUiState()
  }

  setBuildMode(mode: BuildMode): void {
    this.buildMode = mode
    this.emitUiState()
  }

  private occupyTile(x: number, y: number, id: string): void {
    const tx = Math.round(x)
    const ty = Math.round(y)
    if (this.map.getOccupant(tx, ty) === null) {
      this.map.setOccupant(tx, ty, id)
    }
  }

  private releaseTile(x: number, y: number, id: string): void {
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

  private update(dt: number): void {
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
        eventBus.emit('colonist_idle', { colonistId: colonist.id })
      }
    }

    this.needSystem.update(dt, this.colonists)

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

  private render(ctx: CanvasRenderingContext2D, realDt: number = 0): void {
    this.inputHandler.update(realDt)
    renderWorld(ctx, this.collectSnapshot())
  }

  private collectSnapshot(): RenderSnapshot {
    return {
      offsetX: this.camera.offsetX,
      offsetY: this.camera.offsetY,
      canvasWidth: this.width,
      canvasHeight: this.height,
      map: this.map,
      colonists: this.colonists,
      foods: this.foods,
      beds: this.beds,
      buildings: this.buildings,
      buildQueueTasks: this.buildQueue.all,
      hoveredTile: this.hoveredTile,
      selectedColonistId: this.selectedColonistId,
      buildMode: this.buildMode,
    }
  }

  private emitUiState(): void {
    if (!this.onUiUpdate) return

    const state: UIState = {
      timeScale: this.gameLoop.getSpeed(),
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
      })),
      buildMode: this.buildMode,
      hoveredTile: this.hoveredTile,
    }
    this.onUiUpdate(state)
  }

  destroy(): void {
    this.cleanupFns.forEach(fn => fn())
    this.cleanupFns = []
    this.gameLoop.destroy()
    if (this.autoSaveHandler) {
      window.removeEventListener('beforeunload', this.autoSaveHandler)
      this.autoSaveHandler = null
    }
  }
}

import { GameMap } from './world/map'
import { TileType, TILE_WIDTH, TILE_HEIGHT } from './world/tile'
import { Colonist, Vec2 } from './colony/colonist'
import { createInitialColonists } from './colony/colonistFactory'
import { Camera } from './camera'
import { GameLoop } from './gameLoop'
import { InputHandler } from './input/inputHandler'
import { findPath } from './world/pathfinding'
import { renderMap } from '../render/canvas'
import { drawColonist } from '../render/drawColonist'
import { drawWall3D } from '../render/drawWall3D'
import { drawShadow } from '../render/drawShadow'
import { tileToScreen } from './isoUtils'
import { UIState, BuildMode } from '../ui/types'
import { GameSpeed } from '../store/types'
import { JobSystem } from './colony/jobSystem'
import { WorkGiver } from './colony/workGiver'
import { Food } from './entities/food'
import { Bed } from './entities/bed'
import { Building, BuildQueue, BuildTask } from './entities/building'
import { WorldSerializer, SaveData } from './persistence/worldSerializer'
import { saveToLocalStorage, AUTOSAVE_KEY } from './persistence/storage'

export class GameWorld {
  // Core systems
  map: GameMap
  colonists: Colonist[]
  camera: Camera
  gameLoop: GameLoop
  inputHandler: InputHandler
  jobSystem: JobSystem
  workGiver: WorkGiver
  buildQueue: BuildQueue

  // Entities
  foods: Food[]
  beds: Bed[]
  buildings: Building[]

  // Game state
  canvas: HTMLCanvasElement
  width: number
  height: number
  paused: boolean = false
  speed: GameSpeed = 1

  // UI
  selectedColonistId: string | null = null
  buildMode: BuildMode = 'none'
  hoveredTile: { x: number; y: number } | null = null
  onUiUpdate: ((state: UIState) => void) | null = null

  // UI update timer
  private uiUpdateTimer: number = 0
  private readonly UI_UPDATE_INTERVAL = 0.5 // update UI every 0.5 seconds

  private autoSaveHandler: (() => void) | null = null

  constructor(canvas: HTMLCanvasElement, savedState?: SaveData) {
    this.canvas = canvas
    this.width = canvas.width
    this.height = canvas.height

    // Initialize core systems
    this.jobSystem = new JobSystem()
    this.workGiver = new WorkGiver()
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
      this.speed = init.speed
      this.paused = init.speed === 0
    } else {
      // Initialize new game
      this.map = new GameMap()
      this.colonists = createInitialColonists()
      for (const c of this.colonists) {
        this.occupyColonistTile(c)
      }
      this.camera = new Camera(this.width / 2, 100)
      this.foods = this.placeInitialFood()
      this.beds = this.placeInitialBeds()
      this.buildings = []
    }

    // Initialize input handler
    this.inputHandler = new InputHandler(this.camera, this.map, canvas)
    this.setupInputCallbacks()

    // Initialize game loop
    const initialSpeed = savedState ? (savedState.speed === 2 ? 5 : savedState.speed) : 1
    this.gameLoop = new GameLoop({
      canvas,
      onUpdate: (dt) => this.update(dt),
      onRender: (ctx) => this.render(ctx),
    })
    this.gameLoop.setSpeed(initialSpeed)

    // Start
    this.gameLoop.start()

    // Initial UI state
    this.emitUiState()

    // Auto-save on page unload
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
    // Left click: select colonist
    this.inputHandler.onTileClick = (tileX, tileY) => {
      if (this.buildMode !== 'none') {
        // Build mode: add to build queue
        this.addBuildTask(tileX, tileY)
        return
      }
      // Select colonist at position
      const colonist = this.colonists.find(c =>
        Math.round(c.position.x) === tileX && Math.round(c.position.y) === tileY
      )
      this.selectedColonistId = colonist ? colonist.id : null
      this.emitUiState()
    }

    // Right click: move command
    this.inputHandler.onRightClick = (tileX, tileY) => {
      // Find nearest idle colonist
      const target = { x: tileX, y: tileY }
      const colonist = this.getNearestColonist(target)
      if (colonist && this.map.isWalkable(tileX, tileY)) {
        const occupied = this.colonists
          .filter(c => c.id !== colonist.id && c.state !== 'walking')
          .map(c => ({ x: Math.round(c.position.x), y: Math.round(c.position.y) }))
        const path = findPath(this.map, colonist.position, target, occupied)
        if (path.length > 0) {
          this.releaseColonistTile(colonist)
          colonist.setPath(path)
          colonist.state = 'walking'
          colonist.currentJob = { type: 'walk', targetX: tileX, targetY: tileY }
        }
      }
    }

    // Mouse hover tracking (for build mode highlight)
    this.inputHandler.onTileHover = (tileX, tileY) => {
      if (tileX >= 0 && tileX < this.map.width && tileY >= 0 && tileY < this.map.height) {
        this.hoveredTile = { x: tileX, y: tileY }
      } else {
        this.hoveredTile = null
      }
    }

    // Keyboard shortcuts
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
      }
    }
  }

  private addBuildTask(tileX: number, tileY: number): void {
    // Validate
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
    this.emitUiState()
  }

  private canBuildAt(x: number, y: number): boolean {
    const tile = this.map.tileAt(x, y)
    if (tile.type === TileType.Rock ||
        tile.type === TileType.Water) {
      return false
    }
    // Check not occupied by another entity
    if (this.foods.some(f => f.x === x && f.y === y)) return false
    if (this.beds.some(b => b.x === x && b.y === y)) return false
    if (this.buildings.some(b => b.x === x && b.y === y)) return false
    return true
  }

  private consumeFood(colonist: Colonist): void {
    // Remove nearest food item and restore hunger
    const idx = this.foods.findIndex(f =>
      Math.round(f.x) === Math.round(colonist.position.x) &&
      Math.round(f.y) === Math.round(colonist.position.y)
    )
    if (idx !== -1) {
      this.foods.splice(idx, 1)
      colonist.needs.hunger = Math.min(100, colonist.needs.hunger + 40)
    }
  }

  private completeBuildAt(x: number, y: number): void {
    // Get the next build task from the queue
    const task = this.buildQueue.peek()
    if (!task) return

    const tx = Math.round(x)
    const ty = Math.round(y)
    if (task.x !== tx || task.y !== ty) return

    switch (task.type) {
      case 'wall':
        this.buildings.push(new Building(task.id, 'wall', tx, ty))
        this.map.setTile(tx, ty, TileType.Wall)
        break
      case 'bed':
        this.beds.push(new Bed(task.id, tx, ty))
        this.map.setTile(tx, ty, TileType.Bed)
        break
      case 'food':
        this.foods.push(new Food(task.id, tx, ty))
        this.map.setTile(tx, ty, TileType.Food)
        break
    }

    this.buildQueue.pop()
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

  // Speed controls
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
    const timeScale = speed === 2 ? 5 : speed
    this.gameLoop.setSpeed(timeScale)
    this.emitUiState()
  }

  setBuildMode(mode: BuildMode): void {
    this.buildMode = mode
    this.emitUiState()
  }

  // Occupy / release tile helpers
  private occupyColonistTile(colonist: Colonist): void {
    const tx = Math.round(colonist.position.x)
    const ty = Math.round(colonist.position.y)
    const current = this.map.getOccupant(tx, ty)
    if (current === null) {
      this.map.setOccupant(tx, ty, colonist.id)
    }
  }

  private releaseColonistTile(colonist: Colonist): void {
    const tx = Math.round(colonist.position.x)
    const ty = Math.round(colonist.position.y)
    if (this.map.getOccupant(tx, ty) === colonist.id) {
      this.map.setOccupant(tx, ty, null)
    }
  }

  // ===== GAME LOOP =====

  private update(dt: number): void {
    // Input (camera WASD)
    this.inputHandler.update(dt)

    // Update colonists movement
    for (const colonist of this.colonists) {
      const arrived = colonist.move(dt, this.map)
      if (arrived) {
        if (colonist.onArrive) {
          this.occupyColonistTile(colonist)
          colonist.onArrive()
          colonist.onArrive = null
        } else {
          // Cancelled mid-transit — release any reserved build task
          if (colonist.pendingBuildTaskId) {
            const task = this.buildQueue.all.find(t => t.id === colonist.pendingBuildTaskId)
            if (task) this.workGiver.release(task)
            colonist.pendingBuildTaskId = null
          }
          this.occupyColonistTile(colonist)
        }
      }
    }

    // Update colonist jobs (eating, sleeping, building) and apply effects on completion
    for (const colonist of this.colonists) {
      const prevJob = colonist.currentJob?.type
      const completed = colonist.updateJob(dt)
      if (completed && prevJob) {
        if (prevJob === 'eat') {
          this.consumeFood(colonist)
        } else if (prevJob === 'sleep') {
          colonist.needs.sleep = Math.min(100, colonist.needs.sleep + 60)
        } else if (prevJob === 'build') {
          this.completeBuildAt(colonist.position.x, colonist.position.y)
        }
        this.occupyColonistTile(colonist)
      }
    }

    // Update needs (hunger and sleep decrease over time)
    for (const colonist of this.colonists) {
      colonist.needs.hunger = Math.max(0, colonist.needs.hunger - 0.5 * dt)
      colonist.needs.sleep = Math.max(0, colonist.needs.sleep - 0.3 * dt)
    }

    // Job system tick (assign tasks periodically)
    this.jobSystem.tick(dt, this, this.workGiver)

    // UI update (throttled)
    this.uiUpdateTimer += dt
    if (this.uiUpdateTimer >= this.UI_UPDATE_INTERVAL) {
      this.emitUiState()
      this.uiUpdateTimer = 0
    }
  }

  private render(ctx: CanvasRenderingContext2D): void {
    // Clear canvas
    ctx.clearRect(0, 0, this.width, this.height)

    // Background
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, this.width, this.height)

    // Render map
    renderMap(ctx, this.map, this.camera.offsetX, this.camera.offsetY)

    // Render colonists with shadows (sorted by position for proper depth)
    const sortedColonists = [...this.colonists].sort(
      (a, b) => (a.position.x + a.position.y) - (b.position.x + b.position.y)
    )
    for (const colonist of sortedColonists) {
      const pos = colonist.getInterpolatedPosition()
      const { x: sx, y: sy } = tileToScreen(pos.x, pos.y)
      drawShadow(ctx, sx + this.camera.offsetX, sy + this.camera.offsetY)
      drawColonist(ctx, colonist, this.camera.offsetX, this.camera.offsetY)
    }

    // Render entities (food, beds, buildings)
    this.renderEntities(ctx)

    // Render build queue ghosts (pending constructions)
    this.renderBuildQueueGhosts(ctx)

    // Render hover/build highlight
    this.renderHighlight(ctx)

    // Render selection indicator
    this.renderSelection(ctx)

    // Render paths
    this.renderPaths(ctx)
  }

  private renderEntities(ctx: CanvasRenderingContext2D): void {
    const hh = TILE_HEIGHT / 2

    // Shadows for food and beds
    for (const food of this.foods) {
      const { x: sx, y: sy } = tileToScreen(food.x, food.y)
      drawShadow(ctx, sx + this.camera.offsetX, sy + this.camera.offsetY, 12, 5)
    }
    for (const bed of this.beds) {
      const { x: sx, y: sy } = tileToScreen(bed.x, bed.y)
      drawShadow(ctx, sx + this.camera.offsetX, sy + this.camera.offsetY, 24, 8)
    }

    // Food: red berry cluster
    for (const food of this.foods) {
      const { x: sx, y: sy } = tileToScreen(food.x, food.y)
      const fx = sx + this.camera.offsetX
      const fy = sy + this.camera.offsetY - hh - 4
      ctx.fillStyle = '#d44040'
      ctx.beginPath()
      ctx.arc(fx - 3, fy, 3, 0, Math.PI * 2)
      ctx.arc(fx + 3, fy - 1, 3, 0, Math.PI * 2)
      ctx.arc(fx + 1, fy + 2, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#e8d44d'
      ctx.beginPath()
      ctx.arc(fx - 3, fy, 1.5, 0, Math.PI * 2)
      ctx.arc(fx + 3, fy - 1, 1.5, 0, Math.PI * 2)
      ctx.arc(fx + 1, fy + 2, 1.5, 0, Math.PI * 2)
      ctx.fill()
    }

    // Beds: brown mattress with pillow
    for (const bed of this.beds) {
      const { x: sx, y: sy } = tileToScreen(bed.x, bed.y)
      const bx = sx + this.camera.offsetX
      const by = sy + this.camera.offsetY - hh - 4
      ctx.fillStyle = '#c49a6c'
      roundRect(ctx, bx - 14, by - 6, 28, 16, 3)
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.2)'
      ctx.lineWidth = 0.5
      ctx.stroke()
      // Pillow
      ctx.fillStyle = '#d4b080'
      roundRect(ctx, bx + 4, by - 4, 10, 8, 2)
      ctx.fill()
    }

    // Buildings (walls) — 3D rendering
    for (const building of this.buildings) {
      const { x: sx, y: sy } = tileToScreen(building.x, building.y)
      drawWall3D(ctx, sx + this.camera.offsetX, sy + this.camera.offsetY)
    }
  }

  private renderBuildQueueGhosts(ctx: CanvasRenderingContext2D): void {
    if (this.buildQueue.length === 0) return
    const hh = TILE_HEIGHT / 2

    ctx.save()
    ctx.globalAlpha = 0.35

    for (const task of this.buildQueue.all) {
      const { x: sx, y: sy } = tileToScreen(task.x, task.y)
      const cx = sx + this.camera.offsetX
      const cy = sy + this.camera.offsetY

      if (task.type === 'wall') {
        drawWall3D(ctx, cx, cy)
      } else if (task.type === 'bed') {
        ctx.fillStyle = '#c49a6c'
        roundRect(ctx, cx - 14, cy - hh - 10, 28, 16, 3)
        ctx.fill()
        ctx.fillStyle = '#d4b080'
        roundRect(ctx, cx + 4, cy - hh - 12, 10, 8, 2)
        ctx.fill()
      } else if (task.type === 'food') {
        ctx.fillStyle = '#d44040'
        ctx.beginPath()
        ctx.arc(cx - 3, cy - hh - 4, 3, 0, Math.PI * 2)
        ctx.arc(cx + 3, cy - hh - 5, 3, 0, Math.PI * 2)
        ctx.arc(cx + 1, cy - hh - 2, 3, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    ctx.restore()
  }

  private renderHighlight(ctx: CanvasRenderingContext2D): void {
    if (!this.hoveredTile) return
    const { x: sx, y: sy } = tileToScreen(this.hoveredTile.x, this.hoveredTile.y)
    const cx = sx + this.camera.offsetX
    const cy = sy + this.camera.offsetY
    const hw = TILE_WIDTH / 2, hh = TILE_HEIGHT / 2

    // Draw highlight diamond
    ctx.beginPath()
    ctx.moveTo(cx, cy - hh)
    ctx.lineTo(cx + hw, cy)
    ctx.lineTo(cx, cy + hh)
    ctx.lineTo(cx - hw, cy)
    ctx.closePath()

    if (this.buildMode !== 'none') {
      const canBuild = this.canBuildAt(this.hoveredTile.x, this.hoveredTile.y)
      ctx.fillStyle = canBuild ? 'rgba(0, 255, 0, 0.15)' : 'rgba(255, 0, 0, 0.2)'
      ctx.fill()
      ctx.strokeStyle = canBuild ? 'rgba(0, 255, 0, 0.8)' : 'rgba(255, 0, 0, 0.8)'
      ctx.lineWidth = 2
      ctx.stroke()

      // Ghost preview of the object being built
      ctx.save()
      ctx.globalAlpha = 0.35
      if (this.buildMode === 'wall') {
        drawWall3D(ctx, cx, cy)
      } else if (this.buildMode === 'bed') {
        ctx.fillStyle = '#c49a6c'
        roundRect(ctx, cx - 14, cy - hh - 10, 28, 16, 3)
        ctx.fill()
        ctx.fillStyle = '#d4b080'
        roundRect(ctx, cx + 4, cy - hh - 12, 10, 8, 2)
        ctx.fill()
      } else if (this.buildMode === 'food') {
        ctx.fillStyle = '#d44040'
        ctx.beginPath()
        ctx.arc(cx - 3, cy - hh - 4, 3, 0, Math.PI * 2)
        ctx.arc(cx + 3, cy - hh - 5, 3, 0, Math.PI * 2)
        ctx.arc(cx + 1, cy - hh - 2, 3, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    } else {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
      ctx.lineWidth = 1
      ctx.stroke()
    }
  }

  private renderSelection(ctx: CanvasRenderingContext2D): void {
    if (!this.selectedColonistId) return
    const colonist = this.colonists.find(c => c.id === this.selectedColonistId)
    if (!colonist) return

    const pos = colonist.getInterpolatedPosition()
    const { x: sx, y: sy } = tileToScreen(pos.x, pos.y)
    const hw = TILE_WIDTH / 2, hh = TILE_HEIGHT / 2

    ctx.beginPath()
    ctx.moveTo(sx + this.camera.offsetX, sy + this.camera.offsetY - hh)
    ctx.lineTo(sx + this.camera.offsetX + hw, sy + this.camera.offsetY)
    ctx.lineTo(sx + this.camera.offsetX, sy + this.camera.offsetY + hh)
    ctx.lineTo(sx + this.camera.offsetX - hw, sy + this.camera.offsetY)
    ctx.closePath()
    ctx.strokeStyle = '#ffff00'
    ctx.lineWidth = 2
    ctx.stroke()
  }

  private renderPaths(ctx: CanvasRenderingContext2D): void {
    for (const colonist of this.colonists) {
      if (colonist.path.length === 0 || colonist.state !== 'walking') continue

      ctx.beginPath()
      ctx.strokeStyle = colonist.color + '40' // 25% opacity
      ctx.lineWidth = 1

      for (let i = 0; i <= colonist.path.length; i++) {
        const pos = i === 0
          ? colonist.getInterpolatedPosition()
          : colonist.path[i - 1]
        const { x: sx, y: sy } = tileToScreen(pos.x, pos.y)

        if (i === 0) {
          ctx.moveTo(sx + this.camera.offsetX, sy + this.camera.offsetY - 8)
        } else {
          ctx.lineTo(sx + this.camera.offsetX, sy + this.camera.offsetY - 8)
        }
      }
      ctx.stroke()
    }
  }

  // Emit UI state to React
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
        state: c.state,
        hunger: Math.round(c.needs.hunger),
        sleep: Math.round(c.needs.sleep),
        currentJob: c.currentJob?.type || null,
        position: c.position,
      })),
      buildMode: this.buildMode,
      hoveredTile: this.hoveredTile,
    }
    this.onUiUpdate(state)
  }

  destroy(): void {
    this.gameLoop.destroy()
    if (this.autoSaveHandler) {
      window.removeEventListener('beforeunload', this.autoSaveHandler)
      this.autoSaveHandler = null
    }
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

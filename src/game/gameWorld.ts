import { GameMap } from './world/map'
import { TileType } from './world/tile'
import { Colonist, Vec2 } from './colony/colonist'
import { createInitialColonists } from './colony/colonistFactory'
import { Camera } from './camera'
import { GameLoop } from './gameLoop'
import { InputHandler } from './input/inputHandler'
import { findPath } from './world/pathfinding'
import { renderMap } from '../render/canvas'
import { drawColonist } from '../render/drawColonist'
import { tileToScreen } from './isoUtils'
import { UIState, BuildMode } from '../ui/types'
import { GameSpeed } from '../store/types'
import { JobSystem } from './colony/jobSystem'
import { Food } from './entities/food'
import { Bed } from './entities/bed'
import { Building, BuildQueue, BuildTask } from './entities/building'

export class GameWorld {
  // Core systems
  map: GameMap
  colonists: Colonist[]
  camera: Camera
  gameLoop: GameLoop
  inputHandler: InputHandler
  jobSystem: JobSystem
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

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.width = canvas.width
    this.height = canvas.height

    // Initialize systems
    this.map = new GameMap()
    this.colonists = createInitialColonists()
    this.camera = new Camera(this.width / 2, 100) // Center horizontally, offset vertically
    this.jobSystem = new JobSystem()
    this.buildQueue = new BuildQueue()

    // Place initial entities
    this.foods = this.placeInitialFood()
    this.beds = this.placeInitialBeds()
    this.buildings = []

    // Initialize input handler
    this.inputHandler = new InputHandler(this.camera, this.map, canvas)
    this.setupInputCallbacks()

    // Initialize game loop
    this.gameLoop = new GameLoop({
      canvas,
      onUpdate: (dt) => this.update(dt),
      onRender: (ctx) => this.render(ctx),
    })

    // Start
    this.gameLoop.start()

    // Initial UI state
    this.emitUiState()
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
    }

    // Right click: move command
    this.inputHandler.onRightClick = (tileX, tileY) => {
      // Find nearest idle colonist
      const target = { x: tileX, y: tileY }
      const colonist = this.getNearestColonist(target)
      if (colonist && this.map.isWalkable(tileX, tileY)) {
        const occupied = this.colonists
          .filter(c => c.id !== colonist.id)
          .map(c => ({ x: Math.round(c.position.x), y: Math.round(c.position.y) }))
        const path = findPath(this.map, colonist.position, target, occupied)
        if (path.length > 0) {
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
    if (!this.canBuildAt(tileX, tileY)) return

    const task: BuildTask = {
      id: `build-${Date.now()}`,
      type: this.buildMode as 'wall' | 'bed' | 'food',
      x: tileX,
      y: tileY,
    }
    this.buildQueue.add(task)

    // Assign to nearest colonist
    this.jobSystem.assignBuildJob(this, task)
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
  }

  setSpeed(speed: GameSpeed): void {
    this.speed = speed
    this.paused = speed === 0
    this.gameLoop.setSpeed(speed)
  }

  setBuildMode(mode: BuildMode): void {
    this.buildMode = mode
  }

  // ===== GAME LOOP =====

  private update(dt: number): void {
    // Input (camera WASD)
    this.inputHandler.update(dt)

    // Update colonists movement
    for (const colonist of this.colonists) {
      const arrived = colonist.move(dt)
      if (arrived && colonist.onArrive) {
        colonist.onArrive()
        colonist.onArrive = null
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
      }
    }

    // Update needs (hunger and sleep decrease over time)
    for (const colonist of this.colonists) {
      colonist.needs.hunger = Math.max(0, colonist.needs.hunger - 0.5 * dt)
      colonist.needs.sleep = Math.max(0, colonist.needs.sleep - 0.3 * dt)
    }

    // Job system tick (assign tasks periodically)
    this.jobSystem.tick(dt, this)

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

    // Render colonists (sorted by position for proper depth)
    const sortedColonists = [...this.colonists].sort(
      (a, b) => (a.position.x + a.position.y) - (b.position.x + b.position.y)
    )
    for (const colonist of sortedColonists) {
      drawColonist(ctx, colonist, this.camera.offsetX, this.camera.offsetY)
    }

    // Render entities (food, beds, buildings)
    this.renderEntities(ctx)

    // Render hover/build highlight
    this.renderHighlight(ctx)

    // Render selection indicator
    this.renderSelection(ctx)

    // Render paths
    this.renderPaths(ctx)
  }

  private renderEntities(ctx: CanvasRenderingContext2D): void {
    // Food: small yellow squares
    for (const food of this.foods) {
      const { x: sx, y: sy } = tileToScreen(food.x, food.y)
      ctx.fillStyle = '#e8d44d'
      ctx.fillRect(sx + this.camera.offsetX - 4, sy + this.camera.offsetY - 8 - 4, 8, 8)
    }

    // Beds: brown rectangles
    for (const bed of this.beds) {
      const { x: sx, y: sy } = tileToScreen(bed.x, bed.y)
      ctx.fillStyle = '#c49a6c'
      ctx.fillRect(sx + this.camera.offsetX - 10, sy + this.camera.offsetY - 8 - 6, 20, 12)
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'
      ctx.strokeRect(sx + this.camera.offsetX - 10, sy + this.camera.offsetY - 8 - 6, 20, 12)
    }

    // Buildings (walls)
    for (const building of this.buildings) {
      ctx.fillStyle = '#8b7355'
      const { x: sx2, y: sy2 } = tileToScreen(building.x, building.y)
      ctx.beginPath()
      const hw = 16, hh = 8
      ctx.moveTo(sx2 + this.camera.offsetX, sy2 + this.camera.offsetY - hh)
      ctx.lineTo(sx2 + this.camera.offsetX + hw, sy2 + this.camera.offsetY)
      ctx.lineTo(sx2 + this.camera.offsetX, sy2 + this.camera.offsetY + hh)
      ctx.lineTo(sx2 + this.camera.offsetX - hw, sy2 + this.camera.offsetY)
      ctx.closePath()
      ctx.fill()
    }
  }

  private renderHighlight(ctx: CanvasRenderingContext2D): void {
    if (!this.hoveredTile) return
    const { x: sx, y: sy } = tileToScreen(this.hoveredTile.x, this.hoveredTile.y)
    const hw = 16, hh = 8

    ctx.beginPath()
    ctx.moveTo(sx + this.camera.offsetX, sy + this.camera.offsetY - hh)
    ctx.lineTo(sx + this.camera.offsetX + hw, sy + this.camera.offsetY)
    ctx.lineTo(sx + this.camera.offsetX, sy + this.camera.offsetY + hh)
    ctx.lineTo(sx + this.camera.offsetX - hw, sy + this.camera.offsetY)
    ctx.closePath()

    if (this.buildMode !== 'none') {
      ctx.fillStyle = this.canBuildAt(this.hoveredTile.x, this.hoveredTile.y)
        ? 'rgba(0, 255, 0, 0.3)'
        : 'rgba(255, 0, 0, 0.3)'
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
    }
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  private renderSelection(ctx: CanvasRenderingContext2D): void {
    if (!this.selectedColonistId) return
    const colonist = this.colonists.find(c => c.id === this.selectedColonistId)
    if (!colonist) return

    const pos = colonist.getInterpolatedPosition()
    const { x: sx, y: sy } = tileToScreen(pos.x, pos.y)
    const hw = 16, hh = 8

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
  }
}

import { Camera } from '../geometry/camera'
import { GameWorld } from '../core/gameWorld'
import { GameLoop } from '../game/gameLoop'
import { InputHandler } from '../game/input/inputHandler'
import { renderWorld } from '../render/worldRenderer'
import { collectSnapshot, RenderSnapshot } from '../render/snapshot'
import { UIState, BuildMode } from '../ui/types'
import { SaveData, WorldSerializer } from '../core/worldSerializer'
import { saveToLocalStorage, AUTOSAVE_KEY } from '../game/persistence/storage'
import { findPath } from '../core/world/pathfinding'

export class GameController {
  world: GameWorld
  private camera: Camera
  private gameLoop: GameLoop
  private inputHandler: InputHandler
  private width: number
  private height: number
  private autoSaveCleanup: (() => void) | null = null
  private buildMode: BuildMode = 'none'
  private selectedColonistId: string | null = null
  private hoveredTile: { x: number; y: number } | null = null

  onUiUpdate: ((state: UIState) => void) | null = null

  constructor(canvas: HTMLCanvasElement, savedState?: SaveData) {
    this.width = canvas.width
    this.height = canvas.height

    this.camera = savedState && 'camera' in savedState
      ? new Camera((savedState as any).camera.offsetX, (savedState as any).camera.offsetY)
      : new Camera(this.width / 2, 100)

    this.world = new GameWorld(savedState)
    this.world.onStateChanged = () => this.emitUiState()
    this.emitUiState()

    this.inputHandler = new InputHandler(this.camera, this.world.map, canvas)
    this.setupInputCallbacks()

    const initialSpeed = this.world.speed === 2 ? 5 : this.world.speed === 3 ? 10 : this.world.speed
    this.gameLoop = new GameLoop({
      canvas,
      onUpdate: (dt) => this.world.update(dt),
      onRender: (ctx, realDt) => this.render(ctx, realDt),
    })
    this.gameLoop.setSpeed(initialSpeed)
    this.gameLoop.start()

    const autoSaveHandler = () => {
      const data = WorldSerializer.toJSON(this.world)
      saveToLocalStorage(AUTOSAVE_KEY, data)
    }
    window.addEventListener('beforeunload', autoSaveHandler)
    this.autoSaveCleanup = () => window.removeEventListener('beforeunload', autoSaveHandler)
  }

  private emitUiState(): void {
    if (!this.onUiUpdate) return
    this.world.pushState()
  }

  private setupInputCallbacks(): void {
    this.inputHandler.onTileClick = (tileX, tileY) => {
      if (this.buildMode !== 'none') {
        this.world.addBuildTask(tileX, tileY, this.buildMode as 'wall' | 'bed' | 'food')
        return
      }
      const colonist = this.world.colonists.find(c =>
        Math.round(c.position.x) === tileX && Math.round(c.position.y) === tileY
      )
      this.selectedColonistId = colonist ? colonist.id : null
      this.world.pushState()
    }

    this.inputHandler.onRightClick = (tileX, tileY) => {
      const target = { x: tileX, y: tileY }
      const colonist = this.world.getNearestColonist(target)
      if (colonist && this.world.map.isWalkable(tileX, tileY)) {
        if (colonist.state.phase !== 'idle') {
          colonist.transition({ phase: 'idle' })
        }
        this.world.releaseTile(colonist.position.x, colonist.position.y, colonist.id)
        const occupied = this.world.colonists
          .filter(c => c.id !== colonist.id && c.state.phase !== 'moving')
          .map(c => ({ x: Math.round(c.position.x), y: Math.round(c.position.y) }))
        const path = findPath(this.world.map, colonist.position, target, occupied)
        if (path.length > 0) {
          colonist.transition({ phase: 'moving', job: 'walk', path })
        }
      }
    }

    this.inputHandler.onTileHover = (tileX, tileY) => {
      if (tileX >= 0 && tileX < this.world.map.width && tileY >= 0 && tileY < this.world.map.height) {
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

  private render(ctx: CanvasRenderingContext2D, realDt: number = 0): void {
    this.inputHandler.update(realDt)
    renderWorld(ctx, this.collectSnapshot())
  }

  private collectSnapshot(): RenderSnapshot {
    return collectSnapshot({
      camera: this.camera,
      canvasWidth: this.width,
      canvasHeight: this.height,
      map: this.world.map,
      colonists: this.world.colonists,
      foods: this.world.foods,
      beds: this.world.beds,
      buildings: this.world.buildings,
      buildQueue: this.world.buildQueue,
      hoveredTile: this.hoveredTile,
      selectedColonistId: this.selectedColonistId,
      buildMode: this.buildMode,
    })
  }

  togglePause(): void {
    this.world.togglePause()
    this.gameLoop.setSpeed(this.world.paused ? 0 : (this.world.speed === 2 ? 5 : this.world.speed === 3 ? 10 : this.world.speed))
  }

  setSpeed(speed: number): void {
    this.world.setSpeed(speed)
    const timeScale = speed === 2 ? 5 : speed === 3 ? 10 : speed
    this.gameLoop.setSpeed(timeScale)
  }

  setBuildMode(mode: BuildMode): void {
    this.buildMode = mode
  }

  destroy(): void {
    this.autoSaveCleanup?.()
    this.gameLoop.destroy()
    this.world.destroy()
  }
}

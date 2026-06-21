import { Camera } from '../geometry/camera'
import { createGameServer, GameServer, ClientSnapshot, SaveData, BuildingType } from '../core'
import { GameLoop } from './gameLoop'
import { InputHandler } from './input/inputHandler'
import { renderWorld, RenderContext } from '../render'
import { UIState, BuildMode } from '../ui/types'

export class GameHost {
  private server: GameServer
  private gameLoop: GameLoop
  private inputHandler: InputHandler
  private camera: Camera
  private width: number
  private height: number
  private lastSnapshot: ClientSnapshot | null = null

  selectedColonistId: string | null = null
  buildMode: BuildMode = 'none'
  hoveredTile: { x: number; y: number } | null = null
  private displaySpeed: number = 1

  onUiUpdate: ((state: UIState) => void) | null = null

  constructor(canvas: HTMLCanvasElement, savedState?: SaveData) {
    this.width = canvas.width
    this.height = canvas.height

    this.camera = this.loadCamera(savedState)
    this.server = createGameServer(savedState)
    this.lastSnapshot = savedState ? this.server.load(savedState) : this.server.create()

    this.inputHandler = new InputHandler(this.camera, canvas)
    this.setupInputCallbacks()

    this.gameLoop = new GameLoop({
      canvas,
      onUpdate: (dt) => {
        this.lastSnapshot = this.server.update(dt)
        this.emitUIUpdate()
      },
      onRender: (ctx, realDt) => {
        if (!this.lastSnapshot) return
        this.inputHandler.update(realDt)
        renderWorld(ctx, this.lastSnapshot, this.getRenderContext())
      },
    })
    this.displaySpeed = savedState ? (savedState.speed as number) : 1
    const initialTimeScale = this.displaySpeed === 2 ? 5 : this.displaySpeed === 3 ? 10 : this.displaySpeed
    this.gameLoop.setSpeed(initialTimeScale)
    this.gameLoop.start()
  }

  private loadCamera(savedState?: SaveData): Camera {
    if (savedState && 'camera' in savedState) {
      const camData = (savedState as any).camera
      if (camData) return new Camera(camData.offsetX, camData.offsetY)
    }
    return new Camera(this.width / 2, 100)
  }

  private getRenderContext(): RenderContext {
    return {
      offsetX: this.camera.offsetX,
      offsetY: this.camera.offsetY,
      canvasWidth: this.width,
      canvasHeight: this.height,
      hoveredTile: this.hoveredTile,
      selectedColonistId: this.selectedColonistId,
      buildMode: this.buildMode,
    }
  }

  private setupInputCallbacks(): void {
    this.inputHandler.onTileClick = (tileX, tileY) => {
      if (this.buildMode !== 'none') {
        this.lastSnapshot = this.server.handleAction({
          type: 'build', x: tileX, y: tileY,
          buildingType: this.buildMode as BuildingType,
        })
        this.emitUIUpdate()
        return
      }
      if (!this.lastSnapshot) return
      const colonist = this.lastSnapshot.colonists.find(c =>
        Math.round(c.position.x) === tileX && Math.round(c.position.y) === tileY
      )
      this.selectedColonistId = colonist ? colonist.id : null
      this.emitUIUpdate()
    }

    this.inputHandler.onRightClick = (tileX, tileY) => {
      this.lastSnapshot = this.server.handleAction({ type: 'right-click', x: tileX, y: tileY, colonistId: this.selectedColonistId ?? undefined })
      this.emitUIUpdate()
    }

    this.inputHandler.onTileHover = (tileX, tileY) => {
      if (!this.lastSnapshot) return
      if (tileX >= 0 && tileX < this.lastSnapshot.map.width && tileY >= 0 && tileY < this.lastSnapshot.map.height) {
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

  private emitUIUpdate(): void {
    if (!this.onUiUpdate || !this.lastSnapshot) return
    const snap = this.lastSnapshot
    const speed = this.displaySpeed
    const timeScale = speed === 0 ? 0 : speed === 2 ? 5 : speed === 3 ? 10 : 1
    this.onUiUpdate({
      timeScale,
      speed: speed as 0 | 1 | 2 | 3,
      foodCount: snap.entities.filter(e => e.type === 'food').length,
      colonistCount: snap.colonists.length,
      selectedColonistId: this.selectedColonistId,
      colonists: snap.colonists.map(c => ({
        id: c.id,
        name: c.name,
        color: c.color,
        stateLabel: c.state.phase,
        hunger: Math.round(c.needs.hunger),
        sleep: Math.round(c.needs.sleep),
        currentJob: c.state.phase === 'working' || c.state.phase === 'moving' || c.state.phase === 'done' ? c.state.job ?? null : null,
        position: c.position,
        statuses: c.statuses,
      })),
      buildMode: this.buildMode,
      hoveredTile: this.hoveredTile,
    })
  }

  togglePause(): void {
    if (this.gameLoop.getSpeed() > 0) {
      this.displaySpeed = 0
      this.gameLoop.setSpeed(0)
    } else {
      this.displaySpeed = 1
      this.gameLoop.setSpeed(1)
    }
    this.emitUIUpdate()
  }

  setSpeed(speed: number): void {
    this.displaySpeed = speed
    const timeScale = speed === 2 ? 5 : speed === 3 ? 10 : speed
    this.gameLoop.setSpeed(timeScale)
    this.emitUIUpdate()
  }

  setBuildMode(mode: BuildMode): void {
    this.buildMode = mode
  }

  getSaveData(): SaveData & { camera: { offsetX: number; offsetY: number } } {
    const data = this.server.save()
    return {
      ...data,
      camera: this.camera.toJSON(),
    }
  }

  destroy(): void {
    this.gameLoop.destroy()
    this.server.destroy()
  }
}

import { Camera } from '../camera'
import { GameMap } from '../world/map'
import { screenToTile } from '../isoUtils'

export class InputHandler {
  private keys: Set<string> = new Set()
  private isDragging: boolean = false
  private dragStartX: number = 0
  private dragStartY: number = 0
  private dragCameraStartX: number = 0
  private dragCameraStartY: number = 0

  private camera: Camera
  private canvas: HTMLCanvasElement

  // Callbacks
  onTileClick: ((tileX: number, tileY: number, button: number) => void) | null = null
  onRightClick: ((tileX: number, tileY: number) => void) | null = null
  onTileHover: ((tileX: number, tileY: number) => void) | null = null
  onKey: ((key: string) => void) | null = null

  // Camera movement speed (pixels per key event)
  readonly CAMERA_SPEED = 8

  constructor(camera: Camera, _map: GameMap, canvas: HTMLCanvasElement) {
    this.camera = camera
    this.canvas = canvas
    this.bindEvents()
  }

  private bindEvents(): void {
    // Keyboard
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase())
      if (this.onKey) this.onKey(e.key)
    })
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase())
    })

    // Mouse drag for camera
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 1) { // Middle mouse - always drag
        this.startDrag(e)
        return
      }
      // Right click - command movement
      if (e.button === 2) {
        e.preventDefault()
        const rect = this.canvas.getBoundingClientRect()
        const mx = e.clientX - rect.left - this.camera.offsetX
        const my = e.clientY - rect.top - this.camera.offsetY
        const tile = screenToTile(mx, my)
        if (this.onRightClick) this.onRightClick(tile.x, tile.y)
        return
      }
    })

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault())

    this.canvas.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        this.updateDrag(e)
      }
      const rect = this.canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left - this.camera.offsetX
      const my = e.clientY - rect.top - this.camera.offsetY
      const tile = screenToTile(mx, my)
      if (this.onTileHover) this.onTileHover(tile.x, tile.y)
    })

    this.canvas.addEventListener('mouseup', () => {
      this.isDragging = false
    })

    // Left click on tile
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left - this.camera.offsetX
      const my = e.clientY - rect.top - this.camera.offsetY
      const tile = screenToTile(mx, my)
      if (this.onTileClick) this.onTileClick(tile.x, tile.y, e.button)
    })
  }

  private startDrag(e: MouseEvent): void {
    this.isDragging = true
    this.dragStartX = e.clientX
    this.dragStartY = e.clientY
    this.dragCameraStartX = this.camera.offsetX
    this.dragCameraStartY = this.camera.offsetY
  }

  private updateDrag(e: MouseEvent): void {
    const dx = e.clientX - this.dragStartX
    const dy = e.clientY - this.dragStartY
    this.camera.offsetX = this.dragCameraStartX + dx
    this.camera.offsetY = this.dragCameraStartY + dy
  }

  // Update camera from WASD keys (call each frame)
  update(dt: number): void {
    const speed = this.CAMERA_SPEED * dt * 60 // normalize to ~60fps
    if (this.keys.has('w') || this.keys.has('ц')) this.camera.pan(0, speed)
    if (this.keys.has('s') || this.keys.has('ы')) this.camera.pan(0, -speed)
    if (this.keys.has('a') || this.keys.has('ф')) this.camera.pan(speed, 0)
    if (this.keys.has('d') || this.keys.has('в')) this.camera.pan(-speed, 0)
  }

  // Convert mouse position to tile coordinates
  getTileAtMouse(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect()
    const mx = clientX - rect.left - this.camera.offsetX
    const my = clientY - rect.top - this.camera.offsetY
    return screenToTile(mx, my)
  }

  destroy(): void {
    // Events are on window/canvas - in a real app we'd clean these up
  }
}

export class Camera {
  offsetX: number
  offsetY: number

  constructor(initialX: number = 0, initialY: number = 0) {
    this.offsetX = initialX
    this.offsetY = initialY
  }

  // Pan the camera by delta
  pan(dx: number, dy: number): void {
    this.offsetX += dx
    this.offsetY += dy
  }

  // Smooth pan with lerp factor (for smooth camera movement)
  panSmooth(targetOffsetX: number, targetOffsetY: number, lerp: number = 0.1): void {
    this.offsetX += (targetOffsetX - this.offsetX) * lerp
    this.offsetY += (targetOffsetY - this.offsetY) * lerp
  }

  // Reset camera
  reset(x: number = 0, y: number = 0): void {
    this.offsetX = x
    this.offsetY = y
  }

  get x(): number { return this.offsetX }
  get y(): number { return this.offsetY }

  toJSON(): { offsetX: number; offsetY: number } {
    return { offsetX: this.offsetX, offsetY: this.offsetY }
  }
}

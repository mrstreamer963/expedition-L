export interface GameLoopConfig {
  onUpdate: (dt: number) => void
  onRender: (ctx: CanvasRenderingContext2D) => void
  canvas: HTMLCanvasElement
}

export class GameLoop {
  private config: GameLoopConfig
  private running: boolean = false
  private lastTime: number = 0
  private accumulator: number = 0
  private timeScale: number = 1.0
  private rafId: number | null = null

  private readonly TICK = 1 / 60 // 60 game ticks per second

  constructor(config: GameLoopConfig) {
    this.config = config
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.lastTime = performance.now()
    this.rafId = requestAnimationFrame((t) => this.loop(t))
  }

  stop(): void {
    this.running = false
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  setSpeed(speed: number): void {
    this.timeScale = Math.max(0, speed)
  }

  getSpeed(): number {
    return this.timeScale
  }

  private loop(timestamp: number): void {
    if (!this.running) return

    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1) // cap at 100ms
    this.lastTime = timestamp

    this.accumulator += dt * this.timeScale

    while (this.accumulator >= this.TICK) {
      this.config.onUpdate(this.TICK)
      this.accumulator -= this.TICK
    }

    // Render always once per frame
    const ctx = this.config.canvas.getContext('2d')
    if (ctx) {
      this.config.onRender(ctx)
    }

    this.rafId = requestAnimationFrame((t) => this.loop(t))
  }

  destroy(): void {
    this.stop()
  }
}

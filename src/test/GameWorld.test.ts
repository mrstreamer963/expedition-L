import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { GameWorld } from '../game/gameWorld'

describe('GameWorld speed controls', () => {
  let canvas: HTMLCanvasElement
  let game: GameWorld

  beforeEach(() => {
    canvas = document.createElement('canvas')
    canvas.width = 960
    canvas.height = 540
    vi.spyOn(canvas, 'getContext').mockReturnValue({
      canvas,
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      quadraticCurveTo: vi.fn(),
    } as unknown as CanvasRenderingContext2D)
    game = new GameWorld(canvas)
  })

  afterEach(() => {
    game.destroy()
  })

  it('starts at speed 1', () => {
    expect(game.speed).toBe(1)
  })

  it('setSpeed(0) sets speed to 0', () => {
    game.setSpeed(0)
    expect(game.speed).toBe(0)
  })

  it('setSpeed(2) sets speed to 2', () => {
    game.setSpeed(2)
    expect(game.speed).toBe(2)
  })

  it('togglePause toggles between 0 and 1', () => {
    game.setSpeed(1)
    game.togglePause()
    expect(game.speed).toBe(0)

    game.togglePause()
    expect(game.speed).toBe(1)
  })

  it('emits UI state on setSpeed(0) call', () => {
    const spy = vi.fn()
    game.onUiUpdate = spy
    game.setSpeed(0)
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ speed: 0 })
    )
  })

  it('emits UI state on togglePause call', () => {
    const spy = vi.fn()
    game.onUiUpdate = spy
    game.togglePause()
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ speed: 0 })
    )
  })
})

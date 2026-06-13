import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { GameWorld } from '../game/gameWorld'
import * as pathfinding from '../game/world/pathfinding'

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

describe('JobDispatcher need prioritization', () => {
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

  function assignJob(colonistId: string): void {
    const context = {
      map: game.map,
      colonists: game.colonists,
      foods: game.foods,
      beds: game.beds,
      buildings: game.buildings,
      buildQueue: game.buildQueue,
    }
    game.jobDispatcher.assignBestJob(colonistId, context)
  }

  it('chooses eating when only hunger is below threshold', () => {
    const c = game.colonists[0]
    c.position = { x: 10, y: 10 }
    c.needs = { hunger: 30, sleep: 80 }
    assignJob(c.id)
    expect(c.state.phase === 'working' && c.state.job === 'eat').toBe(true)
  })

  it('chooses sleeping when only sleep is below threshold', () => {
    const c = game.colonists[0]
    c.position = { x: 14, y: 14 }
    c.needs = { hunger: 80, sleep: 20 }
    assignJob(c.id)
    expect(c.state.phase === 'working' && c.state.job === 'sleep').toBe(true)
  })

  it('chooses the more urgent need when both are below threshold (hunger lower)', () => {
    const c = game.colonists[0]
    c.position = { x: 10, y: 10 }
    c.needs = { hunger: 10, sleep: 20 }
    assignJob(c.id)
    expect(c.state.phase === 'working' && c.state.job === 'eat').toBe(true)
  })

  it('chooses the more urgent need when both are below threshold (sleep lower)', () => {
    const c = game.colonists[0]
    c.position = { x: 14, y: 14 }
    c.needs = { hunger: 35, sleep: 5 }
    assignJob(c.id)
    expect(c.state.phase === 'working' && c.state.job === 'sleep').toBe(true)
  })

  it('chooses hunger when both needs are equally critical', () => {
    const c = game.colonists[0]
    c.position = { x: 10, y: 10 }
    c.needs = { hunger: 0, sleep: 0 }
    assignJob(c.id)
    expect(c.state.phase === 'working' && c.state.job === 'eat').toBe(true)
  })

  it('falls back to sleeping when food is not available but bed is', () => {
    const c = game.colonists[0]
    c.position = { x: 14, y: 14 }
    c.needs = { hunger: 0, sleep: 0 }
    game.foods = []
    assignJob(c.id)
    expect(c.state.phase === 'working' && c.state.job === 'sleep').toBe(true)
  })

  it('falls back to eating when bed is not available but food is', () => {
    const c = game.colonists[0]
    c.position = { x: 10, y: 10 }
    c.needs = { hunger: 0, sleep: 0 }
    game.beds = []
    assignJob(c.id)
    expect(c.state.phase === 'working' && c.state.job === 'eat').toBe(true)
  })

  it('does not reassign a colonist who is already working', () => {
    const c = game.colonists[0]
    c.position = { x: 10, y: 10 }
    c.needs = { hunger: 30, sleep: 20 }
    c.transition({ phase: 'working', job: 'eat', progress: 0, duration: 0.5 })
    assignJob(c.id)
    expect(c.state.phase === 'working' && c.state.job === 'eat').toBe(true)
  })

  it('targets the nearest unoccupied bed when the closest bed is occupied by another colonist', () => {
    const c = game.colonists[0]
    c.position = { x: 10, y: 10 }
    c.needs = { hunger: 50, sleep: 20 }
    game.colonists[1].position = { x: 6, y: 6 }
    game.foods = []
    const mock = vi.spyOn(pathfinding, 'findPath').mockReturnValue([{ x: 14, y: 14 }])
    assignJob(c.id)
    mock.mockRestore()
    expect(c.state.phase === 'moving').toBe(true)
  })
})

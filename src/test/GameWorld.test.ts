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

describe('JobSystem need prioritization', () => {
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

  it('chooses eating when only hunger is below threshold', () => {
    const c = game.colonists[0]
    c.position = { x: 10, y: 10 }
    c.needs = { hunger: 30, sleep: 80 }
    game.jobSystem.tick(2, game, game.workGiver)
    expect(c.state).toBe('eating')
    expect(c.currentJob?.type).toBe('eat')
  })

  it('chooses sleeping when only sleep is below threshold', () => {
    const c = game.colonists[0]
    c.position = { x: 14, y: 14 }
    c.needs = { hunger: 80, sleep: 20 }
    game.jobSystem.tick(2, game, game.workGiver)
    expect(c.state).toBe('sleeping')
    expect(c.currentJob?.type).toBe('sleep')
  })

  it('chooses the more urgent need when both are below threshold (hunger lower)', () => {
    const c = game.colonists[0]
    c.position = { x: 10, y: 10 }
    c.needs = { hunger: 10, sleep: 20 }
    game.jobSystem.tick(2, game, game.workGiver)
    expect(c.state).toBe('eating')
    expect(c.currentJob?.type).toBe('eat')
  })

  it('chooses the more urgent need when both are below threshold (sleep lower)', () => {
    const c = game.colonists[0]
    c.position = { x: 14, y: 14 }
    c.needs = { hunger: 35, sleep: 5 }
    game.jobSystem.tick(2, game, game.workGiver)
    expect(c.state).toBe('sleeping')
    expect(c.currentJob?.type).toBe('sleep')
  })

  it('chooses hunger when both needs are equally critical', () => {
    const c = game.colonists[0]
    c.position = { x: 10, y: 10 }
    c.needs = { hunger: 0, sleep: 0 }
    game.jobSystem.tick(2, game, game.workGiver)
    expect(c.state).toBe('eating')
    expect(c.currentJob?.type).toBe('eat')
  })

  it('falls back to sleeping when food is not available but bed is', () => {
    const c = game.colonists[0]
    c.position = { x: 14, y: 14 }
    c.needs = { hunger: 0, sleep: 0 }
    game.foods = []
    game.jobSystem.tick(2, game, game.workGiver)
    expect(c.state).toBe('sleeping')
    expect(c.currentJob?.type).toBe('sleep')
  })

  it('falls back to eating when bed is not available but food is', () => {
    const c = game.colonists[0]
    c.position = { x: 10, y: 10 }
    c.needs = { hunger: 0, sleep: 0 }
    game.beds = []
    game.jobSystem.tick(2, game, game.workGiver)
    expect(c.state).toBe('eating')
    expect(c.currentJob?.type).toBe('eat')
  })

  it('does not reassign a colonist who is already eating', () => {
    const c = game.colonists[0]
    c.position = { x: 10, y: 10 }
    c.needs = { hunger: 30, sleep: 20 }
    c.state = 'eating'
    c.currentJob = { type: 'eat' }
    game.jobSystem.tick(2, game, game.workGiver)
    expect(c.state).toBe('eating')
    expect(c.currentJob?.type).toBe('eat')
  })

  it('does not reassign a colonist who is already sleeping', () => {
    const c = game.colonists[0]
    c.position = { x: 14, y: 14 }
    c.needs = { hunger: 30, sleep: 20 }
    c.state = 'sleeping'
    c.currentJob = { type: 'sleep' }
    game.jobSystem.tick(2, game, game.workGiver)
    expect(c.state).toBe('sleeping')
    expect(c.currentJob?.type).toBe('sleep')
  })

  it('targets the nearest unoccupied bed when the closest bed is occupied by another colonist', () => {
    const c = game.colonists[0]
    c.position = { x: 10, y: 10 }
    c.needs = { hunger: 50, sleep: 20 }
    game.colonists[1].position = { x: 6, y: 6 }
    game.foods = []
    const mock = vi.spyOn(pathfinding, 'findPath').mockReturnValue([{ x: 14, y: 14 }])
    game.jobSystem.tick(2, game, game.workGiver)
    mock.mockRestore()
    expect(c.state).toBe('walking')
    expect(c.targetPosition?.x).toBe(14)
    expect(c.targetPosition?.y).toBe(14)
  })
})

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { GameWorld } from '../game/gameWorld'
import { Camera } from '../game/camera'
import { Food } from '../game/entities/food'
import { Bed } from '../game/entities/bed'
import * as pathfinding from '../game/world/pathfinding'

describe('GameWorld speed controls', () => {
  let game: GameWorld

  beforeEach(() => {
    const camera = new Camera(480, 270)
    game = new GameWorld(camera)
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

describe('JobDispatcher status-driven job selection', () => {
  let game: GameWorld

  beforeEach(() => {
    const camera = new Camera(480, 270)
    game = new GameWorld(camera)
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

  it('chooses eat when only hungry status is active', () => {
    const c = game.colonists[0]
    c.position = { x: 10, y: 10 }
    c.needs = { hunger: 30, sleep: 80 }
    c.statuses.add('hungry')
    assignJob(c.id)
    expect(c.state.phase === 'working' && c.state.job === 'eat').toBe(true)
  })

  it('chooses sleep when only tired status is active', () => {
    const c = game.colonists[0]
    c.position = { x: 14, y: 14 }
    c.needs = { hunger: 80, sleep: 20 }
    c.statuses.add('tired')
    assignJob(c.id)
    expect(c.state.phase === 'working' && c.state.job === 'sleep').toBe(true)
  })

  it('chooses eat when hungry is active (higher priority than tired)', () => {
    const c = game.colonists[0]
    c.position = { x: 10, y: 10 }
    c.needs = { hunger: 10, sleep: 20 }
    c.statuses.add('hungry')
    c.statuses.add('tired')
    assignJob(c.id)
    expect(c.state.phase === 'working' && c.state.job === 'eat').toBe(true)
  })

  it('chooses hungry over tired when both are active (hunger has higher priority)', () => {
    const c = game.colonists[0]
    c.position = { x: 14, y: 14 }
    c.needs = { hunger: 35, sleep: 5 }
    c.statuses.add('hungry')
    c.statuses.add('tired')
    assignJob(c.id)
    expect(c.state.phase === 'moving').toBe(true)
  })

  it('chooses eat when both statuses active (hunger has higher priority)', () => {
    const c = game.colonists[0]
    c.position = { x: 10, y: 10 }
    c.needs = { hunger: 0, sleep: 0 }
    c.statuses.add('hungry')
    c.statuses.add('tired')
    assignJob(c.id)
    expect(c.state.phase === 'working' && c.state.job === 'eat').toBe(true)
  })

  it('falls back to sleep when food is not available but bed is', () => {
    const c = game.colonists[0]
    c.position = { x: 14, y: 14 }
    c.needs = { hunger: 0, sleep: 0 }
    game.foods = []
    c.statuses.add('hungry')
    c.statuses.add('tired')
    assignJob(c.id)
    expect(c.state.phase === 'working' && c.state.job === 'sleep').toBe(true)
  })

  it('falls back to eat when bed is not available but food is', () => {
    const c = game.colonists[0]
    c.position = { x: 10, y: 10 }
    c.needs = { hunger: 0, sleep: 0 }
    game.beds = []
    c.statuses.add('hungry')
    c.statuses.add('tired')
    assignJob(c.id)
    expect(c.state.phase === 'working' && c.state.job === 'eat').toBe(true)
  })

  it('does not reassign a colonist who is already working', () => {
    const c = game.colonists[0]
    c.position = { x: 10, y: 10 }
    c.needs = { hunger: 30, sleep: 20 }
    c.statuses.add('hungry')
    c.statuses.add('tired')
    c.transition({ phase: 'working', job: 'eat', progress: 0, duration: 0.5 })
    assignJob(c.id)
    expect(c.state.phase === 'working' && c.state.job === 'eat').toBe(true)
  })

  it('targets the nearest unoccupied bed when the closest bed is occupied by another colonist', () => {
    const c = game.colonists[0]
    c.position = { x: 10, y: 10 }
    c.needs = { hunger: 50, sleep: 20 }
    c.statuses.add('tired')
    game.colonists[1].position = { x: 6, y: 6 }
    game.foods = []
    const mock = vi.spyOn(pathfinding, 'findPath').mockReturnValue([{ x: 14, y: 14 }])
    assignJob(c.id)
    mock.mockRestore()
    expect(c.state.phase === 'moving').toBe(true)
  })
})

describe('Colonist occupancy collision prevention', () => {
  let game: GameWorld

  beforeEach(() => {
    const camera = new Camera(480, 270)
    game = new GameWorld(camera)
  })

  afterEach(() => {
    game.destroy()
  })

  it('moving colonist aborts and reclaims current tile when next tile is occupied', () => {
    const a = game.colonists[0]
    const b = game.colonists[1]

    a.position = { x: 5, y: 5 }
    a.transition({ phase: 'working', job: 'eat', progress: 0, duration: 1 })
    game.map.setOccupant(5, 5, a.id)

    b.position = { x: 5, y: 4 }
    game.map.setOccupant(5, 4, b.id)
    b.transition({ phase: 'moving', job: 'walk', path: [{ x: 5, y: 5 }] })

    b.update(1, game.map)

    expect(b.state.phase).toBe('idle')
    expect(game.map.getOccupant(5, 5)).toBe(a.id)
    expect(game.map.getOccupant(5, 4)).toBe(b.id)
  })

  it('moving colonist reclaims current tile when tile was already released by sendTo', () => {
    const a = game.colonists[0]
    const b = game.colonists[1]

    a.position = { x: 5, y: 5 }
    a.transition({ phase: 'working', job: 'eat', progress: 0, duration: 1 })
    game.map.setOccupant(5, 5, a.id)

    // B's tile was released by sendTo before transitioning to moving
    b.position = { x: 5, y: 4 }
    b.transition({ phase: 'moving', job: 'walk', path: [{ x: 5, y: 5 }] })

    b.update(1, game.map)

    expect(b.state.phase).toBe('idle')
    expect(game.map.getOccupant(5, 5)).toBe(a.id)
    expect(game.map.getOccupant(5, 4)).toBe(b.id)
  })

  it('cannot target food tile already occupied by another colonist', () => {
    const a = game.colonists[0]
    const b = game.colonists[1]

    a.position = { x: 8, y: 8 }
    a.needs = { hunger: 30, sleep: 80 }
    a.statuses.add('hungry')
    a.transition({ phase: 'working', job: 'eat', progress: 0, duration: 1 })
    game.map.setOccupant(8, 8, a.id)

    // B is far from all food, nearest food is (8,8) but A is there
    b.position = { x: 20, y: 15 }
    b.needs = { hunger: 30, sleep: 80 }
    b.statuses.add('hungry')

    const context = {
      map: game.map,
      colonists: game.colonists,
      foods: game.foods,
      beds: game.beds,
      buildings: game.buildings,
      buildQueue: game.buildQueue,
    }
    game.jobDispatcher.assignBestJob(b.id, context)

    expect(b.state.phase).toBe('moving')
    if (b.state.phase === 'moving') {
      const dest = b.state.path[b.state.path.length - 1]
      expect(dest.x === 8 && dest.y === 8).toBe(false)
    }
  })

  it('cannot target occupied bed when colonist is already standing on it', () => {
    const a = game.colonists[0]
    const b = game.colonists[1]

    a.position = { x: 6, y: 6 }
    a.needs = { hunger: 80, sleep: 20 }
    a.statuses.add('tired')
    a.transition({ phase: 'working', job: 'sleep', progress: 0, duration: 10 })
    game.map.setOccupant(6, 6, a.id)

    b.position = { x: 6, y: 6 }
    b.needs = { hunger: 80, sleep: 20 }
    b.statuses.add('tired')

    const context = {
      map: game.map,
      colonists: game.colonists,
      foods: [],
      beds: game.beds,
      buildings: game.buildings,
      buildQueue: game.buildQueue,
    }
    game.jobDispatcher.assignBestJob(b.id, context)

    expect(game.map.getOccupant(6, 6)).toBe(a.id)
    expect(b.state.phase).not.toBe('working')
  })

  it('sendTo direct-to-working path rejects occupied tile', () => {
    const a = game.colonists[0]
    const b = game.colonists[1]

    a.position = { x: 8, y: 8 }
    a.needs = { hunger: 30, sleep: 80 }
    a.transition({ phase: 'working', job: 'eat', progress: 0, duration: 1 })
    game.map.setOccupant(8, 8, a.id)

    // B on the same tile, only one food exists
    b.position = { x: 8, y: 8 }
    b.needs = { hunger: 30, sleep: 80 }
    a.statuses.add('hungry')
    b.statuses.add('hungry')

    const context = {
      map: game.map,
      colonists: game.colonists,
      foods: game.foods.filter(f => f.x === 8 && f.y === 8),
      beds: [],
      buildings: game.buildings,
      buildQueue: game.buildQueue,
    }
    game.jobDispatcher.assignBestJob(b.id, context)

    expect(b.state.phase).toBe('idle')
    expect(game.map.getOccupant(8, 8)).toBe(a.id)
  })

  it('retries alternative food when nearest food path cannot be found', () => {
    const b = game.colonists[0]
    b.position = { x: 5, y: 5 }
    b.needs = { hunger: 30, sleep: 80 }
    b.statuses.add('hungry')

    game.foods = [
      new Food('f1', 8, 5),
      new Food('f2', 12, 5),
    ]
    game.beds = []

    const original = pathfinding.findPath
    const mock = vi.spyOn(pathfinding, 'findPath').mockImplementation((map, start, end, occupied) => {
      if (end.x === 8 && end.y === 5) return []
      return original(map, start, end, occupied)
    })

    const context = {
      map: game.map,
      colonists: game.colonists,
      foods: game.foods,
      beds: [],
      buildings: game.buildings,
      buildQueue: game.buildQueue,
    }
    game.jobDispatcher.assignBestJob(b.id, context)

    mock.mockRestore()

    expect(b.state.phase).toBe('moving')
    if (b.state.phase === 'moving') {
      const dest = b.state.path[b.state.path.length - 1]
      expect(dest).toEqual({ x: 12, y: 5 })
    }
  })

  it('retries alternative bed when nearest bed path cannot be found', () => {
    const b = game.colonists[0]
    b.position = { x: 5, y: 5 }
    b.needs = { hunger: 80, sleep: 20 }
    b.statuses.add('tired')

    game.foods = []
    game.beds = [
      new Bed('bed1', 6, 6),
      new Bed('bed2', 14, 14),
    ]

    const original = pathfinding.findPath
    const mock = vi.spyOn(pathfinding, 'findPath').mockImplementation((map, start, end, occupied) => {
      if (end.x === 6 && end.y === 6) return []
      return original(map, start, end, occupied)
    })

    const context = {
      map: game.map,
      colonists: game.colonists,
      foods: [],
      beds: game.beds,
      buildings: game.buildings,
      buildQueue: game.buildQueue,
    }
    game.jobDispatcher.assignBestJob(b.id, context)

    mock.mockRestore()

    expect(b.state.phase).toBe('moving')
    if (b.state.phase === 'moving') {
      const dest = b.state.path[b.state.path.length - 1]
      expect(dest).toEqual({ x: 14, y: 14 })
    }
  })

  it('two colonists sharing a tile after updateMoving is impossible', () => {
    const a = game.colonists[0]
    const b = game.colonists[1]

    a.position = { x: 5, y: 5 }
    game.map.setOccupant(5, 5, a.id)

    b.position = { x: 7, y: 5 }
    game.map.setOccupant(7, 5, b.id)
    b.transition({ phase: 'moving', job: 'walk', path: [{ x: 6, y: 5 }, { x: 5, y: 5 }] })

    // dt=1 gives speed 3 units, enough to move 1-2 tiles
    b.update(1, game.map)

    expect(b.state.phase).toBe('idle')
    expect(game.map.getOccupant(5, 5)).toBe(a.id)
    // B should be somewhere but NOT at (5,5)
    expect( Math.round(b.position.x) !== 5 || Math.round(b.position.y) !== 5 ).toBe(true)
  })
})

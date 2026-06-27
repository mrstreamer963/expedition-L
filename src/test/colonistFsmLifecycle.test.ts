import { query, removeEntity } from 'bitecs'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { GameWorld } from '../core/gameWorld'
import { JOB_REGISTRY } from '../core/colony/jobRegistry'
import { STATUS_REGISTRY } from '../core/colony/statusRegistry'
import { BuildTask } from '../core/colony/buildQueue'
import { TileType } from '../core/world/tile'
import { Position, Edible, Sleepable } from '../core/components'

describe('Colonist FSM lifecycle', () => {
  let game: GameWorld

  beforeEach(() => {
    JOB_REGISTRY.clear()
    STATUS_REGISTRY.clear()
    game = new GameWorld()
    for (const c of game.colonists) {
      c.needs = { hunger: 80, sleep: 80 }
      c.statuses.clear()
    }
  })

  afterEach(() => {
    game.destroy()
  })

  it('1.1 progresses through idle → moving → working → done → idle with tile occupancy', () => {
    const c = game.colonists[0]
    c.position = { x: 5, y: 5 }
    game.map.clearOccupantFor(c.id)
    game.map.setOccupant(5, 5, c.id)

    expect(c.state.phase).toBe('idle')

    c.transition({ phase: 'moving', job: 'walk', path: [
      { x: 5, y: 6 }, { x: 5, y: 7 }, { x: 5, y: 8 }, { x: 5, y: 9 },
    ]})
    game.map.setOccupant(5, 5, null)
    game.map.setOccupant(5, 5, c.id)

    c.update(1, game.map)
    expect(c.state.phase).toBe('moving')
    expect(Math.round(c.position.y)).toBe(8)
    expect(game.map.getOccupant(5, 8)).toBe(c.id)
    expect(game.map.getOccupant(5, 5)).toBeNull()

    c.update(1, game.map)
    expect(c.state.phase).toBe('working')
    if (c.state.phase === 'working') {
      expect(c.state.job).toBe('walk')
    }
    expect(Math.round(c.position.y)).toBe(9)
    expect(game.map.getOccupant(5, 9)).toBe(c.id)

    c.update(0.1, game.map)
    expect(c.state.phase).toBe('done')
    if (c.state.phase === 'done') {
      expect(c.state.job).toBe('walk')
    }

    c.transition({ phase: 'idle' })
    expect(c.state.phase).toBe('idle')
  })

  it('1.2 colonist eats food end-to-end', () => {
    const c = game.colonists[0]
    c.position = { x: 8, y: 8 }
    c.needs = { hunger: 10, sleep: 80 }
    game.map.clearOccupantFor(c.id)
    game.map.setOccupant(8, 8, c.id)
    for (const eid of query(game.state.ecs, [Edible])) {
      if (Position.x[eid] !== 8 || Position.y[eid] !== 8) removeEntity(game.state.ecs, eid)
    }

    game.update(1)
    expect(c.state.phase === 'working' && c.state.job).toBe('eat')

    game.update(0.5)
    expect(c.needs.hunger).toBeCloseTo(49.25)
    expect(Array.from(query(game.state.ecs, [Edible])).length).toBe(0)
    expect(c.state.phase).toBe('idle')
  })

  it('1.3 colonist sleeps in bed end-to-end', () => {
    const c = game.colonists[1]
    c.position = { x: 6, y: 6 }
    c.needs = { hunger: 80, sleep: 10 }
    c.statuses.add('tired')
    game.map.clearOccupantFor(c.id)
    game.map.setOccupant(6, 6, c.id)

    for (const eid of query(game.state.ecs, [Edible])) removeEntity(game.state.ecs, eid)
    for (const eid of query(game.state.ecs, [Sleepable])) {
      if (Position.x[eid] !== 6 || Position.y[eid] !== 6) removeEntity(game.state.ecs, eid)
    }

    game.update(1)
    expect(c.state.phase).toBe('working')
    if (c.state.phase === 'working') {
      expect(c.state.job).toBe('sleep')
    }

    game.update(10)
    expect(c.needs.sleep).toBeGreaterThan(60)
    expect(game.map.getOccupant(6, 6)).toBeNull()
  })

  it('1.4 colonist builds a wall end-to-end', () => {
    const c = game.colonists[0]
    c.position = { x: 5, y: 5 }
    game.map.clearOccupantFor(c.id)
    game.map.setOccupant(5, 5, c.id)

    const bx = Math.round(c.position.x) + 2
    const by = Math.round(c.position.y)

    game.addBuildTask(bx, by, 'wall')
    game.update(1)
    game.update(0.5)

    expect(c.state.phase).toBe('idle')
    expect(Array.from(query(game.state.ecs, [Edible])).length).toBe(5)
  })

  it('1.5 movement blocked by occupied target tile', () => {
    const a = game.colonists[0]
    const b = game.colonists[1]

    a.position = { x: 5, y: 5 }
    b.position = { x: 5, y: 4 }
    game.map.clearOccupantFor(a.id)
    game.map.clearOccupantFor(b.id)
    game.map.setOccupant(5, 5, a.id)
    game.map.setOccupant(5, 4, b.id)

    a.transition({ phase: 'working', job: 'eat', progress: 0, duration: 1 })

    b.transition({ phase: 'moving', job: 'walk', path: [{ x: 5, y: 5 }] })
    game.map.setOccupant(5, 4, null)

    b.update(1, game.map)

    expect(b.state.phase).toBe('idle')
    expect(game.map.getOccupant(5, 5)).toBe(a.id)
  })

  it('1.6 assigns build task to nearest idle colonist', () => {
    const a = game.colonists[0]
    const b = game.colonists[1]

    a.transition({ phase: 'working', job: 'eat', progress: 0, duration: 999 })

    const bx = Math.round(b.position.x) + 2
    const by = Math.round(b.position.y)

    game.map.setTile(bx, by, TileType.Floor)
    game.addBuildTask(bx, by, 'wall')
    game.update(1)
    game.update(0.5)

    expect(b.state.phase).toBe('idle')
    expect(b.reservedBuildTaskId).toBeNull()
    expect(Array.from(query(game.state.ecs, [Edible])).length).toBe(5)
  })

  it('1.7 chooses eat over build when hungry', () => {
    const c = game.colonists[0]
    c.position = { x: 8, y: 8 }
    c.needs = { hunger: 10, sleep: 80 }
    c.statuses.add('hungry')
    game.map.clearOccupantFor(c.id)
    game.map.setOccupant(8, 8, c.id)
    for (const eid of query(game.state.ecs, [Edible])) {
      if (Position.x[eid] !== 8 || Position.y[eid] !== 8) removeEntity(game.state.ecs, eid)
    }

    const task: BuildTask = {
      id: 'test-build',
      type: 'wall',
      x: 5,
      y: 5,
      reservedBy: null,
    }
    game.buildQueue.add(task)
    game.update(1)

    expect(c.state.phase === 'working' && c.state.job).toBe('eat')
  })
})

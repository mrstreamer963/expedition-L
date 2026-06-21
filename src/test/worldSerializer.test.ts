import { describe, it, expect } from 'vitest'
import { createWorld, addEntity, addComponent, query } from 'bitecs'
import { WorldSerializer, SaveData } from '../core/worldSerializer'
import { GameMap } from '../core/world/map'
import { TileType } from '../core/world/tile'
import { Colonist } from '../core/colony/colonist'
import { BuildQueue } from '../core/colony/buildQueue'
import { Position, Edible, Sleepable, Solid } from '../core/components'

function createFloorGrid(width: number, height: number) {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({
      type: TileType.Floor,
      walkable: true,
      occupantId: null,
    }))
  )
}

function createTestSetup() {
  const map = new GameMap(createFloorGrid(30, 20))
  const colonists = [
    new Colonist('c1', 'Alisa', '#ff6b6b', 5, 5),
    new Colonist('c2', 'Boris', '#4ecdc4', 10, 10),
  ]
  const buildQueue = new BuildQueue()
  buildQueue.add({ id: 'q1', type: 'wall', x: 12, y: 12, reservedBy: null })
  const speed = 2
  const ecs = createWorld()

  const f1 = addEntity(ecs)
  Position.x[f1] = 3; Position.y[f1] = 3
  addComponent(ecs, f1, Position); addComponent(ecs, f1, Edible)

  const b1 = addEntity(ecs)
  Position.x[b1] = 8; Position.y[b1] = 8
  addComponent(ecs, b1, Position); addComponent(ecs, b1, Sleepable)
  const b2 = addEntity(ecs)
  Position.x[b2] = 9; Position.y[b2] = 9
  addComponent(ecs, b2, Position); addComponent(ecs, b2, Sleepable)

  const w1 = addEntity(ecs)
  Position.x[w1] = 7; Position.y[w1] = 7
  addComponent(ecs, w1, Position); addComponent(ecs, w1, Solid)

  return { map, colonists, buildQueue, speed, ecs }
}

describe('WorldSerializer', () => {
  it('toJSON produces object with all required fields', () => {
    const { map, colonists, buildQueue, speed, ecs } = createTestSetup()
    const world = { map, colonists, buildQueue, speed }
    const data = WorldSerializer.toJSON(world, ecs)

    expect(data).toHaveProperty('version')
    expect(data).toHaveProperty('timestamp')
    expect(data).toHaveProperty('gameName')
    expect(data).toHaveProperty('map')
    expect(data).toHaveProperty('colonists')
    expect(data).toHaveProperty('foods')
    expect(data).toHaveProperty('beds')
    expect(data).toHaveProperty('buildings')
    expect(data).toHaveProperty('buildQueue')
    expect(data).toHaveProperty('speed')
    expect(data.gameName).toBe('expedition-l')
  })

  it('validate returns true for valid SaveData', () => {
    const { map, colonists, buildQueue, speed, ecs } = createTestSetup()
    const world = { map, colonists, buildQueue, speed }
    const data = WorldSerializer.toJSON(world, ecs)
    expect(WorldSerializer.validate(data)).toBe(true)
  })

  it('validate returns false for null', () => {
    expect(WorldSerializer.validate(null)).toBe(false)
  })

  it('validate returns false for non-object', () => {
    expect(WorldSerializer.validate('string')).toBe(false)
    expect(WorldSerializer.validate(42)).toBe(false)
  })

  it('validate returns false for wrong version', () => {
    const { map, colonists, buildQueue, speed, ecs } = createTestSetup()
    const world = { map, colonists, buildQueue, speed }
    const data = WorldSerializer.toJSON(world, ecs) as unknown as Record<string, unknown>
    data.version = 999
    expect(WorldSerializer.validate(data as unknown as SaveData)).toBe(false)
  })

  it('validate returns false for missing fields', () => {
    const { map, colonists, buildQueue, speed, ecs } = createTestSetup()
    const world = { map, colonists, buildQueue, speed }
    const data = WorldSerializer.toJSON(world, ecs) as unknown as Record<string, unknown>
    delete data.map
    expect(WorldSerializer.validate(data as unknown as SaveData)).toBe(false)
  })

  it('round-trip preserves map dimensions', () => {
    const { map, colonists, buildQueue, speed, ecs } = createTestSetup()
    const world = { map, colonists, buildQueue, speed }
    const data = WorldSerializer.toJSON(world, ecs)
    const restored = WorldSerializer.fromJSON(data)
    expect(restored.map.width).toBe(30)
    expect(restored.map.height).toBe(20)
  })

  it('round-trip preserves entity counts', () => {
    const { map, colonists, buildQueue, speed, ecs } = createTestSetup()
    const world = { map, colonists, buildQueue, speed }
    const data = WorldSerializer.toJSON(world, ecs)
    const restored = WorldSerializer.fromJSON(data)
    expect(restored.colonists).toHaveLength(2)
    expect(Array.from(query(restored.ecs, [Edible]))).toHaveLength(1)
    expect(Array.from(query(restored.ecs, [Sleepable]))).toHaveLength(2)
    expect(Array.from(query(restored.ecs, [Solid]))).toHaveLength(1)
  })

  it('round-trip preserves speed setting', () => {
    const { map, colonists, buildQueue, speed, ecs } = createTestSetup()
    const world = { map, colonists, buildQueue, speed }
    const data = WorldSerializer.toJSON(world, ecs)
    const restored = WorldSerializer.fromJSON(data)
    expect(restored.speed).toBe(2)
  })

  it('round-trip preserves colonist statuses', () => {
    const { map, colonists, buildQueue, speed, ecs } = createTestSetup()
    ;(colonists[0] as Colonist).statuses.add('hungry')
    ;(colonists[1] as Colonist).statuses.add('tired')
    const world = { map, colonists, buildQueue, speed }
    const data = WorldSerializer.toJSON(world, ecs)
    const restored = WorldSerializer.fromJSON(data)
    expect(restored.colonists[0].statuses.has('hungry')).toBe(true)
    expect(restored.colonists[1].statuses.has('tired')).toBe(true)
  })
})

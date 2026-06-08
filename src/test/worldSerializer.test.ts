import { describe, it, expect } from 'vitest'
import { WorldSerializer, SaveData } from '../game/persistence/worldSerializer'
import { GameMap } from '../game/world/map'
import { TileType } from '../game/world/tile'
import { Colonist } from '../game/colony/colonist'
import { Food } from '../game/entities/food'
import { Bed } from '../game/entities/bed'
import { Building, BuildQueue } from '../game/entities/building'
import { Camera } from '../game/camera'

function createFloorGrid(width: number, height: number) {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({
      type: TileType.Floor,
      walkable: true,
      occupantId: null,
    }))
  )
}

function createTestWorld() {
  const map = new GameMap(createFloorGrid(30, 20))
  const colonists = [
    new Colonist('c1', 'Alisa', '#ff6b6b', 5, 5),
    new Colonist('c2', 'Boris', '#4ecdc4', 10, 10),
  ]
  const foods = [new Food('f1', 3, 3)]
  const beds = [new Bed('b1', 8, 8), new Bed('b2', 9, 9)]
  const buildings = [new Building('bld1', 'wall', 7, 7)]
  const buildQueue = new BuildQueue()
  buildQueue.add({ id: 'q1', type: 'wall', x: 12, y: 12, reservedBy: null })
  const camera = new Camera(100, 200)
  const speed = 2

  return { map, colonists, foods, beds, buildings, buildQueue, camera, speed }
}

describe('WorldSerializer', () => {
  it('toJSON produces object with all required fields', () => {
    const world = createTestWorld()
    const data = WorldSerializer.toJSON(world)

    expect(data).toHaveProperty('version')
    expect(data).toHaveProperty('timestamp')
    expect(data).toHaveProperty('gameName')
    expect(data).toHaveProperty('map')
    expect(data).toHaveProperty('colonists')
    expect(data).toHaveProperty('foods')
    expect(data).toHaveProperty('beds')
    expect(data).toHaveProperty('buildings')
    expect(data).toHaveProperty('buildQueue')
    expect(data).toHaveProperty('camera')
    expect(data).toHaveProperty('speed')
    expect(data.gameName).toBe('expedition-l')
  })

  it('validate returns true for valid SaveData', () => {
    const world = createTestWorld()
    const data = WorldSerializer.toJSON(world)
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
    const world = createTestWorld()
    const data = WorldSerializer.toJSON(world) as unknown as Record<string, unknown>
    data.version = 999
    expect(WorldSerializer.validate(data as SaveData)).toBe(false)
  })

  it('validate returns false for missing fields', () => {
    const world = createTestWorld()
    const data = WorldSerializer.toJSON(world) as unknown as Record<string, unknown>
    delete data.map
    expect(WorldSerializer.validate(data as SaveData)).toBe(false)
  })

  it('round-trip preserves map dimensions', () => {
    const world = createTestWorld()
    const data = WorldSerializer.toJSON(world)
    const restored = WorldSerializer.fromJSON(data)
    expect(restored.map.width).toBe(30)
    expect(restored.map.height).toBe(20)
  })

  it('round-trip preserves entity counts', () => {
    const world = createTestWorld()
    const data = WorldSerializer.toJSON(world)
    const restored = WorldSerializer.fromJSON(data)
    expect(restored.colonists).toHaveLength(2)
    expect(restored.foods).toHaveLength(1)
    expect(restored.beds).toHaveLength(2)
    expect(restored.buildings).toHaveLength(1)
  })

  it('round-trip preserves speed setting', () => {
    const world = createTestWorld()
    const data = WorldSerializer.toJSON(world)
    const restored = WorldSerializer.fromJSON(data)
    expect(restored.speed).toBe(2)
  })
})

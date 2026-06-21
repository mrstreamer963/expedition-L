import { describe, it, expect, beforeEach } from 'vitest'
import { Colonist } from '../core/colony/colonist'
import { StatusSystem } from '../core/systems/statusSystem'
import { STATUS_REGISTRY } from '../core/colony/statusRegistry'
import { hungryStatus } from '../core/colony/statuses/hungry'
import { tiredStatus } from '../core/colony/statuses/tired'
import { WorldState } from '../core/worldState'
import { GameMap } from '../core/world/map'
import { BuildQueue } from '../core/entities/building'

function createState(colonists: Colonist[]): WorldState {
  return new WorldState({
    map: new GameMap(),
    colonists,
    buildQueue: new BuildQueue(),
    foods: [],
    beds: [],
    buildings: [],
  })
}

describe('StatusSystem', () => {
  beforeEach(() => {
    STATUS_REGISTRY.clear()
    STATUS_REGISTRY.register(hungryStatus)
    STATUS_REGISTRY.register(tiredStatus)
  })

  it('applies hungry when hunger < 25', () => {
    const colonist = new Colonist('test', 'Test', '#fff', 0, 0)
    colonist.needs.hunger = 20
    const system = new StatusSystem()
    system.update(1, createState([colonist]))
    expect(colonist.statuses.has('hungry')).toBe(true)
  })

  it('removes hungry when hunger >= 25', () => {
    const colonist = new Colonist('test', 'Test', '#fff', 0, 0)
    colonist.statuses.add('hungry')
    colonist.needs.hunger = 30
    const system = new StatusSystem()
    system.update(1, createState([colonist]))
    expect(colonist.statuses.has('hungry')).toBe(false)
  })

  it('applies tired when sleep < 25', () => {
    const colonist = new Colonist('test', 'Test', '#fff', 0, 0)
    colonist.needs.sleep = 20
    const system = new StatusSystem()
    system.update(1, createState([colonist]))
    expect(colonist.statuses.has('tired')).toBe(true)
  })

  it('removes tired when sleep >= 25', () => {
    const colonist = new Colonist('test', 'Test', '#fff', 0, 0)
    colonist.statuses.add('tired')
    colonist.needs.sleep = 30
    const system = new StatusSystem()
    system.update(1, createState([colonist]))
    expect(colonist.statuses.has('tired')).toBe(false)
  })

  it('supports multiple simultaneous statuses', () => {
    const colonist = new Colonist('test', 'Test', '#fff', 0, 0)
    colonist.needs.hunger = 10
    colonist.needs.sleep = 10
    const system = new StatusSystem()
    system.update(1, createState([colonist]))
    expect(colonist.statuses.has('hungry')).toBe(true)
    expect(colonist.statuses.has('tired')).toBe(true)
  })
})

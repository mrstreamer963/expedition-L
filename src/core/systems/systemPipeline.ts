import { GameSystem } from './types'
import { WorldState } from '../worldState'

export class SystemPipeline {
  private systems: GameSystem[] = []

  add(system: GameSystem): void {
    const idx = this.systems.findIndex(s => s.priority > system.priority)
    if (idx === -1) {
      this.systems.push(system)
    } else {
      this.systems.splice(idx, 0, system)
    }
  }

  init(world: WorldState): void {
    for (const system of this.systems) {
      system.init?.(world)
    }
  }

  update(dt: number, world: WorldState): void {
    for (const system of this.systems) {
      system.update(dt, world)
    }
  }

  serialize(): Record<string, unknown> {
    const data: Record<string, unknown> = {}
    for (const system of this.systems) {
      if (system.serialize) {
        data[system.type] = system.serialize()
      }
    }
    return data
  }

  deserialize(data: Record<string, unknown>, world: WorldState): void {
    for (const system of this.systems) {
      const systemData = data[system.type]
      if (systemData !== undefined && system.deserialize) {
        system.deserialize(systemData, world)
      }
    }
  }

  destroy(): void {
    for (const system of this.systems) {
      system.destroy?.()
    }
    this.systems = []
  }

  getAll(): GameSystem[] {
    return [...this.systems]
  }
}

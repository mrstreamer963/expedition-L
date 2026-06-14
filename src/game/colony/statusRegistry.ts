import { StatusDefinition } from './types'

export class StatusRegistry {
  private defs = new Map<string, StatusDefinition>()

  register(def: StatusDefinition): void {
    if (this.defs.has(def.type)) return
    this.defs.set(def.type, def)
  }

  get(type: string): StatusDefinition | undefined {
    return this.defs.get(type)
  }

  getAll(): StatusDefinition[] {
    return Array.from(this.defs.values())
  }
}

export const STATUS_REGISTRY = new StatusRegistry()

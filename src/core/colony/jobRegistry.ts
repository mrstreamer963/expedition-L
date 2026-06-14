import { JobDefinition } from './types'

export class JobRegistry {
  private defs = new Map<string, JobDefinition>()

  register(def: JobDefinition): void {
    if (this.defs.has(def.type)) return
    this.defs.set(def.type, def)
  }

  get(type: string): JobDefinition | undefined {
    return this.defs.get(type)
  }

  getAll(): JobDefinition[] {
    return Array.from(this.defs.values())
  }

  clear(): void {
    this.defs.clear()
  }
}

export const JOB_REGISTRY = new JobRegistry()

export type BuildingType = 'wall' | 'bed' | 'food'

export class Building {
  id: string
  type: BuildingType
  x: number
  y: number

  constructor(id: string, type: BuildingType, x: number, y: number) {
    this.id = id
    this.type = type
    this.x = x
    this.y = y
  }

  toJSON(): { id: string; type: BuildingType; x: number; y: number } {
    return { id: this.id, type: this.type, x: this.x, y: this.y }
  }
}

export interface BuildTask {
  id: string
  type: BuildingType
  x: number
  y: number
  reservedBy: string | null
}

export class BuildQueue {
  private tasks: BuildTask[] = []

  add(task: BuildTask): void {
    task.reservedBy = null
    this.tasks.push(task)
  }

  pop(): BuildTask | null {
    return this.tasks.shift() || null
  }

  peek(): BuildTask | null {
    return this.tasks[0] || null
  }

  removeById(id: string): BuildTask | null {
    const idx = this.tasks.findIndex(t => t.id === id)
    if (idx === -1) return null
    return this.tasks.splice(idx, 1)[0]
  }

  get length(): number {
    return this.tasks.length
  }

  get all(): BuildTask[] {
    return [...this.tasks]
  }

  toJSON(): { tasks: BuildTask[] } {
    return { tasks: this.tasks.map(t => ({ ...t })) }
  }
}

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

  get length(): number {
    return this.tasks.length
  }

  get all(): BuildTask[] {
    return [...this.tasks]
  }
}

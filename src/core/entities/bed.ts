export class Bed {
  id: string
  x: number
  y: number

  constructor(id: string, x: number, y: number) {
    this.id = id
    this.x = x
    this.y = y
  }

  toJSON(): { id: string; x: number; y: number } {
    return { id: this.id, x: this.x, y: this.y }
  }
}

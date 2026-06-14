import { GameMap } from './map'

export interface Vec2 {
  x: number
  y: number
}

export function findPath(
  map: GameMap,
  start: Vec2,
  end: Vec2,
  occupied: Vec2[] = []
): Vec2[] {
  const startX = Math.round(start.x)
  const startY = Math.round(start.y)
  const endX = Math.round(end.x)
  const endY = Math.round(end.y)

  if (!map.isWalkable(endX, endY)) return []
  if (startX === endX && startY === endY) return []

  const occupiedSet = new Set(occupied.map(p => `${p.x},${p.y}`))
  occupiedSet.delete(`${startX},${startY}`)

  interface Node {
    x: number; y: number; g: number; h: number; f: number; parent: Node | null
  }

  const open: Node[] = []
  const closed = new Set<string>()

  open.push({ x: startX, y: startY, g: 0, h: manhattan(startX, startY, endX, endY), f: 0, parent: null })

  while (open.length > 0) {
    open.sort((a, b) => a.f - b.f)
    const current = open.shift()!
    const key = `${current.x},${current.y}`

    if (current.x === endX && current.y === endY) {
      const path: Vec2[] = []
      let node: Node | null = current
      while (node?.parent) {
        path.unshift({ x: node.x, y: node.y })
        node = node.parent
      }
      return path
    }

    if (closed.has(key)) continue
    closed.add(key)

    const directions = [
      { x: 0, y: -1 }, { x: 1, y: 0 },
      { x: 0, y: 1 }, { x: -1, y: 0 },
    ]

    for (const d of directions) {
      const nx = current.x + d.x
      const ny = current.y + d.y
      const nk = `${nx},${ny}`

      if (closed.has(nk)) continue
      if (!map.isWalkable(nx, ny)) continue
      if (occupiedSet.has(nk) && !(nx === endX && ny === endY)) continue

      const g = current.g + 1
      const h = manhattan(nx, ny, endX, endY)
      const existing = open.find(n => n.x === nx && n.y === ny)
      if (existing && existing.g <= g) continue

      open.push({ x: nx, y: ny, g, h, f: g + h, parent: current })
    }
  }

  return []
}

export function manhattan(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2)
}

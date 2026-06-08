import { GameMap } from './map'
import { Vec2 } from '../colony/colonist'

// 4 directions: up, down, left, right
const DIRECTIONS: Vec2[] = [
  { x: 0, y: -1 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
]

interface Node {
  x: number
  y: number
  g: number // cost from start
  h: number // heuristic to end
  f: number // g + h
  parent: Node | null
}

/**
 * A* pathfinding on the game grid
 * Returns array of Vec2 from start (exclusive) to end (inclusive)
 * Empty array if no path found
 */
export function findPath(
  map: GameMap,
  start: Vec2,
  end: Vec2,
  occupiedPositions?: Vec2[] // positions to avoid (other colonists)
): Vec2[] {
  // Normalize to integers
  const startX = Math.round(start.x)
  const startY = Math.round(start.y)
  const endX = Math.round(end.x)
  const endY = Math.round(end.y)

  // Same position
  if (startX === endX && startY === endY) return []

  // Check if target is walkable
  if (!map.isWalkable(endX, endY)) return []

  const occupiedSet = new Set(occupiedPositions?.map(p => `${p.x},${p.y}`) || [])
  // Don't block start position (colonist must be able to leave)
  occupiedSet.delete(`${startX},${startY}`)

  const openList: Node[] = []
  const closedSet = new Set<string>()

  const startNode: Node = {
    x: startX,
    y: startY,
    g: 0,
    h: manhattan(startX, startY, endX, endY),
    f: 0,
    parent: null,
  }
  startNode.f = startNode.g + startNode.h
  openList.push(startNode)

  while (openList.length > 0) {
    // Get node with lowest f
    let current = openList[0]
    let lowestIdx = 0
    for (let i = 1; i < openList.length; i++) {
      if (openList[i].f < current.f) {
        current = openList[i]
        lowestIdx = i
      }
    }
    openList.splice(lowestIdx, 1)

    const key = `${current.x},${current.y}`
    if (closedSet.has(key)) continue
    closedSet.add(key)

    // Reached the goal
    if (current.x === endX && current.y === endY) {
      return reconstructPath(current)
    }

    // Check neighbors
    for (const dir of DIRECTIONS) {
      const nx = current.x + dir.x
      const ny = current.y + dir.y
      const nKey = `${nx},${ny}`

      if (closedSet.has(nKey)) continue
      if (!map.isWalkable(nx, ny)) continue
      if (occupiedSet.has(nKey)) continue

      const g = current.g + 1
      const h = manhattan(nx, ny, endX, endY)
      const node: Node = {
        x: nx,
        y: ny,
        g,
        h,
        f: g + h,
        parent: current,
      }
      openList.push(node)
    }
  }

  return [] // No path found
}

export function manhattan(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x2 - x1) + Math.abs(y2 - y1)
}

function reconstructPath(node: Node): Vec2[] {
  const path: Vec2[] = []
  let current: Node | null = node
  while (current?.parent) {
    path.unshift({ x: current.x, y: current.y })
    current = current.parent
  }
  return path
}

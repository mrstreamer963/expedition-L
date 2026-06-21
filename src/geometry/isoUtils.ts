import { TILE_WIDTH, TILE_HEIGHT } from './tile'

// Convert tile coordinates to screen coordinates (isometric projection)
export function tileToScreen(tx: number, ty: number): { x: number; y: number } {
  return {
    x: (tx - ty) * (TILE_WIDTH / 2),
    y: (tx + ty) * (TILE_HEIGHT / 2),
  }
}

// Convert screen coordinates to tile coordinates
export function screenToTile(sx: number, sy: number): { x: number; y: number } {
  const halfW = TILE_WIDTH / 2
  const halfH = TILE_HEIGHT / 2
  return {
    x: Math.floor((sx / halfW + sy / halfH) / 2),
    y: Math.floor((sy / halfH - sx / halfW) / 2),
  }
}

// Get render order key (back-to-front: lower = rendered first)
export function getRenderOrder(x: number, y: number): number {
  return x + y
}

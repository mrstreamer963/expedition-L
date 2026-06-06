import { TileType, TILE_WIDTH, TILE_HEIGHT, TILE_DATA } from '../game/world/tile'

type PatternFactory = (w: number, h: number) => CanvasPattern

const cache = new Map<string, CanvasPattern>()

function getOrCreate(key: string, factory: PatternFactory): CanvasPattern {
  let p = cache.get(key)
  if (!p) {
    p = factory(TILE_WIDTH, TILE_HEIGHT)
    cache.set(key, p)
  }
  return p
}

function createOffscreen(w: number, h: number, fn: (ctx: CanvasRenderingContext2D) => void): CanvasPattern {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  fn(ctx)
  const p = ctx.createPattern(c, 'repeat')!
  return p
}

function grass(w: number, h: number): CanvasPattern {
  return createOffscreen(w, h, (ctx) => {
    ctx.fillStyle = '#5a8c69'
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 12; i++) {
      const x = Math.random() * w
      const y = Math.random() * h
      ctx.fillStyle = Math.random() > 0.5 ? '#4a7c59' : '#6a9c79'
      ctx.fillRect(x, y, 2, 2)
    }
  })
}

function crack(w: number, h: number): CanvasPattern {
  return createOffscreen(w, h, (ctx) => {
    ctx.fillStyle = '#6b6b6b'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = '#5a5a5a'
    ctx.lineWidth = 1
    for (let i = 0; i < 3; i++) {
      const x = Math.random() * w
      const y = Math.random() * h
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + (Math.random() - 0.5) * 20, y + (Math.random() - 0.5) * 10)
      ctx.stroke()
    }
    ctx.fillStyle = '#7a7a7a'
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1)
    }
  })
}

function wave(w: number, h: number): CanvasPattern {
  return createOffscreen(w, h, (ctx) => {
    ctx.fillStyle = '#4a7fa9'
    ctx.fillRect(0, 0, w, h)
    for (let row = 0; row < h; row += 4) {
      ctx.fillStyle = row % 8 === 0 ? '#5a8fb9' : '#3a6f99'
      ctx.fillRect(0, row, w, 2)
    }
  })
}

function brick(w: number, h: number): CanvasPattern {
  return createOffscreen(w, h, (ctx) => {
    ctx.fillStyle = '#9a8b6a'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = '#7a6e52'
    ctx.lineWidth = 1
    for (let y = 0; y < h; y += 6) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }
    const offset = 12
    for (let y = 0; y < h; y += 12) {
      ctx.beginPath()
      ctx.moveTo(offset, y)
      ctx.lineTo(offset, y + 6)
      ctx.stroke()
    }
    for (let y = 6; y < h; y += 12) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(0, y + 6)
      ctx.stroke()
    }
  })
}

function stripe(w: number, h: number): CanvasPattern {
  return createOffscreen(w, h, (ctx) => {
    ctx.fillStyle = '#c49a6c'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#b48a5c'
    for (let x = 0; x < w; x += 6) {
      ctx.fillRect(x, 0, 2, h)
    }
  })
}

function dot(w: number, h: number): CanvasPattern {
  return createOffscreen(w, h, (ctx) => {
    ctx.fillStyle = '#e8d44d'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#d4c039'
    for (let i = 0; i < 6; i++) {
      const x = 4 + Math.random() * (w - 8)
      const y = 4 + Math.random() * (h - 8)
      ctx.beginPath()
      ctx.arc(x, y, 2, 0, Math.PI * 2)
      ctx.fill()
    }
  })
}

const factories: Record<string, PatternFactory> = {
  grass,
  crack,
  wave,
  brick,
  stripe,
  dot,
}

export function getTilePattern(tileType: TileType): CanvasPattern | null {
  const data = TILE_DATA[tileType]
  const factory = factories[data.pattern]
  if (!factory) return null
  return getOrCreate(data.pattern, factory)
}

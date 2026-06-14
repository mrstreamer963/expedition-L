import { ClientSnapshot } from '../core'
import { tileToScreen } from '../geometry/isoUtils'
import { roundRect } from './roundRect'

type SnapshotColonist = ClientSnapshot['colonists'][0]

export function drawColonist(
  ctx: CanvasRenderingContext2D,
  colonist: SnapshotColonist,
  offsetX: number,
  offsetY: number
): void {
  const pos = colonist.position
  const { x: sx, y: sy } = tileToScreen(pos.x, pos.y)
  const cx = sx + offsetX
  const cy = sy + offsetY

  ctx.fillStyle = darken(colonist.color, 0.4)
  ctx.fillRect(cx - 4, cy - 6, 3, 6)
  ctx.fillRect(cx + 1, cy - 6, 3, 6)

  ctx.fillStyle = darken(colonist.color, 0.2)
  roundRect(ctx, cx - 5, cy - 16, 10, 12, 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'
  ctx.lineWidth = 0.5
  ctx.stroke()

  ctx.fillStyle = colonist.color
  ctx.beginPath()
  ctx.arc(cx, cy - 20, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'
  ctx.lineWidth = 0.5
  ctx.stroke()

  const isSleeping = colonist.state.phase === 'working' && colonist.state.job === 'sleep'
  if (!isSleeping) {
    ctx.fillStyle = '#fff'
    ctx.fillRect(cx - 3, cy - 21, 2, 2)
    ctx.fillRect(cx + 1, cy - 21, 2, 2)
  }

  const barY = cy - 28
  const barW = 24
  const barH = 3
  const gap = 1

  const hungerColor = colonist.needs.hunger > 40 ? '#60d080' : '#e06060'
  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  ctx.fillRect(cx - barW / 2 - 1, barY - 1, barW + 2, barH + 2)
  ctx.fillStyle = hungerColor
  ctx.fillRect(cx - barW / 2, barY, barW * (colonist.needs.hunger / 100), barH)

  const sleepColor = colonist.needs.sleep > 25 ? '#60a0e0' : '#e0a060'
  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  ctx.fillRect(cx - barW / 2 - 1, barY + barH + gap - 1, barW + 2, barH + 2)
  ctx.fillStyle = sleepColor
  ctx.fillRect(cx - barW / 2, barY + barH + gap, barW * (colonist.needs.sleep / 100), barH)

  if (colonist.statuses.length > 0) {
    const iconY = barY - 14
    for (let i = 0; i < colonist.statuses.length; i++) {
      const ix = cx - ((colonist.statuses.length - 1) * 5) + i * 10
      ctx.beginPath()
      ctx.arc(ix, iconY, 3, 0, Math.PI * 2)
      ctx.fillStyle = colonist.statuses[i] === 'hungry' ? '#e06060' : '#60a0e0'
      ctx.fill()
    }
  }

  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.font = '9px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(colonist.name, cx, barY - 5)
}

function darken(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const f = 1 - amount
  return `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`
}

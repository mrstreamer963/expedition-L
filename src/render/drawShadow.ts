export function drawShadow(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  width: number = 16,
  height: number = 6,
): void {
  ctx.save()
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'
  ctx.beginPath()
  ctx.ellipse(screenX, screenY + 2, width / 2, height / 2, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

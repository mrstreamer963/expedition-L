import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react'

export interface GameCanvasRef {
  getCanvas(): HTMLCanvasElement | null
  getContext(): CanvasRenderingContext2D | null
}

interface GameCanvasProps {
  width?: number
  height?: number
  onCanvasReady?: (canvas: HTMLCanvasElement) => void
}

const GameCanvas = forwardRef<GameCanvasRef, GameCanvasProps>(function GameCanvas(
  { width = 960, height = 540, onCanvasReady },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
    getContext: () => canvasRef.current?.getContext('2d') || null,
  }))

  useEffect(() => {
    if (canvasRef.current && onCanvasReady) {
      onCanvasReady(canvasRef.current)
    }
  }, [onCanvasReady])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ display: 'block' }}
    />
  )
})

export default GameCanvas

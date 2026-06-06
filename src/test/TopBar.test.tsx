import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import TopBar from '../ui/TopBar'
import { UIState } from '../ui/types'
import { GameState } from '../store/types'

function createState(overrides: Partial<UIState> = {}): UIState {
  return {
    ...({} as GameState),
    timeScale: 1,
    speed: 1,
    foodCount: 0,
    colonistCount: 0,
    selectedColonistId: null,
    colonists: [],
    buildMode: 'none',
    hoveredTile: null,
    ...overrides,
  }
}

describe('TopBar speed button highlighting', () => {
  it('highlights the pause button when speed is 0', () => {
    const state = createState({ speed: 0, timeScale: 0 })
    const { container } = render(<TopBar state={state} onSetSpeed={() => {}} />)
    const buttons = container.querySelectorAll('button')
    expect(buttons[0]).toHaveTextContent('⏹')
    expect(buttons[0].style.background).toBe('rgba(255, 200, 0, 0.3)')
  })

  it('highlights the normal speed button when speed is 1', () => {
    const state = createState({ speed: 1 })
    const { container } = render(<TopBar state={state} onSetSpeed={() => {}} />)
    const buttons = container.querySelectorAll('button')
    expect(buttons[1]).toHaveTextContent('▶')
    expect(buttons[1].style.background).toBe('rgba(255, 200, 0, 0.3)')
  })

  it('highlights the fast speed button when speed is 2', () => {
    const state = createState({ speed: 2 })
    const { container } = render(<TopBar state={state} onSetSpeed={() => {}} />)
    const buttons = container.querySelectorAll('button')
    expect(buttons[2]).toHaveTextContent('▶▶')
    expect(buttons[2].style.background).toBe('rgba(255, 200, 0, 0.3)')
  })

  it('only highlights one button at a time', () => {
    const state = createState({ speed: 0, timeScale: 0 })
    const { container } = render(<TopBar state={state} onSetSpeed={() => {}} />)
    const buttons = container.querySelectorAll('button')
    const highlighted = Array.from(buttons).filter(
      b => b.style.background === 'rgba(255, 200, 0, 0.3)'
    )
    expect(highlighted).toHaveLength(1)
  })

  it('renders food and colonist counts', () => {
    const state = createState({ foodCount: 5, colonistCount: 3 })
    render(<TopBar state={state} onSetSpeed={() => {}} />)
    expect(screen.getByText('🍖 5')).toBeInTheDocument()
    expect(screen.getByText('👥 3')).toBeInTheDocument()
  })
})

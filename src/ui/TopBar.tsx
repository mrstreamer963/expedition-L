import { UIState } from './types'

interface TopBarProps {
  state: UIState
  onSetSpeed: (speed: 0 | 1 | 2) => void
}

function TopBar({ state, onSetSpeed }: TopBarProps) {
  return (
    <div style={styles.container}>
      <div style={styles.section}>
        <button onClick={() => onSetSpeed(0)} style={{...styles.speedButton, ...(state.speed === 0 ? styles.activeButton : {})}}>
          ⏹
        </button>
        <button onClick={() => onSetSpeed(1)} style={{...styles.speedButton, ...(state.speed === 1 ? styles.activeButton : {})}}>
          ▶
        </button>
        <button onClick={() => onSetSpeed(2)} style={{...styles.speedButton, ...(state.speed === 2 ? styles.activeButton : {})}}>
          ▶▶ 5x
        </button>
      </div>

      <div style={styles.section}>
        <span>🍖 {state.foodCount}</span>
        <span style={{ marginLeft: 16 }}>👥 {state.colonistCount}</span>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 16px',
    background: 'rgba(0, 0, 0, 0.7)',
    color: '#fff',
    fontSize: '14px',
    fontFamily: 'system-ui, sans-serif',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  section: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  speedButton: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    padding: '4px 8px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  activeButton: {
    background: 'rgba(255, 200, 0, 0.3)',
    borderColor: '#ffc800',
  },
}

export default TopBar

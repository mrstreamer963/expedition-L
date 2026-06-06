import { BuildMode } from './types'

interface BuildMenuProps {
  mode: BuildMode
  onSelectMode: (mode: BuildMode) => void
}

function BuildMenu({ mode, onSelectMode }: BuildMenuProps) {
  return (
    <div style={styles.container}>
      <button
        onClick={() => onSelectMode('none')}
        style={{
          ...styles.button,
          ...(mode === 'none' ? styles.activeButton : {}),
        }}
      >
        ✋
      </button>
      <button
        onClick={() => onSelectMode('wall')}
        style={{
          ...styles.button,
          ...(mode === 'wall' ? styles.activeButton : {}),
        }}
      >
        🧱 Стена
      </button>
      <button
        onClick={() => onSelectMode('bed')}
        style={{
          ...styles.button,
          ...(mode === 'bed' ? styles.activeButton : {}),
        }}
      >
        🛏️ Кровать
      </button>
      <button
        onClick={() => onSelectMode('food')}
        style={{
          ...styles.button,
          ...(mode === 'food' ? styles.activeButton : {}),
        }}
      >
        🍖 Еда
      </button>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    gap: '8px',
    padding: '8px 16px',
    background: 'rgba(0, 0, 0, 0.7)',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  button: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    fontFamily: 'system-ui, sans-serif',
  },
  activeButton: {
    background: 'rgba(255, 200, 0, 0.3)',
    borderColor: '#ffc800',
  },
}

export default BuildMenu

import { UIColonist } from './types'

interface ColonistPanelProps {
  colonist: UIColonist
}

const stateLabels: Record<string, string> = {
  idle: 'Бездействует',
  moving: 'Идёт',
  working: 'Работает',
  assigned: 'Назначено',
  done: 'Готово',
}

function ColonistPanel({ colonist }: ColonistPanelProps) {
  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span
          style={{
            ...styles.colorDot,
            background: colonist.color,
          }}
        />
        <span style={styles.name}>{colonist.name}</span>
      </div>

      <div style={styles.row}>
        <span style={styles.label}>Голод</span>
        <div style={styles.barOuter}>
          <div
            style={{
              ...styles.barInner,
              width: `${colonist.hunger}%`,
              background: colonist.hunger > 40 ? '#60d080' : '#e06060',
            }}
          />
        </div>
        <span style={styles.value}>{colonist.hunger}</span>
      </div>

      <div style={styles.row}>
        <span style={styles.label}>Сон</span>
        <div style={styles.barOuter}>
          <div
            style={{
              ...styles.barInner,
              width: `${colonist.sleep}%`,
              background: colonist.sleep > 25 ? '#60a0e0' : '#e0a060',
            }}
          />
        </div>
        <span style={styles.value}>{colonist.sleep}</span>
      </div>

      <div style={styles.status}>
        {stateLabels[colonist.stateLabel] || colonist.stateLabel}
        {colonist.currentJob && ` → ${colonist.currentJob}`}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    background: 'rgba(0, 0, 0, 0.8)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8,
    padding: '12px 16px',
    color: '#fff',
    fontFamily: 'system-ui, sans-serif',
    fontSize: 13,
    minWidth: 200,
    backdropFilter: 'blur(4px)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    fontSize: 15,
    fontWeight: 600,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    display: 'inline-block',
  },
  name: {},
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  label: {
    width: 40,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  barOuter: {
    flex: 1,
    height: 10,
    background: 'rgba(255,255,255,0.1)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  barInner: {
    height: '100%',
    borderRadius: 5,
    transition: 'width 0.3s ease',
  },
  value: {
    width: 28,
    textAlign: 'right' as const,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  status: {
    marginTop: 8,
    paddingTop: 8,
    borderTop: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
}

export default ColonistPanel

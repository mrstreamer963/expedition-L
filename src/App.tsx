import { useCallback, useRef, useState } from 'react'
import GameCanvas from './ui/GameCanvas'
import TopBar from './ui/TopBar'
import BuildMenu from './ui/BuildMenu'
import ColonistPanel from './ui/ColonistPanel'
import { GameWorld } from './game/gameWorld'
import { UIState, INITIAL_UI_STATE, BuildMode } from './ui/types'

function App() {
  const [uiState, setUiState] = useState<UIState>(INITIAL_UI_STATE)
  const gameRef = useRef<GameWorld | null>(null)

  const handleCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    const game = new GameWorld(canvas)
    game.onUiUpdate = (state) => setUiState({ ...state })
    gameRef.current = game
  }, [])

  const handleTogglePause = useCallback(() => {
    gameRef.current?.togglePause()
  }, [])

  const handleSetSpeed = useCallback((speed: 0 | 1 | 2) => {
    gameRef.current?.setSpeed(speed)
  }, [])

  const handleSelectBuildMode = useCallback((mode: BuildMode) => {
    gameRef.current?.setBuildMode(mode)
  }, [])

  const selectedColonist = uiState.colonists.find(c => c.id === uiState.selectedColonistId) || null

  return (
    <div style={styles.root}>
      <TopBar
        state={uiState}
        onTogglePause={handleTogglePause}
        onSetSpeed={handleSetSpeed}
      />
      <BuildMenu
        mode={uiState.buildMode}
        onSelectMode={handleSelectBuildMode}
      />
      <div style={styles.gameArea}>
        <GameCanvas
          width={960}
          height={540}
          onCanvasReady={handleCanvasReady}
        />
        {selectedColonist && (
          <ColonistPanel colonist={selectedColonist} />
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#1a1a2e',
    overflow: 'hidden',
  },
  gameArea: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
}

export default App

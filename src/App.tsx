import { useCallback, useEffect, useRef, useState } from 'react'
import GameCanvas from './ui/GameCanvas'
import TopBar from './ui/TopBar'
import BuildMenu from './ui/BuildMenu'
import ColonistPanel from './ui/ColonistPanel'
import { GameWorld } from './game/gameWorld'
import { UIState, INITIAL_UI_STATE, BuildMode } from './ui/types'
import { SaveData, WorldSerializer } from './game/persistence/worldSerializer'
import { loadFromLocalStorage, downloadSaveFile, uploadSaveFile, saveToLocalStorage, AUTOSAVE_KEY } from './game/persistence/storage'

function App() {
  const [uiState, setUiState] = useState<UIState>(INITIAL_UI_STATE)
  const gameRef = useRef<GameWorld | null>(null)

  const startNewGame = useCallback((canvas: HTMLCanvasElement, savedState?: SaveData) => {
    if (gameRef.current) {
      gameRef.current.destroy()
    }
    const game = new GameWorld(canvas, savedState)
    game.onUiUpdate = (state) => setUiState({ ...state })
    gameRef.current = game
    ;(window as any).__game = game
  }, [])

  const handleCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    startNewGame(canvas)
  }, [startNewGame])

  useEffect(() => {
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy()
        gameRef.current = null
      }
    }
  }, [])

  const handleSetSpeed = useCallback((speed: 0 | 1 | 2 | 3) => {
    gameRef.current?.setSpeed(speed)
  }, [])

  const handleSelectBuildMode = useCallback((mode: BuildMode) => {
    gameRef.current?.setBuildMode(mode)
  }, [])

  const handleSave = useCallback(() => {
    const world = gameRef.current
    if (!world) return
    const data = WorldSerializer.toJSON(world)
    saveToLocalStorage(AUTOSAVE_KEY, data)
    downloadSaveFile(data)
  }, [])

  const handleLoad = useCallback(async () => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return
    const data = await uploadSaveFile()
    startNewGame(canvas, data)
  }, [startNewGame])

  const handleLoadFromStorage = useCallback(() => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return
    const data = loadFromLocalStorage(AUTOSAVE_KEY)
    if (!data) throw new Error('Нет сохранения в localStorage.')
    startNewGame(canvas, data)
  }, [startNewGame])

  const selectedColonist = uiState.colonists.find(c => c.id === uiState.selectedColonistId) || null

  return (
    <div style={styles.root}>
      <TopBar
        state={uiState}
        onSetSpeed={handleSetSpeed}
        onSave={handleSave}
        onLoad={handleLoad}
        onLoadFromStorage={handleLoadFromStorage}
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

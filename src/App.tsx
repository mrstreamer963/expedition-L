import { useCallback, useEffect, useRef, useState } from 'react'
import GameCanvas from './ui/GameCanvas'
import TopBar from './ui/TopBar'
import BuildMenu from './ui/BuildMenu'
import ColonistPanel from './ui/ColonistPanel'
import { GameController } from './controller/gameController'
import { UIState, INITIAL_UI_STATE, BuildMode } from './ui/types'
import { SaveData, WorldSerializer } from './game/persistence/worldSerializer'
import { loadFromLocalStorage, downloadSaveFile, uploadSaveFile, saveToLocalStorage, AUTOSAVE_KEY } from './game/persistence/storage'

function App() {
  const [uiState, setUiState] = useState<UIState>(INITIAL_UI_STATE)
  const controllerRef = useRef<GameController | null>(null)

  const startNewGame = useCallback((canvas: HTMLCanvasElement, savedState?: SaveData) => {
    if (controllerRef.current) {
      controllerRef.current.destroy()
    }
    const controller = new GameController(canvas, savedState)
    controller.onUiUpdate = (state) => setUiState({ ...state })
    controllerRef.current = controller
    ;(window as any).__game = controller
  }, [])

  const handleCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    startNewGame(canvas)
  }, [startNewGame])

  useEffect(() => {
    return () => {
      if (controllerRef.current) {
        controllerRef.current.destroy()
        controllerRef.current = null
      }
    }
  }, [])

  const handleSetSpeed = useCallback((speed: 0 | 1 | 2 | 3) => {
    controllerRef.current?.setSpeed(speed)
  }, [])

  const handleSelectBuildMode = useCallback((mode: BuildMode) => {
    controllerRef.current?.setBuildMode(mode)
  }, [])

  const handleSave = useCallback(() => {
    const ctrl = controllerRef.current
    if (!ctrl) return
    const data = WorldSerializer.toJSON(ctrl.world)
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

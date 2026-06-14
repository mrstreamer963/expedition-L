// Game layer — client-side orchestration and browser code
export { GameHost } from './gameHost'
export { GameLoop } from './gameLoop'
export { InputHandler } from './input/inputHandler'
export { TILE_DATA, TILE_WIDTH, TILE_HEIGHT } from './world/tile'
export {
  saveToLocalStorage,
  loadFromLocalStorage,
  removeFromLocalStorage,
  downloadSaveFile,
  uploadSaveFile,
  AUTOSAVE_KEY,
} from './persistence'

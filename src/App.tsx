import { Api } from './core/api'

const api = new Api()

function App() {
  return (
    <div>
      <h1>{api.getMessage()}</h1>
      <p>Welcome to my Vite + React app.</p>
    </div>
  )
}

export default App

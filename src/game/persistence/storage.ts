import { SaveData, WorldSerializer } from '../../core/worldSerializer'

export const AUTOSAVE_KEY = 'expedition-autosave'

export function saveToLocalStorage(key: string, data: SaveData): void {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) {
    throw new Error('Не удалось сохранить: localStorage переполнен или недоступен.')
  }
}

export function loadFromLocalStorage(key: string): SaveData | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!WorldSerializer.validate(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

export function removeFromLocalStorage(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

export function downloadSaveFile(data: SaveData, filename?: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename ?? `expedition-save-${Date.now()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function uploadSaveFile(): Promise<SaveData> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.style.display = 'none'
    document.body.appendChild(input)

    input.addEventListener('change', () => {
      const file = input.files?.[0]
      if (!file) {
        document.body.removeChild(input)
        reject(new Error('Файл не выбран.'))
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        document.body.removeChild(input)
        try {
          const text = reader.result as string
          const parsed = JSON.parse(text)
          if (!WorldSerializer.validate(parsed)) {
            reject(new Error('Неверный формат файла сохранения.'))
            return
          }
          resolve(parsed)
        } catch {
          reject(new Error('Не удалось прочитать файл.'))
        }
      }
      reader.onerror = () => {
        document.body.removeChild(input)
        reject(new Error('Ошибка чтения файла.'))
      }
      reader.readAsText(file)
    })

    input.click()
  })
}

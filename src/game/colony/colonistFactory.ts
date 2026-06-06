import { Colonist } from './colonist'

export const DEFAULT_COLONISTS: { id: string; name: string; color: string }[] = [
  { id: 'col-1', name: 'Алиса', color: '#e06060' },
  { id: 'col-2', name: 'Борис', color: '#60a0e0' },
  { id: 'col-3', name: 'Вера', color: '#60d080' },
]

/**
 * Create the initial 3 colonists at spawn positions
 */
export function createInitialColonists(): Colonist[] {
  return DEFAULT_COLONISTS.map((c, i) => {
    // Spawn near center of the map with some offset
    const x = 10 + i * 3
    const y = 10
    return new Colonist(c.id, c.name, c.color, x, y)
  })
}

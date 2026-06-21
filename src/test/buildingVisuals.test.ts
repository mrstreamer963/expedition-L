import { describe, it, expect } from 'vitest'
import { getBuildingVisual, getAllBuildingTypes } from '../game/buildingVisuals'

describe('buildingVisuals registry', () => {
  it('has wall registered', () => {
    const def = getBuildingVisual('wall')
    expect(def).toBeDefined()
    expect(def!.label).toBe('Стена')
  })

  it('has food registered', () => {
    const def = getBuildingVisual('food')
    expect(def).toBeDefined()
    expect(def!.label).toBe('Еда')
  })

  it('has bed registered', () => {
    const def = getBuildingVisual('bed')
    expect(def).toBeDefined()
    expect(def!.label).toBe('Кровать')
  })

  it('returns undefined for unregistered type', () => {
    expect(getBuildingVisual('nonexistent')).toBeUndefined()
  })

  it('getAllBuildingTypes returns all registered types', () => {
    const types = getAllBuildingTypes()
    expect(types).toContain('wall')
    expect(types).toContain('food')
    expect(types).toContain('bed')
  })

  it('renderEntity and renderGhost are functions', () => {
    const def = getBuildingVisual('food')
    expect(typeof def!.renderEntity).toBe('function')
    expect(typeof def!.renderGhost).toBe('function')
  })
})

import { GameMap } from '../world/map'
import { Vec2, ColonistNeeds, ColonistState, ColonistStatus } from './types'
import { JOB_REGISTRY } from './jobRegistry'

export type { Vec2, ColonistNeeds, ColonistState }

export class Colonist {
  id: string
  name: string
  color: string
  position: Vec2
  speed: number
  state: ColonistState
  needs: ColonistNeeds
  reservedBuildTaskId: string | null = null
  statuses: Set<ColonistStatus> = new Set()

  constructor(id: string, name: string, color: string, x: number, y: number) {
    this.id = id
    this.name = name
    this.color = color
    this.position = { x, y }
    this.speed = 3
    this.state = { phase: 'idle' }
    this.needs = { hunger: 80, sleep: 80 }
  }

  transition(target: ColonistState): void {
    this.state = target
  }

  update(dt: number, map: GameMap): void {
    const s = this.state

    if (s.phase === 'idle') {
      return
    }

    if (s.phase === 'moving') {
      this.updateMoving(dt, map, s)
    }

    if (s.phase === 'working') {
      this.updateWorking(dt, s)
    }
  }

  private updateMoving(dt: number, map: GameMap, s: ColonistState & { phase: 'moving' }): void {
    if (s.path.length === 0) {
      this.state = { phase: 'idle' }
      return
    }

    const speed = this.speed * dt
    let remaining = speed

    while (remaining > 0 && s.path.length > 0) {
      const next = s.path[0]
      const dx = next.x - this.position.x
      const dy = next.y - this.position.y
      const dist = Math.abs(dx) + Math.abs(dy)

      if (remaining >= dist) {
        remaining -= dist

        const nextRx = Math.round(next.x)
        const nextRy = Math.round(next.y)
        const occupant = map.getOccupant(nextRx, nextRy)
        if (occupant !== null && occupant !== this.id) {
          this.state = { phase: 'idle' }
          this.reclaimCurrentTile(map)
          return
        }

        const curRx = Math.round(this.position.x)
        const curRy = Math.round(this.position.y)
        if (map.getOccupant(curRx, curRy) === this.id) {
          map.setOccupant(curRx, curRy, null)
        }

        this.position = { x: next.x, y: next.y }
        map.setOccupant(nextRx, nextRy, this.id)
        s.path.shift()
      } else {
        const nextRx = Math.round(next.x)
        const nextRy = Math.round(next.y)
        const occupant = map.getOccupant(nextRx, nextRy)
        if (occupant !== null && occupant !== this.id) {
          this.state = { phase: 'idle' }
          this.reclaimCurrentTile(map)
          return
        }
        const oldRx = Math.round(this.position.x)
        const oldRy = Math.round(this.position.y)
        const t = remaining / dist
        this.position = {
          x: this.position.x + dx * t,
          y: this.position.y + dy * t,
        }
        const newRx = Math.round(this.position.x)
        const newRy = Math.round(this.position.y)
        if (newRx !== oldRx || newRy !== oldRy) {
          if (map.getOccupant(oldRx, oldRy) === this.id) {
            map.setOccupant(oldRx, oldRy, null)
          }
        }
        if (map.getOccupant(newRx, newRy) === null) {
          map.setOccupant(newRx, newRy, this.id)
        }
        remaining = 0
      }
    }

    if (s.path.length === 0) {
      const ftx = Math.round(this.position.x)
      const fty = Math.round(this.position.y)
      if (map.getOccupant(ftx, fty) !== null && map.getOccupant(ftx, fty) !== this.id) {
        this.state = { phase: 'idle' }
        this.reclaimCurrentTile(map)
        return
      }
      const def = JOB_REGISTRY.get(s.job)
      this.state = { phase: 'working', job: s.job, progress: 0, duration: def?.duration ?? 0.5 }
    }
  }

  private reclaimCurrentTile(map: GameMap): void {
    this.occupyNearestFree(map, Math.round(this.position.x), Math.round(this.position.y))
  }

  private occupyNearestFree(map: GameMap, prefX: number, prefY: number): void {
    map.clearOccupantFor(this.id)
    const candidates = [
      { x: prefX, y: prefY },
      { x: Math.floor(this.position.x), y: Math.floor(this.position.y) },
      { x: Math.ceil(this.position.x), y: Math.ceil(this.position.y) },
    ]
    const seen = new Set<string>()
    for (const c of candidates) {
      const k = `${c.x},${c.y}`
      if (seen.has(k)) continue
      seen.add(k)
      if (c.x < 0 || c.x >= map.width || c.y < 0 || c.y >= map.height) continue
      const occ = map.getOccupant(c.x, c.y)
      if (occ === null || occ === this.id) {
        this.position = { x: c.x, y: c.y }
        map.setOccupant(c.x, c.y, this.id)
        return
      }
    }
    for (let radius = 1; radius <= 3; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          if (dx === 0 && dy === 0) continue
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue
          const sx = prefX + dx
          const sy = prefY + dy
          if (sx < 0 || sx >= map.width || sy < 0 || sy >= map.height) continue
          if (map.getOccupant(sx, sy) === null && map.isWalkable(sx, sy)) {
            this.position = { x: sx, y: sy }
            map.setOccupant(sx, sy, this.id)
            return
          }
        }
      }
    }
  }

  private updateWorking(dt: number, s: ColonistState & { phase: 'working' }): void {
    if (s.duration <= 0) {
      this.state = { phase: 'done', job: s.job }
      return
    }
    s.progress += dt / s.duration
    if (s.progress >= 1) {
      this.state = { phase: 'done', job: s.job }
    }
  }

  getInterpolatedPosition(): Vec2 {
    return { ...this.position }
  }

  isNeedCritical(need: 'hunger' | 'sleep'): boolean {
    return this.needs[need] < 20
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      color: this.color,
      position: { ...this.position },
      fsmState: this.state,
      needs: { ...this.needs },
      statuses: [...this.statuses],
      reservedBuildTaskId: this.reservedBuildTaskId,
    }
  }

  static fromJSON(data: any): Colonist {
    const c = new Colonist(data.id, data.name, data.color, data.position.x, data.position.y)
    c.needs = { hunger: data.needs.hunger, sleep: data.needs.sleep }

    if (data.fsmState) {
      c.state = data.fsmState
    } else if (data.state) {
      c.state = legacyStateToFSM(data)
    } else {
      c.state = { phase: 'idle' }
    }

    c.statuses = new Set(data.statuses ?? [])
    c.reservedBuildTaskId = data.reservedBuildTaskId ?? null

    return c
  }
}

function legacyStateToFSM(data: any): ColonistState {
  const oldState: string = data.state
  const currentJob = data.currentJob

  if (oldState === 'walking') {
    const job = currentJob?.type === 'walk' ? 'walk' : currentJob?.type || 'walk'
    const path = (data.path || []).map((p: any) => ({ x: p.x, y: p.y }))
    return { phase: 'moving', job, path }
  }

  if (oldState === 'eating' || oldState === 'sleeping' || oldState === 'building') {
    const job = oldState === 'eating' ? 'eat' : oldState === 'sleeping' ? 'sleep' : 'build'
    const duration = currentJob?.type === 'sleep' ? 10 : 0.5
    const progress = currentJob?.progress ?? (data.jobTimer ? Math.min(1, data.jobTimer / duration) : 0)
    return { phase: 'working', job, progress, duration }
  }

  return { phase: 'idle' }
}

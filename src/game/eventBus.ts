import { BuildTask } from './entities/building'
import { Vec2 } from './colony/types'

export interface GameEventMap {
  colonist_idle: { colonistId: string }
  build_queued: { task: BuildTask }
  food_consumed: { position: Vec2 }
  food_built: { position: Vec2 }
}

export type EventType = keyof GameEventMap

export class EventBus {
  private handlers = new Map<EventType, Set<(data: any) => void>>()

  on<K extends EventType>(type: K, handler: (data: GameEventMap[K]) => void): void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set())
    this.handlers.get(type)!.add(handler as (data: any) => void)
  }

  off<K extends EventType>(type: K, handler: (data: GameEventMap[K]) => void): void {
    this.handlers.get(type)?.delete(handler as (data: any) => void)
  }

  emit<K extends EventType>(type: K, data: GameEventMap[K]): void {
    this.handlers.get(type)?.forEach(h => h(data))
  }

  clear(): void {
    this.handlers.clear()
  }
}

export const eventBus = new EventBus()

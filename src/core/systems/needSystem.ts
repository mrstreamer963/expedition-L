export interface NeedsUpdatable {
  needs: { hunger: number; sleep: number }
}

export class NeedSystem {
  update(dt: number, colonists: NeedsUpdatable[]): void {
    for (const colonist of colonists) {
      colonist.needs.hunger = Math.max(0, colonist.needs.hunger - 0.5 * dt)
      colonist.needs.sleep = Math.max(0, colonist.needs.sleep - 0.3 * dt)
    }
  }
}

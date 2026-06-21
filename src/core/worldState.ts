import { World } from 'bitecs'
import { GameMap } from './world/map'
import { Colonist } from './colony/colonist'
import { BuildQueue } from './colony/buildQueue'

export class WorldState {
  ecs: World
  map: GameMap
  colonists: Colonist[]
  buildQueue: BuildQueue

  constructor(init: {
    ecs: World
    map: GameMap
    colonists: Colonist[]
    buildQueue: BuildQueue
  }) {
    this.ecs = init.ecs
    this.map = init.map
    this.colonists = init.colonists
    this.buildQueue = init.buildQueue
  }
}

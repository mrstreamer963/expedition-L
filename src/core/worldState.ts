import { GameMap } from './world/map'
import { Colonist } from './colony/colonist'
import { BuildQueue } from './entities/building'
import { Food } from './entities/food'
import { Bed } from './entities/bed'
import { Building } from './entities/building'

export class WorldState {
  map: GameMap
  colonists: Colonist[]
  buildQueue: BuildQueue
  foods: Food[]
  beds: Bed[]
  buildings: Building[]

  constructor(init: {
    map: GameMap
    colonists: Colonist[]
    buildQueue: BuildQueue
    foods: Food[]
    beds: Bed[]
    buildings: Building[]
  }) {
    this.map = init.map
    this.colonists = init.colonists
    this.buildQueue = init.buildQueue
    this.foods = init.foods
    this.beds = init.beds
    this.buildings = init.buildings
  }
}

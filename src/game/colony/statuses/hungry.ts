import { StatusDefinition } from '../types'

export const hungryStatus: StatusDefinition = {
  type: 'hungry',
  label: 'Голод',
  priority: 1,
  condition: colonist => colonist.needs.hunger < 25,
  jobType: 'eat',
}

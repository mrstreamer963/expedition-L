import { StatusDefinition } from '../types'

export const tiredStatus: StatusDefinition = {
  type: 'tired',
  label: 'Устал',
  priority: 2,
  condition: colonist => colonist.needs.sleep < 25,
  jobType: 'sleep',
}

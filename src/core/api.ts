import { getGreeting } from './index'

export class Api {
  getMessage(): string {
    return getGreeting()
  }
}

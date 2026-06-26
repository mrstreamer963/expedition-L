import { getGreeting } from './wasm'

export class Api {
  getMessage(): string {
    return getGreeting()
  }
}

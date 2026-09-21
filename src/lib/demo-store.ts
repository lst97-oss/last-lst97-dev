import { Store } from '@tanstack/store'

// Bun-native: framework-agnostic store. Single demo counter proving
// Form → Store wiring without a backend. No browser globals at module scope.
export const demoStore = new Store({
  count: 0,
  lastName: '',
})

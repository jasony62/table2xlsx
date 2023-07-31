import { defineStore } from 'pinia'

export default defineStore('main', {
  state: () => {
    return {
      selectors: [] as any[],
    }
  },
  actions: {
    setSelectors(selectors: any) {
      this.selectors = selectors
    },
  },
})

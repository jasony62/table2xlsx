import { createApp } from 'vue'
import './index.css' //tailwindcss
import router from './router'
import App from './App.vue'
import { createPinia } from 'pinia'

createApp(App).use(router).use(createPinia()).mount('#app')

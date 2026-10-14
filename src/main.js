import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { checkSession } from './session'
import './index.css'

checkSession()
createApp(App).use(router).mount('#app')

import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { clerkPlugin } from '@clerk/vue'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
    throw new Error('Missing Publishable Key')
}

const app = createApp(App)

app.use(router)
app.use(clerkPlugin, {
    publishableKey: PUBLISHABLE_KEY
})

app.mount('#app')

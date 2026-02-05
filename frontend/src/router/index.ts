import { createRouter, createWebHistory } from 'vue-router'
import AdminDashboard from '../pages/admin/AdminDashboard.vue'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'home',
            redirect: '/admin' // Redirect to admin for now as requested to focus on admin
        },
        {
            path: '/admin',
            name: 'admin',
            component: AdminDashboard
        }
    ]
})

export default router

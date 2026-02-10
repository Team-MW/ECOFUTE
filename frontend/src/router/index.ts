import { createRouter, createWebHistory } from 'vue-router'
import AdminDashboard from '../pages/admin/AdminDashboard.vue'
import Login from '../pages/Login.vue'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'home',
            redirect: '/admin'
        },
        {
            path: '/login',
            name: 'login',
            component: Login
        },
        {
            path: '/admin',
            name: 'admin',
            component: AdminDashboard
        }
    ]
})

export default router

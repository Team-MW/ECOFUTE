<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  PointElement,
  LineElement,
  Filler
} from 'chart.js'
import { Bar, Doughnut, Line } from 'vue-chartjs'
import { Users, Euro, FileText, CheckCircle, TrendingUp, Clock, BarChart3, Zap } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

// Register ChartJS components
ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement, PointElement, LineElement, Filler)

// --- Types ---
interface Sale {
    id: number
    title: string
    amount: number
    date: string // ISO date string
    status: string
    description?: string
}

interface Client {
    id: number
    status: string
    createdAt: string
    documents: any[]
}

// --- State ---
const sales = ref<Sale[]>([])
const clients = ref<Client[]>([])
const isLoading = ref(true)
const isDemoMode = ref(false)
const showEmptyState = computed(() => !isLoading.value && sales.value.length === 0 && clients.value.length === 0 && !isDemoMode.value)

// --- API ---
onMounted(async () => {
    try {
        const [salesRes, clientsRes] = await Promise.all([
            axios.get('/api/sales'),
            axios.get('/api/clients')
        ])
        sales.value = salesRes.data
        clients.value = clientsRes.data
    } catch (error) {
        console.error("Error fetching stats data:", error)
    } finally {
        isLoading.value = false
    }
})

// --- Mock Data ---
const generateMockData = () => {
    isDemoMode.value = true
    
    // Mock Clients
    clients.value = Array.from({ length: 15 }, (_, i) => ({
        id: i,
        status: Math.random() > 0.3 ? 'Validé' : (Math.random() > 0.5 ? 'En attente' : 'Rejeté'),
        createdAt: new Date().toISOString(),
        documents: Array(Math.floor(Math.random() * 5))
    }))

    // Mock Sales
    const today = new Date()
    sales.value = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(today.getFullYear(), today.getMonth() - Math.floor(Math.random() * 6), Math.floor(Math.random() * 28) + 1)
        return {
            id: i,
            title: `Vente #${i}`,
            amount: Math.floor(Math.random() * 500) + 50,
            date: d.toISOString(),
            status: Math.random() > 0.2 ? 'Payé' : (Math.random() > 0.5 ? 'En attente' : 'Annulé')
        }
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

// --- Computed Stats ---
const totalRevenue = computed(() => {
    return sales.value
        .filter(s => s.status === 'Payé')
        .reduce((sum, sale) => sum + sale.amount, 0)
})

const pendingRevenue = computed(() => {
    return sales.value
        .filter(s => s.status === 'En attente')
        .reduce((sum, sale) => sum + sale.amount, 0)
})

const activeClientsCount = computed(() => clients.value.filter(c => c.status === 'Validé').length)
const pendingClientsCount = computed(() => clients.value.filter(c => c.status === 'En attente').length)

const totalDocuments = computed(() => {
    return clients.value.reduce((acc, client) => acc + (client.documents?.length || 0), 0)
})

// --- Chart Data Generators ---

// 1. Revenue Over Time (Line Chart)
const revenueChartData = computed(() => {
    const grouped: Record<string, number> = {}
    const today = new Date()
    for (let i = 11; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
        const key = d.toISOString().slice(0, 7)
        grouped[key] = 0
    }
    
    sales.value.forEach(sale => {
        if (sale.status === 'Payé' || sale.status === 'En attente') {
            const key = sale.date ? sale.date.slice(0, 7) : '' 
            if (key && grouped[key] !== undefined) {
                grouped[key] += sale.amount
            }
        }
    })

    const labels: string[] = []
    const data: number[] = []

    for (let i = 11; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
        const key = d.toISOString().slice(0, 7)
        labels.push(d.toLocaleDateString('fr-FR', { month: 'short' }))
        data.push(grouped[key] || 0)
    }

    return {
        labels,
        datasets: [{
            label: 'Chiffre d\'affaires (€)',
            backgroundColor: (ctx: any) => {
                const canvas = ctx.chart.ctx;
                const gradient = canvas.createLinearGradient(0, 0, 0, 300);
                gradient.addColorStop(0, 'rgba(0, 0, 0, 0.2)');
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                return gradient;
            },
            borderColor: '#000000',
            data,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6
        }]
    }
})

// 2. Client Status Distribution (Doughnut)
const clientStatusChartData = computed(() => {
    const valid = clients.value.filter(c => c.status === 'Validé').length
    const pending = clients.value.filter(c => c.status === 'En attente').length
    const rejected = clients.value.filter(c => c.status === 'Rejeté' || c.status === 'Annulé').length 

    return {
        labels: ['Validés', 'En attente', 'Autres'],
        datasets: [{
            backgroundColor: ['#000000', '#fbbf24', '#e4e4e7'],
            data: [valid, pending, rejected],
            borderWidth: 0,
            hoverOffset: 4
        }]
    }
})

// 3. Sales Status (Bar Chart)
const salesStatusChartData = computed(() => {
    const paid = sales.value.filter(s => s.status === 'Payé').length
    const pending = sales.value.filter(s => s.status === 'En attente').length
    const cancelled = sales.value.filter(s => s.status === 'Annulé').length

    return {
        labels: ['Payées', 'En attente', 'Annulées'],
        datasets: [{
            label: 'Nombre de ventes',
            backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'],
            data: [paid, pending, cancelled],
            borderRadius: 4,
            barPercentage: 0.6
        }]
    }
})

// --- Chart Options ---
const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        tooltip: {
            backgroundColor: '#000',
            titleColor: '#fff',
            bodyColor: '#fff',
            padding: 10,
            cornerRadius: 4,
            callbacks: {
                label: (context: any) => ` ${context.parsed.y.toLocaleString()} €`
            }
        }
    },
    scales: {
        y: {
            beginAtZero: true,
            grid: { color: '#f4f4f5', borderDash: [5, 5] },
            ticks: { font: { size: 10 }, color: '#a1a1aa', callback: (value: any) => value + ' €' },
            border: { display: false }
        },
        x: {
            grid: { display: false },
            ticks: { font: { size: 10 }, color: '#a1a1aa' },
            border: { display: false }
        }
    }
}

const doughnutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '75%',
    plugins: {
        legend: { position: 'bottom' as const, labels: { usePointStyle: true, boxWidth: 6, padding: 20, font: { size: 11 } } }
    }
}

const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: {
        legend: { display: false }
    },
    scales: {
        x: {
            grid: { color: '#f4f4f5' },
            ticks: { font: { size: 10 }, color: '#a1a1aa' },
            border: { display: false }
        },
        y: {
            grid: { display: false },
            ticks: { font: { size: 11 }, color: '#52525b' },
            border: { display: false }
        }
    }
}

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(val)
}
</script>

<template>
    <div class="space-y-6 pb-10">
        <!-- Demo Mode Banner -->
        <div v-if="isDemoMode" class="bg-indigo-50 border border-indigo-100 p-3 rounded-md flex items-center justify-between text-indigo-900 text-sm">
            <div class="flex items-center gap-2">
                <Zap :size="16" class="text-indigo-600 fill-indigo-600" />
                <span class="font-bold">Mode Démonstration</span>
                <span class="opacity-80 hidden sm:inline">- Ces données sont simulées et non enregistrées.</span>
            </div>
            <Button @click="isDemoMode = false" variant="ghost" size="sm" class="h-6 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-900">
                Quitter
            </Button>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="flex flex-col items-center justify-center p-20 text-zinc-400 gap-4">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900"></div>
            <p class="text-sm">Chargement des données...</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="showEmptyState" class="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-zinc-200 rounded-lg min-h-[400px]">
             <div class="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mb-6 shadow-sm">
                <BarChart3 :size="32" class="text-zinc-300" />
            </div>
            <h3 class="text-xl font-bold text-zinc-900 mb-2">Aucune donnée disponible</h3>
            <p class="text-zinc-500 max-w-md mb-8">
                Votre tableau de bord est vide. Commencez par ajouter des clients et des ventes pour visualiser vos performances.
            </p>
            <div class="flex gap-4">
                <Button @click="generateMockData" variant="outline" class="border-zinc-300 hover:bg-zinc-50">
                    <Zap :size="14" class="mr-2" /> Simuler des données
                </Button>
            </div>
        </div>

        <!-- Main Dashboard Content -->
        <div v-else class="space-y-6">
            <!-- Header Stats Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <!-- Revenue Card -->
                <div class="bg-white p-6 border border-zinc-200 shadow-sm hover:border-black transition-all group">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-xs font-bold text-zinc-400 uppercase tracking-widest">Revenu Total</h3>
                        <div class="p-2 bg-green-50 rounded-full group-hover:bg-green-100 transition-colors">
                            <Euro :size="16" class="text-green-600" />
                        </div>
                    </div>
                    <div class="flex items-end gap-2">
                        <span class="text-3xl font-bold text-black tracking-tight">{{ formatCurrency(totalRevenue) }}</span>
                        <span v-if="pendingRevenue > 0" class="text-xs text-amber-500 font-medium mb-1.5">+{{ formatCurrency(pendingRevenue) }} en attente</span>
                    </div>
                </div>

                <!-- Clients Card -->
                <div class="bg-white p-6 border border-zinc-200 shadow-sm hover:border-black transition-all group">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-xs font-bold text-zinc-400 uppercase tracking-widest">Clients Actifs</h3>
                        <div class="p-2 bg-blue-50 rounded-full group-hover:bg-blue-100 transition-colors">
                            <Users :size="16" class="text-blue-600" />
                        </div>
                    </div>
                    <div class="flex items-end gap-2">
                        <span class="text-3xl font-bold text-black tracking-tight">{{ activeClientsCount }}</span>
                        <span class="text-sm text-zinc-500 mb-1">/ {{ clients.length }} total</span>
                    </div>
                </div>

                <!-- Pending Clients Card -->
                <div class="bg-white p-6 border border-zinc-200 shadow-sm hover:border-black transition-all group">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-xs font-bold text-zinc-400 uppercase tracking-widest">En Attente</h3>
                        <div class="p-2 bg-amber-50 rounded-full group-hover:bg-amber-100 transition-colors">
                            <Clock :size="16" class="text-amber-600" />
                        </div>
                    </div>
                    <div class="text-3xl font-bold text-black tracking-tight">{{ pendingClientsCount }}</div>
                </div>

                <!-- Documents Card -->
                <div class="bg-white p-6 border border-zinc-200 shadow-sm hover:border-black transition-all group">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-xs font-bold text-zinc-400 uppercase tracking-widest">Documents</h3>
                        <div class="p-2 bg-zinc-50 rounded-full group-hover:bg-zinc-100 transition-colors">
                            <FileText :size="16" class="text-zinc-600" />
                        </div>
                    </div>
                    <div class="text-3xl font-bold text-black tracking-tight">{{ totalDocuments }}</div>
                </div>
            </div>

            <!-- Charts Section -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Main Revenue Chart -->
                <div class="lg:col-span-2 bg-white p-6 border border-zinc-200 shadow-sm">
                    <div class="flex items-center justify-between mb-6">
                        <h3 class="font-bold text-zinc-900 flex items-center gap-2">
                            <TrendingUp :size="18" /> Évolution du Chiffre d'Affaires
                        </h3>
                        <div class="text-xs font-medium bg-zinc-100 px-2 py-1 rounded-sm text-zinc-600">Derniers 12 mois</div>
                    </div>
                    <div class="h-[300px] w-full">
                        <Line :data="revenueChartData" :options="lineChartOptions" />
                    </div>
                </div>

                <!-- Status Distribution -->
                <div class="bg-white p-6 border border-zinc-200 shadow-sm flex flex-col">
                    <h3 class="font-bold text-zinc-900 mb-6 flex items-center gap-2">
                        <CheckCircle :size="18" /> Statut des Clients
                    </h3>
                    <div class="flex-1 min-h-[200px] relative">
                        <Doughnut :data="clientStatusChartData" :options="doughnutChartOptions" />
                        <!-- Center Text -->
                        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div class="text-center mt-6">
                                <div class="text-2xl font-bold text-black">{{ clients.length }}</div>
                                <div class="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Total</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Sales Status Bar Chart -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="bg-white p-6 border border-zinc-200 shadow-sm">
                    <h3 class="font-bold text-zinc-900 mb-6">État des Ventes</h3>
                    <div class="h-[200px]">
                        <Bar :data="salesStatusChartData" :options="barChartOptions" />
                    </div>
                </div>
                
                <!-- Quick Actions / Additional Info Placeholder -->
                <div class="bg-zinc-50 border border-zinc-200 p-6 flex flex-col justify-center items-center text-center">
                    <div class="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3">
                        <TrendingUp class="text-zinc-400" :size="20" />
                    </div>
                    <h3 class="font-bold text-zinc-900 mb-1">Performance</h3>
                    <p class="text-sm text-zinc-500 max-w-xs">
                        Votre taux de conversion est stable. Pensez à relancer les {{ pendingClientsCount }} clients en attente pour augmenter votre chiffre d'affaires.
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>

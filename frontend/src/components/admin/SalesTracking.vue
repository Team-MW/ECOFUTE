<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { Plus, Search, Trash2, Edit2, TrendingUp, DollarSign, Calendar as CalendarIcon, Filter, ChevronLeft, ChevronRight, ChevronDown, Download } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import * as XLSX from 'xlsx'

interface Sale {
    id: number
    title: string
    description?: string
    amount: number
    date: string
    status: string
}

interface Client {
    id: number
    firstName: string
    lastName: string
    company?: string
}

// State
const sales = ref<Sale[]>([])
const clients = ref<Client[]>([])
const isLoading = ref(false)
const showSaleDialog = ref(false)
const editingSale = ref<Sale | null>(null)
const searchTerm = ref('')
const currentMonth = ref(new Date())

const isExistingClient = ref(true)
const selectedClientId = ref<string>('')

const saleForm = ref({
    title: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    status: 'Payé'
})

// Lifecycle
onMounted(() => {
    fetchSales()
    fetchClients()
})

// API Interactions
const fetchSales = async () => {
    try {
        isLoading.value = true
        const res = await axios.get('/api/sales')
        sales.value = res.data
    } catch (err) {
        console.error("Failed to fetch sales", err)
    } finally {
        isLoading.value = false
    }
}

const fetchClients = async () => {
    try {
        const res = await axios.get('/api/clients')
        clients.value = res.data
    } catch (err) {
        console.error("Failed to fetch clients", err)
    }
}

const saveSale = async () => {
    isLoading.value = true
    try {
        const payload = {
            title: saleForm.value.title,
            description: saleForm.value.description,
            amount: parseFloat(saleForm.value.amount),
            date: saleForm.value.date,
            status: saleForm.value.status
        }

        if (editingSale.value) {
            await axios.put(`/api/sales/${editingSale.value.id}`, payload)
        } else {
            await axios.post('/api/sales', payload)
        }
        
        await fetchSales()
        showSaleDialog.value = false
        editingSale.value = null
        resetForm()
    } catch (err) {
        alert("Erreur lors de la sauvegarde")
    } finally {
        isLoading.value = false
    }
}

const deleteSale = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette vente ?')) return
    try {
        await axios.delete(`/api/sales/${id}`)
        sales.value = sales.value.filter(s => s.id !== id)
    } catch (err) {
        alert("Erreur lors de la suppression")
    }
}

// Helper Methods
const resetForm = () => {
    saleForm.value = {
        title: '',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        status: 'Payé'
    }
    selectedClientId.value = ''
    isExistingClient.value = true
}

const handleClientSelect = () => {
    const client = clients.value.find(c => c.id.toString() === selectedClientId.value)
    if (client) {
        saleForm.value.title = client.company || `${client.firstName} ${client.lastName}`
    }
}

const openNewSaleDialog = () => {
    editingSale.value = null
    resetForm()
    showSaleDialog.value = true
}

const openEditSaleDialog = (sale: Sale) => {
    editingSale.value = sale
    saleForm.value = {
        title: sale.title,
        description: sale.description || '',
        amount: sale.amount.toString(),
        date: new Date(sale.date).toISOString().split('T')[0],
        status: sale.status
    }
    // Check if title matches a client to pre-select? OPTIONAL
    // For now, simpler to treat edit as "Manual" or just keep title as is.
    isExistingClient.value = false 
    showSaleDialog.value = true
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
}

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Export to Excel
const exportToExcel = () => {
    // Prepare data directly from sales state (all sales, not just filtered)
    const dataToExport = sales.value.map(sale => ({
        ID: sale.id,
        Titre: sale.title,
        Description: sale.description || '',
        Montant: sale.amount,
        Date: new Date(sale.date).toLocaleDateString('fr-FR'),
        Statut: sale.status
    }))

    const worksheet = XLSX.utils.json_to_sheet(dataToExport)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ventes")
    
    // Auto-width for columns
    const max_width = dataToExport.reduce((w, r) => Math.max(w, r.Titre.length), 10)
    worksheet["!cols"] = [ { wch: 5 }, { wch: max_width }, { wch: 30 }, { wch: 10 }, { wch: 12 }, { wch: 10 } ]

    XLSX.writeFile(workbook, `Ventes_EcoFute_${new Date().toISOString().split('T')[0]}.xlsx`)
}

// Month Navigation
const previousMonth = () => {
    currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() - 1, 1)
}

const nextMonth = () => {
    currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 1)
}

// Computed
const currentMonthLabel = computed(() => {
    return currentMonth.value.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
})

const filteredSales = computed(() => {
    return sales.value.filter(sale => {
        const saleDate = new Date(sale.date)
        const matchesMonth = saleDate.getMonth() === currentMonth.value.getMonth() && 
                           saleDate.getFullYear() === currentMonth.value.getFullYear()
        const matchesSearch = sale.title.toLowerCase().includes(searchTerm.value.toLowerCase())
        return matchesMonth && matchesSearch
    })
})

const totalSales = computed(() => {
    return filteredSales.value.reduce((sum, sale) => sum + sale.amount, 0)
})

const salesCount = computed(() => filteredSales.value.length)
</script>

<template>
    <div class="h-full flex flex-col bg-white">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-zinc-100 pb-6 px-1">
            <div>
                <h2 class="text-3xl font-bold text-zinc-900 tracking-tight flex items-center gap-3">
                    Suivi des Ventes
                    <Badge variant="outline" class="text-xs font-normal bg-zinc-50 border-zinc-200">
                        {{ currentMonthLabel }}
                    </Badge>
                </h2>
                <p class="text-sm text-zinc-500 mt-1">Gérez et suivez vos revenus mensuels.</p>
            </div>
            <div class="flex items-center gap-3">
                 <div class="flex items-center border border-zinc-200 bg-white rounded-sm mr-2">
                    <Button @click="previousMonth" variant="ghost" size="sm" class="h-9 w-9 hover:bg-zinc-50 text-zinc-600 rounded-none">
                        <ChevronLeft :size="18" />
                    </Button>
                    <div class="w-px h-5 bg-zinc-200"></div>
                     <span class="px-3 text-xs font-semibold uppercase tracking-wider min-w-[120px] text-center">{{ currentMonthLabel }}</span>
                    <div class="w-px h-5 bg-zinc-200"></div>
                    <Button @click="nextMonth" variant="ghost" size="sm" class="h-9 w-9 hover:bg-zinc-50 text-zinc-600 rounded-none">
                        <ChevronRight :size="18" />
                    </Button>
                </div>

                <Button @click="exportToExcel" variant="outline" class="border-zinc-200 text-zinc-700 hover:bg-zinc-50 h-10 px-4 uppercase tracking-wider text-xs font-bold transition-all">
                    <Download :size="16" class="mr-2" /> Export Excel
                </Button>

                <Button @click="openNewSaleDialog" class="bg-black hover:bg-zinc-800 text-white rounded-sm h-10 px-4 uppercase tracking-wider text-xs font-bold shadow-sm transition-all hover:shadow-md">
                    <Plus :size="16" class="mr-2" /> Nouvelle Vente
                </Button>
            </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="bg-zinc-50 border border-zinc-200 p-6 rounded-sm relative overflow-hidden group">
                <div class="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <DollarSign :size="64" />
                </div>
                <h3 class="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Total du mois</h3>
                <div class="text-3xl font-bold text-zinc-900 tracking-tight">{{ formatCurrency(totalSales) }}</div>
                <div class="mt-2 text-xs text-green-600 font-medium flex items-center gap-1">
                    <TrendingUp :size="12" /> Revenu net
                </div>
            </div>
            
             <div class="bg-white border border-zinc-200 p-6 rounded-sm relative overflow-hidden group hover:border-zinc-300 transition-colors">
                <div class="absolute right-0 top-0 p-4 opacity-10 text-blue-500">
                    <TrendingUp :size="64" />
                </div>
                <h3 class="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Nombre de ventes</h3>
                <div class="text-3xl font-bold text-zinc-900 tracking-tight">{{ salesCount }}</div>
                <div class="mt-2 text-xs text-zinc-500 font-medium">Transactions ce mois-ci</div>
            </div>

            <div class="bg-white border border-zinc-200 p-6 rounded-sm flex flex-col justify-center gap-3">
                 <div class="relative">
                    <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" :size="16" />
                    <Input v-model="searchTerm" placeholder="Rechercher une vente..." class="pl-9 h-10 text-sm bg-zinc-50 border-zinc-200 focus:border-black rounded-sm" />
                </div>
                <div class="flex items-center justify-between text-xs text-zinc-400 px-1">
                    <span>Filtres actifs: {{ searchTerm ? 'Recherche' : 'Aucun' }}</span>
                    <Filter :size="12" />
                </div>
            </div>
        </div>

        <!-- Sales Table -->
        <div class="border border-zinc-200 rounded-sm overflow-hidden bg-white flex-1 flex flex-col">
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-zinc-50/50 border-b border-zinc-200 text-xs uppercase tracking-widest font-bold text-zinc-500">
                            <th class="px-6 py-4">Vente</th>
                            <th class="px-6 py-4">Date</th>
                            <th class="px-6 py-4">Montant</th>
                            <th class="px-6 py-4">Statut</th>
                            <th class="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-zinc-100">
                        <tr v-if="filteredSales.length === 0">
                            <td colspan="5" class="px-6 py-12 text-center text-zinc-400 text-sm">
                                <div class="flex flex-col items-center justify-center gap-2">
                                    <div class="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center mb-1">
                                        <DollarSign class="text-zinc-300" :size="20" />
                                    </div>
                                    <p>Aucune vente trouvée pour ce mois.</p>
                                </div>
                            </td>
                        </tr>
                        <tr 
                            v-for="sale in filteredSales" 
                            :key="sale.id" 
                            class="hover:bg-zinc-50/80 transition-colors group"
                        >
                            <td class="px-6 py-4">
                                <div class="font-medium text-zinc-900 text-sm">{{ sale.title }}</div>
                                <div v-if="sale.description" class="text-xs text-zinc-500 mt-0.5 max-w-[200px] truncate">{{ sale.description }}</div>
                                <div class="text-[10px] text-zinc-400 mt-0.5 uppercase tracking-wide">ID: #{{ sale.id }}</div>
                            </td>
                            <td class="px-6 py-4">
                                <div class="flex items-center gap-2 text-sm text-zinc-600">
                                    <CalendarIcon :size="14" class="text-zinc-400" />
                                    {{ formatDate(sale.date) }}
                                </div>
                            </td>
                            <td class="px-6 py-4">
                                <span class="font-mono font-bold text-zinc-900">{{ formatCurrency(sale.amount) }}</span>
                            </td>
                            <td class="px-6 py-4">
                                <Badge 
                                    variant="outline" 
                                    :class="`rounded-sm text-[10px] uppercase font-bold tracking-wide border-0 px-2 py-0.5 ${
                                        sale.status === 'Payé' ? 'bg-green-100 text-green-700' : 
                                        sale.status === 'En attente' ? 'bg-yellow-100 text-yellow-700' : 
                                        'bg-red-100 text-red-700'
                                    }`"
                                >
                                    {{ sale.status }}
                                </Badge>
                            </td>
                            <td class="px-6 py-4 text-right">
                                <div class="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                    <Button @click="openEditSaleDialog(sale)" variant="ghost" size="sm" class="h-8 w-8 p-0 hover:bg-zinc-200 rounded-sm text-zinc-500">
                                        <Edit2 :size="14" />
                                    </Button>
                                    <Button @click="deleteSale(sale.id)" variant="ghost" size="sm" class="h-8 w-8 p-0 hover:bg-red-50 text-zinc-400 hover:text-red-600 rounded-sm">
                                        <Trash2 :size="14" />
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <!-- Summary Footer -->
             <div class="border-t border-zinc-200 bg-zinc-50 p-4 flex justify-between items-center mt-auto">
                <span class="text-xs text-zinc-500 font-medium uppercase tracking-wide">Total {{ currentMonthLabel }}</span>
                <span class="text-lg font-bold text-zinc-900 font-mono">{{ formatCurrency(totalSales) }}</span>
            </div>
        </div>

        <!-- Add/Edit Sale Dialog -->
        <Dialog v-model:open="showSaleDialog">
             <DialogContent class="sm:max-w-md rounded-sm border-zinc-200 p-0 overflow-hidden bg-white text-black">
                <DialogHeader class="p-6 pb-2 bg-zinc-50 border-b border-zinc-100">
                    <DialogTitle class="text-xl font-bold tracking-tight text-zinc-900">
                        {{ editingSale ? 'Modifier la Vente' : 'Nouvelle Vente' }}
                    </DialogTitle>
                    <DialogDescription class="text-xs font-medium uppercase tracking-wide text-zinc-500 mt-1">
                        Saisissez les détails de la transaction.
                    </DialogDescription>
                </DialogHeader>

                <form @submit.prevent="saveSale" class="p-6 space-y-5">
                    
                    <!-- Client / Title Selection Section -->
                    <div class="space-y-3 pb-3 border-b border-zinc-100">
                        <div class="flex items-center justify-between">
                            <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                {{ isExistingClient ? 'Client' : 'Titre / Intitulé' }}
                            </label>
                            <button 
                                type="button" 
                                @click="isExistingClient = !isExistingClient" 
                                class="text-xs font-bold text-black bg-zinc-100 hover:bg-zinc-200 px-3 py-1.5 rounded-sm transition-colors uppercase tracking-wide"
                            >
                                {{ isExistingClient ? 'Saisir manuellement' : 'Choisir un client' }}
                            </button>
                        </div>

                        <div v-if="isExistingClient" class="relative">
                             <select 
                                v-model="selectedClientId" 
                                @change="handleClientSelect"
                                required
                                class="w-full h-10 px-3 pr-10 rounded-sm border border-zinc-300 focus:border-black bg-white text-sm font-medium outline-none appearance-none"
                            >
                                <option value="" disabled>Sélectionner un client...</option>
                                <option v-for="client in clients" :key="client.id" :value="client.id">
                                    {{ client.company ? client.company + ' (' + client.firstName + ' ' + client.lastName + ')' : client.firstName + ' ' + client.lastName }}
                                </option>
                            </select>
                            <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <ChevronDown :size="14" class="text-zinc-500" />
                            </div>
                        </div>
                        <div v-else>
                            <Input v-model="saleForm.title" required placeholder="Ex: Prestation Site Web" class="rounded-sm border-zinc-300 focus:border-black bg-white text-black font-medium" />
                        </div>
                    </div>

                    <div class="space-y-1.5">
                        <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Description (Optionnel)</label>
                        <textarea 
                            v-model="saleForm.description" 
                            placeholder="Détails supplémentaires..." 
                            class="w-full px-3 py-2 border border-zinc-300 rounded-sm focus:border-black outline-none text-sm min-h-[60px] resize-none bg-white text-black font-medium"
                        ></textarea>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                         <div class="space-y-1.5">
                            <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Montant (€)</label>
                            <div class="relative">
                                <Input v-model="saleForm.amount" type="number" step="0.01" required placeholder="0.00" class="pl-8 rounded-sm border-zinc-300 focus:border-black bg-white text-black font-medium font-mono" />
                                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">€</span>
                            </div>
                        </div>
                        <div class="space-y-1.5">
                            <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Date</label>
                            <Input v-model="saleForm.date" type="date" required class="rounded-sm border-zinc-300 focus:border-black bg-white text-black font-medium" />
                        </div>
                    </div>

                    <div class="space-y-1.5">
                        <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Statut</label>
                        <select v-model="saleForm.status" class="w-full h-10 px-3 rounded-sm border border-zinc-300 focus:border-black bg-white text-sm font-medium outline-none appearance-none">
                            <option value="Payé">Payé</option>
                            <option value="En attente">En attente</option>
                            <option value="Annulé">Annulé</option>
                        </select>
                    </div>

                    <div class="flex justify-end gap-3 pt-4 border-t border-zinc-100 mt-2">
                        <Button type="button" variant="ghost" @click="showSaleDialog = false" class="rounded-sm hover:bg-zinc-100 text-zinc-500">
                            Annuler
                        </Button>
                        <Button type="submit" class="bg-black hover:bg-zinc-800 text-white rounded-sm min-w-[120px] font-bold">
                            {{ editingSale ? 'Mettre à jour' : 'Enregistrer' }}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    </div>
</template>

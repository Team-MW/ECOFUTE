<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { Plus, Shirt, Trash2, Loader, PackagePlus } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { showToast, showConfirm } from '@/lib/feedback'

interface Textile {
    id: number
    name: string
    size?: string | null
    color?: string | null
    quantity: number
    price: number
    notes?: string | null
}

const items = ref<Textile[]>([])
const isLoading = ref(false)
const isSaving = ref(false)
const showCreate = ref(false)
const stockItem = ref<Textile | null>(null)
const stockDelta = ref('1')

const form = ref({
    name: '',
    size: '',
    color: '',
    quantity: '1',
    price: '',
    notes: ''
})

const totalPieces = computed(() => items.value.reduce((sum, item) => sum + (item.quantity || 0), 0))
const lowStockCount = computed(() => items.value.filter(item => item.quantity <= 2).length)

onMounted(fetchItems)

async function fetchItems() {
    isLoading.value = true
    try {
        const res = await axios.get('/api/textiles')
        items.value = res.data
    } catch {
        showToast('Erreur chargement inventaire textile', 'error')
    } finally {
        isLoading.value = false
    }
}

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)

const openCreate = () => {
    form.value = { name: '', size: '', color: '', quantity: '1', price: '', notes: '' }
    showCreate.value = true
}

const saveProduct = async () => {
    if (!form.value.name) {
        showToast('Le nom du produit est requis', 'error')
        return
    }
    isSaving.value = true
    try {
        const res = await axios.post('/api/textiles', {
            name: form.value.name,
            size: form.value.size,
            color: form.value.color,
            quantity: form.value.quantity,
            price: form.value.price,
            notes: form.value.notes
        })
        items.value.unshift(res.data)
        showCreate.value = false
        showToast('Produit ajouté à l’inventaire textile', 'success')
    } catch (err: any) {
        showToast('Erreur: ' + (err.response?.data?.error || err.message), 'error')
    } finally {
        isSaving.value = false
    }
}

const addStock = async () => {
    if (!stockItem.value) return
    const qty = parseInt(stockDelta.value, 10)
    if (!qty) {
        showToast('Indique une quantité', 'error')
        return
    }
    try {
        const res = await axios.post(`/api/textiles/${stockItem.value.id}/stock`, { quantity: qty })
        const index = items.value.findIndex(item => item.id === res.data.id)
        if (index !== -1) items.value[index] = res.data
        stockItem.value = null
        showToast('Stock mis à jour', 'success')
    } catch (err: any) {
        showToast('Erreur: ' + (err.response?.data?.error || err.message), 'error')
    }
}

const deleteItem = async (item: Textile) => {
    const confirmed = await showConfirm({
        title: 'Retirer du stock',
        message: `Supprimer « ${item.name} » de l’inventaire textile ?`,
        type: 'danger',
        confirmText: 'Supprimer',
        cancelText: 'Annuler'
    })
    if (!confirmed) return
    try {
        await axios.delete(`/api/textiles/${item.id}`)
        items.value = items.value.filter(current => current.id !== item.id)
        showToast('Produit retiré', 'success')
    } catch {
        showToast('Erreur lors de la suppression', 'error')
    }
}
</script>

<template>
    <div class="h-full flex flex-col">
        <div class="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 border-b border-zinc-100 pb-6">
            <div>
                <h1 class="text-3xl font-bold text-black tracking-tight mb-2">Textile</h1>
                <p class="text-sm text-zinc-500">Crée un produit et mets-le dans l’inventaire textile.</p>
            </div>
            <Button @click="openCreate" class="bg-black hover:bg-zinc-800 text-white rounded-none px-6 h-10 uppercase tracking-wider text-xs font-semibold">
                <Plus :size="16" class="mr-2" /> Nouveau produit textile
            </Button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div class="border border-zinc-200 p-4">
                <p class="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Références</p>
                <p class="text-2xl font-bold text-black mt-1">{{ items.length }}</p>
            </div>
            <div class="border border-zinc-200 p-4">
                <p class="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Pièces en stock</p>
                <p class="text-2xl font-bold text-black mt-1">{{ totalPieces }}</p>
            </div>
            <div class="border border-zinc-200 p-4">
                <p class="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Stock faible</p>
                <p class="text-2xl font-bold text-black mt-1">{{ lowStockCount }}</p>
            </div>
        </div>

        <div class="bg-white border border-zinc-200 overflow-hidden flex-1">
            <table class="w-full text-left border-collapse">
                <thead class="bg-zinc-50 text-zinc-500 text-[10px] uppercase tracking-widest font-bold border-b border-zinc-200">
                    <tr>
                        <th class="px-6 py-4">Produit</th>
                        <th class="px-6 py-4">Taille</th>
                        <th class="px-6 py-4">Couleur</th>
                        <th class="px-6 py-4">Stock</th>
                        <th class="px-6 py-4">Prix</th>
                        <th class="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-zinc-100">
                    <tr v-if="isLoading">
                        <td colspan="6" class="p-8 text-center text-zinc-500">
                            <Loader class="animate-spin mx-auto" :size="20" />
                        </td>
                    </tr>
                    <tr v-else-if="items.length === 0">
                        <td colspan="6" class="p-12 text-center text-zinc-400 text-sm">
                            Aucun produit textile. Crée-en un pour l’ajouter à l’inventaire.
                        </td>
                    </tr>
                    <tr v-else v-for="item in items" :key="item.id" class="hover:bg-zinc-50">
                        <td class="px-6 py-4">
                            <div class="flex items-center gap-3">
                                <div class="w-9 h-9 border border-zinc-200 flex items-center justify-center">
                                    <Shirt :size="16" class="text-zinc-500" />
                                </div>
                                <div>
                                    <p class="font-bold text-sm text-zinc-900">{{ item.name }}</p>
                                    <p v-if="item.notes" class="text-xs text-zinc-400 truncate max-w-[220px]">{{ item.notes }}</p>
                                </div>
                            </div>
                        </td>
                        <td class="px-6 py-4 text-sm">{{ item.size || '—' }}</td>
                        <td class="px-6 py-4 text-sm">{{ item.color || '—' }}</td>
                        <td class="px-6 py-4">
                            <Badge
                                variant="outline"
                                :class="item.quantity <= 2 ? 'border-amber-300 text-amber-700 bg-amber-50' : 'border-zinc-200'"
                            >
                                {{ item.quantity }} pce
                            </Badge>
                        </td>
                        <td class="px-6 py-4 font-mono text-sm">{{ formatCurrency(item.price) }}</td>
                        <td class="px-6 py-4 text-right">
                            <div class="flex justify-end gap-1">
                                <Button variant="ghost" size="sm" class="h-8 px-2 text-xs" @click="stockItem = item; stockDelta = '1'">
                                    <PackagePlus :size="14" class="mr-1" /> Stock
                                </Button>
                                <Button variant="ghost" size="sm" class="h-8 w-8 p-0 text-zinc-400 hover:text-red-600" @click="deleteItem(item)">
                                    <Trash2 :size="14" />
                                </Button>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <Dialog v-model:open="showCreate">
            <DialogContent class="sm:max-w-md rounded-2xl p-6 bg-white">
                <DialogHeader>
                    <DialogTitle>Nouveau produit textile</DialogTitle>
                    <DialogDescription>Il sera ajouté directement à l’inventaire.</DialogDescription>
                </DialogHeader>
                <form @submit.prevent="saveProduct" class="space-y-4 pt-2">
                    <div class="space-y-1">
                        <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Nom</label>
                        <Input v-model="form.name" required placeholder="Ex: T-shirt EcoFuté" />
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div class="space-y-1">
                            <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Taille</label>
                            <Input v-model="form.size" placeholder="S, M, L..." />
                        </div>
                        <div class="space-y-1">
                            <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Couleur</label>
                            <Input v-model="form.color" placeholder="Noir, blanc..." />
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div class="space-y-1">
                            <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Quantité initiale</label>
                            <Input v-model="form.quantity" type="number" min="0" />
                        </div>
                        <div class="space-y-1">
                            <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Prix (€)</label>
                            <Input v-model="form.price" type="number" step="0.01" placeholder="0.00" />
                        </div>
                    </div>
                    <div class="space-y-1">
                        <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Notes</label>
                        <Input v-model="form.notes" placeholder="Matière, référence..." />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" @click="showCreate = false">Annuler</Button>
                        <Button type="submit" :disabled="isSaving" class="bg-zinc-950 text-white">
                            <Loader v-if="isSaving" class="animate-spin mr-2" :size="14" />
                            Ajouter à l’inventaire
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>

        <Dialog :open="!!stockItem" @update:open="(open) => { if (!open) stockItem = null }">
            <DialogContent class="sm:max-w-sm rounded-2xl p-6 bg-white">
                <DialogHeader>
                    <DialogTitle>Ajouter au stock</DialogTitle>
                    <DialogDescription v-if="stockItem">{{ stockItem.name }} — stock actuel : {{ stockItem.quantity }}</DialogDescription>
                </DialogHeader>
                <div class="space-y-3 pt-2">
                    <Input v-model="stockDelta" type="number" placeholder="Quantité à ajouter (ex: 5 ou -1)" />
                    <p class="text-[10px] text-zinc-400">Nombre positif pour entrer du stock, négatif pour en retirer.</p>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" @click="stockItem = null">Annuler</Button>
                    <Button class="bg-zinc-950 text-white" @click="addStock">Mettre à jour</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
</template>

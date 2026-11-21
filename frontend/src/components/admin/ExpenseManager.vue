<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { Plus, Trash2, Pencil, FileText, Receipt, StickyNote, Download, Loader } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import { showToast, showConfirm } from '@/lib/feedback'
import { isInPeriod, type PeriodMode } from '@/lib/period'

interface Expense {
    id: number
    title: string
    amount: number
    date: string
    type: string
    notes?: string | null
    fileName?: string | null
    fileUrl?: string | null
    fileType?: string | null
    fileSize?: string | null
}

const props = defineProps<{
    periodMode: PeriodMode
    currentDate: Date
}>()

const expenses = ref<Expense[]>([])
const isLoading = ref(false)
const isSaving = ref(false)
const showDialog = ref(false)
const selectedFile = ref<File | null>(null)
const editingExpense = ref<Expense | null>(null)

const form = ref({
    title: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    type: 'facture',
    notes: ''
})

onMounted(fetchExpenses)

async function fetchExpenses() {
    isLoading.value = true
    try {
        const res = await axios.get('/api/expenses')
        expenses.value = res.data
    } catch (err) {
        console.error(err)
    } finally {
        isLoading.value = false
    }
}

const filteredExpenses = computed(() => {
    return expenses.value.filter(expense => {
        const date = new Date(expense.date)
        return isInPeriod(date, props.periodMode, props.currentDate)
    })
})

const totalExpenses = computed(() =>
    filteredExpenses.value.reduce((sum, expense) => sum + (expense.amount || 0), 0)
)

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)

const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

const typeLabel = (type: string) => {
    if (type === 'ticket') return 'Ticket'
    if (type === 'note') return 'Note'
    return 'Facture'
}

const openCreate = () => {
    editingExpense.value = null
    form.value = {
        title: '',
        amount: '',
        date: new Date().toISOString().slice(0, 10),
        type: 'facture',
        notes: ''
    }
    selectedFile.value = null
    showDialog.value = true
}

const openEdit = (expense: Expense) => {
    editingExpense.value = expense
    form.value = {
        title: expense.title,
        amount: expense.amount != null ? String(expense.amount) : '',
        date: new Date(expense.date).toISOString().slice(0, 10),
        type: expense.type || 'facture',
        notes: expense.notes || ''
    }
    selectedFile.value = null
    showDialog.value = true
}

const onFileChange = (event: Event) => {
    const input = event.target as HTMLInputElement
    selectedFile.value = input.files?.[0] || null
}

const saveExpense = async () => {
    isSaving.value = true
    try {
        const payload = new FormData()
        payload.append('title', form.value.title)
        payload.append('amount', form.value.amount || '0')
        payload.append('date', form.value.date)
        payload.append('type', form.value.type)
        payload.append('notes', form.value.notes)
        if (selectedFile.value) {
            payload.append('file', selectedFile.value)
        }
        if (editingExpense.value) {
            await axios.put(`/api/expenses/${editingExpense.value.id}`, payload)
        } else {
            await axios.post('/api/expenses', payload)
        }
        await fetchExpenses()
        showDialog.value = false
        showToast(editingExpense.value ? 'Dépense modifiée' : 'Dépense enregistrée', 'success')
        editingExpense.value = null
    } catch (err: any) {
        showToast('Erreur: ' + (err.response?.data?.error || err.message), 'error')
    } finally {
        isSaving.value = false
    }
}

const deleteExpense = async (expense: Expense) => {
    const confirmed = await showConfirm({
        title: 'Supprimer la dépense',
        message: `Supprimer « ${expense.title} » ?`,
        type: 'danger',
        confirmText: 'Supprimer',
        cancelText: 'Annuler'
    })
    if (!confirmed) return
    try {
        await axios.delete(`/api/expenses/${expense.id}`)
        expenses.value = expenses.value.filter(item => item.id !== expense.id)
        showToast('Dépense supprimée', 'success')
    } catch {
        showToast('Erreur lors de la suppression', 'error')
    }
}
</script>

<template>
    <div class="flex flex-col gap-6">
        <div class="flex items-center justify-between">
            <div>
                <h3 class="text-lg font-bold text-zinc-900">Dépenses</h3>
                <p class="text-sm text-zinc-500">Factures, tickets et notes de frais.</p>
            </div>
            <Button @click="openCreate" class="bg-black hover:bg-zinc-800 text-white rounded-sm h-10 px-4 uppercase tracking-wider text-xs font-bold">
                <Plus :size="16" class="mr-2" /> Nouvelle dépense
            </Button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-zinc-50 border border-zinc-200 p-5">
                <p class="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Total dépenses</p>
                <p class="text-2xl font-bold text-zinc-900 mt-1">{{ formatCurrency(totalExpenses) }}</p>
            </div>
            <div class="bg-white border border-zinc-200 p-5">
                <p class="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Documents</p>
                <p class="text-2xl font-bold text-zinc-900 mt-1">{{ filteredExpenses.length }}</p>
            </div>
        </div>

        <div class="border border-zinc-200 bg-white">
            <div v-if="isLoading && expenses.length === 0">
                <SkeletonLoader type="table" :rows="4" />
            </div>
            <div v-else-if="filteredExpenses.length === 0" class="p-12 text-center text-sm text-zinc-400">
                Aucune dépense sur cette période.
            </div>
            <div v-else class="divide-y divide-zinc-100">
                <div v-for="expense in filteredExpenses" :key="expense.id" class="p-5 flex flex-col md:flex-row md:items-start gap-4">
                    <div class="w-10 h-10 border border-zinc-200 flex items-center justify-center shrink-0">
                        <Receipt v-if="expense.type === 'ticket'" :size="16" class="text-zinc-500" />
                        <StickyNote v-else-if="expense.type === 'note'" :size="16" class="text-zinc-500" />
                        <FileText v-else :size="16" class="text-zinc-500" />
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                            <p class="font-bold text-sm text-zinc-900">{{ expense.title }}</p>
                            <Badge variant="outline" class="rounded-none text-[10px] uppercase">{{ typeLabel(expense.type) }}</Badge>
                        </div>
                        <p class="text-xs text-zinc-500 mt-1">{{ formatDate(expense.date) }}</p>
                        <p v-if="expense.notes" class="text-sm text-zinc-600 mt-2 whitespace-pre-wrap">{{ expense.notes }}</p>
                        <a
                            v-if="expense.fileUrl"
                            :href="expense.fileUrl"
                            target="_blank"
                            class="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-zinc-700 border border-zinc-200 px-2 py-1 hover:border-black"
                        >
                            <Download :size="12" />
                            {{ expense.fileName || 'Document' }}
                            <span v-if="expense.fileSize" class="text-zinc-400">{{ expense.fileSize }}</span>
                        </a>
                    </div>
                    <div class="flex items-center gap-3 shrink-0">
                        <span class="font-mono font-bold text-zinc-900">{{ formatCurrency(expense.amount) }}</span>
                        <div class="flex flex-row md:flex-col items-center gap-1">
                            <Button variant="ghost" size="sm" class="h-8 w-8 p-0 text-zinc-400 hover:text-red-600" title="Supprimer" @click="deleteExpense(expense)">
                                <Trash2 :size="14" />
                            </Button>
                            <Button variant="ghost" size="sm" class="h-8 w-8 p-0 text-zinc-400 hover:text-black" title="Modifier" @click="openEdit(expense)">
                                <Pencil :size="14" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <Dialog v-model:open="showDialog">
            <DialogContent class="sm:max-w-md rounded-2xl border-zinc-200/60 p-6 bg-white">
                <DialogHeader>
                    <DialogTitle class="text-xl font-bold">{{ editingExpense ? 'Modifier la dépense' : 'Nouvelle dépense' }}</DialogTitle>
                    <DialogDescription>{{ editingExpense ? 'Modifiez les informations ou ajoutez le document.' : 'Ajoutez une facture, un ticket ou une note.' }}</DialogDescription>
                </DialogHeader>
                <form @submit.prevent="saveExpense" class="space-y-4 pt-2">
                    <div class="space-y-1">
                        <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Type</label>
                        <select v-model="form.type" class="w-full h-10 px-3 rounded-xl border border-zinc-300 bg-white text-sm">
                            <option value="facture">Facture</option>
                            <option value="ticket">Ticket</option>
                            <option value="note">Note</option>
                        </select>
                    </div>
                    <div class="space-y-1">
                        <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Intitulé</label>
                        <Input v-model="form.title" required placeholder="Ex: Fournitures, essence..." />
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div class="space-y-1">
                            <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Montant (€)</label>
                            <Input v-model="form.amount" type="number" step="0.01" placeholder="0.00" />
                        </div>
                        <div class="space-y-1">
                            <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Date</label>
                            <Input v-model="form.date" type="date" required />
                        </div>
                    </div>
                    <div class="space-y-1">
                        <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Notes</label>
                        <Textarea v-model="form.notes" placeholder="Détail, contexte..." class="min-h-[80px]" />
                    </div>
                    <div class="space-y-1">
                        <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Document (facture / ticket)</label>
                        <a
                            v-if="editingExpense?.fileUrl"
                            :href="editingExpense.fileUrl"
                            target="_blank"
                            class="flex items-center gap-1.5 text-xs font-medium text-zinc-700 border border-zinc-200 px-2 py-1.5 hover:border-black w-fit max-w-full"
                        >
                            <Download :size="12" class="shrink-0" />
                            <span class="truncate">{{ editingExpense.fileName || 'Document actuel' }}</span>
                        </a>
                        <input :key="editingExpense?.id ?? 'new'" type="file" class="block w-full text-xs text-zinc-500" @change="onFileChange" />
                        <p v-if="editingExpense?.fileUrl" class="text-[11px] text-zinc-400">Choisir un fichier remplacera le document actuel.</p>
                    </div>
                    <div class="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" @click="showDialog = false">Annuler</Button>
                        <Button type="submit" :disabled="isSaving" class="bg-zinc-950 text-white">
                            <Loader v-if="isSaving" class="animate-spin mr-2" :size="14" />
                            {{ editingExpense ? 'Mettre à jour' : 'Enregistrer' }}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    </div>
</template>

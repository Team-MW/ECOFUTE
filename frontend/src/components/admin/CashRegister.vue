<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import axios from 'axios'
import { useUser } from '@clerk/vue'
import { ChevronDown, Loader, Banknote, CreditCard, FileText, Landmark } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { showToast } from '@/lib/feedback'

interface Client {
    id: number
    firstName: string | null
    lastName: string | null
    company?: string | null
}

// Same services as admin "Suivi de Vente" so sales are categorised identically
const SERVICE_OPTIONS = ['PAPERASSE', 'TEXTILE', 'SERRURERIE', 'SIV', 'REPROGRAPHIE'] as const

const PAYMENT_METHODS = [
    { value: 'Espèces', icon: Banknote },
    { value: 'CB', icon: CreditCard },
    { value: 'Chèque', icon: FileText },
    { value: 'Virement', icon: Landmark },
] as const

const { user } = useUser()

const clients = ref<Client[]>([])
const isSubmitting = ref(false)
const showValidated = ref(false)
let validatedTimer: ReturnType<typeof setTimeout> | null = null

const emptyForm = () => ({
    service: '' as string,
    clientId: '' as string,
    label: '',
    note: '',
    amount: '',
    paymentMethod: 'Espèces' as string,
})
const form = ref(emptyForm())

onMounted(async () => {
    try {
        const res = await axios.get('/api/clients')
        clients.value = res.data
    } catch (err) {
        console.error('Failed to fetch clients', err)
    }
})

onBeforeUnmount(() => {
    if (validatedTimer) clearTimeout(validatedTimer)
})

const clientName = (c: Client) =>
    c.company || `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || `Client #${c.id}`

const submit = async () => {
    if (isSubmitting.value) return

    const amount = parseFloat(String(form.value.amount).replace(',', '.'))
    if (isNaN(amount) || amount <= 0) {
        showToast('Veuillez saisir un montant valide', 'error')
        return
    }
    if (!form.value.service && !form.value.clientId && !form.value.label.trim()) {
        showToast('Choisissez un service, un client ou saisissez un intitulé', 'error')
        return
    }

    const client = clients.value.find(c => c.id.toString() === form.value.clientId)
    const title =
        form.value.label.trim() ||
        (client ? clientName(client) : '') ||
        form.value.service ||
        'Encaissement caisse'

    const cashier =
        user.value?.fullName ||
        user.value?.firstName ||
        user.value?.emailAddresses?.[0]?.emailAddress ||
        'Alternant'

    const descriptionParts = [
        `Paiement : ${form.value.paymentMethod}`,
        `Encaissé par : ${cashier}`,
    ]
    if (form.value.note.trim()) descriptionParts.push(form.value.note.trim())

    isSubmitting.value = true
    try {
        await axios.post('/api/sales', {
            title,
            description: descriptionParts.join(' — '),
            amount,
            date: new Date().toISOString(),
            status: 'Payé',
            service: form.value.service || null,
            clientId: client ? client.id : undefined,
        })

        // Clear everything first so the amount never stays on screen
        form.value = emptyForm()
        showValidated.value = true
        if (validatedTimer) clearTimeout(validatedTimer)
        validatedTimer = setTimeout(() => { showValidated.value = false }, 2500)
    } catch (err: any) {
        console.error(err)
        showToast(err.response?.data?.error || "Erreur lors de l'encaissement", 'error')
    } finally {
        isSubmitting.value = false
    }
}

const dismissValidated = () => {
    if (validatedTimer) clearTimeout(validatedTimer)
    showValidated.value = false
}
</script>

<template>
    <div class="h-full flex flex-col bg-white relative">
        <div class="mb-8 border-b border-zinc-100 pb-6">
            <h1 class="text-3xl font-bold text-black tracking-tight mb-2">Caisse</h1>
            <p class="text-sm text-zinc-500">Enregistrez un encaissement. Il est transmis directement au suivi des ventes.</p>
        </div>

        <form @submit.prevent="submit" class="w-full max-w-lg space-y-6">
            <!-- Service -->
            <div class="space-y-1.5">
                <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Produit / Service</label>
                <div class="relative">
                    <select
                        v-model="form.service"
                        class="w-full h-11 px-3 pr-10 rounded-sm border border-zinc-300 focus:border-black outline-none appearance-none bg-white text-sm font-medium"
                    >
                        <option value="">Vente libre</option>
                        <option v-for="s in SERVICE_OPTIONS" :key="s" :value="s">{{ s }}</option>
                    </select>
                    <ChevronDown :size="14" class="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                </div>
            </div>

            <!-- Client -->
            <div class="space-y-1.5">
                <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Client (optionnel)</label>
                <div class="relative">
                    <select
                        v-model="form.clientId"
                        class="w-full h-11 px-3 pr-10 rounded-sm border border-zinc-300 focus:border-black outline-none appearance-none bg-white text-sm font-medium"
                    >
                        <option value="">Client de passage</option>
                        <option v-for="c in clients" :key="c.id" :value="c.id.toString()">{{ clientName(c) }}</option>
                    </select>
                    <ChevronDown :size="14" class="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                </div>
            </div>

            <!-- Label -->
            <div class="space-y-1.5">
                <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Intitulé (optionnel)</label>
                <Input v-model="form.label" placeholder="Ex : Photocopies, Carte grise…" class="h-11 rounded-sm border-zinc-300 focus:border-black" />
            </div>

            <!-- Amount -->
            <div class="space-y-1.5">
                <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Montant (€)</label>
                <div class="relative">
                    <Input
                        v-model="form.amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        inputmode="decimal"
                        required
                        autocomplete="off"
                        placeholder="0.00"
                        class="h-14 pl-9 text-2xl font-mono font-bold rounded-sm border-zinc-300 focus:border-black"
                    />
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-lg">€</span>
                </div>
            </div>

            <!-- Payment method -->
            <div class="space-y-1.5">
                <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Mode de paiement</label>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                        v-for="m in PAYMENT_METHODS"
                        :key="m.value"
                        type="button"
                        @click="form.paymentMethod = m.value"
                        :class="`h-14 flex flex-col items-center justify-center gap-1 border text-xs font-semibold rounded-sm transition-colors ${form.paymentMethod === m.value ? 'bg-black text-white border-black' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'}`"
                    >
                        <component :is="m.icon" :size="18" />
                        {{ m.value }}
                    </button>
                </div>
            </div>

            <!-- Note -->
            <div class="space-y-1.5">
                <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Note (optionnel)</label>
                <textarea
                    v-model="form.note"
                    placeholder="Détails supplémentaires…"
                    class="w-full px-3 py-2 border border-zinc-300 rounded-sm focus:border-black outline-none text-sm min-h-[60px] resize-none bg-white"
                ></textarea>
            </div>

            <Button
                type="submit"
                :disabled="isSubmitting"
                class="w-full h-12 bg-black hover:bg-zinc-800 text-white rounded-sm uppercase tracking-wider text-sm font-bold"
            >
                <Loader v-if="isSubmitting" class="animate-spin mr-2" :size="16" />
                Encaisser
            </Button>
        </form>

        <!-- Validation overlay: no amount, no total, just confirmation -->
        <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0"
            leave-active-class="transition duration-300 ease-in"
            leave-to-class="opacity-0"
        >
            <div
                v-if="showValidated"
                class="fixed inset-0 z-[60] flex items-center justify-center bg-white/90 backdrop-blur-sm"
                @click="dismissValidated"
            >
                <div class="flex flex-col items-center gap-4 validated-pop">
                    <div class="text-[96px] leading-none select-none" aria-hidden="true">✅</div>
                    <p class="text-xl font-bold text-black tracking-tight">Encaissement validé</p>
                </div>
            </div>
        </Transition>
    </div>
</template>

<style scoped>
.validated-pop {
    animation: pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes pop {
    0% { transform: scale(0.5); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
}
</style>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { Plus, Trash2, Printer, Save, Loader } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface InvoiceItem {
    id: number
    description: string
    quantity: number
    price: number
}

interface Client {
    id: number
    firstName: string
    lastName: string
    email: string
    company?: string
}

// State
const clients = ref<Client[]>([])
const selectedClientId = ref<string>('')
const clientName = ref('')
const clientEmail = ref('')
const isSaving = ref(false)

const invoiceDate = ref(new Date().toISOString().split('T')[0])
const invoiceNumber = ref(`FAC-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`)
const items = ref<InvoiceItem[]>([
    { id: 1, description: 'Prestation de service', quantity: 1, price: 0 }
])

// Computed
const subtotal = computed(() => {
    return items.value.reduce((sum, item) => sum + (item.quantity * item.price), 0)
})

const taxRate = 0.20 // 20% VAT
const taxAmount = computed(() => subtotal.value * taxRate)
const total = computed(() => subtotal.value + taxAmount.value)

// Methods
const fetchClients = async () => {
    try {
        const res = await axios.get('/api/clients')
        clients.value = res.data
    } catch (e) {
        console.error("Failed to fetch clients", e)
    }
}

const handleClientSelect = () => {
    const client = clients.value.find(c => c.id.toString() === selectedClientId.value)
    if (client) {
        clientName.value = client.company || `${client.firstName} ${client.lastName}`
        clientEmail.value = client.email
    }
}

const addItem = () => {
    items.value.push({
        id: Date.now(),
        description: '',
        quantity: 1,
        price: 0
    })
}

const removeItem = (id: number) => {
    items.value = items.value.filter(item => item.id !== id)
}

const printInvoice = () => {
    window.print()
}

const saveInvoice = async () => {
    if (!clientName.value) {
        alert("Veuillez indiquer un client.")
        return
    }

    isSaving.value = true
    try {
        // Prepare payload for Sales API
        // We store detailed invoice data in the description for now
        const invoiceData = {
            number: invoiceNumber.value,
            clientId: selectedClientId.value,
            clientName: clientName.value,
            clientEmail: clientEmail.value,
            items: items.value,
            subtotal: subtotal.value,
            tax: taxAmount.value,
            total: total.value
        }

        await axios.post('/api/sales', {
            title: `Facture ${invoiceNumber.value} - ${clientName.value}`,
            description: JSON.stringify(invoiceData),
            amount: total.value,
            date: invoiceDate.value,
            status: 'En attente'
        })

        alert("Facture enregistrée avec succès dans le suivi des ventes !")
    } catch (e) {
        console.error(e)
        alert("Erreur lors de l'enregistrement.")
    } finally {
        isSaving.value = false
    }
}

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val)
}

onMounted(fetchClients)
</script>

<template>
    <div class="max-w-4xl mx-auto bg-white min-h-screen pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <!-- Header Actions -->
        <div class="mb-8 flex justify-between items-center print:hidden border-b border-zinc-100 pb-6">
            <div>
                <h1 class="text-3xl font-bold text-black tracking-tight mb-2">Création de Facture</h1>
                <p class="text-sm text-zinc-500">Générez des factures professionnelles pour vos clients.</p>
            </div>
            <div class="flex gap-3">
                 <Button @click="saveInvoice" :disabled="isSaving" variant="outline" class="border-zinc-200 text-zinc-900 h-10">
                    <Loader v-if="isSaving" class="animate-spin mr-2" :size="16" />
                    <Save v-else :size="16" class="mr-2" /> Enregistrer
                </Button>
                <Button @click="printInvoice" class="bg-black text-white hover:bg-zinc-800 h-10">
                    <Printer :size="16" class="mr-2" /> Imprimer / PDF
                </Button>
            </div>
        </div>

        <!-- Invoice Preview / Editor -->
        <div class="bg-white border border-zinc-200 shadow-sm p-8 md:p-12 print:border-0 print:shadow-none print:p-0">
            
            <!-- Invoice Header -->
            <div class="flex flex-col md:flex-row justify-between mb-12">
                <div>
                     <div class="flex items-center gap-2 mb-4">
                        <div class="w-8 h-8 bg-black flex items-center justify-center text-white font-bold rounded-sm">E</div>
                        <span class="text-xl font-bold tracking-tighter">EcoFuté.</span>
                    </div>
                    <div class="text-sm text-zinc-500 space-y-1">
                        <p>123 Avenue de l'Innovation</p>
                        <p>31000 Toulouse, France</p>
                        <p>contact@ecofute.com</p>
                        <p>SIRET: 123 456 789 00012</p>
                    </div>
                </div>
                <div class="mt-8 md:mt-0 text-right">
                    <h2 class="text-4xl font-light text-zinc-200 uppercase tracking-widest mb-4">Facture</h2>
                    <div class="flex flex-col items-end gap-2">
                        <div class="flex items-center gap-4">
                            <span class="text-sm font-bold uppercase tracking-wider text-zinc-400">Numéro</span>
                            <Input v-model="invoiceNumber" class="w-40 text-right font-mono text-sm h-8" />
                        </div>
                        <div class="flex items-center gap-4">
                            <span class="text-sm font-bold uppercase tracking-wider text-zinc-400">Date</span>
                            <Input type="date" v-model="invoiceDate" class="w-40 text-right text-sm h-8" />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Client Info -->
            <div class="mb-12 border-t border-zinc-100 pt-8">
                <h3 class="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">Facturé à</h3>
                
                <!-- Client Selection Dropdown (Hidden in Print) -->
                <div class="mb-4 print:hidden">
                    <select 
                        v-model="selectedClientId" 
                        @change="handleClientSelect"
                        class="w-full md:w-1/2 p-2 text-sm border border-zinc-200 rounded-md focus:outline-none focus:border-black bg-zinc-50"
                    >
                        <option value="" disabled>Sélectionner un client existant...</option>
                        <option v-for="client in clients" :key="client.id" :value="client.id">
                            {{ client.company ? client.company + ' (' + client.firstName + ' ' + client.lastName + ')' : client.firstName + ' ' + client.lastName }}
                        </option>
                    </select>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-4">
                        <div class="space-y-1.5">
                            <label class="text-[10px] uppercase font-bold text-zinc-400">Nom du client / Société</label>
                            <Input v-model="clientName" placeholder="Entrez le nom du client" class="bg-zinc-50 border-zinc-200 focus:border-black PrintInput" />
                        </div>
                         <div class="space-y-1.5">
                            <label class="text-[10px] uppercase font-bold text-zinc-400">Email (Optionnel)</label>
                            <Input v-model="clientEmail" placeholder="client@exemple.com" class="bg-zinc-50 border-zinc-200 focus:border-black PrintInput" />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Items Table -->
            <div class="mb-12">
                <table class="w-full text-left">
                    <thead>
                        <tr class="border-b-2 border-zinc-900">
                            <th class="py-3 text-xs font-bold uppercase tracking-widest text-black w-1/2">Description</th>
                            <th class="py-3 text-xs font-bold uppercase tracking-widest text-black text-center w-24">Qté</th>
                            <th class="py-3 text-xs font-bold uppercase tracking-widest text-black text-right w-32">Prix Unit.</th>
                            <th class="py-3 text-xs font-bold uppercase tracking-widest text-black text-right w-32">Total</th>
                            <th class="py-3 w-10 print:hidden"></th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-zinc-100">
                        <tr v-for="item in items" :key="item.id" class="group">
                            <td class="py-4 pr-4">
                                <Input v-model="item.description" placeholder="Description du service" class="border-transparent hover:border-zinc-200 focus:border-black px-0 bg-transparent" />
                            </td>
                            <td class="py-4 px-2">
                                <Input type="number" v-model="item.quantity" min="1" class="text-center border-transparent hover:border-zinc-200 focus:border-black px-0 bg-transparent" />
                            </td>
                            <td class="py-4 px-2">
                                <Input type="number" v-model="item.price" min="0" step="0.01" class="text-right border-transparent hover:border-zinc-200 focus:border-black px-0 bg-transparent" />
                            </td>
                            <td class="py-4 pl-4 text-right font-mono text-zinc-700">
                                {{ formatCurrency(item.quantity * item.price) }}
                            </td>
                            <td class="py-4 text-right print:hidden">
                                <button @click="removeItem(item.id)" class="text-zinc-300 hover:text-red-500 transition-colors">
                                    <Trash2 :size="16" />
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
                 <Button @click="addItem" variant="ghost" size="sm" class="mt-4 text-zinc-500 hover:text-black print:hidden">
                    <Plus :size="16" class="mr-2" /> Ajouter une ligne
                </Button>
            </div>

            <!-- Totals -->
            <div class="flex justify-end">
                <div class="w-64 space-y-3">
                    <div class="flex justify-between text-sm text-zinc-600">
                        <span>Sous-total</span>
                        <span class="font-mono">{{ formatCurrency(subtotal) }}</span>
                    </div>
                    <div class="flex justify-between text-sm text-zinc-600">
                        <span>TVA (20%)</span>
                        <span class="font-mono">{{ formatCurrency(taxAmount) }}</span>
                    </div>
                    <div class="flex justify-between text-lg font-bold text-black border-t-2 border-zinc-900 pt-3 mt-3">
                        <span>Total TTC</span>
                        <span class="font-mono">{{ formatCurrency(total) }}</span>
                    </div>
                </div>
            </div>

            <!-- Footer Notes -->
            <div class="mt-20 pt-8 border-t border-zinc-100 text-xs text-zinc-400 text-center">
                <p class="mb-1">Merci de votre confiance.</p>
                <p>Conditions de paiement : 30 jours fin de mois. Pénalités de retard : 3 fois le taux d'intérêt légal.</p>
            </div>
        </div>
    </div>
</template>

<style scoped>
@media print {
    /* Hide non-printable elements */
    .print\:hidden {
        display: none !important;
    }
    
    /* Ensure background colors are printed */
    .print\:shadow-none {
        box-shadow: none !important;
    }
    
    .print\:border-0 {
        border: none !important;
    }

    .print\:p-0 {
        padding: 0 !important;
    }
}
</style>

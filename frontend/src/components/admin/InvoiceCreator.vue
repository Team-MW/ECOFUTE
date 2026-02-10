<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { Plus, Trash2, Printer, Save, Loader, Settings, Image as ImageIcon } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

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
const showSettingsDialog = ref(false)

// Company Settings (White Label)
const companyDetails = ref({
    name: 'EcoFuté.',
    address1: "123 Avenue de l'Innovation",
    address2: "31000 Toulouse, France",
    email: "contact@ecofute.com",
    siret: "123 456 789 00012",
    logoUrl: '',
    accentColor: '#000000'
})

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
            total: total.value,
            companyDetails: companyDetails.value // Save snapshot of company details
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

const handleLogoUpload = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
            companyDetails.value.logoUrl = e.target?.result as string
        }
        reader.readAsDataURL(file)
    }
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
                <Button @click="showSettingsDialog = true" variant="outline" class="border-zinc-200 text-zinc-900 h-10">
                    <Settings :size="16" class="mr-2" /> Personnaliser
                </Button>
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
        <div class="bg-white border border-zinc-200 shadow-sm p-8 md:p-12 print:border-0 print:shadow-none print:p-0 relative">
            
            <!-- Invoice Header -->
            <div class="flex flex-col md:flex-row justify-between mb-12">
                <div>
                     <div class="flex items-center gap-3 mb-6">
                        <div v-if="companyDetails.logoUrl" class="w-16 h-16 object-contain overflow-hidden rounded-sm">
                            <img :src="companyDetails.logoUrl" alt="Logo" class="w-full h-full object-contain" />
                        </div>
                        <div v-else class="w-12 h-12 bg-black flex items-center justify-center text-white font-bold rounded-sm text-xl" :style="{ backgroundColor: companyDetails.accentColor }">
                            {{ companyDetails.name.charAt(0) }}
                        </div>
                        <span class="text-2xl font-bold tracking-tighter">{{ companyDetails.name }}</span>
                    </div>
                    <div class="text-sm text-zinc-500 space-y-1">
                        <p>{{ companyDetails.address1 }}</p>
                        <p>{{ companyDetails.address2 }}</p>
                        <p>{{ companyDetails.email }}</p>
                        <p>SIRET: {{ companyDetails.siret }}</p>
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
            <div class="mb-12 border-t border-zinc-100 pt-8" :style="{ borderColor: companyDetails.accentColor + '40' }">
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
                        <tr class="border-b-2" :style="{ borderColor: companyDetails.accentColor }">
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
                    <div class="flex justify-between text-lg font-bold text-black border-t-2 pt-3 mt-3" :style="{ borderColor: companyDetails.accentColor }">
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

        <!-- Customization Dialog -->
        <Dialog v-model:open="showSettingsDialog">
            <DialogContent class="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Personnaliser votre entreprise</DialogTitle>
                    <DialogDescription>
                        Modifiez les informations qui apparaissent sur vos factures.
                    </DialogDescription>
                </DialogHeader>
                
                <div class="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                    <div class="space-y-2">
                        <Label>Logo</Label>
                        <div class="flex items-center gap-4">
                            <div v-if="companyDetails.logoUrl" class="w-16 h-16 border border-zinc-200 rounded-md p-1 bg-zinc-50">
                                <img :src="companyDetails.logoUrl" class="w-full h-full object-contain" />
                            </div>
                            <div v-else class="w-16 h-16 border border-zinc-200 border-dashed rounded-md flex items-center justify-center bg-zinc-50 text-zinc-400">
                                <ImageIcon :size="20" />
                            </div>
                            <div class="flex-1">
                                <Input type="file" accept="image/*" @change="handleLogoUpload" class="cursor-pointer" />
                                <p class="text-[10px] text-zinc-500 mt-1">Format recommandé : PNG, JPG</p>
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-2">
                            <Label>Nom de l'entreprise</Label>
                            <Input v-model="companyDetails.name" />
                        </div>
                        <div class="space-y-2">
                            <Label>Couleur principale</Label>
                            <div class="flex gap-2">
                                <Input type="color" v-model="companyDetails.accentColor" class="w-12 h-10 p-1 cursor-pointer" />
                                <Input v-model="companyDetails.accentColor" class="flex-1 font-mono uppercase" />
                            </div>
                        </div>
                    </div>

                    <div class="space-y-2">
                        <Label>Adresse ligne 1</Label>
                        <Input v-model="companyDetails.address1" />
                    </div>
                     <div class="space-y-2">
                        <Label>Adresse ligne 2 (CP, Ville)</Label>
                        <Input v-model="companyDetails.address2" />
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                         <div class="space-y-2">
                            <Label>Email de contact</Label>
                            <Input v-model="companyDetails.email" />
                        </div>
                         <div class="space-y-2">
                            <Label>Numéro SIRET</Label>
                            <Input v-model="companyDetails.siret" />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button @click="showSettingsDialog = false" class="bg-black text-white hover:bg-zinc-800">
                        Terminer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
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

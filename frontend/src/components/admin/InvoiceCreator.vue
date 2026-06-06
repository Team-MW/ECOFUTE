<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import axios from 'axios'
import { Plus, Trash2, Save, Loader, Settings, Image as ImageIcon, Search, Download, Eye, Edit3, Mail } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { showToast, showConfirm } from '@/lib/feedback'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

const props = defineProps<{
    preSelectedClientId?: number
}>()

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
    address?: string
    city?: string
    zipCode?: string
    phone?: string
    siret?: string
    tvaNumber?: string
}

// State
const clients = ref<Client[]>([])
const selectedClientId = ref<string>('')
const clientName = ref('')
const clientEmail = ref('')
const clientBrand = ref('')
const clientAddress = ref('')
const clientPhone = ref('')
const clientSiret = ref('')
const clientTva = ref('')
const isSaving = ref(false)
const isGeneratingPdf = ref(false)
const showSettingsDialog = ref(false)
const isPreview = ref(false)

// Company Settings (White Label)
const companyDetails = ref({
    name: 'EcoFuté.',
    address1: "123 Avenue de l'Innovation",
    address2: "31000 Toulouse, France",
    email: "contact@ecofute.com",
    phone: "01 23 45 67 89",
    siret: "123 456 789 00012",
    tvaNumber: "FR 12 345678900",
    iban: "",
    bic: "",
    logoUrl: '',
    accentColor: '#18181b', // equivalent to zinc-900
    notes: "Merci de votre confiance. Conditions de paiement : 30 jours fin de mois.",
    vatEnabled: true
})

const invoiceDate = ref(new Date().toISOString().split('T')[0])
const dueDate = ref(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) // +30 days
const invoiceNumber = ref(`FAC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`)

const items = ref<InvoiceItem[]>([
     { id: 1, description: 'Prestation de service', quantity: 1, price: 0 }
])

// Computed
const subtotal = computed(() => {
    return items.value.reduce((sum, item) => sum + (item.quantity * item.price), 0)
})

const taxRate = 0.20 // 20% VAT
const taxAmount = computed(() => companyDetails.value.vatEnabled ? subtotal.value * taxRate : 0)
const total = computed(() => subtotal.value + taxAmount.value)

// Methods
const updateItemTotal = (item: InvoiceItem, newTotal: string) => {
    const totalVal = parseFloat(newTotal)
    if (!isNaN(totalVal) && item.quantity > 0) {
        item.price = totalVal / item.quantity
    }
}

const handleClientSelect = () => {
    const client = clients.value.find(c => c.id.toString() === selectedClientId.value)
    if (client) {
        clientName.value = `${client.firstName || ''} ${client.lastName || ''}`.trim()
        clientEmail.value = client.email || ''
        clientBrand.value = client.company || ''
        
        // Format address: "123 Rue, 75000 Paris"
        const parts = []
        if (client.address) parts.push(client.address)
        
        const zipCity = []
        if (client.zipCode) zipCity.push(client.zipCode)
        if (client.city) zipCity.push(client.city)
        
        if (zipCity.length > 0) parts.push(zipCity.join(' '))
            
        clientAddress.value = parts.join(', ')
        
        clientPhone.value = client.phone || ''
        clientSiret.value = client.siret || ''
        clientTva.value = client.tvaNumber || ''
    } else {
        // Reset if no client selected
        clientName.value = ''
        clientEmail.value = ''
        clientBrand.value = ''
        clientAddress.value = ''
        clientPhone.value = ''
        clientSiret.value = ''
        clientTva.value = ''
    }
}

const fetchClients = async () => {
    try {
        const res = await axios.get('/api/clients')
        clients.value = res.data
        
        if (props.preSelectedClientId) {
            selectedClientId.value = props.preSelectedClientId.toString()
            nextTick(() => {
                handleClientSelect()
            })
        }
    } catch (e) {
        console.error("Failed to fetch clients", e)
    }
}

watch(() => props.preSelectedClientId, (newVal) => {
    if (newVal) {
        selectedClientId.value = newVal.toString()
        handleClientSelect()
    }
})

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

const togglePreview = () => {
    isPreview.value = !isPreview.value
}

const downloadPDF = async () => {
    isGeneratingPdf.value = true
    const wasInPreview = isPreview.value
    isPreview.value = true // Force preview mode for clean capture
    
    await nextTick() // Wait for DOM to update
    
    // Slight delay to ensure rendering is complete
    await new Promise(resolve => setTimeout(resolve, 500))

    const element = document.getElementById('invoice-preview')
    if (!element) {
        isGeneratingPdf.value = false
        return
    }

    try {
        const canvas = await html2canvas(element, {
            scale: 3, // High quality scale
            useCORS: true, // Handle images
            logging: false,
            backgroundColor: '#ffffff',
            onclone: (clonedDoc) => {
                const el = clonedDoc.getElementById('invoice-preview')
                if (el) {
                    el.style.fontFamily = 'Arial, Helvetica, sans-serif'
                }
            }
        })
        
        const imgData = canvas.toDataURL('image/jpeg', 1.0)
        const pdf = new jsPDF('p', 'mm', 'a4')
        const pdfWidth = pdf.internal.pageSize.getWidth()
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width
        
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight)
        pdf.save(`Facture-${invoiceNumber.value}.pdf`)
    } catch (error) {
        console.error('PDF Generation failed', error)
        showToast("Erreur lors de la génération du PDF. Veuillez réessayer.", "error")
    } finally {
        isGeneratingPdf.value = false
        if (!wasInPreview) isPreview.value = false // Revert if needed
    }
}

const sendEmail = async () => {
    if (!clientEmail.value) {
        showToast("Veuillez renseigner l'email du client.", "error")
        return
    }

    const isConfirmed = await showConfirm({
        title: 'Préparer l\'email',
        message: `Préparer l'email pour ${clientEmail.value} ?\n\nLa facture sera téléchargée et vous devrez l'ajouter en pièce jointe à l'email qui s'ouvrira.`,
        confirmText: 'Préparer',
        cancelText: 'Annuler'
    })
    if (!isConfirmed) return

    isGeneratingPdf.value = true
    const wasInPreview = isPreview.value
    isPreview.value = true // Force preview mode for clean capture
    
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 500))

    const element = document.getElementById('invoice-preview')
    if (!element) {
        isGeneratingPdf.value = false
        return
    }

    try {
        const canvas = await html2canvas(element, {
            scale: 3,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        })
        
        const imgData = canvas.toDataURL('image/jpeg', 1.0)
        const pdf = new jsPDF('p', 'mm', 'a4')
        const pdfWidth = pdf.internal.pageSize.getWidth()
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width
        
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight)
        // Download the PDF so user can attach it
        pdf.save(`Facture-${invoiceNumber.value}.pdf`)

        // Open Mail Client
        const subject = encodeURIComponent(`Facture ${invoiceNumber.value} - ${companyDetails.value.name}`)
        const bodyText = `Bonjour ${clientName.value || ''},\n\nVeuillez trouver ci-joint la facture ${invoiceNumber.value}.\n\nCordialement,\n\n${companyDetails.value.name}`
        const body = encodeURIComponent(bodyText)

        window.location.href = `mailto:${clientEmail.value}?subject=${subject}&body=${body}`
        
    } catch (error: any) {
        console.error('PDF Generation failed', error)
        showToast("Erreur lors de la génération: " + error.message, "error")
    } finally {
        isGeneratingPdf.value = false
        if (!wasInPreview) isPreview.value = false
    }
}

const saveInvoice = async () => {
    if (!clientName.value && !clientBrand.value) {
        showToast("Veuillez indiquer un client (Nom ou Entreprise).", "warning")
        return
    }

    isSaving.value = true
    try {
        const invoiceData = {
            number: invoiceNumber.value,
            clientId: selectedClientId.value || null,
            clientName: clientName.value,
            clientBrand: clientBrand.value,
            clientEmail: clientEmail.value,
            clientAddress: clientAddress.value,
            items: items.value,
            subtotal: subtotal.value,
            tax: taxAmount.value,
            total: total.value,
            date: invoiceDate.value,
            dueDate: dueDate.value,
            companyDetails: companyDetails.value
        }

        await axios.post('/api/sales', {
            title: `Facture ${invoiceNumber.value} - ${clientBrand.value || clientName.value}`,
            description: JSON.stringify(invoiceData),
            amount: total.value,
            date: invoiceDate.value,
            status: 'En attente'
        })

        showToast("Facture enregistrée avec succès dans le suivi des ventes !", "success")
    } catch (e: any) {
        console.error(e)
        const msg = e.response?.data?.error || e.message || "Erreur inconnue"
        showToast(`Erreur lors de l'enregistrement: ${msg}`, "error")
    } finally {
        isSaving.value = false
    }
}

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val)
}

const formatDate = (dateString: string) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('fr-FR')
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
    <div class="max-w-7xl mx-auto bg-gray-50 min-h-screen pb-20 p-4 md:p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <!-- Header Actions -->
        <div class="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
            <div>
                <h1 class="text-3xl font-bold text-gray-900 tracking-tight">Éditeur de Facture</h1>
                <p class="text-sm text-gray-500 mt-1">Générez des factures professionnelles et suivez vos ventes en temps réel.</p>
            </div>
            <div class="flex flex-wrap gap-3">
                <Button @click="showSettingsDialog = true" variant="outline" class="bg-white border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl">
                    <Settings :size="16" class="mr-2" /> Paramètres Entreprise
                </Button>
                <Button @click="saveInvoice" :disabled="isSaving" variant="outline" class="bg-white border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl">
                    <Loader v-if="isSaving" class="animate-spin mr-2" :size="16" />
                    <Save v-else :size="16" class="mr-2" /> Sauvegarder Vente
                </Button>
                <Button @click="downloadPDF" :disabled="isGeneratingPdf" variant="outline" class="bg-white border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl">
                    <Loader v-if="isGeneratingPdf" class="animate-spin mr-2" :size="16" />
                    <Download v-else :size="16" class="mr-2" /> Télécharger PDF
                </Button>
                <Button @click="sendEmail" :disabled="isGeneratingPdf" variant="outline" class="bg-white border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl">
                    <Loader v-if="isGeneratingPdf" class="animate-spin mr-2" :size="16" />
                    <Mail v-else :size="16" class="mr-2" /> Envoyer par Email
                </Button>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            <!-- Left Panel: The step-by-step form (5 cols) -->
            <div class="lg:col-span-5 space-y-6 print:hidden">
                <!-- Section 1: Références de facture -->
                <div class="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
                    <h3 class="text-sm font-bold text-zinc-900 uppercase tracking-wider border-b border-zinc-100 pb-2">1. Références de Facture</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="space-y-1.5 col-span-2">
                            <Label class="text-xs text-zinc-500 font-semibold">Numéro de Facture</Label>
                            <Input v-model="invoiceNumber" class="rounded-xl border-zinc-200" />
                        </div>
                        <div class="space-y-1.5">
                            <Label class="text-xs text-zinc-500 font-semibold">Date de Facture</Label>
                            <Input type="date" v-model="invoiceDate" class="rounded-xl border-zinc-200" />
                        </div>
                        <div class="space-y-1.5">
                            <Label class="text-xs text-zinc-500 font-semibold">Date d'Échéance</Label>
                            <Input type="date" v-model="dueDate" class="rounded-xl border-zinc-200" />
                        </div>
                    </div>
                </div>

                <!-- Section 2: Destinataire / Client -->
                <div class="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
                    <h3 class="text-sm font-bold text-zinc-900 uppercase tracking-wider border-b border-zinc-100 pb-2">2. Destinataire (Client)</h3>
                    <div class="space-y-4">
                        <div class="space-y-1.5">
                            <Label class="text-xs text-zinc-500 font-semibold">Pré-remplir depuis un client existant</Label>
                            <select 
                                v-model="selectedClientId" 
                                @change="handleClientSelect"
                                class="w-full p-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-950 bg-white"
                            >
                                <option value="">-- Saisir manuellement --</option>
                                <option v-for="client in clients" :key="client.id" :value="client.id.toString()">
                                    {{ client.company ? `${client.company} (${client.firstName} ${client.lastName})` : `${client.firstName} ${client.lastName}` }}
                                </option>
                            </select>
                        </div>
                        
                        <div class="h-px bg-zinc-100"></div>

                        <div class="space-y-3">
                            <div class="space-y-1.5">
                                <Label class="text-xs text-zinc-500 font-semibold">Nom de l'entreprise (Optionnel)</Label>
                                <Input v-model="clientBrand" placeholder="Ex: Entreprise SAS" class="rounded-xl border-zinc-200" />
                            </div>
                            <div class="space-y-1.5">
                                <Label class="text-xs text-zinc-500 font-semibold">Nom complet du client</Label>
                                <Input v-model="clientName" placeholder="Ex: Jean Dupont" class="rounded-xl border-zinc-200" />
                            </div>
                            <div class="space-y-1.5">
                                <Label class="text-xs text-zinc-500 font-semibold">Adresse complète</Label>
                                <Input v-model="clientAddress" placeholder="Ex: 10 Rue de la Paix, 75002 Paris" class="rounded-xl border-zinc-200" />
                            </div>
                            <div class="space-y-1.5">
                                <Label class="text-xs text-zinc-500 font-semibold">Email professionnel</Label>
                                <Input v-model="clientEmail" placeholder="client@exemple.com" class="rounded-xl border-zinc-200" />
                            </div>
                            <div class="space-y-1.5">
                                <Label class="text-xs text-zinc-500 font-semibold">Téléphone</Label>
                                <Input v-model="clientPhone" placeholder="Ex: 06 12 34 56 78" class="rounded-xl border-zinc-200" />
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div class="space-y-1.5">
                                    <Label class="text-xs text-zinc-500 font-semibold">SIRET Client</Label>
                                    <Input v-model="clientSiret" placeholder="123 456 789 00012" class="rounded-xl border-zinc-200" />
                                </div>
                                <div class="space-y-1.5">
                                    <Label class="text-xs text-zinc-500 font-semibold">N° TVA Client</Label>
                                    <Input v-model="clientTva" placeholder="FR 12 345678900" class="rounded-xl border-zinc-200" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Section 3: Prestations & Tarifs -->
                <div class="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
                    <h3 class="text-sm font-bold text-zinc-900 uppercase tracking-wider border-b border-zinc-100 pb-2">3. Prestations & Tarifs</h3>
                    <div class="space-y-4">
                        <div v-for="(item, idx) in items" :key="item.id" class="p-4 border border-zinc-200 rounded-xl bg-zinc-50/50 space-y-3 relative group">
                            <div class="flex justify-between items-center">
                                <span class="text-xs font-bold text-zinc-400">Ligne #{{ idx + 1 }}</span>
                                <Button 
                                    v-if="items.length > 1" 
                                    @click="removeItem(item.id)" 
                                    variant="ghost" 
                                    size="sm" 
                                    class="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                >
                                    <Trash2 :size="14" />
                                </Button>
                            </div>
                            <div class="space-y-1.5">
                                <Label class="text-xs text-zinc-500 font-semibold">Désignation / Description</Label>
                                <Textarea v-model="item.description" placeholder="Description de la prestation..." class="rounded-xl border-zinc-200 bg-white min-h-[60px]" />
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div class="space-y-1.5">
                                    <Label class="text-xs text-zinc-500 font-semibold">Quantité</Label>
                                    <Input type="number" v-model="item.quantity" min="1" class="rounded-xl border-zinc-200 bg-white" />
                                </div>
                                <div class="space-y-1.5">
                                    <Label class="text-xs text-zinc-500 font-semibold">Prix Unit. HT (€)</Label>
                                    <div class="relative">
                                        <Input type="number" v-model="item.price" min="0" step="0.01" class="rounded-xl border-zinc-200 bg-white pr-6" />
                                        <span class="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-bold">€</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <Button @click="addItem" variant="outline" class="w-full h-10 border-dashed border-zinc-300 hover:border-zinc-500 text-zinc-600 hover:bg-zinc-50 rounded-xl">
                            <Plus :size="14" class="mr-2" /> Ajouter une prestation
                        </Button>
                    </div>
                </div>

                <!-- Section 4: Conditions & Règlements -->
                <div class="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
                    <h3 class="text-sm font-bold text-zinc-900 uppercase tracking-wider border-b border-zinc-100 pb-2">4. Règlement & Conditions</h3>
                    <div class="space-y-4">
                        <div class="flex items-center gap-2 py-1">
                            <input type="checkbox" v-model="companyDetails.vatEnabled" id="form-vat-toggle" class="rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950 w-4 h-4" />
                            <Label for="form-vat-toggle" class="cursor-pointer font-bold text-zinc-700 text-xs uppercase tracking-wide">Activer la TVA (20%)</Label>
                        </div>
                        <div class="space-y-1.5">
                            <Label class="text-xs text-zinc-500 font-semibold">IBAN</Label>
                            <Input v-model="companyDetails.iban" placeholder="FR76 ..." class="rounded-xl border-zinc-200 font-mono" />
                        </div>
                        <div class="space-y-1.5">
                            <Label class="text-xs text-zinc-500 font-semibold">BIC / SWIFT</Label>
                            <Input v-model="companyDetails.bic" placeholder="XXXXXX" class="rounded-xl border-zinc-200 font-mono" />
                        </div>
                        <div class="space-y-1.5">
                            <Label class="text-xs text-zinc-500 font-semibold">Notes / Conditions de règlement</Label>
                            <Textarea v-model="companyDetails.notes" class="rounded-xl border-zinc-200 min-h-[80px]" />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Right Panel: Real-time Live A4 Preview (7 cols) -->
            <div class="lg:col-span-7 sticky top-6 w-full overflow-auto">
                <div class="flex items-center justify-between mb-4 bg-zinc-900 text-white px-5 py-3 rounded-2xl shadow-sm print:hidden">
                    <span class="text-xs font-bold uppercase tracking-wider flex items-center gap-2 select-none">
                        <span class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                        Aperçu en temps réel
                    </span>
                    <span class="text-xs text-zinc-400 font-mono select-none">{{ invoiceNumber }}</span>
                </div>

                <div class="border border-zinc-200 shadow-2xl rounded-2xl overflow-hidden bg-white max-w-full">
                    <div id="invoice-preview" class="bg-white mx-auto print:shadow-none print:mx-0 print:w-full max-w-[210mm] min-h-[297mm] p-[10mm] md:p-[15mm] relative text-sm leading-relaxed text-zinc-700">
                        
                        <!-- Top Banner / Accent Line -->
                        <div class="absolute top-0 left-0 right-0 h-2" :style="{ backgroundColor: companyDetails.accentColor }"></div>
                        
                        <!-- Top Section: Logo & Company Address vs Invoice Info -->
                        <div class="flex justify-between items-start mb-12 mt-4">
                            <!-- Left: Company Info -->
                            <div class="w-1/2 pr-8">
                                <div class="mb-4">
                                    <div v-if="companyDetails.logoUrl" class="h-20 mb-3 flex items-center justify-start">
                                        <img :src="companyDetails.logoUrl" alt="Logo" class="h-full w-auto object-contain" />
                                    </div>
                                    <div v-else class="h-12 w-12 bg-zinc-900 text-white flex items-center justify-center font-bold text-xl rounded-xl mb-3" :style="{ backgroundColor: companyDetails.accentColor }">
                                        {{ companyDetails.name.substring(0, 2).toUpperCase() }}
                                    </div>
                                    <h3 class="text-lg font-bold text-zinc-950">{{ companyDetails.name }}</h3>
                                </div>
                                <div class="text-xs text-zinc-500 space-y-0.5">
                                    <p>{{ companyDetails.address1 }}</p>
                                    <p>{{ companyDetails.address2 }}</p>
                                    <p>{{ companyDetails.email }}</p>
                                    <p>{{ companyDetails.phone }}</p>
                                    <p class="pt-1.5 font-semibold text-zinc-600">SIRET: {{ companyDetails.siret }}</p>
                                    <p v-if="companyDetails.tvaNumber" class="text-zinc-600">TVA: {{ companyDetails.tvaNumber }}</p>
                                </div>
                            </div>

                            <!-- Right: Invoice Title & Meta -->
                            <div class="w-1/2 text-right">
                                <h2 class="text-4xl font-extrabold text-zinc-900 uppercase tracking-tight mb-6 select-none">Facture</h2>
                                <div class="text-xs space-y-1">
                                    <p class="flex justify-end gap-3"><span class="text-zinc-400 uppercase font-bold">N° Facture:</span> <span class="font-mono font-bold text-zinc-900">{{ invoiceNumber }}</span></p>
                                    <p class="flex justify-end gap-3"><span class="text-zinc-400 uppercase font-bold">Date:</span> <span class="text-zinc-900 font-medium">{{ invoiceDate ? formatDate(invoiceDate) : '' }}</span></p>
                                    <p class="flex justify-end gap-3"><span class="text-zinc-400 uppercase font-bold">Échéance:</span> <span class="text-zinc-900 font-medium">{{ dueDate ? formatDate(dueDate) : '' }}</span></p>
                                </div>
                            </div>
                        </div>

                        <!-- Client Section -->
                        <div class="mb-12">
                            <div class="w-2/3 border-t border-zinc-100 pt-6">
                                <h4 class="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 select-none">Facturé à</h4>
                                <div class="space-y-0.5">
                                    <div v-if="clientBrand" class="text-base font-extrabold text-zinc-950">{{ clientBrand }}</div>
                                    <div v-if="clientName" class="text-sm font-semibold text-zinc-800">{{ clientName }}</div>
                                    <div v-if="clientAddress" class="text-xs text-zinc-500">{{ clientAddress }}</div>
                                    <div v-if="clientEmail" class="text-xs text-zinc-400 font-mono">{{ clientEmail }}</div>
                                    <div v-if="clientPhone" class="text-xs text-zinc-400">{{ clientPhone }}</div>
                                    <div class="flex gap-4 mt-2 text-[10px] text-zinc-400 font-semibold" v-if="clientSiret || clientTva">
                                        <span v-if="clientSiret">SIRET: {{ clientSiret }}</span>
                                        <span v-if="clientTva">TVA: {{ clientTva }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Items Table -->
                        <div class="mb-12">
                            <table class="w-full text-left border-collapse table-fixed font-sans">
                                <thead>
                                    <tr class="border-b-2 border-zinc-900" :style="{ borderColor: companyDetails.accentColor }">
                                        <th class="py-2.5 px-2 text-xs font-bold uppercase tracking-wider text-zinc-900 w-[55%] select-none">Désignation</th>
                                        <th class="py-2.5 px-2 text-xs font-bold uppercase tracking-wider text-zinc-900 text-center w-[15%] select-none">Quantité</th>
                                        <th class="py-2.5 px-2 text-xs font-bold uppercase tracking-wider text-zinc-900 text-right w-[15%] select-none">Prix Unit. HT</th>
                                        <th class="py-2.5 px-2 text-xs font-bold uppercase tracking-wider text-zinc-900 text-right w-[15%] select-none">Total HT</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="item in items" :key="item.id" class="border-b border-zinc-100">
                                        <td class="py-3 px-2 align-top">
                                            <p class="text-xs text-zinc-800 whitespace-pre-wrap break-words font-medium">{{ item.description || 'Prestation de service' }}</p>
                                        </td>
                                        <td class="py-3 px-2 align-top text-center text-xs text-zinc-600 font-semibold">
                                            {{ item.quantity }}
                                        </td>
                                        <td class="py-3 px-2 align-top text-right text-xs text-zinc-600 font-mono">
                                            {{ formatCurrency(item.price) }}
                                        </td>
                                        <td class="py-3 px-2 text-right font-mono text-zinc-950 font-bold align-top text-xs">
                                            {{ formatCurrency(item.quantity * item.price) }}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <!-- Footer / Totals -->
                        <div class="flex flex-col md:flex-row justify-between items-start gap-12 mb-12">
                            <!-- Payment Info / Notes -->
                            <div class="flex-1 text-xs text-zinc-400 space-y-4">
                                <div v-if="companyDetails.iban || companyDetails.bic" class="p-4 bg-zinc-50 border border-zinc-100 rounded-xl">
                                    <span class="text-[10px] font-bold uppercase text-zinc-400 mb-2 block select-none">Règlement bancaire</span>
                                    <div class="space-y-1 font-mono text-[11px] text-zinc-600">
                                        <div v-if="companyDetails.iban" class="flex gap-2">
                                            <span class="font-bold text-zinc-400 w-8">IBAN:</span>
                                            <span>{{ companyDetails.iban }}</span>
                                        </div>
                                        <div v-if="companyDetails.bic" class="flex gap-2">
                                            <span class="font-bold text-zinc-400 w-8">BIC:</span>
                                            <span>{{ companyDetails.bic }}</span>
                                        </div>
                                    </div>
                                </div>
                                <div v-if="companyDetails.notes">
                                    <span class="text-[10px] font-bold uppercase text-zinc-400 mb-1.5 block select-none">Notes & Conditions</span>
                                    <p class="text-xs text-zinc-500 whitespace-pre-wrap leading-relaxed">{{ companyDetails.notes }}</p>
                                </div>
                            </div>

                            <!-- Totals -->
                            <div class="w-full md:w-1/3 space-y-2.5 text-zinc-700">
                                <div class="space-y-2.5">
                                    <div v-if="companyDetails.vatEnabled" class="flex justify-between text-xs font-semibold">
                                        <span class="select-none text-zinc-500">Sous-total HT</span>
                                        <span class="font-mono">{{ formatCurrency(subtotal) }}</span>
                                    </div>
                                    <div v-if="companyDetails.vatEnabled" class="flex justify-between text-xs font-semibold">
                                        <span class="select-none text-zinc-500">TVA (20%)</span>
                                        <span class="font-mono">{{ formatCurrency(taxAmount) }}</span>
                                    </div>
                                </div>
                                <div class="h-px bg-zinc-200 my-1"></div>
                                <div class="flex justify-between items-center">
                                    <span class="text-sm font-bold text-zinc-950 select-none">Total {{ companyDetails.vatEnabled ? 'TTC' : 'HT' }}</span>
                                    <span class="text-lg font-black font-mono tracking-tight" :style="{ color: companyDetails.accentColor }">{{ formatCurrency(total) }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Bottom Footer -->
                        <div class="absolute bottom-10 left-10 right-10 text-center border-t border-zinc-100 pt-4">
                            <div class="flex justify-center gap-4 text-[9px] text-zinc-400 font-bold uppercase tracking-wider select-none">
                                <span>{{ companyDetails.name }}</span>
                                <span>•</span>
                                <span>SIRET: {{ companyDetails.siret }}</span>
                                <span v-if="companyDetails.tvaNumber">•</span>
                                <span v-if="companyDetails.tvaNumber">TVA: {{ companyDetails.tvaNumber }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Configuration Dialog -->
        <Dialog v-model:open="showSettingsDialog">
            <DialogContent class="sm:max-w-2xl rounded-2xl border-zinc-200/60 p-6 shadow-2xl bg-white/95 backdrop-blur-xl animate-in zoom-in-95 duration-200 text-zinc-900 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle class="text-xl font-bold">Paramètres de l'entreprise</DialogTitle>
                    <DialogDescription class="text-gray-500">
                        Configurez vos coordonnées d'entreprise pour l'en-tête de vos factures.
                    </DialogDescription>
                </DialogHeader>
                
                <div class="space-y-6 py-4">
                    <!-- Identity -->
                    <div class="space-y-4">
                        <Label class="text-sm font-bold text-gray-900 border-b pb-1 block">Identité Visuelle</Label>
                        <div class="flex items-start gap-6">
                            <div class="space-y-2">
                                <Label class="text-xs font-semibold text-gray-500">Logo</Label>
                                <div class="flex items-center gap-4">
                                    <div v-if="companyDetails.logoUrl" class="w-20 h-20 border border-gray-200 rounded-xl p-1 bg-white relative group">
                                        <img :src="companyDetails.logoUrl" class="w-full h-full object-contain" />
                                        <button @click="companyDetails.logoUrl = ''" class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Trash2 :size="12" />
                                        </button>
                                    </div>
                                    <div v-else class="w-20 h-20 border border-gray-300 border-dashed rounded-xl flex items-center justify-center bg-gray-50 text-gray-400">
                                        <ImageIcon :size="24" />
                                    </div>
                                    <div>
                                        <Input type="file" accept="image/*" @change="handleLogoUpload" class="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                                    </div>
                                </div>
                            </div>
                            <div class="flex-1 space-y-2">
                                <Label class="text-xs font-semibold text-gray-500">Couleur d'accent</Label>
                                <div class="flex gap-2">
                                    <Input type="color" v-model="companyDetails.accentColor" class="w-10 h-10 p-0.5 border rounded cursor-pointer" />
                                    <Input v-model="companyDetails.accentColor" class="flex-1 font-mono uppercase" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Coords -->
                    <div class="space-y-4">
                         <Label class="text-sm font-bold text-gray-900 border-b pb-1 block">Coordonnées & Juridique</Label>
                         <div class="grid grid-cols-2 gap-4">
                            <div class="col-span-2">
                                <Label class="text-xs text-gray-500">Nom de l'entreprise</Label>
                                <Input v-model="companyDetails.name" />
                            </div>
                            <div>
                                <Label class="text-xs text-gray-500">Adresse</Label>
                                <Input v-model="companyDetails.address1" />
                            </div>
                            <div>
                                <Label class="text-xs text-gray-500">CP, Ville</Label>
                                <Input v-model="companyDetails.address2" />
                            </div>
                             <div>
                                <Label class="text-xs text-gray-500">Email</Label>
                                <Input v-model="companyDetails.email" />
                            </div>
                             <div>
                                <Label class="text-xs text-gray-500">Téléphone</Label>
                                <Input v-model="companyDetails.phone" />
                            </div>
                             <div>
                                <Label class="text-xs text-gray-500">SIRET</Label>
                                <Input v-model="companyDetails.siret" />
                            </div>
                             <div>
                                <Label class="text-xs text-gray-500">Numéro TVA</Label>
                                <Input v-model="companyDetails.tvaNumber" />
                            </div>
                         </div>
                    </div>

                    <!-- Bank -->
                    <div class="space-y-4">
                         <Label class="text-sm font-bold text-gray-900 border-b pb-1 block">Informations Bancaires par défaut</Label>
                         <div class="grid grid-cols-1 gap-4">
                            <div>
                                <Label class="text-xs text-gray-500">IBAN</Label>
                                <Input v-model="companyDetails.iban" placeholder="FR76 ...." class="font-mono" />
                            </div>
                             <div>
                                <Label class="text-xs text-gray-500">BIC / SWIFT</Label>
                                <Input v-model="companyDetails.bic" class="font-mono" />
                            </div>
                         </div>
                    </div>
                </div>

                <DialogFooter class="mt-6 flex justify-end gap-3">
                    <Button @click="showSettingsDialog = false" class="bg-zinc-950 hover:bg-zinc-900 text-white rounded-xl shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]">
                        Valider les modifications
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

.font-sans {
    font-family: 'Inter', sans-serif;
}

/* Hide scrollbar for number inputs */
input[type=number]::-webkit-inner-spin-button, 
input[type=number]::-webkit-outer-spin-button { 
  -webkit-appearance: none; 
  margin: 0; 
}

@media print {
    @page { margin: 0; size: auto; }
    body { background: white; }
    
    .print\:hidden { display: none !important; }
    .print\:bg-transparent { background: transparent !important; }
    .print\:border-none { border: none !important; }
    .print\:p-0 { padding: 0 !important; }
    .print\:text-black { color: black !important; }
    .print\:shadow-none { box-shadow: none !important; }
    .print\:ml-auto { margin-left: auto !important; }
    .print\:w-1\/2 { width: 50% !important; }
    
    /* Ensure colors print */
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    
    /* Ensure absolute positioning works for footer */
    .absolute { position: absolute !important; }
    .bottom-\[10mm\] { bottom: 10mm !important; }
}
</style>

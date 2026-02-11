<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import axios from 'axios'
import { Plus, Trash2, Save, Loader, Settings, Image as ImageIcon, Search, Download, Eye, Edit3, Mail } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
        alert("Erreur lors de la génération du PDF. Veuillez réessayer.")
    } finally {
        isGeneratingPdf.value = false
        if (!wasInPreview) isPreview.value = false // Revert if needed
    }
}

const sendEmail = async () => {
    if (!clientEmail.value) {
        alert("Veuillez renseigner l'email du client.")
        return
    }

    if (!confirm(`Préparer l'email pour ${clientEmail.value} ?\n\nLa facture sera téléchargée et vous devrez l'ajouter en pièce jointe à l'email qui s'ouvrira.`)) return

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
        alert("Erreur lors de la génération: " + error.message)
    } finally {
        isGeneratingPdf.value = false
        if (!wasInPreview) isPreview.value = false
    }
}

const saveInvoice = async () => {
    if (!clientName.value && !clientBrand.value) {
        alert("Veuillez indiquer un client (Nom ou Entreprise).")
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

        alert("Facture enregistrée avec succès dans le suivi des ventes !")
    } catch (e: any) {
        console.error(e)
        const msg = e.response?.data?.error || e.message || "Erreur inconnue"
        alert(`Erreur lors de l'enregistrement: ${msg}`)
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
    <div class="max-w-7xl mx-auto bg-gray-50 min-h-screen pb-20 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <!-- Header Actions -->
        <div class="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
            <div>
                <h1 class="text-3xl font-bold text-gray-900 tracking-tight">Éditeur de Facture</h1>
                <p class="text-sm text-gray-500 mt-1">Créez, personnalisez et imprimez vos factures simplement.</p>
            </div>
            <div class="flex flex-wrap gap-3">
                <div class="relative">
                    <select 
                        v-model="selectedClientId" 
                        @change="handleClientSelect"
                        class="h-10 pl-3 pr-8 text-sm bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-black appearance-none truncate min-w-[200px]"
                    >
                        <option value="" disabled selected>Sélectionner un client...</option>
                        <option v-for="client in clients" :key="client.id" :value="client.id.toString()">
                            {{ client.company ? `${client.company} (${client.firstName} ${client.lastName})` : `${client.firstName} ${client.lastName}` }}
                        </option>
                    </select>
                    <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                         <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </div>
                 <Button @click="togglePreview" variant="outline" class="bg-white border-gray-200 text-gray-700 hover:bg-gray-50">
                    <Edit3 v-if="isPreview" :size="16" class="mr-2" />
                    <Eye v-else :size="16" class="mr-2" />
                    {{ isPreview ? 'Mode Édition' : 'Mode Aperçu' }}
                </Button>
                <Button @click="showSettingsDialog = true" variant="outline" class="bg-white border-gray-200 text-gray-700 hover:bg-gray-50">
                    <Settings :size="16" class="mr-2" /> Configuration
                </Button>
                 <Button @click="saveInvoice" :disabled="isSaving" variant="outline" class="bg-white border-gray-200 text-gray-700 hover:bg-gray-50">
                    <Loader v-if="isSaving" class="animate-spin mr-2" :size="16" />
                    <Save v-else :size="16" class="mr-2" /> Sauvegarder
                </Button>
                <Button @click="downloadPDF" :disabled="isGeneratingPdf" variant="outline" class="bg-white border-gray-200 text-gray-700 hover:bg-gray-50">
                    <Loader v-if="isGeneratingPdf" class="animate-spin mr-2" :size="16" />
                    <Download v-else :size="16" class="mr-2" /> Télécharger PDF
                </Button>
                <Button @click="sendEmail" :disabled="isGeneratingPdf" variant="outline" class="bg-white border-gray-200 text-gray-700 hover:bg-gray-50">
                    <Loader v-if="isGeneratingPdf" class="animate-spin mr-2" :size="16" />
                    <Mail v-else :size="16" class="mr-2" /> Envoyer Email
                </Button>
            </div>
        </div>

        <div class="flex flex-col lg:flex-row gap-8 items-start">
            
            <!-- Left Side: Invoice Paper -->
            <div class="flex-1 w-full overflow-auto">
                <div id="invoice-preview" class="bg-white shadow-lg mx-auto print:shadow-none print:mx-0 print:w-full max-w-[210mm] min-h-[297mm] p-[10mm] md:p-[15mm] relative text-sm leading-relaxed text-gray-700" :class="{'select-none cursor-default': isPreview}">
                    
                    <!-- Top Section: Logo & Company Address vs Invoice Info -->
                    <div class="flex justify-between items-start mb-12">
                        <!-- Left: Company Info -->
                        <div class="w-1/2 pr-8">
                            <div class="mb-6">
                                <div v-if="companyDetails.logoUrl" class="h-32 mb-4 flex items-center justify-start">
                                    <img :src="companyDetails.logoUrl" alt="Logo" class="h-full w-auto object-contain" />
                                </div>
                                <div v-else class="h-16 w-16 bg-gray-900 text-white flex items-center justify-center font-bold text-2xl rounded-lg mb-4" :style="{ backgroundColor: companyDetails.accentColor }">
                                    {{ companyDetails.name.substring(0, 2).toUpperCase() }}
                                </div>
                                <div v-if="!isPreview">
                                    <Input v-model="companyDetails.name" class="text-xl font-bold text-gray-900 border-none px-0 h-auto focus:ring-0 p-0 w-full mb-1 bg-transparent hover:bg-gray-50 transition-colors" />
                                </div>
                                <div v-else class="text-xl font-bold text-gray-900 mb-1 py-1">
                                    {{ companyDetails.name }}
                                </div>
                            </div>
                            <div class="text-xs text-gray-500 space-y-1">
                                <template v-if="!isPreview">
                                    <Input v-model="companyDetails.address1" class="border-none px-0 h-5 text-gray-500 focus:ring-0 p-0 text-xs w-full bg-transparent hover:bg-gray-50" placeholder="Adresse" />
                                    <Input v-model="companyDetails.address2" class="border-none px-0 h-5 text-gray-500 focus:ring-0 p-0 text-xs w-full bg-transparent hover:bg-gray-50" placeholder="Code Postal, Ville" />
                                    <Input v-model="companyDetails.email" class="border-none px-0 h-5 text-gray-500 focus:ring-0 p-0 text-xs w-full bg-transparent hover:bg-gray-50" placeholder="Email" />
                                    <Input v-model="companyDetails.phone" class="border-none px-0 h-5 text-gray-500 focus:ring-0 p-0 text-xs w-full bg-transparent hover:bg-gray-50" placeholder="Téléphone" />
                                    <div class="flex gap-1 mt-2">
                                        <span>SIRET:</span>
                                        <Input v-model="companyDetails.siret" class="border-none px-0 h-4 text-gray-500 focus:ring-0 p-0 text-xs w-32 inline-block bg-transparent hover:bg-gray-50" />
                                    </div>
                                </template>
                                <template v-else>
                                    <p class="h-5 flex items-center">{{ companyDetails.address1 }}</p>
                                    <p class="h-5 flex items-center">{{ companyDetails.address2 }}</p>
                                    <p class="h-5 flex items-center">{{ companyDetails.email }}</p>
                                    <p class="h-5 flex items-center">{{ companyDetails.phone }}</p>
                                    <div class="flex gap-1 mt-2">
                                        <span>SIRET:</span>
                                        <span>{{ companyDetails.siret }}</span>
                                    </div>
                                </template>
                            </div>
                        </div>

                        <!-- Right: Invoice Title & Meta -->
                        <div class="w-1/2 text-right">
                            <h2 class="text-4xl font-light text-gray-200 uppercase tracking-widest mb-6 select-none">Facture</h2>
                            <div class="flex flex-col items-end gap-1">
                                <div class="flex items-center justify-end gap-3 h-8">
                                    <span class="text-xs font-semibold uppercase text-gray-400">N° Facture</span>
                                    <Input v-if="!isPreview" v-model="invoiceNumber" class="w-32 text-right font-mono font-bold text-gray-900 border-none bg-gray-50/50 focus:bg-white focus:ring-1 focus:ring-blue-500 rounded px-2 h-7" />
                                    <span v-else class="w-32 text-right font-mono font-bold text-gray-900 px-2 py-1">{{ invoiceNumber }}</span>
                                </div>
                                <div class="flex items-center justify-end gap-3 h-8">
                                    <span class="text-xs font-semibold uppercase text-gray-400">Date</span>
                                    <Input v-if="!isPreview" type="date" v-model="invoiceDate" class="w-32 text-right text-gray-900 border-none bg-gray-50/50 focus:bg-white focus:ring-1 focus:ring-blue-500 rounded px-2 h-7" />
                                    <span v-else class="w-32 text-right text-gray-900 px-2 py-1">{{ invoiceDate ? formatDate(invoiceDate) : '' }}</span>
                                </div>
                                <div class="flex items-center justify-end gap-3 h-8">
                                    <span class="text-xs font-semibold uppercase text-gray-400">Échéance</span>
                                    <Input v-if="!isPreview" type="date" v-model="dueDate" class="w-32 text-right text-gray-900 border-none bg-gray-50/50 focus:bg-white focus:ring-1 focus:ring-blue-500 rounded px-2 h-7" />
                                    <span v-else class="w-32 text-right text-gray-900 px-2 py-1">{{ dueDate ? formatDate(dueDate) : '' }}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Client Section -->
                    <div class="mb-12 flex flex-col md:flex-row gap-8">
                        <div class="w-full bg-gray-50/30 p-6 rounded-lg border border-gray-100 print:bg-transparent print:p-0 print:border-none print:ml-auto print:w-1/2" :class="{'bg-transparent border-none p-0': isPreview}">
                            <h3 class="text-xs font-bold uppercase tracking-widest text-blue-600 mb-4 print:text-gray-400" :style="{ color: companyDetails.accentColor }">Facturé à</h3>
                            
                            <div class="space-y-1">
                                <template v-if="!isPreview">
                                    <Input v-model="clientBrand" placeholder="Nom de l'entreprise (Optionnel)" class="text-lg font-bold text-gray-900 border-none px-0 h-8 focus:ring-0 bg-transparent placeholder:text-gray-300 w-full hover:bg-gray-50" />
                                    <div class="flex gap-2">
                                        <Input v-model="clientName" placeholder="Nom du contact / client" class="text-base text-gray-800 border-none px-0 h-6 focus:ring-0 bg-transparent placeholder:text-gray-300 w-full hover:bg-gray-50" />
                                    </div>
                                    <Input v-model="clientAddress" placeholder="Adresse complète (Rue, CP, Ville)" class="text-sm text-gray-600 border-none px-0 h-6 focus:ring-0 bg-transparent placeholder:text-gray-300 w-full hover:bg-gray-50" />
                                    <Input v-model="clientEmail" placeholder="Email (pour l'envoi)" class="text-sm text-gray-500 border-none px-0 h-6 focus:ring-0 bg-transparent placeholder:text-gray-300 w-full hover:bg-gray-50" />
                                    <Input v-model="clientPhone" placeholder="Téléphone" class="text-sm text-gray-500 border-none px-0 h-6 focus:ring-0 bg-transparent placeholder:text-gray-300 w-full hover:bg-gray-50" />
                                    <div class="flex gap-4 mt-2">
                                        <Input v-model="clientSiret" placeholder="SIRET Client" class="text-xs text-gray-400 border-none px-0 h-5 focus:ring-0 bg-transparent placeholder:text-gray-300 w-32 hover:bg-gray-50" />
                                        <Input v-model="clientTva" placeholder="N° TVA Client" class="text-xs text-gray-400 border-none px-0 h-5 focus:ring-0 bg-transparent placeholder:text-gray-300 w-32 hover:bg-gray-50" />
                                    </div>
                                </template>
                                <template v-else>
                                    <div v-if="clientBrand" class="text-lg font-bold text-gray-900 h-8 flex items-center">{{ clientBrand }}</div>
                                    <div v-if="clientName" class="text-base text-gray-800 h-6 flex items-center">{{ clientName }}</div>
                                    <div v-if="clientAddress" class="text-sm text-gray-600 h-6 flex items-center">{{ clientAddress }}</div>
                                    <div v-if="clientEmail" class="text-sm text-gray-500 h-6 flex items-center">{{ clientEmail }}</div>
                                    <div v-if="clientPhone" class="text-sm text-gray-500 h-6 flex items-center">{{ clientPhone }}</div>
                                    <div class="flex gap-4 mt-1 text-xs text-gray-400" v-if="clientSiret || clientTva">
                                        <span v-if="clientSiret">SIRET: {{ clientSiret }}</span>
                                        <span v-if="clientTva">TVA: {{ clientTva }}</span>
                                    </div>
                                </template>
                            </div>
                        </div>
                    </div>

                    <!-- Items Table -->
                    <div class="mb-8">
                        <table class="w-full text-left border-collapse table-fixed">
                            <thead>
                                <tr class="border-b-2 border-gray-900" :style="{ borderColor: companyDetails.accentColor }">
                                    <th class="py-3 px-2 text-xs font-bold uppercase tracking-widest text-gray-900 w-[50%]">Désignation</th>
                                    <th class="py-3 px-2 text-xs font-bold uppercase tracking-widest text-gray-900 text-center w-[15%]">Quantité</th>
                                    <th class="py-3 px-2 text-xs font-bold uppercase tracking-widest text-gray-900 text-right w-[15%]">Prix Unit.</th>
                                    <th class="py-3 px-2 text-xs font-bold uppercase tracking-widest text-gray-900 text-right w-[20%]">Total</th>
                                    <th v-if="!isPreview" class="py-3 w-8 print:hidden"></th>
                                </tr>
                            </thead>
                            <tbody class="">
                                <tr v-for="item in items" :key="item.id" class="group border-b border-gray-100 transition-colors print:hover:bg-transparent" :class="{'hover:bg-gray-50': !isPreview}">
                                    <td class="py-2 px-2 align-top">
                                        <Textarea v-if="!isPreview" v-model="item.description" placeholder="Description du produit ou service" class="resize-none min-h-[40px] border-none focus:ring-0 bg-transparent p-0 text-sm text-gray-700 placeholder:text-gray-300 w-full" rows="1" @input="(e:any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }" />
                                        <p v-else class="text-sm text-gray-700 py-2 whitespace-pre-wrap break-words">{{ item.description }}</p>
                                    </td>
                                    <td class="py-3 px-2 align-top text-center text-sm text-gray-700">
                                        <Input v-if="!isPreview" type="number" v-model="item.quantity" min="1" class="text-center border-none focus:ring-0 bg-transparent p-0 text-sm text-gray-700 h-full w-full" />
                                        <span v-else>{{ item.quantity }}</span>
                                    </td>
                                    <td class="py-3 px-2 align-top text-right text-sm text-gray-700">
                                        <div v-if="!isPreview" class="relative">
                                            <Input type="number" v-model="item.price" min="0" step="0.01" class="text-right border-none focus:ring-0 bg-transparent p-0 text-sm text-gray-700 h-full w-full pr-6" />
                                            <span class="absolute right-0 top-0 text-gray-400 text-xs">€</span>
                                        </div>
                                        <span v-else>{{ formatCurrency(item.price) }}</span>
                                    </td>
                                    <td class="py-3 px-2 text-right font-mono text-gray-900 font-medium align-top">
                                        <div v-if="!isPreview" class="relative">
                                            <Input type="number" :value="item.quantity * item.price" @input="(e: any) => updateItemTotal(item, e.target.value)" class="text-right border-none focus:ring-0 bg-transparent p-0 text-sm text-gray-900 font-medium h-full w-full pr-6" />
                                            <span class="absolute right-0 top-0 text-gray-400 text-xs">€</span>
                                        </div>
                                        <span v-else>{{ formatCurrency(item.quantity * item.price) }}</span>
                                    </td>
                                    <td v-if="!isPreview" class="py-3 text-center print:hidden align-top">
                                        <button v-if="items.length > 1" @click="removeItem(item.id)" class="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                            <Trash2 :size="14" />
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <Button v-if="!isPreview" @click="addItem" variant="ghost" size="sm" class="mt-4 text-gray-500 hover:text-gray-900 border border-dashed border-gray-300 w-full hover:bg-gray-50 print:hidden">
                            <Plus :size="14" class="mr-2" /> Ajouter une ligne
                        </Button>
                    </div>

                    <!-- Footer / Totals -->
                    <div class="flex flex-col md:flex-row justify-between items-start gap-12 mb-12">
                        <!-- Payment Info / Notes -->
                        <div class="flex-1 text-xs text-gray-500 space-y-4">
                            <div class="p-4 bg-gray-50 rounded border border-gray-100 print:bg-transparent print:border-none print:p-0" :class="{'bg-transparent border-none p-0': isPreview}">
                                <Label class="text-[10px] font-bold uppercase text-gray-400 mb-2 block">Informations de paiement</Label>
                                <div class="space-y-1">
                                    <div class="flex gap-2" v-if="companyDetails.iban">
                                        <span class="font-semibold w-8">IBAN:</span>
                                        <span class="font-mono select-all">{{ companyDetails.iban }}</span>
                                    </div>
                                    <div class="flex gap-2" v-if="companyDetails.bic">
                                        <span class="font-semibold w-8">BIC:</span>
                                        <span class="font-mono select-all">{{ companyDetails.bic }}</span>
                                    </div>
                                    <div class="flex gap-2" v-if="!companyDetails.iban && !isPreview">
                                        <span class="italic text-gray-400">Ajoutez votre IBAN dans les paramètres.</span>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <Label class="text-[10px] font-bold uppercase text-gray-400 mb-1 block">Notes / Conditions</Label>
                                <Textarea v-if="!isPreview" v-model="companyDetails.notes" class="w-full text-xs text-gray-500 bg-transparent border-none focus:ring-0 p-0 resize-none" rows="3" />
                                <p v-else class="text-xs text-gray-500 whitespace-pre-wrap">{{ companyDetails.notes }}</p>
                            </div>
                        </div>

                        <!-- Totals -->
                        <div class="w-full md:w-1/3 space-y-3">
                            <div v-if="companyDetails.vatEnabled" class="flex justify-between text-sm text-gray-600">
                                <span>Sous-total HT</span>
                                <span class="font-mono font-medium">{{ formatCurrency(subtotal) }}</span>
                            </div>
                            <div class="flex justify-between text-sm text-gray-600 items-center">
                                <div class="flex items-center gap-2">
                                     <input v-if="!isPreview" type="checkbox" v-model="companyDetails.vatEnabled" id="vat-toggle" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3" />
                                     <label v-if="!isPreview" for="vat-toggle" class="cursor-pointer select-none">TVA (20%)</label>
                                     <span v-else-if="companyDetails.vatEnabled">TVA (20%)</span>
                                </div>
                                <span v-if="companyDetails.vatEnabled" class="font-mono font-medium">{{ formatCurrency(taxAmount) }}</span>
                            </div>
                            <div class="h-px bg-gray-200 my-2"></div>
                            <div class="flex justify-between items-center">
                                <span class="text-base font-bold text-gray-900">Total {{ companyDetails.vatEnabled ? 'TTC' : '' }}</span>
                                <span class="text-xl font-bold font-mono tracking-tight" :style="{ color: companyDetails.accentColor }">{{ formatCurrency(total) }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Bottom Footer -->
                    <div class="absolute bottom-[10mm] left-[10mm] right-[10mm] text-center border-t border-gray-200 pt-4">
                        <div class="flex justify-center gap-4 text-[10px] text-gray-400 uppercase tracking-widest">
                            <span>{{ companyDetails.name }}</span>
                            <span>•</span>
                            <span>SIRET: {{ companyDetails.siret }}</span>
                            <span v-if="companyDetails.tvaNumber">•</span>
                            <span v-if="companyDetails.tvaNumber">TVA: {{ companyDetails.tvaNumber }}</span>
                        </div>
                    </div>
                </div>
            </div>
            
             <!-- Right Side: Utils / Client Selector (Print Hidden) -->
            <div class="w-full lg:w-80 print:hidden space-y-6">
                 <!-- Client Selection Helper -->
                <div class="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                    <Label class="text-xs font-bold uppercase text-gray-900 mb-4 block flex items-center gap-2">
                        <Search :size="12" /> Pré-remplissage Client
                    </Label>
                    
                    <div class="space-y-4">
                        <p class="text-xs text-gray-500">
                            Sélectionnez un client existant pour remplir automatiquement les informations de facturation.
                        </p>
                         <div class="relative">
                            <select 
                                v-model="selectedClientId" 
                                @change="handleClientSelect"
                                class="w-full p-2.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent bg-gray-50 appearance-none"
                            >
                                <option value="" disabled>Choisir dans la liste...</option>
                                <option v-for="client in clients" :key="client.id" :value="client.id">
                                    {{ client.company ? client.company : client.firstName + ' ' + client.lastName }}
                                </option>
                            </select>
                        </div>
                        
                        <div class="bg-blue-50 text-blue-800 text-xs p-3 rounded border border-blue-100">
                            <strong>Note :</strong> Vous n'êtes pas obligé de sélectionner un client. Vous pouvez remplir les champs manuellement sur la facture directement.
                        </div>
                    </div>
                </div>

                <!-- Quick Actions / Tips -->
                 <div class="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                    <Label class="text-xs font-bold uppercase text-gray-900 mb-4 block">Astuces</Label>
                    <ul class="text-xs text-gray-500 space-y-2 list-disc list-inside">
                         <li>Utilisez le bouton <strong>"Mode Aperçu"</strong> pour voir le rendu final exact.</li>
                        <li>Les champs vides (comme l'adresse) seront masqués sur le PDF final.</li>
                        <li>Vous pouvez éditer tous les textes directement.</li>
                    </ul>
                </div>
            </div>
        </div>

        <!-- Configuration Dialog -->
        <Dialog v-model:open="showSettingsDialog">
            <DialogContent class="sm:max-w-2xl bg-white border border-gray-200 shadow-xl text-gray-900 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle class="text-xl font-bold">Paramètres de l'entreprise</DialogTitle>
                    <DialogDescription class="text-gray-500">
                        Configurez vos informations légales et bancaires pour vos factures.
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
                                    <div v-if="companyDetails.logoUrl" class="w-20 h-20 border border-gray-200 rounded p-1 bg-white relative group">
                                        <img :src="companyDetails.logoUrl" class="w-full h-full object-contain" />
                                        <button @click="companyDetails.logoUrl = ''" class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Trash2 :size="12" />
                                        </button>
                                    </div>
                                    <div v-else class="w-20 h-20 border border-gray-300 border-dashed rounded flex items-center justify-center bg-gray-50 text-gray-400">
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
                         <Label class="text-sm font-bold text-gray-900 border-b pb-1 block">Informations Bancaires</Label>
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

                <DialogFooter>
                    <Button @click="showSettingsDialog = false" class="bg-gray-900 text-white hover:bg-black">
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

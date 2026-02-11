<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth, UserButton, useUser } from '@clerk/vue'
import axios from 'axios'
import { 
    Users, Search, LogOut, UserPlus, X, Loader, 
    Trash2, Lock, ArrowLeft, Calendar, FilePlus, ShieldCheck,
    TrendingUp, BarChart3, Edit3
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import DocumentManager from '@/components/admin/DocumentManager.vue'
import CalendarComponent from '@/components/Calendar.vue'
import SalesTracking from '@/components/admin/SalesTracking.vue'
import InternalDrive from '@/components/admin/InternalDrive.vue'
import InvoiceCreator from '@/components/admin/InvoiceCreator.vue'
import TeamManager from '@/components/admin/TeamManager.vue'
import DashboardStats from '@/components/admin/DashboardStats.vue'

// --- Interfaces ---
interface Document {
    id: number;
    name: string;
    type: string;
    size: string;
    url: string;
    createdAt: string;
    status: string;
    clientId: number;
}

interface Client {
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
    company: string | null;
    address?: string | null;
    city?: string | null;
    zipCode?: string | null;
    phone?: string | null;
    siret?: string | null;
    tvaNumber?: string | null;
    status: string;
    createdAt: string;
    documents: Document[];
}

// --- State ---
const router = useRouter()
const { isSignedIn, isLoaded, signOut } = useAuth()
const { user } = useUser()

watchEffect(() => {
    if (isLoaded.value && !isSignedIn.value) {
        router.push('/login')
    }
})

const users = ref<Client[]>([])
const selectedUser = ref<Client | null>(null)
// We use a separate form object to handle edits and avoid null type issues with v-model
const editForm = ref({
    id: 0,
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    address: '',
    city: '',
    zipCode: '',
    phone: '',
    siret: '',
    tvaNumber: ''
})

const activeView = ref<'clients' | 'stats' | 'calendar' | 'sales' | 'drive' | 'invoice' | 'team'>('clients')
const searchTerm = ref('')
const showCreateForm = ref(false)
const showEditForm = ref(false)
const isLoading = ref(false)
const showSuccess = ref(false)
const isMobileMenuOpen = ref(false)
const isPinVerified = ref(false) 
const pinCode = ref('')
const error = ref('')

// --- Computed ---
const filteredUsers = computed(() => {
    if (!searchTerm.value) return users.value
    const query = searchTerm.value.toLowerCase()
    return users.value.filter(user => 
        (user.firstName?.toLowerCase() || '').includes(query) || 
        (user.lastName?.toLowerCase() || '').includes(query) ||
        (user.email?.toLowerCase() || '').includes(query) ||
        (user.company?.toLowerCase() || '').includes(query)
    )
})

const selectedUserId = computed(() => selectedUser.value ? selectedUser.value.id : undefined)

// --- Methods ---

const handlePinSubmit = () => {
    if (pinCode.value === '00000') {
        isPinVerified.value = true
        error.value = ''
        fetchUsers() // Fetch immediately after auth
    } else {
        error.value = 'Code incorrect'
        pinCode.value = ''
    }
}

const fetchUsers = async () => {
    try {
        const res = await axios.get('/api/clients')
        users.value = res.data
    } catch (err) {
        console.warn('Failed to fetch clients', err)
    }
}

const handleSignOut = async () => {
    // isPinVerified.value = false
    if (signOut.value) await signOut.value()
    router.push('/login')
}

const handleCreateUser = async (e: Event) => {
    // e.preventDefault() handled by Vue modifier
    const form = e.target as HTMLFormElement
    const formData = new FormData(form)

    setIsLoading(true)

    try {
        const payload = {
            firstName: formData.get('firstName') as string,
            lastName: formData.get('lastName') as string,
            email: formData.get('email') as string,
            company: formData.get('company') as string,
            address: formData.get('address') as string,
            city: formData.get('city') as string,
            zipCode: formData.get('zipCode') as string,
            phone: formData.get('phone') as string,
            siret: formData.get('siret') as string,
            tvaNumber: formData.get('tvaNumber') as string
        }

        const res = await axios.post('/api/clients', payload)
        
        users.value.push(res.data)
        setIsLoading(false)
        showCreateForm.value = false
        showSuccess.value = true
        setTimeout(() => showSuccess.value = false, 3000)
    } catch (err: any) {
        setIsLoading(false)
        alert("Erreur: " + (err.response?.data?.error || err.message))
    }
}

const openEditUser = () => {
    if (!selectedUser.value) return
    const u = selectedUser.value
    editForm.value = {
        id: u.id,
        firstName: u.firstName || '',
        lastName: u.lastName || '',
        email: u.email || '',
        company: u.company || '',
        address: u.address || '',
        city: u.city || '',
        zipCode: u.zipCode || '',
        phone: u.phone || '',
        siret: u.siret || '',
        tvaNumber: u.tvaNumber || ''
    }
    showEditForm.value = true
}

const handleUpdateUser = async () => {
    setIsLoading(true)
    
    try {
        const res = await axios.put(`/api/clients/${editForm.value.id}`, editForm.value)
        
        // Update local state
        const updatedClient = res.data
        
        // Update users list
        const index = users.value.findIndex(u => u.id === updatedClient.id)
        if (index !== -1) {
            users.value[index] = updatedClient
        }
        
        // Update selected user view if it's the same user
        if (selectedUser.value?.id === updatedClient.id) {
            selectedUser.value = { ...selectedUser.value, ...updatedClient }
        }

        showEditForm.value = false
        alert("Client mis à jour avec succès !")
    } catch (err: any) {
        alert("Erreur mise à jour: " + (err.response?.data?.error || err.message))
    } finally {
        setIsLoading(false)
    }
}

const handleDeleteUser = async (userId: number, userName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le client "${userName}" ?\n\nCette action supprimera également tous ses documents et est irréversible.`)) {
        return
    }

    try {
        await axios.delete(`/api/clients/${userId}`)
        users.value = users.value.filter(u => u.id !== userId)
        if (selectedUser.value?.id === userId) {
            selectedUser.value = null
        }
        alert("Client supprimé avec succès !")
    } catch (e) {
        alert("Erreur réseau lors de la suppression")
    }
}

const handleDeleteDocument = async (docId: number, docName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le document "${docName}" ?`)) return

    try {
        await axios.delete(`/api/documents/${docId}`)
        
        // Update local state
        if (selectedUser.value) {
            selectedUser.value.documents = selectedUser.value.documents.filter(d => d.id !== docId)
        }
        
        // Update users list state
        users.value = users.value.map(u => {
            if (u.id === selectedUser.value?.id) {
                return { ...u, documents: u.documents.filter(d => d.id !== docId) }
            }
            return u
        })
        
        alert("Document supprimé avec succès !")
    } catch (e) {
        alert("Erreur suppression")
    }
}

function setIsLoading(val: boolean) {
    isLoading.value = val
}

const formatDate = (d: string) => new Date(d).toLocaleDateString()


// --- Lifecycle ---
// We fetch users after PIN authentication
</script>

<template>
    <!-- PIN Auth Screen -->
    <div v-if="!isPinVerified" class="min-h-screen bg-zinc-50 flex items-center justify-center p-4 relative overflow-hidden font-sans">
        <div class="absolute inset-0 z-0 opacity-5">
            <div class="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-black rounded-full filter blur-[120px]"></div>
            <div class="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-gray-500 rounded-full filter blur-[100px]"></div>
        </div>

        <!-- User Button specific for Clerk context -->
        <div class="absolute top-4 right-4 z-50">
             <UserButton after-sign-out-url="/login" />
        </div>

        <div class="bg-white border border-zinc-200 p-8 max-w-md w-full text-center relative z-10 shadow-2xl shadow-black/5 rounded-none">
            <div class="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-6 shadow-md">
                <Lock class="text-white" :size="32" />
            </div>
            <h2 class="text-2xl font-bold text-black tracking-tight mb-2">EcoFuté Admin</h2>
            <p class="text-zinc-500 mb-8 text-sm">Veuillez entrer le code de sécurité pour accéder.</p>

            <form @submit.prevent="handlePinSubmit" class="space-y-6">
                <div class="relative">
                    <input
                        type="password"
                        v-model="pinCode"
                        class="w-full text-center text-3xl tracking-[1em] font-light py-4 border-b-2 border-zinc-200 focus:border-black outline-none transition-all bg-transparent placeholder-zinc-200"
                        placeholder="•••••"
                        maxlength="5"
                        autofocus
                    />
                </div>
                <p v-if="error" class="text-red-500 text-xs font-medium uppercase tracking-wider">{{ error }}</p>

                <Button type="submit" class="w-full py-6 text-sm font-semibold uppercase tracking-widest bg-black text-white hover:bg-zinc-800 rounded-none transition-all">
                    Déverrouiller
                </Button>
            </form>
        </div>
    </div>

    <!-- Main Admin Interface -->
    <div v-else class="flex h-screen bg-white text-zinc-900 font-sans overflow-hidden">
        
        <!-- Mobile Sidebar Overlay -->
        <div 
            v-if="isMobileMenuOpen" 
            class="fixed inset-0 bg-black/80 z-30 md:hidden"
            @click="isMobileMenuOpen = false"
        ></div>

        <!-- Sidebar -->
        <aside :class="`
            fixed md:static inset-y-0 left-0 bg-black text-white flex flex-col shrink-0 z-50 w-64 transform transition-transform duration-300 ease-in-out border-r border-zinc-800
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `">
            <div class="h-16 flex items-center justify-between px-6 border-b border-zinc-800">
                <span class="text-lg font-bold tracking-tighter">EcoFuté.</span>
                <button class="md:hidden text-zinc-400 hover:text-white" @click="isMobileMenuOpen = false">
                    <X :size="20" />
                </button>
            </div>

            <nav class="flex-1 p-4 space-y-2 overflow-y-auto">
                <div class="px-2 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Menu Principal</div>
                <button
                    @click="activeView = 'clients'; selectedUser = null; isMobileMenuOpen = false"
                    :class="`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all ${activeView === 'clients' ? 'bg-white text-black rounded-sm' : 'text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-sm'}`"
                >
                    <Users :size="18" />
                    Gestion Clients
                </button>
                <button
                    @click="activeView = 'calendar'; selectedUser = null; isMobileMenuOpen = false"
                    :class="`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all ${activeView === 'calendar' ? 'bg-white text-black rounded-sm' : 'text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-sm'}`"
                >
                    <Calendar :size="18" />
                    Calendrier
                </button>
                <button
                    @click="activeView = 'sales'; selectedUser = null; isMobileMenuOpen = false"
                    :class="`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all ${activeView === 'sales' ? 'bg-white text-black rounded-sm' : 'text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-sm'}`"
                >
                    <TrendingUp :size="18" />
                    Suivi de Vente
                </button>
                <button
                    @click="activeView = 'stats'; selectedUser = null; isMobileMenuOpen = false"
                    :class="`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all ${activeView === 'stats' ? 'bg-white text-black rounded-sm' : 'text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-sm'}`"
                >
                    <BarChart3 :size="18" />
                    Statistiques
                </button>
                <button
                    @click="activeView = 'invoice'; selectedUser = null; isMobileMenuOpen = false"
                    :class="`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all ${activeView === 'invoice' ? 'bg-white text-black rounded-sm' : 'text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-sm'}`"
                >
                    <FilePlus :size="18" />
                    Création Facture
                </button>
                <div class="px-2 py-3 mt-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Administration</div>
                <button
                    @click="activeView = 'team'; selectedUser = null; isMobileMenuOpen = false"
                    :class="`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all ${activeView === 'team' ? 'bg-white text-black rounded-sm' : 'text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-sm'}`"
                >
                    <ShieldCheck :size="18" />
                    Gestion Équipe
                </button>
            </nav>

            <div class="p-4 border-t border-zinc-900">
                <div class="flex items-center gap-3 px-2 py-3">
                    <Avatar class="h-8 w-8 border border-zinc-700">
                        <AvatarFallback class="bg-zinc-900 text-white text-xs">
                            {{ user?.firstName?.charAt(0) || user?.emailAddresses[0]?.emailAddress?.charAt(0) || 'U' }}
                        </AvatarFallback>
                    </Avatar>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-white truncate">
                            {{ user?.fullName || 'Utilisateur' }}
                        </p>
                        <p class="text-xs text-zinc-500 truncate">
                            {{ user?.emailAddresses[0]?.emailAddress || 'email@ecofute.com' }}
                        </p>
                    </div>
                </div>
            </div>
        </aside>

        <!-- Main Content -->
        <main class="flex-1 flex flex-col overflow-hidden relative bg-white">
            <header class="h-16 flex items-center justify-between px-4 md:px-8 shrink-0 border-b border-zinc-100">
                <div class="flex items-center gap-4">
                    <button class="md:hidden p-2 -ml-2 text-black hover:bg-zinc-100 rounded-sm" @click="isMobileMenuOpen = true">
                        <div class="space-y-1.5">
                            <span class="block w-6 h-0.5 bg-current"></span>
                            <span class="block w-6 h-0.5 bg-current"></span>
                            <span class="block w-6 h-0.5 bg-current"></span>
                        </div>
                    </button>
                    <div class="text-sm font-medium text-zinc-500 uppercase tracking-wide">
                        {{ selectedUser ? `Dossier / ${selectedUser.firstName} ${selectedUser.lastName}` : activeView === 'stats' ? 'Tableau de bord / Statistiques' : activeView === 'calendar' ? 'Tableau de bord / Calendrier' : 'Tableau de bord / Clients' }}
                    </div>
                </div>
                <div class="flex items-center gap-2 md:gap-4">
                    <button @click="handleSignOut" class="md:hidden p-2 text-black">
                        <LogOut :size="20" />
                    </button>
                    <Button variant="ghost" @click="handleSignOut" class="hidden md:flex text-black hover:bg-zinc-100 gap-2 rounded-none h-8 text-xs font-medium border border-zinc-200">
                        <LogOut :size="14" /> Déconnexion
                    </Button>
                </div>
            </header>

            <div class="flex-1 overflow-auto p-4 md:p-8">
                <!-- User Details View -->
                <div v-if="selectedUser" class="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div class="flex justify-between items-center mb-8">
                         <button @click="selectedUser = null" class="text-sm text-zinc-500 hover:text-black flex items-center gap-2 font-medium transition-colors">
                            <ArrowLeft :size="16" /> Retour à la liste
                        </button>
                         <Button @click="openEditUser" variant="outline" class="rounded-none border-zinc-200 h-8 text-xs uppercase tracking-wider">
                            <Edit3 :size="14" class="mr-2" /> Modifier
                        </Button>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <!-- Left Column: User Info -->
                        <div class="lg:col-span-1 space-y-6">
                            <div class="bg-white rounded-none border border-zinc-200 p-6 shadow-sm">
                                <div class="flex flex-col items-center text-center mb-6">
                                    <Avatar class="w-24 h-24 mb-4 border-2 border-black">
                                        <AvatarFallback class="bg-zinc-100 text-black text-3xl font-light">
                                            {{ selectedUser.firstName?.charAt(0) || selectedUser.email.charAt(0) }}
                                        </AvatarFallback>
                                    </Avatar>
                                    <h2 class="text-xl font-bold text-black">{{ selectedUser.firstName }} {{ selectedUser.lastName }}</h2>
                                    <p class="text-zinc-500 text-sm mt-1">{{ selectedUser.email }}</p>
                                    <Badge variant="secondary" class="mt-3 bg-black text-white px-3 py-1 rounded-full text-xs font-normal">
                                        {{ selectedUser.company || 'Particulier' }}
                                    </Badge>
                                </div>
                                
                                <div class="space-y-4 pt-6 border-t border-zinc-100">
                                    <div class="flex justify-between items-center text-sm">
                                        <span class="text-zinc-500">Statut</span>
                                        <Badge variant="outline" class="rounded-none font-normal text-xs uppercase" :class="selectedUser.status === 'Validé' ? 'border-zinc-800 text-black' : 'border-zinc-200 text-zinc-400'">
                                            {{ selectedUser.status }}
                                        </Badge>
                                    </div>
                                    <div class="flex justify-between items-center text-sm">
                                        <span class="text-zinc-500">Inscription</span>
                                        <span class="font-medium text-black">{{ formatDate(selectedUser.createdAt) }}</span>
                                    </div>
                                     <div v-if="selectedUser.phone" class="flex justify-between items-center text-sm">
                                        <span class="text-zinc-500">Téléphone</span>
                                        <span class="font-medium text-black">{{ selectedUser.phone }}</span>
                                    </div>
                                    <div v-if="selectedUser.address || selectedUser.city" class="text-sm border-t border-zinc-50 pt-3 mt-3">
                                        <span class="text-zinc-500 block mb-1">Adresse</span>
                                        <span class="font-medium text-black block">{{ selectedUser.address }}</span>
                                        <span class="font-medium text-black block">{{ selectedUser.zipCode }} {{ selectedUser.city }}</span>
                                    </div>
                                    <div v-if="selectedUser.siret" class="text-sm border-t border-zinc-50 pt-3 mt-3">
                                        <span class="text-zinc-500 block mb-1">SIRET</span>
                                        <span class="font-medium text-black font-mono text-xs">{{ selectedUser.siret }}</span>
                                    </div>
                                     <div v-if="selectedUser.tvaNumber" class="text-sm pt-1">
                                        <span class="text-zinc-500 block mb-1">TVA</span>
                                        <span class="font-medium text-black font-mono text-xs">{{ selectedUser.tvaNumber }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Right Column: Documents -->
                        <div class="lg:col-span-2">
                             <div class="flex items-center justify-between mb-4">
                                <h3 class="text-lg font-bold text-black tracking-tight">Documents</h3>
                                <span class="bg-zinc-100 text-zinc-900 border border-zinc-200 px-2 py-0.5 text-xs font-mono">
                                    {{ selectedUser.documents?.length || 0 }} fichiers
                                </span>
                            </div>

                            <div class="bg-white border border-zinc-200 min-h-[400px]">
                                <DocumentManager 
                                    :documents="selectedUser.documents" 
                                    :clientId="selectedUser.id"
                                    @delete="handleDeleteDocument" 
                                    @refresh="fetchUsers"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Stats View -->
                <div v-else-if="activeView === 'stats'" class="h-full">
                    <div class="mb-8 border-b border-zinc-100 pb-4 px-8 pt-8">
                        <h1 class="text-3xl font-bold text-black tracking-tight tracking-tighter">Statistiques</h1>
                        <p class="text-zinc-500 mt-2">Vue d'ensemble de l'activité EcoFuté.</p>
                    </div>
                    
                    <div class="px-8 pb-8">
                        <DashboardStats />
                    </div>
                </div>

                <!-- Calendar View -->
                <div v-else-if="activeView === 'calendar'" class="h-full">
                    <CalendarComponent />
                </div>

                <!-- Sales View -->
                <div v-else-if="activeView === 'sales'" class="h-full">
                    <SalesTracking />
                </div>

                <!-- Drive View -->
                <div v-else-if="activeView === 'drive'" class="h-full">
                    <InternalDrive />
                </div>

                <!-- Invoice View -->
                <div v-else-if="activeView === 'invoice'" class="h-full overflow-y-auto">
                    <InvoiceCreator :preSelectedClientId="selectedUserId" />
                </div>

                <!-- Team View -->
                <div v-else-if="activeView === 'team'" class="h-full overflow-y-auto">
                    <TeamManager />
                </div>

                <!-- Clients List View -->
                <div v-else>
                    <div class="mb-8">
                        <div class="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 border-b border-zinc-100 pb-6">
                            <div>
                                <h1 class="text-3xl font-bold text-black tracking-tight mb-2">Clients</h1>
                                <p class="text-sm text-zinc-500">Gérez vos clients et accédez à leurs dossiers.</p>
                            </div>
                            <Button @click="showCreateForm = true" class="bg-black hover:bg-zinc-800 text-white rounded-none px-6 h-10 uppercase tracking-wider text-xs font-semibold">
                                <UserPlus :size="16" class="mr-2" /> Nouveau Client
                            </Button>
                        </div>

                        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-6">
                            <div class="flex-1 relative">
                                <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" :size="18" />
                                <Input v-model="searchTerm" placeholder="Rechercher par nom, email..." class="pl-10 rounded-none border-zinc-200 focus:border-black h-12 text-sm bg-white" />
                            </div>
                        </div>
                    </div>

                    <div class="bg-white border border-zinc-200 overflow-hidden">
                        <div class="overflow-x-auto">
                            <table class="w-full text-left border-collapse">
                                <thead class="bg-zinc-50 text-zinc-500 text-[10px] uppercase tracking-widest font-bold border-b border-zinc-200">
                                    <tr>
                                        <th class="px-6 py-4">Informations Client</th>
                                        <th class="px-6 py-4 hidden lg:table-cell">Contact</th>
                                        <th class="px-6 py-4 text-center hidden md:table-cell">Dossiers</th>
                                        <th class="px-6 py-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-zinc-100">
                                    <tr 
                                        v-for="u in filteredUsers" 
                                        :key="u.id" 
                                        @click="selectedUser = u"
                                        class="hover:bg-zinc-50 transition-colors cursor-pointer group"
                                    >
                                        <td class="px-6 py-5">
                                            <div class="flex items-center gap-4">
                                                <Avatar class="h-10 w-10 border border-zinc-200">
                                                    <AvatarFallback class="bg-white text-zinc-900 font-bold text-xs">{{ u.firstName?.charAt(0) || u.email.charAt(0) }}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div class="font-bold text-zinc-900 text-sm tracking-tight">{{ u.firstName }} {{ u.lastName }}</div>
                                                    <div class="text-xs text-zinc-500 hidden sm:block mt-0.5 uppercase tracking-wide">{{ u.company || 'Particulier' }}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td class="px-6 py-5 hidden lg:table-cell">
                                            <div class="text-sm text-zinc-600 font-mono">{{ u.email }}</div>
                                        </td>
                                        <td class="px-6 py-5 text-center hidden md:table-cell">
                                            <Badge variant="outline" class="border-zinc-200 text-zinc-600 rounded-none font-mono text-xs">
                                                {{ u.documents?.length || 0 }} docs
                                            </Badge>
                                        </td>
                                        <td class="px-6 py-5 text-right">
                                            <Button 
                                                variant="ghost" 
                                                size="sm"
                                                class="text-zinc-400 hover:text-red-600 hover:bg-transparent transition-colors"
                                                @click.stop="handleDeleteUser(u.id, `${u.firstName} ${u.lastName}`)"
                                            >
                                                <Trash2 :size="16" />
                                            </Button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        
                        <div v-if="filteredUsers.length === 0" class="p-12 text-center text-zinc-400 text-sm">
                            Aucun client trouvé pour cette recherche.
                        </div>
                    </div>
                </div>
            </div>
        </main>

        <!-- Create User Modal -->
         <Dialog v-model:open="showCreateForm">
            <DialogContent class="sm:max-w-2xl rounded-none border-zinc-200 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle class="text-xl font-bold tracking-tight">Nouveau Client</DialogTitle>
                    <DialogDescription>Créez manuellement un client pour l'ajouter à EcoFuté.</DialogDescription>
                </DialogHeader>
                <form @submit.prevent="handleCreateUser" class="space-y-4 pt-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-1">
                            <label class="text-xs font-semibold uppercase tracking-wider text-zinc-500">Prénom *</label>
                            <Input name="firstName" required placeholder="Ex: Thomas" class="rounded-none border-zinc-200 focus:border-black" />
                        </div>
                        <div class="space-y-1">
                            <label class="text-xs font-semibold uppercase tracking-wider text-zinc-500">Nom *</label>
                            <Input name="lastName" required placeholder="Ex: Martin" class="rounded-none border-zinc-200 focus:border-black" />
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                         <div class="space-y-1">
                            <label class="text-xs font-semibold uppercase tracking-wider text-zinc-500">Email *</label>
                            <Input type="email" name="email" required placeholder="client@exemple.com" class="rounded-none border-zinc-200 focus:border-black" />
                        </div>
                         <div class="space-y-1">
                            <label class="text-xs font-semibold uppercase tracking-wider text-zinc-500">Téléphone</label>
                            <Input name="phone" placeholder="06 12 34 56 78" class="rounded-none border-zinc-200 focus:border-black" />
                        </div>
                    </div>
                    
                    <div class="border-t border-zinc-100 pt-4 mt-4">
                        <h4 class="text-sm font-bold mb-3">Société & Adresse</h4>
                        <div class="space-y-4">
                            <div class="space-y-1">
                                <label class="text-xs font-semibold uppercase tracking-wider text-zinc-500">Société</label>
                                <Input name="company" placeholder="Ex: Société SAS" class="rounded-none border-zinc-200 focus:border-black" />
                            </div>
                            <div class="space-y-1">
                                <label class="text-xs font-semibold uppercase tracking-wider text-zinc-500">Adresse</label>
                                <Input name="address" placeholder="10 Rue de la Paix" class="rounded-none border-zinc-200 focus:border-black" />
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div class="space-y-1">
                                    <label class="text-xs font-semibold uppercase tracking-wider text-zinc-500">Code Postal</label>
                                    <Input name="zipCode" placeholder="75000" class="rounded-none border-zinc-200 focus:border-black" />
                                </div>
                                <div class="space-y-1">
                                    <label class="text-xs font-semibold uppercase tracking-wider text-zinc-500">Ville</label>
                                    <Input name="city" placeholder="Paris" class="rounded-none border-zinc-200 focus:border-black" />
                                </div>
                            </div>
                             <div class="grid grid-cols-2 gap-4">
                                <div class="space-y-1">
                                    <label class="text-xs font-semibold uppercase tracking-wider text-zinc-500">SIRET</label>
                                    <Input name="siret" placeholder="123 456 789 00012" class="rounded-none border-zinc-200 focus:border-black" />
                                </div>
                                <div class="space-y-1">
                                    <label class="text-xs font-semibold uppercase tracking-wider text-zinc-500">N° TVA</label>
                                    <Input name="tvaNumber" placeholder="FR 12 345678900" class="rounded-none border-zinc-200 focus:border-black" />
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <DialogFooter class="mt-6">
                        <Button type="button" variant="outline" @click="showCreateForm = false" class="rounded-none border-zinc-200">Annuler</Button>
                        <Button type="submit" :disabled="isLoading" class="bg-black hover:bg-zinc-800 text-white rounded-none">
                            <Loader v-if="isLoading" class="animate-spin mr-2" :size="16" /> Créer le client
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>

        <!-- Edit User Modal -->
         <Dialog v-model:open="showEditForm">
            <DialogContent class="sm:max-w-2xl rounded-none border-zinc-200 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle class="text-xl font-bold tracking-tight">Modifier Client</DialogTitle>
                    <DialogDescription>Mettre à jour les informations du client.</DialogDescription>
                </DialogHeader>
                <form @submit.prevent="handleUpdateUser" class="space-y-4 pt-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-1">
                            <label class="text-xs font-semibold uppercase tracking-wider text-zinc-500">Prénom *</label>
                            <Input v-model="editForm.firstName" required class="rounded-none border-zinc-200 focus:border-black" />
                        </div>
                        <div class="space-y-1">
                            <label class="text-xs font-semibold uppercase tracking-wider text-zinc-500">Nom *</label>
                            <Input v-model="editForm.lastName" required class="rounded-none border-zinc-200 focus:border-black" />
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                         <div class="space-y-1">
                            <label class="text-xs font-semibold uppercase tracking-wider text-zinc-500">Email *</label>
                            <Input type="email" v-model="editForm.email" required class="rounded-none border-zinc-200 focus:border-black" />
                        </div>
                         <div class="space-y-1">
                            <label class="text-xs font-semibold uppercase tracking-wider text-zinc-500">Téléphone</label>
                            <Input v-model="editForm.phone" class="rounded-none border-zinc-200 focus:border-black" />
                        </div>
                    </div>
                    
                    <div class="border-t border-zinc-100 pt-4 mt-4">
                        <h4 class="text-sm font-bold mb-3">Société & Adresse</h4>
                        <div class="space-y-4">
                            <div class="space-y-1">
                                <label class="text-xs font-semibold uppercase tracking-wider text-zinc-500">Société</label>
                                <Input v-model="editForm.company" class="rounded-none border-zinc-200 focus:border-black" />
                            </div>
                            <div class="space-y-1">
                                <label class="text-xs font-semibold uppercase tracking-wider text-zinc-500">Adresse</label>
                                <Input v-model="editForm.address" class="rounded-none border-zinc-200 focus:border-black" />
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div class="space-y-1">
                                    <label class="text-xs font-semibold uppercase tracking-wider text-zinc-500">Code Postal</label>
                                    <Input v-model="editForm.zipCode" class="rounded-none border-zinc-200 focus:border-black" />
                                </div>
                                <div class="space-y-1">
                                    <label class="text-xs font-semibold uppercase tracking-wider text-zinc-500">Ville</label>
                                    <Input v-model="editForm.city" class="rounded-none border-zinc-200 focus:border-black" />
                                </div>
                            </div>
                             <div class="grid grid-cols-2 gap-4">
                                <div class="space-y-1">
                                    <label class="text-xs font-semibold uppercase tracking-wider text-zinc-500">SIRET</label>
                                    <Input v-model="editForm.siret" class="rounded-none border-zinc-200 focus:border-black" />
                                </div>
                                <div class="space-y-1">
                                    <label class="text-xs font-semibold uppercase tracking-wider text-zinc-500">N° TVA</label>
                                    <Input v-model="editForm.tvaNumber" class="rounded-none border-zinc-200 focus:border-black" />
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <DialogFooter class="mt-6">
                        <Button type="button" variant="outline" @click="showEditForm = false" class="rounded-none border-zinc-200">Annuler</Button>
                        <Button type="submit" :disabled="isLoading" class="bg-black hover:bg-zinc-800 text-white rounded-none">
                            <Loader v-if="isLoading" class="animate-spin mr-2" :size="16" /> Mettre à jour
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    </div>
</template>

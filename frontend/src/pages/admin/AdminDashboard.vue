<script setup lang="ts">
import { ref, computed } from 'vue'
// import { useRouter } from 'vue-router'
import axios from 'axios'
import { 
    Users, Search, LogOut, UserPlus, X, Loader, 
    FileText, Trash2, Lock, BarChart3, ArrowLeft, Calendar 
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
    status: string;
    createdAt: string;
    documents: Document[];
}

// --- State ---
// const router = useRouter()
const users = ref<Client[]>([])
const selectedUser = ref<Client | null>(null)
const activeView = ref<'clients' | 'stats' | 'calendar' | 'sales' | 'drive'>('clients')
const searchTerm = ref('')
const showCreateForm = ref(false)
const isLoading = ref(false)
const showSuccess = ref(false)
const isMobileMenuOpen = ref(false)
const isAuthenticated = ref(false) // Fake Auth for now
const pinCode = ref('')
const error = ref('')

// --- Computed ---
const filteredUsers = computed(() => {
    return users.value.filter(u => 
        (u.firstName?.toLowerCase() || '').includes(searchTerm.value.toLowerCase()) ||
        (u.lastName?.toLowerCase() || '').includes(searchTerm.value.toLowerCase()) ||
        (u.email?.toLowerCase() || '').includes(searchTerm.value.toLowerCase())
    )
})

const totalDocs = computed(() => users.value.reduce((acc, u) => acc + (u.documents?.length || 0), 0))
const activeClientsCheck = computed(() => users.value.filter(u => u.status === 'Validé').length)

// --- Methods ---

const handlePinSubmit = () => {
    if (pinCode.value === '00000') {
        isAuthenticated.value = true
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

const handleSignOut = () => {
    isAuthenticated.value = false
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
            company: formData.get('company') as string
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
    <div v-if="!isAuthenticated" class="min-h-screen bg-zinc-50 flex items-center justify-center p-4 relative overflow-hidden font-sans">
        <div class="absolute inset-0 z-0 opacity-5">
            <div class="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-black rounded-full filter blur-[120px]"></div>
            <div class="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-gray-500 rounded-full filter blur-[100px]"></div>
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
            </nav>

            <div class="p-4 border-t border-zinc-900">
                <div class="flex items-center gap-3 px-2 py-3">
                    <Avatar class="h-8 w-8 border border-zinc-700">
                        <AvatarFallback class="bg-zinc-900 text-white text-xs">AD</AvatarFallback>
                    </Avatar>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-white truncate">Administrateur</p>
                        <p class="text-xs text-zinc-500 truncate">admin@ecofute.com</p>
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
                    <button @click="selectedUser = null" class="mb-8 text-sm text-zinc-500 hover:text-black flex items-center gap-2 font-medium transition-colors">
                        <ArrowLeft :size="16" /> Retour à la liste
                    </button>

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
                                <DocumentManager :documents="selectedUser.documents" @delete="handleDeleteDocument" />
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Stats View -->
                <div v-else-if="activeView === 'stats'" class="mb-8">
                    <div class="mb-8 border-b border-zinc-100 pb-4">
                        <h1 class="text-3xl font-bold text-black tracking-tight tracking-tighter">Statistiques</h1>
                        <p class="text-zinc-500 mt-2">Vue d'overview de l'activité EcoFuté.</p>
                    </div>
                    
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
                        <!-- Stat Card 1 -->
                        <div class="bg-white p-6 border border-zinc-200 hover:border-black transition-colors group">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="text-xs font-bold text-zinc-400 uppercase tracking-widest">Total Clients</h3>
                                <Users :size="20" class="text-zinc-300 group-hover:text-black transition-colors" />
                            </div>
                            <div class="text-5xl font-light text-black mb-2 tracking-tighter">{{ users.length }}</div>
                        </div>
                        
                        <!-- Stat Card 2 -->
                        <div class="bg-white p-6 border border-zinc-200 hover:border-black transition-colors group">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="text-xs font-bold text-zinc-400 uppercase tracking-widest">Documents</h3>
                                <FileText :size="20" class="text-zinc-300 group-hover:text-black transition-colors" />
                            </div>
                            <div class="text-5xl font-light text-black mb-2 tracking-tighter">{{ totalDocs }}</div>
                        </div>

                         <!-- Stat Card 3 -->
                        <div class="bg-white p-6 border border-zinc-200 hover:border-black transition-colors group">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="text-xs font-bold text-zinc-400 uppercase tracking-widest">Clients Actifs</h3>
                                <BarChart3 :size="20" class="text-zinc-300 group-hover:text-black transition-colors" />
                            </div>
                            <div class="text-5xl font-light text-black mb-2 tracking-tighter">{{ activeClientsCheck }}</div>
                        </div>
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
            <DialogContent class="sm:max-w-md rounded-none border-zinc-200">
                <DialogHeader>
                    <DialogTitle class="text-xl font-bold tracking-tight">Nouveau Client</DialogTitle>
                    <DialogDescription>Créez manuellement un client pour l'ajouter à EcoFuté.</DialogDescription>
                </DialogHeader>
                <form @submit.prevent="handleCreateUser" class="space-y-4 pt-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-1">
                            <label class="text-xs font-semibold uppercase tracking-wider text-zinc-500">Prénom</label>
                            <Input name="firstName" required placeholder="Ex: Thomas" class="rounded-none border-zinc-200 focus:border-black" />
                        </div>
                        <div class="space-y-1">
                            <label class="text-xs font-semibold uppercase tracking-wider text-zinc-500">Nom</label>
                            <Input name="lastName" required placeholder="Ex: Martin" class="rounded-none border-zinc-200 focus:border-black" />
                        </div>
                    </div>
                    <div class="space-y-1">
                        <label class="text-xs font-semibold uppercase tracking-wider text-zinc-500">Email</label>
                        <Input type="email" name="email" required placeholder="client@exemple.com" class="rounded-none border-zinc-200 focus:border-black" />
                    </div>
                    <div class="space-y-1">
                        <label class="text-xs font-semibold uppercase tracking-wider text-zinc-500">Société</label>
                        <Input name="company" placeholder="Ex: Société SAS" class="rounded-none border-zinc-200 focus:border-black" />
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
    </div>
</template>

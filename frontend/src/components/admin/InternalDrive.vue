<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { 
    HardDrive, Folder, FileText, Upload, Search, 
    Download, Archive, Trash2, FolderPlus, 
    Users, LayoutGrid, List as ListIcon 
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

interface Document {
    id: number
    name: string
    type: string
    size: string
    url: string
    category: string
    folder: string | null
    isArchived: boolean
    createdAt: string
    clientId?: number
    client?: {
        firstName: string
        lastName: string
        company: string
    }
}

// State
const documents = ref<Document[]>([])
const isLoading = ref(false)
const searchQuery = ref('')
const viewMode = ref<'grid' | 'list'>('grid')
const currentFilter = ref<'all' | 'clients' | 'archived'>('all')
const currentFolder = ref<string | null>(null)
const showUploadDialog = ref(false)
const selectedFile = ref<File | null>(null)

const uploadForm = ref<{
    name: string
    category: string
    folder: string
    clientId: string
}>({
    name: '',
    category: 'Général',
    folder: '',
    clientId: '' // Optional
})

// Lifecycle
onMounted(() => {
    fetchDocuments()
})

// Api
const fetchDocuments = async () => {
    try {
        isLoading.value = true
        const res = await axios.get('/api/documents')
        documents.value = res.data
    } catch (err) {
        console.error("Fetch docs error", err)
    } finally {
        isLoading.value = false
    }
}

const handleFileUpload = async () => {
    if (!selectedFile.value) return

    const formData = new FormData()
    formData.append('file', selectedFile.value)
    if (uploadForm.value.name) formData.append('name', uploadForm.value.name)
    formData.append('category', uploadForm.value.category)
    if (uploadForm.value.folder) formData.append('folder', uploadForm.value.folder)
    // Client ID if selected (logic to select client needed? For now global drive)

    try {
        await axios.post('/api/documents', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
        fetchDocuments()
        showUploadDialog.value = false
        selectedFile.value = null
        uploadForm.value = { name: '', category: 'Général', folder: '', clientId: '' }
    } catch (err) {
        alert("Erreur lors de l'upload")
    }
}

const archiveDocument = async (doc: Document) => {
    try {
        await axios.put(`/api/documents/${doc.id}`, { isArchived: !doc.isArchived })
        // Update local
        const index = documents.value.findIndex(d => d.id === doc.id)
        if (index !== -1 && documents.value[index]) {
            documents.value[index].isArchived = !doc.isArchived
        }
    } catch (err) {
        console.error(err)
    }
}

const deleteDocument = async (id: number) => {
    if (!confirm("Supprimer définitivement ce document ?")) return
    try {
        await axios.delete(`/api/documents/${id}`)
        documents.value = documents.value.filter(d => d.id !== id)
    } catch (err) {
        alert("Erreur suppression")
    }
}

// Computed
const filteredItems = computed(() => {
    let docs = documents.value

    // 1. Filter by View Scope
    if (currentFilter.value === 'clients') {
        docs = docs.filter(d => d.clientId !== null && !d.isArchived)
    } else if (currentFilter.value === 'archived') {
        docs = docs.filter(d => d.isArchived)
    } else {
        // 'all' = Active Documents (Global + Clients mixed, but usually exclude archived)
        docs = docs.filter(d => !d.isArchived)
    }

    // 2. Filter by Search
    if (searchQuery.value) {
        return docs.filter(d => 
            d.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
            d.category.toLowerCase().includes(searchQuery.value.toLowerCase())
        )
    }

    // 3. Filter by Folder (Virtual)
    // displaying folders vs files
    // If we are at root (currentFolder == null), we show items with folder==null AND unique folder names as "directories"
    // If we are in a folder, we show items with that folder name and subfolders (if any, but simplistic for now)
    
    // For now, simple 1-level folder structure based on 'folder' field
    if (currentFolder.value) {
        return docs.filter(d => d.folder === currentFolder.value)
    } else {
        // Root view: Show docs with no folder
        // Folders are handled separately in display
        return docs.filter(d => !d.folder)
    }
})

const uniqueFolders = computed(() => {
    if (currentFolder.value) return [] // No subfolders in this simple version
    if (searchQuery.value) return [] // Search ignores folders

    let docs = documents.value
    if (currentFilter.value === 'clients') docs = docs.filter(d => d.clientId !== null && !d.isArchived)
    else if (currentFilter.value === 'archived') docs = docs.filter(d => d.isArchived)
    else docs = docs.filter(d => !d.isArchived)

    const folders = new Set<string>()
    docs.forEach(d => {
        if (d.folder) folders.add(d.folder)
    })
    return Array.from(folders).sort()
})

const onFileSelect = (e: Event) => {
    const input = e.target as HTMLInputElement
    if (input.files && input.files[0]) {
        selectedFile.value = input.files[0]
        uploadForm.value.name = input.files[0].name
    }
}

// Helper
const formatSize = (size: string) => size // already formatted in backend
const formatDate = (date: string) => new Date(date).toLocaleDateString('fr-FR')

</script>

<template>
    <div class="h-full flex flex-col bg-white">
        <!-- Header -->
        <div class="border-b border-zinc-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h2 class="text-3xl font-bold text-zinc-900 tracking-tight flex items-center gap-3">
                    <HardDrive class="text-black" :size="32" />
                    Drive Interne
                </h2>
                <p class="text-sm text-zinc-500 mt-1">Espace de stockage et d'archivage centralisé.</p>
            </div>
            
            <div class="flex items-center gap-3">
                <div class="relative w-full md:w-64">
                    <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" :size="16" />
                    <Input v-model="searchQuery" placeholder="Rechercher un document..." class="pl-9 bg-zinc-50 border-zinc-200 focus:border-black rounded-sm" />
                </div>
                <div class="flex border border-zinc-200 rounded-sm bg-white">
                    <Button @click="viewMode = 'grid'" variant="ghost" size="sm" :class="`h-9 px-3 rounded-none ${viewMode === 'grid' ? 'bg-zinc-100' : ''}`">
                        <LayoutGrid :size="16" />
                    </Button>
                    <div class="w-px bg-zinc-200"></div>
                    <Button @click="viewMode = 'list'" variant="ghost" size="sm" :class="`h-9 px-3 rounded-none ${viewMode === 'list' ? 'bg-zinc-100' : ''}`">
                        <ListIcon :size="16" />
                    </Button>
                </div>
                <Button @click="showUploadDialog = true" class="bg-black hover:bg-zinc-800 text-white rounded-sm h-10 px-4 font-bold shadow-sm">
                    <Upload :size="16" class="mr-2" /> Importer
                </Button>
            </div>
        </div>

        <div class="flex-1 flex overflow-hidden">
            <!-- Sidebar -->
            <div class="w-64 bg-zinc-50 border-r border-zinc-200 p-4 flex flex-col gap-1 overflow-y-auto">
                <div class="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 px-2">Bibliothèque</div>
                <button 
                    @click="currentFilter = 'all'; currentFolder = null" 
                    :class="`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-sm transition-colors ${currentFilter === 'all' ? 'bg-white text-black shadow-sm' : 'text-zinc-600 hover:bg-zinc-100'}`"
                >
                    <HardDrive :size="18" /> Tous les fichiers
                </button>
                <button 
                    @click="currentFilter = 'clients'; currentFolder = null" 
                    :class="`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-sm transition-colors ${currentFilter === 'clients' ? 'bg-white text-black shadow-sm' : 'text-zinc-600 hover:bg-zinc-100'}`"
                >
                    <Users :size="18" /> Clients
                </button>
                <button 
                    @click="currentFilter = 'archived'; currentFolder = null" 
                    :class="`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-sm transition-colors ${currentFilter === 'archived' ? 'bg-white text-black shadow-sm' : 'text-zinc-600 hover:bg-zinc-100'}`"
                >
                    <Archive :size="18" /> Archives
                </button>

                <div class="mt-6 text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 px-2">Catégories</div>
                 <!-- Simple static categories filter logic could go here, for now just static links or dynamic? -->
                <div class="px-2 py-1 text-xs text-zinc-500 italic">Filtrer par tags...</div>
            </div>

            <!-- Content -->
            <div class="flex-1 overflow-y-auto p-6 bg-white">
                <!-- Breadcrumbs -->
                <div class="flex items-center gap-2 text-sm text-zinc-500 mb-6">
                    <span 
                        @click="currentFolder = null" 
                        class="hover:text-black cursor-pointer hover:underline transition-all flex items-center gap-1"
                    >
                        <HardDrive :size="14" /> Drive
                    </span>
                    <span v-if="currentFolder" class="flex items-center gap-2">
                        <span class="text-zinc-300">/</span>
                        <Folder :size="14" />
                        <span class="font-bold text-black">{{ currentFolder }}</span>
                    </span>
                    <span v-if="searchQuery" class="flex items-center gap-2">
                        <span class="text-zinc-300">/</span>
                        <Search :size="14" />
                        <span>Recherche: "{{ searchQuery }}"</span>
                    </span>
                </div>

                <!-- Folders Grid -->
                <div v-if="uniqueFolders.length > 0" class="mb-8">
                    <h3 class="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Dossiers</h3>
                    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        <div 
                            v-for="folder in uniqueFolders" 
                            :key="folder"
                            @click="currentFolder = folder"
                            class="group bg-zinc-50 border border-zinc-100 hover:border-black/20 p-4 rounded-sm cursor-pointer transition-all hover:bg-zinc-100 flex flex-col items-center justify-center gap-2 text-center h-32"
                        >
                            <Folder class="text-zinc-400 group-hover:text-black transition-colors" :size="40" stroke-width="1.5" />
                            <span class="text-sm font-semibold text-zinc-700 group-hover:text-black truncate w-full px-2">{{ folder }}</span>
                        </div>
                    </div>
                </div>

                <!-- Files -->
                <div>
                    <h3 class="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4 flex justify-between items-center">
                        Fichiers
                        <span class="text-[10px] bg-zinc-100 px-2 py-0.5 rounded-full text-zinc-500">{{ filteredItems.length }} éléments</span>
                    </h3>

                    <!-- Empty State -->
                     <div v-if="filteredItems.length === 0 && uniqueFolders.length === 0" class="text-center py-20 bg-zinc-50/50 border border-dashed border-zinc-200 rounded-sm">
                        <div class="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FolderPlus class="text-zinc-400" :size="32" />
                        </div>
                        <h3 class="font-bold text-zinc-900">Ce dossier est vide</h3>
                        <p class="text-sm text-zinc-500 mt-1 mb-4">Commencez par importer des documents</p>
                        <Button @click="showUploadDialog = true" variant="outline" class="border-zinc-300">Importer un fichier</Button>
                    </div>

                    <!-- Grid View -->
                    <div v-if="viewMode === 'grid' && filteredItems.length > 0" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        <div 
                            v-for="doc in filteredItems" 
                            :key="doc.id"
                            class="group relative bg-white border border-zinc-200 hover:border-black/50 p-4 rounded-sm transition-all hover:shadow-md flex flex-col justify-between h-48"
                        >
                            <div class="flex items-start justify-between">
                                <div class="p-2 bg-zinc-50 rounded-sm">
                                    <FileText class="text-zinc-400 group-hover:text-black transition-colors" :size="24" />
                                </div>
                                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <a :href="doc.url" target="_blank" class="p-1 hover:bg-zinc-100 rounded-sm text-zinc-500 hover:text-black transition-colors" title="Télécharger">
                                        <Download :size="14" />
                                    </a>
                                    <button @click="archiveDocument(doc)" class="p-1 hover:bg-zinc-100 rounded-sm text-zinc-500 hover:text-black transition-colors" :title="doc.isArchived ? 'Désarchiver' : 'Archiver'">
                                        <Archive :size="14" />
                                    </button>
                                    <button @click="deleteDocument(doc.id)" class="p-1 hover:bg-red-50 rounded-sm text-zinc-400 hover:text-red-600 transition-colors" title="Supprimer">
                                        <Trash2 :size="14" />
                                    </button>
                                </div>
                            </div>

                            <div>
                                <h4 class="font-bold text-sm text-zinc-900 truncate mb-1" :title="doc.name">{{ doc.name }}</h4>
                                <div class="flex items-center justify-between text-[10px] text-zinc-500 font-medium uppercase tracking-wide">
                                    <span>{{ doc.category }}</span>
                                    <span>{{ formatSize(doc.size) }}</span>
                                </div>
                                <div v-if="doc.client" class="mt-2 text-[10px] bg-zinc-50 px-1.5 py-1 rounded-sm border border-zinc-100 truncate text-zinc-400">
                                    <Users :size="10" class="inline mr-1" /> {{ doc.client.company || doc.client.lastName }}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- List View -->
                    <div v-if="viewMode === 'list' && filteredItems.length > 0" class="border border-zinc-200 rounded-sm overflow-hidden">
                        <table class="w-full text-left">
                            <thead class="bg-zinc-50 text-xs text-zinc-500 uppercase font-bold tracking-widest border-b border-zinc-200">
                                <tr>
                                    <th class="px-4 py-3">Nom</th>
                                    <th class="px-4 py-3">Catégorie</th>
                                    <th class="px-4 py-3">Client</th>
                                    <th class="px-4 py-3">Date</th>
                                    <th class="px-4 py-3">Taille</th>
                                    <th class="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-zinc-100 text-sm">
                                <tr v-for="doc in filteredItems" :key="doc.id" class="hover:bg-zinc-50/80 transition-colors group">
                                    <td class="px-4 py-3 font-medium text-zinc-900 flex items-center gap-3">
                                        <FileText :size="16" class="text-zinc-400" />
                                        <a :href="doc.url" target="_blank" class="hover:underline truncate max-w-[200px]">{{ doc.name }}</a>
                                    </td>
                                    <td class="px-4 py-3">
                                        <Badge variant="secondary" class="rounded-sm font-normal text-xs">{{ doc.category }}</Badge>
                                    </td>
                                    <td class="px-4 py-3 text-zinc-500 text-xs">
                                        <span v-if="doc.client">{{ doc.client.company || doc.client.lastName }}</span>
                                        <span v-else class="text-zinc-300">-</span>
                                    </td>
                                    <td class="px-4 py-3 text-zinc-500 text-xs">{{ formatDate(doc.createdAt) }}</td>
                                    <td class="px-4 py-3 text-zinc-500 font-mono text-xs">{{ formatSize(doc.size) }}</td>
                                    <td class="px-4 py-3 text-right">
                                        <div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <a 
                                                :href="doc.url" 
                                                target="_blank"
                                                class="h-8 w-8 p-0 inline-flex items-center justify-center rounded-sm hover:bg-zinc-100 text-zinc-900 transition-colors"
                                            >
                                                <Download :size="14" />
                                            </a>
                                            <Button @click="archiveDocument(doc)" variant="ghost" size="sm" class="h-8 w-8 p-0">
                                                <Archive :size="14" />
                                            </Button>
                                            <Button @click="deleteDocument(doc.id)" variant="ghost" size="sm" class="h-8 w-8 p-0 text-red-500 hover:text-red-600">
                                                <Trash2 :size="14" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <!-- Upload Dialog -->
        <Dialog v-model:open="showUploadDialog">
            <DialogContent class="sm:max-w-md rounded-sm">
                <DialogHeader>
                    <DialogTitle>Importer un message</DialogTitle>
                    <DialogDescription>Ajoutez un fichier à votre drive interne.</DialogDescription>
                </DialogHeader>
                <div class="grid gap-4 py-4">
                    <div class="grid gap-2">
                         <label class="text-sm font-medium">Fichier</label>
                         <Input type="file" @change="onFileSelect" />
                    </div>
                    <div class="grid gap-2">
                        <label class="text-sm font-medium">Nom (Optionnel)</label>
                        <Input v-model="uploadForm.name" placeholder="Nom du fichier..." />
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                         <div class="grid gap-2">
                             <label class="text-sm font-medium">Dossier</label>
                             <Input v-model="uploadForm.folder" placeholder="Ex: Projets 2024" list="folders" />
                             <!-- Datalist for existing folders -->
                             <datalist id="folders">
                                <option v-for="f in uniqueFolders" :key="f" :value="f"></option>
                             </datalist>
                         </div>
                         <div class="grid gap-2">
                             <label class="text-sm font-medium">Catégorie</label>
                             <select v-model="uploadForm.category" class="h-10 w-full px-3 rounded-md border border-input bg-background">
                                 <option value="Général">Général</option>
                                 <option value="Facture">Facture</option>
                                 <option value="Devis">Devis</option>
                                 <option value="Contrat">Contrat</option>
                                 <option value="Technique">Technique</option>
                                 <option value="Autre">Autre</option>
                             </select>
                         </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" @click="showUploadDialog = false">Annuler</Button>
                    <Button @click="handleFileUpload" class="bg-black text-white" :disabled="!selectedFile">Uploader</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
</template>

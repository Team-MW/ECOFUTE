<script setup lang="ts">
import { ref, computed } from 'vue'
import axios from 'axios'
import { Folder, ArrowLeft, FileText, ExternalLink, Trash2, UploadCloud, FolderPlus } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

interface Document {
    id: number;
    name: string;
    type: string;
    size: string;
    url: string;
    createdAt: string;
    status: string;
    clientId: number;
    category?: string; // Add category to interface if not present in parent
}

const props = defineProps<{
    documents: Document[],
    clientId: number // ID for uploads
}>()

const emit = defineEmits<{
    (e: 'delete', id: number, name: string): void
    (e: 'refresh'): void // Emit refresh to reload docs after upload
}>()

const view = ref<'folders' | 'files'>('folders')
const currentFolder = ref<string | null>(null)
const isDragging = ref(false)
const showCreateFolderDialog = ref(false)
const newFolderName = ref('')
const isUploading = ref(false)

// Custom folders (persisted locally for now or derived?)
// Ideally, folders are just unique categories. "Creating" a folder just adds it to the list until a file is added?
// Or we can just have a list of 'known' folders including empty ones if we store them in state.
// For simplicity, we'll store 'active' empty folders in a ref until refresh.
const customFolders = ref<string[]>([])

const groupedDocs = computed(() => {
    const groups: Record<string, Document[]> = {}
    
    props.documents.forEach(doc => {
        // Parse category from name [Category] Name OR use doc.category if available (from drive update)
        // The regex fallback is for old docs. New docs might have category field if backend sends it.
        // Let's rely on the regex for now as backend returns 'name' as '[Category] Name'.
        // Wait, the backend returns 'category' field now in 'InternalDrive' but maybe not here?
        // Let's assume standard '[Category] Name' format still holds or check doc.category.
        
        let category = 'Autre'
        let cleanName = doc.name

        // Check for category field first (if added to query)
        if (doc.category && doc.category !== 'Autre') {
            category = doc.category
        } else {
             const match = doc.name.match(/^\[(.*?)\]\s*(.*)/)
             if (match) {
                 category = match[1] || 'Autre'
                 cleanName = match[2] || doc.name
             }
        }

        if (!groups[category]) {
            groups[category] = []
        }
        groups[category]?.push({ ...doc, name: cleanName })
    })

    // Add empty custom folders
    customFolders.value.forEach(folder => {
        if (!groups[folder]) {
            groups[folder] = []
        }
    })

    return groups
})

const folders = computed(() => Object.keys(groupedDocs.value).sort())

function openFolder(folder: string) {
    currentFolder.value = folder
    view.value = 'files'
}

function goBack() {
    view.value = 'folders'
    currentFolder.value = null
}

function formatDate(date: string) {
    return new Date(date).toLocaleDateString()
}

// Drag & Drop
function onDragOver(e: DragEvent) {
    e.preventDefault()
    isDragging.value = true
}

function onDragLeave(e: DragEvent) {
    e.preventDefault()
    isDragging.value = false
}

function onDrop(e: DragEvent) {
    e.preventDefault()
    isDragging.value = false
    
    const files = e.dataTransfer?.files
    if (files && files.length > 0) {
        handleFiles(files)
    }
}

async function handleFiles(files: FileList) {
    if (!props.clientId) {
        alert("Client ID manquant. Impossible d'uploader.")
        return
    }
    
    // Determine target category
    const targetCategory = currentFolder.value || 'Général'
    
    isUploading.value = true
    
    try {
        for (let i = 0; i < files.length; i++) {
            const file = files[i]
            if (file) {
                 const formData = new FormData()
                 // Append metadata first
                 formData.append('clientId', props.clientId.toString())
                 formData.append('category', targetCategory)
                 // Then file
                 formData.append('file', file)
                 
                 await axios.post('/api/documents', formData, {
                     headers: { 'Content-Type': 'multipart/form-data' }
                 })
            }
        }
        
        // Refresh docs
        emit('refresh')
        
    } catch (error: any) {
        console.error("Upload error details:", error)
        alert("Erreur lors de l'upload: " + (error.response?.data?.error || error.message))
    } finally {
        isUploading.value = false
    }
}

function createFolder() {
    if (newFolderName.value) {
        if (!folders.value.includes(newFolderName.value)) {
            customFolders.value.push(newFolderName.value)
        }
        newFolderName.value = ''
        showCreateFolderDialog.value = false
    }
}

// File Input trigger
const fileInput = ref<HTMLInputElement | null>(null)
function triggerFileInput() {
    fileInput.value?.click()
}
function onFileSelect(e: Event) {
    const input = e.target as HTMLInputElement
    if (input.files && input.files.length > 0) {
        handleFiles(input.files)
    }
}

</script>

<template>
    <div 
        class="h-full flex flex-col font-sans relative"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
    >
        <!-- Overlay for Drag -->
        <div v-if="isDragging" class="absolute inset-0 bg-black/5 border-2 border-dashed border-black z-50 flex items-center justify-center backdrop-blur-sm pointer-events-none">
            <div class="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center">
                <UploadCloud :size="48" class="text-black mb-4" />
                <h3 class="text-lg font-bold">Déposez les fichiers ici</h3>
                <p class="text-sm text-zinc-500">pour les ajouter au dossier {{ currentFolder || 'Général' }}</p>
            </div>
        </div>

        <!-- Toolbar (Only visible if not uploading?) -->
        <div class="flex items-center justify-between p-4 border-b border-zinc-100 bg-zinc-50/50">
             <div class="flex items-center gap-2">
                 <Button v-if="view === 'files'" variant="ghost" size="sm" @click="goBack" class="mr-2">
                    <ArrowLeft :size="16" />
                 </Button>
                 <h4 class="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                    {{ view === 'folders' ? 'Dossiers' : currentFolder }}
                 </h4>
             </div>
             <div class="flex items-center gap-2">
                 <Button v-if="view === 'folders'" variant="outline" size="sm" @click="showCreateFolderDialog = true" class="h-8 text-xs bg-white border-zinc-200">
                    <FolderPlus :size="14" class="mr-2" /> Nouveau Dossier
                 </Button>
                 <!-- Hidden Input -->
                 <input type="file" ref="fileInput" multiple class="hidden" @change="onFileSelect" />
                 <Button @click="triggerFileInput" variant="default" size="sm" class="h-8 text-xs bg-black text-white px-4">
                    <UploadCloud :size="14" class="mr-2" /> {{ isUploading ? 'Envoi...' : 'Ajouter Fichier' }}
                 </Button>
             </div>
        </div>

        <!-- Folders View -->
        <div v-if="view === 'folders'" class="p-6 flex-1 overflow-auto">
            <div v-if="folders.length === 0" class="text-center py-16 flex flex-col items-center">
                <div class="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mb-4">
                    <Folder :size="32" class="text-zinc-300" />
                </div>
                <p class="text-zinc-500 text-sm mb-4">Aucun dossier.</p>
                <Button variant="outline" @click="showCreateFolderDialog = true">Créer un dossier</Button>
            </div>

            <div v-else class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <button
                    v-for="folder in folders"
                    :key="folder"
                    @click="openFolder(folder)"
                    class="flex flex-col items-center justify-center p-8 bg-white hover:bg-zinc-50 hover:border-black border border-zinc-200 transition-all duration-200 group rounded-sm shadow-sm hover:shadow-md relative"
                >
                    <Folder :size="40" class="text-zinc-300 group-hover:text-black mb-3 transition-colors" stroke-width="1.5" />
                    <span class="font-bold text-sm text-zinc-900 group-hover:text-black tracking-tight truncate w-full text-center px-2">{{ folder }}</span>
                    <span class="text-[10px] uppercase tracking-wide text-zinc-400 mt-1 font-semibold">{{ groupedDocs[folder]?.length || 0 }} fichier(s)</span>
                </button>
            </div>
        </div>

        <!-- Files View -->
        <div v-else class="flex flex-col flex-1 bg-white overflow-hidden">
                <!-- Empty State -->
                <div v-if="!groupedDocs[currentFolder!] || (groupedDocs[currentFolder!] || []).length === 0" class="flex-1 flex flex-col items-center justify-center text-zinc-400">
                    <div 
                        class="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mb-4 border-2 border-dashed border-zinc-200"
                        :class="{'border-black bg-zinc-100': isDragging}"
                    >
                        <UploadCloud :size="32" class="text-zinc-300" />
                    </div>
                <p>Ce dossier est vide.</p>
                <p class="text-xs mt-1">Glissez des fichiers ici pour les uploader.</p>
             </div>

            <div v-else class="flex-1 overflow-auto">
                <table class="w-full text-left text-sm">
                    <thead class="bg-zinc-50 border-b border-zinc-100 text-zinc-500 sticky top-0">
                        <tr>
                            <th class="px-6 py-3 text-[10px] uppercase tracking-widest font-bold">Nom du fichier</th>
                            <th class="px-6 py-3 text-[10px] uppercase tracking-widest font-bold">Type</th>
                            <th class="px-6 py-3 text-[10px] uppercase tracking-widest font-bold">Taille</th>
                            <th class="px-6 py-3 text-[10px] uppercase tracking-widest font-bold">Date</th>
                            <th class="px-6 py-3 text-[10px] uppercase tracking-widest font-bold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-zinc-100">
                        <tr v-for="doc in (groupedDocs[currentFolder!] || [])" :key="doc.id" class="hover:bg-zinc-50/80 transition-colors group">
                            <td class="px-6 py-4 font-medium text-zinc-900 flex items-center gap-3">
                                <FileText :size="16" class="text-zinc-400 group-hover:text-black transition-colors" />
                                <span class="truncate max-w-[200px]">{{ doc.name }}</span>
                            </td>
                            <td class="px-6 py-4 text-zinc-500 uppercase text-[10px] font-bold tracking-wide">{{ doc.type }}</td>
                            <td class="px-6 py-4 text-zinc-500 tabular-nums font-mono text-xs">{{ doc.size }}</td>
                            <td class="px-6 py-4 text-zinc-500 tabular-nums font-mono text-xs">{{ formatDate(doc.createdAt) }}</td>
                            <td class="px-6 py-4 text-right">
                                <div class="flex items-center justify-end gap-2">
                                    <a
                                        :href="doc.url"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        class="inline-flex items-center gap-1 text-zinc-600 hover:text-black border border-zinc-200 hover:border-black bg-white px-3 py-1.5 rounded-sm transition-all text-xs font-medium"
                                    >
                                        Voir <ExternalLink :size="10" />
                                    </a>
                                    <button
                                        @click.stop="emit('delete', doc.id, `[${currentFolder}] ${doc.name}`)"
                                        class="inline-flex items-center gap-1 text-zinc-400 hover:text-red-600 border border-transparent hover:border-red-200 hover:bg-red-50 px-2 py-1.5 rounded-sm transition-all text-xs"
                                    >
                                        <Trash2 :size="14" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Create Folder Dialog -->
        <Dialog v-model:open="showCreateFolderDialog">
            <DialogContent class="sm:max-w-xs rounded-sm">
                <DialogHeader>
                    <DialogTitle>Nouveau Dossier</DialogTitle>
                    <DialogDescription>Entrez le nom du nouveau dossier.</DialogDescription>
                </DialogHeader>
                <div class="py-4">
                    <Input v-model="newFolderName" placeholder="Ex: Factures, Devis..." class="rounded-sm" @keyup.enter="createFolder" autoFocus />
                </div>
                <DialogFooter>
                    <Button variant="outline" @click="showCreateFolderDialog = false" size="sm">Annuler</Button>
                    <Button @click="createFolder" class="bg-black text-white" size="sm">Créer</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
</template>

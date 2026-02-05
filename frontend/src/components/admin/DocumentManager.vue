<script setup lang="ts">
import { ref, computed } from 'vue'
import { Folder, FolderOpen, ArrowLeft, FileText, ExternalLink, Trash2, ChevronRight } from 'lucide-vue-next'
// import { Button } from '@/components/ui/button'

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

const props = defineProps<{
    documents: Document[]
}>()

const emit = defineEmits<{
    (e: 'delete', id: number, name: string): void
}>()

const view = ref<'folders' | 'files'>('folders')
const currentFolder = ref<string | null>(null)

const groupedDocs = computed(() => {
    const groups: Record<string, Document[]> = {}
    
    props.documents.forEach(doc => {
        const match = doc.name.match(/^\[(.*?)\]\s*(.*)/)
        let category = 'Autre'
        let cleanName = doc.name

        if (match) {
            category = match[1] || 'Autre'
            cleanName = match[2] || doc.name
        }

        if (!groups[category]) {
            groups[category] = []
        }
        groups[category]?.push({ ...doc, name: cleanName })
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
</script>

<template>
    <div class="h-full flex flex-col font-sans">
        <!-- Folders View -->
        <div v-if="view === 'folders'" class="p-6">
            <h4 class="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6">Dossiers Disponibles</h4>
            
            <div v-if="folders.length === 0" class="text-center py-16">
                <div class="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Folder :size="32" class="text-zinc-300" />
                </div>
                <p class="text-zinc-500 text-sm">Aucun dossier pour le moment.</p>
            </div>

            <div v-else class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <button
                    v-for="folder in folders"
                    :key="folder"
                    @click="openFolder(folder)"
                    class="flex flex-col items-center justify-center p-8 bg-zinc-50 hover:bg-zinc-100 hover:border-black border border-zinc-100 transition-all duration-200 group rounded-sm"
                >
                    <Folder :size="32" class="text-zinc-400 group-hover:text-black mb-3 transition-colors" />
                    <span class="font-semibold text-sm text-zinc-900 group-hover:text-black tracking-tight">{{ folder }}</span>
                    <span class="text-[10px] uppercase tracking-wide text-zinc-400 mt-1 font-semibold">{{ groupedDocs[folder]?.length || 0 }} fichier(s)</span>
                </button>
            </div>
        </div>

        <!-- Files View -->
        <div v-else class="flex flex-col h-full bg-white">
            <div class="flex items-center gap-3 p-4 border-b border-zinc-100 bg-white">
                <button
                    @click="goBack"
                    class="p-2 hover:bg-zinc-100 rounded-sm transition-colors text-zinc-500 hover:text-black"
                >
                    <ArrowLeft :size="16" />
                </button>
                <div class="flex items-center gap-2 text-sm">
                    <span class="text-zinc-400 flex items-center gap-1 font-medium cursor-pointer hover:text-black transition-colors" @click="goBack">Dossiers</span>
                    <ChevronRight :size="14" class="text-zinc-300" />
                    <span class="font-bold text-black flex items-center gap-2">
                        <FolderOpen :size="16" /> {{ currentFolder }}
                    </span>
                </div>
            </div>

            <div class="flex-1 overflow-auto">
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
                        <tr v-for="doc in groupedDocs[currentFolder!]" :key="doc.id" class="hover:bg-zinc-50/80 transition-colors group">
                            <td class="px-6 py-4 font-medium text-zinc-900 flex items-center gap-3">
                                <FileText :size="16" class="text-zinc-400 group-hover:text-black transition-colors" />
                                {{ doc.name }}
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
    </div>
</template>

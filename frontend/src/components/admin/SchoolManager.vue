<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { 
    Plus, Trash2, Edit3, Search, GraduationCap, ExternalLink, 
    Mail, Phone, ArrowLeft, CheckCircle2, Clock, AlertCircle, Calendar,
    Building2, RefreshCw, ChevronRight, CheckCircle, FileText
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import { showToast, showConfirm } from '@/lib/feedback'

interface Demarche {
    id: number
    title: string
    description?: string | null
    status: string // "À faire" | "En cours" | "Terminé"
    dueDate?: string | null
    schoolId: number
    createdAt: string
    updatedAt: string
}

interface School {
    id: number
    name: string
    contactName?: string | null
    contactEmail?: string | null
    contactPhone?: string | null
    website?: string | null
    createdAt: string
    updatedAt: string
    demarches: Demarche[]
}

// State
const schools = ref<School[]>([])
const selectedSchool = ref<School | null>(null)
const searchTerm = ref('')
const demarcheFilter = ref<'all' | 'todo' | 'inprogress' | 'done'>('all')
const isLoading = ref(true)

// Modals State
const showSchoolDialog = ref(false)
const showDemarcheDialog = ref(false)
const editingSchool = ref<School | null>(null)
const editingDemarche = ref<Demarche | null>(null)

// Forms State
const schoolForm = ref({
    name: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    website: ''
})

const demarcheForm = ref({
    title: '',
    description: '',
    status: 'À faire',
    dueDate: ''
})

// Lifecycle
onMounted(() => {
    fetchSchools()
})

// API Operations
const fetchSchools = async () => {
    isLoading.value = true
    try {
        const res = await axios.get('/api/schools')
        schools.value = res.data
        
        // Update selectedSchool with fresh data if viewing one
        if (selectedSchool.value) {
            const fresh = schools.value.find(s => s.id === selectedSchool.value?.id)
            if (fresh) {
                selectedSchool.value = fresh
            } else {
                selectedSchool.value = null
            }
        }
    } catch (e) {
        console.error("Failed to fetch schools", e)
    } finally {
        isLoading.value = false
    }
}

// School CRUD
const openNewSchoolDialog = () => {
    editingSchool.value = null
    schoolForm.value = {
        name: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        website: ''
    }
    showSchoolDialog.value = true
}

const openEditSchoolDialog = (school: School) => {
    editingSchool.value = school
    schoolForm.value = {
        name: school.name,
        contactName: school.contactName || '',
        contactEmail: school.contactEmail || '',
        contactPhone: school.contactPhone || '',
        website: school.website || ''
    }
    showSchoolDialog.value = true
}

const saveSchool = async () => {
    if (!schoolForm.value.name) return
    try {
        if (editingSchool.value) {
            await axios.put(`/api/schools/${editingSchool.value.id}`, schoolForm.value)
        } else {
            await axios.post('/api/schools', schoolForm.value)
        }
        await fetchSchools()
        showSchoolDialog.value = false
    } catch (e) {
        showToast("Erreur lors de l'enregistrement de l'école", "error")
    }
}

const deleteSchool = async (school: School) => {
    const isConfirmed = await showConfirm({
        title: 'Supprimer l\'école',
        message: `Voulez-vous vraiment supprimer l'école "${school.name}" ?\nCette action supprimera également toutes ses démarches.`,
        type: 'danger',
        confirmText: 'Supprimer',
        cancelText: 'Annuler'
    })
    if (!isConfirmed) return
    try {
        await axios.delete(`/api/schools/${school.id}`)
        if (selectedSchool.value?.id === school.id) {
            selectedSchool.value = null
        }
        await fetchSchools()
        showToast("École supprimée avec succès !", "success")
    } catch (e) {
        showToast("Impossible de supprimer l'école", "error")
    }
}

// Demarche CRUD
const openNewDemarcheDialog = () => {
    editingDemarche.value = null
    demarcheForm.value = {
        title: '',
        description: '',
        status: 'À faire',
        dueDate: ''
    }
    showDemarcheDialog.value = true
}

const openEditDemarcheDialog = (demarche: Demarche) => {
    editingDemarche.value = demarche
    demarcheForm.value = {
        title: demarche.title,
        description: demarche.description || '',
        status: demarche.status,
        dueDate: demarche.dueDate ? demarche.dueDate.split('T')[0] : ''
    }
    showDemarcheDialog.value = true
}

const saveDemarche = async () => {
    if (!selectedSchool.value || !demarcheForm.value.title) return
    try {
        if (editingDemarche.value) {
            await axios.put(`/api/schools/${selectedSchool.value.id}/demarches/${editingDemarche.value.id}`, demarcheForm.value)
        } else {
            await axios.post(`/api/schools/${selectedSchool.value.id}/demarches`, demarcheForm.value)
        }
        await fetchSchools()
        showDemarcheDialog.value = false
    } catch (e) {
        showToast("Erreur lors de l'enregistrement de la démarche", "error")
    }
}

const toggleDemarcheStatus = async (demarche: Demarche) => {
    const nextStatusMap: Record<string, string> = {
        'À faire': 'En cours',
        'En cours': 'Terminé',
        'Terminé': 'À faire'
    }
    const nextStatus = nextStatusMap[demarche.status] || 'À faire'
    try {
        await axios.put(`/api/schools/${demarche.schoolId}/demarches/${demarche.id}`, {
            ...demarche,
            status: nextStatus
        })
        await fetchSchools()
    } catch (e) {
        console.error(e)
    }
}

const deleteDemarche = async (demarche: Demarche) => {
    const isConfirmed = await showConfirm({
        title: 'Supprimer la démarche',
        message: `Supprimer la démarche "${demarche.title}" ?`,
        type: 'danger',
        confirmText: 'Supprimer',
        cancelText: 'Annuler'
    })
    if (!isConfirmed) return
    try {
        await axios.delete(`/api/schools/${demarche.schoolId}/demarches/${demarche.id}`)
        await fetchSchools()
        showToast("Démarche supprimée avec succès !", "success")
    } catch (e) {
        showToast("Impossible de supprimer la démarche", "error")
    }
}

// Helpers
const getProgressColor = (percent: number) => {
    if (percent === 100) return 'bg-emerald-500'
    if (percent > 40) return 'bg-amber-500'
    return 'bg-zinc-800'
}

const getStatusBadgeClass = (status: string) => {
    switch (status) {
        case 'Terminé': return 'bg-emerald-50 border-emerald-200 text-emerald-700'
        case 'En cours': return 'bg-amber-50 border-amber-200 text-amber-700'
        default: return 'bg-zinc-50 border-zinc-200 text-zinc-600'
    }
}

const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

const isOverdue = (demarche: Demarche) => {
    if (!demarche.dueDate || demarche.status === 'Terminé') return false
    const due = new Date(demarche.dueDate)
    const today = new Date()
    // Compare dates ignoring times
    today.setHours(0,0,0,0)
    due.setHours(0,0,0,0)
    return due < today
}

// Computed
const filteredSchools = computed(() => {
    if (!searchTerm.value) return schools.value
    const query = searchTerm.value.toLowerCase()
    return schools.value.filter(s => 
        s.name.toLowerCase().includes(query) || 
        (s.contactName?.toLowerCase() || '').includes(query)
    )
})

const filteredDemarches = computed(() => {
    if (!selectedSchool.value) return []
    const list = selectedSchool.value.demarches
    switch (demarcheFilter.value) {
        case 'todo': return list.filter(d => d.status === 'À faire')
        case 'inprogress': return list.filter(d => d.status === 'En cours')
        case 'done': return list.filter(d => d.status === 'Terminé')
        default: return list
    }
})

const getCompletionPercentage = (school: School) => {
    if (!school.demarches || school.demarches.length === 0) return 0
    const completed = school.demarches.filter(d => d.status === 'Terminé').length
    return Math.round((completed / school.demarches.length) * 100)
}
</script>

<template>
    <div class="h-full flex flex-col bg-white">
        
        <!-- ================= MAIN VIEW: SCHOOL LIST ================= -->
        <div v-if="!selectedSchool" class="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-300">
            <!-- Header -->
            <div class="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 border-b border-zinc-100 pb-6">
                <div>
                    <h1 class="text-3xl font-bold text-black tracking-tight mb-2">Écoles Partenaires</h1>
                    <p class="text-sm text-zinc-500">Gérez les établissements scolaires partenaires et suivez vos démarches.</p>
                </div>
                <div class="flex items-center gap-3">
                    <Button @click="fetchSchools" variant="outline" size="sm" class="h-10 w-10 p-0 border-zinc-200">
                        <RefreshCw :size="16" class="text-zinc-500 hover:text-black" />
                    </Button>
                    <Button @click="openNewSchoolDialog" class="bg-black hover:bg-zinc-800 text-white rounded-none px-6 h-10 uppercase tracking-wider text-xs font-semibold">
                        <Plus :size="16" class="mr-2" /> Nouvelle École
                    </Button>
                </div>
            </div>

            <!-- Search -->
            <div class="flex items-center gap-4 mb-6">
                <div class="flex-1 relative">
                    <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" :size="18" />
                    <Input v-model="searchTerm" placeholder="Rechercher une école..." class="pl-10 rounded-none border-zinc-200 focus:border-black h-12 text-sm bg-white" />
                </div>
            </div>

            <!-- Loading -->
            <div v-if="isLoading" class="flex-1 p-4">
                <SkeletonLoader type="cards" :rows="3" />
            </div>

            <!-- School Grid -->
            <div v-else class="flex-1 overflow-y-auto pb-8">
                <div v-if="filteredSchools.length === 0" class="flex flex-col items-center justify-center p-16 text-center text-zinc-400 border border-dashed border-zinc-200 rounded bg-zinc-50">
                    <GraduationCap :size="48" class="text-zinc-300 mb-4" />
                    <h3 class="font-bold text-zinc-900 mb-1">Aucune école trouvée</h3>
                    <p class="text-xs">Commencez par ajouter une école partenaire pour suivre ses démarches.</p>
                    <Button @click="openNewSchoolDialog" variant="link" class="text-black text-xs font-semibold mt-2 underline">Ajouter une école</Button>
                </div>

                <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div 
                        v-for="school in filteredSchools" 
                        :key="school.id"
                        @click="selectedSchool = school"
                        class="group bg-white border border-zinc-200 hover:border-black rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between"
                    >
                        <div>
                            <!-- School Info -->
                            <div class="flex justify-between items-start gap-4 mb-4">
                                <div class="w-10 h-10 bg-zinc-50 border border-zinc-100 rounded-lg flex items-center justify-center text-zinc-600 group-hover:bg-black group-hover:text-white transition-colors duration-300">
                                    <GraduationCap :size="20" />
                                </div>
                                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button @click.stop="openEditSchoolDialog(school)" variant="ghost" size="sm" class="h-8 w-8 p-0 hover:bg-zinc-100 rounded-sm">
                                        <Edit3 :size="14" class="text-zinc-600" />
                                    </Button>
                                    <Button @click.stop="deleteSchool(school)" variant="ghost" size="sm" class="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-sm">
                                        <Trash2 :size="14" />
                                    </Button>
                                </div>
                            </div>

                            <h3 class="font-bold text-lg text-zinc-900 tracking-tight leading-snug mb-1 group-hover:text-black">
                                {{ school.name }}
                            </h3>
                            
                            <p v-if="school.website" class="text-xs text-zinc-400 font-mono flex items-center gap-1 mb-4">
                                <ExternalLink :size="12" /> {{ school.website.replace(/^https?:\/\//, '') }}
                            </p>
                        </div>

                        <!-- Progress Section -->
                        <div class="mt-6 pt-4 border-t border-zinc-50 space-y-3">
                            <div class="flex justify-between items-center text-xs font-semibold text-zinc-500">
                                <span>Démarches administratives</span>
                                <span class="font-mono text-zinc-900 font-bold">
                                    {{ school.demarches.filter(d => d.status === 'Terminé').length }}/{{ school.demarches.length }}
                                </span>
                            </div>
                            
                            <!-- Progress Bar -->
                            <div class="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                                <div 
                                    class="h-full rounded-full transition-all duration-500" 
                                    :class="getProgressColor(getCompletionPercentage(school))"
                                    :style="{ width: `${getCompletionPercentage(school)}%` }"
                                ></div>
                            </div>

                            <div class="flex items-center justify-between pt-1">
                                <div class="flex gap-2">
                                    <Badge variant="outline" class="text-[9px] rounded-none px-1.5 py-0">
                                        {{ school.demarches.filter(d => d.status === 'À faire').length }} à faire
                                    </Badge>
                                    <Badge variant="outline" class="text-[9px] rounded-none px-1.5 py-0 border-amber-200 bg-amber-50/50 text-amber-700">
                                        {{ school.demarches.filter(d => d.status === 'En cours').length }} en cours
                                    </Badge>
                                </div>
                                <span class="text-xs text-zinc-400 flex items-center gap-1 group-hover:text-black font-semibold transition-colors">
                                    Détails <ChevronRight :size="14" />
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ================= DETAILED VIEW: SCHOOL DETAILS & STEPS ================= -->
        <div v-else class="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-300">
            <!-- Back & Header -->
            <div class="flex justify-between items-start mb-6">
                <button @click="selectedSchool = null" class="text-sm text-zinc-500 hover:text-black flex items-center gap-2 font-medium transition-colors">
                    <ArrowLeft :size="16" /> Retour à la liste
                </button>
                <div class="flex items-center gap-2">
                    <Button @click="openEditSchoolDialog(selectedSchool)" variant="outline" size="sm" class="rounded-none border-zinc-200 text-xs font-semibold uppercase tracking-wider">
                        <Edit3 :size="14" class="mr-2" /> Modifier École
                    </Button>
                </div>
            </div>

            <!-- School Info & Contact Header -->
            <div class="bg-zinc-50 border border-zinc-200 rounded-lg p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
                <div>
                    <h2 class="text-2xl font-bold text-zinc-900 tracking-tight flex items-center gap-3">
                        <GraduationCap class="text-zinc-600" />
                        {{ selectedSchool.name }}
                    </h2>
                    <div class="flex flex-wrap gap-4 mt-3 text-xs text-zinc-500">
                        <span v-if="selectedSchool.contactName" class="flex items-center gap-1.5 bg-white border border-zinc-200 px-2.5 py-1 rounded">
                            <Building2 :size="12" /> Contact: {{ selectedSchool.contactName }}
                        </span>
                        <a v-if="selectedSchool.contactEmail" :href="`mailto:${selectedSchool.contactEmail}`" class="flex items-center gap-1.5 bg-white border border-zinc-200 px-2.5 py-1 rounded hover:text-black transition-colors">
                            <Mail :size="12" /> {{ selectedSchool.contactEmail }}
                        </a>
                        <a v-if="selectedSchool.contactPhone" :href="`tel:${selectedSchool.contactPhone}`" class="flex items-center gap-1.5 bg-white border border-zinc-200 px-2.5 py-1 rounded hover:text-black transition-colors">
                            <Phone :size="12" /> {{ selectedSchool.contactPhone }}
                        </a>
                        <a v-if="selectedSchool.website" :href="selectedSchool.website" target="_blank" class="flex items-center gap-1.5 bg-white border border-zinc-200 px-2.5 py-1 rounded hover:text-black transition-colors font-mono text-[11px]">
                            <ExternalLink :size="12" /> {{ selectedSchool.website }}
                        </a>
                    </div>
                </div>
                <!-- Mini stats -->
                <div class="flex items-center gap-4 bg-white border border-zinc-200 p-4 rounded-lg self-stretch justify-center md:self-auto min-w-[200px]">
                    <div class="text-center flex-1 border-r border-zinc-100">
                        <span class="block text-2xl font-bold font-mono">{{ selectedSchool.demarches.length }}</span>
                        <span class="text-[10px] uppercase tracking-wide text-zinc-400 font-semibold">Total</span>
                    </div>
                    <div class="text-center flex-1">
                        <span class="block text-2xl font-bold font-mono text-emerald-600">
                            {{ selectedSchool.demarches.filter(d => d.status === 'Terminé').length }}
                        </span>
                        <span class="text-[10px] uppercase tracking-wide text-zinc-400 font-semibold">Réalisées</span>
                    </div>
                </div>
            </div>

            <!-- Steps Section Title & Add -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                <div class="flex items-center gap-4">
                    <h3 class="text-xl font-bold text-zinc-900 tracking-tight">Démarches Administratives</h3>
                    
                    <!-- Filters tabs -->
                    <div class="flex border border-zinc-200 bg-zinc-50 p-0.5 rounded text-xs">
                        <button 
                            @click="demarcheFilter = 'all'"
                            :class="`px-2.5 py-1 rounded-sm transition-colors ${demarcheFilter === 'all' ? 'bg-white text-black font-semibold shadow-sm' : 'text-zinc-500 hover:text-black'}`"
                        >Toutes</button>
                        <button 
                            @click="demarcheFilter = 'todo'"
                            :class="`px-2.5 py-1 rounded-sm transition-colors ${demarcheFilter === 'todo' ? 'bg-white text-black font-semibold shadow-sm' : 'text-zinc-500 hover:text-black'}`"
                        >À faire</button>
                        <button 
                            @click="demarcheFilter = 'inprogress'"
                            :class="`px-2.5 py-1 rounded-sm transition-colors ${demarcheFilter === 'inprogress' ? 'bg-white text-black font-semibold shadow-sm' : 'text-zinc-500 hover:text-black'}`"
                        >En cours</button>
                        <button 
                            @click="demarcheFilter = 'done'"
                            :class="`px-2.5 py-1 rounded-sm transition-colors ${demarcheFilter === 'done' ? 'bg-white text-black font-semibold shadow-sm' : 'text-zinc-500 hover:text-black'}`"
                        >Terminé</button>
                    </div>
                </div>
                <Button @click="openNewDemarcheDialog" class="bg-black hover:bg-zinc-800 text-white rounded-none px-4 h-9 text-xs uppercase font-bold tracking-wide">
                    <Plus :size="14" class="mr-1.5" /> Nouvelle Démarche
                </Button>
            </div>

            <!-- Demarches List -->
            <div class="flex-1 overflow-y-auto pb-8 space-y-4">
                <div v-if="filteredDemarches.length === 0" class="py-12 text-center text-zinc-400 border border-dashed border-zinc-200 rounded-lg bg-zinc-50/50">
                    <FileText class="text-zinc-300 mx-auto mb-3" :size="32" />
                    <p class="font-medium text-zinc-700 text-sm">Aucune démarche pour ce filtre</p>
                    <p class="text-xs mt-1">Créez une démarche en cliquant sur le bouton ci-dessus.</p>
                </div>

                <div 
                    v-else
                    v-for="demarche in filteredDemarches" 
                    :key="demarche.id"
                    class="group relative bg-white border border-zinc-200 hover:border-zinc-300 p-5 shadow-sm hover:shadow transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4"
                    :class="{
                        'border-l-zinc-300': demarche.status === 'À faire',
                        'border-l-amber-400': demarche.status === 'En cours',
                        'border-l-emerald-500': demarche.status === 'Terminé'
                    }"
                >
                    <div class="flex-1 space-y-1.5">
                        <div class="flex items-center flex-wrap gap-2.5">
                            <h4 class="font-bold text-base text-zinc-900 leading-snug">{{ demarche.title }}</h4>
                            
                            <!-- Overdue warning -->
                            <Badge v-if="isOverdue(demarche)" class="bg-rose-50 border-rose-200 text-rose-700 text-[10px] font-bold py-0.5 rounded px-2 flex items-center gap-1">
                                <AlertCircle :size="10" /> En retard
                            </Badge>
                            
                            <!-- Status clickable toggle badge -->
                            <Badge 
                                @click="toggleDemarcheStatus(demarche)"
                                variant="outline" 
                                class="text-[10px] font-semibold py-0.5 px-2 rounded cursor-pointer select-none transition-colors border shadow-sm flex items-center gap-1 hover:brightness-95"
                                :class="getStatusBadgeClass(demarche.status)"
                                title="Cliquez pour changer le statut"
                            >
                                <CheckCircle2 v-if="demarche.status === 'Terminé'" :size="10" />
                                <Clock v-else-if="demarche.status === 'En cours'" :size="10" />
                                <AlertCircle v-else :size="10" />
                                {{ demarche.status }}
                            </Badge>
                        </div>
                        
                        <p v-if="demarche.description" class="text-sm text-zinc-600 leading-relaxed max-w-3xl whitespace-pre-line">
                            {{ demarche.description }}
                        </p>
                        
                        <!-- Dates -->
                        <div class="flex items-center gap-3 text-xs text-zinc-400 pt-1 font-medium">
                            <div v-if="demarche.dueDate" class="flex items-center gap-1" :class="isOverdue(demarche) ? 'text-rose-600 font-semibold' : ''">
                                <Calendar :size="12" /> Échéance : {{ formatDate(demarche.dueDate) }}
                            </div>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="flex items-center gap-2 self-end sm:self-auto opacity-0 group-hover:opacity-100 transition-opacity bg-white pl-2">
                        <Button @click="openEditDemarcheDialog(demarche)" variant="ghost" size="sm" class="h-8 w-8 p-0 hover:bg-zinc-100 rounded">
                            <Edit3 :size="14" class="text-zinc-500" />
                        </Button>
                        <Button @click="deleteDemarche(demarche)" variant="ghost" size="sm" class="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 rounded">
                            <Trash2 :size="14" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>

        <!-- ================= MODAL: SCHOOL CREATION/EDITION ================= -->
        <Dialog v-model:open="showSchoolDialog">
            <DialogContent class="sm:max-w-md rounded-2xl border-zinc-200/60 p-0 overflow-hidden shadow-2xl bg-white/95 backdrop-blur-xl animate-in zoom-in-95 duration-200">
                <DialogHeader class="p-6 pb-2 bg-zinc-50 border-b border-zinc-100">
                    <DialogTitle class="text-xl font-bold tracking-tight text-zinc-900">
                        {{ editingSchool ? 'Modifier' : 'Nouvelle' }}
                        <span class="text-zinc-500 font-light">École Partenaire</span>
                    </DialogTitle>
                </DialogHeader>
                
                <form @submit.prevent="saveSchool" class="p-6 space-y-5">
                    <div class="space-y-1.5">
                        <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Nom de l'école *</label>
                        <Input v-model="schoolForm.name" required placeholder="Ex: Sorbonne Université" class="rounded-xl border-zinc-300 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 bg-white text-black font-medium" />
                    </div>

                    <div class="space-y-1.5">
                        <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Site Internet</label>
                        <Input v-model="schoolForm.website" placeholder="Ex: https://www.sorbonne.fr" class="rounded-xl border-zinc-300 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 bg-white text-black font-medium" />
                    </div>

                    <div class="border-t border-zinc-100 pt-4 mt-4">
                        <h4 class="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3">Contact de l'établissement</h4>
                        <div class="space-y-4">
                            <div class="space-y-1.5">
                                <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Nom du contact</label>
                                <Input v-model="schoolForm.contactName" placeholder="Nom Prénom du responsable" class="rounded-xl border-zinc-300 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 bg-white text-black font-medium" />
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div class="space-y-1.5">
                                    <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Adresse email</label>
                                    <Input v-model="schoolForm.contactEmail" type="email" placeholder="contact@ecole.fr" class="rounded-xl border-zinc-300 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 bg-white text-black font-medium" />
                                </div>
                                <div class="space-y-1.5">
                                    <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Téléphone</label>
                                    <Input v-model="schoolForm.contactPhone" placeholder="01 02 03 04 05" class="rounded-xl border-zinc-300 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 bg-white text-black font-medium" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="ghost" @click="showSchoolDialog = false" class="rounded-xl hover:bg-zinc-100 text-zinc-500">
                            Annuler
                        </Button>
                        <Button type="submit" class="bg-zinc-950 hover:bg-zinc-900 text-white rounded-xl min-w-[100px] shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]">
                            {{ editingSchool ? 'Enregistrer' : 'Créer' }}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>

        <!-- ================= MODAL: DEMARCHE CREATION/EDITION ================= -->
        <Dialog v-model:open="showDemarcheDialog">
            <DialogContent class="sm:max-w-md rounded-2xl border-zinc-200/60 p-0 overflow-hidden shadow-2xl bg-white/95 backdrop-blur-xl animate-in zoom-in-95 duration-200">
                <DialogHeader class="p-6 pb-2 bg-zinc-50 border-b border-zinc-100">
                    <DialogTitle class="text-xl font-bold tracking-tight text-zinc-900">
                        {{ editingDemarche ? 'Modifier' : 'Nouvelle' }}
                        <span class="text-zinc-500 font-light">Démarche administrative</span>
                    </DialogTitle>
                </DialogHeader>
                
                <form @submit.prevent="saveDemarche" class="p-6 space-y-5">
                    <div class="space-y-1.5">
                        <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Intitulé *</label>
                        <Input v-model="demarcheForm.title" required placeholder="Ex: Convention de stage signée" class="rounded-xl border-zinc-300 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 bg-white text-black font-medium" />
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-1.5">
                            <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Statut</label>
                            <select 
                                v-model="demarcheForm.status" 
                                class="w-full h-10 px-3 border border-zinc-300 rounded-xl shadow-sm focus:border-zinc-950 outline-none bg-white text-black font-medium text-sm"
                            >
                                <option value="À faire">À faire</option>
                                <option value="En cours">En cours</option>
                                <option value="Terminé">Terminé</option>
                            </select>
                        </div>
                        <div class="space-y-1.5">
                            <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Date d'échéance</label>
                            <Input v-model="demarcheForm.dueDate" type="date" class="rounded-xl border-zinc-300 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 bg-white text-black font-medium" />
                        </div>
                    </div>

                    <div class="space-y-1.5">
                        <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Description / Instructions</label>
                        <textarea 
                            v-model="demarcheForm.description"
                            placeholder="Détaillez les étapes à accomplir ou notes..." 
                            class="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:border-zinc-950 outline-none text-sm min-h-[100px] resize-none bg-white text-black font-medium"
                        ></textarea>
                    </div>

                    <div class="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="ghost" @click="showDemarcheDialog = false" class="rounded-xl hover:bg-zinc-100 text-zinc-500">
                            Annuler
                        </Button>
                        <Button type="submit" class="bg-zinc-950 hover:bg-zinc-900 text-white rounded-xl min-w-[100px] shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]">
                            {{ editingDemarche ? 'Mettre à jour' : 'Sauvegarder' }}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>

    </div>
</template>

<style scoped>
/* Custom Scrollbar for list */
::-webkit-scrollbar {
    width: 4px;
}
::-webkit-scrollbar-track {
    background: transparent;
}
::-webkit-scrollbar-thumb {
    background: #e4e4e7;
    border-radius: 2px;
}
::-webkit-scrollbar-thumb:hover {
    background: #d4d4d8;
}
</style>

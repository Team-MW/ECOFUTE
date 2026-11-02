<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { Plus, Trash2, Shield, Mail, Lock, Loader, Pencil } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import { showToast, showConfirm } from '@/lib/feedback'

interface TeamMember {
    id: string
    firstName: string
    lastName: string
    email: string
    role?: string
    color?: string
    createdAt: number
}

const members = ref<TeamMember[]>([])
const isLoading = ref(true)
const showInviteDialog = ref(false)
const showEditDialog = ref(false)
const isSubmitting = ref(false)
const isSavingEdit = ref(false)
const editForm = ref({
    id: '',
    firstName: '',
    lastName: '',
    email: ''
})

const form = ref({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    color: '#3b82f6',
    role: 'membre'
})

const isAdminEmail = (email?: string) =>
    email === 'ecomaxifute@gmail.com' || email === 'sofianelamine772@gmail.com'

const roleLabel = (member: TeamMember) => {
    if (isAdminEmail(member.email) || member.role === 'admin') return 'Admin EcoFuté'
    if (member.role === 'alternant') return 'Alternant'
    return 'Membre EcoFuté'
}

const onRoleChange = (member: TeamMember, event: Event) => {
    const role = (event.target as HTMLSelectElement).value
    updateMemberRole(member, role)
}

const updateMemberRole = async (member: TeamMember, role: string) => {
    try {
        const res = await axios.put(`/api/users/${member.id}`, { role, color: member.color })
        const index = members.value.findIndex(m => m.id === member.id)
        if (index !== -1) {
            members.value[index] = { ...members.value[index], ...res.data }
        }
        showToast(role === 'alternant' ? 'Profil Alternant : planning personnel uniquement' : 'Profil Membre : planning équipe visible', 'success')
    } catch (e: any) {
        showToast('Erreur: ' + (e.response?.data?.error || e.message), 'error')
    }
}

const fetchMembers = async () => {
    try {
        const res = await axios.get('/api/users')
        members.value = res.data
    } catch (e) {
        console.error("Failed to fetch team", e)
    } finally {
        isLoading.value = false
    }
}

const handleInvite = async () => {
    isSubmitting.value = true
    try {
        const res = await axios.post('/api/users', form.value)
        members.value.push(res.data)
        showInviteDialog.value = false
        form.value = { firstName: '', lastName: '', email: '', password: '', color: '#3b82f6', role: 'membre' }
        showToast("Utilisateur créé avec succès !", "success")
    } catch (e: any) {
        showToast("Erreur: " + (e.response?.data?.error || e.message), "error")
    } finally {
        isSubmitting.value = false
    }
}

// ... existing code ...

// In Template, modify member card:
// <div class="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center text-lg font-bold text-zinc-700" :style="{ backgroundColor: member.color ? member.color + '20' : '', color: member.color || 'inherit' }">

// Add color picker to form:
// <div class="space-y-2">
//    <label class="text-xs font-bold uppercase text-zinc-500">Couleur d'identification</label>
//    <div class="flex items-center gap-2">
//        <input type="color" v-model="form.color" class="h-9 w-16 p-0 border-0 rounded cursor-pointer" />
//        <span class="text-xs text-zinc-500">{{ form.color }}</span>
//    </div>
// </div>

const openEdit = (member: TeamMember) => {
    editForm.value = {
        id: member.id,
        firstName: member.firstName || '',
        lastName: member.lastName || '',
        email: member.email || ''
    }
    showEditDialog.value = true
}

const saveEdit = async () => {
    if (!editForm.value.email) {
        showToast('L’adresse email est requise', 'error')
        return
    }
    isSavingEdit.value = true
    try {
        const res = await axios.put(`/api/users/${editForm.value.id}`, {
            firstName: editForm.value.firstName,
            lastName: editForm.value.lastName,
            email: editForm.value.email
        })
        const index = members.value.findIndex(m => m.id === editForm.value.id)
        if (index !== -1) {
            members.value[index] = { ...members.value[index], ...res.data }
        }
        showEditDialog.value = false
        showToast('Coordonnées mises à jour', 'success')
    } catch (e: any) {
        showToast('Erreur: ' + (e.response?.data?.error || e.message), 'error')
    } finally {
        isSavingEdit.value = false
    }
}

const handleDelete = async (id: string) => {
    const isConfirmed = await showConfirm({
        title: 'Supprimer l\'accès',
        message: 'Voulez-vous vraiment supprimer cet accès ?',
        type: 'danger',
        confirmText: 'Supprimer',
        cancelText: 'Annuler'
    })
    if (!isConfirmed) return
    try {
        await axios.delete(`/api/users/${id}`)
        members.value = members.value.filter(m => m.id !== id)
        showToast("Accès supprimé avec succès !", "success")
    } catch (e) {
        showToast("Impossible de supprimer", "error")
    }
}

onMounted(fetchMembers)
</script>

<template>
    <div class="h-full flex flex-col bg-white animate-in fade-in duration-500">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-zinc-100 p-8 pb-6">
            <div>
                <h1 class="text-3xl font-bold text-black tracking-tight mb-2">Gestion des Accès</h1>
                <p class="text-sm text-zinc-500">Gérez les membres de l'équipe et leurs permissions.</p>
            </div>
            <Button @click="showInviteDialog = true" class="bg-black text-white hover:bg-zinc-800 rounded-sm">
                <Plus :size="16" class="mr-2" /> Nouvel Accès
            </Button>
        </div>

        <!-- Content -->
        <div class="p-8">
            <div v-if="isLoading" class="p-8">
                <SkeletonLoader type="cards" :rows="3" />
            </div>

            <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div v-for="member in members" :key="member.id" class="border border-zinc-200 p-6 rounded-sm hover:border-black transition-colors group relative bg-white shadow-sm">
                    <div class="absolute top-4 right-4 flex items-center gap-2">
                        <button @click="openEdit(member)" class="text-zinc-300 hover:text-black transition-colors opacity-0 group-hover:opacity-100">
                            <Pencil :size="16" />
                        </button>
                        <button @click="handleDelete(member.id)" class="text-zinc-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 :size="16" />
                        </button>
                    </div>
                    
                    <div class="flex items-center gap-4 mb-4">
                        <div 
                            class="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold transition-all"
                            :style="{ 
                                backgroundColor: member.color ? member.color + '20' : '#f4f4f5', 
                                color: member.color || '#3f3f46',
                                border: `1px solid ${member.color ? member.color + '40' : 'transparent'}`
                            }"
                        >
                            {{ member.firstName?.[0] || 'U' }}{{ member.lastName?.[0] || '' }}
                        </div>
                        <div>
                            <h3 class="font-bold text-black">{{ member.firstName }} {{ member.lastName }}</h3>
                            <Badge 
                                variant="secondary" 
                                :class="roleLabel(member).startsWith('Admin')
                                    ? 'mt-1 text-[10px] bg-zinc-950 text-white font-normal'
                                    : member.role === 'alternant'
                                        ? 'mt-1 text-[10px] bg-amber-100 text-amber-800 font-normal'
                                        : 'mt-1 text-[10px] bg-zinc-100 text-zinc-600 font-normal'"
                            >
                                {{ roleLabel(member) }}
                            </Badge>
                        </div>
                    </div>
                    
                    <div class="space-y-2">
                        <div class="flex items-center gap-2 text-sm text-zinc-500">
                            <Mail :size="14" />
                            <span class="truncate">{{ member.email }}</span>
                        </div>
                         <div class="flex items-center gap-2 text-sm text-zinc-500">
                            <Shield :size="14" />
                            <span>{{ member.role === 'alternant' ? 'Planning personnel uniquement' : 'Accès complet' }}</span>
                        </div>
                        <div v-if="!isAdminEmail(member.email)" class="pt-2">
                            <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block mb-1">Profil</label>
                            <select
                                :value="member.role === 'alternant' ? 'alternant' : 'membre'"
                                class="w-full px-2 py-1.5 text-xs border border-zinc-200 rounded-sm bg-white text-zinc-700"
                                @change="onRoleChange(member, $event)"
                            >
                                <option value="membre">Membre — voit tout le planning</option>
                                <option value="alternant">Alternant — voit uniquement le sien</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <Dialog v-model:open="showInviteDialog">
            <DialogContent class="sm:max-w-md rounded-2xl border-zinc-200/60 p-6 shadow-2xl bg-white/95 backdrop-blur-xl animate-in zoom-in-95 duration-200">
                <DialogHeader>
                    <DialogTitle class="text-xl font-bold tracking-tight text-zinc-900">Créer un accès utilisateur</DialogTitle>
                    <DialogDescription class="text-xs text-zinc-500 mt-1">
                        Ajoutez un nouveau membre à l'équipe. Il pourra se connecter avec ces identifiants.
                    </DialogDescription>
                </DialogHeader>

                <form @submit.prevent="handleInvite" class="space-y-4 py-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-2">
                            <label class="text-xs font-bold uppercase text-zinc-500">Prénom</label>
                            <Input v-model="form.firstName" required placeholder="Jean" class="rounded-xl border-zinc-300 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 bg-white text-black font-medium" />
                        </div>
                        <div class="space-y-2">
                            <label class="text-xs font-bold uppercase text-zinc-500">Nom</label>
                            <Input v-model="form.lastName" required placeholder="Dupont" class="rounded-xl border-zinc-300 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 bg-white text-black font-medium" />
                        </div>
                    </div>
                    
                    <div class="space-y-2">
                        <label class="text-xs font-bold uppercase text-zinc-500">Email professionnel</label>
                        <Input v-model="form.email" type="email" required placeholder="jean.dupont@ecofute.com" class="rounded-xl border-zinc-300 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 bg-white text-black font-medium" />
                    </div>

                    <div class="space-y-2">
                        <label class="text-xs font-bold uppercase text-zinc-500">Mot de passe temporaire</label>
                        <div class="relative">
                            <Input v-model="form.password" type="text" required placeholder="Mot de passe fort" class="pl-9 rounded-xl border-zinc-300 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 bg-white text-black font-medium" />
                            <Lock :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                        </div>
                        <p class="text-[10px] text-zinc-400">Le mot de passe doit contenir au moins 8 caractères.</p>
                    </div>

                    <div class="space-y-2">
                        <label class="text-xs font-bold uppercase text-zinc-500">Profil</label>
                        <select
                            v-model="form.role"
                            class="w-full px-3 py-2 text-sm border border-zinc-300 rounded-xl bg-white text-black font-medium"
                        >
                            <option value="membre">Membre — voit le planning de toute l'équipe</option>
                            <option value="alternant">Alternant — voit uniquement son planning</option>
                        </select>
                    </div>

                    <div class="space-y-2">
                        <label class="text-xs font-bold uppercase text-zinc-500">Couleur d'identification</label>
                        <div class="flex items-center gap-3 p-2 border border-zinc-200 rounded-xl bg-white">
                            <input 
                                type="color" 
                                v-model="form.color" 
                                class="h-8 w-12 p-0 border-0 rounded-lg cursor-pointer bg-transparent" 
                            />
                            <span class="text-xs font-mono text-zinc-500">{{ form.color }}</span>
                        </div>
                        <p class="text-[10px] text-zinc-400">Cette couleur sera utilisée pour ses événements dans le calendrier.</p>
                    </div>

                    <div class="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="ghost" @click="showInviteDialog = false" class="rounded-xl hover:bg-zinc-100 text-zinc-500">
                            Annuler
                        </Button>
                        <Button type="submit" :disabled="isSubmitting" class="bg-zinc-950 text-white hover:bg-zinc-900 rounded-xl shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]">
                            <Loader v-if="isSubmitting" class="animate-spin mr-2" :size="14" />
                            {{ isSubmitting ? 'Création...' : 'Créer l\'accès' }}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>

        <Dialog v-model:open="showEditDialog">
            <DialogContent class="sm:max-w-md rounded-2xl border-zinc-200/60 p-6 shadow-2xl bg-white">
                <DialogHeader>
                    <DialogTitle class="text-xl font-bold tracking-tight">Modifier l’accès</DialogTitle>
                    <DialogDescription>Mets à jour le nom ou l’adresse email du membre.</DialogDescription>
                </DialogHeader>
                <form @submit.prevent="saveEdit" class="space-y-4 pt-2">
                    <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-1">
                            <label class="text-xs font-bold uppercase text-zinc-500">Prénom</label>
                            <Input v-model="editForm.firstName" required />
                        </div>
                        <div class="space-y-1">
                            <label class="text-xs font-bold uppercase text-zinc-500">Nom</label>
                            <Input v-model="editForm.lastName" required />
                        </div>
                    </div>
                    <div class="space-y-1">
                        <label class="text-xs font-bold uppercase text-zinc-500">Adresse email</label>
                        <Input v-model="editForm.email" type="email" required placeholder="email@exemple.com" />
                    </div>
                    <div class="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="ghost" @click="showEditDialog = false">Annuler</Button>
                        <Button type="submit" :disabled="isSavingEdit" class="bg-zinc-950 text-white">
                            <Loader v-if="isSavingEdit" class="animate-spin mr-2" :size="14" />
                            Enregistrer
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    </div>
</template>

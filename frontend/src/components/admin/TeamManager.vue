<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { Plus, Trash2, Shield, Mail, Lock, Loader } from 'lucide-vue-next'
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

interface TeamMember {
    id: string
    firstName: string
    lastName: string
    email: string
    role?: string
    createdAt: number
}

const members = ref<TeamMember[]>([])
const isLoading = ref(true)
const showInviteDialog = ref(false)
const isSubmitting = ref(false)

const form = ref({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
})

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
        form.value = { firstName: '', lastName: '', email: '', password: '' }
        alert("Utilisateur créé avec succès !")
    } catch (e: any) {
        alert("Erreur: " + (e.response?.data?.error || e.message))
    } finally {
        isSubmitting.value = false
    }
}

const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cet accès ?")) return
    try {
        await axios.delete(`/api/users/${id}`)
        members.value = members.value.filter(m => m.id !== id)
    } catch (e) {
        alert("Impossible de supprimer")
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
            <div v-if="isLoading" class="flex justify-center p-12">
                <Loader class="animate-spin text-zinc-400" />
            </div>

            <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div v-for="member in members" :key="member.id" class="border border-zinc-200 p-6 rounded-sm hover:border-black transition-colors group relative bg-white shadow-sm">
                    <button @click="handleDelete(member.id)" class="absolute top-4 right-4 text-zinc-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 :size="16" />
                    </button>
                    
                    <div class="flex items-center gap-4 mb-4">
                        <div class="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center text-lg font-bold text-zinc-700">
                            {{ member.firstName?.[0] || 'U' }}{{ member.lastName?.[0] || '' }}
                        </div>
                        <div>
                            <h3 class="font-bold text-black">{{ member.firstName }} {{ member.lastName }}</h3>
                            <Badge variant="secondary" class="mt-1 text-[10px] bg-zinc-100 text-zinc-600 font-normal">Membre EcoFuté</Badge>
                        </div>
                    </div>
                    
                    <div class="space-y-2">
                        <div class="flex items-center gap-2 text-sm text-zinc-500">
                            <Mail :size="14" />
                            <span class="truncate">{{ member.email }}</span>
                        </div>
                         <div class="flex items-center gap-2 text-sm text-zinc-500">
                            <Shield :size="14" />
                            <span>Accès complet</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal -->
        <Dialog v-model:open="showInviteDialog">
            <DialogContent class="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Créer un accès utilisateur</DialogTitle>
                    <DialogDescription>
                        Ajoutez un nouveau membre à l'équipe. Il pourra se connecter avec ces identifiants.
                    </DialogDescription>
                </DialogHeader>

                <form @submit.prevent="handleInvite" class="space-y-4 py-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-2">
                            <label class="text-xs font-bold uppercase text-zinc-500">Prénom</label>
                            <Input v-model="form.firstName" required placeholder="Jean" />
                        </div>
                        <div class="space-y-2">
                            <label class="text-xs font-bold uppercase text-zinc-500">Nom</label>
                            <Input v-model="form.lastName" required placeholder="Dupont" />
                        </div>
                    </div>
                    
                    <div class="space-y-2">
                        <label class="text-xs font-bold uppercase text-zinc-500">Email professionnel</label>
                        <Input v-model="form.email" type="email" required placeholder="jean.dupont@ecofute.com" />
                    </div>

                    <div class="space-y-2">
                        <label class="text-xs font-bold uppercase text-zinc-500">Mot de passe temporaire</label>
                        <div class="relative">
                            <Input v-model="form.password" type="text" required placeholder="Mot de passe fort" class="pl-9" />
                            <Lock :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                        </div>
                        <p class="text-[10px] text-zinc-400">Le mot de passe doit contenir au moins 8 caractères.</p>
                    </div>

                    <div class="flex justify-end pt-4">
                        <Button type="submit" :disabled="isSubmitting" class="bg-black text-white hover:bg-zinc-800">
                            <Loader v-if="isSubmitting" class="animate-spin mr-2" :size="14" />
                            {{ isSubmitting ? 'Création...' : 'Créer l\'accès' }}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    </div>
</template>

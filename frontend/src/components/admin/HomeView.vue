<script setup lang="ts">
import { computed } from 'vue'
import {
    Users, Calendar, Clock, GraduationCap, TrendingUp, BarChart3,
    FilePlus, Package, Shirt, KeyRound, Wallet, ShieldCheck, ArrowRight
} from 'lucide-vue-next'

const props = defineProps<{
    isAdmin: boolean
    firstName?: string | null
}>()

const emit = defineEmits<{ (e: 'navigate', view: string): void }>()

const shortcuts = computed(() => [
    { view: 'clients', label: 'Gestion Clients', desc: 'Fiches et dossiers clients', icon: Users },
    { view: 'caisse', label: 'Caisse', desc: 'Enregistrer un encaissement', icon: Wallet },
    { view: 'invoice', label: 'Création Facture', desc: 'Éditer et envoyer une facture', icon: FilePlus },
    { view: 'calendar', label: 'Calendrier', desc: 'Rendez-vous et événements', icon: Calendar },
    { view: 'planning', label: 'Planning Équipe', desc: 'Horaires de l\'équipe', icon: Clock },
    { view: 'schools', label: 'Écoles & Démarches', desc: 'Suivi des écoles', icon: GraduationCap },
    { view: 'products', label: 'Produits / Services', desc: 'Catalogue et tarifs', icon: Package },
    { view: 'textile', label: 'Textile', desc: 'Stock textile', icon: Shirt },
    { view: 'serrurerie', label: 'Serrurerie', desc: 'Stock serrurerie', icon: KeyRound },
    ...(props.isAdmin ? [
        { view: 'sales', label: 'Suivi de Vente', desc: 'Ventes et dépenses', icon: TrendingUp },
        { view: 'stats', label: 'Statistiques', desc: 'Vue d\'ensemble de l\'activité', icon: BarChart3 },
        { view: 'team', label: 'Gestion Équipe', desc: 'Membres et accès', icon: ShieldCheck },
    ] : []),
])

const greeting = computed(() => {
    const h = new Date().getHours()
    return h >= 18 || h < 5 ? 'Bonsoir' : 'Bonjour'
})

const today = computed(() => {
    const s = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    return s.charAt(0).toUpperCase() + s.slice(1)
})
</script>

<template>
    <div class="max-w-6xl mx-auto">
        <div class="mb-10 border-b border-zinc-100 pb-8">
            <p class="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3">{{ today }}</p>
            <h1 class="text-3xl md:text-4xl font-bold text-black tracking-tight">
                {{ greeting }}{{ firstName ? ` ${firstName}` : '' }} 👋
            </h1>
            <p class="text-sm text-zinc-500 mt-2">Bienvenue sur l'espace EcoFuté. Choisissez un espace pour commencer.</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
                v-for="s in shortcuts"
                :key="s.view"
                type="button"
                @click="emit('navigate', s.view)"
                class="group text-left bg-white border border-zinc-200 p-5 flex items-center gap-4 hover:border-black hover:shadow-sm transition-all"
            >
                <div class="w-11 h-11 shrink-0 flex items-center justify-center bg-zinc-50 border border-zinc-200 group-hover:bg-black group-hover:text-white group-hover:border-black transition-colors">
                    <component :is="s.icon" :size="20" />
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-bold text-black">{{ s.label }}</p>
                    <p class="text-xs text-zinc-500 mt-0.5 truncate">{{ s.desc }}</p>
                </div>
                <ArrowRight :size="16" class="text-zinc-300 group-hover:text-black group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
        </div>
    </div>
</template>

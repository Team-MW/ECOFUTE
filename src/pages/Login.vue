<script setup lang="ts">
import { SignIn } from '@clerk/vue'
import { CheckCircle2 } from 'lucide-vue-next'
</script>

<template>
<div class="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2">
    <!-- Left Side: Branding -->
    <div class="hidden lg:flex flex-col justify-between bg-zinc-900 p-12 relative overflow-hidden text-white">
        <!-- Abstract Background -->
        <div class="absolute inset-0 z-0">
             <div class="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-500 rounded-full filter blur-[120px] opacity-20"></div>
             <div class="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-500 rounded-full filter blur-[120px] opacity-20"></div>
        </div>

        <!-- Content -->
        <div class="relative z-10">
            <div class="flex items-center gap-3 mb-2">
                <div class="w-10 h-10 bg-white text-zinc-900 flex items-center justify-center font-bold text-xl rounded-sm">E</div>
                <span class="text-2xl font-bold tracking-tighter">EcoFuté.</span>
            </div>
            <p class="text-zinc-400 text-sm max-w-sm">Solution de gestion complète pour votre entreprise.</p>
        </div>

        <div class="relative z-10 space-y-6">
            <blockquote class="text-2xl font-medium tracking-tight leading-snug">
                "La simplicité est la sophistication suprême."
            </blockquote>
            <div class="space-y-3">
                <div class="flex items-center gap-3 text-zinc-300 text-sm">
                    <CheckCircle2 :size="18" class="text-green-400" />
                    <span>Tableau de bord complet</span>
                </div>
                 <div class="flex items-center gap-3 text-zinc-300 text-sm">
                    <CheckCircle2 :size="18" class="text-green-400" />
                    <span>Gestion des clients simplifiée</span>
                </div>
                 <div class="flex items-center gap-3 text-zinc-300 text-sm">
                    <CheckCircle2 :size="18" class="text-green-400" />
                    <span>Suivi de facturation en temps réel</span>
                </div>
            </div>
             <p class="text-xs text-zinc-500 pt-8 mt-8 border-t border-zinc-800">© 2024 EcoFuté Inc. Tous droits réservés.</p>
        </div>
    </div>

    <!-- Right Side: Login Form -->
    <div class="flex flex-col items-center justify-center p-8 bg-zinc-50 relative">
        <SignIn after-sign-in-url="/admin" sign-up-url="/sign-up" />
        
        <div class="mt-8 text-center lg:hidden">
             <div class="flex items-center justify-center gap-2 mb-2">
                <div class="w-6 h-6 bg-black text-white flex items-center justify-center font-bold text-xs rounded-sm">E</div>
                <span class="font-bold tracking-tighter">EcoFuté.</span>
            </div>
            <p class="text-xs text-zinc-500">Gérez votre activité en toute sérénité.</p>
        </div>
    </div>
</div>
</template>

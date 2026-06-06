<script setup lang="ts">
import { SignIn } from '@clerk/vue'
</script>

<template>
<div class="min-h-screen w-full flex flex-col items-center justify-center bg-zinc-950 relative overflow-hidden font-sans select-none">
    <!-- Rich Technical Background Grid -->
    <div class="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35 z-0"></div>

    <!-- Soft glowing aesthetic blurs -->
    <div class="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-500 rounded-full filter blur-[120px] opacity-15 animate-pulse z-0" style="animation-duration: 8s;"></div>
    <div class="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-500 rounded-full filter blur-[120px] opacity-15 animate-pulse z-0" style="animation-duration: 10s;"></div>

    <div class="relative z-10 w-full max-w-md px-6 flex flex-col items-center">
        <!-- Logo Header -->
        <div class="mb-8 flex flex-col items-center text-center">
            <div class="flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl mb-4 hover:scale-105 transition-transform duration-300">
                <img src="/logo-ecofute.svg" alt="EcoFuté Logo" class="h-10 w-10 invert" />
            </div>
            <h1 class="text-2xl font-bold tracking-tight text-white">Espace Connexion</h1>
            <p class="text-xs text-zinc-400 mt-1.5 max-w-[280px]">Connectez-vous pour accéder à votre tableau de bord EcoFuté.</p>
        </div>

        <!-- Clerk SignIn Card wrapper -->
        <div class="w-full bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-1 shadow-2xl flex justify-center">
            <SignIn after-sign-in-url="/admin" sign-up-url="/sign-up" />
        </div>

        <!-- Footer -->
        <p class="text-[10px] text-zinc-600 mt-8 tracking-wider uppercase font-semibold">© 2026 EcoFuté. Tous droits réservés.</p>
    </div>
</div>
</template>


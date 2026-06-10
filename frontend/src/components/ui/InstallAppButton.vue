<script setup lang="ts">
import { ref } from 'vue'
import { usePWAInstall } from '@/lib/usePWAInstall'
import { Download, Share, X, CheckCircle2, Smartphone } from 'lucide-vue-next'

const { isInstallable, isInstalled, isIOS, isSafari, install } = usePWAInstall()

const showSafariGuide = ref(false)
const installSuccess = ref(false)

const handleInstall = async () => {
    // Chrome / Edge → install directe en 1 clic
    if (isInstallable.value) {
        const accepted = await install()
        if (accepted) {
            installSuccess.value = true
            setTimeout(() => (installSuccess.value = false), 3000)
        }
        return
    }

    // Safari / iOS → afficher le guide
    if (isIOS.value || isSafari.value) {
        showSafariGuide.value = true
        return
    }
}

// Afficher si : pas encore installée ET (installable via Chrome OU sur Safari/iOS)
const shouldShow = () => {
    if (isInstalled.value) return false
    return isInstallable.value || isIOS.value || isSafari.value
}
</script>

<template>
    <!-- Bouton Installer -->
    <button
        v-if="shouldShow() && !installSuccess"
        @click="handleInstall"
        class="install-btn flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-200 hover:scale-105 active:scale-95"
        :class="isInstallable ? 'bg-[#1a2e4a] text-white border-[#1a2e4a] hover:bg-[#0f1f33] shadow-md' : 'bg-white text-[#1a2e4a] border-[#1a2e4a]/30 hover:border-[#1a2e4a]'"
        title="Installer l'application"
    >
        <Download :size="14" class="shrink-0" />
        <span class="hidden sm:inline">Installer l'app</span>
    </button>

    <!-- Succès -->
    <div
        v-if="installSuccess"
        class="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg"
    >
        <CheckCircle2 :size="14" />
        <span class="hidden sm:inline">Installée !</span>
    </div>

    <!-- Déjà installée -->
    <div
        v-if="isInstalled"
        class="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-zinc-400 bg-zinc-50 border border-zinc-200 rounded-lg"
        title="Application déjà installée"
    >
        <CheckCircle2 :size="14" />
        <span class="hidden sm:inline">App installée</span>
    </div>

    <!-- Modal Guide Safari / iOS -->
    <Teleport to="body">
        <div
            v-if="showSafariGuide"
            class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-end sm:items-center justify-center p-4"
            @click.self="showSafariGuide = false"
        >
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                <!-- Header -->
                <div class="bg-[#0f1724] p-5 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <img src="/icon-app.png" alt="EcoFuté" class="w-10 h-10 rounded-xl shadow-md" />
                        <div>
                            <p class="text-white font-bold text-sm">EcoFuté</p>
                            <p class="text-zinc-400 text-xs">Installer sur cet appareil</p>
                        </div>
                    </div>
                    <button @click="showSafariGuide = false" class="text-zinc-400 hover:text-white transition-colors">
                        <X :size="20" />
                    </button>
                </div>

                <!-- Steps -->
                <div class="p-5 space-y-4">
                    <p class="text-sm text-zinc-600 font-medium">
                        Suivez ces <strong class="text-zinc-900">3 étapes rapides</strong> pour ajouter EcoFuté à votre écran d'accueil :
                    </p>

                    <!-- Étape 1 -->
                    <div class="flex items-start gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                        <div class="w-7 h-7 bg-[#1a2e4a] text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</div>
                        <div>
                            <p class="text-sm font-semibold text-zinc-900">Appuyez sur Partager</p>
                            <p class="text-xs text-zinc-500 mt-0.5">Icône <Share :size="12" class="inline" /> en bas de Safari</p>
                        </div>
                    </div>

                    <!-- Étape 2 -->
                    <div class="flex items-start gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                        <div class="w-7 h-7 bg-[#1a2e4a] text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</div>
                        <div>
                            <p class="text-sm font-semibold text-zinc-900">
                                {{ isIOS ? '"Sur l\'écran d\'accueil"' : '"Ajouter au Dock"' }}
                            </p>
                            <p class="text-xs text-zinc-500 mt-0.5">Faites défiler la liste vers le bas</p>
                        </div>
                    </div>

                    <!-- Étape 3 -->
                    <div class="flex items-start gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                        <div class="w-7 h-7 bg-[#1a2e4a] text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</div>
                        <div>
                            <p class="text-sm font-semibold text-zinc-900">Appuyez sur "Ajouter"</p>
                            <p class="text-xs text-zinc-500 mt-0.5">L'icône EcoFuté apparaît immédiatement</p>
                        </div>
                    </div>

                    <!-- Conseil -->
                    <div class="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                        <Smartphone :size="16" class="text-blue-600 shrink-0" />
                        <p class="text-xs text-blue-700">
                            <strong>Astuce :</strong> Sur Chrome ou Edge, l'installation se fait en 1 seul clic !
                        </p>
                    </div>
                </div>

                <div class="px-5 pb-5">
                    <button
                        @click="showSafariGuide = false"
                        class="w-full bg-[#0f1724] text-white font-semibold text-sm py-3 rounded-xl hover:bg-[#1a2e4a] transition-colors"
                    >
                        Compris !
                    </button>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<style scoped>
.install-btn {
    animation: pulse-soft 3s ease-in-out infinite;
}

@keyframes pulse-soft {
    0%, 100% { box-shadow: 0 0 0 0 rgba(26, 46, 74, 0); }
    50% { box-shadow: 0 0 0 4px rgba(26, 46, 74, 0.15); }
}
</style>

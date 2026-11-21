<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { RotateCw } from 'lucide-vue-next'

// The built entry script is hashed (/assets/index-XXXX.js); a new deploy changes the hash.
const ENTRY_RE = /\/assets\/index-[\w-]+\.js/

const currentEntry = (() => {
    const s = Array.from(document.querySelectorAll<HTMLScriptElement>('script[src]'))
        .map(el => el.getAttribute('src') || '')
        .find(src => ENTRY_RE.test(src))
    return s?.match(ENTRY_RE)?.[0] ?? null
})()

const updateAvailable = ref(false)
const isRefreshing = ref(false)
let interval: ReturnType<typeof setInterval> | null = null

const checkForUpdate = async () => {
    if (!currentEntry || updateAvailable.value) return // dev mode or already flagged
    try {
        const res = await fetch(`/?_=${Date.now()}`, { cache: 'no-store' })
        const html = await res.text()
        const latest = html.match(ENTRY_RE)?.[0]
        if (latest && latest !== currentEntry) updateAvailable.value = true
    } catch {
        // offline: ignore
    }
}

const onVisible = () => { if (document.visibilityState === 'visible') checkForUpdate() }

const refresh = async () => {
    if (isRefreshing.value) return
    isRefreshing.value = true
    try {
        // Refresh the HTTP cache for the page so the reload gets the latest version
        await fetch('/', { cache: 'reload' })
        if ('caches' in window) {
            const keys = await caches.keys()
            await Promise.all(keys.map(k => caches.delete(k)))
        }
    } catch {
        // ignore, reload anyway
    }
    window.location.reload()
}

onMounted(() => {
    checkForUpdate()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', checkForUpdate)
    interval = setInterval(checkForUpdate, 5 * 60 * 1000)
})

onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', onVisible)
    window.removeEventListener('focus', checkForUpdate)
    if (interval) clearInterval(interval)
})
</script>

<template>
    <button
        type="button"
        @click="refresh"
        :disabled="isRefreshing"
        :title="updateAvailable ? 'Nouvelle version disponible – cliquez pour mettre à jour' : 'Actualiser l\'application'"
        class="relative flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-200 active:scale-95 disabled:opacity-60"
        :class="updateAvailable
            ? 'bg-black text-white border-black hover:bg-zinc-800 shadow-md'
            : 'bg-white text-zinc-700 border-zinc-200 hover:border-black hover:text-black'"
    >
        <RotateCw :size="14" class="shrink-0" :class="isRefreshing ? 'animate-spin' : ''" />
        <span class="hidden sm:inline">{{ updateAvailable ? 'Mise à jour dispo' : 'Actualiser' }}</span>
        <span
            v-if="updateAvailable"
            class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white"
        ></span>
    </button>
</template>

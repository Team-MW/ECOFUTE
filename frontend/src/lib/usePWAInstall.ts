import { ref, onMounted, onUnmounted } from 'vue'

// Typage de l'événement beforeinstallprompt
interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePWAInstall() {
    const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
    const isInstallable = ref(false)
    const isInstalled = ref(false)
    const isIOS = ref(false)
    const isSafari = ref(false)

    const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault()
        deferredPrompt.value = e as BeforeInstallPromptEvent
        isInstallable.value = true
    }

    const handleAppInstalled = () => {
        isInstalled.value = true
        isInstallable.value = false
        deferredPrompt.value = null
    }

    onMounted(() => {
        // Détection iOS
        const ua = navigator.userAgent
        isIOS.value = /iPad|iPhone|iPod/.test(ua)
        isSafari.value = /^((?!chrome|android).)*safari/i.test(ua)

        // Détection si déjà installée (mode standalone)
        const isStandalone =
            window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true

        if (isStandalone) {
            isInstalled.value = true
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        window.addEventListener('appinstalled', handleAppInstalled)
    })

    onUnmounted(() => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        window.removeEventListener('appinstalled', handleAppInstalled)
    })

    const install = async () => {
        if (!deferredPrompt.value) return false
        await deferredPrompt.value.prompt()
        const { outcome } = await deferredPrompt.value.userChoice
        if (outcome === 'accepted') {
            isInstalled.value = true
            isInstallable.value = false
        }
        deferredPrompt.value = null
        return outcome === 'accepted'
    }

    return {
        isInstallable,
        isInstalled,
        isIOS,
        isSafari,
        install,
    }
}

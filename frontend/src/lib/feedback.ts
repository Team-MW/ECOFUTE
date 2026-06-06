import { ref } from 'vue'

export interface ToastMessage {
    id: number
    type: 'success' | 'error' | 'info' | 'warning'
    title?: string
    message: string
    duration?: number
}

export interface ConfirmOptions {
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    type?: 'default' | 'danger'
}

const toasts = ref<ToastMessage[]>([])
const confirmState = ref<{
    open: boolean
    title: string
    message: string
    confirmText: string
    cancelText: string
    type: 'default' | 'danger'
    resolve: ((value: boolean) => void) | null
}>({
    open: false,
    title: '',
    message: '',
    confirmText: 'Confirmer',
    cancelText: 'Annuler',
    type: 'default',
    resolve: null
})

let toastId = 0

export function showToast(message: string, type: ToastMessage['type'] = 'success', duration = 4000) {
    const id = ++toastId
    const toast: ToastMessage = { id, type, message, duration }
    toasts.value.push(toast)
    
    if (duration > 0) {
        setTimeout(() => {
            toasts.value = toasts.value.filter(t => t.id !== id)
        }, duration)
    }
}

export function removeToast(id: number) {
    toasts.value = toasts.value.filter(t => t.id !== id)
}

export function showConfirm(options: ConfirmOptions | string): Promise<boolean> {
    return new Promise((resolve) => {
        const opts = typeof options === 'string' 
            ? { title: 'Confirmation', message: options } 
            : options

        confirmState.value = {
            open: true,
            title: opts.title || 'Confirmation',
            message: opts.message,
            confirmText: opts.confirmText || 'Confirmer',
            cancelText: opts.cancelText || 'Annuler',
            type: opts.type || 'default',
            resolve
        }
    })
}

export function handleConfirmResponse(response: boolean) {
    if (confirmState.value.resolve) {
        confirmState.value.resolve(response)
    }
    confirmState.value.open = false
    confirmState.value.resolve = null
}

export function useFeedback() {
    return {
        toasts,
        confirmState,
        showToast,
        removeToast,
        showConfirm,
        handleConfirmResponse
    }
}

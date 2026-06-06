<script setup lang="ts">
import { useFeedback } from '@/lib/feedback'
import { CheckCircle2, AlertTriangle, Info, X, AlertCircle } from 'lucide-vue-next'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const { toasts, confirmState, removeToast, handleConfirmResponse } = useFeedback()
</script>

<template>
    <!-- Toasts Container -->
    <div class="fixed top-6 right-6 z-[9999] space-y-3 pointer-events-none max-w-sm w-full">
        <TransitionGroup 
            enter-active-class="transform ease-out duration-300 transition"
            enter-from-class="translate-y-4 opacity-0 scale-95"
            enter-to-class="translate-y-0 opacity-100 scale-100"
            leave-active-class="transition ease-in duration-200"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
        >
            <div 
                v-for="toast in toasts" 
                :key="toast.id" 
                class="pointer-events-auto flex w-full rounded-xl bg-white/95 backdrop-blur-xl border border-zinc-200/50 shadow-2xl p-4 relative overflow-hidden"
            >
                <!-- Indicator strip on the left -->
                <div 
                    class="absolute left-0 top-0 bottom-0 w-1.5"
                    :class="{
                        'bg-emerald-500': toast.type === 'success',
                        'bg-rose-500': toast.type === 'error',
                        'bg-amber-500': toast.type === 'warning',
                        'bg-zinc-800': toast.type === 'info'
                    }"
                ></div>

                <div class="flex items-start w-full gap-3 pl-1.5">
                    <div class="shrink-0 mt-0.5">
                        <CheckCircle2 v-if="toast.type === 'success'" class="h-5 w-5 text-emerald-500" />
                        <AlertCircle v-else-if="toast.type === 'error'" class="h-5 w-5 text-rose-500" />
                        <AlertTriangle v-else-if="toast.type === 'warning'" class="h-5 w-5 text-amber-500" />
                        <Info v-else class="h-5 w-5 text-zinc-800" />
                    </div>
                    <div class="flex-1">
                        <p class="text-sm font-bold text-zinc-900">
                            {{ toast.type === 'success' ? 'Succès' : toast.type === 'error' ? 'Erreur' : toast.type === 'warning' ? 'Attention' : 'Information' }}
                        </p>
                        <p class="text-xs text-zinc-500 mt-1 leading-relaxed">{{ toast.message }}</p>
                    </div>
                    <button 
                        @click="removeToast(toast.id)"
                        class="shrink-0 text-zinc-400 hover:text-black transition-colors rounded-full p-1 hover:bg-zinc-100"
                    >
                        <X :size="12" />
                    </button>
                </div>
            </div>
        </TransitionGroup>
    </div>

    <!-- Confirm Dialog -->
    <Dialog :open="confirmState.open" @update:open="(val) => !val && handleConfirmResponse(false)">
        <DialogContent class="sm:max-w-md rounded-2xl border-zinc-200/60 p-0 overflow-hidden shadow-2xl bg-white/95 backdrop-blur-xl animate-in zoom-in-95 duration-200">
            <DialogHeader class="p-6 pb-2">
                <DialogTitle class="text-lg font-bold tracking-tight text-zinc-900 flex items-center gap-2.5">
                    <div 
                        class="w-8 h-8 rounded-full flex items-center justify-center"
                        :class="confirmState.type === 'danger' ? 'bg-rose-50 text-rose-500' : 'bg-zinc-100 text-zinc-800'"
                    >
                        <AlertTriangle v-if="confirmState.type === 'danger'" class="h-4 w-4" />
                        <Info v-else class="h-4 w-4" />
                    </div>
                    {{ confirmState.title }}
                </DialogTitle>
                <DialogDescription class="text-sm text-zinc-500 mt-3 leading-relaxed pl-10">
                    {{ confirmState.message }}
                </DialogDescription>
            </DialogHeader>
            <DialogFooter class="p-6 bg-zinc-50/50 border-t border-zinc-100/80 gap-2 sm:gap-0 flex justify-end">
                <Button 
                    type="button" 
                    variant="ghost" 
                    @click="handleConfirmResponse(false)"
                    class="rounded-lg hover:bg-zinc-100 text-zinc-500 text-xs font-semibold uppercase tracking-wider h-10 px-4 transition-colors"
                >
                    {{ confirmState.cancelText }}
                </Button>
                <Button 
                    type="button"
                    :class="`h-10 px-5 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] ${confirmState.type === 'danger' ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-black hover:bg-zinc-800 text-white'}`"
                    @click="handleConfirmResponse(true)"
                >
                    {{ confirmState.confirmText }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>

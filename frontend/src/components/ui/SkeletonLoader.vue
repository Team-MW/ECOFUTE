<script setup lang="ts">
defineProps<{
  type?: 'table' | 'cards' | 'detail' | 'list'
  rows?: number
}>()
</script>

<template>
  <!-- Table Skeleton (for Clients list, Sales, etc.) -->
  <div v-if="type === 'table' || !type" class="w-full animate-pulse">
    <div class="border border-zinc-200 overflow-hidden">
      <!-- Header -->
      <div class="bg-zinc-50 border-b border-zinc-200 px-6 py-4 flex gap-8">
        <div class="h-3 bg-zinc-200 rounded w-32"></div>
        <div class="h-3 bg-zinc-200 rounded w-24 hidden lg:block"></div>
        <div class="h-3 bg-zinc-200 rounded w-20 hidden md:block ml-auto"></div>
      </div>
      <!-- Rows -->
      <div v-for="i in (rows || 6)" :key="i" class="px-6 py-5 border-b border-zinc-100 last:border-0 flex items-center gap-4">
        <div class="w-10 h-10 bg-zinc-200 rounded-full shrink-0"></div>
        <div class="flex-1 space-y-2">
          <div class="h-3.5 bg-zinc-200 rounded" :style="`width: ${55 + (i * 7) % 30}%`"></div>
          <div class="h-2.5 bg-zinc-100 rounded" :style="`width: ${30 + (i * 11) % 20}%`"></div>
        </div>
        <div class="h-3 bg-zinc-200 rounded w-20 hidden lg:block"></div>
        <div class="h-6 bg-zinc-100 rounded w-12 ml-auto"></div>
      </div>
    </div>
  </div>

  <!-- Cards Skeleton (for Team, Planning cards) -->
  <div v-else-if="type === 'cards'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
    <div v-for="i in (rows || 3)" :key="i" class="border border-zinc-200 p-6 rounded-sm bg-white shadow-sm">
      <div class="flex items-center gap-4 mb-4">
        <div class="w-12 h-12 bg-zinc-200 rounded-full shrink-0"></div>
        <div class="space-y-2 flex-1">
          <div class="h-4 bg-zinc-200 rounded w-3/4"></div>
          <div class="h-3 bg-zinc-100 rounded w-1/2"></div>
        </div>
      </div>
      <div class="space-y-2 pt-4 border-t border-zinc-100">
        <div class="h-3 bg-zinc-100 rounded w-full"></div>
        <div class="h-3 bg-zinc-100 rounded w-3/4"></div>
      </div>
    </div>
  </div>

  <!-- Detail Skeleton (for user detail view) -->
  <div v-else-if="type === 'detail'" class="animate-pulse grid grid-cols-1 lg:grid-cols-3 gap-8">
    <div class="lg:col-span-1">
      <div class="border border-zinc-200 p-6 rounded-sm bg-white shadow-sm flex flex-col items-center gap-3">
        <div class="w-24 h-24 bg-zinc-200 rounded-full mb-2"></div>
        <div class="h-5 bg-zinc-200 rounded w-40"></div>
        <div class="h-3 bg-zinc-100 rounded w-32"></div>
        <div class="h-6 bg-zinc-200 rounded-full w-24 mt-2"></div>
        <div class="w-full pt-4 border-t border-zinc-100 space-y-3 mt-2">
          <div class="flex justify-between"><div class="h-3 bg-zinc-100 rounded w-16"></div><div class="h-3 bg-zinc-200 rounded w-20"></div></div>
          <div class="flex justify-between"><div class="h-3 bg-zinc-100 rounded w-20"></div><div class="h-3 bg-zinc-200 rounded w-28"></div></div>
          <div class="flex justify-between"><div class="h-3 bg-zinc-100 rounded w-14"></div><div class="h-3 bg-zinc-200 rounded w-24"></div></div>
        </div>
      </div>
    </div>
    <div class="lg:col-span-2">
      <div class="border border-zinc-200 p-6 rounded-sm bg-white shadow-sm space-y-4">
        <div class="h-5 bg-zinc-200 rounded w-1/3"></div>
        <div v-for="i in 5" :key="i" class="flex items-center gap-4 py-3 border-b border-zinc-100">
          <div class="w-8 h-8 bg-zinc-100 rounded shrink-0"></div>
          <div class="flex-1 space-y-1.5">
            <div class="h-3.5 bg-zinc-200 rounded" :style="`width: ${40 + (i * 13) % 40}%`"></div>
            <div class="h-2.5 bg-zinc-100 rounded w-16"></div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- List Skeleton (generic) -->
  <div v-else-if="type === 'list'" class="space-y-3 animate-pulse">
    <div v-for="i in (rows || 5)" :key="i" class="flex items-center gap-4 p-4 border border-zinc-100 rounded-sm bg-white">
      <div class="w-8 h-8 bg-zinc-200 rounded-full shrink-0"></div>
      <div class="flex-1 space-y-1.5">
        <div class="h-3.5 bg-zinc-200 rounded" :style="`width: ${50 + (i * 9) % 35}%`"></div>
        <div class="h-2.5 bg-zinc-100 rounded w-24"></div>
      </div>
      <div class="h-7 bg-zinc-100 rounded w-14"></div>
    </div>
  </div>
</template>

<style scoped>
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.animate-pulse {
  animation: pulse 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>

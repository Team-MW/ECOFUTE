<script setup lang="ts">
import { SignIn } from '@clerk/vue'
</script>

<template>
<div class="h-screen w-full flex items-center justify-center bg-zinc-50">
    <SignIn after-sign-in-url="/admin" sign-up-url="/sign-up" />
</div>
</template>

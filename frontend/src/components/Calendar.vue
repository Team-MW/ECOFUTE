<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ChevronLeft, ChevronRight, Plus, Edit2, Trash2, Calendar as CalendarIcon, Clock, AlignLeft } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import axios from 'axios'

interface CalendarEvent {
    id: number
    title: string
    date: Date | string // Date object or ISO string from API
    color: string
    description?: string
    time?: string
}

// State
const currentDate = ref(new Date())
const selectedDate = ref<Date | null>(new Date()) // Default to today
const events = ref<CalendarEvent[]>([])
const showEventDialog = ref(false)
const showCustomizeDialog = ref(false)
const editingEvent = ref<CalendarEvent | null>(null)
const isLoading = ref(false)

const eventForm = ref({
    title: '',
    date: '',
    time: '',
    description: '',
    color: '#3b82f6'
})

// Customization options
const calendarTheme = ref({
    primaryColor: '#000000',
    accentColor: '#3b82f6',
    weekendColor: '#f9fafb',
    todayColor: '#f3f4f6'
})

// Lifecycle
onMounted(() => {
    fetchEvents()
    // Load local customization if any (optional, skipping for now to keep it simple or adds complexity)
})

// API Interactions
const fetchEvents = async () => {
    try {
        isLoading.value = true
        const res = await axios.get('/api/events')
        // Transform date strings to Date objects for frontend logic
        events.value = res.data.map((e: any) => ({
            ...e,
            date: new Date(e.date)
        }))
    } catch (err) {
        console.error("Failed to fetch events", err)
    } finally {
        isLoading.value = false
    }
}

const saveEvent = async () => {
    isLoading.value = true
    try {
        const formData = eventForm.value
        const eventDate = formData.date ? new Date(formData.date) : (selectedDate.value || new Date())
        
        if (editingEvent.value && editingEvent.value.id) {
            // Update existing event
            const payload = {
                title: formData.title,
                date: eventDate,
                time: formData.time,
                description: formData.description,
                color: formData.color
            }
            const res = await axios.put(`/api/events/${editingEvent.value.id}`, payload)
            
            // Update local state
            const index = events.value.findIndex(e => e.id === editingEvent.value!.id)
            if (index !== -1) {
                events.value[index] = {
                    ...res.data,
                    date: new Date(res.data.date)
                }
            }
        } else {
            // Create new event
            const payload = {
                title: formData.title,
                date: eventDate,
                time: formData.time,
                description: formData.description,
                color: formData.color || '#3b82f6'
            }
            const res = await axios.post('/api/events', payload)
            events.value.push({
                ...res.data,
                date: new Date(res.data.date)
            })
        }
        showEventDialog.value = false
        editingEvent.value = null
        
        // Optionally move view to the new date if it's in a different month? 
        // For now, let's update selectedDate to the event date so the user sees it immediately
        selectedDate.value = eventDate
        currentDate.value = new Date(eventDate.getFullYear(), eventDate.getMonth(), 1)
        
    } catch (err) {
        alert("Erreur lors de la sauvegarde")
    } finally {
        isLoading.value = false
    }
}

const deleteEvent = async (eventId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) return

    try {
        await axios.delete(`/api/events/${eventId}`)
        events.value = events.value.filter(e => e.id !== eventId)
    } catch (err) {
        alert("Erreur lors de la suppression")
    }
}

// ... Computed properties (monthYear, daysInMonth, eventsForSelectedDate) remain unchanged ...
// ... Methods (previousMonth, nextMonth, etc.) remain unchanged until openNewEventDialog ...


// ... rest of methods ...


// Computed
const monthYear = computed(() => {
    return currentDate.value.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
})

const daysInMonth = computed(() => {
    const year = currentDate.value.getFullYear()
    const month = currentDate.value.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay() // 0 = Sunday
    
    const days: Array<{ date: number | null, isCurrentMonth: boolean, fullDate: Date | null }> = []
    
    // Adjust for Monday start (0=Mon, 6=Sun in standard Euro calendar view)
    // JS getDay(): 0=Sun, 1=Mon. 
    // We want Monday as first col.
    // If start is Sun (0), need 6 empty slots? No, logic:
    // Mon(1) -> 0 padding
    // Tue(2) -> 1 padding
    // ...
    // Sun(0) -> 6 padding
    const adjustedStartDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1
    
    for (let i = 0; i < adjustedStartDay; i++) {
        days.push({ date: null, isCurrentMonth: false, fullDate: null })
    }
    
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
        days.push({ 
            date: i, 
            isCurrentMonth: true,
            fullDate: new Date(year, month, i)
        })
    }
    
    return days
})

const eventsForSelectedDate = computed(() => {
    if (!selectedDate.value) return []
    return events.value.filter(event => {
        const d = new Date(event.date)
        return d.toDateString() === selectedDate.value!.toDateString()
    })
})

// Methods
const previousMonth = () => {
    currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() - 1, 1)
}

const nextMonth = () => {
    currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 1)
}

const goToToday = () => {
    currentDate.value = new Date()
    selectedDate.value = new Date()
}

const selectDate = (date: Date | null) => {
    if (date) {
        selectedDate.value = date
    }
}

const isToday = (date: Date | null) => {
    if (!date) return false
    const today = new Date()
    return date.toDateString() === today.toDateString()
}

const isWeekend = (date: Date | null) => {
    if (!date) return false
    const day = date.getDay()
    return day === 0 || day === 6
}

const getEventsForDate = (date: Date | null) => {
    if (!date) return []
    return events.value.filter(event => {
        const d = new Date(event.date)
        return d.toDateString() === date.toDateString()
    })
}

const openNewEventDialog = () => {
    editingEvent.value = null
    // Initialize form
    eventForm.value = {
        title: '',
        date: selectedDate.value ? selectedDate.value.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        time: '',
        description: '',
        color: '#3b82f6'
    }
    showEventDialog.value = true
}

const openEditEventDialog = (event: CalendarEvent) => {
    editingEvent.value = { ...event }
    // Initialize form with event data
    eventForm.value = {
        title: event.title || '',
        date: event.date instanceof Date ? event.date.toISOString().split('T')[0] : new Date(event.date).toISOString().split('T')[0],
        time: event.time || '',
        description: event.description || '',
        color: event.color
    }
    showEventDialog.value = true
}

const handleEventSubmit = () => {
    saveEvent()
}

const saveCustomization = (e: Event) => {
    const form = e.target as HTMLFormElement
    const formData = new FormData(form)
    calendarTheme.value = {
        primaryColor: formData.get('primaryColor') as string,
        accentColor: formData.get('accentColor') as string,
        weekendColor: formData.get('weekendColor') as string,
        todayColor: formData.get('todayColor') as string
    }
    showCustomizeDialog.value = false
}
</script>

<template>
    <div class="h-full flex flex-col bg-white/50 backdrop-blur-xl">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 px-1">
            <div class="animate-in fade-in slide-in-from-left-4 duration-500">
                <h2 class="text-3xl font-bold text-zinc-900 tracking-tight capitalize flex items-center gap-3">
                    {{ monthYear }}
                    <span v-if="isLoading" class="text-xs font-normal text-zinc-400 bg-zinc-100 px-2 py-1 rounded-full animate-pulse">Synchronisation...</span>
                </h2>
                <p class="text-sm text-zinc-500 mt-1 font-medium">Gestion et planification</p>
            </div>
            <div class="flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-500">
                <Button @click="goToToday" variant="outline" class="h-9 px-4 rounded-none border-zinc-200 text-xs font-semibold uppercase tracking-wide hover:bg-black hover:text-white transition-all">
                    Aujourd'hui
                </Button>
                <Button @click="showCustomizeDialog = true" variant="outline" class="h-9 px-4 rounded-none border-zinc-200 text-xs font-semibold uppercase tracking-wide hover:bg-black hover:text-white transition-all">
                    <Edit2 :size="14" class="mr-2" />
                    Thème
                </Button>
                <div class="flex items-center border border-zinc-200 bg-white">
                    <Button @click="previousMonth" variant="ghost" size="sm" class="h-9 w-9 rounded-none hover:bg-zinc-100 text-zinc-600">
                        <ChevronLeft :size="18" />
                    </Button>
                    <div class="w-px h-5 bg-zinc-200"></div>
                    <Button @click="nextMonth" variant="ghost" size="sm" class="h-9 w-9 rounded-none hover:bg-zinc-100 text-zinc-600">
                        <ChevronRight :size="18" />
                    </Button>
                </div>
            </div>
        </div>

        <div class="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-hidden">
            <!-- Calendar Grid -->
            <div class="lg:col-span-2 bg-white border border-zinc-200 shadow-sm p-4 md:p-6 overflow-auto flex flex-col">
                <!-- Days of week header -->
                <div class="grid grid-cols-7 gap-px mb-4 border-b border-zinc-100 pb-2">
                    <div v-for="day in ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']" :key="day" 
                         class="text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest py-2">
                        {{ day }}
                    </div>
                </div>

                <!-- Calendar days -->
                <div class="grid grid-cols-7 gap-2 auto-rows-fr flex-1">
                    <div 
                        v-for="(day, index) in daysInMonth" 
                        :key="index"
                        @click="selectDate(day.fullDate)"
                        :class="`
                            relative min-h-[100px] p-2 border border-transparent transition-all duration-200 cursor-pointer group
                            ${!day.isCurrentMonth ? 'opacity-0 pointer-events-none' : ''}
                            ${day.isCurrentMonth ? 'hover:border-zinc-300 hover:shadow-md hover:-translate-y-0.5 z-0 hover:z-10 bg-white' : ''}
                            ${isToday(day.fullDate) ? 'bg-zinc-50 ring-1 ring-inset ring-black' : ''}
                        `"
                        :style="{
                            backgroundColor: day.isCurrentMonth ? (isToday(day.fullDate) ? calendarTheme.todayColor : (selectedDate && day.fullDate && selectedDate.toDateString() === day.fullDate.toDateString() ? '#18181b' : (isWeekend(day.fullDate) ? calendarTheme.weekendColor : 'white'))) : 'transparent',
                            color: selectedDate && day.fullDate && selectedDate.toDateString() === day.fullDate.toDateString() ? 'white' : 'inherit'
                        }"
                    >
                        <div v-if="day.date" class="flex flex-col h-full">
                            <div class="flex justify-between items-start">
                                <span :class="`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full transition-colors ${isToday(day.fullDate) && !selectedDate?.toDateString().includes(day.fullDate?.toDateString() || '') ? 'bg-black text-white' : ''} ${selectedDate && day.fullDate && selectedDate.toDateString() === day.fullDate.toDateString() ? 'text-white' : 'text-zinc-700'}`">
                                    {{ day.date }}
                                </span>
                                <div v-if="getEventsForDate(day.fullDate).length > 0" class="flex gap-0.5">
                                     <div v-for="i in Math.min(getEventsForDate(day.fullDate).length, 3)" :key="i" class="w-1 h-1 rounded-full bg-current opacity-50"></div>
                                </div>
                            </div>
                            
                            <div class="flex-1 space-y-1 mt-2 overflow-hidden">
                                <div 
                                    v-for="event in getEventsForDate(day.fullDate).slice(0, 3)" 
                                    :key="event.id"
                                    class="text-[10px] px-1.5 py-1 rounded-sm truncate font-medium flex items-center gap-1.5 transition-all hover:scale-[1.02]"
                                    :style="{ backgroundColor: event.color + '20', color: selectedDate && day.fullDate && selectedDate.toDateString() === day.fullDate.toDateString() ? 'white' : event.color, borderLeft: `2px solid ${event.color}` }"
                                >
                                    {{ event.title }}
                                </div>
                                <div v-if="getEventsForDate(day.fullDate).length > 3" class="text-[9px] pl-1 opacity-70 font-medium">
                                    +{{ getEventsForDate(day.fullDate).length - 3 }} autres
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Sidebar - Events for selected date -->
            <div class="bg-white border border-zinc-200 shadow-sm p-0 flex flex-col overflow-hidden h-full">
                <div class="p-6 border-b border-zinc-100 bg-zinc-50/50">
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-xs font-bold text-zinc-400 uppercase tracking-widest">Date sélectionnée</span>
                         <Button 
                            @click="openNewEventDialog" 
                            size="sm" 
                            class="bg-black hover:bg-zinc-800 text-white rounded-none h-7 px-3 text-xs uppercase font-bold tracking-wide"
                            :disabled="!selectedDate"
                        >
                            <Plus :size="14" class="mr-1" /> Ajouter
                        </Button>
                    </div>
                    <h3 class="text-2xl font-bold text-zinc-900 tracking-tight">
                        {{ selectedDate ? selectedDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : 'Sélectionnez une date' }}
                    </h3>
                    <p class="text-sm text-zinc-500 mt-1 capitalize">
                         {{ selectedDate ? selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric' }) : '' }}
                    </p>
                </div>

                <div class="flex-1 overflow-auto p-4 space-y-3 bg-white">
                    <div v-if="eventsForSelectedDate.length === 0" class="h-full flex flex-col items-center justify-center text-center text-zinc-400 p-8">
                        <div class="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
                            <CalendarIcon class="text-zinc-300" :size="24" />
                        </div>
                        <p class="font-medium text-zinc-900 mb-1">Aucun événement</p>
                        <p class="text-xs">Aucun événement prévu pour cette journée.</p>
                        <Button @click="openNewEventDialog" variant="link" class="text-black text-xs mt-2 underline-offset-4">Créer un événement</Button>
                    </div>

                    <div 
                        v-for="event in eventsForSelectedDate" 
                        :key="event.id"
                        class="group relative bg-white border border-zinc-100 hover:border-zinc-300 p-4 shadow-sm hover:shadow-md transition-all duration-200"
                        :style="{ borderLeft: `3px solid ${event.color}` }"
                    >
                        <div class="flex items-start justify-between mb-2">
                             <h4 class="font-bold text-sm text-zinc-900">{{ event.title }}</h4>
                             <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-3 right-3 bg-white pl-2">
                                <Button @click="openEditEventDialog(event)" variant="ghost" size="sm" class="h-6 w-6 p-0 hover:bg-zinc-100 rounded-sm">
                                    <Edit2 :size="12" />
                                </Button>
                                <Button @click="deleteEvent(event.id)" variant="ghost" size="sm" class="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-sm">
                                    <Trash2 :size="12" />
                                </Button>
                            </div>
                        </div>
                        
                        <div class="flex items-center gap-4 text-xs text-zinc-500 mb-3">
                            <div v-if="event.time" class="flex items-center gap-1.5 bg-zinc-50 px-2 py-1 rounded-sm">
                                <Clock :size="12" /> 
                                <span class="font-mono">{{ event.time }}</span>
                            </div>
                        </div>

                        <p v-if="event.description" class="text-xs text-zinc-600 leading-relaxed border-t border-zinc-50 pt-3 flex gap-2">
                            <AlignLeft :size="12" class="mt-0.5 shrink-0 text-zinc-400" />
                            {{ event.description }}
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Event Dialog -->
        <Dialog v-model:open="showEventDialog">
            <DialogContent class="sm:max-w-md rounded-none border-zinc-200 p-0 overflow-hidden">
                <DialogHeader class="p-6 pb-2 bg-zinc-50 border-b border-zinc-100">
                    <DialogTitle class="text-xl font-bold tracking-tight text-zinc-900">
                        {{ editingEvent ? 'Modifier' : 'Nouveau' }}
                        <span class="text-zinc-500 font-light">Rendez-vous</span>
                    </DialogTitle>
                    <DialogDescription class="text-xs font-medium uppercase tracking-wide text-zinc-500 mt-1">
                        {{ selectedDate ? selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : '' }}
                    </DialogDescription>
                </DialogHeader>
                
                <form @submit.prevent="handleEventSubmit" class="p-6 space-y-5">
                    <div class="space-y-1.5">
                        <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Titre</label>
                        <Input v-model="eventForm.title" required placeholder="Ex: Réunion client" class="rounded-sm border-zinc-300 focus:border-black bg-white text-black font-medium" />
                    </div>

                    <div class="space-y-1.5">
                        <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Date</label>
                        <Input 
                            v-model="eventForm.date"
                            type="date" 
                            required
                            class="rounded-sm border-zinc-300 focus:border-black bg-white text-black font-medium" 
                        />
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-1.5">
                            <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Heure</label>
                            <Input v-model="eventForm.time" type="time" class="rounded-sm border-zinc-300 focus:border-black bg-white text-black font-medium" />
                        </div>
                        <div class="space-y-1.5">
                            <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Couleur</label>
                            <div class="h-10 border border-zinc-300 rounded-sm bg-white flex items-center px-1">
                                <input 
                                    type="color" 
                                    v-model="eventForm.color"
                                    class="h-8 w-full cursor-pointer bg-transparent border-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div class="space-y-1.5">
                        <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Description</label>
                        <textarea 
                            v-model="eventForm.description"
                            placeholder="Détails de l'événement..." 
                            class="w-full px-3 py-2 border border-zinc-300 rounded-sm focus:border-black outline-none text-sm min-h-[100px] resize-none bg-white text-black font-medium"
                        ></textarea>
                    </div>

                    <div class="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="ghost" @click="showEventDialog = false" class="rounded-sm hover:bg-zinc-100 text-zinc-500">
                            Annuler
                        </Button>
                        <Button type="submit" class="bg-black hover:bg-zinc-800 text-white rounded-sm min-w-[100px]">
                            {{ editingEvent ? 'Enregistrer' : 'Créer' }}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>

        <!-- Customize Dialog -->
        <Dialog v-model:open="showCustomizeDialog">
            <DialogContent class="sm:max-w-md rounded-none border-zinc-200">
                <DialogHeader>
                    <DialogTitle class="text-xl font-bold tracking-tight">Apparence</DialogTitle>
                    <DialogDescription>Personnalisez les couleurs de votre calendrier</DialogDescription>
                </DialogHeader>
                <form @submit.prevent="saveCustomization" class="space-y-4 pt-4">
                    <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-1">
                            <label class="text-xs font-semibold text-zinc-500">Sélection</label>
                            <input type="color" name="primaryColor" :value="calendarTheme.primaryColor" class="w-full h-8 cursor-pointer" />
                        </div>
                        <div class="space-y-1">
                            <label class="text-xs font-semibold text-zinc-500">Accent</label>
                            <input type="color" name="accentColor" :value="calendarTheme.accentColor" class="w-full h-8 cursor-pointer" />
                        </div>
                        <div class="space-y-1">
                            <label class="text-xs font-semibold text-zinc-500">Week-end</label>
                            <input type="color" name="weekendColor" :value="calendarTheme.weekendColor" class="w-full h-8 cursor-pointer" />
                        </div>
                        <div class="space-y-1">
                            <label class="text-xs font-semibold text-zinc-500">Aujourd'hui</label>
                            <input type="color" name="todayColor" :value="calendarTheme.todayColor" class="w-full h-8 cursor-pointer" />
                        </div>
                    </div>
                    <DialogFooter class="mt-6">
                        <Button type="button" variant="outline" @click="showCustomizeDialog = false" class="rounded-none border-zinc-200">Annuler</Button>
                        <Button type="submit" class="bg-black hover:bg-zinc-800 text-white rounded-none">Sauvegarder</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    </div>
</template>

<style scoped>
/* Custom Scrollbar for events list */
::-webkit-scrollbar {
    width: 4px;
}
::-webkit-scrollbar-track {
    background: transparent;
}
::-webkit-scrollbar-thumb {
    background: #e4e4e7;
    border-radius: 2px;
}
::-webkit-scrollbar-thumb:hover {
    background: #d4d4d8;
}
</style>

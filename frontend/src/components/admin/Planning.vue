<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUser } from '@clerk/vue'
import { ChevronLeft, ChevronRight, Plus, Clock, User, Filter, Copy, RefreshCw, MoreVertical } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import axios from 'axios'
import { addDays, startOfWeek, format, isSameDay } from 'date-fns'
import { fr } from 'date-fns/locale'

interface CalendarEvent {
    id: number
    title: string
    date: Date | string 
    color: string
    description?: string
    time?: string
    assignedTo?: string | null
    type?: string
}

interface TeamMember {
    id: string
    firstName: string
    lastName: string
    email: string
    color: string
}

// State
const { user } = useUser()
const currentWeekStart = ref(startOfWeek(new Date(), { weekStartsOn: 1 })) // Start on Monday
const events = ref<CalendarEvent[]>([])
const teamMembers = ref<TeamMember[]>([])
const showEventDialog = ref(false)
const showOptionsDialog = ref(false)
const editingEvent = ref<CalendarEvent | null>(null)
const isLoading = ref(false)
const filterEmployeeId = ref<string>('all')

// New form fields for recurrence
const eventForm = ref({
    title: '',
    date: '',
    startTime: '09:00',
    endTime: '17:00',
    description: '',
    color: '#3b82f6',
    assignedTo: '' as string | null,
    recurrence: false,
    recurrenceEndDate: ''
})

// Lifecycle
onMounted(() => {
    fetchEvents()
    fetchTeamMembers()
})

// API Interactions
const fetchTeamMembers = async () => {
    try {
        const res = await axios.get('/api/users')
        teamMembers.value = res.data
    } catch (err) {
        console.error("Failed to fetch team members", err)
    }
}

const fetchEvents = async () => {
    try {
        isLoading.value = true
        // In a real app, we would filter by date range here to improve performance
        const res = await axios.get('/api/events?type=planning')
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
        // Format time string for display
        const timeString = `${formData.startTime} - ${formData.endTime}`
        
        // Auto-assign color if user is selected
        let eventColor = formData.color
        if (formData.assignedTo) {
            const member = teamMembers.value.find(m => m.id === formData.assignedTo)
            if (member && member.color) {
                eventColor = member.color
            }
        }

        const baseEventData = {
            title: formData.title,
            time: timeString,
            description: formData.description,
            color: eventColor,
            assignedTo: formData.assignedTo || null,
            type: 'planning'
        }

        if (editingEvent.value && editingEvent.value.id) {
            // Edit mode (single event)
            const eventDate = new Date(formData.date)
            const payload = {
                ...baseEventData,
                date: eventDate
            }
            const res = await axios.put(`/api/events/${editingEvent.value.id}`, payload)
            // Update local state
            const index = events.value.findIndex(e => e.id === editingEvent.value!.id)
            if (index !== -1) {
                events.value[index] = { ...res.data, date: new Date(res.data.date) }
            }
        } else {
            // Create mode (possibly recurring)
            if (formData.recurrence && formData.recurrenceEndDate) {
                const startDate = new Date(formData.date)
                const endDate = new Date(formData.recurrenceEndDate)
                const eventsToCreate = []
                let currentDateLoop = startDate

                // Loop weekly
                while (currentDateLoop <= endDate) {
                    eventsToCreate.push({
                        ...baseEventData,
                        date: new Date(currentDateLoop)
                    })
                    // Add 7 days
                    currentDateLoop = addDays(currentDateLoop, 7)
                }

                if (eventsToCreate.length > 0) {
                     // Batch create
                     // Can simply send array to backend if backend supports it, otherwise loop requests
                     // We updated backend to support batch
                     await axios.post('/api/events', eventsToCreate.map(e => ({
                        ...e,
                        date: e.date, // Backend handles Date object or string? usually string/ISO in JSON
                     })))
                     
                     // Refresh all to be safe or manually push
                     await fetchEvents()
                }

            } else {
                // Single Create
                const eventDate = new Date(formData.date)
                const payload = {
                    ...baseEventData,
                    date: eventDate
                }
                const res = await axios.post('/api/events', payload)
                events.value.push({ ...res.data, date: new Date(res.data.date) })
            }
        }
        
        showEventDialog.value = false
        editingEvent.value = null
        
    } catch (err) {
        console.error(err)
        alert("Erreur lors de la sauvegarde")
    } finally {
        isLoading.value = false
    }
}

const deleteEvent = async (eventId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce shift ?')) return
    try {
        await axios.delete(`/api/events/${eventId}`)
        events.value = events.value.filter(e => e.id !== eventId)
    } catch (err) {
        alert("Erreur lors de la suppression")
    }
}

const duplicatePreviousWeek = async () => {
    if(!confirm("Cela va copier tous les shifts de la semaine précédente vers la semaine actuelle. Continuer ?")) return

    isLoading.value = true
    try {
        const startOfCurrent = currentWeekStart.value
        const startOfPrevious = addDays(startOfCurrent, -7)
        const endOfPrevious = addDays(startOfPrevious, 6)

        // Find events from last week
        const eventsToCopy = events.value.filter(e => {
            const d = new Date(e.date)
            return d >= startOfPrevious && d <= endOfPrevious
        })

        if(eventsToCopy.length === 0) {
            alert("Aucun shift trouvé la semaine dernière.")
            isLoading.value = false
            return
        }

        const newEventsPayload = eventsToCopy.map(e => {
            const oldDate = new Date(e.date)
            // Just add 7 days to date
            const newDate = addDays(oldDate, 7)
            
            return {
                title: e.title,
                date: newDate,
                time: e.time,
                description: e.description,
                color: e.color,
                assignedTo: e.assignedTo,
                type: 'planning'
            }
        })

        await axios.post('/api/events', newEventsPayload)
        await fetchEvents()
        
    } catch(err) {
        console.error(err)
        alert("Erreur lors de la duplication")
    } finally {
        isLoading.value = false
        showOptionsDialog.value = false
    }
}


// Computed
const weekDays = computed(() => {
    const days = []
    let start = currentWeekStart.value
    for (let i = 0; i < 7; i++) {
        days.push(addDays(start, i))
    }
    return days
})

const dateRangeLabel = computed(() => {
    const start = currentWeekStart.value
    const end = addDays(start, 6)
    return `${format(start, 'd MMM', { locale: fr })} - ${format(end, 'd MMM yyyy', { locale: fr })}`
})

// Methods
const previousWeek = () => { currentWeekStart.value = addDays(currentWeekStart.value, -7) }
const nextWeek = () => { currentWeekStart.value = addDays(currentWeekStart.value, 7) }
const goToToday = () => { currentWeekStart.value = startOfWeek(new Date(), { weekStartsOn: 1 }) }

const getEventsForCell = (memberId: string | null, date: Date) => {
    return events.value.filter(e => {
        return e.assignedTo === memberId && isSameDay(new Date(e.date), date)
    })
}

// Unassigned events or events for filtered user if 'all' not selected?
// If 'all', we show rows for all team members.
// If 'specific user', we show row for that user.
// What about unassigned events?
// Let's add an "Unassigned" row at the top?

const displayedRows = computed(() => {
    let rows = []
    
    // 1. Unassigned Row
    // Actually, forcing assignment is better for "Real Planning". 
    // But let's keep unassigned just in case.
    rows.push({ id: null, name: 'Non assigné', color: '#e4e4e7', isHeader: false })

    // 2. Team Members
    if (filterEmployeeId.value === 'all') {
        rows.push(...teamMembers.value.map(m => ({
            id: m.id,
            name: `${m.firstName} ${m.lastName}`,
            color: m.color,
            isHeader: false
        })))
    } else {
        const m = teamMembers.value.find(tm => tm.id === filterEmployeeId.value)
        if (m) {
            rows.push({
                id: m.id,
                name: `${m.firstName} ${m.lastName}`,
                color: m.color,
                isHeader: false
            })
        }
    }
    return rows
})

// getMemberName was removed.


const openNewEventDialog = (userId?: string | null, date?: Date) => {
    editingEvent.value = null
    const userColor = (user.value?.publicMetadata as any)?.color || '#3b82f6'
    
    // Default time based on morning?
    eventForm.value = {
        title: '',
        date: date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        startTime: '09:00',
        endTime: '17:00',
        description: '',
        color: userColor,
        assignedTo: userId || (filterEmployeeId.value !== 'all' ? filterEmployeeId.value : ''),
        recurrence: false,
        recurrenceEndDate: ''
    }
    showEventDialog.value = true
}

const openEditEventDialog = (event: CalendarEvent) => {
    editingEvent.value = { ...event }
    
    // Parse time string "09:00 - 17:00"
    let start = '09:00'
    let end = '17:00'
    if(event.time && event.time.includes(' - ')) {
        const parts = event.time.split(' - ')
        start = parts[0] ? parts[0] : '09:00'
        end = parts[1] ? parts[1] : '17:00'
    }

    eventForm.value = {
        title: event.title || '',
        date: format(new Date(event.date), 'yyyy-MM-dd'),
        startTime: start,
        endTime: end,
        description: event.description || '',
        color: event.color,
        assignedTo: event.assignedTo || '',
        recurrence: false, // Cannot edit recurrence pattern of existing event simply
        recurrenceEndDate: ''
    }
    showEventDialog.value = true
}
</script>

<template>
    <div class="h-full flex flex-col bg-white overflow-hidden">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 border-b border-zinc-100 bg-white z-20">
            <div>
                <h2 class="text-2xl font-bold text-zinc-900 tracking-tight flex items-center gap-3">
                    Planning Équipe
                    <span v-if="isLoading" class="text-xs font-normal text-zinc-400 bg-zinc-100 px-2 py-1 rounded-full animate-pulse">Sync...</span>
                </h2>
                <div class="flex items-center gap-2 mt-1 text-sm text-zinc-500 font-medium">
                    <button @click="previousWeek" class="hover:text-black transition-colors"><ChevronLeft :size="16" /></button>
                    <span class="capitalize min-w-[200px] text-center">{{ dateRangeLabel }}</span>
                    <button @click="nextWeek" class="hover:text-black transition-colors"><ChevronRight :size="16" /></button>
                    <Button @click="goToToday" variant="link" class="text-xs p-0 h-auto ml-4 text-zinc-400 hover:text-black">Revenir à aujourd'hui</Button>
                </div>
            </div>

            <div class="flex items-center gap-3">
                <!-- Filter -->
                <div class="relative flex items-center bg-zinc-50 border border-zinc-200 rounded-sm">
                    <Filter :size="14" class="absolute left-3 text-zinc-400" />
                    <select v-model="filterEmployeeId" class="pl-9 pr-8 py-2 h-9 text-xs font-bold uppercase tracking-wide bg-transparent outline-none cursor-pointer appearance-none min-w-[150px]">
                        <option value="all">Tous les employés</option>
                        <option v-for="member in teamMembers" :key="member.id" :value="member.id">
                            {{ member.firstName }} {{ member.lastName }}
                        </option>
                    </select>
                </div>

                <div class="relative">
                    <Button @click="showOptionsDialog = !showOptionsDialog" variant="outline" class="h-9 px-3 rounded-sm border-zinc-200 hover:bg-zinc-50">
                        <MoreVertical :size="16" />
                    </Button>
                    
                    <!-- Dropdown Options -->
                    <div v-if="showOptionsDialog" class="absolute right-0 top-full mt-2 w-56 bg-white border border-zinc-200 shadow-xl z-50 p-1 flex flex-col rounded-sm animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                        <button @click="duplicatePreviousWeek" class="flex items-center gap-3 px-3 py-2.5 text-xs font-medium text-left hover:bg-zinc-50 w-full rounded-sm transition-colors text-zinc-700">
                            <Copy :size="14" />
                            Copier semaine précédente
                        </button>
                         <button @click="fetchEvents" class="flex items-center gap-3 px-3 py-2.5 text-xs font-medium text-left hover:bg-zinc-50 w-full rounded-sm transition-colors text-zinc-700">
                            <RefreshCw :size="14" />
                            Actualiser
                        </button>
                    </div>
                </div>

                <Button @click="openNewEventDialog()" class="bg-black text-white hover:bg-zinc-800 rounded-sm h-9 text-xs uppercase font-bold tracking-wide">
                    <Plus :size="14" class="mr-2" /> Shift
                </Button>
            </div>
        </div>

        <!-- Simplified Daily/Weekly View -->
        <div class="flex-1 overflow-auto bg-zinc-50/50 p-6">
            <!-- Iterate over days in the current week -->
            <div v-for="day in weekDays" :key="day.toString()" class="mb-8 last:mb-0">
                <div class="flex items-center justify-between mb-4 border-b border-zinc-200 pb-2">
                    <h3 class="text-lg font-bold text-zinc-900 flex items-center gap-2">
                        <span class="capitalize">{{ format(day, 'EEEE', { locale: fr }) }}</span>
                        <span class="text-zinc-500 font-normal">{{ format(day, 'd MMMM', { locale: fr }) }}</span>
                    </h3>
                    <Button @click="openNewEventDialog(null, day)" variant="outline" size="sm" class="h-8 text-xs">
                        <Plus :size="12" class="mr-1" /> Ajouter
                    </Button>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <!-- Flatten events for this day -->
                    <template v-for="row in displayedRows" :key="row.id || 'unassigned'">
                        <div v-for="event in getEventsForCell(row.id, day)" :key="event.id"
                             class="bg-white border border-zinc-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-pointer border-l-4 group"
                             :style="{ borderLeftColor: event.color }"
                             @click="openEditEventDialog(event)">
                            <div class="flex justify-between items-start mb-2">
                                <div>
                                    <h4 class="font-bold text-sm text-zinc-900">{{ event.title }}</h4>
                                    <p class="text-xs text-zinc-500 font-medium flex items-center gap-1 mt-1">
                                        <Clock :size="12" /> {{ event.time }}
                                    </p>
                                </div>
                                <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                                     :title="row.name"
                                     :style="{ backgroundColor: row.color ? row.color + '20' : '#f4f4f5', color: row.color || '#a1a1aa' }">
                                    {{ row.id ? row.name.charAt(0) : '?' }}
                                </div>
                            </div>
                            <p v-if="event.description" class="text-xs text-zinc-600 mt-2 line-clamp-2">{{ event.description }}</p>
                        </div>
                    </template>
                    
                    <!-- Show empty state if no events for the day -->
                    <div v-if="displayedRows.flatMap(r => getEventsForCell(r.id, day)).length === 0" 
                         class="col-span-full py-8 text-center text-zinc-400 text-sm border-2 border-dashed border-zinc-200 rounded-lg bg-zinc-50/50">
                        Aucun shift prévu pour ce jour.
                    </div>
                </div>
            </div>
        </div>

        <!-- Event Dialog -->
        <Dialog v-model:open="showEventDialog">
            <DialogContent class="sm:max-w-md rounded-none border-zinc-200 p-0 overflow-hidden">
                <DialogHeader class="p-6 pb-2 bg-zinc-50 border-b border-zinc-100">
                    <DialogTitle class="text-xl font-bold tracking-tight text-zinc-900">
                        {{ editingEvent ? 'Modifier Shift' : 'Nouveau Shift' }}
                    </DialogTitle>
                </DialogHeader>
                
                <form @submit.prevent="saveEvent" class="p-6 space-y-5">
                    <div class="space-y-1.5">
                        <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Intitulé</label>
                        <Input v-model="eventForm.title" required placeholder="Ex: Matin, Soir, Journée..." class="rounded-sm border-zinc-300 focus:border-black bg-white text-black font-medium" />
                    </div>

                    <div class="space-y-1.5">
                        <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Employé</label>
                        <div class="relative">
                            <select 
                                v-model="eventForm.assignedTo" 
                                class="w-full px-3 py-2 text-sm border border-zinc-300 rounded-sm shadow-sm focus:border-black outline-none appearance-none bg-white text-black font-medium"
                            >
                                <option value="">-- Non Assigné --</option>
                                <option v-for="member in teamMembers" :key="member.id" :value="member.id">
                                    {{ member.firstName }} {{ member.lastName }}
                                </option>
                            </select>
                            <div class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-zinc-500">
                                <User :size="16" />
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-1.5">
                            <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Date</label>
                            <Input v-model="eventForm.date" type="date" required class="rounded-sm border-zinc-300 focus:border-black bg-white text-black font-medium" />
                        </div>
                         <div class="space-y-1.5">
                            <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Couleur</label>
                            <div class="h-10 border border-zinc-300 rounded-sm bg-white flex items-center px-1">
                                <input type="color" v-model="eventForm.color" class="h-8 w-full cursor-pointer bg-transparent border-none" />
                            </div>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-1.5">
                            <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Début</label>
                            <Input v-model="eventForm.startTime" type="time" required class="rounded-sm border-zinc-300 focus:border-black bg-white text-black font-medium" />
                        </div>
                         <div class="space-y-1.5">
                            <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Fin</label>
                            <Input v-model="eventForm.endTime" type="time" required class="rounded-sm border-zinc-300 focus:border-black bg-white text-black font-medium" />
                        </div>
                    </div>

                    <!-- Recurrence Option (Only for new events) -->
                    <div v-if="!editingEvent" class="bg-zinc-50 p-4 rounded-sm border border-zinc-200 space-y-3">
                        <div class="flex items-center gap-2">
                             <input type="checkbox" id="recurrence" v-model="eventForm.recurrence" class="w-4 h-4 rounded border-zinc-300 text-black focus:ring-black" />
                             <label for="recurrence" class="text-sm font-semibold select-none">Répéter chaque semaine</label>
                        </div>
                        
                        <div v-if="eventForm.recurrence" class="animate-in slide-in-from-top-2 fade-in duration-200">
                             <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block mb-1.5">Jusqu'au</label>
                             <Input v-model="eventForm.recurrenceEndDate" type="date" class="rounded-sm border-zinc-300 focus:border-black bg-white text-black font-medium" />
                             <p class="text-[10px] text-zinc-400 mt-2 leading-tight">
                                 Cela créera un shift identique tous les {{ format(new Date(eventForm.date), 'EEEE', { locale: fr }) }} jusqu'à la date de fin.
                             </p>
                        </div>
                    </div>

                    <div class="space-y-1.5">
                        <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Description</label>
                        <textarea v-model="eventForm.description" placeholder="Notes..." class="w-full px-3 py-2 border border-zinc-300 rounded-sm focus:border-black outline-none text-sm min-h-[80px] resize-none bg-white text-black font-medium"></textarea>
                    </div>

                    <div class="flex justify-between items-center pt-2">
                        <Button v-if="editingEvent" type="button" variant="ghost" @click="deleteEvent(editingEvent.id); showEventDialog=false" class="text-red-500 hover:text-red-600 hover:bg-red-50 px-0 h-auto">
                           Supprimer
                        </Button>
                        <div v-else></div>

                        <div class="flex gap-3">
                             <Button type="button" variant="ghost" @click="showEventDialog = false" class="rounded-sm hover:bg-zinc-100 text-zinc-500">Annuler</Button>
                             <Button type="submit" class="bg-black hover:bg-zinc-800 text-white rounded-sm min-w-[100px]">{{ editingEvent ? 'Mettre à jour' : 'Sauvegarder' }}</Button>
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUser } from '@clerk/vue'
import { ChevronLeft, ChevronRight, Plus, Edit2, Trash2, Calendar as CalendarIcon, Clock, AlignLeft, Filter, User } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import axios from 'axios'
import { showToast, showConfirm } from '@/lib/feedback'

interface CalendarEvent {
    id: number
    title: string
    date: Date | string 
    color: string
    description?: string
    time?: string
    assignedTo?: string | null
}

interface TeamMember {
    id: string
    firstName: string
    lastName: string
    email: string
    color: string
}

const TIME_SLOTS = Array.from({ length: 14 }, (_, i) => {
    const startHour = 7 + i
    const endHour = startHour + 1
    const start = `${String(startHour).padStart(2, '0')}:00`
    const end = `${String(endHour).padStart(2, '0')}:00`
    return { start, end, label: `${start} – ${end}` }
})

// State
const { user } = useUser()
const currentDate = ref(new Date())
const selectedDate = ref<Date | null>(new Date()) // Default to today
const events = ref<CalendarEvent[]>([])
const teamMembers = ref<TeamMember[]>([])
const filterEmployeeId = ref<string>('all')
const showEventDialog = ref(false)
const showCustomizeDialog = ref(false)
const editingEvent = ref<CalendarEvent | null>(null)
const isLoading = ref(false)

const eventForm = ref({
    title: '',
    date: '',
    time: '',
    description: '',
    color: '#3b82f6',
    assignedTo: '' as string | null
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
        const res = await axios.get('/api/events?type=general')
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
        
        // Auto-assign color if team member is selected
        let eventColor = formData.color
        if (formData.assignedTo) {
            const member = teamMembers.value.find(m => m.id === formData.assignedTo)
            if (member && member.color) {
                eventColor = member.color
            }
        }

        if (editingEvent.value && editingEvent.value.id) {
            // Update existing event
            const payload = {
                title: formData.title,
                date: eventDate,
                time: formData.time,
                description: formData.description,
                color: eventColor,
                assignedTo: formData.assignedTo || null,
                type: 'general'
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
                color: eventColor || '#3b82f6',
                assignedTo: formData.assignedTo || null,
                type: 'general'
            }
            const res = await axios.post('/api/events', payload)
            events.value.push({
                ...res.data,
                date: new Date(res.data.date)
            })
        }
        showEventDialog.value = false
        editingEvent.value = null
        
        // For now, let's update selectedDate to the event date so the user sees it immediately
        selectedDate.value = eventDate
        currentDate.value = new Date(eventDate.getFullYear(), eventDate.getMonth(), 1)
        
    } catch (err) {
        showToast("Erreur lors de la sauvegarde", "error")
    } finally {
        isLoading.value = false
    }
}

const deleteEvent = async (eventId: number) => {
    const isConfirmed = await showConfirm({
        title: 'Supprimer l\'événement',
        message: 'Êtes-vous sûr de vouloir supprimer cet événement ?',
        type: 'danger',
        confirmText: 'Supprimer',
        cancelText: 'Annuler'
    })
    if (!isConfirmed) return

    try {
        await axios.delete(`/api/events/${eventId}`)
        events.value = events.value.filter(e => e.id !== eventId)
        showToast("Événement supprimé avec succès !", "success")
    } catch (err) {
        showToast("Erreur lors de la suppression", "error")
    }
}

// Helpers
const getMemberName = (id: string | null | undefined) => {
    if (!id) return ''
    const member = teamMembers.value.find(m => m.id === id)
    return member ? `${member.firstName} ${member.lastName}` : 'Inconnu'
}

const getMemberColor = (id: string | null | undefined) => {
    if (!id) return '#a1a1aa'
    const member = teamMembers.value.find(m => m.id === id)
    return member?.color || '#3b82f6'
}

const getMemberInitials = (id: string | null | undefined) => {
    if (!id) return ''
    const member = teamMembers.value.find(m => m.id === id)
    if (!member) return ''
    return `${member.firstName.charAt(0)}${member.lastName.charAt(0)}`.toUpperCase()
}

// Computed
const filteredEvents = computed(() => {
    if (filterEmployeeId.value === 'all') return events.value
    return events.value.filter(event => event.assignedTo === filterEmployeeId.value)
})

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

    // Pad end of month to complete the row (multiple of 7)
    const totalCells = days.length
    const remainder = totalCells % 7
    if (remainder !== 0) {
        const padCount = 7 - remainder
        for (let i = 0; i < padCount; i++) {
            days.push({ date: null, isCurrentMonth: false, fullDate: null })
        }
    }
    
    return days
})

const eventsForSelectedDate = computed(() => {
    if (!selectedDate.value) return []
    return filteredEvents.value.filter(event => {
        const d = new Date(event.date)
        return d.toDateString() === selectedDate.value!.toDateString()
    })
})

const selectedDaySlots = computed(() => {
    return TIME_SLOTS.map(slot => ({
        ...slot,
        event: eventsForSelectedDate.value.find(event => normalizeTime(event.time) === slot.start) || null
    }))
})

const firstFreeSlot = computed(() => {
    return selectedDaySlots.value.find(slot => !slot.event)?.start || '07:00'
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
    return filteredEvents.value.filter(event => {
        const d = new Date(event.date)
        return d.toDateString() === date.toDateString()
    })
}

const toLocalDateInput = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

const normalizeTime = (time?: string | null) => {
    if (!time) return ''
    const match = time.match(/(\d{1,2})/)
    if (!match) return time
    return `${String(parseInt(match[1], 10)).padStart(2, '0')}:00`
}

const formatSlotLabel = (time?: string | null) => {
    const start = normalizeTime(time)
    const slot = TIME_SLOTS.find(item => item.start === start)
    return slot?.label || time || ''
}

const openNewEventDialog = (time?: string) => {
    editingEvent.value = null
    const userColor = (user.value?.publicMetadata as any)?.color || '#3b82f6'
    const dateValue = selectedDate.value ? toLocalDateInput(selectedDate.value) : toLocalDateInput(new Date())

    eventForm.value = {
        title: '',
        date: dateValue,
        time: time || firstFreeSlot.value,
        description: '',
        color: userColor,
        assignedTo: ''
    }
    showEventDialog.value = true
}

const openSlot = (slot: { start: string, event: CalendarEvent | null }) => {
    if (slot.event) {
        openEditEventDialog(slot.event)
        return
    }
    openNewEventDialog(slot.start)
}

const openEditEventDialog = (event: CalendarEvent) => {
    editingEvent.value = { ...event }
    // Initialize form with event data
    eventForm.value = {
        title: event.title || '',
        date: toLocalDateInput(event.date instanceof Date ? event.date : new Date(event.date)),
        time: normalizeTime(event.time) || firstFreeSlot.value,
        description: event.description || '',
        color: event.color,
        assignedTo: event.assignedTo || ''
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
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 px-1">
            <div class="animate-in fade-in slide-in-from-left-4 duration-500">
                <h2 class="text-3xl font-bold text-zinc-900 tracking-tight capitalize flex items-center gap-3">
                    {{ monthYear }}
                    <span v-if="isLoading" class="text-xs font-normal text-zinc-400 bg-zinc-100 px-2 py-1 rounded-full animate-pulse">Synchronisation...</span>
                </h2>
                <p class="text-sm text-zinc-500 mt-1 font-medium">Gestion et planification</p>
            </div>
            <div class="flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-500">
                <!-- Filtre par Collaborateur/Alternante -->
                <div class="relative flex items-center bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden px-1">
                    <Filter :size="12" class="absolute left-3 text-zinc-400" />
                    <select v-model="filterEmployeeId" class="pl-8 pr-6 py-1 h-8 text-xs font-bold uppercase tracking-wide bg-transparent outline-none cursor-pointer appearance-none min-w-[140px] text-zinc-700">
                        <option value="all">Tous les rdv</option>
                        <option v-for="member in teamMembers" :key="member.id" :value="member.id">
                            {{ member.firstName }} {{ member.lastName }}
                        </option>
                    </select>
                </div>
                <Button @click="goToToday" variant="outline" class="h-9 px-4 rounded-xl border-zinc-200 text-xs font-semibold uppercase tracking-wide hover:bg-black hover:text-white transition-all">
                    Aujourd'hui
                </Button>
                <Button @click="showCustomizeDialog = true" variant="outline" class="h-9 px-4 rounded-xl border-zinc-200 text-xs font-semibold uppercase tracking-wide hover:bg-black hover:text-white transition-all">
                    <Edit2 :size="14" class="mr-2" />
                    Thème
                </Button>
                <div class="flex items-center border border-zinc-200 bg-white rounded-xl overflow-hidden">
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

        <!-- Legend (Quick display of team members and their colors) -->
        <div v-if="teamMembers.length > 0" class="flex flex-wrap gap-2.5 mb-6 px-1 text-xs font-medium text-zinc-500 animate-in fade-in duration-500">
            <span class="text-zinc-400 self-center">Légende :</span>
            <div v-for="member in teamMembers" :key="member.id" class="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200/60 px-2.5 py-0.5 rounded-full select-none">
                <span class="w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: member.color }"></span>
                <span class="text-zinc-700 text-[11px] font-semibold">{{ member.firstName }} {{ member.lastName }}</span>
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
                <div class="grid grid-cols-7 gap-px bg-zinc-200 border border-zinc-200 rounded-lg overflow-hidden auto-rows-fr flex-1">
                    <div 
                        v-for="(day, index) in daysInMonth" 
                        :key="index"
                        @click="selectDate(day.fullDate)"
                        :class="`
                            relative min-h-[110px] p-2.5 transition-all duration-150 cursor-pointer flex flex-col justify-between select-none
                            ${!day.isCurrentMonth ? 'bg-zinc-100/50 pointer-events-none' : 'bg-white hover:bg-zinc-50/80'}
                        `"
                        :style="{
                            boxShadow: selectedDate && day.fullDate && selectedDate.toDateString() === day.fullDate.toDateString() 
                                ? 'inset 0 0 0 2px #000000' 
                                : '',
                            backgroundColor: day.isCurrentMonth 
                                ? (isToday(day.fullDate) 
                                    ? '#fafafa' 
                                    : (isWeekend(day.fullDate) ? '#fbfbfb' : 'white')) 
                                : '#f4f4f5'
                        }"
                    >
                        <div v-if="day.date" class="flex flex-col h-full justify-between">
                            <!-- Cell Header -->
                            <div class="flex justify-between items-center mb-1.5">
                                <span 
                                    :class="`
                                        text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-all
                                        ${isToday(day.fullDate) ? 'bg-black text-white shadow-sm' : 'text-zinc-600'}
                                        ${selectedDate && day.fullDate && selectedDate.toDateString() === day.fullDate.toDateString() && !isToday(day.fullDate) ? 'text-black font-extrabold ring-1 ring-zinc-400' : ''}
                                    `"
                                >
                                    {{ day.date }}
                                </span>
                                <div v-if="getEventsForDate(day.fullDate).length > 0" class="flex gap-0.5">
                                    <span 
                                        v-for="event in getEventsForDate(day.fullDate).slice(0, 3)" 
                                        :key="event.id"
                                        class="w-1.5 h-1.5 rounded-full"
                                        :style="{ backgroundColor: event.color }"
                                    ></span>
                                </div>
                            </div>
                            
                            <!-- Events list -->
                            <div class="flex-1 space-y-1 overflow-hidden min-h-[50px] flex flex-col justify-start">
                                <div 
                                    v-for="event in getEventsForDate(day.fullDate).slice(0, 2)" 
                                    :key="event.id"
                                    class="text-[9px] px-2 py-0.5 rounded-md truncate font-semibold flex items-center justify-between gap-1 transition-all border-l-2 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:brightness-95"
                                    :style="{ 
                                        backgroundColor: `${event.color}12`, 
                                        borderColor: event.color,
                                        color: '#18181b'
                                    }"
                                >
                                    <span class="truncate">{{ event.time ? formatSlotLabel(event.time).split(' – ')[0] + ' ' : '' }}{{ event.title }}</span>
                                    <span v-if="event.assignedTo" class="shrink-0 text-[7px] font-bold px-1 py-0.2 rounded bg-white/80 border border-zinc-200 text-zinc-500 font-mono">
                                        {{ getMemberInitials(event.assignedTo) }}
                                    </span>
                                </div>
                                <div v-if="getEventsForDate(day.fullDate).length > 2" class="text-[8px] pl-1 font-bold text-zinc-400 mt-0.5">
                                    +{{ getEventsForDate(day.fullDate).length - 2 }} rdv
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
                    <p v-if="selectedDate" class="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mt-2">
                        Créneaux de 1h · 07:00 – 21:00
                    </p>
                </div>

                <div class="flex-1 overflow-auto bg-white">
                    <div v-if="!selectedDate" class="h-full flex flex-col items-center justify-center text-center text-zinc-400 p-8">
                        <div class="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
                            <CalendarIcon class="text-zinc-300" :size="24" />
                        </div>
                        <p class="font-medium text-zinc-900 mb-1">Sélectionnez un jour</p>
                        <p class="text-xs">Choisissez une date pour poser un rendez-vous d'1h.</p>
                    </div>

                    <div v-else class="divide-y divide-zinc-100">
                        <button
                            v-for="slot in selectedDaySlots"
                            :key="slot.start"
                            type="button"
                            class="w-full text-left px-4 py-3 flex items-start gap-3 transition-colors"
                            :class="slot.event ? 'hover:bg-zinc-50' : 'hover:bg-zinc-50/80'"
                            @click="openSlot(slot)"
                        >
                            <div class="w-[88px] shrink-0 pt-0.5">
                                <div class="flex items-center gap-1 text-[11px] font-mono font-semibold text-zinc-500">
                                    <Clock :size="11" />
                                    {{ slot.start }}
                                </div>
                                <div class="text-[10px] text-zinc-400 font-mono pl-4">{{ slot.end }}</div>
                            </div>

                            <div
                                v-if="slot.event"
                                class="flex-1 min-w-0 border-l-2 pl-3 py-0.5"
                                :style="{ borderColor: slot.event.color }"
                            >
                                <div class="flex items-start justify-between gap-2">
                                    <div class="min-w-0">
                                        <p class="text-sm font-bold text-zinc-900 truncate">{{ slot.event.title }}</p>
                                        <p v-if="slot.event.assignedTo" class="text-[10px] text-zinc-500 mt-0.5 truncate">
                                            {{ getMemberName(slot.event.assignedTo) }}
                                        </p>
                                    </div>
                                    <div class="flex items-center gap-1 shrink-0">
                                        <button
                                            type="button"
                                            class="h-6 w-6 flex items-center justify-center text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-sm"
                                            @click.stop="openEditEventDialog(slot.event)"
                                        >
                                            <Edit2 :size="12" />
                                        </button>
                                        <button
                                            type="button"
                                            class="h-6 w-6 flex items-center justify-center text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-sm"
                                            @click.stop="deleteEvent(slot.event.id)"
                                        >
                                            <Trash2 :size="12" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div v-else class="flex-1 min-w-0 border border-dashed border-zinc-200 px-3 py-2 text-xs text-zinc-400">
                                Libre — cliquer pour fixer 1h
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Event Dialog -->
        <Dialog v-model:open="showEventDialog">
            <DialogContent class="sm:max-w-md rounded-2xl border-zinc-200/60 p-0 overflow-hidden shadow-2xl bg-white/95 backdrop-blur-xl animate-in zoom-in-95 duration-200">
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
                        <Input v-model="eventForm.title" required placeholder="Ex: Réunion client" class="rounded-xl border-zinc-300 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 bg-white text-black font-medium" />
                    </div>

                    <div class="space-y-1.5">
                        <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Date</label>
                        <Input 
                            v-model="eventForm.date"
                            type="date" 
                            required
                            class="rounded-xl border-zinc-300 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 bg-white text-black font-medium" 
                        />
                    </div>

                    <div class="space-y-1.5">
                        <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Alternante / Collaborateur</label>
                        <div class="relative">
                            <select 
                                v-model="eventForm.assignedTo" 
                                class="w-full px-3 py-2 text-sm border border-zinc-300 rounded-xl shadow-sm focus:border-zinc-950 outline-none appearance-none bg-white text-black font-medium"
                            >
                                <option value="">-- Non Assigné --</option>
                                <option v-for="member in teamMembers" :key="member.id" :value="member.id">
                                    {{ member.firstName }} {{ member.lastName }}
                                </option>
                            </select>
                            <div class="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-zinc-400">
                                <User :size="16" />
                            </div>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-1.5">
                            <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Créneau (1h)</label>
                            <select
                                v-model="eventForm.time"
                                required
                                class="w-full px-3 py-2 text-sm border border-zinc-300 rounded-xl shadow-sm focus:border-zinc-950 outline-none bg-white text-black font-medium"
                            >
                                <option v-for="slot in TIME_SLOTS" :key="slot.start" :value="slot.start">
                                    {{ slot.label }}
                                </option>
                            </select>
                        </div>
                        <div class="space-y-1.5">
                            <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Couleur</label>
                            <div class="h-10 border border-zinc-300 rounded-xl bg-white flex items-center px-1">
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
                            class="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:border-zinc-950 outline-none text-sm min-h-[100px] resize-none bg-white text-black font-medium"
                        ></textarea>
                    </div>

                    <div class="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="ghost" @click="showEventDialog = false" class="rounded-xl hover:bg-zinc-100 text-zinc-500">
                            Annuler
                        </Button>
                        <Button type="submit" class="bg-zinc-950 hover:bg-zinc-900 text-white rounded-xl min-w-[100px] shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]">
                            {{ editingEvent ? 'Enregistrer' : 'Créer' }}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>

        <!-- Customize Dialog -->
        <Dialog v-model:open="showCustomizeDialog">
            <DialogContent class="sm:max-w-md rounded-2xl border-zinc-200/60 shadow-2xl bg-white/95 backdrop-blur-xl p-6 animate-in zoom-in-95 duration-200">
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
                        <Button type="button" variant="outline" @click="showCustomizeDialog = false" class="rounded-xl border-zinc-200/80">Annuler</Button>
                        <Button type="submit" class="bg-zinc-950 hover:bg-zinc-900 text-white rounded-xl shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]">Sauvegarder</Button>
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

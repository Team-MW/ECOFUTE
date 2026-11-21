export type PeriodMode = 'month' | 'week' | 'day'

/** Monday 00:00 (local) of the week containing `date`. */
export const startOfWeek = (date: Date) => {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const offset = (d.getDay() + 6) % 7 // Monday = 0 … Sunday = 6
    d.setDate(d.getDate() - offset)
    return d
}

/** Sunday (local) of the week containing `date`. */
export const endOfWeek = (date: Date) => {
    const d = startOfWeek(date)
    d.setDate(d.getDate() + 6)
    return d
}

const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

/** True if `date` falls in the given period anchored on `ref`. */
export const isInPeriod = (date: Date, mode: PeriodMode, ref: Date) => {
    if (mode === 'day') return sameDay(date, ref)
    if (mode === 'week') {
        const start = startOfWeek(ref)
        const next = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7)
        return date >= start && date < next
    }
    return date.getFullYear() === ref.getFullYear() && date.getMonth() === ref.getMonth()
}

/** ISO 8601 week number. */
export const isoWeekNumber = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const day = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - day)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

/** e.g. "S47 · 16 – 22 nov. 2026" or "S1 · 29 déc. – 4 janv. 2027" */
export const weekLabel = (date: Date) => {
    const start = startOfWeek(date)
    const end = endOfWeek(date)
    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
    const startStr = sameMonth
        ? String(start.getDate())
        : start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', ...(start.getFullYear() !== end.getFullYear() ? { year: 'numeric' } : {}) })
    const endStr = end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    return `S${isoWeekNumber(date)} · ${startStr} – ${endStr}`
}

const SPECIAL_STATUSES = ['FERIAS', 'ATESTADO', 'FOLGA', 'TROCA_DE_ESCALA', 'FOLGA_FERIADO', 'FALTA']

export const FERIADO_SCHEDULE = { entrada: 8 * 60, saida: 20 * 60 }

export const getLocalDateStr = (isoString) => {
  const date = new Date(isoString)
  const tzOffset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - tzOffset).toISOString().split('T')[0]
}

const parseRange = (value) => {
  if (!value) return null
  const match = String(value).replace(/\s+/g, ' ').trim().match(/(\d{1,2}:\d{2})\s*(?:às|as|-|–|—)\s*(\d{1,2}:\d{2})/i)
  if (!match) return null
  const toMinutes = (time) => {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }
  return { entrada: toMinutes(match[1]), saida: toMinutes(match[2]) }
}

const parseSchedule = (value) => {
  const result = { semana: null, sabado: null, domingo: null }
  if (!value) return result

  String(value).split('|').map((part) => part.trim()).filter(Boolean).forEach((part) => {
    const lower = part.toLowerCase()
    if (lower.includes('segunda') || lower.includes('seg')) {
      result.semana = part.replace(/^(segunda a sexta|segundas? a sextas?|seg-sex|semana)\s*:\s*/i, '').trim()
    } else if (lower.includes('sábado') || lower.includes('sabado') || lower.includes('sab')) {
      result.sabado = part.replace(/^(sábado|sabado|sab)\s*:\s*/i, '').trim()
    } else if (lower.includes('domingo') || lower.includes('dom')) {
      result.domingo = part.replace(/^(domingo|dom)\s*:\s*/i, '').trim()
    } else if (!result.semana) {
      result.semana = part
    }
  })

  return result
}

export const getScheduleForDate = (dateString, storedSchedule, holiday) => {
  if (holiday?.status === 'CONFIRMADA') {
    if (!holiday.works) return null
    return FERIADO_SCHEDULE
  }

  const day = new Date(`${dateString}T00:00:00`).getDay()
  const schedule = parseSchedule(storedSchedule)
  if (day === 0 && schedule.domingo) return parseRange(schedule.domingo)
  if (day === 6 && schedule.sabado) return parseRange(schedule.sabado)
  return schedule.semana ? parseRange(schedule.semana) : null
}

export const getDayStatus = (records, dateString, schedule, holiday) => {
  const explicitStatus = [...SPECIAL_STATUSES]
    .map((status) => records.find((record) => record.tipo_registro === status))
    .find(Boolean)
  if (explicitStatus) return explicitStatus.tipo_registro
  if (holiday?.status === 'CONFIRMADA' && !holiday.works) return 'FOLGA_FERIADO'
  if (records.some((record) => ['ENTRADA', 'SAIDA'].includes(record.tipo_registro))) return null

  const day = new Date(`${dateString}T00:00:00`).getDay()
  if (day === 0 || day === 6) return 'FOLGA'
  return schedule ? 'FALTA' : null
}

export const calculateDay = ({ dateString, records, storedSchedule, holiday }) => {
  const schedule = getScheduleForDate(dateString, storedSchedule, holiday)
  const status = getDayStatus(records, dateString, schedule, holiday)
  const entries = records.filter((record) => record.tipo_registro === 'ENTRADA').sort((a, b) => new Date(a.registro_time) - new Date(b.registro_time))
  const exits = records.filter((record) => record.tipo_registro === 'SAIDA').sort((a, b) => new Date(a.registro_time) - new Date(b.registro_time))
  const entry = entries[0] ? new Date(entries[0].registro_time) : null
  const exit = exits[exits.length - 1] ? new Date(exits[exits.length - 1].registro_time) : null
  const realEntry = entry ? entry.getHours() * 60 + entry.getMinutes() : null
  const realExit = exit ? exit.getHours() * 60 + exit.getMinutes() : null
  const hoursExpected = schedule ? schedule.saida - schedule.entrada : 0
  const hoursWorked = realEntry !== null && realExit !== null && !status ? Math.max(0, realExit - realEntry) : 0

  return {
    schedule,
    status,
    realEntry,
    realExit,
    hoursExpected,
    hoursWorked,
    balance: hoursWorked - hoursExpected,
    entryDelay: realEntry !== null && schedule ? Math.max(0, realEntry - schedule.entrada) : 0,
    exitDifference: realExit !== null && schedule ? realExit - schedule.saida : 0
  }
}

export const formatMinutesClock = (minutes) => {
  if (minutes == null || Number.isNaN(minutes)) return '-'
  const rounded = Math.round(minutes)
  const sign = rounded < 0 ? '-' : ''
  const absolute = Math.abs(rounded)
  return `${sign}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')}`
}

export const formatMinutes = (minutes) => {
  if (minutes == null || Number.isNaN(minutes)) return '0:00'
  const sign = minutes < 0 ? '-' : ''
  const absolute = Math.abs(minutes)
  return `${sign}${Math.floor(absolute / 60)}:${String(absolute % 60).padStart(2, '0')}`
}

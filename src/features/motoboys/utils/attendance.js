const SPECIAL_STATUSES = ['FERIAS', 'ATESTADO', 'FOLGA', 'TROCA_DE_ESCALA', 'FOLGA_FERIADO', 'FALTA']
export const ATTENDANCE_TOLERANCE_MINUTES = 5

export const FERIADO_SCHEDULE = { entrada: 8 * 60, saida: 20 * 60 }

const getDefaultHolidaySchedule = () => FERIADO_SCHEDULE

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
    const manualSchedule = holiday.scheduleFor?.(holiday.motoboyId)
      || (holiday.horarioInicio && holiday.horarioFim
        ? { entrada: holiday.horarioInicio, saida: holiday.horarioFim }
        : null)
    return manualSchedule || getDefaultHolidaySchedule()
  }

  const day = new Date(`${dateString}T00:00:00`).getDay()
  const schedule = parseSchedule(storedSchedule)
  if (day === 0 && schedule.domingo) return parseRange(schedule.domingo)
  if (day === 6 && schedule.sabado) return parseRange(schedule.sabado)
  if (day === 0 || day === 6) return null
  return schedule.semana ? parseRange(schedule.semana) : null
}

export const getDayStatus = (records, dateString, schedule, holiday) => {
  const explicitStatus = [...SPECIAL_STATUSES]
    .map((status) => records.find((record) => record.tipo_registro === status))
    .find(Boolean)
  if (explicitStatus) return explicitStatus.tipo_registro
  if (holiday?.status === 'CONFIRMADA' && !holiday.works) return 'FOLGA_FERIADO'
  const hasEntry = records.some((record) => record.tipo_registro === 'ENTRADA')
  const hasExit = records.some((record) => record.tipo_registro === 'SAIDA')
  if (hasEntry !== hasExit) return 'REGISTRO_INCOMPLETO'
  if (hasEntry && hasExit) return null

  // Folga só é inferida quando existe marcação explícita ou quando o dia
  // não tem jornada prevista. Dia escalado sem ponto aguarda conferência.
  if (schedule) return 'PENDENTE_CONFERENCIA'
  const weekday = new Date(`${dateString}T00:00:00`).getDay()
  return weekday === 0 || weekday === 6 ? 'FOLGA' : 'SEM_ESCALA'
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
  // A troca é uma anotação explícita, não altera horas trabalhadas nem saldo.
  const statusAffectsHours = status && status !== 'TROCA_DE_ESCALA'
  const hoursWorked = realEntry !== null && realExit !== null && !statusAffectsHours ? Math.max(0, realExit - realEntry) : 0
  // Ausências (férias, atestado, folga, folga feriado) não afetam saldo nem
  // horas previstas: exibem apenas a situação visualmente, sem impacto no cálculo.
  const NAO_AFETAM_SALDO = [
    'PENDENTE_CONFERENCIA',
    'REGISTRO_INCOMPLETO',
    'FERIAS',
    'ATESTADO',
    'FOLGA',
    'FOLGA_FERIADO'
  ]
  const balance = NAO_AFETAM_SALDO.includes(status)
    ? null
    : hoursWorked - hoursExpected

  return {
    schedule,
    status,
    realEntry,
    realExit,
    hoursExpected,
    hoursWorked,
    balance,
    // Atrasos de até cinco minutos são tolerados e não entram no total.
    entryDelay: realEntry !== null && schedule
      ? Math.max(0, realEntry - schedule.entrada - ATTENDANCE_TOLERANCE_MINUTES)
      : 0,
    exitDifference: realExit !== null && schedule ? realExit - schedule.saida : 0
  }
}

export const getAttendanceStatusLabel = (status) => ({
  FERIAS: 'FÉRIAS',
  ATESTADO: 'ATESTADO',
  FOLGA: 'FOLGA',
  TROCA_DE_ESCALA: 'TROCA DE ESCALA',
  FOLGA_FERIADO: 'FOLGA FERIADO',
  FALTA: 'FALTA',
  PENDENTE_CONFERENCIA: 'PENDENTE DE CONFERÊNCIA',
  REGISTRO_INCOMPLETO: 'REGISTRO INCOMPLETO',
  SEM_ESCALA: 'SEM ESCALA'
}[status] || status || 'OK')

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

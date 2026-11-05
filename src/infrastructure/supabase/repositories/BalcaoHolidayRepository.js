import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_BALCAO_SUPABASE_URL
const anonKey = import.meta.env.VITE_BALCAO_SUPABASE_ANON_KEY || import.meta.env.VITE_BALCAO_SUPABASE_PUBLISHABLE_KEY
const balcaoClient = url && anonKey ? createClient(url, anonKey) : null

export const BalcaoHolidayRepository = {
  async getSchedules(startDate, endDate) {
    if (!balcaoClient) {
      console.warn('Integração de feriados indisponível: configure VITE_BALCAO_SUPABASE_URL e VITE_BALCAO_SUPABASE_ANON_KEY.')
      return []
    }

    const { data: holidays, error: holidayError } = await balcaoClient
      .from('feriados')
      .select('id, data, nome, ativo')
      .eq('ativo', true)
      .gte('data', startDate)
      .lte('data', endDate)
    if (holidayError) throw holidayError
    if (!holidays?.length) return []

    const holidayIds = holidays.map((holiday) => holiday.id)
    const { data: schedules, error: scheduleError } = await balcaoClient
      .from('escalas_feriados')
      .select('id, feriado_id, status, horario_inicio, horario_fim, updated_at')
      .in('feriado_id', holidayIds)
    if (scheduleError) throw scheduleError
    if (!schedules?.length) return []

    const scheduleIds = schedules.map((schedule) => schedule.id)
    const { data: members, error: memberError } = await balcaoClient
      .from('escala_feriados_membros')
      .select('escala_id, tipo_funcionario, motoboy_id, situacao, horario_inicio, horario_fim, updated_at')
      .in('escala_id', scheduleIds)
      .eq('tipo_funcionario', 'MOTOBOY')
    if (memberError) throw memberError

    return holidays.map((holiday) => {
      const schedule = schedules.find((item) => item.feriado_id === holiday.id)
      const holidayMembers = (members || []).filter((member) => member.escala_id === schedule?.id)
      return {
        ...holiday,
        status: schedule?.status || null,
        works: (motoboyId) => schedule?.status === 'CONFIRMADA'
          && holidayMembers.some((member) => member.motoboy_id === motoboyId && member.situacao === 'TRABALHA'),
        members: holidayMembers
      }
    })
  }
}

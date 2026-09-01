import React, { useEffect, useMemo, useState } from 'react'
import { Card } from '../../../shared/components/cards/Card'
import { Button } from '../../../shared/components/buttons/Button'
import { FileText, CalendarRange } from 'lucide-react'
import { SupabaseMotoboyRepository } from '../../../infrastructure/supabase/repositories/SupabaseMotoboyRepository'

const PERIOD_OPTIONS = [
  { value: 'SEMANAL', label: 'Semanal' },
  { value: 'MENSAL', label: 'Mensal' },
  { value: 'TRIMESTRAL', label: 'Trimestral' },
  { value: 'SEMESTRAL', label: 'Semestral' },
]

const getDatePart = (value) => {
  const date = new Date(`${value}T00:00:00`)
  return {
    year: date.getFullYear(),
    month: date.getMonth(),
    date: date.getDate(),
    day: date.getDay(),
    iso: date.toISOString().slice(0, 10),
  }
}

const parseHorario = (texto) => {
  if (!texto) return { semana: null, sabado: null, domingo: null }

  const padrao = { semana: null, sabado: null, domingo: null }
  const partes = String(texto).split('|').map((p) => p.trim()).filter(Boolean)

  partes.forEach((parte) => {
    const lower = parte.toLowerCase()
    if (lower.includes('segunda') || lower.includes('seg')) {
      padrao.semana = parte.replace(/^(segunda a sexta|segundas? a sextas?|seg-sex|semana)\s*:\s*/i, '').trim()
      return
    }
    if (lower.includes('sábado') || lower.includes('sabado') || lower.includes('sab')) {
      padrao.sabado = parte.replace(/^(sábado|sabado|sab)\s*:\s*/i, '').trim()
      return
    }
    if (lower.includes('domingo') || lower.includes('dom')) {
      padrao.domingo = parte.replace(/^(domingo|dom)\s*:\s*/i, '').trim()
      return
    }
    if (!padrao.semana) padrao.semana = parte.trim()
  })

  return padrao
}

const parseRange = (value) => {
  if (!value) return null
  const normalized = String(value).replace(/\s+/g, ' ').trim()
  const match = normalized.match(/(\d{1,2}:\d{2})\s*(?:às|as|-|–|—)\s*(\d{1,2}:\d{2})/i)
  if (!match) return null

  const toMinutes = (time) => {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  return {
    entrada: toMinutes(match[1]),
    saida: toMinutes(match[2]),
  }
}

const formatMinutesClock = (minutes) => {
  if (minutes == null || Number.isNaN(minutes)) return '-'
  const rounded = Math.round(minutes)
  const sign = rounded < 0 ? '-' : ''
  const absolute = Math.abs(rounded)
  const hours = Math.floor(absolute / 60)
  const mins = absolute % 60
  return `${sign}${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

const formatHours = (minutes) => {
  if (minutes == null || Number.isNaN(minutes)) return '0:00'
  const sign = minutes < 0 ? '-' : ''
  const absolute = Math.abs(minutes)
  const hours = Math.floor(absolute / 60)
  const mins = absolute % 60
  return `${sign}${hours}:${String(mins).padStart(2, '0')}`
}

const getShiftForDate = (dateString, schedule) => {
  const { day } = getDatePart(dateString)
  const scheduleByDay = parseHorario(schedule)

  if (day === 0 && scheduleByDay.domingo) return parseRange(scheduleByDay.domingo)
  if (day === 6 && scheduleByDay.sabado) return parseRange(scheduleByDay.sabado)
  if (scheduleByDay.semana) return parseRange(scheduleByDay.semana)
  return null
}

const isSpecialStatus = (records, statuses) => records.some((r) => statuses.includes(r.tipo_registro))

const getStartAndEndDate = (period, referenceDate) => {
  const ref = new Date(`${referenceDate}T00:00:00`)
  const start = new Date(ref)
  const end = new Date(ref)

  if (period === 'SEMANAL') {
    const day = ref.getDay()
    const diff = day === 0 ? -6 : 1 - day
    start.setDate(ref.getDate() + diff)
    end.setDate(start.getDate() + 6)
  }

  if (period === 'MENSAL') {
    start.setDate(1)
    end.setMonth(ref.getMonth() + 1, 0)
  }

  if (period === 'TRIMESTRAL') {
    const quarter = Math.floor(ref.getMonth() / 3)
    start.setMonth(quarter * 3, 1)
    end.setMonth(quarter * 3 + 2, 1)
    end.setMonth(end.getMonth() + 1, 0)
  }

  if (period === 'SEMESTRAL') {
    const semester = ref.getMonth() < 6 ? 0 : 6
    start.setMonth(semester, 1)
    end.setMonth(semester + 5, 1)
    end.setMonth(end.getMonth() + 1, 0)
  }

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

const buildDaysInRange = (start, end) => {
  const days = []
  const cursor = new Date(`${start}T00:00:00`)
  const until = new Date(`${end}T00:00:00`)

  while (cursor <= until) {
    days.push(cursor.toISOString().slice(0, 10))
    cursor.setDate(cursor.getDate() + 1)
  }

  return days
}

const getTimeValue = (dateIso) => new Date(`${dateIso}T00:00:00`).getDay()

export const MotoboyPayrollReport = ({ user, motoboys }) => {
  const [selectedMotoboy, setSelectedMotoboy] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState('SEMANAL')
  const [referenceDate, setReferenceDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [isLoading, setIsLoading] = useState(false)
  const [periodData, setPeriodData] = useState([])
  const [reportSummary, setReportSummary] = useState(null)

  useEffect(() => {
    if (!selectedMotoboy || !user?.store_id) {
      setPeriodData([])
      setReportSummary(null)
      return
    }

    const { start, end } = getStartAndEndDate(selectedPeriod, referenceDate)
    const load = async () => {
      setIsLoading(true)
      try {
        const records = await SupabaseMotoboyRepository.getTimeTracking(user.store_id, start, end)
        const targetMotoboy = motoboys.find((m) => m.id === selectedMotoboy)
        const days = buildDaysInRange(start, end)
        const rows = days.map((dayString) => {
          const dayRecords = records.filter((r) => r.motoboy_id === selectedMotoboy && String(r.registro_time).startsWith(dayString))
          const schedule = targetMotoboy ? getShiftForDate(dayString, targetMotoboy.horario_trabalho) : null

          const status = isSpecialStatus(dayRecords, ['FERIAS', 'ATESTADO', 'FOLGA'])
            ? (dayRecords.find((r) => r.tipo_registro === 'FERIAS') ? 'FÉRIAS' : dayRecords.find((r) => r.tipo_registro === 'ATESTADO') ? 'ATESTADO' : 'FOLGA')
            : (dayRecords.some((r) => r.tipo_registro === 'FALTA') ? 'FALTA' : null)

          const entradaRecords = dayRecords.filter((r) => r.tipo_registro === 'ENTRADA').sort((a, b) => new Date(a.registro_time) - new Date(b.registro_time))
          const saidaRecords = dayRecords.filter((r) => r.tipo_registro === 'SAIDA').sort((a, b) => new Date(a.registro_time) - new Date(b.registro_time))

          let scheduledEntry = schedule ? schedule.entrada : null
          let scheduledExit = schedule ? schedule.saida : null
          let realEntry = entradaRecords.length > 0 ? new Date(entradaRecords[0].registro_time).getHours() * 60 + new Date(entradaRecords[0].registro_time).getMinutes() : null
          let realExit = saidaRecords.length > 0 ? new Date(saidaRecords[saidaRecords.length - 1].registro_time).getHours() * 60 + new Date(saidaRecords[saidaRecords.length - 1].registro_time).getMinutes() : null

          const previstoMinutos = schedule ? (scheduledExit - scheduledEntry) : 0
          const trabalhadasMinutos = realEntry !== null && realExit !== null ? Math.max(0, realExit - realEntry) : 0
          const atrasoEntrada = realEntry !== null && scheduledEntry !== null ? Math.max(0, realEntry - scheduledEntry) : 0
          const diferencaSaida = realExit !== null && scheduledExit !== null ? realExit - scheduledExit : 0

          return {
            date: dayString,
            diaSemana: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][getTimeValue(dayString)],
            status,
            previstoEntrada: scheduledEntry != null ? `${String(Math.floor(scheduledEntry / 60)).padStart(2, '0')}:${String(scheduledEntry % 60).padStart(2, '0')}` : '-',
            realEntrada: realEntry != null ? `${String(Math.floor(realEntry / 60)).padStart(2, '0')}:${String(realEntry % 60).padStart(2, '0')}` : '-',
            atrasoEntrada,
            previstoSaida: scheduledExit != null ? `${String(Math.floor(scheduledExit / 60)).padStart(2, '0')}:${String(scheduledExit % 60).padStart(2, '0')}` : '-',
            realSaida: realExit != null ? `${String(Math.floor(realExit / 60)).padStart(2, '0')}:${String(realExit % 60).padStart(2, '0')}` : '-',
            diferencaSaida,
            horasPrevistas: previstoMinutos,
            horasTrabalhadas: status ? 0 : trabalhadasMinutos,
            totalHorasDia: status ? 0 : trabalhadasMinutos,
            statusText: status || (entradaRecords.length || saidaRecords.length ? 'OK' : 'FALTA')
          }
        })

        const totalPrevistas = rows.reduce((sum, row) => sum + row.horasPrevistas, 0)
        const totalTrabalhadas = rows.reduce((sum, row) => sum + row.horasTrabalhadas, 0)
        const residual = totalPrevistas - totalTrabalhadas
        const totalAtrasoEntrada = rows.reduce((sum, row) => sum + row.atrasoEntrada, 0)
        const totalDiferencaSaida = rows.reduce((sum, row) => sum + row.diferencaSaida, 0)

        setPeriodData(rows)
        setReportSummary({
          totalPrevistas,
          totalTrabalhadas,
          diferenca: residual,
          atrasoEntrada: totalAtrasoEntrada,
          diferencaSaida: totalDiferencaSaida,
        })
      } catch (error) {
        alert('Erro ao carregar relatório: ' + error.message)
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [selectedMotoboy, selectedPeriod, referenceDate, user, motoboys])

  const weekGroups = useMemo(() => {
    const grouped = {}
    periodData.forEach((row) => {
      const start = new Date(`${row.date}T00:00:00`)
      const day = start.getDay()
      const diff = day === 0 ? -6 : 1 - day
      const weekStart = new Date(start)
      weekStart.setDate(start.getDate() + diff)
      const key = weekStart.toISOString().slice(0, 10)
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(row)
    })
    return Object.entries(grouped).map(([key, rows]) => ({ key, rows, total: rows.reduce((sum, row) => sum + row.horasTrabalhadas, 0) }))
  }, [periodData])

  return (
    <Card title="Relatórios & Pagamentos" icon={FileText}>
      <div style={{ display: 'grid', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'end', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ minWidth: '220px', flex: 1 }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Motoboy</label>
            <select className="input-field" value={selectedMotoboy} onChange={(e) => setSelectedMotoboy(e.target.value)} style={{ width: '100%' }}>
              <option value="">Selecione...</option>
              {motoboys.map((motoboy) => (
                <option key={motoboy.id} value={motoboy.id}>{motoboy.nome}</option>
              ))}
            </select>
          </div>

          <div style={{ minWidth: '180px', flex: 1 }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Período</label>
            <select className="input-field" value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} style={{ width: '100%' }}>
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div style={{ minWidth: '180px', flex: 1 }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Referência</label>
            <input type="date" className="input-field" value={referenceDate} onChange={(e) => setReferenceDate(e.target.value)} style={{ width: '100%' }} />
          </div>
        </div>

        {selectedMotoboy && reportSummary && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Horas previstas</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '4px' }}>{formatHours(reportSummary.totalPrevistas)}</div>
            </div>
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Horas efetivas</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '4px' }}>{formatHours(reportSummary.totalTrabalhadas)}</div>
            </div>
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Diferença</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '4px' }}>{formatHours(reportSummary.diferenca)}</div>
            </div>
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Atraso entrada</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '4px' }}>{formatMinutesClock(reportSummary.atrasoEntrada)}</div>
            </div>
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Saída</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '4px' }}>{formatMinutesClock(reportSummary.diferencaSaida)}</div>
            </div>
          </div>
        )}

        {isLoading && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Carregando relatório...</div>
        )}

        {!isLoading && selectedMotoboy && weekGroups.length > 0 && (
          <div style={{ display: 'grid', gap: '18px' }}>
            {weekGroups.map((group) => (
              <div key={group.key} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ backgroundColor: '#f8fafc', padding: '12px 16px', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0' }}>
                  Semana de {group.key} • Total: {formatHours(group.total)}
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc' }}>
                        <th style={{ border: '1px solid #e2e8f0', padding: '8px', textAlign: 'left' }}>Data</th>
                        <th style={{ border: '1px solid #e2e8f0', padding: '8px', textAlign: 'left' }}>Prev. entrada</th>
                        <th style={{ border: '1px solid #e2e8f0', padding: '8px', textAlign: 'left' }}>Real entrada</th>
                        <th style={{ border: '1px solid #e2e8f0', padding: '8px', textAlign: 'left' }}>Atraso entrada</th>
                        <th style={{ border: '1px solid #e2e8f0', padding: '8px', textAlign: 'left' }}>Prev. saída</th>
                        <th style={{ border: '1px solid #e2e8f0', padding: '8px', textAlign: 'left' }}>Real saída</th>
                        <th style={{ border: '1px solid #e2e8f0', padding: '8px', textAlign: 'left' }}>Diferença saída</th>
                        <th style={{ border: '1px solid #e2e8f0', padding: '8px', textAlign: 'left' }}>Total dia</th>
                        <th style={{ border: '1px solid #e2e8f0', padding: '8px', textAlign: 'left' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.rows.map((row) => (
                        <tr key={row.date}>
                          <td style={{ border: '1px solid #e2e8f0', padding: '8px' }}>{row.date} ({row.diaSemana})</td>
                          <td style={{ border: '1px solid #e2e8f0', padding: '8px' }}>{row.previstoEntrada}</td>
                          <td style={{ border: '1px solid #e2e8f0', padding: '8px' }}>{row.realEntrada}</td>
                          <td style={{ border: '1px solid #e2e8f0', padding: '8px' }}>{formatMinutesClock(row.atrasoEntrada)}</td>
                          <td style={{ border: '1px solid #e2e8f0', padding: '8px' }}>{row.previstoSaida}</td>
                          <td style={{ border: '1px solid #e2e8f0', padding: '8px' }}>{row.realSaida}</td>
                          <td style={{ border: '1px solid #e2e8f0', padding: '8px' }}>{formatMinutesClock(row.diferencaSaida)}</td>
                          <td style={{ border: '1px solid #e2e8f0', padding: '8px' }}>{formatHours(row.totalHorasDia)}</td>
                          <td style={{ border: '1px solid #e2e8f0', padding: '8px' }}>{row.status || row.statusText}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && selectedMotoboy && periodData.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Nenhum dado encontrado para o período selecionado.</div>
        )}
      </div>
    </Card>
  )
}

import React, { useEffect, useMemo, useState } from 'react'
import { Card } from '../../../shared/components/cards/Card'
import { Button } from '../../../shared/components/buttons/Button'
import { FileBarChart, Download, Users } from 'lucide-react'
import { SupabaseMotoboyRepository } from '../../../infrastructure/supabase/repositories/SupabaseMotoboyRepository'
import { generateGeneralReportPdf } from '../../../core/utils/pdfGenerator'

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

const formatMinutes = (minutes) => {
  if (minutes == null || Number.isNaN(minutes)) return '0:00'
  const sign = minutes < 0 ? '-' : ''
  const absolute = Math.abs(minutes)
  const h = Math.floor(absolute / 60)
  const m = absolute % 60
  return `${sign}${h}:${String(m).padStart(2, '0')}`
}

const formatMinutesClock = (minutes) => {
  if (minutes == null || Number.isNaN(minutes)) return '-'
  const sign = minutes < 0 ? '-' : ''
  const absolute = Math.abs(minutes)
  const h = Math.floor(absolute / 60)
  const m = absolute % 60
  return `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const parseHorario = (texto) => {
  if (!texto) return { semana: null, sabado: null, domingo: null }
  const padrao = { semana: null, sabado: null, domingo: null }
  const partes = String(texto).split('|').map(p => p.trim()).filter(Boolean)
  partes.forEach((parte) => {
    const lower = parte.toLowerCase()
    if (lower.includes('segunda') || lower.includes('seg')) {
      padrao.semana = parte.replace(/^(segunda a sexta|segundas? a sextas?|seg-sex|semana)\s*:\s*/i, '').trim()
    } else if (lower.includes('sabado') || lower.includes('sábado') || lower.includes('sab')) {
      padrao.sabado = parte.replace(/^(sabado|sábado|sab)\s*:\s*/i, '').trim()
    } else if (lower.includes('domingo') || lower.includes('dom')) {
      padrao.domingo = parte.replace(/^(domingo|dom)\s*:\s*/i, '').trim()
    } else if (!padrao.semana) {
      padrao.semana = parte.trim()
    }
  })
  return padrao
}

const parseRange = (value) => {
  if (!value) return null
  const normalized = String(value).replace(/\s+/g, ' ').trim()
  const match = normalized.match(/(\d{1,2}:\d{2})\s*(?:às|as|-|–|—)\s*(\d{1,2}:\d{2})/i)
  if (!match) return null
  const toMinutes = (time) => { const [h, m] = time.split(':').map(Number); return h * 60 + m }
  return { entrada: toMinutes(match[1]), saida: toMinutes(match[2]) }
}

const getShiftForDate = (dateString, schedule) => {
  const date = new Date(`${dateString}T00:00:00`)
  const day = date.getDay()
  const scheduleByDay = parseHorario(schedule)
  if (day === 0 && scheduleByDay.domingo) return parseRange(scheduleByDay.domingo)
  if (day === 6 && scheduleByDay.sabado) return parseRange(scheduleByDay.sabado)
  if (scheduleByDay.semana) return parseRange(scheduleByDay.semana)
  return null
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

export const MotoboyGeneralReport = ({ user, motoboys }) => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [isLoading, setIsLoading] = useState(false)
  const [summaryByMotoboy, setSummaryByMotoboy] = useState([])
  const [isExportingPdf, setIsExportingPdf] = useState(false)

  useEffect(() => {
    if (!user?.store_id || motoboys.length === 0) return

    const load = async () => {
      setIsLoading(true)
      try {
        const [year, month] = selectedMonth.split('-')
        const startOfMonth = `${year}-${month}-01`
        const lastDay = new Date(year, month, 0).getDate()
        const endOfMonth = `${year}-${month}-${lastDay}`

        const records = await SupabaseMotoboyRepository.getTimeTracking(user.store_id, startOfMonth, endOfMonth)
        const days = buildDaysInRange(startOfMonth, endOfMonth)

        const summaries = motoboys.map(motoboy => {
          const motoboyRecords = records.filter(r => r.motoboy_id === motoboy.id)

          const dayRows = days.map(dayStr => {
            const dayRecords = motoboyRecords.filter(r => r.registro_time && r.registro_time.startsWith(dayStr))
            const schedule = getShiftForDate(dayStr, motoboy.horario_trabalho)

            const specialStatus = dayRecords.find(r => ['FERIAS','ATESTADO','FOLGA','TROCA_DE_ESCALA','FOLGA_FERIADO','FALTA'].includes(r.tipo_registro))
            const dia = new Date(`${dayStr}T00:00:00`).getDay()
            const hasWorkRecords = dayRecords.some(r => ['ENTRADA','SAIDA'].includes(r.tipo_registro))

            let status = null
            if (specialStatus) {
              status = { FERIAS: 'FERIAS', ATESTADO: 'ATESTADO', FOLGA: 'FOLGA', TROCA_DE_ESCALA: 'TROCA DE ESCALA', FOLGA_FERIADO: 'FOLGA FERIADO', FALTA: 'FALTA' }[specialStatus.tipo_registro]
            } else if (!hasWorkRecords && (dia === 0 || dia === 6)) {
              status = 'FOLGA'
            } else if (!hasWorkRecords && schedule) {
              status = 'FALTA'
            }

            const entradaRecords = dayRecords.filter(r => r.tipo_registro === 'ENTRADA').sort((a, b) => new Date(a.registro_time) - new Date(b.registro_time))
            const saidaRecords = dayRecords.filter(r => r.tipo_registro === 'SAIDA').sort((a, b) => new Date(a.registro_time) - new Date(b.registro_time))

            const scheduledEntry = schedule ? schedule.entrada : null
            const scheduledExit = schedule ? schedule.saida : null
            const realEntry = entradaRecords.length > 0 ? new Date(entradaRecords[0].registro_time).getHours() * 60 + new Date(entradaRecords[0].registro_time).getMinutes() : null
            const realExit = saidaRecords.length > 0 ? new Date(saidaRecords[saidaRecords.length - 1].registro_time).getHours() * 60 + new Date(saidaRecords[saidaRecords.length - 1].registro_time).getMinutes() : null

            const horasPrevistas = schedule ? (scheduledExit - scheduledEntry) : 0
            const horasTrabalhadas = (realEntry !== null && realExit !== null && !status) ? Math.max(0, realExit - realEntry) : 0
            const atrasoEntrada = realEntry !== null && scheduledEntry !== null ? Math.max(0, realEntry - scheduledEntry) : 0

            return {
              date: dayStr,
              diaSemana: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'][new Date(`${dayStr}T00:00:00`).getDay()],
              previstoEntrada: scheduledEntry != null ? `${String(Math.floor(scheduledEntry / 60)).padStart(2, '0')}:${String(scheduledEntry % 60).padStart(2, '0')}` : '-',
              realEntrada: realEntry != null ? `${String(Math.floor(realEntry / 60)).padStart(2, '0')}:${String(realEntry % 60).padStart(2, '0')}` : '-',
              previstoSaida: scheduledExit != null ? `${String(Math.floor(scheduledExit / 60)).padStart(2, '0')}:${String(scheduledExit % 60).padStart(2, '0')}` : '-',
              realSaida: realExit != null ? `${String(Math.floor(realExit / 60)).padStart(2, '0')}:${String(realExit % 60).padStart(2, '0')}` : '-',
              horasPrevistas,
              horasTrabalhadas,
              atrasoEntrada,
              statusText: status || (hasWorkRecords ? 'OK' : 'FALTA')
            }
          })

          const totalPrevistas = dayRows.reduce((s, r) => s + r.horasPrevistas, 0)
          const totalTrabalhadas = dayRows.reduce((s, r) => s + r.horasTrabalhadas, 0)
          const totalAtrasos = dayRows.reduce((s, r) => s + r.atrasoEntrada, 0)

          return {
            id: motoboy.id,
            nome: motoboy.nome,
            horasPrevistas: totalPrevistas,
            horasTrabalhadas: totalTrabalhadas,
            diferenca: totalPrevistas - totalTrabalhadas,
            totalAtrasos,
            days: dayRows
          }
        })

        setSummaryByMotoboy(summaries)
      } catch (err) {
        alert('Erro ao carregar relatorio geral: ' + err.message)
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [selectedMonth, user, motoboys])

  const totalGeral = useMemo(() => {
    return summaryByMotoboy.reduce((acc, m) => ({
      previstas: acc.previstas + m.horasPrevistas,
      trabalhadas: acc.trabalhadas + m.horasTrabalhadas,
      atrasos: acc.atrasos + m.totalAtrasos,
    }), { previstas: 0, trabalhadas: 0, atrasos: 0 })
  }, [summaryByMotoboy])

  const handleExportPdf = async () => {
    if (summaryByMotoboy.length === 0) return
    setIsExportingPdf(true)
    try {
      await generateGeneralReportPdf({ motoboys, month: selectedMonth, summaryByMotoboy })
    } catch (err) {
      alert('Erro ao gerar PDF: ' + err.message)
    } finally {
      setIsExportingPdf(false)
    }
  }

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <Card title="Relatorio Geral de Todos os Motoboys" icon={Users}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'end', flexWrap: 'wrap', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ minWidth: '200px', flex: 1 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--color-text-main)', display: 'block', marginBottom: '8px' }}>Mes/Ano</label>
            <input type="month" className="input-field" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={{ width: '100%' }} />
          </div>
          <div>
            <Button onClick={handleExportPdf} isLoading={isExportingPdf} icon={Download} style={{ backgroundColor: '#7c3aed', border: 'none' }}>Exportar PDF Geral</Button>
          </div>
        </div>

        {!isLoading && summaryByMotoboy.length > 0 && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginTop: '20px' }}>
              <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', padding: '14px' }}>
                <div style={{ fontSize: '0.8rem', color: '#166534', textTransform: 'uppercase' }}>Total Horas Previstas</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '4px', color: '#166534' }}>{formatMinutes(totalGeral.previstas)}</div>
              </div>
              <div style={{ backgroundColor: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '10px', padding: '14px' }}>
                <div style={{ fontSize: '0.8rem', color: '#1e40af', textTransform: 'uppercase' }}>Total Horas Trabalhadas</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '4px', color: '#1e40af' }}>{formatMinutes(totalGeral.trabalhadas)}</div>
              </div>
              <div style={{ backgroundColor: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '10px', padding: '14px' }}>
                <div style={{ fontSize: '0.8rem', color: '#92400e', textTransform: 'uppercase' }}>Diferenca Total</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '4px', color: '#92400e' }}>{formatMinutes(totalGeral.previstas - totalGeral.trabalhadas)}</div>
              </div>
              <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '14px' }}>
                <div style={{ fontSize: '0.8rem', color: '#991b1b', textTransform: 'uppercase' }}>Total Atrasos</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '4px', color: '#991b1b' }}>{formatMinutes(totalGeral.atrasos)}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '18px', marginTop: '20px' }}>
              {summaryByMotoboy.map((m) => (
                <div key={m.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                  <div style={{ backgroundColor: '#f8fafc', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
                    <strong style={{ color: 'var(--color-primary)' }}>{m.nome}</strong>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem' }}>
                      <span>Previsto: <strong>{formatMinutes(m.horasPrevistas)}</strong></span>
                      <span>Trabalhado: <strong>{formatMinutes(m.horasTrabalhadas)}</strong></span>
                      <span style={{ color: m.diferenca > 0 ? '#dc2626' : '#16a34a' }}>Diff: <strong>{formatMinutes(m.diferenca)}</strong></span>
                    </div>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc' }}>
                          <th style={{ border: '1px solid #e2e8f0', padding: '6px', textAlign: 'left' }}>Data</th>
                          <th style={{ border: '1px solid #e2e8f0', padding: '6px', textAlign: 'left' }}>Prev. Ent</th>
                          <th style={{ border: '1px solid #e2e8f0', padding: '6px', textAlign: 'left' }}>Real Ent</th>
                          <th style={{ border: '1px solid #e2e8f0', padding: '6px', textAlign: 'left' }}>Prev. Sai</th>
                          <th style={{ border: '1px solid #e2e8f0', padding: '6px', textAlign: 'left' }}>Real Sai</th>
                          <th style={{ border: '1px solid #e2e8f0', padding: '6px', textAlign: 'left' }}>Horas</th>
                          <th style={{ border: '1px solid #e2e8f0', padding: '6px', textAlign: 'left' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {m.days.map((d) => (
                          <tr key={d.date}>
                            <td style={{ border: '1px solid #e2e8f0', padding: '6px' }}>{formatDate(d.date)} ({d.diaSemana})</td>
                            <td style={{ border: '1px solid #e2e8f0', padding: '6px' }}>{d.previstoEntrada}</td>
                            <td style={{ border: '1px solid #e2e8f0', padding: '6px' }}>{d.realEntrada}</td>
                            <td style={{ border: '1px solid #e2e8f0', padding: '6px' }}>{d.previstoSaida}</td>
                            <td style={{ border: '1px solid #e2e8f0', padding: '6px' }}>{d.realSaida}</td>
                            <td style={{ border: '1px solid #e2e8f0', padding: '6px' }}>{formatMinutes(d.horasTrabalhadas)}</td>
                            <td style={{ border: '1px solid #e2e8f0', padding: '6px', color: d.statusText === 'OK' ? '#16a34a' : d.statusText === 'FALTA' ? '#dc2626' : '#d97706' }}>{d.statusText}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {isLoading && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Carregando relatorio geral...</div>
        )}

        {!isLoading && summaryByMotoboy.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Nenhum dado encontrado para o mes selecionado.</div>
        )}
      </Card>
    </div>
  )
}

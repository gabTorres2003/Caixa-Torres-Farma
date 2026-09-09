import React from 'react'
import { pdf } from '@react-pdf/renderer'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: '15mm 12mm', fontSize: 10, fontFamily: 'Helvetica' },
  title: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 12, textTransform: 'uppercase' },
  subtitle: { fontSize: 11, fontWeight: 'bold', textAlign: 'center', marginBottom: 8, color: '#444' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, fontSize: 9, fontWeight: 'bold' },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHeader: { backgroundColor: '#f0f0f0', fontWeight: 'bold', textTransform: 'uppercase', fontSize: 8 },
  tableRow: { flexDirection: 'row', borderBottom: '0.5px solid #ccc' },
  cell: { padding: '4px 3px', fontSize: 8, borderRight: '0.5px solid #ddd', flexGrow: 1 },
  cellBold: { padding: '4px 3px', fontSize: 8, fontWeight: 'bold', borderRight: '0.5px solid #ddd', flexGrow: 1 },
  cellWide: { padding: '4px 3px', fontSize: 8, borderRight: '0.5px solid #ddd', flexGrow: 2 },
  summaryCard: { border: '1px solid #ddd', borderRadius: 4, padding: 8, marginBottom: 6 },
  summaryLabel: { fontSize: 7, color: '#666', textTransform: 'uppercase' },
  summaryValue: { fontSize: 14, fontWeight: 'bold', marginTop: 2 },
  signatureBox: { marginTop: 30, alignItems: 'center' },
  signatureLine: { width: '60%', borderBottom: '1px solid #000', height: 1 },
  signatureText: { fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase', marginTop: 4 },
})

const formatMinutes = (minutes) => {
  if (minutes == null || Number.isNaN(minutes)) return '-'
  const sign = minutes < 0 ? '-' : ''
  const absolute = Math.abs(minutes)
  const h = Math.floor(absolute / 60)
  const m = absolute % 60
  return `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

export const generateMotoboyPdf = async (reportData) => {
  const [year, month] = reportData.month.split('-')
  const nomeMes = ['JANEIRO','FEVEREIRO','MARCO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'][parseInt(month) - 1]
  const diasNoMes = new Date(year, month, 0).getDate()

  const parseHorario = (texto) => {
    if (!texto) return { semana: '', sabado: '', domingo: '' }
    const padrao = { semana: '', sabado: '', domingo: '' }
    const partes = String(texto).split('|').map(p => p.trim()).filter(Boolean)
    partes.forEach((parte) => {
      const lower = parte.toLowerCase()
      if (lower.includes('segunda') || lower.includes('seg') || lower.includes('semana')) {
        padrao.semana = parte.replace(/^(segunda a sexta|segundas? a sextas?|seg-sex|semana)\s*:\s*/i, '').trim()
      } else if (lower.includes('sabado') || lower.includes('sab')) {
        padrao.sabado = parte.replace(/^(sabado|sab)\s*:\s*/i, '').trim()
      } else if (lower.includes('domingo') || lower.includes('dom')) {
        padrao.domingo = parte.replace(/^(domingo|dom)\s*:\s*/i, '').trim()
      } else if (!padrao.semana) {
        padrao.semana = parte.trim()
      }
    })
    return padrao
  }

  const horarios = parseHorario(reportData.motoboy.horario_trabalho)
  const horarioResumo = horarios.semana ? `SEG-SEX: ${horarios.semana}` : 'NAO INFORMADO'

  const rows = []
  for (let i = 1; i <= diasNoMes; i++) {
    const dayStr = `${year}-${month}-${String(i).padStart(2, '0')}`
    const dayRecords = reportData.timeRecords.filter(t => t.registro_time && t.registro_time.startsWith(dayStr))
    const entradas = dayRecords.filter(t => t.tipo_registro === 'ENTRADA').sort((a, b) => new Date(a.registro_time) - new Date(b.registro_time))
    const saidas = dayRecords.filter(t => t.tipo_registro === 'SAIDA').sort((a, b) => new Date(a.registro_time) - new Date(b.registro_time))
    const special = dayRecords.find(r => ['FERIAS','ATESTADO','FOLGA','TROCA_DE_ESCALA','FOLGA_FERIADO','FALTA'].includes(r.tipo_registro))

    let entradaTime = '-'
    let saidaTime = '-'

    if (special) {
      const label = { FERIAS: 'FERIAS', ATESTADO: 'ATESTADO', FOLGA: 'FOLGA', TROCA_DE_ESCALA: 'TROCA DE ESCALA', FOLGA_FERIADO: 'FOLGA FERIADO', FALTA: 'FALTA' }[special.tipo_registro]
      entradaTime = label
      saidaTime = label
    } else {
      if (entradas.length > 0) entradaTime = new Date(entradas[0].registro_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      if (saidas.length > 0) saidaTime = new Date(saidas[saidas.length - 1].registro_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      if (entradaTime === '-' && saidaTime === '-') {
        const dia = new Date(`${dayStr}T00:00:00`).getDay()
        if (dia === 0 || dia === 6) { entradaTime = 'FOLGA'; saidaTime = 'FOLGA' }
        else { entradaTime = 'FALTA'; saidaTime = 'FALTA' }
      }
    }

    rows.push({ day: i, entrada: entradaTime, saida: saidaTime })
  }

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>FOLHA DE PONTO</Text>
        <View style={styles.headerRow}>
          <Text>MOTOBOY: {reportData.motoboy.nome}</Text>
          <Text>MES: {nomeMes} {year}</Text>
          <Text>HORARIO: {horarioResumo}</Text>
        </View>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.cellBold, { width: '10%' }]}>DIA</Text>
            <Text style={[styles.cellWide, { width: '45%' }]}>ENTRADA</Text>
            <Text style={[styles.cellWide, { width: '45%' }]}>SAIDA</Text>
          </View>
          {rows.map((row) => (
            <View key={row.day} style={styles.tableRow}>
              <Text style={[styles.cellBold, { width: '10%' }]}>{row.day}</Text>
              <Text style={[styles.cellWide, { width: '45%' }]}>{row.entrada}</Text>
              <Text style={[styles.cellWide, { width: '45%' }]}>{row.saida}</Text>
            </View>
          ))}
        </View>
        <View style={styles.signatureBox}>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureText}>Assinatura</Text>
        </View>
      </Page>
    </Document>
  )

  const blob = await pdf(doc).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `folha-ponto-${reportData.motoboy.nome.replace(/\s+/g, '-')}-${nomeMes}-${year}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

export const generateGeneralReportPdf = async (generalData) => {
  const { motoboys, month, summaryByMotoboy } = generalData
  const [year, monthNum] = month.split('-')
  const nomeMes = ['JANEIRO','FEVEREIRO','MARCO','ABRIL','MAIO','JUNHO','JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO'][parseInt(monthNum) - 1]

  const doc = (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>RELATORIO GERAL DE MOTOBOYS</Text>
        <Text style={styles.subtitle}>{nomeMes} {year}</Text>

        {summaryByMotoboy.map((m) => (
          <View key={m.id} style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 4 }}>{m.nome}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Previstas</Text>
                <Text style={styles.summaryValue}>{formatMinutes(m.horasPrevistas)}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Trabalhadas</Text>
                <Text style={styles.summaryValue}>{formatMinutes(m.horasTrabalhadas)}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Diferenca</Text>
                <Text style={styles.summaryValue}>{formatMinutes(m.diferenca)}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Atrasos</Text>
                <Text style={styles.summaryValue}>{formatMinutes(m.totalAtrasos)}</Text>
              </View>
            </View>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.cell, { width: '8%' }]}>DATA</Text>
                <Text style={[styles.cell, { width: '8%' }]}>DIA</Text>
                <Text style={[styles.cell, { width: '12%' }]}>PREV. ENT</Text>
                <Text style={[styles.cell, { width: '12%' }]}>REAL ENT</Text>
                <Text style={[styles.cell, { width: '12%' }]}>PREV. SAI</Text>
                <Text style={[styles.cell, { width: '12%' }]}>REAL SAI</Text>
                <Text style={[styles.cell, { width: '10%' }]}>HORAS</Text>
                <Text style={[styles.cell, { width: '14%' }]}>STATUS</Text>
              </View>
              {m.days.map((d) => (
                <View key={d.date} style={styles.tableRow}>
                  <Text style={[styles.cell, { width: '8%' }]}>{formatDate(d.date)}</Text>
                  <Text style={[styles.cell, { width: '8%' }]}>{d.diaSemana.slice(0, 3)}</Text>
                  <Text style={[styles.cell, { width: '12%' }]}>{d.previstoEntrada}</Text>
                  <Text style={[styles.cell, { width: '12%' }]}>{d.realEntrada}</Text>
                  <Text style={[styles.cell, { width: '12%' }]}>{d.previstoSaida}</Text>
                  <Text style={[styles.cell, { width: '12%' }]}>{d.realSaida}</Text>
                  <Text style={[styles.cell, { width: '10%' }]}>{formatMinutes(d.horasTrabalhadas)}</Text>
                  <Text style={[styles.cell, { width: '14%' }]}>{d.statusText}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </Page>
    </Document>
  )

  const blob = await pdf(doc).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `relatorio-geral-motoboys-${nomeMes}-${year}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

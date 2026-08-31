import React, { useState } from 'react'
import { Card } from '../../../shared/components/cards/Card'
import { Button } from '../../../shared/components/buttons/Button'
import { FileBarChart, Printer } from 'lucide-react'
import { SupabaseMotoboyRepository } from '../../../infrastructure/supabase/repositories/SupabaseMotoboyRepository'

export const MotoboyReports = ({ user, motoboys }) => {
  const [selectedMotoboy, setSelectedMotoboy] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })
  
  const [reportData, setReportData] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const getNomeMes = (mesIndex) => {
    const meses = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
    return meses[mesIndex];
  }

  const parseHorarioTrabalho = (texto) => {
    if (!texto) return { semana: '', sabado: '', domingo: '' }

    const padrao = { semana: '', sabado: '', domingo: '' }
    const partes = String(texto).split('|').map(p => p.trim()).filter(Boolean)

    partes.forEach((parte) => {
      const lower = parte.toLowerCase()
      if (lower.includes('segunda') || lower.includes('seg') || lower.includes('semana')) {
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

  const getHorarioResumo = (texto) => {
    const horarios = parseHorarioTrabalho(texto)
    const partes = []
    if (horarios.semana) partes.push(`SEG-SEX: ${horarios.semana}`)
    if (horarios.sabado) partes.push(`SÁB: ${horarios.sabado}`)
    if (horarios.domingo) partes.push(`DOM: ${horarios.domingo}`)
    return partes.length > 0 ? partes.join(' | ') : 'NÃO INFORMADO'
  }

  const getHorarioDoDia = (dateString, texto) => {
    const horarios = parseHorarioTrabalho(texto)
    const dia = new Date(`${dateString}T00:00:00`).getDay()

    if (dia === 0 && horarios.domingo) return horarios.domingo
    if (dia === 6 && horarios.sabado) return horarios.sabado
    if (horarios.semana) return horarios.semana
    return horarios.semana || horarios.sabado || horarios.domingo || 'NÃO INFORMADO'
  }

  const obterStatusDoDia = (dayString, recordsOfDay) => {
    if (recordsOfDay.some(r => r.tipo_registro === 'FERIAS')) return 'FÉRIAS'
    if (recordsOfDay.some(r => r.tipo_registro === 'ATESTADO')) return 'ATESTADO'
    if (recordsOfDay.some(r => r.tipo_registro === 'FOLGA')) return 'FOLGA'
    if (recordsOfDay.some(r => r.tipo_registro === 'ENTRADA' || r.tipo_registro === 'SAIDA')) return null
    return 'FALTA'
  }

  const handleGenerateReport = async () => {
    if (!selectedMotoboy || !selectedMonth) return alert("Selecione o motoboy e o mês/ano.")
    setIsGenerating(true)
    
    try {
      const [year, month] = selectedMonth.split('-');
      const startOfMonth = `${year}-${month}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endOfMonth = `${year}-${month}-${lastDay}`;

      const [timeData, routesData] = await Promise.all([
        SupabaseMotoboyRepository.getTimeTracking(user.store_id, startOfMonth, endOfMonth),
        SupabaseMotoboyRepository.getRoutesByDate(user.store_id, startOfMonth, endOfMonth) 
      ])

      const myTime = timeData.filter(t => t.motoboy_id === selectedMotoboy)
      const myRoutes = routesData.filter(r => r.motoboy_id === selectedMotoboy && r.status === 'CONCLUIDA')

      const totalKm = myRoutes.reduce((acc, curr) => acc + Number(curr.total_distance_km || 0), 0)
      const totalRotas = myRoutes.length
      
      let noPrazo = 0; let atrasadas = 0;
      myRoutes.forEach(r => {
        if(r.departure_time && r.return_time && r.estimated_time_minutes > 0) {
          const tOut = new Date(r.departure_time).getTime();
          const tIn = new Date(r.return_time).getTime();
          const diffMinutes = Math.round((tIn - tOut) / 60000);
          if(diffMinutes <= r.estimated_time_minutes) noPrazo++; else atrasadas++;
        }
      })

      const targetMotoboy = motoboys.find(m => m.id === selectedMotoboy);

      setReportData({
        motoboy: targetMotoboy, month: selectedMonth, timeRecords: myTime, routes: myRoutes,
        metrics: { totalKm, totalRotas, noPrazo, atrasadas }
      })

    } catch (err) {
      alert("Erro ao gerar relatório: " + err.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePrint = () => {
    if(!reportData) return;
    const [year, month] = reportData.month.split('-');
    const nomeMesStr = getNomeMes(parseInt(month) - 1);
    const diasNoMes = new Date(year, month, 0).getDate();

    let rowsHtml = '';
    
    // Geração de 31 linhas obrigatórias baseadas na imagem
    for (let i = 1; i <= 31; i++) {
        let entradaTime = '';
        let saidaTime = '';

        if (i <= diasNoMes) {
            const dayString = `${year}-${month}-${String(i).padStart(2, '0')}`;
            const recordsOfDay = reportData.timeRecords.filter(t => t.registro_time.startsWith(dayString));
            const statusDoDia = obterStatusDoDia(dayString, recordsOfDay);
            
            const entradas = recordsOfDay.filter(t => t.tipo_registro === 'ENTRADA').sort((a,b) => new Date(a.registro_time) - new Date(b.registro_time));
            const saidas = recordsOfDay.filter(t => t.tipo_registro === 'SAIDA').sort((a,b) => new Date(a.registro_time) - new Date(b.registro_time));

            if (entradas.length > 0) entradaTime = new Date(entradas[0].registro_time).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
            if (saidas.length > 0) saidaTime = new Date(saidas[saidas.length - 1].registro_time).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});

            if (statusDoDia) {
                entradaTime = statusDoDia;
                saidaTime = statusDoDia;
            }

            if (statusDoDia === 'FALTA') {
                entradaTime = 'FALTA';
                saidaTime = 'FALTA';
            }
        }

        rowsHtml += `
            <tr>
                <td class="bold">${i}</td>
                <td>${entradaTime}</td>
                <td>${saidaTime}</td>
            </tr>
        `;
    }

    const conteudoPDF = `
      <html>
        <head>
          <title>Folha de Ponto - ${reportData.motoboy.nome}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            body { font-family: 'Arial', sans-serif; color: #000; margin: 0; padding: 0; }
            .title { text-align: center; font-size: 20px; font-weight: bold; text-transform: uppercase; margin-bottom: 40px; margin-top: 20px; }
            .header-info { display: flex; justify-content: space-between; align-items: flex-end; font-weight: bold; font-size: 13px; text-transform: uppercase; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; text-align: center; font-size: 13px; }
            th, td { border: 1px solid #000; padding: 6px 2px; }
            th { font-weight: bold; text-transform: uppercase; background-color: #f8f9fa; }
            .bold { font-weight: bold; }
            .signature-box { margin-top: 28px; text-align: center; }
            .signature-line { border-bottom: 2px solid #000; width: 70%; margin: 0 auto 8px; height: 18px; }
            .signature-text { font-size: 12px; font-weight: bold; text-transform: uppercase; }
          </style>
        </head>
        <body>
          <div class="title">FOLHA DE PONTO</div>
          
          <div class="header-info">
            <div>MOTOBOY: &nbsp; ${reportData.motoboy.nome}</div>
            <div>MÊS: ${nomeMesStr} ${year}</div>
            <div>HORÁRIO: ${getHorarioResumo(reportData.motoboy.horario_trabalho)}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 20%;">DIA</th>
                <th style="width: 40%;">HORÁRIO DE ENTRADA</th>
                <th style="width: 40%;">HORÁRIO DE SAÍDA</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-text">Assinatura</div>
          </div>
        </body>
      </html>
    `;

    const janela = window.open('', '', 'width=800,height=600')
    janela.document.write(conteudoPDF)
    janela.document.close()
    janela.focus()
    setTimeout(() => { janela.print(); janela.close() }, 250)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
      <Card title="Geração da Folha de Ponto" icon={FileBarChart}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'end', flexWrap: 'wrap', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--color-text-main)', display: 'block', marginBottom: '8px' }}>Mês/Ano de Referência</label>
            <input type="month" className="input-field" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--color-text-main)', display: 'block', marginBottom: '8px' }}>Selecione o Motoboy</label>
            <select className="input-field" value={selectedMotoboy} onChange={(e) => setSelectedMotoboy(e.target.value)} style={{ width: '100%' }}>
              <option value="">Selecione...</option>
              {motoboys.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          </div>
          <div>
            <Button onClick={handleGenerateReport} isLoading={isGenerating} icon={FileBarChart}>Carregar Informações</Button>
          </div>
        </div>

        {reportData && (
          <div style={{ marginTop: '24px', borderTop: '2px solid #e2e8f0', paddingTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>Folha Pronta para Impressão</h3>
              <Button onClick={handlePrint} icon={Printer} style={{ backgroundColor: '#16a34a', border: 'none' }}>Imprimir Folha A4</Button>
            </div>
            <div style={{ padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #86efac', color: '#166534', fontSize: '0.9rem' }}>
              O sistema mesclou o modelo fotográfico com as informações digitais. Se o motoboy tiver pontos registrados pelo ADM no sistema, os campos <b>"Entrada"</b> e <b>"Saída"</b> já sairão preenchidos! Os demais dias e a assinatura ficarão em branco para caneta.
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
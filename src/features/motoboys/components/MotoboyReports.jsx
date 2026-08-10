import React, { useState } from 'react'
import { Card } from '../../../shared/components/cards/Card'
import { Button } from '../../../shared/components/buttons/Button'
import { FileBarChart, Loader2, Printer } from 'lucide-react'
import { SupabaseMotoboyRepository } from '../../../infrastructure/supabase/repositories/SupabaseMotoboyRepository'

export const MotoboyReports = ({ user, motoboys }) => {
  const [selectedMotoboy, setSelectedMotoboy] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })
  
  const [reportData, setReportData] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerateReport = async () => {
    if (!selectedMotoboy || !selectedMonth) return alert("Selecione o motoboy e o mês/ano.")
    setIsGenerating(true)
    
    try {
      // Descobrindo o primeiro e o último dia do mês
      const [year, month] = selectedMonth.split('-');
      const startOfMonth = `${year}-${month}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endOfMonth = `${year}-${month}-${lastDay}`;

      // Busca tudo do banco na data escolhida!
      const [timeData, routesData] = await Promise.all([
        SupabaseMotoboyRepository.getTimeTracking(user.store_id, startOfMonth, endOfMonth),
        SupabaseMotoboyRepository.getRoutesByDate(user.store_id, startOfMonth, endOfMonth) // Ajuste no repo p/ suportar range se necessário
      ])

      // Filtra apenas o motoboy selecionado
      const myTime = timeData.filter(t => t.motoboy_id === selectedMotoboy)
      const myRoutes = routesData.filter(r => r.motoboy_id === selectedMotoboy && r.status === 'CONCLUIDA')

      // Cálculo das Métricas
      const totalKm = myRoutes.reduce((acc, curr) => acc + Number(curr.total_distance_km || 0), 0)
      const totalRotas = myRoutes.length
      
      // Cálculo de Tempo (No Prazo vs Atrasado)
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

    let recordsHtml = '';
    reportData.timeRecords.forEach(t => {
      const dt = new Date(t.registro_time);
      const isEntrada = t.tipo_registro === 'ENTRADA';
      recordsHtml += `<tr>
        <td style="padding: 8px; border-bottom: 1px solid #ccc;">${dt.toLocaleDateString('pt-BR')}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ccc;">${dt.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ccc; color: ${isEntrada ? '#16a34a' : '#dc2626'}; font-weight: bold;">${t.tipo_registro}</td>
      </tr>`;
    });

    const conteudoPDF = `
      <html>
        <head>
          <title>Relatório - ${reportData.motoboy.nome}</title>
          <style>
            @page { size: A4; margin: 20mm; }
            body { font-family: 'Arial', sans-serif; color: #333; line-height: 1.6; }
            .header { text-align: center; border-bottom: 2px solid #1e40af; padding-bottom: 10px; margin-bottom: 20px; }
            .metric-box { border: 1px solid #cbd5e1; padding: 15px; border-radius: 8px; text-align: center; width: 22%; display: inline-block; box-sizing: border-box; margin: 1%; background-color: #f8fafc; }
            .metric-val { font-size: 24px; font-weight: bold; color: #1e40af; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; text-align: left; }
            th { background-color: #f1f5f9; padding: 10px; border-bottom: 2px solid #ccc; }
            .signature-area { margin-top: 60px; text-align: center; }
            .signature-line { border-top: 1px solid #000; width: 300px; margin: 0 auto 10px auto; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2 style="margin:0; color: #1e40af;">Relatório Mensal de Prestação de Serviços</h2>
            <p style="margin:5px 0 0 0;">Competência: ${month}/${year}</p>
          </div>
          
          <div style="margin-bottom: 20px;">
            <strong>Nome do Motoboy:</strong> ${reportData.motoboy.nome}<br/>
            <strong>Data da Impressão:</strong> ${new Date().toLocaleDateString('pt-BR')}
          </div>

          <div style="text-align: center; margin-bottom: 30px;">
             <div class="metric-box">Distância Total<br><span class="metric-val">${reportData.metrics.totalKm.toFixed(1)} km</span></div>
             <div class="metric-box">Rotas Concluídas<br><span class="metric-val">${reportData.metrics.totalRotas}</span></div>
             <div class="metric-box">Rotas no Prazo<br><span class="metric-val" style="color:#16a34a">${reportData.metrics.noPrazo}</span></div>
             <div class="metric-box">Rotas Atrasadas<br><span class="metric-val" style="color:#dc2626">${reportData.metrics.atrasadas}</span></div>
          </div>

          <h3 style="border-bottom: 1px solid #ccc; padding-bottom: 5px;">Extrato de Ponto (Entradas e Saídas)</h3>
          ${reportData.timeRecords.length > 0 ? `<table><thead><tr><th>Data</th><th>Hora</th><th>Registro</th></tr></thead><tbody>${recordsHtml}</tbody></table>` : '<p>Nenhum registro de ponto encontrado no período.</p>'}

          <div class="signature-area">
             <div class="signature-line"></div>
             <strong>Assinatura do Motoboy</strong><br/>
             Declarou ter prestado os serviços detalhados e recebido os valores acordados.
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
      <Card title="Geração de Relatório e Folha" icon={FileBarChart}>
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
            <Button onClick={handleGenerateReport} isLoading={isGenerating} icon={FileBarChart}>Calcular e Gerar</Button>
          </div>
        </div>

        {reportData && (
          <div style={{ marginTop: '24px', borderTop: '2px solid #e2e8f0', paddingTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>Pré-visualização das Métricas</h3>
              <Button onClick={handlePrint} icon={Printer} style={{ backgroundColor: '#16a34a', border: 'none' }}>Imprimir Folha (PDF)</Button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
              <div style={{ backgroundColor: '#f1f5f9', padding: '16px', borderRadius: '8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b' }}>Distância Total Percorrida</span>
                <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--color-primary)' }}>{reportData.metrics.totalKm.toFixed(1)} km</div>
              </div>
              <div style={{ backgroundColor: '#f1f5f9', padding: '16px', borderRadius: '8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b' }}>Rotas Concluídas</span>
                <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--color-primary)' }}>{reportData.metrics.totalRotas}</div>
              </div>
              <div style={{ backgroundColor: '#f0fdf4', padding: '16px', borderRadius: '8px', textAlign: 'center', border: '1px solid #86efac' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#166534' }}>Entregues no Prazo</span>
                <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#15803d' }}>{reportData.metrics.noPrazo}</div>
              </div>
              <div style={{ backgroundColor: '#fef2f2', padding: '16px', borderRadius: '8px', textAlign: 'center', border: '1px solid #fca5a5' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#991b1b' }}>Rotas Atrasadas</span>
                <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#dc2626' }}>{reportData.metrics.atrasadas}</div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
import React, { useState } from 'react'
import { useAuth } from '../../core/hooks/useAuth'
import { usePreClosing } from '../../core/hooks/usePreClosing'
import { Card } from '../../shared/components/cards/Card'
import { Button } from '../../shared/components/buttons/Button'
import { Calculator, Save, Printer, Loader2, DollarSign, CreditCard, Ticket, FileSignature, Wallet } from 'lucide-react'

export const PreClosing = () => {
  const { user } = useAuth()
  const { pendentes, isLoading, isPageLoading, salvarFechamento } = usePreClosing(user)

  // Estados dos Valores Físicos
  const [valores, setValores] = useState({
    dinheiro: '', cartao: '', pix: '', cheque: '', vale: ''
  })

  // Estados das Observações
  const [obs, setObs] = useState({
    dinheiro: '', cartao: '', pix: '', cheque: '', vale: ''
  })
  
  const [obsGeral, setObsGeral] = useState('')

  // Cálculos Automáticos
  const parseNum = (val) => Number(val) || 0
  const somaFisico = parseNum(valores.dinheiro) + parseNum(valores.cartao) + parseNum(valores.pix) + parseNum(valores.cheque) + parseNum(valores.vale)
  const somaPendente = pendentes.dinheiro + pendentes.cartao
  const totalGeral = somaFisico + somaPendente

  const handleValorChange = (campo, valor) => {
    setValores(prev => ({ ...prev, [campo]: valor }))
  }

  const handleObsChange = (campo, valor) => {
    setObs(prev => ({ ...prev, [campo]: valor }))
  }

  const handleSalvar = async () => {
    const payload = {
      cash_value: parseNum(valores.dinheiro),
      card_value: parseNum(valores.cartao),
      pix_value: parseNum(valores.pix),
      check_value: parseNum(valores.cheque),
      vale_compras_value: parseNum(valores.vale),
      pending_cash: pendentes.dinheiro,
      pending_card: pendentes.cartao,
      total: totalGeral,
      obs_dinheiro: obs.dinheiro,
      obs_cartao: obs.cartao,
      obs_pix: obs.pix,
      obs_cheque: obs.cheque,
      obs_vale: obs.vale,
      obs_geral: obsGeral
    }
    await salvarFechamento(payload)
  }

  const renderItemPagamento = (id, label, Icon, color) => (
    <div key={id} style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '16px', alignItems: 'start', paddingBottom: '16px', borderBottom: '1px dashed var(--color-border)', marginBottom: '16px' }}>
      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--color-text-main)', marginBottom: '8px' }}>
          <Icon size={18} color={color} /> {label}
        </label>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', fontWeight: 'bold' }}>R$</span>
          <input 
            type="number" step="0.01" className="input-field" 
            style={{ paddingLeft: '40px', fontSize: '1.1rem', fontWeight: 'bold', width: '100%' }}
            value={valores[id]} onFocus={(e) => e.target.select()} onChange={(e) => handleValorChange(id, e.target.value)} placeholder="0,00"
          />
        </div>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '8px' }}>Observações sobre {label}</label>
        <input 
          type="text" className="input-field" style={{ width: '100%' }}
          value={obs[id]} onChange={(e) => handleObsChange(id, e.target.value)} placeholder={`Anotações específicas para ${label}...`}
        />
      </div>
    </div>
  )

  const renderItemImpressao = (label, valor, observacao) => (
    <tr key={label} style={{ borderBottom: '1px solid #cbd5e1' }}>
      <td style={{ padding: '8px', fontWeight: 'bold', width: '30%' }}>{label}</td>
      <td style={{ padding: '8px', width: '25%', color: '#1e40af', fontWeight: 'bold' }}>R$ {parseNum(valor).toFixed(2).replace('.', ',')}</td>
      <td style={{ padding: '8px', width: '45%', color: '#475569', fontSize: '12px' }}>{observacao || '-'}</td>
    </tr>
  )

  if (isPageLoading) return <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}><Loader2 className="animate-spin" size={32} color="var(--color-primary)" /><span>Calculando malotes em aberto...</span></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* CSS DE IMPRESSÃO APRIMORADO */}
      <style>{`
        @media screen { .print-only { display: none !important; } }
        @media print {
          @page { margin: 15mm; size: A4 portrait; }
          body { background-color: #ffffff !important; font-family: 'Helvetica', 'Arial', sans-serif !important; }
          aside, nav, header, .no-print { display: none !important; }
          main { width: 100% !important; margin: 0 !important; padding: 0 !important; }
          .print-card { border: none !important; box-shadow: none !important; padding: 0 !important; }
          .print-only { display: block !important; }
          table { width: 100% !important; border-collapse: collapse !important; margin-top: 10px; }
        }
      `}</style>

      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>Pré-Fechamento do Caixa</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Calculadora de consolidação de valores físicos e comandas pendentes.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="secondary" onClick={() => window.print()} icon={Printer}>Exportar PDF</Button>
          <Button onClick={handleSalvar} isLoading={isLoading} icon={Save}>Salvar Fechamento</Button>
        </div>
      </div>

      <Card className="print-card">
        {/* CABEÇALHO DO PDF */}
        <div className="print-only" style={{ borderBottom: '2px solid #000', paddingBottom: '16px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 12px 0', color: '#000' }}>Relatório de Pré-Fechamento</h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#000' }}>
            <div>
              <strong>Responsável pelo Fechamento:</strong> {user?.nome} <br/>
              <strong>Turno/Perfil:</strong> {user?.role}
            </div>
            <div style={{ textAlign: 'right' }}>
              <strong>Data da Apuração:</strong> {new Date().toLocaleString('pt-BR')} <br/>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '32px' }} className="no-print">
          
          {/* Lado Esquerdo: Formulário Físico */}
          <div>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--color-text-main)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calculator size={20} color="var(--color-primary)" /> Apuração Física (Gaveta)
            </h3>
            
            {renderItemPagamento('dinheiro', 'Dinheiro', DollarSign, '#16a34a')}
            {renderItemPagamento('cartao', 'Cartão', CreditCard, '#2563eb')}
            {renderItemPagamento('pix', 'Pix (QR Code / Transferência)', Ticket, '#0d9488')}
            {renderItemPagamento('cheque', 'Cheques', FileSignature, '#d97706')}
            {renderItemPagamento('vale', 'Vale-Compras', Wallet, '#9333ea')}

            <div style={{ marginTop: '24px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', color: 'var(--color-text-main)', marginBottom: '8px' }}>Observações Gerais do Fechamento</label>
              <textarea 
                className="input-field" rows="3" style={{ width: '100%', resize: 'none' }}
                value={obsGeral} onChange={(e) => setObsGeral(e.target.value)}
                placeholder="Faltou troco? Sangria não bateu? Digite o resumo geral aqui..."
              />
            </div>
          </div>

          {/* Lado Direito: Resumo e Pendentes */}
          <div>
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', position: 'sticky', top: '24px' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--color-text-main)', marginBottom: '16px', fontWeight: 'bold', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                Resumo da Apuração
              </h3>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#475569', fontSize: '0.9rem' }}>
                <span>Subtotal Físico:</span>
                <span style={{ fontWeight: 'bold' }}>R$ {somaFisico.toFixed(2).replace('.', ',')}</span>
              </div>

              <div style={{ marginTop: '24px', marginBottom: '16px' }}>
                <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Entregas na Rua (Pendentes)</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#dc2626', fontSize: '0.9rem' }}>
                  <span>Dinheiro a receber:</span>
                  <span style={{ fontWeight: 'bold' }}>+ R$ {pendentes.dinheiro.toFixed(2).replace('.', ',')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', fontSize: '0.9rem' }}>
                  <span>Cartão a receber:</span>
                  <span style={{ fontWeight: 'bold' }}>+ R$ {pendentes.cartao.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>

              <div style={{ borderTop: '2px solid #cbd5e1', paddingTop: '16px', marginTop: '16px' }}>
                <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: '4px' }}>Total Geral Projetado</span>
                <span style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--color-primary)', lineHeight: '1' }}>
                  R$ {totalGeral.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ESTRUTURA EXCLUSIVA VISÍVEL APENAS NA IMPRESSÃO (PDF) */}
        <div className="print-only">
          <h3 style={{ fontSize: '16px', margin: '20px 0 10px 0', borderBottom: '1px solid #ccc', paddingBottom: '4px' }}>Detalhamento Físico (Gaveta)</h3>
          <table>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9' }}>
                <th style={{ padding: '8px', textAlign: 'left' }}>Forma de Pagamento</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Valor Apurado</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Observação Registrada</th>
              </tr>
            </thead>
            <tbody>
              {renderItemImpressao('Dinheiro', valores.dinheiro, obs.dinheiro)}
              {renderItemImpressao('Cartão POS', valores.cartao, obs.cartao)}
              {renderItemImpressao('Pix', valores.pix, obs.pix)}
              {renderItemImpressao('Cheques', valores.cheque, obs.cheque)}
              {renderItemImpressao('Vale-Compras', valores.vale, obs.vale)}
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <td style={{ padding: '8px', fontWeight: 'bold', textAlign: 'right' }}>SUBTOTAL FÍSICO:</td>
                <td colSpan="2" style={{ padding: '8px', fontWeight: 'bold', color: '#000' }}>R$ {somaFisico.toFixed(2).replace('.', ',')}</td>
              </tr>
            </tbody>
          </table>

          <h3 style={{ fontSize: '16px', margin: '30px 0 10px 0', borderBottom: '1px solid #ccc', paddingBottom: '4px' }}>Comandas/Entregas Pendentes (Na Rua)</h3>
          <table>
            <tbody>
              <tr>
                <td style={{ padding: '8px', width: '30%', color: '#dc2626' }}>Dinheiro a Receber</td>
                <td style={{ padding: '8px', fontWeight: 'bold', color: '#dc2626' }}>R$ {pendentes.dinheiro.toFixed(2).replace('.', ',')}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', width: '30%', color: '#dc2626' }}>Cartão a Receber</td>
                <td style={{ padding: '8px', fontWeight: 'bold', color: '#dc2626' }}>R$ {pendentes.cartao.toFixed(2).replace('.', ',')}</td>
              </tr>
              <tr style={{ backgroundColor: '#fef2f2' }}>
                <td style={{ padding: '8px', fontWeight: 'bold', textAlign: 'right', color: '#991b1b' }}>SUBTOTAL PENDENTE:</td>
                <td style={{ padding: '8px', fontWeight: 'bold', color: '#991b1b' }}>R$ {somaPendente.toFixed(2).replace('.', ',')}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: '30px', padding: '16px', backgroundColor: '#eff6ff', border: '2px solid #bfdbfe', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e40af' }}>TOTAL GERAL (FÍSICO + PENDENTE):</span>
            <span style={{ fontSize: '24px', fontWeight: '900', color: '#1e40af' }}>R$ {totalGeral.toFixed(2).replace('.', ',')}</span>
          </div>

          <div style={{ marginTop: '32px', fontSize: '14px', border: '1px solid #ccc', padding: '16px', borderRadius: '4px' }}>
            <strong style={{ display: 'block', marginBottom: '8px', fontSize: '15px' }}>Anotações Gerais do Fechamento:</strong>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{obsGeral || 'Nenhuma anotação geral registrada.'}</p>
          </div>
        </div>

      </Card>
    </div>
  )
}
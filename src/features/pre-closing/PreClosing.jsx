import React, { useState, useEffect } from 'react'
import { useAuth } from '../../core/hooks/useAuth'
import { usePreClosing } from '../../core/hooks/usePreClosing'
import { Card } from '../../shared/components/cards/Card'
import { Button } from '../../shared/components/buttons/Button'
import { Table } from '../../shared/components/tables/Table'
import { Calculator, Printer, Save, Loader2, Banknote, CreditCard, QrCode, ScrollText, Ticket, Calendar, Pencil, Trash2, XCircle } from 'lucide-react'

const DRAFT_KEY = 'preClosingDraft_TorresFarma'

const evaluateMath = (val) => {
  if (!val) return 0;
  try {
    const sanitized = String(val).replace(/,/g, '.').replace(/[^0-9.+\-]/g, '');
    if (!sanitized) return 0;
    return sanitized.split('+').reduce((acc, curr) => acc + (parseFloat(curr) || 0), 0);
  } catch (e) {
    return 0;
  }
}

// Input customizado puro: aceita strings complexas (Ex: 50+30,50)
const MathInput = ({ icon: Icon, color, label, value, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
    <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
      <Icon size={16} color={color} /> {label}
    </label>
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: 10, top: 10, color: '#94a3b8', fontSize: '0.9rem', fontWeight: 'bold' }}>R$</span>
      <input
        type="text"
        className="input-field"
        style={{ width: '100%', paddingLeft: '34px', fontSize: '1rem', fontWeight: 'bold', color: '#334155', boxSizing: 'border-box' }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ex: 50 + 20,50"
      />
    </div>
  </div>
)

export const PreClosing = () => {
  const { user } = useAuth()
  const [dataFiltro, setDataFiltro] = useState(() => {
    const tzOffset = new Date().getTimezoneOffset() * 60000
    return new Date(Date.now() - tzOffset).toISOString().split('T')[0]
  })

  const { preClosings, deliveriesTotals, isLoading, isActionLoading, savePreClosing, deletePreClosing } = usePreClosing(dataFiltro)

  const [editingId, setEditingId] = useState(null)
  
  // Inicializa o formulário buscando do Cache (localStorage)
  const [formValues, setFormValues] = useState(() => {
    const saved = localStorage.getItem(DRAFT_KEY)
    if (saved) return JSON.parse(saved)
    return {
      cash_value: '', card_value: '', pix_value: '', check_value: '', vale_compras_value: '',
      obs_dinheiro: '', obs_cartao: '', obs_pix: '', obs_cheque: '', obs_vale: '', obs_geral: ''
    }
  })

  // Salva no Cache automaticamente enquanto digita
  useEffect(() => {
    if (!editingId) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(formValues))
    }
  }, [formValues, editingId])

  const handleInputChange = (field, val) => setFormValues(prev => ({ ...prev, [field]: val }))

  // ================= CÁLCULOS DINÂMICOS =================
  const calcCash = evaluateMath(formValues.cash_value)
  const calcCard = evaluateMath(formValues.card_value)
  const calcPix = evaluateMath(formValues.pix_value)
  const calcCheck = evaluateMath(formValues.check_value)
  const calcVale = evaluateMath(formValues.vale_compras_value)
  
  const subtotalFisico = calcCash + calcCard + calcPix + calcCheck + calcVale
  const dynDinheiro = calcCash + deliveriesTotals.dinheiro
  const dynCartao = calcCard + deliveriesTotals.cartao
  const dynPix = calcPix + deliveriesTotals.pix
  const totalGeralProjetado = dynDinheiro + dynCartao + dynPix + calcCheck + calcVale

  // ================= FUNÇÕES DE SALVAR E EDITAR =================
  const handleSave = async () => {
    if (totalGeralProjetado <= 0) return alert("Não há valores preenchidos para salvar.")

    const payload = {
      cash_value: calcCash, card_value: calcCard, pix_value: calcPix, check_value: calcCheck, vale_compras_value: calcVale,
      pending_cash: deliveriesTotals.dinheiro, pending_card: deliveriesTotals.cartao, pending_pix: deliveriesTotals.pix,
      total: totalGeralProjetado,
      obs_dinheiro: formValues.obs_dinheiro, obs_cartao: formValues.obs_cartao, obs_pix: formValues.obs_pix, obs_cheque: formValues.obs_cheque, obs_vale: formValues.obs_vale, obs_geral: formValues.obs_geral
    }

    const success = await savePreClosing(payload, editingId)
    if (success) {
      alert("Pré-Fechamento salvo com sucesso!")
      setEditingId(null)
      setFormValues({ cash_value: '', card_value: '', pix_value: '', check_value: '', vale_compras_value: '', obs_dinheiro: '', obs_cartao: '', obs_pix: '', obs_cheque: '', obs_vale: '', obs_geral: '' })
      localStorage.removeItem(DRAFT_KEY) // Limpa o cache após salvar
    }
  }

  const handleEditRow = (row) => {
    setEditingId(row.id)
    setFormValues({
      cash_value: row.cash_value > 0 ? String(row.cash_value).replace('.', ',') : '',
      card_value: row.card_value > 0 ? String(row.card_value).replace('.', ',') : '',
      pix_value: row.pix_value > 0 ? String(row.pix_value).replace('.', ',') : '',
      check_value: row.check_value > 0 ? String(row.check_value).replace('.', ',') : '',
      vale_compras_value: row.vale_compras_value > 0 ? String(row.vale_compras_value).replace('.', ',') : '',
      obs_dinheiro: row.obs_dinheiro || '', obs_cartao: row.obs_cartao || '', obs_pix: row.obs_pix || '', obs_cheque: row.obs_cheque || '', obs_vale: row.obs_vale || '', obs_geral: row.obs_geral || ''
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    const saved = localStorage.getItem(DRAFT_KEY)
    setFormValues(saved ? JSON.parse(saved) : { cash_value: '', card_value: '', pix_value: '', check_value: '', vale_compras_value: '', obs_dinheiro: '', obs_cartao: '', obs_pix: '', obs_cheque: '', obs_vale: '', obs_geral: '' })
  }

  const formatReais = (val) => `R$ ${Number(val || 0).toFixed(2).replace('.', ',')}`

  const columns = [
    { header: 'Data/Hora', render: (row) => new Date(row.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) },
    { header: 'Dinheiro', render: (row) => formatReais(row.cash_value) },
    { header: 'Cartão', render: (row) => formatReais(row.card_value) },
    { header: 'Pix', render: (row) => formatReais(row.pix_value) },
    { header: 'Cheque/Vale', render: (row) => formatReais(Number(row.check_value) + Number(row.vale_compras_value)) },
    { header: 'Rua Pendente', render: (row) => formatReais(Number(row.pending_cash) + Number(row.pending_card) + Number(row.pending_pix)) },
    { header: 'TOTAL PROJETADO', render: (row) => <strong style={{ color: 'var(--color-primary)' }}>{formatReais(row.total)}</strong> },
    { header: 'Ações', render: (row) => (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {user.role === 'ADMIN' && (
            <>
              <button onClick={() => handleEditRow(row)} style={{ background: 'none', border: 'none', color: '#d97706', cursor: 'pointer' }}><Pencil size={18} /></button>
              <button onClick={async () => { if(window.confirm('Excluir este fechamento?')) await deletePreClosing(row.id) }} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}><Trash2 size={18} /></button>
            </>
          )}
        </div>
      )
    },
  ]

  if (isLoading) return <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 className="animate-spin" size={32} color="var(--color-primary)" /></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>{editingId ? "Editando Pré-Fechamento" : "Pré-Fechamento do Caixa"}</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Calculadora de consolidação de valores físicos e comandas pendentes.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {editingId && <Button variant="secondary" onClick={handleCancelEdit} icon={XCircle}>Cancelar Edição</Button>}
          <Button variant="secondary" icon={Printer}>Exportar PDF</Button>
          <Button onClick={handleSave} isLoading={isActionLoading} icon={Save}>{editingId ? "Salvar Edição" : "Salvar Fechamento"}</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', alignItems: 'start' }}>
        
        {/* COLUNA ESQUERDA: APURAÇÃO FÍSICA */}
        <Card title="Apuração Física (Gaveta)" icon={Calculator}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
            
            {/* Dinheiro */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'end' }}>
              <MathInput icon={Banknote} color="#16a34a" label="Dinheiro" value={formValues.cash_value} onChange={(v) => handleInputChange('cash_value', v)} />
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Observações sobre Dinheiro</label>
                <input type="text" className="input-field" style={{ boxSizing: 'border-box', width: '100%' }} placeholder="Anotações específicas..." value={formValues.obs_dinheiro} onChange={(e) => handleInputChange('obs_dinheiro', e.target.value)} />
              </div>
            </div>

            {/* Cartão */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'end' }}>
              <MathInput icon={CreditCard} color="#2563eb" label="Cartão" value={formValues.card_value} onChange={(v) => handleInputChange('card_value', v)} />
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Observações sobre Cartão</label>
                <input type="text" className="input-field" style={{ boxSizing: 'border-box', width: '100%' }} placeholder="Anotações específicas..." value={formValues.obs_cartao} onChange={(e) => handleInputChange('obs_cartao', e.target.value)} />
              </div>
            </div>

            {/* Pix */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'end' }}>
              <MathInput icon={QrCode} color="#0d9488" label="Pix (QR Code / Transferência)" value={formValues.pix_value} onChange={(v) => handleInputChange('pix_value', v)} />
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Observações sobre Pix</label>
                <input type="text" className="input-field" style={{ boxSizing: 'border-box', width: '100%' }} placeholder="Anotações específicas..." value={formValues.obs_pix} onChange={(e) => handleInputChange('obs_pix', e.target.value)} />
              </div>
            </div>

            {/* Cheques */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'end' }}>
              <MathInput icon={ScrollText} color="#d97706" label="Cheques" value={formValues.check_value} onChange={(v) => handleInputChange('check_value', v)} />
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Observações sobre Cheques</label>
                <input type="text" className="input-field" style={{ boxSizing: 'border-box', width: '100%' }} placeholder="Anotações específicas..." value={formValues.obs_cheque} onChange={(e) => handleInputChange('obs_cheque', e.target.value)} />
              </div>
            </div>

            {/* Vale-Compras */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'end' }}>
              <MathInput icon={Ticket} color="#7c3aed" label="Vale-Compras" value={formValues.vale_compras_value} onChange={(v) => handleInputChange('vale_compras_value', v)} />
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Observações sobre Vale-Compras</label>
                <input type="text" className="input-field" style={{ boxSizing: 'border-box', width: '100%' }} placeholder="Anotações específicas..." value={formValues.obs_vale} onChange={(e) => handleInputChange('obs_vale', e.target.value)} />
              </div>
            </div>

            {/* Observações Gerais */}
            <div style={{ marginTop: '12px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--color-text-main)', display: 'block', marginBottom: '8px' }}>Observações Gerais do Fechamento</label>
              <textarea 
                className="input-field" 
                style={{ width: '100%', minHeight: '80px', resize: 'vertical', boxSizing: 'border-box' }} 
                placeholder="Faltou troco? Sangria não bateu? Digite o resumo geral aqui..."
                value={formValues.obs_geral}
                onChange={(e) => handleInputChange('obs_geral', e.target.value)}
              />
            </div>

          </div>
        </Card>

        {/* COLUNA DIREITA: RESUMO FÍSICO E DINÂMICO DETALHADO */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '24px', position: 'sticky', top: '24px' }}>
           <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1e293b', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px', marginBottom: '16px' }}>
             Resumo da Apuração
           </h3>

           {/* Detalhamento do que tem na Gaveta */}
           <div style={{ marginBottom: '16px' }}>
             <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569', letterSpacing: '0.5px' }}>APURAÇÃO FÍSICA (GAVETA)</span>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#64748b' }}>
                 <span>Dinheiro:</span> <strong>R$ {calcCash.toFixed(2).replace('.', ',')}</strong>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#64748b' }}>
                 <span>Cartão:</span> <strong>R$ {calcCard.toFixed(2).replace('.', ',')}</strong>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#64748b' }}>
                 <span>Pix:</span> <strong>R$ {calcPix.toFixed(2).replace('.', ',')}</strong>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#64748b' }}>
                 <span>Cheques/Vales:</span> <strong>R$ {(calcCheck + calcVale).toFixed(2).replace('.', ',')}</strong>
               </div>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #e2e8f0', color: '#334155' }}>
               <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Subtotal Físico:</span>
               <strong style={{ fontSize: '1rem' }}>R$ {subtotalFisico.toFixed(2).replace('.', ',')}</strong>
             </div>
           </div>

           {/* Entregas Pendentes do Motoqueiro */}
           <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '16px', paddingBottom: '16px' }}>
             <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#dc2626', letterSpacing: '0.5px' }}>ENTREGAS NA RUA (PENDENTES)</span>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b91c1c', fontSize: '0.9rem' }}>
                 <span>Dinheiro a receber:</span><strong style={{ color: '#dc2626' }}>+ R$ {deliveriesTotals.dinheiro.toFixed(2).replace('.', ',')}</strong>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b91c1c', fontSize: '0.9rem' }}>
                 <span>Cartão a receber:</span><strong style={{ color: '#ea580c' }}>+ R$ {deliveriesTotals.cartao.toFixed(2).replace('.', ',')}</strong>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b91c1c', fontSize: '0.9rem' }}>
                 <span>Pix a receber:</span><strong style={{ color: '#0ea5e9' }}>+ R$ {deliveriesTotals.pix.toFixed(2).replace('.', ',')}</strong>
               </div>
             </div>
           </div>

           {/* SOMA DINÂMICA (GAVETA + RUA) DETALHADA */}
           <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '16px', paddingBottom: '16px', backgroundColor: '#f0f9ff', padding: '16px', borderRadius: '8px', marginTop: '8px' }}>
             <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#0369a1', letterSpacing: '0.5px' }}>SOMA DINÂMICA (GAVETA + RUA)</span>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#0284c7' }}>
                 <span>Total Dinheiro:</span><strong>R$ {dynDinheiro.toFixed(2).replace('.', ',')}</strong>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#0284c7' }}>
                 <span>Total Cartão:</span><strong>R$ {dynCartao.toFixed(2).replace('.', ',')}</strong>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#0284c7' }}>
                 <span>Total Pix:</span><strong>R$ {dynPix.toFixed(2).replace('.', ',')}</strong>
               </div>
             </div>
             
             <div style={{ borderTop: '1px solid #bae6fd', paddingTop: '12px', marginTop: '12px' }}>
               <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#1e40af' }}>TOTAL GERAL PROJETADO</span>
               <div style={{ fontSize: '2.2rem', fontWeight: '900', color: '#1e40af', lineHeight: '1.2', marginTop: '4px' }}>
                 R$ {totalGeralProjetado.toFixed(2).replace('.', ',')}
               </div>
             </div>
           </div>

        </div>

      </div>

      {/* Tabela de Registros Anteriores */}
      <Card title="Histórico de Pré-Fechamentos Salvos">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={18} color="var(--color-primary)"/> Filtrar do dia:
          </label>
          <input type="date" className="input-field" style={{ padding: '8px 12px', fontSize: '0.9rem', cursor: 'pointer' }} value={dataFiltro} onChange={(e) => setDataFiltro(e.target.value)} />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <Table columns={columns} data={preClosings} emptyMessage="Nenhum pré-fechamento encontrado para esta data." />
        </div>
      </Card>

    </div>
  )
}
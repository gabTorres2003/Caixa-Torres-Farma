import React, { useState, useEffect } from 'react'
import { useAuth } from '../../core/hooks/useAuth'
import { useCashManagement } from '../../core/hooks/useCashManagement'
import { Card } from '../../shared/components/cards/Card'
import { Button } from '../../shared/components/buttons/Button'
import { Modal } from '../../shared/components/modals/Modal'
import { Edit, Save, PlusCircle, AlertTriangle, Loader2, Settings2 } from 'lucide-react'

export const NotesCoinsManagement = () => {
  const { user } = useAuth()
  
  const { 
    denominations, isLoading, isActionLoading, 
    carregarEstoque, updateMetrics, registrarSobraCaixa, adjustBalance
  } = useCashManagement(user)

  useEffect(() => {
    carregarEstoque()
  }, [carregarEstoque])

  // ================= ESTADOS =================
  
  // Edição de Mínimos/Ideais
  const [isEditingMetrics, setIsEditingMetrics] = useState(false)
  const [metricsEdits, setMetricsEdits] = useState({})

  // Sobra de Caixa
  const [isSobraModalOpen, setIsSobraModalOpen] = useState(false)
  const [sobraValues, setSobraValues] = useState({})
  const [sobraObs, setSobraObs] = useState('')
  const [sobraOperador, setSobraOperador] = useState('') // Novo Campo
  const [sobraData, setSobraData] = useState(() => new Date().toISOString().split('T')[0]) // Novo Campo

  // Ajuste de Saldo (Restaurado)
  const [isAjusteModalOpen, setIsAjusteModalOpen] = useState(false)
  const [ajusteValues, setAjusteValues] = useState({})
  const [ajusteOrigem, setAjusteOrigem] = useState('')
  const [ajusteObs, setAjusteObs] = useState('')

  // ================= FUNÇÕES DE MÉTRICAS =================
  const handleEditToggle = () => {
    if (!isEditingMetrics) {
      const initialEdits = {}
      denominations.forEach(d => {
        initialEdits[d.id] = { minima: d.quantidade_minima || 0, ideal: d.quantidade_ideal || 0 }
      })
      setMetricsEdits(initialEdits)
    }
    setIsEditingMetrics(!isEditingMetrics)
  }

  const handleMetricChange = (id, field, value) => {
    setMetricsEdits(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: parseInt(value) || 0 }
    }))
  }

  const handleSaveMetrics = async () => {
    const payload = Object.entries(metricsEdits).map(([id, values]) => ({
      id, minima: values.minima, ideal: values.ideal
    }))
    const success = await updateMetrics(payload)
    if (success) setIsEditingMetrics(false)
  }

  // ================= FUNÇÕES DE SOBRA DE CAIXA =================
  const handleSobraChange = (valorFace, qtd) => {
    setSobraValues(prev => ({ ...prev, [valorFace]: parseInt(qtd) || 0 }))
  }

  const handleSalvarSobra = async (e) => {
    e.preventDefault()
    
    if (!sobraOperador) {
      alert("Por favor, selecione o operador referente ao caixa.")
      return
    }

    const hasValues = Object.values(sobraValues).some(v => v > 0)
    if (!hasValues) {
      alert("Preencha ao menos uma nota ou moeda para registrar a sobra.")
      return
    }

    const success = await registrarSobraCaixa(sobraValues, sobraObs, sobraOperador, sobraData)
    if (success) {
      setIsSobraModalOpen(false)
      setSobraValues({})
      setSobraObs('')
      setSobraOperador('')
    }
  }

  // ================= FUNÇÕES DE AJUSTE DE SALDO =================
  const openAjusteModal = () => {
    const currentQty = {}
    denominations.forEach(d => { currentQty[d.valor] = d.quantidade_atual || 0 })
    setAjusteValues(currentQty)
    setAjusteOrigem('')
    setAjusteObs('')
    setIsAjusteModalOpen(true)
  }

  const handleAjusteChange = (valorFace, val) => {
    setAjusteValues(prev => ({ ...prev, [valorFace]: parseInt(val) || 0 }))
  }

  const handleSalvarAjuste = async (e) => {
    e.preventDefault()
    if (!ajusteOrigem) {
      alert("A origem/destino do ajuste é obrigatória.")
      return
    }
    const success = await adjustBalance(ajusteValues, ajusteOrigem, ajusteObs)
    if (success) setIsAjusteModalOpen(false)
  }

  // ================= CÁLCULOS =================
  const totalCofre = denominations.reduce((acc, curr) => acc + ((curr.quantidade_atual || 0) * curr.valor), 0)
  const totalSobraReais = denominations.reduce((acc, curr) => acc + ((sobraValues[curr.valor] || 0) * curr.valor), 0)
  
  // Total do Ajuste de Saldo sendo simulado
  let diffSoma = 0
  denominations.forEach(d => {
    const current = d.quantidade_atual || 0
    const novo = ajusteValues[d.valor] ?? current
    diffSoma += (novo - current) * d.valor
  })

  if (isLoading) return <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 className="animate-spin" size={32} color="var(--color-primary)" /><span>Carregando cofre...</span></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* CABEÇALHO COM BOTÕES DE AÇÃO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>Gestão de Notas e Moedas</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Controle de estoque do cofre principal e definição de metas.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          
          <Button variant="secondary" onClick={() => setIsSobraModalOpen(true)} icon={PlusCircle}>
            Sobra de Caixa
          </Button>

          <Button variant="secondary" onClick={openAjusteModal} icon={Settings2}>
            Ajuste de Saldo
          </Button>

          {isEditingMetrics ? (
            <Button onClick={handleSaveMetrics} isLoading={isActionLoading} icon={Save} style={{ backgroundColor: '#16a34a', color: 'white', border: 'none' }}>
              Salvar Métricas
            </Button>
          ) : (
            <Button variant="secondary" onClick={handleEditToggle} icon={Edit}>
              Editar Métricas
            </Button>
          )}
        </div>
      </div>

      {/* TABELA DE COFRE */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--color-text-main)', fontWeight: 'bold' }}>Inventário Atual</h2>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Financeiro (Cofre)</span>
            <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--color-primary)', lineHeight: '1' }}>
              R$ {totalCofre.toFixed(2).replace('.', ',')}
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', minWidth: '700px' }}>
            <thead>
              <tr>
                <th>Valor da Face</th>
                <th>Tipo</th>
                <th style={{ textAlign: 'center', color: '#d97706' }}>Qtd. Mínima</th>
                <th style={{ textAlign: 'center', color: '#0369a1' }}>Qtd. Ideal</th>
                <th style={{ textAlign: 'center', color: '#16a34a' }}>Total (em unidades)</th>
                <th style={{ textAlign: 'right' }}>Total (em R$)</th>
              </tr>
            </thead>
            <tbody>
              {denominations.map(d => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 'bold' }}>R$ {d.valor.toFixed(2).replace('.', ',')}</td>
                  <td><span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: d.tipo === 'NOTA' ? '#dbeafe' : '#fef3c7', color: d.tipo === 'NOTA' ? '#1e40af' : '#b45309' }}>{d.tipo}</span></td>
                  
                  <td style={{ textAlign: 'center' }}>
                    {isEditingMetrics ? (
                      <input 
                        type="number" min="0" className="input-field" 
                        style={{ width: '80px', textAlign: 'center', padding: '6px' }}
                        value={metricsEdits[d.id]?.minima ?? ''} 
                        onChange={(e) => handleMetricChange(d.id, 'minima', e.target.value)}
                      />
                    ) : (
                      <span style={{ fontWeight: 'bold', color: '#b45309' }}>{d.quantidade_minima || 0}</span>
                    )}
                  </td>
                  
                  <td style={{ textAlign: 'center' }}>
                    {isEditingMetrics ? (
                      <input 
                        type="number" min="0" className="input-field" 
                        style={{ width: '80px', textAlign: 'center', padding: '6px' }}
                        value={metricsEdits[d.id]?.ideal ?? ''} 
                        onChange={(e) => handleMetricChange(d.id, 'ideal', e.target.value)}
                      />
                    ) : (
                      <span style={{ fontWeight: 'bold', color: '#0369a1' }}>{d.quantidade_ideal || 0}</span>
                    )}
                  </td>
                  
                  <td style={{ textAlign: 'center', fontWeight: '900', fontSize: '1.1rem', color: '#166534', backgroundColor: '#f0fdf4' }}>
                    {d.quantidade_atual || 0}
                  </td>
                  
                  <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--color-text-main)' }}>
                    R$ {((d.quantidade_atual || 0) * d.valor).toFixed(2).replace('.', ',')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MODAL DE SOBRA DE CAIXA */}
      <Modal isOpen={isSobraModalOpen} onClose={() => setIsSobraModalOpen(false)} title="Registrar Sobra de Caixa">
        <form onSubmit={handleSalvarSobra} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '16px', borderRadius: '8px', color: '#92400e', fontSize: '0.85rem' }}>
            <AlertTriangle size={18} style={{ display: 'inline', marginBottom: '-4px', marginRight: '6px' }}/>
            <strong>Atenção:</strong> Os valores preenchidos abaixo serão <b>SOMADOS</b> ao cofre central e registrados como <b>ENTRADA</b> na auditoria. Preencha apenas a quantidade de notas/moedas excedentes encontradas.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label className="input-label" style={{ marginBottom: '8px', display: 'block' }}>Operador Responsável</label>
              <select className="input-field" value={sobraOperador} onChange={(e) => setSobraOperador(e.target.value)} required>
                <option value="">Selecione o Operador...</option>
                <option value="Caixa Jô">Caixa Jô</option>
                <option value="Caixa Bruna">Caixa Bruna</option>
                <option value="Caixa Ana">Caixa Ana</option>
                <option value="Caixa Gabriel">Caixa Gabriel</option>
              </select>
            </div>
            <div>
              <label className="input-label" style={{ marginBottom: '8px', display: 'block' }}>Data da Sobra</label>
              <input type="date" className="input-field" value={sobraData} onChange={(e) => setSobraData(e.target.value)} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', maxHeight: '35vh', overflowY: 'auto' }}>
            {denominations.map(d => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{d.tipo} R$ {d.valor.toFixed(2).replace('.', ',')}</label>
                <input 
                  type="number" min="0" className="input-field" 
                  style={{ width: '80px', textAlign: 'center' }} 
                  placeholder="0 un."
                  value={sobraValues[d.valor] || ''} 
                  onChange={(e) => handleSobraChange(d.valor, e.target.value)}
                />
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px' }}>
            <span style={{ fontWeight: 'bold', color: '#065f46' }}>Total Inserido (R$):</span>
            <span style={{ fontSize: '1.5rem', fontWeight: '900', color: '#059669' }}>R$ {totalSobraReais.toFixed(2).replace('.', ',')}</span>
          </div>

          <div>
            <label className="input-label" style={{ marginBottom: '8px', display: 'block' }}>Observação (Opcional)</label>
            <input 
              type="text" className="input-field" style={{ width: '100%' }}
              placeholder="Descreva o motivo desta sobra (ex: cliente não esperou o troco)"
              value={sobraObs} onChange={(e) => setSobraObs(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsSobraModalOpen(false)}>Cancelar</Button>
            <Button type="submit" isLoading={isActionLoading} icon={PlusCircle}>Registrar Sobra</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL DE AJUSTE DE SALDO (Restaurado) */}
      <Modal isOpen={isAjusteModalOpen} onClose={() => setIsAjusteModalOpen(false)} title="Ajuste de Saldo">
        <form onSubmit={handleSalvarAjuste} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '16px', borderRadius: '8px', color: '#92400e', fontSize: '0.85rem' }}>
            <AlertTriangle size={18} style={{ display: 'inline', marginBottom: '-4px', marginRight: '6px' }}/>
            Modifique a quantidade atual de cada nota/moeda para refletir a realidade. Isso gerará um registro de entrada ou saída no histórico.
          </div>

          <div>
            <label className="input-label" style={{ marginBottom: '8px', display: 'block' }}>Origem ou Motivo do Ajuste *</label>
            <input 
              type="text" className="input-field" style={{ width: '100%' }}
              placeholder="Ex: Reforço de banco, Erro de contagem..."
              value={ajusteOrigem} onChange={(e) => setAjusteOrigem(e.target.value)} required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxHeight: '35vh', overflowY: 'auto', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            {denominations.map(d => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between', gap: '12px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{d.tipo} R$ {d.valor.toFixed(2).replace('.', ',')}</label>
                <input 
                  type="number" min="0" className="input-field" 
                  style={{ width: '80px', textAlign: 'center' }} 
                  value={ajusteValues[d.valor] ?? ''} 
                  onChange={(e) => handleAjusteChange(d.valor, e.target.value)}
                />
              </div>
            ))}
          </div>

          <div style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: diffSoma > 0 ? '#ecfdf5' : diffSoma < 0 ? '#fef2f2' : '#f8fafc', border: `1px solid ${diffSoma > 0 ? '#a7f3d0' : diffSoma < 0 ? '#fecaca' : '#e2e8f0'}` }}>
            <span style={{ fontWeight: 'bold', color: diffSoma > 0 ? '#065f46' : diffSoma < 0 ? '#991b1b' : '#64748b' }}>
              Impacto Financeiro Previsto: {diffSoma > 0 ? '+' : ''} R$ {diffSoma.toFixed(2).replace('.', ',')}
            </span>
          </div>

          <div>
            <label className="input-label" style={{ marginBottom: '8px', display: 'block' }}>Observação (Opcional)</label>
            <input 
              type="text" className="input-field" style={{ width: '100%' }}
              value={ajusteObs} onChange={(e) => setAjusteObs(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsAjusteModalOpen(false)}>Cancelar</Button>
            <Button type="submit" isLoading={isActionLoading} icon={Settings2}>Confirmar Ajuste</Button>
          </div>
        </form>
      </Modal>

    </div>
  )
}
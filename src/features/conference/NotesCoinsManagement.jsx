import React, { useState, useEffect } from 'react'
import { useAuth } from '../../core/hooks/useAuth'
import { useCashManagement } from '../../core/hooks/useCashManagement'
import { Card } from '../../shared/components/cards/Card'
import { Button } from '../../shared/components/buttons/Button'
import { Modal } from '../../shared/components/modals/Modal'
import { Edit, Save, PlusCircle, AlertTriangle, Loader2 } from 'lucide-react'

export const NotesCoinsManagement = () => {
  const { user } = useAuth()
  
  const { 
    denominations, isLoading, isActionLoading, 
    carregarEstoque, updateMetrics, registrarSobraCaixa 
  } = useCashManagement(user)

  useEffect(() => {
    carregarEstoque()
  }, [carregarEstoque])

  // Estados para Edição de Mínimos/Ideais
  const [isEditingMetrics, setIsEditingMetrics] = useState(false)
  const [metricsEdits, setMetricsEdits] = useState({})

  // Estados para Sobra de Caixa
  const [isSobraModalOpen, setIsSobraModalOpen] = useState(false)
  const [sobraValues, setSobraValues] = useState({})
  const [sobraObs, setSobraObs] = useState('')

  // Ao ativar o modo de edição, copia as métricas atuais para o estado local
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

  // Atualiza estado local da edição das métricas
  const handleMetricChange = (id, field, value) => {
    setMetricsEdits(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: parseInt(value) || 0 }
    }))
  }

  // Envia as métricas em lote para o banco
  const handleSaveMetrics = async () => {
    const payload = Object.entries(metricsEdits).map(([id, values]) => ({
      id, minima: values.minima, ideal: values.ideal
    }))
    const success = await updateMetrics(payload)
    if (success) setIsEditingMetrics(false)
  }

  // Controladores do Modal de Sobra de Caixa
  const handleSobraChange = (valorFace, qtd) => {
    setSobraValues(prev => ({ ...prev, [valorFace]: parseInt(qtd) || 0 }))
  }

  const handleSalvarSobra = async (e) => {
    e.preventDefault()
    
    // Filtra apenas os campos que tiveram valor preenchido
    const hasValues = Object.values(sobraValues).some(v => v > 0)
    if (!hasValues) {
      alert("Preencha ao menos uma nota ou moeda para registrar a sobra.")
      return
    }

    const success = await registrarSobraCaixa(sobraValues, sobraObs)
    if (success) {
      setIsSobraModalOpen(false)
      setSobraValues({})
      setSobraObs('')
    }
  }

  // Cálculo de total financeiro do cofre (apenas visualização)
  const totalCofre = denominations.reduce((acc, curr) => acc + ((curr.quantidade_atual || 0) * curr.valor), 0)
  
  // Cálculo do total em Reais que está sendo preenchido no modal de sobra
  const totalSobraReais = denominations.reduce((acc, curr) => acc + ((sobraValues[curr.valor] || 0) * curr.valor), 0)

  if (isLoading) return <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 className="animate-spin" size={32} color="var(--color-primary)" /><span>Carregando cofre...</span></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>Gestão de Notas e Moedas</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Controle de estoque do cofre principal e definição de metas.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="secondary" onClick={() => setIsSobraModalOpen(true)} icon={PlusCircle}>
            Registrar Sobra de Caixa
          </Button>
          {isEditingMetrics ? (
            <Button onClick={handleSaveMetrics} isLoading={isActionLoading} icon={Save} style={{ backgroundColor: '#16a34a' }}>
              Salvar Métricas
            </Button>
          ) : (
            <Button onClick={handleEditToggle} icon={Edit}>
              Editar Métricas
            </Button>
          )}
        </div>
      </div>

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
                  
                  {/* BLOQUEADO: Exibe apenas o número de unidades em estoque */}
                  <td style={{ textAlign: 'center', fontWeight: '900', fontSize: '1.1rem', color: '#166534', backgroundColor: '#f0fdf4' }}>
                    {d.quantidade_atual || 0}
                  </td>
                  
                  {/* BLOQUEADO: Cálculo matemático puro */}
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
            <strong>Atenção:</strong> Os valores preenchidos abaixo serão <b>SOMADOS</b> ao cofre central e registrados como <b>ENTRADA</b> na auditoria. Preencha apenas a quantidade em <b>unidades</b> de cada nota/moeda encontrada sobrando.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', maxHeight: '40vh', overflowY: 'auto' }}>
            {denominations.map(d => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{d.tipo} de R$ {d.valor.toFixed(2).replace('.', ',')}</label>
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
            <label className="input-label" style={{ marginBottom: '8px', display: 'block' }}>Origem ou Motivo da Sobra (Opcional)</label>
            <input 
              type="text" className="input-field" style={{ width: '100%' }}
              placeholder="Ex: Achado na gaveta 2, Devolvido por cliente..."
              value={sobraObs} onChange={(e) => setSobraObs(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsSobraModalOpen(false)}>Cancelar</Button>
            <Button type="submit" isLoading={isActionLoading} icon={PlusCircle}>Registrar e Adicionar ao Cofre</Button>
          </div>
        </form>
      </Modal>

    </div>
  )
}
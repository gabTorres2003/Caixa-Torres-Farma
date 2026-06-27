import React, { useState, useEffect } from 'react'
import { useAuth } from '../../core/hooks/useAuth'
import { useCashManagement } from '../../core/hooks/useCashManagement'
import { Card } from '../../shared/components/cards/Card'
import { Button } from '../../shared/components/buttons/Button'
import { Modal } from '../../shared/components/modals/Modal'
import { Table } from '../../shared/components/tables/Table'
import { Edit, Save, PlusCircle, AlertTriangle, Loader2, Settings2, Info, Clock } from 'lucide-react'

export const NotesCoinsManagement = () => {
  const { user } = useAuth()
  
  const { 
    denominations, movements, isLoading, isActionLoading, 
    carregarEstoque, updateMetrics, registrarSobraCaixa, adjustBalance
  } = useCashManagement(user)

  useEffect(() => {
    carregarEstoque()
  }, [carregarEstoque])

  // ================= ESTADOS =================
  
  // Edição de Mínimos/Ideais (Em Reais)
  const [isEditingMetrics, setIsEditingMetrics] = useState(false)
  const [metricsEdits, setMetricsEdits] = useState({})

  // Visualização de Faltantes ('NONE' | 'MINIMUM' | 'IDEAL')
  const [missingView, setMissingView] = useState('NONE')

  // Sobra de Caixa
  const [isSobraModalOpen, setIsSobraModalOpen] = useState(false)
  const [sobraValues, setSobraValues] = useState({})
  const [sobraObs, setSobraObs] = useState('')
  const [sobraOperador, setSobraOperador] = useState('') 
  const [sobraData, setSobraData] = useState(() => new Date().toISOString().split('T')[0]) 

  // Ajuste de Saldo
  const [isAjusteModalOpen, setIsAjusteModalOpen] = useState(false)
  const [ajusteValues, setAjusteValues] = useState({})
  const [ajusteOrigem, setAjusteOrigem] = useState('')
  const [ajusteObs, setAjusteObs] = useState('')

  // ================= FUNÇÕES DE MÉTRICAS =================
  const handleEditToggle = () => {
    if (!isEditingMetrics) {
      const initialEdits = {}
      denominations.forEach(d => {
        initialEdits[d.id] = { 
          minimaReais: (d.quantidade_minima || 0) * d.valor, 
          idealReais: (d.quantidade_ideal || 0) * d.valor,
          valorFace: d.valor
        }
      })
      setMetricsEdits(initialEdits)
    }
    setIsEditingMetrics(!isEditingMetrics)
  }

  const handleMetricChange = (id, field, value) => {
    setMetricsEdits(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: parseFloat(value) || 0 }
    }))
  }

  const handleSaveMetrics = async () => {
    const payload = Object.entries(metricsEdits).map(([id, values]) => ({
      id, 
      minima: Math.round(values.minimaReais / values.valorFace), 
      ideal: Math.round(values.idealReais / values.valorFace)
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
    const currentQtyReais = {}
    denominations.forEach(d => { 
      currentQtyReais[d.valor] = (d.quantidade_atual || 0) * d.valor 
    })
    setAjusteValues(currentQtyReais)
    setAjusteOrigem('')
    setAjusteObs('')
    setIsAjusteModalOpen(true)
  }

  const handleAjusteChange = (valorFace, val) => {
    setAjusteValues(prev => ({ ...prev, [valorFace]: parseFloat(val) || 0 }))
  }

  const handleSalvarAjuste = async (e) => {
    e.preventDefault()
    if (!ajusteOrigem) {
      alert("A origem/destino do ajuste é obrigatória.")
      return
    }

    const unidadesAjustadas = {}
    denominations.forEach(d => {
      const valReais = ajusteValues[d.valor]
      if (valReais !== undefined) {
        unidadesAjustadas[d.valor] = Math.round(valReais / d.valor)
      }
    })

    const success = await adjustBalance(unidadesAjustadas, ajusteOrigem, ajusteObs)
    if (success) setIsAjusteModalOpen(false)
  }

  // ================= CÁLCULOS GERAIS =================
  const totalCofre = denominations.reduce((acc, curr) => acc + ((curr.quantidade_atual || 0) * curr.valor), 0)
  const totalSobraReais = denominations.reduce((acc, curr) => acc + ((sobraValues[curr.valor] || 0) * curr.valor), 0)
  
  let diffSoma = 0
  denominations.forEach(d => {
    const currentReais = (d.quantidade_atual || 0) * d.valor
    const novoReais = ajusteValues[d.valor] ?? currentReais
    diffSoma += (novoReais - currentReais)
  })

  // ================= COLUNAS DA TABELA DE AUDITORIA =================
  const movementColumns = [
    { 
      header: 'Data/Hora', 
      render: (row) => new Date(row.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) 
    },
    { 
      header: 'Operador', 
      render: (row) => row.users?.nome || 'Sistema' 
    },
    { 
      header: 'Tipo', 
      render: (row) => (
        <span style={{ 
          color: row.tipo_movimento === 'ENTRADA' ? '#166534' : '#991b1b',
          fontWeight: 'bold',
          backgroundColor: row.tipo_movimento === 'ENTRADA' ? '#dcfce7' : '#fee2e2',
          padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem'
        }}>
          {row.tipo_movimento}
        </span>
      ) 
    },
    { 
      header: 'Origem / Destino', 
      render: (row) => (
        <span style={{ fontSize: '0.9rem' }}>
          {row.tipo_movimento === 'ENTRADA' ? (
            <><strong style={{color: '#64748b'}}>De:</strong> {row.origem} <br/><strong style={{color: '#64748b'}}>Para:</strong> {row.destino}</>
          ) : (
            <><strong style={{color: '#64748b'}}>De:</strong> {row.origem} <br/><strong style={{color: '#64748b'}}>Para:</strong> {row.destino}</>
          )}
        </span>
      )
    },
    { 
      header: 'Valor Total', 
      render: (row) => <strong style={{ color: 'var(--color-text-main)', fontSize: '1.05rem' }}>R$ {Number(row.valor_total || 0).toFixed(2).replace('.', ',')}</strong> 
    },
    {
      header: 'Observações',
      render: (row) => {
        const obs = row.detalhamento?.observacao || 'Nenhuma observação';
        const operadorRef = row.detalhamento?.operador ? `\nOperador: ${row.detalhamento.operador}` : '';
        const dataRef = row.detalhamento?.data_referente ? `\nData: ${new Date(row.detalhamento.data_referente).toLocaleDateString('pt-BR')}` : '';
        
        return (
          <button 
            onClick={() => alert(`Detalhes da Movimentação:\n\n${obs}${operadorRef}${dataRef}`)}
            style={{ background: 'none', border: 'none', color: '#0369a1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}
          >
            <Info size={16} /> Ver
          </button>
        )
      }
    }
  ]

  if (isLoading) return <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}><Loader2 className="animate-spin" size={32} color="var(--color-primary)" /><span>Carregando cofre...</span></div>

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

        {/* CONTROLES DE VISUALIZAÇÃO: LEGENDA E BOTÕES FALTANTES */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
          
          {/* Legenda */}
          <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#dc2626', fontWeight: 'bold' }}>
              <div style={{ width: 14, height: 14, backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '50%' }}></div> Abaixo do Mínimo (Crítico)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b45309', fontWeight: 'bold' }}>
              <div style={{ width: 14, height: 14, backgroundColor: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '50%' }}></div> Abaixo do Ideal (Atenção)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', fontWeight: 'bold' }}>
              <div style={{ width: 14, height: 14, backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '50%' }}></div> Acima ou no Ideal (OK)
            </span>
          </div>

          {/* Botões de Filtro de Faltantes */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setMissingView(prev => prev === 'MINIMUM' ? 'NONE' : 'MINIMUM')}
              style={{
                padding: '6px 12px', fontSize: '0.85rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s',
                border: missingView === 'MINIMUM' ? '1px solid #dc2626' : '1px solid var(--color-border)',
                backgroundColor: missingView === 'MINIMUM' ? '#fef2f2' : 'var(--color-surface)',
                color: missingView === 'MINIMUM' ? '#dc2626' : 'var(--color-text-muted)'
              }}
            >
              Falta para o Mínimo
            </button>
            <button
              onClick={() => setMissingView(prev => prev === 'IDEAL' ? 'NONE' : 'IDEAL')}
              style={{
                padding: '6px 12px', fontSize: '0.85rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s',
                border: missingView === 'IDEAL' ? '1px solid #0369a1' : '1px solid var(--color-border)',
                backgroundColor: missingView === 'IDEAL' ? '#e0f2fe' : 'var(--color-surface)',
                color: missingView === 'IDEAL' ? '#0369a1' : 'var(--color-text-muted)'
              }}
            >
              Falta para o Ideal
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', minWidth: '700px' }}>
            <thead>
              <tr>
                <th>Valor da Face</th>
                <th>Tipo</th>
                <th style={{ textAlign: 'center', color: '#d97706' }}>Mínimo (R$)</th>
                <th style={{ textAlign: 'center', color: '#0369a1' }}>Ideal (R$)</th>
                <th style={{ textAlign: 'center', color: '#16a34a' }}>Estoque Atual (Unid.)</th>
                <th style={{ textAlign: 'right' }}>Total (R$)</th>
              </tr>
            </thead>
            <tbody>
              {denominations.map(d => {
                const current = d.quantidade_atual || 0;
                const minima = d.quantidade_minima || 0;
                const ideal = d.quantidade_ideal || 0;
                
                // Cores de Status da Linha (Baseadas puramente em estar abaixo do mínimo/ideal)
                let statusColor = '#166534'; // Verde
                let statusBg = '#f0fdf4';
                let statusBorder = '#86efac';
                let isCritical = false;
                let isWarning = false;

                if (minima > 0 && current < minima) {
                  statusColor = '#dc2626';
                  statusBg = '#fef2f2';
                  statusBorder = '#fca5a5';
                  isCritical = true;
                } else if (ideal > 0 && current < ideal) {
                  statusColor = '#d97706';
                  statusBg = '#fffbeb';
                  statusBorder = '#fcd34d';
                  isWarning = true;
                }

                // Lógica dos Badges Faltantes (Controlada pelos Botões)
                let showBadge = false;
                let badgeUnidades = 0;
                let badgeReais = 0;
                let badgeLabel = '';

                if (missingView === 'IDEAL' && ideal > 0 && current < ideal) {
                  showBadge = true;
                  badgeUnidades = ideal - current;
                  badgeReais = badgeUnidades * d.valor;
                  badgeLabel = '(Ideal)';
                } else if (missingView === 'MINIMUM' && minima > 0 && current < minima) {
                  showBadge = true;
                  badgeUnidades = minima - current;
                  badgeReais = badgeUnidades * d.valor;
                  badgeLabel = '(Mín)';
                }

                return (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 'bold', borderBottom: '1px solid #e2e8f0' }}>R$ {d.valor.toFixed(2).replace('.', ',')}</td>
                    <td style={{ borderBottom: '1px solid #e2e8f0' }}><span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: d.tipo === 'NOTA' ? '#dbeafe' : '#fef3c7', color: d.tipo === 'NOTA' ? '#1e40af' : '#b45309' }}>{d.tipo}</span></td>
                    
                    {/* COLUNA MÍNIMO EM REAIS */}
                    <td style={{ textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>
                      {isEditingMetrics ? (
                        <div style={{ position: 'relative', display: 'inline-block', width: '100px' }}>
                          <span style={{ position: 'absolute', left: 8, top: 12, color: '#94a3b8', fontSize: '0.85rem' }}>R$</span>
                          <input 
                            type="number" step={d.valor} min="0" className="input-field" 
                            style={{ width: '100%', textAlign: 'center', padding: '10px 8px 10px 24px', fontSize: '0.9rem' }}
                            value={metricsEdits[d.id]?.minimaReais ?? ''} 
                            onChange={(e) => handleMetricChange(d.id, 'minimaReais', e.target.value)}
                          />
                        </div>
                      ) : (
                        <span style={{ fontWeight: 'bold', color: '#b45309' }}>R$ {(minima * d.valor).toFixed(2).replace('.', ',')}</span>
                      )}
                    </td>
                    
                    {/* COLUNA IDEAL EM REAIS */}
                    <td style={{ textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>
                      {isEditingMetrics ? (
                        <div style={{ position: 'relative', display: 'inline-block', width: '100px' }}>
                          <span style={{ position: 'absolute', left: 8, top: 12, color: '#94a3b8', fontSize: '0.85rem' }}>R$</span>
                          <input 
                            type="number" step={d.valor} min="0" className="input-field" 
                            style={{ width: '100%', textAlign: 'center', padding: '10px 8px 10px 24px', fontSize: '0.9rem' }}
                            value={metricsEdits[d.id]?.idealReais ?? ''} 
                            onChange={(e) => handleMetricChange(d.id, 'idealReais', e.target.value)}
                          />
                        </div>
                      ) : (
                        <span style={{ fontWeight: 'bold', color: '#0369a1' }}>R$ {(ideal * d.valor).toFixed(2).replace('.', ',')}</span>
                      )}
                    </td>
                    
                    {/* COLUNA DE UNIDADES COM STATUS E BADGE CONDICIONAL */}
                    <td style={{ textAlign: 'center', backgroundColor: statusBg, borderBottom: '1px solid #e2e8f0', transition: 'background-color 0.3s' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: statusColor }}>
                          {isCritical && <AlertTriangle size={16} title="Abaixo do Mínimo!" />}
                          {isWarning && <Info size={16} title="Abaixo do Ideal" />}
                          <span style={{ fontSize: '1.1rem', fontWeight: '900' }}>{current} un.</span>
                        </div>
                        {showBadge && (
                          <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: statusColor, backgroundColor: '#ffffff', padding: '2px 8px', borderRadius: '4px', border: `1px solid ${statusBorder}` }}>
                            Falta {badgeUnidades} un.
                          </span>
                        )}
                      </div>
                    </td>
                    
                    {/* COLUNA TOTAL (R$) COM STATUS E BADGE CONDICIONAL */}
                    <td style={{ textAlign: 'right', backgroundColor: statusBg, borderBottom: '1px solid #e2e8f0', transition: 'background-color 0.3s' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <span style={{ fontWeight: 'bold', color: statusColor, fontSize: '1.1rem' }}>
                          R$ {(current * d.valor).toFixed(2).replace('.', ',')}
                        </span>
                        {showBadge && (
                          <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: statusColor, backgroundColor: '#ffffff', padding: '2px 8px', borderRadius: '4px', border: `1px solid ${statusBorder}` }}>
                            Falta R$ {badgeReais.toFixed(2).replace('.', ',')}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* TABELA DE AUDITORIA (Últimas Movimentações) */}
      <Card>
        <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={24} color="var(--color-primary)" />
          <h2 style={{ fontSize: '1.25rem', color: 'var(--color-text-main)', fontWeight: 'bold', margin: 0 }}>
            Auditoria de Movimentações (Últimos 30 registros)
          </h2>
        </div>
        <div className="table-responsive-wrapper">
          <Table 
            columns={movementColumns} 
            data={movements} 
            emptyMessage="Nenhuma movimentação de cofre registrada recentemente." 
          />
        </div>
      </Card>

      {/* MODAL DE SOBRA DE CAIXA (EM UNIDADES) */}
      <Modal isOpen={isSobraModalOpen} onClose={() => setIsSobraModalOpen(false)} title="Registrar Sobra de Caixa">
        <form onSubmit={handleSalvarSobra} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '16px', borderRadius: '8px', color: '#92400e', fontSize: '0.85rem' }}>
            <AlertTriangle size={18} style={{ display: 'inline', marginBottom: '-4px', marginRight: '6px' }}/>
            <strong>Atenção:</strong> Os valores preenchidos abaixo serão <b>SOMADOS</b> ao cofre central. Preencha a quantidade em <b>unidades</b> de cada nota/moeda encontrada.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label className="input-label" style={{ marginBottom: '8px', display: 'block' }}>Operador Responsável</label>
              <select className="input-field" value={sobraOperador} onChange={(e) => setSobraOperador(e.target.value)} required>
                <option value="">Selecione...</option>
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
              placeholder="Descreva o motivo desta sobra"
              value={sobraObs} onChange={(e) => setSobraObs(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsSobraModalOpen(false)}>Cancelar</Button>
            <Button type="submit" isLoading={isActionLoading} icon={PlusCircle}>Registrar Sobra</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL DE AJUSTE DE SALDO (EM REAIS) */}
      <Modal isOpen={isAjusteModalOpen} onClose={() => setIsAjusteModalOpen(false)} title="Ajuste de Saldo">
        <form onSubmit={handleSalvarAjuste} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', padding: '16px', borderRadius: '8px', color: '#92400e', fontSize: '0.85rem' }}>
            <AlertTriangle size={18} style={{ display: 'inline', marginBottom: '-4px', marginRight: '6px' }}/>
            Modifique o total financeiro (R$) de cada nota para refletir a realidade do cofre. 
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
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{d.tipo} R$ {d.valor.toFixed(2).replace('.', ',')}</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 8, top: 12, color: '#94a3b8', fontSize: '0.85rem' }}>R$</span>
                  <input 
                    type="number" step={d.valor} min="0" className="input-field" 
                    style={{ width: '110px', textAlign: 'center', paddingLeft: '28px' }} 
                    value={ajusteValues[d.valor] ?? ''} 
                    onChange={(e) => handleAjusteChange(d.valor, e.target.value)}
                  />
                </div>
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
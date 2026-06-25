import React, { useEffect, useState } from 'react'
import { useAuth } from '../../core/hooks/useAuth'
import { useCashManagement } from '../../core/hooks/useCashManagement'
import { Card } from '../../shared/components/cards/Card'
import { Button } from '../../shared/components/buttons/Button'
import { Modal } from '../../shared/components/modals/Modal'
import { Table } from '../../shared/components/tables/Table'
import { Loader2, Coins, Banknote, Save, AlertTriangle, Clock, Briefcase, X, Settings, FileText, ArrowUpRight, ArrowDownRight } from 'lucide-react'

export const NotesCoinsManagement = () => {
  const { user } = useAuth()
  const { denominations, lastConference, movements, isLoading, isActionLoading, carregarEstoque, calcularUnidadesPorTotal, salvarLimitesEContagem, adjustBalance } = useCashManagement(user)

  const [estoqueLocal, setEstoqueLocal] = useState({})
  
  // Estados da Bolsa de Abertura
  const [isModalBolsaOpen, setIsModalBolsaOpen] = useState(false)
  const [qtdBolsas, setQtdBolsas] = useState(1)
  const [bolsasPendentes, setBolsasPendentes] = useState(0)

  // Estados do Ajuste Manual
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false)
  const [adjQuantities, setAdjQuantities] = useState({})
  const [originDest, setOriginDest] = useState('')
  const [observation, setObservation] = useState('')

  useEffect(() => {
    if (denominations.length > 0) {
      const inicial = {}
      denominations.forEach(d => {
        inicial[d.id] = {
          unidades_atual: d.quantidade_atual || 0,
          minima: d.quantidade_minima || 0,
          ideal: d.quantidade_ideal || 0,
          valor_total_digitado: d.quantidade_atual > 0 ? (d.quantidade_atual * d.valor).toFixed(2) : ''
        }
      })
      setEstoqueLocal(inicial)
      setBolsasPendentes(0)
    }
  }, [denominations])

  useEffect(() => { carregarEstoque() }, [carregarEstoque])

  const handleTotalDinheiroChange = (id, valorFace, valorDigitado) => {
    const unidades = calcularUnidadesPorTotal(valorFace, valorDigitado)
    setEstoqueLocal(prev => ({
      ...prev,
      [id]: { ...prev[id], valor_total_digitado: valorDigitado, unidades_atual: unidades }
    }))
  }

  const handleLimiteChange = (id, campo, valor) => {
    setEstoqueLocal(prev => ({
      ...prev,
      [id]: { ...prev[id], [campo]: valor === '' ? '' : Number(valor) }
    }))
  }

  const regraBolsa = [
    { valorFace: 20, qtd: 5 }, { valorFace: 10, qtd: 10 }, { valorFace: 5, qtd: 20 },
    { valorFace: 2, qtd: 50 }, { valorFace: 1, qtd: 5 }, { valorFace: 0.50, qtd: 20 },
    { valorFace: 0.25, qtd: 40 }, { valorFace: 0.10, qtd: 30 }, { valorFace: 0.05, qtd: 40 },
  ]

  const handleAplicarBolsaLocal = () => {
    if (qtdBolsas < 1) return

    let novoEstoque = { ...estoqueLocal }
    let alertas = []

    denominations.forEach(d => {
      const regra = regraBolsa.find(r => r.valorFace === Number(d.valor))
      if (regra) {
        const atual = Number(novoEstoque[d.id].unidades_atual) || 0
        const descontar = regra.qtd * qtdBolsas
        const saldoFinal = atual - descontar

        if (saldoFinal < 0) alertas.push(`Faltarão ${Math.abs(saldoFinal)} un. de R$ ${Number(d.valor).toFixed(2)}`)

        novoEstoque[d.id] = {
          ...novoEstoque[d.id],
          unidades_atual: saldoFinal,
          valor_total_digitado: saldoFinal > 0 ? (saldoFinal * d.valor).toFixed(2) : ''
        }
      }
    })

    if (alertas.length > 0) {
      const confirmar = window.confirm(`ATENÇÃO: A prévia indica que o cofre ficará negativo nos seguintes itens:\n\n${alertas.join('\n')}\n\nAplicar a previsão na tela mesmo assim?`)
      if (!confirmar) return
    }

    setEstoqueLocal(novoEstoque)
    setBolsasPendentes(prev => prev + Number(qtdBolsas))
    setIsModalBolsaOpen(false)
    setQtdBolsas(1)
  }

  const handleCancelarPrévia = () => {
    let novoEstoque = { ...estoqueLocal }
    denominations.forEach(d => {
      const regra = regraBolsa.find(r => r.valorFace === Number(d.valor))
      if (regra) {
        const atual = Number(novoEstoque[d.id].unidades_atual) || 0
        const devolver = regra.qtd * bolsasPendentes 
        const saldoFinal = atual + devolver

        novoEstoque[d.id] = {
          ...novoEstoque[d.id],
          unidades_atual: saldoFinal,
          valor_total_digitado: saldoFinal > 0 ? (saldoFinal * d.valor).toFixed(2) : ''
        }
      }
    })
    setEstoqueLocal(novoEstoque)
    setBolsasPendentes(0)
  }

  const handleSalvarTudo = async () => {
    await salvarLimitesEContagem(estoqueLocal, bolsasPendentes)
  }

  // --- FUNÇÕES DE AJUSTE (ADMIN) ---
  const openAdjustModal = () => {
    const initialQty = {};
    denominations.forEach(d => { initialQty[d.valor] = d.quantidade_atual });
    setAdjQuantities(initialQty);
    setOriginDest('');
    setObservation('');
    setIsAdjustModalOpen(true);
  }

  const handleQtyChange = (valor, text) => {
    setAdjQuantities(prev => ({ ...prev, [valor]: parseInt(text) || 0 }))
  }

  const calculateDelta = () => {
    let delta = 0;
    denominations.forEach(d => {
      const newQ = adjQuantities[d.valor] !== undefined ? adjQuantities[d.valor] : d.quantidade_atual;
      delta += (newQ - d.quantidade_atual) * d.valor;
    });
    return delta;
  }
  const deltaTotal = calculateDelta();

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!originDest.trim() || !observation.trim()) {
      alert("Os campos 'Origem/Destino' e 'Observações' são obrigatórios para realizar um ajuste!");
      return;
    }
    if (window.confirm(`Confirma o ajuste do cofre? Isso gerará uma diferença de R$ ${deltaTotal.toFixed(2).replace('.',',')} no sistema.`)) {
      await adjustBalance(adjQuantities, originDest, observation);
      setIsAdjustModalOpen(false);
    }
  }

  if (isLoading || (denominations.length > 0 && Object.keys(estoqueLocal).length === 0)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: '100px', gap: '16px' }}>
        <Loader2 className="animate-spin" size={40} color="var(--color-primary)" />
        <span style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem' }}>Sincronizando cofre...</span>
      </div>
    )
  }

  if (denominations.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <AlertTriangle size={64} color="#ef4444" style={{ margin: '0 auto 24px' }} />
        <h2 style={{ fontSize: '1.5rem', color: 'var(--color-text-main)', marginBottom: '12px' }}>Nenhum dado encontrado no Cofre</h2>
        <Button onClick={carregarEstoque}>Tentar Conectar Novamente</Button>
      </div>
    )
  }

  const notas = denominations.filter(d => d.tipo === 'NOTA')
  const moedas = denominations.filter(d => d.tipo === 'MOEDA')

  const totalNotas = notas.reduce((acc, n) => acc + ((Number(estoqueLocal[n.id]?.unidades_atual) || 0) * n.valor), 0)
  const totalMoedas = moedas.reduce((acc, m) => acc + ((Number(estoqueLocal[m.id]?.unidades_atual) || 0) * m.valor), 0)
  const totalGeral = totalNotas + totalMoedas

  let textoUltimaConferencia = "Nenhuma conferência registrada."
  if (lastConference) {
    const dataFormatada = new Date(lastConference.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    textoUltimaConferencia = `Última conferência por ${lastConference.users?.nome || 'Usuário'} em ${dataFormatada}`
  }

  const renderItem = (item) => {
    const dados = estoqueLocal[item.id]
    if (!dados) return null

    const minima = Number(dados.minima) || 0
    const ideal = Number(dados.ideal) || 0
    const unidades_atual = Number(dados.unidades_atual) || 0

    const isAbaixoMinimo = minima > 0 && unidades_atual <= minima
    const qtdRepor = ideal - unidades_atual
    const precisaRepor = ideal > 0 && qtdRepor > 0

    return (
      <div key={item.id} style={{
        border: isAbaixoMinimo ? '2px solid #ef4444' : '1px solid var(--color-border)',
        backgroundColor: isAbaixoMinimo ? '#fef2f2' : '#fff',
        padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
            R$ {Number(item.valor).toFixed(2).replace('.', ',')}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Contagem (R$)</label>
              <input 
                type="number" className="input-field" style={{ width: '100px', padding: '6px' }}
                value={dados.valor_total_digitado}
                onFocus={(e) => e.target.select()}
                onChange={(e) => handleTotalDinheiroChange(item.id, item.valor, e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '60px', backgroundColor: '#e0e7ff', padding: '6px', borderRadius: '6px' }}>
              <label style={{ fontSize: '0.7rem', color: '#1e40af' }}>Temos</label>
              <span style={{ fontWeight: 'bold', color: '#1e40af' }}>{unidades_atual}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', borderTop: '1px dashed #cbd5e1', paddingTop: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Mínimo</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                type="number" className="input-field" style={{ width: '80px', padding: '4px', paddingRight: '26px' }} 
                value={dados.minima} onFocus={(e) => e.target.select()} onChange={(e) => handleLimiteChange(item.id, 'minima', e.target.value)} 
              />
              <span style={{ position: 'absolute', right: '8px', fontSize: '0.7rem', color: '#94a3b8', pointerEvents: 'none' }}>un</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Ideal</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                type="number" className="input-field" style={{ width: '80px', padding: '4px', paddingRight: '26px' }} 
                value={dados.ideal} onFocus={(e) => e.target.select()} onChange={(e) => handleLimiteChange(item.id, 'ideal', e.target.value)} 
              />
              <span style={{ position: 'absolute', right: '8px', fontSize: '0.7rem', color: '#94a3b8', pointerEvents: 'none' }}>un</span>
            </div>
          </div>
        </div>

        {precisaRepor && (
          <div style={{ color: isAbaixoMinimo ? '#b91c1c' : '#d97706', fontSize: '0.8rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={14} /> 
            Repor {qtdRepor} un. (R$ {(qtdRepor * Number(item.valor)).toFixed(2).replace('.', ',')})
          </div>
        )}
      </div>
    )
  }

  // Colunas da Auditoria
  const auditColumns = [
    { header: 'Data', render: (row) => new Date(row.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) },
    { header: 'Operação', render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {row.tipo_movimento === 'ENTRADA' ? <ArrowUpRight size={16} color="#16a34a" /> : <ArrowDownRight size={16} color="#dc2626" />}
          <span style={{ fontWeight: 'bold', color: row.tipo_movimento === 'ENTRADA' ? '#16a34a' : '#dc2626' }}>{row.tipo_movimento}</span>
          {row.detalhamento?.isAjuste && <span style={{ backgroundColor: '#fef3c7', color: '#9f1239', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>AJUSTE</span>}
        </div>
      )
    },
    { header: 'Usuário', render: (row) => row.users?.nome || 'Sistema' },
    { header: 'De / Para', render: (row) => <span style={{ fontSize: '0.85rem', color: '#475569' }}><b>{row.origem}</b> ➔ {row.destino}</span> },
    { header: 'Valor (R$)', render: (row) => <strong style={{ color: '#0f172a' }}>R$ {Number(row.valor_total).toFixed(2).replace('.', ',')}</strong> },
    { header: 'Observação', render: (row) => <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{row.detalhamento?.observacao || '-'}</span> }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>Cofre Central (Trocos)</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Controle de contagem e parâmetros de limite de segurança.</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Em Notas</p>
            <p style={{ fontWeight: 'bold', color: 'var(--color-text-main)' }}>R$ {totalNotas.toFixed(2).replace('.', ',')}</p>
          </div>
          <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Em Moedas</p>
            <p style={{ fontWeight: 'bold', color: 'var(--color-text-main)' }}>R$ {totalMoedas.toFixed(2).replace('.', ',')}</p>
          </div>
          <div style={{ backgroundColor: '#e0e7ff', border: '1px solid #c7d2fe', padding: '12px 24px', borderRadius: '8px', textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', color: '#1e40af', textTransform: 'uppercase' }}>Total no Cofre</p>
            <p style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#1e40af' }}>R$ {totalGeral.toFixed(2).replace('.', ',')}</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '0.9rem' }}>
          <Clock size={16} />
          {textoUltimaConferencia}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {bolsasPendentes > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#fffbeb', padding: '6px 12px', borderRadius: '6px', border: '1px solid #fde68a' }}>
              <span style={{ color: '#d97706', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={16} /> {bolsasPendentes} bolsa(s) pré-visualizada(s)
              </span>
              <button type="button" onClick={handleCancelarPrévia} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <X size={14} /> Cancelar
              </button>
            </div>
          )}
          <Button variant="secondary" onClick={() => setIsModalBolsaOpen(true)} icon={Briefcase}>Prévia de Bolsa</Button>
          {user.role === 'ADMIN' && <Button onClick={openAdjustModal} icon={Settings} style={{ backgroundColor: '#0f172a', color: '#fff' }}>Ajuste de Saldo</Button>}
          <Button onClick={handleSalvarTudo} isLoading={isActionLoading} icon={Save}>Salvar Cofre</Button>
        </div>
      </div>

      {/* RENDERIZAÇÃO BLINDADA: Usa arrow function pura para evitar repasse de argumentos ocultos do .map */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <Card title="Cédulas" icon={Banknote}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>{notas.map(item => renderItem(item))}</div>
        </Card>
        <Card title="Moedas" icon={Coins}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>{moedas.map(item => renderItem(item))}</div>
        </Card>
      </div>

      <Card title="Últimas Movimentações e Auditoria" icon={FileText}>
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <Table columns={auditColumns} data={movements} emptyMessage="Nenhuma movimentação registrada." />
        </div>
      </Card>

      {/* MODAL 1: BOLSA DE ABERTURA */}
      <Modal isOpen={isModalBolsaOpen} onClose={() => setIsModalBolsaOpen(false)} title="Simular Bolsa de Abertura">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
            O sistema descontará <strong>R$ 430,00</strong> na tela por cada bolsa simulada, respeitando a divisão unitária abaixo:
          </p>
          
          <div style={{ backgroundColor: '#f1f5f9', padding: '16px', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--color-text-main)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div><strong style={{ color: 'var(--color-primary)' }}>Notas (R$ 400,00)</strong><br/>• 5 un. de R$ 20,00<br/>• 10 un. de R$ 10,00<br/>• 20 un. de R$ 5,00<br/>• 50 un. de R$ 2,00</div>
            <div><strong style={{ color: 'var(--color-primary)' }}>Moedas (R$ 30,00)</strong><br/>• 5 un. de R$ 1,00<br/>• 20 un. de R$ 0,50<br/>• 40 un. de R$ 0,25<br/>• 30 un. de R$ 0,10<br/>• 40 un. de R$ 0,05</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--color-text-main)' }}>Quantas bolsas deseja simular?</label>
            <input type="number" min="1" value={qtdBolsas} onChange={(e) => setQtdBolsas(e.target.value)} className="input-field" style={{ width: '100px' }} />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <Button variant="secondary" onClick={() => setIsModalBolsaOpen(false)}>Cancelar</Button>
            <Button onClick={handleAplicarBolsaLocal}>Aplicar Prévia na Tela</Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: AJUSTE DE SALDO (SOMENTE ADMIN) */}
      <Modal isOpen={isAdjustModalOpen} onClose={() => setIsAdjustModalOpen(false)} title="Ajuste Manual de Saldo">
        <form onSubmit={handleAdjustSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', boxSizing: 'border-box' }}>
          
          <div style={{ backgroundColor: '#fffbeb', color: '#92400e', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span><b>Atenção Admin:</b> Altere os valores abaixo para a <b>quantidade física real (em unidades)</b>. O sistema calculará a diferença e gerará um registro de auditoria.</span>
          </div>

          <div style={{ width: '100%', overflow: 'hidden' }}>
            <label style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#334155', marginBottom: '8px', display: 'block' }}>Cédulas (Unidades):</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px', padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              {notas.map(n => (
                <div key={n.valor} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>R$ {n.valor}</label>
                  <input type="number" min="0" className="input-field" style={{ width: '100%' }} value={adjQuantities[n.valor] ?? ''} onChange={(e) => handleQtyChange(n.valor, e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          <div style={{ width: '100%', overflow: 'hidden' }}>
            <label style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#334155', marginBottom: '8px', display: 'block' }}>Moedas (Unidades):</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px', padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              {moedas.map(m => (
                <div key={m.valor} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>¢ {m.valor.toFixed(2)}</label>
                  <input type="number" min="0" className="input-field" style={{ width: '100%' }} value={adjQuantities[m.valor] ?? ''} onChange={(e) => handleQtyChange(m.valor, e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: deltaTotal === 0 ? '#f1f5f9' : (deltaTotal > 0 ? '#dcfce7' : '#fee2e2'), borderRadius: '8px', border: '1px solid', borderColor: deltaTotal === 0 ? '#cbd5e1' : (deltaTotal > 0 ? '#86efac' : '#fecaca') }}>
            <span style={{ fontWeight: 'bold', color: '#334155' }}>Diferença Financeira:</span>
            <span style={{ fontSize: '1.2rem', fontWeight: '900', color: deltaTotal === 0 ? '#475569' : (deltaTotal > 0 ? '#16a34a' : '#dc2626') }}>
              {deltaTotal > 0 ? '+' : (deltaTotal < 0 ? '-' : '')} R$ {Math.abs(deltaTotal).toFixed(2).replace('.', ',')}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
            <div className="input-wrapper">
              <label className="input-label">Origem/Destino (Auditoria)</label>
              <input type="text" className="input-field" style={{ width: '100%' }} placeholder="Ex: Quebra de Caixa / Troco Errado" value={originDest} onChange={e => setOriginDest(e.target.value)} required />
            </div>
            <div className="input-wrapper">
              <label className="input-label">Observações Justificativas</label>
              <textarea className="input-field" rows="2" style={{ width: '100%', resize: 'none' }} placeholder="Detalhe o motivo do ajuste manual..." value={observation} onChange={e => setObservation(e.target.value)} required />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsAdjustModalOpen(false)} style={{ width: '100%', justifyContent: 'center' }}>Cancelar</Button>
            <Button type="submit" isLoading={isActionLoading} style={{ width: '100%', justifyContent: 'center' }} icon={Save}>Salvar Ajuste</Button>
          </div>
        </form>
      </Modal>

    </div>
  )
}
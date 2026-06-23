import React, { useEffect, useState } from 'react'
import { useAuth } from '../../core/hooks/useAuth'
import { useCashManagement } from '../../core/hooks/useCashManagement'
import { Card } from '../../shared/components/cards/Card'
import { Button } from '../../shared/components/buttons/Button'
import { Modal } from '../../shared/components/modals/Modal'
import { Loader2, Coins, Banknote, Save, AlertTriangle, Clock, Briefcase } from 'lucide-react'

export const NotesCoinsManagement = () => {
  const { user } = useAuth()
  const { denominations, lastConference, isLoading, carregarEstoque, calcularUnidadesPorTotal, salvarLimitesEContagem } = useCashManagement(user)

  const [estoqueLocal, setEstoqueLocal] = useState({})
  
  const [isModalBolsaOpen, setIsModalBolsaOpen] = useState(false)
  const [qtdBolsas, setQtdBolsas] = useState(1)
  const [bolsasPendentes, setBolsasPendentes] = useState(0) // Controla o que não foi salvo

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

  useEffect(() => {
    carregarEstoque()
  }, [carregarEstoque])

  const handleTotalDinheiroChange = (id, valorFace, valorDigitado) => {
    const unidades = calcularUnidadesPorTotal(valorFace, valorDigitado)
    setEstoqueLocal(prev => ({
      ...prev,
      [id]: { ...prev[id], valor_total_digitado: valorDigitado, unidades_atual: unidades }
    }))
  }

  const handleLimiteChange = (id, campo, valor) => {
    // Permite vazio para não travar o 0, converte se tiver número
    setEstoqueLocal(prev => ({
      ...prev,
      [id]: { ...prev[id], [campo]: valor === '' ? '' : Number(valor) }
    }))
  }

  // --- NOVA LÓGICA: APENAS PRÉVIA NA TELA ---
  const handleAplicarBolsaLocal = () => {
    if (qtdBolsas < 1) return

    const regraBolsa = [
      { valorFace: 20, qtd: 5 }, { valorFace: 10, qtd: 10 }, { valorFace: 5, qtd: 20 },
      { valorFace: 2, qtd: 50 }, { valorFace: 1, qtd: 5 }, { valorFace: 0.50, qtd: 20 },
      { valorFace: 0.25, qtd: 40 }, { valorFace: 0.10, qtd: 30 }, { valorFace: 0.05, qtd: 40 },
    ]

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
          valor_total_digitado: (saldoFinal * d.valor).toFixed(2)
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

  const handleSalvarTudo = async () => {
    await salvarLimitesEContagem(estoqueLocal, bolsasPendentes)
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
    const dataFormatada = new Date(lastConference.created_at).toLocaleString('pt-BR', { 
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    })
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
            R$ {item.valor.toFixed(2).replace('.', ',')}
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
                type="number" 
                className="input-field" 
                style={{ width: '80px', padding: '4px', paddingRight: '26px' }} 
                value={dados.minima} 
                onFocus={(e) => e.target.select()}
                onChange={(e) => handleLimiteChange(item.id, 'minima', e.target.value)} 
              />
              <span style={{ position: 'absolute', right: '8px', fontSize: '0.7rem', color: '#94a3b8', pointerEvents: 'none' }}>un</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Ideal</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                type="number" 
                className="input-field" 
                style={{ width: '80px', padding: '4px', paddingRight: '26px' }} 
                value={dados.ideal} 
                onFocus={(e) => e.target.select()}
                onChange={(e) => handleLimiteChange(item.id, 'ideal', e.target.value)} 
              />
              <span style={{ position: 'absolute', right: '8px', fontSize: '0.7rem', color: '#94a3b8', pointerEvents: 'none' }}>un</span>
            </div>
          </div>
        </div>

        {precisaRepor && (
          <div style={{ color: isAbaixoMinimo ? '#b91c1c' : '#d97706', fontSize: '0.8rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={14} /> 
            Repor {qtdRepor} un. (R$ {(qtdRepor * item.valor).toFixed(2).replace('.', ',')})
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>Cofre Central (Trocos)</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Controle de contagem e parâmetros de limite de segurança.</p>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '0.9rem' }}>
          <Clock size={16} />
          {textoUltimaConferencia}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: 'max-content' }}>
          {bolsasPendentes > 0 && (
            <span style={{ color: '#d97706', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={16} /> {bolsasPendentes} bolsa(s) pré-visualizada(s) (Não Salvo)
            </span>
          )}
          <Button variant="secondary" onClick={() => setIsModalBolsaOpen(true)} icon={Briefcase}>
            Prévia de Bolsa
          </Button>
          <Button onClick={handleSalvarTudo} icon={Save}>
            Salvar Cofre
          </Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <Card title="Cédulas" icon={Banknote}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>{notas.map(renderItem)}</div>
        </Card>
        <Card title="Moedas" icon={Coins}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>{moedas.map(renderItem)}</div>
        </Card>
      </div>

      <Modal isOpen={isModalBolsaOpen} onClose={() => setIsModalBolsaOpen(false)} title="Simular Bolsa de Abertura">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
            O sistema descontará <strong>R$ 430,00</strong> na tela por cada bolsa simulada, respeitando a divisão unitária abaixo:
          </p>
          
          <div style={{ backgroundColor: '#f1f5f9', padding: '16px', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--color-text-main)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <strong style={{ color: 'var(--color-primary)' }}>Notas (R$ 400,00)</strong><br/>
              • 5 un. de R$ 20,00<br/>
              • 10 un. de R$ 10,00<br/>
              • 20 un. de R$ 5,00<br/>
              • 50 un. de R$ 2,00
            </div>
            <div>
              <strong style={{ color: 'var(--color-primary)' }}>Moedas (R$ 30,00)</strong><br/>
              • 5 un. de R$ 1,00<br/>
              • 20 un. de R$ 0,50<br/>
              • 40 un. de R$ 0,25<br/>
              • 30 un. de R$ 0,10<br/>
              • 40 un. de R$ 0,05
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--color-text-main)' }}>Quantas bolsas deseja simular?</label>
            <input 
              type="number" min="1" value={qtdBolsas} onChange={(e) => setQtdBolsas(e.target.value)} 
              className="input-field" style={{ width: '100px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <Button variant="secondary" onClick={() => setIsModalBolsaOpen(false)}>Cancelar</Button>
            <Button onClick={handleAplicarBolsaLocal}>Aplicar Prévia na Tela</Button>
          </div>
        </div>
      </Modal>

    </div>
  )
}
import React, { useEffect, useState } from 'react'
import { useAuth } from '../../core/hooks/useAuth'
import { useCashManagement } from '../../core/hooks/useCashManagement'
import { Card } from '../../shared/components/cards/Card'
import { Button } from '../../shared/components/buttons/Button'
import { Loader2, Coins, Banknote, Save, AlertTriangle } from 'lucide-react'

export const NotesCoinsManagement = () => {
  const { user } = useAuth()
  const { denominations, isLoading, carregarEstoque, calcularUnidadesPorTotal, salvarLimitesEContagem } = useCashManagement(user?.store_id)

  const [estoqueLocal, setEstoqueLocal] = useState({})

  // Transforma os dados do banco em um estado local para podermos editar na tela antes de salvar
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
    }
  }, [denominations])

  // Lida com a digitação do valor e calcula as unidades automaticamente
  const handleTotalDinheiroChange = (id, valorFace, valorDigitado) => {
    const unidades = calcularUnidadesPorTotal(valorFace, valorDigitado)
    setEstoqueLocal(prev => ({
      ...prev,
      [id]: { ...prev[id], valor_total_digitado: valorDigitado, unidades_atual: unidades }
    }))
  }

  // Lida com a alteração manual das metas de mínimo e ideal
  const handleLimiteChange = (id, campo, valor) => {
    setEstoqueLocal(prev => ({
      ...prev,
      [id]: { ...prev[id], [campo]: Number(valor) }
    }))
  }

  if (isLoading || (denominations.length > 0 && Object.keys(estoqueLocal).length === 0)) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px', alignItems: 'center', gap: '12px' }}>
        <Loader2 className="animate-spin" size={32} color="var(--color-primary)" />
        <span style={{ color: 'var(--color-text-muted)' }}>Sincronizando cofre...</span>
      </div>
    )
  }

  const notas = denominations.filter(d => d.tipo === 'NOTA')
  const moedas = denominations.filter(d => d.tipo === 'MOEDA')

  // --- CÁLCULO DOS RESUMOS TOTAIS ---
  const totalNotas = notas.reduce((acc, n) => acc + (estoqueLocal[n.id]?.unidades_atual * n.valor || 0), 0)
  const totalMoedas = moedas.reduce((acc, m) => acc + (estoqueLocal[m.id]?.unidades_atual * m.valor || 0), 0)
  const totalGeral = totalNotas + totalMoedas

  // --- COMPONENTE REUTILIZÁVEL PARA DESENHAR AS LINHAS (NOTAS E MOEDAS) ---
  const renderItem = (item) => {
    const dados = estoqueLocal[item.id]
    if (!dados) return null

    // Lógica dos Alertas Visuais
    const isAbaixoMinimo = dados.minima > 0 && dados.unidades_atual <= dados.minima
    const qtdRepor = dados.ideal - dados.unidades_atual
    const precisaRepor = dados.ideal > 0 && qtdRepor > 0

    return (
      <div key={item.id} style={{
        border: isAbaixoMinimo ? '2px solid #ef4444' : '1px solid var(--color-border)',
        backgroundColor: isAbaixoMinimo ? '#fef2f2' : '#fff',
        padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px'
      }}>
        {/* Topo: Valor e Digitação da Contagem */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
            R$ {item.valor.toFixed(2).replace('.', ',')}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Contagem (Total R$)</label>
              <input 
                type="number" className="input-field" style={{ width: '110px', padding: '6px' }}
                value={dados.valor_total_digitado}
                onChange={(e) => handleTotalDinheiroChange(item.id, item.valor, e.target.value)}
                placeholder="Ex: 100"
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '70px', backgroundColor: '#e0e7ff', padding: '6px', borderRadius: '6px' }}>
              <label style={{ fontSize: '0.7rem', color: '#1e40af' }}>Temos</label>
              <span style={{ fontWeight: 'bold', color: '#1e40af' }}>{dados.unidades_atual} un</span>
            </div>
          </div>
        </div>

        {/* Linha de Limites (Mínimo e Ideal) */}
        <div style={{ display: 'flex', gap: '12px', borderTop: '1px dashed #cbd5e1', paddingTop: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Aviso Mín.</label>
            <input type="number" className="input-field" style={{ width: '60px', padding: '4px' }} value={dados.minima} onChange={(e) => handleLimiteChange(item.id, 'minima', e.target.value)} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Ideal</label>
            <input type="number" className="input-field" style={{ width: '60px', padding: '4px' }} value={dados.ideal} onChange={(e) => handleLimiteChange(item.id, 'ideal', e.target.value)} />
          </div>
        </div>

        {/* Mensagem de Alerta para Reposição */}
        {precisaRepor && (
          <div style={{ color: isAbaixoMinimo ? '#b91c1c' : '#d97706', fontSize: '0.8rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={14} /> 
            Repor {qtdRepor} unidades (R$ {(qtdRepor * item.valor).toFixed(2).replace('.', ',')})
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
      
      {/* CABEÇALHO COM RESUMO GERAL */}
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

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button onClick={() => salvarLimitesEContagem(estoqueLocal)} icon={Save}>
          Salvar Contagem e Configurações
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* COLUNA 1: NOTAS */}
        <Card title="Cédulas" icon={Banknote}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {notas.map(renderItem)}
          </div>
        </Card>

        {/* COLUNA 2: MOEDAS */}
        <Card title="Moedas" icon={Coins}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {moedas.map(renderItem)}
          </div>
        </Card>
      </div>
    </div>
  )
}
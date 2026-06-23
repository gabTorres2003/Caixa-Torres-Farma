import React, { useEffect, useState } from 'react'
import { useAuth } from '../../core/hooks/useAuth'
import { useCashManagement } from '../../core/hooks/useCashManagement'
import { Card } from '../../shared/components/cards/Card'
import { Button } from '../../shared/components/buttons/Button'
import { Loader2, Coins, Banknote, Save, AlertTriangle, Clock } from 'lucide-react'

export const NotesCoinsManagement = () => {
  const { user } = useAuth()
  const { denominations, lastConference, isLoading, carregarEstoque, calcularUnidadesPorTotal, salvarLimitesEContagem } = useCashManagement(user)

  const [estoqueLocal, setEstoqueLocal] = useState({})

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
    setEstoqueLocal(prev => ({
      ...prev,
      [id]: { ...prev[id], [campo]: Number(valor) }
    }))
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
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '32px', lineHeight: '1.6' }}>
          Não foi possível ler as configurações de notas e moedas. Verifique se o script SQL de criação das tabelas foi executado corretamente.
        </p>
        <Button onClick={carregarEstoque}>Tentar Conectar Novamente</Button>
      </div>
    )
  }

  const notas = denominations.filter(d => d.tipo === 'NOTA')
  const moedas = denominations.filter(d => d.tipo === 'MOEDA')

  const totalNotas = notas.reduce((acc, n) => acc + (estoqueLocal[n.id]?.unidades_atual * n.valor || 0), 0)
  const totalMoedas = moedas.reduce((acc, m) => acc + (estoqueLocal[m.id]?.unidades_atual * m.valor || 0), 0)
  const totalGeral = totalNotas + totalMoedas

  let textoUltimaConferencia = "Nenhuma conferência registrada."
  if (lastConference) {
    const dataFormatada = new Date(lastConference.created_at).toLocaleString('pt-BR', { 
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    })
    textoUltimaConferencia = `Última conferência salva por ${lastConference.users?.nome || 'Usuário'} em ${dataFormatada}`
  }

  const renderItem = (item) => {
    const dados = estoqueLocal[item.id]
    if (!dados) return null

    const isAbaixoMinimo = dados.minima > 0 && dados.unidades_atual <= dados.minima
    const qtdRepor = dados.ideal - dados.unidades_atual
    const precisaRepor = dados.ideal > 0 && qtdRepor > 0

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

        <div style={{ width: 'max-content' }}>
          <Button onClick={() => salvarLimitesEContagem(estoqueLocal)} icon={Save}>
            Salvar Contagem e Configurações
          </Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <Card title="Cédulas" icon={Banknote}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {notas.map(renderItem)}
          </div>
        </Card>

        <Card title="Moedas" icon={Coins}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {moedas.map(renderItem)}
          </div>
        </Card>
      </div>
    </div>
  )
}
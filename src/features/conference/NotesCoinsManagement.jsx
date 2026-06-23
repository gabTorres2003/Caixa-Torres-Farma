import React, { useEffect, useState } from 'react'
import { useAuth } from '../../core/hooks/useAuth'
import { useCashManagement } from '../../core/hooks/useCashManagement'
import { Card } from '../../shared/components/cards/Card'
import { Loader2, Coins, Banknote, AlertTriangle } from 'lucide-react'

export const NotesCoinsManagement = () => {
  const { user } = useAuth()
  
  // A tela importa a inteligência do Hook (Camada Core)
  const { denominations, isLoading, carregarEstoque, calcularUnidadesPorTotal } = useCashManagement(user?.store_id)

  // Estado para guardar o valor digitado temporariamente na tela de contagem
  const [inputsContagem, setInputsContagem] = useState({})

  useEffect(() => {
    carregarEstoque()
  }, [carregarEstoque])

  const handleTotalChange = (idNota, valorFace, valorDigitado) => {
    const unidades = calcularUnidadesPorTotal(valorFace, valorDigitado)
    setInputsContagem(prev => ({
      ...prev,
      [idNota]: { total: valorDigitado, unidades }
    }))
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}>
        <Loader2 className="animate-spin" size={32} color="var(--color-primary)" />
      </div>
    )
  }

  const notas = denominations.filter(d => d.tipo === 'NOTA')
  const moedas = denominations.filter(d => d.tipo === 'MOEDA')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '1.875rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>Gestão de Notas e Moedas</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>Controle de contagem, limites e movimentação de troco do cofre.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* COLUNA 1: NOTAS */}
        <Card title="Cédulas (Notas)" icon={Banknote}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {notas.map((nota) => {
              const contagem = inputsContagem[nota.id] || { total: '', unidades: 0 }
              return (
                <div key={nota.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 'bold', width: '80px' }}>R$ {nota.valor.toFixed(2).replace('.', ',')}</span>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Valor Total (R$)</label>
                      <input 
                        type="number" 
                        className="input-field" 
                        style={{ width: '100px', padding: '6px' }}
                        value={contagem.total}
                        onChange={(e) => handleTotalChange(nota.id, nota.valor, e.target.value)}
                        placeholder="Ex: 100"
                      />
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '80px', backgroundColor: '#f1f5f9', padding: '6px', borderRadius: '6px' }}>
                      <label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Unidades</label>
                      <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>{contagem.unidades} un</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* COLUNA 2: MOEDAS */}
        <Card title="Moedas" icon={Coins}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* O mesmo map das notas, mas usando o array 'moedas' */}
            {moedas.map((moeda) => {
              const contagem = inputsContagem[moeda.id] || { total: '', unidades: 0 }
              return (
                <div key={moeda.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 'bold', width: '80px' }}>R$ {moeda.valor.toFixed(2).replace('.', ',')}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Valor Total (R$)</label>
                      <input 
                        type="number" className="input-field" style={{ width: '100px', padding: '6px' }}
                        value={contagem.total} onChange={(e) => handleTotalChange(moeda.id, moeda.valor, e.target.value)}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '80px', backgroundColor: '#f1f5f9', padding: '6px', borderRadius: '6px' }}>
                      <label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Unidades</label>
                      <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>{contagem.unidades} un</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}
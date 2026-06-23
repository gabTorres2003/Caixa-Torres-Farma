import { useState, useCallback } from 'react'
import { SupabaseCashRepository } from '../../infrastructure/supabase/repositories/SupabaseCashRepository'
import { supabase } from '../../infrastructure/supabase/supabaseClient'

export const useCashManagement = (user) => {
  const storeId = user?.store_id
  const [denominations, setDenominations] = useState([])
  const [lastConference, setLastConference] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const carregarEstoque = useCallback(async () => {
    if (!storeId) {
      setIsLoading(false)
      return
    }
    
    setIsLoading(true)
    try {
      let data = await SupabaseCashRepository.getDenominations(storeId)
      if (data.length === 0) {
        await SupabaseCashRepository.initializeDenominations(storeId)
        data = await SupabaseCashRepository.getDenominations(storeId)
      }
      setDenominations(data)

      const ultima = await SupabaseCashRepository.getLastConference(storeId)
      setLastConference(ultima)

    } catch (error) {
      console.error('Erro ao carregar estoque:', error)
      alert('Atenção: Erro de conexão com o banco de dados. Detalhe: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }, [storeId])

  const calcularUnidadesPorTotal = (valorFace, valorTotalDigitado) => {
    if (!valorTotalDigitado || isNaN(valorTotalDigitado)) return 0
    return Math.floor(parseFloat(valorTotalDigitado) / parseFloat(valorFace))
  }

  const salvarLimitesEContagem = async (estoqueLocal) => {
    // Trava de segurança garantindo que o usuário existe na memória
    if (!user) {
      alert('Sessão do usuário não encontrada. Recarregue a página.');
      return;
    }

    setIsLoading(true)
    try {
      const promises = Object.entries(estoqueLocal).map(([id, dados]) => {
        return supabase.from('cash_denominations')
          .update({
            quantidade_atual: dados.unidades_atual,
            quantidade_minima: dados.minima,
            quantidade_ideal: dados.ideal
          })
          .eq('id', id)
      })
      await Promise.all(promises)

      let valor_total = 0
      let detalhamento = {}

      Object.entries(estoqueLocal).forEach(([id, dados]) => {
        const denom = denominations.find(d => d.id === id)
        if (denom) {
          valor_total += (dados.unidades_atual * denom.valor)
          detalhamento[denom.valor.toString()] = dados.unidades_atual
        }
      })

      await SupabaseCashRepository.registerMovement({
        store_id: user.store_id,
        created_by: user.id,
        tipo_movimento: 'CONTAGEM_INICIAL',
        valor_total: valor_total,
        origem: 'Cofre Central',
        destino: 'Cofre Central',
        detalhamento: detalhamento
      })

      alert('Estoque do cofre, limites e registro de conferência salvos com sucesso!')
      await carregarEstoque()
    } catch (err) {
      alert('Erro ao salvar as configurações: ' + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return { denominations, lastConference, isLoading, carregarEstoque, calcularUnidadesPorTotal, salvarLimitesEContagem }
}
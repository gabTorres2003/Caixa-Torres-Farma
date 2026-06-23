import { useState, useCallback } from 'react'
import { SupabaseCashRepository } from '../../infrastructure/supabase/repositories/SupabaseCashRepository'
import { supabase } from '../../infrastructure/supabase/supabaseClient'

export const useCashManagement = (storeId) => {
  const [denominations, setDenominations] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const carregarEstoque = useCallback(async () => {
    if (!storeId) return
    setIsLoading(true)
    try {
      let data = await SupabaseCashRepository.getDenominations(storeId)
      if (data.length === 0) {
        await SupabaseCashRepository.initializeDenominations(storeId)
        data = await SupabaseCashRepository.getDenominations(storeId)
      }
      setDenominations(data)
    } catch (error) {
      console.error('Erro ao carregar estoque:', error)
    } finally {
      setIsLoading(false)
    }
  }, [storeId])

  const calcularUnidadesPorTotal = (valorFace, valorTotalDigitado) => {
    if (!valorTotalDigitado || isNaN(valorTotalDigitado)) return 0
    return Math.floor(parseFloat(valorTotalDigitado) / parseFloat(valorFace))
  }

  // Salva as contagens e os limites de segurança no banco
  const salvarLimitesEContagem = async (estoqueLocal) => {
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
      alert('Estoque do cofre e limites salvos com sucesso!')
      await carregarEstoque()
    } catch (err) {
      alert('Erro ao salvar as configurações: ' + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return { denominations, isLoading, carregarEstoque, calcularUnidadesPorTotal, salvarLimitesEContagem }
}
import { useState, useCallback } from 'react'
import { SupabaseCashRepository } from '../../infrastructure/supabase/repositories/SupabaseCashRepository'

export const useCashManagement = (storeId) => {
  const [denominations, setDenominations] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // 1. Carrega os dados (e cria o padrão se estiver vazio)
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
      console.error('Erro ao carregar estoque de dinheiro:', error)
    } finally {
      setIsLoading(false)
    }
  }, [storeId])

  // 2. Lógica Inteligente: Calcula unidades baseado no valor total digitado
  const calcularUnidadesPorTotal = (valorFace, valorTotalDigitado) => {
    if (!valorTotalDigitado || isNaN(valorTotalDigitado)) return 0
    return Math.floor(parseFloat(valorTotalDigitado) / parseFloat(valorFace))
  }

  return {
    denominations,
    isLoading,
    carregarEstoque,
    calcularUnidadesPorTotal
  }
}
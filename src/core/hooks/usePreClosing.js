import { useState, useCallback, useEffect } from 'react'
import { PreClosingRepository } from '../../infrastructure/supabase/repositories/SupabasePreClosingRepository'

export const usePreClosing = (user) => {
  const [isLoading, setIsLoading] = useState(false)
  const [isPageLoading, setIsPageLoading] = useState(true)
  
  // Estado para armazenar a soma das entregas pendentes
  const [pendentes, setPendentes] = useState({ dinheiro: 0, cartao: 0 })

  const carregarPendentes = useCallback(async () => {
    if (!user?.store_id) return
    setIsPageLoading(true)
    
    try {
      const tzOffset = new Date().getTimezoneOffset() * 60000
      const dateStr = new Date(Date.now() - tzOffset).toISOString().split('T')[0]

      const data = await PreClosingRepository.getPendingDeliveriesTotals(user.store_id, dateStr)

      let totalDinheiro = 0
      let totalCartao = 0

      data.forEach(d => {
        const forma = d.forma_pagamento_real || d.tipo_saida
        if (forma === 'D') totalDinheiro += Number(d.valor)
        if (forma === 'C') totalCartao += Number(d.valor)
      })

      setPendentes({ dinheiro: totalDinheiro, cartao: totalCartao })
    } catch (error) {
      console.error('Erro ao buscar entregas pendentes:', error)
    } finally {
      setIsPageLoading(false)
    }
  }, [user])

  useEffect(() => {
    carregarPendentes()
  }, [carregarPendentes])

  const salvarFechamento = async (payload) => {
    setIsLoading(true)
    try {
      await PreClosingRepository.savePreClosing({
        ...payload,
        store_id: user.store_id,
        created_by: user.id
      })
      alert('Pré-fechamento salvo com sucesso no banco de dados!')
    } catch (error) {
      alert('Erro ao salvar fechamento: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return { 
    pendentes, 
    isLoading, 
    isPageLoading,
    salvarFechamento, 
    carregarPendentes 
  }
}
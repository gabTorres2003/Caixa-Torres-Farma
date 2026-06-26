import { useState, useCallback, useMemo, useEffect } from 'react'
import { supabase } from '../../infrastructure/supabase/supabaseClient'
import { PreClosingRepository } from '../../infrastructure/supabase/repositories/SupabasePreClosingRepository' // Ajuste o caminho se o nome do seu arquivo for diferente

export const usePreClosing = (user) => {
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [pendingDeliveries, setPendingDeliveries] = useState([])
  const [lastPreClosing, setLastPreClosing] = useState(null)
  
  // Estados do Histórico
  const [history, setHistory] = useState([])
  const [dataFiltro, setDataFiltro] = useState(() => {
    const tzOffset = new Date().getTimezoneOffset() * 60000
    return new Date(Date.now() - tzOffset).toISOString().split('T')[0]
  })

  const loadInitialData = useCallback(async () => {
    if (!user || !user.store_id) return;

    setIsPageLoading(true)
    try {
      // 1. Busca Entregas Pendentes (Usando o repositório)
      const deliveries = await PreClosingRepository.getPendingDeliveriesTotals(user.store_id, new Date().toISOString().split('T')[0])
      setPendingDeliveries(deliveries || [])

      // 2. Busca último pré-fechamento
      const { data: preClosing, error: errorPreClosing } = await supabase
        .from('pre_closings')
        .select('*')
        .eq('store_id', user.store_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (errorPreClosing && errorPreClosing.code !== 'PGRST116') {
         throw errorPreClosing
      }
      setLastPreClosing(preClosing || null)

      // 3. Busca Histórico (Usando o repositório)
      const historyData = await PreClosingRepository.getPreClosingsHistory(user.store_id, dataFiltro)
      setHistory(historyData)

    } catch (err) {
      console.error("Erro ao carregar dados do pré-fechamento:", err)
    } finally {
      setIsPageLoading(false)
    }
  }, [user, dataFiltro])

  // Recarrega automático ao trocar o filtro de data
  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  const pendingTotals = useMemo(() => {
    const defaultTotals = { dinheiro: 0, cartao: 0, pix: 0 };
    if (!pendingDeliveries || pendingDeliveries.length === 0) return defaultTotals;

    return pendingDeliveries.reduce((acc, curr) => {
      const valor = Number(curr.valor) || 0;
      const forma = (curr.forma_pagamento_real || '').toUpperCase();

      if (forma.includes('DINHEIRO')) acc.dinheiro += valor;
      else if (forma.includes('CARTAO') || forma.includes('CARTÃO')) acc.cartao += valor;
      else if (forma.includes('PIX')) acc.pix += valor;
      
      return acc;
    }, defaultTotals);
  }, [pendingDeliveries]);

  const savePreClosing = async (payload) => {
    if (!user || !user.store_id || !user.id) {
      alert("Erro de autenticação: Usuário não identificado.")
      return false // Retorna falso se der erro
    }

    setIsActionLoading(true)
    try {
      const preClosingData = {
        store_id: user.store_id,
        created_by: user.id,
        ...payload
      }

      await PreClosingRepository.savePreClosing(preClosingData)
      alert('Pré-fechamento salvo com sucesso!')
      
      await loadInitialData() // Atualiza o histórico imediatamente
      return true // Retorna true para a tela saber que deu certo e limpar os inputs

    } catch (err) {
      console.error("Erro ao salvar pré-fechamento:", err)
      alert('Erro ao salvar o registro no banco de dados. ' + err.message)
      return false
    } finally {
      setIsActionLoading(false)
    }
  }

  return { 
    pendingDeliveries, pendingTotals, lastPreClosing, 
    history, dataFiltro, setDataFiltro, 
    loadInitialData, savePreClosing, 
    isPageLoading, isActionLoading 
  }
}
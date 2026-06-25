import { useState, useCallback, useMemo } from 'react'
import { supabase } from '../../infrastructure/supabase/supabaseClient'

export const usePreClosing = (user) => {
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [pendingDeliveries, setPendingDeliveries] = useState([])
  const [lastPreClosing, setLastPreClosing] = useState(null)

  const loadInitialData = useCallback(async () => {
    if (!user || !user.store_id) return;

    setIsPageLoading(true)
    try {
      const { data: deliveries, error: errorDeliveries } = await supabase
        .from('pending_deliveries')
        .select('*')
        .eq('store_id', user.store_id)
        .eq('conferido', false)

      if (errorDeliveries) throw errorDeliveries
      setPendingDeliveries(deliveries || [])

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

    } catch (err) {
      console.error("Erro ao carregar dados do pré-fechamento:", err)
    } finally {
      setIsPageLoading(false)
    }
  }, [user])

  const pendingTotals = useMemo(() => {
    const defaultTotals = { dinheiro: 0, cartao: 0, pix: 0 };
    
    if (!pendingDeliveries || pendingDeliveries.length === 0) {
      return defaultTotals;
    }

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
      return
    }

    setIsActionLoading(true)
    try {
      const preClosingData = {
        store_id: user.store_id,
        created_by: user.id,
        cash_value: payload.cash_value || 0,
        card_value: payload.card_value || 0,
        pix_value: payload.pix_value || 0,
        check_value: payload.check_value || 0,
        vale_compras_value: payload.vale_compras_value || 0,
        pending_card: payload.pending_card || pendingTotals.cartao || 0,
        pending_pix: payload.pending_pix || pendingTotals.pix || 0,
        pending_cash: payload.pending_cash || pendingTotals.dinheiro || 0,
        total: payload.total || 0,
        obs_dinheiro: payload.obs_dinheiro || null,
        obs_cartao: payload.obs_cartao || null,
        obs_pix: payload.obs_pix || null,
        obs_cheque: payload.obs_cheque || null,
        obs_vale: payload.obs_vale || null,
        obs_geral: payload.obs_geral || null
      }

      const { error } = await supabase
        .from('pre_closings')
        .insert([preClosingData])

      if (error) throw error
      alert('Pré-fechamento salvo com sucesso!')
      
    } catch (err) {
      console.error("Erro ao salvar pré-fechamento:", err)
      alert('Erro ao salvar o registro no banco de dados. ' + err.message)
    } finally {
      setIsActionLoading(false)
    }
  }

  return { pendingDeliveries, pendingTotals, lastPreClosing, loadInitialData, savePreClosing, isPageLoading, isActionLoading }
}
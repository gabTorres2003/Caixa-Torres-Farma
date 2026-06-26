import { supabase } from '../supabaseClient'

export const PreClosingRepository = {
  // Busca o valor das entregas que ainda não foram conciliadas no dia
  async getPendingDeliveriesTotals(storeId, dataConsulta) {
    const { data, error } = await supabase
      .from('pending_deliveries')
      .select('valor, tipo_saida, forma_pagamento_real')
      .eq('store_id', storeId)
      .gte('created_at', `${dataConsulta}T00:00:00-03:00`)
      .lte('created_at', `${dataConsulta}T23:59:59-03:00`)
      .eq('conciliado', false) 

    if (error) throw error
    return data || []
  },

  // Salva o novo pré-fechamento
  async savePreClosing(payload) {
    const { error } = await supabase.from('pre_closings').insert([payload])
    if (error) throw error
  },

  // Busca o histórico filtrado por data
  async getPreClosingsHistory(storeId, dateFilter) {
    let query = supabase
      .from('pre_closings')
      .select('*, users:created_by (nome)') // Traz o nome do operador
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })

    if (dateFilter) {
      query = query
        .gte('created_at', `${dateFilter}T00:00:00-03:00`)
        .lte('created_at', `${dateFilter}T23:59:59-03:00`)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  }
}
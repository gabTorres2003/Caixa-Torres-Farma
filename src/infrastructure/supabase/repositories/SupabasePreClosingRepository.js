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
      .eq('conciliado', false) // Pega apenas o que está na rua ou na cestinha sem baixa

    if (error) throw error
    return data || []
  },

  async savePreClosing(payload) {
    const { error } = await supabase.from('pre_closings').insert([payload])
    if (error) throw error
  }
}
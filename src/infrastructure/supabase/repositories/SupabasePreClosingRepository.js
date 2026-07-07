import { supabase } from '../supabaseClient'

export const PreClosingRepository = {
  async getPreClosings(storeId, dataFiltro) {
    let query = supabase.from('pre_closings').select('*, users(nome)').eq('store_id', storeId).order('created_at', { ascending: false })
    
    if (dataFiltro) {
      query = query.gte('created_at', `${dataFiltro}T00:00:00-03:00`).lte('created_at', `${dataFiltro}T23:59:59-03:00`)
    } else {
      query = query.limit(30)
    }
    
    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  async addPreClosing(payload) {
    const { error } = await supabase.from('pre_closings').insert([payload])
    if (error) throw error
  },

  async updatePreClosing(id, payload) {
    const { error } = await supabase.from('pre_closings').update(payload).eq('id', id)
    if (error) throw error
  },

  async deletePreClosing(id) {
    const { error } = await supabase.from('pre_closings').delete().eq('id', id)
    if (error) throw error
  },

  async getPendingDeliveriesTotals(storeId) {
    const { data, error } = await supabase.from('pending_deliveries')
      .select('*')
      .eq('store_id', storeId)
      .eq('conciliado', false) 
      
    if (error) throw error
    return data || []
  }
}
import { supabase } from '../supabaseClient'

export const DepositRepository = {
  // Busca filtrando por data
  async getDeposits(storeId, dataConsulta) {
    const { data, error } = await supabase
      .from('deposits')
      .select('*, users:created_by (nome)')
      .eq('store_id', storeId)
      .gte('created_at', `${dataConsulta}T00:00:00-03:00`)
      .lte('created_at', `${dataConsulta}T23:59:59-03:00`)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async addDeposit(payload) {
    const { error } = await supabase.from('deposits').insert([payload])
    if (error) throw error
  },

  async updateDeposit(id, payload) {
    const { error } = await supabase.from('deposits').update(payload).eq('id', id)
    if (error) throw error
  },

  async deleteDeposit(id) {
    const { error } = await supabase.from('deposits').delete().eq('id', id)
    if (error) throw error
  }
}
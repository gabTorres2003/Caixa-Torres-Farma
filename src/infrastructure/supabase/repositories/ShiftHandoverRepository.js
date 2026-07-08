import { supabase } from '../supabaseClient'

export const ShiftHandoverRepository = {
  async getDeliveries(storeId, dataConsulta) {
    const { data, error } = await supabase
      .from('pending_deliveries')
      .select('*')
      .eq('store_id', storeId)
      .gte('created_at', `${dataConsulta}T00:00:00-03:00`)
      .lte('created_at', `${dataConsulta}T23:59:59-03:00`)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  async addDelivery(payload) {
    const { error } = await supabase.from('pending_deliveries').insert([payload])
    if (error) throw error
  },

  async updateDelivery(id, payload) {
    const { error } = await supabase.from('pending_deliveries').update(payload).eq('id', id)
    if (error) throw error
  },

  async deleteDelivery(id) {
    const { error } = await supabase.from('pending_deliveries').delete().eq('id', id)
    if (error) throw error
  },

  async updateCheckStatus(id, conferido) {
    const { error } = await supabase.from('pending_deliveries').update({ conferido }).eq('id', id)
    if (error) throw error
  },

  async updateReconciliationStatus(id, conciliado) {
    const { error } = await supabase.from('pending_deliveries').update({ conciliado }).eq('id', id)
    if (error) throw error
  },

  async updateObservation(id, observacoes) {
    const { error } = await supabase.from('pending_deliveries').update({ observacoes }).eq('id', id)
    if (error) throw error
  },

  async updateRealPaymentForm(id, forma_pagamento_real) {
    const { error } = await supabase.from('pending_deliveries').update({ forma_pagamento_real }).eq('id', id)
    if (error) throw error
  },

  async finalizeAfternoonShift(storeId) {
    const { error } = await supabase
      .from('pending_deliveries')
      .update({ conferido: true })
      .eq('store_id', storeId)
      .eq('conferido', false)
    if (error) throw error
  },

  // === NOVAS FUNÇÕES PARA TRAVAMENTO DE TURNO ===
  async checkShiftClosed(storeId, date, shiftType) {
    const { data, error } = await supabase
      .from('shift_closures')
      .select('id')
      .eq('store_id', storeId)
      .eq('shift_date', date)
      .eq('shift_type', shiftType)
      .maybeSingle()
    
    if (error) throw error
    return !!data
  },

  async reopenShift(storeId, date, shiftType) {
    const { error } = await supabase
      .from('shift_closures')
      .delete()
      .eq('store_id', storeId)
      .eq('shift_date', date)
      .eq('shift_type', shiftType)
    
    if (error) throw error
  },

  async closeShift(storeId, date, shiftType, userId) {
    const { error } = await supabase
      .from('shift_closures')
      .insert([{
        store_id: storeId,
        shift_date: date,
        shift_type: shiftType,
        closed_by: userId
      }])
    
    if (error && error.code !== '23505') throw error
  }
}
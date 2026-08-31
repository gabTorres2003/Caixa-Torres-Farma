import { supabase } from '../supabaseClient'

export const SupabaseMotoboyRepository = {
  // === GESTÃO DE MOTOBOYS ===
  async getMotoboys(storeId) {
    const { data, error } = await supabase
      .from('motoboys')
      .select('*')
      .eq('store_id', storeId)
      .eq('ativo', true)
      .order('nome', { ascending: true })
    if (error) throw error
    return data || []
  },

  async addMotoboy(payload) {
    const { error } = await supabase.from('motoboys').insert([payload])
    if (error) throw error
  },

  async updateMotoboy(id, payload) {
    const { error } = await supabase.from('motoboys').update(payload).eq('id', id)
    if (error) throw error
  },

  async deleteMotoboy(id) {
    const { error } = await supabase.from('motoboys').update({ ativo: false }).eq('id', id)
    if (error) throw error
  },

  // === REGISTRO DE PONTO (TIME TRACKING) ===
  async getTimeTracking(storeId, startDate, endDate) {
    const { data, error } = await supabase
      .from('motoboy_time_tracking')
      .select('*, motoboys(nome), users:registered_by(nome)')
      .eq('store_id', storeId)
      .gte('registro_time', `${startDate}T00:00:00-03:00`)
      .lte('registro_time', `${endDate}T23:59:59-03:00`)
      .order('registro_time', { ascending: false })
    if (error) throw error
    return data || []
  },

  async registerTime(payload) {
    const { error } = await supabase.from('motoboy_time_tracking').insert([payload])
    if (error) throw error
  },

  async registerTimeBulk(records) {
    if (!records || records.length === 0) return
    const { error } = await supabase.from('motoboy_time_tracking').insert(records)
    if (error) throw error
  },

  async updateTimeRecord(id, payload) {
    const { error } = await supabase.from('motoboy_time_tracking').update(payload).eq('id', id)
    if (error) throw error
  },

  async deleteTimeRecord(id) {
    const { error } = await supabase.from('motoboy_time_tracking').delete().eq('id', id)
    if (error) throw error
  },

  // === GESTÃO DE ROTAS ===
  async getRoutesByDate(storeId, dateStr) {
    const start = `${dateStr}T00:00:00-03:00`
    const end = `${dateStr}T23:59:59-03:00`
    const { data, error } = await supabase
      .from('motoboy_routes')
      .select('*, motoboys(nome), motoboy_route_deliveries(*)')
      .eq('store_id', storeId)
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  async createRoute(routePayload, deliveriesArray) {
    const { data: routeData, error: routeError } = await supabase
      .from('motoboy_routes')
      .insert([routePayload])
      .select()
      .single()
    
    if (routeError) throw routeError

    if (deliveriesArray && deliveriesArray.length > 0) {
      const deliveriesToInsert = deliveriesArray.map(d => ({ ...d, route_id: routeData.id }))
      const { error: delivError } = await supabase.from('motoboy_route_deliveries').insert(deliveriesToInsert)
      if (delivError) throw delivError
    }
    return routeData
  },

  async updateRouteStatus(routeId, payload) {
    const { error } = await supabase.from('motoboy_routes').update(payload).eq('id', routeId)
    if (error) throw error
  },
  
  async deleteRoute(routeId) {
    const { error } = await supabase.from('motoboy_routes').delete().eq('id', routeId)
    if (error) throw error
  }
}
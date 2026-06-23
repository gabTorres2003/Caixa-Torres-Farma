import { supabase } from '../supabaseClient'

export const SupabaseCashRepository = {
  async getDenominations(storeId) {
    const { data, error } = await supabase
      .from('cash_denominations')
      .select('*')
      .eq('store_id', storeId)
      .order('valor', { ascending: false })
    
    if (error) throw error
    return data
  },

  async initializeDenominations(storeId) {
    const valoresPadrao = [
      { valor: 200, tipo: 'NOTA' }, { valor: 100, tipo: 'NOTA' }, { valor: 50, tipo: 'NOTA' },
      { valor: 20, tipo: 'NOTA' }, { valor: 10, tipo: 'NOTA' }, { valor: 5, tipo: 'NOTA' }, { valor: 2, tipo: 'NOTA' },
      { valor: 1, tipo: 'MOEDA' }, { valor: 0.50, tipo: 'MOEDA' }, { valor: 0.25, tipo: 'MOEDA' },
      { valor: 0.10, tipo: 'MOEDA' }, { valor: 0.05, tipo: 'MOEDA' }
    ]

    const inserts = valoresPadrao.map(item => ({ ...item, store_id: storeId }))
    const { error } = await supabase.from('cash_denominations').insert(inserts)
    if (error) throw error
  },

  // Salva o histórico exato do que foi contado
  async registerMovement(payload) {
    const { error } = await supabase.from('cash_movements').insert([payload])
    if (error) throw error
  },

  // Puxa quem fez a última conferência e que horas
  async getLastConference(storeId) {
    const { data, error } = await supabase
      .from('cash_movements')
      .select('created_at, users ( nome )')
      .eq('store_id', storeId)
      .eq('tipo_movimento', 'CONTAGEM_INICIAL') // Usaremos este tipo para as conferências de cofre
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // O erro PGRST116 significa "nenhuma linha encontrada"
    if (error && error.code !== 'PGRST116') throw error
    return data
  }
}
import { supabase } from '../supabaseClient'

export const SupabaseCashRepository = {
  // Busca o estoque atual de notas e moedas da loja
  async getDenominations(storeId) {
    const { data, error } = await supabase
      .from('cash_denominations')
      .select('*')
      .eq('store_id', storeId)
      .order('valor', { ascending: false })
    
    if (error) throw error
    return data
  },

  // Inicializa as notas e moedas padrão (se a loja for nova e a tabela estiver vazia)
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

  // Salva o histórico de movimentação (Inclusão/Retirada)
  async registerMovement(payload) {
    const { error } = await supabase.from('cash_movements').insert([payload])
    if (error) throw error
  }
}
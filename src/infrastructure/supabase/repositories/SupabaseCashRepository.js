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

  async registerMovement(payload) {
    const { error } = await supabase.from('cash_movements').insert([payload])
    if (error) throw error
  },

  async getLastConference(storeId) {
    const { data, error } = await supabase
      .from('cash_movements')
      .select('created_at, users ( nome )')
      .eq('store_id', storeId)
      .eq('tipo_movimento', 'CONTAGEM_INICIAL')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  // Dá baixa nas notas do cofre na hora da Saída
  async registerOutflowFromVault(storeId, userId, notas, moedasValor, totalValue, destino) {
    const { data: currentStocks, error: fetchError } = await supabase
      .from('cash_denominations')
      .select('*')
      .eq('store_id', storeId)
      .eq('tipo', 'NOTA');
      
    if (fetchError) throw fetchError;

    for (const [valorNota, qtdRetirada] of Object.entries(notas)) {
      if (qtdRetirada > 0) {
        const stockItem = currentStocks.find(s => s.valor === Number(valorNota));
        if (stockItem) {
          const novaQtd = stockItem.quantidade_atual - qtdRetirada;
          await supabase
            .from('cash_denominations')
            .update({ quantidade_atual: novaQtd, updated_at: new Date().toISOString() })
            .eq('id', stockItem.id);
        }
      }
    }

    const payloadMovimento = {
      store_id: storeId,
      created_by: userId,
      tipo_movimento: 'SAIDA',
      valor_total: totalValue,
      origem: 'Caixa de Troco',
      destino: destino,
      detalhamento: { notas, moedasValor }
    };
    
    const { error: moveError } = await supabase.from('cash_movements').insert([payloadMovimento]);
    if (moveError) throw moveError;
  },

  // Dá Entrada nas notas no cofre no Recebimento
  async registerInflowToVault(storeId, userId, notas, moedasValor, totalValue, origem) {
    const { data: currentStocks, error: fetchError } = await supabase
      .from('cash_denominations')
      .select('*')
      .eq('store_id', storeId)
      .eq('tipo', 'NOTA');
      
    if (fetchError) throw fetchError;

    for (const [valorNota, qtdEntrada] of Object.entries(notas)) {
      if (qtdEntrada > 0) {
        const stockItem = currentStocks.find(s => s.valor === Number(valorNota));
        if (stockItem) {
          const novaQtd = stockItem.quantidade_atual + qtdEntrada;
          await supabase
            .from('cash_denominations')
            .update({ quantidade_atual: novaQtd, updated_at: new Date().toISOString() })
            .eq('id', stockItem.id);
        }
      }
    }

    const payloadMovimento = {
      store_id: storeId,
      created_by: userId,
      tipo_movimento: 'ENTRADA',
      valor_total: totalValue,
      origem: origem,
      destino: 'Caixa de Troco',
      detalhamento: { notas, moedasValor }
    };
    
    const { error: moveError } = await supabase.from('cash_movements').insert([payloadMovimento]);
    if (moveError) throw moveError;
  }
}
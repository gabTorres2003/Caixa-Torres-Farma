import { supabase } from '../supabaseClient'

export const SupabaseCashRepository = {
  async getDenominations(storeId) {
    const { data, error } = await supabase.from('cash_denominations').select('*').eq('store_id', storeId).order('valor', { ascending: false })
    if (error) throw error
    return data || []
  },

  async initializeDenominations(storeId) {
    const valoresPadrao = [
      { valor: 200, tipo: 'NOTA', quantidade_ideal: 20 }, { valor: 100, tipo: 'NOTA', quantidade_ideal: 30 }, { valor: 50, tipo: 'NOTA', quantidade_ideal: 30 },
      { valor: 20, tipo: 'NOTA', quantidade_ideal: 50 }, { valor: 10, tipo: 'NOTA', quantidade_ideal: 50 }, { valor: 5, tipo: 'NOTA', quantidade_ideal: 50 }, { valor: 2, tipo: 'NOTA', quantidade_ideal: 50 },
      { valor: 1, tipo: 'MOEDA', quantidade_ideal: 50 }, { valor: 0.50, tipo: 'MOEDA', quantidade_ideal: 50 }, { valor: 0.25, tipo: 'MOEDA', quantidade_ideal: 50 },
      { valor: 0.10, tipo: 'MOEDA', quantidade_ideal: 50 }, { valor: 0.05, tipo: 'MOEDA', quantidade_ideal: 50 }
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
    const { data, error } = await supabase.from('cash_movements').select('created_at, users ( nome )').eq('store_id', storeId).eq('tipo_movimento', 'CONTAGEM_INICIAL').order('created_at', { ascending: false }).limit(1).single()
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  async registerOutflowFromVault(storeId, userId, notas, moedasValor, totalValue, destino, moedasIndividuais = null) {
    const { data: currentStocks } = await supabase.from('cash_denominations').select('*').eq('store_id', storeId);
    const updates = [];
    
    if (notas) {
      for (const [v, q] of Object.entries(notas)) {
        if (q > 0) {
          const stock = currentStocks.find(s => s.tipo === 'NOTA' && s.valor === Number(v));
          if (!stock || stock.quantidade_atual < q) throw new Error(`Saldo insuficiente. Faltam notas de R$ ${v}.`);
          updates.push({ id: stock.id, novaQtd: stock.quantidade_atual - q });
        }
      }
    }
    if (moedasIndividuais) {
      for (const [v, q] of Object.entries(moedasIndividuais)) {
        if (q > 0) {
          const stock = currentStocks.find(s => s.tipo === 'MOEDA' && s.valor === Number(v));
          if (!stock || stock.quantidade_atual < q) throw new Error(`Saldo insuficiente. Faltam moedas de R$ ${v}.`);
          updates.push({ id: stock.id, novaQtd: stock.quantidade_atual - q });
        }
      }
    }

    for (const u of updates) {
      await supabase.from('cash_denominations').update({ quantidade_atual: u.novaQtd, updated_at: new Date().toISOString() }).eq('id', u.id);
    }

    const payloadMovimento = { store_id: storeId, created_by: userId, tipo_movimento: 'SAIDA', valor_total: totalValue, origem: 'Caixa de Troco', destino: destino, detalhamento: { notas, moedas: moedasIndividuais, moedasValor } };
    await supabase.from('cash_movements').insert([payloadMovimento]);
  },

  async registerInflowToVault(storeId, userId, notas, moedasValor, totalValue, origem, moedasIndividuais = null) {
    const { data: currentStocks } = await supabase.from('cash_denominations').select('*').eq('store_id', storeId);
    const updates = [];
    
    if (notas) {
      for (const [v, q] of Object.entries(notas)) {
        if (q > 0) {
          const stock = currentStocks.find(s => s.tipo === 'NOTA' && s.valor === Number(v));
          if (stock) updates.push({ id: stock.id, novaQtd: stock.quantidade_atual + q });
        }
      }
    }
    if (moedasIndividuais) {
      for (const [v, q] of Object.entries(moedasIndividuais)) {
        if (q > 0) {
          const stock = currentStocks.find(s => s.tipo === 'MOEDA' && s.valor === Number(v));
          if (stock) updates.push({ id: stock.id, novaQtd: stock.quantidade_atual + q });
        }
      }
    }

    for (const u of updates) {
      await supabase.from('cash_denominations').update({ quantidade_atual: u.novaQtd, updated_at: new Date().toISOString() }).eq('id', u.id);
    }

    const payloadMovimento = { store_id: storeId, created_by: userId, tipo_movimento: 'ENTRADA', valor_total: totalValue, origem: origem, destino: 'Caixa de Troco', detalhamento: { notas, moedas: moedasIndividuais, moedasValor } };
    await supabase.from('cash_movements').insert([payloadMovimento]);
  },

  async adjustBalance(storeId, userId, newQuantities, manualOriginDest, observation) {
    const { data: currentStocks } = await supabase.from('cash_denominations').select('*').eq('store_id', storeId);
    let totalDiferenca = 0;
    const detalhamento = { notas: {}, moedas: {}, isAjuste: true, observacao: observation };

    for (const stock of currentStocks) {
      const newVal = newQuantities[stock.valor];
      if (newVal !== undefined && newVal !== stock.quantidade_atual) {
        const diff = newVal - stock.quantidade_atual;
        totalDiferenca += (diff * stock.valor);
        if (stock.tipo === 'NOTA') detalhamento.notas[stock.valor] = diff;
        else detalhamento.moedas[stock.valor] = diff;
        await supabase.from('cash_denominations').update({ quantidade_atual: newVal, updated_at: new Date().toISOString() }).eq('id', stock.id);
      }
    }

    if (totalDiferenca !== 0 || Object.keys(detalhamento.notas).length > 0 || Object.keys(detalhamento.moedas).length > 0) {
      const tipo = totalDiferenca >= 0 ? 'ENTRADA' : 'SAIDA';
      await supabase.from('cash_movements').insert([{
        store_id: storeId, created_by: userId, tipo_movimento: tipo, valor_total: Math.abs(totalDiferenca),
        origem: tipo === 'ENTRADA' ? manualOriginDest : 'Caixa de Troco (Ajuste)', destino: tipo === 'ENTRADA' ? 'Caixa de Troco (Ajuste)' : manualOriginDest, detalhamento
      }]);
    }
  },

  // Atualiza Mínimo e Ideal em lote
  async updateMetricsBatch(metricsData) {
    const promises = metricsData.map(m =>
      supabase.from('cash_denominations')
        .update({ quantidade_minima: m.minima, quantidade_ideal: m.ideal, updated_at: new Date().toISOString() })
        .eq('id', m.id)
    );
    await Promise.all(promises);
  },

  // Injeta quantidades avulsas de Sobra e registra como Entrada
  async registerSobraCaixa(storeId, userId, unidadesExtras, observacao) {
    const { data: currentStocks } = await supabase.from('cash_denominations').select('*').eq('store_id', storeId);
    let totalSobra = 0;
    const detalhamento = { notas: {}, moedas: {}, observacao };

    for (const stock of currentStocks) {
      const extra = unidadesExtras[stock.valor];
      if (extra && extra > 0) {
        totalSobra += (extra * stock.valor);
        
        if (stock.tipo === 'NOTA') detalhamento.notas[stock.valor] = extra;
        else detalhamento.moedas[stock.valor] = extra;

        await supabase.from('cash_denominations')
          .update({ quantidade_atual: stock.quantidade_atual + extra, updated_at: new Date().toISOString() })
          .eq('id', stock.id);
      }
    }

    if (totalSobra > 0) {
      await supabase.from('cash_movements').insert([{
        store_id: storeId,
        created_by: userId,
        tipo_movimento: 'ENTRADA',
        valor_total: totalSobra,
        origem: 'Sobra de Caixa (Gaveta/Rua)',
        destino: 'Cofre Central',
        detalhamento
      }]);
    }
  }
}
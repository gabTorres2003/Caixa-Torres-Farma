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

  // Busca movimentações filtradas por data
  async getMovementsByDate(storeId, dateStr) {
    const start = `${dateStr}T00:00:00-03:00`
    const end = `${dateStr}T23:59:59-03:00`
    const { data, error } = await supabase
      .from('cash_movements')
      .select('*, users ( nome )')
      .eq('store_id', storeId)
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
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

  async updateMetricsBatch(metricsData) {
    const promises = metricsData.map(m =>
      supabase.from('cash_denominations')
        .update({ quantidade_minima: m.minima, quantidade_ideal: m.ideal, updated_at: new Date().toISOString() })
        .eq('id', m.id)
    );
    await Promise.all(promises);
  },

  async registerManualInflow(storeId, userId, unidadesExtras, origemStr, observacao, operador, dataReferente) {
    const { data: currentStocks } = await supabase.from('cash_denominations').select('*').eq('store_id', storeId);
    let totalInflow = 0;
    
    const detalhamento = { notas: {}, moedas: {}, observacao, operador, data_referente: dataReferente };

    for (const stock of currentStocks) {
      const extra = unidadesExtras[stock.valor];
      if (extra && extra > 0) {
        totalInflow += (extra * stock.valor);
        
        if (stock.tipo === 'NOTA') detalhamento.notas[stock.valor] = extra;
        else detalhamento.moedas[stock.valor] = extra;

        await supabase.from('cash_denominations')
          .update({ quantidade_atual: stock.quantidade_atual + extra, updated_at: new Date().toISOString() })
          .eq('id', stock.id);
      }
    }

    if (totalInflow > 0) {
      await supabase.from('cash_movements').insert([{
        store_id: storeId,
        created_by: userId,
        tipo_movimento: 'ENTRADA',
        valor_total: totalInflow,
        origem: operador ? `${origemStr} (${operador})` : origemStr,
        destino: 'Cofre Central',
        detalhamento
      }]);
    }
  },

  // NOVA FUNÇÃO: Reverter/Estornar Movimentação
  async revertMovement(storeId, userId, movementId) {
    // 1. Busca a movimentação original
    const { data: mov, error: movError } = await supabase.from('cash_movements').select('*').eq('id', movementId).single();
    if (movError || !mov) throw new Error("Movimentação não encontrada.");
    
    if (mov.tipo_movimento === 'CONTAGEM_INICIAL') throw new Error("Não é possível estornar o saldo inicial.");
    if (mov.origem?.includes('ESTORNO') || mov.destino?.includes('ESTORNO')) throw new Error("Esta movimentação já é um estorno.");

    // 2. Busca o estoque atual do cofre
    const { data: currentStocks } = await supabase.from('cash_denominations').select('*').eq('store_id', storeId);

    // 3. Define a lógica de inversão (Se entrou, agora sai. Se saiu, agora entra)
    const isEntrada = mov.tipo_movimento === 'ENTRADA';
    const multiplier = isEntrada ? -1 : 1; 

    const notas = mov.detalhamento?.notas || {};
    const moedas = mov.detalhamento?.moedas || {};
    const updates = [];

    // 4. Calcula e valida os novos estoques
    for (const stock of currentStocks) {
      let diff = 0;
      if (stock.tipo === 'NOTA' && notas[stock.valor]) diff = notas[stock.valor] * multiplier;
      if (stock.tipo === 'MOEDA' && moedas[stock.valor]) diff = moedas[stock.valor] * multiplier;

      if (diff !== 0) {
        const newQtd = stock.quantidade_atual + diff;
        // Trava de segurança: não pode negativar o cofre ao reverter uma entrada
        if (newQtd < 0) {
          throw new Error(`Estorno bloqueado: Você não tem R$ ${stock.valor.toFixed(2)} suficientes no cofre para devolver.`);
        }
        updates.push({ id: stock.id, newQtd });
      }
    }

    // 5. Aplica as alterações físicas no cofre
    for (const u of updates) {
      await supabase.from('cash_denominations').update({ quantidade_atual: u.newQtd, updated_at: new Date().toISOString() }).eq('id', u.id);
    }

    // 6. Grava a movimentação de Estorno no extrato
    const inverseTipo = isEntrada ? 'SAIDA' : 'ENTRADA';
    const newDetalhamento = { ...mov.detalhamento, observacao: `ESTORNO DA MOVIMENTAÇÃO ORIGINADA EM: ${new Date(mov.created_at).toLocaleString('pt-BR')}. Obs Original: ${mov.detalhamento?.observacao || 'N/A'}` };

    await supabase.from('cash_movements').insert([{
      store_id: storeId,
      created_by: userId,
      tipo_movimento: inverseTipo,
      valor_total: mov.valor_total,
      origem: `ESTORNO: ${mov.destino || mov.origem}`,
      destino: `ESTORNO: ${mov.origem || mov.destino}`,
      detalhamento: newDetalhamento
    }]);
  }
}
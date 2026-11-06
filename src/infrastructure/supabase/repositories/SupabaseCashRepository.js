import { supabase } from '../supabaseClient'

const toCents = (value) => Math.round(Number(value) * 100)

const findDenomination = (stocks, type, value) => stocks.find((stock) =>
  stock.tipo === type && toCents(stock.valor) === toCents(value)
)

const createOperationId = () => crypto.randomUUID()

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
    const operationId = payload.detalhamento?.operacao_id || createOperationId()
    const { data, error } = await supabase.from('cash_movements')
      .insert([{ ...payload, detalhamento: { ...(payload.detalhamento || {}), operacao_id: operationId } }])
      .select('id')
      .single()
    if (error) throw error
    return { operationId, movementIds: [data.id] }
  },

  async registerInternalExchange(storeId, userId, notasOut, moedasOut, notasIn, moedasIn) {
    const { data: currentStocks, error: stockError } = await supabase.from('cash_denominations').select('*').eq('store_id', storeId)
    if (stockError) throw stockError

    const cents = (face, quantity) => Math.round(Number(face) * Number(quantity) * 100)
    const totalOut = Object.entries({ ...(notasOut || {}), ...(moedasOut || {}) }).reduce((sum, [face, quantity]) => sum + cents(face, quantity), 0)
    const totalIn = Object.entries({ ...(notasIn || {}), ...(moedasIn || {}) }).reduce((sum, [face, quantity]) => sum + cents(face, quantity), 0)
    if (totalOut <= 0 || totalOut !== totalIn) {
      throw new Error('Os valores retirados e guardados no cofre precisam ser exatamente iguais.')
    }

    const changes = []
    const validate = (values, type, direction) => {
      Object.entries(values || {}).forEach(([face, quantity]) => {
        const qty = Number(quantity)
        if (!Number.isInteger(qty) || qty < 0) throw new Error('As quantidades das denominações devem ser inteiras e não negativas.')
        if (!qty) return
        const stock = findDenomination(currentStocks, type, face)
        if (!stock) throw new Error(`Denominação de ${type.toLowerCase()} não cadastrada: R$ ${face}.`)
        const newQuantity = Number(stock.quantidade_atual || 0) + (direction * qty)
        if (newQuantity < 0) throw new Error(`Saldo insuficiente para a denominação de R$ ${Number(face).toFixed(2)}.`)
        const existing = changes.find((change) => change.id === stock.id)
        if (existing) existing.newQuantity += direction * qty
        else changes.push({ id: stock.id, newQuantity })
      })
    }
    validate(notasOut, 'NOTA', -1)
    validate(moedasOut, 'MOEDA', -1)
    validate(notasIn, 'NOTA', 1)
    validate(moedasIn, 'MOEDA', 1)
    changes.forEach((change) => {
      if (change.newQuantity < 0) throw new Error('A operação deixaria uma denominação com saldo negativo.')
    })

    const operationId = createOperationId()
    const now = new Date().toISOString()
    const updates = await Promise.all(changes.map((change) =>
      supabase.from('cash_denominations').update({ quantidade_atual: change.newQuantity, updated_at: now }).eq('id', change.id)
    ))
    const updateError = updates.find((result) => result.error)?.error
    if (updateError) throw updateError

    const movements = await Promise.all([
      supabase.from('cash_movements').insert([{
        store_id: storeId, created_by: userId, tipo_movimento: 'SAIDA', valor_total: totalOut / 100,
        origem: 'Caixa de Troco', destino: 'Gaveta do Operador (Troca Interna)',
        detalhamento: { operacao: 'TROCA_INTERNA', operacao_id: operationId, notas: notasOut || {}, moedas: moedasOut || {} }
      }]).select('id').single(),
      supabase.from('cash_movements').insert([{
        store_id: storeId, created_by: userId, tipo_movimento: 'ENTRADA', valor_total: totalIn / 100,
        origem: 'Gaveta do Operador (Troca Interna)', destino: 'Caixa de Troco',
        detalhamento: { operacao: 'TROCA_INTERNA', operacao_id: operationId, notas: notasIn || {}, moedas: moedasIn || {} }
      }]).select('id').single()
    ])
    const movementError = movements.find((result) => result.error)?.error
    if (movementError) throw movementError
    return {
      operationId,
      movementIds: movements.map((result) => result.data.id)
    }
  },

  async getLastConference(storeId) {
    const { data, error } = await supabase.from('cash_movements').select('created_at, users ( nome )').eq('store_id', storeId).eq('tipo_movimento', 'CONTAGEM_INICIAL').order('created_at', { ascending: false }).limit(1).single()
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

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

  // === INCLUIDO AS MOEDAS ===
  async registerOutflowFromVault(storeId, userId, notas, moedasValor, totalValue, destino, moedasIndividuais = null) {
    const { data: currentStocks, error: stockError } = await supabase.from('cash_denominations').select('*').eq('store_id', storeId);
    if (stockError) throw stockError;
    const updates = [];
    
    if (notas) {
      for (const [v, q] of Object.entries(notas)) {
        if (q > 0) {
          const stock = findDenomination(currentStocks, 'NOTA', v);
          if (!stock || stock.quantidade_atual < q) throw new Error(`Saldo insuficiente. Faltam notas de R$ ${v}.`);
          updates.push({ id: stock.id, novaQtd: Number(stock.quantidade_atual || 0) - q });
        }
      }
    }
    if (moedasIndividuais) {
      for (const [v, q] of Object.entries(moedasIndividuais)) {
        if (q > 0) {
          const stock = findDenomination(currentStocks, 'MOEDA', v);
          if (!stock || stock.quantidade_atual < q) throw new Error(`Saldo insuficiente. Faltam moedas de R$ ${v}.`);
          updates.push({ id: stock.id, novaQtd: Number(stock.quantidade_atual || 0) - q });
        }
      }
    }

    for (const u of updates) {
      const { error } = await supabase.from('cash_denominations').update({ quantidade_atual: u.novaQtd, updated_at: new Date().toISOString() }).eq('id', u.id);
      if (error) throw error;
    }

    const operationId = createOperationId()
    const payloadMovimento = { 
        store_id: storeId, created_by: userId, tipo_movimento: 'SAIDA', 
        valor_total: totalValue, origem: 'Caixa de Troco', destino: destino, 
        detalhamento: { operacao_id: operationId, notas, moedas: moedasIndividuais, moedasValor }
    };
    const { data, error } = await supabase.from('cash_movements').insert([payloadMovimento]).select('id').single();
    if (error) throw error;
    return { operationId, movementIds: [data.id] }
  },

  // === INCLUIDO AS MOEDAS ===
  async registerInflowToVault(storeId, userId, notas, moedasValor, totalValue, origem, moedasIndividuais = null) {
    const { data: currentStocks, error: stockError } = await supabase.from('cash_denominations').select('*').eq('store_id', storeId);
    if (stockError) throw stockError;
    const updates = [];
    
    if (notas) {
      for (const [v, q] of Object.entries(notas)) {
        if (q > 0) {
          const stock = findDenomination(currentStocks, 'NOTA', v);
          if (!stock) throw new Error(`Denominação de nota não cadastrada: R$ ${v}.`);
          updates.push({ id: stock.id, novaQtd: Number(stock.quantidade_atual || 0) + q });
        }
      }
    }
    if (moedasIndividuais) {
      for (const [v, q] of Object.entries(moedasIndividuais)) {
        if (q > 0) {
          const stock = findDenomination(currentStocks, 'MOEDA', v);
          if (!stock) throw new Error(`Denominação de moeda não cadastrada: R$ ${v}.`);
          updates.push({ id: stock.id, novaQtd: Number(stock.quantidade_atual || 0) + q });
        }
      }
    }

    for (const u of updates) {
      const { error } = await supabase.from('cash_denominations').update({ quantidade_atual: u.novaQtd, updated_at: new Date().toISOString() }).eq('id', u.id);
      if (error) throw error;
    }

    const operationId = createOperationId()
    const payloadMovimento = { 
        store_id: storeId, created_by: userId, tipo_movimento: 'ENTRADA', 
        valor_total: totalValue, origem: origem, destino: 'Caixa de Troco', 
        detalhamento: { operacao_id: operationId, notas, moedas: moedasIndividuais, moedasValor }
    };
    const { data, error } = await supabase.from('cash_movements').insert([payloadMovimento]).select('id').single();
    if (error) throw error;
    return { operationId, movementIds: [data.id] }
  },

  async adjustBalance(storeId, userId, newQuantities, manualOriginDest, observation) {
    const { data: currentStocks } = await supabase.from('cash_denominations').select('*').eq('store_id', storeId);
    let totalDiferenca = 0;
    const operationId = createOperationId()
    const detalhamento = { notas: {}, moedas: {}, isAjuste: true, observacao: observation, operacao_id: operationId };

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
      }]).select('id').single();
    }
    return { operationId }
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
    
    const operationId = createOperationId()
    const detalhamento = { notas: {}, moedas: {}, observacao, operador, data_referente: dataReferente, operacao_id: operationId };

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
        store_id: storeId, created_by: userId, tipo_movimento: 'ENTRADA', valor_total: totalInflow,
        origem: operador ? `${origemStr} (${operador})` : origemStr, destino: 'Cofre Central', detalhamento
      }]).select('id').single();
    }
    return { operationId }
  },

  async reverseOperation(storeId, userId, operationId) {
    if (!operationId) throw new Error('Movimentação sem vínculo financeiro; não é possível estornar com segurança.')

    const { data: originalMovements, error: movementError } = await supabase
      .from('cash_movements')
      .select('*')
      .eq('store_id', storeId)
      .contains('detalhamento', { operacao_id: operationId })
    if (movementError) throw movementError
    if (!originalMovements?.length) throw new Error('Movimentação financeira não encontrada.')
    if (originalMovements.some((movement) => movement.detalhamento?.estornada || movement.detalhamento?.tipo_operacao === 'ESTORNO')) {
      throw new Error('Esta movimentação já foi desfeita.')
    }
    if (originalMovements.some((movement) => movement.tipo_movimento === 'CONTAGEM_INICIAL')) {
      throw new Error('Não é possível estornar o saldo inicial.')
    }

    const { data: currentStocks, error: stockError } = await supabase
      .from('cash_denominations')
      .select('*')
      .eq('store_id', storeId)
    if (stockError) throw stockError

    const changes = []
    originalMovements.forEach((movement) => {
      const multiplier = movement.tipo_movimento === 'ENTRADA' ? -1 : 1
      const values = [
        ['NOTA', movement.detalhamento?.notas || {}],
        ['MOEDA', movement.detalhamento?.moedas || {}]
      ]
      values.forEach(([type, denominations]) => {
        Object.entries(denominations).forEach(([face, quantity]) => {
          const qty = Number(quantity)
          if (!Number.isInteger(qty) || qty < 0 || !qty) return
          const stock = findDenomination(currentStocks, type, face)
          if (!stock) throw new Error(`Denominação de ${type.toLowerCase()} não cadastrada: R$ ${face}.`)
          const existing = changes.find((change) => change.id === stock.id)
          const delta = multiplier * qty
          if (existing) existing.newQuantity += delta
          else changes.push({ id: stock.id, newQuantity: Number(stock.quantidade_atual || 0) + delta })
        })
      })
    })

    changes.forEach((change) => {
      if (change.newQuantity < 0) throw new Error('Estorno bloqueado: o saldo da denominação ficaria negativo.')
    })

    const now = new Date().toISOString()
    for (const change of changes) {
      const { error } = await supabase.from('cash_denominations')
        .update({ quantidade_atual: change.newQuantity, updated_at: now })
        .eq('id', change.id)
      if (error) throw error
    }

    const reversalRows = originalMovements.map((movement) => ({
      store_id: storeId,
      created_by: userId,
      tipo_movimento: movement.tipo_movimento === 'ENTRADA' ? 'SAIDA' : 'ENTRADA',
      valor_total: movement.valor_total,
      origem: `ESTORNO: ${movement.destino || movement.origem}`,
      destino: `ESTORNO: ${movement.origem || movement.destino}`,
      detalhamento: {
        ...movement.detalhamento,
        tipo_operacao: 'ESTORNO',
        estorno_de: movement.id,
        operacao_id: operationId,
        estornada_em: now
      }
    }))
    const { data: reversals, error: reversalError } = await supabase
      .from('cash_movements')
      .insert(reversalRows)
      .select('id')
    if (reversalError) throw reversalError

    for (const movement of originalMovements) {
      const { error } = await supabase.from('cash_movements')
        .update({
          detalhamento: {
            ...movement.detalhamento,
            estornada: true,
            estornada_em: now,
            estorno_id: reversals?.find((reversal, index) => reversal && index === originalMovements.indexOf(movement))?.id || null
          }
        })
        .eq('id', movement.id)
      if (error) throw error
    }
    const { data: linkedDeposits, error: depositLookupError } = await supabase
      .from('deposits')
      .select('id, detalhes_troca')
      .contains('detalhes_troca', { operacao_ids: [operationId] })
    if (depositLookupError) throw depositLookupError
    for (const deposit of linkedDeposits || []) {
      const { error } = await supabase.from('deposits')
        .update({
          detalhes_troca: {
            ...(deposit.detalhes_troca || {}),
            estornada: true,
            estornada_em: now
          }
        })
        .eq('id', deposit.id)
      if (error) throw error
    }
    return { operationId, reversalIds: (reversals || []).map((reversal) => reversal.id) }
  },

  async revertMovement(storeId, userId, movementId) {
    const { data: movement, error } = await supabase
      .from('cash_movements')
      .select('detalhamento')
      .eq('id', movementId)
      .single()
    if (error) throw error
    return this.reverseOperation(storeId, userId, movement?.detalhamento?.operacao_id)
  }
}
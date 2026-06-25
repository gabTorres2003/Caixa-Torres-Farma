import { useState, useCallback } from 'react'
import { SupabaseCashRepository } from '../../infrastructure/supabase/repositories/SupabaseCashRepository'
import { supabase } from '../../infrastructure/supabase/supabaseClient'

export const useCashManagement = (user) => {
  const storeId = user?.store_id
  const [denominations, setDenominations] = useState([])
  const [lastConference, setLastConference] = useState(null)
  const [movements, setMovements] = useState([]) // Novo estado para Auditoria
  const [isLoading, setIsLoading] = useState(true)
  const [isActionLoading, setIsActionLoading] = useState(false)

  const carregarEstoque = useCallback(async () => {
    if (!storeId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      let data = await SupabaseCashRepository.getDenominations(storeId)
      if (data.length === 0) {
        await SupabaseCashRepository.initializeDenominations(storeId)
        data = await SupabaseCashRepository.getDenominations(storeId)
      }

      // Garante que as moedas sempre tenham a meta 50 estabelecida
      for (let d of data) {
        if (d.tipo === 'MOEDA' && d.quantidade_ideal !== 50) {
           await supabase.from('cash_denominations').update({ quantidade_ideal: 50 }).eq('id', d.id);
           d.quantidade_ideal = 50;
        }
      }

      setDenominations(data)

      const ultima = await SupabaseCashRepository.getLastConference(storeId)
      setLastConference(ultima)

      // Carrega Auditoria de Movimentações para a tabela de histórico
      const { data: movs } = await supabase
        .from('cash_movements')
        .select('*, users ( nome )')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .limit(30);
      setMovements(movs || []);

    } catch (error) {
      console.error('Erro ao carregar estoque:', error)
      alert('Atenção: Erro de conexão com o banco de dados. Detalhe: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }, [storeId])

  const calcularUnidadesPorTotal = (valorFace, valorTotalDigitado) => {
    if (!valorTotalDigitado || isNaN(valorTotalDigitado)) return 0
    return Math.floor(parseFloat(valorTotalDigitado) / parseFloat(valorFace))
  }

  const salvarLimitesEContagem = async (estoqueLocal, bolsasPendentes = 0) => {
    if (!user) {
      alert('Sessão do usuário não encontrada. Recarregue a página.')
      return
    }

    setIsActionLoading(true)
    try {
      // 1. Salva a quantidade e limites atuais
      const promises = Object.entries(estoqueLocal).map(([id, dados]) => {
        return supabase
          .from('cash_denominations')
          .update({
            quantidade_atual: Number(dados.unidades_atual) || 0,
            quantidade_minima: Number(dados.minima) || 0,
            quantidade_ideal: Number(dados.ideal) || 0,
          })
          .eq('id', id)
      })
      await Promise.all(promises)

      // 2. Prepara detalhamento da contagem
      let valor_total_cofre = 0
      let detalhamento_cofre = {}

      Object.entries(estoqueLocal).forEach(([id, dados]) => {
        const denom = denominations.find((d) => d.id === id)
        if (denom) {
          valor_total_cofre += (Number(dados.unidades_atual) || 0) * denom.valor
          detalhamento_cofre[denom.valor.toString()] = Number(dados.unidades_atual) || 0
        }
      })

      // 3. Registra a conferência
      await SupabaseCashRepository.registerMovement({
        store_id: user.store_id,
        created_by: user.id,
        tipo_movimento: 'CONTAGEM_INICIAL',
        valor_total: valor_total_cofre,
        origem: 'Cofre Central',
        destino: 'Cofre Central',
        detalhamento: detalhamento_cofre,
      })

      // 4. Registra as bolsas montadas
      if (bolsasPendentes > 0) {
        const regraBolsa = [
          { valorFace: 20, qtd: 5 }, { valorFace: 10, qtd: 10 }, { valorFace: 5, qtd: 20 },
          { valorFace: 2, qtd: 50 }, { valorFace: 1, qtd: 5 }, { valorFace: 0.5, qtd: 20 },
          { valorFace: 0.25, qtd: 40 }, { valorFace: 0.1, qtd: 30 }, { valorFace: 0.05, qtd: 40 },
        ]
        let detalhamentoBolsa = {}
        let valorTotalBolsa = 0

        denominations.forEach((d) => {
          const regra = regraBolsa.find((r) => r.valorFace === Number(d.valor))
          if (regra) {
            const qtdDescontada = regra.qtd * bolsasPendentes
            detalhamentoBolsa[d.valor.toString()] = qtdDescontada
            valorTotalBolsa += qtdDescontada * d.valor
          }
        })

        await SupabaseCashRepository.registerMovement({
          store_id: user.store_id, created_by: user.id, tipo_movimento: 'SAIDA',
          valor_total: valorTotalBolsa, origem: 'Cofre Central', destino: 'Bolsa de Abertura (Caixa)', detalhamento: detalhamentoBolsa,
        })
      }

      alert('Estoque do cofre salvo com sucesso!')
      await carregarEstoque()
    } catch (err) {
      alert('Erro ao salvar as configurações: ' + err.message)
    } finally {
      setIsActionLoading(false)
    }
  }

  const adjustBalance = async (newQuantities, manualOriginDest, observation) => {
    setIsActionLoading(true);
    try {
      await SupabaseCashRepository.adjustBalance(storeId, user.id, newQuantities, manualOriginDest, observation);
      await carregarEstoque();
      alert("Ajuste de saldo registrado com sucesso na auditoria!");
    } catch (error) {
      console.error("Erro no ajuste:", error);
      alert("Erro ao realizar ajuste: " + error.message);
      throw error;
    } finally {
      setIsActionLoading(false);
    }
  };

  return {
    denominations, lastConference, movements, isLoading, isActionLoading,
    carregarEstoque, calcularUnidadesPorTotal, salvarLimitesEContagem, adjustBalance
  }
}
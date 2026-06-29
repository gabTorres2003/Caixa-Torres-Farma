import { useState, useCallback } from 'react'
import { SupabaseCashRepository } from '../../infrastructure/supabase/repositories/SupabaseCashRepository'
import { supabase } from '../../infrastructure/supabase/supabaseClient'

export const useCashManagement = (user) => {
  const storeId = user?.store_id
  const [denominations, setDenominations] = useState([])
  const [lastConference, setLastConference] = useState(null)
  const [movements, setMovements] = useState([])
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

      setDenominations(data)

      const ultima = await SupabaseCashRepository.getLastConference(storeId)
      setLastConference(ultima)

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

  const adjustBalance = async (newQuantities, manualOriginDest, observation) => {
    setIsActionLoading(true);
    try {
      await SupabaseCashRepository.adjustBalance(storeId, user.id, newQuantities, manualOriginDest, observation);
      await carregarEstoque();
      alert("Ajuste de saldo registrado com sucesso na auditoria!");
      return true;
    } catch (error) {
      console.error("Erro no ajuste:", error);
      alert("Erro ao realizar ajuste: " + error.message);
      return false;
    } finally {
      setIsActionLoading(false);
    }
  };

  const updateMetrics = async (metricsData) => {
    setIsActionLoading(true)
    try {
      await SupabaseCashRepository.updateMetricsBatch(metricsData)
      await carregarEstoque()
      alert('Métricas atualizadas com sucesso!')
      return true
    } catch (error) {
      console.error(error)
      alert('Erro ao atualizar métricas: ' + error.message)
      return false
    } finally {
      setIsActionLoading(false)
    }
  }

  const registrarSobraCaixa = async (unidadesExtras, observacao, operador, dataReferente) => {
    setIsActionLoading(true)
    try {
      await SupabaseCashRepository.registerManualInflow(storeId, user.id, unidadesExtras, 'Sobra de Caixa', observacao, operador, dataReferente)
      await carregarEstoque()
      alert('Sobra de caixa registrada com sucesso no cofre!')
      return true
    } catch (error) {
      console.error(error)
      alert('Erro ao registrar sobra: ' + error.message)
      return false
    } finally {
      setIsActionLoading(false)
    }
  }

  const adicionarValoresManualmente = async (unidadesExtras, origem, observacao, operador, dataReferente) => {
    setIsActionLoading(true)
    try {
      await SupabaseCashRepository.registerManualInflow(storeId, user.id, unidadesExtras, origem, observacao, operador, dataReferente)
      await carregarEstoque()
      alert('Valores adicionados com sucesso no cofre!')
      return true
    } catch (error) {
      console.error(error)
      alert('Erro ao adicionar valores: ' + error.message)
      return false
    } finally {
      setIsActionLoading(false)
    }
  }

  const prepararBolsas = async (notas, moedas, moedasValorTotal, totalValor, qtdBolsas) => {
    setIsActionLoading(true)
    try {
      // Registra a saída diretamente do Cofre
      await SupabaseCashRepository.registerOutflowFromVault(
        storeId, user.id, notas, moedasValorTotal, totalValor,
        `Preparação de Bolsas de Abertura (${qtdBolsas}x)`, moedas
      )
      await carregarEstoque()
      alert('Bolsas preparadas e retiradas do cofre com sucesso!')
      return true
    } catch (error) {
      console.error(error)
      alert('Erro ao preparar bolsas: ' + error.message)
      return false
    } finally {
      setIsActionLoading(false)
    }
  }

  return {
    denominations, lastConference, movements, isLoading, isActionLoading,
    carregarEstoque, adjustBalance, updateMetrics, registrarSobraCaixa, adicionarValoresManualmente, prepararBolsas
  }
}
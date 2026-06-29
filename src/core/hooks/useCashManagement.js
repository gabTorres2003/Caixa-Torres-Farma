import { useState, useCallback, useEffect } from 'react'
import { SupabaseCashRepository } from '../../infrastructure/supabase/repositories/SupabaseCashRepository'

export const useCashManagement = (user) => {
  const storeId = user?.store_id
  const [denominations, setDenominations] = useState([])
  const [lastConference, setLastConference] = useState(null)
  const [movements, setMovements] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isActionLoading, setIsActionLoading] = useState(false)
  
  // Estado do Filtro de Data da Auditoria
  const [auditDate, setAuditDate] = useState(() => {
    const tzOffset = new Date().getTimezoneOffset() * 60000;
    return new Date(Date.now() - tzOffset).toISOString().split('T')[0];
  })

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

      // Busca movimentações com o filtro de data aplicado
      const movs = await SupabaseCashRepository.getMovementsByDate(storeId, auditDate)
      setMovements(movs)

    } catch (error) {
      console.error('Erro ao carregar estoque/movimentações:', error)
      alert('Atenção: Erro de conexão com o banco de dados. Detalhe: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }, [storeId, auditDate]) // Depende da data para recarregar se mudar

  // Recarrega sempre que a data do filtro mudar
  useEffect(() => {
    carregarEstoque()
  }, [carregarEstoque])

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

  // NOVA FUNÇÃO: Reverter/Estornar
  const reverterMovimentacao = async (movementId) => {
    setIsActionLoading(true)
    try {
      await SupabaseCashRepository.revertMovement(storeId, user.id, movementId)
      await carregarEstoque() // Recarrega para refletir as quantidades no cofre
      alert('Movimentação revertida com sucesso! O saldo foi ajustado e o estorno gravado na auditoria.')
      return true
    } catch (error) {
      console.error(error)
      alert('Erro ao reverter: ' + error.message)
      return false
    } finally {
      setIsActionLoading(false)
    }
  }

  return {
    denominations, lastConference, movements, isLoading, isActionLoading, auditDate, setAuditDate,
    carregarEstoque, adjustBalance, updateMetrics, registrarSobraCaixa, adicionarValoresManualmente, prepararBolsas, reverterMovimentacao
  }
}
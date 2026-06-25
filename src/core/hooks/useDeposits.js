import { useState, useCallback } from 'react'
import { DepositRepository } from '../../infrastructure/supabase/repositories/SupabaseDepositRepository'
import { SupabaseCashRepository } from '../../infrastructure/supabase/repositories/SupabaseCashRepository'

export const useDeposits = (user, dataFiltro) => {
  const [depositsList, setDepositsList] = useState([])
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [isActionLoading, setIsActionLoading] = useState(false)

  const carregarDepositos = useCallback(async () => {
    if (!user?.store_id) return
    setIsPageLoading(true)
    try {
      let dataConsulta = dataFiltro
      if (user.role !== 'ADMIN') {
        const tzOffset = new Date().getTimezoneOffset() * 60000
        dataConsulta = new Date(Date.now() - tzOffset).toISOString().split('T')[0]
      }
      const data = await DepositRepository.getDeposits(user.store_id, dataConsulta)
      setDepositsList(data)
    } catch (err) {
      console.error('Erro ao buscar dados:', err.message)
    } finally {
      setIsPageLoading(false)
    }
  }, [user, dataFiltro])

  const salvarDeposito = async (payload, editingId) => {
    setIsActionLoading(true)
    try {
      if (editingId) {
        await DepositRepository.updateDeposit(editingId, payload)
      } else {
        // Regra: Subtrai do cofre apenas se for Depósito ou Troca Externa (origem = Caixa de Troco)
        if (payload.origem === 'Caixa de Troco') {
          await SupabaseCashRepository.registerOutflowFromVault(
            user.store_id,
            user.id,
            payload.detalhes_troca.notas,
            payload.detalhes_troca.moedasValor,
            payload.valor,
            payload.categoria === 'Depósito' ? 'Depósito Bancário' : `Troca Externa (${payload.destino})`
          )
        }
        
        await DepositRepository.addDeposit({ ...payload, store_id: user.store_id, created_by: user.id })
      }
      await carregarDepositos()
    } catch (err) {
      alert('Erro ao processar registro: ' + err.message)
      throw err
    } finally {
      setIsActionLoading(false)
    }
  }

  const excluirDeposito = async (id) => {
    setIsActionLoading(true)
    try {
      await DepositRepository.deleteDeposit(id)
      await carregarDepositos()
    } catch (err) {
      alert('Erro ao excluir: ' + err.message)
    } finally {
      setIsActionLoading(false)
    }
  }

  // Recebe o 3º parâmetro (registroOriginal) para saber de onde a troca voltou
  const receberTroca = async (id, payloadEntrada, registroOriginal) => {
    setIsActionLoading(true)
    try {
      await DepositRepository.receiveExchange(id, {
        status_troca: 'CONCLUIDA',
        recebido_em: new Date().toISOString(),
        ...payloadEntrada 
      })

      // Regra 3 e 4: O valor recebido de trocas externas OBRIGATORIAMENTE vai para o Caixa de Troco
      if (payloadEntrada.detalhes_troca && payloadEntrada.detalhes_troca.notas) {
        await SupabaseCashRepository.registerInflowToVault(
          user.store_id,
          user.id,
          payloadEntrada.detalhes_troca.notas,
          payloadEntrada.detalhes_troca.moedasValor,
          payloadEntrada.valor_recebido,
          `Retorno de Troca Externa (${registroOriginal?.origem || 'Rua'})`
        )
      }

      await carregarDepositos()
      alert('Recebimento confirmado! As notas e moedas foram adicionadas ao saldo do Caixa de Troco.')
    } catch (err) {
      alert('Erro ao confirmar recebimento: ' + err.message)
    } finally {
      setIsActionLoading(false)
    }
  }

  return { depositsList, isPageLoading, isActionLoading, carregarDepositos, salvarDeposito, excluirDeposito, receberTroca }
}
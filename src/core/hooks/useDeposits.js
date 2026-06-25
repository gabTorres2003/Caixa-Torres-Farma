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
        // Regra: Troca Interna Comum
        if (payload.categoria === 'Troca (Caixa de Troco)') {
          await SupabaseCashRepository.registerOutflowFromVault(user.store_id, user.id, payload.detalhes_troca.notas, payload.detalhes_troca.moedasValor, payload.valor, 'Gaveta do Operador (Troca Interna)');
          await SupabaseCashRepository.registerInflowToVault(user.store_id, user.id, payload.detalhes_troca.notasEntrada, payload.detalhes_troca.moedasValorEntrada, payload.valor, 'Gaveta do Operador (Troca Interna)');
        } 
        // Regra: Crédito no Caixa (Pegar moedas do cofre)
        else if (payload.categoria === 'Moedas (Crédito)') {
          await SupabaseCashRepository.registerOutflowFromVault(user.store_id, user.id, null, 0, payload.valor, 'Caixa Atual', payload.detalhes_troca.moedas);
        }
        // Regra: Troca Externa de Moedas (Saindo do cofre)
        else if (payload.categoria === 'Moedas (Troca Externa)' && payload.origem === 'Caixa de Troco') {
          await SupabaseCashRepository.registerOutflowFromVault(user.store_id, user.id, payload.detalhes_troca.notas, 0, payload.valor, `Troca de Moedas (${payload.destino})`);
        }
        // Regra Antiga Mantida: Depósitos ou Trocas Externas Comuns
        else if (payload.origem === 'Caixa de Troco' && payload.categoria !== 'Moedas (Troca Externa)') {
          await SupabaseCashRepository.registerOutflowFromVault(user.store_id, user.id, payload.detalhes_troca.notas, payload.detalhes_troca.moedasValor, payload.valor, payload.categoria === 'Depósito' ? 'Depósito Bancário' : `Troca Externa (${payload.destino})`);
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

  const receberTroca = async (id, payloadEntrada, registroOriginal) => {
    setIsActionLoading(true)
    try {
      await DepositRepository.receiveExchange(id, {
        status_troca: 'CONCLUIDA', recebido_em: new Date().toISOString(), ...payloadEntrada 
      })

      // Retorno de Troca Externa Comum
      if (payloadEntrada.detalhes_troca && payloadEntrada.detalhes_troca.notas && registroOriginal.categoria !== 'Moedas (Troca Externa)') {
        await SupabaseCashRepository.registerInflowToVault(user.store_id, user.id, payloadEntrada.detalhes_troca.notas, payloadEntrada.detalhes_troca.moedasValor, payloadEntrada.valor_recebido, `Retorno de Troca Externa (${registroOriginal?.origem || 'Rua'})`);
      }
      // Retorno de Moedas (Troca Externa saindo do Cofre)
      else if (payloadEntrada.detalhes_troca && payloadEntrada.detalhes_troca.moedas && registroOriginal.origem === 'Caixa de Troco') {
        await SupabaseCashRepository.registerInflowToVault(user.store_id, user.id, null, 0, payloadEntrada.valor_recebido, `Retorno de Moedas (${registroOriginal?.origem || 'Rua'})`, payloadEntrada.detalhes_troca.moedas);
      }
      // Efetiva a Sangria de Moedas de uma Troca Externa originada no Caixa Atual
      else if (registroOriginal?.categoria === 'Moedas (Troca Externa)' && registroOriginal?.origem === 'Caixa Atual' && registroOriginal?.detalhes_troca?.moedasSangria) {
         const valorSangria = Object.entries(registroOriginal.detalhes_troca.moedasSangria).reduce((acc, [v, q]) => acc + (Number(v)*q), 0);
         await SupabaseCashRepository.registerInflowToVault(user.store_id, user.id, null, 0, valorSangria, `Sangria de Moedas (Troca Externa)`, registroOriginal.detalhes_troca.moedasSangria);
      }

      await carregarDepositos()
      alert('Recebimento confirmado e baixado com sucesso!')
    } catch (err) {
      alert('Erro ao confirmar recebimento: ' + err.message)
    } finally {
      setIsActionLoading(false)
    }
  }

  return { depositsList, isPageLoading, isActionLoading, carregarDepositos, salvarDeposito, excluirDeposito, receberTroca }
}
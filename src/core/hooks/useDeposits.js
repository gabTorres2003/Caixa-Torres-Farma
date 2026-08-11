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
      if (payload.observacao_ajuste) {
         payload.detalhes_troca = { ...payload.detalhes_troca, observacao_ajuste: payload.observacao_ajuste };
      }
      delete payload.observacao_ajuste;

      if (editingId) {
        await DepositRepository.updateDeposit(editingId, payload)
      } else {
        const isOrigemCofre = payload.origem?.includes('Troco') || payload.origem?.includes('Cofre');

        if (payload.categoria === 'Troca (Caixa de Troco)') {
          await SupabaseCashRepository.registerOutflowFromVault(user.store_id, user.id, payload.detalhes_troca?.notas, payload.detalhes_troca?.moedasValor, payload.valor, 'Gaveta do Operador (Troca Interna)', payload.detalhes_troca?.moedas);
          await SupabaseCashRepository.registerInflowToVault(user.store_id, user.id, payload.detalhes_troca?.notasEntrada, payload.detalhes_troca?.moedasValorEntrada, payload.valor, 'Gaveta do Operador (Troca Interna)', payload.detalhes_troca?.moedasEntrada);
        } 
        else if (payload.categoria === 'Moedas (Crédito)') {
          await SupabaseCashRepository.registerOutflowFromVault(user.store_id, user.id, null, 0, payload.valor, 'Caixa Atual', payload.detalhes_troca?.moedas);
        }
        else if (payload.categoria === 'Sangria de Moedas') {
          await SupabaseCashRepository.registerInflowToVault(user.store_id, user.id, null, 0, payload.valor, 'Sangria do Caixa Atual', payload.detalhes_troca?.moedas);
        }
        else if (payload.categoria === 'Moedas (Troca Externa)' && isOrigemCofre) {
          await SupabaseCashRepository.registerOutflowFromVault(user.store_id, user.id, payload.detalhes_troca?.notas, 0, payload.valor, `${payload.categoria} (${payload.destino})`, null);
        }
        else if (isOrigemCofre && payload.categoria !== 'Moedas (Troca Externa)') {
          await SupabaseCashRepository.registerOutflowFromVault(user.store_id, user.id, payload.detalhes_troca?.notas, payload.detalhes_troca?.moedasValor, payload.valor, payload.categoria === 'Depósito' ? 'Depósito Bancário' : `${payload.categoria} (${payload.destino})`, payload.detalhes_troca?.moedas);
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
      const depositToDelete = depositsList.find(d => d.id === id);
      
      if (depositToDelete) {
        const isOrigemCofre = depositToDelete.origem?.includes('Troco') || depositToDelete.origem?.includes('Cofre');
        
        if (depositToDelete.categoria === 'Troca (Caixa de Troco)') {
           await SupabaseCashRepository.registerInflowToVault(user.store_id, user.id, depositToDelete.detalhes_troca?.notas, depositToDelete.detalhes_troca?.moedasValor || 0, depositToDelete.valor, `Estorno Exclusão Troca Interna (Saída)`, depositToDelete.detalhes_troca?.moedas);
           await SupabaseCashRepository.registerOutflowFromVault(user.store_id, user.id, depositToDelete.detalhes_troca?.notasEntrada, depositToDelete.detalhes_troca?.moedasValorEntrada || 0, depositToDelete.valor, `Estorno Exclusão Troca Interna (Entrada)`, depositToDelete.detalhes_troca?.moedasEntrada);
        } else if (depositToDelete.categoria === 'Moedas (Crédito)') {
           await SupabaseCashRepository.registerInflowToVault(user.store_id, user.id, null, 0, depositToDelete.valor, `Estorno Exclusão Moedas (Crédito)`, depositToDelete.detalhes_troca?.moedas);
        } else if (depositToDelete.categoria === 'Sangria de Moedas') {
           await SupabaseCashRepository.registerOutflowFromVault(user.store_id, user.id, null, 0, depositToDelete.valor, `Estorno Exclusão Sangria de Moedas`, depositToDelete.detalhes_troca?.moedas);
        } else if (depositToDelete.categoria === 'Moedas (Troca Externa)') {
           if (isOrigemCofre) {
              await SupabaseCashRepository.registerInflowToVault(user.store_id, user.id, depositToDelete.detalhes_troca?.notas, 0, depositToDelete.valor, `Estorno Exclusão Troca de Moedas`, null);
           }
           if (depositToDelete.status_troca === 'CONCLUIDA' && depositToDelete.detalhes_troca?.moedasEntrada) {
               await SupabaseCashRepository.registerOutflowFromVault(user.store_id, user.id, null, 0, depositToDelete.valor_recebido || depositToDelete.valor, `Estorno Exclusão Retorno de Moedas`, depositToDelete.detalhes_troca.moedasEntrada);
           }
        } else {
           if (isOrigemCofre) {
               await SupabaseCashRepository.registerInflowToVault(user.store_id, user.id, depositToDelete.detalhes_troca?.notas, depositToDelete.detalhes_troca?.moedasValor || 0, depositToDelete.valor, `Estorno Exclusão ${depositToDelete.categoria}`, depositToDelete.detalhes_troca?.moedas);
           }
           if (depositToDelete.status_troca === 'CONCLUIDA' && depositToDelete.detalhes_troca?.notasEntrada) {
               await SupabaseCashRepository.registerOutflowFromVault(user.store_id, user.id, depositToDelete.detalhes_troca.notasEntrada, depositToDelete.detalhes_troca.moedasValorEntrada || 0, depositToDelete.valor_recebido || depositToDelete.valor, `Estorno Exclusão Retorno de ${depositToDelete.categoria}`, depositToDelete.detalhes_troca.moedasEntrada);
           }
        }
      }

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
      const inflowDetails = payloadEntrada.detalhes_troca;
      const mergedDetalhes = {
          ...registroOriginal.detalhes_troca,
          notasEntrada: inflowDetails?.notas,
          moedasEntrada: inflowDetails?.moedas,
          moedasValorEntrada: inflowDetails?.moedasValor || 0
      };

      const payloadToDb = {
          status_troca: 'CONCLUIDA', 
          recebido_em: new Date().toISOString(),
          recebido_por: payloadEntrada.recebido_por,
          valor_recebido: payloadEntrada.valor_recebido,
          detalhes_troca: mergedDetalhes 
      };

      await DepositRepository.receiveExchange(id, payloadToDb)

      const vaiParaCofre = registroOriginal?.origem !== 'Caixa Atual';

      if (vaiParaCofre) {
          if (inflowDetails && inflowDetails.notas && registroOriginal.categoria !== 'Moedas (Troca Externa)') {
              await SupabaseCashRepository.registerInflowToVault(user.store_id, user.id, inflowDetails.notas, inflowDetails.moedasValor || 0, payloadEntrada.valor_recebido, `Retorno de ${registroOriginal.categoria} (${registroOriginal?.origem || 'Rua'})`, inflowDetails.moedas);
          }
          else if (inflowDetails && inflowDetails.moedas && registroOriginal.categoria === 'Moedas (Troca Externa)') {
              await SupabaseCashRepository.registerInflowToVault(user.store_id, user.id, null, 0, payloadEntrada.valor_recebido, `Retorno de Moedas (${registroOriginal?.origem || 'Rua'})`, inflowDetails.moedas);
          }
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
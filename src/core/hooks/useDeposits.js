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
        const isOrigemCofre = payload.origem?.includes('Troco') || payload.origem?.includes('Cofre');

        // CORREÇÃO 1: Adicionado "payload.detalhes_troca.moedas" em todas as chamadas para o cofre!
        if (payload.categoria === 'Troca (Caixa de Troco)') {
          await SupabaseCashRepository.registerOutflowFromVault(user.store_id, user.id, payload.detalhes_troca.notas, payload.detalhes_troca.moedasValor, payload.valor, 'Gaveta do Operador (Troca Interna)', payload.detalhes_troca.moedas);
          await SupabaseCashRepository.registerInflowToVault(user.store_id, user.id, payload.detalhes_troca.notasEntrada, payload.detalhes_troca.moedasValorEntrada, payload.valor, 'Gaveta do Operador (Troca Interna)', payload.detalhes_troca.moedasEntrada);
        } 
        else if (payload.categoria === 'Moedas (Crédito)') {
          await SupabaseCashRepository.registerOutflowFromVault(user.store_id, user.id, null, 0, payload.valor, 'Caixa Atual', payload.detalhes_troca.moedas);
        }
        else if (payload.categoria === 'Sangria de Moedas') {
          await SupabaseCashRepository.registerInflowToVault(user.store_id, user.id, null, 0, payload.valor, 'Sangria do Caixa Atual', payload.detalhes_troca.moedas);
        }
        else if (payload.categoria === 'Moedas (Troca Externa)' && isOrigemCofre) {
          await SupabaseCashRepository.registerOutflowFromVault(user.store_id, user.id, payload.detalhes_troca.notas, 0, payload.valor, `Troca de Moedas (${payload.destino})`, null);
        }
        else if (isOrigemCofre && payload.categoria !== 'Moedas (Troca Externa)') {
          await SupabaseCashRepository.registerOutflowFromVault(user.store_id, user.id, payload.detalhes_troca.notas, payload.detalhes_troca.moedasValor, payload.valor, payload.categoria === 'Depósito' ? 'Depósito Bancário' : `Troca Externa (${payload.destino})`, payload.detalhes_troca.moedas);
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
        } else if (depositToDelete.categoria === 'Moedas (Troca Externa)' && isOrigemCofre) {
           await SupabaseCashRepository.registerInflowToVault(user.store_id, user.id, depositToDelete.detalhes_troca?.notas, 0, depositToDelete.valor, `Estorno Exclusão Troca de Moedas`, null);
        } else if (isOrigemCofre) {
           if (depositToDelete.categoria !== 'Depósito' && depositToDelete.status_troca === 'CONCLUIDA' && depositToDelete.recebido_por) {
             alert('ATENÇÃO: Como esta troca Externa já havia sido concluída, o sistema não consegue estornar automaticamente a saída original (pois o detalhamento foi sobrescrito). O registro sumirá daqui, mas você precisará ajustar o cofre manualmente no módulo de Auditoria.');
           } else {
             await SupabaseCashRepository.registerInflowToVault(user.store_id, user.id, depositToDelete.detalhes_troca?.notas, depositToDelete.detalhes_troca?.moedasValor || 0, depositToDelete.valor, `Estorno Exclusão ${depositToDelete.categoria}`, depositToDelete.detalhes_troca?.moedas);
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
      await DepositRepository.receiveExchange(id, {
        status_troca: 'CONCLUIDA', recebido_em: new Date().toISOString(), ...payloadEntrada 
      })

      const isOrigemCofre = registroOriginal?.origem?.includes('Troco') || registroOriginal?.origem?.includes('Cofre');

      // CORREÇÃO 1: Adicionado "payloadEntrada.detalhes_troca.moedas" na chamada de entrada no cofre
      if (payloadEntrada.detalhes_troca && payloadEntrada.detalhes_troca.notas && registroOriginal.categoria !== 'Moedas (Troca Externa)') {
        await SupabaseCashRepository.registerInflowToVault(user.store_id, user.id, payloadEntrada.detalhes_troca.notas, payloadEntrada.detalhes_troca.moedasValor, payloadEntrada.valor_recebido, `Retorno de Troca Externa (${registroOriginal?.origem || 'Rua'})`, payloadEntrada.detalhes_troca.moedas);
      }
      else if (payloadEntrada.detalhes_troca && payloadEntrada.detalhes_troca.moedas && isOrigemCofre) {
        await SupabaseCashRepository.registerInflowToVault(user.store_id, user.id, null, 0, payloadEntrada.valor_recebido, `Retorno de Moedas (${registroOriginal?.origem || 'Rua'})`, payloadEntrada.detalhes_troca.moedas);
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
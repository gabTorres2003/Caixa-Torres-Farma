import { useState, useCallback } from 'react'
import { DepositRepository } from '../../infrastructure/supabase/repositories/SupabaseDepositRepository'

export const useDeposits = (user, dataFiltro) => {
  const [depositsList, setDepositsList] = useState([])
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [isActionLoading, setIsActionLoading] = useState(false)

  const carregarDepositos = useCallback(async () => {
    if (!user?.store_id) return
    setIsPageLoading(true)
    
    try {
      let dataConsulta = dataFiltro
      
      // TRAVA DE SEGURANÇA: Se não for ADMIN, força a consulta sempre para o dia de HOJE
      if (user.role !== 'ADMIN') {
        const tzOffset = new Date().getTimezoneOffset() * 60000
        dataConsulta = new Date(Date.now() - tzOffset).toISOString().split('T')[0]
      }
      
      const data = await DepositRepository.getDeposits(user.store_id, dataConsulta)
      setDepositsList(data)
    } catch (err) {
      console.error('Erro ao buscar depósitos:', err.message)
    } finally {
      setIsPageLoading(false)
    }
  }, [user, dataFiltro])

  const salvarDeposito = async (payload, editingId) => {
    setIsActionLoading(true)
    try {
      if (editingId) {
        // ADMIN Editando um depósito existente
        await DepositRepository.updateDeposit(editingId, payload)
      } else {
        // Criando novo depósito
        await DepositRepository.addDeposit({ 
          ...payload, 
          store_id: user.store_id, 
          created_by: user.id 
        })
      }
      await carregarDepositos()
    } catch (err) {
      alert('Erro ao processar depósito: ' + err.message)
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
      alert('Erro ao excluir depósito: ' + err.message)
    } finally {
      setIsActionLoading(false)
    }
  }

  return { 
    depositsList, 
    isPageLoading, 
    isActionLoading, 
    carregarDepositos, 
    salvarDeposito, 
    excluirDeposito 
  }
}
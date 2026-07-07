import { useState, useCallback, useEffect } from 'react'
import { PreClosingRepository } from '../../infrastructure/supabase/repositories/SupabasePreClosingRepository'
import { useAuth } from './useAuth'

export const usePreClosing = (dataFiltro) => {
  const { user } = useAuth()
  const [preClosings, setPreClosings] = useState([])
  const [deliveriesTotals, setDeliveriesTotals] = useState({ dinheiro: 0, cartao: 0, pix: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [isActionLoading, setIsActionLoading] = useState(false)

  const loadData = useCallback(async () => {
    if (!user?.store_id) return
    setIsLoading(true)
    try {
      let dataConsulta = dataFiltro
      if (user.role !== 'ADMIN' && !dataFiltro) {
        const tzOffset = new Date().getTimezoneOffset() * 60000
        dataConsulta = new Date(Date.now() - tzOffset).toISOString().split('T')[0]
      }

      // 1. Carrega o Histórico de Pré-fechamentos do dia
      const data = await PreClosingRepository.getPreClosings(user.store_id, dataConsulta)
      setPreClosings(data)

      // 2. Carrega as entregas pendentes (Dívidas ativas da rua)
      const deliveries = await PreClosingRepository.getPendingDeliveriesTotals(user.store_id)
      let d = 0, c = 0, p = 0;
      
      deliveries.forEach(del => {
        // Se não tiver forma preenchida, assume que a cobrança padrão do motoqueiro é em dinheiro
        const forma = String(del.forma_pagamento_real || del.tipo_saida || 'DINHEIRO').toUpperCase()
        const valor = Number(del.valor || 0)
        
        if (forma.includes('CARTÃO') || forma.includes('CARTAO') || forma.includes('DEBITO') || forma.includes('CREDITO')) {
          c += valor
        } else if (forma.includes('PIX') || forma.includes('TRANSFER')) {
          p += valor
        } else {
          d += valor
        }
      })
      setDeliveriesTotals({ dinheiro: d, cartao: c, pix: p })

    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [user, dataFiltro])

  useEffect(() => {
    loadData()
  }, [loadData])

  const savePreClosing = async (payload, editingId = null) => {
    setIsActionLoading(true)
    try {
      if (editingId) {
        await PreClosingRepository.updatePreClosing(editingId, payload)
      } else {
        await PreClosingRepository.addPreClosing({ ...payload, store_id: user.store_id, created_by: user.id })
      }
      await loadData()
      return true
    } catch (err) {
      console.error(err)
      alert('Erro ao salvar pré-fechamento.')
      return false
    } finally {
      setIsActionLoading(false)
    }
  }

  const deletePreClosing = async (id) => {
    setIsActionLoading(true)
    try {
      await PreClosingRepository.deletePreClosing(id)
      await loadData()
      return true
    } catch (error) {
      console.error(error)
      alert('Erro ao excluir registro.')
      return false
    } finally {
      setIsActionLoading(false)
    }
  }

  return { preClosings, deliveriesTotals, isLoading, isActionLoading, loadData, savePreClosing, deletePreClosing }
}
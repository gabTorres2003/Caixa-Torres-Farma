import { useState, useCallback } from 'react'
import { ShiftHandoverRepository } from '../../infrastructure/supabase/repositories/ShiftHandoverRepository'

export const useShiftHandover = (user, role, dataFiltro) => {
  const [entregas, setEntregas] = useState([])
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [turnoEncerrado, setTurnoEncerrado] = useState(false)

  const carregarEntregas = useCallback(async () => {
    if (!user?.store_id) return
    setIsPageLoading(true)
    try {
      let dataConsulta = dataFiltro
      if (role === 'CAIXA_TARDE') {
        const tzOffset = new Date().getTimezoneOffset() * 60000
        dataConsulta = new Date(Date.now() - tzOffset).toISOString().split('T')[0]
      }
      const data = await ShiftHandoverRepository.getDeliveries(user.store_id, dataConsulta)
      setEntregas(data)
    } catch (err) {
      console.error('Erro ao buscar entregas:', err.message)
    } finally {
      setIsPageLoading(false)
    }
  }, [user?.store_id, role, dataFiltro])

  const salvarEntrega = async (data, editingId) => {
    setIsActionLoading(true)
    try {
      const payload = {
        comanda: data.comanda,
        valor: parseFloat(data.valor),
        tipo_saida: data.tipo,
        forma_pagamento_real: data.tipo,
        observacoes: data.observacoes || null,
      }

      if (editingId) {
        await ShiftHandoverRepository.updateDelivery(editingId, payload)
      } else {
        await ShiftHandoverRepository.addDelivery({
          ...payload,
          store_id: user.store_id,
          created_by: user.id,
        })
      }
      await carregarEntregas()
    } catch (err) {
      alert('Erro ao processar comanda: ' + err.message)
    } finally {
      setIsActionLoading(false)
    }
  }

  const excluirEntrega = async (id) => {
    try {
      await ShiftHandoverRepository.deleteDelivery(id)
      await carregarEntregas()
    } catch (err) {
      alert('Erro ao excluir: ' + err.message)
    }
  }

  const toggleConciliado = async (id, statusAtual) => {
    try {
      await ShiftHandoverRepository.updateReconciliationStatus(id, !statusAtual)
      setEntregas(prev => prev.map(e => e.id === id ? { ...e, conciliado: !statusAtual } : e))
    } catch (err) {
      alert('Erro ao conciliar: ' + err.message)
    }
  }

  const toggleCheckTarde = async (id, statusAtual) => {
    try {
      await ShiftHandoverRepository.updateCheckStatus(id, !statusAtual)
      setEntregas(prev => prev.map(e => e.id === id ? { ...e, conferido: !statusAtual } : e))
    } catch (err) {
      alert('Erro ao conferir: ' + err.message)
    }
  }

  const alterarFormaReal = async (id, novaForma) => {
    try {
      await ShiftHandoverRepository.updateRealPaymentForm(id, novaForma)
      setEntregas(prev => prev.map(e => e.id === id ? { ...e, forma_pagamento_real: novaForma } : e))
    } catch (err) {
      alert('Erro ao alterar forma de pagamento: ' + err.message)
    }
  }

  const anotarObservacao = async (id, obsAtual) => {
    const nota = window.prompt('Digite a anotação:', obsAtual || '')
    if (nota !== null) {
      try {
        await ShiftHandoverRepository.updateObservation(id, nota)
        setEntregas(prev => prev.map(e => e.id === id ? { ...e, observacoes: nota } : e))
      } catch (err) {
        alert('Erro ao salvar anotação: ' + err.message)
      }
    }
  }

  const finalizarTurnoTarde = async () => {
    setIsActionLoading(true)
    try {
      await ShiftHandoverRepository.finalizeAfternoonShift(user.store_id)
      alert('Turno vespertino consolidado com sucesso!')
      setTurnoEncerrado(true)
      await carregarEntregas()
    } catch (err) {
      alert('Erro ao encerrar turno: ' + err.message)
    } finally {
      setIsActionLoading(false)
    }
  }

  return {
    entregas, isPageLoading, isActionLoading, turnoEncerrado,
    carregarEntregas, salvarEntrega, excluirEntrega, toggleConciliado,
    toggleCheckTarde, alterarFormaReal, anotarObservacao, finalizarTurnoTarde
  }
}
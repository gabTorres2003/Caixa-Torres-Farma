import { useState, useCallback, useEffect } from 'react'
import { SupabaseMotoboyRepository } from '../../infrastructure/supabase/repositories/SupabaseMotoboyRepository'

export const useMotoboys = (user, dataFiltro) => {
  const [motoboys, setMotoboys] = useState([])
  const [timeRecords, setTimeRecords] = useState([])
  const [routes, setRoutes] = useState([])
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [isActionLoading, setIsActionLoading] = useState(false)

  const carregarDados = useCallback(async () => {
    if (!user?.store_id) return
    setIsPageLoading(true)
    try {
      const [motoboysData, timeData, routesData] = await Promise.all([
        SupabaseMotoboyRepository.getMotoboys(user.store_id),
        SupabaseMotoboyRepository.getTimeTracking(user.store_id, dataFiltro, dataFiltro),
        SupabaseMotoboyRepository.getRoutesByDate(user.store_id, dataFiltro)
      ])
      
      setMotoboys(motoboysData)
      setTimeRecords(timeData)
      setRoutes(routesData)
    } catch (err) {
      console.error('Erro ao buscar dados dos motoboys:', err.message)
    } finally {
      setIsPageLoading(false)
    }
  }, [user, dataFiltro])

  useEffect(() => { carregarDados() }, [carregarDados])

  // === GESTÃO DE MOTOBOYS (CRIAR, EDITAR E EXCLUIR) ===
  const salvarMotoboy = async (payload, editingId) => {
    setIsActionLoading(true)
    try {
      if (editingId) {
        await SupabaseMotoboyRepository.updateMotoboy(editingId, payload)
        alert('Cadastro atualizado com sucesso!')
      } else {
        await SupabaseMotoboyRepository.addMotoboy({ ...payload, store_id: user.store_id })
        alert('Motoboy cadastrado com sucesso!')
      }
      await carregarDados()
      return true
    } catch (err) {
      alert('Erro ao salvar motoboy: ' + err.message)
      return false
    } finally {
      setIsActionLoading(false)
    }
  }

  const excluirMotoboy = async (id) => {
    if(!window.confirm("Deseja excluir este motoboy? O histórico dele será mantido.")) return;
    setIsActionLoading(true)
    try {
      await SupabaseMotoboyRepository.deleteMotoboy(id)
      await carregarDados()
    } catch (err) {
      alert('Erro ao excluir motoboy: ' + err.message)
    } finally {
      setIsActionLoading(false)
    }
  }

  // === REGISTRO DE PONTO MANUAL E AUSÊNCIAS ===
  const registrarHorarioManual = async ({ id, motoboy_id, tipo_registro, registro_time }) => {
    setIsActionLoading(true)
    try {
      const payload = {
        store_id: user.store_id,
        motoboy_id,
        tipo_registro,
        registro_time,
        registered_by: user.id
      }

      if (id) {
        await SupabaseMotoboyRepository.updateTimeRecord(id, payload)
        alert('Registro manual atualizado com sucesso!')
      } else {
        await SupabaseMotoboyRepository.registerTime(payload)
        alert('Registro manual inserido com sucesso!')
      }
      await carregarDados()
      return true
    } catch (err) {
      alert('Erro ao salvar horário manual: ' + err.message)
      return false
    } finally {
      setIsActionLoading(false)
    }
  }

  const registrarAusencia = async ({ motoboyId, tipoRegistro, dataInicio, dataFim }) => {
    setIsActionLoading(true)
    try {
      const start = new Date(`${dataInicio}T00:00:00`)
      const end = new Date(`${dataFim}T00:00:00`)

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
        throw new Error('Informe datas válidas para o período.')
      }

      const dias = []
      const cursor = new Date(start)
      while (cursor <= end) {
        const dateString = cursor.toISOString().slice(0, 10)
        dias.push({
          store_id: user.store_id,
          motoboy_id: motoboyId,
          tipo_registro: tipoRegistro,
          registro_time: new Date(`${dateString}T12:00:00-03:00`).toISOString(),
          registered_by: user.id
        })
        cursor.setDate(cursor.getDate() + 1)
      }

      await SupabaseMotoboyRepository.registerTimeBulk(dias)
      await carregarDados()
      alert(`${tipoRegistro} registrado com sucesso!`)
      return true
    } catch (err) {
      alert('Erro ao registrar ausência: ' + err.message)
      return false
    } finally {
      setIsActionLoading(false)
    }
  }

  // === REGISTRO DE PONTO ===
  const registrarPonto = async (motoboyId, tipoRegistro) => {
    setIsActionLoading(true)
    try {
      await SupabaseMotoboyRepository.registerTime({
        store_id: user.store_id, motoboy_id: motoboyId,
        tipo_registro: tipoRegistro, registered_by: user.id
      })
      await carregarDados()
      alert(`Ponto de ${tipoRegistro} registrado com sucesso!`)
      return true
    } catch (err) {
      alert('Erro ao registrar ponto: ' + err.message)
      return false
    } finally {
      setIsActionLoading(false)
    }
  }

  const excluirPonto = async (id) => {
    if(!window.confirm("Deseja mesmo excluir este registro de ponto?")) return;
    setIsActionLoading(true)
    try {
      await SupabaseMotoboyRepository.deleteTimeRecord(id)
      await carregarDados()
    } catch (err) {
      alert('Erro ao excluir registro de ponto: ' + err.message)
    } finally {
      setIsActionLoading(false)
    }
  }

  // === GESTÃO DE ROTAS ===
  const cadastrarRota = async (motoboyId, estimatedTime, distanceKm, deliveries) => {
    setIsActionLoading(true)
    try {
      const routePayload = {
        store_id: user.store_id, motoboy_id: motoboyId, status: 'PREPARANDO',
        estimated_time_minutes: estimatedTime || 0, total_distance_km: distanceKm || 0, created_by: user.id
      }
      await SupabaseMotoboyRepository.createRoute(routePayload, deliveries)
      await carregarDados()
      alert('Rota cadastrada com sucesso!')
      return true
    } catch (err) {
      alert('Erro ao cadastrar rota: ' + err.message)
      return false
    } finally {
      setIsActionLoading(false)
    }
  }

  const atualizarStatusRota = async (routeId, novoStatus) => {
    setIsActionLoading(true)
    try {
      const payload = { status: novoStatus }
      if (novoStatus === 'EM_ROTA') payload.departure_time = new Date().toISOString()
      if (novoStatus === 'CONCLUIDA') payload.return_time = new Date().toISOString()
      
      await SupabaseMotoboyRepository.updateRouteStatus(routeId, payload)
      await carregarDados()
      return true
    } catch (err) {
      alert('Erro ao atualizar rota: ' + err.message)
      return false
    } finally {
      setIsActionLoading(false)
    }
  }

  const excluirRota = async (id) => {
     if(!window.confirm("Deseja mesmo apagar esta rota? As entregas vinculadas também serão removidas.")) return;
     setIsActionLoading(true)
     try {
       await SupabaseMotoboyRepository.deleteRoute(id)
       await carregarDados()
     } catch (err) {
       alert('Erro ao excluir rota: ' + err.message)
     } finally {
       setIsActionLoading(false)
     }
  }

  return {
    motoboys, timeRecords, routes, isPageLoading, isActionLoading,
    carregarDados, registrarPonto, registrarHorarioManual, registrarAusencia, excluirPonto, cadastrarRota, atualizarStatusRota, excluirRota, 
    salvarMotoboy, excluirMotoboy
  }
}
import React, { useState } from 'react'
import { Card } from '../../../shared/components/cards/Card'
import { Table } from '../../../shared/components/tables/Table'
import { Button } from '../../../shared/components/buttons/Button'
import { Modal } from '../../../shared/components/modals/Modal'
import { FormInput } from '../../../shared/components/forms/FormInput'
import { Map, Plus, PlayCircle, CheckCircle, Trash2, Calendar, Info } from 'lucide-react'

export const RouteManager = ({ motoboys, routes, cadastrarRota, atualizarStatusRota, excluirRota, isActionLoading, dataFiltro, setDataFiltro }) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newRoute, setNewRoute] = useState({ motoboy_id: '', distance: '', time: '' })

  const handleSaveRoute = async (e) => {
    e.preventDefault()
    if (!newRoute.motoboy_id) return alert("Selecione um motoboy.")
    
    // No futuro, as entregas virão da importação do DNA. Hoje passamos um array vazio [].
    const success = await cadastrarRota(newRoute.motoboy_id, Number(newRoute.time), Number(newRoute.distance), [])
    if (success) {
      setNewRoute({ motoboy_id: '', distance: '', time: '' })
      setIsModalOpen(false)
    }
  }

  const columns = [
    { header: 'Data de Criação', render: (row) => new Date(row.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) },
    { header: 'Motoboy', render: (row) => <strong style={{ color: 'var(--color-primary)' }}>{row.motoboys?.nome}</strong> },
    { header: 'Métricas Estimadas', render: (row) => <span style={{ fontSize: '0.85rem' }}>{row.total_distance_km} km / {row.estimated_time_minutes} min</span> },
    { header: 'Status', render: (row) => {
        const statusColors = { 'PREPARANDO': '#64748b', 'EM_ROTA': '#d97706', 'CONCLUIDA': '#16a34a' }
        return <strong style={{ color: statusColors[row.status] }}>{row.status.replace('_', ' ')}</strong>
      } 
    },
    { header: 'Ações', render: (row) => (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {row.status === 'PREPARANDO' && <Button onClick={() => atualizarStatusRota(row.id, 'EM_ROTA')} isLoading={isActionLoading} icon={PlayCircle} style={{ padding: '4px 8px', fontSize: '0.75rem', height: 'auto', backgroundColor: '#d97706', border: 'none' }}>Iniciar Rota</Button>}
          {row.status === 'EM_ROTA' && <Button onClick={() => atualizarStatusRota(row.id, 'CONCLUIDA')} isLoading={isActionLoading} icon={CheckCircle} style={{ padding: '4px 8px', fontSize: '0.75rem', height: 'auto', backgroundColor: '#16a34a', border: 'none' }}>Concluir Rota</Button>}
          <button onClick={() => excluirRota(row.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', marginLeft: '8px' }} title="Apagar Rota"><Trash2 size={18} /></button>
        </div>
      ) 
    }
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button onClick={() => setIsModalOpen(true)} icon={Plus}>Cadastrar Nova Rota</Button>
      </div>

      <Card title="Controle de Viagens (Rotas)" icon={Map}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={18} color="var(--color-primary)"/> Filtrar do dia:</label>
          <input type="date" className="input-field" style={{ padding: '8px 12px', fontSize: '0.9rem', cursor: 'pointer' }} value={dataFiltro} onChange={(e) => setDataFiltro(e.target.value)} />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <Table columns={columns} data={routes} emptyMessage="Nenhuma rota cadastrada hoje." />
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Cadastrar Rota de Entrega">
        <form onSubmit={handleSaveRoute} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ backgroundColor: '#eff6ff', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', color: '#1e40af', display: 'flex', gap: '8px' }}>
            <Info size={24} />
            <span>Futuramente, a importação do ERP DNA calculará o tempo e a distância automaticamente. Por enquanto, preencha os dados projetados manualmente.</span>
          </div>
          
          <div className="input-wrapper">
            <label className="input-label">Motoboy Responsável *</label>
            <select className="input-field" style={{ width: '100%' }} value={newRoute.motoboy_id} onChange={(e) => setNewRoute({...newRoute, motoboy_id: e.target.value})} required>
              <option value="">Selecione...</option>
              {motoboys.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="input-label">Distância Total (Km)</label>
              <input type="number" step="0.1" min="0" className="input-field" style={{ width: '100%' }} value={newRoute.distance} onChange={(e) => setNewRoute({...newRoute, distance: e.target.value})} placeholder="Ex: 5,5" />
            </div>
            <div>
              <label className="input-label">Tempo Previsto (Minutos)</label>
              <input type="number" min="0" className="input-field" style={{ width: '100%' }} value={newRoute.time} onChange={(e) => setNewRoute({...newRoute, time: e.target.value})} placeholder="Ex: 25" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} style={{ width: '100%', justifyContent: 'center' }}>Cancelar</Button>
            <Button type="submit" isLoading={isActionLoading} style={{ width: '100%', justifyContent: 'center' }}>Salvar Rota</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
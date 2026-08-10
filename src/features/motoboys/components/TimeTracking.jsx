import React, { useState } from 'react'
import { Card } from '../../../shared/components/cards/Card'
import { Table } from '../../../shared/components/tables/Table'
import { Button } from '../../../shared/components/buttons/Button'
import { Clock, Calendar, Trash2, ArrowRightCircle, ArrowLeftCircle } from 'lucide-react'

export const TimeTracking = ({ motoboys, timeRecords, registrarPonto, excluirPonto, isActionLoading, dataFiltro, setDataFiltro }) => {
  const [selectedMotoboy, setSelectedMotoboy] = useState('')

  const handleRegistrar = async (tipo) => {
    if (!selectedMotoboy) return alert("Selecione um motoboy primeiro!")
    await registrarPonto(selectedMotoboy, tipo)
    setSelectedMotoboy('')
  }

  const columns = [
    { header: 'Data/Hora', render: (row) => new Date(row.registro_time).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
    { header: 'Motoboy', render: (row) => <strong style={{ color: 'var(--color-text-main)' }}>{row.motoboys?.nome}</strong> },
    { header: 'Tipo', render: (row) => (
        <span style={{ 
          color: row.tipo_registro === 'ENTRADA' ? '#166534' : '#991b1b', 
          backgroundColor: row.tipo_registro === 'ENTRADA' ? '#dcfce7' : '#fee2e2', 
          padding: '4px 12px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' 
        }}>
          {row.tipo_registro}
        </span>
      ) 
    },
    { header: 'Registrado por', render: (row) => <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{row.users?.nome}</span> },
    { header: 'Ações', render: (row) => (
        <button onClick={() => excluirPonto(row.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }} title="Excluir Registro">
          <Trash2 size={18} />
        </button>
      ) 
    }
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
      <Card title="Relógio de Ponto Manual" icon={Clock}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'end', flexWrap: 'wrap', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--color-text-main)', display: 'block', marginBottom: '8px' }}>Selecione o Motoboy</label>
            <select className="input-field" value={selectedMotoboy} onChange={(e) => setSelectedMotoboy(e.target.value)} style={{ width: '100%' }}>
              <option value="">Selecione...</option>
              {motoboys.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button onClick={() => handleRegistrar('ENTRADA')} isLoading={isActionLoading} icon={ArrowRightCircle} style={{ backgroundColor: '#16a34a', border: 'none' }}>Registrar Entrada</Button>
            <Button onClick={() => handleRegistrar('SAIDA')} isLoading={isActionLoading} icon={ArrowLeftCircle} style={{ backgroundColor: '#dc2626', border: 'none' }}>Registrar Saída</Button>
          </div>
        </div>
      </Card>

      <Card title="Registros de Ponto do Dia">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={18} color="var(--color-primary)"/> Filtrar do dia:
          </label>
          <input type="date" className="input-field" style={{ padding: '8px 12px', fontSize: '0.9rem', cursor: 'pointer' }} value={dataFiltro} onChange={(e) => setDataFiltro(e.target.value)} />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <Table columns={columns} data={timeRecords} emptyMessage="Nenhum ponto registrado neste dia." />
        </div>
      </Card>
    </div>
  )
}
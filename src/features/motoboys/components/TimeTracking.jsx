import React, { useState } from 'react'
import { Card } from '../../../shared/components/cards/Card'
import { Table } from '../../../shared/components/tables/Table'
import { Button } from '../../../shared/components/buttons/Button'
import { Clock, Calendar, Trash2, ArrowRightCircle, ArrowLeftCircle } from 'lucide-react'

const getLocalDateTimeValue = () => {
  const local = new Date()
  const offset = local.getTimezoneOffset() * 60000
  return new Date(local.getTime() - offset).toISOString().slice(0, 16)
}

const getTipoLabel = (tipo) => {
  const mapa = {
    ENTRADA: 'ENTRADA',
    SAIDA: 'SAÍDA',
    FOLGA: 'FOLGA',
    FERIAS: 'FÉRIAS',
    ATESTADO: 'ATESTADO',
    FALTA: 'FALTA'
  }
  return mapa[tipo] || tipo
}

export const TimeTracking = ({
  motoboys,
  timeRecords,
  registrarPonto,
  registrarHorarioManual,
  registrarAusencia,
  excluirPonto,
  isActionLoading,
  dataFiltro,
  setDataFiltro,
  userRole
}) => {
  const isAdmin = userRole === 'ADMIN'
  const [selectedMotoboy, setSelectedMotoboy] = useState('')
  const [manualForm, setManualForm] = useState({
    motoboy_id: '',
    tipo_registro: 'ENTRADA',
    registro_time: getLocalDateTimeValue(),
  })
  const [editingManualId, setEditingManualId] = useState(null)
  const [absenceForm, setAbsenceForm] = useState({
    motoboyId: '',
    tipoRegistro: 'FOLGA',
    dataInicio: '',
    dataFim: ''
  })

  const resetManualForm = () => {
    setManualForm({ motoboy_id: '', tipo_registro: 'ENTRADA', registro_time: getLocalDateTimeValue() })
    setEditingManualId(null)
  }

  const handleRegistrar = async (tipo) => {
    if (!selectedMotoboy) return alert('Selecione um motoboy primeiro!')
    await registrarPonto(selectedMotoboy, tipo)
    setSelectedMotoboy('')
  }

  const handleSaveManualTime = async () => {
    if (!manualForm.motoboy_id || !manualForm.registro_time) {
      return alert('Selecione o motoboy e informe a data/hora do ponto.')
    }

    if (!isAdmin) {
      return alert('Apenas ADMIN pode inserir ou editar horários manuais.')
    }

    const payload = {
      id: editingManualId,
      motoboy_id: manualForm.motoboy_id,
      tipo_registro: manualForm.tipo_registro,
      registro_time: new Date(`${manualForm.registro_time}:00`).toISOString()
    }

    await registrarHorarioManual(payload)
    resetManualForm()
  }

  const handleSaveAbsence = async (tipo = absenceForm.tipoRegistro) => {
    if (!absenceForm.motoboyId || !absenceForm.dataInicio || !absenceForm.dataFim) {
      return alert('Informe o motoboy e o período da ausência/folga.')
    }

    if (!isAdmin && tipo !== 'FOLGA') {
      return alert('Apenas ADMIN pode registrar férias ou atestado.')
    }

    await registrarAusencia({
      motoboyId: absenceForm.motoboyId,
      tipoRegistro: tipo,
      dataInicio: absenceForm.dataInicio,
      dataFim: absenceForm.dataFim
    })

    setAbsenceForm({ motoboyId: '', tipoRegistro: 'FOLGA', dataInicio: '', dataFim: '' })
  }

  const handleEditManualTime = (row) => {
    if (!isAdmin) return
    setEditingManualId(row.id)
    setSelectedMotoboy(row.motoboy_id)
    setManualForm({
      motoboy_id: row.motoboy_id,
      tipo_registro: row.tipo_registro,
      registro_time: new Date(row.registro_time).toISOString().slice(0, 16)
    })
  }

  const columns = [
    { header: 'Data/Hora', render: (row) => new Date(row.registro_time).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
    { header: 'Motoboy', render: (row) => <strong style={{ color: 'var(--color-text-main)' }}>{row.motoboys?.nome}</strong> },
    { header: 'Tipo', render: (row) => (
        <span style={{ 
          color: row.tipo_registro === 'ENTRADA' ? '#166534' : row.tipo_registro === 'SAIDA' ? '#991b1b' : '#1f2937',
          backgroundColor: row.tipo_registro === 'ENTRADA' ? '#dcfce7' : row.tipo_registro === 'SAIDA' ? '#fee2e2' : '#e5e7eb',
          padding: '4px 12px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' 
        }}>
          {getTipoLabel(row.tipo_registro)}
        </span>
      )
    },
    { header: 'Registrado por', render: (row) => <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{row.users?.nome}</span> },
    { header: 'Ações', render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isAdmin && ['ENTRADA', 'SAIDA'].includes(row.tipo_registro) && (
            <button onClick={() => handleEditManualTime(row)} style={{ background: 'none', border: 'none', color: '#d97706', cursor: 'pointer' }} title="Editar registro">
              Editar
            </button>
          )}
          <button onClick={() => excluirPonto(row.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }} title="Excluir Registro">
            <Trash2 size={18} />
          </button>
        </div>
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

        {isAdmin && (
          <div style={{ marginTop: '20px', padding: '16px', border: '1px solid #dbeafe', borderRadius: '10px', backgroundColor: '#eff6ff' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 'bold', color: '#1d4ed8' }}>Inserir / Editar Horário Manual</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>Motoboy</label>
                <select className="input-field" value={manualForm.motoboy_id} onChange={(e) => setManualForm({ ...manualForm, motoboy_id: e.target.value })} style={{ width: '100%' }}>
                  <option value="">Selecione...</option>
                  {motoboys.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>Tipo</label>
                <select className="input-field" value={manualForm.tipo_registro} onChange={(e) => setManualForm({ ...manualForm, tipo_registro: e.target.value })} style={{ width: '100%' }}>
                  <option value="ENTRADA">Entrada</option>
                  <option value="SAIDA">Saída</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>Data/Hora</label>
                <input type="datetime-local" className="input-field" value={manualForm.registro_time} onChange={(e) => setManualForm({ ...manualForm, registro_time: e.target.value })} style={{ width: '100%' }} />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button onClick={handleSaveManualTime} isLoading={isActionLoading} style={{ backgroundColor: '#2563eb', border: 'none' }}>
                  {editingManualId ? 'Salvar edição' : 'Salvar horário'}
                </Button>
                {editingManualId && (
                  <Button onClick={resetManualForm} variant="secondary">Cancelar</Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>

      <Card title="Gerenciamento de Ausências e Folgas">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '14px', border: '1px solid #e2e8f0', borderRadius: '10px', backgroundColor: '#f8fafc' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 'bold' }}>Folga</h4>
            <div style={{ display: 'grid', gap: '10px' }}>
              <select className="input-field" value={absenceForm.motoboyId} onChange={(e) => setAbsenceForm({ ...absenceForm, motoboyId: e.target.value })}>
                <option value="">Selecione o motoboy</option>
                {motoboys.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
              <input type="date" className="input-field" value={absenceForm.dataInicio} onChange={(e) => setAbsenceForm({ ...absenceForm, dataInicio: e.target.value })} />
              <input type="date" className="input-field" value={absenceForm.dataFim} onChange={(e) => setAbsenceForm({ ...absenceForm, dataFim: e.target.value })} />
              <Button onClick={() => setAbsenceForm({ ...absenceForm, tipoRegistro: 'FOLGA' })} variant="secondary">Marcar como folga</Button>
              <Button onClick={() => handleSaveAbsence('FOLGA')} isLoading={isActionLoading} style={{ backgroundColor: '#7c3aed', border: 'none' }}>Salvar folga</Button>
            </div>
          </div>

          {isAdmin && (
            <>
              <div style={{ padding: '14px', border: '1px solid #dcfce7', borderRadius: '10px', backgroundColor: '#f0fdf4' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 'bold', color: '#166534' }}>Férias</h4>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <select className="input-field" value={absenceForm.motoboyId} onChange={(e) => setAbsenceForm({ ...absenceForm, motoboyId: e.target.value })}>
                    <option value="">Selecione o motoboy</option>
                    {motoboys.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                  </select>
                  <input type="date" className="input-field" value={absenceForm.dataInicio} onChange={(e) => setAbsenceForm({ ...absenceForm, dataInicio: e.target.value })} />
                  <input type="date" className="input-field" value={absenceForm.dataFim} onChange={(e) => setAbsenceForm({ ...absenceForm, dataFim: e.target.value })} />
                  <Button onClick={() => setAbsenceForm({ ...absenceForm, tipoRegistro: 'FERIAS' })} style={{ backgroundColor: '#16a34a', border: 'none' }}>Marcar férias</Button>
                  <Button onClick={() => handleSaveAbsence('FERIAS')} isLoading={isActionLoading} style={{ backgroundColor: '#16a34a', border: 'none' }}>Salvar férias</Button>
                </div>
              </div>

              <div style={{ padding: '14px', border: '1px solid #dbeafe', borderRadius: '10px', backgroundColor: '#eff6ff' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 'bold', color: '#1d4ed8' }}>Atestado</h4>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <select className="input-field" value={absenceForm.motoboyId} onChange={(e) => setAbsenceForm({ ...absenceForm, motoboyId: e.target.value })}>
                    <option value="">Selecione o motoboy</option>
                    {motoboys.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                  </select>
                  <input type="date" className="input-field" value={absenceForm.dataInicio} onChange={(e) => setAbsenceForm({ ...absenceForm, dataInicio: e.target.value })} />
                  <input type="date" className="input-field" value={absenceForm.dataFim} onChange={(e) => setAbsenceForm({ ...absenceForm, dataFim: e.target.value })} />
                  <Button onClick={() => setAbsenceForm({ ...absenceForm, tipoRegistro: 'ATESTADO' })} style={{ backgroundColor: '#2563eb', border: 'none' }}>Marcar atestado</Button>
                  <Button onClick={() => handleSaveAbsence('ATESTADO')} isLoading={isActionLoading} style={{ backgroundColor: '#2563eb', border: 'none' }}>Salvar atestado</Button>
                </div>
              </div>
            </>
          )}
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
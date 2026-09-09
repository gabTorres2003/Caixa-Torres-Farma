import React, { useState } from 'react'
import { Card } from '../../../shared/components/cards/Card'
import { Table } from '../../../shared/components/tables/Table'
import { Button } from '../../../shared/components/buttons/Button'
import { Clock, Calendar, Trash2, ArrowRightCircle, ArrowLeftCircle, MessageSquare, ArrowLeftRight, CheckSquare } from 'lucide-react'

const getLocalDateTimeValue = () => {
  const local = new Date()
  const offset = local.getTimezoneOffset() * 60000
  return new Date(local.getTime() - offset).toISOString().slice(0, 16)
}

const getTipoLabel = (tipo) => {
  const mapa = {
    ENTRADA: 'ENTRADA',
    SAIDA: 'SAIDA',
    FOLGA: 'FOLGA',
    FERIAS: 'FERIAS',
    ATESTADO: 'ATESTADO',
    FALTA: 'FALTA',
    TROCA_DE_ESCALA: 'TROCA DE ESCALA',
    FOLGA_FERIADO: 'FOLGA FERIADO'
  }
  return mapa[tipo] || tipo
}

const getTodayStr = () => {
  const tzOffset = new Date().getTimezoneOffset() * 60000
  return new Date(Date.now() - tzOffset).toISOString().split('T')[0]
}

const getYesterdayStr = () => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  const tzOffset = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tzOffset).toISOString().split('T')[0]
}

const getWeekStartStr = () => {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  const tzOffset = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tzOffset).toISOString().split('T')[0]
}

const getMonthStartStr = () => {
  const d = new Date()
  d.setDate(1)
  const tzOffset = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tzOffset).toISOString().split('T')[0]
}

export const TimeTracking = ({
  motoboys,
  timeRecords,
  registrarPonto,
  registrarHorarioManual,
  registrarAusencia,
  excluirPonto,
  salvarObservacao,
  registrarTrocaTurno,
  registrarAusenciaMulti,
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
  const [selectedMotoboyIds, setSelectedMotoboyIds] = useState([])
  const [obsModal, setObsModal] = useState({ open: false, recordId: null, value: '' })
  const [trocaForm, setTrocaForm] = useState({
    motoboyEntraId: '',
    motoboySaiId: '',
    data: getTodayStr(),
    horaEntrada: '08:00',
    horaSaida: '18:00'
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
    if (selectedMotoboyIds.length > 0) {
      if (!absenceForm.dataInicio || !absenceForm.dataFim) {
        return alert('Informe o periodo da ausencia.')
      }
      await registrarAusenciaMulti({
        motoboyIds: selectedMotoboyIds,
        tipoRegistro: tipo,
        dataInicio: absenceForm.dataInicio,
        dataFim: absenceForm.dataFim
      })
      setSelectedMotoboyIds([])
    } else {
      if (!absenceForm.motoboyId || !absenceForm.dataInicio || !absenceForm.dataFim) {
        return alert('Informe o motoboy e o periodo da ausencia.')
      }
      await registrarAusencia({
        motoboyId: absenceForm.motoboyId,
        tipoRegistro: tipo,
        dataInicio: absenceForm.dataInicio,
        dataFim: absenceForm.dataFim
      })
    }
    setAbsenceForm({ motoboyId: '', tipoRegistro: 'FOLGA', dataInicio: '', dataFim: '' })
  }

  const handleEditManualTime = (row) => {
    setEditingManualId(row.id)
    setSelectedMotoboy(row.motoboy_id)
    setManualForm({
      motoboy_id: row.motoboy_id,
      tipo_registro: row.tipo_registro,
      registro_time: new Date(row.registro_time).toISOString().slice(0, 16)
    })
  }

  const handleOpenObs = (row) => {
    setObsModal({ open: true, recordId: row.id, value: row.observacoes || '' })
  }

  const handleSaveObs = async () => {
    await salvarObservacao(obsModal.recordId, obsModal.value)
    setObsModal({ open: false, recordId: null, value: '' })
  }

  const handleTrocaTurno = async () => {
    if (!trocaForm.motoboyEntraId || !trocaForm.motoboySaiId) {
      return alert('Selecione ambos os motoboys para a troca.')
    }
    if (trocaForm.motoboyEntraId === trocaForm.motoboySaiId) {
      return alert('Selecione motoboys diferentes para a troca.')
    }
    await registrarTrocaTurno(trocaForm)
    setTrocaForm({ motoboyEntraId: '', motoboySaiId: '', data: getTodayStr(), horaEntrada: '08:00', horaSaida: '18:00' })
  }

  const toggleMotoboySelection = (motoboyId) => {
    setSelectedMotoboyIds(prev =>
      prev.includes(motoboyId) ? prev.filter(id => id !== motoboyId) : [...prev, motoboyId]
    )
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
    { header: 'Obs', render: (row) => (
        <button onClick={() => handleOpenObs(row)} style={{ background: 'none', border: 'none', color: row.observacoes ? '#2563eb' : '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }} title={row.observacoes || 'Adicionar observacao'}>
          <MessageSquare size={16} />
          {row.observacoes && <span style={{ fontSize: '0.75rem', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>{row.observacoes}</span>}
        </button>
      )
    },
    { header: 'Registrado por', render: (row) => <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{row.users?.nome}</span> },
    { header: 'Acoes', render: (row) => (
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
      <Card title="Relogio de Ponto Manual" icon={Clock}>
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
            <Button onClick={() => handleRegistrar('SAIDA')} isLoading={isActionLoading} icon={ArrowLeftCircle} style={{ backgroundColor: '#dc2626', border: 'none' }}>Registrar Saida</Button>
          </div>
        </div>

        <div style={{ marginTop: '20px', padding: '16px', border: '1px solid #dbeafe', borderRadius: '10px', backgroundColor: '#eff6ff' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 'bold', color: '#1d4ed8' }}>Inserir / Editar Horario Manual</h4>
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
                <option value="SAIDA">Saida</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>Data/Hora</label>
              <input type="datetime-local" className="input-field" value={manualForm.registro_time} onChange={(e) => setManualForm({ ...manualForm, registro_time: e.target.value })} style={{ width: '100%' }} />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button onClick={handleSaveManualTime} isLoading={isActionLoading} style={{ backgroundColor: '#2563eb', border: 'none' }}>
                {editingManualId ? 'Salvar edicao' : 'Salvar horario'}
              </Button>
              {editingManualId && (
                <Button onClick={resetManualForm} variant="secondary">Cancelar</Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {isAdmin && (
        <Card title="Troca de Turno (Rodizio)" icon={ArrowLeftRight}>
          <div style={{ padding: '16px', border: '1px solid #fef3c7', borderRadius: '10px', backgroundColor: '#fffbeb' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 'bold', color: '#92400e' }}>Registrar Troca de Horario</h4>
            <p style={{ margin: '0 0 12px', fontSize: '0.85rem', color: '#78716c' }}>
              Registre a troca de turno entre motoboys. O motoboy que entra assume o horario de saida do motoboy que sai, e vice-versa.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>Motoboy que ENTRA</label>
                <select className="input-field" value={trocaForm.motoboyEntraId} onChange={(e) => setTrocaForm({ ...trocaForm, motoboyEntraId: e.target.value })} style={{ width: '100%' }}>
                  <option value="">Selecione...</option>
                  {motoboys.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>Motoboy que SAI</label>
                <select className="input-field" value={trocaForm.motoboySaiId} onChange={(e) => setTrocaForm({ ...trocaForm, motoboySaiId: e.target.value })} style={{ width: '100%' }}>
                  <option value="">Selecione...</option>
                  {motoboys.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>Data</label>
                <input type="date" className="input-field" value={trocaForm.data} onChange={(e) => setTrocaForm({ ...trocaForm, data: e.target.value })} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>Horario Entrada (quem entra)</label>
                <input type="time" className="input-field" value={trocaForm.horaEntrada} onChange={(e) => setTrocaForm({ ...trocaForm, horaEntrada: e.target.value })} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>Horario Saida (quem sai)</label>
                <input type="time" className="input-field" value={trocaForm.horaSaida} onChange={(e) => setTrocaForm({ ...trocaForm, horaSaida: e.target.value })} style={{ width: '100%' }} />
              </div>
              <div>
                <Button onClick={handleTrocaTurno} isLoading={isActionLoading} style={{ backgroundColor: '#d97706', border: 'none' }} icon={ArrowLeftRight}>Registrar Troca</Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {isAdmin && (
        <Card title="Gerenciamento de Ausencias e Folgas" icon={CheckSquare}>
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ padding: '14px', border: '1px solid #dbeafe', borderRadius: '10px', backgroundColor: '#eff6ff' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 'bold', color: '#1d4ed8' }}>Selecionar Motoboys para Ausencia</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                {motoboys.map(m => (
                  <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', backgroundColor: selectedMotoboyIds.includes(m.id) ? '#dbeafe' : '#fff', fontSize: '0.9rem' }}>
                    <input type="checkbox" checked={selectedMotoboyIds.includes(m.id)} onChange={() => toggleMotoboySelection(m.id)} />
                    {m.nome}
                  </label>
                ))}
              </div>

              <h4 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 'bold', color: '#1d4ed8' }}>Registrar Ausencia</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>Motoboy (individual)</label>
                  <select className="input-field" value={absenceForm.motoboyId} onChange={(e) => setAbsenceForm({ ...absenceForm, motoboyId: e.target.value })} style={{ width: '100%' }}>
                    <option value="">Selecione (ou marque acima)...</option>
                    {motoboys.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>Data inicial</label>
                  <input type="date" className="input-field" value={absenceForm.dataInicio} onChange={(e) => setAbsenceForm({ ...absenceForm, dataInicio: e.target.value })} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>Data final</label>
                  <input type="date" className="input-field" value={absenceForm.dataFim} onChange={(e) => setAbsenceForm({ ...absenceForm, dataFim: e.target.value })} style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>Situacao</label>
                  <select className="input-field" value={absenceForm.tipoRegistro} onChange={(e) => setAbsenceForm({ ...absenceForm, tipoRegistro: e.target.value })} style={{ width: '100%' }}>
                    <option value="FOLGA">Folga</option>
                    <option value="FALTA">Confirmar Falta</option>
                    <option value="ATESTADO">Atestado</option>
                    <option value="TROCA_DE_ESCALA">Troca de Escala</option>
                    <option value="FOLGA_FERIADO">Folga Feriado</option>
                    <option value="FERIAS">Ferias</option>
                  </select>
                </div>
                <div>
                  <Button onClick={() => handleSaveAbsence(absenceForm.tipoRegistro)} isLoading={isActionLoading} style={{ backgroundColor: '#2563eb', border: 'none' }}>
                    {selectedMotoboyIds.length > 0 ? `Salvar para ${selectedMotoboyIds.length} motoboys` : 'Salvar situacao'}
                  </Button>
                </div>
              </div>
              {selectedMotoboyIds.length > 0 && (
                <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: '#1d4ed8' }}>
                  {selectedMotoboyIds.length} motoboys selecionados. A ausencia sera registrada para todos no periodo informado.
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      <Card title="Registros de Ponto do Dia">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={18} color="var(--color-primary)"/> Filtrar:
          </label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button onClick={() => setDataFiltro(getTodayStr())} style={{ padding: '6px 14px', fontSize: '0.85rem', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', backgroundColor: dataFiltro === getTodayStr() ? 'var(--color-primary)' : '#fff', color: dataFiltro === getTodayStr() ? '#fff' : '#475569', fontWeight: 'bold' }}>Hoje</button>
            <button onClick={() => setDataFiltro(getYesterdayStr())} style={{ padding: '6px 14px', fontSize: '0.85rem', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', backgroundColor: '#fff', color: '#475569' }}>Ontem</button>
            <button onClick={() => { setDataFiltro(getWeekStartStr()) }} style={{ padding: '6px 14px', fontSize: '0.85rem', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', backgroundColor: '#fff', color: '#475569' }}>Inicio da semana</button>
            <button onClick={() => { setDataFiltro(getMonthStartStr()) }} style={{ padding: '6px 14px', fontSize: '0.85rem', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', backgroundColor: '#fff', color: '#475569' }}>Inicio do mes</button>
          </div>
          <input type="date" className="input-field" style={{ padding: '8px 12px', fontSize: '0.9rem', cursor: 'pointer' }} value={dataFiltro} onChange={(e) => setDataFiltro(e.target.value)} />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <Table columns={columns} data={timeRecords} emptyMessage="Nenhum ponto registrado neste dia." />
        </div>
      </Card>

      {obsModal.open && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', width: '420px', maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 'bold' }}>Observacao do Registro</h3>
            <textarea
              className="input-field"
              value={obsModal.value}
              onChange={(e) => setObsModal({ ...obsModal, value: e.target.value })}
              placeholder="Digite sua observacao..."
              rows={4}
              style={{ width: '100%', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'flex-end' }}>
              <Button onClick={() => setObsModal({ open: false, recordId: null, value: '' })} variant="secondary">Cancelar</Button>
              <Button onClick={handleSaveObs} isLoading={isActionLoading} style={{ backgroundColor: '#2563eb', border: 'none' }}>Salvar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

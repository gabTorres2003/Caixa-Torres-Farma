import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../core/hooks/useAuth'
import { useMotoboys } from '../../core/hooks/useMotoboys'
import { TimeTracking } from './components/TimeTracking'
import { RouteManager } from './components/RouteManager'
import { MotoboyReports } from './components/MotoboyReports'
import { Button } from '../../shared/components/buttons/Button'
import { Modal } from '../../shared/components/modals/Modal'
import { FormInput } from '../../shared/components/forms/FormInput'
import { Card } from '../../shared/components/cards/Card'
import { Table } from '../../shared/components/tables/Table'
import { Loader2, Clock, Map, FileBarChart, UserPlus, Users, Pencil, Trash2 } from 'lucide-react'

const parseHorarioTrabalho = (texto) => {
  const padrao = {
    semana: '',
    sabado: '',
    domingo: ''
  }

  if (!texto) return padrao

  const textoLimpo = String(texto).trim()
  const partes = textoLimpo.split('|').map(p => p.trim()).filter(Boolean)

  if (partes.length === 0) return padrao

  partes.forEach((parte) => {
    const lower = parte.toLowerCase()
    if (lower.includes('segunda') || lower.includes('seg') || lower.includes('semana')) {
      padrao.semana = parte.replace(/^(segunda a sexta|segundas? a sextas?|seg-sex|semana)\s*:\s*/i, '').trim()
      return
    }
    if (lower.includes('sábado') || lower.includes('sabado') || lower.includes('sáb') || lower.includes('sab')) {
      padrao.sabado = parte.replace(/^(sábado|sabado|sab)\s*:\s*/i, '').trim()
      return
    }
    if (lower.includes('domingo') || lower.includes('dom')) {
      padrao.domingo = parte.replace(/^(domingo|dom)\s*:\s*/i, '').trim()
      return
    }
    if (!padrao.semana) padrao.semana = parte.trim()
  })

  return padrao
}

const formatHorarioTrabalho = ({ semana, sabado, domingo }) => {
  const partes = []
  if (semana) partes.push(`Segunda a sexta: ${semana}`)
  if (sabado) partes.push(`Sábado: ${sabado}`)
  if (domingo) partes.push(`Domingo: ${domingo}`)
  return partes.join(' | ')
}

export const Motoboys = () => {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  
  const [dataFiltro, setDataFiltro] = useState(() => {
    const tzOffset = new Date().getTimezoneOffset() * 60000
    return new Date(Date.now() - tzOffset).toISOString().split('T')[0]
  })

  const hookData = useMotoboys(user, dataFiltro)
  const [activeTab, setActiveTab] = useState('PONTO')
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMotoboyId, setEditingMotoboyId] = useState(null)
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm()

  const visibleTabs = isAdmin ? ['PONTO', 'ROTAS', 'RELATORIOS', 'EQUIPE'] : ['PONTO', 'RELATORIOS', 'EQUIPE']
  const equipeColumns = [
    { header: 'Nome', accessorKey: 'nome' },
    { header: 'Horário de Trabalho', render: (row) => row.horario_trabalho || '-' },
    { header: 'Telefone', render: (row) => row.telefone || '-' },
    ...(isAdmin ? [{ header: 'Ações', render: (row) => (
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button onClick={() => handleOpenCadastro(row)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d97706' }} title="Editar"><Pencil size={18} /></button>
        <button onClick={() => hookData.excluirMotoboy(row.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }} title="Excluir"><Trash2 size={18} /></button>
      </div>
    )}] : [{ header: 'Ações', render: (row) => (
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button onClick={() => handleOpenCadastro(row)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d97706' }} title="Editar"><Pencil size={18} /></button>
      </div>
    )}])
  ]

  const handleOpenCadastro = (motoboy = null) => {
    const schedule = parseHorarioTrabalho(motoboy?.horario_trabalho || '')

    if (motoboy) {
      setEditingMotoboyId(motoboy.id)
      setValue('nome', motoboy.nome)
      setValue('telefone', motoboy.telefone || '')
      setValue('horario_trabalho_semana', schedule.semana)
      setValue('horario_trabalho_sabado', schedule.sabado)
      setValue('horario_trabalho_domingo', schedule.domingo)
    } else {
      setEditingMotoboyId(null)
      reset({ nome: '', telefone: '', horario_trabalho_semana: '', horario_trabalho_sabado: '', horario_trabalho_domingo: '' })
    }
    setIsModalOpen(true)
  }

  const onSubmitMotoboy = async (data) => {
    const payload = {
      nome: data.nome,
      telefone: data.telefone,
      horario_trabalho: formatHorarioTrabalho({
        semana: data.horario_trabalho_semana,
        sabado: data.horario_trabalho_sabado,
        domingo: data.horario_trabalho_domingo
      })
    }
    const success = await hookData.salvarMotoboy(payload, editingMotoboyId)
    if (success) {
      reset()
      setIsModalOpen(false)
    }
  }

  if (hookData.isPageLoading) {
    return <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 className="animate-spin" size={32} color="var(--color-primary)" /></div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>Gestão de Motoboys</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Controle de ponto, rotas de entrega e relatórios operacionais.</p>
        </div>
        <Button onClick={() => handleOpenCadastro()} icon={UserPlus}>Cadastrar Motoboy</Button>
      </div>

      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', flexWrap: 'wrap' }}>
        {visibleTabs.includes('PONTO') && (
          <button 
            onClick={() => setActiveTab('PONTO')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: activeTab === 'PONTO' ? 'var(--color-primary)' : 'transparent', color: activeTab === 'PONTO' ? '#fff' : '#64748b', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            <Clock size={18} /> Registro de Ponto
          </button>
        )}
        {isAdmin && (
          <button 
            onClick={() => setActiveTab('ROTAS')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: activeTab === 'ROTAS' ? 'var(--color-primary)' : 'transparent', color: activeTab === 'ROTAS' ? '#fff' : '#64748b', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            <Map size={18} /> Gestão de Rotas
          </button>
        )}
        {visibleTabs.includes('RELATORIOS') && (
          <button 
            onClick={() => setActiveTab('RELATORIOS')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: activeTab === 'RELATORIOS' ? '#16a34a' : 'transparent', color: activeTab === 'RELATORIOS' ? '#fff' : '#64748b', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            <FileBarChart size={18} /> Imprimir Folha de Ponto
          </button>
        )}
        {visibleTabs.includes('EQUIPE') && (
          <button 
            onClick={() => setActiveTab('EQUIPE')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: activeTab === 'EQUIPE' ? '#6366f1' : 'transparent', color: activeTab === 'EQUIPE' ? '#fff' : '#64748b', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            <Users size={18} /> A Equipe
          </button>
        )}
      </div>

      {activeTab === 'PONTO' && <TimeTracking {...hookData} userRole={user?.role} dataFiltro={dataFiltro} setDataFiltro={setDataFiltro} />}
      {isAdmin && activeTab === 'ROTAS' && <RouteManager {...hookData} dataFiltro={dataFiltro} setDataFiltro={setDataFiltro} />}
      {activeTab === 'RELATORIOS' && <MotoboyReports user={user} motoboys={hookData.motoboys} />}
      
      {activeTab === 'EQUIPE' && (
        <Card title="Motoboys Cadastrados" icon={Users}>
          <Table 
            columns={equipeColumns} 
            data={hookData.motoboys} 
            emptyMessage="Nenhum motoboy cadastrado." 
          />
        </Card>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingMotoboyId ? "Editar Motoboy" : "Cadastrar Novo Motoboy"}>
        <form onSubmit={handleSubmit(onSubmitMotoboy)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <FormInput label="Nome do Motoboy *" id="nome" placeholder="Ex: João Silva" register={register('nome', { required: 'O nome é obrigatório' })} error={errors.nome} />

          <FormInput label="Segunda a sexta" id="horario_trabalho_semana" placeholder="Ex: 08:00 às 18:00" register={register('horario_trabalho_semana')} />
          <FormInput label="Sábado" id="horario_trabalho_sabado" placeholder="Ex: 08:00 às 14:00" register={register('horario_trabalho_sabado')} />
          <FormInput label="Domingo" id="horario_trabalho_domingo" placeholder="Ex: 09:00 às 13:00" register={register('horario_trabalho_domingo')} />
          
          <FormInput label="Telefone (Opcional)" id="telefone" placeholder="(22) 99999-9999" register={register('telefone')} />

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} style={{ width: '100%', justifyContent: 'center' }}>Cancelar</Button>
            <Button type="submit" isLoading={hookData.isActionLoading} style={{ width: '100%', justifyContent: 'center' }} icon={editingMotoboyId ? Pencil : UserPlus}>
              {editingMotoboyId ? "Salvar Alterações" : "Cadastrar"}
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  )
}
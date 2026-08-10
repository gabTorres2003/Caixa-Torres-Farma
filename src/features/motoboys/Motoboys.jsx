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
import { Loader2, Clock, Map, FileBarChart, ShieldAlert, UserPlus } from 'lucide-react'

export const Motoboys = () => {
  const { user } = useAuth()
  
  const [dataFiltro, setDataFiltro] = useState(() => {
    const tzOffset = new Date().getTimezoneOffset() * 60000
    return new Date(Date.now() - tzOffset).toISOString().split('T')[0]
  })

  const hookData = useMotoboys(user, dataFiltro)
  const [activeTab, setActiveTab] = useState('PONTO')
  
  // ESTADOS DO NOVO CADASTRO
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  if (user?.role !== 'ADMIN') {
    return (
      <div style={{ height: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
        <ShieldAlert size={64} style={{ marginBottom: '16px' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Acesso Negado</h2>
        <p>O Módulo de Motoboys é restrito a Administradores.</p>
      </div>
    )
  }

  const onSubmitMotoboy = async (data) => {
    const success = await hookData.cadastrarMotoboy(data.nome, data.telefone)
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
      
      {/* CABEÇALHO COM O NOVO BOTÃO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>Gestão de Motoboys</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Controle de ponto, rotas de entrega e relatórios operacionais.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} icon={UserPlus}>Cadastrar Motoboy</Button>
      </div>

      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', flexWrap: 'wrap' }}>
        <button 
          onClick={() => setActiveTab('PONTO')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: activeTab === 'PONTO' ? 'var(--color-primary)' : 'transparent', color: activeTab === 'PONTO' ? '#fff' : '#64748b', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          <Clock size={18} /> Registro de Ponto
        </button>
        <button 
          onClick={() => setActiveTab('ROTAS')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: activeTab === 'ROTAS' ? 'var(--color-primary)' : 'transparent', color: activeTab === 'ROTAS' ? '#fff' : '#64748b', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          <Map size={18} /> Gestão de Rotas
        </button>
        <button 
          onClick={() => setActiveTab('RELATORIOS')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: activeTab === 'RELATORIOS' ? '#16a34a' : 'transparent', color: activeTab === 'RELATORIOS' ? '#fff' : '#64748b', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          <FileBarChart size={18} /> Relatórios & Pagamentos
        </button>
      </div>

      {activeTab === 'PONTO' && <TimeTracking {...hookData} dataFiltro={dataFiltro} setDataFiltro={setDataFiltro} />}
      {activeTab === 'ROTAS' && <RouteManager {...hookData} dataFiltro={dataFiltro} setDataFiltro={setDataFiltro} />}
      {activeTab === 'RELATORIOS' && <MotoboyReports user={user} motoboys={hookData.motoboys} />}

      {/* MODAL DE CADASTRO DE MOTOBOY */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Cadastrar Novo Motoboy">
        <form onSubmit={handleSubmit(onSubmitMotoboy)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <FormInput 
            label="Nome do Motoboy" 
            id="nome" 
            placeholder="Ex: João Silva" 
            register={register('nome', { required: 'O nome é obrigatório' })} 
            error={errors.nome} 
          />
          
          <FormInput 
            label="Telefone (Opcional)" 
            id="telefone" 
            placeholder="(22) 99999-9999" 
            register={register('telefone')} 
          />

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} style={{ width: '100%', justifyContent: 'center' }}>Cancelar</Button>
            <Button type="submit" isLoading={hookData.isActionLoading} style={{ width: '100%', justifyContent: 'center' }} icon={UserPlus}>Cadastrar</Button>
          </div>
        </form>
      </Modal>

    </div>
  )
}
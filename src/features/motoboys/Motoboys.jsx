import React, { useState } from 'react'
import { useAuth } from '../../core/hooks/useAuth'
import { useMotoboys } from '../../core/hooks/useMotoboys'
import { TimeTracking } from './components/TimeTracking'
import { RouteManager } from './components/RouteManager'
import { MotoboyReports } from './components/MotoboyReports'
import { Loader2, Clock, Map, FileBarChart, ShieldAlert } from 'lucide-react'

export const Motoboys = () => {
  const { user } = useAuth()
  
  const [dataFiltro, setDataFiltro] = useState(() => {
    const tzOffset = new Date().getTimezoneOffset() * 60000
    return new Date(Date.now() - tzOffset).toISOString().split('T')[0]
  })

  const hookData = useMotoboys(user, dataFiltro)
  const [activeTab, setActiveTab] = useState('PONTO')

  if (user?.role !== 'ADMIN') {
    return (
      <div style={{ height: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
        <ShieldAlert size={64} style={{ marginBottom: '16px' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Acesso Negado</h2>
        <p>O Módulo de Motoboys é restrito a Administradores.</p>
      </div>
    )
  }

  if (hookData.isPageLoading) {
    return <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 className="animate-spin" size={32} color="var(--color-primary)" /></div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '1.875rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>Gestão de Motoboys</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>Controle de ponto, rotas de entrega e relatórios operacionais.</p>
      </div>

      {/* NAVEGAÇÃO EM ABAS */}
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

      {/* RENDERIZAÇÃO DA ABA ATIVA */}
      {activeTab === 'PONTO' && <TimeTracking {...hookData} dataFiltro={dataFiltro} setDataFiltro={setDataFiltro} />}
      {activeTab === 'ROTAS' && <RouteManager {...hookData} dataFiltro={dataFiltro} setDataFiltro={setDataFiltro} />}
      {activeTab === 'RELATORIOS' && <MotoboyReports user={user} motoboys={hookData.motoboys} />}
    </div>
  )
}
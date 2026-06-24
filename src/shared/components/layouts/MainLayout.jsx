import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../core/hooks/useAuth'
import { 
  LayoutDashboard, ArrowLeftRight, Calculator, ShieldCheck, 
  Coins, Lock, AlertTriangle, FileText, Users, LogOut, 
  Menu, ChevronDown, ChevronRight, Banknote
} from 'lucide-react'

export const MainLayout = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Controle de estados do menu
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isConferenceOpen, setIsConferenceOpen] = useState(false)

  // Fecha o menu mobile automaticamente ao trocar de página
  useEffect(() => {
    setIsMobileOpen(false)
  }, [location.pathname])

  // Abre a aba de conferência automaticamente se a página atual pertencer a ela
  useEffect(() => {
    if (location.pathname.includes('/conferencia') || location.pathname.includes('/depositos') || location.pathname.includes('/divergencias')) {
      setIsConferenceOpen(true)
    }
  }, [location.pathname])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  // Componente de botão do Menu
  const NavItem = ({ to, icon: Icon, label, isSubItem = false }) => (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px',
        padding: isSubItem ? '10px 16px 10px 48px' : '12px 16px',
        margin: '4px 16px',
        borderRadius: '8px',
        textDecoration: 'none',
        color: isActive ? '#1e40af' : '#475569',
        backgroundColor: isActive ? '#eff6ff' : 'transparent',
        fontWeight: isActive ? '600' : '500',
        fontSize: '0.9rem',
        transition: 'all 0.2s ease'
      })}
    >
      <Icon size={isSubItem ? 18 : 20} />
      {label}
    </NavLink>
  )

  return (
    <div className="layout-wrapper">
      {/* CSS DE RESPONSIVIDADE (MOBILE & DESKTOP) */}
      <style>{`
        .layout-wrapper { display: flex; height: 100vh; background-color: #f8fafc; overflow: hidden; }
        
        .sidebar { 
          width: 280px; 
          background-color: #ffffff; 
          border-right: 1px solid #e2e8f0; 
          display: flex; 
          flex-direction: column; 
          z-index: 50; 
          flex-shrink: 0; 
        }
        
        .main-content { flex: 1; overflow-y: auto; position: relative; display: flex; flex-direction: column; }
        .content-area { padding: 32px; flex: 1; }
        
        .mobile-header { display: none; }
        .overlay { display: none; }

        /* REGRAS PARA CELULAR E TABLET */
        @media (max-width: 768px) {
          .layout-wrapper { flex-direction: column; }
          
          /* Barra superior que aparece só no celular */
          .mobile-header { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            padding: 16px 20px; 
            background-color: #ffffff; 
            border-bottom: 1px solid #e2e8f0; 
            z-index: 30; 
          }
          
          /* Esconde o menu para fora da tela */
          .sidebar { 
            position: fixed; 
            top: 0; left: 0; 
            height: 100%; 
            transform: translateX(-100%); 
            transition: transform 0.3s ease; 
          }
          
          /* Classe que o React adiciona quando clica no botão Hamburger */
          .sidebar.open { transform: translateX(0); box-shadow: 4px 0 24px rgba(0,0,0,0.1); }
          
          /* Fundo escuro atrás do menu mobile */
          .overlay.open { 
            display: block; 
            position: fixed; 
            inset: 0; 
            background-color: rgba(0,0,0,0.5); 
            z-index: 40; 
          }
          
          .content-area { padding: 16px; }
        }
        
        /* Esconde elementos na impressão (PDF) */
        @media print {
          aside, nav, .mobile-header, .overlay { display: none !important; }
          .main-content { overflow: visible !important; }
          .content-area { padding: 0 !important; }
        }
      `}</style>

      {/* CABEÇALHO MOBILE (Só aparece em telas pequenas) */}
      <header className="mobile-header no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => setIsMobileOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer' }}>
            <Menu size={28} />
          </button>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-primary)', lineHeight: '1' }}>Torres Farma</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Operação de Caixa</span>
          </div>
        </div>
      </header>

      {/* OVERLAY ESCURO DO MOBILE */}
      <div className={`overlay ${isMobileOpen ? 'open' : ''} no-print`} onClick={() => setIsMobileOpen(false)}></div>

      {/* BARRA LATERAL (SIDEBAR) */}
      <aside className={`sidebar ${isMobileOpen ? 'open' : ''} no-print`}>
        <div style={{ padding: '24px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>Torres Farma</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Operação de Caixa</span>
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
          <NavItem to="/troca-turno" icon={ArrowLeftRight} label="Troca de Turno" />
          <NavItem to="/pre-fechamento" icon={Calculator} label="Pré-Fechamento" />
          
          {/* MENU SANFONA: CONFERÊNCIA */}
          <div 
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
              padding: '12px 16px', margin: '4px 16px', borderRadius: '8px', 
              cursor: 'pointer', color: '#475569', fontWeight: '500', fontSize: '0.9rem' 
            }}
            onClick={() => setIsConferenceOpen(!isConferenceOpen)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <ShieldCheck size={20} /> Conferência
            </div>
            {isConferenceOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>

          {/* ITENS DENTRO DA CONFERÊNCIA */}
          {isConferenceOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', backgroundColor: '#f8fafc', paddingBottom: '8px' }}>
              <NavItem to="/conferencia/notas-moedas" icon={Coins} label="Notas / Moedas" isSubItem />
              <NavItem to="/conferencia/caixas-fechados" icon={Lock} label="Caixas Fechados" isSubItem />
              <NavItem to="/divergencias" icon={AlertTriangle} label="Diferenças" isSubItem />
              <NavItem to="/depositos" icon={Banknote} label="Depósitos" isSubItem />
            </div>
          )}

          {/* MENUS EXCLUSIVOS DO ADMIN */}
          {user?.role === 'ADMIN' && (
            <div style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <NavItem to="/relatorios" icon={FileText} label="Relatórios" />
              <NavItem to="/usuarios" icon={Users} label="Gerenciar Usuários" />
            </div>
          )}
        </nav>

        {/* RODAPÉ DO MENU COM USUÁRIO E LOGOUT */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 'bold', color: 'var(--color-primary)', fontSize: '0.9rem' }}>{user?.nome}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{user?.role}</span>
          </div>
          <button onClick={handleLogout} style={{ background: '#fee2e2', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Sair">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* ÁREA DE CONTEÚDO PRINCIPAL DAS PÁGINAS */}
      <main className="main-content">
        <div className="content-area">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
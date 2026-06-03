import React from 'react';
import { Card } from '../../shared/components/cards/Card';
import { PackageOpen, Clock, AlertCircle, Banknote } from 'lucide-react';

export const Dashboard = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div>
        <h1 style={{ fontSize: '1.875rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>Dashboard Operacional</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>Resumo das movimentações do turno atual.</p>
      </div>

      {/* Grid de Cards de Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', fontWeight: '600' }}>Entregas Pendentes</p>
              <h2 style={{ fontSize: '2rem', color: 'var(--color-text-main)', marginTop: '8px' }}>12</h2>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '50%', color: 'var(--color-secondary)' }}>
              <PackageOpen size={28} />
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', fontWeight: '600' }}>Entregas Atrasadas</p>
              <h2 style={{ fontSize: '2rem', color: 'var(--color-error)', marginTop: '8px' }}>2</h2>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#fef2f2', borderRadius: '50%', color: 'var(--color-error)' }}>
              <Clock size={28} />
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', fontWeight: '600' }}>Depósitos Registrados</p>
              <h2 style={{ fontSize: '2rem', color: 'var(--color-success)', marginTop: '8px' }}>R$ 4.350</h2>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#ecfdf5', borderRadius: '50%', color: 'var(--color-success)' }}>
              <Banknote size={28} />
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', fontWeight: '600' }}>Divergências</p>
              <h2 style={{ fontSize: '2rem', color: 'var(--color-text-main)', marginTop: '8px' }}>0</h2>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#fffbeb', borderRadius: '50%', color: '#d97706' }}>
              <AlertCircle size={28} />
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
};
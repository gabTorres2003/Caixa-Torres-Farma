import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FileText, Download, Calendar, BarChart3, TrendingUp } from 'lucide-react';
import { Card } from '../../shared/components/cards/Card';
import { FormInput } from '../../shared/components/forms/FormInput';
import { Button } from '../../shared/components/buttons/Button';
import { Table } from '../../shared/components/tables/Table';

export const Reports = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit } = useForm();

  // Histórico consolidado para exibição na tabela de resultados
  const [reportData, setReportData] = useState([
    { id: 1, periodo: '02/06/2026', operador: 'Gabriel Torres', abertura: 430.00, sangrias: 3500.00, status: 'Sem Divergências' },
    { id: 2, periodo: '01/06/2026', operador: 'Lucas Torres', abertura: 430.00, sangrias: 2800.00, status: 'Quebra Justificada' },
  ]);

  const columns = [
    { header: 'Data da Operação', accessorKey: 'periodo' },
    { header: 'Operador Responsável', accessorKey: 'operador' },
    { 
      header: 'Fundo de Abertura', 
      render: (row) => `R$ ${row.abertura.toFixed(2).replace('.', ',')}` 
    },
    { 
      header: 'Total Sangrias (Cofre)', 
      render: (row) => `R$ ${row.sangrias.toFixed(2).replace('.', ',')}` 
    },
    { header: 'Status Auditoria', accessorKey: 'status' }
  ];

  const onFilter = async (data) => {
    setIsLoading(true);
    console.log('Filtros aplicados:', data);
    
    // Simulação de busca filtrada por data
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Cabeçalho */}
      <div>
        <h1 style={{ fontSize: '1.875rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>Relatórios Gerenciais</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>Consulte o histórico de movimentações, fechamentos e auditorias do sistema de caixas.</p>
      </div>

      {/* Painel de Filtros */}
      <Card title="Filtrar por Período" icon={Calendar}>
        <form onSubmit={handleSubmit(onFilter)} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '20px', alignItems: 'end' }}>
          <FormInput
            label="Data Inicial"
            id="dataInicio"
            type="date"
            register={register('dataInicio')}
          />
          <FormInput
            label="Data Final"
            id="dataFim"
            type="date"
            register={register('dataFim')}
          />
          <div style={{ marginBottom: '4px' }}>
            <Button type="submit" isLoading={isLoading} icon={BarChart3}>
              Filtrar Dados
            </Button>
          </div>
        </form>
      </Card>

      {/* Resumo Métrico Simplificado */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <Card title="Movimentação do Período" icon={TrendingUp}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Total Recolhido em Sangrias</p>
            <h3 style={{ fontSize: '1.5rem', color: 'var(--color-success)', fontWeight: 'bold' }}>R$ 6.300,00</h3>
          </div>
        </Card>
        <Card title="Inconsistências Cadastradas" icon={FileText}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Casos de Quebra de Caixa</p>
            <h3 style={{ fontSize: '1.5rem', color: 'var(--color-text-main)', fontWeight: 'bold' }}>1 registro</h3>
          </div>
        </Card>
      </div>

      {/* Tabela de Resultados */}
      <Card title="Fechamentos Consolidados" icon={FileText}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <div style={{ width: 'auto' }}>
            <Button variant="secondary" icon={Download} onClick={() => alert('Exportando para CSV...')}>
              Exportar Planilha (CSV)
            </Button>
          </div>
        </div>
        <Table columns={columns} data={reportData} />
      </Card>

    </div>
  );
};
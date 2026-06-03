import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { AlertTriangle, CheckCircle2, MessageSquare, ShieldAlert, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { Card } from '../../shared/components/cards/Card';
import { FormInput } from '../../shared/components/forms/FormInput';
import { Button } from '../../shared/components/buttons/Button';
import { Table } from '../../shared/components/tables/Table';

export const Divergences = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  // Histórico de divergências encontradas nos últimos turnos
  const [divergencesList, setDivergencesList] = useState([
    { id: 1, data: '02/06/2026', turno: 'Manhã', tipo: 'Falta', valor: 15.50, status: 'Justificado', motivo: 'Erro ao passar troco no dinheiro' },
    { id: 2, data: '01/06/2026', turno: 'Noite', tipo: 'Sobra', valor: 50.00, status: 'Pendente', motivo: '' },
  ]);

  const columns = [
    { header: 'Data', accessorKey: 'data' },
    { header: 'Turno', accessorKey: 'turno' },
    { 
      header: 'Tipo', 
      render: (row) => (
        <span style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px',
          color: row.tipo === 'Falta' ? 'var(--color-error)' : 'var(--color-success)',
          fontWeight: '600'
        }}>
          {row.tipo === 'Falta' ? <ArrowDownCircle size={16} /> : <ArrowUpCircle size={16} />}
          {row.tipo}
        </span>
      )
    },
    { 
      header: 'Valor', 
      render: (row) => `R$ ${row.valor.toFixed(2).replace('.', ',')}` 
    },
    {
      header: 'Status',
      render: (row) => (
        <span style={{ 
          padding: '4px 8px', 
          backgroundColor: row.status === 'Justificado' ? '#ecfdf5' : '#fffbeb', 
          color: row.status === 'Justificado' ? 'var(--color-success)' : '#d97706', 
          borderRadius: '12px', 
          fontSize: '0.75rem', 
          fontWeight: '600' 
        }}>
          {row.status}
        </span>
      )
    },
    { 
      header: 'Justificativa / Motivo', 
      render: (row) => row.motivo || <em style={{ color: 'var(--color-text-muted)' }}>Aguardando revisão...</em> 
    }
  ];

  const onSubmit = async (data) => {
    setIsLoading(true);
    
    setTimeout(() => {
      // Atualiza a primeira divergência pendente com o motivo enviado
      const atualizada = divergencesList.map(div => {
        if (div.status === 'Pendente') {
          return { ...div, status: 'Justificado', motivo: data.justificativa };
        }
        return div;
      });

      setDivergencesList(atualizada);
      setIsLoading(false);
      reset();
      alert('Justificativa de quebra de caixa salva com sucesso!');
    }, 1200);
  };

  // Verifica se há alguma quebra pendente para exibir o formulário de ação
  const temPendente = divergencesList.some(div => div.status === 'Pendente');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div>
        <h1 style={{ fontSize: '1.875rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>Auditoria de Divergências</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>Controle e justificativas para quebras ou sobras de valores identificadas no fechamento.</p>
      </div>

      {/* Alerta Visual se houver pendências */}
      {temPendente ? (
        <div style={{ 
          display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', 
          backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--radius-md)', color: '#b45309' 
        }}>
          <AlertTriangle size={24} />
          <div>
            <strong style={{ display: 'block' }}>Atenção: Existe 1 divergência pendente de justificativa!</strong>
            <span style={{ fontSize: '0.875rem' }}>O caixa anterior fechou com inconsistência de valores. É necessário anexar um motivo.</span>
          </div>
        </div>
      ) : (
        <div style={{ 
          display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', 
          backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-md)', color: '#16a34a' 
        }}>
          <CheckCircle2 size={24} />
          <div>
            <strong>Caixa Seguro!</strong> Todas as movimentações anteriores foram auditadas e estão sem divergências.
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: temPendente ? '1fr 400px' : '1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Histórico/Tabela (Ocupa tudo se não houver pendência) */}
        <Card title="Inconsistências Identificadas" icon={ShieldAlert}>
          <Table columns={columns} data={divergencesList} />
        </Card>

        {/* Formulário Lateral de Justificativa (Apenas se houver pendência) */}
        {temPendente && (
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Card title="Justificar Quebra Ativa" icon={MessageSquare}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                  Insira abaixo o motivo detalhado para a quebra de <strong>R$ 50,00 (Sobra)</strong> do dia 01/06.
                </p>
                
                <FormInput
                  label="Descrição do Motivo"
                  id="justificativa"
                  placeholder="Ex: Cliente esqueceu o troco da compra da Losartana..."
                  register={register('justificativa', { required: 'A justificativa é obrigatória para o fechamento' })}
                  error={errors.justificativa}
                />
              </div>
            </Card>
            <Button type="submit" isLoading={isLoading} icon={MessageSquare}>
              Salvar Justificativa
            </Button>
          </form>
        )}

      </div>
    </div>
  );
};
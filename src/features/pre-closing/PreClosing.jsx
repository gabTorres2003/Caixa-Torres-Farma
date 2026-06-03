import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Calculator, CheckCircle, Scale, Receipt } from 'lucide-react';
import { Card } from '../../shared/components/cards/Card';
import { FormInput } from '../../shared/components/forms/FormInput';
import { Button } from '../../shared/components/buttons/Button';
import { Table } from '../../shared/components/tables/Table';

export const PreClosing = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  // Dados simulados do sistema de vendas (o que o sistema espera que tenha em caixa)
  const [sistemaValores] = useState([
    { tipo: 'Cartão de Crédito', esperado: 1250.80 },
    { tipo: 'Cartão de Débito', esperado: 840.20 },
    { tipo: 'Pix (QR Code)', esperado: 620.00 },
    { tipo: 'Convênios / Prazo', esperado: 450.00 },
  ]);

  const columns = [
    { header: 'Modalidade', accessorKey: 'tipo' },
    { 
      header: 'Valor Esperado (Sistema)', 
      render: (row) => `R$ ${row.esperado.toFixed(2).replace('.', ',')}` 
    }
  ];

  const onSubmit = async (data) => {
    setIsLoading(true);
    console.log('Dados informados para auditoria:', data);
    
    // Aqui entrará a lógica de cruzamento e salvamento na tabela 'pre_closings' do Supabase
    setTimeout(() => {
      setIsLoading(false);
      alert('Valores de pré-fechamento enviados para cruzamento de dados!');
    }, 1500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div>
        <h1 style={{ fontSize: '1.875rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>Pré-Fechamento de Caixa</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>Insira os totais das maquininhas e relatórios para conferência automática do sistema.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Coluna da Esquerda: O que o sistema acusa (Leitura Cega) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <Card title="Valores Esperados do Turno" icon={Receipt}>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '16px' }}>
              Estes são os valores consolidados pelas vendas computadas no sistema ERP até o momento.
            </p>
            <Table columns={columns} data={sistemaValores} />
          </Card>
        </div>

        {/* Coluna da Direita: Formulário de Entrada do Operador */}
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <Card title="Conferência Física (Maquininhas & Comprovantes)" icon={Scale}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <FormInput
                label="Total de Crédito (Soma dos comprovantes/POS)"
                id="totalCredito"
                type="number"
                step="0.01"
                placeholder="R$ 0,00"
                register={register('totalCredito', { required: 'Informe o total de crédito' })}
                error={errors.totalCredito}
              />

              <FormInput
                label="Total de Débito (Soma dos comprovantes/POS)"
                id="totalDebito"
                type="number"
                step="0.01"
                placeholder="R$ 0,00"
                register={register('totalDebito', { required: 'Informe o total de débito' })}
                error={errors.totalDebito}
              />

              <FormInput
                label="Total de Pix Conferido"
                id="totalPix"
                type="number"
                step="0.01"
                placeholder="R$ 0,00"
                register={register('totalPix', { required: 'Informe o total de Pix' })}
                error={errors.totalPix}
              />

              <FormInput
                label="Total de Convênios (Notas de Prazo assinadas)"
                id="totalConvenio"
                type="number"
                step="0.01"
                placeholder="R$ 0,00"
                register={register('totalConvenio', { required: 'Informe o total de convênios' })}
                error={errors.totalConvenio}
              />

            </div>
          </Card>

          <Button type="submit" isLoading={isLoading} icon={Calculator}>
            Auditar e Salvar Pré-Fechamento
          </Button>
        </form>

      </div>
    </div>
  );
};
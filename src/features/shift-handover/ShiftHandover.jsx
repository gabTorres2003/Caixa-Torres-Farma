import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ArrowLeftRight, Save, DollarSign, Bike } from 'lucide-react';
import { Card } from '../../shared/components/cards/Card';
import { FormInput } from '../../shared/components/forms/FormInput';
import { Button } from '../../shared/components/buttons/Button';
import { Table } from '../../shared/components/tables/Table';

export const ShiftHandover = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      fundoProximoCaixa: '430.00'
    }
  });

  const [entregasPendente] = useState([
    { id: 1, cliente: 'Fernanda', rota: 'Rosário', valor: 45.90, pagamento: 'Dinheiro' },
    { id: 2, cliente: 'Regina', rota: 'Centro', valor: 120.00, pagamento: 'Pix (QR)' },
    { id: 3, cliente: 'Gabriela', rota: 'Leopoldina', valor: 68.30, pagamento: 'Cartão (Maquininha)' },
  ]);

  const colunasEntregas = [
    { header: 'Cliente/Comanda', accessorKey: 'cliente' },
    { header: 'Rota / Bairro', accessorKey: 'rota' },
    { header: 'Forma de Pagamento', accessorKey: 'pagamento' },
    { 
      header: 'Valor', 
      render: (row) => `R$ ${row.valor.toFixed(2).replace('.', ',')}` 
    }
  ];

  const onSubmit = async (data) => {
    setIsLoading(true);
    console.log('Dados da troca de turno:', data);
    
    setTimeout(() => {
      setIsLoading(false);
      alert('Conferência de turno registrada com sucesso!');
    }, 1500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '1.875rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>Troca de Turno</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>Realize a conferência de valores e comandas antes de encerrar o expediente.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
        
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <Card title="Valores em Caixa" icon={DollarSign}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div style={{ padding: '12px', backgroundColor: '#f0fdf4', borderRadius: 'var(--radius-md)', border: '1px solid #bbf7d0', marginBottom: '8px' }}>
                <p style={{ fontSize: '0.875rem', color: '#16a34a', fontWeight: '600' }}>Fundo de Abertura Padrão: R$ 430,00</p>
              </div>

              <FormInput
                label="Dinheiro Físico Declarado (Total na Gaveta)"
                id="dinheiroGaveta"
                type="number"
                step="0.01"
                placeholder="R$ 0,00"
                register={register('dinheiroGaveta', { required: 'Informe o total em dinheiro na gaveta' })}
                error={errors.dinheiroGaveta}
              />

              <FormInput
                label="Fundo Separado para o Próximo Caixa"
                id="fundoProximoCaixa"
                type="number"
                step="0.01"
                placeholder="R$ 430,00"
                register={register('fundoProximoCaixa', { required: 'O fundo de troco é obrigatório' })}
                error={errors.fundoProximoCaixa}
              />

              <FormInput
                label="Observações do Turno"
                id="observacoes"
                placeholder="Ex: Deixei separado R$ 50,00 em moedas..."
                register={register('observacoes')}
              />
            </div>
          </Card>

          <Button type="submit" isLoading={isLoading} icon={Save}>
            Confirmar e Finalizar Turno
          </Button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <Card title="Comandas na Cestinha (Motoboys)" icon={Bike}>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '16px' }}>
              Confirme se as comandas físicas trazidas pelos motoboys batem com a listagem do sistema.
            </p>
            <Table columns={colunasEntregas} data={entregasPendente} />
          </Card>
        </div>

      </div>
    </div>
  );
};
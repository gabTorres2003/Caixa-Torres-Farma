import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Banknote, Plus, Calendar, ShieldCheck, FileText } from 'lucide-react';
import { Card } from '../../shared/components/cards/Card';
import { FormInput } from '../../shared/components/forms/FormInput';
import { Button } from '../../shared/components/buttons/Button';
import { Table } from '../../shared/components/tables/Table';
import { Modal } from '../../shared/components/modals/Modal';

export const Deposits = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  // Estado simulando os depósitos já realizados no turno atual
  const [depositsList, setDepositsList] = useState([
    { id: 1, hora: '14:32', valor: 1500.00, destino: 'Cofre Principal', status: 'Confirmado' },
    { id: 2, hora: '18:15', valor: 2000.00, destino: 'Malote Bancário', status: 'Confirmado' },
  ]);

  const columns = [
    { header: 'Horário', accessorKey: 'hora' },
    { 
      header: 'Destino / Local', 
      render: (row) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ShieldCheck size={16} color="var(--color-success)" />
          {row.destino}
        </span>
      )
    },
    { 
      header: 'Valor Retirado', 
      render: (row) => `R$ ${row.valor.toFixed(2).replace('.', ',')}` 
    },
    {
      header: 'Status',
      render: (row) => (
        <span style={{ 
          padding: '4px 8px', 
          backgroundColor: '#ecfdf5', 
          color: 'var(--color-success)', 
          borderRadius: '12px', 
          fontSize: '0.75rem', 
          fontWeight: '600' 
        }}>
          {row.status}
        </span>
      )
    }
  ];

  const onSubmit = async (data) => {
    setIsLoading(true);
    
    // Simulação de salvamento (posteriormente conectado ao Supabase)
    setTimeout(() => {
      const novoDeposito = {
        id: Date.now(),
        hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        valor: parseFloat(data.valor),
        destino: data.destino,
        status: 'Confirmado'
      };

      setDepositsList([novoDeposito, ...depositsList]);
      setIsLoading(false);
      setIsModalOpen(false);
      reset(); // Limpa o formulário
    }, 1000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Cabeçalho da Tela */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>Depósitos & Sangrias</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Controle de retiradas de valores da gaveta para o cofre seguro.</p>
        </div>
        
        <div style={{ width: 'auto' }}>
          <Button onClick={() => setIsModalOpen(true)} icon={Plus}>
            Nova Sangria
          </Button>
        </div>
      </div>

      {/* Grid com Resumo e Listagem */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        
        <Card title="Retiradas Realizadas (Turno Atual)" icon={Banknote}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '16px' }}>
            Abaixo estão listados todos os valores movimentados para fora do caixa para fins de segurança.
          </p>
          <Table columns={columns} data={depositsList} emptyMessage="Nenhuma sangria realizada neste turno." />
        </Card>

      </div>

      {/* MODAL PARA REGISTRO DE NOVA SANGRIA */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar Nova Sangria de Caixa">
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ padding: '12px', backgroundColor: '#fffbeb', borderRadius: 'var(--radius-md)', border: '1px solid #fde68a', fontSize: '0.875rem', color: '#b45309' }}>
            ⚠️ Certifique-se de recolher o dinheiro físico e envolvê-lo na comanda ou envelope antes de confirmar.
          </div>

          <FormInput
            label="Valor da Retirada (R$)"
            id="valor"
            type="number"
            step="0.01"
            placeholder="0,00"
            register={register('valor', { 
              required: 'O valor é obrigatório',
              min: { value: 1, message: 'O valor mínimo para sangria é R$ 1,00' }
            })}
            error={errors.valor}
          />

          <div className="input-wrapper">
            <label htmlFor="destino" className="input-label">Destino do Valor</label>
            <select 
              id="destino"
              className={`input-field ${errors.destino ? 'error' : ''}`}
              style={{ width: '100%' }}
              {...register('destino', { required: 'Selecione o destino do dinheiro' })}
            >
              <option value="">Selecione...</option>
              <option value="Cofre Principal">Cofre Principal (Fisico)</option>
              <option value="Malote Bancário">Malote Bancário</option>
              <option value="Gerência">Entregue à Gerência</option>
            </select>
            {errors.destino && <span className="input-error-text">{errors.destino.message}</span>}
          </div>

          <FormInput
            label="Observações / Identificador do Envelope"
            id="observacoes"
            placeholder="Ex: Envelope nº 402 - Notas de R$ 50 e R$ 100"
            register={register('observacoes')}
          />

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isLoading} icon={FileText}>
              Confirmar Retirada
            </Button>
          </div>

        </form>
      </Modal>

    </div>
  );
};
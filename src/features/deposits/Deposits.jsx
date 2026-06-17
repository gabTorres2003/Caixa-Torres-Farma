import React, { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../core/hooks/useAuth'
import { supabase } from '../../infrastructure/supabase/supabaseClient'

import { Card } from '../../shared/components/cards/Card'
import { FormInput } from '../../shared/components/forms/FormInput'
import { Button } from '../../shared/components/buttons/Button'
import { Table } from '../../shared/components/tables/Table'
import { Modal } from '../../shared/components/modals/Modal'
import {
  Banknote,
  Plus,
  Calendar,
  FileText,
  Loader2,
  Printer,
} from 'lucide-react'

export const Deposits = () => {
  const { user } = useAuth()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [depositsList, setDepositsList] = useState([])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm()

  // --- BUSCA REAL DE DADOS (SUPABASE) ---
  const carregarDepositos = useCallback(async () => {
    if (!user?.store_id) return
    setIsPageLoading(true)

    try {
      const hoje = new Date().toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('deposits')
        .select(
          `
          *,
          users:created_by (nome)
        `,
        )
        .eq('store_id', user.store_id)
        .gte('created_at', `${hoje}T00:00:00-03:00`)
        .order('created_at', { ascending: false })

      if (error) throw error
      setDepositsList(data || [])
    } catch (err) {
      console.error('Erro ao buscar depósitos:', err.message)
    } finally {
      setIsPageLoading(false)
    }
  }, [user?.store_id])

  useEffect(() => {
    carregarDepositos()
  }, [carregarDepositos])

  // --- DEFINIÇÃO DAS COLUNAS DA TABELA ---
  const columns = [
    {
      header: 'Data e Hora',
      render: (row) =>
        new Date(row.created_at).toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
    },
    {
      header: 'Origem / Caixa',
      render: (row) => (
        <div>
          <strong style={{ color: 'var(--color-primary)' }}>
            {row.origem}
          </strong>
          {row.data_caixa && (
            <div
              style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}
            >
              Ref:{' '}
              {new Date(row.data_caixa + 'T00:00:00').toLocaleDateString(
                'pt-BR',
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Responsável',
      render: (row) => row.responsavel_nome || row.users?.nome || 'Operador'
    },
    {
      header: 'Valor Retirado',
      render: (row) => (
        <strong style={{ color: '#dc2626' }}>
          R$ {row.valor.toFixed(2).replace('.', ',')}
        </strong>
      ),
    },
    {
      header: 'Categoria',
      render: (row) => (
        <span
          style={{
            padding: '4px 8px',
            backgroundColor:
              row.categoria === 'Troca (Caixa de Troco)'
                ? '#eff6ff'
                : '#ecfdf5',
            color:
              row.categoria === 'Troca (Caixa de Troco)'
                ? '#1d4ed8'
                : 'var(--color-success)',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: '600',
          }}
        >
          {row.categoria || 'Depósito'}
        </span>
      ),
    },
    {
      header: 'Ações',
      render: (row) => (
        <button
          onClick={() => imprimirComprovante(row)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-primary)',
          }}
          title="Imprimir Comprovante"
        >
          <Printer size={20} />
        </button>
      ),
    },
  ]

  // --- OPERAÇÃO: SALVAR SANGRIA NO BANCO ---
  const onSubmit = async (data) => {
    setIsLoading(true)

    try {
      const { error } = await supabase.from('deposits').insert([
        {
          valor: parseFloat(data.valor),
          value: parseFloat(data.valor),
          origin: data.origem,
          origem: data.origem,
          categoria: data.categoria,
          data_caixa: data.data_caixa,
          responsavel_nome: user?.nome || 'Operador',
          store_id: user.store_id,
          created_by: user.id,
        },
      ])

      if (error) throw error

      setIsModalOpen(false)
      reset()
      await carregarDepositos()
    } catch (err) {
      alert('Erro ao registrar sangria: ' + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // --- FUNÇÃO DE IMPRESSÃO (BOBINA 80mm) ---
  const imprimirComprovante = (registro) => {
    const dataFormatada = new Date(registro.created_at).toLocaleString('pt-BR')
    const valorFormatado = `R$ ${registro.valor.toFixed(2).replace('.', ',')}`
    const nomeOperador =
      registro.responsavel_nome || registro.users?.nome || 'Operador'

    const conteudoCupom = `
      <html>
        <head>
          <style>
            @page { 
              margin: 0;
            }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              width: 76mm; /* Margem de segurança para bobina de 80mm */
              margin: 0; 
              padding: 5mm; 
              font-size: 15px; /* Fonte maior e mais legível */
              color: #000;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .title { font-size: 18px; font-weight: bold; }
            .divisor { border-top: 1px dashed #000; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="center title">TORRES FARMA</div>
          <div class="center bold">COMPROVANTE DE MOVIMENTACAO</div>
          <div class="divisor"></div>
          <div><span class="bold">Data/Hora:</span> ${dataFormatada}</div>
          <div><span class="bold">Categoria:</span> ${registro.categoria || 'Depósito'}</div>
          <div><span class="bold">Origem:</span> ${registro.origem}</div>
          <div><span class="bold">Operador:</span> ${nomeOperador}</div>
          <div class="divisor"></div>
          <div class="bold" style="font-size: 18px;">VALOR: ${valorFormatado}</div>
          <div class="divisor"></div>
          <br><br><br>
          <div class="center">_________________________________</div>
          <div class="center">Assinatura do Responsável</div>
          <br><br>
        </body>
      </html>
    `

    const janelaImpressao = window.open('', '', 'width=300,height=400')
    janelaImpressao.document.write(conteudoCupom)
    janelaImpressao.document.close()
    janelaImpressao.focus()
    setTimeout(() => {
      janelaImpressao.print()
      janelaImpressao.close()
    }, 250)
  }

  if (isPageLoading) {
    return (
      <div
        style={{
          height: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
        }}
      >
        <Loader2
          className="animate-spin"
          size={32}
          color="var(--color-primary)"
        />
        <span>Carregando movimentações do cofre...</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Cabeçalho da Tela */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.875rem',
              color: 'var(--color-primary)',
              fontWeight: 'bold',
            }}
          >
            Depósito / Movimentações
          </h1>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Controle de retiradas de valores da gaveta para o cofre seguro.
          </p>
        </div>

        <div style={{ width: 'auto' }}>
          <Button onClick={() => setIsModalOpen(true)} icon={Plus}>
            Novo Registro
          </Button>
        </div>
      </div>

      {/* Grid com Resumo e Listagem */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        <Card title="Retiradas Realizadas (Turno Atual)" icon={Banknote}>
          <p
            style={{
              color: 'var(--color-text-muted)',
              fontSize: '0.875rem',
              marginBottom: '16px',
            }}
          >
            Abaixo estão listados todos os valores movimentados para fora do
            caixa para fins de auditoria.
          </p>
          <Table
            columns={columns}
            data={depositsList}
            emptyMessage="Nenhuma sangria realizada neste turno."
          />
        </Card>
      </div>

      {/* MODAL PARA REGISTRO DE NOVA SANGRIA */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrar Nova Movimentação"
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
        >
          <div
            style={{
              padding: '12px',
              backgroundColor: '#fffbeb',
              borderRadius: 'var(--radius-md)',
              border: '1px solid #fde68a',
              fontSize: '0.875rem',
              color: '#b45309',
            }}
          >
            ⚠️ Certifique-se de recolher o dinheiro físico e envolvê-lo no
            envelope correto antes de confirmar.
          </div>

          <FormInput
            label="Valor da Retirada (R$)"
            id="valor"
            type="number"
            step="0.01"
            placeholder="0,00"
            register={register('valor', {
              required: 'O valor é obrigatório',
              min: {
                value: 1,
                message: 'O valor mínimo para sangria é R$ 1,00',
              },
            })}
            error={errors.valor}
          />

          <div className="input-wrapper">
            <label htmlFor="origem" className="input-label">
              Origem do Valor (Caixa)
            </label>
            <select
              id="origem"
              className={`input-field ${errors.origem ? 'error' : ''}`}
              style={{ width: '100%' }}
              {...register('origem', {
                required: 'A origem do dinheiro é obrigatória',
              })}
            >
              <option value="">Selecione...</option>
              <option value="Caixa Jô">Caixa Jô</option>
              <option value="Caixa Gabriel">Caixa Gabriel</option>
              <option value="Caixa Ana">Caixa Ana</option>
              <option value="Caixa Bruna">Caixa Bruna</option>
              <option value="Caixa de Troco">Caixa de Troco</option>
            </select>
            {errors.origem && (
              <span
                className="input-error-text"
                style={{
                  color: 'var(--color-error)',
                  fontSize: '0.75rem',
                  marginTop: '4px',
                }}
              >
                {errors.origem.message}
              </span>
            )}
          </div>

          <div className="input-wrapper">
            <label htmlFor="data_caixa" className="input-label">
              Data Referente ao Caixa
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                id="data_caixa"
                type="date"
                className={`input-field ${errors.data_caixa ? 'error' : ''}`}
                style={{ width: '100%' }}
                {...register('data_caixa', {
                  required: 'A data do caixa é obrigatória',
                })}
              />
            </div>
            {errors.data_caixa && (
              <span
                className="input-error-text"
                style={{
                  color: 'var(--color-error)',
                  fontSize: '0.75rem',
                  marginTop: '4px',
                }}
              >
                {errors.data_caixa.message}
              </span>
            )}
          </div>

          <div className="input-wrapper">
            <label htmlFor="categoria" className="input-label">
              Categoria
            </label>
            <select
              id="categoria"
              className={`input-field ${errors.categoria ? 'error' : ''}`}
              style={{ width: '100%' }}
              {...register('categoria', {
                required: 'A categoria é obrigatória',
              })}
            >
              <option value="">Selecione...</option>
              <option value="Depósito">Depósito</option>
              <option value="Troca (Caixa de Troco)">
                Troca (Caixa de Troco)
              </option>
            </select>
            {errors.categoria && (
              <span
                className="input-error-text"
                style={{
                  color: 'var(--color-error)',
                  fontSize: '0.75rem',
                  marginTop: '4px',
                }}
              >
                {errors.categoria.message}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={isLoading} icon={FileText}>
              Confirmar Retirada
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

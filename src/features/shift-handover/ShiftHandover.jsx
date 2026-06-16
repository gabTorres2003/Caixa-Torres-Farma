import React, { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../core/hooks/useAuth'
import { supabase } from '../../infrastructure/supabase/supabaseClient'
import {
  Plus,
  FileText,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Printer,
  Eye,
  Loader2,
  Clock,
  Pencil,
  Trash2,
  X,
} from 'lucide-react'

import { Card } from '../../shared/components/cards/Card'
import { FormInput } from '../../shared/components/forms/FormInput'
import { Button } from '../../shared/components/buttons/Button'
import { Table } from '../../shared/components/tables/Table'

export const ShiftHandover = () => {
  const { user } = useAuth()
  const role = user?.role || 'CAIXA_MANHA' // ADMIN, CAIXA_MANHA, CAIXA_TARDE

  const [entregas, setEntregas] = useState([])
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [obsTarde, setObsTarde] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm()
  const [editingId, setEditingId] = useState(null)

  // Função auxiliar para formatar o timestamp do banco para o padrão HH:MM local da drogaria
  const formatarHora = (timestamp) => {
    if (!timestamp) return '--:--'
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // --- BUSCA REAL DE DADOS (Dia atual e Filial correspondente) ---
  const carregarEntregasDoDia = useCallback(async () => {
    if (!user?.store_id) return
    setIsPageLoading(true)
    try {
      const hoje = new Date().toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('pending_deliveries')
        .select('*')
        .eq('store_id', user.store_id)
        .gte('created_at', `${hoje}T00:00:00Z`)
        .order('created_at', { ascending: false })

      if (error) throw error
      setEntregas(data || [])
    } catch (err) {
      console.error('Erro ao buscar entregas:', err.message)
    } finally {
      setIsPageLoading(false)
    }
  }, [user?.store_id])

  useEffect(() => {
    carregarEntregasDoDia()
  }, [carregarEntregasDoDia])

  // --- OPERAÇÃO: CAIXA DA MANHÃ (DELETE / UPDATE) ---

  const handleIniciarEdicao = (entrega) => {
    setEditingId(entrega.id)
    setValue('comanda', entrega.comanda)
    setValue('valor', entrega.valor)
    setValue('tipo', entrega.tipo_saida)
  }

  const handleCancelarEdicao = () => {
    setEditingId(null)
    reset({ comanda: '', valor: '', tipo: 'D' })
  }

  const handleExcluirEntrega = async (id) => {
    if (
      !window.confirm('Tem certeza que deseja excluir esta comanda da folha?')
    )
      return
    try {
      const { error } = await supabase
        .from('pending_deliveries')
        .delete()
        .eq('id', id)

      if (error) throw error
      if (editingId === id) handleCancelarEdicao()
      await carregarEntregasDoDia()
    } catch (err) {
      alert('Erro ao excluir comanda: ' + err.message)
    }
  }

  // --- OPERAÇÃO: CAIXA DA MANHÃ (INSERT/UPDATE) ---
  const onAdicionarEntrega = async (data) => {
    setIsActionLoading(true)
    try {
      if (editingId) {
        // Fluxo de Atualização (UPDATE)
        const { error } = await supabase
          .from('pending_deliveries')
          .update({
            comanda: data.comanda,
            valor: parseFloat(data.valor),
            tipo_saida: data.tipo,
            forma_pagamento_real: data.tipo,
          })
          .eq('id', editingId)

        if (error) throw error
        setEditingId(null)
      } else {
        // Fluxo de Novo Registro (INSERT)
        const { error } = await supabase.from('pending_deliveries').insert([
          {
            comanda: data.comanda,
            valor: parseFloat(data.valor),
            tipo_saida: data.tipo,
            forma_pagamento_real: data.tipo,
            store_id: user.store_id,
            created_by: user.id,
          },
        ])

        if (error) throw error
      }

      reset({ comanda: '', valor: '', tipo: 'D' })
      await carregarEntregasDoDia()
    } catch (err) {
      alert('Erro ao processar comanda: ' + err.message)
    } finally {
      setIsActionLoading(false)
    }
  }

  // --- OPERAÇÃO: CAIXA DA TARDE (UPDATES) ---
  const handleToggleCheck = async (id, statusAtual) => {
    try {
      const { error } = await supabase
        .from('pending_deliveries')
        .update({ conferido: !statusAtual })
        .eq('id', id)

      if (error) throw error
      setEntregas((prev) =>
        prev.map((e) => (e.id === id ? { ...e, conferido: !statusAtual } : e)),
      )
    } catch (err) {
      alert('Erro ao atualizar conferência: ' + err.message)
    }
  }

  const handleAlterarFormaReal = async (id, novaForma) => {
    try {
      const { error } = await supabase
        .from('pending_deliveries')
        .update({ forma_pagamento_real: novaForma })
        .eq('id', id)

      if (error) throw error
      setEntregas((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, forma_pagamento_real: novaForma } : e,
        ),
      )
    } catch (err) {
      alert('Erro ao mutar forma de pagamento: ' + err.message)
    }
  }

  const handleFinalizarTurnoTarde = async () => {
    setIsActionLoading(true)
    try {
      const { error } = await supabase
        .from('pending_deliveries')
        .update({ conferido: true, observacoes: obsTarde })
        .eq('store_id', user.store_id)
        .eq('conferido', false)

      if (error) throw error
      alert('Turno vespertino consolidado com sucesso!')
      await carregarEntregasDoDia()
    } catch (err) {
      alert('Erro ao encerrar turno: ' + err.message)
    } finally {
      setIsActionLoading(false)
    }
  }

  const totalDinheiro = entregas
    .filter((e) => e.tipo_saida === 'D')
    .reduce((acc, curr) => acc + curr.valor, 0)
  const totalCartao = entregas
    .filter((e) => e.tipo_saida === 'C')
    .reduce((acc, curr) => acc + curr.valor, 0)

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
        <span>Carregando dados da filial...</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <style>{`
        @media print {
          aside, nav, button, .no-print { display: none !important; }
          main { padding: 0 !important; }
          .print-card { border: none !important; box-shadow: none !important; }
        }
      `}</style>

      <div>
        <h1
          style={{
            fontSize: '1.875rem',
            color: 'var(--color-primary)',
            fontWeight: 'bold',
          }}
        >
          {role === 'CAIXA_MANHA' && 'Prestação de Contas - Turno Manhã'}
          {role === 'CAIXA_TARDE' && 'Fechamento & Checklist - Entrada Tarde'}
          {role === 'ADMIN' && 'Auditoria Avançada de Fechamentos'}
        </h1>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Usuário: <strong>{user?.nome}</strong> ({role})
        </p>
      </div>

      {/* VISÃO: CAIXA DA MANHÃ */}
      {role === 'CAIXA_MANHA' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '380px 1fr',
            gap: '24px',
            alignItems: 'start',
          }}
        >
          <form
            onSubmit={handleSubmit(onAdicionarEntrega)}
            className="no-print"
          >
            <Card
              title={editingId ? 'Editar Comanda' : 'Lançar Nova Comanda'}
              icon={Plus}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                <FormInput
                  label="Nome do Cliente / Nº Comanda"
                  id="comanda"
                  placeholder="Ex: Luiz"
                  register={register('comanda', {
                    required: 'Identificador da comanda é obrigatório',
                  })}
                  error={errors.comanda}
                />
                <FormInput
                  label="Valor Real (R$)"
                  id="valor"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  register={register('valor', {
                    required: 'O valor da venda é obrigatório',
                  })}
                  error={errors.valor}
                />
                <div className="input-wrapper">
                  <label className="input-label">Forma de Pagamento</label>
                  <select
                    id="tipo"
                    className="input-field"
                    {...register('tipo')}
                  >
                    <option value="D">Dinheiro</option>
                    <option value="C">Cartão / Outros</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  <Button type="submit" isLoading={isActionLoading}>
                    {editingId ? 'Salvar Alterações' : 'Gravar na Tabela'}
                  </Button>
                  {editingId && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleCancelarEdicao}
                    >
                      <X size={16} style={{ marginRight: '4px' }} /> Cancelar
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </form>

          <Card
            title="Espelho Digital da Folha de Vendas"
            icon={FileText}
            className="print-card"
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginBottom: '16px',
              }}
              className="no-print"
            >
              <div style={{ width: 'auto' }}>
                <Button variant="secondary" onClick={() => window.print()}>
                  Exportar PDF da Folha
                </Button>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '20px',
              }}
            >
              <div>
                <h4
                  style={{
                    backgroundColor: '#fee2e2',
                    padding: '10px',
                    borderRadius: '6px',
                    color: '#991b1b',
                    marginBottom: '12px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                  }}
                >
                  Dinheiro — Total: R${' '}
                  {totalDinheiro.toFixed(2).replace('.', ',')}
                </h4>
                <Table
                  columns={[
                    {
                      header: 'Hora',
                      render: (r) => (
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: 'var(--color-text-muted)',
                          }}
                        >
                          <Clock size={12} />
                          {formatarHora(r.created_at)}
                        </span>
                      ),
                    },
                    { header: 'Comanda', accessorKey: 'comanda' },
                    {
                      header: 'Valor',
                      render: (r) =>
                        `R$ ${r.valor.toFixed(2).replace('.', ',')}`,
                    },
                    {
                      header: 'Ações',
                      className: 'actions-cell no-print',
                      render: (r) => (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => handleIniciarEdicao(r)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--color-primary)',
                              cursor: 'pointer',
                            }}
                            title="Editar"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExcluirEntrega(r.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#dc2626',
                              cursor: 'pointer',
                            }}
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ),
                    },
                  ]}
                  data={entregas.filter((e) => e.tipo_saida === 'D')}
                />
              </div>
              <div>
                <h4
                  style={{
                    backgroundColor: '#e0e7ff',
                    padding: '10px',
                    borderRadius: '6px',
                    color: '#1e40af',
                    marginBottom: '12px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                  }}
                >
                  Cartão / Outros — Total: R${' '}
                  {totalCartao.toFixed(2).replace('.', ',')}
                </h4>
                <Table
                  columns={[
                    {
                      header: 'Hora',
                      render: (r) => (
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: 'var(--color-text-muted)',
                          }}
                        >
                          <Clock size={12} />
                          {formatarHora(r.created_at)}
                        </span>
                      ),
                    },
                    { header: 'Comanda', accessorKey: 'comanda' },
                    {
                      header: 'Valor',
                      render: (r) =>
                        `R$ ${r.valor.toFixed(2).replace('.', ',')}`,
                    },
                    {
                      header: 'Ações',
                      className: 'actions-cell no-print',
                      render: (r) => (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => handleIniciarEdicao(r)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--color-primary)',
                              cursor: 'pointer',
                            }}
                            title="Editar"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExcluirEntrega(r.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#dc2626',
                              cursor: 'pointer',
                            }}
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ),
                    },
                  ]}
                  data={entregas.filter((e) => e.tipo_saida === 'C')}
                />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* VISÃO: CAIXA DA TARDE */}
      {role === 'CAIXA_TARDE' && (
        <Card
          title="Conferência de Comandas Físicas (Cestinha)"
          icon={CheckCircle}
        >
          <Table
            columns={[
              {
                header: 'Conferido',
                render: (row) => (
                  <input
                    type="checkbox"
                    checked={row.conferido}
                    onChange={() => handleToggleCheck(row.id, row.conferido)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                ),
              },
              {
                header: 'Hora Cadastro',
                render: (row) => formatarHora(row.created_at),
              },
              { header: 'Comanda / Cliente', accessorKey: 'comanda' },
              {
                header: 'Valor',
                render: (row) => `R$ ${row.valor.toFixed(2).replace('.', ',')}`,
              },
              {
                header: 'Lançado Como',
                render: (row) =>
                  row.tipo_saida === 'D' ? 'Dinheiro' : 'Cartão / Outros',
              },
              {
                header: 'Forma Real Recebida',
                render: (row) => (
                  <select
                    value={row.forma_pagamento_real || row.tipo_saida}
                    onChange={(e) =>
                      handleAlterarFormaReal(row.id, e.target.value)
                    }
                    className="input-field"
                    style={{ padding: '4px', fontSize: '0.85rem' }}
                  >
                    <option value="D">Dinheiro</option>
                    <option value="C">Cartão (POS)</option>
                    <option value="PX">Pix (QR)</option>
                  </select>
                ),
              },
              {
                header: 'Inconsistência',
                render: (row) =>
                  row.tipo_saida !== row.forma_pagamento_real ? (
                    <span
                      style={{
                        color: '#d97706',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                      }}
                    >
                      <AlertCircle size={14} /> Alterado para{' '}
                      {row.forma_pagamento_real}
                    </span>
                  ) : (
                    <span
                      style={{
                        color: 'var(--color-success)',
                        fontSize: '0.85rem',
                      }}
                    >
                      Bate com o Caderno
                    </span>
                  ),
              },
            ]}
            data={entregas}
          />

          <div style={{ marginTop: '24px' }}>
            <label
              className="input-label"
              style={{ marginBottom: '8px', display: 'block' }}
            >
              Observações do Turno Vespertino
            </label>
            <textarea
              className="input-field"
              rows="3"
              value={obsTarde}
              onChange={(e) => setObsTarde(e.target.value)}
              placeholder="Digite aqui ocorrências de notas rasgadas, pendências de motoboys ou detalhes do fechamento..."
              style={{ width: '100%', resize: 'none' }}
            />
          </div>

          <div
            style={{
              marginTop: '20px',
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <div style={{ width: '250px' }}>
              <Button
                onClick={handleFinalizarTurnoTarde}
                isLoading={isActionLoading}
              >
                Encerrar Turno e Salvar
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* VISÃO: ADMINISTRADOR */}
      {role === 'ADMIN' && (
        <Card title="Espelho de Auditoria Geral dos Caixas" icon={FileText}>
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--color-background)',
              borderRadius: '8px',
              marginBottom: '20px',
            }}
          >
            <p style={{ fontSize: '0.95rem' }}>
              Total Geral em Dinheiro Declarado:{' '}
              <strong>R$ {totalDinheiro.toFixed(2).replace('.', ',')}</strong>
            </p>
            <p style={{ fontSize: '0.95rem', marginTop: '4px' }}>
              Total Geral em Cartões Declarado:{' '}
              <strong>R$ {totalCartao.toFixed(2).replace('.', ',')}</strong>
            </p>
          </div>
          <Table
            columns={[
              { header: 'Hora', render: (r) => formatarHora(r.created_at) },
              { header: 'Comanda', accessorKey: 'comanda' },
              {
                header: 'Valor',
                render: (r) => `R$ ${r.valor.toFixed(2).replace('.', ',')}`,
              },
              {
                header: 'Lançado Manhã',
                render: (r) => (r.tipo_saida === 'D' ? 'Dinheiro' : 'Cartão'),
              },
              {
                header: 'Pago Real Tarde',
                render: (r) => r.forma_pagamento_real,
              },
              {
                header: 'Status',
                render: (r) =>
                  r.conferido ? '✅ Conferido' : '⏳ Aguardando Caixa Tarde',
              },
            ]}
            data={entregas}
          />
        </Card>
      )}
    </div>
  )
}

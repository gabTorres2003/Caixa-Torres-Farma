import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../core/hooks/useAuth'
import { useShiftHandover } from '../../core/hooks/useShiftHandover'
import { Plus, FileText, CheckCircle, AlertCircle, Loader2, Clock, Pencil, Trash2, X, MessageSquare, Printer, Calendar } from 'lucide-react'

import { Card } from '../../shared/components/cards/Card'
import { FormInput } from '../../shared/components/forms/FormInput'
import { Button } from '../../shared/components/buttons/Button'
import { Table } from '../../shared/components/tables/Table'

export const ShiftHandover = () => {
  const { user } = useAuth()
  
  const turnoSelecionado = localStorage.getItem('turnoOperacional')
  let role = user?.role || 'CAIXA_MANHA'
  if (user?.role !== 'ADMIN') {
    if (turnoSelecionado && turnoSelecionado !== 'AUTOMATICO') {
      role = turnoSelecionado === 'Tarde' ? 'CAIXA_TARDE' : 'CAIXA_MANHA'
    }
  }

  const [dataFiltro, setDataFiltro] = useState(() => {
    const tzOffset = new Date().getTimezoneOffset() * 60000
    return new Date(Date.now() - tzOffset).toISOString().split('T')[0]
  })

  // Importando a lógica do Hook
  const { 
    entregas, isPageLoading, isActionLoading, turnoEncerrado,
    carregarEntregas, salvarEntrega, excluirEntrega, toggleConciliado,
    toggleCheckTarde, alterarFormaReal, anotarObservacao, finalizarTurnoTarde 
  } = useShiftHandover(user, role, dataFiltro)

  const [editingId, setEditingId] = useState(null)
  const [obsTarde, setObsTarde] = useState('')

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm()

  useEffect(() => { carregarEntregas() }, [carregarEntregas])

  const formatarHora = (timestamp) => timestamp ? new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'
  const getNomePagamento = (sigla) => ({ 'D': 'Dinheiro', 'C': 'Cartão', 'PX': 'Pix' }[sigla] || sigla)

  const totalDinheiro = entregas.filter((e) => e.tipo_saida === 'D').reduce((acc, curr) => acc + curr.valor, 0)
  const totalCartao = entregas.filter((e) => e.tipo_saida === 'C').reduce((acc, curr) => acc + curr.valor, 0)

  const handleIniciarEdicao = (entrega) => {
    setEditingId(entrega.id)
    setValue('comanda', entrega.comanda)
    setValue('valor', entrega.valor)
    setValue('tipo', entrega.tipo_saida)
    setValue('observacoes', entrega.observacoes || '')
  }

  const handleCancelarEdicao = () => {
    setEditingId(null)
    reset({ comanda: '', valor: '', tipo: 'D', observacoes: '' })
  }

  const onAdicionarEntrega = async (data) => {
    await salvarEntrega(data, editingId)
    if (editingId) handleCancelarEdicao()
    else reset({ comanda: '', valor: '', tipo: 'D', observacoes: '' })
  }

  const onExcluirEntrega = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta comanda?')) {
      await excluirEntrega(id)
      if (editingId === id) handleCancelarEdicao()
    }
  }

  const getColunasManha = () => [
    { header: 'Hora', render: (r) => <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-text-muted)', textDecoration: r.conciliado ? 'line-through' : 'none', opacity: r.conciliado ? 0.5 : 1 }}><Clock size={12} /> {formatarHora(r.created_at)}</span> },
    { header: 'Comanda', render: (r) => <span style={{ textDecoration: r.conciliado ? 'line-through' : 'none', opacity: r.conciliado ? 0.5 : 1 }}>{r.comanda}</span> },
    { header: 'Valor', render: (r) => <span style={{ textDecoration: r.conciliado ? 'line-through' : 'none', opacity: r.conciliado ? 0.5 : 1 }}>R$ {r.valor.toFixed(2).replace('.', ',')}</span> },
    { header: 'Recebido (Tarde)', render: (r) => {
        const formaReal = r.forma_pagamento_real || r.tipo_saida; const alterado = r.tipo_saida !== formaReal;
        return (
          <div style={{ textDecoration: r.conciliado ? 'line-through' : 'none', opacity: r.conciliado ? 0.5 : 1 }}>
            <span style={{ fontWeight: alterado ? 'bold' : 'normal' }}>{getNomePagamento(formaReal)}</span>
            {alterado && <span style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: '600', marginTop: '2px' }}><AlertCircle size={12} /> Divergente</span>}
          </div>
        );
      }
    },
    { header: 'Obs', render: (r) => <span style={{ fontSize: '0.8rem', color: '#666', textDecoration: r.conciliado ? 'line-through' : 'none', opacity: r.conciliado ? 0.5 : 1 }}>{r.observacoes || '-'}</span> },
    { header: 'Ações', className: 'actions-cell no-print', render: (r) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" onClick={() => toggleConciliado(r.id, r.conciliado)} style={{ background: 'none', border: 'none', color: r.conciliado ? '#10b981' : 'var(--color-text-muted)', cursor: 'pointer' }}><CheckCircle size={18} /></button>
          {user.id === r.created_by && !r.conciliado && (
            <>
              <button type="button" onClick={() => handleIniciarEdicao(r)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer' }}><Pencil size={16} /></button>
              <button type="button" onClick={() => onExcluirEntrega(r.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}><Trash2 size={16} /></button>
            </>
          )}
        </div>
      )
    },
  ]

  const colunasTarde = [
    { header: 'Conf.', render: (row) => <input type="checkbox" checked={row.conferido} onChange={() => toggleCheckTarde(row.id, row.conferido)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} /> },
    { header: 'Hora', render: (row) => <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}><Clock size={12} /> {formatarHora(row.created_at)}</span> },
    { header: 'Comanda', accessorKey: 'comanda' },
    { header: 'Valor', render: (row) => `R$ ${row.valor.toFixed(2).replace('.', ',')}` },
    { header: 'Forma Real', className: 'no-print', render: (row) => (
        <select value={row.forma_pagamento_real || row.tipo_saida} onChange={(e) => alterarFormaReal(row.id, e.target.value)} className="input-field" style={{ padding: '2px 4px', fontSize: '0.85rem' }}>
          <option value="D">Dinheiro</option><option value="C">Cartão (POS)</option><option value="PX">Pix (QR)</option>
        </select>
      )
    },
    { header: 'Inconsistência', render: (row) => row.tipo_saida !== row.forma_pagamento_real 
        ? <span style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: '600' }}><AlertCircle size={14} /> Alterado para {getNomePagamento(row.forma_pagamento_real)}</span>
        : <span style={{ color: 'var(--color-success)', fontSize: '0.8rem' }}>Bate com Caderno</span>
    },
    { header: 'Obs.', className: 'no-print', render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button type="button" onClick={() => anotarObservacao(row.id, row.observacoes)} style={{ background: 'none', border: 'none', color: row.observacoes ? 'var(--color-primary)' : 'var(--color-text-muted)', cursor: 'pointer' }}><MessageSquare size={16} /></button>
          {row.observacoes && <span style={{ fontSize: '0.75rem', color: '#666', maxWidth: '80px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.observacoes}</span>}
        </div>
      )
    },
  ]

  if (isPageLoading) return <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}><Loader2 className="animate-spin" size={32} color="var(--color-primary)" /><span>Carregando dados da filial...</span></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* CSS DE IMPRESSÃO */}
      <style>{`
        @media print {
          /* Define margem zero na página para o Chrome não imprimir URL e Data */
          @page { margin: 0; size: A4; }
          
          /* Força cor de fundo branca e ajusta o layout base do body */
          body { 
            margin: 10mm; /* Adiciona respiro físico no papel */
            background-color: #ffffff !important; 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
          }
          
          /* Esconde absolutamente tudo que for menu ou navegação */
          aside, nav, header, .no-print { display: none !important; }
          
          /* Expande a área principal para usar 100% da folha sem scroll */
          main, #root, .print-container { 
            width: 100% !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            overflow: visible !important; 
            display: block !important; 
          }
          
          /* Formata o card para tirar sombras e bordas */
          .print-card { 
            border: none !important; 
            box-shadow: none !important; 
            padding: 0 !important; 
            width: 100% !important; 
          }
          
          /* Garante que a tabela não vaze e não quebre a linha pela metade */
          table { width: 100% !important; table-layout: fixed; page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          td, th { word-wrap: break-word; font-size: 12px; }
        }
      `}</style>

      <div className="no-print">
        <h1 style={{ fontSize: '1.875rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>
          {role === 'CAIXA_MANHA' && 'Prestação de Contas - Turno Manhã'}
          {role === 'CAIXA_TARDE' && 'Fechamento & Checklist - Entrada Tarde'}
          {role === 'ADMIN' && 'Auditoria Avançada de Fechamentos'}
        </h1>
        <p style={{ color: 'var(--color-text-muted)' }}>Usuário: <strong>{user?.nome}</strong> ({role})</p>
      </div>

      {role === 'CAIXA_MANHA' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', alignItems: 'start' }}>
          <form onSubmit={handleSubmit(onAdicionarEntrega)} className="no-print">
            <Card title={editingId ? 'Editar Comanda' : 'Lançar Nova Comanda'} icon={Plus}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px' }}>
                <div style={{ flex: 1 }}><FormInput label="Nome do Cliente / Nº Comanda" id="comanda" placeholder="Ex: Luiz" register={register('comanda', { required: 'Obrigatório' })} error={errors.comanda} /></div>
                <div style={{ width: '150px' }}><FormInput label="Valor Real (R$)" id="valor" type="number" step="0.01" placeholder="0,00" register={register('valor', { required: 'Obrigatório' })} error={errors.valor} /></div>
                <div className="input-wrapper" style={{ width: '150px' }}>
                  <label className="input-label">Forma de Pgto.</label>
                  <select id="tipo" className="input-field" {...register('tipo')}>
                    <option value="D">Dinheiro</option><option value="C">Cartão / Outros</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}><FormInput label="Observação (Opcional)" id="observacoes" placeholder="Faltou 2 reais de troco..." register={register('observacoes')} /></div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Button type="submit" isLoading={isActionLoading}>{editingId ? 'Salvar' : 'Gravar'}</Button>
                  {editingId && <Button type="button" variant="secondary" onClick={handleCancelarEdicao}><X size={16}/></Button>}
                </div>
              </div>
            </Card>
          </form>

          <Card title="Espelho Digital da Folha de Vendas" icon={FileText} className="print-card">
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }} className="no-print">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={18} /> Conciliar dia:
                </label>
                <input type="date" className="input-field" style={{ padding: '8px 12px', fontSize: '0.9rem' }} value={dataFiltro} onChange={(e) => setDataFiltro(e.target.value)} />
              </div>
              <div style={{ width: 'max-content' }}><Button variant="secondary" onClick={() => window.print()}>Exportar PDF da Folha</Button></div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h4 style={{ backgroundColor: '#fee2e2', padding: '10px', borderRadius: '6px', color: '#991b1b', marginBottom: '12px', textAlign: 'center', fontWeight: 'bold' }}>
                  Dinheiro — Total: R$ {totalDinheiro.toFixed(2).replace('.', ',')}
                </h4>
                <Table columns={getColunasManha()} data={entregas.filter((e) => e.tipo_saida === 'D')} />
              </div>

              <div>
                <h4 style={{ backgroundColor: '#e0e7ff', padding: '10px', borderRadius: '6px', color: '#1e40af', marginBottom: '12px', textAlign: 'center', fontWeight: 'bold' }}>
                  Cartão / Outros — Total: R$ {totalCartao.toFixed(2).replace('.', ',')}
                </h4>
                <Table columns={getColunasManha()} data={entregas.filter((e) => e.tipo_saida === 'C')} />
              </div>
            </div>
          </Card>
        </div>
      )}

      {role === 'CAIXA_TARDE' && (
        <Card title="Conferência de Comandas Físicas (Cestinha)" icon={CheckCircle} className="print-card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h4 style={{ backgroundColor: '#fee2e2', padding: '10px', borderRadius: '6px', color: '#991b1b', marginBottom: '12px', textAlign: 'center', fontWeight: 'bold' }}>Conferência Dinheiro — Total: R$ {totalDinheiro.toFixed(2).replace('.', ',')}</h4>
              <Table columns={colunasTarde} data={entregas.filter((e) => e.tipo_saida === 'D')} />
            </div>
            <div>
              <h4 style={{ backgroundColor: '#e0e7ff', padding: '10px', borderRadius: '6px', color: '#1e40af', marginBottom: '12px', textAlign: 'center', fontWeight: 'bold' }}>Conferência Cartão / Outros — Total: R$ {totalCartao.toFixed(2).replace('.', ',')}</h4>
              <Table columns={colunasTarde} data={entregas.filter((e) => e.tipo_saida === 'C')} />
            </div>
          </div>
          <div style={{ marginTop: '24px' }} className="no-print">
            <label className="input-label" style={{ marginBottom: '8px', display: 'block' }}>Anotações Gerais do Turno Vespertino (Impressão)</label>
            <textarea className="input-field" rows="2" value={obsTarde} onChange={(e) => setObsTarde(e.target.value)} placeholder="Digite um resumo das inconsistências..." style={{ width: '100%', resize: 'none' }} />
          </div>
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }} className="no-print">
            {turnoEncerrado && <Button variant="secondary" onClick={() => window.print()}><Printer size={16} style={{ marginRight: '6px' }} /> Exportar Relatório PDF</Button>}
            <div style={{ width: '250px' }}><Button onClick={finalizarTurnoTarde} isLoading={isActionLoading}>Encerrar Turno e Salvar</Button></div>
          </div>
        </Card>
      )}

      {role === 'ADMIN' && (
        <Card title="Espelho de Auditoria Geral dos Caixas" icon={FileText}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--color-text-main)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={18} color="var(--color-primary)" /> Data da Operação</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Selecione um dia para auditar o histórico.</p>
            </div>
            <div><input type="date" className="input-field" style={{ width: 'auto', padding: '10px', cursor: 'pointer', fontWeight: 'bold', color: 'var(--color-primary)' }} value={dataFiltro} onChange={(e) => setDataFiltro(e.target.value)} /></div>
          </div>
          <div style={{ padding: '16px', backgroundColor: 'var(--color-background)', borderRadius: '8px', marginBottom: '20px' }}>
            <p style={{ fontSize: '0.95rem' }}>Total Dinheiro: <strong>R$ {totalDinheiro.toFixed(2).replace('.', ',')}</strong></p>
            <p style={{ fontSize: '0.95rem', marginTop: '4px' }}>Total Cartões: <strong>R$ {totalCartao.toFixed(2).replace('.', ',')}</strong></p>
          </div>
          <Table columns={[{ header: 'Hora', render: (r) => formatarHora(r.created_at) }, { header: 'Comanda', accessorKey: 'comanda' }, { header: 'Valor', render: (r) => `R$ ${r.valor.toFixed(2).replace('.', ',')}` }, { header: 'Lançado Manhã', render: (r) => (r.tipo_saida === 'D' ? 'Dinheiro' : 'Cartão') }, { header: 'Pago Real Tarde', render: (r) => getNomePagamento(r.forma_pagamento_real) }, { header: 'Status', render: (r) => (r.conferido ? '✅ Conferido' : '⏳ Pendente') }, { header: 'Baixa', render: (r) => (r.conciliado ? '✅ Sim' : '❌ Não') }, { header: 'Obs.', render: (r) => <span style={{ fontSize: '0.8rem', color: '#666' }}>{r.observacoes || '-'}</span> }]} data={entregas} />
        </Card>
      )}
    </div>
  )
}
import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../core/hooks/useAuth'
import { useDeposits } from '../../core/hooks/useDeposits'
import { Card } from '../../shared/components/cards/Card'
import { FormInput } from '../../shared/components/forms/FormInput'
import { Button } from '../../shared/components/buttons/Button'
import { Table } from '../../shared/components/tables/Table'
import { Modal } from '../../shared/components/modals/Modal'
import { Coins as CoinsIcon, Plus, Loader2, CheckCircle, Calendar, Trash2, ArrowRightCircle, ArrowDownCircle, Info } from 'lucide-react'

const formatRecebedor = (raw) => {
  if (!raw) return 'Operador';
  if (typeof raw === 'string' && raw.includes('"recebido_por"')) {
    try { return JSON.parse(raw).recebido_por || 'Operador'; } catch (e) { return raw; }
  }
  return raw;
};

// HELPER PARA FORMATAR OS DETALHES DE VALORES (JSON)
const formatarValoresMovimentados = (detalhamento) => {
  if (!detalhamento) return 'Sem detalhes físicos registrados.';
  let texto = '';
  
  if (detalhamento.notas && Object.keys(detalhamento.notas).length > 0) {
    texto += 'NOTAS:\n';
    Object.entries(detalhamento.notas).forEach(([valor, qtd]) => { if (qtd !== 0) texto += `• R$ ${Number(valor).toFixed(2).replace('.', ',')}  ->  ${Math.abs(qtd)} un.\n`; });
  }

  if (detalhamento.moedas && Object.keys(detalhamento.moedas).length > 0) {
    texto += '\nMOEDAS:\n';
    Object.entries(detalhamento.moedas).forEach(([valor, qtd]) => { if (qtd !== 0) texto += `• R$ ${Number(valor).toFixed(2).replace('.', ',')}  ->  ${Math.abs(qtd)} un.\n`; });
  }

  // Mantido por retrocompatibilidade com registros antigos
  if (detalhamento.moedasSangria && Object.keys(detalhamento.moedasSangria).length > 0) {
    texto += '\nMOEDAS (SANGRIA DEPOSITADA NO COFRE):\n';
    Object.entries(detalhamento.moedasSangria).forEach(([valor, qtd]) => { if (qtd !== 0) texto += `• R$ ${Number(valor).toFixed(2).replace('.', ',')}  ->  ${Math.abs(qtd)} un.\n`; });
  }

  return texto === '' ? 'Nenhum valor físico detalhado.' : texto;
};

export const Coins = () => {
  const { user } = useAuth()
  const [dataFiltro, setDataFiltro] = useState(() => {
    const tzOffset = new Date().getTimezoneOffset() * 60000
    return new Date(Date.now() - tzOffset).toISOString().split('T')[0]
  })

  const { depositsList, isPageLoading, isActionLoading, carregarDepositos, salvarDeposito, excluirDeposito, receberTroca } = useDeposits(user, dataFiltro)

  // Modais de Criação
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [tipoMoeda, setTipoMoeda] = useState('CREDITO') 
  
  // Modal de Sangria Isolada
  const [isSangriaModalOpen, setIsSangriaModalOpen] = useState(false)
  const [moedasSangria, setMoedasSangria] = useState({ 1: 0, 0.5: 0, 0.25: 0, 0.1: 0, 0.05: 0 })
  
  // Valores do formulário base
  const [moedasCredito, setMoedasCredito] = useState({ 1: 0, 0.5: 0, 0.25: 0, 0.1: 0, 0.05: 0 })
  const [notasSaida, setNotasSaida] = useState({ 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0 })

  // Modal de Recebimento
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false)
  const [receivingTroca, setReceivingTroca] = useState(null)
  const [moedasRec, setMoedasRec] = useState({ 1: 0, 0.5: 0, 0.25: 0, 0.1: 0, 0.05: 0 })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm()
  const origemSelecionada = watch('origem')

  useEffect(() => { carregarDepositos() }, [carregarDepositos])

  const moedasList = depositsList.filter(d => d.categoria?.startsWith('Moedas') || d.categoria === 'Sangria de Moedas')

  const handleMoedaCreditoChange = (moeda, valor) => { setMoedasCredito(prev => ({ ...prev, [moeda]: parseFloat(valor) || 0 })) }
  const handleNotaSaidaChange = (nota, valor) => { setNotasSaida(prev => ({ ...prev, [nota]: parseFloat(valor) || 0 })) }
  const handleMoedaSangriaChange = (moeda, valor) => { setMoedasSangria(prev => ({ ...prev, [moeda]: parseFloat(valor) || 0 })) }
  const handleMoedaRecChange = (moeda, valor) => { setMoedasRec(prev => ({ ...prev, [moeda]: parseFloat(valor) || 0 })) }

  const totalCredito = Object.values(moedasCredito).reduce((acc, val) => acc + val, 0)
  const totalNotasSaida = Object.values(notasSaida).reduce((acc, val) => acc + val, 0)
  const totalSangria = Object.values(moedasSangria).reduce((acc, val) => acc + val, 0)
  const totalRecebimento = Object.values(moedasRec).reduce((acc, val) => acc + val, 0)

  useEffect(() => {
    if (tipoMoeda === 'CREDITO') setValue('valor', totalCredito)
    else if (tipoMoeda === 'EXTERNA' && origemSelecionada === 'Caixa de Troco') setValue('valor', totalNotasSaida)
  }, [tipoMoeda, origemSelecionada, totalCredito, totalNotasSaida, setValue])

  const isMatchRecebimento = receivingTroca && totalRecebimento.toFixed(2) === parseFloat(receivingTroca.valor).toFixed(2)

  const converterReaisParaQtd = (valoresReais) => {
    const qtds = {};
    Object.entries(valoresReais).forEach(([face, valor]) => {
      qtds[face] = Math.round((Number(valor) || 0) / Number(face));
    });
    return qtds;
  }

  const fecharModal = () => {
    setIsModalOpen(false)
    setIsSangriaModalOpen(false)
    setMoedasCredito({ 1: 0, 0.5: 0, 0.25: 0, 0.1: 0, 0.05: 0 })
    setNotasSaida({ 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0 })
    setMoedasSangria({ 1: 0, 0.5: 0, 0.25: 0, 0.1: 0, 0.05: 0 })
    reset({ valor: '', origem: '', destino: '' })
    setTipoMoeda('CREDITO')
  }

  // Submit da Sangria Independente
  const onSubmitSangria = async (e) => {
    e.preventDefault()
    if (totalSangria <= 0) return alert("Informe os valores das moedas.")

    const payload = {
      valor: totalSangria, value: totalSangria,
      categoria: 'Sangria de Moedas',
      origem: 'Caixa Atual', origin: 'Caixa Atual',
      destino: 'Cofre Central',
      status_troca: 'CONCLUIDA',
      responsavel_nome: user?.nome || 'Operador',
      detalhes_troca: { moedas: converterReaisParaQtd(moedasSangria) }
    }

    try {
      await salvarDeposito(payload)
      fecharModal()
      alert("Sangria registrada e moedas depositadas com sucesso no Cofre Central!")
    } catch (e) {}
  }

  // Submit das Trocas Originais
  const onSubmitCreate = async (data) => {
    const valorFinal = tipoMoeda === 'CREDITO' ? totalCredito : (origemSelecionada === 'Caixa de Troco' ? totalNotasSaida : parseFloat(data.valor))
    if (valorFinal <= 0) return alert("Informe os valores.")

    const payload = {
      valor: valorFinal, value: valorFinal,
      categoria: tipoMoeda === 'CREDITO' ? 'Moedas (Crédito)' : 'Moedas (Troca Externa)',
      origem: tipoMoeda === 'CREDITO' ? 'Caixa de Troco' : data.origem,
      origin: tipoMoeda === 'CREDITO' ? 'Caixa de Troco' : data.origem,
      destino: tipoMoeda === 'CREDITO' ? 'Caixa Atual' : data.destino,
      status_troca: tipoMoeda === 'EXTERNA' ? 'PENDENTE' : 'CONCLUIDA',
      responsavel_nome: user?.nome || 'Operador',
      detalhes_troca: {}
    }

    if (tipoMoeda === 'CREDITO') {
      payload.detalhes_troca.moedas = converterReaisParaQtd(moedasCredito)
    } else if (tipoMoeda === 'EXTERNA' && data.origem === 'Caixa de Troco') {
      payload.detalhes_troca.notas = converterReaisParaQtd(notasSaida)
    }

    try {
      await salvarDeposito(payload)
      fecharModal()
    } catch (e) {}
  }

  const handleOpenReceive = (troca) => {
    setReceivingTroca(troca)
    setMoedasRec({ 1: 0, 0.5: 0, 0.25: 0, 0.1: 0, 0.05: 0 })
    setIsReceiveModalOpen(true)
  }

  const onSubmitReceive = async (e) => {
    e.preventDefault()
    if (receivingTroca?.origem === 'Caixa de Troco' && !isMatchRecebimento) return alert("Os valores não batem.")

    const payloadRecebimento = {
      recebido_por: user?.nome || 'Operador',
      valor_recebido: receivingTroca.valor
    }

    if (receivingTroca?.origem === 'Caixa de Troco') {
      payloadRecebimento.detalhes_troca = { moedas: converterReaisParaQtd(moedasRec) }
    }

    await receberTroca(receivingTroca.id, payloadRecebimento, receivingTroca)
    setIsReceiveModalOpen(false)
  }

  const handleDelete = (id) => {
    if(window.confirm('Tem certeza que deseja excluir esta movimentação?')) {
      excluirDeposito(id);
    }
  }

  const columns = [
    { header: 'Data/Hora', render: (row) => new Date(row.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) },
    { header: 'Tipo', render: (row) => {
        if (row.categoria === 'Moedas (Crédito)') return <span style={{ color: '#16a34a', fontWeight: 'bold' }}>Crédito</span>;
        if (row.categoria === 'Sangria de Moedas') return <span style={{ color: '#6366f1', fontWeight: 'bold' }}>Sangria</span>;
        return <span style={{ color: '#d97706', fontWeight: 'bold' }}>Troca Externa</span>;
      }
    },
    { header: 'Destino/Origem', render: (row) => {
        if (row.categoria === 'Moedas (Crédito)') return <span style={{fontSize: '0.85rem'}}><b>Caixa de Troco</b> ➔ Caixa</span>;
        if (row.categoria === 'Sangria de Moedas') return <span style={{fontSize: '0.85rem'}}><b>Caixa Atual</b> ➔ Cofre Central</span>;
        return <span style={{fontSize: '0.85rem'}}><b>{row.origem}</b> ➔ {row.destino}</span>;
      }
    },
    { header: 'Valor', render: (row) => <strong style={{ color: '#0f172a' }}>R$ {row.valor.toFixed(2).replace('.', ',')}</strong> },
    { header: 'Status', render: (row) => {
        if (row.categoria === 'Moedas (Crédito)' || row.categoria === 'Sangria de Moedas') return <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✓ Concluída</span>
        if (row.status_troca === 'PENDENTE') return <span style={{ color: '#dc2626', fontWeight: 'bold', backgroundColor: '#fef2f2', padding: '4px 8px', borderRadius: '4px', border: '1px solid #fca5a5' }}>Pendente</span>
        return <span style={{ color: '#16a34a', fontWeight: 'bold', display: 'flex', flexDirection: 'column' }}>✓ Recebido <span style={{fontSize: '0.7rem', color: '#64748b'}}>por {formatRecebedor(row.recebido_por)}</span></span>
      }
    },
    { header: 'Ações', render: (row) => {
        const isPendente = row.status_troca === 'PENDENTE' || row.status === 'PENDENTE';
        const detalhesFormatados = formatarValoresMovimentados(row.detalhes_troca);

        return (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={() => alert(`=== DETALHES DE VALORES FÍSICOS ===\n\n${detalhesFormatados}`)} style={{ background: 'none', border: 'none', color: '#0369a1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold', fontSize: '0.8rem' }}>
              <Info size={16} /> Ver
            </button>

            {isPendente && (
              <Button onClick={() => handleOpenReceive(row)} icon={CheckCircle} style={{ padding: '6px 10px', fontSize: '0.75rem', height: 'auto', backgroundColor: '#d97706', border: 'none' }}>
                Confirmar
              </Button>
            )}
            
            {user.role === 'ADMIN' && isPendente && (
              <button onClick={() => handleDelete(row.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }} title="Estornar/Apagar"><Trash2 size={18} /></button>
            )}
          </div>
        )
      }
    },
  ]

  if (isPageLoading) return <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 className="animate-spin" size={32} color="var(--color-primary)" /><span>Carregando...</span></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <style>{`
        .moeda-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
        .table-responsive-wrapper { overflow-x: auto; width: 100%; border-radius: 8px; }
        .notes-container { width: 100%; box-sizing: border-box; overflow: hidden; margin-bottom: 16px; }
        .notes-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 8px; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; width: 100%; box-sizing: border-box; background: #f8fafc; }
        .note-item { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
        .note-input { width: 100%; box-sizing: border-box; }
        .total-wrapper { margin-top: 12px; padding: 12px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; width: 100%; box-sizing: border-box; background-color: #e0f2fe; }
      `}</style>

      <div className="moeda-header">
        <div>
          <h1 style={{ fontSize: '1.875rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>Trocas Moedas</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Controle de créditos em caixa ou busca de moedas em rua.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Button variant="secondary" onClick={() => setIsSangriaModalOpen(true)} icon={ArrowDownCircle} style={{ borderColor: '#6366f1', color: '#6366f1' }}>Sangria de Moedas</Button>
          <Button onClick={() => setIsModalOpen(true)} icon={Plus}>Novo Registro</Button>
        </div>
      </div>

      <Card icon={CoinsIcon} title={user.role === 'ADMIN' ? "Auditoria de Trocas Moedas" : "Movimentações de Trocas Moedas do Turno"}>
        {user.role === 'ADMIN' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={18} color="var(--color-primary)"/> Filtrar do dia:
            </label>
            <input 
              type="date" 
              className="input-field" 
              style={{ padding: '8px 12px', fontSize: '0.9rem', cursor: 'pointer' }} 
              value={dataFiltro} 
              onChange={(e) => setDataFiltro(e.target.value)} 
            />
          </div>
        )}
        <div className="table-responsive-wrapper">
          <Table columns={columns} data={moedasList} emptyMessage="Nenhuma movimentação de moedas registrada." />
        </div>
      </Card>

      {/* MODAL 1: REGISTRO DE MOEDAS */}
      <Modal isOpen={isModalOpen} onClose={fecharModal} title="Registrar Movimentação de Moedas">
        <form onSubmit={handleSubmit(onSubmitCreate)} style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', boxSizing: 'border-box' }}>
          
          <div style={{ display: 'flex', gap: '12px', padding: '4px', backgroundColor: '#f1f5f9', borderRadius: '8px' }}>
            <button type="button" onClick={() => setTipoMoeda('CREDITO')} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: tipoMoeda === 'CREDITO' ? '#ffffff' : 'transparent', color: tipoMoeda === 'CREDITO' ? 'var(--color-primary)' : '#64748b', boxShadow: tipoMoeda === 'CREDITO' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>Crédito no Caixa</button>
            <button type="button" onClick={() => setTipoMoeda('EXTERNA')} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: tipoMoeda === 'EXTERNA' ? '#ffffff' : 'transparent', color: tipoMoeda === 'EXTERNA' ? 'var(--color-primary)' : '#64748b', boxShadow: tipoMoeda === 'EXTERNA' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>Troca Externa</button>
          </div>

          {tipoMoeda === 'CREDITO' && (
            <div className="notes-container">
              <label className="input-label" style={{ color: '#047857', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ArrowRightCircle size={16}/> Informe os valores (R$) em moedas pegas no Cofre:
              </label>
              <div className="notes-grid">
                {[1, 0.50, 0.25, 0.10, 0.05].map(moeda => (
                  <div key={moeda} className="note-item">
                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Em Moedas de ¢ {moeda.toFixed(2)}</label>
                    <input type="number" step="0.01" min="0" className="input-field note-input" value={moedasCredito[moeda] || ''} onChange={(e) => handleMoedaCreditoChange(moeda, e.target.value)} placeholder="0,00" />
                  </div>
                ))}
              </div>
              <div className="total-wrapper">
                <span style={{ fontWeight: 'bold', color: '#0369a1' }}>Crédito Total Gerado:</span>
                <span style={{ fontSize: '1.25rem', fontWeight: '900', color: '#0369a1' }}>R$ {totalCredito.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>
          )}

          {tipoMoeda === 'EXTERNA' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="input-wrapper">
                  <label htmlFor="origem" className="input-label">Origem do Valor</label>
                  <select id="origem" className="input-field" style={{ width: '100%' }} {...register('origem', { required: 'Selecione a origem' })}>
                    <option value="">Selecione...</option>
                    <option value="Caixa de Troco">Caixa de Troco</option>
                    <option value="Sangria de Depósito">Sangria Depósito</option>
                    <option value="Caixa Atual">Caixa Atual</option>
                  </select>
                </div>
                <div className="input-wrapper">
                  <label htmlFor="destino" className="input-label">Destino (Rua/Banco)</label>
                  <input type="text" id="destino" className="input-field" style={{ width: '100%' }} {...register('destino', { required: 'Obrigatório' })} placeholder="Ex: Baixinho" />
                </div>
              </div>

              {origemSelecionada === 'Caixa de Troco' && (
                <div className="notes-container">
                  <label className="input-label" style={{ color: '#be123c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ArrowRightCircle size={16}/> Notas retiradas do Cofre para levar à rua:
                  </label>
                  <div className="notes-grid">
                    {[200, 100, 50, 20, 10, 5, 2].map(nota => (
                      <div key={nota} className="note-item">
                        <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>R$ {nota}</label>
                        <input type="number" step="0.01" min="0" className="input-field note-input" value={notasSaida[nota] || ''} onChange={(e) => handleNotaSaidaChange(nota, e.target.value)} placeholder="0,00" />
                      </div>
                    ))}
                  </div>
                  <div className="total-wrapper">
                    <span style={{ fontWeight: 'bold', color: '#0369a1' }}>Total Retirado:</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: '900', color: '#0369a1' }}>R$ {totalNotasSaida.toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>
              )}

              {(origemSelecionada === 'Sangria de Depósito' || origemSelecionada === 'Caixa Atual') && (
                <FormInput label="Valor a ser Trocado (R$)" id="valor" type="number" step="0.01" placeholder="0,00" register={register('valor', { required: 'Obrigatório', min: 1 })} error={errors.valor} />
              )}
            </>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={fecharModal} style={{ width: '100%', justifyContent: 'center' }}>Cancelar</Button>
            <Button type="submit" isLoading={isActionLoading} style={{ width: '100%', justifyContent: 'center' }}>Registrar</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL NOVO: SANGRIA DE MOEDAS */}
      <Modal isOpen={isSangriaModalOpen} onClose={fecharModal} title="Sangria de Moedas (Caixa ➔ Cofre)">
        <form onSubmit={onSubmitSangria} style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ backgroundColor: '#eef2ff', padding: '16px', borderRadius: '8px', border: '1px solid #c7d2fe', color: '#312e81', fontSize: '0.85rem' }}>
            Transfira as moedas excedentes do seu <b>Caixa Atual</b> diretamente para o <b>Cofre Central</b> de forma rápida.
          </div>

          <div className="notes-container">
            <label className="input-label" style={{ color: '#4338ca', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ArrowDownCircle size={16}/> Informe os valores (R$) em moedas que serão enviadas:
            </label>
            <div className="notes-grid" style={{ backgroundColor: '#eef2ff', borderColor: '#c7d2fe' }}>
              {[1, 0.50, 0.25, 0.10, 0.05].map(moeda => (
                <div key={moeda} className="note-item">
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Em Moedas de ¢ {moeda.toFixed(2)}</label>
                  <input type="number" step="0.01" min="0" className="input-field note-input" value={moedasSangria[moeda] || ''} onChange={(e) => handleMoedaSangriaChange(moeda, e.target.value)} placeholder="0,00" />
                </div>
              ))}
            </div>
            <div className="total-wrapper" style={{ backgroundColor: '#c7d2fe' }}>
              <span style={{ fontWeight: 'bold', color: '#312e81' }}>Total a Enviar:</span>
              <span style={{ fontSize: '1.25rem', fontWeight: '900', color: '#312e81' }}>R$ {totalSangria.toFixed(2).replace('.', ',')}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={fecharModal} style={{ width: '100%', justifyContent: 'center' }}>Cancelar</Button>
            <Button type="submit" isLoading={isActionLoading} style={{ width: '100%', justifyContent: 'center', backgroundColor: '#4f46e5', border: 'none' }}>Registrar Sangria</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: RECEBIMENTO DA TROCA EXTERNA DE MOEDAS */}
      <Modal isOpen={isReceiveModalOpen} onClose={() => setIsReceiveModalOpen(false)} title="Confirmar Retorno de Moedas">
        <form onSubmit={onSubmitReceive} style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', boxSizing: 'border-box' }}>
          
          <div style={{ backgroundColor: '#eff6ff', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#1e40af', fontWeight: 'bold' }}>Valor Esperado da Rua</span>
            <div style={{ fontSize: '2rem', fontWeight: '900', color: '#1d4ed8' }}>R$ {receivingTroca?.valor?.toFixed(2).replace('.', ',')}</div>
          </div>

          {receivingTroca?.origem === 'Caixa de Troco' ? (
            <div className="notes-container">
              <label className="input-label" style={{ color: '#047857' }}><CheckCircle size={16} style={{ display: 'inline', verticalAlign: 'middle' }}/> Informe os valores (R$) em moedas que retornaram ao Cofre:</label>
              <div className="notes-grid">
                {[1, 0.50, 0.25, 0.10, 0.05].map(moeda => (
                  <div key={moeda} className="note-item">
                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>¢ {moeda.toFixed(2)}</label>
                    <input type="number" step="0.01" min="0" className="input-field note-input" value={moedasRec[moeda] || ''} onChange={(e) => handleMoedaRecChange(moeda, e.target.value)} placeholder="0,00" />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: isMatchRecebimento ? '#ecfdf5' : '#fef2f2', borderRadius: '8px', marginTop: '12px' }}>
                <span style={{ fontWeight: 'bold', color: isMatchRecebimento ? '#065f46' : '#991b1b' }}>Soma Apurada:</span>
                <span style={{ fontWeight: '900', fontSize: '1.2rem', color: isMatchRecebimento ? '#059669' : '#dc2626' }}>R$ {totalRecebimento.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>
          ) : (
            <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#334155' }}>
              Esta troca foi originada no seu <b>{receivingTroca?.origem}</b>.<br/><br/>
              Confirma o recebimento físico total em moedas? 
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsReceiveModalOpen(false)} style={{ width: '100%', justifyContent: 'center' }}>Cancelar</Button>
            <Button type="submit" isLoading={isActionLoading} style={{ width: '100%', justifyContent: 'center' }} disabled={receivingTroca?.origem === 'Caixa de Troco' && !isMatchRecebimento} icon={CheckCircle}>Confirmar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
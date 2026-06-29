import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../core/hooks/useAuth'
import { useDeposits } from '../../core/hooks/useDeposits'
import { Card } from '../../shared/components/cards/Card'
import { FormInput } from '../../shared/components/forms/FormInput'
import { Button } from '../../shared/components/buttons/Button'
import { Table } from '../../shared/components/tables/Table'
import { Modal } from '../../shared/components/modals/Modal'
import { ArrowLeftRight, Plus, Printer, Loader2, CheckCircle, Calendar, Pencil, Trash2, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'

const formatRecebedor = (raw) => {
  if (!raw) return 'Operador';
  if (typeof raw === 'string' && raw.includes('"recebido_por"')) {
    try { return JSON.parse(raw).recebido_por || 'Operador'; } catch (e) { return raw; }
  }
  return raw;
};

const formatDetalhes = (registro) => {
  if (registro.detalhes_troca && Object.keys(registro.detalhes_troca).length > 0) return registro.detalhes_troca;
  if (registro.recebido_por && typeof registro.recebido_por === 'string' && registro.recebido_por.includes('"detalhes_troca"')) {
    try { return JSON.parse(registro.recebido_por).detalhes_troca || null; } catch(e) {}
  }
  return null;
};

export const Exchanges = () => {
  const { user } = useAuth()
  const [dataFiltro, setDataFiltro] = useState(() => {
    const tzOffset = new Date().getTimezoneOffset() * 60000
    return new Date(Date.now() - tzOffset).toISOString().split('T')[0]
  })

  const { depositsList, isPageLoading, isActionLoading, carregarDepositos, salvarDeposito, excluirDeposito, receberTroca } = useDeposits(user, dataFiltro)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [tipoTroca, setTipoTroca] = useState('INTERNA')

  const [notas, setNotas] = useState({ 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0 })
  const [moedasValor, setMoedasValor] = useState('')

  const [notasIn, setNotasIn] = useState({ 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0 })
  const [moedasValorIn, setMoedasValorIn] = useState('')

  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false)
  const [receivingTroca, setReceivingTroca] = useState(null)
  const [notasRec, setNotasRec] = useState({ 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0 })
  const [moedasValorRec, setMoedasValorRec] = useState('')

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm()
  const origemSelecionada = watch('origem')

  useEffect(() => { carregarDepositos() }, [carregarDepositos])

  const trocasList = depositsList.filter(d => d.categoria === 'Troca (Caixa de Troco)' || d.categoria === 'Troca Externa')

  const handleNotaChange = (nota, valor) => { setNotas(prev => ({ ...prev, [nota]: parseFloat(valor) || 0 })) }
  const handleNotaInChange = (nota, valor) => { setNotasIn(prev => ({ ...prev, [nota]: parseFloat(valor) || 0 })) }
  const handleNotaRecChange = (nota, valor) => { setNotasRec(prev => ({ ...prev, [nota]: parseFloat(valor) || 0 })) }

  const valorCalculadoOut = Object.values(notas).reduce((acc, val) => acc + val, 0) + Number(moedasValor || 0)
  const valorCalculadoIn = Object.values(notasIn).reduce((acc, val) => acc + val, 0) + Number(moedasValorIn || 0)
  
  useEffect(() => {
    if (tipoTroca === 'INTERNA' || origemSelecionada === 'Caixa de Troco') {
      setValue('valor', valorCalculadoOut)
    }
  }, [notas, moedasValor, tipoTroca, origemSelecionada, setValue, valorCalculadoOut])

  const isMatchInterna = tipoTroca === 'INTERNA' ? (valorCalculadoOut === valorCalculadoIn && valorCalculadoOut > 0) : true;

  const somaRecebimento = Object.values(notasRec).reduce((acc, val) => acc + val, 0) + Number(moedasValorRec || 0)
  const isMatchRecebimento = receivingTroca && somaRecebimento.toFixed(2) === parseFloat(receivingTroca.valor).toFixed(2)

  const converterValoresParaQuantidades = (notasEmReais) => {
    const qtds = {};
    Object.entries(notasEmReais).forEach(([notaFace, valorTotal]) => {
      qtds[notaFace] = Math.round((Number(valorTotal) || 0) / Number(notaFace));
    });
    return qtds;
  }

  const handleEdit = (registro) => {
    alert("Trocas que envolvem notas do cofre não podem ser editadas, pois o dinheiro já foi retirado/adicionado fisicamente. Exclua e crie novamente se houver erro.")
  }

  const handleDelete = async (id) => {
    if (window.confirm('ATENÇÃO: Deseja apagar esta troca permanentemente? (Os valores NÃO serão estornados no cofre automaticamente)')) {
      await excluirDeposito(id)
    }
  }

  const fecharModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
    setNotas({ 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0 })
    setMoedasValor('')
    setNotasIn({ 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0 })
    setMoedasValorIn('')
    reset({ valor: '', origem: '', destino: '' })
    setTipoTroca('INTERNA')
  }

  const onSubmitCreate = async (data) => {
    const isCaixaTroco = tipoTroca === 'INTERNA' || data.origem === 'Caixa de Troco'
    const valorFinal = isCaixaTroco ? valorCalculadoOut : parseFloat(data.valor)

    if (isCaixaTroco && valorFinal <= 0) {
      alert("Informe os valores trocados.")
      return
    }

    if (tipoTroca === 'INTERNA' && !isMatchInterna) {
      alert("Os valores de Retirada e Entrada precisam ser exatamente iguais!")
      return
    }

    const notasOutEmQuantidade = converterValoresParaQuantidades(notas);
    const notasInEmQuantidade = tipoTroca === 'INTERNA' ? converterValoresParaQuantidades(notasIn) : null;

    const payload = {
      valor: valorFinal,
      value: valorFinal,
      categoria: tipoTroca === 'INTERNA' ? 'Troca (Caixa de Troco)' : 'Troca Externa',
      origem: tipoTroca === 'INTERNA' ? 'Caixa de Troco (Interna)' : data.origem,
      origin: tipoTroca === 'INTERNA' ? 'Caixa de Troco (Interna)' : data.origem,
      destino: tipoTroca === 'EXTERNA' ? data.destino : null,
      detalhes_troca: isCaixaTroco ? { 
        notas: notasOutEmQuantidade, 
        moedasValor: Number(moedasValor || 0),
        ...(tipoTroca === 'INTERNA' && {
          notasEntrada: notasInEmQuantidade,
          moedasValorEntrada: Number(moedasValorIn || 0)
        })
      } : null
    }

    if (!editingId) {
      payload.status_troca = tipoTroca === 'EXTERNA' ? 'PENDENTE' : 'CONCLUIDA'
      payload.responsavel_nome = user?.nome || 'Operador'
    }

    try {
      await salvarDeposito(payload, editingId)
      if (tipoTroca === 'EXTERNA' && data.origem === 'Caixa de Troco') {
        alert("Atenção: O dinheiro físico foi subtraído do Cofre. Quando o portador retornar da rua com o troco, você OBRIGATORIAMENTE deverá registrar o Recebimento para devolver o valor ao Caixa de Troco!")
      }
      fecharModal()
    } catch (e) {}
  }

  const handleOpenReceive = (troca) => {
    setReceivingTroca(troca)
    setNotasRec({ 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0 })
    setMoedasValorRec('')
    setIsReceiveModalOpen(true)
  }

  const onSubmitReceive = async (e) => {
    e.preventDefault()
    if (!isMatchRecebimento) return
    const notasRecEmQuantidade = converterValoresParaQuantidades(notasRec);
    await receberTroca(receivingTroca.id, {
      recebido_por: user?.nome || 'Operador',
      detalhes_troca: { notas: notasRecEmQuantidade, moedasValor: Number(moedasValorRec || 0) },
      valor_recebido: somaRecebimento
    }, receivingTroca)
    setIsReceiveModalOpen(false)
  }

  const imprimirComprovante = (registro) => {
    const dataObj = new Date(registro.created_at)
    const dataApenas = dataObj.toLocaleDateString('pt-BR')
    const horaApenas = dataObj.toLocaleTimeString('pt-BR')
    const valorFormatado = `R$ ${registro.valor.toFixed(2).replace('.', ',')}`
    const nomeOperador = registro.responsavel_nome || registro.users?.nome || 'Operador'

    const detalhesLimpos = formatDetalhes(registro)
    const recebedorLimpo = formatRecebedor(registro.recebido_por)

    let detalhesOutHtml = '';
    let detalhesInHtml = '';

    if (detalhesLimpos && detalhesLimpos.notas) {
      detalhesOutHtml = '<div class="divisor"></div><div class="bold" style="margin-bottom: 4px; color: #b91c1c;">[-] Retirado do Cofre:</div>';
      [200, 100, 50, 20, 10, 5, 2].forEach(n => {
        if (detalhesLimpos.notas[n] > 0) detalhesOutHtml += `<div>Notas R$ ${n}: R$ ${(detalhesLimpos.notas[n] * n).toFixed(2).replace('.',',')}</div>`
      });
      if (detalhesLimpos.moedasValor > 0) detalhesOutHtml += `<div>Moedas: R$ ${parseFloat(detalhesLimpos.moedasValor).toFixed(2).replace('.',',')}</div>`
      
      if (detalhesLimpos.notasEntrada) {
        detalhesInHtml = '<div class="divisor"></div><div class="bold" style="margin-bottom: 4px; color: #15803d;">[+] Colocado no Cofre:</div>';
        [200, 100, 50, 20, 10, 5, 2].forEach(n => {
          if (detalhesLimpos.notasEntrada[n] > 0) detalhesInHtml += `<div>Notas R$ ${n}: R$ ${(detalhesLimpos.notasEntrada[n] * n).toFixed(2).replace('.',',')}</div>`
        });
        if (detalhesLimpos.moedasValorEntrada > 0) detalhesInHtml += `<div>Moedas: R$ ${parseFloat(detalhesLimpos.moedasValorEntrada).toFixed(2).replace('.',',')}</div>`
      }
    }

    let conteudoCupom = '';

    if (registro.categoria === 'Troca (Caixa de Troco)') {
      conteudoCupom = `
        <html><head><style>@page { margin: 0; } body { font-family: 'Courier New', Courier, monospace; width: 76mm; margin: 0; padding: 5mm; font-size: 15px; } .center { text-align: center; } .bold { font-weight: bold; } .divisor { border-top: 1px dashed #000; margin: 10px 0; }</style></head>
        <body>
          <div class="center bold" style="font-size: 16px;">COMPROVANTE DE TROCA INTERNA</div>
          <div class="divisor"></div>
          <div><span class="bold">Data/Hora:</span> ${dataApenas} ${horaApenas}</div>
          <div><span class="bold">Usuário:</span> ${nomeOperador}</div>
          ${detalhesOutHtml}
          ${detalhesInHtml}
          <div class="divisor"></div>
          <div class="bold" style="font-size: 18px; text-align: center;">TOTAL TROCADO<br>${valorFormatado}</div>
          <div class="divisor"></div>
        </body></html>`;
    } else {
      conteudoCupom = `
        <html><head><style>@page { margin: 0; } body { font-family: 'Courier New', Courier, monospace; width: 76mm; margin: 0; padding: 5mm; font-size: 15px; } .center { text-align: center; } .bold { font-weight: bold; } .divisor { border-top: 1px dashed #000; margin: 10px 0; }</style></head>
        <body>
          <div class="center bold" style="font-size: 16px;">COMPROVANTE DE TROCA EXTERNA</div>
          <div class="divisor"></div>
          <div><span class="bold">Data Saída:</span> ${dataApenas} ${horaApenas}</div>
          <div><span class="bold">Origem:</span> ${registro.origem}</div>
          <div><span class="bold">Destino:</span> ${registro.destino}</div>
          ${!registro.recebido_por ? detalhesOutHtml : ''}
          <div class="divisor"></div>
          <div class="bold" style="font-size: 18px;">VALOR RETIRADO: ${valorFormatado}</div>
          <div class="divisor"></div><br>
          <div><span class="bold">Registrado (Saída):</span><br>${nomeOperador}</div><br>
          ${registro.recebido_por ? `
          <div class="divisor"></div>
          <div class="center bold">-- RETORNO DA TROCA --</div>
          ${detalhesOutHtml.replace('Retirado do Cofre', 'Recebido em Troco')}
          <div class="divisor"></div>
          <div><span class="bold">Recebido (Retorno):</span><br>${recebedorLimpo}</div><br><div class="center" style="font-size: 12px;">Entrada no Cofre: ${new Date(registro.recebido_em).toLocaleString('pt-BR')}</div>` : ''}
        </body></html>`;
    }

    const janelaImpressao = window.open('', '', 'width=300,height=400')
    janelaImpressao.document.write(conteudoCupom)
    janelaImpressao.document.close()
    janelaImpressao.focus()
    setTimeout(() => { janelaImpressao.print(); janelaImpressao.close() }, 250)
  }

  const columns = [
    { header: 'Data/Hora', render: (row) => new Date(row.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) },
    { header: 'Tipo', render: (row) => <span style={{ fontWeight: '600', color: row.categoria === 'Troca Externa' ? '#9333ea' : '#1d4ed8' }}>{row.categoria === 'Troca (Caixa de Troco)' ? 'Interna' : 'Externa'}</span> },
    { header: 'Destino/Origem', render: (row) => row.categoria === 'Troca Externa' ? <span style={{fontSize: '0.8rem'}}><b>{row.origem}</b> ➔ {row.destino}</span> : 'Caixa de Troco' },
    { header: 'Valor Trocado', render: (row) => <strong style={{ color: '#0f172a' }}>R$ {row.valor.toFixed(2).replace('.', ',')}</strong> },
    { header: 'Status', render: (row) => {
        if (row.categoria === 'Troca (Caixa de Troco)') return <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✓ Concluída</span>
        if (row.status_troca === 'PENDENTE') return <span style={{ color: '#d97706', fontWeight: 'bold' }}>⏳ Pendente</span>
        return <span style={{ color: '#16a34a', fontWeight: 'bold', display: 'flex', flexDirection: 'column' }}>✓ Recebido <span style={{fontSize: '0.7rem', color: '#64748b'}}>por {formatRecebedor(row.recebido_por)}</span></span>
      }
    },
    { header: 'Ações', render: (row) => (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => imprimirComprovante(row)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)' }} title="Imprimir Comprovante"><Printer size={20} /></button>
          
          {row.status_troca === 'PENDENTE' && (
            <Button onClick={() => handleOpenReceive(row)} icon={CheckCircle} style={{ padding: '6px 10px', fontSize: '0.75rem', height: 'auto', backgroundColor: '#d97706', border: 'none' }}>
              Receber Troco
            </Button>
          )}

          {user.role === 'ADMIN' && (
            <>
              <button onClick={() => handleEdit(row)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d97706' }}><Pencil size={18} /></button>
              <button onClick={() => handleDelete(row.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}><Trash2 size={18} /></button>
            </>
          )}
        </div>
      )
    },
  ]

  if (isPageLoading) return <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 className="animate-spin" size={32} color="var(--color-primary)" /><span>Carregando...</span></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <style>{`
        .troca-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
        .table-responsive-wrapper { overflow-x: auto; width: 100%; border-radius: 8px; }
        .notes-container { width: 100%; box-sizing: border-box; overflow: hidden; margin-bottom: 16px; }
        .notes-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 8px; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; width: 100%; box-sizing: border-box; }
        .notes-grid.out { background: #fff1f2; border-color: #fecdd3; }
        .notes-grid.in { background: #f0fdf4; border-color: #bbf7d0; }
        .note-item { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
        .note-input { width: 100%; box-sizing: border-box; }
        .total-wrapper { margin-top: 12px; padding: 12px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; width: 100%; box-sizing: border-box; }
        .total-wrapper.out { background-color: #ffe4e6; }
        .total-wrapper.in { background-color: #dcfce7; }
      `}</style>

      <div className="troca-header">
        <div>
          <h1 style={{ fontSize: '1.875rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>Trocas Dinheiro</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Controle de troca de dinheiro interno (Cofre) ou externo (Bancos).</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} icon={Plus}>Nova Troca</Button>
      </div>

      <Card icon={ArrowLeftRight} title={user.role === 'ADMIN' ? 'Auditoria de Trocas Dinheiro' : 'Trocas Dinheiro do Turno'}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          {user.role === 'ADMIN' && (
            <>
              <label style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={18} color="var(--color-primary)"/> Filtrar do dia:</label>
              <input type="date" className="input-field" style={{ padding: '8px 12px', fontSize: '0.9rem', cursor: 'pointer' }} value={dataFiltro} onChange={(e) => setDataFiltro(e.target.value)} />
            </>
          )}
        </div>
        <div className="table-responsive-wrapper">
          <Table columns={columns} data={trocasList} emptyMessage="Nenhuma troca registrada." />
        </div>
      </Card>

      {/* MODAL 1: REGISTRO DE TROCA (SAÍDA) */}
      <Modal isOpen={isModalOpen} onClose={fecharModal} title={editingId ? "Editar Troca" : "Registrar Nova Troca"}>
        <form onSubmit={handleSubmit(onSubmitCreate)} style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', boxSizing: 'border-box' }}>
          
          <div style={{ display: 'flex', gap: '12px', padding: '4px', backgroundColor: '#f1f5f9', borderRadius: '8px', width: '100%', boxSizing: 'border-box' }}>
            <button type="button" onClick={() => setTipoTroca('INTERNA')} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: tipoTroca === 'INTERNA' ? '#ffffff' : 'transparent', color: tipoTroca === 'INTERNA' ? 'var(--color-primary)' : '#64748b', boxShadow: tipoTroca === 'INTERNA' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}>Troca - Interna</button>
            <button type="button" onClick={() => setTipoTroca('EXTERNA')} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: tipoTroca === 'EXTERNA' ? '#ffffff' : 'transparent', color: tipoTroca === 'EXTERNA' ? 'var(--color-primary)' : '#64748b', boxShadow: tipoTroca === 'EXTERNA' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}>Troca - Externa</button>
          </div>

          {tipoTroca === 'EXTERNA' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
              <div className="input-wrapper" style={{ width: '100%', boxSizing: 'border-box' }}>
                <label htmlFor="origem" className="input-label">Origem do Valor</label>
                <select id="origem" className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} {...register('origem', { required: 'Selecione a origem' })}>
                  <option value="">Selecione...</option>
                  <option value="Caixa de Troco">Caixa de Troco (Cofre)</option>
                  <option value="Caixa atual">Caixa atual</option>
                  <option value="Sangria de Depósito">Sangria de Depósito</option>
                </select>
              </div>
              <div className="input-wrapper" style={{ width: '100%', boxSizing: 'border-box' }}>
                <label htmlFor="destino" className="input-label">Destino / Banco</label>
                <select id="destino" className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} {...register('destino', { required: 'Selecione o destino' })}>
                  <option value="">Selecione...</option>
                  <option value="Sicoob">Sicoob</option>
                  <option value="Sicredi">Sicredi</option>
                  <option value="Padaria/Rua">Padaria / Rua</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
            </div>
          )}

          {(tipoTroca === 'INTERNA' || origemSelecionada === 'Caixa de Troco') ? (
            <div className="notes-container">
              <label className="input-label" style={{ color: '#be123c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ArrowUpCircle size={16}/> {tipoTroca === 'INTERNA' ? "O que o operador está PEGANDO do Cofre:" : "Informe os valores retirados do cofre:"}
              </label>
              <div className="notes-grid out">
                {[200, 100, 50, 20, 10, 5, 2].map(nota => (
                  <div key={nota} className="note-item">
                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Em Notas de R$ {nota}</label>
                    <input type="number" step="0.01" min="0" className="input-field note-input" value={notas[nota] || ''} onChange={(e) => handleNotaChange(nota, e.target.value)} placeholder="0,00" />
                  </div>
                ))}
                <div className="note-item" style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Moedas (Valor Total R$)</label>
                  <input type="number" step="0.01" min="0" className="input-field note-input" value={moedasValor} onChange={(e) => setMoedasValor(e.target.value)} placeholder="0,00" />
                </div>
              </div>
              <div className="total-wrapper out">
                <span style={{ fontWeight: 'bold', color: '#9f1239' }}>Soma Retirada:</span>
                <span style={{ fontSize: '1.25rem', fontWeight: '900', color: '#9f1239' }}>R$ {valorCalculadoOut.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>
          ) : (
            <div style={{ width: '100%', boxSizing: 'border-box' }}>
              <FormInput label="Valor Retirado (R$)" id="valor" type="number" step="0.01" placeholder="0,00" register={register('valor', { required: 'Obrigatório', min: { value: 1, message: 'Mín. R$ 1,00' } })} error={errors.valor} />
            </div>
          )}

          {/* QUADRO EXTRA: O que o operador está COLOCANDO no cofre (Apenas Interna) */}
          {tipoTroca === 'INTERNA' && (
            <div className="notes-container">
              <label className="input-label" style={{ color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ArrowDownCircle size={16}/> O que o operador está DEVOLVENDO pro Cofre:
              </label>
              <div className="notes-grid in">
                {[200, 100, 50, 20, 10, 5, 2].map(nota => (
                  <div key={nota} className="note-item">
                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Em Notas de R$ {nota}</label>
                    <input type="number" step="0.01" min="0" className="input-field note-input" value={notasIn[nota] || ''} onChange={(e) => handleNotaInChange(nota, e.target.value)} placeholder="0,00" />
                  </div>
                ))}
                <div className="note-item" style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Moedas (Valor Total R$)</label>
                  <input type="number" step="0.01" min="0" className="input-field note-input" value={moedasValorIn} onChange={(e) => setMoedasValorIn(e.target.value)} placeholder="0,00" />
                </div>
              </div>
              <div className="total-wrapper in">
                <span style={{ fontWeight: 'bold', color: '#166534' }}>Soma Devolvida:</span>
                <span style={{ fontSize: '1.25rem', fontWeight: '900', color: '#166534' }}>R$ {valorCalculadoIn.toFixed(2).replace('.', ',')}</span>
              </div>
              
              {/* ALERTA DE DIVERGÊNCIA */}
              {!isMatchInterna && valorCalculadoOut > 0 && (
                 <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fef2f2', color: '#dc2626', fontSize: '0.85rem', borderRadius: '6px', textAlign: 'center', fontWeight: 'bold' }}>
                    A soma retirada (R$ {valorCalculadoOut.toFixed(2)}) e devolvida (R$ {valorCalculadoIn.toFixed(2)}) não batem!
                 </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px', width: '100%', boxSizing: 'border-box' }}>
            <Button type="button" variant="secondary" onClick={fecharModal} style={{ width: '100%', justifyContent: 'center' }}>Cancelar</Button>
            <Button type="submit" isLoading={isActionLoading} style={{ width: '100%', justifyContent: 'center' }} disabled={tipoTroca === 'INTERNA' && !isMatchInterna} icon={editingId ? Pencil : Plus}>
              {editingId ? "Salvar" : "Registrar"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: RECEBIMENTO DA TROCA EXTERNA (RETORNO) */}
      <Modal isOpen={isReceiveModalOpen} onClose={() => setIsReceiveModalOpen(false)} title="Confirmar Retorno da Troca">
        <form onSubmit={onSubmitReceive} style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', boxSizing: 'border-box' }}>
          
          <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '16px', borderRadius: '8px', textAlign: 'center', width: '100%', boxSizing: 'border-box' }}>
            <span style={{ fontSize: '0.85rem', color: '#1e40af', fontWeight: 'bold', textTransform: 'uppercase' }}>Valor Físico Aguardado</span>
            <div style={{ fontSize: '2rem', fontWeight: '900', color: '#1d4ed8' }}>
              R$ {receivingTroca?.valor?.toFixed(2).replace('.', ',')}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#1e40af', marginTop: '8px' }}>
              O registro retornará para o <b>Caixa de Troco</b> em nome de: <b>{user?.nome}</b>
            </div>
          </div>

          <div className="notes-container">
            <label className="input-label" style={{ color: '#047857', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle size={16}/> Informe os valores (R$) físicos que vieram da rua:
            </label>
            <div className="notes-grid in">
              {[200, 100, 50, 20, 10, 5, 2].map(nota => (
                <div key={nota} className="note-item">
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Em Notas de R$ {nota}</label>
                  <input type="number" step="0.01" min="0" className="input-field note-input" value={notasRec[nota] || ''} onChange={(e) => handleNotaRecChange(nota, e.target.value)} placeholder="0,00" />
                </div>
              ))}
              <div className="note-item" style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Moedas (Valor Total R$)</label>
                <input type="number" step="0.01" min="0" className="input-field note-input" value={moedasValorRec} onChange={(e) => setMoedasValorRec(e.target.value)} placeholder="0,00" />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: isMatchRecebimento ? '#ecfdf5' : '#fef2f2', borderRadius: '8px', width: '100%', boxSizing: 'border-box' }}>
            <span style={{ fontWeight: 'bold', color: isMatchRecebimento ? '#065f46' : '#991b1b' }}>Soma Apurada:</span>
            <span style={{ fontWeight: '900', fontSize: '1.2rem', color: isMatchRecebimento ? '#059669' : '#dc2626' }}>
              R$ {somaRecebimento.toFixed(2).replace('.', ',')}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px', width: '100%', boxSizing: 'border-box' }}>
            <Button type="button" variant="secondary" onClick={() => setIsReceiveModalOpen(false)} style={{ width: '100%', justifyContent: 'center' }}>Cancelar</Button>
            <Button type="submit" isLoading={isActionLoading} style={{ width: '100%', justifyContent: 'center' }} disabled={!isMatchRecebimento} icon={CheckCircle}>
              Confirmar Recebimento
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  )
}
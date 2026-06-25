import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../core/hooks/useAuth'
import { useDeposits } from '../../core/hooks/useDeposits'
import { Card } from '../../shared/components/cards/Card'
import { FormInput } from '../../shared/components/forms/FormInput'
import { Button } from '../../shared/components/buttons/Button'
import { Table } from '../../shared/components/tables/Table'
import { Modal } from '../../shared/components/modals/Modal'
import { ArrowLeftRight, Plus, Printer, Loader2, CheckCircle, Calendar, Pencil, Trash2 } from 'lucide-react'

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

  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false)
  const [receivingTroca, setReceivingTroca] = useState(null)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm()
  const { register: regRec, handleSubmit: handleSubRec, reset: resetRec, watch: watchRec } = useForm()

  useEffect(() => { carregarDepositos() }, [carregarDepositos])

  const trocasList = depositsList.filter(d => d.categoria === 'Troca (Caixa de Troco)' || d.categoria === 'Troca Externa')

  // --- CÁLCULO AUTOMÁTICO DO TOTAL ---
  const val2 = watch('valor_2'); const val5 = watch('valor_5'); const val10 = watch('valor_10'); const val20 = watch('valor_20'); const valM = watch('valor_moedas');
  useEffect(() => {
    if (tipoTroca === 'INTERNA') {
      const sum = (parseFloat(val2) || 0) + (parseFloat(val5) || 0) + (parseFloat(val10) || 0) + (parseFloat(val20) || 0) + (parseFloat(valM) || 0)
      setValue('valor', sum > 0 ? sum.toFixed(2) : '')
    }
  }, [val2, val5, val10, val20, valM, tipoTroca, setValue])

  const rVal2 = watchRec('valor_2'); const rVal5 = watchRec('valor_5'); const rVal10 = watchRec('valor_10'); const rVal20 = watchRec('valor_20'); const rValM = watchRec('valor_moedas');
  const somaRecebimento = (parseFloat(rVal2) || 0) + (parseFloat(rVal5) || 0) + (parseFloat(rVal10) || 0) + (parseFloat(rVal20) || 0) + (parseFloat(rValM) || 0)
  const isMatchRecebimento = receivingTroca && somaRecebimento.toFixed(2) === parseFloat(receivingTroca.valor).toFixed(2)

  // --- AÇÕES ADMIN ---
  const handleEdit = (registro) => {
    setEditingId(registro.id)
    const isExterna = registro.categoria === 'Troca Externa'
    setTipoTroca(isExterna ? 'EXTERNA' : 'INTERNA')
    
    setValue('valor', registro.valor)
    if (isExterna) {
      setValue('origem', registro.origem || '')
      setValue('destino', registro.destino || '')
    }

    const detalhesLimpos = formatDetalhes(registro)
    if (!isExterna && detalhesLimpos) {
      setValue('valor_2', detalhesLimpos.valor_2 || ''); setValue('valor_5', detalhesLimpos.valor_5 || '')
      setValue('valor_10', detalhesLimpos.valor_10 || ''); setValue('valor_20', detalhesLimpos.valor_20 || '')
      setValue('valor_moedas', detalhesLimpos.valor_moedas || '')
    } else {
      setValue('valor_2', ''); setValue('valor_5', ''); setValue('valor_10', ''); setValue('valor_20', ''); setValue('valor_moedas', '');
    }

    setIsModalOpen(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('ATENÇÃO: Você é um Administrador. Tem certeza que deseja apagar esta troca permanentemente?')) {
      await excluirDeposito(id)
    }
  }

  const fecharModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
    reset({ valor: '', origem: '', destino: '', valor_2: '', valor_5: '', valor_10: '', valor_20: '', valor_moedas: '' })
    setTipoTroca('INTERNA')
  }

  const onSubmitCreate = async (data) => {
    const payload = {
      valor: parseFloat(data.valor),
      value: parseFloat(data.valor),
      categoria: tipoTroca === 'INTERNA' ? 'Troca (Caixa de Troco)' : 'Troca Externa',
      origem: tipoTroca === 'INTERNA' ? 'Caixa de Troco' : data.origem,
      origin: tipoTroca === 'INTERNA' ? 'Caixa de Troco' : data.origem,
      destino: tipoTroca === 'EXTERNA' ? data.destino : null,
      detalhes_troca: tipoTroca === 'INTERNA' ? {
        valor_2: parseFloat(data.valor_2) || 0,
        valor_5: parseFloat(data.valor_5) || 0,
        valor_10: parseFloat(data.valor_10) || 0,
        valor_20: parseFloat(data.valor_20) || 0,
        valor_moedas: parseFloat(data.valor_moedas) || 0,
      } : null
    }

    if (!editingId) {
      payload.status_troca = tipoTroca === 'EXTERNA' ? 'PENDENTE' : 'CONCLUIDA'
      payload.responsavel_nome = user?.nome || 'Operador'
    }

    try {
      await salvarDeposito(payload, editingId)
      fecharModal()
    } catch (e) {}
  }

  const handleOpenReceive = (troca) => {
    setReceivingTroca(troca)
    resetRec({ valor_2: '', valor_5: '', valor_10: '', valor_20: '', valor_moedas: '' })
    setIsReceiveModalOpen(true)
  }

  const onSubmitReceive = async (data) => {
    if (!isMatchRecebimento) return
    
    await receberTroca(receivingTroca.id, {
      recebido_por: user?.nome || 'Operador',
      detalhes_troca: {
        valor_2: parseFloat(data.valor_2) || 0,
        valor_5: parseFloat(data.valor_5) || 0,
        valor_10: parseFloat(data.valor_10) || 0,
        valor_20: parseFloat(data.valor_20) || 0,
        valor_moedas: parseFloat(data.valor_moedas) || 0,
      }
    })
    setIsReceiveModalOpen(false)
  }

  // --- IMPRESSÃO ---
  const imprimirComprovante = (registro) => {
    const dataObj = new Date(registro.created_at)
    const dataApenas = dataObj.toLocaleDateString('pt-BR')
    const horaApenas = dataObj.toLocaleTimeString('pt-BR')
    const valorFormatado = `R$ ${registro.valor.toFixed(2).replace('.', ',')}`
    const nomeOperador = registro.responsavel_nome || registro.users?.nome || 'Operador'

    const detalhesLimpos = formatDetalhes(registro)
    const recebedorLimpo = formatRecebedor(registro.recebido_por)

    let detalhesHtml = '';
    if (detalhesLimpos) {
      const d = detalhesLimpos;
      detalhesHtml = `
        <div class="divisor"></div>
        <div class="bold" style="margin-bottom: 4px;">Composição do Valor:</div>
        ${d.valor_2 ? `<div>Notas R$ 2: R$ ${parseFloat(d.valor_2).toFixed(2).replace('.',',')}</div>` : ''}
        ${d.valor_5 ? `<div>Notas R$ 5: R$ ${parseFloat(d.valor_5).toFixed(2).replace('.',',')}</div>` : ''}
        ${d.valor_10 ? `<div>Notas R$ 10: R$ ${parseFloat(d.valor_10).toFixed(2).replace('.',',')}</div>` : ''}
        ${d.valor_20 ? `<div>Notas R$ 20: R$ ${parseFloat(d.valor_20).toFixed(2).replace('.',',')}</div>` : ''}
        ${d.valor_moedas ? `<div>Moedas: R$ ${parseFloat(d.valor_moedas).toFixed(2).replace('.',',')}</div>` : ''}
      `;
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
          <div><span class="bold">Origem:</span> Caixa de Troco</div>
          ${detalhesHtml}
          <div class="divisor"></div>
          <div class="bold" style="font-size: 18px;">TOTAL TROCADO: ${valorFormatado}</div>
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
          ${registro.recebido_por ? detalhesHtml : ''}
          <div class="divisor"></div>
          <div class="bold" style="font-size: 18px;">VALOR: ${valorFormatado}</div>
          <div class="divisor"></div><br>
          <div><span class="bold">Registrado (Saída):</span><br>${nomeOperador}</div><br>
          ${registro.recebido_por ? `<div><span class="bold">Recebido (Retorno):</span><br>${recebedorLimpo}</div><br><div class="center" style="font-size: 12px;">Baixa Sistêmica: ${new Date(registro.recebido_em).toLocaleString('pt-BR')}</div>` : ''}
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
        // Usa a função inteligente para limpar o nome
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
        .notas-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; width: 100%; }
        .notas-grid > div { min-width: 0; width: 100%; }
        .notas-grid > div:last-child { grid-column: span 2; }
        .table-responsive-wrapper { overflow-x: auto; width: 100%; border-radius: 8px; }
        @media (max-width: 480px) { .notas-grid { grid-template-columns: 1fr; } .notas-grid > div:last-child { grid-column: span 1; } }
      `}</style>

      <div className="troca-header">
        <div>
          <h1 style={{ fontSize: '1.875rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>Gestão de Trocas</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Controle de troca de dinheiro interno (Cofre) ou externo (Bancos).</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} icon={Plus}>Nova Troca</Button>
      </div>

      <Card icon={ArrowLeftRight} title={user.role === 'ADMIN' ? 'Auditoria de Trocas' : 'Trocas do Turno'}>
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

      <Modal isOpen={isModalOpen} onClose={fecharModal} title={editingId ? "Editar Troca" : "Registrar Nova Troca"}>
        <form onSubmit={handleSubmit(onSubmitCreate)} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', gap: '12px', padding: '4px', backgroundColor: '#f1f5f9', borderRadius: '8px' }}>
            <button type="button" onClick={() => setTipoTroca('INTERNA')} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: tipoTroca === 'INTERNA' ? '#ffffff' : 'transparent', color: tipoTroca === 'INTERNA' ? 'var(--color-primary)' : '#64748b', boxShadow: tipoTroca === 'INTERNA' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}>Troca - Interna</button>
            <button type="button" onClick={() => setTipoTroca('EXTERNA')} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: tipoTroca === 'EXTERNA' ? '#ffffff' : 'transparent', color: tipoTroca === 'EXTERNA' ? 'var(--color-primary)' : '#64748b', boxShadow: tipoTroca === 'EXTERNA' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}>Troca - Externa</button>
          </div>

          {tipoTroca === 'INTERNA' ? (
            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', width: '100%', boxSizing: 'border-box' }}>
              <p style={{ fontWeight: 'bold', marginBottom: '12px', fontSize: '0.9rem', color: 'var(--color-text-main)' }}>Valores retirados do Caixa de Troco (R$):</p>
              <div className="notas-grid">
                <div><FormInput label="Notas de R$ 2" id="valor_2" type="number" step="0.01" register={register('valor_2')} placeholder="0,00" /></div>
                <div><FormInput label="Notas de R$ 5" id="valor_5" type="number" step="0.01" register={register('valor_5')} placeholder="0,00" /></div>
                <div><FormInput label="Notas de R$ 10" id="valor_10" type="number" step="0.01" register={register('valor_10')} placeholder="0,00" /></div>
                <div><FormInput label="Notas de R$ 20" id="valor_20" type="number" step="0.01" register={register('valor_20')} placeholder="0,00" /></div>
                <div><FormInput label="Em Moedas" id="valor_moedas" type="number" step="0.01" register={register('valor_moedas')} placeholder="0,00" /></div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="input-wrapper">
                <label htmlFor="origem" className="input-label">Origem do Valor</label>
                <select id="origem" className="input-field" style={{ width: '100%' }} {...register('origem', { required: 'Selecione a origem' })}>
                  <option value="">Selecione...</option>
                  <option value="Caixa de Troco">Caixa de Troco</option>
                  <option value="Caixa atual">Caixa atual</option>
                  <option value="Sangria de Depósito">Sangria de Depósito</option>
                </select>
              </div>
              <div className="input-wrapper">
                <label htmlFor="destino" className="input-label">Destino / Banco</label>
                <select id="destino" className="input-field" style={{ width: '100%' }} {...register('destino', { required: 'Selecione o destino' })}>
                  <option value="">Selecione...</option>
                  <option value="Sicoob">Sicoob</option>
                  <option value="Sicredi">Sicredi</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
            </div>
          )}

          <FormInput
            label="Total Trocado (R$)" id="valor" type="number" step="0.01" placeholder="0,00"
            register={register('valor', { required: 'Obrigatório', min: { value: 1, message: 'Mín. R$ 1,00' } })}
            error={errors.valor} disabled={tipoTroca === 'INTERNA'}
          />

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={fecharModal} style={{ width: '100%', justifyContent: 'center' }}>Cancelar</Button>
            <Button type="submit" isLoading={isActionLoading} style={{ width: '100%', justifyContent: 'center' }} icon={editingId ? Pencil : Plus}>
              {editingId ? "Salvar" : "Registrar"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: RECEBIMENTO DA TROCA EXTERNA */}
      <Modal isOpen={isReceiveModalOpen} onClose={() => setIsReceiveModalOpen(false)} title="Confirmar Retorno da Troca">
        <form onSubmit={handleSubRec(onSubmitReceive)} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#1e40af', fontWeight: 'bold', textTransform: 'uppercase' }}>Valor Físico Aguardado</span>
            <div style={{ fontSize: '2rem', fontWeight: '900', color: '#1d4ed8' }}>
              R$ {receivingTroca?.valor?.toFixed(2).replace('.', ',')}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#1e40af', marginTop: '8px' }}>
              O registro será recebido automaticamente em nome de: <b>{user?.nome}</b>
            </div>
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', width: '100%', boxSizing: 'border-box' }}>
            <p style={{ fontWeight: 'bold', marginBottom: '12px', fontSize: '0.9rem', color: 'var(--color-text-main)' }}>Detalhamento da Entrada (R$):</p>
            <div className="notas-grid">
              <div><FormInput label="Notas de R$ 2" id="valor_2" type="number" step="0.01" register={regRec('valor_2')} /></div>
              <div><FormInput label="Notas de R$ 5" id="valor_5" type="number" step="0.01" register={regRec('valor_5')} /></div>
              <div><FormInput label="Notas de R$ 10" id="valor_10" type="number" step="0.01" register={regRec('valor_10')} /></div>
              <div><FormInput label="Notas de R$ 20" id="valor_20" type="number" step="0.01" register={regRec('valor_20')} /></div>
              <div><FormInput label="Em Moedas" id="valor_moedas" type="number" step="0.01" register={regRec('valor_moedas')} /></div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: isMatchRecebimento ? '#ecfdf5' : '#fef2f2', borderRadius: '8px' }}>
            <span style={{ fontWeight: 'bold', color: isMatchRecebimento ? '#065f46' : '#991b1b' }}>Soma Apurada:</span>
            <span style={{ fontWeight: '900', fontSize: '1.2rem', color: isMatchRecebimento ? '#059669' : '#dc2626' }}>
              R$ {somaRecebimento.toFixed(2).replace('.', ',')}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
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
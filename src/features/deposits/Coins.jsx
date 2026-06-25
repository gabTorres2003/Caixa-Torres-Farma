import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../core/hooks/useAuth'
import { useDeposits } from '../../core/hooks/useDeposits'
import { Card } from '../../shared/components/cards/Card'
import { FormInput } from '../../shared/components/forms/FormInput'
import { Button } from '../../shared/components/buttons/Button'
import { Table } from '../../shared/components/tables/Table'
import { Modal } from '../../shared/components/modals/Modal'
import { Coins as CoinsIcon, Plus, Printer, Loader2, CheckCircle, Calendar, Pencil, Trash2, ArrowRightCircle } from 'lucide-react'

const formatRecebedor = (raw) => {
  if (!raw) return 'Operador';
  if (typeof raw === 'string' && raw.includes('"recebido_por"')) {
    try { return JSON.parse(raw).recebido_por || 'Operador'; } catch (e) { return raw; }
  }
  return raw;
};

export const Coins = () => {
  const { user } = useAuth()
  const [dataFiltro, setDataFiltro] = useState(() => {
    const tzOffset = new Date().getTimezoneOffset() * 60000
    return new Date(Date.now() - tzOffset).toISOString().split('T')[0]
  })

  const { depositsList, isPageLoading, isActionLoading, carregarDepositos, salvarDeposito, excluirDeposito, receberTroca } = useDeposits(user, dataFiltro)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [tipoMoeda, setTipoMoeda] = useState('CREDITO') // CREDITO ou EXTERNA
  
  // Estados para as quantidades em R$
  const [moedasCredito, setMoedasCredito] = useState({ 1: 0, 0.5: 0, 0.25: 0, 0.1: 0, 0.05: 0 })
  const [notasSaida, setNotasSaida] = useState({ 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0 })
  const [moedasSangria, setMoedasSangria] = useState({ 1: 0, 0.5: 0, 0.25: 0, 0.1: 0, 0.05: 0 })
  
  const [fazerSangria, setFazerSangria] = useState(false)

  // Recebimento
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false)
  const [receivingTroca, setReceivingTroca] = useState(null)
  const [moedasRec, setMoedasRec] = useState({ 1: 0, 0.5: 0, 0.25: 0, 0.1: 0, 0.05: 0 })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm()
  const origemSelecionada = watch('origem')

  useEffect(() => { carregarDepositos() }, [carregarDepositos])

  const moedasList = depositsList.filter(d => d.categoria?.startsWith('Moedas'))

  // Cálculos Automáticos
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
    setMoedasCredito({ 1: 0, 0.5: 0, 0.25: 0, 0.1: 0, 0.05: 0 })
    setNotasSaida({ 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0 })
    setMoedasSangria({ 1: 0, 0.5: 0, 0.25: 0, 0.1: 0, 0.05: 0 })
    setFazerSangria(false)
    reset({ valor: '', origem: '', destino: '' })
    setTipoMoeda('CREDITO')
  }

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
    } else if (tipoMoeda === 'EXTERNA') {
      if (data.origem === 'Caixa de Troco') payload.detalhes_troca.notas = converterReaisParaQtd(notasSaida)
      if (data.origem === 'Caixa Atual' && fazerSangria) payload.detalhes_troca.moedasSangria = converterReaisParaQtd(moedasSangria)
    }

    try {
      await salvarDeposito(payload)
      fecharModal()
      if (tipoMoeda === 'EXTERNA' && data.origem === 'Caixa Atual' && fazerSangria) {
        alert("Não esqueça de registrar a sangria do total guardado no DNA.")
      }
    } catch (e) {}
  }

  const handleOpenReceive = (troca) => {
    setReceivingTroca(troca)
    setMoedasRec({ 1: 0, 0.5: 0, 0.25: 0, 0.1: 0, 0.05: 0 })
    setIsReceiveModalOpen(true)
  }

  const onSubmitReceive = async (e) => {
    e.preventDefault()
    
    // Se a origem foi "Caixa Atual" com Sangria de Moedas, ele apenas confirma. Se foi Caixa de Troco, ele digita.
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

  const columns = [
    { header: 'Data/Hora', render: (row) => new Date(row.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) },
    { header: 'Tipo', render: (row) => <span style={{ fontWeight: '600', color: row.categoria === 'Moedas (Crédito)' ? '#16a34a' : '#d97706' }}>{row.categoria === 'Moedas (Crédito)' ? 'Crédito' : 'Troca Externa'}</span> },
    { header: 'Destino/Origem', render: (row) => row.categoria === 'Moedas (Crédito)' ? 'Caixa de Troco ➔ Caixa' : <span style={{fontSize: '0.8rem'}}><b>{row.origem}</b> ➔ {row.destino}</span> },
    { header: 'Valor', render: (row) => <strong style={{ color: '#0f172a' }}>R$ {row.valor.toFixed(2).replace('.', ',')}</strong> },
    { header: 'Status', render: (row) => {
        if (row.categoria === 'Moedas (Crédito)') return <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✓ Concluída</span>
        if (row.status_troca === 'PENDENTE') return <span style={{ color: '#d97706', fontWeight: 'bold' }}>⏳ Pendente</span>
        return <span style={{ color: '#16a34a', fontWeight: 'bold', display: 'flex', flexDirection: 'column' }}>✓ Recebido <span style={{fontSize: '0.7rem', color: '#64748b'}}>por {formatRecebedor(row.recebido_por)}</span></span>
      }
    },
    { header: 'Ações', render: (row) => (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {row.status_troca === 'PENDENTE' && (
            <Button onClick={() => handleOpenReceive(row)} icon={CheckCircle} style={{ padding: '6px 10px', fontSize: '0.75rem', height: 'auto', backgroundColor: '#d97706', border: 'none' }}>
              Confirmar
            </Button>
          )}
          {user.role === 'ADMIN' && <button onClick={() => excluirDeposito(row.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}><Trash2 size={18} /></button>}
        </div>
      )
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
          <h1 style={{ fontSize: '1.875rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>Moedas</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Controle de créditos em caixa ou busca de moedas em rua.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} icon={Plus}>Novo Registro</Button>
      </div>

      <Card icon={CoinsIcon} title="Movimentações de Moedas do Turno">
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
                  <label htmlFor="destino" className="input-label">Destino (Rua/Banco/Pessoa)</label>
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

              {origemSelecionada === 'Caixa Atual' && (
                <div style={{ backgroundColor: '#fffbeb', padding: '12px', borderRadius: '8px', border: '1px solid #fde68a', marginTop: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: '#92400e', cursor: 'pointer' }}>
                    <input type="checkbox" checked={fazerSangria} onChange={e => setFazerSangria(e.target.checked)} style={{ width: '18px', height: '18px' }} />
                    Fazer sangria para guardar as moedas no Cofre?
                  </label>
                  
                  {fazerSangria && (
                    <div className="notes-container" style={{ marginTop: '12px' }}>
                      <label className="input-label">Informe os valores (R$) em moedas que ficarão no cofre:</label>
                      <div className="notes-grid">
                        {[1, 0.50, 0.25, 0.10, 0.05].map(moeda => (
                          <div key={moeda} className="note-item">
                            <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>¢ {moeda.toFixed(2)}</label>
                            <input type="number" step="0.01" min="0" className="input-field note-input" value={moedasSangria[moeda] || ''} onChange={(e) => handleMoedaSangriaChange(moeda, e.target.value)} placeholder="0,00" />
                          </div>
                        ))}
                      </div>
                      <div className="total-wrapper">
                        <span style={{ fontWeight: 'bold' }}>Total Guardado:</span>
                        <span style={{ fontSize: '1.1rem', fontWeight: '900' }}>R$ {totalSangria.toFixed(2).replace('.', ',')}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={fecharModal} style={{ width: '100%', justifyContent: 'center' }}>Cancelar</Button>
            <Button type="submit" isLoading={isActionLoading} style={{ width: '100%', justifyContent: 'center' }}>Registrar</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: RECEBIMENTO DA TROCA EXTERNA DE MOEDAS */}
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
              {receivingTroca?.detalhes_troca?.moedasSangria && <b> As moedas marcadas como Sangria serão automaticamente inseridas no Cofre Central.</b>}
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
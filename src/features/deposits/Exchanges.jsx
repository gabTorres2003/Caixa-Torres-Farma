import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../core/hooks/useAuth'
import { useDeposits } from '../../core/hooks/useDeposits'
import { Card } from '../../shared/components/cards/Card'
import { FormInput } from '../../shared/components/forms/FormInput'
import { Button } from '../../shared/components/buttons/Button'
import { Table } from '../../shared/components/tables/Table'
import { Modal } from '../../shared/components/modals/Modal'
import { ArrowLeftRight, Plus, Printer, Loader2, CheckCircle, Calendar } from 'lucide-react'

export const Exchanges = () => {
  const { user } = useAuth()
  const [dataFiltro, setDataFiltro] = useState(() => {
    const tzOffset = new Date().getTimezoneOffset() * 60000
    return new Date(Date.now() - tzOffset).toISOString().split('T')[0]
  })

  const { depositsList, isPageLoading, isActionLoading, carregarDepositos, salvarDeposito, receberTroca } = useDeposits(user, dataFiltro)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [tipoTroca, setTipoTroca] = useState('INTERNA') // 'INTERNA' ou 'EXTERNA'

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { carregarDepositos() }, [carregarDepositos])

  // Filtra a lista mista do banco para exibir apenas as trocas
  const trocasList = depositsList.filter(d => d.categoria === 'Troca (Caixa de Troco)' || d.categoria === 'Troca Externa')

  const fecharModal = () => {
    setIsModalOpen(false)
    reset({ valor: '', destino: '' })
  }

  const onSubmit = async (data) => {
    const payload = {
      valor: parseFloat(data.valor),
      value: parseFloat(data.valor),
      categoria: tipoTroca === 'INTERNA' ? 'Troca (Caixa de Troco)' : 'Troca Externa',
      origem: tipoTroca === 'INTERNA' ? 'Caixa de Troco' : 'Troca Externa', // Preenchimento seguro para o DB
      origin: tipoTroca === 'INTERNA' ? 'Caixa de Troco' : 'Troca Externa',
      destino: tipoTroca === 'EXTERNA' ? data.destino : null,
      status_troca: tipoTroca === 'EXTERNA' ? 'PENDENTE' : 'CONCLUIDA',
      responsavel_nome: user?.nome || 'Operador',
    }

    try {
      await salvarDeposito(payload)
      fecharModal()
    } catch (e) { /* Tratado no Hook */ }
  }

  const handleReceber = async (id) => {
    const nome = window.prompt('Digite o nome da pessoa que trouxe/recebeu o dinheiro trocado:')
    if (nome && nome.trim() !== '') {
      await receberTroca(id, nome)
    }
  }

  const imprimirComprovante = (registro) => {
    const dataObj = new Date(registro.created_at)
    const dataApenas = dataObj.toLocaleDateString('pt-BR')
    const horaApenas = dataObj.toLocaleTimeString('pt-BR')
    const valorFormatado = `R$ ${registro.valor.toFixed(2).replace('.', ',')}`
    const nomeOperador = registro.responsavel_nome || registro.users?.nome || 'Operador'

    let infoDestinoOrigem = ''
    if (registro.categoria === 'Troca Externa') {
      infoDestinoOrigem = `<div><span class="bold">Destino / Banco:</span> ${registro.destino}</div>`
    } else {
      infoDestinoOrigem = `<div><span class="bold">Origem:</span> Caixa de Troco</div>`
    }

    const recebedor = registro.recebido_por ? registro.recebido_por : '_________________________________';

    const conteudoCupom = `
      <html>
        <head>
          <style>
            @page { margin: 0; }
            body { font-family: 'Courier New', Courier, monospace; width: 76mm; margin: 0; padding: 5mm; font-size: 15px; color: #000; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .title { font-size: 16px; font-weight: bold; }
            .divisor { border-top: 1px dashed #000; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="center title">MARCIO GABRIEL TORRES</div>
          <div class="center title">DROGARIA EIRELI</div>
          <div class="center">CNPJ: 23.584.239/0001-51</div>
          <br>
          <div class="center bold">COMPROVANTE DE TROCA</div>
          <div class="divisor"></div>
          <div><span class="bold">Data Emissão:</span> ${dataApenas}</div>
          <div><span class="bold">Hora:</span> ${horaApenas}</div>
          <div><span class="bold">Tipo:</span> ${registro.categoria}</div>
          ${infoDestinoOrigem}
          <div class="divisor"></div>
          <div class="bold" style="font-size: 18px;">VALOR: ${valorFormatado}</div>
          <div class="divisor"></div>
          <br><br>
          <div><span class="bold">Registrado por (Saída):</span><br>${nomeOperador}</div>
          <br><br>
          <div><span class="bold">Recebido por (Retorno):</span><br>${recebedor}</div>
          <br><br>
          ${!registro.recebido_por ? '<div class="center" style="font-size: 12px;">(Assinatura Física)</div>' : `<div class="center" style="font-size: 12px;">(Baixa Sistêmica: ${new Date(registro.recebido_em).toLocaleString('pt-BR')})</div>`}
          <br><br>
        </body>
      </html>
    `

    const janelaImpressao = window.open('', '', 'width=300,height=400')
    janelaImpressao.document.write(conteudoCupom)
    janelaImpressao.document.close()
    janelaImpressao.focus()
    setTimeout(() => { janelaImpressao.print(); janelaImpressao.close() }, 250)
  }

  const columns = [
    { header: 'Data/Hora', render: (row) => new Date(row.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) },
    { header: 'Tipo', render: (row) => <span style={{ fontWeight: '600', color: row.categoria === 'Troca Externa' ? '#9333ea' : '#1d4ed8' }}>{row.categoria === 'Troca (Caixa de Troco)' ? 'Interna' : 'Externa'}</span> },
    { header: 'Destino/Origem', render: (row) => row.categoria === 'Troca Externa' ? row.destino : 'Caixa de Troco' },
    { header: 'Valor Trocado', render: (row) => <strong style={{ color: '#0f172a' }}>R$ {row.valor.toFixed(2).replace('.', ',')}</strong> },
    { header: 'Status', render: (row) => {
        if (row.categoria === 'Troca (Caixa de Troco)') return <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✓ Concluída</span>
        if (row.status_troca === 'PENDENTE') return <span style={{ color: '#d97706', fontWeight: 'bold' }}>⏳ Pendente</span>
        return <span style={{ color: '#16a34a', fontWeight: 'bold', display: 'flex', flexDirection: 'column' }}>✓ Recebido <span style={{fontSize: '0.7rem', color: '#64748b'}}>por {row.recebido_por}</span></span>
      }
    },
    { header: 'Ações', render: (row) => (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => imprimirComprovante(row)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)' }} title="Imprimir Comprovante"><Printer size={20} /></button>
          {row.status_troca === 'PENDENTE' && (
            <Button onClick={() => handleReceber(row.id)} icon={CheckCircle} style={{ padding: '6px 10px', fontSize: '0.75rem', height: 'auto', backgroundColor: '#d97706', border: 'none' }}>
              Receber Troco
            </Button>
          )}
        </div>
      )
    },
  ]

  if (isPageLoading) return <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}><Loader2 className="animate-spin" size={32} color="var(--color-primary)" /><span>Carregando trocas...</span></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>Gestão de Trocas</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Controle de troca de dinheiro interno (Cofre) ou externo (Bancos).</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} icon={Plus}>Nova Troca</Button>
      </div>

      <Card icon={ArrowLeftRight} title={user.role === 'ADMIN' ? 'Auditoria de Trocas' : 'Trocas do Turno'}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            {user.role === 'ADMIN' ? (
            <>
              <label style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={18} color="var(--color-primary)"/> Filtrar Operações do dia:
              </label>
              <input type="date" className="input-field" style={{ padding: '8px 12px', fontSize: '0.9rem', cursor: 'pointer' }} value={dataFiltro} onChange={(e) => setDataFiltro(e.target.value)} />
            </>
          ) : (
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Mostrando resultados do turno de hoje.</span>
          )}
        </div>
        <div style={{ overflowX: 'auto', width: '100%', borderRadius: '8px' }}>
          <Table columns={columns} data={trocasList} emptyMessage="Nenhuma troca registrada." />
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={fecharModal} title="Registrar Nova Troca">
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', gap: '12px', padding: '4px', backgroundColor: '#f1f5f9', borderRadius: '8px' }}>
            <button 
              type="button" onClick={() => setTipoTroca('INTERNA')}
              style={{ flex: 1, padding: '10px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: tipoTroca === 'INTERNA' ? '#ffffff' : 'transparent', color: tipoTroca === 'INTERNA' ? 'var(--color-primary)' : '#64748b', boxShadow: tipoTroca === 'INTERNA' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}
            >
              Troca - Caixa Troco
            </button>
            <button 
              type="button" onClick={() => setTipoTroca('EXTERNA')}
              style={{ flex: 1, padding: '10px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: tipoTroca === 'EXTERNA' ? '#ffffff' : 'transparent', color: tipoTroca === 'EXTERNA' ? 'var(--color-primary)' : '#64748b', boxShadow: tipoTroca === 'EXTERNA' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}
            >
              Troca - Externa
            </button>
          </div>

          <FormInput
            label="Valor Trocado (R$)" id="valor" type="number" step="0.01" placeholder="0,00"
            register={register('valor', { required: 'O valor é obrigatório', min: { value: 1, message: 'Valor mínimo R$ 1,00' } })}
            error={errors.valor}
          />

          {tipoTroca === 'INTERNA' ? (
            <div className="input-wrapper">
              <label className="input-label">Origem</label>
              <input type="text" className="input-field" style={{ backgroundColor: '#e2e8f0', color: '#64748b', cursor: 'not-allowed', fontWeight: 'bold' }} value="Caixa de Troco" readOnly disabled />
            </div>
          ) : (
            <div className="input-wrapper">
              <label htmlFor="destino" className="input-label">Destino da Troca</label>
              <select id="destino" className="input-field" style={{ width: '100%' }} {...register('destino', { required: tipoTroca === 'EXTERNA' ? 'Selecione o destino' : false })}>
                <option value="">Selecione...</option>
                <option value="Sicoob">Sicoob</option>
                <option value="Sicredi">Sicredi</option>
                <option value="Outros">Outros</option>
              </select>
              {errors.destino && <span className="input-error-text" style={{ color: 'var(--color-error)', fontSize: '0.75rem', marginTop: '4px' }}>{errors.destino.message}</span>}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexDirection: window.innerWidth <= 768 ? 'column' : 'row' }}>
            <Button type="button" variant="secondary" onClick={fecharModal} style={{ width: '100%', justifyContent: 'center' }}>Cancelar</Button>
            <Button type="submit" isLoading={isActionLoading} style={{ width: '100%', justifyContent: 'center' }}>Registrar Troca</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
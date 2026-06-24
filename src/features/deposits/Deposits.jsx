import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../core/hooks/useAuth'
import { useDeposits } from '../../core/hooks/useDeposits'

import { Card } from '../../shared/components/cards/Card'
import { FormInput } from '../../shared/components/forms/FormInput'
import { Button } from '../../shared/components/buttons/Button'
import { Table } from '../../shared/components/tables/Table'
import { Modal } from '../../shared/components/modals/Modal'
import { Banknote, Plus, Calendar, FileText, Loader2, Printer, Pencil, Trash2 } from 'lucide-react'

export const Deposits = () => {
  const { user } = useAuth()

  // Estado do Filtro de Data (Por padrão começa "hoje")
  const [dataFiltro, setDataFiltro] = useState(() => {
    const tzOffset = new Date().getTimezoneOffset() * 60000
    return new Date(Date.now() - tzOffset).toISOString().split('T')[0]
  })

  // Hook isolado que traz toda a lógica e controle de acesso
  const { depositsList, isPageLoading, isActionLoading, carregarDepositos, salvarDeposito, excluirDeposito } = useDeposits(user, dataFiltro)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm()

  useEffect(() => {
    carregarDepositos()
  }, [carregarDepositos])

  const totalDepositos = depositsList
    .filter((d) => d.categoria === 'Depósito' || !d.categoria)
    .reduce((acc, curr) => acc + Number(curr.valor), 0)

  // --- AÇÕES ADMIN: EDITAR / DELETAR ---
  const handleEdit = (registro) => {
    setEditingId(registro.id)
    setValue('valor', registro.valor)
    setValue('origem', registro.origem)
    setValue('data_caixa', registro.data_caixa)
    setIsModalOpen(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('ATENÇÃO: Você é um Administrador. Tem certeza que deseja apagar esse registro de movimentação permanentemente?')) {
      await excluirDeposito(id)
    }
  }

  const fecharModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
    reset({ valor: '', origem: '', data_caixa: '' })
  }

  const onSubmit = async (data) => {
    const payload = {
      valor: parseFloat(data.valor),
      value: parseFloat(data.valor),
      origem: data.origem,
      origin: data.origem,
      categoria: 'Depósito',
      data_caixa: data.data_caixa,
      responsavel_nome: user?.nome || 'Operador',
    }

    try {
      await salvarDeposito(payload, editingId)
      fecharModal()
    } catch (e) {
    }
  }

  // --- FUNÇÕES DE IMPRESSÃO ---
  const imprimirComprovante = (registro) => {
    const dataObj = new Date(registro.created_at)
    const dataApenas = dataObj.toLocaleDateString('pt-BR')
    const horaApenas = dataObj.toLocaleTimeString('pt-BR')

    const valorFormatado = `R$ ${registro.valor.toFixed(2).replace('.', ',')}`
    const nomeOperador = registro.responsavel_nome || registro.users?.nome || 'Operador'
      
    const origemComData = registro.data_caixa 
      ? `${registro.origem} - ${new Date(registro.data_caixa + 'T00:00:00').toLocaleDateString('pt-BR')}`
      : registro.origem

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
          <div class="center bold">COMPROVANTE DE MOVIMENTACAO</div>
          <div class="divisor"></div>
          <div><span class="bold">Data Emissão:</span> ${dataApenas}</div>
          <div><span class="bold">Hora:</span> ${horaApenas}</div>
          <div><span class="bold">Categoria:</span> ${registro.categoria || 'Depósito'}</div>
          <div><span class="bold">Origem:</span> ${origemComData}</div>
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

  const imprimirFechamentoDiario = () => {
    const dataAtual = new Date()
    const dataApenas = dataAtual.toLocaleDateString('pt-BR')
    const horaApenas = dataAtual.toLocaleTimeString('pt-BR')

    const valorFormatado = `R$ ${totalDepositos.toFixed(2).replace('.', ',')}`
    const nomeOperador = user?.nome || 'Operador'

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
          <div class="center bold">FECHAMENTO DE DEPOSITOS</div>
          <div class="divisor"></div>
          <div><span class="bold">Data Ref.:</span> ${dataFiltro.split('-').reverse().join('/')}</div>
          <div><span class="bold">Emitido em:</span> ${dataApenas} ${horaApenas}</div>
          <div><span class="bold">Operador:</span> ${nomeOperador}</div>
          <div class="divisor"></div>
          <div class="center bold" style="font-size: 18px; margin: 10px 0;">
            TOTAL: ${valorFormatado}
          </div>
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

  // --- COLUNAS DA TABELA (Dinâmica por Papel) ---
  const columns = [
    {
      header: 'Data e Hora',
      render: (row) => new Date(row.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    },
    {
      header: 'Origem / Caixa',
      render: (row) => (
        <div>
          <strong style={{ color: 'var(--color-primary)' }}>{row.origem}</strong>
          {row.data_caixa && (
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Ref: {new Date(row.data_caixa + 'T00:00:00').toLocaleDateString('pt-BR')}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Responsável',
      render: (row) => row.responsavel_nome || row.users?.nome || 'Operador',
    },
    {
      header: 'Valor Retirado',
      render: (row) => <strong style={{ color: '#dc2626' }}>R$ {row.valor.toFixed(2).replace('.', ',')}</strong>,
    },
    {
      header: 'Categoria',
      render: (row) => (
        <span style={{ padding: '4px 8px', backgroundColor: row.categoria === 'Troca (Caixa de Troco)' ? '#eff6ff' : '#ecfdf5', color: row.categoria === 'Troca (Caixa de Troco)' ? '#1d4ed8' : 'var(--color-success)', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600' }}>
          {row.categoria || 'Depósito'}
        </span>
      ),
    },
    {
      header: 'Ações',
      render: (row) => (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button onClick={() => imprimirComprovante(row)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)' }} title="Imprimir Comprovante">
            <Printer size={20} />
          </button>
          
          {/* BOTÕES EXCLUSIVOS PARA O ADMINISTRADOR */}
          {user.role === 'ADMIN' && (
            <>
              <button onClick={() => handleEdit(row)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d97706' }} title="Editar Registro">
                <Pencil size={18} />
              </button>
              <button onClick={() => handleDelete(row.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }} title="Deletar Registro">
                <Trash2 size={18} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ]

  if (isPageLoading) {
    return <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}><Loader2 className="animate-spin" size={32} color="var(--color-primary)" /><span>Carregando movimentações do cofre...</span></div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Cabeçalho da Tela */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>Depósito / Trocas Financeiras</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Controle de retiradas de valores da gaveta para o cofre seguro.</p>
        </div>
        <div style={{ width: 'auto' }}>
          <Button onClick={() => setIsModalOpen(true)} icon={Plus}>Depósito</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        <Card title={user.role === 'ADMIN' ? 'Auditoria de Retiradas' : 'Retiradas Realizadas (Turno Atual)'} icon={Banknote}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            
            {/* FILTRO DE DATA EXCLUSIVO DO ADMIN */}
            <div>
              {user.role === 'ADMIN' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={18} color="var(--color-primary)"/> Consultar Operações do dia:
                  </label>
                  <input type="date" className="input-field" style={{ padding: '8px 12px', fontSize: '0.9rem', cursor: 'pointer' }} value={dataFiltro} onChange={(e) => setDataFiltro(e.target.value)} />
                </div>
              ) : (
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Mostrando resultados do turno de hoje.</span>
              )}
            </div>

            {/* Bloco de Totais */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', backgroundColor: '#f8fafc', padding: '16px 24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                  Total {user.role === 'ADMIN' ? 'Filtrado' : 'no Turno'}
                </span>
                <span style={{ fontSize: '1.875rem', fontWeight: '800', color: 'var(--color-primary)', lineHeight: '1', whiteSpace: 'nowrap' }}>
                  R$ {totalDepositos.toFixed(2).replace('.', ',')}
                </span>
              </div>
              <div style={{ width: '1px', height: '48px', backgroundColor: '#cbd5e1' }}></div>
              <Button onClick={imprimirFechamentoDiario} icon={Printer} type="button">
                Imprimir Total
              </Button>
            </div>
          </div>

          <Table columns={columns} data={depositsList} emptyMessage={user.role === 'ADMIN' ? "Nenhum depósito encontrado na data selecionada." : "Nenhum depósito realizado neste turno."} />
        </Card>
      </div>

      {/* MODAL PARA REGISTRO/EDIÇÃO */}
      <Modal isOpen={isModalOpen} onClose={fecharModal} title={editingId ? "Editar Registro de Depósito" : "Registrar Novo Depósito"}>
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {!editingId && (
            <div style={{ padding: '12px', backgroundColor: '#fffbeb', borderRadius: 'var(--radius-md)', border: '1px solid #fde68a', fontSize: '0.875rem', color: '#b45309' }}>
              ⚠️ Certifique-se de recolher o dinheiro físico e envolvê-lo no envelope correto antes de confirmar.
            </div>
          )}

          <FormInput
            label="Valor da Retirada (R$)"
            id="valor"
            type="number"
            step="0.01"
            placeholder="0,00"
            register={register('valor', { required: 'O valor é obrigatório', min: { value: 1, message: 'O valor mínimo para sangria é R$ 1,00' } })}
            error={errors.valor}
          />

          <div className="input-wrapper">
            <label htmlFor="origem" className="input-label">Origem do Valor (Caixa)</label>
            <select id="origem" className={`input-field ${errors.origem ? 'error' : ''}`} style={{ width: '100%' }} {...register('origem', { required: 'A origem do dinheiro é obrigatória' })}>
              <option value="">Selecione...</option>
              <option value="Caixa Jô">Caixa Jô</option>
              <option value="Caixa Gabriel">Caixa Gabriel</option>
              <option value="Caixa Ana">Caixa Ana</option>
              <option value="Caixa Bruna">Caixa Bruna</option>
              <option value="Caixa de Troco">Caixa de Troco</option>
            </select>
            {errors.origem && <span className="input-error-text" style={{ color: 'var(--color-error)', fontSize: '0.75rem', marginTop: '4px' }}>{errors.origem.message}</span>}
          </div>

          <div className="input-wrapper">
            <label htmlFor="data_caixa" className="input-label">Data Referente ao Caixa</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input id="data_caixa" type="date" className={`input-field ${errors.data_caixa ? 'error' : ''}`} style={{ width: '100%' }} {...register('data_caixa', { required: 'A data do caixa é obrigatória' })} />
            </div>
            {errors.data_caixa && <span className="input-error-text" style={{ color: 'var(--color-error)', fontSize: '0.75rem', marginTop: '4px' }}>{errors.data_caixa.message}</span>}
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={fecharModal}>Cancelar</Button>
            <Button type="submit" isLoading={isActionLoading} icon={editingId ? Pencil : FileText}>
              {editingId ? "Salvar Alterações" : "Confirmar Retirada"}
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  )
}
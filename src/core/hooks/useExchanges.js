import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useDeposits } from './useDeposits' 

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

export const useExchanges = (user, dataFiltro) => {
  const { depositsList, isPageLoading, isActionLoading, carregarDepositos, salvarDeposito, excluirDeposito, receberTroca } = useDeposits(user, dataFiltro)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [tipoTroca, setTipoTroca] = useState('INTERNA') // INTERNA | EXTERNA | TEMPORARIA

  const [notas, setNotas] = useState({ 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0 })
  const [notasIn, setNotasIn] = useState({ 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0 })

  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false)
  const [receivingTroca, setReceivingTroca] = useState(null)
  const [notasRec, setNotasRec] = useState({ 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0 })

  const formProps = useForm()
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = formProps
  const origemSelecionada = watch('origem')
  const destinoSelecionado = watch('destino')

  useEffect(() => { carregarDepositos() }, [carregarDepositos])

  const trocasList = depositsList.filter(d => d.categoria === 'Troca (Caixa de Troco)' || d.categoria === 'Troca Externa' || d.categoria === 'Troca Temporária')

  const handleNotaChange = (nota, valor) => { setNotas(prev => ({ ...prev, [nota]: parseFloat(valor) || 0 })) }
  const handleNotaInChange = (nota, valor) => { setNotasIn(prev => ({ ...prev, [nota]: parseFloat(valor) || 0 })) }
  const handleNotaRecChange = (nota, valor) => { setNotasRec(prev => ({ ...prev, [nota]: parseFloat(valor) || 0 })) }

  const calcularCentavos = (valores) => Object.values(valores).reduce((total, valor) => total + Math.round((Number(valor) || 0) * 100), 0)
  const valorCalculadoOut = calcularCentavos(notas) / 100
  const valorCalculadoIn = calcularCentavos(notasIn) / 100
  const somaRecebimento = calcularCentavos(notasRec) / 100
  
  useEffect(() => {
    if (tipoTroca === 'INTERNA' || tipoTroca === 'TEMPORARIA' || origemSelecionada === 'Caixa de Troco') {
      setValue('valor', valorCalculadoOut)
    }
  }, [notas, tipoTroca, origemSelecionada, setValue, valorCalculadoOut])

  const isMatchInterna = tipoTroca === 'INTERNA' ? (Math.round(valorCalculadoOut * 100) === Math.round(valorCalculadoIn * 100) && valorCalculadoOut > 0) : true;
  const isMatchRecebimento = receivingTroca && somaRecebimento.toFixed(2) === parseFloat(receivingTroca.valor).toFixed(2)

  const converterValoresParaQuantidades = (valoresReais) => {
    const qtds = {};
    Object.entries(valoresReais).forEach(([face, valorTotal]) => {
      const faceCentavos = Math.round(Number(face) * 100)
      const valorCentavos = Math.round((Number(valorTotal) || 0) * 100)
      const qtd = faceCentavos > 0 ? valorCentavos / faceCentavos : 0
      if (!Number.isInteger(qtd)) throw new Error(`O valor informado para a nota de R$ ${Number(face).toFixed(2)} deve ser múltiplo da denominação.`)
      if (qtd > 0) qtds[face] = qtd;
    });
    return Object.keys(qtds).length > 0 ? qtds : null;
  }

  const valoresPorDenominacaoValidos = (valoresReais) => Object.entries(valoresReais).every(([face, valor]) => {
    const faceCentavos = Math.round(Number(face) * 100)
    const valorCentavos = Math.round((Number(valor) || 0) * 100)
    return Number.isFinite(valorCentavos) && (faceCentavos === 0 || valorCentavos % faceCentavos === 0)
  })

  const handleEdit = () => alert("Movimentações físicas do cofre não devem ser editadas diretamente para não gerar furos de caixa. Exclua a troca (o estorno será automático) e lance novamente.")

  const handleDelete = async (id) => {
    if (window.confirm('ATENÇÃO: Deseja apagar esta troca permanentemente? Se a troca foi originada no cofre, os valores serão revertidos automaticamente!')) {
      await excluirDeposito(id)
    }
  }

  const fecharModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
    setNotas({ 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0 })
    setNotasIn({ 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0 })
    reset({ valor: '', origem: '', destino: '', destino_outros: '', motivo_temporaria: '' })
    setTipoTroca('INTERNA')
  }

  const onSubmitCreate = async (data) => {
    const isCaixaTroco = tipoTroca === 'INTERNA' || tipoTroca === 'TEMPORARIA' || data.origem === 'Caixa de Troco'
    const valorFinal = isCaixaTroco ? valorCalculadoOut : parseFloat(data.valor)

    if (isCaixaTroco && valorFinal <= 0) { return alert("Informe os valores trocados.") }
    if (tipoTroca === 'INTERNA' && !isMatchInterna) { return alert("Os valores de Retirada e Entrada precisam ser exatamente iguais!") }
    if ((isCaixaTroco && !valoresPorDenominacaoValidos(notas)) ||
        (tipoTroca === 'INTERNA' && !valoresPorDenominacaoValidos(notasIn))) {
      return alert('Informe valores que sejam múltiplos exatos de cada denominação.')
    }

    const notasOutEmQuantidade = converterValoresParaQuantidades(notas);
    const notasInEmQuantidade = tipoTroca === 'INTERNA' ? converterValoresParaQuantidades(notasIn) : null;

    // Tratamento do destino para os novos campos
    const finalDestino = tipoTroca === 'TEMPORARIA' 
        ? data.motivo_temporaria 
        : (data.destino === 'Outros' ? data.destino_outros : data.destino);

    const payload = {
      valor: valorFinal, value: valorFinal,
      categoria: tipoTroca === 'INTERNA' ? 'Troca (Caixa de Troco)' : (tipoTroca === 'TEMPORARIA' ? 'Troca Temporária' : 'Troca Externa'),
      origem: tipoTroca === 'INTERNA' ? 'Caixa de Troco (Interna)' : (tipoTroca === 'TEMPORARIA' ? 'Caixa de Troco' : data.origem),
      origin: tipoTroca === 'INTERNA' ? 'Caixa de Troco (Interna)' : (tipoTroca === 'TEMPORARIA' ? 'Caixa de Troco' : data.origem),
      destino: finalDestino,
      detalhes_troca: isCaixaTroco ? { 
        notas: notasOutEmQuantidade,
        ...(tipoTroca === 'INTERNA' && {
          notasEntrada: notasInEmQuantidade
        })
      } : null
    }

    if (!editingId) {
      payload.status_troca = (tipoTroca === 'EXTERNA' || tipoTroca === 'TEMPORARIA') ? 'PENDENTE' : 'CONCLUIDA'
      payload.responsavel_nome = user?.nome || 'Operador'
    }

    try {
      await salvarDeposito(payload, editingId)
      if ((tipoTroca === 'EXTERNA' || tipoTroca === 'TEMPORARIA') && (data.origem === 'Caixa de Troco' || tipoTroca === 'TEMPORARIA')) {
        alert("Atenção: Dinheiro retirado do Cofre. Quando o portador retornar, você DEVERÁ registrar o Recebimento para devolver o valor ao Caixa de Troco!")
      }
      fecharModal()
    } catch (e) {}
  }

  const handleOpenReceive = (troca) => {
    setReceivingTroca(troca)
    setNotasRec({ 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0 })
    setIsReceiveModalOpen(true)
  }

  const onSubmitReceive = async (e) => {
    e.preventDefault()
    if (!isMatchRecebimento) return
    
    await receberTroca(receivingTroca.id, {
      recebido_por: user?.nome || 'Operador',
      detalhes_troca: { 
        notas: converterValoresParaQuantidades(notasRec)
      },
      valor_recebido: somaRecebimento
    }, receivingTroca)
    setIsReceiveModalOpen(false)
  }

  const imprimirComprovante = (registro) => {
    const dataApenas = new Date(registro.created_at).toLocaleDateString('pt-BR')
    const horaApenas = new Date(registro.created_at).toLocaleTimeString('pt-BR')
    const valorFormatado = `R$ ${registro.valor.toFixed(2).replace('.', ',')}`
    const nomeOperador = registro.responsavel_nome || registro.users?.nome || 'Operador'
    const detalhesLimpos = formatDetalhes(registro)
    const recebedorLimpo = formatRecebedor(registro.recebido_por)

    let detalhesOutHtml = ''; let detalhesInHtml = '';

    if (detalhesLimpos && detalhesLimpos.notas) {
      detalhesOutHtml = '<div class="divisor"></div><div class="bold" style="margin-bottom: 4px; color: #b91c1c;">[-] Retirado do Cofre:</div>';
      [200, 100, 50, 20, 10, 5, 2].forEach(n => {
        if (detalhesLimpos.notas[n] > 0) detalhesOutHtml += `<div>Notas R$ ${n}: R$ ${(detalhesLimpos.notas[n] * n).toFixed(2).replace('.',',')}</div>`
      });
      if (detalhesLimpos.moedas && Object.keys(detalhesLimpos.moedas).length > 0) {
        [1, 0.5, 0.25, 0.1, 0.05].forEach(m => {
          if (detalhesLimpos.moedas[m] > 0) detalhesOutHtml += `<div>Moedas R$ ${m.toFixed(2).replace('.',',')}: R$ ${(detalhesLimpos.moedas[m] * m).toFixed(2).replace('.',',')}</div>`
        });
      } else if (detalhesLimpos.moedasValor > 0) detalhesOutHtml += `<div>Moedas: R$ ${parseFloat(detalhesLimpos.moedasValor).toFixed(2).replace('.',',')}</div>`
      
      if (detalhesLimpos.notasEntrada) {
        detalhesInHtml = '<div class="divisor"></div><div class="bold" style="margin-bottom: 4px; color: #15803d;">[+] Colocado no Cofre:</div>';
        [200, 100, 50, 20, 10, 5, 2].forEach(n => {
          if (detalhesLimpos.notasEntrada[n] > 0) detalhesInHtml += `<div>Notas R$ ${n}: R$ ${(detalhesLimpos.notasEntrada[n] * n).toFixed(2).replace('.',',')}</div>`
        });
        if (detalhesLimpos.moedasEntrada && Object.keys(detalhesLimpos.moedasEntrada).length > 0) {
          [1, 0.5, 0.25, 0.1, 0.05].forEach(m => {
            if (detalhesLimpos.moedasEntrada[m] > 0) detalhesInHtml += `<div>Moedas R$ ${m.toFixed(2).replace('.',',')}: R$ ${(detalhesLimpos.moedasEntrada[m] * m).toFixed(2).replace('.',',')}</div>`
          });
        } else if (detalhesLimpos.moedasValorEntrada > 0) detalhesInHtml += `<div>Moedas: R$ ${parseFloat(detalhesLimpos.moedasValorEntrada).toFixed(2).replace('.',',')}</div>`
      }
    }

    let tituloCupom = registro.categoria === 'Troca (Caixa de Troco)' ? 'COMPROVANTE DE TROCA INTERNA' : (registro.categoria === 'Troca Temporária' ? 'COMPROVANTE DE TROCA TEMPORÁRIA' : 'COMPROVANTE DE TROCA EXTERNA');

    const conteudoCupom = `
      <html><head><style>@page { margin: 0; } body { font-family: 'Courier New', Courier, monospace; width: 76mm; margin: 0; padding: 5mm; font-size: 15px; } .center { text-align: center; } .bold { font-weight: bold; } .divisor { border-top: 1px dashed #000; margin: 10px 0; }</style></head>
      <body>
        <div class="center bold" style="font-size: 16px;">${tituloCupom}</div>
        <div class="divisor"></div>
        <div><span class="bold">Data/Hora:</span> ${dataApenas} ${horaApenas}</div>
        ${registro.categoria !== 'Troca (Caixa de Troco)' ? `<div><span class="bold">Origem:</span> ${registro.origem}</div><div><span class="bold">Destino:</span> ${registro.destino}</div>` : ''}
        <div><span class="bold">Usuário:</span> ${nomeOperador}</div>
        ${!registro.recebido_por ? detalhesOutHtml : ''}
        ${registro.categoria === 'Troca (Caixa de Troco)' ? detalhesInHtml : ''}
        <div class="divisor"></div>
        <div class="bold" style="font-size: 18px; text-align: center;">TOTAL<br>${valorFormatado}</div>
        <div class="divisor"></div><br>
        ${registro.recebido_por ? `
        <div class="center bold">-- RETORNO DA TROCA --</div>
        ${detalhesOutHtml.replace('Retirado do Cofre', 'Recebido em Troco')}
        <div class="divisor"></div>
        <div><span class="bold">Recebido (Retorno):</span><br>${recebedorLimpo}</div><br><div class="center" style="font-size: 12px;">Entrada no Cofre: ${new Date(registro.recebido_em).toLocaleString('pt-BR')}</div>` : ''}
      </body></html>`;

    const janelaImpressao = window.open('', '', 'width=300,height=400')
    janelaImpressao.document.write(conteudoCupom)
    janelaImpressao.document.close()
    janelaImpressao.focus()
    setTimeout(() => { janelaImpressao.print(); janelaImpressao.close() }, 250)
  }

  return {
    user, formProps, isPageLoading, isActionLoading, trocasList,
    isModalOpen, setIsModalOpen, editingId, tipoTroca, setTipoTroca,
    notas, notasIn, isReceiveModalOpen, setIsReceiveModalOpen, receivingTroca, notasRec,
    origemSelecionada, destinoSelecionado, valorCalculadoOut, valorCalculadoIn, somaRecebimento, isMatchInterna, isMatchRecebimento,
    formatRecebedor, handleNotaChange, handleNotaInChange, handleNotaRecChange,
    handleEdit, handleDelete, fecharModal, onSubmitCreate, handleOpenReceive, onSubmitReceive, imprimirComprovante
  }
}
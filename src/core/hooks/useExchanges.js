import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useDeposits } from './useDeposits' 

// Funções Auxiliares
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
  const [tipoTroca, setTipoTroca] = useState('INTERNA')

  // === ESTADOS FÍSICOS DA RETIRADA ===
  const [notas, setNotas] = useState({ 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0 })
  const [moedas, setMoedas] = useState({ 1: 0, 0.5: 0, 0.25: 0, 0.1: 0, 0.05: 0 })

  // === ESTADOS FÍSICOS DA ENTRADA (TROCA INTERNA) ===
  const [notasIn, setNotasIn] = useState({ 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0 })
  const [moedasIn, setMoedasIn] = useState({ 1: 0, 0.5: 0, 0.25: 0, 0.1: 0, 0.05: 0 })

  // === ESTADOS FÍSICOS DO RETORNO EXTERNO ===
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false)
  const [receivingTroca, setReceivingTroca] = useState(null)
  const [notasRec, setNotasRec] = useState({ 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0 })
  const [moedasRec, setMoedasRec] = useState({ 1: 0, 0.5: 0, 0.25: 0, 0.1: 0, 0.05: 0 })

  const formProps = useForm()
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = formProps
  const origemSelecionada = watch('origem')

  useEffect(() => { carregarDepositos() }, [carregarDepositos])

  const trocasList = depositsList.filter(d => d.categoria === 'Troca (Caixa de Troco)' || d.categoria === 'Troca Externa')

  // === HANDLERS ===
  const handleNotaChange = (nota, valor) => { setNotas(prev => ({ ...prev, [nota]: parseFloat(valor) || 0 })) }
  const handleMoedaChange = (moeda, valor) => { setMoedas(prev => ({ ...prev, [moeda]: parseFloat(valor) || 0 })) }
  
  const handleNotaInChange = (nota, valor) => { setNotasIn(prev => ({ ...prev, [nota]: parseFloat(valor) || 0 })) }
  const handleMoedaInChange = (moeda, valor) => { setMoedasIn(prev => ({ ...prev, [moeda]: parseFloat(valor) || 0 })) }
  
  const handleNotaRecChange = (nota, valor) => { setNotasRec(prev => ({ ...prev, [nota]: parseFloat(valor) || 0 })) }
  const handleMoedaRecChange = (moeda, valor) => { setMoedasRec(prev => ({ ...prev, [moeda]: parseFloat(valor) || 0 })) }

  // === CÁLCULOS ===
  const valorCalculadoOut = Object.values(notas).reduce((a, b) => a + b, 0) + Object.values(moedas).reduce((a, b) => a + b, 0)
  const valorCalculadoIn = Object.values(notasIn).reduce((a, b) => a + b, 0) + Object.values(moedasIn).reduce((a, b) => a + b, 0)
  const somaRecebimento = Object.values(notasRec).reduce((a, b) => a + b, 0) + Object.values(moedasRec).reduce((a, b) => a + b, 0)
  
  useEffect(() => {
    if (tipoTroca === 'INTERNA' || origemSelecionada === 'Caixa de Troco') {
      setValue('valor', valorCalculadoOut)
    }
  }, [notas, moedas, tipoTroca, origemSelecionada, setValue, valorCalculadoOut])

  const isMatchInterna = tipoTroca === 'INTERNA' ? (valorCalculadoOut === valorCalculadoIn && valorCalculadoOut > 0) : true;
  const isMatchRecebimento = receivingTroca && somaRecebimento.toFixed(2) === parseFloat(receivingTroca.valor).toFixed(2)

  const converterValoresParaQuantidades = (valoresReais) => {
    const qtds = {};
    Object.entries(valoresReais).forEach(([face, valorTotal]) => {
      qtds[face] = Math.round((Number(valorTotal) || 0) / Number(face));
    });
    return qtds;
  }

  const handleEdit = () => {
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
    setMoedas({ 1: 0, 0.5: 0, 0.25: 0, 0.1: 0, 0.05: 0 })
    setNotasIn({ 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0 })
    setMoedasIn({ 1: 0, 0.5: 0, 0.25: 0, 0.1: 0, 0.05: 0 })
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
    const moedasOutEmQuantidade = converterValoresParaQuantidades(moedas);
    
    const notasInEmQuantidade = tipoTroca === 'INTERNA' ? converterValoresParaQuantidades(notasIn) : null;
    const moedasInEmQuantidade = tipoTroca === 'INTERNA' ? converterValoresParaQuantidades(moedasIn) : null;

    const payload = {
      valor: valorFinal,
      value: valorFinal,
      categoria: tipoTroca === 'INTERNA' ? 'Troca (Caixa de Troco)' : 'Troca Externa',
      origem: tipoTroca === 'INTERNA' ? 'Caixa de Troco (Interna)' : data.origem,
      origin: tipoTroca === 'INTERNA' ? 'Caixa de Troco (Interna)' : data.origem,
      destino: tipoTroca === 'EXTERNA' ? data.destino : null,
      detalhes_troca: isCaixaTroco ? { 
        notas: notasOutEmQuantidade, 
        moedas: moedasOutEmQuantidade,
        moedasValor: Object.values(moedas).reduce((a,b)=>a+b, 0),
        ...(tipoTroca === 'INTERNA' && {
          notasEntrada: notasInEmQuantidade,
          moedasEntrada: moedasInEmQuantidade,
          moedasValorEntrada: Object.values(moedasIn).reduce((a,b)=>a+b, 0)
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
    setMoedasRec({ 1: 0, 0.5: 0, 0.25: 0, 0.1: 0, 0.05: 0 })
    setIsReceiveModalOpen(true)
  }

  const onSubmitReceive = async (e) => {
    e.preventDefault()
    if (!isMatchRecebimento) return
    const notasRecEmQuantidade = converterValoresParaQuantidades(notasRec);
    const moedasRecEmQuantidade = converterValoresParaQuantidades(moedasRec);

    await receberTroca(receivingTroca.id, {
      recebido_por: user?.nome || 'Operador',
      detalhes_troca: { 
        notas: notasRecEmQuantidade, 
        moedas: moedasRecEmQuantidade, 
        moedasValor: Object.values(moedasRec).reduce((a,b)=>a+b, 0) 
      },
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
      if (detalhesLimpos.moedas && Object.keys(detalhesLimpos.moedas).length > 0) {
        [1, 0.5, 0.25, 0.1, 0.05].forEach(m => {
          if (detalhesLimpos.moedas[m] > 0) detalhesOutHtml += `<div>Moedas R$ ${m.toFixed(2).replace('.',',')}: R$ ${(detalhesLimpos.moedas[m] * m).toFixed(2).replace('.',',')}</div>`
        });
      } else if (detalhesLimpos.moedasValor > 0) {
        detalhesOutHtml += `<div>Moedas: R$ ${parseFloat(detalhesLimpos.moedasValor).toFixed(2).replace('.',',')}</div>`
      }
      
      if (detalhesLimpos.notasEntrada) {
        detalhesInHtml = '<div class="divisor"></div><div class="bold" style="margin-bottom: 4px; color: #15803d;">[+] Colocado no Cofre:</div>';
        [200, 100, 50, 20, 10, 5, 2].forEach(n => {
          if (detalhesLimpos.notasEntrada[n] > 0) detalhesInHtml += `<div>Notas R$ ${n}: R$ ${(detalhesLimpos.notasEntrada[n] * n).toFixed(2).replace('.',',')}</div>`
        });
        if (detalhesLimpos.moedasEntrada && Object.keys(detalhesLimpos.moedasEntrada).length > 0) {
          [1, 0.5, 0.25, 0.1, 0.05].forEach(m => {
            if (detalhesLimpos.moedasEntrada[m] > 0) detalhesInHtml += `<div>Moedas R$ ${m.toFixed(2).replace('.',',')}: R$ ${(detalhesLimpos.moedasEntrada[m] * m).toFixed(2).replace('.',',')}</div>`
          });
        } else if (detalhesLimpos.moedasValorEntrada > 0) {
          detalhesInHtml += `<div>Moedas: R$ ${parseFloat(detalhesLimpos.moedasValorEntrada).toFixed(2).replace('.',',')}</div>`
        }
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

  return {
    user, formProps,
    isPageLoading, isActionLoading, trocasList,
    isModalOpen, setIsModalOpen, editingId, tipoTroca, setTipoTroca,
    notas, moedas, notasIn, moedasIn,
    isReceiveModalOpen, setIsReceiveModalOpen, receivingTroca, notasRec, moedasRec,
    origemSelecionada, valorCalculadoOut, valorCalculadoIn, somaRecebimento, isMatchInterna, isMatchRecebimento,
    formatRecebedor, handleNotaChange, handleMoedaChange, handleNotaInChange, handleMoedaInChange, handleNotaRecChange, handleMoedaRecChange,
    handleEdit, handleDelete, fecharModal, onSubmitCreate, handleOpenReceive, onSubmitReceive, imprimirComprovante
  }
}
import { useState, useCallback } from 'react'
import { SupabaseCashRepository } from '../../infrastructure/supabase/repositories/SupabaseCashRepository'
import { supabase } from '../../infrastructure/supabase/supabaseClient'

export const useCashManagement = (user) => {
  const storeId = user?.store_id
  const [denominations, setDenominations] = useState([])
  const [lastConference, setLastConference] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const carregarEstoque = useCallback(async () => {
    if (!storeId) {
      setIsLoading(false)
      return
    }
    
    setIsLoading(true)
    try {
      let data = await SupabaseCashRepository.getDenominations(storeId)
      if (data.length === 0) {
        await SupabaseCashRepository.initializeDenominations(storeId)
        data = await SupabaseCashRepository.getDenominations(storeId)
      }
      setDenominations(data)

      const ultima = await SupabaseCashRepository.getLastConference(storeId)
      setLastConference(ultima)

    } catch (error) {
      console.error('Erro ao carregar estoque:', error)
      alert('Atenção: Erro de conexão com o banco de dados. Detalhe: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }, [storeId])

  const calcularUnidadesPorTotal = (valorFace, valorTotalDigitado) => {
    if (!valorTotalDigitado || isNaN(valorTotalDigitado)) return 0
    return Math.floor(parseFloat(valorTotalDigitado) / parseFloat(valorFace))
  }

  const salvarLimitesEContagem = async (estoqueLocal) => {
    if (!user) {
      alert('Sessão do usuário não encontrada. Recarregue a página.');
      return;
    }

    setIsLoading(true)
    try {
      const promises = Object.entries(estoqueLocal).map(([id, dados]) => {
        return supabase.from('cash_denominations')
          .update({
            quantidade_atual: dados.unidades_atual,
            quantidade_minima: dados.minima,
            quantidade_ideal: dados.ideal
          })
          .eq('id', id)
      })
      await Promise.all(promises)

      let valor_total = 0
      let detalhamento = {}

      Object.entries(estoqueLocal).forEach(([id, dados]) => {
        const denom = denominations.find(d => d.id === id)
        if (denom) {
          valor_total += (dados.unidades_atual * denom.valor)
          detalhamento[denom.valor.toString()] = dados.unidades_atual
        }
      })

      await SupabaseCashRepository.registerMovement({
        store_id: user.store_id,
        created_by: user.id,
        tipo_movimento: 'CONTAGEM_INICIAL',
        valor_total: valor_total,
        origem: 'Cofre Central',
        destino: 'Cofre Central',
        detalhamento: detalhamento
      })

      alert('Estoque do cofre, limites e registro de conferência salvos com sucesso!')
      await carregarEstoque()
    } catch (err) {
      alert('Erro ao salvar as configurações: ' + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // --- MONTAGEM DE BOLSA DE ABERTURA ---
  const montarBolsaTroco = async (qtdBolsas) => {
    if (!user) return alert('Usuário não encontrado.')
    if (qtdBolsas < 1) return alert('Quantidade inválida.')

    setIsLoading(true)
    try {
      const regraBolsa = [
        { valorFace: 20, qtd: 5 },
        { valorFace: 10, qtd: 10 },
        { valorFace: 5, qtd: 20 },
        { valorFace: 2, qtd: 50 },
        { valorFace: 1, qtd: 5 },
        { valorFace: 0.50, qtd: 20 },
        { valorFace: 0.25, qtd: 40 },
        { valorFace: 0.10, qtd: 30 },
        { valorFace: 0.05, qtd: 40 },
      ]

      // 1. Puxa os valores mais recentes direto do banco 
      const { data: dbDenominations, error: fetchErr } = await supabase
        .from('cash_denominations')
        .select('*')
        .eq('store_id', user.store_id)
      
      if (fetchErr) throw fetchErr

      let alertas = []
      const updates = []
      const detalhamento = {}
      let valorTotalSaida = 0

      // 2. Calcula as deduções e verifica se vai negativar
      dbDenominations.forEach(d => {
        const regra = regraBolsa.find(r => r.valorFace === Number(d.valor))
        if (regra) {
          const qtdDescontar = regra.qtd * qtdBolsas
          const saldoFinal = d.quantidade_atual - qtdDescontar
          
          if (saldoFinal < 0) {
            alertas.push(`Faltam ${Math.abs(saldoFinal)} unidades de R$ ${Number(d.valor).toFixed(2)}`)
          }

          updates.push({ id: d.id, quantidade_atual: saldoFinal })
          detalhamento[d.valor.toString()] = qtdDescontar
          valorTotalSaida += (qtdDescontar * Number(d.valor))
        }
      })

      // 3. Trava de segurança (alerta o operador)
      if (alertas.length > 0) {
        const confirmar = window.confirm(`ATENÇÃO: Você não tem troco suficiente no cofre!\n\n${alertas.join('\n')}\n\nDeseja montar a bolsa mesmo assim e deixar o estoque negativo para corrigir depois?`)
        if (!confirmar) {
          setIsLoading(false)
          return
        }
      }

      // 4. Executa a dedução de notas e moedas no banco de dados
      const promises = updates.map(u => 
        supabase.from('cash_denominations').update({ quantidade_atual: u.quantidade_atual }).eq('id', u.id)
      )
      await Promise.all(promises)

      // 5. Salva o movimento no histórico para auditoria
      await SupabaseCashRepository.registerMovement({
        store_id: user.store_id,
        created_by: user.id,
        tipo_movimento: 'SAIDA',
        valor_total: valorTotalSaida,
        origem: 'Cofre Central',
        destino: 'Bolsa de Abertura (Caixa)',
        detalhamento: detalhamento
      })

      alert(`Sucesso! ${qtdBolsas} bolsa(s) montada(s) e R$ ${valorTotalSaida.toFixed(2)} deduzidos do cofre.`)
      await carregarEstoque()
    } catch (err) {
      alert('Erro ao montar bolsa: ' + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return { denominations, lastConference, isLoading, carregarEstoque, calcularUnidadesPorTotal, salvarLimitesEContagem, montarBolsaTroco }
}
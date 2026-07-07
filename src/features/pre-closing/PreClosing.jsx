import React from 'react';
import { Save, Banknote, CreditCard, QrCode, ScrollText, Ticket, Pencil, Trash2, XCircle, Send } from 'lucide-react';
import { usePreClosing } from '../../core/hooks/usePreClosing';
import { useAuth } from '../../core/hooks/useAuth';
import { Button } from '../../shared/components/buttons/Button';
import { Card } from '../../shared/components/cards/Card';
import { Input } from '../../shared/components/inputs/Input';
import { Table } from '../../shared/components/tables/Table';

export const PreClosing = () => { 
  const { user } = useAuth();
  const {
    formValues,
    setFormValues,
    calcCash,
    calcCard,
    calcPix,
    calcCheck,
    calcVale,
    subtotalFisico,
    deliveriesTotals,
    totalGeralProjetado,
    history,
    dataConsulta,
    setDataConsulta,
    handleSave,
    editingId,
    handleEditRow,
    handleCancelEdit,
    deletePreClosing,
    isActionLoading
  } = usePreClosing();

  const safeFormValues = formValues || {};

  const handleInputChange = (field, value) => {
    setFormValues(prev => ({ ...prev, [field]: value }));
  };

  const handleSendWhatsApp = () => {
    const texto = `*Pré-Fechamento de Caixa* 📊
📅 *Data:* ${new Date().toLocaleDateString('pt-BR')}

💰 *Físico (Gaveta):*
Dinheiro: R$ ${calcCash.toFixed(2).replace('.', ',')}
Cartão: R$ ${calcCard.toFixed(2).replace('.', ',')}
Pix: R$ ${calcPix.toFixed(2).replace('.', ',')}
Cheques/Vales: R$ ${(calcCheck + calcVale).toFixed(2).replace('.', ',')}
*Subtotal Físico:* R$ ${subtotalFisico.toFixed(2).replace('.', ',')}

🛵 *Rua (Pendentes):*
Dinheiro: R$ ${Number(deliveriesTotals?.dinheiro || 0).toFixed(2).replace('.', ',')}
Cartão: R$ ${Number(deliveriesTotals?.cartao || 0).toFixed(2).replace('.', ',')}
Pix: R$ ${Number(deliveriesTotals?.pix || 0).toFixed(2).replace('.', ',')}

📈 *TOTAL GERAL PROJETADO:* R$ ${totalGeralProjetado.toFixed(2).replace('.', ',')}

📝 *Observações:* ${safeFormValues.obs_geral || 'Nenhuma'}`;

    const encodedText = encodeURIComponent(texto);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  const columns = [
    { header: 'Data/Hora', accessor: 'created_at', render: (row) => new Date(row.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) },
    { header: 'Dinheiro', accessor: 'cash_value', render: (row) => `R$ ${Number(row.cash_value || 0).toFixed(2).replace('.', ',')}` },
    { header: 'Cartão', accessor: 'card_value', render: (row) => `R$ ${Number(row.card_value || 0).toFixed(2).replace('.', ',')}` },
    { header: 'Pix', accessor: 'pix_value', render: (row) => `R$ ${Number(row.pix_value || 0).toFixed(2).replace('.', ',')}` },
    { header: 'Cheque/Vale', render: (row) => `R$ ${(Number(row.check_value || 0) + Number(row.vale_compras_value || 0)).toFixed(2).replace('.', ',')}` },
    { header: 'Rua Pendente', render: (row) => `R$ ${(Number(row.pending_cash || 0) + Number(row.pending_card || 0) + Number(row.pending_pix || 0)).toFixed(2).replace('.', ',')}` },
    { header: 'TOTAL PROJETADO', accessor: 'total', render: (row) => <strong style={{ color: '#1e3a8a' }}>R$ {Number(row.total || 0).toFixed(2).replace('.', ',')}</strong> },
    {
      header: 'Ações', 
      render: (row) => (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {(user?.role === 'ADMIN' || user?.id === row.created_by) && (
            <>
              <button 
                title="Editar" 
                onClick={() => handleEditRow(row)} 
                style={{ background: 'none', border: 'none', color: '#d97706', cursor: 'pointer' }}
              >
                <Pencil size={18} />
              </button>
              <button 
                title="Excluir" 
                onClick={async () => { 
                  if (window.confirm('Tem certeza que deseja excluir este fechamento?')) {
                    await deletePreClosing(row.id); 
                  }
                }} 
                style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}
              >
                <Trash2 size={18} />
              </button>
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e3a8a', margin: 0 }}>Pré-Fechamento do Caixa</h1>
          <p style={{ color: '#6b7280', margin: 0, marginTop: '4px' }}>Calculadora de consolidação de valores físicos e comandas pendentes.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {editingId && (
            <Button variant="secondary" onClick={handleCancelEdit} icon={XCircle}>
              Cancelar Edição
            </Button>
          )}
          <Button variant="secondary" onClick={handleSendWhatsApp} icon={Send}>
            Enviar WhatsApp
          </Button>
          <Button onClick={handleSave} isLoading={isActionLoading} icon={Save}>
            {editingId ? "Salvar Edição" : "Salvar Fechamento"}
          </Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px', marginBottom: '24px' }}>
        
        <Card title="Apuração Física (Gaveta)" icon={Banknote}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Input 
                label="Dinheiro" 
                icon={Banknote} 
                placeholder="R$ Ex: 50 + 20,50" 
                value={safeFormValues.dinheiro_str || ''} 
                onChange={(e) => handleInputChange('dinheiro_str', e.target.value)} 
              />
              <Input 
                label="Observações sobre Dinheiro" 
                placeholder="Anotações específicas..." 
                value={safeFormValues.obs_dinheiro || ''} 
                onChange={(e) => handleInputChange('obs_dinheiro', e.target.value)} 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Input 
                label="Cartão" 
                icon={CreditCard} 
                placeholder="R$ Ex: 50 + 20,50" 
                value={safeFormValues.cartao_str || ''} 
                onChange={(e) => handleInputChange('cartao_str', e.target.value)} 
              />
              <Input 
                label="Observações sobre Cartão" 
                placeholder="Anotações específicas..." 
                value={safeFormValues.obs_cartao || ''} 
                onChange={(e) => handleInputChange('obs_cartao', e.target.value)} 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Input 
                label="Pix (QR Code / Transferência)" 
                icon={QrCode} 
                placeholder="R$ Ex: 50 + 20,50" 
                value={safeFormValues.pix_str || ''} 
                onChange={(e) => handleInputChange('pix_str', e.target.value)} 
              />
              <Input 
                label="Observações sobre Pix" 
                placeholder="Anotações específicas..." 
                value={safeFormValues.obs_pix || ''} 
                onChange={(e) => handleInputChange('obs_pix', e.target.value)} 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Input 
                label="Cheques" 
                icon={ScrollText} 
                placeholder="R$ Ex: 50 + 20,50" 
                value={safeFormValues.cheque_str || ''} 
                onChange={(e) => handleInputChange('cheque_str', e.target.value)} 
              />
              <Input 
                label="Observações sobre Cheques" 
                placeholder="Anotações específicas..." 
                value={safeFormValues.obs_cheque || ''} 
                onChange={(e) => handleInputChange('obs_cheque', e.target.value)} 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Input 
                label="Vale-Compras" 
                icon={Ticket} 
                placeholder="R$ Ex: 50 + 20,50" 
                value={safeFormValues.vale_str || ''} 
                onChange={(e) => handleInputChange('vale_str', e.target.value)} 
              />
              <Input 
                label="Observações sobre Vale-Compras" 
                placeholder="Anotações específicas..." 
                value={safeFormValues.obs_vale || ''} 
                onChange={(e) => handleInputChange('obs_vale', e.target.value)} 
              />
            </div>

            <hr style={{ borderColor: '#e5e7eb', margin: '8px 0' }} />

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                Observações Gerais do Fechamento
              </label>
              <textarea 
                rows={3}
                placeholder="Faltou troco? Sangria não bateu? Digite o resumo geral aqui..."
                value={safeFormValues.obs_geral || ''}
                onChange={(e) => handleInputChange('obs_geral', e.target.value)}
                style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>

          </div>
        </Card>

        <Card title="Resumo da Apuração">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase', marginBottom: '12px' }}>Apuração Física (Gaveta)</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#4b5563', fontSize: '14px' }}>
                <span>Dinheiro:</span> <span>R$ {calcCash.toFixed(2).replace('.', ',')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#4b5563', fontSize: '14px' }}>
                <span>Cartão:</span> <span>R$ {calcCard.toFixed(2).replace('.', ',')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#4b5563', fontSize: '14px' }}>
                <span>Pix:</span> <span>R$ {calcPix.toFixed(2).replace('.', ',')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#4b5563', fontSize: '14px' }}>
                <span>Cheques/Vales:</span> <span>R$ {(calcCheck + calcVale).toFixed(2).replace('.', ',')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#111827', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                <span>Subtotal Físico:</span> <span>R$ {subtotalFisico.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#dc2626', textTransform: 'uppercase', marginBottom: '12px' }}>Entregas na Rua (Pendentes)</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#dc2626', fontSize: '14px' }}>
                <span>Dinheiro a receber:</span> <span>+ R$ {Number(deliveriesTotals?.dinheiro || 0).toFixed(2).replace('.', ',')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#dc2626', fontSize: '14px' }}>
                <span>Cartão a receber:</span> <span>+ R$ {Number(deliveriesTotals?.cartao || 0).toFixed(2).replace('.', ',')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#dc2626', fontSize: '14px' }}>
                <span>Pix a receber:</span> <span>+ R$ {Number(deliveriesTotals?.pix || 0).toFixed(2).replace('.', ',')}</span>
              </div>
            </div>

            <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '8px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#166534', textTransform: 'uppercase', marginBottom: '12px' }}>Soma Dinâmica (Gaveta + Rua)</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#166534', fontSize: '14px' }}>
                <span>Total Dinheiro:</span> <span>R$ {(calcCash + Number(deliveriesTotals?.dinheiro || 0)).toFixed(2).replace('.', ',')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#166534', fontSize: '14px' }}>
                <span>Total Cartão:</span> <span>R$ {(calcCard + Number(deliveriesTotals?.cartao || 0)).toFixed(2).replace('.', ',')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#166534', fontSize: '14px' }}>
                <span>Total Pix:</span> <span>R$ {(calcPix + Number(deliveriesTotals?.pix || 0)).toFixed(2).replace('.', ',')}</span>
              </div>
            </div>

            <div style={{ marginTop: 'auto' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e3a8a', textTransform: 'uppercase', marginBottom: '8px' }}>Total Geral Projetado</h4>
              <div style={{ fontSize: '36px', fontWeight: '900', color: '#1e3a8a', lineHeight: '1' }}>
                R$ {totalGeralProjetado.toFixed(2).replace('.', ',')}
              </div>
            </div>

          </div>
        </Card>
      </div>

      <Card title="Histórico de Pré-Fechamentos Salvos">
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>Filtrar do dia:</label>
          <input 
            type="date" 
            value={dataConsulta} 
            onChange={(e) => setDataConsulta(e.target.value)} 
            style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none' }}
          />
        </div>
        <Table 
          columns={columns} 
          data={history || []} 
          emptyMessage="Nenhum pré-fechamento salvo para a data selecionada." 
        />
      </Card>

    </div>
  );
};
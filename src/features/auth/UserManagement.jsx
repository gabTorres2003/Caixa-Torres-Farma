import React, { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../../infrastructure/supabase/supabaseClient'
import { useAuth } from '../../core/hooks/useAuth'
import { UserPlus, Users, Loader2, Pencil, Trash2, X } from 'lucide-react'

import { Card } from '../../shared/components/cards/Card'
import { FormInput } from '../../shared/components/forms/FormInput'
import { Button } from '../../shared/components/buttons/Button'
import { Table } from '../../shared/components/tables/Table'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const detachedAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, storageKey: 'torres-farma-detached', autoRefreshToken: false, detectSessionInUrl: false },
})

export const UserManagement = () => {
  const { user } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm()

  const carregarUsuariosDaLoja = useCallback(async () => {
    if (!user?.store_id) return
    setIsPageLoading(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('store_id', user.store_id)
        .order('nome', { ascending: true })

      if (error) throw error
      setUsuarios(data || [])
    } catch (err) {
      console.error('Erro:', err.message)
    } finally {
      setIsPageLoading(false)
    }
  }, [user?.store_id])

  useEffect(() => { carregarUsuariosDaLoja() }, [carregarUsuariosDaLoja])

  // --- AÇÕES DE EDIÇÃO ---
  const handleEdit = (usuario) => {
    setEditingId(usuario.id)
    setValue('nome', usuario.nome)
    setValue('role', usuario.role)
    
    // Puxa apenas o "usuário simples" cortando o domínio fictício
    const usuarioSimples = usuario.email ? usuario.email.split('@')[0] : ''
    setValue('email', usuarioSimples)
    
    // Deixa o campo de senha vazio. Se não for preenchido, a senha não altera.
    setValue('password', '')
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    reset({ nome: '', email: '', password: '', role: 'CAIXA_MANHA' })
  }

  // --- AÇÃO DE EXCLUSÃO ---
  const handleDelete = async (id, nome) => {
    if (!window.confirm(`ATENÇÃO: Tem certeza que deseja excluir o acesso de ${nome}?`)) return
    setIsPageLoading(true)
    try {
      const { error } = await supabase.from('users').delete().eq('id', id)
      if (error) {
        if (error.code === '23503') throw new Error(`Não é possível excluir ${nome} porque este operador já possui movimentações registradas na auditoria.`)
        throw error
      }
      alert('Operador removido com sucesso!')
      if (editingId === id) handleCancelEdit()
      await carregarUsuariosDaLoja()
    } catch (err) {
      alert(err.message)
    } finally {
      setIsPageLoading(false)
    }
  }

  // --- SALVAR (CRIAR OU EDITAR) ---
  const onSalvarUsuario = async (data) => {
    setIsActionLoading(true)
    try {
      const emailFicticio = data.email.toLowerCase().trim() + '@torresfarma.com'
      const senhaSecreta = data.password ? (data.password + 'TF') : null

      if (editingId) {
        // MODO EDIÇÃO: 1. Atualiza Nome e Cargo
        const { error: updateError } = await supabase
          .from('users')
          .update({ nome: data.nome, role: data.role })
          .eq('id', editingId)
        if (updateError) throw updateError

        // MODO EDIÇÃO: 2. Chama a Função Segura (RPC) para atualizar Usuário e Senha
        const { error: rpcError } = await supabase.rpc('admin_update_user', {
          target_user_id: editingId,
          new_email: emailFicticio,
          new_password: senhaSecreta
        })
        if (rpcError) throw rpcError

        alert('Dados do operador atualizados com sucesso!')
        handleCancelEdit()

      } else {
        // MODO CRIAÇÃO (Permanece igual)
        const { data: authData, error: authError } = await detachedAuthClient.auth.signUp({
          email: emailFicticio, password: senhaSecreta,
          options: { data: { nome: data.nome, role: data.role, store_id: user.store_id } },
        })

        if (authError) throw authError
        if (authData?.user) {
          const { error: profileError } = await supabase.from('users').upsert([
            { id: authData.user.id, nome: data.nome, role: data.role, store_id: user.store_id, email: emailFicticio },
          ])
          if (profileError) throw profileError
          alert(`Usuário ${data.nome} cadastrado com sucesso!`)
          reset()
        }
      }
      await carregarUsuariosDaLoja()
    } catch (err) {
      alert('Erro na operação: ' + err.message)
    } finally {
      setIsActionLoading(false)
    }
  }

  const colunas = [
    { header: 'Nome do Funcionário', accessorKey: 'nome' },
    {
      header: 'Perfil / Turno',
      render: (row) => {
        if (row.role === 'CAIXA_MANHA') return '🌅 Caixa da Manhã'
        if (row.role === 'CAIXA_TARDE') return '🌇 Caixa da Tarde'
        return '🔑 Administrador'
      },
    },
    {
      header: 'Ações',
      render: (row) => (
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => handleEdit(row)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer' }} title="Editar Dados">
            <Pencil size={18} />
          </button>
          {row.id !== user.id && (
            <button onClick={() => handleDelete(row.id, row.nome)} style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer' }} title="Excluir Operador">
              <Trash2 size={18} />
            </button>
          )}
        </div>
      )
    }
  ]

  if (isPageLoading) return <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}><Loader2 className="animate-spin" size={32} color="var(--color-primary)" /><span>Processando dados...</span></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '1.875rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>Controle de Acessos</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>Cadastre e gerencie as contas dos operadores de caixa da manhã e da tarde.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '24px', alignItems: 'start' }}>
        
        <form onSubmit={handleSubmit(onSalvarUsuario)}>
          <Card title={editingId ? 'Editar Operador' : 'Adicionar Novo Operador'} icon={editingId ? Pencil : UserPlus}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <FormInput label="Nome Completo" id="nome" placeholder="Ex: Ana Paula" register={register('nome', { required: 'O nome é obrigatório' })} error={errors.nome} />

              <FormInput label="Usuário de Acesso" id="email" type="text" placeholder="Ex: josiane" register={register('email', { required: 'O usuário é obrigatório' })} error={errors.email} />
              
              {/* No modo edição, a senha não é obrigatória */}
              <FormInput 
                label={editingId ? "Nova Senha (opcional)" : "Senha de Acesso"} 
                id="password" 
                type="password" 
                maxLength={4} 
                inputMode="numeric" 
                pattern="[0-9]*" 
                placeholder={editingId ? "Deixe vazio para manter atual" : "PIN de 4 dígitos (Ex: 1234)"} 
                register={register('password', { 
                  required: editingId ? false : 'O PIN é obrigatório', 
                  minLength: { value: 4, message: 'Digite 4 números' },
                  maxLength: { value: 4, message: 'Digite 4 números' }
                })} 
                error={errors.password} 
              />

              <div className="input-wrapper">
                <label className="input-label">Atribuição de Turno (Perfil)</label>
                <select id="role" className="input-field" {...register('role')}>
                  <option value="CAIXA_MANHA">Caixa da Manhã (Lançamentos)</option>
                  <option value="CAIXA_TARDE">Caixa da Tarde (Conferências/Check)</option>
                  <option value="ADMIN">Administrador (Auditoria/Gerente)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <Button type="submit" isLoading={isActionLoading}>
                  {editingId ? 'Salvar Alterações' : 'Criar Conta'}
                </Button>
                
                {editingId && (
                  <Button type="button" variant="secondary" onClick={handleCancelEdit} style={{ padding: '0 12px' }}>
                    <X size={18} /> Cancelar
                  </Button>
                )}
              </div>

            </div>
          </Card>
        </form>

        <Card title="Funcionários Registrados na Filial" icon={Users}>
          <Table columns={colunas} data={usuarios} />
        </Card>
      </div>
    </div>
  )
}
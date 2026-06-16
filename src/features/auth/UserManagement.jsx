import React, { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../../infrastructure/supabase/supabaseClient'
import { useAuth } from '../../core/hooks/useAuth'
import { UserPlus, Users, Shield, Loader2 } from 'lucide-react'

import { Card } from '../../shared/components/cards/Card'
import { FormInput } from '../../shared/components/forms/FormInput'
import { Button } from '../../shared/components/buttons/Button'
import { Table } from '../../shared/components/tables/Table'

// Instância isolada para cadastrar usuários sem deslogar o Administrador atual
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const detachedAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    storageKey: 'torres-farma-detached-auth',
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
})

export const UserManagement = () => {
  const { user } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [isActionLoading, setIsActionLoading] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm()

  // Buscar todos os usuários vinculados à mesma filial (store_id)
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
      console.error('Erro ao buscar usuários:', err.message)
    } finally {
      setIsPageLoading(false)
    }
  }, [user?.store_id])

  useEffect(() => {
    carregarUsuariosDaLoja()
  }, [carregarUsuariosDaLoja])

  const onCadastrarUsuario = async (data) => {
    setIsActionLoading(true)
    try {
      // 1. Criar o usuário no microsserviço de autenticação (Auth)
      const { data: authData, error: authError } =
        await detachedAuthClient.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              nome: data.nome,
              role: data.role,
              store_id: user.store_id,
            },
          },
        })

      if (authError) throw authError

      if (authData?.user) {
        // 2. Inserir/Sincronizar dados na tabela pública de perfis (public.users)
        const { error: profileError } = await supabase.from('users').upsert([
          {
            id: authData.user.id,
            nome: data.nome,
            role: data.role,
            store_id: user.store_id,
            email: data.email, 
          },
        ])

        if (profileError) throw profileError

        alert(`Usuário ${data.nome} cadastrado com sucesso!`)
        reset()
        await carregarUsuariosDaLoja()
      }
    } catch (err) {
      alert('Erro ao registrar funcionário: ' + err.message)
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
  ]

  if (isPageLoading) {
    return (
      <div
        style={{
          height: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
        }}
      >
        <Loader2
          className="animate-spin"
          size={32}
          color="var(--color-primary)"
        />
        <span>Carregando quadro de funcionários...</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1
          style={{
            fontSize: '1.875rem',
            color: 'var(--color-primary)',
            fontWeight: 'bold',
          }}
        >
          Controle de Acessos
        </h1>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Cadastre e gerencie as contas dos operadores de caixa da manhã e da
          tarde.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '400px 1fr',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* Formulário de Cadastro */}
        <form onSubmit={handleSubmit(onCadastrarUsuario)}>
          <Card title="Adicionar Novo Operador" icon={UserPlus}>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <FormInput
                label="Nome Completo"
                id="nome"
                placeholder="Ex: Ana Paula"
                register={register('nome', {
                  required: 'O nome é obrigatório',
                })}
                error={errors.nome}
              />

              <FormInput
                label="E-mail de Login"
                id="email"
                type="email"
                placeholder="operador@torresfarma.com.br"
                register={register('email', {
                  required: 'O e-mail é obrigatório',
                })}
                error={errors.email}
              />

              <FormInput
                label="Senha de Acesso"
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                register={register('password', {
                  required: 'A senha é obrigatória',
                  minLength: {
                    value: 6,
                    message: 'A senha deve ter pelo menos 6 dígitos',
                  },
                })}
                error={errors.password}
              />

              <div className="input-wrapper">
                <label className="input-label">
                  Atribuição de Turno (Perfil)
                </label>
                <select id="role" className="input-field" {...register('role')}>
                  <option value="CAIXA_MANHA">
                    Caixa da Manhã (Lançamentos)
                  </option>
                  <option value="CAIXA_TARDE">
                    Caixa da Tarde (Conferências/Check)
                  </option>
                  <option value="ADMIN">
                    Administrador (Auditoria/Gerente)
                  </option>
                </select>
              </div>

              <Button type="submit" isLoading={isActionLoading}>
                Criar Conta do Operador
              </Button>
            </div>
          </Card>
        </form>

        {/* Quadro Geral de Usuários */}
        <Card title="Funcionários Registrados na Filial" icon={Users}>
          <Table columns={colunas} data={usuarios} />
        </Card>
      </div>
    </div>
  )
}

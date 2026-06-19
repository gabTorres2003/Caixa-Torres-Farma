import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { LogIn } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../core/hooks/useAuth'

import { Card } from '../../shared/components/cards/Card'
import { FormInput } from '../../shared/components/forms/FormInput'
import { FormError } from '../../shared/components/forms/FormError'
import { Button } from '../../shared/components/buttons/Button'

export const Login = () => {
  const { login } = useAuth()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm()

  const [isLoading, setIsLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  const onSubmit = async (data) => {
    setIsLoading(true)
    setAuthError('')

    try {
      // 1. Pega o usuário simples (ex: brunamanha) e adiciona o domínio falso
      const emailFicticio = data.usuario.toLowerCase().trim() + '@torresfarma.com';
      
      // 2. Pega o PIN digitado (ex: 1234) e adiciona o sufixo secreto
      const senhaSecreta = data.password + 'TF';

      // 3. Faz o login no Supabase usando as credenciais mascaradas
      await login(emailFicticio, senhaSecreta)
      
      // Envia para a rota raiz ('/'), e o AppRoutes decide para onde ir baseado no cargo
      navigate('/', { replace: true })
    } catch (error) {
      console.error(error)
      setAuthError('Usuário ou PIN incorretos. Verifique suas credenciais.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card style={{ width: '100%', maxWidth: '420px' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h2
          style={{
            color: 'var(--color-primary)',
            fontSize: '1.75rem',
            fontWeight: 'bold',
          }}
        >
          Torres Farma
        </h2>
        <p style={{ color: 'var(--color-text-muted)', marginTop: '4px' }}>
          Sistema de Gestão de Caixas
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
      >
        <FormError message={authError} />

        {/* CAMPO DE USUÁRIO (Sem validação de E-mail) */}
        <FormInput
          label="Usuário de Acesso"
          id="usuario"
          type="text" 
          placeholder="Ex: josiane"
          autoComplete="username"
          register={register('usuario', {
            required: 'O usuário é obrigatório',
          })}
          error={errors.usuario}
        />

        {/* CAMPO DO PIN (Travado em 4 dígitos) */}
        <FormInput
          label="PIN de Acesso"
          id="password"
          type="password"
          maxLength={4}
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="••••"
          autoComplete="current-password"
          register={register('password', {
            required: 'O PIN é obrigatório',
            minLength: {
              value: 4,
              message: 'O PIN deve ter exatos 4 números',
            },
            maxLength: {
              value: 4,
              message: 'O PIN deve ter exatos 4 números',
            },
          })}
          error={errors.password}
        />

        <div style={{ marginTop: '8px' }}>
          <Button type="submit" isLoading={isLoading} icon={LogIn}>
            Acessar Caixa
          </Button>
        </div>
      </form>
    </Card>
  )
}
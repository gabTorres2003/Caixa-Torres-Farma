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
      // 1. Mascara as credenciais para o formato do Supabase
      const emailFicticio = data.usuario.toLowerCase().trim() + '@torresfarma.com'
      const senhaSecreta = data.password + 'TF'

      // 2. Faz o login no banco de dados
      await login(emailFicticio, senhaSecreta)
      
      // 3. Salva o turno selecionado na memória local do navegador
      localStorage.setItem('turnoOperacional', data.turnoOperacional || 'AUTOMATICO')

      // Envia para a tela inicial
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
            minLength: { value: 4, message: 'O PIN deve ter exatos 4 números' },
            maxLength: { value: 4, message: 'O PIN deve ter exatos 4 números' },
          })}
          error={errors.password}
        />

        {/* --- INÍCIO DO BLOCO DO TURNO --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label
            htmlFor="turnoOperacional"
            style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              color: 'var(--color-text-main)'
            }}
          >
            Turno de Trabalho Atual
          </label>
          <select
            id="turnoOperacional"
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-background)',
              fontSize: '1rem',
              color: 'var(--color-text-main)',
              outline: 'none',
              cursor: 'pointer'
            }}
            {...register('turnoOperacional', {
              required: 'Você deve informar qual turno está assumindo.',
            })}
          >
            <option value="AUTOMATICO">Automático (Meu turno padrão)</option>
            <option value="Manhã">Manhã</option>
            <option value="Tarde">Tarde</option>
          </select>
          {errors.turnoOperacional && (
            <span style={{ color: 'var(--color-error)', fontSize: '0.75rem' }}>
              {errors.turnoOperacional.message}
            </span>
          )}
        </div>
        {/* --- FIM DO BLOCO DO TURNO --- */}

        <div style={{ marginTop: '8px' }}>
          <Button type="submit" isLoading={isLoading} icon={LogIn}>
            Acessar Caixa
          </Button>
        </div>
      </form>
    </Card>
  )
}
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
      await login(data.email, data.password)
      // Envia para a rota raiz ('/'), e o AppRoutes decide para onde ir baseado no cargo
      navigate('/', { replace: true })
    } catch (error) {
      console.error(error)
      setAuthError('E-mail ou senha incorretos. Verifique suas credenciais.')
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
          label="E-mail"
          id="email"
          type="email"
          placeholder="operador@torresfarma.com.br"
          autoComplete="username"
          register={register('email', {
            required: 'O e-mail é obrigatório',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'E-mail inválido',
            },
          })}
          error={errors.email}
        />

        <FormInput
          label="Senha"
          id="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          register={register('password', {
            required: 'A senha é obrigatória',
            minLength: {
              value: 6,
              message: 'A senha deve ter no mínimo 6 caracteres',
            },
          })}
          error={errors.password}
        />

        <div style={{ marginTop: '8px' }}>
          <Button type="submit" isLoading={isLoading} icon={LogIn}>
            Acessar Sistema
          </Button>
        </div>
      </form>
    </Card>
  )
}

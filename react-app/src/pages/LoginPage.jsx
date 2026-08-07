import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './LoginPage.css'

export default function LoginPage() {
  const { user, authReady, hasUsers, statusError, login, register } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (user) {
    return <Navigate to="/panel" replace />
  }

  if (statusError) {
    return (
      <div className="login-screen">
        <p style={{ color: '#fff' }}>No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.</p>
      </div>
    )
  }

  if (!authReady || hasUsers === null) {
    return (
      <div className="login-screen">
        <p style={{ color: '#fff' }}>Cargando...</p>
      </div>
    )
  }

  const esConfiguracionInicial = hasUsers === false

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (esConfiguracionInicial && password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setEnviando(true)
    const result = esConfiguracionInicial
      ? await register(email, password)
      : await login(email, password)
    setEnviando(false)

    if (result.ok) {
      navigate('/panel')
    } else {
      setError(result.message)
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Patato</h1>
        <p className="login-subtitle">
          {esConfiguracionInicial ? 'Crear cuenta de acceso' : 'Iniciar sesión'}
        </p>

        {esConfiguracionInicial && (
          <p className="login-info">
            Aún no hay ninguna cuenta configurada. Crea la tuya para poder entrar.
          </p>
        )}

        {error && <p className="login-error">{error}</p>}

        <label htmlFor="email">Correo</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="correo@ejemplo.com"
          required
        />

        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />

        {esConfiguracionInicial && (
          <>
            <label htmlFor="confirmPassword">Confirmar contraseña</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </>
        )}

        <button type="submit" disabled={enviando}>
          {enviando ? 'Enviando...' : esConfiguracionInicial ? 'Crear cuenta' : 'Ingresar'}
        </button>
      </form>
    </div>
  )
}

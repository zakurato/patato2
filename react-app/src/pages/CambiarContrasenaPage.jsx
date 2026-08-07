import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import './CambiarContrasenaPage.css'

export default function CambiarContrasenaPage() {
  const { changePassword } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMensaje('')

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas nuevas no coinciden')
      return
    }

    setEnviando(true)
    const resultado = await changePassword(currentPassword, newPassword)
    setEnviando(false)

    if (resultado.ok) {
      setMensaje('Contraseña actualizada correctamente')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } else {
      setError(resultado.message)
    }
  }

  return (
    <div>
      <h1>Cambiar contraseña</h1>
      <form className="password-form" onSubmit={handleSubmit}>
        {error && <p className="password-form-error">{error}</p>}
        {mensaje && <p className="password-form-mensaje">{mensaje}</p>}

        <label htmlFor="currentPassword">Contraseña actual</label>
        <input
          id="currentPassword"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="••••••••"
          required
        />

        <label htmlFor="newPassword">Nueva contraseña</label>
        <input
          id="newPassword"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="••••••••"
          required
        />

        <label htmlFor="confirmPassword">Confirmar nueva contraseña</label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          required
        />

        <button type="submit" disabled={enviando}>
          {enviando ? 'Guardando...' : 'Actualizar contraseña'}
        </button>
      </form>
    </div>
  )
}

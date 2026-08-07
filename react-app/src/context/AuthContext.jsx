import { createContext, useContext, useEffect, useState } from 'react'
import { api, getToken, setToken, clearToken, onUnauthorized } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [hasUsers, setHasUsers] = useState(null)
  const [statusError, setStatusError] = useState(false)

  useEffect(() => {
    onUnauthorized(() => {
      clearToken()
      setUser(null)
    })
    validarSesion()
  }, [])

  async function validarSesion() {
    try {
      const status = await api.get('/auth/status')
      setHasUsers(status.hasUsers)
    } catch {
      setStatusError(true)
    }

    const token = getToken()
    if (!token) {
      setAuthReady(true)
      return
    }

    try {
      const usuario = await api.get('/auth/me')
      setUser(usuario)
    } catch {
      clearToken()
      setUser(null)
    } finally {
      setAuthReady(true)
    }
  }

  async function login(email, password) {
    try {
      const data = await api.post('/auth/login', { email, password })
      setToken(data.token)
      setUser(data.user)
      return { ok: true }
    } catch (err) {
      return { ok: false, message: err.message }
    }
  }

  async function register(email, password) {
    try {
      const data = await api.post('/auth/register', { email, password })
      setToken(data.token)
      setUser(data.user)
      setHasUsers(true)
      return { ok: true }
    } catch (err) {
      return { ok: false, message: err.message }
    }
  }

  function logout() {
    clearToken()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, authReady, hasUsers, statusError, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}

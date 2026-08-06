import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'

const ClientesContext = createContext(null)

export function ClientesProvider({ children }) {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')

  useEffect(() => {
    cargarUsuarios()
  }, [])

  async function cargarUsuarios() {
    setLoading(true)
    try {
      const data = await api.get('/usuarios')
      setUsuarios(data)
      setErrorCarga('')
    } catch (err) {
      setErrorCarga(err.message)
    } finally {
      setLoading(false)
    }
  }

  const clientesCount = usuarios.length
  const sumaACobrar = useMemo(
    () => usuarios.reduce((total, u) => total + Number(u.saldoRebajado), 0),
    [usuarios],
  )

  function estadoDeUsuario(usuarioId) {
    return getUsuario(usuarioId)?.estado ?? 1
  }

  function getUsuario(usuarioId) {
    return usuarios.find((u) => u.id === Number(usuarioId))
  }

  async function crearUsuario(datos) {
    try {
      const usuario = await api.post('/usuarios', datos)
      setUsuarios((prev) => [...prev, usuario])
      return { ok: true, usuario }
    } catch (err) {
      return { ok: false, message: err.message }
    }
  }

  async function actualizarUsuario(usuarioId, datos) {
    try {
      const usuario = await api.put(`/usuarios/${usuarioId}`, datos)
      setUsuarios((prev) => prev.map((u) => (u.id === usuario.id ? usuario : u)))
      return { ok: true, usuario }
    } catch (err) {
      return { ok: false, message: err.message }
    }
  }

  async function eliminarUsuario(usuarioId) {
    await api.del(`/usuarios/${usuarioId}`)
    setUsuarios((prev) => prev.filter((u) => u.id !== Number(usuarioId)))
  }

  async function fetchAbonosDeUsuario(usuarioId) {
    return api.get(`/usuarios/${usuarioId}/abonos`)
  }

  async function aplicarAbono(usuarioId, monto) {
    try {
      const abono = await api.post(`/usuarios/${usuarioId}/abonos`, { monto })
      setUsuarios((prev) =>
        prev.map((u) =>
          u.id === Number(usuarioId) ? { ...u, saldoRebajado: abono.saldoResultante, estado: 1 } : u,
        ),
      )
      return { ok: true, abono }
    } catch (err) {
      return { ok: false, message: err.message }
    }
  }

  async function eliminarAbono(abono) {
    await api.del(`/abonos/${abono.id}`)
    setUsuarios((prev) =>
      prev.map((u) =>
        u.id === abono.usuarioId ? { ...u, saldoRebajado: Number(u.saldoRebajado) + Number(abono.monto) } : u,
      ),
    )
  }

  const value = {
    usuarios,
    loading,
    errorCarga,
    clientesCount,
    sumaACobrar,
    estadoDeUsuario,
    getUsuario,
    crearUsuario,
    actualizarUsuario,
    eliminarUsuario,
    fetchAbonosDeUsuario,
    aplicarAbono,
    eliminarAbono,
  }

  return (
    <ClientesContext.Provider value={value}>
      {children}
    </ClientesContext.Provider>
  )
}

export function useClientes() {
  const ctx = useContext(ClientesContext)
  if (!ctx) throw new Error('useClientes debe usarse dentro de ClientesProvider')
  return ctx
}

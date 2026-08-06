import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useClientes } from '../context/ClientesContext'
import { formatColones, formatFechaHora } from '../utils/format'
import './AbonoPage.css'

export default function AbonoPage() {
  const { id } = useParams()
  const { getUsuario, loading, fetchAbonosDeUsuario, aplicarAbono, eliminarAbono } = useClientes()
  const [monto, setMonto] = useState('')
  const [error, setError] = useState('')
  const [historial, setHistorial] = useState([])
  const [cargandoHistorial, setCargandoHistorial] = useState(true)

  const usuario = getUsuario(id)

  useEffect(() => {
    if (!usuario) return
    cargarHistorial()
  }, [usuario?.id])

  async function cargarHistorial() {
    setCargandoHistorial(true)
    const data = await fetchAbonosDeUsuario(usuario.id)
    setHistorial(data)
    setCargandoHistorial(false)
  }

  if (!usuario) {
    return (
      <div>
        <h1>{loading ? 'Cargando...' : 'Cliente no encontrado'}</h1>
        {!loading && <Link to="/panel" className="btn btn-gris">Volver al inicio</Link>}
      </div>
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const resultado = await aplicarAbono(usuario.id, monto)
    if (resultado.ok) {
      setMonto('')
      setError('')
      cargarHistorial()
    } else {
      setError(resultado.message)
    }
  }

  async function handleEliminarAbono(abono) {
    const confirmado = window.confirm('¿Eliminar este abono? El monto se devolverá al saldo actual.')
    if (!confirmado) return
    await eliminarAbono(abono)
    cargarHistorial()
  }

  return (
    <div>
      <h1>Aplicar abono</h1>

      <div className="abono-resumen">
        <h2>{usuario.nombre}</h2>
        <p>Método de pago: {usuario.metodoPago}</p>
        <p>Saldo inicial: {formatColones(usuario.saldo)}</p>
        <p className="abono-saldo-actual">Saldo actual: {formatColones(usuario.saldoRebajado)}</p>
      </div>

      <form className="abono-form" onSubmit={handleSubmit}>
        {error && <p className="abono-error">{error}</p>}
        <label htmlFor="monto">Monto del abono (₡)</label>
        <input
          id="monto"
          type="text"
          inputMode="decimal"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          required
        />
        <button type="submit">Aplicar abono</button>
      </form>

      <h3>Historial de abonos</h3>
      {cargandoHistorial ? (
        <p>Cargando historial...</p>
      ) : historial.length === 0 ? (
        <p>Este cliente aún no tiene abonos aplicados.</p>
      ) : (
        <table className="abono-tabla">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Abono</th>
              <th>Saldo restante</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {historial.map((abono) => (
              <tr key={abono.id}>
                <td>{formatFechaHora(abono.fecha)}</td>
                <td>{formatColones(abono.monto)}</td>
                <td>{formatColones(abono.saldoResultante)}</td>
                <td>
                  <button type="button" className="btn-eliminar-abono" onClick={() => handleEliminarAbono(abono)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p><Link to={`/clientes/${usuario.metodoPago}`} className="btn btn-gris">Volver a la tabla de clientes</Link></p>
    </div>
  )
}

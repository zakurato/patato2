import { useState } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import { useClientes } from '../context/ClientesContext'
import { formatColones } from '../utils/format'
import { whatsappSaldoUrl, whatsappCobroUrl } from '../utils/whatsapp'
import './ClientesTablaPage.css'

const ESTADO_CLASS = {
  1: 'estado-verde',
  0: 'estado-negro',
  '-1': 'estado-rojo',
}

export default function ClientesTablaPage() {
  const { tipo } = useParams()
  const location = useLocation()
  const { usuarios, loading, estadoDeUsuario, eliminarUsuario } = useClientes()
  const [txtBuscar, setTxtBuscar] = useState('')
  const [mensaje, setMensaje] = useState(location.state?.mensaje ?? '')
  const [clienteAbierto, setClienteAbierto] = useState(null)

  const clientesFiltrados = usuarios.filter(
    (u) =>
      u.metodoPago === tipo &&
      u.nombre.toLowerCase().includes(txtBuscar.toLowerCase()),
  )

  function toggleCliente(id) {
    setClienteAbierto((actual) => (actual === id ? null : id))
  }

  async function eliminarCliente(usuario) {
    const confirmado = window.confirm('¿Estás seguro de que deseas eliminar este cliente?')
    if (!confirmado) return

    await eliminarUsuario(usuario.id)
  }

  return (
    <div>
      <div className="tabla-header">
        <div className="tabla-header-titulo">
          <h1>Tabla Clientes {tipo}</h1>
        </div>
        <div className="tabla-acciones-header">
          <Link to={`/clientes/nuevo/${tipo}`} className="btn btn-azul">
            Registrar usuario
          </Link>
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={txtBuscar}
            onChange={(e) => setTxtBuscar(e.target.value)}
          />
        </div>
        <div className="tabla-acciones-header">
          <Link to="/panel" className="btn btn-gris">
            Volver al inicio
          </Link>
        </div>
      </div>

      {mensaje && (
        <p className="mensaje-exito" onAnimationEnd={() => setMensaje('')}>
          {mensaje}
        </p>
      )}

      {loading && <p>Cargando clientes...</p>}
      {!loading && clientesFiltrados.length === 0 && <p>No hay clientes de pago {tipo}.</p>}

      <div className="clientes-lista">
        {clientesFiltrados.map((usuario) => {
          const estado = estadoDeUsuario(usuario.id)
          const abierto = clienteAbierto === usuario.id

          return (
            <div key={usuario.id} className={`cliente-card ${ESTADO_CLASS[estado]} ${abierto ? 'abierto' : ''}`}>
              <button
                type="button"
                className="cliente-select"
                onClick={() => toggleCliente(usuario.id)}
                aria-expanded={abierto}
              >
                <span className="cliente-select-nombre">{usuario.nombre}</span>
                <span className="cliente-select-flecha">▾</span>
              </button>

              {abierto && (
                <div className="cliente-detalle">
                  <div className="cliente-info">
                    <p>Teléfono: {usuario.telefono}</p>
                    <p>Préstamo: {formatColones(usuario.prestamo)}</p>
                    <p>Saldo inicial: {formatColones(usuario.saldo)}</p>
                    <p>Saldo actual: {formatColones(usuario.saldoRebajado)}</p>
                    <p>Método de pago: {usuario.metodoPago}</p>
                  </div>

                  <div className="cliente-acciones">
                    <Link to={`/clientes/abono/${usuario.id}`} className="btn btn-abonar">
                      Aplicar abono
                    </Link>
                    <Link to={`/clientes/editar/${usuario.id}`} className="btn btn-azul">
                      Editar
                    </Link>
                    <button type="button" className="btn btn-rojo" onClick={() => eliminarCliente(usuario)}>
                      Eliminar
                    </button>
                    <a
                      className="btn btn-verde"
                      href={whatsappSaldoUrl(usuario)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Enviar saldo
                    </a>
                    {estado !== 1 && (
                      <a
                        className="btn btn-naranja"
                        href={whatsappCobroUrl(usuario)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Cobrar deuda
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p><Link to="/panel" className="btn btn-gris">Volver al inicio</Link></p>
    </div>
  )
}

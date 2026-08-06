import { useParams, useNavigate, Link } from 'react-router-dom'
import { useClientes } from '../context/ClientesContext'
import ClienteForm from '../components/ClienteForm'

export default function ClienteEditarPage() {
  const { id } = useParams()
  const { getUsuario, actualizarUsuario, loading } = useClientes()
  const navigate = useNavigate()

  const usuario = getUsuario(id)

  if (!usuario) {
    return (
      <div>
        <h1>{loading ? 'Cargando...' : 'Cliente no encontrado'}</h1>
        {!loading && <Link to="/panel" className="btn btn-gris">Volver al inicio</Link>}
      </div>
    )
  }

  async function handleSubmit(datos) {
    const resultado = await actualizarUsuario(id, datos)
    if (resultado.ok) {
      navigate(`/clientes/${resultado.usuario.metodoPago}`, {
        state: { mensaje: 'Cliente actualizado correctamente' },
      })
    }
    return resultado
  }

  return (
    <div>
      <h1>Editar cliente</h1>
      <ClienteForm
        valoresIniciales={usuario}
        onSubmit={handleSubmit}
        submitLabel="Guardar cambios"
        saldoActual={usuario.saldoRebajado}
      />
    </div>
  )
}

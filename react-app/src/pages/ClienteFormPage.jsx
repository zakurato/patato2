import { useNavigate, useParams } from 'react-router-dom'
import { useClientes } from '../context/ClientesContext'
import ClienteForm from '../components/ClienteForm'

const METODOS_PAGO = ['Diario', 'Semanal', 'Quincenal', 'Mensual']

export default function ClienteFormPage() {
  const { crearUsuario } = useClientes()
  const navigate = useNavigate()
  const { tipo } = useParams()

  const valoresIniciales = METODOS_PAGO.includes(tipo) ? { metodoPago: tipo } : undefined

  async function handleSubmit(datos) {
    const resultado = await crearUsuario(datos)
    if (resultado.ok) {
      navigate(`/clientes/${resultado.usuario.metodoPago}`, {
        state: { mensaje: 'Cliente guardado correctamente' },
      })
    }
    return resultado
  }

  return (
    <div>
      <h1>Registrar usuario</h1>
      <ClienteForm valoresIniciales={valoresIniciales} onSubmit={handleSubmit} submitLabel="Guardar cliente" />
    </div>
  )
}

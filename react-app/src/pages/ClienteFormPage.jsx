import { useNavigate } from 'react-router-dom'
import { useClientes } from '../context/ClientesContext'
import ClienteForm from '../components/ClienteForm'

export default function ClienteFormPage() {
  const { crearUsuario } = useClientes()
  const navigate = useNavigate()

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
      <ClienteForm onSubmit={handleSubmit} submitLabel="Guardar cliente" />
    </div>
  )
}

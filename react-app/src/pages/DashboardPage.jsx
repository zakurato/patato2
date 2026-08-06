import { Link } from 'react-router-dom'
import { useClientes } from '../context/ClientesContext'
import { formatColones } from '../utils/format'
import './DashboardPage.css'

const TIPOS_PAGO = ['Diario', 'Semanal', 'Quincenal', 'Mensual']

const DIAS_SEMANA = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
]

export default function DashboardPage() {
  const { clientesCount, sumaACobrar } = useClientes()

  const ahora = new Date()
  const diaSemana = DIAS_SEMANA[ahora.getDay()]
  const diaActual = String(ahora.getDate()).padStart(2, '0')
  const horaActual = ahora.toLocaleTimeString('es-CR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div>
      <h1>Página principal</h1>

      <div className="dashboard-stats">
        <div className="stat-box">
          <label htmlFor="total-clientes">Clientes</label>
          <input id="total-clientes" type="text" value={clientesCount} readOnly />
        </div>

        <div className="stat-box">
          <label htmlFor="total-cobrar">Total a cobrar a clientes</label>
          <input id="total-cobrar" type="text" value={formatColones(sumaACobrar)} readOnly />
        </div>
      </div>

      <div className="tipo-pago-grid">
        {TIPOS_PAGO.map((tipo) => (
          <Link key={tipo} to={`/clientes/${tipo}`} className="tipo-pago-button">
            Clientes de pago {tipo}
          </Link>
        ))}
      </div>

      <div className="fecha-info">
        <span>Día actual: {diaActual}</span>
        <span>Día de la semana: {diaSemana}</span>
        <span>Hora actual: {horaActual}</span>
      </div>
    </div>
  )
}

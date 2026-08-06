import { useState } from 'react'
import './ClienteForm.css'

const METODOS_PAGO = ['Diario', 'Semanal', 'Quincenal', 'Mensual']

const CAMPOS_VACIOS = {
  cedula: '',
  nombre: '',
  telefono: '',
  direccion: '',
  prestamo: '',
  interes: '',
  metodoPago: 'Diario',
}

export default function ClienteForm({ valoresIniciales, onSubmit, submitLabel, saldoActual }) {
  const [form, setForm] = useState({ ...CAMPOS_VACIOS, ...valoresIniciales })
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const prestamo = Number(form.prestamo) || 0
  const interesesCalculados = Number(form.interes) || 0
  const saldoCalculado = prestamo + interesesCalculados

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setEnviando(true)
    const resultado = await onSubmit(form)
    setEnviando(false)
    if (resultado && resultado.ok === false) {
      setError(resultado.message)
    }
  }

  return (
    <form className="cliente-form" onSubmit={handleSubmit}>
      {error && <p className="cliente-form-error">{error}</p>}

      <label htmlFor="cedula">Cédula</label>
      <input id="cedula" name="cedula" value={form.cedula} onChange={handleChange} required />

      <label htmlFor="nombre">Nombre</label>
      <input id="nombre" name="nombre" value={form.nombre} onChange={handleChange} required />

      <label htmlFor="telefono">Teléfono</label>
      <input id="telefono" name="telefono" value={form.telefono} onChange={handleChange} required />

      <label htmlFor="direccion">Dirección</label>
      <input id="direccion" name="direccion" value={form.direccion} onChange={handleChange} required />

      <label htmlFor="prestamo">Préstamo (₡)</label>
      <input
        id="prestamo"
        name="prestamo"
        type="text"
        inputMode="decimal"
        value={form.prestamo}
        onChange={handleChange}
        required
      />

      <label htmlFor="interes">Interés (₡)</label>
      <input
        id="interes"
        name="interes"
        type="text"
        inputMode="decimal"
        value={form.interes}
        onChange={handleChange}
        required
      />

      <label htmlFor="metodoPago">Método de pago</label>
      <select id="metodoPago" name="metodoPago" value={form.metodoPago} onChange={handleChange}>
        {METODOS_PAGO.map((metodo) => (
          <option key={metodo} value={metodo}>
            {metodo}
          </option>
        ))}
      </select>

      <div className="cliente-form-resumen">
        <p>Intereses ganados: ₡{interesesCalculados.toLocaleString('es-CR')}</p>
        {saldoActual === undefined ? (
          <p>Saldo total a cobrar: ₡{saldoCalculado.toLocaleString('es-CR')}</p>
        ) : (
          <p>Saldo actual (no cambia al editar): ₡{Number(saldoActual).toLocaleString('es-CR')}</p>
        )}
      </div>

      <button type="submit" disabled={enviando}>{enviando ? 'Guardando...' : submitLabel}</button>
    </form>
  )
}

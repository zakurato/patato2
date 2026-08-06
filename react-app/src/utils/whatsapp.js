import { formatFecha } from './format'

function toWhatsappPhone(telefono) {
  return `506${String(telefono).replace(/\D/g, '')}`
}

export function whatsappSaldoUrl(usuario) {
  const texto =
    `Préstamo: ₡${usuario.prestamo}\n` +
    `Saldo actual: ₡${usuario.saldoRebajado}\n` +
    `Método de pago: ${usuario.metodoPago}\n` +
    `Fecha de inicio del préstamo: ${formatFecha(usuario.createdAt)}`

  return `https://api.whatsapp.com/send?phone=${toWhatsappPhone(usuario.telefono)}&text=${encodeURIComponent(texto)}`
}

export function whatsappCobroUrl(usuario) {
  const texto =
    'El pago está pendiente. ¿Podría proporcionármelo a través de SINPE o preferiría que lo recoja personalmente?'

  return `https://api.whatsapp.com/send?phone=${toWhatsappPhone(usuario.telefono)}&text=${encodeURIComponent(texto)}`
}

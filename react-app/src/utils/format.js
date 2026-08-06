export function formatColones(amount) {
  return `₡${Number(amount).toLocaleString('es-CR')}`
}

export function formatFecha(fechaIso) {
  return new Date(fechaIso).toLocaleDateString('es-CR')
}

export function formatFechaHora(fechaIso) {
  return new Date(fechaIso).toLocaleString('es-CR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

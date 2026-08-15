// Motor de cálculo automático de estados (0 = neutro/negro, 1 = al día/verde, -1 = atrasado/rojo).
//
// Diario: ventana relativa al cliente (24h "al día" + 5h de gracia desde el último abono,
// o desde el registro si nunca ha abonado).
//
// Semanal / Quincenal / Mensual: calendario compartido por todos los clientes de ese método.
// Cada cliente guarda en estados.updated_at el momento en que entró a su color actual, y desde
// ahí se busca el próximo "checkpoint" del calendario que le corresponda.

const HORA = 60 * 60 * 1000

// Costa Rica es UTC-6 todo el año (sin horario de verano). El servidor corre en UTC
// (Vercel), así que para que "las 4am" sean 4am reales en Costa Rica, se construye el
// checkpoint en UTC sumando el offset en vez de usar la hora local del proceso.
const CR_OFFSET_HORAS = 6
const HORA_CORTE_QUINCENAL_CR = 4

function fechaCR(anio, mesIndex0, dia, horaCR) {
  return new Date(Date.UTC(anio, mesIndex0, dia, horaCR + CR_OFFSET_HORAS, 0, 0))
}

function ultimoDiaMes(anio, mesIndex0) {
  return new Date(anio, mesIndex0 + 1, 0).getDate()
}

function fechasLimiteMensual(anio, mesIndex0) {
  return [1, Math.min(30, ultimoDiaMes(anio, mesIndex0))]
}

function checkpointsDelMes(anio, mesIndex0, fechasLimiteFn) {
  const dias = fechasLimiteFn(anio, mesIndex0)
  const puntos = []
  for (const dia of dias) {
    puntos.push({ tipo: 'A', fecha: new Date(anio, mesIndex0, dia - 1) }) // verde -> negro
    puntos.push({ tipo: 'B', fecha: new Date(anio, mesIndex0, dia) }) // negro -> rojo
  }
  return puntos
}

// Quincenal usa días de calendario fijos (no dependen de la duración del mes):
// día 15 y día 1 del mes siguiente (verde -> negro), día 17 y día 2 del mes siguiente
// (negro -> rojo), todos a las 4am hora Costa Rica.
function checkpointsQuincenal(anio, mesIndex0) {
  return [
    { tipo: 'A', fecha: fechaCR(anio, mesIndex0, 15, HORA_CORTE_QUINCENAL_CR) },
    { tipo: 'B', fecha: fechaCR(anio, mesIndex0, 17, HORA_CORTE_QUINCENAL_CR) },
    { tipo: 'A', fecha: fechaCR(anio, mesIndex0 + 1, 1, HORA_CORTE_QUINCENAL_CR) },
    { tipo: 'B', fecha: fechaCR(anio, mesIndex0 + 1, 2, HORA_CORTE_QUINCENAL_CR) },
  ]
}

function proximoCheckpointQuincenal(desde, tipo) {
  const candidatos = []
  for (let offset = -1; offset <= 2; offset++) {
    const base = new Date(desde.getFullYear(), desde.getMonth() + offset, 1)
    candidatos.push(...checkpointsQuincenal(base.getFullYear(), base.getMonth()))
  }
  const validos = candidatos
    .filter((c) => c.tipo === tipo && c.fecha >= desde)
    .sort((a, b) => a.fecha - b.fecha)
  return validos[0]?.fecha ?? null
}

function proximoCheckpointMensual(desde, tipo, fechasLimiteFn) {
  const candidatos = []
  for (let offset = -1; offset <= 2; offset++) {
    const base = new Date(desde.getFullYear(), desde.getMonth() + offset, 1)
    candidatos.push(...checkpointsDelMes(base.getFullYear(), base.getMonth(), fechasLimiteFn))
  }
  const validos = candidatos
    .filter((c) => c.tipo === tipo && c.fecha >= desde)
    .sort((a, b) => a.fecha - b.fecha)
  return validos[0]?.fecha ?? null
}

function proximoCheckpointSemanal(desde, tipo) {
  const hora = tipo === 'A' ? 23 : 11 // A: domingo 11pm (verde->negro) | B: domingo 11am (negro->rojo)
  const diasHastaDomingo = (7 - desde.getDay()) % 7
  let candidato = new Date(
    desde.getFullYear(),
    desde.getMonth(),
    desde.getDate() + diasHastaDomingo,
    hora,
    0,
    0,
    0,
  )
  if (candidato < desde) {
    candidato = new Date(candidato.getTime() + 7 * 24 * HORA)
  }
  return candidato
}

function calcularEstadoDiario(ultimoAbonoFecha, creadoEn, ahora) {
  const huboAbono = Boolean(ultimoAbonoFecha)
  const referencia = huboAbono ? ultimoAbonoFecha : creadoEn
  const horas = (ahora - referencia) / HORA

  if (!huboAbono) {
    return horas < 29 ? 0 : -1
  }
  if (horas < 24) return 1
  if (horas < 29) return 0
  return -1
}

function calcularEstadoCalendario(metodoPago, estadoActual, updatedAt, ahora) {
  if (Number(estadoActual) === -1) return Number(estadoActual) // rojo es terminal hasta que se abone

  const tipo = Number(estadoActual) === 1 ? 'A' : 'B'
  let proximo

  if (metodoPago === 'Semanal') {
    proximo = proximoCheckpointSemanal(updatedAt, tipo)
  } else if (metodoPago === 'Quincenal') {
    proximo = proximoCheckpointQuincenal(updatedAt, tipo)
  } else if (metodoPago === 'Mensual') {
    proximo = proximoCheckpointMensual(updatedAt, tipo, fechasLimiteMensual)
  } else {
    return Number(estadoActual)
  }

  if (proximo && ahora >= proximo) {
    return Number(estadoActual) === 1 ? 0 : -1
  }
  return Number(estadoActual)
}

async function actualizarEstados(pool) {
  const ahora = new Date()

  const { rows } = await pool.query(`
    SELECT
      u.id AS usuario_id,
      u.metodo_pago,
      u.created_at,
      e.id AS estado_id,
      e.estado,
      e.updated_at,
      (SELECT fecha FROM abonos a WHERE a.usuario_id = u.id ORDER BY fecha DESC LIMIT 1) AS ultimo_abono
    FROM usuarios u
    JOIN estados e ON e.usuario_id = u.id
  `)

  let actualizados = 0

  for (const row of rows) {
    let nuevoEstado

    if (row.metodo_pago === 'Diario') {
      nuevoEstado = calcularEstadoDiario(
        row.ultimo_abono ? new Date(row.ultimo_abono) : null,
        new Date(row.created_at),
        ahora,
      )
    } else {
      nuevoEstado = calcularEstadoCalendario(row.metodo_pago, row.estado, new Date(row.updated_at), ahora)
    }

    if (Number(nuevoEstado) !== Number(row.estado)) {
      await pool.query('UPDATE estados SET estado = $1, updated_at = NOW() WHERE id = $2', [
        nuevoEstado,
        row.estado_id,
      ])
      actualizados += 1
    }
  }

  return { revisados: rows.length, actualizados }
}

module.exports = {
  actualizarEstados,
  calcularEstadoDiario,
  calcularEstadoCalendario,
  proximoCheckpointSemanal,
  proximoCheckpointQuincenal,
  proximoCheckpointMensual,
  fechasLimiteMensual,
}

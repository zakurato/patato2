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
const HORA_CORTE_SEMANAL_CR = 4

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

// Quincenal usa una sola secuencia de cortes fijos, repetida mes a mes: día 15 y día 1
// del mes siguiente, a las 4am hora Costa Rica. No hay fechas separadas para "negro" y
// "rojo": cada corte que un cliente cruza lo baja un nivel (verde -> negro, o
// negro -> rojo si le tocó estar en negro en el corte anterior y no pagó mientras tanto).
// Como los cortes están separados ~15 días entre sí, un cliente que acaba de pasar a
// negro tiene ese margen completo para pagar antes de llegar a rojo.
function fechasCorteQuincenal(anio, mesIndex0) {
  return [
    fechaCR(anio, mesIndex0, 15, HORA_CORTE_QUINCENAL_CR),
    fechaCR(anio, mesIndex0 + 1, 1, HORA_CORTE_QUINCENAL_CR),
  ]
}

function proximoCorteQuincenal(desde) {
  const candidatos = []
  for (let offset = -1; offset <= 2; offset++) {
    const base = new Date(desde.getFullYear(), desde.getMonth() + offset, 1)
    candidatos.push(...fechasCorteQuincenal(base.getFullYear(), base.getMonth()))
  }
  // Estrictamente después de "desde": si updated_at cayera justo en un corte, no debe
  // volver a encontrar ese mismo corte y disparar otro cambio de inmediato.
  const validos = candidatos.filter((f) => f > desde).sort((a, b) => a - b)
  return validos[0] ?? null
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

// Semanal usa la misma lógica que Quincenal: un único corte que se repite (todos los
// lunes a las 8pm hora Costa Rica) y que baja un nivel de color cada vez que se cruza.
function proximoLunesCR(desde) {
  // "Reloj de pared" en CR: se resta el offset para leer año/mes/día/día-de-semana
  // como los vería alguien en Costa Rica, aunque el timestamp esté en UTC.
  const wall = new Date(desde.getTime() - CR_OFFSET_HORAS * HORA)
  const diaSemana = wall.getUTCDay() // 0 = domingo, 1 = lunes, ...
  const diasHastaLunes = (8 - diaSemana) % 7

  let candidato = fechaCR(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate() + diasHastaLunes, HORA_CORTE_SEMANAL_CR)
  if (candidato <= desde) {
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

  if (metodoPago === 'Quincenal') {
    const corte = proximoCorteQuincenal(updatedAt)
    if (corte && ahora >= corte) {
      return Number(estadoActual) === 1 ? 0 : -1
    }
    return Number(estadoActual)
  }

  if (metodoPago === 'Semanal') {
    const corte = proximoLunesCR(updatedAt)
    if (corte && ahora >= corte) {
      return Number(estadoActual) === 1 ? 0 : -1
    }
    return Number(estadoActual)
  }

  const tipo = Number(estadoActual) === 1 ? 'A' : 'B'
  let proximo

  if (metodoPago === 'Mensual') {
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
  proximoLunesCR,
  proximoCorteQuincenal,
  proximoCheckpointMensual,
  fechasLimiteMensual,
}

const express = require('express')
const cors = require('cors')
require('dotenv').config()
const pool = require('./db')
const { registerAuthRoutes, requireAuth } = require('./auth')
const { actualizarEstados } = require('./estadoEngine')

const app = express()
app.use(cors())
app.use(express.json())

registerAuthRoutes(app)
app.use('/api/usuarios', requireAuth)
app.use('/api/abonos', requireAuth)

function mapUsuario(row) {
  return {
    id: row.id,
    cedula: row.cedula,
    nombre: row.nombre,
    telefono: row.telefono,
    direccion: row.direccion,
    prestamo: Number(row.prestamo),
    interes: Number(row.interes),
    metodoPago: row.metodo_pago,
    saldo: Number(row.saldo),
    saldoRebajado: Number(row.saldo_rebajado),
    interesesGanados: Number(row.intereses_ganados),
    createdAt: row.created_at,
    estado: row.estado === null || row.estado === undefined ? 0 : Number(row.estado),
  }
}

function mapAbono(row) {
  return {
    id: row.id,
    usuarioId: row.usuario_id,
    monto: Number(row.monto),
    saldoResultante: Number(row.saldo_resultante),
    fecha: row.fecha,
  }
}

const USUARIO_JOIN_SELECT = `
  SELECT u.*, e.estado AS estado
  FROM usuarios u
  LEFT JOIN estados e ON e.usuario_id = u.id
`

app.get('/api/usuarios', async (req, res) => {
  await actualizarEstados(pool)
  const result = await pool.query(`${USUARIO_JOIN_SELECT} ORDER BY u.nombre ASC`)
  res.json(result.rows.map(mapUsuario))
})

app.get('/api/usuarios/:id', async (req, res) => {
  const result = await pool.query(`${USUARIO_JOIN_SELECT} WHERE u.id = $1`, [req.params.id])
  if (result.rows.length === 0) return res.status(404).json({ message: 'Cliente no encontrado' })
  res.json(mapUsuario(result.rows[0]))
})

app.post('/api/usuarios', async (req, res) => {
  const { cedula, nombre, telefono, direccion, prestamo, interes, metodoPago } = req.body

  const prestamoNum = Number(prestamo)
  const interesNum = Number(interes)
  const saldo = interesNum

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const insertUsuario = await client.query(
      `INSERT INTO usuarios (cedula, nombre, telefono, direccion, prestamo, interes, metodo_pago, saldo, saldo_rebajado, intereses_ganados)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $6)
       RETURNING *`,
      [cedula, nombre, telefono, direccion, prestamoNum, interesNum, metodoPago, saldo],
    )
    const usuario = insertUsuario.rows[0]

    await client.query('INSERT INTO estados (usuario_id, estado) VALUES ($1, 0)', [usuario.id])

    await client.query('COMMIT')
    res.status(201).json(mapUsuario({ ...usuario, estado: 0 }))
  } catch (err) {
    await client.query('ROLLBACK')
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Ya existe un cliente registrado con esa cédula' })
    }
    res.status(500).json({ message: 'Error al crear el cliente' })
  } finally {
    client.release()
  }
})

app.put('/api/usuarios/:id', async (req, res) => {
  const { cedula, nombre, telefono, direccion, prestamo, interes, metodoPago } = req.body
  const prestamoNum = Number(prestamo)
  const interesNum = Number(interes)

  try {
    const result = await pool.query(
      `UPDATE usuarios
       SET cedula = $1, nombre = $2, telefono = $3, direccion = $4,
           prestamo = $5, interes = $6, metodo_pago = $7,
           saldo = $6, saldo_rebajado = $6, intereses_ganados = $6
       WHERE id = $8
       RETURNING *`,
      [cedula, nombre, telefono, direccion, prestamoNum, interesNum, metodoPago, req.params.id],
    )
    if (result.rows.length === 0) return res.status(404).json({ message: 'Cliente no encontrado' })

    const estadoResult = await pool.query('SELECT estado FROM estados WHERE usuario_id = $1', [req.params.id])
    const estado = estadoResult.rows[0]?.estado ?? 0

    res.json(mapUsuario({ ...result.rows[0], estado }))
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Ya existe un cliente registrado con esa cédula' })
    }
    res.status(500).json({ message: 'Error al actualizar el cliente' })
  }
})

app.delete('/api/usuarios/:id', async (req, res) => {
  const result = await pool.query('DELETE FROM usuarios WHERE id = $1', [req.params.id])
  if (result.rowCount === 0) return res.status(404).json({ message: 'Cliente no encontrado' })
  res.status(204).end()
})

app.get('/api/usuarios/:id/abonos', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM abonos WHERE usuario_id = $1 ORDER BY id DESC',
    [req.params.id],
  )
  res.json(result.rows.map(mapAbono))
})

app.post('/api/usuarios/:id/abonos', async (req, res) => {
  const { monto } = req.body
  const montoNum = Number(monto)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const usuarioResult = await client.query('SELECT * FROM usuarios WHERE id = $1 FOR UPDATE', [req.params.id])
    if (usuarioResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'Cliente no encontrado' })
    }
    const usuario = usuarioResult.rows[0]

    if (montoNum <= 0) {
      await client.query('ROLLBACK')
      return res.status(400).json({ message: 'El abono debe ser mayor a cero' })
    }
    if (montoNum > Number(usuario.saldo_rebajado)) {
      await client.query('ROLLBACK')
      return res.status(400).json({ message: 'El abono que desea aplicar es mayor al saldo actual' })
    }

    const nuevoSaldo = Number(usuario.saldo_rebajado) - montoNum

    const abonoResult = await client.query(
      `INSERT INTO abonos (usuario_id, monto, saldo_resultante) VALUES ($1, $2, $3) RETURNING *`,
      [usuario.id, montoNum, nuevoSaldo],
    )

    await client.query('UPDATE usuarios SET saldo_rebajado = $1 WHERE id = $2', [nuevoSaldo, usuario.id])
    await client.query('UPDATE estados SET estado = 1, updated_at = NOW() WHERE usuario_id = $1', [usuario.id])

    await client.query('COMMIT')
    res.status(201).json(mapAbono(abonoResult.rows[0]))
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(500).json({ message: 'Error al aplicar el abono' })
  } finally {
    client.release()
  }
})

app.delete('/api/abonos/:id', async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const abonoResult = await client.query('SELECT * FROM abonos WHERE id = $1', [req.params.id])
    if (abonoResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'Abono no encontrado' })
    }
    const abono = abonoResult.rows[0]

    await client.query('DELETE FROM abonos WHERE id = $1', [abono.id])
    await client.query(
      'UPDATE usuarios SET saldo_rebajado = saldo_rebajado + $1 WHERE id = $2',
      [abono.monto, abono.usuario_id],
    )

    await client.query('COMMIT')
    res.status(204).end()
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(500).json({ message: 'Error al eliminar el abono' })
  } finally {
    client.release()
  }
})

// Endpoint que dispara la actualización de estados. Pensado para ser llamado por un
// cron externo (Vercel Cron, cron-job.org, etc.) protegido por un secreto compartido.
app.get('/api/cron/actualizar-estados', async (req, res) => {
  const secreto = process.env.CRON_SECRET
  const header = req.headers.authorization || ''
  const enviado = header.startsWith('Bearer ') ? header.slice(7) : req.query.secret

  if (secreto && enviado !== secreto) {
    return res.status(401).json({ message: 'No autorizado' })
  }

  const resultado = await actualizarEstados(pool)
  res.json(resultado)
})

const PORT = process.env.PORT || 3001

// En Vercel (serverless) este archivo se importa como función, sin escuchar un
// puerto propio: ahí la actualización periódica la dispara Vercel Cron llamando a
// /api/cron/actualizar-estados (ver vercel.json). Local/VPS/Railway sí lo ejecutan
// directamente, por eso el listen + setInterval solo corren en ese caso.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`API escuchando en http://localhost:${PORT}`)

    actualizarEstados(pool).catch((err) => console.error('Error actualizando estados:', err.message))
    setInterval(() => {
      actualizarEstados(pool).catch((err) => console.error('Error actualizando estados:', err.message))
    }, 15 * 60 * 1000)
  })
}

module.exports = app

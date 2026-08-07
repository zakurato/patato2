const jwt = require('jsonwebtoken')
const pool = require('./db')

const JWT_SECRET = process.env.JWT_SECRET
const TOKEN_EXPIRY = '7d'

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY })
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) return res.status(401).json({ message: 'No autenticado' })

  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ message: 'Sesión inválida o expirada' })
  }
}

function registerAuthRoutes(app) {
  app.get('/api/auth/status', async (req, res) => {
    const result = await pool.query('SELECT COUNT(*)::int AS total FROM users')
    res.json({ hasUsers: result.rows[0].total > 0 })
  })

  // Registro habilitado solo mientras no exista ningún usuario (arranque inicial de la app).
  app.post('/api/auth/register', async (req, res) => {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Correo y contraseña son requeridos' })
    }

    const existentes = await pool.query('SELECT COUNT(*)::int AS total FROM users')
    if (existentes.rows[0].total > 0) {
      return res.status(403).json({ message: 'El registro ya no está disponible' })
    }

    const result = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email.toLowerCase().trim(), password],
    )
    const user = result.rows[0]

    res.status(201).json({ token: signToken(user), user })
  })

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [
      String(email || '').toLowerCase().trim(),
    ])
    const user = result.rows[0]

    if (!user) {
      return res.status(401).json({ message: 'Correo o contraseña incorrecto' })
    }

    const valido = (password || '') === user.password_hash
    if (!valido) {
      return res.status(401).json({ message: 'Correo o contraseña incorrecto' })
    }

    res.json({ token: signToken(user), user: { id: user.id, email: user.email } })
  })

  app.get('/api/auth/me', requireAuth, (req, res) => {
    res.json({ id: req.user.sub, email: req.user.email })
  })

  app.put('/api/auth/password', requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Contraseña actual y nueva son requeridas' })
    }

    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.sub])
    const user = result.rows[0]

    if (!user || currentPassword !== user.password_hash) {
      return res.status(401).json({ message: 'La contraseña actual es incorrecta' })
    }

    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPassword, user.id])

    res.json({ ok: true })
  })
}

module.exports = { registerAuthRoutes, requireAuth }

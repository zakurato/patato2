const fs = require('fs')
const path = require('path')
const pool = require('./db')

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
  await pool.query(sql)
  console.log('Tablas creadas/verificadas correctamente')
  await pool.end()
}

migrate().catch((err) => {
  console.error('Error al migrar:', err.message)
  process.exit(1)
})

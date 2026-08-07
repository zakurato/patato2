CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  cedula TEXT NOT NULL,
  nombre TEXT NOT NULL,
  telefono TEXT NOT NULL,
  direccion TEXT NOT NULL,
  prestamo NUMERIC NOT NULL,
  interes NUMERIC NOT NULL,
  metodo_pago TEXT NOT NULL,
  saldo NUMERIC NOT NULL,
  saldo_rebajado NUMERIC NOT NULL,
  intereses_ganados NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS estados (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  estado INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS abonos (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  monto NUMERIC NOT NULL,
  saldo_resultante NUMERIC NOT NULL,
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migraciones idempotentes para bases de datos creadas antes de estas columnas/tipos.
ALTER TABLE usuarios ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at::timestamptz;
ALTER TABLE usuarios ALTER COLUMN created_at SET DEFAULT NOW();

ALTER TABLE abonos ALTER COLUMN fecha TYPE TIMESTAMPTZ USING fecha::timestamptz;
ALTER TABLE abonos ALTER COLUMN fecha SET DEFAULT NOW();

ALTER TABLE estados ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE estados ALTER COLUMN estado SET DEFAULT 0;

ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_cedula_key;

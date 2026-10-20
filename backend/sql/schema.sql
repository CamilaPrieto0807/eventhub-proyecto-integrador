CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 3 AND 100),
  email text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'cliente'
    CHECK (role IN ('cliente', 'agente', 'administrador')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique
  ON users (lower(email));

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS assigned_agent_id uuid REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS users_assigned_agent_idx
  ON users (assigned_agent_id)
  WHERE assigned_agent_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS events (
  id text PRIMARY KEY,
  name text NOT NULL,
  venue text NOT NULL,
  city text NOT NULL,
  category text NOT NULL,
  image text NOT NULL,
  date_label text NOT NULL,
  price integer NOT NULL CHECK (price >= 0),
  capacity integer NOT NULL CHECK (capacity >= 0),
  sold integer NOT NULL DEFAULT 0 CHECK (sold >= 0 AND sold <= capacity)
);

CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  event_id text NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 10),
  unit_price integer NOT NULL CHECK (unit_price >= 0),
  total integer NOT NULL CHECK (total = quantity * unit_price),
  status text NOT NULL DEFAULT 'demo_confirmed'
    CHECK (status = 'demo_confirmed'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reservations_user_created_idx
  ON reservations (user_id, created_at DESC);

INSERT INTO events (id, name, venue, city, category, image, date_label, price, capacity)
VALUES
  ('festival-sonoro', 'Festival Sonoro 2026', 'Teatro Aurora', 'Tuluá', 'Festivales', 'festival-sonoro.jpg', '14 OCT', 85000, 30),
  ('ultimo-acto', 'Obra: El Último Acto', 'Sala Norte', 'Cali', 'Teatro', 'ultimo-acto.jpg', '22 OCT', 45000, 24),
  ('comedia', 'Noche de Comedia Stand-Up', 'Auditorio Central', 'Bogotá', 'Teatro', 'comedia.jpg', '02 NOV', 30000, 20),
  ('copa-regional', 'Copa Regional de Fútbol', 'Estadio del Valle', 'Tuluá', 'Deportes', 'futbol.jpg', '18 NOV', 20000, 40),
  ('jazz-parque', 'Jazz en el Parque', 'Parque de los Deseos', 'Medellín', 'Conciertos', 'jazz.jpg', '05 NOV', 40000, 25),
  ('tarde-cuentos', 'Tarde de Cuentos', 'Biblioteca Pública', 'Bogotá', 'Familiar', 'cuentos.jpg', '09 NOV', 15000, 18),
  ('festival-cafe', 'Festival Café y Montaña', 'Parque de la Guadua', 'Tuluá', 'Festivales', 'festival-sonoro.jpg', '21 NOV', 65000, 26),
  ('teatro-familiar', 'El Bosque de los Sueños', 'Teatro Sarmiento', 'Tuluá', 'Familiar', 'cuentos.jpg', '29 NOV', 22000, 35),
  ('salsa-cali', 'Cali Baila: Noche de Salsa', 'Arena Cañaveralejo', 'Cali', 'Conciertos', 'jazz.jpg', '28 NOV', 55000, 32),
  ('diseno-cali', 'Mercado Creativo del Valle', 'Bulevar del Río', 'Cali', 'Festivales', 'festival-sonoro.jpg', '06 DIC', 18000, 50),
  ('rock-bogota', 'Bogotá Rock Fest', 'Movistar Arena', 'Bogotá', 'Conciertos', 'festival-sonoro.jpg', '05 DIC', 72000, 60),
  ('planetario-bogota', 'Misterios del Universo', 'Planetario de Bogotá', 'Bogotá', 'Familiar', 'cuentos.jpg', '12 DIC', 26000, 40),
  ('electro-medellin', 'Ritmo Electrónico', 'Parque Norte', 'Medellín', 'Festivales', 'festival-sonoro.jpg', '13 DIC', 68000, 42),
  ('danza-medellin', 'Cuerpos en Escena', 'Teatro Metropolitano', 'Medellín', 'Teatro', 'ultimo-acto.jpg', '19 DIC', 35000, 28)
ON CONFLICT (id) DO NOTHING;

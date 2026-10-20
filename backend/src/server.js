import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import connectPgSimple from 'connect-pg-simple';
import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import session from 'express-session';
import helmet from 'helmet';
import pg from 'pg';

const { Pool } = pg;
const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT || 3000);
const sessionSecret = process.env.SESSION_SECRET;

if (!process.env.DATABASE_URL) {
  throw new Error('Falta DATABASE_URL. Configura la conexión PostgreSQL de Neon.');
}
if (!sessionSecret || sessionSecret.length < 32) {
  throw new Error('SESSION_SECRET debe contener al menos 32 caracteres aleatorios.');
}
if (isProduction && !process.env.FRONTEND_URLS) {
  throw new Error('Configura FRONTEND_URLS con el origen HTTPS del frontend desplegado.');
}
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT debe ser un puerto válido.');
}

const allowedOrigins = new Set(
  (process.env.FRONTEND_URLS || 'http://localhost:5500,http://127.0.0.1:5500')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean)
);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DB_POOL_MAX || 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

const PgSession = connectPgSimple(session);
const cookieSameSite = process.env.COOKIE_SAME_SITE || (isProduction ? 'none' : 'lax');

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin.replace(/\/$/, ''))) {
      callback(null, true);
      return;
    }
    callback(apiError(403, 'Origen no autorizado.'));
  },
  credentials: true
}));
app.use(express.json({ limit: '10kb' }));
app.use(session({
  name: 'eventhub.sid',
  store: new PgSession({
    pool,
    createTableIfMissing: true,
    tableName: 'user_sessions'
  }),
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: cookieSameSite,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
  }
}));

const api = express.Router();
app.use('/api', api);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' }
});

function apiError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function validateOrigin(req, res, next) {
  const origin = req.get('origin');
  if (origin && !allowedOrigins.has(origin.replace(/\/$/, ''))) {
    res.status(403).json({ error: 'Origen no autorizado.' });
    return;
  }
  next();
}

function requireUser(req, res, next) {
  if (!req.session.user) {
    res.status(401).json({ error: 'Inicia sesión para continuar.' });
    return;
  }
  next();
}

function requireAdmin(req, res, next) {
  if (req.session.user?.role !== 'administrador') {
    res.status(403).json({ error: 'Se requiere una cuenta administradora.' });
    return;
  }
  next();
}

function requireAgent(req, res, next) {
  if (req.session.user?.role !== 'agente') {
    res.status(403).json({ error: 'Se requiere una cuenta de agente.' });
    return;
  }
  next();
}

function serializeUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

function serializeEvent(row) {
  return {
    id: row.id,
    name: row.name,
    venue: row.venue,
    city: row.city,
    category: row.category,
    image: row.image,
    dateLabel: row.date_label,
    price: row.price,
    capacity: row.capacity,
    sold: row.sold,
    remaining: row.capacity - row.sold
  };
}

function serializeReservation(row) {
  return {
    id: row.id,
    eventId: row.event_id,
    eventName: row.event_name,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    total: row.total,
    status: row.status,
    date: row.created_at
  };
}

api.get('/health', async (req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok' });
});

api.get('/events', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, name, venue, city, category, image, date_label, price, capacity, sold
     FROM events
     ORDER BY id`
  );
  res.json({ events: rows.map(serializeEvent) });
});

api.post('/auth/register', validateOrigin, async (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = req.body.password;
  const role = req.body.role || 'cliente';

  if (name.length < 3 || name.length > 100) {
    throw apiError(400, 'El nombre debe tener entre 3 y 100 caracteres.');
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw apiError(400, 'Ingresa un correo electrónico válido.');
  }
  if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    throw apiError(400, 'La contraseña debe tener entre 8 y 72 caracteres.');
  }
  if (!['cliente', 'agente'].includes(role)) {
    throw apiError(400, 'El tipo de cuenta no es válido.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  let result;
  try {
    result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role`,
      [name, email, passwordHash, role]
    );
  } catch (error) {
    if (error.code === '23505') {
      throw apiError(409, 'Ya existe una cuenta registrada con ese correo.');
    }
    throw error;
  }

  const user = serializeUser(result.rows[0]);
  await new Promise((resolve, reject) => {
    req.session.regenerate((error) => error ? reject(error) : resolve());
  });
  req.session.user = user;
  res.status(201).json({ user });
});

api.post('/auth/login', validateOrigin, loginLimiter, async (req, res) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = req.body.password;
  if (!email || typeof password !== 'string') {
    throw apiError(400, 'Ingresa tu correo y contraseña.');
  }

  const { rows } = await pool.query(
    'SELECT id, name, email, role, password_hash FROM users WHERE lower(email) = $1',
    [email]
  );
  if (!rows[0] || !(await bcrypt.compare(password, rows[0].password_hash))) {
    throw apiError(401, 'Correo o contraseña incorrectos.');
  }

  const user = serializeUser(rows[0]);
  await new Promise((resolve, reject) => {
    req.session.regenerate((error) => error ? reject(error) : resolve());
  });
  req.session.user = user;
  res.json({ user });
});

api.get('/auth/me', (req, res) => {
  if (!req.session.user) {
    res.status(401).json({ error: 'No hay una sesión iniciada.' });
    return;
  }
  res.json({ user: req.session.user });
});

api.post('/auth/logout', validateOrigin, requireUser, async (req, res) => {
  await new Promise((resolve, reject) => {
    req.session.destroy((error) => error ? reject(error) : resolve());
  });
  res.clearCookie('eventhub.sid', {
    httpOnly: true,
    secure: isProduction,
    sameSite: cookieSameSite,
    path: '/'
  });
  res.status(204).end();
});

api.patch('/profile', validateOrigin, requireUser, async (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (name.length < 3 || name.length > 100) {
    throw apiError(400, 'El nombre debe tener entre 3 y 100 caracteres.');
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw apiError(400, 'Ingresa un correo electrónico válido.');
  }

  let result;
  try {
    result = await pool.query(
      'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING id, name, email, role',
      [name, email, req.session.user.id]
    );
  } catch (error) {
    if (error.code === '23505') {
      throw apiError(409, 'Ese correo ya está asociado a otra cuenta.');
    }
    throw error;
  }

  if (!result.rows[0]) throw apiError(404, 'No se encontró la cuenta.');
  req.session.user = serializeUser(result.rows[0]);
  res.json({ user: req.session.user });
});

api.get('/agent/clients', requireUser, requireAgent, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, name, email, created_at
     FROM users
     WHERE role = 'cliente' AND assigned_agent_id = $1
     ORDER BY lower(name), lower(email)`,
    [req.session.user.id]
  );
  res.json({
    clients: rows.map((client) => ({
      id: client.id,
      name: client.name,
      email: client.email,
      createdAt: client.created_at
    }))
  });
});

api.get('/admin/users', requireUser, requireAdmin, async (req, res) => {
  const [agents, clients] = await Promise.all([
    pool.query(
      `SELECT agent.id, agent.name, agent.email, count(client.id)::integer AS client_count
       FROM users agent
       LEFT JOIN users client
         ON client.assigned_agent_id = agent.id AND client.role = 'cliente'
       WHERE agent.role = 'agente'
       GROUP BY agent.id
       ORDER BY lower(agent.name), lower(agent.email)`
    ),
    pool.query(
      `SELECT client.id, client.name, client.email, client.assigned_agent_id
       FROM users client
       WHERE client.role = 'cliente'
       ORDER BY lower(client.name), lower(client.email)`
    )
  ]);
  res.json({
    agents: agents.rows.map((agent) => ({
      id: agent.id,
      name: agent.name,
      email: agent.email,
      clientCount: agent.client_count
    })),
    clients: clients.rows.map((client) => ({
      id: client.id,
      name: client.name,
      email: client.email,
      agentId: client.assigned_agent_id
    }))
  });
});

api.patch('/admin/clients/:id/agent', validateOrigin, requireUser, requireAdmin, async (req, res) => {
  const clientId = req.params.id;
  const agentId = req.body.agentId;
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(clientId)) {
    throw apiError(400, 'El identificador del cliente no es válido.');
  }
  if (agentId !== null && (typeof agentId !== 'string' || !uuidPattern.test(agentId))) {
    throw apiError(400, 'Selecciona un agente válido o deja el cliente sin asignar.');
  }

  if (agentId) {
    const agent = await pool.query(
      "SELECT 1 FROM users WHERE id = $1 AND role = 'agente'",
      [agentId]
    );
    if (!agent.rowCount) throw apiError(404, 'No encontramos ese agente.');
  }

  const { rows } = await pool.query(
    `UPDATE users SET assigned_agent_id = $1
     WHERE id = $2 AND role = 'cliente'
     RETURNING id, assigned_agent_id`,
    [agentId, clientId]
  );
  if (!rows[0]) throw apiError(404, 'No encontramos ese cliente.');
  res.json({ clientId: rows[0].id, agentId: rows[0].assigned_agent_id });
});

api.get('/reservations', requireUser, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT r.id, r.event_id, e.name AS event_name, r.quantity, r.unit_price,
            r.total, r.status, r.created_at
     FROM reservations r
     JOIN events e ON e.id = r.event_id
     WHERE r.user_id = $1
     ORDER BY r.created_at DESC`,
    [req.session.user.id]
  );
  res.json({ reservations: rows.map(serializeReservation) });
});

api.get('/reservations/:id', requireUser, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT r.id, r.event_id, e.name AS event_name, r.quantity, r.unit_price,
            r.total, r.status, r.created_at
     FROM reservations r
     JOIN events e ON e.id = r.event_id
     WHERE r.id = $1 AND r.user_id = $2`,
    [req.params.id, req.session.user.id]
  );
  if (!rows[0]) throw apiError(404, 'No encontramos esta compra en tu cuenta.');
  res.json({ reservation: serializeReservation(rows[0]) });
});

api.post('/reservations', validateOrigin, requireUser, async (req, res) => {
  const eventId = typeof req.body.eventId === 'string' ? req.body.eventId : '';
  const quantity = req.body.quantity;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
    throw apiError(400, 'La cantidad debe ser un número entre 1 y 10.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const eventResult = await client.query(
      `UPDATE events
       SET sold = sold + $1
       WHERE id = $2 AND capacity - sold >= $1
       RETURNING id, name, price`,
      [quantity, eventId]
    );
    if (!eventResult.rows[0]) {
      const exists = await client.query('SELECT 1 FROM events WHERE id = $1', [eventId]);
      if (!exists.rowCount) throw apiError(404, 'No encontramos ese evento.');
      throw apiError(409, 'La cantidad supera las entradas disponibles.');
    }

    const event = eventResult.rows[0];
    const { rows } = await client.query(
      `INSERT INTO reservations (user_id, event_id, quantity, unit_price, total)
       VALUES ($1, $2, $3, $4, $3 * $4)
       RETURNING id, event_id, quantity, unit_price, total, status, created_at`,
      [req.session.user.id, event.id, quantity, event.price]
    );
    await client.query('COMMIT');
    res.status(201).json({
      reservation: serializeReservation({ ...rows[0], event_name: event.name })
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

api.patch('/events/:id/capacity', validateOrigin, requireUser, requireAdmin, async (req, res) => {
  const capacity = req.body.capacity;
  if (!Number.isInteger(capacity) || capacity < 0) {
    throw apiError(400, 'El aforo debe ser un entero igual o mayor a cero.');
  }

  const { rows } = await pool.query(
    `UPDATE events SET capacity = $1
     WHERE id = $2 AND $1 >= sold
     RETURNING id, capacity, sold`,
    [capacity, req.params.id]
  );
  if (!rows[0]) {
    const event = await pool.query('SELECT sold FROM events WHERE id = $1', [req.params.id]);
    if (!event.rowCount) throw apiError(404, 'No encontramos ese evento.');
    throw apiError(400, `El aforo no puede ser inferior a las ${event.rows[0].sold} entradas vendidas.`);
  }
  res.json({ event: { ...rows[0], remaining: rows[0].capacity - rows[0].sold } });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  if (!error.status) console.error(error);
  const status = error.status || 500;
  const message = status === 500 ? 'Ocurrió un error en el servidor.' : error.message;
  res.status(status).json({ error: message });
});

const schemaPath = fileURLToPath(new URL('../sql/schema.sql', import.meta.url));
try {
  await pool.query(await readFile(schemaPath, 'utf8'));
  app.listen(port, () => console.log(`EventHub API escuchando en el puerto ${port}.`));
} catch (error) {
  console.error('No fue posible preparar la base de datos de EventHub. Verifica DATABASE_URL y ejecuta backend/sql/schema.sql en Neon.', error);
  process.exitCode = 1;
  await pool.end();
}

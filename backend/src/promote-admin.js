import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;
const email = process.argv[2]?.trim().toLowerCase();

if (!process.env.DATABASE_URL) {
  throw new Error('Falta DATABASE_URL. Configura la conexión PostgreSQL de Neon.');
}
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  throw new Error('Uso: npm run admin:promote -- correo@ejemplo.com');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  const { rowCount } = await pool.query(
    "UPDATE users SET role = 'administrador' WHERE lower(email) = $1",
    [email]
  );
  if (!rowCount) {
    throw new Error(`No existe una cuenta para ${email}. Regístrala antes de promoverla.`);
  }
  console.log(`La cuenta ${email} ahora es administradora.`);
} finally {
  await pool.end();
}

# EventHub — Proyecto Integrador

Aplicación para explorar eventos, crear cuentas y registrar reservas. El frontend
está hecho con HTML, CSS y JavaScript sin framework; el backend usa Node.js,
Express y PostgreSQL en Neon.

## Estructura

- Páginas HTML y estilos: raíz del proyecto y `css/`.
- Integración del navegador con la API: `js/main.js` y `js/config.js`.
- API, sesiones y comando de administración: `backend/src/`.
- Esquema y carga inicial de los 14 eventos: `backend/sql/schema.sql`.

## Preparar PostgreSQL en Neon

1. Crea un proyecto y una base de datos en Neon.
2. En Neon, abre **SQL Editor**, pega el contenido de `backend/sql/schema.sql` y ejecútalo. El script crea las tablas e inserta los 14 eventos iniciales; puede ejecutarse de nuevo sin duplicarlos.
3. Copia la cadena de conexión PostgreSQL de Neon con **Pooled connection** activado para usarla como `DATABASE_URL`. Mantén `sslmode=require` y no publiques esta cadena.

El backend también ejecuta el esquema al iniciar para asegurar que las tablas y
los eventos existan. Al volver a desplegar el backend, el cambio de asignación
agrega automáticamente la columna de agente a una tabla `users` existente sin
borrar usuarios, eventos ni reservas.

## Ejecutar el backend localmente

Requiere Node.js 20 o superior.

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Edita el archivo `backend/.env` y establece `DATABASE_URL` y un `SESSION_SECRET`
aleatorio de al menos 32 caracteres. Después:

```powershell
npm run dev
```

La API escucha en `http://127.0.0.1:3000`; su comprobación de salud es
`http://127.0.0.1:3000/api/health`.

Sirve el frontend mediante un servidor estático local en el puerto 5500 (por
ejemplo, Live Server en `http://127.0.0.1:5500`) y define
`window.EVENTHUB_API_URL = 'http://127.0.0.1:3000'` en `js/config.js`. Usa el
mismo hostname (`127.0.0.1` o `localhost`) para el frontend y la API, así la
cookie de sesión funciona localmente.

## Despliegue en Render y Netlify

Neon solo aloja PostgreSQL; Render aloja la API y Netlify los archivos estáticos.

1. En Render, crea un **Web Service** desde el repositorio. Configura el
   directorio raíz como `backend`, el comando de
   instalación como `npm install` y el comando de inicio como `npm start`.
2. En Render, configura estas variables privadas:
   - `NODE_ENV=production`
   - `DATABASE_URL`: cadena de conexión de Neon.
   - `SESSION_SECRET`: valor aleatorio de al menos 32 caracteres.
   - `FRONTEND_URLS`: origen HTTPS de Netlify, sin barra al final.
   - `COOKIE_SAME_SITE=lax` si vas a usar el proxy del siguiente paso.
3. En Netlify, despliega la carpeta raíz del sitio (la carpeta que contiene
   `index.html`). Antes de desplegar, reemplaza las dos apariciones de
   `YOUR_RENDER_SERVICE.onrender.com` en `netlify.toml` por el dominio asignado a
   tu servicio de Render. Deja `window.EVENTHUB_API_URL = ''` en `js/config.js`;
   el proxy hace que el navegador use `/api` en el mismo dominio de Netlify.
4. Prueba `https://tu-api.onrender.com/api/health`, luego crea una cuenta y
   comprueba el perfil, los eventos y una reserva de demostración.

`FRONTEND_URLS` acepta varios orígenes separados por comas. Debe coincidir
exactamente con el dominio de Netlify, incluidos los dominios de vista previa
que vayas a usar. El proxy evita depender de cookies de terceros entre los
dominios de Netlify y Render. Si prefieres conectar el navegador directamente a
Render, pon la URL HTTPS de la API en `js/config.js` y usa
`COOKIE_SAME_SITE=none`; algunos navegadores pueden bloquear cookies entre
sitios, por lo que se recomienda el proxy.

## Administrar cuentas de administrador

Un administrador puede gestionar otros administradores desde **Mi perfil → Administración de cuentas**:

1. Registra primero la cuenta que quieres agregar como cliente o agente.
2. Entra como administrador, abre **Mi perfil → Administración de cuentas** e
   ingresa el correo registrado en **Administradores**.
3. Esa persona debe cerrar sesión y volver a ingresar para obtener su nuevo rol.
4. Para eliminar otra cuenta, pulsa **Eliminar cuenta** y confirma. Se elimina
   la cuenta, se cierran sus sesiones y se borran sus reservas de demostración;
   esas entradas se liberan. No se puede eliminar tu propia cuenta desde esa
   sesión ni al último administrador.

El registro público no ofrece el rol administrador. Para el primer administrador
o recuperación de acceso, se puede usar el comando de bootstrap en `backend/`:

```powershell
npm run admin:promote -- correo@ejemplo.com
```

Requiere que la cuenta ya esté registrada y que `backend/.env` contenga
`DATABASE_URL`. Un administrador también puede asignar clientes a agentes; cada
agente ve únicamente sus clientes asignados, y el cliente conserva su perfil y
sus compras normales.

## Alcance de seguridad y pagos

Las contraseñas se guardan con hash bcrypt en el backend; las sesiones usan una
cookie `HttpOnly` persistida en PostgreSQL. Las compras y el aforo se validan en
el servidor y las reservas pertenecen a la cuenta que las creó. Los roles de
administrador no se pueden asignar desde el formulario público.

El checkout sigue siendo de demostración: no solicita ni almacena tarjetas y no
realiza cobros. Antes de aceptar pagos reales se debe integrar una pasarela con
verificación del lado del servidor. Las preferencias de accesibilidad se
conservan en el navegador; los datos de cuenta, eventos, aforo y reservas se
guardan en PostgreSQL. Las cuentas antiguas que existieran solo en `localStorage`
no se migran automáticamente; los usuarios deben registrarse de nuevo.
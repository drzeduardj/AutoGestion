# AutoGestion

Sistema web local para la gestion administrativa de un taller automotriz.

## Estado actual

- Backend Node.js + Express.
- PostgreSQL con `pg`.
- Autenticacion JWT.
- Gestion inicial de usuarios y roles.
- Estructura modular para clientes, vehiculos, visitas, servicios, inventario, dashboard y panel mecanico.

## Backend

```powershell
cd backend
npm install
Copy-Item .env.example .env
npm run dev
```

Configura `backend/.env` con las credenciales locales de PostgreSQL antes de iniciar la API.

La API expone una ruta de salud:

```text
GET http://localhost:4000/api/health
```

Documentacion Swagger:

```text
GET http://localhost:4000/api/docs
GET http://localhost:4000/api/docs.json
```

## Migraciones

Las migraciones SQL estan en `backend/db/migrations`.

Para esta etapa se agrego una migracion minima para que los servicios asignados a una visita puedan guardar precio negociado por caso:

```text
backend/db/migrations/001_visita_servicios_precios_dinamicos.sql
```

Puedes aplicar las migraciones con:

```powershell
cd backend
npm run migrate
```

## Frontend

La base del frontend esta en `frontend` y usa Vite + React.

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Por defecto consume la API en:

```text
VITE_API_URL=http://IP_DEL_EQUIPO:4000/api
```

Para probar desde moviles o tablets en la misma red:

```powershell
ipconfig
```

Busca la IPv4 del equipo, por ejemplo `192.168.1.50`, y configura:

```text
backend/.env
HOST=0.0.0.0
PORT=4000
CORS_ORIGIN=*

frontend/.env
VITE_API_URL=http://192.168.1.50:4000/api
```

Luego inicia ambos servicios:

```powershell
cd backend
npm run dev
```

```powershell
cd frontend
npm run dev
```

Desde el movil abre:

```text
http://192.168.1.50:5173
```

Si no carga desde otro equipo, revisa que Windows Firewall permita los puertos `4000` y `5173` en la red privada.

Estructura principal del frontend:

```text
frontend/src/api         Cliente HTTP
frontend/src/components  Componentes reutilizables
frontend/src/config      Contratos de modulos y formularios
frontend/src/hooks       Carga de datos y catalogos
frontend/src/pages       Pantallas principales
frontend/src/routes      Definicion de modulos/rutas internas
frontend/src/utils       Helpers de sesion y formato
```

## Despliegue en Vercel

El repositorio esta listo para desplegarse completo en un solo proyecto de Vercel:

- `frontend/dist` se publica como sitio estatico (SPA).
- La API Express corre como Serverless Function desde `api/index.js` y responde en `/api/*`.
- La configuracion esta en `vercel.json` (instala `backend` y `frontend`, compila el frontend).

Pasos:

1. Importa el repositorio en Vercel con **Root Directory = raiz del repo** (Framework Preset: *Other*).
2. Crea una base PostgreSQL externa (Neon, Supabase o Vercel Postgres desde el Marketplace).
3. En *Storage* conecta un **Blob store** al proyecto (agrega `BLOB_READ_WRITE_TOKEN` automaticamente). Sin esto las fotos no se pueden guardar, porque Vercel no tiene disco persistente.
4. Variables de entorno del proyecto:
   - `DATABASE_URL` (cadena de conexion con `sslmode=require`)
   - `JWT_SECRET`, `JWT_EXPIRES_IN`
   - `CORS_ORIGIN` (opcional; el frontend y la API comparten dominio)
5. Aplica las migraciones contra la base remota desde tu equipo:

```powershell
cd backend
$env:DATABASE_URL="postgresql://..."; $env:DB_SSL="true"; npm run migrate
```

Limites a tener en cuenta: las peticiones tienen un maximo de 4.5 MB (las fotos se limitan a 4 MB) y cada peticion a la API puede durar hasta 30 s.

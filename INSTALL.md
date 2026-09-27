# Guía de instalación — AutoGestion (taller)

Despliegue en la PC del taller. La app corre como **un solo proceso**: el backend
(Node + Express) sirve a la vez el **API** y la **web app compilada** en el puerto **4000**.
El usuario solo abre el navegador en `http://localhost:4000` (o `http://IP-DEL-EQUIPO:4000`
desde otra PC de la red).

> En esta guía se asume que el proyecto quedará en `C:\AutoGestion`. Ajusta las rutas si usas otra.

---

## 1. Requisitos a instalar en la PC

| Software | Versión | Notas |
|---|---|---|
| **Node.js** | LTS 18 o 20+ | https://nodejs.org — instalar la versión "LTS". |
| **PostgreSQL** | 14+ | https://www.postgresql.org/download/windows/ — anota la contraseña del usuario `postgres`. Se instala como servicio de Windows que **arranca solo**. |
| **NSSM** | última | https://nssm.cc — para correr el backend como servicio que inicia con la PC. |

Verifica que Node quedó instalado:

```powershell
node -v
npm -v
```

---

## 2. Copiar el proyecto

Copia la carpeta del proyecto a `C:\AutoGestion`, **sin** estas carpetas (se regeneran):

- `backend/node_modules`
- `frontend/node_modules`
- `frontend/dist`

Y asegúrate de **incluir manualmente** lo que no viaja en el repositorio:

- `backend/.env` (lo creamos en el paso 4)
- `frontend/.env` (solo necesario para desarrollo; en producción no hace falta)
- Las imágenes ya cargadas (paso 5)

---

## 3. Base de datos

Elige **una** de las dos opciones:

- **Opción A — Base limpia** (instalación nueva, sin datos previos): se crea la base vacía y
  las migraciones construyen todo el esquema. Recomendado para arrancar de cero.
- **Opción B — Trasladar datos existentes**: se restaura un volcado (dump) del equipo actual.

### Opción A — Base limpia con migraciones

1. En **pgAdmin**: clic derecho sobre `Databases → Create → Database...`, nómbrala
   **`taller_sis`** y guarda. (O por consola:
   `& "C:\Program Files\PostgreSQL\<versión>\bin\createdb.exe" -U postgres taller_sis`.)
2. Nada más: las tablas se crean en el paso 6 (`npm run setup` ejecuta las migraciones).

Las migraciones (`backend/db/migrations/000` a la última) crean el esquema completo, los roles,
los servicios y flujos de trabajo base, y el usuario inicial:

| Usuario | Rol | Contraseña |
|---|---|---|
| `admin` | Admin | `123456` |

> ⚠️ **Cambia la contraseña** desde **Admin → Usuarios** tras el primer inicio de sesión.
> Los mecánicos y cajeros se crean desde esa misma pantalla.

### Opción B — Trasladar datos con un dump de pgAdmin

#### B.1 En el equipo ACTUAL (origen) — generar el dump

En **pgAdmin**:

1. Expande `Servers → PostgreSQL → Databases`.
2. Clic derecho sobre la base **`taller_sis` → Backup...**
3. En **Filename** elige dónde guardar (ej. `taller_sis.dump`).
4. En **Format** deja **Custom** (recomendado) y pulsa **Backup**.
5. Copia el archivo generado a la PC del taller (USB / red).

#### B.2 En la PC del taller (destino) — restaurar

1. Clic derecho sobre `Databases → Create → Database...`, nómbrala **`taller_sis`** y guarda.
2. Clic derecho sobre la base **`taller_sis` → Restore...**
3. En **Filename** selecciona el archivo del dump que copiaste y pulsa **Restore**.

> El dump trae las tablas, los usuarios con sus contraseñas actuales y los datos existentes.
> Luego `npm run migrate` (paso 6) solo completa lo que falte: es idempotente.
> Si usas otro nombre de base, ajústalo en `DB_NAME` de `backend/.env`.

---

## 4. Configurar `backend/.env`

Crea el archivo `C:\AutoGestion\backend\.env` con los valores de **esta** PC:

```dotenv
PORT=4000
HOST=0.0.0.0
DB_HOST=localhost
DB_PORT=5432
DB_NAME=taller_sis
DB_USER=postgres
DB_PASSWORD=LA_CONTRASEÑA_DE_POSTGRES_DE_ESTA_PC
JWT_SECRET=PON_UNA_CLAVE_LARGA_Y_UNICA_AQUI
JWT_EXPIRES_IN=8h
UPLOAD_DIR=C:\AutoGestionDatos\uploads
CORS_ORIGIN=*
```

Puntos importantes:

- **`DB_PASSWORD`**: la contraseña de PostgreSQL de la PC del taller (la del paso 1).
- **`JWT_SECRET`**: cámbiala por una clave larga y única (no reuses la de desarrollo). Si la cambias, las sesiones abiertas se invalidan (hay que volver a iniciar sesión).
- **`UPLOAD_DIR`**: ruta donde se guardarán las imágenes. Se recomienda una carpeta **fuera del proyecto** (ej. `C:\AutoGestionDatos\uploads`) para que sobreviva a actualizaciones y sea fácil de respaldar. La carpeta se crea sola si no existe.

> El **frontend** en producción no necesita `.env`: ya está configurado para llamar al API
> por ruta relativa `/api` (mismo origen), así funciona desde cualquier IP sin recompilar.

---

## 5. Copiar las imágenes existentes

Si en el equipo actual ya hay fotos cargadas, copia su contenido a la carpeta definida en `UPLOAD_DIR`:

- Origen: `...\backend\uploads\vehiculos\*` y `...\backend\uploads\visitas\*`
- Destino: `C:\AutoGestionDatos\uploads\vehiculos\*` y `C:\AutoGestionDatos\uploads\visitas\*`

(La base de datos guarda solo la ruta de cada imagen; los archivos físicos van por separado.)

---

## 6. Instalar dependencias y compilar

Desde la raíz del proyecto, un solo comando hace todo el montaje:

```powershell
cd C:\AutoGestion
npm run setup
```

`npm run setup` ejecuta:
1. `install:all` — instala dependencias de backend y frontend.
2. `build` — compila el frontend a `frontend/dist`.
3. `migrate` — crea/actualiza el esquema de la BD (idempotente: se puede correr las veces que sea).

Debe terminar con `Migraciones aplicadas correctamente.` Si falla con un error de conexión,
revisa `DB_*` en `backend/.env` y que el servicio de PostgreSQL esté corriendo.

---

## 7. Prueba manual

```powershell
cd C:\AutoGestion
npm run start:prod
```

Abre en el navegador:

```text
http://localhost:4000
```

Inicia sesión con el administrador: `admin` / `123456` si usaste la **opción A** (base limpia),
o con las credenciales de siempre si restauraste un dump (**opción B**).

Detén la prueba con `Ctrl + C` antes de pasar al servicio.

---

## 8. Dejarlo como servicio que arranca con la PC (NSSM)

Así el backend (y con él la web app) inicia solo al encender la PC, sin sesión iniciada y
sin ventana abierta, y se reinicia si se cae.

### 8.1 Instalar NSSM

1. Descarga el zip desde https://nssm.cc/download (versión 2.24 o la *pre-release* 2.24-101).
2. Descomprime y copia `win64\nssm.exe` a `C:\nssm\nssm.exe`.
3. Agrega `C:\nssm` al `PATH` del sistema, o usa la ruta completa `C:\nssm\nssm.exe` en los comandos.

### 8.2 Registrar el servicio

Abre **PowerShell como Administrador** (clic derecho → *Ejecutar como administrador*):

```powershell
# 1. Datos que necesitas
Get-Service *postgres*          # nombre del servicio de PostgreSQL, ej: postgresql-x64-17
(Get-Command node).Source        # ruta de node.exe, normalmente C:\Program Files\nodejs\node.exe

# 2. Carpeta de logs
New-Item -ItemType Directory -Force "C:\AutoGestion\logs"

# 3. Crear el servicio: node.exe ejecutando el server del backend
nssm install AutoGestion "C:\Program Files\nodejs\node.exe" "src\server.js"
nssm set AutoGestion AppDirectory "C:\AutoGestion\backend"
nssm set AutoGestion DisplayName "AutoGestion Taller"
nssm set AutoGestion Description "API + web app del taller automotriz (puerto 4000)"
nssm set AutoGestion AppEnvironmentExtra NODE_ENV=production

# 4. Arranque automático, esperando a PostgreSQL (usa el nombre del paso 1)
nssm set AutoGestion Start SERVICE_DELAYED_AUTO_START
nssm set AutoGestion DependOnService postgresql-x64-17

# 5. Si el proceso se cae, reiniciarlo a los 5 s
nssm set AutoGestion AppExit Default Restart
nssm set AutoGestion AppRestartDelay 5000

# 6. Logs con rotación (nuevo archivo al superar ~10 MB)
nssm set AutoGestion AppStdout "C:\AutoGestion\logs\out.log"
nssm set AutoGestion AppStderr "C:\AutoGestion\logs\err.log"
nssm set AutoGestion AppRotateFiles 1
nssm set AutoGestion AppRotateOnline 1
nssm set AutoGestion AppRotateBytes 10485760

# 7. Arrancar y comprobar
nssm start AutoGestion
nssm status AutoGestion          # debe decir SERVICE_RUNNING
```

Verifica abriendo `http://localhost:4000`. Luego **reinicia la PC** y confirma que la app
responde sin haber hecho nada: esa es la prueba real del autostart.

Notas:

- `AppDirectory` debe ser la carpeta `backend`: desde ahí se lee `backend\.env`.
- Se apunta directo a `node.exe` (no a `npm`) porque `npm` es un `.cmd` y da problemas como servicio.
- El servicio **solo arranca el backend**, que ya sirve el frontend compilado (`frontend\dist`).
  No recompila en cada arranque; eso se hace en el paso 6 o al actualizar (paso 11).
- `NODE_ENV=production` evita que los errores internos se muestren con detalle al usuario.
- `SERVICE_DELAYED_AUTO_START` le da unos segundos extra a PostgreSQL al encender la PC.

### 8.3 Comandos útiles

```powershell
nssm status AutoGestion
nssm restart AutoGestion         # tras cambiar backend\.env
nssm stop AutoGestion
nssm start AutoGestion
nssm edit AutoGestion            # editor gráfico de la configuración
nssm remove AutoGestion confirm  # eliminar el servicio
Get-Content C:\AutoGestion\logs\err.log -Tail 50   # ver últimos errores
```

También aparece en `services.msc` como **AutoGestion Taller**.

---

## 9. Firewall (solo si otras PCs/tablets de la red usan la app)

```powershell
New-NetFirewallRule -DisplayName "AutoGestion 4000" -Direction Inbound -Protocol TCP -LocalPort 4000 -Action Allow -Profile Private
```

Averigua la IP del equipo servidor con `ipconfig` (IPv4, ej. `192.168.1.50`). Las demás PCs abren:

```text
http://192.168.1.50:4000
```

---

## 10. Acceso directo para el usuario

Crea un acceso directo en el escritorio que abra el navegador en la app, p. ej.:

```text
"C:\Program Files\Google\Chrome\Application\chrome.exe" --app=http://localhost:4000
```

(`--app=` abre en modo ventana sin barra de direcciones, como una aplicación de escritorio.)

---

## 11. Actualizar a una versión nueva (a futuro)

```powershell
nssm stop AutoGestion
# reemplazar los archivos del proyecto (conservando backend/.env y la carpeta UPLOAD_DIR)
cd C:\AutoGestion
npm run install:all   # solo si cambiaron dependencias
npm run build         # recompilar frontend
npm run migrate       # aplicar migraciones nuevas
nssm start AutoGestion
```

---

## 12. Respaldos (importante)

Respalda **dos cosas juntas**, de forma periódica:

1. **Base de datos**: en pgAdmin, clic derecho sobre `taller_sis → Backup...` (igual que en el paso 3.1), guardando el archivo con la fecha en el nombre.
2. **Carpeta de imágenes** (la de `UPLOAD_DIR`):

```powershell
Copy-Item -Recurse "C:\AutoGestionDatos\uploads" "D:\Respaldos\uploads_AAAA-MM-DD"
```

La BD guarda las rutas; la carpeta guarda los archivos. Sin las dos, las fotos no se ven.

---

## 13. Solución de problemas

| Síntoma | Causa probable / solución |
|---|---|
| El servicio no arranca | Revisa `C:\AutoGestion\logs\err.log`. Suele ser `.env` mal configurado o Postgres no listo. |
| `ECONNREFUSED` a la BD | PostgreSQL no está corriendo o `DB_*` del `.env` no coinciden. Verifica `Get-Service *postgres*`. |
| La página abre pero no carga datos | El backend no levantó, o el `JWT_SECRET` cambió (vuelve a iniciar sesión). |
| Las imágenes no se ven | `UPLOAD_DIR` apunta a otra carpeta, o no copiaste los archivos del paso 5. |
| No entra desde otra PC | Falta la regla de firewall (paso 9) o usaste `localhost` en vez de la IP del servidor. |
| `pg_dump`/`pg_restore` no encontrado | Usa la ruta completa según tu versión: `C:\Program Files\PostgreSQL\<versión>\bin\`. |
```

# Guía de instalación — AutoGestion (taller)

Despliegue en la PC del taller. La app se entrega como **un solo ejecutable**
(`autogestion.exe`) que trae dentro el backend, la web app compilada y las migraciones de la
base de datos. No hace falta instalar Node.js ni copiar el código fuente.

El ejecutable atiende el **API** y la **web app** en el puerto **4000**. El usuario solo abre el
navegador en `http://localhost:4000` (o `http://IP-DEL-EQUIPO:4000` desde otra PC de la red).

> En esta guía la app queda en `C:\AutoGestion` y las imágenes en `C:\AutoGestionDatos\uploads`.
> Ajusta las rutas si usas otras.

- **Instalación nueva**: pasos 1 a 10.
- **La PC ya tiene una versión anterior** (instalada desde el código con Node): ve al paso 11.

---

## 0. Generar el ejecutable (en la PC de desarrollo)

Desde la raíz del repositorio:

```powershell
npm run install:all   # solo la primera vez o si cambiaron dependencias
npm run build:exe
```

Compila el frontend y genera `dist-exe\autogestion.exe` (~70 MB). La primera vez descarga el
runtime base de Node, por eso tarda más. Ese archivo es lo único que se lleva a la PC del taller.

---

## 1. Requisitos a instalar en la PC del taller

| Software | Versión | Notas |
|---|---|---|
| **PostgreSQL** | 14+ | https://www.postgresql.org/download/windows/ — anota la contraseña del usuario `postgres`. Se instala como servicio de Windows que **arranca solo**. |
| **NSSM** | 2.24+ | https://nssm.cc — para correr la app como servicio que inicia con la PC (paso 7). |

No se necesita Node.js.

---

## 2. Copiar la app

Crea `C:\AutoGestion` y copia ahí el ejecutable. La carpeta queda así:

```text
C:\AutoGestion\
  autogestion.exe      ← la app
  .env                 ← configuración de esta PC (paso 4)
  logs\                ← logs del servicio (paso 7)
C:\AutoGestionDatos\
  uploads\             ← imágenes (paso 5)
```

> Al ser un ejecutable sin firma digital, Windows SmartScreen puede advertir la primera vez que
> se abre a mano: **Más información → Ejecutar de todas formas**. Como servicio no pregunta.

---

## 3. Base de datos

Elige **una** de las dos opciones:

- **Opción A — Base limpia** (instalación nueva, sin datos previos): se crea la base vacía y
  las migraciones construyen todo el esquema.
- **Opción B — Trasladar datos existentes**: se restaura un volcado (dump) del equipo actual.

### Opción A — Base limpia

1. En **pgAdmin**: clic derecho sobre `Databases → Create → Database...`, nómbrala
   **`taller_sis`** y guarda. (O por consola:
   `& "C:\Program Files\PostgreSQL\<versión>\bin\createdb.exe" -U postgres taller_sis`.)
2. Las tablas se crean en el paso 6 (`autogestion.exe --migrate`).

Las migraciones crean el esquema completo, los roles, los servicios, flujos de trabajo y tipos
de vehículo base, y el usuario inicial:

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
> Luego `autogestion.exe --migrate` (paso 6) solo completa lo que falte: es idempotente.
> Si usas otro nombre de base, ajústalo en `DB_NAME` del `.env`.

---

## 4. Configurar `.env`

Crea el archivo `C:\AutoGestion\.env` (junto al `.exe`) con los valores de **esta** PC:

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

- **Ubicación**: el `.exe` siempre lee el `.env` de su misma carpeta, sin importar desde dónde se lance.
- **`DB_PASSWORD`**: la contraseña de PostgreSQL de la PC del taller (la del paso 1).
- **`JWT_SECRET`**: una clave larga y única (no reuses la de desarrollo). Si la cambias, las
  sesiones abiertas se invalidan (hay que volver a iniciar sesión).
- **`UPLOAD_DIR`**: dónde se guardan las imágenes. Se recomienda una carpeta **fuera** de
  `C:\AutoGestion` para que sobreviva a actualizaciones y sea fácil de respaldar. Se crea sola si
  no existe. Si se omite, se usa `C:\AutoGestion\uploads`.
- El `.env` guarda la contraseña de PostgreSQL en texto plano: no lo compartas ni lo dejes en
  carpetas públicas.

---

## 5. Copiar las imágenes existentes

Si en el equipo actual ya hay fotos cargadas, copia su contenido a la carpeta de `UPLOAD_DIR`:

- Origen: `...\uploads\vehiculos\*` y `...\uploads\visitas\*`
- Destino: `C:\AutoGestionDatos\uploads\vehiculos\*` y `C:\AutoGestionDatos\uploads\visitas\*`

(La base de datos guarda solo la ruta de cada imagen; los archivos físicos van por separado.)

---

## 6. Aplicar las migraciones

```powershell
cd C:\AutoGestion
.\autogestion.exe --migrate
```

Debe terminar con `Migraciones aplicadas correctamente.` Es idempotente: se puede correr las
veces que sea. Si falla con un error de conexión, revisa `DB_*` en el `.env` y que el servicio
de PostgreSQL esté corriendo.

### Prueba manual

```powershell
.\autogestion.exe
```

Abre `http://localhost:4000` en el navegador e inicia sesión: `admin` / `123456` si usaste la
**opción A**, o con las credenciales de siempre si restauraste un dump (**opción B**).
Detén la prueba con `Ctrl + C` antes de pasar al servicio.

---

## 7. Dejarlo como servicio que arranca con la PC (NSSM)

Así la app inicia sola al encender la PC, sin sesión iniciada y sin ventana abierta, y se
reinicia si se cae.

### 7.1 Instalar NSSM

1. Descarga el zip desde https://nssm.cc/download (versión 2.24 o la *pre-release* 2.24-101).
2. Descomprime y copia `win64\nssm.exe` a `C:\nssm\nssm.exe`.
3. Agrega `C:\nssm` al `PATH` del sistema, o usa la ruta completa `C:\nssm\nssm.exe` en los comandos.

### 7.2 Registrar el servicio

Abre **PowerShell como Administrador** (clic derecho → *Ejecutar como administrador*):

```powershell
# 1. Nombre del servicio de PostgreSQL, ej: postgresql-x64-17
Get-Service *postgres*

# 2. Carpeta de logs
New-Item -ItemType Directory -Force "C:\AutoGestion\logs"

# 3. Crear el servicio apuntando al ejecutable
nssm install AutoGestion "C:\AutoGestion\autogestion.exe"
nssm set AutoGestion AppDirectory "C:\AutoGestion"
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

- `NODE_ENV=production` evita que los errores internos se muestren con detalle al usuario.
- `SERVICE_DELAYED_AUTO_START` le da unos segundos extra a PostgreSQL al encender la PC.

### 7.3 Comandos útiles

```powershell
nssm status AutoGestion
nssm restart AutoGestion         # tras cambiar el .env
nssm stop AutoGestion
nssm start AutoGestion
nssm edit AutoGestion            # editor gráfico de la configuración
nssm remove AutoGestion confirm  # eliminar el servicio
Get-Content C:\AutoGestion\logs\err.log -Tail 50   # ver últimos errores
```

También aparece en `services.msc` como **AutoGestion Taller**.

---

## 8. Firewall (solo si otras PCs/tablets de la red usan la app)

```powershell
New-NetFirewallRule -DisplayName "AutoGestion 4000" -Direction Inbound -Protocol TCP -LocalPort 4000 -Action Allow -Profile Private
```

Averigua la IP del equipo servidor con `ipconfig` (IPv4, ej. `192.168.1.50`). Las demás PCs abren:

```text
http://192.168.1.50:4000
```

---

## 9. Acceso directo para el usuario

Crea un acceso directo en el escritorio que abra el navegador en la app, p. ej.:

```text
"C:\Program Files\Google\Chrome\Application\chrome.exe" --app=http://localhost:4000
```

(`--app=` abre en modo ventana sin barra de direcciones, como una aplicación de escritorio.)

---

## 10. Actualizar a una versión nueva del `.exe`

Genera el nuevo ejecutable (paso 0) y en la PC del taller:

```powershell
nssm stop AutoGestion
# 1. Respaldar la base (ver paso 12)
# 2. Reemplazar C:\AutoGestion\autogestion.exe por el nuevo (el .env y las imágenes no se tocan)
cd C:\AutoGestion
.\autogestion.exe --migrate
nssm start AutoGestion
```

---

## 11. Migrar desde una versión anterior instalada con Node

Para la PC que ya tiene AutoGestion corriendo desde el código fuente (con `node.exe` y NSSM).
Hazlo **sin gente usando el sistema**: la migración elimina la columna de texto
`vehiculos.tipo_vehiculo`, que la versión anterior usa, así que la app vieja deja de funcionar
en cuanto se migra.

### 11.1 Detener y respaldar

```powershell
nssm stop AutoGestion
& "C:\Program Files\PostgreSQL\<versión>\bin\pg_dump.exe" -U postgres -F c -f "C:\AutoGestionDatos\respaldo_antes_migrar.backup" taller_sis
```

Usa el `DB_NAME` que tenga el `.env` actual (`...\backend\.env`), no asumas el nombre.

### 11.2 Revisar los tipos de vehículo actuales

La versión nueva convierte el texto libre del tipo de vehículo a un catálogo:

| Texto que contiene | Queda como |
|---|---|
| `pick` o `troca` | Pickup |
| `camioneta` o `suv` | Camioneta |
| `camion` / `camión` | Camión |
| cualquier otro texto | Turismo |
| vacío | sin tipo |

Revisa qué valores hay antes de migrar:

```powershell
& "C:\Program Files\PostgreSQL\<versión>\bin\psql.exe" -U postgres -d taller_sis -c "SELECT tipo_vehiculo, count(*) FROM vehiculos GROUP BY 1 ORDER BY 2 DESC;"
```

Si aparece algún valor que no encaje en la tabla (ej. `BUS`, `MOTO`), avisa antes de continuar:
caería en Turismo, y después de migrar el texto original ya no existe (habría que corregirlo a
mano desde el sistema). Los tipos Bus liviano, Bus mediano y Autobús existen, pero la
conversión no asigna vehículos a ellos automáticamente.

### 11.3 Instalar el `.exe` junto a la versión anterior

1. Copia `autogestion.exe` a `C:\AutoGestion\` (la carpeta vieja del código puede quedarse ahí
   por ahora).
2. Copia el `.env` viejo (`C:\AutoGestion\backend\.env`) a `C:\AutoGestion\.env`. Conserva el
   mismo `JWT_SECRET` para no cerrar las sesiones.
3. **Imágenes**: si el `.env` viejo no tenía `UPLOAD_DIR`, las fotos están en
   `C:\AutoGestion\backend\uploads`. Agrega al `.env` nuevo
   `UPLOAD_DIR=C:\AutoGestion\backend\uploads`, o mueve esa carpeta a
   `C:\AutoGestionDatos\uploads` y apunta ahí (recomendado).

### 11.4 Migrar y cambiar el servicio al `.exe`

En **PowerShell como Administrador**:

```powershell
cd C:\AutoGestion
.\autogestion.exe --migrate

nssm set AutoGestion Application "C:\AutoGestion\autogestion.exe"
nssm set AutoGestion AppParameters ""
nssm set AutoGestion AppDirectory "C:\AutoGestion"
nssm start AutoGestion
```

### 11.5 Verificar

- Abre `http://localhost:4000` e inicia sesión con un usuario de siempre.
- Revisa que los vehículos tengan su tipo, que se vean las fotos y que se pueda crear una recepción.
- Cuando todo funcione (idealmente tras unos días), ya puedes borrar las carpetas viejas
  `backend\`, `frontend\` y `node_modules`, y desinstalar Node.js.

**Si algo falla**: detén el servicio, restaura el respaldo del paso 11.1 en pgAdmin
(**Restore...** sobre una base recreada) y vuelve a apuntar el servicio a la instalación
anterior (`nssm edit AutoGestion`).

---

## 12. Respaldos (importante)

Respalda **dos cosas juntas**, de forma periódica:

1. **Base de datos**: en pgAdmin, clic derecho sobre `taller_sis → Backup...` (igual que en el
   paso B.1), guardando el archivo con la fecha en el nombre.
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
| Toma otra configuración | El `.env` debe estar en la misma carpeta que `autogestion.exe`. |
| La página abre pero no carga datos | La app no levantó, o el `JWT_SECRET` cambió (vuelve a iniciar sesión). |
| Las imágenes no se ven | `UPLOAD_DIR` apunta a otra carpeta, o no copiaste los archivos del paso 5. |
| No entra desde otra PC | Falta la regla de firewall (paso 8) o usaste `localhost` en vez de la IP del servidor. |
| `EADDRINUSE` al arrancar | El puerto 4000 ya está en uso: otra instancia corriendo (¿el servicio y una prueba manual a la vez?) o cambia `PORT`. |
| `pg_dump`/`psql` no encontrado | Usa la ruta completa según tu versión: `C:\Program Files\PostgreSQL\<versión>\bin\`. |

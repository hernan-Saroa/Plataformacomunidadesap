# Guía de Despliegue Local sin Docker (macOS & Windows)

Esta guía documenta paso a paso cómo configurar y ejecutar toda la plataforma (Base de datos, Redis, API Gateway, microservicios backend y microfrontends) localmente de forma nativa en tu máquina, sin utilizar contenedores de Docker.

---

## 1. Prerrequisitos Globales

Asegúrate de tener instalados los siguientes componentes en tu máquina:
- **Node.js:** Versión 22 o superior (Recomendado LTS). Puedes verificar tu versión con `node -v`.
- **npm:** Administrador de paquetes de Node.js (viene instalado con Node).

---

## 2. Instalación de Servicios Base (Base de Datos & Redis)

### OPCIÓN A: En macOS (usando Homebrew)

1. **Instalar PostgreSQL y Redis:**
   ```bash
   brew install postgresql@16 redis
   ```
2. **Iniciar los servicios automáticamente:**
   ```bash
   brew services start postgresql@16
   brew services start redis
   ```
3. **Crear la Base de Datos:**
   Conéctate a la consola de Postgres y crea la base de datos `esap_db`:
   ```bash
   psql -U postgres -d postgres -c "CREATE DATABASE esap_db;"
   ```

---

### OPCIÓN B: En Windows (Nativo)

1. **Instalar PostgreSQL:**
   - Descarga e instala [PostgreSQL para Windows](https://www.postgresql.org/download/windows/) (versión 16 o superior).
   - Recuerda la contraseña del usuario administrador `postgres` que definas en el asistente de instalación.
   - Abre la herramienta pgAdmin o SQL Shell (psql) y crea una base de datos vacía llamada `esap_db`:
     ```sql
     CREATE DATABASE esap_db;
     ```

2. **Instalar Redis (Memurai):**
   - Dado que Redis no tiene soporte directo y nativo de Microsoft, la forma recomendada en Windows es usar **Memurai** (un clon de Redis gratuito para desarrollo).
   - Descarga e instala [Memurai Developer Edition](https://www.memurai.com/). El servicio se iniciará automáticamente.

3. **Configurar Variable de Entorno PATH (Muy Importante):**
   Para que las herramientas de comandos de Windows (CMD, PowerShell o Git Bash) puedan ejecutar scripts que usan la CLI de Postgres:
   - Ve a la búsqueda de Windows y escribe "Variables de entorno".
   - Edita las variables del sistema y edita la variable `Path`.
   - Añade una nueva línea con la ruta de la carpeta `bin` de tu Postgres. Ejemplo:
     `C:\Program Files\PostgreSQL\16\bin`
   - Guarda los cambios y reinicia tu terminal.

---

## 3. Configuración de Variables de Entorno (`.env`)

Cada servicio lee sus variables desde un archivo `.env` local que no se sube a Git. Debemos generarlos a partir de los `.env.example` provistos.

1. **Copiar archivos `.env.example` a `.env`:**
   Abre una terminal de **Git Bash** (en Windows) o tu terminal habitual (en macOS) en la raíz del proyecto y ejecuta:
   ```bash
   for dir in backend/*/; do cp "$dir.env.example" "$dir.env" 2>/dev/null || true; done
   ```
   *(Si estás en Windows y usas CMD, puedes copiar cada archivo de forma manual usando `copy` o renombrándolo directamente desde el explorador).*

2. **Configurar credenciales en los archivos `.env`:**
   Edita el archivo `backend/auth-service/.env` (y el de los demás servicios de backend) y asegúrate de que apunten a tu base de datos y Redis nativos:
   ```env
   DB_HOST=127.0.0.1
   DB_PORT=5432
   DB_USER=postgres
   DB_PASS=tu_contraseña_de_postgres_instalado
   DB_NAME=esap_db
   REDIS_URL=redis://127.0.0.1:6379
   ```

---

## 4. Inicializar Base de Datos y Migraciones

Antes de iniciar la app por primera vez, debes estructurar las tablas e insertar los roles, permisos y catálogos base.

### Desde Git Bash (Windows) o Terminal (macOS):
1. **Dar permisos de ejecución a los scripts:**
   ```bash
   chmod +x migrate.first.local.sh migrate.local.sh
   ```
2. **Ejecutar la inicialización base de tablas:**
   ```bash
   ./migrate.first.local.sh
   ```
3. **Ejecutar las migraciones incrementales y permisos RBAC:**
   ```bash
   ./migrate.local.sh
   ```

### Desde Command Prompt (CMD) de Windows:
Si no utilizas Git Bash, puedes usar el script por lotes (.bat) integrado:
1. Revisa el archivo `migrate.local.windows.bat` y edita la **línea 61** para colocar la versión correcta de tu Postgres (`16`, `17`, `18`, etc.) si es distinta a la ruta que viene por defecto.
2. Ejecuta en CMD:
   ```cmd
   migrate.local.windows.bat
   ```

---

## 5. Levantar y Ejecutar la Plataforma

Una vez que la base de datos está migrada y los servicios base iniciados, ejecuta estos comandos en la raíz del proyecto:

1. **Instalar las dependencias de Node.js:**
   ```bash
   npm install
   ```
2. **Iniciar el Backend (Microservicios NestJS):**
   Abre una terminal y ejecuta:
   ```bash
   npm run dev:backend
   ```
   *(Este comando ejecutará de forma automática y en paralelo todos los backend y el API Gateway).*

3. **Iniciar el Frontend (Host y Microfrontends):**
   Abre otra terminal y ejecuta:
   ```bash
   npm run dev:all
   ```
   *(Esto iniciará el Shell MFE en el puerto `3000` y cargará los demás MFEs locales).*

4. **Acceder a la aplicación:**
   Abre tu navegador web e ingresa a:
   `http://localhost:3000`

---

## 6. Solución de Problemas Comunes (Troubleshooting)

- **Error: `psql` no se reconoce como un comando interno:**
  Asegúrate de haber reiniciado tu terminal tras agregar PostgreSQL a las Variables de Entorno de Windows. Abre una nueva terminal e intenta correr `psql -V` para verificar.
- **Error: `Connection refused` en el puerto 5432:**
  Valida si el servicio de PostgreSQL está realmente corriendo de manera nativa en tu máquina y que el puerto sea el `5432` y no otro (como el `5433` que a veces se asigna en instalaciones conflictivas).
- **Conflicto de Puertos:**
  Si algún puerto local requerido ya está en uso, puedes buscar el proceso que lo está usando y matarlo:
  - **macOS:** `lsof -i :<puerto>` y luego `kill -9 <PID>`.
  - **Windows (CMD):** `netstat -ano | findstr :<puerto>` y luego `taskkill /F /PID <PID>`.

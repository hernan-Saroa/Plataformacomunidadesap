# Guía de despliegue – ESAP SuperApp (Entorno DEV)

Este documento describe el paso a paso para desplegar la **ESAP SuperApp** en el **entorno de desarrollo (DEV)** usando Docker y el script `deploy.dev.sh`.

---

## 1. Prerrequisitos en el servidor

Antes de desplegar, asegúrate de que el servidor cumple con lo siguiente:

1. **Sistema operativo**
   - Linux (Ubuntu/Debian/CentOS u otro sistema compatible con Docker).

2. **Acceso al servidor**
   - Acceso por SSH con un usuario que tenga permisos para ejecutar Docker (idealmente dentro del grupo `docker` o con permisos de `sudo`).

3. **Docker instalado**
   Verifica que Docker está instalado:
   ```bash
   docker --version
   ```

4. **Docker Compose (plugin moderno) instalado**
   El script utiliza el comando `docker compose` (no `docker-compose`):
   ```bash
   docker compose version
   ```

5. **Git instalado (opcional pero recomendado)**
   ```bash
   git --version
   ```

---

## 2. Estructura mínima del proyecto en el servidor

En el servidor, el proyecto debe tener al menos los siguientes archivos en la raíz:

- `deploy.dev.sh` – Script principal de despliegue para entorno DEV.
- `docker-compose.dev.yml` – Definición de servicios Docker para DEV.
- `.env.dev` – Archivo de variables de entorno para DEV.

Ejemplo de estructura:
```text
/esap-superapp
  ├── deploy.dev.sh
  ├── docker-compose.dev.yml
  ├── .env.dev
  └── (otros archivos y carpetas del proyecto…)
```

Si aún no tienes el proyecto en el servidor, puedes clonarlo desde tu repositorio:

```bash
ssh usuario@4.156.71.181
git clone <URL_DEL_REPO> esap-superapp
cd esap-superapp
```

> Cambia `usuario` y `<URL_DEL_REPO>` por tus valores reales.

---

## 3. Preparar el script de despliegue

1. Copia el archivo `deploy.dev.sh` a la raíz del proyecto (si aún no está allí).
2. Asigna permisos de ejecución al script:

```bash
cd /ruta/al/proyecto/esap-superapp
chmod +x deploy.dev.sh
```

3. Verifica que el script se puede ejecutar:
```bash
./deploy.dev.sh
```

Si lo ejecutas sin parámetros, debe mostrar el mensaje de ayuda con los comandos disponibles.

---

## 4. Configurar variables de entorno (`.env.dev`)

El script carga automáticamente las variables de entorno desde el archivo `.env.dev` si existe en la raíz del proyecto.

1. Crea o edita el archivo `.env.dev`:
   ```bash
   nano .env.dev
   ```

2. Define en este archivo las variables necesarias para el entorno de desarrollo, por ejemplo:
   ```env
   NODE_ENV=development
   DB_HOST=superapp-db
   DB_PORT=5432
   DB_USER=esap_user
   DB_PASSWORD=esap_password
   DB_NAME=esap_db
   API_GATEWAY_PORT=3000
   FRONTEND_PORT=80
   ```

3. Guarda los cambios y cierra el editor.

> Las variables exactas dependerán de cómo esté configurado tu `docker-compose.dev.yml`.

---

## 5. Comandos del script `deploy.dev.sh`

Todos los comandos se ejecutan desde la raíz del proyecto:

```bash
./deploy.dev.sh <comando>
```

Los principales comandos disponibles son:

### 5.1. Levantar todos los servicios – `up`

```bash
./deploy.dev.sh up
```

- Levanta los servicios definidos en `docker-compose.dev.yml` en modo **detached** (en segundo plano).
- Una vez levantado, la aplicación debería ser accesible en:
  - **Frontend**: `http://4.156.71.181`
  - **API Gateway**: `http://4.156.71.181:3000`

### 5.2. Detener todos los servicios – `down`

```bash
./deploy.dev.sh down
```

- Detiene y elimina los contenedores del entorno DEV.
- No elimina imágenes ni volúmenes (a menos que esté configurado explícitamente en el `docker-compose`).

### 5.3. Reiniciar servicios – `restart`

```bash
./deploy.dev.sh restart
```

- Reinicia los contenedores actualmente configurados sin reconstruir las imágenes.
- Útil cuando solo se han cambiado configuraciones menores (como variables de entorno cargadas desde fuera del contenedor).

### 5.4. Reconstruir y levantar servicios – `rebuild`

```bash
./deploy.dev.sh rebuild
```

Este comando suele hacer lo siguiente (según la lógica del script):

1. Hace `down` del stack actual.
2. Reconstruye las imágenes (`docker compose build --no-cache`).
3. Levanta nuevamente los servicios (`docker compose up -d`).

Úsalo cuando hayas cambiado código de los microservicios o la definición de los Dockerfiles.

### 5.5. Ver logs – `logs`

```bash
./deploy.dev.sh logs
```

- Muestra los logs combinados de todos los servicios definidos en el `docker-compose.dev.yml`.
- Normalmente se ejecuta con `-f` para seguir los logs en tiempo real.

Para salir de los logs en tiempo real, presiona `Ctrl + C`.

### 5.6. Ver estado de los contenedores – `status`

```bash
./deploy.dev.sh status
```

- Muestra una tabla con los contenedores, su estado y los puertos expuestos.
- Equivale a un `docker compose ps` sobre el archivo de DEV.

### 5.7. Limpiar recursos Docker – `clean`

```bash
./deploy.dev.sh clean
```

- Ejecuta un `docker system prune -f` (según la lógica del script).
- Esto elimina contenedores detenidos, redes no usadas, imágenes colgantes y caché de build.
- Úsalo con cuidado en servidores compartidos, ya que puede afectar otros stacks Docker.

### 5.8. Backup de base de datos – `db-backup`

```bash
./deploy.dev.sh db-backup
```

- Ejecuta un `pg_dump` dentro del contenedor de base de datos (por ejemplo `superapp-db`).
- Genera un archivo de respaldo con nombre similar a:
  ```text
  backup_esap_YYYYMMDD_HHMMSS.sql
  ```
- El archivo se almacena normalmente en una carpeta `./db` dentro del proyecto (según la configuración interna del script).

Puedes listar los backups con:

```bash
ls -lh db/
```

---

## 6. Flujo típico de despliegue en DEV

A continuación, un flujo recomendado para desplegar una nueva versión en el entorno de desarrollo:

1. **Conectarse al servidor**
   ```bash
   ssh usuario@4.156.71.181
   cd /ruta/al/proyecto/esap-superapp
   ```

2. **Actualizar el código del repositorio**
   ```bash
   git pull
   ```

3. **Verificar y/o ajustar el archivo `.env.dev`**
   ```bash
   nano .env.dev
   ```

4. **Crear un backup de la base de datos (opcional pero recomendado)**
   ```bash
   ./deploy.dev.sh db-backup
   ```

5. **Reconstruir y levantar los servicios (si hay cambios de código o Dockerfiles)**
   ```bash
   ./deploy.dev.sh rebuild
   ```

   Si solo quieres levantar sin reconstruir:
   ```bash
   ./deploy.dev.sh up
   ```

6. **Verificar que los contenedores estén corriendo**
   ```bash
   ./deploy.dev.sh status
   ```

7. **Revisar logs si hay errores**
   ```bash
   ./deploy.dev.sh logs
   ```

8. **Probar acceso a la aplicación**
   - Frontend: `http://4.156.71.181`
   - API Gateway / Backend: `http://4.156.71.181:3000`

---

## 7. Troubleshooting básico

### 7.1. Error: Docker no está instalado

Si al ejecutar el script aparece un mensaje similar a:

```text
Error: Docker no está instalado
```

Instala Docker siguiendo la documentación oficial de tu distribución. Ejemplo rápido para Ubuntu:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo   "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu   "$(lsb_release -cs)" stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Añade tu usuario al grupo `docker` (opcional):
```bash
sudo usermod -aG docker $USER
```

### 7.2. Error: Docker Compose no está instalado

Si aparece:
```text
Error: Docker Compose no está instalado
```

Asegúrate de tener instalado el plugin `docker compose` (generalmente viene con Docker moderno). Si usas una versión antigua, deberás instalar o actualizar Docker.

### 7.3. Servicios que no levantan o se caen

1. Revisa el estado:
   ```bash
   ./deploy.dev.sh status
   ```

2. Revisa los logs:
   ```bash
   ./deploy.dev.sh logs
   ```

3. Verifica que las variables de entorno en `.env.dev` coinciden con la configuración de `docker-compose.dev.yml` (nombres de host, usuarios, contraseñas, puertos, etc.).

4. Si el problema persiste, limpia recursos y vuelve a levantar:
   ```bash
   ./deploy.dev.sh down
   ./deploy.dev.sh clean
   ./deploy.dev.sh up
   ```

---

## 8. Notas finales

- Este documento está pensado para el entorno **DEV**. Para QA o PROD se recomienda tener scripts y archivos `.env` separados (`deploy.qa.sh`, `deploy.prod.sh`, `.env.qa`, `.env.prod`, etc.).
- Documenta siempre cualquier cambio que hagas en `docker-compose.dev.yml` o en el script `deploy.dev.sh` para mantener esta guía actualizada.

# Guía de despliegue local con Docker Desktop

Esta guía documenta cómo correr toda la app en local usando [deploy.local.sh](/Users/henrryrojas/Documents/SAROA/ESAP/Plataformacomunidadesap/deploy.local.sh) y [docker-compose.local.yml](/Users/henrryrojas/Documents/SAROA/ESAP/Plataformacomunidadesap/docker-compose.local.yml).

Importante:

- este flujo no despliega PostgreSQL
- el backend se conecta a una base de datos ya existente
- el frontend se levanta en modo microfrontend: gateway + shell + remotos

## Qué levanta este deploy local

- `redis`
- `onlyoffice`
- `api-gateway`
- microservicios backend
- `frontend`
- `frontend-shell`
- `frontend-mfe-*`

No se levanta una base real en Docker. El compose define un `db` placeholder sólo para satisfacer dependencias heredadas, pero las conexiones reales van a la BD configurada en `.env.local`.

## Variables importantes

El script crea `.env.local` si no existe. Revisa como mínimo estas variables:

```env
LOCAL_DB_HOST=host.docker.internal
LOCAL_DB_PORT=5432
LOCAL_DB_USER=postgres
LOCAL_DB_PASSWORD=postgres
LOCAL_DB_NAME=esap_db
LOCAL_CORS_ORIGIN=http://localhost
FRONTEND_VITE_API_URL=http://localhost/services
FRONTEND_VITE_ONLYOFFICE_URL=http://localhost:9000
```

Si tu base no corre en tu máquina local sino en otro host, cambia `LOCAL_DB_HOST` por la IP o hostname correspondiente.

## Paso a paso en macOS

1. Instala Docker Desktop y ábrelo.

2. Verifica que Docker esté arriba:

```bash
docker --version
docker compose version
```

3. Entra al proyecto:

```bash
cd /ruta/al/proyecto/Plataformacomunidadesap
```

4. Da permisos al script:

```bash
chmod +x deploy.local.sh
```

5. Ejecuta el deploy local:

```bash
./deploy.local.sh up
```

6. Revisa el estado:

```bash
./deploy.local.sh status
```

7. Si necesitas revisar errores:

```bash
./deploy.local.sh logs
./deploy.local.sh logs auth-service
./deploy.local.sh logs frontend
```

8. Abre la aplicación:

- Frontend: `http://localhost`
- API Gateway: `http://localhost/services`
- OnlyOffice: `http://localhost:9000`

## Paso a paso en Windows

La forma recomendada es usar Docker Desktop + Git Bash o WSL. `deploy.local.sh` es un script Bash, así que no se ejecuta directamente desde PowerShell o CMD sin una capa Unix.

### Opción recomendada: Git Bash

1. Instala Docker Desktop.

2. Instala Git for Windows.

3. Abre Docker Desktop y espera a que quede iniciado.

4. Abre Git Bash.

5. Entra al proyecto:

```bash
cd /c/ruta/al/proyecto/Plataformacomunidadesap
```

6. Da permisos al script:

```bash
chmod +x deploy.local.sh
```

7. Ejecuta el deploy:

```bash
./deploy.local.sh up
```

8. Verifica estado y logs:

```bash
./deploy.local.sh status
./deploy.local.sh logs
```

### Opción recomendada si ya usas WSL

1. Abre Docker Desktop.

2. Abre tu distro WSL.

3. Entra al proyecto:

```bash
cd /mnt/c/ruta/al/proyecto/Plataformacomunidadesap
```

4. Ejecuta:

```bash
chmod +x deploy.local.sh
./deploy.local.sh up
```

## Comandos útiles

Levantar sólo backend:

```bash
./deploy.local.sh up-backend
```

Levantar sólo frontend MFE:

```bash
./deploy.local.sh up-frontend
```

Reconstruir toda la app:

```bash
./deploy.local.sh rebuild
```

Reconstruir un backend:

```bash
./deploy.local.sh rebuild-service auth-service
```

Reconstruir un microfrontend:

```bash
./deploy.local.sh rebuild-mfe shell
./deploy.local.sh rebuild-mfe auditoria
./deploy.local.sh rebuild-mfe control-disciplinario
```

Validar estado general:

```bash
./deploy.local.sh health
```

Probar conexión a la base externa:

```bash
./deploy.local.sh db-test
```

Detener todo:

```bash
./deploy.local.sh down
```

## Problemas comunes

Si el backend no conecta a la base:

- revisa `LOCAL_DB_HOST`, `LOCAL_DB_PORT`, `LOCAL_DB_USER`, `LOCAL_DB_PASSWORD`, `LOCAL_DB_NAME`
- valida que la BD acepte conexiones desde Docker
- en Docker Desktop para Mac y Windows normalmente `host.docker.internal` funciona para llegar al host

Si el puerto `80` o `9000` está ocupado:

- libera el puerto en tu máquina
- o ajusta los mapeos en los compose base si quieres usar otros puertos

Si usas una base que corre en otro contenedor externo:

- no uses `localhost` dentro del contenedor
- usa el host publicado o una red compartida entre contenedores

## Referencia

- [deploy.local.sh](/Users/henrryrojas/Documents/SAROA/ESAP/Plataformacomunidadesap/deploy.local.sh)
- [docker-compose.local.yml](/Users/henrryrojas/Documents/SAROA/ESAP/Plataformacomunidadesap/docker-compose.local.yml)

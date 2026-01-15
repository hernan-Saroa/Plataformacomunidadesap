# Audit Service

Microservicio centralizado de auditoría para la plataforma ESAP.

## Descripción

Este servicio registra automáticamente todas las peticiones HTTP que pasan por el API Gateway, proporcionando un sistema completo de auditoría y trazabilidad.

## Características

- ✅ Registro automático de todas las peticiones HTTP (GET, POST, PUT, DELETE, PATCH)
- ✅ Captura de información del cliente (IP, User-Agent, etc.)
- ✅ Información del usuario autenticado
- ✅ Métricas de performance (tiempo de respuesta)
- ✅ Registro de errores
- ✅ Consultas y filtros avanzados
- ✅ Estadísticas agregadas

## Endpoints

### POST /logs
Registra un nuevo log de auditoría.

**Body:**
```json
{
  "method": "POST",
  "url": "/auth/api/v1/login",
  "path": "/login",
  "serviceName": "auth",
  "version": "1",
  "ipAddress": "192.168.1.100",
  "statusCode": 200,
  "responseTimeMs": 150
}
```

### GET /logs
Consulta logs con filtros opcionales.

**Query Parameters:**
- `startDate`: Fecha de inicio (ISO 8601)
- `endDate`: Fecha de fin (ISO 8601)
- `method`: Método HTTP (GET, POST, etc.)
- `serviceName`: Nombre del servicio
- `userId`: ID del usuario
- `ipAddress`: Dirección IP
- `statusCode`: Código de estado HTTP
- `limit`: Límite de resultados (default: 100, max: 1000)
- `offset`: Offset para paginación (default: 0)

**Ejemplo:**
```
GET /logs?startDate=2025-01-01&method=POST&limit=50
```

### GET /logs/stats
Obtiene estadísticas agregadas de los logs.

**Query Parameters:**
- `startDate`: Fecha de inicio (ISO 8601)
- `endDate`: Fecha de fin (ISO 8601)

## Variables de Entorno

```env
NODE_ENV=development
PORT=3011
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=esap_db
```

## Base de Datos

El servicio utiliza el schema `audit` en PostgreSQL. La tabla principal es `request_logs`.

### Migración

Ejecutar la migración:
```bash
psql -U postgres -d esap_db -f db/migrations/071_create_audit_schema.sql
```

## Desarrollo

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run start:dev

# Compilar
npm run build

# Ejecutar producción
npm run start:prod
```

## Docker

```bash
# Construir imagen
docker build -t audit-service .

# Ejecutar contenedor
docker run -p 3011:3011 audit-service
```

## Integración

El servicio se integra automáticamente con el API Gateway mediante un interceptor global que captura todas las peticiones y las envía a este servicio de forma asíncrona.

No se requiere configuración adicional en otros microservicios.



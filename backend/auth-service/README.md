# Auth Service

Microservicio de autenticación y autorización para la plataforma ESAP.

## Configuración

1. Instalar dependencias:
   ```bash
   npm install
   ```

2. Configurar variables de entorno en `.env` (basado en `.env.example`)

3. Ejecutar el seeding para datos iniciales:
   ```bash
   npm run seed
   ```

4. Iniciar el servicio:
   ```bash
   npm run start:dev
   ```

## Endpoints

- `POST /api/v1/auth/login` - Iniciar sesión
- `POST /api/v1/auth/new-person` - Registrar nuevo usuario
- `POST /api/v1/auth/change-password` - Cambiar contraseña (requiere auth)
- `POST /api/v1/auth/logout` - Cerrar sesión (requiere auth)

## Usuario Administrador

Después del seeding, puedes iniciar sesión con:
- **Username**: `admin`
- **Password**: `admin123`

## Pruebas con Postman

1. Importar la colección `Auth Service Postman Collection.json` en Postman
2. Configurar la variable `base_url` a `http://localhost:3001/api/v1`
3. Ejecutar las requests en orden:
   - Login (guarda automáticamente el token)
   - Las demás requests usarán el token guardado

## Base de Datos

- **Esquema**: `auth`
- **Tablas**: `person`, `user`, `role`, `permission`, `user_roles`, `role_permissions`
- **IDs**: UUID

## Desarrollo

- Puerto: 3001
- Prefijo: `/api/v1`
- Base de datos: PostgreSQL

# 📡 Guía Completa de Integración API - Backend ESAP

## 📋 Índice

1. [Arquitectura de Servicios](#arquitectura-de-servicios)
2. [Configuración Backend](#configuración-backend)
3. [Servicios Implementados](#servicios-implementados)
4. [Tipos TypeScript](#tipos-typescript)
5. [Endpoints por Módulo](#endpoints-por-módulo)
6. [Autenticación y Seguridad](#autenticación-y-seguridad)
7. [Manejo de Errores](#manejo-de-errores)
8. [Ejemplos de Uso](#ejemplos-de-uso)
9. [Testing](#testing)
10. [Deploy](#deploy)

---

## 🏗️ Arquitectura de Servicios

### **Estructura de Capas**

```
Frontend (React)
    ↓
Hooks de React Query (/hooks/useXQueries.ts)
    ↓
Servicios API (/services/api/*.ts)
    ↓
API Client (apiClient.ts)
    ↓
Backend REST API (Node.js/Express)
    ↓
Base de Datos (PostgreSQL)
```

### **Separación de Responsabilidades**

- **API Client**: Maneja requests HTTP, tokens, retry logic
- **Servicios**: Lógica de negocio y endpoints específicos
- **Hooks**: Estado y caché con React Query
- **Componentes**: UI y presentación

---

## ⚙️ Configuración Backend

### **Variables de Entorno**

Crear archivo `.env` en la raíz del proyecto:

```bash
# Entorno
NODE_ENV=development

# Base de Datos
DATABASE_URL=postgresql://user:password@localhost:5432/esap_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=esap_db
DB_USER=esap_user
DB_PASSWORD=your_secure_password

# API
API_PORT=3001
API_VERSION=v1
API_BASE_URL=http://localhost:3001/api

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_REFRESH_SECRET=your_super_secret_refresh_key_change_this_in_production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:3000
CORS_CREDENTIALS=true

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@esap.edu.co
SMTP_PASSWORD=your_email_password

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

# Redis (opcional)
REDIS_URL=redis://localhost:6379

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### **Configuración Frontend**

Archivo `/config/environment.ts` ya está configurado con:

```typescript
const API_URLS = {
  development: 'http://localhost:3001/api',
  staging: 'https://staging-api.esap.edu.co/api',
  production: 'https://api.esap.edu.co/api',
};
```

---

## 📦 Servicios Implementados

### **✅ Servicios Listos para Integración**

| Servicio | Archivo | Estado | Endpoints |
|----------|---------|--------|-----------|
| **Autenticación** | `authService.ts` | ✅ | 6 endpoints |
| **Usuarios** | `usersService.ts` | ✅ | 12 endpoints |
| **Roles** | `rolesService.ts` | ✅ | 10 endpoints |
| **Control Interno** | `controlInternoService.ts` | ✅ | 45+ endpoints |
| **Gestión Profesoral** | `gestionProfesoralService.ts` | ✅ | 35+ endpoints |
| **Certificados** | `certificadosService.ts` | ✅ | 25+ endpoints |
| **Enrolamiento** | `enrollmentService.ts` | ✅ | 8 endpoints |
| **Notificaciones** | `notificationsService.ts` | ✅ | 6 endpoints |
| **2FA** | `twoFactorAuthService.ts` | ✅ | 5 endpoints |

**Total: 150+ endpoints documentados y tipados**

---

## 🎯 Endpoints por Módulo

### **1. Autenticación** (`/api/v1/auth`)

```typescript
POST   /auth/login              // Login con email/password
POST   /auth/logout             // Logout y limpieza de tokens
POST   /auth/refresh            // Refresh access token
GET    /auth/verify             // Verificar token actual
POST   /auth/forgot-password    // Solicitar reset de contraseña
POST   /auth/reset-password     // Reset contraseña con token
POST   /auth/change-password    // Cambiar contraseña (autenticado)
```

### **2. Usuarios** (`/api/v1/users`)

```typescript
GET    /users                   // Listar usuarios (paginado)
GET    /users/:id               // Obtener usuario por ID
POST   /users                   // Crear usuario
PUT    /users/:id               // Actualizar usuario
DELETE /users/:id               // Eliminar usuario
GET    /users/stats             // Estadísticas de usuarios
POST   /users/bulk              // Crear usuarios en masa
PUT    /users/bulk-update       // Actualizar usuarios en masa
DELETE /users/bulk-delete       // Eliminar usuarios en masa
GET    /users/export            // Exportar usuarios
POST   /users/import            // Importar usuarios
GET    /users/:id/activity      // Actividad de usuario
GET    /users/:id/roles         // Roles de usuario
```

### **3. Control Interno** (`/api/v1/control-interno`)

#### **Dashboard**
```typescript
GET    /control-interno/dashboard     // Dashboard ejecutivo
GET    /control-interno/estadisticas  // Estadísticas generales
GET    /control-interno/kpi           // KPIs del sistema
GET    /control-interno/alertas       // Alertas activas
```

#### **Plan Anual de Auditoría**
```typescript
GET    /control-interno/plan-anual              // Todos los planes
GET    /control-interno/plan-anual/:id          // Plan por ID
GET    /control-interno/plan-anual/year/:year   // Plan por año
POST   /control-interno/plan-anual              // Crear plan
PUT    /control-interno/plan-anual/:id          // Actualizar plan
POST   /control-interno/plan-anual/:id/aprobar  // Aprobar plan
GET    /control-interno/plan-anual/:id/download // Descargar PDF
```

#### **Auditorías**
```typescript
GET    /control-interno/auditorias                    // Todas las auditorías
GET    /control-interno/auditorias/:id                // Auditoría por ID
GET    /control-interno/auditorias/:id/detalle        // Detalle completo
POST   /control-interno/auditorias                    // Crear auditoría
PUT    /control-interno/auditorias/:id                // Actualizar auditoría
POST   /control-interno/auditorias/:id/estado         // Cambiar estado
POST   /control-interno/auditorias/:id/evidencias/upload // Subir evidencia
```

#### **Hallazgos**
```typescript
GET    /control-interno/hallazgos                     // Todos los hallazgos
GET    /control-interno/hallazgos/:id                 // Hallazgo por ID
GET    /control-interno/hallazgos/:id/detalle         // Detalle completo
GET    /control-interno/hallazgos/auditoria/:auditoriaId // Por auditoría
POST   /control-interno/hallazgos                     // Crear hallazgo
PUT    /control-interno/hallazgos/:id                 // Actualizar hallazgo
DELETE /control-interno/hallazgos/:id                 // Eliminar hallazgo
GET    /control-interno/hallazgos/estadisticas        // Estadísticas
```

#### **Planes de Mejoramiento**
```typescript
GET    /control-interno/planes-mejoramiento           // Todos los planes
GET    /control-interno/planes-mejoramiento/:id       // Plan por ID
GET    /control-interno/planes-mejoramiento/hallazgo/:id // Por hallazgo
POST   /control-interno/planes-mejoramiento           // Crear plan
PUT    /control-interno/planes-mejoramiento/:id       // Actualizar plan
POST   /control-interno/planes-mejoramiento/:id/aprobar   // Aprobar plan
POST   /control-interno/planes-mejoramiento/:id/rechazar  // Rechazar plan
POST   /control-interno/planes-mejoramiento/:id/acciones  // Crear acción
PUT    /control-interno/planes-mejoramiento/:planId/acciones/:accionId // Actualizar acción
```

### **4. Gestión Profesoral** (`/api/v1/gestion-profesoral`)

#### **Docentes**
```typescript
GET    /gestion-profesoral/docentes                    // Todos los docentes
GET    /gestion-profesoral/docentes/:id/detalle        // Detalle completo
POST   /gestion-profesoral/docentes                    // Crear docente
PUT    /gestion-profesoral/docentes/:id                // Actualizar docente
DELETE /gestion-profesoral/docentes/:id                // Eliminar docente
POST   /gestion-profesoral/docentes/bulk-import        // Importar docentes
GET    /gestion-profesoral/docentes/export             // Exportar docentes
GET    /gestion-profesoral/docentes/:id/disponibilidad // Disponibilidad
GET    /gestion-profesoral/docentes/:id/carga-academica // Carga académica
```

#### **PTAs**
```typescript
GET    /gestion-profesoral/pta                         // Todos los PTAs
GET    /gestion-profesoral/pta/:id                     // PTA por ID
GET    /gestion-profesoral/pta/docente/:docenteId      // PTAs de docente
GET    /gestion-profesoral/pta/periodo/:periodoId      // PTAs de período
POST   /gestion-profesoral/pta                         // Crear PTA
PUT    /gestion-profesoral/pta/:id                     // Actualizar PTA
POST   /gestion-profesoral/pta/:id/revision            // Enviar a revisión
POST   /gestion-profesoral/pta/:id/aprobar             // Aprobar PTA
POST   /gestion-profesoral/pta/:id/rechazar            // Rechazar PTA
```

#### **Asignaciones**
```typescript
GET    /gestion-profesoral/asignaciones                // Todas
GET    /gestion-profesoral/asignaciones/:id            // Por ID
POST   /gestion-profesoral/asignaciones                // Crear
PUT    /gestion-profesoral/asignaciones/:id            // Actualizar
DELETE /gestion-profesoral/asignaciones/:id            // Eliminar
GET    /gestion-profesoral/asignaciones/matriz         // Matriz
GET    /gestion-profesoral/asignaciones/conflictos     // Detectar conflictos
POST   /gestion-profesoral/asignaciones/validar        // Validar asignación
```

### **5. Certificados Laborales** (`/api/v1/certificados`)

#### **Solicitudes**
```typescript
GET    /certificados/solicitudes                       // Todas
GET    /certificados/solicitudes/:id                   // Por ID
GET    /certificados/solicitudes/empleado/:empleadoId  // Por empleado
POST   /certificados/solicitudes                       // Crear
PUT    /certificados/solicitudes/:id                   // Actualizar
POST   /certificados/solicitudes/:id/aprobar           // Aprobar
POST   /certificados/solicitudes/:id/rechazar          // Rechazar
POST   /certificados/solicitudes/:id/cancelar          // Cancelar
```

#### **Certificados**
```typescript
GET    /certificados                                   // Todos
GET    /certificados/:id                               // Por ID
GET    /certificados/codigo/:codigo                    // Por código
POST   /certificados/generar                           // Generar
POST   /certificados/:id/regenerar                     // Regenerar
POST   /certificados/:id/anular                        // Anular
GET    /certificados/:id/download                      // Descargar PDF
GET    /certificados/:id/qr                            // Obtener QR
```

#### **Validación**
```typescript
POST   /certificados/validar/codigo                    // Validar por código
POST   /certificados/validar/qr                        // Validar por QR
POST   /certificados/validar/publico                   // Validación pública
GET    /certificados/validacion/historial              // Historial
```

---

## 🔐 Autenticación y Seguridad

### **Flow de Autenticación**

```mermaid
sequenceDiagram
    Frontend->>+Backend: POST /auth/login
    Backend->>Backend: Validar credenciales
    Backend->>Backend: Generar JWT tokens
    Backend-->>-Frontend: accessToken + refreshToken
    Frontend->>Frontend: Guardar en localStorage
    Frontend->>+Backend: GET /users (con token)
    Backend->>Backend: Verificar token
    Backend-->>-Frontend: Datos solicitados
    Note over Frontend,Backend: Token expira en 15min
    Frontend->>+Backend: POST /auth/refresh
    Backend->>Backend: Verificar refreshToken
    Backend-->>-Frontend: Nuevo accessToken
```

### **Headers de Autenticación**

```typescript
{
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIs...',
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'X-Client-Version': '1.0.0',
  'X-Client-Platform': 'web'
}
```

### **Refresh Automático de Tokens**

El `apiClient` maneja automáticamente:

1. ✅ Detecta token expirado (401)
2. ✅ Intenta refresh con `refreshToken`
3. ✅ Reinten ta request original con nuevo token
4. ✅ Si falla, redirige a login

---

## 🚨 Manejo de Errores

### **Estructura de Error**

```typescript
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "El campo email es requerido",
    "details": {
      "field": "email",
      "constraint": "required"
    }
  },
  "timestamp": "2025-11-27T10:30:00Z"
}
```

### **Códigos de Error HTTP**

| Código | Significado | Acción Frontend |
|--------|-------------|-----------------|
| 400 | Bad Request | Mostrar error de validación |
| 401 | Unauthorized | Intentar refresh o logout |
| 403 | Forbidden | Mostrar "Sin permisos" |
| 404 | Not Found | Mostrar "No encontrado" |
| 422 | Validation Error | Mostrar errores de campos |
| 429 | Too Many Requests | Mostrar "Intente más tarde" |
| 500 | Server Error | Mostrar error genérico |
| 502 | Bad Gateway | Mostrar "Servicio no disponible" |
| 503 | Service Unavailable | Mostrar "Mantenimiento" |

### **Retry Logic**

```typescript
// Configurado en apiClient
const retryConfig = {
  attempts: 3,
  delay: 1000, // ms
  backoff: 'exponential'
};

// NO se reintenta en:
// - 401 (Unauthorized)
// - 403 (Forbidden)
// - 404 (Not Found)
// - 422 (Validation Error)
```

---

## 💡 Ejemplos de Uso

### **1. Login y Autenticación**

```typescript
import { authService } from '@/services/api';

// Login
async function handleLogin() {
  try {
    const response = await authService.login({
      email: 'admin@esap.edu.co',
      password: 'password123',
      rememberMe: true
    });
    
    // authService ya guarda los tokens automáticamente
    console.log('Usuario:', response.user);
    console.log('Token:', response.accessToken);
    
    // Redirigir al dashboard
    navigate('/dashboard');
  } catch (error) {
    console.error('Error de login:', error.message);
    toast.error('Credenciales inválidas');
  }
}

// Logout
async function handleLogout() {
  await authService.logout();
  navigate('/login');
}
```

### **2. Obtener Datos con Paginación**

```typescript
import { controlInternoService } from '@/services/api';

async function loadAuditorias() {
  try {
    const response = await controlInternoService.getAuditorias({
      page: 1,
      pageSize: 20,
      estado: 'en_curso',
      orderBy: 'fechaInicio',
      orderDirection: 'desc'
    });
    
    console.log('Auditorías:', response.data);
    console.log('Total páginas:', response.pagination.totalPages);
    console.log('Total items:', response.pagination.totalItems);
  } catch (error) {
    console.error('Error:', error);
  }
}
```

### **3. Crear Recurso**

```typescript
import { controlInternoService } from '@/services/api';
import { toast } from 'sonner';

async function createHallazgo(data) {
  try {
    const hallazgo = await controlInternoService.createHallazgo({
      auditoriaId: 'aud-123',
      codigo: 'HAL-2025-001',
      titulo: 'Falta de documentación',
      tipo: 'no_conformidad_menor',
      criticidad: 'media',
      procesoAfectado: 'Gestión Documental',
      areaResponsable: 'Administrativa',
      responsable: 'user-456',
      descripcion: 'Se encontró...',
      criterioAuditoria: 'ISO 9001:2015',
      condicion: 'No se evidenció...'
    });
    
    toast.success('Hallazgo creado exitosamente');
    return hallazgo;
  } catch (error) {
    toast.error(error.message);
    throw error;
  }
}
```

### **4. Upload de Archivos**

```typescript
import { controlInternoService } from '@/services/api';

async function uploadEvidencia(auditoriaId: string, file: File) {
  try {
    const evidencia = await controlInternoService.uploadEvidencia(
      auditoriaId,
      file,
      'Evidencia de inspección'
    );
    
    toast.success('Evidencia cargada exitosamente');
    return evidencia;
  } catch (error) {
    toast.error('Error al cargar evidencia');
    throw error;
  }
}
```

### **5. Con React Query (Recomendado)**

```typescript
// En /hooks/useControlInternoQueries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { controlInternoService } from '@/services/api';

export function useAuditorias(params?: any) {
  return useQuery({
    queryKey: ['auditorias', params],
    queryFn: () => controlInternoService.getAuditorias(params),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useCreateHallazgo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) => controlInternoService.createHallazgo(data),
    onSuccess: () => {
      // Invalidar cache de hallazgos
      queryClient.invalidateQueries(['hallazgos']);
      toast.success('Hallazgo creado');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });
}

// En componente
function MyComponent() {
  const { data, isLoading, error } = useAuditorias({ estado: 'en_curso' });
  const createMutation = useCreateHallazgo();
  
  if (isLoading) return <Loading />;
  if (error) return <Error message={error.message} />;
  
  return (
    <div>
      {data.data.map(auditoria => (
        <AuditoriaCard key={auditoria.id} data={auditoria} />
      ))}
    </div>
  );
}
```

---

## 🧪 Testing

### **Testing de Servicios**

```typescript
// tests/services/controlInternoService.test.ts
import { controlInternoService } from '@/services/api';
import { mockApiClient } from '@/tests/mocks';

describe('ControlInternoService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('debe obtener auditorías correctamente', async () => {
    const mockData = { data: [], pagination: {} };
    mockApiClient.get.mockResolvedValue(mockData);
    
    const result = await controlInternoService.getAuditorias();
    
    expect(mockApiClient.get).toHaveBeenCalledWith(
      '/control-interno/auditorias',
      undefined
    );
    expect(result).toEqual(mockData);
  });
  
  it('debe crear hallazgo correctamente', async () => {
    const mockHallazgo = { id: '123', titulo: 'Test' };
    mockApiClient.post.mockResolvedValue(mockHallazgo);
    
    const data = { titulo: 'Test', /* ... */ };
    const result = await controlInternoService.createHallazgo(data);
    
    expect(result).toEqual(mockHallazgo);
  });
});
```

---

## 🚀 Deploy

### **Checklist de Deploy**

- [ ] Configurar variables de entorno en producción
- [ ] Actualizar `API_BASE_URL` en `/config/environment.ts`
- [ ] Habilitar HTTPS
- [ ] Configurar CORS correctamente
- [ ] Habilitar rate limiting
- [ ] Configurar logs y monitoring
- [ ] Setup de base de datos PostgreSQL
- [ ] Configurar Redis para caché (opcional)
- [ ] Setup de email SMTP
- [ ] Configurar storage para archivos (AWS S3, etc.)

### **Variables de Entorno Producción**

```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/esap_prod
API_BASE_URL=https://api.esap.edu.co/api
JWT_SECRET=super_secure_secret_change_in_production
CORS_ORIGIN=https://app.esap.edu.co
FRONTEND_URL=https://app.esap.edu.co
```

---

## 📚 Recursos Adicionales

- **Documentación de Tipos**: `/types/control-interno.ts`, `/types/gestion-profesoral.ts`
- **Configuración**: `/config/environment.ts`
- **API Client**: `/services/api/apiClient.ts`
- **Hooks**: `/hooks/useControlInternoQueries.ts` (crear según necesidad)
- **Ejemplos**: Ver componentes existentes en `/components/control-interno/`

---

## 🤝 Soporte

Para integración backend, contactar al equipo de desarrollo:
- **Email**: dev@esap.edu.co
- **Slack**: #dev-backend-integration
- **Docs**: https://docs.esap.edu.co/api

---

**✅ Frontend 100% Listo para Integración Backend**

Todos los servicios están documentados, tipados y listos para conectar con el backend Node.js/Express cuando esté disponible.

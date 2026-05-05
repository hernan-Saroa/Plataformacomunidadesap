# 🔌 Servicios de API - Frontend

Esta carpeta contiene todos los servicios de API del frontend, listos para conectar con el backend.

## 📋 Estructura

```
/services/api/
├── config.ts              # Configuración global de API
├── client.ts              # Cliente HTTP con manejo de JWT
├── types.ts               # Tipos TypeScript compartidos
├── auth.service.ts        # Autenticación y sesiones
├── usuarios.service.ts    # Gestión de usuarios (Backoffice)
├── dashboard.service.ts   # Dashboard ejecutivo
├── estructura.service.ts  # Territoriales, regionales, sedes
├── certificados.service.ts # Certificados graduados y laborales
├── portal.service.ts      # Portal transaccional (red social)
├── publico.service.ts     # Servicios públicos (Landing Page)
└── index.ts               # Exportación centralizada
```

---

## 🚀 Uso Rápido

### 1. Configurar variables de entorno

Copia `.env.example` a `.env` y configura la URL de tu backend:

```env
VITE_API_URL=http://localhost:3000/api/v1
```

### 2. Importar servicios

```typescript
import { api, auth } from '@/services/api';

// O importar servicios específicos
import { authService, usuariosService, portalService } from '@/services/api';
```

### 3. Usar servicios

```typescript
// Ejemplo: Login
try {
  const response = await api.auth.login({
    email: 'usuario@esap.edu.co',
    password: 'password123'
  });
  
  console.log('Usuario logueado:', response.usuario);
  // Los tokens se guardan automáticamente
} catch (error) {
  console.error('Error en login:', error);
}

// Ejemplo: Listar usuarios (Backoffice)
try {
  const usuarios = await api.usuarios.listar({
    page: 1,
    limit: 25,
    estado: 'Activo'
  });
  
  console.log('Usuarios:', usuarios.datos);
  console.log('Total:', usuarios.paginacion.total);
} catch (error) {
  console.error('Error al listar usuarios:', error);
}

// Ejemplo: Crear publicación (Portal)
try {
  const publicacion = await api.portal.feed.crearPublicacion({
    tipo: 'post',
    contenido: '¡Mi primera publicación!',
    visibilidad: 'publico'
  });
  
  console.log('Publicación creada:', publicacion);
} catch (error) {
  console.error('Error al crear publicación:', error);
}

// Ejemplo: Validar certificado (Público - sin auth)
try {
  const resultado = await api.publico.certificados.validarCodigo({
    codigoCertificado: 'CERT-GRAD-2024-00001'
  });
  
  if (resultado.valido) {
    console.log('Certificado válido:', resultado.certificado);
  }
} catch (error) {
  console.error('Error al validar:', error);
}
```

---

## 🔐 Autenticación

### Login Automático

El cliente maneja automáticamente:
- ✅ Guardar tokens en localStorage
- ✅ Agregar token a headers en cada request
- ✅ Renovar token automáticamente cuando expire
- ✅ Redirigir al login si el refresh falla
- ✅ Reintentar requests fallidos por token expirado

```typescript
import { auth } from '@/services/api';

// Login
await auth.login({ email, password });

// Verificar autenticación
const isLoggedIn = auth.isAuthenticated();

// Obtener usuario actual
const user = auth.getCurrentUser();

// Logout
await auth.logout();
```

### Requests con Autenticación

```typescript
// Por defecto, todos los requests requieren autenticación
await api.usuarios.listar(); // ✅ Incluye token automáticamente

// Para endpoints públicos, especificar requiresAuth: false
await apiClient.get('/public/programas', { 
  requiresAuth: false 
});
```

---

## 📊 Manejo de Respuestas

### Respuesta Exitosa

```typescript
interface APIResponse<T> {
  exito: true;
  datos: T;
  mensaje?: string;
  timestamp: string;
}
```

### Respuesta con Error

```typescript
interface APIError {
  exito: false;
  error: {
    codigo: string;           // 'VALIDACION_ERROR', 'NO_AUTORIZADO', etc.
    mensaje: string;
    detalles?: Record<string, string[]>; // Errores por campo
    timestamp: string;
  };
}
```

### Respuesta Paginada

```typescript
interface PaginatedResponse<T> {
  exito: true;
  datos: T[];
  paginacion: {
    pagina: number;
    porPagina: number;
    total: number;
    totalPaginas: number;
    hayAnterior: boolean;
    haySiguiente: boolean;
  };
}
```

---

## 🛠️ Manejo de Errores

```typescript
import { APIClientError } from '@/services/api';

try {
  await api.usuarios.crear(datosInvalidos);
} catch (error) {
  if (error instanceof APIClientError) {
    // Error de API
    console.log('Código:', error.errorCode);
    console.log('Mensaje:', error.message);
    console.log('Status:', error.statusCode);
    
    // Errores de validación por campo
    if (error.details) {
      console.log('Errores de validación:', error.details);
      // { email: ['Email inválido'], password: ['Muy corta'] }
    }
    
    // Mostrar error al usuario
    toast.error(error.message);
  } else {
    // Error inesperado
    console.error('Error inesperado:', error);
    toast.error('Ocurrió un error inesperado');
  }
}
```

---

## 📤 Upload de Archivos

```typescript
// Ejemplo: Importar usuarios desde Excel
const archivo = event.target.files[0];

try {
  const resultado = await api.usuarios.importar(archivo);
  
  console.log('Procesados:', resultado.totalProcesados);
  console.log('Exitosos:', resultado.exitosos);
  console.log('Errores:', resultado.errores);
} catch (error) {
  console.error('Error en importación:', error);
}

// Ejemplo: Actualizar foto de perfil
const foto = event.target.files[0];

try {
  await api.portal.perfil.actualizar({
    fotoPerfil: foto,
    headline: 'Mi nuevo headline'
  });
} catch (error) {
  console.error('Error al actualizar perfil:', error);
}

// Ejemplo: Aplicar a convocatoria
try {
  const resultado = await api.publico.convocatorias.aplicar(convocatoriaId, {
    // ... datos básicos
    hojaVida: archivoHV,
    diplomas: [diploma1, diploma2],
    certificados: [cert1, cert2, cert3]
  });
  
  console.log('Folio:', resultado.folio);
} catch (error) {
  console.error('Error al aplicar:', error);
}
```

---

## 🔄 Refresh Token Automático

El cliente maneja automáticamente el refresh de tokens:

```typescript
// 1. Request inicial falla con 401
// 2. Cliente detecta 401
// 3. Intenta refresh automáticamente
// 4. Si refresh exitoso, reintenta request original
// 5. Si refresh falla, redirige al login

// Todo esto ocurre transparentemente
const usuarios = await api.usuarios.listar();
// ✅ Si el token expiró, se renueva automáticamente
```

---

## 📝 Servicios Disponibles

### 🔐 Auth Service

```typescript
api.auth.login(data)
api.auth.logout()
api.auth.refreshToken()
api.auth.isAuthenticated()
api.auth.getCurrentUser()
api.auth.recuperarPasswordSolicitar(data)
api.auth.recuperarPasswordVerificar(data)
api.auth.recuperarPasswordCambiar(data)
api.auth.verificarEmail(email, codigo)
```

### 👥 Usuarios Service (Backoffice)

```typescript
api.usuarios.listar(params)
api.usuarios.obtenerPorId(id)
api.usuarios.crear(data)
api.usuarios.actualizar(id, data)
api.usuarios.eliminar(id)
api.usuarios.cambiarEstado(id, estado, motivo)
api.usuarios.asignarRol(usuarioId, data)
api.usuarios.removerRol(usuarioId, rolId)
api.usuarios.exportar(formato, filtros)
api.usuarios.importar(archivo)
api.usuarios.metricasPorSede(territorialId)
```

### 📊 Dashboard Service

```typescript
api.dashboard.metricasPrincipales(params)
api.dashboard.crecimientoUsuarios(params)
api.dashboard.distribucionRoles(params)
api.dashboard.usuariosPorSede(params)
api.dashboard.actividadReciente(params)
api.dashboard.alertas()
api.dashboard.mapaCobertura()
```

### 🏫 Estructura Service

```typescript
// Territoriales
api.estructura.territoriales.listar(params)
api.estructura.territoriales.obtenerPorId(id)
api.estructura.territoriales.crear(data)
api.estructura.territoriales.actualizar(id, data)
api.estructura.territoriales.eliminar(id)

// Sedes
api.estructura.sedes.listar(params)
api.estructura.sedes.obtenerPorId(id)
api.estructura.sedes.crear(data)
api.estructura.sedes.actualizar(id, data)
api.estructura.sedes.eliminar(id)
api.estructura.sedes.obtenerProgramas(sedeId)
api.estructura.sedes.asignarPrograma(sedeId, programaId)
api.estructura.sedes.removerPrograma(sedeId, programaId)

// Árbol organizacional
api.estructura.obtenerArbol()
api.estructura.mapaCobertura()
```

### 📜 Certificados Service

```typescript
// Graduados
api.certificados.graduados.listar(params)
api.certificados.graduados.obtenerPorId(id)
api.certificados.graduados.crear(data)
api.certificados.graduados.actualizar(id, data)
api.certificados.graduados.revocar(id, motivo)
api.certificados.graduados.obtenerValidaciones(id)

// Laborales
api.certificados.laborales.listar(params)
api.certificados.laborales.obtenerPorId(id)
api.certificados.laborales.aprobar(id)
api.certificados.laborales.rechazar(id, motivo)
api.certificados.laborales.generarPDF(id)

// Validación pública
api.certificados.validacion.validarQR(data)
api.certificados.validacion.validarCodigo(data)
api.certificados.validacion.estadisticas()
```

### 📱 Portal Service

```typescript
// Feed
api.portal.feed.obtener(params)
api.portal.feed.crearPublicacion(data)
api.portal.feed.editarPublicacion(id, data)
api.portal.feed.eliminarPublicacion(id)
api.portal.feed.toggleLike(publicacionId)
api.portal.feed.comentar(publicacionId, data)
api.portal.feed.compartir(publicacionId)
api.portal.feed.guardar(publicacionId)
api.portal.feed.reportar(publicacionId, data)

// Perfil
api.portal.perfil.obtener(usuarioId)
api.portal.perfil.miPerfil()
api.portal.perfil.actualizar(data)
api.portal.perfil.publicaciones(usuarioId, params)
api.portal.perfil.conexiones(usuarioId)

// Conexiones
api.portal.conexiones.mis()
api.portal.conexiones.solicitudes()
api.portal.conexiones.enviarSolicitud(destinatarioId, mensaje)
api.portal.conexiones.aceptar(solicitudId)
api.portal.conexiones.rechazar(solicitudId)
api.portal.conexiones.remover(conexionId)
api.portal.conexiones.sugerencias(params)

// Mensajería
api.portal.mensajeria.conversaciones()
api.portal.mensajeria.mensajes(conversacionId, params)
api.portal.mensajeria.enviar(data)
api.portal.mensajeria.editar(mensajeId, contenido)
api.portal.mensajeria.eliminar(mensajeId)
api.portal.mensajeria.marcarLeido(mensajeId)

// Notificaciones
api.portal.notificaciones.listar(params)
api.portal.notificaciones.marcarLeida(id)
api.portal.notificaciones.marcarTodasLeidas()
api.portal.notificaciones.eliminar(id)

// Búsqueda
api.portal.buscar.global(params)
api.portal.buscar.sugerencias()
```

### 🌐 Público Service (Sin autenticación)

```typescript
// Programas y sedes
api.publico.programas.listar(params)
api.publico.sedes.listar(params)

// Vinculaciones
api.publico.vinculaciones.crear(data)
api.publico.vinculaciones.consultar(folio)

// Enrolamiento QR
api.publico.enrolamiento.validarQR(qrToken)
api.publico.enrolamiento.enviarCodigo(qrToken, email)
api.publico.enrolamiento.verificarCodigo(qrToken, email, codigo)
api.publico.enrolamiento.completar(data)

// Certificados laborales
api.publico.certificadosLaborales.validarEmail(email)
api.publico.certificadosLaborales.verificarCodigo(email, codigo)
api.publico.certificadosLaborales.solicitar(data)
api.publico.certificadosLaborales.consultar(codigo)

// Convocatorias
api.publico.convocatorias.listar(params)
api.publico.convocatorias.obtenerPorId(id)
api.publico.convocatorias.aplicar(convocatoriaId, data)
api.publico.convocatorias.consultarAplicacion(folio)

// Contacto
api.publico.contacto.enviar(data)
```

---

## 🎯 Ejemplos de Uso Completos

### Ejemplo 1: Login y Dashboard

```typescript
import { api } from '@/services/api';

async function loginAndDashboard() {
  try {
    // 1. Login
    const loginResponse = await api.auth.login({
      email: 'admin@esap.edu.co',
      password: 'password123'
    });
    
    console.log('Bienvenido:', loginResponse.usuario.nombre);
    
    // 2. Obtener métricas del dashboard
    const metricas = await api.dashboard.metricasPrincipales({
      fechaInicio: '2024-01-01',
      fechaFin: '2024-12-31'
    });
    
    console.log('Total usuarios:', metricas.totalUsuarios.valor);
    console.log('Usuarios activos:', metricas.usuariosActivos.valor);
    
    // 3. Obtener gráfico de crecimiento
    const crecimiento = await api.dashboard.crecimientoUsuarios({
      periodo: 'mes'
    });
    
    console.log('Datos del gráfico:', crecimiento);
    
  } catch (error) {
    console.error('Error:', error);
  }
}
```

### Ejemplo 2: CRUD de Usuarios

```typescript
import { api } from '@/services/api';

async function gestionarUsuarios() {
  try {
    // 1. Listar usuarios
    const usuarios = await api.usuarios.listar({
      page: 1,
      limit: 25,
      estado: 'Activo',
      rol: 'estudiante'
    });
    
    console.log('Usuarios:', usuarios.datos);
    console.log('Total:', usuarios.paginacion.total);
    
    // 2. Crear usuario
    const nuevoUsuario = await api.usuarios.crear({
      tipoDocumento: 'CC',
      numeroDocumento: '1234567890',
      primerNombre: 'Juan',
      primerApellido: 'Pérez',
      email: 'juan.perez@gmail.com',
      telefonoMovil: '3001234567',
      ciudad: 'Bogotá',
      departamento: 'Cundinamarca',
      roles: [{
        rol: 'estudiante',
        sedeId: 'uuid-sede',
        programaId: 'uuid-programa',
        fechaInicio: '2024-01-15'
      }],
      estado: 'Activo',
      enviarEmailBienvenida: true
    });
    
    console.log('Usuario creado:', nuevoUsuario);
    
    // 3. Cambiar estado
    await api.usuarios.cambiarEstado(
      nuevoUsuario.usuario.id,
      'Suspendido',
      'Motivo de suspensión'
    );
    
  } catch (error) {
    console.error('Error:', error);
  }
}
```

### Ejemplo 3: Portal Social

```typescript
import { api } from '@/services/api';

async function usarPortal() {
  try {
    // 1. Obtener feed
    const feed = await api.portal.feed.obtener({
      limit: 20,
      tipo: 'todos'
    });
    
    console.log('Publicaciones:', feed.publicaciones);
    
    // 2. Crear publicación
    const publicacion = await api.portal.feed.crearPublicacion({
      tipo: 'post',
      contenido: '¡Hola comunidad ESAP! 👋',
      visibilidad: 'publico'
    });
    
    // 3. Like a la publicación
    await api.portal.feed.toggleLike(publicacion.id);
    
    // 4. Comentar
    await api.portal.feed.comentar(publicacion.id, {
      contenido: '¡Excelente post!'
    });
    
    // 5. Obtener mi perfil
    const perfil = await api.portal.perfil.miPerfil();
    console.log('Mi perfil:', perfil);
    
    // 6. Enviar solicitud de conexión
    await api.portal.conexiones.enviarSolicitud(
      'uuid-otro-usuario',
      'Hola, me gustaría conectar contigo'
    );
    
  } catch (error) {
    console.error('Error:', error);
  }
}
```

---

## ✅ Checklist de Integración

- [ ] Copiar `.env.example` a `.env`
- [ ] Configurar `VITE_API_URL` con URL del backend
- [ ] Backend implementa endpoints según `/docs/API_REQUIREMENTS.md`
- [ ] Backend retorna formato de respuestas correcto (APIResponse)
- [ ] Backend maneja autenticación JWT
- [ ] Backend implementa refresh token
- [ ] Probar login y obtener tokens
- [ ] Probar endpoints protegidos
- [ ] Probar refresh automático de tokens
- [ ] Probar manejo de errores
- [ ] Probar upload de archivos
- [ ] Configurar variables de servicios externos (reCAPTCHA, etc.)

---

## 📚 Documentación Adicional

- **Esquemas de BD**: `/docs/DATABASE_SCHEMA.md`
- **Endpoints API**: `/docs/API_REQUIREMENTS.md`
- **Módulos Backoffice**: `/docs/BACKOFFICE_MODULES.md`
- **Portal Transaccional**: `/docs/PORTAL_TRANSACCIONAL_MODULES.md`
- **Landing Page**: `/docs/LANDING_PAGE_FEATURES.md`

---

**Estado**: ✅ Listo para integración con backend  
**Última actualización**: Diciembre 2025

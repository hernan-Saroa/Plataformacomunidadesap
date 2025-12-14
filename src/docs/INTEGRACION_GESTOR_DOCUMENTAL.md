# 📁 Integración con Gestor Documental - Carpeta Digital ESAP

## 🎯 Visión General

El sistema de Carpeta Digital está diseñado para integrarse con un **gestor documental externo** que almacena y gestiona todos los documentos de los usuarios de ESAP.

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                   FRONTEND (React/TypeScript)               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────┐       │
│  │   DigitalFolderSection.tsx                      │       │
│  │   - UI de carpeta digital                        │       │
│  │   - Visualización de documentos                  │       │
│  │   - Subir/Descargar/Eliminar                    │       │
│  └────────────────────┬────────────────────────────┘       │
│                       │                                      │
│                       ▼                                      │
│  ┌─────────────────────────────────────────────────┐       │
│  │   documentManagerService.ts                      │       │
│  │   - Capa de abstracción                          │       │
│  │   - Gestión de API calls                         │       │
│  │   - Transformación de datos                      │       │
│  └────────────────────┬────────────────────────────┘       │
│                       │                                      │
└───────────────────────┼──────────────────────────────────────┘
                        │ HTTP/REST
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              GESTOR DOCUMENTAL EXTERNO                      │
│                                                             │
│  Opciones compatibles:                                      │
│  - Alfresco                                                  │
│  - Microsoft SharePoint                                      │
│  - Nextcloud                                                 │
│  - OpenKM                                                    │
│  - Custom REST API                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📂 Estructura de Carpetas

El gestor documental organiza los documentos con la siguiente jerarquía:

```
/ESAP/Carpetas_Digitales/
  ├── {userId_1}/
  │   ├── Documentos_Identificacion/
  │   │   ├── Cedula_Colombia.pdf
  │   │   └── Pasaporte.pdf
  │   ├── Referencias/
  │   │   └── Referencia_Laboral.pdf
  │   ├── Certificados_Buena_Conducta/
  │   ├── Antecedentes/
  │   │   └── Antecedentes_Judiciales.pdf
  │   ├── Diplomas_Grado/
  │   │   └── Diploma_Administracion_Publica.pdf
  │   ├── Actas_Grado/
  │   ├── Tarjetas_Profesionales/
  │   ├── Certificados_Academicos/
  │   └── Otros_Academicos/
  │
  ├── {userId_2}/
  │   └── ...
  │
  └── {userId_N}/
      └── ...
```

---

## 🔌 API del Gestor Documental

### Endpoints Requeridos

#### 1. **Obtener Documentos de un Usuario**

```http
GET /api/v1/documents/user/{userId}
```

**Query Parameters:**
- `category` (opcional): Filtrar por categoría
- `search` (opcional): Búsqueda por nombre

**Response:**
```json
{
  "success": true,
  "documents": [
    {
      "id": "doc_123",
      "documentManagerId": "alfresco_abc123",
      "name": "Cedula_Colombia.pdf",
      "category": "identificacion",
      "type": "pdf",
      "size": 245000,
      "mimeType": "application/pdf",
      "uploadedBy": "Sistema",
      "uploadedAt": "2024-11-15T10:30:00Z",
      "version": "1.0",
      "url": "https://gestor.esap.edu.co/download/abc123",
      "checksum": "sha256:..."
    }
  ],
  "total": 15
}
```

#### 2. **Subir Documento**

```http
POST /api/v1/documents/upload
```

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file`: Binary del archivo
- `userId`: ID del usuario
- `category`: Categoría del documento
- `folderPath`: Ruta de la carpeta
- `metadata`: JSON con metadatos adicionales

**Response:**
```json
{
  "success": true,
  "documentManagerId": "alfresco_xyz789",
  "id": "doc_456",
  "version": "1.0",
  "downloadUrl": "https://gestor.esap.edu.co/download/xyz789"
}
```

#### 3. **Eliminar Documento**

```http
DELETE /api/v1/documents/{documentManagerId}
```

**Body:**
```json
{
  "userId": "user_123",
  "documentId": "doc_456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Documento eliminado correctamente"
}
```

#### 4. **Descargar Documento**

```http
GET /api/v1/documents/{documentManagerId}/download
```

**Response:**
- Opción 1: Redirección a URL temporal
- Opción 2: Stream binario del archivo

#### 5. **Preview de Documento**

```http
GET /api/v1/documents/{documentManagerId}/preview
```

**Response:**
```json
{
  "success": true,
  "previewUrl": "https://gestor.esap.edu.co/preview/xyz789?token=..."
}
```

---

## 🔧 Configuración

### 1. Variables de Entorno

Crear archivo `.env.local`:

```env
# URL base del gestor documental
NEXT_PUBLIC_DOCUMENT_MANAGER_URL=https://api.gestor-documental.esap.edu.co

# Autenticación
DOCUMENT_MANAGER_API_KEY=your_api_key_here

# Opcional: Configuración adicional
DOCUMENT_MANAGER_TIMEOUT=30000
DOCUMENT_MANAGER_MAX_FILE_SIZE=5242880
```

### 2. Activar Integración Real

En `/services/documentManagerService.ts`:

1. **Descomentar código de producción** en cada método
2. **Comentar o eliminar** los bloques MOCK
3. **Ajustar endpoints** según tu gestor documental
4. **Configurar autenticación** en el método `getHeaders()`

**Ejemplo:**

```typescript
// ANTES (MOCK):
const mockDocuments = [...];
return { success: true, documents: mockDocuments };

// DESPUÉS (PRODUCCIÓN):
const response = await fetch(`${this.baseUrl}/api/v1/documents/user/${userId}`, {
  headers: this.getHeaders(),
});
const data = await response.json();
return { success: true, documents: data.documents };
```

---

## 🔐 Autenticación

### Opciones Soportadas

#### 1. **API Key** (Recomendado para desarrollo)

```typescript
private getHeaders(): HeadersInit {
  return {
    'Authorization': `Bearer ${this.apiKey}`,
    'X-API-Key': this.apiKey,
    'Content-Type': 'application/json',
  };
}
```

#### 2. **OAuth 2.0** (Recomendado para producción)

```typescript
private async getHeaders(): Promise<HeadersInit> {
  const token = await this.getOAuthToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}
```

#### 3. **JWT**

```typescript
private getHeaders(): HeadersInit {
  const jwt = localStorage.getItem('jwt_token');
  return {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json',
  };
}
```

---

## 📝 Categorías de Documentos

```typescript
// Documentos Personales
- 'identificacion': Documentos de Identificación
- 'referencias': Referencias
- 'buena-conducta': Certificados de Buena Conducta
- 'antecedentes': Antecedentes

// Documentos Académicos
- 'grado': Diplomas de Grado
- 'acta': Actas de Grado
- 'tarjeta-profesional': Tarjetas Profesionales
- 'certificados-academicos': Certificados Académicos
- 'otros-academicos': Otros Documentos Académicos
```

---

## ✅ Validaciones

### Tipos de Archivo Permitidos

```typescript
const allowedMimeTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
```

### Tamaño Máximo

```typescript
const maxFileSize = 5 * 1024 * 1024; // 5MB
```

---

## 🧪 Testing

### 1. Datos Mock (Actualmente activo)

Los datos mock están configurados y funcionan sin necesidad de gestor documental:

```typescript
// En documentManagerService.ts
const mockDocuments: Document[] = [
  // Documentos de prueba
];
```

### 2. Testing con Gestor Real

Checklist de pruebas:

- [ ] **Obtener documentos**: Verificar que se cargan correctamente
- [ ] **Subir documento**: Validar upload exitoso
- [ ] **Descargar documento**: Verificar descarga funcional
- [ ] **Eliminar documento**: Confirmar eliminación
- [ ] **Búsqueda**: Filtrar por nombre
- [ ] **Filtros**: Por categoría
- [ ] **Permisos**: Verificar restricciones
- [ ] **Errores**: Manejo de errores del gestor
- [ ] **Performance**: Tiempos de respuesta aceptables
- [ ] **Seguridad**: Validar autenticación

---

## 🚨 Manejo de Errores

### Estrategia Implementada

```typescript
try {
  const response = await documentManagerService.getDocuments({ userId });
  
  if (response.success) {
    setDocuments(response.documents);
  } else {
    toast.error('Error al cargar documentos', {
      description: response.error
    });
  }
} catch (error) {
  console.error('Error crítico:', error);
  toast.error('Error de conexión con el gestor documental');
}
```

### Códigos de Error Comunes

| Código | Significado | Acción |
|--------|-------------|--------|
| 401 | No autenticado | Renovar token |
| 403 | Sin permisos | Mostrar mensaje |
| 404 | Documento no encontrado | Refrescar lista |
| 413 | Archivo muy grande | Validar tamaño |
| 500 | Error del servidor | Retry automático |
| 503 | Servicio no disponible | Mostrar offline |

---

## 📊 Metadatos

### Metadatos Básicos (Requeridos)

```typescript
interface DocumentMetadata {
  uploadedBy: string;
  uploadedAt: string;
  category: DocumentCategory;
  userId: string;
}
```

### Metadatos Extendidos (Opcionales)

```typescript
interface ExtendedMetadata extends DocumentMetadata {
  userName: string;
  userDocument: string;
  department: string;
  territorial: string;
  sede: string;
  program?: string;
  academicYear?: string;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  expirationDate?: string;
  tags: string[];
  notes?: string;
}
```

---

## 🔄 Control de Versiones

Si el gestor documental soporta versiones:

```typescript
interface DocumentVersion {
  version: string; // "1.0", "1.1", "2.0"
  createdAt: string;
  createdBy: string;
  changes: string;
  isPrevious: boolean;
}
```

---

## 📈 Optimizaciones

### 1. Cache Local

```typescript
// Implementar cache con React Query o SWR
const { data, isLoading } = useQuery(
  ['documents', userId],
  () => documentManagerService.getDocuments({ userId }),
  {
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 10 * 60 * 1000, // 10 minutos
  }
);
```

### 2. Paginación

```typescript
const response = await documentManagerService.getDocuments({
  userId,
  page: 1,
  limit: 20,
});
```

### 3. Lazy Loading

Cargar documentos solo cuando se abre la pestaña:

```typescript
<TabsContent value="documents">
  <DigitalFolderSection user={user} />
</TabsContent>
```

---

## 🔒 Seguridad

### Checklist de Seguridad

- [ ] **HTTPS**: Todas las comunicaciones cifradas
- [ ] **Autenticación**: Tokens con expiración
- [ ] **Autorización**: Verificar permisos en backend
- [ ] **Validación**: Tipos de archivo y tamaño
- [ ] **Sanitización**: Nombres de archivo seguros
- [ ] **Auditoría**: Log de todas las operaciones
- [ ] **Encriptación**: Documentos sensibles encriptados
- [ ] **Backup**: Respaldo automático de documentos

---

## 🎯 Roadmap de Implementación

### Fase 1: Desarrollo (Actual)
- ✅ Interfaz de usuario completada
- ✅ Servicio con datos mock
- ✅ Validaciones del lado del cliente

### Fase 2: Integración (Próxima)
- [ ] Conectar con gestor documental real
- [ ] Configurar autenticación
- [ ] Testing de integración
- [ ] Manejo de errores avanzado

### Fase 3: Optimización
- [ ] Implementar cache
- [ ] Paginación y lazy loading
- [ ] Compresión de imágenes
- [ ] Preview de documentos

### Fase 4: Mejoras
- [ ] Control de versiones
- [ ] Firma digital
- [ ] Watermarks
- [ ] OCR para PDFs escaneados

---

## 📞 Soporte

Para dudas sobre la integración:

1. **Revisar logs** en `/services/documentManagerService.ts`
2. **Verificar configuración** en `.env.local`
3. **Consultar documentación** del gestor documental
4. **Testing** con herramientas como Postman

---

## 📚 Referencias

- [Alfresco REST API](https://docs.alfresco.com/content-services/latest/develop/rest-api-guide/)
- [SharePoint REST API](https://learn.microsoft.com/en-us/sharepoint/dev/sp-add-ins/get-to-know-the-sharepoint-rest-service)
- [Nextcloud API](https://docs.nextcloud.com/server/latest/developer_manual/client_apis/WebDAV/index.html)
- [OpenKM API](https://docs.openkm.com/kcenter/view/okm-6.3/webservices-guide.html)

---

## ✨ Conclusión

El sistema está **completamente preparado** para integrarse con cualquier gestor documental que implemente una API REST estándar. Solo es necesario:

1. Configurar las variables de entorno
2. Descomentar el código de producción
3. Ajustar los endpoints según tu gestor
4. Realizar pruebas de integración

**El cambio de MOCK a PRODUCCIÓN es transparente para el usuario final.** 🎉

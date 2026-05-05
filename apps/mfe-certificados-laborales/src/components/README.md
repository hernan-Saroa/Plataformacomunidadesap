# 📄 Módulo de Certificados Laborales ESAP

Sistema completo de gestión, generación y validación de certificados laborales para empleados y docentes de la ESAP con QR único, firma electrónica y trazabilidad completa.

---

## 🎯 Características Principales

### 1. **Sistema de QR Único Reutilizable**
- Cada combinación única (empleado + datos + entidad) genera **UN certificado con QR único**
- Si la misma combinación vuelve a solicitar → se **reutiliza el QR existente** (no se genera nuevo)
- Trazabilidad completa de solicitudes y escaneos QR
- Registro de cada validación en el sistema de auditoría

### 2. **Dashboard de Gestión**
Interfaz completa idéntica al módulo de Certificados de Verificación de Graduados:
- **4 KPI Cards**: Certificados Únicos, Solicitudes Activas, Escaneós QR, QR Revalidados
- **Tabla de solicitudes** con columnas:
  - EMPLEADO (avatar + nombre + cargo)
  - SOLICITADO POR (badge + tipo de solicitud)
  - QR ÚNICO / ESCANEÓS (número de escaneós + veces solicitado)
  - N° CERTIFICADO (código + fecha)
  - ESTADO / VALIDACIÓN (badge + mensaje)
  - ACCIONES (ver detalle + menú dropdown)
- **Filtros avanzados**: por estado, tipo de solicitud, búsqueda
- **Banner explicativo** de la lógica de QR único

### 3. **Sistema de Plantillas Homogéneas**
Módulo completo de gestión de plantillas que asegura la homogeneidad de todos los certificados:

#### **Tab 1: Configuración**
- **Datos del Firmante**:
  - Nombre completo
  - Número de documento
  - Cargo
- **Grafo/Firma**:
  - Upload de imagen (PNG, JPG, max 2MB)
  - Vista previa en tiempo real
  - Validación de formato y tamaño
- **Tipografía y Color**:
  - Selector de fuentes (Arial, Times New Roman, Georgia, etc.)
  - Tamaño de fuente (8-16 pt)
  - Color picker + código hexadecimal
  - Vista previa en vivo del texto

#### **Tab 2: Vista Previa**
- Certificado completo renderizado con todos los cambios aplicados
- Botón "Descargar Ejemplo" (PDF)

#### **Tab 3: Historial**
- Log de auditoría completo de todos los cambios
- Fecha, hora, usuario, acción, cambios detallados
- Versionamiento (versión anterior → versión nueva)

#### **Flujo de Autorización**
1. Admin modifica plantilla (firmante, firma, tipografía, color)
2. Ve cambios en tiempo real
3. Guarda borrador (opcional)
4. Ve vista previa completa del certificado
5. Solicita autorización
6. Sistema muestra resumen de cambios + advertencias
7. Autoriza y publica
8. Nueva versión se aplica a todos los certificados futuros
9. Cambio queda registrado en el log de auditoría

#### **Sistema de Estados**
- **Borrador**: Cambios sin publicar
- **En Revisión**: Esperando autorización
- **Publicada**: Plantilla activa
- **Archivada**: Versión histórica

#### **Versionamiento Automático**
- Incrementa versión automáticamente (ej: 2.1.0 → 2.1.1)
- Mantiene historial completo de todas las versiones

### 4. **Portal Público de Validación**
Landing page moderna y responsive para validación pública:

#### **Hero Section**
- Diseño profesional con gradientes ESAP
- Título y descripción del servicio
- Ícono de Shield para transmitir seguridad

#### **Métodos de Validación**
1. **Escanear QR**:
   - Activación de cámara
   - Scanner visual con animación
   - Detección automática del código
   
2. **Ingresar Código**:
   - Input para número de certificado
   - Validación en tiempo real
   - Sugerencias de formato

#### **Resultado de Validación**
- **Estado del Certificado**: Badge grande con ícono (Activo/Revocado/Expirado)
- **Información del Empleado**:
  - Nombre completo
  - Documento de identidad
  - Cargo
  - Tipo de vinculación
  - Dependencia
  - Fecha de vinculación
  - Grado académico
- **Información del Certificado**:
  - Número de certificado
  - Fecha de emisión
  - Generado por
  - Hash de verificación
- **Acciones**:
  - Validar otro certificado
  - Descargar certificado

#### **Información de Contacto**
- Teléfono: (601) 444 0555
- Email: talentohumano@esap.edu.co
- Sitio web: www.esap.edu.co

### 5. **Funcionalidades Avanzadas**
Cards de acceso rápido a:
- **Validar Certificado**: Portal público de validación QR
- **Analíticas**: Dashboard de métricas y gráficas
- **Histórico**: Registro completo de validaciones
- **Reportes**: Generador de reportes PDF y CSV
- **Configuración de Plantilla**: Gestión de plantilla base

---

## 📊 Tipos de Solicitud

### 1. **Autoservicio**
- Solicitado desde el Portal Transaccional por el empleado
- Badge: Azul "Autoservicio"
- Proceso 100% digital

### 2. **Manual**
- Generado manualmente por administrativo de Talento Humano
- Badge: Morado "Manual"
- Para solicitudes de entidades externas

### 3. **Carga Masiva**
- Generación masiva desde CSV/Excel
- Badge: Naranja "Carga Masiva"
- Para procesos institucionales

---

## 👥 Personal Aplicable

### **Personal Administrativo**
- Directores y Coordinadores
- Profesionales Especializados
- Asistentes Administrativos
- Personal de Planta y Contrato

### **Profesores / Docentes**
- Docentes Tiempo Completo
- Docentes Hora Cátedra
- Docentes Ocasionales
- Todos los grados escalafón

> ⚠️ **Nota**: Este módulo NO genera certificados para estudiantes, egresados o graduados. Para esos casos, utilizar el módulo correspondiente en el sistema académico.

---

## 🔐 Estados del Certificado

### **Activo** ✅
- QR válido para escaneo público
- Certificado auténtico y verificable
- Color: Verde

### **Revocado** ❌
- QR deshabilitado
- Certificado anulado por la institución
- Color: Rojo

### **Expirado** ⏰
- QR caducado
- Certificado fuera de vigencia
- Color: Gris

---

## 📱 Integración con Landing Page

### **Sección de Servicios**
Card agregado al landing page con:
- **Ícono**: Briefcase (maletín)
- **Título**: Certificados Laborales
- **Descripción**: "Genera y valida certificados laborales de empleados ESAP. Sistema automatizado con QR único, firma electrónica y trazabilidad completa."
- **Gradiente**: Sky-600 to Blue-700
- **Badge**: "Automatizado"
- **Acción**: Navega a `/certificados-laborales`

---

## 🎨 Diseño y UX

### **Principios de Diseño**
- Idéntico al módulo de Certificados de Verificación de Graduados
- Colores de marca ESAP (#003DA5)
- Diseño completamente responsive
- Microinteracciones suaves con Framer Motion
- Tipografía clara y accesible

### **Componentes UI**
- Cards con hover effects
- Badges de estado con íconos
- Tablas con paginación premium
- Modales con animaciones
- Tooltips informativos
- Dropdowns de acciones

---

## 🔄 Flujo de Trabajo

### **Generación de Certificado**
```
1. Solicitud ingresa al sistema (autoservicio/manual/masivo)
2. Sistema verifica si YA existe esa combinación (empleado + datos + entidad)
3a. Si NO existe: genera certificado + QR nuevo
3b. Si YA existe: reutiliza el QR existente (no genera nuevo)
4. Certificado queda disponible para descarga y validación
5. Se registra en el historial de solicitudes
```

### **Validación de Certificado**
```
1. Usuario accede al portal público
2. Escanea QR o ingresa código
3. Sistema valida autenticidad y estado
4. Muestra información completa del empleado y certificado
5. Registra la validación en el sistema de auditoría
6. Usuario puede descargar el certificado
```

### **Modificación de Plantilla**
```
1. Admin accede a Configuración de Plantilla
2. Modifica firmante, firma, tipografía o color
3. Ve cambios en tiempo real en vista previa
4. Guarda borrador (opcional)
5. Solicita autorización para publicar
6. Sistema muestra resumen de cambios + advertencias
7. Autoriza y publica
8. Nueva plantilla se aplica a certificados futuros
9. Cambio queda en log de auditoría con versión nueva
```

---

## 📦 Componentes del Módulo

### **Principales**
- `CertificadosLaboralesRouter.tsx` - Router principal con navegación
- `CertificadosLaboralesDashboard.tsx` - Dashboard principal con tabla
- `ValidarCertificadoPublico.tsx` - Portal público de validación
- `ValidarCertificadoQR.tsx` - Validador interno con scanner
- `ConfiguracionPlantilla.tsx` - Gestión de plantillas
- `GenerarCertificadoModal.tsx` - Modal para generar certificados
- `CertificadoDetalleModal.tsx` - Modal de detalle completo
- `SolicitarCertificadoForm.tsx` - Formulario de solicitud

### **Utilidades**
- `QRScannerModal.tsx` - Scanner de códigos QR
- `PDFViewerModal.tsx` - Visor de PDFs embebido
- `AnalyticsDashboard.tsx` - Dashboard de analíticas
- `HistoricoValidaciones.tsx` - Registro de validaciones
- `GeneradorReportes.tsx` - Generador de reportes
- `NotificacionesValidacion.tsx` - Sistema de notificaciones
- `APIDocumentacion.tsx` - Documentación de API REST

---

## 🚀 Tecnologías Utilizadas

- **React** + **TypeScript**
- **Tailwind CSS** v4.0
- **Framer Motion** para animaciones
- **Lucide React** para iconografía
- **Sonner** para notificaciones toast
- **Shadcn/ui** componentes base

---

## 📝 Campos del Certificado

### **Datos del Empleado**
- Nombre completo
- Número de identificación
- Cargo actual
- Tipo de vinculación (Docente TC, Coordinador GIT, etc.)
- Fecha de vinculación
- Grado académico
- Salario mensual
- Dependencia

### **Datos del Certificado**
- Número de certificado (ESAP-CERT-2025-XXXXX)
- Fecha de solicitud
- Fecha de generación
- Generado por (usuario/sistema)
- QR único
- Hash de verificación
- Estado actual
- Firma del funcionario autorizado

---

## 🔍 Sistema de Auditoría

### **Trazabilidad de Solicitudes**
- Primera solicitud (fecha + usuario)
- Última solicitud (fecha + usuario)
- Cantidad total de solicitudes
- Historial completo de solicitudes con IP

### **Trazabilidad de Validaciones**
- Fecha y hora de cada escaneo
- Dirección IP del validador
- Ubicación geográfica
- User agent (dispositivo/navegador)
- Estado de verificación (exitosa/fallida)

### **Log de Cambios de Plantilla**
- Fecha y hora del cambio
- Usuario que realizó la modificación
- Acción realizada (actualización, cambio de firmante, etc.)
- Lista detallada de cambios
- Versión anterior y nueva
- Estado del cambio (borrador/publicado)

---

## ✅ Checklist de Implementación

- [x] Dashboard principal con tabla de solicitudes
- [x] Sistema de QR único reutilizable
- [x] 4 KPI cards con estadísticas
- [x] Banner explicativo de lógica QR
- [x] Filtros avanzados (estado, tipo, búsqueda)
- [x] Paginación premium
- [x] Portal público de validación
- [x] Métodos de validación (QR + código)
- [x] Resultado de validación completo
- [x] Sistema de gestión de plantillas
- [x] Editor de firmante y firma
- [x] Selector de tipografía y color
- [x] Vista previa en tiempo real
- [x] Flujo de autorización
- [x] Log de auditoría completo
- [x] Versionamiento automático
- [x] Integración con landing page
- [x] Card en sección de servicios
- [x] Navegación desde landing
- [x] Funcionalidades avanzadas
- [x] Estados de certificado (activo/revocado/expirado)
- [x] Dropdown de acciones (descargar, ver QR, reenviar, revocar)

---

## 📞 Soporte

Para más información sobre el módulo de Certificados Laborales:
- **Email**: talentohumano@esap.edu.co
- **Teléfono**: (601) 444 0555
- **Sitio web**: www.esap.edu.co

---

**Desarrollado para la Escuela Superior de Administración Pública - ESAP**
*Módulo de Certificados Laborales con QR Único v2.1.0*

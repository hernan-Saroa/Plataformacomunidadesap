# 🏛️ CONTROL INTERNO DISCIPLINARIO v3.0 PREMIUM

## 📋 Descripción General

Sistema completo de gestión disciplinaria para la ESAP (Escuela Superior de Administración Pública), diseñado bajo estándares corporativos con diseño desktop-first optimizado para resoluciones de 1366px-1920px.

---

## 🎯 Características Principales

### ✅ 6 Módulos Operativos Completos

1. **Dashboard Operativo (Kanban)**
   - Vista Kanban con drag & drop
   - Gestión de noticias disciplinarias
   - Gestión de procesos disciplinarios
   - Filtrado por profesional
   - Estados personalizables
   - Múltiples denunciados/denunciantes

2. **Revisión y Aprobación**
   - Aprobación de borradores por Jefe OCID
   - Sistema de comentarios
   - Historial de revisiones
   - Observaciones y correcciones

3. **Expediente Electrónico**
   - Vista cronológica organizada por proceso
   - Vista por carpetas (8 tipos de documentos)
   - Hoja de control electrónica (10 campos)
   - Exportación a Excel
   - **NUEVO:** Sistema de compartir expediente (Link/QR/Email)
   - Protección con clave opcional
   - Tiempo de expiración configurable

4. **Términos y Alertas**
   - Calendario de términos procesales
   - Gestión de días festivos
   - Alertas automáticas
   - Reglas de cálculo configurables

5. **Gestión de Profesionales**
   - CRUD completo de profesionales
   - Asignación de capacidad
   - Visualización de procesos asignados
   - Filtros territoriales

6. **Configuración Premium**
   - Estados Kanban personalizables
   - Cargos y capacidades
   - Plantillas de Autos
   - Plantillas de Oficios
   - Plantillas de Actas
   - Entidades de remisión
   - Notificaciones y alertas

---

## 📁 Estructura de Archivos

```
disciplinario/
├── ControlDisciplinarioFull.tsx          # Componente principal
├── DashboardKanbanOperativo.tsx          # Dashboard Kanban
├── RevisionAprobacionJefe.tsx            # Revisión y aprobación
├── ExpedientesElectronicosWorldClass.tsx # Expediente electrónico
├── GestionTerminosAlertas.tsx            # Términos y alertas
├── GestionProfesionales.tsx              # Gestión de profesionales
├── ModuloConfiguracionPremium.tsx        # Configuración
│
├── EditorDocumentos.tsx                  # Editor de documentos
├── WizardCrearAutoWorldClass.tsx         # Wizard de autos
├── WizardOficiosWorldClass.tsx           # Wizard de oficios
├── WizardActasWorldClass.tsx             # Wizard de actas
│
├── ModalCompartirExpediente.tsx          # ✅ NUEVO: Compartir expediente
├── ModalArchivarNoticia.tsx              # Modal archivar noticia
├── ModalArchivarProceso.tsx              # Modal archivar proceso
├── ModalAsignarProfesional.tsx           # Modal asignar profesional
├── ModalAsociarNoticiaProceso.tsx        # Modal asociar noticia
├── ModalDetallesNoticia.tsx              # Modal detalles noticia
├── ModalEliminarNoticia.tsx              # Modal eliminar noticia
├── ModalRemitirCompetencia.tsx           # Modal remitir competencia
├── ModalSolicitarReasignacion.tsx        # Modal solicitar reasignación
├── ModalAprobarReasignacion.tsx          # Modal aprobar reasignación
├── ModalSubirDocumento.tsx               # Modal subir documento
├── ModalesGestionDocumental.tsx          # Modales gestión documental
├── SistemaComentarios.tsx                # Sistema de comentarios
│
├── configuracion/
│   ├── ConfiguracionEstadosKanban.tsx
│   ├── ConfiguracionCargos.tsx
│   ├── ConfiguracionPlantillasAutos.tsx
│   ├── ConfiguracionPlantillasOficios.tsx
│   ├── ConfiguracionPlantillasActas.tsx
│   ├── ConfiguracionEntidadesRemision.tsx
│   ├── ConfiguracionNotificacionesAlertas.tsx
│   └── ... (modales de configuración)
│
├── accionesPorEtapa.ts                   # Lógica de acciones
├── procesosKanbanMock.ts                 # Datos mock
├── VERIFICACION_MODULO.md                # ✅ Verificación completa
├── DiagnosticoModulo.tsx                 # ✅ Diagnóstico en tiempo real
└── README.md                             # Este archivo
```

---

## 🚀 Uso del Módulo

### Importación en BackofficeApp

```typescript
import { ControlDisciplinarioFull } from './disciplinario/ControlDisciplinarioFull';

// En el switch de módulos:
case 'control-disciplinario':
  return <ControlDisciplinarioFull />;
```

### Navegación entre secciones

El componente principal maneja la navegación interna entre 6 secciones:

```typescript
const menuItems = [
  { id: 'dashboard', label: 'Procesos' },
  { id: 'aprobacion', label: 'Revisión y Aprobación' },
  { id: 'expediente', label: 'Expediente Electrónico' },
  { id: 'terminos', label: 'Términos y Alertas' },
  { id: 'profesionales', label: 'Profesionales' },
  { id: 'config', label: 'Configuración' }
];
```

---

## 🆕 Funcionalidades Recientes

### Sistema de Compartir Expediente (NUEVO)

**Ubicación:** Expediente Electrónico → Botón "Compartir"

**Características:**
- **3 métodos de compartir:**
  1. Link directo con copia al portapapeles
  2. Código QR descargable
  3. Envío por correo electrónico

- **Seguridad:**
  - Protección con clave opcional
  - Generación automática de clave segura
  - Tiempo de expiración: 24h, 7d, 30d, o sin expiración

- **Diseño:**
  - Modal intuitivo con gradientes corporativos ESAP
  - Cards seleccionables para cada método
  - Validaciones en tiempo real
  - Feedback visual inmediato

**Implementación:**
```typescript
import { ModalCompartirExpediente } from './ModalCompartirExpediente';

<ModalCompartirExpediente
  expediente={{
    id: expediente.id,
    radicado: expediente.radicado,
    nombreDisciplinado: expediente.nombreDisciplinado,
    estado: expediente.estado
  }}
  onClose={() => setShowModal(false)}
/>
```

### Múltiples Denunciados/Denunciantes

**Ubicación:** Dashboard → Crear/Editar Noticia

**Características:**
- Agregar múltiples denunciados (mínimo 1 obligatorio)
- Agregar múltiples denunciantes (opcional)
- Validación en tiempo real
- Campo "Lugar de los Hechos" actualizado en PASO 2

---

## 🎨 Diseño y Estándares

### Colores Corporativos ESAP
- Azul Principal: `#003DA5`
- Azul Secundario: `#2962FF`
- Blanco: `#FFFFFF`
- Grises corporativos para textos y fondos

### Gradientes
```css
background: linear-gradient(135deg, #003DA5 0%, #2962FF 100%);
background: linear-gradient(135deg, #2962FF 0%, #003DA5 100%);
```

### Tipografía
- Font-size base: 13-14px (compacto desktop-first)
- Títulos: font-bold
- Padding reducido: 33-50% vs estándar

### Scroll
- Garantizado en TODOS los módulos
- `overflow-auto` en contenedores principales
- `max-h-[90vh]` en modales

---

## 🔧 Dependencias

### Core
- React 18+
- TypeScript
- Tailwind CSS v4

### UI Components
- lucide-react (iconos)
- motion/react (animaciones)
- sonner (notificaciones toast)

### Utilidades
- jsPDF (exportación PDF)
- xlsx (exportación Excel)

### Componentes Compartidos
- ModuleLayout (layout común)
- CreateNoticiaModal (formulario de noticias)
- Button, Card, Badge, Avatar (UI components)

---

## 📊 Datos y Estado

### Datos Mock
Los datos de ejemplo se encuentran en:
- `procesosKanbanMock.ts` - Procesos y noticias
- Cada módulo incluye sus propios datos de ejemplo

### Estado Local
- React useState para gestión de estado
- No requiere Redux/Context (por ahora)
- Callbacks para comunicación entre componentes

### Persistencia
- Actualmente usa datos en memoria
- Preparado para integración con API REST
- Estructura compatible con backend

---

## 🧪 Testing y Diagnóstico

### Verificación Manual
Ver archivo: `VERIFICACION_MODULO.md`

### Diagnóstico en Tiempo Real
```typescript
import { DiagnosticoModulo } from './DiagnosticoModulo';

// Agregar al final del componente (solo en desarrollo)
<DiagnosticoModulo />
```

### Checklist de Funcionalidades
- ✅ Crear noticia con múltiples denunciados
- ✅ Convertir noticia a proceso
- ✅ Drag & drop en Kanban
- ✅ Crear autos/oficios/actas
- ✅ Enviar a revisión
- ✅ Aprobar/Rechazar documentos
- ✅ Gestionar expediente electrónico
- ✅ Compartir expediente (Link/QR/Email)
- ✅ Exportar índice a Excel
- ✅ Gestionar términos y alertas
- ✅ Gestionar profesionales
- ✅ Configurar plantillas

---

## 🔐 Validaciones Decreto 648/2017

El módulo implementa el sistema de validación según el Decreto 648/2017:

- BadgeDecreto648 en formularios
- Validaciones de campos obligatorios
- Estructura de datos conforme a normativa
- Exportación con formato oficial

---

## 🚀 Próximos Pasos (Roadmap)

### Fase 1: Integración Backend
- [ ] API REST para CRUD de noticias/procesos
- [ ] Autenticación y autorización
- [ ] Persistencia en base de datos
- [ ] Sistema de archivos en servidor

### Fase 2: Notificaciones
- [ ] Notificaciones push en navegador
- [ ] Envío de emails automáticos
- [ ] Recordatorios de términos
- [ ] Alertas de vencimientos

### Fase 3: Reportes Avanzados
- [ ] Dashboard de métricas
- [ ] Gráficas estadísticas
- [ ] Exportación masiva
- [ ] Reportes personalizados

### Fase 4: Optimizaciones
- [ ] React.memo para componentes pesados
- [ ] Lazy loading de módulos
- [ ] Cache de datos
- [ ] Virtualización de listas largas

---

## 📞 Soporte y Contacto

**Desarrollador:** Sistema ESAP Backoffice
**Versión:** 3.0 PREMIUM
**Última Actualización:** 10 de Febrero de 2026

---

## 📝 Changelog

### v3.0 PREMIUM (10/02/2026)
- ✅ Agregado sistema de compartir expediente (Link/QR/Email)
- ✅ Implementado protección con clave en compartir
- ✅ Agregado múltiples denunciados/denunciantes en noticias
- ✅ Actualizado campo "Dependencia" → "Lugar de los Hechos"
- ✅ Creado diagnóstico en tiempo real
- ✅ Documentación completa del módulo
- ✅ **FASE 3 COMPLETADA**: 3 modales World Class migrados (100% cobertura - 21/21)
  - ✅ ModalArchivarProceso - Sistema de archivo con confirmación doble
  - ✅ ModalEdicionPlantilla - Editor de plantillas de Oficios/Actas
  - ✅ ModalEdicionPlantillaAuto - Editor especializado de Autos Disciplinarios
- ✅ **UPGRADE WORLD CLASS**: Términos y Alertas + Profesionales migrados
  - ✅ GestionTerminosAlertasWorldClass - Diseño corporativo actualizado
  - ✅ GestionProfesionalesWorldClass - Grid de cards con estadísticas
  - ✅ 100% de cobertura de diseño World Class en todos los módulos

### v2.0 (Anterior)
- Sistema de revisión y aprobación
- Expediente electrónico con hojas de control
- Wizards World-Class para documentos
- Configuración Premium

### v1.0 (Inicial)
- Dashboard Kanban básico
- CRUD de noticias y procesos
- Sistema de asignación de profesionales

---

## ⚖️ Licencia

© 2026 ESAP - Escuela Superior de Administración Pública
Uso exclusivo interno - Sistema Backoffice Administrativo
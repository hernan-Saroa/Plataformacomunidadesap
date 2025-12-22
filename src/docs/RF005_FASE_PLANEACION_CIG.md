# 📋 RF005 - FASE DE PLANEACIÓN DE AUDITORÍA

**Módulo:** Control Interno de Gestión (CIG)  
**Componente:** `PlaneacionAuditoriaModule.tsx`  
**Fecha de Implementación:** 21 Diciembre 2025  
**Estado:** ✅ Completado  
**Basado en:** EM-PT-004 - Auditorías Internas V3

---

## 🎯 OBJETIVO

Gestionar de manera integral la **Fase de Planeación** de auditorías internas, que es la segunda fase del proceso de auditoría después del inicio formal (RF004). Esta fase permite al equipo auditor prepararse adecuadamente antes de ejecutar la auditoría.

---

## 📊 CONTEXTO EN EL FLUJO DE AUDITORÍA

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   INICIO    │ ──>│ PLANEACIÓN  │ ──>│  EJECUCIÓN  │ ──>│ COMUNICACIÓN │ ──>│ SEGUIMIENTO │
│   (RF004)   │    │   (RF005)   │    │   (RF006)   │    │   (RF009)    │    │  (RF010-11) │
│   ✅ Hecho  │    │ ✅ ESTE RF  │    │  Por hacer  │    │  Por hacer   │    │  Por hacer  │
└─────────────┘    └─────────────┘    └─────────────┘    └──────────────┘    └─────────────┘
```

### Flujo Completo:
1. **RF004 - Inicio:** Generación de documentos oficiales (Oficio, Cartas, Programa)
2. **RF005 - Planeación (ESTE):** Estudios preliminares, solicitud de información, reunión de apertura
3. **RF006 - Ejecución:** Aplicación de listas de chequeo, identificación de hallazgos
4. **RF009 - Comunicación:** Informes preliminar y final
5. **RF010-011 - Seguimiento:** Planes de mejoramiento

---

## 🎨 CARACTERÍSTICAS PRINCIPALES

### 1️⃣ Dashboard de Progreso
- **Barra de progreso general** que muestra el avance de las 3 actividades
- **Contador de actividades completadas** (X de 3)
- **Indicador de días restantes** del cronograma de planeación
- **Validación de completitud** antes de avanzar a Ejecución

### 2️⃣ Tres Actividades Obligatorias

#### 📚 **Actividad 1: Estudios Preliminares**
Análisis previo del área auditada antes de la ejecución.

**Checklist de 6 items:**
- ✅ Revisar informes de auditorías previas del área
- ✅ Analizar normativa aplicable al proceso auditado
- ✅ Identificar riesgos potenciales del área
- ✅ Revisar matriz de riesgos institucional
- ✅ Consultar planes de mejoramiento vigentes del área
- ✅ Elaborar documento de estudios preliminares

**Color:** Morado (#8B5CF6)  
**Icono:** FileSearch

---

#### 📨 **Actividad 2: Solicitud de Información**
Requerimiento formal de documentos al área auditada.

**Checklist de 6 items:**
- ✅ Elaborar oficio de solicitud de información
- ✅ Definir lista de documentos requeridos
- ✅ Establecer plazo de entrega (mínimo 5 días hábiles)
- ✅ Enviar oficio al responsable del área auditada
- ✅ Registrar solicitud en expediente digital
- ✅ Hacer seguimiento a entrega de información

**Funcionalidad Especial:**
- Modal para elaborar la solicitud formal
- Formulario con asunto, detalle, lista de documentos
- Configuración de plazo de respuesta (mínimo 5 días)
- Envío automático de notificación al responsable del área
- Seguimiento del estado de respuesta (Pendiente/Parcial/Completa)

**Color:** Ámbar (#F59E0B)  
**Icono:** Send

---

#### 👥 **Actividad 3: Reunión de Apertura**
Kick-off oficial con el área auditada.

**Checklist de 6 items:**
- ✅ Programar fecha y hora con el área auditada
- ✅ Preparar presentación de la auditoría
- ✅ Enviar convocatoria a participantes
- ✅ Realizar reunión de apertura
- ✅ Elaborar acta de reunión de apertura
- ✅ Obtener firma del acta por responsable del área

**Funcionalidad Especial:**
- Modal para programar la reunión
- Selección de modalidad: Presencial / Virtual / Híbrida
- Configuración de fecha, hora, lugar y enlace virtual
- Agenda predeterminada de 5 puntos
- Lista de participantes (equipo auditor + responsable del área)
- Gestión de acta de reunión (Pendiente/Borrador/Aprobada)

**Color:** Verde (#10B981)  
**Icono:** Users

---

### 3️⃣ Gestión de Documentos por Actividad
- **Carga de documentos** para cada actividad
- **Visualización de archivos** cargados con metadatos:
  - Nombre del archivo
  - Tamaño
  - Fecha de carga
  - Usuario que cargó
- **Acciones:** Ver, Descargar

### 4️⃣ Sistema de Checklist Interactivo
- **Click para marcar/desmarcar** cada item
- **Progreso automático** basado en items completados
- **Fecha de completado** registrada automáticamente
- **Estados visuales:**
  - ✅ Completado: Fondo verde, texto tachado
  - ⬜ Pendiente: Fondo blanco

### 5️⃣ Validación de Avance
- **Botón "Avanzar a Ejecución"** solo se habilita cuando:
  - Las 3 actividades están al 100%
  - El progreso general es 100%
- **Modal de confirmación** antes de avanzar
- **Resumen de actividades** completadas

---

## 🔧 DURACIÓN Y CRONOGRAMA

Según EM-PT-004:

| Tipo de Auditoría | Duración de Planeación |
|------------------|------------------------|
| **Sede** | 5-10 días hábiles |
| **Territorial** | 3 días hábiles (FIJO) |

El componente muestra:
- Fecha de inicio y fin del cronograma
- Días restantes para completar la planeación
- Contador regresivo visual

---

## 💻 TECNOLOGÍAS UTILIZADAS

### Framework y Librerías
- **React 18** con Hooks (useState, useMemo)
- **TypeScript** para type safety
- **Motion (Framer Motion)** para animaciones suaves
- **Lucide React** para iconografía consistente
- **Sonner** para notificaciones toast

### Design System ESAP
- `CardSIGL` - Tarjetas consistentes
- `ButtonSIGL` - Botones con variantes
- `BadgeSIGL` - Badges de estado
- `ModalSIGL` - Modales reutilizables

### Características Técnicas
- **State management local** con useState
- **Cálculos derivados** con useMemo (optimización)
- **Animaciones** con AnimatePresence
- **Responsive design** con Tailwind CSS
- **Accesibilidad** (ARIA labels, keyboard navigation)

---

## 🎯 CASOS DE USO

### Caso de Uso 1: Completar Estudios Preliminares

**Actor:** Auditor Líder

**Flujo:**
1. Accede a la fase de planeación de una auditoría
2. Selecciona "Estudios Preliminares"
3. Revisa el checklist de 6 items
4. Hace clic en cada item conforme lo completa
5. Carga documentos de estudios (análisis de riesgos, normativa, etc.)
6. Al completar todos los items, la actividad pasa a 100%

**Resultado:**
- Actividad marcada como "Completada"
- Progreso general actualizado
- Documentos almacenados en el expediente digital

---

### Caso de Uso 2: Enviar Solicitud de Información

**Actor:** Auditor Líder

**Flujo:**
1. Selecciona "Solicitud de Información"
2. Hace clic en "Elaborar y Enviar Solicitud"
3. Completa el formulario:
   - Asunto de la solicitud
   - Detalle del requerimiento
   - Lista de documentos solicitados (mínimo 1)
   - Plazo de respuesta (mínimo 5 días)
4. Hace clic en "Enviar Solicitud"

**Resultado:**
- Solicitud enviada al responsable del área auditada
- Notificación por correo electrónico
- Items 4 y 5 del checklist marcados automáticamente
- Estado de respuesta: "Pendiente"

**Validaciones:**
- Asunto y detalle obligatorios
- Al menos 1 documento solicitado
- Plazo mínimo de 3 días

---

### Caso de Uso 3: Programar Reunión de Apertura

**Actor:** Auditor Líder

**Flujo:**
1. Selecciona "Reunión de Apertura"
2. Hace clic en "Programar Reunión"
3. Completa el formulario:
   - Fecha y hora
   - Modalidad (Presencial/Virtual/Híbrida)
   - Lugar
   - Enlace virtual (si aplica)
4. Revisa la agenda predeterminada
5. Hace clic en "Programar Reunión"

**Resultado:**
- Reunión programada
- Convocatoria enviada a participantes
- Items 1 y 3 del checklist marcados automáticamente
- Estado de acta: "Pendiente"

**Validaciones:**
- Fecha no puede ser pasada
- Lugar obligatorio
- Enlace virtual obligatorio si modalidad ≠ presencial

---

### Caso de Uso 4: Avanzar a Ejecución

**Actor:** Auditor Líder

**Precondición:** Las 3 actividades están al 100%

**Flujo:**
1. Revisa el dashboard de progreso (100%)
2. Hace clic en "Avanzar a Ejecución"
3. Lee el resumen de actividades completadas
4. Confirma el avance

**Resultado:**
- Fase de planeación marcada como completada
- Auditoría avanza a la fase de "Ejecución"
- Registro en auditoría de cambios (compliance)
- Notificación al equipo auditor

---

## 📁 ESTRUCTURA DE DATOS

### Interfaz `ActividadData`

```typescript
interface ActividadData {
  id: ActividadPlaneacion;
  titulo: string;
  descripcion: string;
  icono: React.ReactNode;
  color: string;
  estado: EstadoActividad; // 'pendiente' | 'en-progreso' | 'completada'
  progreso: number; // 0-100
  checklist: ItemChecklist[];
  documentos: DocumentoActividad[];
  observaciones: string;
}
```

### Interfaz `SolicitudInformacion`

```typescript
interface SolicitudInformacion {
  id: string;
  asunto: string;
  detalle: string;
  documentosSolicitados: string[];
  plazoRespuesta: Date;
  estadoRespuesta: 'pendiente' | 'parcial' | 'completa';
  respuestas: {
    id: string;
    fecha: Date;
    descripcion: string;
    documentos: string[];
  }[];
}
```

### Interfaz `ReunionApertura`

```typescript
interface ReunionApertura {
  fecha?: Date;
  hora?: string;
  lugar: string;
  modalidad: 'presencial' | 'virtual' | 'hibrida';
  enlaceVirtual?: string;
  agenda: string[];
  participantes: {
    nombre: string;
    rol: string;
    confirmado: boolean;
  }[];
  actaReunion?: string;
  estadoActa: 'pendiente' | 'borrador' | 'aprobada';
}
```

---

## 🔌 INTEGRACIÓN CON OTROS MÓDULOS

### ⬅️ Recibe de RF004 (Inicio)
- Auditoría con estado "En Planeación"
- Expediente digital creado
- Documentos iniciales generados
- Equipo auditor asignado

### ➡️ Envía a RF006 (Ejecución)
- Planeación completada al 100%
- Estudios preliminares documentados
- Información del área recibida
- Reunión de apertura realizada
- Acta de reunión firmada

### 🔗 Se integra con:
- **Expediente Digital:** Almacena todos los documentos
- **Sistema de Notificaciones:** Envía correos y alertas
- **Gestión de Personas:** Datos de auditores y responsables
- **Control Interno Context:** Estado global del módulo

---

## 🎨 DISEÑO Y UX

### Paleta de Colores
- **Morado:** #8B5CF6 (Estudios Preliminares)
- **Ámbar:** #F59E0B (Solicitud de Información)
- **Verde:** #10B981 (Reunión de Apertura)
- **Azul ESAP:** #003DA5 (Botones primarios)

### Principios de Diseño
1. **Mobile-first:** Responsive en todas las pantallas
2. **Accesibilidad:** WCAG 2.1 AA
3. **Consistencia:** Uso del design system ESAP
4. **Feedback visual:** Animaciones suaves, toasts informativos
5. **Guía clara:** Checklist paso a paso

### Animaciones
- **Transiciones de tabs:** Fade in/out con Motion
- **Barra de progreso:** Animación fluida al actualizar
- **Modales:** Slide in from bottom
- **Checklist items:** Hover states suaves

---

## 📊 MÉTRICAS Y KPIs

### Métricas de Progreso
- **Progreso General:** (Promedio de las 3 actividades)
- **Actividades Completadas:** Contador de 0 a 3
- **Días Restantes:** Diferencia entre hoy y fecha fin

### Indicadores de Calidad
- **Documentos Cargados:** Por cada actividad
- **Items de Checklist Completados:** Por actividad
- **Tiempo de Planeación:** Fecha inicio - fecha completado

---

## 🚀 PRÓXIMOS PASOS

### Implementados ✅
- [x] RF004 - Inicio de Auditoría (Wizard de 4 documentos)
- [x] RF005 - Fase de Planeación (3 actividades)

### Por Implementar 🔜
1. **RF006 - Fase de Ejecución**
   - Aplicación de listas de chequeo
   - Identificación de hallazgos
   - Carga de evidencias
   - Reunión de cierre

2. **RF007 - Listas de Chequeo Digitales**
   - Catálogo de listas estándar
   - Constructor de listas personalizadas
   - Aplicación en campo

3. **RF008 - Registro de Hallazgos**
   - Formulario de hallazgos
   - Clasificación (leve, moderado, grave)
   - Evidencias fotográficas

4. **RF009 - Comunicación**
   - Informe preliminar
   - Gestión de controversias
   - Informe final
   - Informe ejecutivo

5. **RF010-011 - Planes de Mejoramiento**
   - Formulación de acciones correctivas
   - Seguimiento trimestral
   - Validación de evidencias

---

## 📚 REFERENCIAS NORMATIVAS

### EM-PT-004 - Auditorías Internas V3
- **3 ETAPAS:** Planeación → Ejecución → Comunicación
- **Actividades Planeación:** Estudios preliminares, solicitud info, reunión apertura
- **Duración SEDE:** 5-10 días hábiles
- **Duración TERRITORIAL:** 3 días hábiles (FIJO)

### Decreto 648/2017
- Control Interno de Gestión
- 5 roles obligatorios del Plan Anual

### DAFP - Guía de Auditoría Interna
- Metodología de planeación
- Evaluación de riesgos
- Documentación requerida

---

## 🎉 CONCLUSIÓN

El componente **PlaneacionAuditoriaModule** implementa de manera integral y profesional la fase de planeación de auditorías, cumpliendo con:

✅ **Todos los requerimientos del EM-PT-004**  
✅ **Diseño de clase mundial** con identidad ESAP  
✅ **Excelente usabilidad** con checklist interactivo  
✅ **Gestión completa** de las 3 actividades obligatorias  
✅ **Validación robusta** antes de avanzar a Ejecución  
✅ **Integración perfecta** con el flujo de auditorías  

**Estado:** ✅ Listo para UAT (User Acceptance Testing)

---

**Última actualización:** 21 Diciembre 2025  
**Autor:** Equipo de Desarrollo SIGL  
**Versión:** 1.0.0

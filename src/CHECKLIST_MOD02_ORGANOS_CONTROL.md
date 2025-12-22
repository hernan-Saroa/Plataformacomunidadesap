# ✅ CHECKLIST COMPLETO - MOD-02: ÓRGANOS DE CONTROL (REQ-MOD02-001/002)

**Fecha de Revisión:** 20 Diciembre 2025  
**Documento Base:** ESPECIFICACION_REQUERIMIENTOS_COMPLETA_11_MODULOS.md (Líneas 576-703)  
**Prioridad:** ALTA  
**Estado Especificación:** APPROVED

---

## 📋 RESUMEN EJECUTIVO

**Objetivo:** Sistema permite registrar requerimientos recibidos de órganos de control (Contraloría, Procuraduría, Defensoría, DANE, etc) y dar seguimiento a plazos de respuesta. Cada requerimiento es independiente de MOD-01 (Defensa Judicial) pero sigue lógica similar de alertas por vencimiento.

---

## 🔍 ANÁLISIS DETALLADO DE REQUERIMIENTOS

### **BLOQUE 1: REGISTRO Y ENTRADA DE REQUERIMIENTOS**

#### ✅ REQ-MOD02-001-A: Formulario de Registro de Requerimiento
- [ ] **A1:** Campo "Órgano de Control" (dropdown)
  - [ ] Contraloría General de la República
  - [ ] Procuraduría General de la Nación
  - [ ] Defensoría del Pueblo
  - [ ] DANE
  - [ ] Superintendencia de Educación
  - [ ] Otros (opción para crear nuevo órgano - requiere Jefe OJ)

- [ ] **A2:** Campo "Tipo de Requerimiento" (radio buttons)
  - [ ] Requerimiento de información (simple, solo pedir datos)
  - [ ] Requerimiento de ajuste (información ya enviada, piden corrección)

- [ ] **A3:** Campo "Número de Radicado" (text, REQUIRED)
  - [ ] Validación de formato
  - [ ] Unicidad del radicado

- [ ] **A4:** Campo "Fecha de Recepción" (date, REQUIRED)
  - [ ] No puede ser fecha futura
  - [ ] Formato DD/MM/YYYY

- [ ] **A5:** Campo "Descripción del Requerimiento" (textarea, REQUIRED)
  - [ ] Mínimo 20 caracteres
  - [ ] Máximo 2000 caracteres

- [ ] **A6:** Campo "Documentos Adjuntos" (upload)
  - [ ] Carga múltiple de archivos
  - [ ] Integración con Active Document
  - [ ] Formatos permitidos: PDF, DOC, DOCX, XLS, XLSX
  - [ ] Tamaño máximo por archivo: 10MB

- [ ] **A7:** Campo "Abogado Asignado" (dropdown, REQUIRED)
  - [ ] FK a tabla usuarios con rol ABOGADO
  - [ ] Mostrar nombre completo + cédula
  - [ ] Filtrar solo usuarios activos

- [ ] **A8:** Campo "Territorial" (dropdown, REQUIRED)
  - [ ] Nacional
  - [ ] Territorial Antioquia
  - [ ] Territorial Bogotá
  - [ ] (todas las 15 territoriales ESAP)

#### ✅ REQ-MOD02-001-B: Origen del Requerimiento
- [ ] **B1:** Puede venir desde MOD-07 (Buzón Oficina Jurídica)
  - [ ] Botón "Convertir a Requerimiento Formal"
  - [ ] Pre-llena datos desde el buzón

- [ ] **B2:** Entrada manual directa
  - [ ] Botón "Nuevo Requerimiento" visible en header

---

### **BLOQUE 2: CÁLCULO AUTOMÁTICO DE PLAZOS**

#### ✅ REQ-MOD02-002-A: Sistema de Cálculo de Plazos
- [ ] **A1:** Tabla parametrizada órgano_control → plazo_respuesta
  ```
  Contraloría: 30 días hábiles
  Procuraduría: 20 días hábiles
  Defensoría: 15 días hábiles
  DANE: 30 días hábiles
  Otros: 30 días hábiles (default)
  ```

- [ ] **A2:** Cálculo de días HÁBILES (excluyendo)
  - [ ] Sábados
  - [ ] Domingos
  - [ ] Festivos nacionales
  - [ ] Festivos locales (si aplica por territorial)

- [ ] **A3:** Plazo REDUCIDO para requerimientos de AJUSTE
  - [ ] Si tipo = "ajuste": plazo puede ser 10 días hábiles
  - [ ] Indicador visual de plazo reducido
  - [ ] Alerta especial "PLAZO CORTO"

- [ ] **A4:** Cálculo automático de fecha_vencimiento
  ```
  fecha_vencimiento = fecha_recepción + plazo_días_hábiles
  ```

- [ ] **A5:** Mostrar información de plazo en UI
  - [ ] "Días Totales: 30 días hábiles"
  - [ ] "Días Restantes: 15 días"
  - [ ] "Fecha de Vencimiento: 15/02/2025"
  - [ ] "Recibido hace: 15 días"

---

### **BLOQUE 3: WORKFLOW DE ESTADOS**

#### ✅ REQ-MOD02-003-A: Estados del Requerimiento
- [ ] **Estado 1: RECIBIDO**
  - [ ] Estado inicial al crear el requerimiento
  - [ ] Color: Azul (#6366F1)
  - [ ] Acciones disponibles:
    - [ ] Asignar abogado
    - [ ] Cambiar a "En Preparación"

- [ ] **Estado 2: EN_PREPARACION** (Análisis)
  - [ ] Abogado está preparando la respuesta
  - [ ] Color: Naranja (#F59E0B)
  - [ ] Acciones disponibles:
    - [ ] Campo textarea "Respuesta Draft"
    - [ ] Adjuntar documentos soporte
    - [ ] Botón "Enviar a Revisión"

- [ ] **Estado 3: EN_REVISION** (Elaboración Respuesta)
  - [ ] Respuesta está siendo revisada por Jefe OJ
  - [ ] Color: Púrpura (#8B5CF6)
  - [ ] Acciones disponibles:
    - [ ] Ver respuesta draft
    - [ ] Aprobar respuesta
    - [ ] Devolver con observaciones

- [ ] **Estado 4: APROBADA** (Revisión)
  - [ ] Respuesta aprobada, lista para envío
  - [ ] Color: Rosa (#EC4899)
  - [ ] Acciones disponibles:
    - [ ] Generar documento PDF/DOC
    - [ ] Enviar respuesta oficial

- [ ] **Estado 5: ENVIADA**
  - [ ] Respuesta enviada al órgano de control
  - [ ] Color: Verde (#10B981)
  - [ ] Registro de:
    - [ ] Timestamp de envío
    - [ ] Email de envío
    - [ ] Copia a Active Document
  - [ ] Acciones disponibles:
    - [ ] Marcar como Resuelta
    - [ ] Agregar seguimiento

- [ ] **Estado 6: RESUELTA**
  - [ ] Caso cerrado
  - [ ] Color: Gris (#6B7280)
  - [ ] Cierre manual por Jefe OJ
  - [ ] No permite más ediciones (solo lectura)

#### ✅ REQ-MOD02-003-B: Transiciones de Estado
- [ ] **B1:** RECIBIDO → EN_PREPARACION
  - [ ] Abogado inicia trabajo
  - [ ] Registro en historial

- [ ] **B2:** EN_PREPARACION → EN_REVISION
  - [ ] Validar que existe respuesta_draft (no vacío)
  - [ ] Notificación a Jefe OJ

- [ ] **B3:** EN_REVISION → APROBADA
  - [ ] Solo Jefe OJ puede aprobar
  - [ ] Registrar aprobación

- [ ] **B4:** EN_REVISION → EN_PREPARACION (Devolución)
  - [ ] Campo "Observaciones de Revisión" (REQUIRED)
  - [ ] Notificación a abogado asignado

- [ ] **B5:** APROBADA → ENVIADA
  - [ ] Genera PDF/DOC
  - [ ] Envía email automático
  - [ ] Registra fecha_envio

- [ ] **B6:** ENVIADA → RESUELTA
  - [ ] Solo Jefe OJ puede cerrar
  - [ ] Confirmación "¿Seguro de cerrar el requerimiento?"

---

### **BLOQUE 4: SISTEMA DE ALERTAS Y SEMÁFOROS**

#### ✅ REQ-MOD02-004-A: Sistema de Colores de Alerta
- [ ] **Color VERDE**
  - [ ] Condición: días_restantes > 50% del plazo total
  - [ ] Ejemplo: Si plazo = 30 días, VERDE cuando restan > 15 días
  - [ ] Ícono: CheckCircle
  - [ ] Badge: bg-green-100 text-green-800

- [ ] **Color AMARILLO**
  - [ ] Condición: 25% ≤ días_restantes ≤ 50%
  - [ ] Ejemplo: Si plazo = 30 días, AMARILLO entre 8-15 días
  - [ ] Ícono: Clock
  - [ ] Badge: bg-yellow-100 text-yellow-800
  - [ ] Notificación: Email diario a abogado

- [ ] **Color ROJO**
  - [ ] Condición: días_restantes < 25%
  - [ ] Ejemplo: Si plazo = 30 días, ROJO cuando < 8 días
  - [ ] Ícono: AlertCircle
  - [ ] Badge: bg-red-100 text-red-800
  - [ ] Notificación: Email diario a abogado + Jefe OJ
  - [ ] Escalación: Teams mensaje urgente

- [ ] **Color VENCIDO**
  - [ ] Condición: días_restantes ≤ 0
  - [ ] Badge: bg-red-900 text-white
  - [ ] Notificación: Email inmediato a Dirección Nacional
  - [ ] Requiere reporte a Rectoría
  - [ ] Registro en auditoría

#### ✅ REQ-MOD02-004-B: Job Diario de Actualización
- [ ] **B1:** Job automático (CRON)
  - [ ] Se ejecuta diariamente a las 6:00 AM
  - [ ] Recalcula días_restantes para todos los requerimientos activos
  - [ ] Actualiza color_alerta según nueva condición
  - [ ] Envía notificaciones según color

- [ ] **B2:** Notificaciones Automáticas
  - [ ] Día 25 (antes de vencimiento): Notificación preventiva
  - [ ] Día 28: Notificación crítica
  - [ ] Día 30 (vencimiento): Notificación de vencimiento
  - [ ] Día 31+: Notificaciones de escalación

---

### **BLOQUE 5: VISTA KANBAN OPERATIVA**

#### ✅ REQ-MOD02-005-A: Tablero Kanban
- [ ] **A1:** 6 Columnas (Estados)
  - [ ] Columna 1: Recibido (Azul #6366F1)
  - [ ] Columna 2: Análisis (Naranja #F59E0B)
  - [ ] Columna 3: Elaboración Respuesta (Púrpura #8B5CF6)
  - [ ] Columna 4: Revisión (Rosa #EC4899)
  - [ ] Columna 5: Enviado (Verde #10B981)
  - [ ] Columna 6: Resuelta (Gris #6B7280)

- [ ] **A2:** Drag & Drop entre columnas
  - [ ] Biblioteca: react-dnd + react-dnd-html5-backend
  - [ ] Validaciones de transición de estado
  - [ ] Toast de confirmación al mover

- [ ] **A3:** Tarjetas de Requerimiento
  - [ ] Header: ID + Número Radicado
  - [ ] Badge: Tipo (INFORMACION/AJUSTE)
  - [ ] Órgano de Control
  - [ ] Descripción (line-clamp-2)
  - [ ] Abogado asignado
  - [ ] Territorial
  - [ ] Badge de días restantes (color según alerta)
  - [ ] 3 Botones de acción:
    - [ ] "Ver Detalles" (Eye)
    - [ ] "Notas" (MessageSquare)
    - [ ] "Historial" (History)

- [ ] **A4:** Contador de tarjetas por columna
  - [ ] Badge con número de requerimientos
  - [ ] Actualización automática

- [ ] **A5:** Scroll horizontal para ver todas las columnas
  - [ ] Ancho mínimo por columna: 340px
  - [ ] Scroll suave

#### ✅ REQ-MOD02-005-B: Header del Kanban
- [ ] **B1:** Título y descripción del módulo
- [ ] **B2:** Estadísticas globales
  - [ ] Total de requerimientos
  - [ ] Requerimientos en proceso
  - [ ] Requerimientos con alerta (ROJO/VENCIDO)
- [ ] **B3:** Botón "Nuevo Requerimiento"
  - [ ] Ícono Plus
  - [ ] Color rojo (#DC2626)
  - [ ] Abre modal de formulario

#### ✅ REQ-MOD02-005-C: Toggle Kanban/Lista
- [ ] **C1:** Botones de vista
  - [ ] Botón "Kanban" (Columns3 icon)
  - [ ] Botón "Lista" (List icon)
  - [ ] Posición: Centrados en la parte superior
  - [ ] z-index: 20 (no tapar otros elementos)
  - [ ] Estado activo: bg-blue-600
  - [ ] Estado inactivo: ghost

---

### **BLOQUE 6: MODAL DE DETALLE COMPLETO**

#### ✅ REQ-MOD02-006-A: Modal de Detalle
- [ ] **A1:** Header del modal
  - [ ] ID del requerimiento
  - [ ] Número de radicado
  - [ ] Badge de tipo (INFORMACION/AJUSTE)
  - [ ] Badge de estado actual
  - [ ] Botón cerrar (X)

- [ ] **A2:** Sección "Información General"
  - [ ] Órgano de Control (con ícono 🏛️)
  - [ ] Tipo de requerimiento
  - [ ] Fecha de recepción
  - [ ] Número de radicado
  - [ ] Territorial
  - [ ] Documentos adjuntos (contador)

- [ ] **A3:** Sección "Plazos y Alertas"
  - [ ] Días totales (barra de progreso)
  - [ ] Días restantes (con color de alerta)
  - [ ] Fecha de vencimiento
  - [ ] Porcentaje transcurrido
  - [ ] Card visual de alerta (color según estado)

- [ ] **A4:** Sección "Descripción"
  - [ ] Textarea con descripción completa
  - [ ] Solo lectura si estado = RESUELTA

- [ ] **A5:** Sección "Responsable"
  - [ ] Abogado asignado
  - [ ] Avatar o ícono
  - [ ] Información de contacto

- [ ] **A6:** Sección "Respuesta Draft" (si aplica)
  - [ ] Textarea editable (solo en EN_PREPARACION)
  - [ ] Solo lectura en otros estados
  - [ ] Contador de caracteres

- [ ] **A7:** Sección "Observaciones de Revisión" (si aplica)
  - [ ] Visible solo en estado EN_REVISION
  - [ ] Comentarios del Jefe OJ

- [ ] **A8:** Sección "Información de Envío" (si aplica)
  - [ ] Visible solo en estados ENVIADA/RESUELTA
  - [ ] Fecha de envío
  - [ ] Email de envío
  - [ ] Link a Active Document

- [ ] **A9:** Botones de acción según estado
  - [ ] RECIBIDO: "Iniciar Análisis"
  - [ ] EN_PREPARACION: "Enviar a Revisión"
  - [ ] EN_REVISION: "Aprobar" / "Devolver"
  - [ ] APROBADA: "Enviar Respuesta"
  - [ ] ENVIADA: "Marcar como Resuelta"
  - [ ] Botón "Generar Reporte" (siempre visible)

---

### **BLOQUE 7: MODAL DE NOTAS Y COMENTARIOS**

#### ✅ REQ-MOD02-007-A: Sistema de Notas
- [ ] **A1:** Modal de Notas
  - [ ] Header: "Notas y Comentarios" + ID requerimiento
  - [ ] Ícono: MessageSquare
  - [ ] Color tema: Azul (#3B82F6)

- [ ] **A2:** Lista de notas existentes
  - [ ] Ordenadas por fecha (más reciente arriba)
  - [ ] Cada nota muestra:
    - [ ] Avatar del autor
    - [ ] Nombre completo del autor
    - [ ] Fecha y hora (formato: DD/MMM/YYYY HH:MM)
    - [ ] Contenido de la nota
  - [ ] Borde izquierdo de color (border-l-4 border-l-blue-500)
  - [ ] Mensaje vacío: "No hay notas registradas"

- [ ] **A3:** Campo para nueva nota
  - [ ] Textarea: placeholder "Escribe tu comentario..."
  - [ ] Mínimo: 5 caracteres
  - [ ] Máximo: 1000 caracteres
  - [ ] Botón "Agregar Nota" (ícono Send)

- [ ] **A4:** Validaciones
  - [ ] No permite notas vacías
  - [ ] Toast de error si vacío
  - [ ] Toast de éxito al agregar

- [ ] **A5:** Persistencia
  - [ ] Notas se guardan en tabla: requerimiento_notas
  - [ ] FK: requerimiento_id
  - [ ] Campos: autor_id, fecha, contenido

---

### **BLOQUE 8: MODAL DE HISTORIAL DE CAMBIOS**

#### ✅ REQ-MOD02-008-A: Timeline de Historial
- [ ] **A1:** Modal de Historial
  - [ ] Header: "Historial de Cambios" + ID requerimiento
  - [ ] Ícono: History
  - [ ] Color tema: Púrpura (#9333EA)

- [ ] **A2:** Timeline visual
  - [ ] Línea vertical de conexión (bg-gray-300)
  - [ ] Íconos por tipo de acción:
    - [ ] Creado: Plus (azul)
    - [ ] Movido/Actualizado: ArrowRight (púrpura)
    - [ ] Aprobado/Completado: CheckCircle (verde)
    - [ ] Otro: Clock (gris)

- [ ] **A3:** Cada entrada de historial muestra:
  - [ ] Ícono circular con borde
  - [ ] Título de la acción (ej: "Requerimiento Creado")
  - [ ] Fecha y hora (badge)
  - [ ] Nombre del usuario que realizó la acción
  - [ ] Detalles adicionales (si aplica)

- [ ] **A4:** Ordenamiento
  - [ ] Más reciente en la parte superior
  - [ ] Cronológico descendente

- [ ] **A5:** Mensaje vacío
  - [ ] "No hay historial registrado"

- [ ] **A6:** Auditoría completa
  - [ ] Registra TODOS los cambios de estado
  - [ ] Registra aprobaciones/devoluciones
  - [ ] Registra envíos
  - [ ] Registra cierres

---

### **BLOQUE 9: MODAL DE NUEVO REQUERIMIENTO**

#### ✅ REQ-MOD02-009-A: Formulario Completo
- [ ] **A1:** Modal full-screen (max-w-4xl)
  - [ ] Header: "Nuevo Requerimiento" + "Órganos de Control"
  - [ ] Ícono: Shield
  - [ ] Color tema: Rojo (#DC2626)

- [ ] **A2:** Integración con FormularioRequerimientoOrganoControl
  - [ ] Componente existente: `/defensa-judicial/FormularioRequerimientoOrganoControl.tsx`
  - [ ] Todos los campos del PASO 2 implementados

- [ ] **A3:** Campos del formulario (ver BLOQUE 1)
  - [ ] Todos los campos de REQ-MOD02-001-A

- [ ] **A4:** Validaciones antes de submit
  - [ ] Todos los campos REQUIRED completos
  - [ ] Fecha válida
  - [ ] Descripción mínimo 20 caracteres
  - [ ] Abogado seleccionado
  - [ ] Territorial seleccionado

- [ ] **A5:** Submit exitoso
  - [ ] Crea registro en BD
  - [ ] Calcula plazos automáticamente
  - [ ] Inicia historial
  - [ ] Toast de éxito
  - [ ] Cierra modal
  - [ ] Actualiza lista/kanban

---

### **BLOQUE 10: VISTA DE LISTA (TABLA)**

#### ✅ REQ-MOD02-010-A: Tabla de Requerimientos
- [ ] **A1:** Columnas de la tabla
  - [ ] ID
  - [ ] Radicado
  - [ ] Órgano de Control
  - [ ] Tipo (Badge)
  - [ ] Descripción (truncada)
  - [ ] Abogado Asignado
  - [ ] Territorial
  - [ ] Estado (Badge con color)
  - [ ] Días Restantes (Badge con color de alerta)
  - [ ] Fecha Vencimiento
  - [ ] Acciones (botones)

- [ ] **A2:** Filtros
  - [ ] Por órgano de control
  - [ ] Por estado
  - [ ] Por abogado
  - [ ] Por territorial
  - [ ] Por rango de fechas
  - [ ] Por color de alerta

- [ ] **A3:** Búsqueda
  - [ ] Campo de búsqueda global
  - [ ] Busca en: ID, radicado, descripción, órgano

- [ ] **A4:** Ordenamiento
  - [ ] Por días restantes (urgencia)
  - [ ] Por fecha de recepción
  - [ ] Por fecha de vencimiento
  - [ ] Por estado
  - [ ] Por abogado

- [ ] **A5:** Paginación
  - [ ] 20 registros por página
  - [ ] Selector de cantidad (20/50/100)

- [ ] **A6:** Acciones por fila
  - [ ] Ver Detalles
  - [ ] Notas
  - [ ] Historial
  - [ ] Menú de opciones (...)

---

### **BLOQUE 11: REPORTES Y EXPORTACIÓN**

#### ✅ REQ-MOD02-011-A: Generación de Reportes
- [ ] **A1:** Botón "Generar Reporte" en modal de detalle
  - [ ] Genera PDF con información completa del requerimiento
  - [ ] Incluye:
    - [ ] Header ESAP con logo
    - [ ] Información general
    - [ ] Timeline de estados
    - [ ] Respuesta (si existe)
    - [ ] Documentos adjuntos (lista)
    - [ ] Footer con firma digital

- [ ] **A2:** Reporte Global (Dashboard)
  - [ ] Estadísticas generales
  - [ ] Gráficos:
    - [ ] Requerimientos por órgano de control
    - [ ] Requerimientos por estado
    - [ ] Requerimientos por alerta (semáforo)
    - [ ] Requerimientos por territorial
    - [ ] Cumplimiento de plazos (%)

- [ ] **A3:** Exportación a Excel
  - [ ] Botón "Exportar a Excel"
  - [ ] Todas las columnas de la tabla
  - [ ] Aplica filtros actuales
  - [ ] Nombre archivo: `Requerimientos_Organos_Control_YYYYMMDD.xlsx`

---

### **BLOQUE 12: NOTIFICACIONES Y ALERTAS**

#### ✅ REQ-MOD02-012-A: Sistema de Notificaciones
- [ ] **A1:** Notificación al crear requerimiento
  - [ ] Email a abogado asignado
  - [ ] Teams mensaje
  - [ ] Incluye: ID, órgano, plazo, fecha vencimiento

- [ ] **A2:** Notificación al cambiar estado
  - [ ] Email al responsable actual
  - [ ] Si cambia a EN_REVISION: notifica a Jefe OJ

- [ ] **A3:** Notificaciones de alerta
  - [ ] Día con 50% del plazo: Email informativo
  - [ ] Día con 25% del plazo: Email de alerta
  - [ ] 3 días antes de vencer: Email urgente + Teams
  - [ ] Día de vencimiento: Email crítico a todos
  - [ ] Día posterior a vencimiento: Email a Dirección Nacional

- [ ] **A4:** Notificación al devolver respuesta
  - [ ] Email a abogado con observaciones
  - [ ] Link directo al requerimiento

- [ ] **A5:** Notificación al aprobar/enviar
  - [ ] Confirmación de envío al órgano
  - [ ] Copia a abogado y Jefe OJ

---

### **BLOQUE 13: INTEGRACIÓN CON OTROS MÓDULOS**

#### ✅ REQ-MOD02-013-A: MOD-07 (Buzón Oficina Jurídica)
- [ ] **A1:** Botón "Convertir a Requerimiento"
  - [ ] Desde mensaje/email en MOD-07
  - [ ] Pre-llena formulario con datos del mensaje

- [ ] **A2:** Link de trazabilidad
  - [ ] Requerimiento guarda FK al mensaje origen

#### ✅ REQ-MOD02-013-B: Active Document (TRD)
- [ ] **B1:** Al enviar respuesta
  - [ ] Copia documento a Active Document
  - [ ] Categoría: "Requerimientos Órganos de Control"
  - [ ] Metadatos: ID, órgano, fecha, abogado

#### ✅ REQ-MOD02-013-C: MOD-08 (Plan de Acción)
- [ ] **C1:** Si requerimiento se VENCE
  - [ ] Escalación automática a MOD-08
  - [ ] Crea acción correctiva
  - [ ] Asigna a Jefe OJ o Dirección Nacional

---

### **BLOQUE 14: CASOS EDGE-CASE**

#### ✅ REQ-MOD02-014-A: Edge Case 1 - Requerimiento de Ajuste (Plazo Reducido)
- [ ] **A1:** Sistema detecta tipo = "AJUSTE"
- [ ] **A2:** Aplica plazo reducido (10 días)
- [ ] **A3:** Indicador visual "PLAZO CORTO" en tarjeta
- [ ] **A4:** Alertas más agresivas (día 5, día 7, día 9)
- [ ] **A5:** Registra en auditoría ambos términos

#### ✅ REQ-MOD02-014-B: Edge Case 2 - Órgano No en Dropdown
- [ ] **B1:** Opción "Otro" en dropdown
- [ ] **B2:** Campo adicional: "Especificar Órgano"
- [ ] **B3:** Botón "CREAR NUEVO ÓRGANO"
- [ ] **B4:** Requiere aprobación Jefe OJ
- [ ] **B5:** Nuevo órgano se parametriza con plazo default (30 días)

#### ✅ REQ-MOD02-014-C: Edge Case 3 - Requerimiento VENCIDO sin Respuesta
- [ ] **C1:** Sistema detecta: hoy > fecha_vencimiento
- [ ] **C2:** Notificación roja: "VENCIDA: Debe responderse inmediatamente"
- [ ] **C3:** Escala: Email a Dirección Nacional
- [ ] **C4:** Riesgo de sanción por el órgano de control
- [ ] **C5:** Auditoría: Registra vencimiento + motivos

---

### **BLOQUE 15: SEGURIDAD Y PERMISOS**

#### ✅ REQ-MOD02-015-A: Roles y Permisos
- [ ] **ROL: ABOGADO**
  - [ ] Puede crear requerimientos
  - [ ] Puede editar sus requerimientos asignados
  - [ ] Puede preparar respuestas
  - [ ] NO puede aprobar respuestas
  - [ ] NO puede cerrar requerimientos

- [ ] **ROL: JEFE_OJ (Jefe Oficina Jurídica)**
  - [ ] TODOS los permisos de ABOGADO
  - [ ] Puede aprobar respuestas
  - [ ] Puede devolver respuestas con observaciones
  - [ ] Puede cerrar requerimientos (marcar RESUELTA)
  - [ ] Puede crear nuevos órganos de control

- [ ] **ROL: ADMIN**
  - [ ] TODOS los permisos
  - [ ] Puede reasignar requerimientos
  - [ ] Puede editar cualquier requerimiento
  - [ ] Puede eliminar requerimientos (soft delete)

#### ✅ REQ-MOD02-015-B: Validaciones de Permisos
- [ ] **B1:** Verificar rol antes de cada acción
- [ ] **B2:** Botones disabled si no tiene permiso
- [ ] **B3:** Mensaje de error si intenta acción no permitida
- [ ] **B4:** Auditoría de intentos no autorizados

---

### **BLOQUE 16: PERFORMANCE Y OPTIMIZACIÓN**

#### ✅ REQ-MOD02-016-A: Optimizaciones
- [ ] **A1:** Carga lazy de documentos adjuntos
- [ ] **A2:** Paginación en lista/tabla
- [ ] **A3:** Caché de órganos de control
- [ ] **A4:** Índices en BD:
  - [ ] estado
  - [ ] fecha_vencimiento
  - [ ] abogado_id
  - [ ] color_alerta

- [ ] **A5:** Query optimization
  - [ ] Joins eficientes
  - [ ] Evitar N+1 queries

---

### **BLOQUE 17: UI/UX Y DISEÑO**

#### ✅ REQ-MOD02-017-A: Design System ESAP
- [ ] **A1:** Usar componentes del design-system
  - [ ] CardSIGL
  - [ ] ButtonSIGL
  - [ ] BadgeSIGL
  - [ ] InputSIGL
  - [ ] SelectSIGL
  - [ ] TextareaSIGL

- [ ] **A2:** Colores corporativos
  - [ ] Azul ESAP: #003DA5 (primario)
  - [ ] Rojo módulo: #DC2626 (Órganos de Control)
  - [ ] Semáforos: Verde, Amarillo, Rojo, Gris

- [ ] **A3:** Responsive design
  - [ ] Mobile-first approach
  - [ ] Breakpoints: sm, md, lg, xl
  - [ ] Kanban scroll horizontal en mobile

- [ ] **A4:** Accesibilidad
  - [ ] ARIA labels
  - [ ] Contraste de colores (WCAG AA)
  - [ ] Navegación por teclado
  - [ ] Screen reader friendly

---

## 📊 CRITERIOS DE ACEPTACIÓN (CA)

### CA-MOD02-001-01: Cálculo de Plazos
```
DADO: Usuario registra requerimiento Contraloría
CUANDO: Ingresa fecha recepción 05/01/2025, tipo "INFORMACION"
ENTONCES: Sistema calcula plazo 30 días hábiles
         Fecha vencimiento = 15/02/2025
         Excluye sábados, domingos, festivos
VERIFICACIÓN: Fecha correcta sin días no hábiles
```

### CA-MOD02-001-02: Sistema de Alertas
```
DADO: Requerimiento creado con plazo 30 días
CUANDO: Job diario ejecuta
ENTONCES: 
  - VERDE si días_restantes > 15 (>50%)
  - AMARILLO si 8 ≤ días_restantes ≤ 15 (25-50%)
  - ROJO si días_restantes < 8 (<25%)
  - VENCIDO si días_restantes ≤ 0
VERIFICACIÓN: Colores actualizados diariamente
```

### CA-MOD02-001-03: Envío de Respuesta
```
DADO: Abogado prepara respuesta, Jefe OJ aprueba
CUANDO: Jefe presiona [ENVIAR RESPUESTA]
ENTONCES: 
  - Email enviado a órgano de control
  - Copia a Active Document
  - Estado = ENVIADA
  - Timestamp registrado
VERIFICACIÓN: Email delivery log + Active Document registro
```

### CA-MOD02-001-04: Workflow de Estados
```
DADO: Requerimiento en estado EN_PREPARACION
CUANDO: Abogado presiona [ENVIAR A REVISIÓN]
ENTONCES: 
  - Valida respuesta_draft no vacío
  - Cambia estado a EN_REVISION
  - Notifica a Jefe OJ por email
  - Registra en historial
VERIFICACIÓN: Estado cambiado + notificación enviada
```

### CA-MOD02-001-05: Drag & Drop
```
DADO: Requerimiento en columna "Recibido"
CUANDO: Usuario arrastra a columna "Análisis"
ENTONCES: 
  - Estado cambia a EN_PREPARACION
  - Toast de confirmación
  - Tarjeta aparece en nueva columna
  - Historial registra movimiento
VERIFICACIÓN: Tarjeta en columna correcta
```

### CA-MOD02-001-06: Modal de Notas
```
DADO: Usuario abre modal de notas
CUANDO: Escribe comentario "Falta info de presupuesto" y presiona [Agregar Nota]
ENTONCES: 
  - Nota aparece en lista
  - Muestra autor + fecha/hora actual
  - Toast "Nota agregada exitosamente"
  - Nota guardada en BD
VERIFICACIÓN: Nota visible y persistida
```

### CA-MOD02-001-07: Requerimiento Vencido
```
DADO: Requerimiento con fecha_vencimiento = 15/01/2025
CUANDO: Hoy es 16/01/2025 (1 día vencido)
ENTONCES: 
  - Color alerta = VENCIDO (rojo oscuro)
  - Días restantes = -1
  - Email urgente a Dirección Nacional
  - Escalación a MOD-08 (Plan de Acción)
  - Registro en auditoría
VERIFICACIÓN: Notificaciones enviadas + escalación creada
```

---

## 🎯 RESUMEN DE ESTADO ACTUAL VS REQUERIDO

### ✅ IMPLEMENTADO (Estado Actual)
1. ✅ Kanban con 6 columnas y scroll horizontal
2. ✅ Tarjetas con información básica
3. ✅ Drag & Drop entre columnas
4. ✅ Botones Kanban/Lista centrados
5. ✅ Modal de Notas funcional
6. ✅ Modal de Historial funcional
7. ✅ Modal de Nuevo Requerimiento funcional
8. ✅ Semáforo de alertas (Verde/Amarillo/Rojo/Vencido)
9. ✅ Mock data con 6 requerimientos de ejemplo
10. ✅ Estados del workflow (6 estados)

### ❌ PENDIENTE DE IMPLEMENTAR
1. ❌ FormularioRequerimientoOrganoControl completamente funcional (existe pero no integrado al submit)
2. ❌ Cálculo real de días HÁBILES (excluyendo festivos)
3. ❌ Job diario de actualización de alertas
4. ❌ Sistema de notificaciones (Email/Teams)
5. ❌ Modal de detalle completo (actualmente simplificado)
6. ❌ Vista de lista/tabla
7. ❌ Filtros y búsqueda
8. ❌ Generación de reportes PDF
9. ❌ Exportación a Excel
10. ❌ Integración con Active Document
11. ❌ Integración con MOD-07 (Buzón OJ)
12. ❌ Integración con MOD-08 (Plan de Acción)
13. ❌ Validación de permisos por rol
14. ❌ Campos adicionales en formulario (según especificación completa)
15. ❌ Sistema de aprobación/devolución con observaciones
16. ❌ Gestión de documentos adjuntos
17. ❌ Estadísticas y dashboard
18. ❌ Casos edge-case (ajuste, órgano nuevo, vencimiento)

---

## 📈 PRÓXIMOS PASOS SUGERIDOS (PRIORIDAD)

### **FASE 1: FUNCIONALIDAD CORE** ⭐⭐⭐
1. Completar formulario de nuevo requerimiento con TODOS los campos
2. Implementar cálculo real de días hábiles
3. Crear modal de detalle completo con todas las secciones
4. Implementar workflow de aprobación/devolución
5. Agregar gestión de documentos adjuntos

### **FASE 2: ALERTAS Y NOTIFICACIONES** ⭐⭐
6. Job diario de actualización de alertas
7. Sistema de notificaciones por email
8. Integración con Teams (webhooks)
9. Escalación automática a MOD-08

### **FASE 3: VISTAS ADICIONALES** ⭐
10. Vista de lista/tabla completa
11. Filtros avanzados
12. Búsqueda global
13. Ordenamiento personalizado

### **FASE 4: REPORTES** ⭐
14. Generación de PDF individual
15. Dashboard con estadísticas
16. Exportación a Excel
17. Gráficos de cumplimiento

### **FASE 5: INTEGRACIONES**
18. Active Document (TRD)
19. MOD-07 (Buzón OJ)
20. MOD-08 (Plan de Acción)

---

**TOTAL DE REQUERIMIENTOS IDENTIFICADOS:** 100+  
**IMPLEMENTADOS:** ~15%  
**PENDIENTES:** ~85%

---

📅 **Última Actualización:** 20 Diciembre 2025  
👤 **Revisado por:** Asistente IA  
📄 **Documento Base:** ESPECIFICACION_REQUERIMIENTOS_COMPLETA_11_MODULOS.md

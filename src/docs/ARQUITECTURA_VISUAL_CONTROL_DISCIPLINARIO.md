# 📐 ARQUITECTURA VISUAL - CONTROL INTERNO DISCIPLINARIO
## Diagramas y Guía Rápida para Desarrolladores Backend

---

## 🎯 VISIÓN RÁPIDA DEL MÓDULO

### ¿Qué hace este módulo?
Gestiona el ciclo completo de procesos disciplinarios en ESAP:
1. **Recepción de noticias** → Denuncias ciudadanas
2. **Conversión a procesos** → Inicia investigación formal
3. **6 Etapas definidas** → Recepción → Valoración → Indagación → Investigación → Juzgamiento → Fallo
4. **Sistema de semáforo** → Verde/Amarillo/Rojo según cumplimiento de términos
5. **Aprobaciones** → Jefes revisan borradores antes de avanzar

---

## 📊 DIAGRAMA DE ARQUITECTURA GENERAL

```
┌─────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (React + TypeScript)              │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │   Noticias   │  │   Procesos   │  │ Profesionales│            │
│  │ Disciplinarias│  │   Kanban     │  │   Gestión    │            │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘            │
│         │                  │                  │                     │
└─────────┼──────────────────┼──────────────────┼─────────────────────┘
          │                  │                  │
          │ REST API (JSON)  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          BACKEND API LAYER                          │
│                                                                     │
│  ┌──────────────────────────────────────────────────────┐          │
│  │              Express.js / FastAPI / Spring            │          │
│  │                                                       │          │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │          │
│  │  │  Noticias   │  │  Procesos   │  │Profesionales│  │          │
│  │  │ Controller  │  │ Controller  │  │ Controller  │  │          │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  │          │
│  │         │                │                 │         │          │
│  │         ▼                ▼                 ▼         │          │
│  │  ┌──────────────────────────────────────────────┐   │          │
│  │  │         BUSINESS LOGIC LAYER                 │   │          │
│  │  │  - Validaciones                              │   │          │
│  │  │  - Reglas de negocio                         │   │          │
│  │  │  - Cálculo de semáforo                       │   │          │
│  │  │  - Gestión de flujos                         │   │          │
│  │  └──────────────────────────────────────────────┘   │          │
│  └──────────────────────────────────────────────────────┘          │
│                                                                     │
│         │                  │                  │                     │
│         ▼                  ▼                  ▼                     │
│  ┌──────────────────────────────────────────────────────┐          │
│  │              DATA ACCESS LAYER (ORM)                 │          │
│  │           Prisma / SQLAlchemy / Hibernate            │          │
│  └──────────────────────────────────────────────────────┘          │
│                                                                     │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    POSTGRESQL DATABASE                              │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ personas │  │ noticias │  │ procesos │  │profesion.│          │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                        │
│  │documento │  │histórico │  │borradores│                        │
│  └──────────┘  └──────────┘  └──────────┘                        │
└─────────────────────────────────────────────────────────────────────┘

        │                    │                    │
        ▼                    ▼                    ▼
┌──────────────┐  ┌──────────────────┐  ┌──────────────┐
│ AWS S3 /     │  │ Sistema de       │  │ Admin de     │
│ Azure Blob   │  │ Notificaciones   │  │ Personas     │
│ (Documentos) │  │ (Email/Push)     │  │ (API Externa)│
└──────────────┘  └──────────────────┘  └──────────────┘
```

---

## 🔄 FLUJO COMPLETO: NOTICIA → PROCESO → FALLO

```
┌──────────────────────────────────────────────────────────────────────┐
│                    CICLO COMPLETO DEL PROCESO                        │
└──────────────────────────────────────────────────────────────────────┘

    ┌─────────────┐
    │   INICIO    │
    └──────┬──────┘
           │
           ▼
    ┌─────────────────────────────────┐
    │ 1. RECEPCIÓN DE NOTICIA         │  ⏱️ 3 días
    │ ────────────────────────────    │
    │ • Usuario crea noticia          │
    │ • Denunciante + Denunciado      │
    │ • Hechos (min 50 caracteres)    │
    │ • Estado: PENDIENTE             │
    └──────────────┬──────────────────┘
                   │
                   ▼
    ┌─────────────────────────────────┐
    │ 2. VALORACIÓN DE NOTICIA        │
    │ ────────────────────────────    │
    │ • Profesional revisa            │
    │ • Determina si procede          │
    │ • Estado: EN-VALORACION         │
    └──────────────┬──────────────────┘
                   │
           ┌───────┴───────┐
           │               │
           ▼               ▼
    ┌──────────┐    ┌──────────┐
    │ ARCHIVAR │    │ REMITIR  │
    │          │    │          │
    └────┬─────┘    └────┬─────┘
         │               │
         ▼               ▼
      [FIN]           [FIN]
           
           ▼
    ┌─────────────────────────────────┐
    │ 3. CONVERSIÓN A PROCESO         │
    │ ────────────────────────────    │
    │ • Seleccionar profesional       │
    │ • Validar capacidad disponible  │
    │ • Generar número PD-YYYY-NNNN   │
    │ • Estado: En Gestión            │
    └──────────────┬──────────────────┘
                   │
                   ▼
    ┌─────────────────────────────────┐
    │ ETAPA 1: RECEPCIÓN              │  ⏱️ 3 días
    │ ────────────────────────────    │
    │ • Auto de apertura              │
    │ • Semáforo: VERDE               │
    └──────────────┬──────────────────┘
                   │
                   ▼
    ┌─────────────────────────────────┐
    │ ETAPA 2: VALORACIÓN             │  ⏱️ 10 días
    │ ────────────────────────────    │
    │ • Auto de valoración            │
    │ • Análisis jurídico             │
    │ • ⚠️ Requiere APROBACIÓN JEFE   │
    └──────────────┬──────────────────┘
                   │
                   ▼
    ┌─────────────────────────────────┐
    │ ETAPA 3: INDAGACIÓN             │  ⏱️ 40 días
    │ ────────────────────────────    │
    │ • Auto de indagación            │
    │ • Recolección de pruebas        │
    │ • ⚠️ Requiere APROBACIÓN JEFE   │
    └──────────────┬──────────────────┘
                   │
                   ▼
    ┌─────────────────────────────────┐
    │ ETAPA 4: INVESTIGACIÓN          │  ⏱️ 60 días ⚠️ CAMBIÓ
    │ ────────────────────────────    │
    │ • Pliego de cargos              │
    │ • Recepción de descargos        │
    │ • ⚠️ Requiere APROBACIÓN JEFE   │
    └──────────────┬──────────────────┘
                   │
                   ▼
    ┌─────────────────────────────────┐
    │ ETAPA 5: JUZGAMIENTO            │  ⏱️ 50 días
    │ ────────────────────────────    │
    │ • Audiencia                     │
    │ • Alegatos de conclusión        │
    │ • ⚠️ Requiere APROBACIÓN JEFE   │
    └──────────────┬──────────────────┘
                   │
                   ▼
    ┌─────────────────────────────────┐
    │ ETAPA 6: FALLO                  │  ⏱️ 10 días
    │ ────────────────────────────    │
    │ • Fallo definitivo              │
    │ • Sanción (si aplica)           │
    │ • ⚠️ Requiere APROBACIÓN JEFE   │
    └──────────────┬──────────────────┘
                   │
                   ▼
           ┌───────────────┐
           │  FINALIZADO   │
           └───────────────┘
```

---

## 🚦 SISTEMA DE SEMÁFORO (CRÍTICO)

### Lógica del Semáforo

```
┌────────────────────────────────────────────────────────────────┐
│                      CÁLCULO DEL SEMÁFORO                      │
└────────────────────────────────────────────────────────────────┘

Entrada:
  - fechaInicioEtapaActual: Date
  - diasEstimadosEtapa: number (de configuración)
  - fechaActual: Date

Cálculo:
  diasTranscurridos = (fechaActual - fechaInicioEtapa) / (24 * 60 * 60 * 1000)
  porcentaje = (diasTranscurridos / diasEstimados) * 100

Decisión:
  SI porcentaje >= 100:
    ┌────────────────┐
    │   🔴 ROJO      │  ¡VENCIDO!
    │  Urgente       │
    └────────────────┘
  
  SI porcentaje >= 70 AND porcentaje < 100:
    ┌────────────────┐
    │ 🟡 AMARILLO    │  En riesgo
    │  Atención      │
    └────────────────┘
  
  SI porcentaje < 70:
    ┌────────────────┐
    │  🟢 VERDE      │  En término
    │  Normal        │
    └────────────────┘
```

### Ejemplo Práctico

```
Proceso: PD-2025-0046
Etapa: INVESTIGACIÓN (60 días estimados)
Fecha inicio: 2025-01-01
Fecha actual: 2025-02-20

Cálculo:
  diasTranscurridos = 50 días
  porcentaje = (50 / 60) * 100 = 83.33%

Resultado:
  83.33% >= 70% AND < 100%
  → SEMÁFORO: 🟡 AMARILLO

Mensaje al usuario:
  "Quedan 10 días. Proceso en riesgo de vencimiento."
```

---

## 🔐 MODELO DE DATOS SIMPLIFICADO

### Tablas Principales

```sql
┌─────────────────────────────────────────────────────────────────┐
│                         TABLA: personas                         │
│  (Referencia desde Administración de Personas)                  │
├─────────────────────────────────────────────────────────────────┤
│  id                      UUID PRIMARY KEY                       │
│  nombre                  VARCHAR(200) NOT NULL                  │
│  tipo_identificacion     VARCHAR(5) NOT NULL                    │
│  numero_identificacion   VARCHAR(50) UNIQUE NOT NULL            │
│  email                   VARCHAR(100) NOT NULL                  │
│  telefono                VARCHAR(20)                            │
│  cargo                   VARCHAR(100)                           │
│  territorial             VARCHAR(100) NOT NULL                  │
│  estado                  VARCHAR(20) NOT NULL                   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ Referencias (FK)
                ┌───────────────┼───────────────┐
                │               │               │
                ▼               ▼               ▼
┌───────────────────────────────────────────────────────────────┐
│                 TABLA: noticias_disciplinarias                │
├───────────────────────────────────────────────────────────────┤
│  id                      UUID PRIMARY KEY                     │
│  numero                  VARCHAR(20) UNIQUE ← Auto: ND-2025-N│
│  fecha_recepcion         TIMESTAMP                            │
│  denunciante_id          UUID FK → personas                   │
│  denunciado_id           UUID FK → personas                   │
│  hechos                  TEXT (min 50 chars)                  │
│  estado                  VARCHAR(20) [pendiente|en-valoracion]│
│  dias_pendientes         INTEGER (calculado)                  │
│  fecha_limite            TIMESTAMP (recepcion + 3 días)       │
│  convertida_a_proceso_id UUID FK → procesos                   │
└───────────────────────────────────────────────────────────────┘
                                │
                                │ Conversión
                                ▼
┌───────────────────────────────────────────────────────────────┐
│               TABLA: procesos_disciplinarios                  │
├───────────────────────────────────────────────────────────────┤
│  id                          UUID PRIMARY KEY                 │
│  numero_proceso              VARCHAR(20) UNIQUE ← Auto: PD-N  │
│  noticia_origen_id           UUID FK → noticias               │
│  denunciante_id              UUID FK → personas               │
│  denunciado_id               UUID FK → personas               │
│  profesional_asignado_id     UUID FK → personas ⚠️ REQUERIDO  │
│  etapa_actual                VARCHAR(20) [Recepción|...]      │
│  estado_actual               VARCHAR(20) [En Gestión|...]     │
│  fecha_inicio_etapa_actual   TIMESTAMP                        │
│  dias_transcurridos_etapa    INTEGER                          │
│  dias_restantes_etapa        INTEGER                          │
│  porcentaje_tiempo_etapa     DECIMAL(5,2)                     │
│  semaforo                    VARCHAR(10) [verde|amarillo|rojo]│
│  pendiente_aprobacion        BOOLEAN                          │
│  ultima_actuacion            TEXT                             │
└───────────────────────────────────────────────────────────────┘
                                │
                                │ Relación
                                ▼
┌───────────────────────────────────────────────────────────────┐
│            TABLA: profesionales_disciplinarios                │
├───────────────────────────────────────────────────────────────┤
│  persona_id              UUID PRIMARY KEY FK → personas       │
│  especialidad            VARCHAR(50)                          │
│  capacidad_maxima        INTEGER (default 10)                 │
│  procesos_asignados      INTEGER (calculado)                  │
│  procesos_al_dia         INTEGER (semáforo verde)             │
│  procesos_en_riesgo      INTEGER (semáforo amarillo)          │
│  procesos_vencidos       INTEGER (semáforo rojo)              │
│  estado                  VARCHAR(20) [activo|inactivo|...]    │
└───────────────────────────────────────────────────────────────┘
```

---

## 🔀 FLUJO DE APROBACIÓN DE BORRADORES

```
┌──────────────────────────────────────────────────────────────────┐
│           FLUJO DE APROBACIÓN (Etapas Críticas)                  │
└──────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│ PROFESIONAL     │
│ Termina etapa   │
│ Crea borrador   │
└────────┬────────┘
         │
         │ POST /procesos/{id}/avanzar-etapa
         │ { nuevaEtapa: "Valoración", documentos: [...] }
         │
         ▼
┌──────────────────────────────────────────────────┐
│ BACKEND: ¿Etapa requiere aprobación?            │
│                                                  │
│ CONFIGURACION_ETAPAS.find(                      │
│   e => e.nombre === "Valoración"                │
│ ).requiereAprobacion === true                   │
└────────┬─────────────────────────────┬───────────┘
         │ SÍ                          │ NO
         ▼                             ▼
┌───────────────────────┐    ┌────────────────────┐
│ CREAR BORRADOR        │    │ CAMBIAR ETAPA      │
│ ─────────────────     │    │ DIRECTAMENTE       │
│ • Guardar en BD       │    └────────────────────┘
│ • Estado: pendiente   │
│ • proceso.pendiente_  │
│   aprobacion = true   │
└──────────┬────────────┘
           │
           │ Notificación
           ▼
┌──────────────────────────────────┐
│ JEFE DE CONTROL DISCIPLINARIO    │
│ ───────────────────────────      │
│ • Ve borrador en dashboard       │
│ • Revisa documentos              │
│ • Toma decisión                  │
└──────┬───────────────────────────┘
       │
   ┌───┴────┐
   │        │
   ▼        ▼
┌──────┐  ┌──────┐
│APROBAR│ │RECHAZAR│
└───┬───┘ └───┬───┘
    │         │
    │         ▼
    │    ┌─────────────────────────┐
    │    │ • Mantener etapa actual │
    │    │ • Agregar observaciones │
    │    │ • Notificar profesional │
    │    └─────────────────────────┘
    │
    ▼
┌────────────────────────────────┐
│ • Cambiar etapa del proceso    │
│ • fecha_inicio_etapa = now()   │
│ • Recalcular términos          │
│ • pendiente_aprobacion = false │
│ • Notificar profesional        │
│ • Registrar en histórico       │
└────────────────────────────────┘
```

---

## 📡 ENDPOINTS CRÍTICOS (Resumen)

### Noticias Disciplinarias

```http
# Crear noticia
POST /api/v1/noticias-disciplinarias
Body: { denuncianteId, denunciadoId, hechos, origen }
→ Valida personas existen
→ Genera número ND-YYYY-NNNN
→ Calcula fecha_limite (+3 días)

# Convertir a proceso
POST /api/v1/noticias-disciplinarias/{id}/convertir-proceso
Body: { profesionalAsignadoId }
→ Valida estado = "en-valoracion"
→ Valida capacidad profesional
→ Crea proceso PD-YYYY-NNNN
→ Actualiza noticia estado = "convertida"
→ Incrementa contador profesional
```

### Procesos Disciplinarios

```http
# Listar procesos (con filtros)
GET /api/v1/procesos-disciplinarios?profesionalAsignadoId={id}
→ Retorna SIEMPRE info completa de denunciante/denunciado/profesional
→ Incluye semáforo, días restantes, porcentaje

# Obtener proceso completo
GET /api/v1/procesos-disciplinarios/{id}
→ Incluye documentos, histórico completo

# Avanzar etapa
POST /api/v1/procesos-disciplinarios/{id}/avanzar-etapa
Body: { nuevaEtapa, documentos[] }
→ Valida documentos requeridos
→ Si requiere aprobación: crea borrador
→ Si no: cambia etapa y recalcula términos

# Reasignar profesional
POST /api/v1/procesos-disciplinarios/{id}/reasignar
Body: { nuevoProfesionalId, motivo }
→ Valida capacidad disponible
→ Actualiza contadores
→ Registra en histórico
```

### Profesionales

```http
# Listar profesionales con estadísticas
GET /api/v1/profesionales-disciplinarios
→ Retorna capacidad, procesos asignados, distribución por semáforo

# Asignar profesional al equipo
POST /api/v1/profesionales-disciplinarios
Body: { personaId, especialidad, capacidadMaxima }
→ Valida persona existe en Admin Personas
→ NO crea usuario, solo lo asigna al módulo
```

### Aprobaciones

```http
# Listar borradores pendientes
GET /api/v1/borradores/pendientes

# Aprobar/Rechazar borrador
POST /api/v1/borradores/{id}/aprobar
Body: { accion: "aprobar" | "rechazar", observaciones }
→ Si aprobar: cambia etapa y recalcula
→ Si rechazar: mantiene etapa y notifica
```

---

## ⚙️ JOBS Y TAREAS PROGRAMADAS

### Job 1: Actualización de Términos y Semáforos

```javascript
// Ejecutar CADA HORA
cron.schedule('0 * * * *', async () => {
  
  // 1. Obtener todos los procesos en gestión
  const procesos = await db.procesos
    .where('estado_actual', 'En Gestión');
  
  // 2. Para cada proceso
  for (const proceso of procesos) {
    
    // 2.1 Obtener configuración de etapa
    const config = CONFIGURACION_ETAPAS.find(
      e => e.nombre === proceso.etapa_actual
    );
    
    // 2.2 Calcular días transcurridos
    const hoy = new Date();
    const inicio = new Date(proceso.fecha_inicio_etapa_actual);
    const diasTranscurridos = Math.floor(
      (hoy - inicio) / (1000 * 60 * 60 * 24)
    );
    
    // 2.3 Calcular porcentaje y días restantes
    const porcentaje = (diasTranscurridos / config.diasEstimados) * 100;
    const diasRestantes = Math.max(0, config.diasEstimados - diasTranscurridos);
    
    // 2.4 Determinar semáforo
    let semaforo;
    if (porcentaje >= 100) semaforo = 'rojo';
    else if (porcentaje >= 70) semaforo = 'amarillo';
    else semaforo = 'verde';
    
    // 2.5 Actualizar proceso
    await db.procesos.update(proceso.id, {
      dias_transcurridos_etapa: diasTranscurridos,
      dias_restantes_etapa: diasRestantes,
      porcentaje_tiempo_etapa: porcentaje,
      semaforo: semaforo
    });
    
    // 2.6 Si cambió a ROJO, enviar alerta
    if (semaforo === 'rojo' && proceso.semaforo !== 'rojo') {
      await enviarAlertaProcesoVencido(proceso);
    }
  }
  
  // 3. Actualizar estadísticas de profesionales
  await actualizarEstadisticasProfesionales();
});
```

### Job 2: Alertas Diarias

```javascript
// Ejecutar DIARIO a las 8:00 AM
cron.schedule('0 8 * * *', async () => {
  
  // Procesos próximos a vencer (amarillos con <= 3 días)
  const procesosEnRiesgo = await db.procesos
    .where('semaforo', 'amarillo')
    .where('dias_restantes_etapa', '<=', 3);
  
  for (const proceso of procesosEnRiesgo) {
    await enviarNotificacion({
      tipo: 'alerta_termino',
      destinatarios: [proceso.profesional_asignado_id],
      titulo: 'Proceso próximo a vencer',
      mensaje: `El proceso ${proceso.numero_proceso} vence en ${proceso.dias_restantes_etapa} días`
    });
  }
  
  // Procesos vencidos (rojos)
  const procesosVencidos = await db.procesos
    .where('semaforo', 'rojo');
  
  // Enviar reporte a jefes
  await enviarReporteVencidos(procesosVencidos);
});
```

---

## 🔒 REGLAS DE SEGURIDAD

### Validación CRÍTICA: Personas Existen

```typescript
// ANTES de crear noticia o proceso
async function validarPersonaExiste(personaId: string): Promise<Persona> {
  
  // 1. Consultar módulo de Administración de Personas
  const response = await axios.get(
    `${API_ADMIN_PERSONAS}/api/v1/personas/${personaId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  
  if (!response.data) {
    throw new Error(
      'Persona no encontrada. Debe ser creada primero en Administración de Personas.'
    );
  }
  
  const persona = response.data;
  
  // 2. Validar estado activo
  if (persona.estado === 'inactivo') {
    throw new Error('La persona está inactiva en el sistema');
  }
  
  return persona;
}
```

### Autorización por Rol

```typescript
const PERMISOS = {
  crear_noticia: ['profesional', 'coordinador', 'jefe', 'admin'],
  convertir_noticia: ['coordinador', 'jefe', 'admin'],
  avanzar_etapa_propia: ['profesional', 'coordinador', 'jefe', 'admin'],
  avanzar_etapa_ajena: ['coordinador', 'jefe', 'admin'],
  aprobar_borrador: ['jefe', 'admin'],
  reasignar_proceso: ['coordinador', 'jefe', 'admin'],
  configurar_sistema: ['jefe', 'admin']
};

function autorizar(accion: string) {
  return (req, res, next) => {
    const usuario = req.user;
    
    if (!PERMISOS[accion].includes(usuario.rol)) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para esta acción'
      });
    }
    
    // Validaciones específicas
    if (accion === 'avanzar_etapa_propia' && usuario.rol === 'profesional') {
      // Verificar que sea su proceso
      const proceso = await db.procesos.findById(req.params.id);
      if (proceso.profesional_asignado_id !== usuario.persona_id) {
        return res.status(403).json({
          success: false,
          error: 'Solo puedes avanzar tus propios procesos'
        });
      }
    }
    
    next();
  };
}
```

---

## 📈 ESTADÍSTICAS Y DASHBOARD

### Query para Dashboard Principal

```sql
-- Obtener estadísticas generales
SELECT 
  -- Noticias
  (SELECT COUNT(*) FROM noticias_disciplinarias WHERE estado = 'pendiente') as noticias_pendientes,
  (SELECT COUNT(*) FROM noticias_disciplinarias WHERE estado = 'en-valoracion') as noticias_valoracion,
  
  -- Procesos por etapa
  (SELECT COUNT(*) FROM procesos_disciplinarios WHERE etapa_actual = 'Recepción') as procesos_recepcion,
  (SELECT COUNT(*) FROM procesos_disciplinarios WHERE etapa_actual = 'Valoración') as procesos_valoracion,
  (SELECT COUNT(*) FROM procesos_disciplinarios WHERE etapa_actual = 'Indagación') as procesos_indagacion,
  (SELECT COUNT(*) FROM procesos_disciplinarios WHERE etapa_actual = 'Investigación') as procesos_investigacion,
  (SELECT COUNT(*) FROM procesos_disciplinarios WHERE etapa_actual = 'Juzgamiento') as procesos_juzgamiento,
  (SELECT COUNT(*) FROM procesos_disciplinarios WHERE etapa_actual = 'Fallo') as procesos_fallo,
  
  -- Procesos por semáforo
  (SELECT COUNT(*) FROM procesos_disciplinarios WHERE semaforo = 'verde') as procesos_verde,
  (SELECT COUNT(*) FROM procesos_disciplinarios WHERE semaforo = 'amarillo') as procesos_amarillo,
  (SELECT COUNT(*) FROM procesos_disciplinarios WHERE semaforo = 'rojo') as procesos_rojo,
  
  -- Aprobaciones
  (SELECT COUNT(*) FROM procesos_disciplinarios WHERE pendiente_aprobacion = true) as pendientes_aprobacion,
  
  -- Profesionales
  (SELECT COUNT(*) FROM profesionales_disciplinarios WHERE estado = 'activo') as profesionales_activos,
  (SELECT SUM(procesos_asignados) FROM profesionales_disciplinarios) as total_procesos_asignados,
  (SELECT SUM(capacidad_maxima) FROM profesionales_disciplinarios) as capacidad_total;
```

### Query para Procesos de un Profesional

```sql
-- Obtener procesos filtrados por profesional (PARA KANBAN)
SELECT 
  p.*,
  
  -- Denunciante
  d1.nombre as denunciante_nombre,
  d1.tipo_identificacion as denunciante_tipo_id,
  d1.numero_identificacion as denunciante_numero_id,
  
  -- Denunciado
  d2.nombre as denunciado_nombre,
  d2.tipo_identificacion as denunciado_tipo_id,
  d2.numero_identificacion as denunciado_numero_id,
  
  -- Profesional
  prof.nombre as profesional_nombre,
  prof.tipo_identificacion as profesional_tipo_id,
  prof.numero_identificacion as profesional_numero_id

FROM procesos_disciplinarios p
INNER JOIN personas d1 ON p.denunciante_id = d1.id
INNER JOIN personas d2 ON p.denunciado_id = d2.id
INNER JOIN personas prof ON p.profesional_asignado_id = prof.id

WHERE p.profesional_asignado_id = :profesionalId
  AND p.estado_actual = 'En Gestión'

ORDER BY p.semaforo DESC, p.dias_restantes_etapa ASC;
```

---

## 🧪 TESTING - Casos Críticos

### Test 1: Cálculo de Semáforo

```typescript
describe('Cálculo de Semáforo', () => {
  
  test('Debe ser VERDE con 30% del tiempo', () => {
    const proceso = {
      etapa_actual: 'Investigación',
      fecha_inicio_etapa_actual: new Date('2025-01-01'),
      // Investigación = 60 días
    };
    
    // Simular 18 días transcurridos (30%)
    MockDate.set(new Date('2025-01-19'));
    
    const semaforo = calcularSemaforo(proceso);
    expect(semaforo).toBe('verde');
  });
  
  test('Debe ser AMARILLO con 80% del tiempo', () => {
    const proceso = {
      etapa_actual: 'Investigación',
      fecha_inicio_etapa_actual: new Date('2025-01-01'),
    };
    
    // Simular 48 días transcurridos (80%)
    MockDate.set(new Date('2025-02-18'));
    
    const semaforo = calcularSemaforo(proceso);
    expect(semaforo).toBe('amarillo');
  });
  
  test('Debe ser ROJO con 100% del tiempo', () => {
    const proceso = {
      etapa_actual: 'Investigación',
      fecha_inicio_etapa_actual: new Date('2025-01-01'),
    };
    
    // Simular 60 días transcurridos (100%)
    MockDate.set(new Date('2025-03-02'));
    
    const semaforo = calcularSemaforo(proceso);
    expect(semaforo).toBe('rojo');
  });
});
```

### Test 2: Flujo de Conversión

```typescript
describe('Conversión de Noticia a Proceso', () => {
  
  test('Debe crear proceso correctamente', async () => {
    // Arrange
    const noticia = await crearNoticiaMock();
    const profesional = await crearProfesionalMock();
    
    // Act
    const resultado = await convertirNoticiaProceso(noticia.id, {
      profesionalAsignadoId: profesional.persona_id
    });
    
    // Assert
    expect(resultado.proceso.numero_proceso).toMatch(/PD-2025-\d{4}/);
    expect(resultado.proceso.etapa_actual).toBe('Recepción');
    expect(resultado.proceso.profesional_asignado_id).toBe(profesional.persona_id);
    expect(resultado.noticia.estado).toBe('convertida');
  });
  
  test('Debe fallar si profesional sin capacidad', async () => {
    // Arrange
    const noticia = await crearNoticiaMock();
    const profesional = await crearProfesionalMock({
      procesos_asignados: 12,
      capacidad_maxima: 12
    });
    
    // Act & Assert
    await expect(
      convertirNoticiaProceso(noticia.id, {
        profesionalAsignadoId: profesional.persona_id
      })
    ).rejects.toThrow('capacidad máxima');
  });
});
```

---

## 📦 ESTRUCTURA DE RESPUESTAS API

### Respuesta Exitosa

```json
{
  "success": true,
  "data": {
    // Datos solicitados
  },
  "message": "Operación exitosa",
  "timestamp": "2025-01-30T15:30:00Z"
}
```

### Respuesta con Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Los hechos deben tener mínimo 50 caracteres",
    "field": "hechos",
    "details": {}
  },
  "timestamp": "2025-01-30T15:30:00Z"
}
```

### Respuesta de Lista Paginada

```json
{
  "success": true,
  "data": {
    "items": [ /* array de elementos */ ],
    "pagination": {
      "total": 150,
      "page": 1,
      "limit": 20,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    },
    "stats": {
      // Estadísticas relevantes
    }
  }
}
```

---

## 🚀 CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Base de Datos (Semana 1)
- [ ] Crear schema de PostgreSQL
- [ ] Implementar tablas: personas, noticias, procesos, profesionales
- [ ] Crear índices para performance
- [ ] Configurar constraints y foreign keys
- [ ] Seeds de datos de prueba

### Fase 2: API Core (Semana 2-3)
- [ ] Estructura del proyecto
- [ ] Configuración de Express/FastAPI/Spring
- [ ] Middlewares de autenticación y autorización
- [ ] Endpoints de Noticias (CRUD + conversión)
- [ ] Endpoints de Procesos (CRUD + avanzar + reasignar)
- [ ] Endpoints de Profesionales (CRUD + estadísticas)
- [ ] Validaciones con schemas

### Fase 3: Lógica de Negocio (Semana 4)
- [ ] Cálculo de semáforo
- [ ] Sistema de aprobaciones (borradores)
- [ ] Gestión de capacidad de profesionales
- [ ] Generación de números consecutivos
- [ ] Registro de histórico completo

### Fase 4: Integraciones (Semana 5)
- [ ] Integración con Admin de Personas (API calls)
- [ ] Sistema de notificaciones (email)
- [ ] Almacenamiento de archivos (S3/Azure)
- [ ] Webhooks de sincronización

### Fase 5: Jobs y Automatizaciones (Semana 6)
- [ ] Job de actualización de términos (cada hora)
- [ ] Job de alertas diarias
- [ ] Job de estadísticas
- [ ] Configuración de cron jobs

### Fase 6: Testing y QA (Semana 7)
- [ ] Tests unitarios (servicios)
- [ ] Tests de integración (endpoints)
- [ ] Tests de flujos completos
- [ ] Tests de cálculo de semáforo
- [ ] Carga de prueba (performance)

### Fase 7: Documentación y Deploy (Semana 8)
- [ ] Documentación Swagger/OpenAPI
- [ ] Guía de instalación
- [ ] Scripts de deployment
- [ ] Configuración de CI/CD
- [ ] Monitoreo y logs

---

## 📞 CONTACTO Y SOPORTE

Para dudas o aclaraciones sobre la implementación:

1. **Revisar este documento** y la guía técnica completa
2. **Consultar el código frontend** en `/components/esap/disciplinario/`
3. **Validar con el equipo de frontend** la estructura de datos esperada
4. **Probar con Postman/Insomnia** usando los ejemplos proporcionados

---

**¡Éxito en el desarrollo!** 🚀

*Este documento es un complemento visual de la guía técnica completa.*

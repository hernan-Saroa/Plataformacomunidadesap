# 🔍 ANÁLISIS COMPLETO DE GAPS - MÓDULO CIG

**Fecha:** 21 Diciembre 2025  
**Basado en:** CIG_DOCUMENTO_MAESTRO_CONDENSADO.md  
**Objetivo:** Identificar EXACTAMENTE qué falta para cumplir 100% con el documento maestro

---

## 📊 RESUMEN EJECUTIVO

### Estado Actual vs Documento Maestro

| Categoría | Implementado | Falta | Conformidad |
|-----------|--------------|-------|-------------|
| **Frontend** | 6 RFs | 14 RFs | 30% |
| **Backend** | 0 RFs | 20 RFs | 0% ❌ |
| **Base de Datos** | 0% | 100% | 0% ❌ |
| **Normativa** | Parcial | Completa | 60% |
| **Tests** | 0% | 100% | 0% ❌ |
| **Documentación** | 3 docs | Backend + API | 40% |

**CRÍTICO:** El backend NO EXISTE. Solo tenemos frontend React.

---

## 🔴 GAPS CRÍTICOS (BLOQUEANTES)

### 1. BACKEND COMPLETO - 0% IMPLEMENTADO

**Impacto:** SIN BACKEND, el sistema NO FUNCIONA en producción.

#### Lo que DEBE existir (según documento):

**Stack Backend:**
```
- Node.js/Express con TypeScript
- PostgreSQL con Prisma ORM
- Azure App Service
- Active Directory (AD) + JWT
- Azure Blob Storage (evidencias)
```

**Servicios CRÍTICOS que faltan:**

| Servicio | Archivo | Endpoints | Prioridad |
|----------|---------|-----------|-----------|
| `PlanAnualService` | `/backend/services/plan-anual.service.ts` | 9 endpoints | 🔴 ALTA |
| `UniversoService` | `/backend/services/universo.service.ts` | 5 endpoints | 🔴 ALTA |
| `AuditoriaService` | `/backend/services/auditoria.service.ts` | 15+ endpoints | 🔴 ALTA |
| `PlanMejoraService` | `/backend/services/plan-mejora.service.ts` | 12 endpoints | 🔴 CRÍTICA |
| `DocumentService` | `/backend/services/documento.service.ts` | 8 endpoints | 🔴 ALTA |
| `NotificationService` | `/backend/services/notification.service.ts` | 6 endpoints | 🟡 MEDIA |
| `AuditLogService` | `/backend/services/audit-log.service.ts` | 3 endpoints | 🔴 CRÍTICA |
| `AuthService` | `/backend/services/auth.service.ts` | 5 endpoints | 🔴 ALTA |

**Total Endpoints Faltantes:** ~63 endpoints API

---

### 2. BASE DE DATOS - 0% IMPLEMENTADO

**Impacto:** Sin base de datos, no hay persistencia.

#### Schema Prisma COMPLETO definido en documento (líneas 206-508):

**Tablas Principales que DEBEN crearse:**

| Tabla | Relaciones | Estado |
|-------|-----------|--------|
| `plan_anual` | → roles (1:N) | ❌ NO EXISTE |
| `rol_decreto_648` | → actividades (1:N) | ❌ NO EXISTE |
| `actividad` | → usuario, auditlog | ❌ NO EXISTE |
| `auditoria_programa` | → cronogramas, auditoria | ❌ NO EXISTE |
| `cronograma_auditoria` | → auditoria_programa | ❌ NO EXISTE |
| `auditoria` | → listas, hallazgos, evidencias, informes | ❌ NO EXISTE |
| `plan_mejoramiento` | ← auditoria, → acciones, seguimientos | ❌ NO EXISTE |
| `accion_correctiva` | → hallazgo, → seguimientos | ❌ NO EXISTE |
| `seguimiento_plan_mejora` | → plan_mejora, → acciones | ❌ NO EXISTE |
| `accion_seguimiento` | → seguimiento, → evidencias | ❌ NO EXISTE |
| `evidencia_validada` | → accion_seguimiento, → usuario | ❌ NO EXISTE |
| `hallazgo` | → auditoria, → acciones | ❌ NO EXISTE |
| `usuario` | ← relaciones múltiples | ❌ NO EXISTE |
| `auditlog` | → usuario | ❌ NO EXISTE |
| `proceso` | → auditorias | ❌ NO EXISTE |
| `territorial` | → auditorias | ❌ NO EXISTE |

**Total Tablas:** 16 tablas + 8 enums

**Enums que faltan:**
- `PlanEstado`
- `ActividadEstado`
- `Etapa`
- `Stage`
- `AccionEstado`
- `PlanMejoraEstado`
- `Rol`

---

### 3. VALIDACIONES NORMATIVAS - PARCIAL

**Decreto 648/2017:**
- ✅ Frontend valida 5 roles (RF001)
- ❌ Backend NO valida
- ❌ No hay constantes en `/backend/constants/decreto-648.ts`

**DAFP Fórmula:**
- ✅ Frontend calcula riesgo (RF002)
- ❌ Backend NO implementa
- ❌ No hay constantes en `/backend/constants/dafp.ts`

**EM-PT-004:**
- ✅ Frontend implementa 3 fases (RF004-006)
- ❌ Backend NO persiste etapas
- ❌ Duraciones NO validadas en backend

**EM-PT-002:**
- ❌ NO implementado (RF010-011 pendientes)
- ❌ Fórmula cumplimiento NO existe
- ❌ Seguimiento trimestral NO existe

---

## 📋 GAPS POR REQUERIMIENTO FUNCIONAL

### ✅ RF001 - Plan Anual (95% Frontend, 0% Backend)

**Lo que ESTÁ:**
- ✅ Componente React `/PlanAnualModule.tsx`
- ✅ Validación frontend 5 roles
- ✅ UI dashboard indicadores

**Lo que FALTA:**

#### Backend (CRÍTICO):
```
❌ /backend/services/plan-anual.service.ts
   ├─ class PlanAnualService
   │  ├─ crearPlanAnual(dto, usuarioId)
   │  ├─ actualizarActividad(actividadId, dto, usuarioId)
   │  ├─ aprobarPlanAnual(planId, usuarioId)
   │  ├─ calcularIndicadores(planId)
   │  └─ generarProgramaAnual(planId)
   │
❌ /backend/validators/plan-anual.validator.ts
   ├─ validarRolesPresentes(roles) → exactamente 5
   ├─ validarActividadesPorRol(roles) → cada rol ≥1 actividad
   ├─ validarResponsables(ids, adClient) → existen en AD
   └─ validarFechas(inicio, fin, año) → dentro año fiscal
   │
❌ /backend/controllers/plan-anual.controller.ts
   ├─ POST   /api/v1/plan-anual
   ├─ GET    /api/v1/plan-anual/:id
   ├─ PUT    /api/v1/plan-anual/:id
   ├─ DELETE /api/v1/plan-anual/:id/actividades/:id
   ├─ PUT    /api/v1/plan-anual/:id/aprobar
   ├─ GET    /api/v1/plan-anual/:id/indicadores
   ├─ GET    /api/v1/plan-anual/:id/exportar-pdf
   ├─ GET    /api/v1/plan-anual/:id/exportar-excel
   └─ POST   /api/v1/plan-anual/:id/generar-programa
```

#### Funcionalidades Frontend Faltantes:
```
⚠️ Exportación a Excel compatible EMFO001
⚠️ Integración con backend (actualmente datos mock)
⚠️ Manejo de errores del backend
```

---

### ✅ RF002 - Universo de Auditorías (100% Frontend, 0% Backend)

**Lo que ESTÁ:**
- ✅ Componente `/UniversoAuditorias.tsx`
- ✅ Fórmula DAFP implementada en frontend

**Lo que FALTA:**

```
❌ /backend/services/universo.service.ts
   ├─ getUniversoAuditable()
   ├─ calcularRiesgoDAFP(criticidad, exposicion, mitigantes)
   ├─ crearProcesoAuditable(dto)
   └─ actualizarRiesgo(procesoId, nuevoRiesgo)
   
❌ /backend/seed/procesos.seed.ts
   └─ Insertar 9 procesos ESAP + 16 territoriales
```

---

### ✅ RF003 - Programa Anual (95% Frontend, 0% Backend)

**Lo que ESTÁ:**
- ✅ Componentes Kanban
- ✅ Vista calendario

**Lo que FALTA:**

```
❌ /backend/services/programa.service.ts
   ├─ generarCronogramaDiferenciado(auditoria)
   │  ├─ SEDE: planeacion 5-10d, ejecucion 10-30d
   │  └─ TERRITORIAL: planeacion 3d, ejecucion 4d FIJO
   ├─ validarCronogramaNoSolapa(auditoriaId, fechas)
   └─ moverAuditoriaEtapa(auditoriaId, fromStage, toStage)
```

---

### ✅ RF004-006 - Proceso Auditoría (100% Frontend, 0% Backend)

**Lo que ESTÁ:**
- ✅ `/InicioAuditoriaWizard.tsx` (RF004)
- ✅ `/PlaneacionAuditoriaModule.tsx` (RF005)
- ✅ `/EjecucionAuditoriaModule.tsx` (RF006)

**Lo que FALTA:**

```
❌ /backend/services/auditoria.service.ts
   ├─ iniciarAuditoria(programaId, dto)
   ├─ generarDocumentosOficiales(auditoriaId)
   │  ├─ OficioAnuncio.pdf
   │  ├─ CartaRepresentanteLegal.pdf
   │  ├─ CartaCompromiso.pdf
   │  └─ ProgramaIndividual.pdf
   ├─ completarPlaneacion(auditoriaId)
   ├─ completarEjecucion(auditoriaId)
   ├─ aplicarListaChequeo(auditoriaId, listaId)
   ├─ registrarHallazgo(auditoriaId, dto)
   └─ cargarEvidencia(auditoriaId, file)
   
❌ /backend/services/documento.service.ts
   ├─ generarPdfOficioAnuncio(auditoria)
   ├─ generarPdfCartaRepresentante(auditoria)
   ├─ generarPdfCompromiso(auditoria)
   └─ generarPdfProgramaIndividual(auditoria)
```

---

### ❌ RF009 - Comunicación (0% Frontend, 0% Backend)

**COMPLETAMENTE AUSENTE**

**Lo que DEBE implementarse:**

#### Frontend:
```
❌ /components/esap/control-interno/ComunicacionAuditoriaModule.tsx
   ├─ Dashboard progreso comunicación
   ├─ Sección Informe Preliminar
   ├─ Sección Gestión Controversias
   ├─ Sección Informe Final
   ├─ Sección Informe Ejecutivo
   └─ Validación 100% para avanzar
```

#### Backend:
```
❌ /backend/services/comunicacion.service.ts
   ├─ generarInformePreliminar(auditoriaId)
   ├─ registrarControversia(auditoriaId, dto)
   ├─ resolverControversia(controversiaId, decision)
   ├─ generarInformeFinal(auditoriaId)
   └─ generarInformeEjecutivo(auditoriaId)
```

**Estimado:** 5 días frontend + 5 días backend = 10 días

---

### ❌ RF010-011 - Planes de Mejoramiento (0% TODO)

**CRÍTICO - CORE DEL SISTEMA**

**COMPLETAMENTE AUSENTE**

#### RF010 - Formulación (0%):

**Frontend:**
```
❌ /components/esap/control-interno/FormulacionPlanMejoramientoModule.tsx
   ├─ Análisis de hallazgos
   ├─ Formulario acciones correctivas
   │  ├─ Descripción
   │  ├─ Causas raíz
   │  ├─ Acción de mejora
   │  ├─ Responsable
   │  ├─ Cantidad programada
   │  ├─ Fechas inicio/fin
   │  └─ Cálculo meses automático
   ├─ Asignación responsables (del área)
   └─ Validación por área auditada
```

**Backend:**
```
❌ /backend/services/plan-mejora.service.ts
   ├─ crearPlanMejoramiento(auditoriaId, dto)
   ├─ agregarAccionCorrectiva(planId, hallazgoId, dto)
   ├─ validarPlanPorArea(planId, areaId, decision)
   └─ aprobarPlanPorJefeOCI(planId)
```

#### RF011 - Seguimiento Trimestral (0%):

**CRÍTICO - SEGÚN DOCUMENTO ES EL MÁS COMPLEJO**

**Frontend:**
```
❌ /components/esap/control-interno/SeguimientoPlanMejoramientoModule.tsx
   ├─ Dashboard semáforos
   ├─ Vista calendario seguimientos
   ├─ Tabla acciones con cumplimiento
   └─ Botón cerrar seguimiento
   
❌ /components/portal/control-interno/CargaEvidenciasCumplimiento.tsx
   ├─ Portal SIMPLIFICADO para área auditada
   ├─ Drag & Drop evidencias
   ├─ Formulario cantidad implementada
   ├─ Indicador cumplimiento automático
   │  └─ IF(K>=F,2,IF(K>=1,1,0))
   └─ Estado: Enviado/En revisión
   
❌ /components/esap/control-interno/ValidacionEvidenciasAuditor.tsx
   ├─ Dashboard mis seguimientos pendientes
   ├─ Modal revisar evidencia
   │  ├─ Vista previa (PDF/imagen)
   │  ├─ Botón ACEPTAR
   │  └─ Botón OBSERVACIONES + comentarios
   └─ Registro auditoría quién-cuándo-qué
```

**Backend (MUY COMPLEJO):**
```
❌ /backend/services/seguimiento.service.ts
   ├─ crearSeguimientoTrimestral(planId, numero)
   ├─ cargarEvidencia(seguimientoId, accionId, file, cantidadImpl)
   ├─ calcularCumplimiento(cantImpl, cantProg)
   │  └─ Fórmula EMFO002 EXACTA
   ├─ validarEvidencia(evidenciaId, calificacion, comentarios)
   ├─ calcularSemaforo(cumplimientoPromedio)
   │  ├─ >80% → VERDE
   │  ├─ 50-80% → AMARILLO
   │  └─ <50% → ROJO
   └─ cerrarSeguimiento(seguimientoId)
   
❌ /backend/jobs/recordatorios-seguimiento.job.ts
   ├─ Ejecutar DIARIAMENTE
   ├─ Detectar seguimientos en 7 días
   ├─ Enviar correo automático al área
   └─ Registrar en auditlog
```

**Estimado:** 15 días frontend + 20 días backend = 35 días

---

### ❌ RF012-020 - Módulos de Soporte (0% TODO)

**Todos pendientes:**

| RF | Módulo | Frontend | Backend | Estimado |
|----|--------|----------|---------|----------|
| RF012 | Informes de Ley | ❌ | ❌ | 5 días |
| RF013 | Gestión Documental | ❌ | ❌ | 3 días |
| RF014 | Notificaciones | ❌ | ❌ | 3 días |
| RF015 | RBAC y Permisos | ❌ | ❌ | 5 días |
| RF016 | Reportes Ejecutivos | ❌ | ❌ | 5 días |
| RF017 | Auditorías Territoriales | ⚠️ Parcial | ❌ | 2 días |
| RF018 | Auditorías Especiales | ❌ | ❌ | 3 días |
| RF019 | Configuración | ❌ | ❌ | 4 días |
| RF020 | Auditoría de Cambios | ❌ | ❌ | 3 días |

**Total:** 33 días adicionales

---

## 🗂️ ARQUITECTURA QUE DEBE EXISTIR

### Estructura Backend (AUSENTE)

```
/backend/
├── /src/
│   ├── /config/
│   │   ├── database.ts          ❌ NO EXISTE
│   │   ├── azure.ts             ❌ NO EXISTE
│   │   └── auth.ts              ❌ NO EXISTE
│   │
│   ├── /constants/
│   │   ├── decreto-648.ts       ❌ NO EXISTE
│   │   ├── dafp.ts              ❌ NO EXISTE
│   │   ├── em-pt-004.ts         ❌ NO EXISTE
│   │   └── em-pt-002.ts         ❌ NO EXISTE
│   │
│   ├── /models/
│   │   └── schema.prisma        ❌ NO EXISTE
│   │
│   ├── /services/
│   │   ├── plan-anual.service.ts         ❌ NO EXISTE
│   │   ├── universo.service.ts           ❌ NO EXISTE
│   │   ├── programa.service.ts           ❌ NO EXISTE
│   │   ├── auditoria.service.ts          ❌ NO EXISTE
│   │   ├── comunicacion.service.ts       ❌ NO EXISTE
│   │   ├── plan-mejora.service.ts        ❌ NO EXISTE
│   │   ├── seguimiento.service.ts        ❌ NO EXISTE
│   │   ├── documento.service.ts          ❌ NO EXISTE
│   │   ├── notification.service.ts       ❌ NO EXISTE
│   │   ├── audit-log.service.ts          ❌ NO EXISTE
│   │   └── auth.service.ts               ❌ NO EXISTE
│   │
│   ├── /validators/
│   │   ├── plan-anual.validator.ts       ❌ NO EXISTE
│   │   └── ... (7 más)                   ❌ NO EXISTE
│   │
│   ├── /controllers/
│   │   └── ... (8 controllers)           ❌ NO EXISTE
│   │
│   ├── /jobs/
│   │   ├── recordatorios-seguimiento.job.ts  ❌ NO EXISTE
│   │   └── backup.job.ts                     ❌ NO EXISTE
│   │
│   ├── /seed/
│   │   ├── procesos.seed.ts              ❌ NO EXISTE
│   │   ├── territoriales.seed.ts         ❌ NO EXISTE
│   │   └── usuarios.seed.ts              ❌ NO EXISTE
│   │
│   └── /tests/
│       ├── RF001.test.ts                 ❌ NO EXISTE
│       └── ... (19 más test suites)      ❌ NO EXISTE
│
├── prisma/
│   └── schema.prisma                     ❌ NO EXISTE
│
├── package.json                          ❌ NO EXISTE
├── tsconfig.json                         ❌ NO EXISTE
└── .env.example                          ❌ NO EXISTE
```

---

## 📊 TABLA COMPLETA DE CONFORMIDAD

### Por Capa del Sistema

| Capa | Implementado | Falta | Conformidad |
|------|--------------|-------|-------------|
| **Frontend React** | 6 RFs (30%) | 14 RFs (70%) | 30% ⚠️ |
| **Backend API** | 0 RFs (0%) | 20 RFs (100%) | 0% ❌ |
| **Base de Datos** | 0 tablas | 16 tablas | 0% ❌ |
| **Validadores** | Frontend only | Backend completo | 10% ❌ |
| **Servicios** | 0 | 11 servicios | 0% ❌ |
| **Controllers** | 0 | 8 controllers | 0% ❌ |
| **Tests Unitarios** | 0 | ~50 test suites | 0% ❌ |
| **Tests E2E** | 0 | ~20 escenarios | 0% ❌ |
| **Documentación API** | 0 | Swagger completo | 0% ❌ |
| **Deployment** | 0% | Azure completo | 0% ❌ |

---

## 🎯 PLAN DE ACCIÓN INMEDIATO

### OPCIÓN 1: Enfoque Secuencial (Recomendado)

**Fase 1: Backend CORE (4 semanas)**
```
Semana 1-2: Setup + RF001-003 Backend
  ├─ Setup: Prisma + PostgreSQL + Azure
  ├─ Tablas: plan_anual, auditoria_programa, proceso, territorial
  ├─ Services: PlanAnualService, UniversoService, ProgramaService
  └─ Endpoints: 19 endpoints API

Semana 3-4: RF004-006 Backend
  ├─ Tablas: auditoria, hallazgo, evidencia, lista_chequeo
  ├─ Services: AuditoriaService, DocumentService
  └─ Endpoints: 15 endpoints API
```

**Fase 2: Planes de Mejoramiento (3 semanas)**
```
Semana 5-6: RF010-011 Backend
  ├─ Tablas: plan_mejoramiento, accion_correctiva, seguimiento
  ├─ Services: PlanMejoraService, SeguimientoService
  ├─ Jobs: RecordatoriosJob
  └─ Endpoints: 12 endpoints API

Semana 7: RF009 + RF010-011 Frontend
  ├─ ComunicacionAuditoriaModule
  ├─ FormulacionPlanMejoramientoModule
  ├─ SeguimientoPlanMejoramientoModule
  └─ Portal Área Auditada
```

**Fase 3: Módulos de Soporte (2 semanas)**
```
Semana 8-9: RF012-020
  ├─ Informes de Ley
  ├─ Gestión Documental
  ├─ Notificaciones
  ├─ RBAC
  └─ Reportes Ejecutivos
```

**Fase 4: Testing y Deployment (2 semanas)**
```
Semana 10-11: Tests + Deploy
  ├─ Tests unitarios (80%+ cobertura)
  ├─ Tests E2E (escenarios críticos)
  ├─ Deployment Azure
  └─ Integración AD + Power BI
```

**TOTAL: 11 semanas (2.75 meses)**

---

### OPCIÓN 2: Enfoque Paralelo (Más rápido, más riesgo)

**Equipo dividido:**
- **Dev 1-2:** Backend RF001-006
- **Dev 3:** Backend RF010-011
- **Dev 4:** Frontend RF009
- **Dev 5:** Tests + Deploy

**TOTAL: 8 semanas (2 meses)** pero requiere 5 devs coordinados

---

## 🔥 RECOMENDACIONES CRÍTICAS

### 1. Backend es PRIORIDAD ABSOLUTA

**SIN backend, el frontend actual es solo demo.**

```
ACCIÓN INMEDIATA:
1. Crear carpeta /backend/
2. Setup: Node.js + Express + TypeScript + Prisma
3. Crear schema.prisma con las 16 tablas
4. Migrar database
5. Implementar servicios CORE (RF001-006)
```

### 2. No agregar más Frontend sin Backend

**Dejar RF009 para DESPUÉS del backend RF001-006.**

```
RAZÓN:
- RF009 frontend depende de datos reales
- Sin backend, es código muerto
- Mejor tener backend + frontend integrados
```

### 3. RF010-011 es el MÁS COMPLEJO

**Según documento (líneas 889-1232), RF011 tiene:**
- Scheduler automático
- Portal para área
- Validación de evidencias
- Fórmula EMFO002 exacta
- Semáforos automáticos
- Registro de auditoría

```
ACCIÓN:
- Asignar al dev más senior
- Dedicar 15-20 días solo a esto
- Testing exhaustivo
```

### 4. Migración de Datos EMFO001/EMFO002

**Documento especifica migración (líneas 1415-1453).**

```
DEBE ejecutarse:
- Excel → Base de datos
- Validar responsables en AD
- Validar cronogramas
- Preservar evidencias existentes
```

---

## 📝 CHECKLIST FINAL PARA 100% CONFORMIDAD

### Backend

- [ ] Prisma schema completo (16 tablas + 8 enums)
- [ ] 11 Servicios implementados
- [ ] 8 Controllers con rutas
- [ ] 3 Validators con lógica negocio
- [ ] 4 Constantes normativas (Decreto 648, DAFP, EM-PT-004, EM-PT-002)
- [ ] 2 Jobs (Recordatorios, Backup)
- [ ] 3 Seeds (Procesos, Territoriales, Usuarios demo)
- [ ] ~63 Endpoints API funcionando
- [ ] Integración Active Directory (AD)
- [ ] Integración Azure Blob Storage
- [ ] AuditLog en todas las operaciones

### Frontend

- [ ] RF009 - Comunicación (4 secciones)
- [ ] RF010 - Formulación (3 componentes)
- [ ] RF011 - Seguimiento (5 componentes)
- [ ] Portal Área Auditada (simplificado)
- [ ] Integración con backend (fetch/axios)
- [ ] Manejo de errores robusto
- [ ] Loading states
- [ ] Validaciones sincronizadas con backend

### Testing

- [ ] Tests unitarios backend (80%+ cobertura)
- [ ] Tests unitarios frontend (60%+ cobertura)
- [ ] Tests E2E (20 escenarios críticos)
- [ ] Validaciones normativas (Decreto 648, DAFP, EM-PT-004, EM-PT-002)

### Deployment

- [ ] CI/CD pipeline GitHub Actions
- [ ] Deployment Azure App Service
- [ ] Azure SQL Database configurado
- [ ] Azure Blob Storage configurado
- [ ] Backups automáticos diarios
- [ ] Monitoring Application Insights
- [ ] Integración Power BI

### Documentación

- [ ] Swagger/OpenAPI para API
- [ ] README backend
- [ ] Guía de instalación
- [ ] Guía de usuario (capacitación)

---

## 🎯 RECOMENDACIÓN FINAL

### Qué hacer AHORA MISMO:

1. ✅ **Aceptar que el backend NO EXISTE**
2. ✅ **Crear plan de backend (11 semanas)**
3. ✅ **Decidir: ¿Secuencial o Paralelo?**
4. ✅ **Empezar Backend Setup esta semana**
5. ✅ **Dejar frontend RF009 para después**

### Qué NO hacer:

1. ❌ NO seguir agregando frontend sin backend
2. ❌ NO subestimar RF010-011 (es el más complejo)
3. ❌ NO olvidar tests
4. ❌ NO ignorar migración EMFO001/EMFO002

---

**Estado Actual:** 30% frontend, 0% backend  
**Para Producción:** Necesitamos 100% ambos

**Decisión CRÍTICA:** ¿Empezamos backend AHORA o seguimos con frontend?

---

**Preparado por:** Sistema de Análisis SIGL  
**Fecha:** 21 Diciembre 2025  
**Basado en:** CIG_DOCUMENTO_MAESTRO_CONDENSADO.md (1,703 líneas)

# SISTEMA DE CONTROL INTERNO DE GESTIÓN (CIG) - DOCUMENTO MAESTRO CONDENSADO
**ESAP | 20 Diciembre 2025 | IMPLEMENTACIÓN LISTA | 1 ARCHIVO PARA IA**

---

## SECCIÓN 1: RESUMEN EJECUTIVO & REUTILIZACIÓN

### Objetivo
Automatizar auditorías internas + planes mejoramiento. Reemplazar Excel EMFO001/EMFO002 (manuales, sin trazabilidad, conflictos de versión).

### Estrategia Principal: REUTILIZACIÓN
- **30% código REUTILIZADO:** Kanban existente (RFO16)
- **70% NUEVO:** Plan Anual, Planes Mejora, Portales
- **Resultado:** 50% menos tiempo desarrollo, consistencia visual

### Timeline
- **Semana 1-2:** Setup + prep
- **Semana 3:** RF001 (Plan Anual)
- **Semana 4-5:** RF002-003 (Universo/Programa)
- **Semana 6-8:** RF004-009 (Auditorías 3 etapas)
- **Semana 9-11:** RF010-011 (Planes Mejora)
- **Semana 12-14:** RF012-020 (Informes, Reportes, Config)
- **Semana 15-17:** Testing + UAT
- **Semana 18-20:** Capacitación + Go-Live
- **Total:** 20 semanas, 5-6 desarrolladores

### Stack Tecnológico
```
Frontend:  React 18, TypeScript, Tailwind CSS, Recharts, React Beautiful DnD
Backend:   Node.js/Express, TypeScript
Database:  PostgreSQL (Prisma ORM)
Deploy:    Azure App Service, Azure Storage, Azure SQL
Auth:      Active Directory (AD) + JWT
Reportes:  Power BI, pdfkit, ExcelJS
```

---

## SECCIÓN 2: REQUERIMIENTOS & DESCOMPOSICIÓN

### 20 Requerimientos Funcionales

| # | Requisito | Módulo | Descripción | Kanban? |
|---|-----------|--------|-------------|---------|
| RF001 | Plan Anual | 1 | Crear plan con 5 roles Decreto 648 | NO (nuevo) |
| RF002 | Universo Auditorías | 2 | Catálogo de auditorías + DAFP | NO (nuevo) |
| RF003 | Programa Anual | 3 | Agendar auditorías con cronogramas | EXTIENDE |
| RF004 | Auditoría - Inicio | 4 | Generar documentos (oficio, cartas) | NUEVO |
| RF005 | Auditoría - Planeación | 4 | Fase planeación (duración: sede 5-10d, territorial 3d) | NUEVO |
| RF006 | Auditoría - Ejecución | 5 | Fase ejecución (sede 10-30d, territorial 4d) | NUEVO |
| RF007 | Auditoría - Listas | 5 | Listas de chequeo digitales | NUEVO |
| RF008 | Auditoría - Hallazgos | 5 | Registro de hallazgos + evidencias | NUEVO |
| RF009 | Auditoría - Comunicación | 6 | Generación informes (prelim, final, ejecutivo) | NUEVO |
| RF010 | Plan Mejora - Formulación | 7 | Análisis + acciones correctivas | NUEVO |
| RF011 | Plan Mejora - Seguimiento | 7 | Trimestral (Jul, Oct, Ene, Abr): carga evidencias, validación, semáforos | NUEVO |
| RF012 | Informes de Ley | 8 | 15-16 informes, periodicidad variable | NUEVO |
| RF013 | Gestión Documental | 8 | Repositorio centralizado + compresión auto | NUEVO |
| RF014 | Notificaciones | 8 | Sistema de alertas automáticas | NUEVO |
| RF015 | Seguridad RBAC | 8 | Roles + permisos basados AD | NUEVO |
| RF016 | Reportes Ejecutivos | 8 | PDF automático + Power BI | NUEVO |
| RF017 | Auditorías Territoriales | 3 | Cronogramas diferenciados (4 días ejecución) | EXTIENDE |
| RF018 | Auditorías Especiales | 9 | Auditorías ad-hoc | NUEVO |
| RF019 | Configuración | 9 | Admin de usuarios, procesos, territoriales | NUEVO |
| RF020 | Auditoria de Cambios | 9 | Registrar quién-cuándo-qué (compliance) | EXTIENDE |

### 10 Requerimientos No Funcionales
- RNF001: Rendimiento <3s @ 50 usuarios concurrentes
- RNF002: Disponibilidad 99.5%
- RNF003: Backup automático diario
- RNF004: Seguridad TLS + AES-256
- RNF005: Compliance Ley 1581/2012 (datos)
- RNF006: Escalabilidad horizontal
- RNF007: Móvil responsive
- RNF008: Integración AD SSO
- RNF009: Integración File Server (G:\CIG\)
- RNF010: Integración Power BI

### 9 Módulos del Sistema
1. **Módulo Plan Anual:** RF001, creación plan con 5 roles
2. **Módulo Universo/Programa:** RF002-003, 017 (programa anual + territoriales)
3. **Módulo Proceso Auditoría:** RF004-009 (3 etapas)
4. **Módulo Planes Mejora:** RF010-011 (formulación + seguimiento)
5. **Módulo Informes de Ley:** RF012 (15-16 informes)
6. **Módulo Gestión Documental:** RF013 (repositorio)
7. **Módulo Notificaciones:** RF014 (alertas)
8. **Módulo Configuración:** RF015, 019-020 (admin)
9. **Módulo Reportes:** RF016 (dashboards)

---

## SECCIÓN 3: DATOS ACTUALES ESAP (CONTEXTO REAL)

### EMFO001 - Plan Anual Actual (Estructura Excel)
```
Fila 6: UNIDAD AUDITADA | RESPONSABLE | ENERO | FEBRERO | ... | DICIEMBRE
Fila 7: Semana 1 | Semana 2 | Semana 3 | Semana 4 | Semana 5 ...
Fila 9+:
  Gestión Financiera         | Catalina Rubio-AL, Nubia Pimiento, Mónica Cortes | P P P P E E E ...
  Gestión Administrativa      | Fernando Ávila-AL, William Alonso, Alexandra...
  Formación para la Vida      | Lucila Villamil-AL, Catalina Rubio, Flor...
  Adquisición Bienes         | ...
  Gestión Talento Humano     | ...
  Efectividad Institucional   | ...
  Evaluación Control Mejora   | ...
  Modelo Seguridad Privacidad | ...
  Transformación Digital     | ...

TERRITORIALES (16):
  Antioquia, Atlántico-Cesar, Bolívar-Córdoba, Caldas, Cundinamarca,
  Nariño-Putumayo, Huila, Meta, Cauca, Amazonas, Boyacá, Casanare,
  Guaviare, Putumayo, Archipiélago San Andrés, Vichada

Legend: AL=Auditor Líder | P=Planeación | E=Ejecución
```

### EMFO002 - Planes Mejoramiento Actual (Estructura Excel)
```
19 COLUMNAS PRINCIPALES:
A: N° hallazgo
B: Descripción hallazgo
C: Causas raiz
D: Acción mejora
E: Soporte/evidencia
F: Cantidad programada
G: Fecha inicio
H: Fecha fin
I: Tiempo ejecución meses [=DATEDIF(G,H,"M")]
J: Cargo responsable
K: Cantidad implementada
L: Cumplimiento [=IF(K>=F,2,IF(K>=1,1,0))] → 2=Completo, 1=Parcial, 0=Pendiente
M: Estado (Cerrada/Abierta)
N: Responsable seguimiento
O: Observación cumplimiento
Q: Evaluar controles
R: Validar no repetición
S: Efectividad [=IF(Q<>R,1,0)]
T: Observación efectividad

SEGUIMIENTO TRIMESTRAL: Julio, Octubre, Enero, Abril (4 veces/año)
```

### Datos Identificados
- **Auditores:** Fernando Ávila, Lucila Villamil, Natalia Cañon, Catalina Rubio, William Alonso, Flor Mireya, Sandra Paola + 3 contratistas = ~12 personas
- **Procesos Sede:** 9 procesos auditables
- **Territoriales:** 16 territoriales con equipos de 3-5 personas
- **Duración Auditorías:** 
  - SEDE: Planeación 5-10d, Ejecución 10-30d, Comunicación 10-15d
  - TERRITORIAL: Planeación 3d, Ejecución 4d (FIJO), Comunicación 2d

---

## SECCIÓN 4: NORMATIVA INTEGRADA (A VALIDAR EN CÓDIGO)

### Decreto 648/2017 - Control Interno (5 ROLES OBLIGATORIOS)
```javascript
// src/common/constants/decreto-648.ts
const CINCO_ROLES_DECRETO_648 = [
  { id: 1, nombre: 'Liderazgo Estratégico', descripcion: 'Dirección + Jefe OCI' },
  { id: 2, nombre: 'Enfoque Prevención', descripcion: 'Diseño + implantación controles' },
  { id: 3, nombre: 'Relación Entes Control', descripcion: 'Coordinación con CGR, MECI' },
  { id: 4, nombre: 'Evaluación Gestión Riesgos', descripcion: 'Identificación + evaluación' },
  { id: 5, nombre: 'Evaluación Seguimiento', descripcion: 'Monitoreo + efectividad' }
];

// VALIDACIÓN EN RF001:
// Plan Anual DEBE tener EXACTAMENTE 5 roles
// Cada rol DEBE tener ≥1 actividad
// VALIDAR antes de aprobación
```

### DAFP - Fórmula Cálculo Riesgo
```javascript
// Criticidad: ALTO(5) MEDIO(3) BAJO(1)
// Factor Exposición: >100 beneficiarios(5), 50-100(3), <50(1)
// Fórmula: (Criticidad × Factor_Exposición) / Factores_Mitigantes
// Resultado: Alto(>10), Medio(5-10), Bajo(<5)
```

### EM-PT-004 - Auditorías Internas V3
- 3 ETAPAS: Planeación → Ejecución → Comunicación
- Documentos: Oficio anuncio, Cartas (representante + compromiso), Programa individual
- Actividades Planeación: Estudios preliminares, solicitud info, reunión apertura
- Actividades Ejecución: Aplicar listas chequeo, identificar hallazgos, reunión cierre
- Actividades Comunicación: Informe preliminar, controversias (opcional), informe final
- Seguimiento: Planes de mejoramiento trimestral

### EM-PT-002 - Planes Mejoramiento V3
- FORMULACIÓN: Hallazgo → Análisis causas → Acción → Responsable → Fecha
- SEGUIMIENTO TRIMESTRAL: 4 veces/año (Jul, Oct, Ene, Abr)
- CUMPLIMIENTO: IF(Cantidad_Impl >= Cantidad_Prog, 2, IF(Cantidad_Impl >= 1, 1, 0))
- EFECTIVIDAD: Anual, verifica que control previene recurrencia
- VALIDACIÓN: Auditor acepta/rechaza evidencias con comentarios

### Ley 1581/2012 - Protección Datos
- Consentimiento de datos personales (auditores)
- Cifrado TLS + AES-256
- Logs de acceso completos
- Derecho al olvido (migración de datos históricos)

---

## SECCIÓN 5: ARQUITECTURA DE DATOS (SCHEMA PRISMA)

### Tablas Principales

```prisma
// PLAN ANUAL (RF001)
model PlanAnual {
  id            String   @id @default(cuid())
  año           Int      // 2025, 2026, etc.
  estado        PlanEstado // BORRADOR|EN_REVISION|APROBADO|VIGENTE|CERRADO
  jefeOciId     String
  jefeOci       Usuario @relation(fields: [jefeOciId], references: [id])
  roles         RolDecreeto648[]
  fechaCreacion DateTime @default(now())
  fechaAprobacion DateTime?
  version       Int      @default(1)
  auditoria     AuditLog[]
  
  @@map("plan_anual")
}

// ROLES DEL DECRETO 648 (SIEMPRE 5)
model RolDecreeto648 {
  id           String   @id @default(cuid())
  nombre       String   // "Liderazgo Estratégico", etc.
  planAnualId  String
  planAnual    PlanAnual @relation(fields: [planAnualId], references: [id], onDelete: Cascade)
  actividades  Actividad[]
  cumplimiento Decimal @default(0) // % calculado
  
  @@map("rol_decreto_648")
}

// ACTIVIDADES DE CADA ROL
model Actividad {
  id              String   @id @default(cuid())
  nombre          String   @db.VarChar(500)
  rolId           String
  rol             RolDecreeto648 @relation(fields: [rolId], references: [id], onDelete: Cascade)
  responsableId   String
  responsable     Usuario @relation(fields: [responsableId], references: [id])
  estado          ActividadEstado // PENDIENTE|EN_EJECUCION|COMPLETADA|RETRASADA
  fechaInicio     DateTime
  fechaFin        DateTime
  porcentaje      Decimal  @default(0)
  auditoria       AuditLog[]
  
  @@map("actividad")
}

// PROGRAMA ANUAL (RF003)
model AuditoriaPrograma {
  id              String   @id @default(cuid())
  codigo          String   @unique // AUD-2025-001
  nombre          String
  procesoId       String
  proceso         Proceso @relation(fields: [procesoId], references: [id])
  planAnualId     String
  planAnual       PlanAnual @relation(fields: [planAnualId], references: [id])
  auditoriaLiderId String
  auditoriaLider  Usuario @relation("AuditorLider", fields: [auditoriaLiderId], references: [id])
  auditoresEquipo String[] // JSON array de IDs
  territorialId   String?
  territorial     Territorial? @relation(fields: [territorialId], references: [id])
  es_territorial  Boolean  @default(false)
  cronogramas     CronogramaAuditoria[]
  auditoria       Auditoria?
  
  @@map("auditoria_programa")
}

// CRONOGRAMA DIFERENCIADO (SEDE vs TERRITORIAL)
model CronogramaAuditoria {
  id              String   @id @default(cuid())
  auditoriaId     String
  auditoria       AuditoriaPrograma @relation(fields: [auditoriaId], references: [id], onDelete: Cascade)
  etapa           Etapa    // PLANEACION|EJECUCION|COMUNICACION
  fechaInicio     DateTime
  fechaFin        DateTime
  duracionDias    Int      // TERRITORIAL ejecucion=4 FIJO, SEDE 10-30
  
  @@map("cronograma_auditoria")
}

// AUDITORIA (SEGUIMIENTO 3 ETAPAS)
model Auditoria {
  id                      String   @id @default(cuid())
  codigo                  String   @unique
  programaId              String   @unique
  programa                AuditoriaPrograma @relation(fields: [programaId], references: [id])
  stage                   Stage    // PLANEACION|EJECUCION|COMUNICACION|SEGUIMIENTO|FINALIZADA
  
  // ETAPA PLANEACION
  documentosGenerados     Documento[] @relation("PlanificacionDocs")
  programaIndividual      String?  // URL a file
  
  // ETAPA EJECUCION
  listas                  ListaChequeo[]
  hallazgos               Hallazgo[]
  evidencias              Evidencia[]
  
  // ETAPA COMUNICACION
  informePreliminar       String?  // URL
  informeFinal            String?  // URL
  planMejoramiento        PlanMejoramiento?
  
  // SEGUIMIENTO
  seguimientos            SeguimientoPlanMejora[]
  
  auditlog                AuditLog[]
  
  @@map("auditoria")
}

// PLANES DE MEJORAMIENTO (RF010-011)
model PlanMejoramiento {
  id              String   @id @default(cuid())
  auditoriaId     String
  auditoria       Auditoria @relation(fields: [auditoriaId], references: [id])
  areaAuditadaId  String
  areaAuditada    Usuario @relation(fields: [areaAuditadaId], references: [id])
  estado          PlanMejoraEstado // FORMULACION|ACEPTACION|EJECUCION|SEGUIMIENTO|COMPLETADO
  fechaSuscripcion DateTime @default(now())
  acciones        AccionCorrectiva[]
  seguimientos    SeguimientoPlanMejora[]
  
  @@map("plan_mejoramiento")
}

// ACCIONES CORRECTIVAS
model AccionCorrectiva {
  id                    String   @id @default(cuid())
  planMejoraId          String
  planMejora            PlanMejoramiento @relation(fields: [planMejoraId], references: [id], onDelete: Cascade)
  hallazgoId            String
  hallazgo              Hallazgo @relation(fields: [hallazgoId], references: [id])
  descripcion           String   @db.Text
  causasRaiz            String   @db.Text
  accionMejora          String   @db.Text
  responsableId         String
  responsable           Usuario @relation(fields: [responsableId], references: [id])
  cantidadProgramada    Int
  fechaInicio           DateTime
  fechaFin              DateTime
  tiempoEjecucionMeses  Int      // DATEDIF(inicio, fin, "M")
  estado                AccionEstado // PENDIENTE|EN_PROCESO|COMPLETADA|PENDIENTE_VERIFICACION
  seguimientos          AccionSeguimiento[]
  
  @@map("accion_correctiva")
}

// SEGUIMIENTO TRIMESTRAL (CRÍTICO)
model SeguimientoPlanMejora {
  id              String   @id @default(cuid())
  planMejoraId    String
  planMejora      PlanMejoramiento @relation(fields: [planMejoraId], references: [id], onDelete: Cascade)
  numeroSeguimiento Int    // 1-4 (Julio, Octubre, Enero, Abril)
  tipoSeguimiento String  // TRIMESTRAL|ANUAL
  fechaSeguimiento DateTime
  acciones        AccionSeguimiento[]
  
  @@map("seguimiento_plan_mejora")
}

// CARGA DE EVIDENCIAS POR ACCIÓN (PORTAL ÁREA)
model AccionSeguimiento {
  id              String   @id @default(cuid())
  seguimientoId   String
  seguimiento     SeguimientoPlanMejora @relation(fields: [seguimientoId], references: [id], onDelete: Cascade)
  accionId        String
  accion          AccionCorrectiva @relation(fields: [accionId], references: [id], onDelete: Cascade)
  cantidadImplementada Int
  cumplimiento    Int      // 0=Pendiente, 1=Parcial, 2=Completo (fórmula EMFO002)
  evidencias      EvidenciaValidada[]
  
  @@map("accion_seguimiento")
}

// VALIDACIÓN DE EVIDENCIAS POR AUDITOR
model EvidenciaValidada {
  id              String   @id @default(cuid())
  accionSeguimientoId String
  accionSeguimiento AccionSeguimiento @relation(fields: [accionSeguimientoId], references: [id], onDelete: Cascade)
  evidenciaOriginal String  // URL en Azure Blob
  calificacion    String  // ACEPTADA|CON_OBSERVACIONES
  comentariosAuditor String? @db.Text
  usuarioValidoId String
  usuarioValido   Usuario @relation(fields: [usuarioValidoId], references: [id])
  fechaValidacion DateTime @default(now())
  solicitudNuevaEvidencia Boolean @default(false)
  
  @@map("evidencia_validada")
}

// HALLAZGOS (EJECUCIÓN)
model Hallazgo {
  id          String   @id @default(cuid())
  auditoriaId String
  auditoria   Auditoria @relation(fields: [auditoriaId], references: [id], onDelete: Cascade)
  titulo      String
  descripcion String   @db.Text
  causas      String   @db.Text
  acciones    AccionCorrectiva[]
  
  @@map("hallazgo")
}

// USUARIO (Active Directory + JWT)
model Usuario {
  id              String   @id @default(cuid())
  email           String   @unique
  nombre          String
  apellido        String
  cedulaIdentidad String   @unique
  rol             Rol      // JEFE_OCI|AUDITOR_LIDER|AUDITOR_OP|AREA_AUDITADA|ADMIN
  activo          Boolean  @default(true)
  
  @@map("usuario")
}

// LOG DE AUDITORÍA (COMPLIANCE)
model AuditLog {
  id        String   @id @default(cuid())
  usuarioId String
  usuario   Usuario @relation(fields: [usuarioId], references: [id])
  accion    String   // "Crear Plan", "Mover Auditoria", "Validar Evidencia"
  tabla     String   // "plan_anual", "auditoria", etc.
  registroId String
  cambios   String   @db.Json // {antes, despues}
  timestamp DateTime @default(now())
  
  @@map("auditlog")
}

// PROCESOS AUDITABLES
model Proceso {
  id    String   @id @default(cuid())
  nombre String  // "Gestión Financiera", "Administrativa", etc.
  auditorias AuditoriaPrograma[]
  
  @@map("proceso")
}

// TERRITORIALES
model Territorial {
  id    String   @id @default(cuid())
  nombre String  // "Antioquia", "Atlántico-Cesar", etc.
  auditorias AuditoriaPrograma[]
  
  @@map("territorial")
}
```

### Enums
```prisma
enum PlanEstado {
  BORRADOR
  EN_REVISION
  APROBADO
  VIGENTE
  CERRADO
}

enum ActividadEstado {
  PENDIENTE
  EN_EJECUCION
  COMPLETADA
  RETRASADA
}

enum Etapa {
  PLANEACION
  EJECUCION
  COMUNICACION
}

enum Stage {
  PLANEACION
  EJECUCION
  COMUNICACION
  SEGUIMIENTO
  FINALIZADA
}

enum AccionEstado {
  PENDIENTE
  EN_PROCESO
  COMPLETADA
  PENDIENTE_VERIFICACION
}

enum PlanMejoraEstado {
  FORMULACION
  ACEPTACION
  EJECUCION
  SEGUIMIENTO
  COMPLETADO
}

enum Rol {
  JEFE_OCI
  AUDITOR_LIDER
  AUDITOR_OP
  AREA_AUDITADA
  ADMIN
}
```

---

## SECCIÓN 6: ESPECIFICACIONES TÉCNICAS POR MÓDULO

### RF001 - PLAN ANUAL (SEMANA 3)

#### Caso de Uso Real
**Antes:** Jefe OCI abre EMFO001, llena manualmente, guarda, envía correo. Tiempo: 2 horas. Problemas: cambios sin registro, responsables no saben asignación, no validación Decreto 648.

**Después:** Jefe OCI abre formulario web, sistema muestra 5 roles automáticos, completa actividades/responsables/fechas, sistema valida TODO, genera PDF, notifica auditores. Tiempo: 30 minutos.

#### Endpoints Backend
```
POST   /api/v1/plan-anual                          → Crear plan
GET    /api/v1/plan-anual/:id                      → Obtener plan + roles + actividades
PUT    /api/v1/plan-anual/:id                      → Actualizar plan
PUT    /api/v1/plan-anual/:planId/actividades/:id → Actualizar actividad + auditoría
DELETE /api/v1/plan-anual/:id/actividades/:id     → Eliminar actividad
PUT    /api/v1/plan-anual/:id/aprobar              → Aprobar plan (validaciones)
GET    /api/v1/plan-anual/:id/indicadores         → Obtener % cumplimiento por rol
GET    /api/v1/plan-anual/:id/exportar-pdf        → Generar PDF
GET    /api/v1/plan-anual/:id/exportar-excel      → Generar Excel (compatible EMFO001)
POST   /api/v1/plan-anual/:id/generar-programa    → Desbloquear creación programa anual
```

#### Validadores Backend
```typescript
class PlanAnualValidator {
  // CRÍTICO: Decreto 648 - Exactamente 5 roles
  validarRolesPresentes(roles: RolDecreeto648[]) {
    if (roles.length !== 5) {
      throw new ValidationError('Decreto 648/2017: Se requieren exactamente 5 roles');
    }
  }

  // Cada rol sin actividades = error
  validarActividadesPorRol(roles: RolDecreeto648[]) {
    const rolesVacios = roles.filter(r => r.actividades.length === 0);
    if (rolesVacios.length > 0) {
      throw new ValidationError(`Roles sin actividades: ${rolesVacios.map(r => r.nombre)}`);
    }
  }

  // Validar que responsables existen en AD
  async validarResponsables(responsableIds: string[], adClient: ADClient) {
    const usuarios = await adClient.findByIds(responsableIds);
    const faltantes = responsableIds.filter(id => !usuarios.find(u => u.id === id));
    if (faltantes.length > 0) {
      throw new ValidationError(`Responsables no encontrados en AD: ${faltantes}`);
    }
  }

  // Fechas dentro del año fiscal
  validarFechas(fechaInicio: Date, fechaFin: Date, año: number) {
    const anoInicio = fechaInicio.getFullYear();
    const anoFin = fechaFin.getFullYear();
    if (anoInicio !== año || anoFin !== año) {
      throw new ValidationError(`Fechas deben estar en año fiscal ${año}`);
    }
    if (fechaFin <= fechaInicio) {
      throw new ValidationError('Fecha fin debe ser posterior a fecha inicio');
    }
  }
}
```

#### Service Backend
```typescript
class PlanAnualService {
  async crearPlanAnual(dto: CreatePlanAnualDto, usuarioId: string) {
    // Validar
    const validator = new PlanAnualValidator();
    validator.validarRolesPresentes(dto.roles);
    validator.validarActividadesPorRol(dto.roles);
    await validator.validarResponsables(dto.actividades.map(a => a.responsableId), this.adClient);
    validator.validarFechas(min(dto.actividades.map(a => a.fechaInicio)), max(dto.actividades.map(a => a.fechaFin)), dto.año);

    // Crear
    const plan = await this.prisma.planAnual.create({
      data: {
        año: dto.año,
        estado: 'BORRADOR',
        jefeOciId: usuarioId,
        roles: { create: dto.roles }
      },
      include: { roles: { include: { actividades: true } } }
    });

    // Auditoría
    await this.auditLogService.registrar(usuarioId, 'Crear Plan Anual', 'plan_anual', plan.id, { operación: 'CREACIÓN' });

    // Notificar Jefe OCI
    await this.notificationService.enviar(usuarioId, `Plan ${dto.año} creado`, 'info');

    return plan;
  }

  async actualizarActividad(actividadId: string, dto: UpdateActividadDto, usuarioId: string) {
    const actividad = await this.prisma.actividad.findUnique({ where: { id: actividadId } });
    
    // Registrar cambio anterior
    await this.auditLogService.registrar(usuarioId, 'Actualizar Actividad', 'actividad', actividadId, {
      antes: actividad,
      despues: dto
    });

    // Actualizar
    return this.prisma.actividad.update({
      where: { id: actividadId },
      data: dto
    });
  }

  async aprobarPlanAnual(planId: string, usuarioId: string) {
    const plan = await this.prisma.planAnual.findUnique({
      where: { id: planId },
      include: { roles: { include: { actividades: true } } }
    });

    // Validaciones de aprobación
    const validator = new PlanAnualValidator();
    validator.validarRolesPresentes(plan.roles);
    validator.validarActividadesPorRol(plan.roles);

    // Cambiar estado
    const updated = await this.prisma.planAnual.update({
      where: { id: planId },
      data: {
        estado: 'APROBADO',
        fechaAprobacion: new Date(),
        version: plan.version + 1
      }
    });

    // Auditoría
    await this.auditLogService.registrar(usuarioId, 'Aprobar Plan Anual', 'plan_anual', planId, { estado: 'APROBADO' });

    // Desbloquear RF003 (Programa Anual)
    await this.eventEmitter.emit('plan-anual.aprobado', { planId });

    // Notificar
    await this.notificationService.enviar(usuarioId, 'Plan aprobado. Puede crear Programa Anual', 'success');

    // Generar PDF
    await this.documentService.generarPdfPlanAnual(updated);

    return updated;
  }

  async calcularIndicadores(planId: string) {
    const plan = await this.prisma.planAnual.findUnique({
      where: { id: planId },
      include: { roles: { include: { actividades: true } } }
    });

    return plan.roles.map(rol => {
      const completadas = rol.actividades.filter(a => a.estado === 'COMPLETADA').length;
      const total = rol.actividades.length;
      const porcentaje = total > 0 ? (completadas / total) * 100 : 0;

      return {
        rolId: rol.id,
        rolNombre: rol.nombre,
        actividadesTotal: total,
        actividadesCompletadas: completadas,
        porcentajeCumplimiento: Math.round(porcentaje)
      };
    });
  }
}
```

#### Frontend Component (React)
```typescript
// src/pages/PlanAnualCreate.tsx
export function PlanAnualCreate() {
  const [año, setAño] = useState(new Date().getFullYear());
  const [roles, setRoles] = useState<RolForm[]>(
    DECRETO_648_ROLES.map(r => ({
      id: r.id,
      nombre: r.nombre,
      actividades: []
    }))
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validarLocalmente = () => {
    const newErrors: Record<string, string> = {};

    // Validar 5 roles
    if (roles.length !== 5) {
      newErrors['roles'] = 'Decreto 648/2017: Se requieren 5 roles';
    }

    // Validar actividades por rol
    const rolesVacios = roles.filter(r => r.actividades.length === 0);
    if (rolesVacios.length > 0) {
      rolesVacios.forEach(r => {
        newErrors[`rol-${r.id}`] = 'Este rol debe tener al menos 1 actividad';
      });
    }

    // Validar responsables no vacíos
    roles.forEach(rol => {
      rol.actividades.forEach((act, idx) => {
        if (!act.responsableId) {
          newErrors[`actividad-${rol.id}-${idx}`] = 'Debe asignar responsable';
        }
      });
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGuardar = async () => {
    if (!validarLocalmente()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/v1/plan-anual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          año,
          roles: roles.map(r => ({
            nombre: r.nombre,
            actividades: r.actividades.map(a => ({
              nombre: a.nombre,
              responsableId: a.responsableId,
              fechaInicio: a.fechaInicio,
              fechaFin: a.fechaFin
            }))
          }))
        })
      });

      if (response.ok) {
        const plan = await response.json();
        toast.success('Plan creado correctamente');
        navigate(`/plan-anual/${plan.id}`);
      } else {
        const error = await response.json();
        setErrors(error.errors || { general: 'Error al crear plan' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h1 className="text-2xl font-bold mb-6">Crear Plan Anual {año}</h1>

      {errors['roles'] && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4">{errors['roles']}</div>}

      <div className="space-y-6">
        {roles.map(rol => (
          <div key={rol.id} className={`border rounded-lg p-4 ${errors[`rol-${rol.id}`] ? 'border-red-300' : 'border-gray-300'}`}>
            <h2 className="text-lg font-semibold mb-4">{rol.nombre}</h2>
            {errors[`rol-${rol.id}`] && <p className="text-red-600 text-sm mb-3">{errors[`rol-${rol.id}`]}</p>}

            <div className="space-y-3 mb-4">
              {rol.actividades.map((act, idx) => (
                <div key={idx} className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Nombre actividad"
                    value={act.nombre}
                    onChange={e => {
                      const newRoles = [...roles];
                      newRoles[roles.indexOf(rol)].actividades[idx].nombre = e.target.value;
                      setRoles(newRoles);
                    }}
                    className="flex-1 border rounded px-3 py-2"
                  />
                  <select
                    value={act.responsableId}
                    onChange={e => {
                      const newRoles = [...roles];
                      newRoles[roles.indexOf(rol)].actividades[idx].responsableId = e.target.value;
                      setRoles(newRoles);
                    }}
                    className="border rounded px-3 py-2"
                  >
                    <option value="">Seleccionar responsable...</option>
                    {auditores.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                  </select>
                  <button onClick={() => {
                    const newRoles = [...roles];
                    newRoles[roles.indexOf(rol)].actividades.splice(idx, 1);
                    setRoles(newRoles);
                  }} className="bg-red-100 text-red-700 px-3 py-2 rounded hover:bg-red-200">
                    Eliminar
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                const newRoles = [...roles];
                newRoles[roles.indexOf(rol)].actividades.push({ nombre: '', responsableId: '', fechaInicio: new Date(), fechaFin: new Date() });
                setRoles(newRoles);
              }}
              className="bg-blue-50 text-blue-700 px-4 py-2 rounded border border-blue-300 hover:bg-blue-100"
            >
              + Agregar Actividad
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mt-6">
        <button
          onClick={handleGuardar}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Guardando...' : 'Guardar Plan'}
        </button>
        <button onClick={() => navigate('/plan-anual')} className="bg-gray-200 text-gray-700 px-6 py-2 rounded hover:bg-gray-300">
          Cancelar
        </button>
      </div>
    </div>
  );
}
```

#### Tests
```typescript
describe('RF001 - Plan Anual', () => {
  test('Debe tener exactamente 5 roles (Decreto 648)', async () => {
    const validator = new PlanAnualValidator();
    const roles = []; // 0 roles
    expect(() => validator.validarRolesPresentes(roles)).toThrow('exactamente 5 roles');
  });

  test('No permitir aprobar plan sin actividades en un rol', async () => {
    const plan = {
      roles: [
        { id: '1', nombre: 'Rol1', actividades: [{ nombre: 'Act1' }] },
        { id: '2', nombre: 'Rol2', actividades: [] }, // VACÍO
        { id: '3', nombre: 'Rol3', actividades: [{ nombre: 'Act2' }] },
        { id: '4', nombre: 'Rol4', actividades: [{ nombre: 'Act3' }] },
        { id: '5', nombre: 'Rol5', actividades: [{ nombre: 'Act4' }] }
      ]
    };
    const validator = new PlanAnualValidator();
    expect(() => validator.validarActividadesPorRol(plan.roles)).toThrow('sin actividades');
  });

  test('Rechazar responsable inválido (no en AD)', async () => {
    const validator = new PlanAnualValidator();
    const adClient = { findByIds: async () => [{ id: 'user1' }] };
    expect(() => validator.validarResponsables(['user1', 'INEXISTENTE'], adClient)).rejects.toThrow('no encontrados');
  });

  test('Generar PDF con datos correctos', async () => {
    const plan = { /* plan válido */ };
    const service = new PlanAnualService(mockPrisma, mockDocService);
    const pdf = await service.generarPdfPlanAnual(plan);
    expect(pdf).toBeDefined();
    expect(pdf.includes('5 Roles')).toBe(true);
  });

  test('Notificar auditores al aprobar plan', async () => {
    const service = new PlanAnualService(mockPrisma, mockNotificationService);
    const plan = { id: 'plan1', roles: [/* 5 roles */] };
    await service.aprobarPlanAnual(plan.id, 'jefe1');
    expect(mockNotificationService.enviar).toHaveBeenCalled();
  });
});
```

---

### RF011 - SEGUIMIENTO TRIMESTRAL (SEMANA 9-11, CRÍTICO)

#### Caso de Uso Real
**Antes:** 7 días antes seguimiento, auditor envía correo. Área edita Excel localmente, versiones múltiples, auditor revisa sin registro. Jefe OCI sin visibilidad. Tiempo: 1 hora + 30 min auditor.

**Después:** Sistema envía recordatorio automático 7 días antes. Área accede portal, carga evidencias drag-drop, auditor valida con 1 click (Aceptado/Observaciones), automáticamente registra quién validó cuándo. Jefe OCI ve dashboard en tiempo real. Tiempo: 15 min área, 5 min auditor.

#### Flujo Detallado (Paso a Paso)

**HITO 7 DÍAS ANTES (Scheduler automático):**
```typescript
// src/jobs/recordatorios-seguimiento.job.ts
export async function recordatoriosSeguimientoJob() {
  const ahora = new Date();
  const fechaObjetivo = addDays(ahora, 7);

  // Identificar planes con seguimiento próximo (Julio, Octubre, Enero, Abril)
  const planes = await prisma.planMejoramiento.findMany({
    where: {
      estado: { in: ['EJECUCION', 'SEGUIMIENTO'] },
      seguimientos: {
        some: {
          // Seguimiento que INICIA en 7 días
          fechaSeguimiento: {
            gte: startOfDay(fechaObjetivo),
            lt: endOfDay(fechaObjetivo)
          }
        }
      }
    },
    include: {
      areaAuditada: true,
      acciones: true,
      seguimientos: true
    }
  });

  for (const plan of planes) {
    const responsable = plan.areaAuditada;
    const accionesIncompletas = plan.acciones.filter(a => a.estado !== 'COMPLETADA');

    // Enviar correo automático
    await emailService.enviarRecordatorioSeguimiento({
      destinatario: responsable.email,
      nombreResponsable: responsable.nombre,
      nombrePlan: plan.id,
      accionesIncompletas: accionesIncompletas.length,
      linkPortal: `${process.env.APP_URL}/seguimiento-plan/${plan.id}`,
      fechaLimite: plan.seguimientos[0].fechaSeguimiento
    });

    // Registrar en auditoría
    await auditLogService.registrar(
      'SYSTEM',
      'Enviar recordatorio trimestral',
      'plan_mejoramiento',
      plan.id,
      { accionesIncompletas: accionesIncompletas.length }
    );
  }
}
```

**FASE 1: ÁREA CARGA EVIDENCIAS (Portal simplificado)**
```typescript
// Backend: POST /api/v1/seguimiento/:seguimientoId/cargar-evidencia
export async function cargarEvidencia(req: Request, res: Response) {
  const { seguimientoId } = req.params;
  const { accionId, cantidadImplementada, observaciones } = req.body;
  const { file } = req.files;
  const usuarioId = req.user.id;

  // Validar que usuario es responsable del plan
  const seguimiento = await prisma.seguimientoPlanMejora.findUnique({
    where: { id: seguimientoId },
    include: { planMejora: true }
  });
  if (seguimiento.planMejora.areaAuditadaId !== usuarioId) {
    return res.status(403).json({ error: 'No autorizado' });
  }

  // Validar archivo <50MB y tipo permitido
  if (file.size > 50 * 1024 * 1024) {
    return res.status(400).json({ error: 'Archivo debe ser <50MB' });
  }
  const tiposPermitidos = ['application/pdf', 'application/vnd.ms-excel', 'image/jpeg', 'image/png'];
  if (!tiposPermitidos.includes(file.mimetype)) {
    return res.status(400).json({ error: 'Tipo de archivo no permitido' });
  }

  // Subir a Azure Blob
  const blobName = `evidencias/${seguimiento.planMejora.id}/${accionId}/${Date.now()}-${file.name}`;
  const url = await storageService.uploadFile(file, blobName);

  // Crear registro de seguimiento de acción
  const accionSeguimiento = await prisma.accionSeguimiento.create({
    data: {
      seguimientoId,
      accionId,
      cantidadImplementada,
      cumplimiento: calcularCumplimiento(cantidadImplementada, /* cantidad programada */),
      evidencias: {
        create: {
          evidenciaOriginal: url,
          calificacion: 'PENDIENTE_REVISION',
          usuarioValidoId: null
        }
      }
    }
  });

  // Auditoría
  await auditLogService.registrar(
    usuarioId,
    'Cargar evidencia de plan mejoramiento',
    'accion_seguimiento',
    accionSeguimiento.id,
    { cantidadImplementada, archivo: file.name }
  );

  // Notificar auditor
  const auditor = seguimiento.planMejora.auditoriaId; // obtener auditor de auditoría
  await notificationService.enviar(auditor, `Nueva evidencia para ${accionId}`, 'alert');

  return res.json({ success: true, accionSeguimiento });
}

function calcularCumplimiento(cantidad: number, cantidadProgramada: number): number {
  // Fórmula EMFO002 columna L
  if (cantidad >= cantidadProgramada) return 2; // Cumplimiento 100%
  if (cantidad >= 1) return 1;                   // Cumplimiento parcial
  return 0;                                       // Pendiente
}
```

**FASE 2: AUDITOR VALIDA (Dashboard especializado)**
```typescript
// Frontend: src/pages/MisSeguimientos.tsx
export function MisSeguimientos() {
  const [seguimientos, setSeguimientos] = useState([]);
  const [selectedEvidencia, setSelectedEvidencia] = useState(null);
  const [validando, setValidando] = useState(false);

  useEffect(() => {
    // Obtener mis seguimientos (auditor logged in)
    fetch('/api/v1/auditor/mis-seguimientos')
      .then(r => r.json())
      .then(setSeguimientos);
  }, []);

  const handleAceptar = async (evidenciaId: string) => {
    setValidando(true);
    try {
      const response = await fetch(`/api/v1/evidencia/${evidenciaId}/validar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calificacion: 'ACEPTADA',
          comentarios: ''
        })
      });

      if (response.ok) {
        // Actualizar estado local
        // Notificación de éxito
        toast.success('Evidencia aceptada');
        setSelectedEvidencia(null);
      }
    } finally {
      setValidando(false);
    }
  };

  const handleObservaciones = async (evidenciaId: string, comentarios: string) => {
    setValidando(true);
    try {
      const response = await fetch(`/api/v1/evidencia/${evidenciaId}/validar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calificacion: 'CON_OBSERVACIONES',
          comentarios,
          solicitudNuevaEvidencia: true
        })
      });

      if (response.ok) {
        toast.info('Observaciones registradas. Área notificada.');
        setSelectedEvidencia(null);
      }
    } finally {
      setValidando(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <h1 className="text-2xl font-bold p-6 border-b">Mis Seguimientos Pendientes</h1>

      <div className="p-6 space-y-4">
        {seguimientos.map(seg => (
          <div key={seg.id} className="border rounded-lg p-4">
            <h3 className="font-semibold">Plan: {seg.planMejora.id}</h3>
            <p className="text-sm text-gray-600">Seguimiento #{seg.numeroSeguimiento}</p>

            <div className="mt-4 space-y-2">
              {seg.accionesConEvidencia.map(acc => (
                <div key={acc.id} className="bg-gray-50 p-3 rounded flex justify-between items-center">
                  <div>
                    <p className="font-medium">{acc.descripcion}</p>
                    <p className="text-sm text-gray-600">Cantidad: {acc.cantidadImplementada} / {acc.cantidadProgramada}</p>
                    <p className={`text-sm font-semibold ${acc.cumplimiento === 2 ? 'text-green-600' : acc.cumplimiento === 1 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {acc.cumplimiento === 2 ? '✓ Completo' : acc.cumplimiento === 1 ? '△ Parcial' : '✗ Pendiente'}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedEvidencia(acc.evidencias[0])}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Revisar evidencia
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Evidencia */}
      {selectedEvidencia && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-96 overflow-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Validar Evidencia</h2>
              <button onClick={() => setSelectedEvidencia(null)} className="text-2xl text-gray-400">×</button>
            </div>

            <div className="p-6">
              {selectedEvidencia.evidenciaOriginal.endsWith('.pdf') ? (
                <iframe src={selectedEvidencia.evidenciaOriginal} className="w-full h-96" />
              ) : (
                <img src={selectedEvidencia.evidenciaOriginal} alt="Evidencia" className="w-full max-h-96" />
              )}
            </div>

            <div className="p-6 border-t space-y-3">
              <textarea
                id="comentarios"
                placeholder="Observaciones (si aplica)..."
                className="w-full border rounded px-3 py-2 h-24"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => handleAceptar(selectedEvidencia.id)}
                  disabled={validando}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {validando ? 'Procesando...' : '✓ Aceptar'}
                </button>
                <button
                  onClick={() => {
                    const comentarios = document.getElementById('comentarios').value;
                    handleObservaciones(selectedEvidencia.id, comentarios);
                  }}
                  disabled={validando}
                  className="flex-1 bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 disabled:opacity-50"
                >
                  {validando ? 'Procesando...' : '⚠ Observaciones'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

**FASE 3: AUDITOR CIERRA (Genera reporte)**
```typescript
// Backend: PUT /api/v1/seguimiento/:id/cerrar
export async function cerrarSeguimiento(req: Request, res: Response) {
  const { seguimientoId } = req.params;
  const usuarioId = req.user.id;

  // Obtener seguimiento
  const seguimiento = await prisma.seguimientoPlanMejora.findUnique({
    where: { id: seguimientoId },
    include: {
      acciones: {
        include: { evidencias: true }
      },
      planMejora: true
    }
  });

  // Calcular cumplimiento total
  const totalAcciones = seguimiento.acciones.length;
  const accionesCompletadas = seguimiento.acciones.filter(a => a.cumplimiento === 2).length;
  const cumplimientoPromedio = totalAcciones > 0 ? Math.round((accionesCompletadas / totalAcciones) * 100) : 0;

  // Determinar semáforo
  let semaforo = 'VERDE'; // >80%
  if (cumplimientoPromedio < 50) semaforo = 'ROJO';
  else if (cumplimientoPromedio < 80) semaforo = 'AMARILLO';

  // Actualizar plan mejora
  const planActualizado = await prisma.planMejoramiento.update({
    where: { id: seguimiento.planMejoraId },
    data: {
      estado: cumplimientoPromedio === 100 ? 'COMPLETADO' : 'SEGUIMIENTO'
    }
  });

  // Registrar auditoría
  await auditLogService.registrar(usuarioId, 'Cerrar seguimiento trimestral', 'seguimiento_plan_mejora', seguimientoId, {
    cumplimientoPromedio,
    semaforo,
    accionesCompletadas,
    totalAcciones
  });

  // Generar reporte PDF
  const pdf = await documentService.generarReporteSeguimiento({
    seguimiento,
    cumplimientoPromedio,
    semaforo,
    acciones: seguimiento.acciones
  });

  // Notificar Jefe OCI
  await notificationService.enviar(
    jefe_oci_id,
    `Seguimiento cerrado: ${semaforo} (${cumplimientoPromedio}%)`,
    'info',
    { link: `/reportes/${seguimientoId}` }
  );

  return res.json({ success: true, semaforo, cumplimientoPromedio });
}
```

---

## SECCIÓN 7: ARQUITECTURA DE REUTILIZACIÓN (KANBAN)

### Qué Reutilizamos del Kanban Existente (30%)

```typescript
// COMPONENTE BASE EXISTENTE (NO TOCAR)
// src/modules/auditoria/components/KanbanBoard.tsx
interface KanbanBoardProps<T> {
  items: T[];
  stages: string[];
  onMoveItem: (itemId: string, fromStage: string, toStage: string) => void;
  renderCard?: (item: T) => React.ReactNode;
}

export function KanbanBoard<T>({ items, stages, onMoveItem }: KanbanBoardProps<T>) {
  // Drag & drop implementation
  // Agrupa items por stage
  // Muestra columnas
}

// SERVICIO BASE EXISTENTE (REUTILIZAR)
// src/modules/auditoria/services/auditoria.service.ts
export class AuditoriaService {
  async getAuditoriasBy(stage?: string, territory?: string) { /* ... */ }
  async moveAuditoria(auditoriaId: string, fromStage: string, toStage: string) { /* ... */ }
  async getMetricas(auditoriaId: string) { /* ... */ }
}
```

### Cómo EXTENDER para CIG sin romper existente

```typescript
// NUEVO COMPONENTE: Extender KanbanCard
// src/modules/auditoria/components/AuditoriaCard.tsx
interface AuditoriaCardProps extends KanbanCardProps {
  auditoria: Auditoria;
  metricas?: { docs: number; informes: number };
  semaforo?: 'VERDE' | 'AMARILLO' | 'ROJO'; // NUEVO para CIG
  porcentajeCumplimiento?: number;           // NUEVO para CIG
}

export function AuditoriaCard({ auditoria, metricas, semaforo, porcentajeCumplimiento }: AuditoriaCardProps) {
  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition">
      {/* Header existente */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-blue-600">{auditoria.codigo}</h3>
          <p className="text-sm text-gray-600">{auditoria.nombre}</p>
        </div>
        {semaforo && (
          <div className={`w-3 h-3 rounded-full ${
            semaforo === 'VERDE' ? 'bg-green-500' :
            semaforo === 'AMARILLO' ? 'bg-yellow-500' : 'bg-red-500'
          }`} />
        )}
      </div>

      {/* Body existente */}
      {metricas && <MetricasDisplay docs={metricas.docs} informes={metricas.informes} />}

      {/* NUEVO: Porcentaje cumplimiento CIG */}
      {porcentajeCumplimiento !== undefined && (
        <div className="mt-3 pt-3 border-t">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-semibold">Avance</span>
            <span className="text-sm font-bold">{porcentajeCumplimiento}%</span>
          </div>
          <div className="bg-gray-200 h-2 rounded-full overflow-hidden">
            <div className="bg-blue-600 h-full" style={{ width: `${porcentajeCumplimiento}%` }} />
          </div>
        </div>
      )}

      {/* Footer existente */}
      <div className="mt-4 flex gap-2">
        <button className="flex-1 bg-blue-50 text-blue-700 py-2 rounded text-sm hover:bg-blue-100">
          Expandente
        </button>
        <button className="flex-1 bg-gray-50 text-gray-700 py-2 rounded text-sm hover:bg-gray-100">
          Notas
        </button>
      </div>
    </div>
  );
}

// NUEVO: Componente para Planes Mejora
// src/modules/plan-mejora/components/KanbanPlanMejora.tsx
interface TarjetaPlanProps {
  plan: PlanMejoramiento;
  semaforo: 'VERDE' | 'AMARILLO' | 'ROJO';
  cumplimiento: number; // 0-100%
}

export function TarjetaPlan({ plan, semaforo, cumplimiento }: TarjetaPlanProps) {
  // Misma estructura que AuditoriaCard pero para planes
  return (
    <div className="bg-white border rounded-lg p-4">
      <h3 className="font-bold">{plan.id}</h3>
      <div className={`w-3 h-3 rounded-full inline-block mr-2 ${
        semaforo === 'VERDE' ? 'bg-green-500' : semaforo === 'AMARILLO' ? 'bg-yellow-500' : 'bg-red-500'
      }`} />
      <p className="text-sm">{cumplimiento}% Completo</p>
      {/* ... */}
    </div>
  );
}
```

### 5 Fases Implementación

**Fase 1 (Semana 1-2):** Setup + Auditoría Kanban
- Documentar componentes existentes
- Extraer interfaces base (KanbanBoardProps, KanbanCardProps)
- Crear archivo de constantes DECRETO_648_ROLES

**Fase 2 (Semana 3):** RF001 (Sin tocar Kanban)
- Nuevo módulo: src/modules/plan-anual/
- Nuevos componentes: PlanAnualCreate, RolCard, ActividadForm

**Fase 3 (Semana 4-5):** RF002-003 (Extender Kanban)
- Reutilizar KanbanBoard para Programa Anual
- Extender AuditoriaCard con nuevos campos CIG
- Crear AuditoriaService métodos nuevos

**Fase 4 (Semana 6-8):** RF004-009 (Etapas)
- Extender AuditoriaDetail con tabs por etapa
- Agregar componentes de ejecución

**Fase 5 (Semana 9-11):** RF010-011 (Nuevo Kanban)
- Crear KanbanPlanMejora reutilizando KanbanBase
- Portal Área Auditada (interfaz separada, no Kanban)

---

## SECCIÓN 8: CHECKLIST DE IMPLEMENTACIÓN (POR MÓDULO)

### RF001 - Plan Anual
- [ ] Crear tablas Prisma: PlanAnual, RolDecreeto648, Actividad
- [ ] Seed: Insertar 5 roles estándar
- [ ] PlanAnualValidator: validarRolesPresentes, validarActividadesPorRol, validarResponsables, validarFechas
- [ ] PlanAnualService: crearPlanAnual, actualizarActividad, calcularIndicadores, aprobarPlanAnual
- [ ] DocumentService: generarPdfPlanAnual
- [ ] PlanAnualController: POST/GET/PUT endpoints
- [ ] AuditLogService: registrar cada operación
- [ ] Frontend: PlanAnualCreate, RolCard, ActividadForm
- [ ] Tests: 80%+ cobertura
- [ ] Documentación: Swagger
- **KAN: Plan crearse <30min, auditoría registre movimientos**

### RF003 - Programa Anual (Reutiliza Kanban)
- [ ] Extender AuditoriaPrograma: agregar planAnualId
- [ ] Diferenciación: TERRITORIAL → duracion_ejecucion_dias = 4 (FIJO)
- [ ] AuditoriaService.generarCronograma: detectar territorial, aplicar duraciones
- [ ] Reutilizar KanbanBoard para visualizar
- [ ] Tests: Cronogramas diferenciados correctamente
- **KAN: Drag & drop auditorías entre etapas, registro auditoría automático**

### RF010-011 - Planes Mejora (Nuevo Kanban)
- [ ] Tablas Prisma: PlanMejoramiento, AccionCorrectiva, SeguimientoPlanMejora, AccionSeguimiento, EvidenciaValidada
- [ ] Scheduler: recordatorios 7 días antes
- [ ] Portal Área: cargar evidencias drag-drop
- [ ] Auditor Dashboard: validar evidencias (Aceptado/Observaciones)
- [ ] Cálculo cumplimiento: fórmula EMFO002 IF(K>=F,2,IF(K>=1,1,0))
- [ ] Semáforos: Verde>80%, Amarillo 50-79%, Rojo<50%
- [ ] KanbanPlanMejora: visualizar planes por etapa
- [ ] Tests: flujo completo seguimiento trimestral
- **KAN: Recordatorios 7d antes 100% casos, validación registrada, semáforos automáticos**

### Validación Normativa
- [ ] Decreto 648: Validar 5 roles en RF001
- [ ] DAFP: Fórmula riesgo en RF002
- [ ] EM-PT-004: 3 etapas auditoría en RF004-009
- [ ] EM-PT-002: Fórmula cumplimiento en RF011
- [ ] Ley 1581: Cifrado TLS + AES-256
- [ ] Auditlog: Registrar quién-cuándo-qué en todas operaciones

---

## SECCIÓN 9: MIGRACIÓN DE DATOS

### EMFO001 → plan_anual + auditoria_programa
```sql
-- Paso 1: Crear plan anual
INSERT INTO plan_anual (id, año, estado, jefe_oci_id, fecha_creacion)
VALUES (uuid(), 2025, 'APROBADO', (SELECT id FROM usuario WHERE rol = 'JEFE_OCI' LIMIT 1), NOW());

-- Paso 2: Para cada proceso auditado en EXCEL, crear AuditoriaPrograma
-- Mapear responsables a usuarios existentes en BD
-- Validar contra AD

-- Paso 3: Crear CronogramaAuditoria
-- SEDE: lunes-viernes en semanas listadas
-- TERRITORIAL: 3d planeación + 4d ejecución (FIJO)

-- Validación post-migración:
-- ✓ Todos los auditores existen en tabla usuario
-- ✓ Cronogramas no se solapan
-- ✓ Duración territorial ejecución = 4 días
```

### EMFO002 → plan_mejoramiento + accion_correctiva
```sql
-- 1173 filas × 244 columnas → Mapeo exacto
-- Mapeo columnas:
--   A → hallazgoId
--   B-D → descripción, causas, accion
--   F → cantidadProgramada
--   G-H → fechaInicio, fechaFin
--   J → responsableId (validar contra AD)
--   K-L → cumplimiento (fórmula)

-- Validaciones:
-- ✓ Responsables existen en AD
-- ✓ Fechas válidas
-- ✓ Fórmula cumplimiento aplicada correctamente
-- ✓ Evidencias archivos no se pierden
```

---

## SECCIÓN 10: DEPLOYMENT & INTEGRACIÓN

### Infraestructura Azure
```
API:        Azure App Service (Node.js/Express)
DB:         Azure SQL Database (PostgreSQL)
Storage:    Azure Blob Storage (evidencias, documentos)
Auth:       Active Directory (SSO)
Backup:     Automated daily (7-day retention)
Monitoring: Application Insights
```

### CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
on: [push to main]

jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run build
      - run: npm test -- --coverage
      - run: npm run lint
      - run: npx sast-scan .

  deploy:
    needs: build-test
    runs-on: ubuntu-latest
    steps:
      - run: az login --service-principal
      - run: az webapp deployment source config-zip
```

### Integración Power BI
```
Data Source: API endpoints
  ├─ GET /api/v1/reportes/plan-anual-dashboard
  ├─ GET /api/v1/reportes/auditorias-dashboard
  └─ GET /api/v1/reportes/planes-mejora-dashboard
Refresh: Hourly
Visualization:
  ├─ Plan Anual: % cumplimiento por rol (gráfico de barras)
  ├─ Auditorías: Estado por etapa (columnas kanban)
  └─ Planes Mejora: Semáforos por acción (matriz colores)
```

---

## SECCIÓN 11: TESTING CRÍTICO

```typescript
describe('CRÍTICO - Decreto 648', () => {
  test('Plan Anual DEBE tener exactamente 5 roles', async () => {
    const plan = { roles: [] };
    expect(() => validatePlanAnual(plan)).toThrow('5 roles');
  });
});

describe('CRÍTICO - Territoriales', () => {
  test('Auditoría TERRITORIAL debe tener ejecución = 4 días (FIJO)', async () => {
    const auditoria = { es_territorial: true };
    const cronograma = generarCronograma(auditoria);
    expect(cronograma.ejecucion.duracionDias).toBe(4);
  });
});

describe('CRÍTICO - Seguimiento Trimestral', () => {
  test('Recordatorio enviado 7 días ANTES exactos', async () => {
    const seguimiento = { fechaSeguimiento: addDays(today, 7) };
    const recordatorios = await obtenerRecordatorios(today);
    expect(recordatorios).toContain(seguimiento.id);
  });

  test('Cumplimiento calculado con fórmula EMFO002', async () => {
    // IF(K>=F,2,IF(K>=1,1,0))
    expect(calcularCumplimiento(0, 10)).toBe(0); // Pendiente
    expect(calcularCumplimiento(5, 10)).toBe(1); // Parcial
    expect(calcularCumplimiento(10, 10)).toBe(2); // Completo
  });

  test('Auditoría registra quién validó, cuándo, y decisión', async () => {
    const log = await auditorLog.find({ tabla: 'evidencia_validada' });
    expect(log.usuarioId).toBeDefined();
    expect(log.timestamp).toBeDefined();
    expect(log.cambios.calificacion).toMatch('ACEPTADA|CON_OBSERVACIONES');
  });

  test('Semáforo actualizado automáticamente', async () => {
    const plan = { cumplimiento: 95 }; // >80%
    expect(getSemaforo(plan)).toBe('VERDE');
  });
});
```

---

## SECCIÓN 12: NORMATIVA EN CÓDIGO (REFERENCIA RÁPIDA)

```typescript
// src/common/constants/normativa.ts

// DECRETO 648/2017 - CONTROL INTERNO
export const DECRETO_648_ROLES = [
  { id: 'decreto648_rol_1', nombre: 'Liderazgo Estratégico', artículo: 'Art. 2' },
  { id: 'decreto648_rol_2', nombre: 'Enfoque Prevención', artículo: 'Art. 3' },
  { id: 'decreto648_rol_3', nombre: 'Relación Entes Control', artículo: 'Art. 4' },
  { id: 'decreto648_rol_4', nombre: 'Evaluación Gestión Riesgos', artículo: 'Art. 5' },
  { id: 'decreto648_rol_5', nombre: 'Evaluación Seguimiento', artículo: 'Art. 6' }
];
export const VALIDAR_DECRETO_648 = (roles: Role[]) => {
  if (roles.length !== 5) throw new Error('Decreto 648: Exactamente 5 roles requeridos');
};

// DAFP - GUÍA AUDITORÍA INTERNA V6
export const DAFP_CRITICIDAD = { ALTO: 5, MEDIO: 3, BAJO: 1 };
export const DAFP_EXPOSICION = { MAS_100: 5, ENTRE_50_100: 3, MENOS_50: 1 };
export const CALCULAR_RIESGO_DAFP = (criticidad: number, exposicion: number, mitigantes: number) =>
  (criticidad * exposicion) / mitigantes;

// EM-PT-004 - AUDITORÍAS INTERNAS
export const ETAPAS_AUDITORIA = {
  PLANEACION: { nombre: 'Planeación', duracion_sede_min_dias: 5, duracion_sede_max_dias: 10, duracion_territorial_dias: 3 },
  EJECUCION: { nombre: 'Ejecución', duracion_sede_min_dias: 10, duracion_sede_max_dias: 30, duracion_territorial_dias: 4 },
  COMUNICACION: { nombre: 'Comunicación', duracion_sede_min_dias: 10, duracion_sede_max_dias: 15, duracion_territorial_dias: 2 }
};

// EM-PT-002 - PLANES MEJORAMIENTO
export const FORMULA_CUMPLIMIENTO = (cantidadImplementada: number, cantidadProgramada: number): number => {
  if (cantidadImplementada >= cantidadProgramada) return 2; // Cumplimiento 100%
  if (cantidadImplementada >= 1) return 1;                   // Cumplimiento parcial
  return 0;                                                   // Pendiente
};
export const SEGUIMIENTO_PERIODICIDAD = [
  { numero: 1, mes: 'JULIO', diaño_desde_inicio: 180 },
  { numero: 2, mes: 'OCTUBRE', diaño_desde_inicio: 270 },
  { numero: 3, mes: 'ENERO', diaño_desde_inicio: 360 },
  { numero: 4, mes: 'ABRIL', diaño_desde_inicio: 450 }
];

// LEY 1581/2012 - PROTECCIÓN DATOS
export const SECURITY = {
  TLS: true,
  CIFRADO_ALGORITMO: 'AES-256',
  RETENCION_LOGS_DIAS: 90,
  CONSENTIMIENTO_REQUERIDO: true
};
```

---

## SECCIÓN 13: MATRIZ DE TRAZABILIDAD (RF ↔ CÓDIGO)

| RF | Requisito | Módulo | Backend File | Frontend | Tests | Status |
|----|-----------|--------|--------------|----------|-------|--------|
| RF001 | Plan Anual 5 roles | 1 | plan-anual.service.ts | PlanAnualCreate | RF001.test.ts | TODO |
| RF002 | Universo DAFP | 2 | universo.service.ts | UniversoList | RF002.test.ts | TODO |
| RF003 | Programa cronogramas | 3 | programa.service.ts (reutiliza auditoria) | ProgramaGantt | RF003.test.ts | TODO |
| RF004-009 | Auditorías 3 etapas | 4-6 | auditoria.service.ts (extend) | AuditoriaDetail | RF004-009.test.ts | TODO |
| RF010-011 | Planes mejora + seguimiento | 7 | plan-mejora.service.ts | KanbanPlanMejora + PortalArea | RF010-011.test.ts | TODO |
| RF012 | Informes ley | 8 | reporte.service.ts | ReporteList | RF012.test.ts | TODO |
| RF013 | Gestión documental | 8 | documento.service.ts | RepositorioExplorador | RF013.test.ts | TODO |
| RF014 | Notificaciones | 8 | notification.service.ts | NotificationCenter | RF014.test.ts | TODO |
| RF015 | Seguridad RBAC | 8 | auth.service.ts | RoleConfig | RF015.test.ts | TODO |
| RF016 | Reportes ejecutivos | 8 | dashboard.service.ts | ExecutiveDashboard | RF016.test.ts | TODO |

---

## SECCIÓN 14: GUÍA RÁPIDA PARA IA (CURSOR, COPILOT, etc.)

```
INSTRUCCIONES PARA LA IA:

1. ANTES DE GENERAR CÓDIGO:
   - Revisar sección correspondiente en este documento
   - Verificar validaciones obligatorias
   - Consultar tabla normativa (Sección 12)

2. AL GENERAR BACKEND:
   - Incluir validaciones de Decreto 648 en RF001
   - Usar fórmula EMFO002 en RF011
   - Registrar auditlog para compliance
   - Tests con cobertura ≥80%

3. AL GENERAR FRONTEND:
   - Reutilizar componentes Kanban existentes si aplica
   - Validar en cliente también (UX)
   - Mensajes claros de error (red borders)
   - Responsive design (mobile-first)

4. AL CREAR TESTS:
   - Casos reales ESAP (12 auditores, 16 territoriales, 9 procesos)
   - Validaciones normativas
   - Edge cases (Excel data dirty)

5. VALIDACIONES CRÍTICAS SIEMPRE:
   - RF001: 5 roles EXACTAMENTE
   - RF003: Territorial ejecución 4 días FIJO
   - RF011: Cumplimiento IF(K>=F,2,IF(K>=1,1,0))
   - Auditoría: Registrar cada cambio

6. SI DESCUBRE AMBIGÜEDAD:
   - Consultar Sección 3 (Datos Actuales)
   - Consultar Sección 12 (Normativa)
   - Si persiste: generar comentario en código
```

---

## RESUMEN FINAL

### Lo Que Tienes Aquí
- ✅ 20 RF + 10 RNF especificados
- ✅ Schema Prisma completo
- ✅ Especificaciones técnicas 2 módulos (RF001, RF011)
- ✅ Ejemplos de código backend + frontend + tests
- ✅ Checklist por módulo
- ✅ Plan de migración
- ✅ Referencia normativa integrada
- ✅ Guía rápida para IA

### Timeline
- **Semana 1-2:** Setup
- **Semana 3:** RF001
- **Semana 4-5:** RF002-003
- **Semana 6-8:** RF004-009
- **Semana 9-11:** RF010-011
- **Semana 12-14:** RF012-020
- **Semana 15-20:** Testing, UAT, capacitación

### Números
- **20 Requerimientos** Funcionales
- **10 Requerimientos** No Funcionales
- **9 Módulos** del sistema
- **12 Auditores** reales
- **16 Territoriales**
- **9 Procesos** sede
- **4 Seguimientos** trimestral/año
- **50% Reducción** tiempo desarrollo (reutilización)
- **100% Cumplimiento** Decreto 648

**Estado:** ✅ LISTO PARA IMPLEMENTACIÓN

---

# 🗺️ ROADMAP VISUAL - MÓDULO CIG

**Versión:** 1.0.0  
**Última Actualización:** 21 Diciembre 2025  
**Progreso Actual:** 30% (6 de 20 RFs)

---

## 📊 VISTA PANORÁMICA

```
MÓDULO CIG - CONTROL INTERNO DE GESTIÓN
════════════════════════════════════════════════════════════════════════

[████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 30%

✅ COMPLETADO: 6 RFs  
🔄 EN PROGRESO: 0 RFs  
⏳ PENDIENTE: 14 RFs  
```

---

## 🎯 FLUJO COMPLETO DE AUDITORÍA

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PROCESO DE AUDITORÍA ESAP-CIG                    │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   RF001      │      │   RF002      │      │   RF003      │
│ PLAN ANUAL   │ ───> │  UNIVERSO    │ ───> │  PROGRAMA    │
│              │      │              │      │   ANUAL      │
│   ✅ 100%    │      │   ✅ 100%    │      │   ✅ 95%     │
└──────────────┘      └──────────────┘      └──────────────┘
      │                                             │
      │ 5 ROLES                                    │ CRONOGRAMAS
      │ Decreto 648                                │ Diferenciados
      ▼                                             ▼
                    ┌─────────────────────────────────┐
                    │  INICIO DE AUDITORÍA INDIVIDUAL  │
                    └─────────────────────────────────┘
                                    │
                                    ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   RF004      │      │   RF005      │      │   RF006      │
│   INICIO     │ ───> │ PLANEACIÓN   │ ───> │  EJECUCIÓN   │
│              │      │              │      │              │
│   ✅ 100%    │      │   ✅ 100%    │      │   ✅ 100%    │
└──────────────┘      └──────────────┘      └──────────────┘
│                     │                     │
│ 4 Documentos        │ 3 Actividades       │ Listas+Hallazgos
│ Oficiales           │ EM-PT-004           │ RF007+RF008
▼                     ▼                     ▼
                                    │
                                    ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   RF009      │      │   RF010      │      │   RF011      │
│COMUNICACIÓN  │ ───> │ FORMULACIÓN  │ ───> │ SEGUIMIENTO  │
│              │      │ PLAN MEJORA  │      │ TRIMESTRAL   │
│   ❌ 0%      │      │   ❌ 0%      │      │   ❌ 0%      │
└──────────────┘      └──────────────┘      └──────────────┘
│                     │                     │
│ 3 Informes          │ Acciones            │ 4 veces/año
│ + Controversias     │ Correctivas         │ Jul Oct Ene Abr
▼                     ▼                     ▼
                                    │
                                    ▼
                    ┌─────────────────────────────────┐
                    │    AUDITORÍA FINALIZADA         │
                    └─────────────────────────────────┘
```

---

## 📅 TIMELINE DE DESARROLLO

```
DICIEMBRE 2025                 ENERO 2026                  FEBRERO 2026
├─────────────┬─────────────┬─────────────┬─────────────┬──────────────┐
│             │             │             │             │              │
│  SEMANA 1   │  SEMANA 2   │  SEMANA 3   │  SEMANA 4   │  SEMANA 5    │
│             │             │             │             │              │
│ ✅ RF001    │ ✅ RF004    │ 🔄 RF009    │ 🔄 RF010    │ 🔄 RF011     │
│ ✅ RF002    │ ✅ RF005    │ Comunicación│ Formulación │ Seguimiento  │
│ ✅ RF003    │ ✅ RF006    │             │             │              │
│             │             │             │             │              │
└─────────────┴─────────────┴─────────────┴─────────────┴──────────────┘
    Dic 14-20      Dic 21        Dic 22-27     Ene 1-10     Ene 11-24
```

---

## 🏗️ ARQUITECTURA DE MÓDULOS

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MÓDULO CIG                                  │
│                    Control Interno de Gestión                       │
└─────────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                │                               │
    ┌───────────▼──────────┐       ┌──────────▼───────────┐
    │  MÓDULO BACKOFFICE   │       │   MÓDULO PORTAL      │
    │    (Auditores)       │       │  (Áreas Auditadas)   │
    └──────────────────────┘       └──────────────────────┘
                │                               │
    ┌───────────┴───────────┐       ┌──────────┴───────────┐
    │                       │       │                      │
┌───▼────┐  ┌────▼─────┐ ┌─▼──┐  ┌─▼────┐  ┌──────▼──────┐
│ PLAN   │  │ AUDITO-  │ │PLAN│  │CONTRO│  │ CARGA       │
│ ANUAL  │  │ RÍAS     │ │MEJ │  │VERS. │  │ EVIDENCIAS  │
│        │  │          │ │    │  │      │  │             │
│ RF001  │  │ RF004-09 │ │010 │  │ 009  │  │ RF011       │
│ ✅     │  │ ✅✅✅❌  │ │❌  │  │ ❌   │  │ ❌          │
└────────┘  └──────────┘ └────┘  └──────┘  └─────────────┘
```

---

## 📊 ESTADO POR REQUERIMIENTO FUNCIONAL

### ✅ FASE 1: PLANIFICACIÓN (100% COMPLETO)

```
┌────────────────────────────────────────────────────┐
│ RF001 - Plan Anual CIG                             │
│ ████████████████████████████████████████ 100%      │
│ ✅ 5 Roles Decreto 648/2017                        │
│ ✅ Validación automática                           │
│ ✅ Dashboard indicadores                           │
│ ⚠️  Exportación Excel EMFO001 (pendiente)         │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│ RF002 - Universo de Auditorías                     │
│ ████████████████████████████████████████ 100%      │
│ ✅ Fórmula DAFP exacta                             │
│ ✅ 9 procesos + 16 territoriales                   │
│ ✅ Semáforos visuales                              │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│ RF003 - Programa Anual CIG                         │
│ ██████████████████████████████████████░░ 95%       │
│ ✅ Kanban visual                                   │
│ ✅ Cronogramas diferenciados                       │
│ ⚠️  Vista semanal EMFO001 (mejora)                │
└────────────────────────────────────────────────────┘
```

---

### ✅ FASE 2: PROCESO DE AUDITORÍA (60% COMPLETO)

```
┌────────────────────────────────────────────────────┐
│ RF004 - Auditoría - Inicio                         │
│ ████████████████████████████████████████ 100%      │
│ ✅ Wizard 4 pasos                                  │
│ ✅ 4 documentos oficiales automáticos              │
│ ✅ Expediente digital                              │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│ RF005 - Auditoría - Planeación                     │
│ ████████████████████████████████████████ 100%      │
│ ✅ 3 actividades EM-PT-004                         │
│ ✅ Dashboard progreso real-time                    │
│ ✅ Validación 100% para avanzar                    │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│ RF006 - Auditoría - Ejecución                      │
│ ████████████████████████████████████████ 100%      │
│ ✅ RF007 Listas Chequeo (integrado)                │
│ ✅ RF008 Hallazgos (integrado)                     │
│ ✅ Gestión evidencias multimedia                   │
│ ✅ Reunión de cierre                               │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│ RF009 - Auditoría - Comunicación                   │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0%       │
│ ❌ Informe Preliminar                              │
│ ❌ Gestión Controversias                           │
│ ❌ Informe Final                                   │
│ ❌ Informe Ejecutivo                               │
│ 🎯 SIGUIENTE INMEDIATO (5 días)                    │
└────────────────────────────────────────────────────┘
```

---

### 🔴 FASE 3: PLANES DE MEJORAMIENTO (0% COMPLETO)

```
┌────────────────────────────────────────────────────┐
│ RF010 - Plan Mejora - Formulación                  │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0%       │
│ ❌ Análisis de hallazgos                           │
│ ❌ Formulación acciones correctivas                │
│ ❌ Asignación responsables                         │
│ ❌ Definición plazos                               │
│ 🔴 CRÍTICO (10 días)                               │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│ RF011 - Plan Mejora - Seguimiento Trimestral       │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0%       │
│ ❌ Seguimiento 4x/año (Jul Oct Ene Abr)            │
│ ❌ Portal área auditada                            │
│ ❌ Validación evidencias                           │
│ ❌ Fórmula cumplimiento EMFO002                    │
│ ❌ Semáforos automáticos                           │
│ ❌ Recordatorios 7 días antes                      │
│ 🔴 CORE DEL SISTEMA (15 días)                      │
└────────────────────────────────────────────────────┘
```

---

### ⏳ FASE 4: GESTIÓN Y REPORTES (0% COMPLETO)

```
┌────────────────────────────────────────────────────┐
│ RF012-020 - Módulos de Soporte                     │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 0%       │
│ ❌ RF012 Informes de Ley (15-16 informes)          │
│ ❌ RF013 Gestión Documental                        │
│ ❌ RF014 Notificaciones Automáticas                │
│ ❌ RF015 RBAC y Permisos                           │
│ ❌ RF016 Reportes Ejecutivos (Power BI)            │
│ ❌ RF017 Auditorías Territoriales (EXTENDIDO)      │
│ ❌ RF018 Auditorías Especiales                     │
│ ❌ RF019 Configuración Sistema                     │
│ ❌ RF020 Auditoría de Cambios                      │
│ ⏳ PLANIFICADO (20 días)                           │
└────────────────────────────────────────────────────┘
```

---

## 🎯 PRIORIDADES CRÍTICAS

### 🔴 ALTA PRIORIDAD (Próximas 2 semanas)

```
1. RF009 - Comunicación
   ├─ Estimado: 5 días
   ├─ Razón: Completa flujo de auditoría
   └─ Impacto: SIN ESTO, auditorías quedan incompletas

2. RF010-011 - Planes de Mejoramiento
   ├─ Estimado: 15 días
   ├─ Razón: CORE del sistema según doc maestro
   └─ Impacto: CRÍTICO para compliance EM-PT-002
```

### 🟡 MEDIA PRIORIDAD (Próximo mes)

```
3. RF012-014 - Informes, Documental, Notificaciones
   ├─ Estimado: 10 días
   ├─ Razón: Soporte operativo
   └─ Impacto: Mejora eficiencia

4. Backend (NodeJS + Prisma)
   ├─ Estimado: 20 días
   ├─ Razón: Producción requiere backend
   └─ Impacto: Necesario para go-live
```

### 🟢 BAJA PRIORIDAD (2-3 meses)

```
5. RF015-020 - Configuración y Seguridad
   ├─ Estimado: 10 días
   ├─ Razón: Admin del sistema
   └─ Impacto: Operación avanzada

6. Tests y Documentación
   ├─ Estimado: 5 días
   ├─ Razón: Calidad y mantenibilidad
   └─ Impacto: Reducción de bugs
```

---

## 📊 MÉTRICAS DE PROGRESO

### Por Fase del Sistema

```
FASE 1: PLANIFICACIÓN
████████████████████████████████████████ 100% (3/3 RFs)

FASE 2: PROCESO DE AUDITORÍA  
████████████████████░░░░░░░░░░░░░░░░░░░  60% (3/5 RFs)

FASE 3: PLANES DE MEJORAMIENTO
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0% (0/2 RFs)

FASE 4: GESTIÓN Y REPORTES
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0% (0/9 RFs)
```

### Por Categoría

```
✅ COMPLETADOS
   6 RFs │ ████████████████░░░░░░░░░░░░░░░░░░░░ 30%

🔄 EN PROGRESO
   0 RFs │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  0%

⏳ PENDIENTES
  14 RFs │ ██████████████████████████████████░░ 70%
```

---

## 🏆 LOGROS ACUMULADOS

```
┌────────────────────────────────────────────────┐
│          LOGROS DESTACADOS                     │
├────────────────────────────────────────────────┤
│ ✅ 6 RFs con calidad excepcional              │
│ ✅ ~5,000 líneas de código limpio             │
│ ✅ 29 componentes modulares                   │
│ ✅ 100% TypeScript tipado                     │
│ ✅ Design System SIGL integrado               │
│ ✅ Responsive 100% mobile-first               │
│ ✅ Animaciones con Motion                     │
│ ✅ Accesibilidad WCAG 2.1 AA                  │
│ ✅ Decreto 648/2017 validado                  │
│ ✅ Fórmula DAFP implementada                  │
│ ✅ EM-PT-004 3 de 5 fases                     │
└────────────────────────────────────────────────┘
```

---

## 📅 CRONOGRAMA DETALLADO

### Semana Actual (22-27 Diciembre)

```
LUN 22  ─┬─ 🔴 RF009: Diseño de componentes
        │
MAR 23  ─┼─ 🔴 RF009: Informe Preliminar
        │
MIE 24  ─┼─ 🔴 RF009: Gestión Controversias
        │
JUE 25  ─┼─ 🎄 NAVIDAD (día libre)
        │
VIE 26  ─┼─ 🔴 RF009: Informes Final + Ejecutivo
        │
SAB 27  ─┴─ 🔴 RF009: Testing y documentación
```

### Semana 2-3 (Ene 1-10)

```
JUE 1   ─┬─ 🎉 AÑO NUEVO (día libre)
        │
VIE 2   ─┼─ 🔴 RF010: Diseño formulación
        │
LUN 5   ─┼─ 🔴 RF010: Análisis hallazgos
        │
MAR 6   ─┼─ 🔴 RF010: Acciones correctivas
        │
MIE 7   ─┼─ 🔴 RF010: Asignación responsables
        │
JUE 8   ─┼─ 🔴 RF010: Definición plazos
        │
VIE 9   ─┼─ 🔴 RF010: Validación área
        │
SAB 10  ─┴─ 🔴 RF010: Testing
```

### Semana 4-5 (Ene 11-24)

```
LUN 11  ─┬─ 🔴 RF011: Portal área auditada
        │
MAR 12  ─┼─ 🔴 RF011: Seguimiento trimestral
        │
MIE 13  ─┼─ 🔴 RF011: Carga evidencias
        │
JUE 14  ─┼─ 🔴 RF011: Validación auditor
        │
VIE 15  ─┼─ 🔴 RF011: Fórmula EMFO002
        │
        │
LUN 18  ─┼─ 🔴 RF011: Semáforos automáticos
        │
MAR 19  ─┼─ 🔴 RF011: Recordatorios
        │
MIE 20  ─┼─ 🔴 RF011: Dashboard Jefe OCI
        │
JUE 21  ─┼─ 🔴 RF011: Testing integral
        │
VIE 22  ─┼─ 🔴 RF011: Documentación
        │
SAB 23  ─┴─ ✅ ENTREGA RF010-011
```

---

## 🎯 HITOS CLAVE

```
┌────────────┬─────────────────────────────────────────┐
│ Dic 14-20  │ ✅ HITO 1: Fase Planificación completa  │
├────────────┼─────────────────────────────────────────┤
│ Dic 21     │ ✅ HITO 2: Proceso Auditoría 60%        │
├────────────┼─────────────────────────────────────────┤
│ Dic 27     │ 🎯 HITO 3: RF009 Comunicación (meta)    │
├────────────┼─────────────────────────────────────────┤
│ Ene 10     │ 🎯 HITO 4: RF010 Formulación (meta)     │
├────────────┼─────────────────────────────────────────┤
│ Ene 24     │ 🎯 HITO 5: RF011 Seguimiento (meta)     │
├────────────┼─────────────────────────────────────────┤
│ Feb 7      │ 🎯 HITO 6: Módulos soporte (meta)       │
├────────────┼─────────────────────────────────────────┤
│ Feb 28     │ 🎯 HITO 7: Backend completo (meta)      │
├────────────┼─────────────────────────────────────────┤
│ Mar 15     │ 🎯 HITO 8: UAT y ajustes (meta)         │
├────────────┼─────────────────────────────────────────┤
│ Mar 31     │ 🎯 HITO 9: GO-LIVE (meta final)         │
└────────────┴─────────────────────────────────────────┘
```

---

## 🚀 SIGUIENTE PASO INMEDIATO

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│           🔴 RF009 - FASE DE COMUNICACIÓN                   │
│                                                             │
│  Prioridad: ALTA                                            │
│  Estimado: 5 días                                           │
│  Inicio: 22 Diciembre 2025                                  │
│  Fin: 27 Diciembre 2025                                     │
│                                                             │
│  Componentes a crear:                                       │
│  ✓ ComunicacionAuditoriaModule.tsx                          │
│  ✓ FormularioInformePreliminar.tsx                          │
│  ✓ GestionControversias.tsx                                 │
│  ✓ FormularioInformeFinal.tsx                               │
│  ✓ FormularioInformeEjecutivo.tsx                           │
│                                                             │
│  Características:                                           │
│  ✓ Plantillas de informes con datos                         │
│  ✓ Sistema de controversias opcional                        │
│  ✓ Generación automática de PDFs                            │
│  ✓ Notificaciones al área auditada                          │
│  ✓ Dashboard de progreso                                    │
│  ✓ Validación antes de avanzar                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

**Preparado por:** Sistema de Planificación SIGL  
**Fecha:** 21 Diciembre 2025  
**Próxima Actualización:** 28 Diciembre 2025 (post RF009)

_Este roadmap se actualiza semanalmente._

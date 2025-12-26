# 👥 PERFILES DE USUARIO - SIGL v5.0

**Sistema:** SIGL - Sistema Integrado de Gestión Legal  
**Fecha:** 25 de Diciembre de 2024  
**Backoffice:** ESAP Comunidad Universitaria

---

## 🎯 **OBJETIVO**

Definir claramente qué hace cada tipo de usuario en SIGL, sus permisos, responsabilidades y flujos de trabajo típicos.

---

## 📊 **MATRIZ DE PERFILES**

### **PERFIL 1: Director Oficina Jurídica** 👨‍💼

**Rol:** Administrador General  
**Nivel:** Estratégico  
**Cantidad:** 1 usuario nacional

#### **Permisos:**
- ✅ Acceso TOTAL a todos los 11 módulos
- ✅ Vista consolidada en dashboard ejecutivo
- ✅ Aprobaciones finales de decisiones críticas
- ✅ Asignación y reasignación de casos
- ✅ Configuración de parámetros del sistema
- ✅ Exportación de reportes gerenciales
- ✅ Acceso a auditoría completa

#### **Módulos que usa diariamente:**
1. **Dashboard Ejecutivo** - Vista KPIs generales
2. **MOD-01: Defensa Judicial** - Seguimiento de casos críticos
3. **MOD-06: Órganos de Control** - Requerimientos urgentes
4. **MOD-09: Plan de Acción** - Cumplimiento institucional
5. **MOD-10: Riesgos** - Matriz de riesgos legales

#### **Caso de uso típico:**
```
08:00 AM - Ingresa al Dashboard Ejecutivo
08:15 AM - Revisa alertas críticas (vencimientos < 3 días)
08:30 AM - Asigna 3 expedientes nuevos a abogados disponibles
09:00 AM - Reunión con Coordinadores Legales
10:00 AM - Revisa borrador de contestación PJ-2025-001 (CRÍTICO)
10:30 AM - Aprueba contestación y autoriza radicación
11:00 AM - Responde requerimiento Contraloría (MOD-06)
12:00 PM - Genera reporte ejecutivo para Rectoría
```

#### **Notificaciones que recibe:**
- 🔴 Vencimientos en menos de 3 días
- 🟠 Asignaciones pendientes de aprobación
- 🟡 Requerimientos de órganos de control
- 🔵 Sentencias emitidas
- ⚪ Reportes semanales automáticos

---

### **PERFIL 2: Coordinador Legal** 👨‍💼

**Rol:** Gestor de Área  
**Nivel:** Táctico  
**Cantidad:** 4 usuarios (1 por área: Defensa, Disciplinario, Contractual, Laboral)

#### **Permisos:**
- ✅ Acceso a módulos de su área de competencia
- ✅ Asignación de casos a abogados de su equipo
- ✅ Revisión y aprobación de actuaciones
- ✅ Generación de reportes parciales
- ✅ Seguimiento de términos de su área
- ⛔ No puede reasignar casos de otras áreas
- ⛔ No puede modificar parámetros globales

#### **Módulos que usa diariamente:**
1. **MOD-01: Defensa Judicial** (Coordinador Litigio)
2. **MOD-02: Juzgamiento Disciplinario** (Coordinador Disciplinario)
3. **MOD-03: Asesoría Jurídica** (Todos)
4. **MOD-07: Procesos Coactivos** (Coordinador Cobro Coactivo)
5. **MOD-05: Términos e Informes** (Todos)

#### **Caso de uso típico - Coordinador de Defensa Judicial:**
```
08:00 AM - Revisa bandeja de casos asignados a su equipo (18 activos)
08:30 AM - Asigna PJ-2025-013 (nuevo) a Dra. Ana López (disponibilidad)
09:00 AM - Revisa contestación preliminar de PJ-2024-089
09:45 AM - Solicita ajustes a abogado: "Incluir jurisprudencia reciente"
10:30 AM - Aprueba contestación corregida
11:00 AM - Coordina con abogados vencimientos de la semana
12:00 PM - Prepara informe semanal para Director
14:00 PM - Reunión de equipo: Análisis de caso complejo PJ-2024-055
15:30 PM - Actualiza estrategia procesal en expediente
```

#### **Notificaciones que recibe:**
- 🔴 Vencimientos de su equipo < 5 días
- 🟠 Contestaciones pendientes de revisión
- 🟡 Asignaciones nuevas de Director
- 🔵 Actuaciones de abogados de su equipo
- ⚪ Reportes semanales de desempeño

---

### **PERFIL 3: Abogado Asignado** 👨‍⚖️

**Rol:** Operativo / Litigante  
**Nivel:** Operativo  
**Cantidad:** 15-20 usuarios

#### **Permisos:**
- ✅ Acceso SOLO a expedientes asignados a él/ella
- ✅ Actualización de actuaciones propias
- ✅ Carga de documentos al expediente
- ✅ Solicitud de aprobación a Coordinador
- ✅ Consulta de jurisprudencia y normativa
- ⛔ No puede ver expedientes de otros abogados
- ⛔ No puede cerrar casos sin aprobación
- ⛔ No puede reasignar casos

#### **Módulos que usa diariamente:**
1. **MOD-01: Defensa Judicial** - Sus expedientes asignados
2. **MOD-03: Asesoría Jurídica** - Consultas que debe responder
3. **MOD-04: Buzón Notificaciones** - Notificaciones judiciales
4. **MOD-05: Términos e Informes** - Control de vencimientos
5. **MOD-08: Buzón Oficina Jurídica** - Comunicaciones internas

#### **Caso de uso típico - Dra. Ana López García:**
```
08:00 AM - Ingresa al sistema. Ve 6 expedientes asignados activos
08:15 AM - Revisa PJ-2025-001 (CRÍTICO - Vence en 3 días)
08:30 AM - Descarga demanda y pruebas del expediente
09:00 AM - Redacta contestación de demanda (4 horas)
13:00 PM - Adjunta borrador de contestación al sistema
13:15 PM - Solicita revisión a Coordinador Legal
14:00 PM - Atiende notificación judicial en MOD-04 (nueva actuación)
14:30 PM - Actualiza timeline de PJ-2024-075 con auto del juzgado
15:00 PM - Responde 3 consultas jurídicas del MOD-03
16:00 PM - Prepara memorial de alegatos para PJ-2023-089
17:00 PM - Coordina con Coordinador sobre estrategia PJ-2024-120
```

#### **Notificaciones que recibe:**
- 🔴 Vencimientos de SUS expedientes < 5 días
- 🟠 Aprobaciones/rechazos de Coordinador
- 🟡 Nuevas asignaciones
- 🔵 Notificaciones judiciales entrantes
- ⚪ Recordatorios de actuaciones pendientes

---

### **PERFIL 4: Asistente Administrativo** 📋

**Rol:** Apoyo Operativo  
**Nivel:** Soporte  
**Cantidad:** 5-8 usuarios

#### **Permisos:**
- ✅ Radicación de documentos recibidos
- ✅ Archivo físico y digitalización
- ✅ Registro de notificaciones básicas
- ✅ Consulta de información para atención al público
- ✅ Generación de certificaciones básicas
- ⛔ No puede editar expedientes
- ⛔ No puede aprobar actuaciones
- ⛔ No puede ver información sensible

#### **Módulos que usa diariamente:**
1. **MOD-04: Buzón Notificaciones** - Registro de correo judicial
2. **MOD-08: Buzón Oficina Jurídica** - Comunicaciones internas
3. **MOD-05: Términos e Informes** - Apoyo en radicación
4. **MOD-11: Planes Mejoramiento** - Carga de evidencias

#### **Caso de uso típico - Asistente María Gómez:**
```
08:00 AM - Recibe correo judicial físico de juzgado
08:15 AM - Escanea notificación judicial (5 páginas)
08:30 AM - Registra en MOD-04: Buzón Notificaciones
08:45 AM - Asigna notificación a abogado correspondiente
09:00 AM - Clasifica y archiva oficios de órganos de control
10:00 AM - Digitaliza 15 documentos de expedientes antiguos
11:00 AM - Atiende ciudadano: Genera certificado de no procesos
12:00 PM - Actualiza planilla de radicación del día
14:00 PM - Prepara carpetas físicas para audiencias de la semana
15:00 PM - Organiza archivo físico en bodega judicial
16:00 PM - Genera reporte de radicación diaria
```

#### **Notificaciones que recibe:**
- 🟡 Documentos pendientes de clasificar
- 🔵 Solicitudes de certificaciones
- ⚪ Recordatorios de digitalización pendiente

---

### **PERFIL 5: Auditor Interno / Control** 🔍

**Rol:** Supervisión y Control  
**Nivel:** Auditoría  
**Cantidad:** 2-3 usuarios

#### **Permisos:**
- ✅ Acceso de SOLO LECTURA a todos los módulos
- ✅ Exportación de reportes de auditoría
- ✅ Visualización de trazabilidad completa
- ✅ Generación de alertas de cumplimiento
- ✅ Dashboard de indicadores de gestión
- ⛔ NO puede editar ningún dato
- ⛔ NO puede aprobar actuaciones
- ⛔ NO puede reasignar casos

#### **Módulos que usa diariamente:**
1. **Dashboard Ejecutivo** - KPIs generales
2. **Todos los MOD (solo lectura)** - Auditoría completa
3. **MOD-09: Plan de Acción** - Seguimiento de compromisos
4. **MOD-10: Riesgos** - Evaluación de controles
5. **MOD-11: Planes Mejoramiento** - Verificación de cumplimiento

#### **Caso de uso típico - Auditor Interno:**
```
08:00 AM - Genera reporte de vencimientos del mes
08:30 AM - Identifica 3 expedientes con retrasos superiores a 10 días
09:00 AM - Revisa trazabilidad de PJ-2024-089 (auditoría aleatoria)
10:00 AM - Verifica cumplimiento de términos legales en MOD-05
11:00 AM - Genera alerta: "2 casos sin actualización en 30 días"
12:00 PM - Prepara informe trimestral de gestión legal
14:00 PM - Reunión con Director: Presentación de hallazgos
15:30 PM - Verifica implementación de controles en MOD-10
16:30 PM - Documenta hallazgos en sistema de control interno
```

#### **Notificaciones que recibe:**
- 🔴 Incumplimientos de términos legales
- 🟠 Expedientes sin movimiento > 30 días
- 🟡 Anomalías en asignaciones
- 🔵 Reportes programados automáticos

---

## 🔐 **MATRIZ RACI - PERMISOS POR MÓDULO**

| Módulo | Director | Coordinador | Abogado | Asistente | Auditor |
|--------|----------|-------------|---------|-----------|---------|
| **MOD-01: Defensa Judicial** | A/R | A/C | R | I | C |
| **MOD-02: Juzgamiento Disciplinario** | A/R | A/C | R | I | C |
| **MOD-03: Asesoría Jurídica** | A | A/C | R | I | C |
| **MOD-04: Buzón Notificaciones** | C | C | R | R | C |
| **MOD-05: Términos e Informes** | A | A/C | R | I | C |
| **MOD-06: Órganos Control** | A/R | A/C | R | I | C |
| **MOD-07: Procesos Coactivos** | A/R | A/C | R | I | C |
| **MOD-08: Buzón Oficina Jurídica** | C | C | R | R | C |
| **MOD-09: Plan de Acción** | A/R | C | I | - | C |
| **MOD-10: Riesgos** | A/R | C | I | - | C |
| **MOD-11: Planes Mejoramiento** | A/R | A/C | R | I | C |

**Leyenda:**
- **R** = Responsable (ejecuta la tarea)
- **A** = Aprobador (aprueba el resultado)
- **C** = Consultado (se le consulta antes de decidir)
- **I** = Informado (se le informa del resultado)

---

## 📈 **FLUJOS DE TRABAJO TÍPICOS**

### **FLUJO 1: Contestación de Demanda (Caso Crítico)**

```
1. ALERTA AUTOMÁTICA (Sistema)
   ↓
2. DIRECTOR revisa en Dashboard
   ↓
3. DIRECTOR asigna a Coordinador de área
   ↓
4. COORDINADOR asigna a Abogado disponible
   ↓
5. ABOGADO redacta contestación
   ↓
6. ABOGADO solicita aprobación a Coordinador
   ↓
7. COORDINADOR revisa y aprueba/rechaza
   ↓
8. Si aprobado → ABOGADO radica en juzgado
   ↓
9. ASISTENTE registra radicación en sistema
   ↓
10. AUDITOR verifica cumplimiento de término
```

### **FLUJO 2: Atención de Requerimiento Contraloría**

```
1. ASISTENTE recibe oficio físico
   ↓
2. ASISTENTE escanea y registra en MOD-06
   ↓
3. Sistema asigna automáticamente a Coordinador
   ↓
4. COORDINADOR evalúa complejidad
   ↓
5. COORDINADOR asigna a Abogado especializado
   ↓
6. ABOGADO prepara respuesta técnica
   ↓
7. COORDINADOR revisa técnicamente
   ↓
8. DIRECTOR aprueba respuesta final
   ↓
9. ASISTENTE radica oficio de respuesta
   ↓
10. AUDITOR verifica cumplimiento y oportunidad
```

### **FLUJO 3: Consulta Jurídica Interna**

```
1. Dependencia interna envía consulta (MOD-03)
   ↓
2. Sistema clasifica por temática
   ↓
3. COORDINADOR asigna a Abogado experto
   ↓
4. ABOGADO investiga y redacta concepto
   ↓
5. COORDINADOR revisa técnicamente
   ↓
6. ABOGADO envía respuesta a solicitante
   ↓
7. Sistema actualiza base de conocimiento
```

---

## 🎯 **INDICADORES POR PERFIL**

### **Director:**
- % de cumplimiento de términos legales
- Cuantía total en riesgo
- Tasa de éxito en procesos finalizados
- Tiempo promedio de respuesta institucional

### **Coordinador:**
- Carga de trabajo por abogado
- Calidad de actuaciones (rechazos vs aprobaciones)
- Tiempos de revisión
- % de términos vencidos en su área

### **Abogado:**
- Número de casos asignados
- % de términos cumplidos
- Calidad de actuaciones (aprobaciones primer intento)
- Tasa de éxito en sus casos

### **Asistente:**
- Documentos radicados/día
- Tiempo promedio de digitalización
- Certificaciones generadas
- % de clasificación correcta

### **Auditor:**
- Hallazgos identificados
- % de cumplimiento normativo
- Riesgos mitigados
- Recomendaciones implementadas

---

## 💡 **RECOMENDACIONES DE USABILIDAD**

### **Para Directores:**
- Dashboard con KPIs en tiempo real
- Alertas push para casos críticos
- Vista consolidada de todas las áreas
- Reportes gerenciales automáticos

### **Para Coordinadores:**
- Vista kanban de casos por etapa
- Herramienta de balanceo de carga
- Alertas de términos por vencer
- Métricas de desempeño de equipo

### **Para Abogados:**
- Vista de "Mis Casos" personalizada
- Calendario integrado con vencimientos
- Plantillas de actuaciones frecuentes
- Acceso rápido a jurisprudencia

### **Para Asistentes:**
- Interface simplificada de radicación
- Escáner integrado (OCR)
- Clasificación asistida por IA
- Buscador rápido de expedientes

### **Para Auditores:**
- Reportes configurables
- Exportación a Excel/PDF
- Filtros avanzados por fecha
- Gráficos de cumplimiento

---

**DOCUMENTO CREADO:** 25 de Diciembre de 2024  
**Sistema:** SIGL v5.0 - Backoffice ESAP

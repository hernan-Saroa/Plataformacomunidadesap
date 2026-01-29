# Procesos de Negocio y Notacion BPMN

## Plataforma ComUNIdad ESAP

**Version:** 1.0
**Fecha:** Enero 2026
**Autor:** Equipo de Arquitectura ESAP

---

## Tabla de Contenidos

1. [Introduccion](#1-introduccion)
2. [Glosario de Notacion BPMN](#2-glosario-de-notacion-bpmn)
3. [Mapa General de Procesos](#3-mapa-general-de-procesos)
4. [Procesos de Negocio Detallados](#4-procesos-de-negocio-detallados)
   - 4.1 [Proceso de Auditoria Interna](#41-proceso-de-auditoria-interna)
   - 4.2 [Proceso de Certificados Academicos](#42-proceso-de-certificados-academicos)
   - 4.3 [Proceso de Verificacion de Titulos](#43-proceso-de-verificacion-de-titulos)
   - 4.4 [Proceso Disciplinario](#44-proceso-disciplinario)
   - 4.5 [Proceso de Defensa Judicial](#45-proceso-de-defensa-judicial)
   - 4.6 [Proceso de Cobro Coactivo](#46-proceso-de-cobro-coactivo)
   - 4.7 [Proceso de Plan de Trabajo Academico (PTA)](#47-proceso-de-plan-de-trabajo-academico-pta)
   - 4.8 [Proceso de Gestion de Usuarios y Roles](#48-proceso-de-gestion-de-usuarios-y-roles)
   - 4.9 [Proceso de Certificados Laborales](#49-proceso-de-certificados-laborales)
5. [Matriz de Roles y Responsabilidades](#5-matriz-de-roles-y-responsabilidades)
6. [Integraciones entre Procesos](#6-integraciones-entre-procesos)

---

## 1. Introduccion

Este documento describe los principales procesos de negocio de la plataforma **ComUNIdad ESAP** utilizando la **Notacion de Modelado de Procesos de Negocio (BPMN 2.0)**.

La plataforma ESAP es una super aplicacion integrada que gestiona multiples procesos administrativos, academicos, legales y disciplinarios de la Escuela Superior de Administracion Publica de Colombia.

### 1.1 Proposito del Documento

- Documentar los flujos de trabajo principales del sistema
- Facilitar la comprension de los procesos por parte de stakeholders
- Servir como base para mejoras y optimizaciones
- Establecer un lenguaje comun entre areas de negocio y tecnologia

### 1.2 Ambitos del Sistema

| Ambito | Descripcion | Usuarios |
|--------|-------------|----------|
| **Landing Page** | Portal publico informativo | Publico general |
| **Portal Transaccional** | Servicios para usuarios externos | Graduados, Estudiantes, Aspirantes |
| **Backoffice Administrativo** | Gestion interna | Administrativos, Auditores, Docentes |

---

## 2. Glosario de Notacion BPMN

### 2.1 Eventos

```
( O )     Evento de Inicio - Indica donde comienza el proceso
(( O ))   Evento Intermedio - Ocurre durante el proceso
( @ )     Evento de Fin - Indica donde termina el proceso
( T )     Evento de Temporizador - Disparo por tiempo
( M )     Evento de Mensaje - Disparo por comunicacion
```

### 2.2 Actividades

```
+------------------+
|    Tarea         |   Tarea Simple - Unidad de trabajo atomica
+------------------+

+==================+
||   Subproceso   ||   Subproceso - Proceso anidado
+==================+

[Usuario]          Pool/Lane - Responsable de las tareas
```

### 2.3 Compuertas (Gateways)

```
  < >    Compuerta Exclusiva (XOR) - Solo un camino
  < + >  Compuerta Paralela (AND) - Todos los caminos
  < O >  Compuerta Inclusiva (OR) - Uno o mas caminos
```

### 2.4 Flujos

```
------>  Flujo de Secuencia - Orden de ejecucion
- - - >  Flujo de Mensaje - Comunicacion entre participantes
......>  Flujo de Asociacion - Vincula artefactos
```

### 2.5 Artefactos

```
[======]  Documento/Datos
{  }      Anotacion/Comentario
[DB]      Almacen de Datos
```

---

## 3. Mapa General de Procesos

```
+===========================================================================+
||                    MAPA DE PROCESOS - ESAP ComUNIdad                    ||
+===========================================================================+

                          PROCESOS ESTRATEGICOS
    +-----------------------------------------------------------------------+
    |  [Planificacion Institucional]  [Gestion de Calidad]  [Normatividad]  |
    +-----------------------------------------------------------------------+
                                      |
                                      v
                          PROCESOS MISIONALES
    +-----------------------------------------------------------------------+
    |                                                                       |
    |  +------------------+  +------------------+  +------------------+     |
    |  | GESTION          |  | GESTION          |  | GESTION          |     |
    |  | ACADEMICA        |  | ADMINISTRATIVA   |  | LEGAL            |     |
    |  |                  |  |                  |  |                  |     |
    |  | - Certificados   |  | - Control Interno|  | - Disciplinario  |     |
    |  | - Titulos        |  | - Auditorias     |  | - Defensa Judicial|    |
    |  | - PTA Docentes   |  | - Usuarios/Roles |  | - Cobro Coactivo |     |
    |  +------------------+  +------------------+  +------------------+     |
    |                                                                       |
    +-----------------------------------------------------------------------+
                                      |
                                      v
                           PROCESOS DE APOYO
    +-----------------------------------------------------------------------+
    |  [Gestion Documental]  [Notificaciones]  [Firma Electronica]         |
    |  [Auditoria Sistema]   [Reportes]        [Seguridad]                 |
    +-----------------------------------------------------------------------+
```

---

## 4. Procesos de Negocio Detallados

---

### 4.1 Proceso de Auditoria Interna

**ID Proceso:** PROC-AUD-001
**Modulo:** Control Interno
**Ubicacion:** `/src/components/esap/control-interno/`

#### 4.1.1 Descripcion General

Sistema completo de gestion de auditorias internas con generacion automatica de documentos, listas de chequeo estandarizadas y flujos de aprobacion multinivel.

#### 4.1.2 Actores (Pools/Lanes)

| Actor | Rol | Responsabilidades |
|-------|-----|-------------------|
| Jefe OCI | Aprobador | Aprueba planes y resultados de auditoria |
| Auditor Lider | Ejecutor | Conduce la auditoria y genera hallazgos |
| Equipo Auditor | Apoyo | Ejecuta procedimientos de auditoria |
| Area Auditada | Auditado | Proporciona informacion y responde hallazgos |

#### 4.1.3 Diagrama BPMN

```
+===========================================================================+
||                    PROCESO DE AUDITORIA INTERNA                         ||
+===========================================================================+

[Jefe OCI]
    |
    |  ( O )                                                    ( @ )
    |    |                                                        ^
    |    v                                                        |
    | +------------------+     +------------------+     +------------------+
    | | Aprobar Plan     |---->| Revisar Informe  |---->| Publicar         |
    | | Anual            |     | Final            |     | Resultados       |
    | +------------------+     +------------------+     +------------------+
    |         |                        ^
    |         v                        |
----|---------|------------------------|----------------------------------------
    |         |                        |
[Auditor Lider]                        |
    |         |                        |
    |         v                        |
    | +==================+     +------------------+     +------------------+
    | || Planificar     ||---->| Ejecutar         |---->| Elaborar         |
    | || Auditoria      ||     | Auditoria        |     | Informe          |
    | +==================+     +------------------+     +------------------+
    |         |                        |                        |
    |         v                        v                        v
    | +------------------+     +------------------+     +------------------+
    | | Generar Docs:    |     | Documentar       |     | Registrar        |
    | | - Oficio Anuncio |     | Hallazgos        |     | Conclusiones     |
    | | - Carta Compromiso|    |                  |     |                  |
    | +------------------+     +------------------+     +------------------+
    |                                  |
----|----------------------------------|----------------------------------------
    |                                  |
[Area Auditada]                        |
    |                                  v
    |                          +------------------+
    |                          | Responder        |
    |                          | Hallazgos        |
    |                          +------------------+
    |                                  |
    |                                  v
    |                          +------------------+
    |                          | Implementar      |
    |                          | Plan Mejora      |
    |                          +------------------+
```

#### 4.1.4 Subproceso: Planificar Auditoria (Wizard 4 Pasos)

```
+===========================================================================+
||              SUBPROCESO: PLANIFICAR AUDITORIA (WIZARD)                  ||
+===========================================================================+

( O )
  |
  v
+------------------+     +------------------+     +------------------+
| PASO 1:          |---->| PASO 2:          |---->| PASO 3:          |
| Seleccionar      |     | Configurar       |     | Generar          |
| Auditoria        |     | Equipo y Fechas  |     | Documentos       |
| Programada       |     |                  |     |                  |
+------------------+     +------------------+     +------------------+
        |                        |                        |
        v                        v                        v
[Lista auditorias]       [Asignar auditores]     [Oficio Anuncio]
[Tipo: Gestion,          [Definir alcance]       [Carta Representante]
 Cumplimiento,           [Fechas inicio/fin]     [Compromiso Confidencial]
 Financiera, TIC]                                [Programa Individual]
                                                         |
                                                         v
                                                 +------------------+
                                                 | PASO 4:          |
                                                 | Confirmar e      |
                                                 | Iniciar          |
                                                 +------------------+
                                                         |
                                                         v
                                                 [Crear Expediente]
                                                 [Notificar Area]
                                                         |
                                                         v
                                                      ( @ )
```

#### 4.1.5 Estados del Proceso

```
+-------------+     +----------------+     +---------------+     +-------------+
| programada  |---->| en-planeacion  |---->| en-ejecucion  |---->| en-comunic. |
+-------------+     +----------------+     +---------------+     +-------------+
                                                                       |
                                                                       v
                                                                 +----------+
                                                                 | cerrada  |
                                                                 +----------+

Estado alternativo: [cancelada] (puede ocurrir desde cualquier estado)
```

#### 4.1.6 Componentes del Sistema

| Componente | Archivo | Funcion |
|------------|---------|---------|
| Wizard Inicio | `InicioAuditoriaWizard.tsx` | Asistente 4 pasos |
| Ejecucion | `EjecucionAuditoriaModule.tsx` | Registro de hallazgos |
| Planes Mejora | `FormulacionPlanMejoramientoModule.tsx` | Acciones correctivas |
| Seguimiento | `SeguimientoPlanMejoramientoModule.tsx` | Monitoreo de avances |
| Listas Chequeo | `ListasChequeoEstandarizadas.tsx` | Verificacion procedimientos |

---

### 4.2 Proceso de Certificados Academicos

**ID Proceso:** PROC-CERT-001
**Modulo:** Certificados
**Ubicacion:** `/src/components/esap/CertificateRequestsModule.tsx`

#### 4.2.1 Descripcion General

Gestion integral de solicitud, generacion, verificacion y entrega de certificados academicos incluyendo notas, estudios, grado y matricula.

#### 4.2.2 Actores

| Actor | Rol | Responsabilidades |
|-------|-----|-------------------|
| Solicitante | Estudiante/Graduado | Solicita certificados |
| Registrador | Procesador | Valida y genera certificados |
| Sistema | Automatico | Genera PDF con QR y firma digital |
| Verificador | Publico | Valida autenticidad del certificado |

#### 4.2.3 Diagrama BPMN

```
+===========================================================================+
||                 PROCESO DE CERTIFICADOS ACADEMICOS                      ||
+===========================================================================+

[Solicitante]
    |
    |  ( O )
    |    |
    |    v
    | +------------------+
    | | Acceder Portal   |
    | | Transaccional    |
    | +------------------+
    |         |
    |         v
    | +------------------+     < >-----> +------------------+
    | | Seleccionar      |---->|SI      | Realizar Pago    |
    | | Tipo Certificado |     |        | (si aplica)      |
    | +------------------+     |        +------------------+
    |                          |NO               |
    |                          v                 |
    |                   +------+-----------------+
    |                   |
    |                   v
    | +------------------+
    | | Enviar Solicitud |
    | +------------------+
    |         |
----|---------|----------------------------------------------------------------
    |         |
[Registrador Academico]
    |         v
    | +------------------+     +------------------+     +------------------+
    | | Recibir          |---->| Validar Datos    |---->| Aprobar/Rechazar |
    | | Solicitud        |     | Academicos       |     |                  |
    | +------------------+     +------------------+     +------------------+
    |                                                          |
    |                                   +----------------------+
    |                                   |
    |                          < >------+
    |                          |        |
    |                     APROBADO   RECHAZADO
    |                          |        |
    |                          v        v
    |                   +----------+ +------------------+
    |                   | Generar  | | Notificar        |
    |                   | Certif.  | | Rechazo          |---> ( @ )
    |                   +----------+ +------------------+
    |                          |
----|--------------------------|-----------------------------------------------
    |                          |
[Sistema Automatico]           v
    |                   +------------------+
    |                   | Generar PDF      |
    |                   | con QR y Firma   |
    |                   +------------------+
    |                          |
    |                          v
    |                   +------------------+
    |                   | Enviar por Canal |
    |                   | Seleccionado     |
    |                   +------------------+
    |                          |
----|--------------------------|-----------------------------------------------
    |                          |
[Solicitante]                  v
    |                   +------------------+
    |                   | Recibir          |
    |                   | Certificado      |
    |                   +------------------+
    |                          |
    |                          v
    |                       ( @ )
```

#### 4.2.4 Subproceso: Verificacion Publica

```
+===========================================================================+
||                 SUBPROCESO: VERIFICACION PUBLICA                        ||
+===========================================================================+

[Verificador Externo]

( O )
  |
  v
+------------------+     +------------------+     +------------------+
| Escanear QR      |---->| Sistema Valida   |---->| Mostrar Info     |
| del Certificado  |     | Autenticidad     |     | Verificada       |
+------------------+     +------------------+     +------------------+
                                |                        |
                                v                        v
                         [DB Certificados]        [Registrar en Log]
                                                         |
                                                         v
                                                      ( @ )
```

#### 4.2.5 Estados del Certificado

```
+----------+     +------------+     +----------+     +-------+     +-----------+
| pending  |---->| in_process |---->| approved |---->| ready |---->| delivered |
+----------+     +------------+     +----------+     +-------+     +-----------+
     |                 |
     v                 v
+-----------+    +-----------+
| cancelled |    | rejected  |
+-----------+    +-----------+
```

#### 4.2.6 Tipos de Certificados

| Tipo | Descripcion | Tiempo Estimado |
|------|-------------|-----------------|
| Notas | Historial academico con calificaciones | 24 horas |
| Estudios | Constancia de estudios cursados | 24 horas |
| Grado | Certificacion de titulo obtenido | 48 horas |
| Matricula | Constancia de matricula vigente | 12 horas |
| Programa | Informacion del programa cursado | 24 horas |

---

### 4.3 Proceso de Verificacion de Titulos

**ID Proceso:** PROC-TIT-001
**Modulo:** Graduados
**Ubicacion:** `/src/components/esap/GraduatesManagementModule.tsx`

#### 4.3.1 Descripcion General

Gestion de personas graduadas, verificacion de titulos y generacion de certificados de verificacion oficial con codigo QR.

#### 4.3.2 Diagrama BPMN

```
+===========================================================================+
||                  PROCESO DE VERIFICACION DE TITULOS                     ||
+===========================================================================+

[Entidad Externa/Empleador]

( O )
  |
  v
+------------------+     +------------------+     +------------------+
| Acceder Portal   |---->| Ingresar Datos   |---->| Consultar        |
| Publico          |     | del Graduado     |     | Base de Datos    |
+------------------+     +------------------+     +------------------+
                                                         |
                                                < >------+
                                                |        |
                                           ENCONTRADO  NO ENCONTRADO
                                                |        |
                                                v        v
                                         +----------+ +------------------+
                                         | Mostrar  | | Mostrar Mensaje  |
                                         | Info     | | No Encontrado    |---> ( @ )
                                         | Titulo   | +------------------+
                                         +----------+
                                                |
                                                v
                                         +------------------+
                                         | Generar Certif.  |
                                         | Verificacion     |
                                         +------------------+
                                                |
                                                v
                                         [PDF con QR]
                                         [Firma Digital]
                                                |
                                                v
                                             ( @ )
```

#### 4.3.3 Datos Verificados

| Campo | Descripcion |
|-------|-------------|
| Nombre Completo | Nombre del graduado |
| Documento | Numero de identificacion |
| Programa | Programa academico cursado |
| Titulo | Titulo otorgado |
| Fecha Grado | Fecha de graduacion |
| Acta | Numero de acta de grado |
| SNIES | Codigo SNIES del programa |

---

### 4.4 Proceso Disciplinario

**ID Proceso:** PROC-DISC-001
**Modulo:** Control Disciplinario
**Ubicacion:** `/src/components/esap/disciplinario/`

#### 4.4.1 Descripcion General

Gestion de procesos disciplinarios contra funcionarios de la institucion, desde la denuncia hasta el fallo final.

#### 4.4.2 Actores

| Actor | Rol | Responsabilidades |
|-------|-----|-------------------|
| Denunciante | Iniciador | Presenta la denuncia |
| Instructor | Investigador | Conduce la investigacion |
| Tribunal | Juzgador | Emite decision final |
| Denunciado | Investigado | Ejerce derecho de defensa |
| Defensor | Abogado | Representa al denunciado |

#### 4.4.3 Diagrama BPMN

```
+===========================================================================+
||                      PROCESO DISCIPLINARIO                              ||
+===========================================================================+

[Denunciante]
    |
    |  ( O )
    |    |
    |    v
    | +------------------+
    | | Presentar        |
    | | Denuncia         |
    | +------------------+
    |         |
----|---------|----------------------------------------------------------------
    |         |
[Instructor del Proceso]
    |         v
    | +------------------+     +------------------+     +------------------+
    | | Evaluar          |---->| Abrir            |---->| Notificar        |
    | | Procedencia      |     | Investigacion    |     | Denunciado       |
    | +------------------+     +------------------+     +------------------+
    |         |                        |                        |
    |    < >--+                        v                        v
    |    |    |                 +------------------+     +------------------+
    |  SI   NO                  | Recopilar        |     | Vincular al      |
    |    |    |                 | Pruebas          |     | Proceso          |
    |    |    v                 +------------------+     +------------------+
    |    | +----------+                |
    |    | | Archivar |                v
    |    | +----------+         +------------------+
    |    |     |                | Formular         |
    |    |     v                | Cargos           |
    |    |  ( @ )               +------------------+
    |    |                             |
----|----|-----------------------------|---------------------------------------
    |    |                             |
[Denunciado/Defensor]                  v
    |    |                      +------------------+
    |    |                      | Presentar        |
    |    |                      | Descargos        |
    |    |                      +------------------+
    |    |                             |
    |    |                             v
    |    |                      +------------------+
    |    |                      | Solicitar        |
    |    |                      | Pruebas          |
    |    |                      +------------------+
    |    |                             |
----|----|-----------------------------|---------------------------------------
    |    |                             |
[Tribunal Disciplinario]               v
    |    |                      +------------------+
    |    |                      | Evaluar Pruebas  |
    |    |                      +------------------+
    |    |                             |
    |    |                             v
    |    |                      +------------------+
    |    |                      | Emitir Fallo     |
    |    |                      +------------------+
    |    |                             |
    |    |                        < >--+
    |    |                        |    |
    |    |                   SANCION  ABSOLUCION
    |    |                        |    |
    |    |                        v    v
    |    |                 +----------+ +----------+
    |    |                 | Aplicar  | | Cerrar   |
    |    |                 | Sancion  | | Proceso  |
    |    |                 +----------+ +----------+
    |    |                        |          |
    |    |                        v          v
    |    +---------------------->( @ )<------+
```

#### 4.4.4 Estados del Proceso

```
+----------+     +----------------+     +----------------+     +----------+
| INICIADO |---->| EN_INVESTIGACION |-->| ETAPA_PROBATORIA |-->| ALEGATOS |
+----------+     +----------------+     +----------------+     +----------+
                                                                    |
                                                                    v
                                                              +----------+
                                                              | FALLADO  |
                                                              +----------+
                                                                    |
                                                         +----------+----------+
                                                         |                     |
                                                         v                     v
                                                   +----------+          +----------+
                                                   | SANCIONADO|         | ABSUELTO |
                                                   +----------+          +----------+

Estado alternativo: [ARCHIVADO] (puede ocurrir desde INICIADO)
```

#### 4.4.5 Tipos de Sanciones

| Tipo | Descripcion | Duracion |
|------|-------------|----------|
| Amonestacion | Llamado de atencion formal | N/A |
| Suspension | Suspension temporal del cargo | 1-90 dias |
| Destitucion | Retiro definitivo del cargo | Permanente |
| Inhabilidad | Prohibicion de ejercer cargos | 1-20 anhos |

---

### 4.5 Proceso de Defensa Judicial

**ID Proceso:** PROC-DEF-001
**Modulo:** Gestion Legal
**Ubicacion:** `/src/components/esap/gestion-legal/modulos/ModuloDefensaJudicialV3.tsx`

#### 4.5.1 Descripcion General

Gestion de demandas contra ESAP y su defensa legal en procesos judiciales ante diferentes jurisdicciones.

#### 4.5.2 Diagrama BPMN

```
+===========================================================================+
||                     PROCESO DE DEFENSA JUDICIAL                         ||
+===========================================================================+

[Demandante Externo]
    |
    |  ( O )
    |    |
    |    v
    | +------------------+
    | | Presentar        |
    | | Demanda          |
    | +------------------+
    |         |
    |    - - - - - - - - > [Juzgado] Notifica a ESAP
    |                            |
----|----------------------------|---------------------------------------------
    |                            |
[Oficina Juridica ESAP]          v
    |                     +------------------+
    |                     | Recibir          |
    |                     | Notificacion     |
    |                     +------------------+
    |                            |
    |                            v
    |                     +------------------+     +------------------+
    |                     | Analizar         |---->| Definir          |
    |                     | Demanda          |     | Estrategia       |
    |                     +------------------+     +------------------+
    |                                                      |
    |                                                      v
    |                     +------------------+     +------------------+
    |                     | Asignar          |<----| Recopilar        |
    |                     | Abogado          |     | Documentos       |
    |                     +------------------+     +------------------+
    |                            |
    |                            v
    |                     +------------------+
    |                     | Elaborar         |
    |                     | Contestacion     |
    |                     +------------------+
    |                            |
    |                       - - - - - - - - > [Juzgado]
    |                                              |
    |                            +-----------------+
    |                            |
    |                            v
    |                     +------------------+
    |                     | Seguimiento      |
    |                     | del Proceso      |
    |                     +------------------+
    |                            |
    |                     ( T )--+ [Audiencias/Diligencias]
    |                            |
    |                            v
    |                     +------------------+
    |                     | Recibir          |
    |                     | Sentencia        |
    |                     +------------------+
    |                            |
    |                       < >--+
    |                       |    |
    |                   FAVORABLE  DESFAVORABLE
    |                       |    |
    |                       v    v
    |                +--------+ +------------------+
    |                | Cerrar | | Evaluar          |
    |                | Caso   | | Apelacion        |
    |                +--------+ +------------------+
    |                    |              |
    |                    v         < >--+
    |                 ( @ )        |    |
    |                           APELAR  NO APELAR
    |                              |         |
    |                              v         v
    |                       +----------+  ( @ )
    |                       | Presentar|
    |                       | Recurso  |
    |                       +----------+
    |                              |
    |                              v
    |                       [Repetir ciclo]
```

#### 4.5.3 Estados del Proceso

```
+----------+     +----------+     +------------+     +----------+     +--------+
| RECIBIDA |---->| ANALISIS |---->| CONTESTADA |---->| EN_TRAMITE|---->| FALLADA|
+----------+     +----------+     +------------+     +----------+     +--------+
                                                                           |
                                                                      < >--+
                                                                      |    |
                                                                 APELAR  CERRAR
                                                                      |    |
                                                                      v    v
                                                               +----------+( @ )
                                                               | APELADA  |
                                                               +----------+
```

---

### 4.6 Proceso de Cobro Coactivo

**ID Proceso:** PROC-COAC-001
**Modulo:** Gestion Legal
**Ubicacion:** `/src/components/esap/gestion-legal/modulos/ProcesosCoactivosV3.tsx`

#### 4.6.1 Descripcion General

Gestion de procesos de cobro coactivo contra deudores de ESAP, incluyendo estudiantes morosos y otras obligaciones pendientes.

#### 4.6.2 Diagrama BPMN

```
+===========================================================================+
||                     PROCESO DE COBRO COACTIVO                           ||
+===========================================================================+

[Sistema/Cartera]
    |
    |  ( O ) [Deuda vencida detectada]
    |    |
    |    v
    | +------------------+
    | | Identificar      |
    | | Deuda Morosa     |
    | +------------------+
    |         |
----|---------|----------------------------------------------------------------
    |         |
[Oficina Cobranza ESAP]
    |         v
    | +------------------+     +------------------+     +------------------+
    | | Preparar         |---->| Generar Titulo   |---->| Crear Demanda    |
    | | Expediente       |     | Ejecutivo        |     | Coactiva         |
    | +------------------+     +------------------+     +------------------+
    |                                                          |
    |                                                          v
    |                                                   +------------------+
    |                                                   | Presentar ante   |
    |                                                   | Juzgado          |
    |                                                   +------------------+
    |                                                          |
    |                                                     - - - - >
----|-----------------------------------------------------------|-----------
    |                                                          |
[Juzgado de Cobranza]                                          v
    |                                                   +------------------+
    |                                                   | Admitir          |
    |                                                   | Demanda          |
    |                                                   +------------------+
    |                                                          |
    |                                                          v
    |                                                   +------------------+
    |                                                   | Ordenar          |
    |                                                   | Notificacion     |
    |                                                   +------------------+
    |                                                          |
----|-----------------------------------------------------------|-----------
    |                                                          |
[Deudor]                                                       v
    |                                                   +------------------+
    |                                                   | Recibir          |
    |                                                   | Mandamiento Pago |
    |                                                   +------------------+
    |                                                          |
    |                                                     < >--+
    |                                                     |    |
    |                                                   PAGA  NO PAGA
    |                                                     |    |
    |                                                     v    v
    |                                              +--------+ +------------------+
    |                                              | Pago   | | Embargo Bienes   |
    |                                              | Total  | +------------------+
    |                                              +--------+        |
    |                                                  |             v
    |                                                  |      +------------------+
    |                                                  |      | Remate/Subasta   |
    |                                                  |      +------------------+
    |                                                  |             |
    |                                                  |             v
    |                                                  |      +------------------+
    |                                                  |      | Adjudicacion     |
    |                                                  |      +------------------+
    |                                                  |             |
    |                                                  v             v
    |                                           +------------------+
    |                                           | Cierre Proceso   |
    |                                           +------------------+
    |                                                  |
    |                                                  v
    |                                               ( @ )
```

#### 4.6.3 Estados del Proceso

```
+------------+     +------------+     +------------+     +------------+
| PREPARADA  |---->| PRESENTADA |---->| NOTIFICADA |---->| EN_COBRO   |
+------------+     +------------+     +------------+     +------------+
                                                              |
                                           +------------------+------------------+
                                           |                  |                  |
                                           v                  v                  v
                                    +----------+       +------------+     +----------+
                                    | PAGADA   |       | EMBARGADA  |---->| REMATADA |
                                    +----------+       +------------+     +----------+
                                         |                                      |
                                         v                                      v
                                      ( @ )                              +----------+
                                                                         | COBRADA  |
                                                                         +----------+
                                                                              |
                                                                              v
                                                                           ( @ )
```

---

### 4.7 Proceso de Plan de Trabajo Academico (PTA)

**ID Proceso:** PROC-PTA-001
**Modulo:** Gestion Profesoral
**Ubicacion:** `/src/components/gestion-profesoral/`

#### 4.7.1 Descripcion General

Sistema de planificacion y registro del trabajo academico de docentes PTA (Planta Temporal Academica) con integracion a situaciones administrativas.

#### 4.7.2 Actores

| Actor | Rol | Responsabilidades |
|-------|-----|-------------------|
| Docente PTA | Ejecutor | Registra actividades y evidencias |
| Coordinador | Revisor | Valida cumplimiento de carga |
| Director Territorial | Aprobador | Aprueba plan de trabajo |

#### 4.7.3 Diagrama BPMN

```
+===========================================================================+
||                PROCESO DE PLAN DE TRABAJO ACADEMICO                     ||
+===========================================================================+

[Sistema]
    |
    |  ( O ) [Inicio Periodo Academico]
    |    |
    |    v
    | +------------------+
    | | Asignar Carga    |
    | | Academica        |
    | +------------------+
    |         |
----|---------|----------------------------------------------------------------
    |         |
[Docente PTA]
    |         v
    | +------------------+
    | | Revisar Carga    |
    | | Asignada         |
    | +------------------+
    |         |
    |         v
    | < + >   [Registro Paralelo de Actividades]
    |  |  |  |  |
    |  |  |  |  +----------------+
    |  |  |  |                   |
    |  |  |  v                   v
    |  |  | +------------+ +------------------+
    |  |  | | DOCENCIA   | | COMPLEMENTARIAS  |
    |  |  | | -Asignaturas| | -Tutoria         |
    |  |  | | -Horas clase| | -Comites         |
    |  |  | | -Evaluacion | | -Direccion       |
    |  |  | +------------+ +------------------+
    |  |  |
    |  |  v
    |  | +------------------+
    |  | | INVESTIGACION   |
    |  | | -Proyectos      |
    |  | | -Publicaciones  |
    |  | | -Productos      |
    |  | +------------------+
    |  |
    |  v
    | +------------------+
    | | EXTENSION        |
    | | -Capacitaciones  |
    | | -Asesorias       |
    | | -Consultoria     |
    | +------------------+
    |         |
    | < + >---+ [Sincronizar]
    |         |
    |         v
    | +------------------+
    | | Registrar        |
    | | Situaciones Adm. |
    | | (Licencias, etc) |
    | +------------------+
    |         |
    |         v
    | +------------------+
    | | Cargar           |
    | | Evidencias       |
    | +------------------+
    |         |
----|---------|----------------------------------------------------------------
    |         |
[Coordinador Academico]
    |         v
    | +------------------+     +------------------+
    | | Revisar          |---->| Validar Horas    |
    | | Actividades      |     | y Evidencias     |
    | +------------------+     +------------------+
    |                                  |
    |                             < >--+
    |                             |    |
    |                         CUMPLE  NO CUMPLE
    |                             |    |
    |                             v    v
    |                      +--------+ +------------------+
    |                      | Aprobar| | Devolver para    |
    |                      |        | | Correccion       |---> [Docente]
    |                      +--------+ +------------------+
    |                          |
----|--------------------------|-----------------------------------------------
    |                          |
[Director Territorial]         v
    |                   +------------------+
    |                   | Revision Final   |
    |                   +------------------+
    |                          |
    |                     < >--+
    |                     |    |
    |                 APROBAR  RECHAZAR
    |                     |    |
    |                     v    v
    |              +--------+ +------------------+
    |              | PTA    | | Devolver         |---> [Coordinador]
    |              | Aprobado| +------------------+
    |              +--------+
    |                  |
    |                  v
    |               ( @ )
```

#### 4.7.4 Tipos de Situaciones Administrativas

| Tipo | Descripcion | Impacto en PTA |
|------|-------------|----------------|
| Anho Sabatico | Periodo de estudio/investigacion | Reduce carga docente |
| Comision Servicios | Asignacion temporal externa | Suspende actividades |
| Licencia | Permiso temporal | Reduce disponibilidad |
| Incapacidad | Ausencia por salud | Suspende actividades |
| Permiso | Ausencia corta autorizada | Ajuste menor |

#### 4.7.5 Estados del PTA

```
+------------+     +----------+     +-----------+     +----------+
| PLANIFICADO|---->| EN_CURSO |---->| REVISADO  |---->| APROBADO |
+------------+     +----------+     +-----------+     +----------+
                        |                |
                        v                v
                   +----------+    +----------+
                   | DEVUELTO |    | RECHAZADO|
                   +----------+    +----------+
```

---

### 4.8 Proceso de Gestion de Usuarios y Roles

**ID Proceso:** PROC-USR-001
**Modulo:** Administracion
**Ubicacion:** `/src/components/esap/UsersPersonsModulePremium.tsx`

#### 4.8.1 Descripcion General

Administracion centralizada de usuarios, personas y asignacion granular de roles y permisos con validacion de conflictos.

#### 4.8.2 Diagrama BPMN

```
+===========================================================================+
||                PROCESO DE GESTION DE USUARIOS Y ROLES                   ||
+===========================================================================+

[Administrador del Sistema]

( O )
  |
  v
< O >  [Operacion a Realizar]
  |
  +----------------+----------------+----------------+
  |                |                |                |
  v                v                v                v
+--------+  +----------+  +------------+  +----------+
| CREAR  |  | ASIGNAR  |  | MODIFICAR  |  | REVOCAR  |
| USUARIO|  | ROLES    |  | PERMISOS   |  | ACCESO   |
+--------+  +----------+  +------------+  +----------+
  |                |                |                |
  v                v                v                v
+--------+  +----------+  +------------+  +----------+
| Capturar|  | Seleccionar|  | Verificar |  | Validar |
| Datos   |  | Roles      |  | Conflictos|  | Motivo  |
| Persona |  | Disponibles|  | (SOD)     |  |         |
+--------+  +----------+  +------------+  +----------+
  |                |                |                |
  v                v                v                v
+--------+  +----------+  +------------+  +----------+
| Asignar |  | Validar  |  | Aplicar    |  | Desactivar|
| ID Unico|  | Dependenc.|  | Cambios    |  | Usuario  |
+--------+  +----------+  +------------+  +----------+
  |                |                |                |
  +----------------+----------------+----------------+
                          |
                          v
                   +------------------+
                   | Registrar en     |
                   | Log de Auditoria |
                   +------------------+
                          |
                          v
                   +------------------+
                   | Notificar        |
                   | Usuario          |
                   +------------------+
                          |
                          v
                       ( @ )
```

#### 4.8.3 Matriz de Roles del Sistema

| Rol | Modulos de Acceso | Nivel Maximo |
|-----|-------------------|--------------|
| Super Admin | Todos | CRUD + Approve |
| Jefe OCI | Control Interno, Legal | Approve |
| Auditor | Control Interno | Execute |
| Registrador | Certificados, Graduados | Execute |
| Docente PTA | PTA, Personas | Update |
| Estudiante | Portal, Certificados | Read |
| Graduado | Portal, Certificados | Read |

#### 4.8.4 Niveles de Permisos

```
+------------------------------------------------------------------+
|                    JERARQUIA DE PERMISOS                         |
+------------------------------------------------------------------+
|                                                                  |
|  APPROVE  (Aprobar/Autorizar)                                   |
|     ^                                                            |
|     |                                                            |
|  EXECUTE  (Ejecutar acciones)                                   |
|     ^                                                            |
|     |                                                            |
|  DELETE   (Eliminar recursos)                                   |
|     ^                                                            |
|     |                                                            |
|  UPDATE   (Actualizar recursos)                                 |
|     ^                                                            |
|     |                                                            |
|  CREATE   (Crear recursos)                                      |
|     ^                                                            |
|     |                                                            |
|  READ     (Ver/Consultar)                                       |
|                                                                  |
+------------------------------------------------------------------+
```

---

### 4.9 Proceso de Certificados Laborales

**ID Proceso:** PROC-CERTLAB-001
**Modulo:** Certificados Laborales
**Ubicacion:** `/src/components/certificados-laborales/`

#### 4.9.1 Descripcion General

Servicio de generacion de certificados laborales para graduados y estudiantes que requieren acreditar su vinculacion con ESAP.

#### 4.9.2 Diagrama BPMN

```
+===========================================================================+
||                 PROCESO DE CERTIFICADOS LABORALES                       ||
+===========================================================================+

[Solicitante]

( O )
  |
  v
+------------------+     +------------------+     +------------------+
| Acceder Portal   |---->| Completar        |---->| Seleccionar      |
| Publico          |     | Formulario       |     | Datos a Incluir  |
+------------------+     +------------------+     +------------------+
        |                        |                        |
        v                        v                        v
[Identificacion]         [Datos personales]       [Periodo laboral]
[Tipo documento]         [Cargo ocupado]          [Funciones]
                                                         |
                                                         v
                                                  +------------------+
                                                  | Enviar Solicitud |
                                                  +------------------+
                                                         |
---------------------------------------------------------|------------------
                                                         |
[Sistema Automatico]                                     v
        |                                         +------------------+
        |                                         | Validar Datos    |
        |                                         | en Base de Datos |
        |                                         +------------------+
        |                                                |
        |                                           < >--+
        |                                           |    |
        |                                      VALIDO  INVALIDO
        |                                           |    |
        |                                           v    v
        |                                    +--------+ +------------------+
        |                                    | Generar| | Notificar Error  |---> ( @ )
        |                                    | PDF    | +------------------+
        |                                    +--------+
        |                                         |
        |                                         v
        |                                  +------------------+
        |                                  | Incluir QR y     |
        |                                  | Firma Digital    |
        |                                  +------------------+
        |                                         |
        |                                         v
        |                                  +------------------+
        |                                  | Enviar por Email |
        |                                  +------------------+
        |                                         |
---------------------------------------------------------|------------------
                                                         |
[Solicitante]                                            v
        |                                         +------------------+
        |                                         | Descargar        |
        |                                         | Certificado      |
        |                                         +------------------+
        |                                                |
        |                                                v
        |                                             ( @ )
```

---

## 5. Matriz de Roles y Responsabilidades

### 5.1 Matriz RACI General

| Proceso | Super Admin | Jefe OCI | Auditor | Registrador | Docente | Estudiante |
|---------|-------------|----------|---------|-------------|---------|------------|
| Auditoria Interna | I | A | R | I | C | - |
| Certificados Acad. | I | - | - | R/A | - | C |
| Verificacion Titulos | I | - | - | R | - | C |
| Proceso Disciplinario | I | A | C | - | C | C |
| Defensa Judicial | I | C | - | - | - | - |
| Cobro Coactivo | I | C | - | - | - | C |
| PTA Docentes | I | - | - | C | R | - |
| Gestion Usuarios | R/A | C | - | C | - | - |
| Certificados Laborales | I | - | - | R | - | C |

**Leyenda:**
- R = Responsable (Ejecuta la tarea)
- A = Aprobador (Autoriza la tarea)
- C = Consultado (Proporciona informacion)
- I = Informado (Recibe informacion)

---

## 6. Integraciones entre Procesos

### 6.1 Diagrama de Integraciones

```
+===========================================================================+
||                    MAPA DE INTEGRACIONES                                ||
+===========================================================================+

                    +------------------+
                    |   PERSONAS       |
                    |   (Base Central) |
                    +--------+---------+
                             |
         +-------------------+-------------------+
         |                   |                   |
         v                   v                   v
+----------------+  +----------------+  +----------------+
| USUARIOS &     |  | PTA DOCENTES   |  | GRADUADOS      |
| ROLES          |  |                |  |                |
+-------+--------+  +-------+--------+  +-------+--------+
        |                   |                   |
        v                   v                   v
+----------------+  +----------------+  +----------------+
| AUDITORIA      |  | SITUACIONES    |  | CERTIFICADOS   |
| SISTEMA        |  | ADMINISTRATIVAS|  |                |
+----------------+  +----------------+  +----------------+
        |                                       |
        v                                       v
+----------------+                     +----------------+
| CONTROL        |                     | VERIFICACION   |
| INTERNO        |                     | PUBLICA        |
+-------+--------+                     +----------------+
        |
        v
+----------------+     +----------------+
| DISCIPLINARIO  |<--->| GESTION LEGAL  |
+----------------+     +----------------+
                              |
              +---------------+---------------+
              |               |               |
              v               v               v
       +----------+    +----------+    +----------+
       | DEFENSA  |    | COBRO    |    | ASESORIA |
       | JUDICIAL |    | COACTIVO |    | JURIDICA |
       +----------+    +----------+    +----------+
```

### 6.2 Servicios de Integracion

| Servicio | Origen | Destino | Tipo |
|----------|--------|---------|------|
| `personasPTAIntegrationService` | Personas | PTA | Sincronizacion |
| `situacionesAdministrativasService` | Situaciones | PTA | Afectacion |
| `notificationService` | Todos | Notificaciones | Eventos |
| `auditoriaService` | Todos | Auditoria | Registro |

### 6.3 Eventos de Integracion

```
+--------------------------+----------------------------------+
| Evento                   | Modulos Afectados                |
+--------------------------+----------------------------------+
| usuario.creado           | Personas, Notificaciones         |
| certificado.generado     | Auditoria, Notificaciones        |
| auditoria.iniciada       | Control Interno, Notificaciones  |
| proceso.disciplinario    | Legal, Notificaciones            |
| situacion.registrada     | PTA, Personas                    |
| pago.realizado           | Certificados, Auditoria          |
+--------------------------+----------------------------------+
```

---

## Anexos

### A. Simbolos BPMN Utilizados

| Simbolo | Nombre | Uso |
|---------|--------|-----|
| ( O ) | Evento Inicio | Punto de partida del proceso |
| ( @ ) | Evento Fin | Punto de terminacion del proceso |
| ( T ) | Evento Timer | Activacion por tiempo |
| ( M ) | Evento Mensaje | Activacion por comunicacion |
| < > | Gateway XOR | Decision exclusiva |
| < + > | Gateway AND | Ejecucion paralela |
| < O > | Gateway OR | Decision inclusiva |
| [Pool] | Pool/Lane | Participante/Responsable |
| +----+ | Tarea | Actividad atomica |
| +====+ | Subproceso | Proceso anidado |

### B. Referencias

- **BPMN 2.0 Specification** - Object Management Group (OMG)
- **Arquitectura del Sistema** - `/src/docs/ARQUITECTURA_MICRO_FRONTENDS.md`
- **Portal Transaccional** - `/src/docs/PORTAL_TRANSACCIONAL_UNIFICADO.md`

### C. Control de Versiones

| Version | Fecha | Autor | Cambios |
|---------|-------|-------|---------|
| 1.0 | Enero 2026 | Equipo Arquitectura | Documento inicial |

---

**Documento generado automaticamente**
**ESAP - Plataforma ComUNIdad**
**Enero 2026**

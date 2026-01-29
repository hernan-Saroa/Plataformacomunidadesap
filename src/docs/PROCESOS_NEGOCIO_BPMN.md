# Procesos de Negocio y Notacion BPMN

## Plataforma ComUNIdad ESAP

**Version:** 3.0
**Fecha:** Enero 2026
**Autor:** Equipo de Arquitectura ESAP

---

## Tabla de Contenidos

1. [Introduccion](#1-introduccion)
2. [Glosario de Notacion BPMN](#2-glosario-de-notacion-bpmn)
3. [Mapa General de Procesos](#3-mapa-general-de-procesos)
4. [Modulo 1: Certificados Laborales](#4-modulo-1-certificados-laborales)
5. [Modulo 2: Registro Academico](#5-modulo-2-registro-academico)
6. [Modulo 3: Control Interno de Gestion](#6-modulo-3-control-interno-de-gestion)
7. [Modulo 4: Control Interno Disciplinario](#7-modulo-4-control-interno-disciplinario)
8. [Modulo 5: Gestion Legal (SIGL)](#8-modulo-5-gestion-legal-sigl)
9. [Modulo 6: Gestion de Personas](#9-modulo-6-gestion-de-personas)
10. [Modulo 7: Landing Page](#10-modulo-7-landing-page)
11. [Modulo 8: Portal Transaccional](#11-modulo-8-portal-transaccional)
12. [Matriz de Roles y Responsabilidades](#12-matriz-de-roles-y-responsabilidades)
13. [Integraciones entre Modulos](#13-integraciones-entre-modulos)

---

## 1. Introduccion

Este documento describe los principales procesos de negocio de la plataforma **ComUNIdad ESAP** utilizando la **Notacion de Modelado de Procesos de Negocio (BPMN 2.0)**.

### 1.1 Modulos Documentados

| # | Modulo | Descripcion | Componentes |
|---|--------|-------------|-------------|
| 1 | **Certificados Laborales** | Generacion y validacion de certificados laborales con QR | 20 componentes |
| 2 | **Registro Academico** | Certificados academicos, graduados, verificacion de titulos | 7 componentes principales |
| 3 | **Control Interno de Gestion** | Auditorias internas, planes de mejoramiento | 107 componentes |
| 4 | **Control Interno Disciplinario** | Procesos disciplinarios contra funcionarios | 7 requisitos funcionales |
| 5 | **Gestion Legal (SIGL)** | Sistema integrado de gestion legal | 11 submodulos, 43 modales |
| 6 | **Gestion de Personas** | Administracion de usuarios, roles y permisos | 12 componentes, 6,500+ lineas |
| 7 | **Landing Page** | Portal publico, enrolamiento, servicios sin autenticacion | 10 componentes integrados |
| 8 | **Portal Transaccional** | Servicios por rol (Estudiante, Docente, Administrativo, Graduado, Aspirante) | 60+ componentes

### 1.2 Proposito del Documento

- Documentar los flujos de trabajo principales del sistema
- Facilitar la comprension de los procesos por parte de stakeholders
- Servir como base para mejoras y optimizaciones
- Establecer un lenguaje comun entre areas de negocio y tecnologia

---

## 2. Glosario de Notacion BPMN

### 2.1 Eventos

```
( O )     Evento de Inicio - Indica donde comienza el proceso
(( O ))   Evento Intermedio - Ocurre durante el proceso
( @ )     Evento de Fin - Indica donde termina el proceso
( T )     Evento de Temporizador - Disparo por tiempo
( M )     Evento de Mensaje - Disparo por comunicacion
( ! )     Evento de Error - Manejo de excepciones
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
  < E >  Compuerta Basada en Eventos
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
                        CANALES DE ACCESO
    +-----------------------------------------------------------------------+
    |                                                                       |
    |  +------------------+                    +------------------+         |
    |  | LANDING PAGE     |                    | PORTAL           |         |
    |  | (Acceso Publico) |                    | TRANSACCIONAL    |         |
    |  |                  |                    | (Usuarios Auth.) |         |
    |  | - Enrolamiento   |------------------->| - Estudiante     |         |
    |  | - Valid. Certif. |                    | - Docente        |         |
    |  | - Solicitudes    |                    | - Administrativo |         |
    |  +------------------+                    | - Graduado       |         |
    |                                          | - Aspirante      |         |
    |                                          +------------------+         |
    +-----------------------------------------------------------------------+
                                      |
                                      v
                          PROCESOS MISIONALES
    +-----------------------------------------------------------------------+
    |                                                                       |
    |  +------------------+  +------------------+  +------------------+     |
    |  | CERTIFICADOS     |  | REGISTRO         |  | CONTROL INTERNO  |     |
    |  | LABORALES        |  | ACADEMICO        |  |                  |     |
    |  |                  |  |                  |  | - Gestion        |     |
    |  | - Solicitud      |  | - Certificados   |  | - Disciplinario  |     |
    |  | - Generacion     |  | - Graduacion     |  | - Auditorias     |     |
    |  | - Validacion QR  |  | - Verificacion   |  | - Mejoramiento   |     |
    |  +------------------+  +------------------+  +------------------+     |
    |                                                                       |
    |  +------------------+  +------------------+                           |
    |  | GESTION LEGAL    |  | GESTION DE       |                           |
    |  | (SIGL)           |  | PERSONAS         |                           |
    |  |                  |  |                  |                           |
    |  | - Defensa Jud.   |  | - Usuarios CRUD  |                           |
    |  | - Proc. Coactivos|  | - Roles/Permisos |                           |
    |  | - Asesoria Jur.  |  | - Multiples Sedes|                           |
    |  +------------------+  +------------------+                           |
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

## 4. Modulo 1: Certificados Laborales

### 4.1 Descripcion General

**ID Modulo:** MOD-CERTLAB-001
**Ubicacion:** `/src/components/certificados-laborales/`
**Componentes:** 20 archivos React TypeScript

Sistema integral para la solicitud, generacion, validacion y entrega de certificados laborales con codigo QR verificable publicamente.

### 4.2 Actores del Proceso

| Actor | Rol | Responsabilidades |
|-------|-----|-------------------|
| Empleado | Solicitante | Solicita certificado por autoservicio |
| Coordinador TH | Procesador | Genera certificados manualmente, valida |
| Sistema | Automatico | Genera PDF, QR, firma digital, envia email |
| Verificador Externo | Publico | Valida autenticidad del certificado |

### 4.3 Proceso Principal: Solicitud por Autoservicio

```
+===========================================================================+
||          PROCESO: SOLICITUD DE CERTIFICADO LABORAL (AUTOSERVICIO)       ||
+===========================================================================+

[Empleado]
    |
    |  ( O ) Inicio
    |    |
    |    v
    | +------------------+
    | | Acceder Portal   |
    | | Transaccional    |
    | +------------------+
    |         |
    |         v
    | +------------------+
    | | Completar        |
    | | Formulario       |
    | | - Tipo documento |
    | | - Numero doc     |
    | | - Nombres        |
    | | - Email          |
    | | - Tipo certif.   |
    | +------------------+
    |         |
    |         v
    | +------------------+
    | | Enviar Solicitud |
    | +------------------+
    |         |
----|---------|----------------------------------------------------------------
    |         |
[Sistema]     v
    |  +------------------+
    |  | Validar campos   |
    |  | obligatorios     |
    |  +------------------+
    |         |
    |         v
    |  +------------------+
    |  | Consultar Web    |
    |  | Service RRHH     |
    |  +------------------+
    |         |
    |    < >--+----------------------+
    |    |                           |
    | EXISTE                    NO EXISTE
    |    |                           |
    |    v                           v
    | +------------------+    +------------------+
    | | RAMA AUTOMATICA  |    | RAMA MANUAL      |
    | +------------------+    +------------------+
    |    |                           |
    |    v                           v
    | +------------------+    +------------------+
    | | Generar PDF      |    | Crear Radicado   |
    | | con datos RRHH   |    | CL-YYYY-XXXXXX   |
    | +------------------+    +------------------+
    |    |                           |
    |    v                           v
    | +------------------+    +------------------+
    | | Generar QR       |    | Estado:          |
    | | ESAP-CERT-YYYY-X |    | PENDIENTE_VALID  |
    | +------------------+    +------------------+
    |    |                           |
    |    v                           v
    | +------------------+    +------------------+
    | | Aplicar Firma    |    | Notificar a      |
    | | Electronica      |    | Talento Humano   |
    | +------------------+    +------------------+
    |    |                           |
    |    v                           |
    | +------------------+           |
    | | Enviar Email     |           |
    | | con PDF adjunto  |           |
    | +------------------+           |
    |    |                           |
----|----+-----------+---------------+
    |    |           |
[Empleado]           |
    |    v           v
    | +------------------+    +------------------+
    | | Descargar        |    | Esperar          |
    | | Certificado      |    | Validacion       |
    | +------------------+    | (1-2 dias)       |
    |    |                    +------------------+
    |    v                           |
    | ( @ ) FIN                      v
    |                          ( @ ) FIN
```

### 4.4 Subproceso: Generacion Manual (Backoffice)

```
+===========================================================================+
||         SUBPROCESO: GENERACION MANUAL (TALENTO HUMANO)                  ||
+===========================================================================+

[Coordinador TH]

( O ) Inicio (Clic en "Generar Certificado")
  |
  v
+==================+
|| WIZARD 4 PASOS ||
+==================+
  |
  v
+------------------+
| PASO 1:          |
| Buscar Empleado  |
| - Por nombre     |
| - Por documento  |
+------------------+
  |
  v
+------------------+
| PASO 2:          |
| Validar Datos    |
| - Estado activo? |
| - Datos completos|
| CONFIGURAR:      |
| - Tipo certif.   |
| - Incluir salario|
| - Incluir histor.|
+------------------+
  |
  v
+------------------+
| PASO 3:          |
| Generando...     |
| [=====>    ] 60% |
| - Validando      |
| - Generando PDF  |
| - Aplicando firma|
+------------------+
  |
  v
+------------------+
| PASO 4:          |
| Exito!           |
| [Descargar PDF]  |
| [Ver QR]         |
+------------------+
  |
  v
( @ ) FIN
```

### 4.5 Subproceso: Validacion Publica

```
+===========================================================================+
||              SUBPROCESO: VALIDACION PUBLICA (PORTAL)                    ||
+===========================================================================+

[Verificador Externo]

( O ) Inicio (Accede a portal publico)
  |
  v
< O >  Metodo de validacion
  |
  +----------------+----------------+
  |                                 |
  v                                 v
+------------------+         +------------------+
| Ingresar Codigo  |         | Escanear QR      |
| QR Manualmente   |         | con Camara       |
+------------------+         +------------------+
  |                                 |
  +----------------+----------------+
                   |
                   v
            +------------------+
            | Sistema Valida   |
            | en Base de Datos |
            +------------------+
                   |
              < >--+
              |    |
          VALIDO  INVALIDO
              |    |
              v    v
       +----------+ +------------------+
       | Mostrar  | | Mostrar Mensaje  |
       | Datos:   | | "Certificado     |
       | - Nombre | | No Valido"       |
       | - Cargo  | | - Posible fraude |
       | - Depend.| | - Error codigo   |
       | - Fechas | +------------------+
       | - Estado |        |
       +----------+        |
              |            |
              v            v
       +------------------+
       | Registrar en Log |
       | - IP             |
       | - Ubicacion      |
       | - Fecha/Hora     |
       +------------------+
              |
              v
           ( @ ) FIN
```

### 4.6 Estados del Certificado

```
+------------+     +-------------+     +----------+     +-----------+
| PENDIENTE  |---->| EN_PROCESO  |---->| GENERADO |---->| ENTREGADO |
+------------+     +-------------+     +----------+     +-----------+
     |                   |
     v                   v
+-----------+      +-----------+
| RECHAZADO |      | CANCELADO |
+-----------+      +-----------+

Estados de Vigencia:
+--------+     +----------+     +---------+
| ACTIVO |---->| VENCIDO  |---->| ANULADO |
+--------+     +----------+     +---------+
```

### 4.7 Documentos Generados

| Documento | Contenido | Formato |
|-----------|-----------|---------|
| Certificado Laboral | Datos empleado, cargo, fechas, QR | PDF con firma digital |
| Codigo QR | URL verificacion, hash, consecutivo | PNG embebido |
| Constancia Validacion | Resultado de validacion publica | PDF |

---

## 5. Modulo 2: Registro Academico

### 5.1 Descripcion General

**ID Modulo:** MOD-REGACAD-001
**Ubicacion:** `/src/components/esap/` (Multiples componentes)

Sistema integral de gestion academica que incluye certificados academicos, gestion de graduados y verificacion de titulos con QR unico reutilizable.

### 5.2 Tipos de Certificados Academicos

| Tipo | Contenido | Tiempo | Costo |
|------|-----------|--------|-------|
| **Notas** | Materias, creditos, calificaciones, promedio | 2.1 dias | $25,000 |
| **Estudios** | Periodos cursados, programas | 2.5 dias | $20,000 |
| **Grado** | Titulo, fecha grado, acta, folio | 3.2 dias | $40,000 |
| **Matricula** | Semestres matriculados, estado | 1.8 dias | $15,000 |
| **Programa** | Informacion del programa cursado | 2.7 dias | $30,000 |

### 5.3 Proceso: Solicitud de Certificado Academico

```
+===========================================================================+
||           PROCESO: SOLICITUD DE CERTIFICADO ACADEMICO                   ||
+===========================================================================+

[Estudiante/Graduado]
    |
    |  ( O ) Inicio
    |    |
    |    v
    | +------------------+
    | | Acceder Portal   |
    | | Academico        |
    | +------------------+
    |         |
    |         v
    | +------------------+
    | | Seleccionar Tipo |
    | | de Certificado   |
    | | [Notas/Estudios/ |
    | |  Grado/Matricula]|
    | +------------------+
    |         |
    |         v
    | +------------------+
    | | Completar        |
    | | Solicitud        |
    | | - Motivo         |
    | | - Entidad destino|
    | | - Copias         |
    | | - Metodo entrega |
    | +------------------+
    |         |
    |         v
    |    < >--+
    |    |    |
    | PAGO   EXENTO
    |    |    |
    |    v    |
    | +------+|
    | |Pagar ||
    | |$X,000||
    | +------+|
    |    |    |
    |    +----+
    |         |
    |         v
    | +------------------+
    | | Enviar Solicitud |
    | | CERT-2025-XXXXXX |
    | +------------------+
    |         |
----|---------|----------------------------------------------------------------
    |         |
[Registrador Academico]
    |         v
    | +------------------+
    | | Recibir          |
    | | Solicitud        |
    | | Estado: PENDING  |
    | +------------------+
    |         |
    |         v
    | +------------------+
    | | Validar Datos    |
    | | Academicos       |
    | | - Existe alumno? |
    | | - Calificaciones?|
    | | - Paz y salvo?   |
    | +------------------+
    |         |
    |    < >--+
    |    |    |
    | VALIDO INVALIDO
    |    |    |
    |    v    v
    | +------+ +------------------+
    | |Aprobar| |Rechazar con     |
    | |       | |motivo           |
    | +------+ +------------------+
    |    |           |
    |    v           v
    | +------+    ( @ ) FIN
    | |Generar|
    | |Certif.|
    | +------+
    |    |
----|----|-----------------------------------------------------------------
    |    |
[Sistema]v
    | +------------------+
    | | Generar PDF      |
    | | - Datos alumno   |
    | | - Calificaciones |
    | | - Promedio       |
    | +------------------+
    |         |
    |         v
    | +------------------+
    | | Generar QR Unico |
    | | (Reutilizable si |
    | | misma combinacion)|
    | +------------------+
    |         |
    |         v
    | +------------------+
    | | Aplicar Firma    |
    | | Digital          |
    | +------------------+
    |         |
    |    < >--+-------------------+-------------------+
    |    |                        |                   |
    | DIGITAL                 PRESENCIAL           CORREO
    |    |                        |                   |
    |    v                        v                   v
    | +--------+           +----------+        +-----------+
    | |Email   |           |Disponible|        |Envio      |
    | |con PDF |           |en ventana|        |certificado|
    | +--------+           +----------+        +-----------+
    |    |                        |                   |
    |    +------------------------+-------------------+
    |                             |
    |                             v
    |                    +------------------+
    |                    | Estado: DELIVERED|
    |                    +------------------+
    |                             |
    |                             v
    |                          ( @ ) FIN
```

### 5.4 Proceso: Verificacion de Titulo de Graduado

```
+===========================================================================+
||              PROCESO: VERIFICACION DE TITULO DE GRADUADO                ||
+===========================================================================+

[Entidad Externa/Empleador]

( O ) Inicio (Accede a portal publico de verificacion)
  |
  v
+------------------+
| Ingresar Datos   |
| del Graduado     |
| - Documento      |
| - Nombre         |
| O escanear QR    |
+------------------+
  |
  v
+------------------+
| Sistema Consulta |
| Base de Graduados|
+------------------+
  |
  < >--+
  |    |
ENCONTRADO  NO ENCONTRADO
  |              |
  v              v
+----------+  +------------------+
| Mostrar  |  | Crear Solicitud  |
| Info:    |  | de Revision      |
| - Nombre |  | REV-2024-XXX     |
| - Programa|  +------------------+
| - Titulo |         |
| - Fecha  |         v
| - Acta   |  +------------------+
| - Folio  |  | Revision Manual  |
+----------+  | por Registrador  |
  |           | (48 horas max)   |
  v           +------------------+
+------------------+      |
| Generar Certif.  |      |
| de Verificacion  |<-----+
| con QR           |
+------------------+
  |
  v
+------------------+
| Registrar en     |
| Historial        |
| - IP             |
| - Fecha/Hora     |
| - Resultado      |
+------------------+
  |
  v
( @ ) FIN
```

### 5.5 Sistema de QR Unico Reutilizable

```
+===========================================================================+
||                    LOGICA DE QR UNICO REUTILIZABLE                      ||
+===========================================================================+

CLAVE UNICA = (Graduado + Datos + Entidad Solicitante)

Ejemplo:
+------------------+
| Graduado:        |
| Ana Maria G.     |
| CC 1015XXXXXX    |
+------------------+
        +
+------------------+
| Datos:           |
| Especializacion  |
| Sede Bogota      |
| Fecha: 2024-12   |
+------------------+
        +
+------------------+
| Entidad:         |
| Empresa X        |
+------------------+
        |
        v
+------------------+
| QR Generado:     |
| ESAP-GRAD-2025-  |
| ABC123XYZ        |
+------------------+

SI MISMA COMBINACION solicita nuevamente:
    → SE REUTILIZA el QR existente
    → Se registra nueva solicitud en historial
    → No se genera QR duplicado

SI CAMBIA alguno de los 3 elementos:
    → SE GENERA nuevo QR unico
```

### 5.6 Estados del Proceso de Certificados

```
Estados de Solicitud:
+----------+     +------------+     +----------+     +-------+     +-----------+
| PENDING  |---->| IN_PROCESS |---->| APPROVED |---->| READY |---->| DELIVERED |
+----------+     +------------+     +----------+     +-------+     +-----------+
     |                 |
     v                 v
+-----------+    +-----------+
| CANCELLED |    | REJECTED  |
+-----------+    +-----------+
```

---

## 6. Modulo 3: Control Interno de Gestion

### 6.1 Descripcion General

**ID Modulo:** MOD-CIG-001
**Ubicacion:** `/src/components/esap/control-interno/`
**Componentes:** 107 archivos React TypeScript

Sistema completo de gestion de auditorias internas con 5 fases, generacion automatica de documentos, listas de chequeo estandarizadas y planes de mejoramiento.

### 6.2 Tipos de Auditoria

| Tipo | Descripcion | Aplicabilidad |
|------|-------------|---------------|
| **Gestion** | Evaluacion de procesos administrativos | Todos los procesos |
| **Cumplimiento** | Verificacion de cumplimiento normativo | Obligatorio |
| **Financiera** | Auditoria de ingresos, gastos, patrimonio | Gestion financiera |
| **Sistemas/TI** | Auditoria de sistemas de informacion | Area TIC |
| **Desempeno** | Analisis de eficiencia y efectividad | Procesos criticos |
| **Seguimiento** | Seguimiento a planes de mejoramiento | Post-auditoria |

### 6.3 Proceso Principal: Ciclo Completo de Auditoria (5 Fases)

```
+===========================================================================+
||                    PROCESO: CICLO DE AUDITORIA INTERNA                  ||
||                           (5 FASES - RF004-RF009)                       ||
+===========================================================================+

( O ) INICIO (Plan Anual Aprobado)
  |
  v
+===========================================================================+
|| FASE 1: PROGRAMACION                                                    ||
+===========================================================================+
  |
  | [Jefe OCI]
  |    |
  |    v
  | +------------------+
  | | Evaluar Riesgos  |
  | | por Proceso      |
  | | (Universo Audit.)|
  | +------------------+
  |         |
  |         v
  | +------------------+
  | | Definir Plan     |
  | | Anual Auditorias |
  | +------------------+
  |         |
  |         v
  | +------------------+
  | | Aprobar por      |
  | | Consejo Superior |
  | +------------------+
  |         |
  |         v
  | [Documentos: PAA, Matriz Riesgos]
  |
  v
+===========================================================================+
|| FASE 2: INICIO / PLANEACION (RF004-RF005)                               ||
|| Wizard de 4 Pasos                                                       ||
+===========================================================================+
  |
  | [Jefe OCI]
  |    |
  |    v
  | +==================+
  | || WIZARD 4 PASOS ||
  | +==================+
  |    |
  |    v
  | +------------------+
  | | PASO 1:          |
  | | Seleccionar      |
  | | Auditoria        |
  | | Programada       |
  | +------------------+
  |    |
  |    v
  | +------------------+
  | | PASO 2:          |
  | | Configurar       |
  | | Equipo Auditor   |
  | | - Auditor Lider  |
  | | - Equipo (min 1) |
  | | - Especialistas  |
  | +------------------+
  |    |
  |    v
  | +------------------+
  | | PASO 3:          |
  | | Establecer       |
  | | Alcance y Fechas |
  | | - Objetivo       |
  | | - Alcance        |
  | | - Criterios      |
  | | - Duracion fases |
  | +------------------+
  |    |
  |    v
  | +------------------+
  | | PASO 4:          |
  | | Generar y        |
  | | Previsualizar    |
  | | Documentos       |
  | +------------------+
  |    |
  |    v
  | < + > GENERA AUTOMATICAMENTE 4 DOCUMENTOS:
  |  |  |  |  |
  |  |  |  |  +---> [Oficio de Anuncio]
  |  |  |  +------> [Carta Representante Legal]
  |  |  +---------> [Compromiso Confidencialidad]
  |  +------------> [Programa Individual Auditoria (PIA)]
  |    |
  |    v
  | +------------------+
  | | [INICIAR         |
  | |  AUDITORIA]      |
  | +------------------+
  |    |
  |    v
  | +------------------+        +------------------+
  | | Estado:          |        | Crear Expediente |
  | | PROGRAMADA -->   |        | Digital          |
  | | EN_PLANEACION    |        +------------------+
  | +------------------+               |
  |    |                               |
  |    v                               v
  | +------------------+        +------------------+
  | | Notificar Area   |        | Enviar docs a    |
  | | Auditada         |        | Equipo Auditor   |
  | +------------------+        +------------------+
  |
  v
+===========================================================================+
|| FASE 3: EJECUCION (RF006-RF008)                                         ||
|| Duracion: 10-30 dias (Sede) / 4 dias (Territorial)                      ||
+===========================================================================+
  |
  | [Auditor Lider + Equipo]
  |    |
  |    v
  | < + > ACTIVIDADES EN PARALELO:
  |  |  |  |
  |  |  |  +---> +------------------+
  |  |  |        | Recoleccion de   |
  |  |  |        | Evidencias       |
  |  |  |        | - Entrevistas    |
  |  |  |        | - Revision docs  |
  |  |  |        | - Observacion    |
  |  |  |        +------------------+
  |  |  |
  |  |  +------> +------------------+
  |  |           | Aplicar Listas   |
  |  |           | de Chequeo       |
  |  |           | LC-XXX-NNN       |
  |  |           +------------------+
  |  |                  |
  |  |                  v
  |  |           +------------------+
  |  |           | Respuestas:      |
  |  |           | [X] Cumple       |
  |  |           | [ ] No Cumple    |
  |  |           | [ ] No Aplica    |
  |  |           +------------------+
  |  |                  |
  |  |             < >--+
  |  |             |    |
  |  |        NO CUMPLE  CUMPLE
  |  |             |       |
  |  |             v       v
  |  |      +----------+ (continua)
  |  |      | GENERA   |
  |  |      | HALLAZGO |
  |  |      | AUTOMATIC|
  |  |      | HAL-YYYY-|
  |  |      | NNN      |
  |  |      +----------+
  |  |
  |  +---------> +------------------+
  |              | Identificar      |
  |              | Hallazgos        |
  |              | - No Conformidad |
  |              | - Observacion    |
  |              | - Oportunidad M. |
  |              +------------------+
  |                     |
  |                     v
  |              +------------------+
  |              | Clasificar       |
  |              | Severidad:       |
  |              | - Critica        |
  |              | - Alta           |
  |              | - Media          |
  |              | - Baja           |
  |              +------------------+
  |
  v
+===========================================================================+
|| FASE 4: COMUNICACION (RF009)                                            ||
+===========================================================================+
  |
  | [Auditor Lider]
  |    |
  |    v
  | +------------------+
  | | Elaborar Informe |
  | | Preliminar       |
  | +------------------+
  |         |
  |         v
  | +------------------+
  | | Enviar a Area    |
  | | Auditada         |
  | +------------------+
  |         |
----|---------|----------------------------------------------------------------
    |         |
[Area Auditada]
    |         v
    | +------------------+
    | | DERECHO DE       |
    | | CONTRADICCION    |
    | | (5 dias habiles) |
    | +------------------+
    |         |
    |         v
    | +------------------+
    | | Presentar        |
    | | Observaciones    |
    | +------------------+
    |         |
----|---------|----------------------------------------------------------------
    |         |
[Auditor Lider]
    |         v
    | +------------------+
    | | Analizar         |
    | | Observaciones    |
    | +------------------+
    |         |
    |    < >--+
    |    |    |
    | ACEPTA RECHAZA
    |    |    |
    |    v    v
    | +------+ +------+
    | |Ajustar| |Mantener|
    | |Hallazgo| |Hallazgo|
    | +------+ +------+
    |    |         |
    |    +---------+
    |         |
    |         v
    | +------------------+
    | | Elaborar Informe |
    | | Final Definitivo |
    | +------------------+
    |         |
    |         v
    | [Jefe OCI Aprueba y Firma]
    |         |
    |         v
    | +------------------+
    | | Generar Plan de  |
    | | Mejoramiento     |
    | | PLN-YYYY-NNN     |
    | +------------------+
  |
  v
+===========================================================================+
|| FASE 5: SEGUIMIENTO (Post-Auditoria)                                    ||
|| Frecuencia: Trimestral (Jul, Oct, Ene, Abr)                             ||
+===========================================================================+
  |
  | [Area Auditada + Auditor]
  |    |
  |    v
  | ( T ) Evento Timer (Trimestral)
  |    |
  |    v
  | +------------------+
  | | Area Carga       |
  | | Evidencias       |
  | +------------------+
  |         |
  |         v
  | +------------------+
  | | Auditor Valida   |
  | | Evidencias       |
  | +------------------+
  |         |
  |    < >--+
  |    |    |
  | ACEPTADA RECHAZADA
  |    |       |
  |    v       v
  | +------+ +------+
  | |Suma al| |Requiere|
  | |Cumplim| |nueva   |
  | +------+ |evidencia|
  |    |     +------+
  |    |         |
  |    +---------+
  |         |
  |         v
  | +------------------+
  | | Calcular % de    |
  | | Cumplimiento     |
  | | Formula EMFO002  |
  | +------------------+
  |         |
  |         v
  | +------------------+
  | | Semaforo:        |
  | | >= 80% = VERDE   |
  | | 50-79% = AMARILLO|
  | | < 50% = ROJO     |
  | +------------------+
  |         |
  |    < >--+
  |    |    |
  | 100%   < 100%
  |    |    |
  |    v    v
  | +------+ +------+
  | |CERRAR | |Continua|
  | |Hallazgo| |Seguim. |
  | +------+ +------+
  |    |         |
  |    v         v
  | ( @ )    (Siguiente Trimestre)
```

### 6.4 Estados de la Auditoria

```
+------------+     +--------------+     +--------------+     +---------------+
| PROGRAMADA |---->| EN_PLANEACION|---->| EN_EJECUCION |---->| EN_COMUNICAC. |
+------------+     +--------------+     +--------------+     +---------------+
                                                                    |
                                                                    v
                                                              +----------+
                                                              | CERRADA  |
                                                              +----------+

Estado alternativo (desde cualquier estado excepto CERRADA):
+------------+
| CANCELADA  |
+------------+
```

### 6.5 Roles del Sistema (RBAC)

| Rol | Color | Jerarquia | Permisos Clave |
|-----|-------|-----------|----------------|
| **Jefe OCI** | Rojo #DC2626 | 1 | TODOS - Aprobar, iniciar, configurar |
| **Auditor Lider** | Azul #003DA5 | 2 | Ejecutar, generar informes, validar |
| **Auditor Operativo** | Azul Claro #3B82F6 | 3 | Ejecutar, registrar hallazgos |
| **Area Auditada** | Verde #10B981 | 4 | Cargar evidencias, ver planes |
| **Administrador** | Purpura #8B5CF6 | 5 | Configuracion, usuarios |

### 6.6 Documentos Generados

| Fase | Documento | Generador |
|------|-----------|-----------|
| Planeacion | Oficio de Anuncio | Wizard automatico |
| Planeacion | Carta Representante Legal | Wizard automatico |
| Planeacion | Compromiso Confidencialidad | Wizard automatico |
| Planeacion | Programa Individual Auditoria (PIA) | Wizard automatico |
| Ejecucion | Listas de Chequeo Diligenciadas | Auditor |
| Ejecucion | Matriz de Hallazgos | Sistema |
| Comunicacion | Informe Preliminar | Auditor Lider |
| Comunicacion | Informe Final Definitivo | Auditor Lider + Jefe OCI |
| Comunicacion | Plan de Mejoramiento | Sistema automatico |

---

## 7. Modulo 4: Control Interno Disciplinario

### 7.1 Descripcion General

**ID Modulo:** MOD-CID-001
**Ubicacion:** `/src/components/esap/disciplinario/`

Sistema de gestion de procesos disciplinarios contra funcionarios de ESAP, conforme al Codigo Disciplinario Unico (Ley 1952/2019 y Ley 734/2002).

### 7.2 Proceso Principal: Proceso Disciplinario Completo (7 Etapas)

```
+===========================================================================+
||               PROCESO DISCIPLINARIO COMPLETO (7 ETAPAS)                 ||
||           Conforme a Ley 734/2002 y Ley 1952/2019                       ||
+===========================================================================+

( O ) INICIO (Noticia Disciplinaria Recibida)
  |
  v
+===========================================================================+
|| RECEPCION DE NOTICIA DISCIPLINARIA (RF001)                              ||
+===========================================================================+
  |
  | [Secretaria OCID]
  |    |
  |    v
  | +------------------+
  | | Registrar        |
  | | Noticia          |
  | | ND-XXX-YYYY      |
  | +------------------+
  |         |
  |         v
  | +------------------+
  | | Capturar Datos:  |
  | | - Denunciante    |
  | | - Denunciado     |
  | | - Hechos         |
  | | - Documentos     |
  | +------------------+
  |
  v
+===========================================================================+
|| VALORACION INICIAL (RF002) - Plazo: 30 dias habiles IMPRORROGABLE       ||
+===========================================================================+
  |
  | [Jefe OCID]
  |    |
  |    v
  | +------------------+
  | | Analizar Hechos  |
  | | y Evidencias     |
  | +------------------+
  |         |
  |         v
  | +------------------+
  | | Verificar        |
  | | Competencia      |
  | | Institucional    |
  | +------------------+
  |         |
  |    < >--+--------------------------+
  |    |              |                |
  | INVESTIGAR     ARCHIVAR        DEVOLVER
  |    |              |                |
  |    v              v                v
  | +------+    +----------+    +-----------+
  | |Crear |    |Auto de   |    |Oficio de  |
  | |Proceso|    |Archivo   |    |Remision   |
  | |P-XXX-|    +----------+    +-----------+
  | |YYYY  |         |                |
  | +------+         v                v
  |    |          ( @ ) FIN        ( @ ) FIN
  |    |
  |    v
  | +------------------+
  | | Asignar          |
  | | Profesional      |
  | | Instructor       |
  | +------------------+
  |
  v
+===========================================================================+
|| ETAPA 1: AVOCAMIENTO (E1_AVOCAMIENTO)                                   ||
+===========================================================================+
  |
  | [Profesional Instructor]
  |    |
  |    v
  | +------------------+
  | | Auto de Apertura |
  | | de Investigacion |
  | +------------------+
  |         |
  |         v
  | +------------------+
  | | Notificar al     |
  | | Investigado      |
  | +------------------+
  |         |
  |         v
  | +------------------+
  | | Recopilar        |
  | | Pruebas Iniciales|
  | +------------------+
  |         |
  |         v
  | +------------------+
  | | Formular Cargos  |
  | +------------------+
  |
  v
+===========================================================================+
|| ETAPA 2: DESCARGOS (E2_DESCARGOS)                                       ||
|| PLAZO: 10 DIAS HABILES - TAXATIVO E IMPRORROGABLE                       ||
+===========================================================================+
  |
  | [Investigado + OCID]
  |    |
  |    v
  | +------------------+
  | | Notificacion de  |
  | | Etapa de         |
  | | Descargos        |
  | +------------------+
  |         |
  |    ( T ) Timer: 10 dias habiles
  |         |
  |    < >--+
  |    |    |
  | PRESENTA  NO PRESENTA
  |    |         |
  |    v         v
  | +------+ +----------+
  | |Recibe| |Aceptacion|
  | |Descar| |Tacita de |
  | |gos   | |Cargos    |
  | +------+ +----------+
  |    |         |
  |    +---------+
  |         |
  v         v
+===========================================================================+
|| ETAPA 3: PRUEBAS (E3_PRUEBAS)                                           ||
|| Solicitud: 15 dias habiles                                              ||
+===========================================================================+
  |
  | [Profesional Instructor]
  |    |
  |    v
  | +------------------+
  | | Auto de Practica |
  | | de Pruebas       |
  | +------------------+
  |         |
  |         v
  | < + > Tipos de Pruebas:
  |  |  |  |  |  |
  |  |  |  |  |  +---> [Documentales]
  |  |  |  |  +------> [Testimoniales]
  |  |  |  +---------> [Periciales]
  |  |  +------------> [Confesionales]
  |  +---------------> [Inspeccion Ocular]
  |         |
  |         v
  | +------------------+
  | | Practicar        |
  | | Pruebas          |
  | +------------------+
  |         |
  |         v
  | +------------------+
  | | Auto de Cierre   |
  | | de Pruebas       |
  | +------------------+
  |
  v
+===========================================================================+
|| ETAPA 4: ALEGATOS (E4_ALEGATOS)                                         ||
|| Plazo: 10 dias habiles                                                  ||
+===========================================================================+
  |
  | [Investigado + OCID]
  |    |
  |    v
  | +------------------+
  | | Investigado      |
  | | Presenta Alegatos|
  | | de Conclusion    |
  | +------------------+
  |         |
  |         v
  | +------------------+
  | | OCID Presenta    |
  | | Alegatos         |
  | +------------------+
  |
  v
+===========================================================================+
|| ETAPA 5: FALLO EN PRIMERA INSTANCIA (E5_FALLO_1I)                       ||
|| Plazo: 30 dias habiles                                                  ||
+===========================================================================+
  |
  | [Profesional Instructor + Jefe OCID]
  |    |
  |    v
  | +------------------+
  | | Elaborar Fallo   |
  | | Disciplinario    |
  | +------------------+
  |         |
  |         v
  | +------------------+
  | | Jefe OCID        |
  | | Aprueba y Firma  |
  | +------------------+
  |         |
  |    < >--+
  |    |    |
  | SANCION ABSOLUCION
  |    |       |
  |    v       v
  | +------+ +------+
  | |Tipo: | |Cerrar|
  | |-Amone| |Proceso|
  | |-Suspe| +------+
  | |-Desti|    |
  | |-Inhab|    v
  | +------+ ( @ ) FIN
  |    |
  |    v
  | +------------------+
  | | INFORME A RRHH   |
  | | 5 dias habiles   |
  | | IMPRORROGABLE    |
  | +------------------+
  |         |
  |         v
  | +------------------+
  | | Notificar Fallo  |
  | | al Investigado   |
  | +------------------+
  |
  v
+===========================================================================+
|| ETAPA 6: APELACION (E6_APELACION)                                       ||
|| Plazo: 10 dias habiles - IMPRORROGABLE                                  ||
+===========================================================================+
  |
  | [Investigado]
  |    |
  |    v
  |    ( T ) Timer: 10 dias habiles
  |    |
  |    < >--+
  |    |    |
  | APELA   NO APELA
  |    |       |
  |    v       v
  | +------+ +----------+
  | |Escrito| |Ejecutoria|
  | |de     | |del Fallo |
  | |Apelac.| +----------+
  | +------+      |
  |    |          v
  |    |       ( @ ) FIN (Sancion Ejecutada)
  |    |
  |    v
  | +------------------+
  | | Remitir a        |
  | | Tribunal de      |
  | | Apelacion        |
  | +------------------+
  |
  v
+===========================================================================+
|| ETAPA 7: FALLO EN SEGUNDA INSTANCIA (E7_FALLO_2I)                       ||
|| Plazo: 30 dias habiles                                                  ||
+===========================================================================+
  |
  | [Tribunal de Apelacion]
  |    |
  |    v
  | +------------------+
  | | Analizar         |
  | | Expediente       |
  | +------------------+
  |         |
  |         v
  | +------------------+
  | | Emitir Fallo     |
  | | Segunda Instancia|
  | +------------------+
  |         |
  |    < >--+--------------------+
  |    |              |          |
  | REVOCAR      CONFIRMAR   MODIFICAR
  |    |              |          |
  |    v              v          v
  | +------+    +----------+ +--------+
  | |Absol.o|    |Sancion   | |Ajustar |
  | |Nueva  |    |Original  | |Sancion |
  | |Sancion|    +----------+ +--------+
  | +------+         |            |
  |    |             +------------+
  |    |                   |
  |    +-------------------+
  |              |
  |              v
  |       +------------------+
  |       | Auto de          |
  |       | Ejecutoria       |
  |       +------------------+
  |              |
  |              v
  |       +------------------+
  |       | Ejecutar Sancion |
  |       | (Si aplica)      |
  |       +------------------+
  |              |
  |              v
  |           ( @ ) FIN
```

### 7.3 Estados del Proceso Disciplinario

```
+------------+     +-------------+     +-----------+     +------------+
| E1_AVOCAM. |---->| E2_DESCARG. |---->| E3_PRUEBAS|---->| E4_ALEGATOS|
+------------+     +-------------+     +-----------+     +------------+
                                                               |
     +----------------------+----------------------+-----------+
     |                      |                      |
     v                      v                      v
+------------+        +------------+         +------------+
| E5_FALLO_1I|------->| E6_APELAC. |-------->| E7_FALLO_2I|
+------------+        +------------+         +------------+
     |                                              |
     v                                              v
+------------+                               +------------+
| ARCHIVADO  |                               | EJECUTORIA |
+------------+                               +------------+
```

### 7.4 Tipos de Sanciones

| Tipo Falta | Sanciones Aplicables |
|------------|---------------------|
| **LEVE** | Amonestacion escrita |
| **GRAVE** | Suspension (1-12 meses), Multa (hasta 5 SMMLV) |
| **GRAVISIMA** | Destitucion, Multa (hasta 5 SMMLV), Inhabilidad (hasta 10 anios) |

### 7.5 Terminos Legales Criticos

| Etapa | Plazo | Tipo | Improrrogable | Normativa |
|-------|-------|------|---------------|-----------|
| Valoracion Noticia | 30 dias | Habiles | SI | Ley 734/2002 Art.145 |
| Descargos | 10 dias | Habiles | SI | Ley 734/2002 Art.150 |
| Solicitud Pruebas | 15 dias | Habiles | NO | Ley 734/2002 Art.151 |
| Alegatos | 10 dias | Habiles | NO | Ley 734/2002 Art.152 |
| Fallo 1a Instancia | 30 dias | Habiles | NO | Ley 734/2002 Art.161 |
| Informe a RRHH | 5 dias | Habiles | SI | Ley 734/2002 Art.174 |
| Apelacion | 10 dias | Habiles | SI | Ley 734/2002 Art.181 |
| Fallo 2a Instancia | 30 dias | Habiles | NO | Ley 734/2002 Art.175 |

### 7.6 Ley Aplicable (Determinacion Automatica)

```
SI fechaHechos < 26-03-2020:
    → Ley 734/2002 (Codigo Disciplinario Anterior)

SI fechaHechos >= 26-03-2020:
    → Ley 1952/2019 (Codigo Disciplinario Actual)
```

---

## 8. Modulo 5: Gestion Legal (SIGL)

### 8.1 Descripcion General

**ID Modulo:** MOD-SIGL-001
**Version:** SIGL v5.0
**Ubicacion:** `/src/components/esap/gestion-legal/`
**Componentes:** 103 archivos, 52,532 lineas de codigo, 43 modales

Sistema Integrado de Gestion Legal que unifica todos los procesos juridicos de ESAP en 11 submodulos.

### 8.2 Estructura del SIGL (11 Submodulos)

```
+===========================================================================+
||                    SIGL v5.0 - GESTION LEGAL INTEGRADA                  ||
+===========================================================================+
                                    |
     +----------+----------+--------+--------+-----------+
     |          |          |        |        |           |
     v          v          v        v        v           v
+--------+ +--------+ +--------+ +--------+ +--------+ +--------+
| MOD-01 | | MOD-02 | | MOD-03 | | MOD-04 | | MOD-05 | | MOD-06 |
| Defensa| | Juzgam.| | Aseso- | | Centro | | Termi- | | Organos|
| Judicial| | Discip.| | ria    | | Comun. | | nos e  | | Control|
|        | |        | | Jurid. | | Jurid. | | Inform.| |        |
+--------+ +--------+ +--------+ +--------+ +--------+ +--------+
     |          |          |        |        |           |
     +----------+----------+--------+--------+-----------+
                                    |
     +----------+----------+--------+--------+
     |          |          |        |        |
     v          v          v        v        v
+--------+ +--------+ +--------+ +--------+ +--------+
| MOD-07 | | MOD-08 | | MOD-09 | | MOD-10 | | MOD-11 |
| Proceso| | Expedi-| | Plan de| | Gestion| | Planes |
| Coactiv| | entes  | | Accion | | Riesgos| | Mejora |
+--------+ +--------+ +--------+ +--------+ +--------+
```

### 8.3 Submodulo: Defensa Judicial (MOD-01)

```
+===========================================================================+
||              PROCESO: DEFENSA JUDICIAL CONTRA ESAP                      ||
||                     (7 Etapas - MOD-01)                                 ||
+===========================================================================+

( O ) INICIO (Demanda Recibida)
  |
  v
+------------------+
| ETAPA 1:         |
| NOTIFICADA       |
| - Recepcion      |
| - Radicado       |
| - Asignar abogado|
+------------------+
  |
  ( T ) Timer segun tipo:
  |     - Tutela: 2 dias CALENDARIO (URGENTE)
  |     - NRD: 30 dias HABILES
  |
  v
+------------------+
| ETAPA 2:         |
| CONTESTACION     |
| - Preparar       |
|   respuesta      |
| - Formular       |
|   excepciones    |
| - Presentar      |
|   pruebas        |
+------------------+
  |
  v
+------------------+
| ETAPA 3:         |
| PROBATORIA       |
| - Testimonios    |
| - Documentales   |
| - Periciales     |
| - Inspecciones   |
+------------------+
  |
  v
+------------------+
| ETAPA 4:         |
| ALEGATOS         |
| - Memoriales de  |
|   conclusion     |
| - Argumentacion  |
+------------------+
  |
  v
+------------------+
| ETAPA 5:         |
| SENTENCIA        |
| - Sentencia 1a   |
|   instancia      |
+------------------+
  |
  < >--+
  |    |
FAVORABLE  DESFAVORABLE
  |           |
  v           v
+------+  +------------------+
|CUMPL.| | ETAPA 6:         |
|      | | APELACION        |
+------+ | (10 dias habiles)|
  |      +------------------+
  |           |
  |           v
  |      +------------------+
  |      | ETAPA 7:         |
  |      | CUMPLIMIENTO     |
  |      | - Ejecutar fallo |
  |      +------------------+
  |           |
  +-----------+
        |
        v
     ( @ ) FIN
```

### 8.4 Tipos de Procesos Judiciales

| Tipo | Normativa | Plazo Contestacion | Caracteristica |
|------|-----------|-------------------|----------------|
| Reparacion Directa | Ley 1437/2011 | 30 dias habiles | Indemnizacion |
| Nulidad y Restablecimiento | Ley 1437/2011 Art.187 | 30 dias habiles | Anular acto |
| Accion Popular | Ley 1425/1998 | 30 dias habiles | Derechos colectivos |
| Accion de Grupo | Ley 461/1998 | 30 dias habiles | Derechos homogeneos |
| Tutela | Decreto 2591/1991 | 2 dias CALENDARIO | URGENTE |
| Proceso Ejecutivo | CGP Art.410+ | 20 dias habiles | Cobro obligaciones |

### 8.5 Submodulo: Procesos Coactivos (MOD-07)

```
+===========================================================================+
||                    PROCESO COACTIVO (MOD-07)                            ||
||                  Cobro de Deudas contra ESAP                            ||
+===========================================================================+

( O ) INICIO (Deuda Identificada)
  |
  v
+------------------+
| ETAPA 1:         |
| IDENTIFICADO     |
| - Identificar    |
|   deudor         |
| - Calcular monto |
| - Documentar     |
+------------------+
  |
  v
+------------------+
| ETAPA 2:         |
| PERSUASIVO       |
| - Contacto       |
|   amistoso       |
| - Solicitar pago |
+------------------+
  |
  < >--+
  |    |
PAGA   NO PAGA
  |       |
  v       v
( @ )  +------------------+
FIN    | ETAPA 3:         |
       | PREJUDICIAL      |
       | - Requerimiento  |
       |   formal         |
       | - Plazo 15 dias  |
       +------------------+
              |
              v
       +------------------+
       | ETAPA 4:         |
       | MANDAMIENTO      |
       | - Mandamiento de |
       |   pago           |
       | - Orden pago     |
       |   compulsoria    |
       +------------------+
              |
              v
       +------------------+
       | ETAPA 5:         |
       | EXCEPCIONES      |
       | - Deudor alega   |
       | - 15 dias habiles|
       +------------------+
              |
              v
       +------------------+
       | ETAPA 6:         |
       | CAUTELARES       |
       | - Embargo bienes |
       | - Secuestro      |
       +------------------+
              |
              v
       +------------------+
       | ETAPA 7:         |
       | LIQUIDACION      |
       | - Capital +      |
       |   intereses      |
       +------------------+
              |
              v
       +------------------+
       | ETAPA 8:         |
       | REMATE           |
       | - Venta bienes   |
       +------------------+
              |
              v
       +------------------+
       | ETAPA 9:         |
       | RECAUDADO        |
       | - Pago recibido  |
       +------------------+
              |
              v
           ( @ ) FIN
```

### 8.6 Sincronizacion de Terminos (MOD-05)

```
+===========================================================================+
||          SINCRONIZACION AUTOMATICA DE TERMINOS (MOD-05)                 ||
+===========================================================================+

                    +------------------+
                    | Modulo Origen    |
                    | (DJ, JD, AJ, OC) |
                    +------------------+
                            |
                            v
                    +------------------+
                    | Crear/Actualizar |
                    | Proceso          |
                    +------------------+
                            |
                            v
                    +------------------+
                    | sincronizarTodos |
                    | LosTerminos()    |
                    +------------------+
                            |
         +------------------+------------------+
         |                  |                  |
         v                  v                  v
+----------------+  +----------------+  +----------------+
| Defensa Jud.   |  | Juzgamiento    |  | Otros Modulos  |
| - Contestacion |  | - Descargos    |  | - Conceptos    |
| - Apelacion    |  | - Pruebas      |  | - Respuestas   |
| - Alegatos     |  | - Fallo        |  | - PQRS         |
+----------------+  +----------------+  +----------------+
         |                  |                  |
         +------------------+------------------+
                            |
                            v
                    +------------------+
                    | MOD-05: Terminos |
                    | e Informes       |
                    +------------------+
                            |
                            v
                    +------------------+
                    | Dashboard        |
                    | Consolidado      |
                    | - Semaforo       |
                    | - Alertas        |
                    | - Calendario     |
                    +------------------+
```

### 8.7 Sistema de Semaforo de Terminos

```
+===========================================================================+
||                    SEMAFORO DE TERMINOS                                 ||
+===========================================================================+

  DIAS RESTANTES        COLOR           ACCION
  ================      =======         =========================

  > 5 dias              VERDE           Normal - Seguimiento estandar
                        [###]

  2-5 dias              AMARILLO        Urgente - Email cada 2 dias
                        [===]           Alerta en dashboard

  <= 2 dias             ROJO            CRITICO - Email diario
                        [!!!]           Escalado a supervisor
                                        Notificacion push

  0 o negativo          ROJO OSCURO     VENCIDO - Reporte incumplimiento
                        [XXX]           Escalado a direccion
```

---

## 9. Modulo 6: Gestion de Personas

### 9.1 Descripcion General

**ID Modulo:** MOD-GPERS-001
**Ubicacion:** `/src/components/esap/`
**Componentes:** 12 principales (~6,500 lineas de codigo)

Sistema integral de administracion de usuarios, personas, roles y permisos con soporte para multiples sedes y gestion de contrasenas.

### 9.2 Componentes Principales

| Componente | Lineas | Funcion |
|------------|--------|---------|
| **UsersPersonsModulePremium.tsx** | 1,932 | Modulo principal de gestion |
| **RolesAdministrationModulePremium.tsx** | 1,195 | Administracion de roles |
| **RolesYPermisosActualizado.tsx** | 1,281 | Sistema de roles y permisos |
| **CreatePersonModal.tsx** | 693 | Wizard creacion persona |
| **EditUserModal.tsx** | 342 | Edicion de usuarios |
| **AssignAccessModal.tsx** | 291 | Asignacion de accesos |
| **GestionUsuariosPasswordTracking.tsx** | ~350 | Monitoreo de contrasenas |

### 9.3 Actores del Sistema

| Rol | Color | Jerarquia | Alcance |
|-----|-------|-----------|---------|
| **Super Administrador** | Rojo | 1 | Nacional - CRUD completo |
| **Administrador de Sistema** | Azul | 2 | Nacional - Gestion usuarios |
| **Director Nacional** | Purpura | 3 | Nacional - Supervision |
| **Director Territorial** | Verde | 4 | Territorial - Gestion sede |
| **Coordinador CETAP** | Naranja | 5 | CETAP - Gestion local |
| **Docente** | Cian | 6 | Territorial - Consulta |
| **Estudiante** | Gris | 7 | Territorial - Perfil propio |
| **Graduado** | Ambar | 8 | Nacional - Servicios alumni |

### 9.4 Proceso Principal: Crear Usuario/Persona

```
+===========================================================================+
||            PROCESO: CREAR USUARIO/PERSONA (WIZARD 3 PASOS)              ||
+===========================================================================+

[Administrador]

( O ) Inicio (Clic en "Crear Persona")
  |
  v
+==================+
|| WIZARD 3 PASOS ||
+==================+
  |
  v
+------------------+
| PASO 1:          |
| Datos Basicos    |
| - Nombre*        |
| - Apellido*      |
| - Tipo Doc*      |
|   (CC,CE,TI,PAS) |
| - Numero Doc*    |
+------------------+
  |
  v
+------------------+
| Validar:         |
| - Campos llenos  |
| - Doc unico      |
+------------------+
  |
  < >--+
  |    |
VALIDO INVALIDO
  |       |
  v       v
(cont) +----------+
       | Mostrar  |
       | Error    |
       +----------+
          |
          v
       (volver)
  |
  v
+------------------+
| PASO 2:          |
| Contacto         |
| - Email*         |
| - Telefono*      |
| - Ciudad*        |
| - Direccion      |
+------------------+
  |
  v
+------------------+
| Validar Email:   |
| /^[^\s@]+@       |
| [^\s@]+\.[^\s@]+$|
+------------------+
  |
  v
+------------------+
| PASO 3:          |
| Institucional    |
| - Rol*           |
| - Programa       |
|   (si Estudiante)|
| - Departamento*  |
+------------------+
  |
  v
+------------------+
| Sistema Crea:    |
| - Registro       |
|   Persona        |
| - Asigna Rol     |
| - Genera ID      |
+------------------+
  |
  v
+------------------+
| Toast Exito      |
| "Usuario Creado" |
+------------------+
  |
  v
( @ ) FIN
```

### 9.5 Proceso: Asignar Multiples Sedes

```
+===========================================================================+
||            PROCESO: GESTION DE SEDES MULTIPLES POR USUARIO              ||
+===========================================================================+

[Administrador]

( O ) Inicio (Editar Usuario)
  |
  v
+------------------+
| Cargar Datos     |
| Usuario Actual   |
| + Sedes Asignadas|
+------------------+
  |
  v
+------------------+
| GestionAsignac.  |
| Sedes Component  |
+------------------+
  |
  v
< O > Accion
  |
  +----------------+----------------+
  |                |                |
  v                v                v
+------+     +--------+      +----------+
|Agregar|     |Remover |      |Marcar    |
|Sede   |     |Sede    |      |Principal |
+------+     +--------+      +----------+
  |                |                |
  +----------------+----------------+
                   |
                   v
            +------------------+
            | Validar:         |
            | - Minimo 1 sede  |
            | - 1 principal    |
            +------------------+
                   |
              < >--+
              |    |
           VALIDO INVALIDO
              |       |
              v       v
       +------+ +----------+
       |Guardar| |Mostrar   |
       |Cambios| |Error     |
       +------+ +----------+
              |
              v
       +------------------+
       | API Actualiza    |
       | Asignaciones     |
       +------------------+
              |
              v
       +------------------+
       | Toast Exito      |
       +------------------+
              |
              v
           ( @ ) FIN
```

### 9.6 Proceso: Gestion de Contrasenas

```
+===========================================================================+
||               PROCESO: MONITOREO DE VIGENCIA DE CONTRASENAS             ||
+===========================================================================+

[Sistema]

( O ) Inicio (Acceso a GestionUsuariosPasswordTracking)
  |
  v
+------------------+
| Cargar Estado    |
| Contrasenas      |
| Todos Usuarios   |
+------------------+
  |
  v
+------------------+
| Calcular:        |
| - Dias Restantes |
| - Progreso Visual|
| - Estado         |
+------------------+
  |
  v
< O > Filtrar por Estado
  |
  +----------+----------+----------+----------+
  |          |          |          |          |
  v          v          v          v          v
+------+ +--------+ +-------+ +---------+ +-------+
|TODOS | |VIGENTE | |POR    | |VENCIDA  | |BLOQ.  |
|      | |>30 dias| |VENCER | |0 dias   | |       |
+------+ +--------+ |0-30d  | +---------+ +-------+
                    +-------+

Estados de Contrasena:
+===========================================================================+
| VIGENTE       | > 30 dias    | Verde   | Normal                           |
| POR_VENCER    | 0-30 dias    | Amarillo| Alerta, recordatorios           |
| VENCIDA       | 0 dias       | Rojo    | Acceso limitado                  |
| BLOQUEADA     | N/A          | Negro   | Multiples intentos fallidos      |
+===========================================================================+

Politica de Vigencia:
- Vigencia: 180 dias (6 meses)
- Alertas: Desde 30 dias antes
- Vencimiento: Activa flujo de recuperacion

[Administrador]
  |
  v
< O > Accion sobre Usuario
  |
  +----------------+----------------+----------------+
  |                |                |                |
  v                v                v                v
+--------+   +----------+    +----------+    +----------+
|Enviar  |   |Forzar    |    |Ver       |    |Generar   |
|Recorda-|   |Cambio    |    |Historial |    |Temporal  |
|torio   |   |Contrasena|    |          |    |          |
+--------+   +----------+    +----------+    +----------+
  |                |                |                |
  +----------------+----------------+----------------+
                   |
                   v
            +------------------+
            | Registrar en     |
            | Auditoria        |
            +------------------+
                   |
                   v
            +------------------+
            | Notificar        |
            | Usuario          |
            +------------------+
                   |
                   v
                ( @ ) FIN
```

### 9.7 Sistema de Permisos (RBAC)

```
+===========================================================================+
||                    ESTRUCTURA DE PERMISOS                               ||
+===========================================================================+

Categorias de Permisos (19):
+------------------+------------------+------------------+
| Visualizacion    | Usuarios         | Certificados     |
| - Dashboard Ejec | - users_view     | - Ver            |
|                  | - users_edit     | - Generar        |
|                  | - users_delete   |                  |
+------------------+------------------+------------------+
| Auditoria        | Roles            | Otros...         |
| - Ver Auditoria  | - Gestionar Roles| (15+ categorias) |
+------------------+------------------+------------------+

Niveles de Acceso (8):
+-------+--------+--------+--------+
| create| read   | update | delete |
+-------+--------+--------+--------+
|execute| approve| export | import |
+-------+--------+--------+--------+

Estructura de Permiso:
{
  id: string,
  code: 'modulo.accion',      // ej: 'users.create'
  name: string,
  module: string,
  level: PermissionLevel,
  requiresTwoFactor?: boolean,
  dependencies?: string[]      // Permisos requeridos
}

Validaciones:
- Permiso existe en sistema
- Permiso valido para el rol
- Dependencias satisfechas
- 2FA si requerido
- Separacion de deberes
```

### 9.8 Estados del Usuario

```
+----------+     +--------+     +----------+     +---------+
| PENDING  |---->| ACTIVE |---->| INACTIVE |---->| BLOCKED |
+----------+     +--------+     +----------+     +---------+
                      |                               ^
                      +-------------------------------+
                           (Multiples intentos fallidos)
```

### 9.9 Integraciones

| Modulo | Integracion |
|--------|-------------|
| Estructura Organizacional | Sedes y unidades |
| Roles y Permisos (RF015) | Control de acceso |
| Carpeta Digital | Documentos por usuario |
| Auditoria del Sistema | Registro de cambios |
| Notificaciones | Alertas a usuarios |

---

## 10. Modulo 7: Landing Page

### 10.1 Descripcion General

**ID Modulo:** MOD-LANDING-001
**Ubicacion:** `/src/components/portal/LandingPage.tsx`
**Tamano:** 42,130 bytes
**Framework:** React + TypeScript + Framer Motion

Pagina de aterrizaje publica que sirve como puerta de entrada a la plataforma ComUNIdad ESAP, ofreciendo servicios publicos sin autenticacion.

### 10.2 Estructura de la Pagina

```
+===========================================================================+
||                    ESTRUCTURA LANDING PAGE                              ||
+===========================================================================+

+------------------------------- NAVBAR -----------------------------------+
| Logo ESAP | "ComUNIdad" | [Validar Certificados] | [Iniciar Sesion]      |
+--------------------------------------------------------------------------+
                                    |
                                    v
+------------------------------- HERO -------------------------------------+
|                                                                          |
|  "La Escuela del                    +---------------------------+       |
|   Futuro, Hoy"                      |    [IMAGEN ESTUDIANTES]   |       |
|                                     |    +------------------+    |       |
|  Badge: ComUNIdad Universitaria     |    | 84% Cobertura    |    |       |
|                                     |    | Nacional         |    |       |
|  Stats: 66 anios | 84% | +17k       |    +------------------+    |       |
|                                     +---------------------------+       |
|  [Activate Ahora]                                                        |
|                                                                          |
|  Trust: ESAP | 100% Digital | Certificados | 24/7                       |
+--------------------------------------------------------------------------+
                                    |
                                    v
+------------------------------- ESTADISTICAS -----------------------------+
| +17 mil Estudiantes | 66 Anios | 84% Cobertura | 348 Entidades           |
+--------------------------------------------------------------------------+
                                    |
                                    v
+------------------------------- SERVICIOS --------------------------------+
|  +----------------------+    +----------------------+                    |
|  | Certificacion        |    | Certificados         |                    |
|  | de Titulos           |    | Laborales            |                    |
|  | [Seguro]             |    | [Abierto]            |                    |
|  | QR unico + trazab.   |    | Solicitud automatica |                    |
|  +----------------------+    +----------------------+                    |
+--------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------- DOS AMBIENTES ---------------------------------+
|  +----------------------+    +----------------------+                    |
|  | PORTAL               |    | BACKOFFICE           |                    |
|  | TRANSACCIONAL        |    | ADMINISTRATIVO       |                    |
|  | Estudiantes, Docentes|    | Personal admin       |                    |
|  | Graduados, Aspirantes|    | y directivo          |                    |
|  +----------------------+    +----------------------+                    |
+--------------------------------------------------------------------------+
                                    |
                                    v
+------------------------------- NEWSLETTER -------------------------------+
| "Mantente Informado" | [Email] | [Suscribirse]                          |
+--------------------------------------------------------------------------+
                                    |
                                    v
+------------------------------- FOOTER -----------------------------------+
| Informacion institucional | Contacto | Enlaces | GovCo                   |
+--------------------------------------------------------------------------+
```

### 10.3 Sistema de Vistas Internas

```
+===========================================================================+
||               ROUTING INTERNO DEL LANDING PAGE                          ||
+===========================================================================+

vistaActual: useState('landing' | 'certificados-laborales' |
                      'certificados-graduados' | 'validador-certificados')

( O ) Usuario accede a Landing
  |
  v
+------------------+
| vistaActual =    |
| 'landing'        |
+------------------+
  |
  v
< O > Usuario hace clic en:
  |
  +----------------+----------------+----------------+----------------+
  |                |                |                |                |
  v                v                v                v                v
+--------+   +----------+    +----------+    +----------+    +--------+
|Iniciar |   |Activate  |    |Cert.     |    |Cert.     |    |Validar |
|Sesion  |   |Ahora     |    |Laborales |    |Titulos   |    |Certif. |
+--------+   +----------+    +----------+    +----------+    +--------+
  |                |                |                |                |
  v                v                v                v                v
+--------+   +----------+    +----------+    +----------+    +--------+
|onIrA   |   |Abre Modal|    |vista=    |    |vista=    |    |vista=  |
|Login() |   |Enrollment|    |'cert-lab'|    |'cert-grad'|   |'valid.'|
+--------+   +----------+    +----------+    +----------+    +--------+
  |                |                |                |                |
  v                v                v                v                v
App.tsx      Enrollment      Solicitar       Public          Validador
Login        ActivationModal CertLaboral     TitleVerif.     Publico
```

### 10.4 Proceso: Enrolamiento (Activacion)

```
+===========================================================================+
||              PROCESO: ENROLAMIENTO DE NUEVO USUARIO                     ||
+===========================================================================+

[Usuario Anonimo]

( O ) Inicio (Clic en "Activate Ahora")
  |
  v
+------------------+
| Abrir Modal:     |
| Enrollment       |
| ActivationModal  |
+------------------+
  |
  v
+------------------+
| PASO 1:          |
| Ingresar         |
| Documento        |
+------------------+
  |
  v
< >--+
|    |
REGISTRADO  NO REGISTRADO
|                 |
v                 v
+----------+  +------------------+
|FLUJO 2   |  |FLUJO 1           |
|Verificar |  |Formulario        |
|Email     |  |Completo          |
+----------+  |                  |
              | - Datos basicos  |
              | - Contacto       |
              | - Verificar email|
              +------------------+
  |                 |
  +--------+--------+
           |
           v
    +------------------+
    | Verificacion     |
    | Email            |
    | (Codigo 6 dig.)  |
    +------------------+
           |
           v
    +------------------+
    | Crear Contrasena |
    +------------------+
           |
           v
    +------------------+
    | SUCCESS!         |
    | Cuenta Activada  |
    +------------------+
           |
           v
    +------------------+
    | setTimeout(500ms)|
    | Redirigir Login  |
    +------------------+
           |
           v
        ( @ ) FIN
```

### 10.5 Funcionalidades Publicas (Sin Login)

| Funcionalidad | Componente | Descripcion |
|---------------|------------|-------------|
| Ver Landing Page | LandingPage | Informacion institucional |
| Validar Certificados | ValidadorCertificadosPublico | Validar QR/codigo |
| Solicitar Cert. Laboral | SolicitarCertificadoLaboral | Generar certificado |
| Verificar Titulos | PublicTitleVerification | Buscar graduados |
| Enrolarse | EnrollmentActivationModal | Crear cuenta |
| Newsletter | NewsletterSection | Suscribirse |

### 10.6 Animaciones y UX

```
Framer Motion Animations:
+------------------+     +------------------+     +------------------+
| NAVBAR           |     | HERO             |     | CARDS            |
| y: -100 -> 0     |     | parallax scroll  |     | hover scale      |
| transition: 0.5s |     | opacity: 1 -> 0  |     | rotation         |
+------------------+     | scale: 1 -> 0.95 |     | gradient appear  |
                         +------------------+     +------------------+

Responsive Breakpoints:
xs: 320px | sm: 640px | md: 768px | lg: 1024px | xl: 1280px

Accesibilidad:
- Alt text en imagenes
- Reduced motion support
- Contraste de colores
- Focus states
```

---

## 11. Modulo 8: Portal Transaccional

### 11.1 Descripcion General

**ID Modulo:** MOD-PORTAL-001
**Version:** V5.0 (Microsoft Dynamics + LinkedIn Style)
**Ubicacion:** `/src/components/portal/`
**Componentes:** 60+ archivos
**Arquitectura:** Un portal unificado con vistas por rol

Sistema integral que proporciona servicios transaccionales personalizados segun el rol del usuario autenticado.

### 11.2 Arquitectura del Portal

```
+===========================================================================+
||               PORTAL TRANSACCIONAL UNIFICADO V5.0                       ||
||           Microsoft Dynamics + LinkedIn Style - ESAP                    ||
+===========================================================================+

                    +------------------+
                    | Usuario Autent.  |
                    | (Multiples Roles)|
                    +--------+---------+
                             |
                             v
                    +------------------+
                    | RoleSelector     |
                    | (Cambio de Rol)  |
                    +--------+---------+
                             |
         +-------------------+-------------------+
         |         |         |         |         |
         v         v         v         v         v
    +---------+ +-------+ +-------+ +--------+ +--------+
    |ESTUDIANTE|DOCENTE| |ADMIN. | |GRADUADO| |ASPIRANTE|
    +---------+ +-------+ +-------+ +--------+ +--------+
         |         |         |         |         |
         +-------------------+-------------------+
                             |
                             v
                    +------------------+
                    | UnifiedPortal    |
                    | ViewV5           |
                    +------------------+
                             |
         +-------------------+-------------------+
         |                   |                   |
         v                   v                   v
    +----------+      +----------+       +----------+
    | Command  |      | Servicios|       | Social   |
    | Bar+KPIs |      | por Rol  |       | Feed     |
    +----------+      +----------+       +----------+
```

### 11.3 Configuracion de Roles

```
+===========================================================================+
||                    CONFIGURACION DE ROLES                               ||
+===========================================================================+

+------------+-------------+--------------------+---------------------------+
| Rol        | Icono       | Color              | Descripcion               |
+------------+-------------+--------------------+---------------------------+
| Estudiante | GraduateCap | blue-500/600       | Vista academica           |
| Docente    | BookOpen    | purple-500/600     | Gestion de clases         |
| Administrativo| Briefcase| emerald-500/600    | Vista administrativa      |
| Graduado   | Users       | amber-500/600      | Red egresados             |
| Aspirante  | UserCircle  | gray-500/600       | Proceso admision          |
+------------+-------------+--------------------+---------------------------+
```

### 11.4 Proceso: Flujo de Login y Seleccion de Rol

```
+===========================================================================+
||                 PROCESO: LOGIN Y ACCESO AL PORTAL                       ||
+===========================================================================+

[Usuario]

( O ) Inicio (Accede a Login)
  |
  v
+------------------+
| LoginPage        |
| - Email*         |
| - Contrasena*    |
| - Recordarme     |
+------------------+
  |
  v
+------------------+
| Validar:         |
| - Email formato  |
| - Pass >= 6 char |
+------------------+
  |
  v
+------------------+
| Limpiar Cache    |
| localStorage     |
+------------------+
  |
  v
+------------------+
| Autenticar       |
| (1500ms delay)   |
+------------------+
  |
  v
< >--+
|    |
EXTERNO  INTERNO
|            |
v            v
+--------+ +------------------+
|Portal  | |Backoffice        |
|Transac.| |Administrativo    |
+--------+ +------------------+
  |
  v
+------------------+
| PortalDashboard  |
| (Orchestrator)   |
+------------------+
  |
  v
< >--+
|    |
1 ROL  MULTIPLES
|         |
v         v
+------+ +------------------+
|Vista | |RoleSelector      |
|Unica | |Mostrar opciones  |
+------+ +------------------+
              |
              v
       +------------------+
       | Persistir en     |
       | localStorage     |
       +------------------+
              |
              v
       +------------------+
       | UnifiedPortal    |
       | ViewV5           |
       +------------------+
              |
              v
           ( @ ) FIN
```

### 11.5 Servicios por Rol: ESTUDIANTE

```
+===========================================================================+
||               SERVICIOS PARA ROL: ESTUDIANTE                            ||
+===========================================================================+

KPIs:
+----------------+----------------+----------------+----------------+
| Promedio Gral  | Materias Act.  | Creditos       | Entregas Pend. |
| 4.2/5.0        | 6              | 45/160         | 3              |
+----------------+----------------+----------------+----------------+

Servicios:
+------------------+     +------------------+     +------------------+
| ACADEMICO        |     | FINANCIERO       |     | TRAMITES         |
|                  |     |                  |     |                  |
| - Notas [OK]     |     | - Estado Cta [OK]|     | - Solicitar      |
| - Horarios [OK]  |     | - Pagos [OK]     |     |   Certificados   |
| - Matricula [P]  |     +------------------+     |   [OK]           |
| - Biblioteca [OK]|                              +------------------+
+------------------+

Estados: [OK]=Disponible  [P]=Pendiente  [!]=Atencion  [X]=Deshabilitado
```

### 11.6 Servicios por Rol: DOCENTE

```
+===========================================================================+
||                 SERVICIOS PARA ROL: DOCENTE                             ||
+===========================================================================+

KPIs:
+----------------+----------------+----------------+----------------+
| Cursos Activos | Total Estudian.| Calif. Pend.   | Horas PTA      |
| 4              | 120            | 15             | 80/160         |
+----------------+----------------+----------------+----------------+

Servicios:
+------------------+     +------------------+     +------------------+
| ACADEMICO        |     | GESTION          |     | DOCUMENTOS       |
|                  |     |                  |     |                  |
| - Mis Cursos [OK]|     | - PTA [OK]       |     | - Docs por       |
| - Calificaciones |     | - Mi Horario [OK]|     |   Firmar [OK]    |
|   [!]            |     +------------------+     |   Badge: Digital |
| - Asistencia [OK]|                              +------------------+
| - Material [OK]  |
+------------------+
```

### 11.7 Servicios por Rol: ADMINISTRATIVO

```
+===========================================================================+
||            SERVICIOS PARA ROL: ADMINISTRATIVO/FUNCIONARIO               ||
+===========================================================================+

KPIs:
+----------------+----------------+----------------+----------------+
| Procesos Act.  | Auditorias     | Tareas Mes     | Docs Procesados|
| 5              | 2              | 15/30          | 45             |
+----------------+----------------+----------------+----------------+

Servicios:
+------------------+     +------------------+     +------------------+
| CONTROL INTERNO  |     | RRHH             |     | DOCUMENTOS       |
| DISCIPLINARIO    |     |                  |     |                  |
| - Expedientes    |     | - Certs. Lab [OK]|     | - Docs por       |
|   Legales [OK]   |     | - Vacaciones [OK]|     |   Firmar [OK]    |
| - Investigaciones|     +------------------+     | - Repositorio    |
|   [OK]           |                              |   [OK]           |
| Badge: Discipl.  |     +------------------+     +------------------+
+------------------+     | CONTROL INTERNO  |
                         | GESTION          |
                         | - Control Int [!]|
                         | - Plan Mejor [OK]|
                         +------------------+
```

### 11.8 Servicios por Rol: GRADUADO

```
+===========================================================================+
||                  SERVICIOS PARA ROL: GRADUADO                           ||
+===========================================================================+

KPIs:
+----------------+----------------+----------------+----------------+
| Ofertas Disp.  | Postulaciones  | Cursos Disp.   | Red Contactos  |
| 25             | 3              | 15             | 2,450+         |
+----------------+----------------+----------------+----------------+

Servicios:
+------------------+     +------------------+     +------------------+
| EMPLEO           |     | FORMACION        |     | TRAMITES         |
|                  |     |                  |     |                  |
| - Bolsa Empleo   |     | - Ed. Continua   |     | - Certificados   |
|   [OK]           |     |   [OK]           |     |   Docs [OK]      |
| Stats: Ofertas   |     | Stats: Cursos    |     | - Verificar      |
+------------------+     +------------------+     |   Titulo [OK]    |
                                                  +------------------+
+------------------+
| COMUNIDAD        |
| - Red Egresados  |
|   [OK]           |
| Badge: 2,450+    |
+------------------+
```

### 11.9 Servicios por Rol: ASPIRANTE

```
+===========================================================================+
||                 SERVICIOS PARA ROL: ASPIRANTE                           ||
+===========================================================================+

KPIs:
+----------------+----------------+----------------+----------------+
| Progreso Adm.  | Docs Pendientes| Programa Sel.  | Estado         |
| 65%            | 3              | Admin Pub.     | En Proceso     |
+----------------+----------------+----------------+----------------+

Servicios:
+------------------+     +------------------+     +------------------+
| ADMISIONES       |     | FINANCIERO       |     | SOPORTE          |
|                  |     |                  |     |                  |
| - Inscripcion    |     | - Pago Inscrip.  |     | - Asesoria [OK]  |
|   [!] 65%        |     |   [OK]           |     | Badge: 24/7      |
| - Carga Docs [P] |     +------------------+     +------------------+
| Stats: Pendientes|
+------------------+     +------------------+
                         | INFORMACION      |
                         | - Programas [OK] |
                         +------------------+
```

### 11.10 Modulo de Firma Electronica

```
+===========================================================================+
||                    PROCESO: FIRMA ELECTRONICA                           ||
+===========================================================================+

[Usuario con Docs Asignados]

( O ) Inicio (Accede a "Mis Documentos por Firmar")
  |
  v
+------------------+
| PortalTransacc.  |
| FirmaCompleto    |
+------------------+
  |
  v
< O > Tabs
  |
  +----------------+
  |                |
  v                v
+----------+  +----------+
|PENDIENTES|  |HISTORIAL |
+----------+  +----------+
  |
  v
+------------------+
| Lista Documentos |
| - Nombre         |
| - Remitente      |
| - Prioridad      |
| - Fecha Limite   |
| - Estado         |
+------------------+
  |
  v
< >--+
|    |
REQUIERE_OTP  NO_OTP
|                |
v                v
+----------+  (continua)
|Modal     |
|Codigo OTP|
|6 digitos |
+----------+
  |
  v
+------------------+
| VisorDocumento   |
| FirmaOTP         |
+------------------+
  |
  v
< O > Accion
  |
  +--------+--------+--------+--------+
  |        |        |        |        |
  v        v        v        v        v
+------+ +------+ +------+ +------+ +------+
|FIRMAR| |DEVOL.| |HISTO.| |COMPAR| |CERRAR|
+------+ +------+ +------+ +------+ +------+
  |        |        |        |
  v        v        v        v
Aplicar  Modal    Modal    Modal
Firma    Devol.   Histor.  Compartir
Dig.     Motivo   Firmas   Firma
  |        |
  +--------+
       |
       v
+------------------+
| Actualizar       |
| Estado Documento |
+------------------+
       |
       v
    ( @ ) FIN

Estados Documento:
+----------+     +-------+     +---------+     +----------+     +----------+
| pendiente|---->| visto |---->| firmado |     | devuelto |     |en-proceso|
+----------+     +-------+     +---------+     +----------+     +----------+
```

### 11.11 Dashboard Area Auditada (Control Interno)

```
+===========================================================================+
||           DASHBOARD PERSONAL - AREA AUDITADA                            ||
+===========================================================================+

[Empleado con Compromisos de Auditoria]

+------------------------------------------------------------------+
|                    DASHBOARD AREA AUDITADA                        |
+------------------------------------------------------------------+
|                                                                   |
|  NOTIFICACIONES PENDIENTES                                        |
|  +------------------------------------------------------------+  |
|  | [!] Auditoria AUD-2025-001 requiere evidencias             |  |
|  | [!] Vence accion correctiva en 3 dias                      |  |
|  +------------------------------------------------------------+  |
|                                                                   |
|  PLANES DE MEJORAMIENTO ACTIVOS                                   |
|  +------------------------------------------------------------+  |
|  | PLN-2025-001 | Aud. Gestion | Avance: 65% | [###==] AMARILLO| |
|  | PLN-2025-002 | Aud. TI      | Avance: 90% | [####=] VERDE   | |
|  +------------------------------------------------------------+  |
|                                                                   |
|  HALLAZGOS EN MI AREA                                            |
|  +------------------------------------------------------------+  |
|  | HAL-001 | No Conformidad | Mayor    | Plan: En Ejecucion   |  |
|  | HAL-002 | Observacion    | Menor    | Plan: Aprobado       |  |
|  +------------------------------------------------------------+  |
|                                                                   |
|  ACCIONES CORRECTIVAS PENDIENTES                                  |
|  +------------------------------------------------------------+  |
|  | ACC-001 | 5 dias | En Proceso | [Cargar Evidencia]         |  |
|  | ACC-002 | 2 dias | Pendiente  | [Cargar Evidencia] [!]     |  |
|  +------------------------------------------------------------+  |
|                                                                   |
+------------------------------------------------------------------+
```

### 11.12 Estados de Servicios

```
Badges de Estado:
+------------+------------------+------------------------------------+
| Estado     | Visual           | Significado                        |
+------------+------------------+------------------------------------+
| available  | Verde solido     | Servicio activo y funcional        |
| pending    | Gris punteado    | Proximamente disponible            |
| attention  | Amarillo/Naranja | Requiere atencion (tareas pend.)   |
| disabled   | Gris tachado     | Servicio deshabilitado             |
+------------+------------------+------------------------------------+
```

---

## 12. Matriz de Roles y Responsabilidades

### 12.1 Matriz RACI General

| Proceso | Super Admin | Jefe OCI | Auditor | Registrador | Abogado | Empleado |
|---------|-------------|----------|---------|-------------|---------|----------|
| Cert. Laborales | I | - | - | C | - | R/C |
| Registro Academico | I | - | - | R/A | - | C |
| Control Interno Gestion | I | A | R | I | - | C |
| Control Interno Discip. | I | A | C | - | R | C |
| Gestion Legal | I | C | - | - | R/A | - |
| Gestion de Personas | R/A | I | - | - | - | C |
| Landing Page | I | - | - | - | - | R |
| Portal Transaccional | I | - | - | C | - | R |

**Leyenda:**
- **R** = Responsable (Ejecuta la tarea)
- **A** = Aprobador (Autoriza la tarea)
- **C** = Consultado (Proporciona informacion)
- **I** = Informado (Recibe informacion)

### 12.2 Roles por Modulo

| Modulo | Rol Principal | Rol Secundario | Rol Consulta |
|--------|---------------|----------------|--------------|
| Certificados Laborales | Coordinador TH | Sistema | Empleado |
| Registro Academico | Registrador Academico | Docentes | Estudiante |
| Control Interno Gestion | Jefe OCI | Auditor Lider | Area Auditada |
| Control Interno Discip. | Jefe OCID | Profesional Instructor | Investigado |
| Gestion Legal (SIGL) | Jefe Juridico | Abogado Asignado | Auxiliar |
| Gestion de Personas | Super Administrador | Admin Sistema | Usuario Final |
| Landing Page | Sistema | - | Usuario Anonimo |
| Portal Transaccional | Segun Rol | Segun Rol | Segun Rol |

---

## 13. Integraciones entre Modulos

### 13.1 Diagrama de Integraciones

```
+===========================================================================+
||                    MAPA DE INTEGRACIONES                                ||
+===========================================================================+

                    +------------------+
                    |   GESTION DE     |
                    |   PERSONAS       |
                    |   (Base Central) |
                    +--------+---------+
                             |
         +-------------------+-------------------+
         |                   |                   |
         v                   v                   v
+----------------+  +----------------+  +----------------+
| LANDING PAGE   |  | PORTAL         |  | CERTIFICADOS   |
| (Publico)      |  | TRANSACCIONAL  |  | LABORALES      |
+-------+--------+  +-------+--------+  +-------+--------+
        |                   |                   |
        | Enrolamiento      | Servicios por Rol |
        |                   |                   |
        +-------------------+-------------------+
                            |
         +------------------+------------------+
         |                  |                  |
         v                  v                  v
+----------------+  +----------------+  +----------------+
| REGISTRO       |  | CONTROL        |  | FIRMA          |
| ACADEMICO      |  | INTERNO        |  | ELECTRONICA    |
+-------+--------+  +-------+--------+  +-------+--------+
        |                   |                   |
        v                   v                   |
+----------------+  +----------------+          |
| Base           |  | Planes de      |          |
| Graduados      |  | Mejoramiento   |          |
+----------------+  +-------+--------+          |
                           |                   |
                           v                   |
                    +----------------+         |
                    | DISCIPLINARIO  |<--------+
                    +-------+--------+   (Docs firmados)
                           |
        +------------------+
        |
        v
+===========================================================================+
||                         SIGL (GESTION LEGAL)                            ||
+===========================================================================+
     |           |           |           |           |
     v           v           v           v           v
+--------+  +--------+  +--------+  +--------+  +--------+
|Defensa |  |Juzgam. |  |Asesoria|  |Organos |  |Coactivo|
|Judicial|  |Discip. |  |Juridica|  |Control |  |        |
+--------+  +--------+  +--------+  +--------+  +--------+
     |           |           |           |           |
     +-----+-----+-----+-----+-----+-----+-----+-----+
                             |
                             v
                    +------------------+
                    | MOD-05: TERMINOS |
                    | E INFORMES       |
                    | (Sincronizacion) |
                    +------------------+
```

### 13.2 Eventos de Integracion

| Evento | Modulo Origen | Modulo Destino | Accion |
|--------|---------------|----------------|--------|
| Certificado Generado | Cert. Laborales | Auditoria | Registrar log |
| Auditoria Cerrada | Control Gestion | Planes Mejoramiento | Crear plan |
| Sancion Ejecutada | Disciplinario | RRHH | Notificar |
| Demanda Recibida | Centro Comunicaciones | Defensa Judicial | Crear expediente |
| Termino Proximo | Cualquier modulo | MOD-05 Terminos | Generar alerta |
| Hallazgo Detectado | Control Gestion | Control Disciplinario | Referir caso |
| Usuario Creado | Gestion Personas | Portal Transaccional | Habilitar acceso |
| Usuario Enrolado | Landing Page | Gestion Personas | Crear registro |
| Documento Firmado | Firma Electronica | Disciplinario/Legal | Actualizar estado |
| Rol Cambiado | Gestion Personas | Portal Transaccional | Actualizar vista |
| Contrasena Vencida | Gestion Personas | Notificaciones | Enviar alerta |

---

## Anexos

### A. Normativa Legal Aplicable

| Modulo | Normativa Principal |
|--------|---------------------|
| Certificados Laborales | Reglamento Interno ESAP |
| Registro Academico | Ley 30/1992, Decreto 2566/2003 |
| Control Interno Gestion | Ley 87/1993, MECI, NIA |
| Control Interno Discip. | Ley 734/2002, Ley 1952/2019 |
| Gestion Legal - Defensa | Ley 1437/2011, CGP |
| Gestion Legal - Coactivo | Ley 1066/2006, Estatuto Tributario |
| Gestion Legal - Organos | Ley 42/1993, Ley 734/2002 |

### B. Simbolos BPMN Utilizados

| Simbolo | Nombre | Uso |
|---------|--------|-----|
| ( O ) | Evento Inicio | Punto de partida |
| ( @ ) | Evento Fin | Terminacion |
| ( T ) | Evento Timer | Activacion por tiempo |
| ( M ) | Evento Mensaje | Comunicacion |
| ( ! ) | Evento Error | Excepcion |
| < > | Gateway XOR | Decision exclusiva |
| < + > | Gateway AND | Paralelo |
| [Pool] | Pool/Lane | Participante |
| +----+ | Tarea | Actividad atomica |
| +====+ | Subproceso | Proceso anidado |

### C. Control de Versiones

| Version | Fecha | Autor | Cambios |
|---------|-------|-------|---------|
| 1.0 | Enero 2026 | Equipo Arquitectura | Documento inicial |
| 2.0 | Enero 2026 | Equipo Arquitectura | Actualizacion con 5 modulos especificos |
| 3.0 | Enero 2026 | Equipo Arquitectura | Adicion de Gestion Personas, Landing Page y Portal Transaccional (8 modulos totales) |

---

**Documento generado automaticamente**
**ESAP - Plataforma ComUNIdad**
**Enero 2026**

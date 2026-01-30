# Matriz de Actores vs Actividades

## Plataforma ComUNIdad ESAP

**Version:** 1.0
**Fecha:** Enero 2026
**Autor:** Equipo de Arquitectura ESAP

---

## Tabla de Contenidos

1. [Introduccion](#1-introduccion)
2. [Catalogo de Actores](#2-catalogo-de-actores)
3. [Matriz General de Actores vs Modulos](#3-matriz-general-de-actores-vs-modulos)
4. [Modulo 1: Certificados Laborales](#4-modulo-1-certificados-laborales)
5. [Modulo 2: Registro Academico](#5-modulo-2-registro-academico)
6. [Modulo 3: Control Interno de Gestion](#6-modulo-3-control-interno-de-gestion)
7. [Modulo 4: Control Interno Disciplinario](#7-modulo-4-control-interno-disciplinario)
8. [Modulo 5: Gestion Legal (SIGL)](#8-modulo-5-gestion-legal-sigl)
9. [Modulo 6: Gestion de Personas](#9-modulo-6-gestion-de-personas)
10. [Modulo 7: Landing Page](#10-modulo-7-landing-page)
11. [Modulo 8: Portal Transaccional](#11-modulo-8-portal-transaccional)
12. [Matriz Consolidada por Actor](#12-matriz-consolidada-por-actor)
13. [Permisos y Restricciones](#13-permisos-y-restricciones)

---

## 1. Introduccion

Este documento presenta la **Matriz de Actores vs Actividades** de la plataforma ComUNIdad ESAP, detallando las acciones permitidas para cada tipo de usuario en cada modulo del sistema.

### 1.1 Proposito

- Definir claramente las responsabilidades de cada actor
- Establecer los limites de accion por rol
- Facilitar la implementacion de controles de acceso (RBAC)
- Servir como referencia para auditoria y cumplimiento

### 1.2 Convenciones

| Simbolo | Significado |
|---------|-------------|
| **C** | Crear (Create) |
| **R** | Leer/Consultar (Read) |
| **U** | Actualizar (Update) |
| **D** | Eliminar (Delete) |
| **A** | Aprobar (Approve) |
| **E** | Ejecutar (Execute) |
| **F** | Firmar (Sign) |
| **N** | Notificar (Notify) |
| **X** | Exportar (Export) |
| **-** | Sin acceso |

---

## 2. Catalogo de Actores

### 2.1 Actores del Sistema

| ID | Actor | Descripcion | Ambito |
|----|-------|-------------|--------|
| A01 | **Super Administrador** | Control total del sistema | Nacional |
| A02 | **Administrador de Sistema** | Gestion de usuarios y configuracion | Nacional |
| A03 | **Director Nacional** | Supervision y aprobaciones de alto nivel | Nacional |
| A04 | **Director Territorial** | Gestion de sede territorial | Territorial |
| A05 | **Coordinador CETAP** | Gestion de centro de estudios | Local |
| A06 | **Jefe OCI** | Jefe Oficina Control Interno | Nacional |
| A07 | **Auditor Lider** | Lider de equipo de auditoria | Por auditoria |
| A08 | **Auditor Operativo** | Ejecutor de auditorias | Por auditoria |
| A09 | **Jefe OCID** | Jefe Control Interno Disciplinario | Nacional |
| A10 | **Profesional Instructor** | Instructor de procesos disciplinarios | Por proceso |
| A11 | **Jefe Juridico** | Director de asuntos legales | Nacional |
| A12 | **Abogado** | Profesional juridico asignado | Por caso |
| A13 | **Registrador Academico** | Gestion de registros academicos | Nacional |
| A14 | **Coordinador TH** | Coordinador Talento Humano | Nacional |
| A15 | **Docente** | Profesor vinculado | Territorial |
| A16 | **Estudiante** | Estudiante activo | Territorial |
| A17 | **Graduado** | Egresado de la institucion | Nacional |
| A18 | **Aspirante** | Candidato a admision | Nacional |
| A19 | **Funcionario/Administrativo** | Personal administrativo | Segun cargo |
| A20 | **Area Auditada** | Responsable de area en auditoria | Por area |
| A21 | **Investigado** | Sujeto de proceso disciplinario | Por proceso |
| A22 | **Usuario Anonimo** | Visitante sin autenticacion | Publico |
| A23 | **Verificador Externo** | Entidad que valida certificados | Externo |
| A24 | **Tribunal Apelacion** | Organo de segunda instancia | Nacional |

### 2.2 Jerarquia de Roles

```
+===========================================================================+
||                    JERARQUIA DE ROLES DEL SISTEMA                       ||
+===========================================================================+

NIVEL 1 (Maximo)
+------------------+
| Super            |
| Administrador    |
+--------+---------+
         |
NIVEL 2  v
+------------------+     +------------------+     +------------------+
| Administrador    |     | Director         |     | Jefe OCI /       |
| Sistema          |     | Nacional         |     | OCID / Juridico  |
+--------+---------+     +--------+---------+     +--------+---------+
         |                        |                        |
NIVEL 3  v                        v                        v
+------------------+     +------------------+     +------------------+
| Director         |     | Registrador      |     | Auditor Lider /  |
| Territorial      |     | Academico        |     | Prof. Instructor |
+--------+---------+     +--------+---------+     +--------+---------+
         |                        |                        |
NIVEL 4  v                        v                        v
+------------------+     +------------------+     +------------------+
| Coordinador      |     | Coordinador TH   |     | Auditor Operativo|
| CETAP            |     |                  |     | / Abogado        |
+--------+---------+     +--------+---------+     +--------+---------+
         |                        |                        |
NIVEL 5  v                        v                        v
+------------------+     +------------------+     +------------------+
| Docente          |     | Funcionario /    |     | Area Auditada /  |
|                  |     | Administrativo   |     | Investigado      |
+--------+---------+     +--------+---------+     +--------+---------+
         |
NIVEL 6  v
+------------------+     +------------------+     +------------------+
| Estudiante       |     | Graduado         |     | Aspirante        |
+------------------+     +------------------+     +------------------+

NIVEL 7 (Sin autenticacion)
+------------------+     +------------------+
| Usuario Anonimo  |     | Verificador Ext. |
+------------------+     +------------------+
```

---

## 3. Matriz General de Actores vs Modulos

### 3.1 Acceso por Modulo

| Actor | Cert. Lab. | Reg. Acad. | CI Gestion | CI Discip. | SIGL | Gest. Pers. | Landing | Portal Trans. |
|-------|------------|------------|------------|------------|------|-------------|---------|---------------|
| Super Administrador | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD | R | CRUD |
| Admin Sistema | RU | R | R | R | R | CRUD | R | RU |
| Director Nacional | R | RA | RA | RA | RA | R | R | R |
| Director Territorial | R | R | R | R | R | RU | R | R |
| Coordinador CETAP | R | R | R | - | - | R | R | R |
| Jefe OCI | R | - | CRUDA | R | R | R | - | R |
| Auditor Lider | R | - | CRUDE | R | - | R | - | R |
| Auditor Operativo | R | - | CRE | - | - | R | - | R |
| Jefe OCID | R | - | R | CRUDA | R | R | - | R |
| Prof. Instructor | - | - | - | CRUE | - | - | - | R |
| Jefe Juridico | R | - | R | R | CRUDA | R | - | R |
| Abogado | - | - | - | R | CRUE | - | - | R |
| Registrador Acad. | R | CRUDA | - | - | - | R | - | R |
| Coordinador TH | CRUDE | R | - | - | - | R | - | R |
| Docente | R | R | - | - | - | R | R | R |
| Estudiante | - | R | - | - | - | R | R | R |
| Graduado | R | R | - | - | - | R | R | R |
| Aspirante | - | - | - | - | - | - | R | R |
| Funcionario | R | - | R | R | - | R | R | R |
| Area Auditada | - | - | RU | - | - | - | - | R |
| Investigado | - | - | - | R | - | - | - | R |
| Usuario Anonimo | - | - | - | - | - | - | R | - |
| Verificador Externo | R | R | - | - | - | - | R | - |

---

## 4. Modulo 1: Certificados Laborales

### 4.1 Matriz de Actividades

| Actividad | Super Admin | Coord. TH | Funcionario | Graduado | Verif. Externo | Sistema |
|-----------|-------------|-----------|-------------|----------|----------------|---------|
| **Solicitar certificado** | C | C | C | C | - | - |
| **Buscar empleado** | R | R | - | - | - | E |
| **Validar datos RRHH** | - | R | - | - | - | E |
| **Generar certificado PDF** | E | E | - | - | - | E |
| **Aplicar firma digital** | - | - | - | - | - | E |
| **Generar codigo QR** | - | - | - | - | - | E |
| **Enviar por email** | - | E | - | - | - | E |
| **Descargar certificado** | R | R | R | R | - | - |
| **Validar QR publico** | R | R | R | R | R | E |
| **Consultar historial** | R | R | R | R | - | - |
| **Anular certificado** | D | D | - | - | - | - |
| **Configurar plantillas** | U | U | - | - | - | - |
| **Ver reportes** | R | R | - | - | - | - |
| **Exportar datos** | X | X | - | - | - | - |

### 4.2 Flujo de Responsabilidades

```
SOLICITUD AUTOSERVICIO:
Empleado -----> [Solicita] -----> Sistema -----> [Valida] -----> [Genera]
                                      |                              |
                                      v                              v
                               [Web Service RRHH]              [PDF + QR]
                                      |                              |
                                      v                              v
                               [Datos empleado]              [Email enviado]

GENERACION MANUAL:
Coord. TH -----> [Busca] -----> [Valida] -----> [Configura] -----> [Genera]
                    |               |                |                  |
                    v               v                v                  v
              [Empleado]      [Datos OK?]      [Tipo cert.]       [PDF + QR]
```

---

## 5. Modulo 2: Registro Academico

### 5.1 Matriz de Actividades

| Actividad | Super Admin | Registrador | Docente | Estudiante | Graduado | Verif. Ext. |
|-----------|-------------|-------------|---------|------------|----------|-------------|
| **Solicitar certificado academico** | C | C | - | C | C | - |
| **Aprobar solicitud** | A | A | - | - | - | - |
| **Rechazar solicitud** | A | A | - | - | - | - |
| **Generar certificado** | E | E | - | - | - | - |
| **Consultar historial academico** | R | R | R | R | R | - |
| **Ver calificaciones** | R | R | R | R | R | - |
| **Registrar calificaciones** | - | U | U | - | - | - |
| **Aprobar calificaciones** | A | A | - | - | - | - |
| **Gestionar graduados** | CUD | CUD | - | - | - | - |
| **Verificar titulo** | R | R | R | R | R | R |
| **Generar QR de titulo** | E | E | - | - | - | - |
| **Consultar base graduados** | R | R | - | - | R | R |
| **Exportar reportes** | X | X | - | - | - | - |
| **Configurar tipos certificado** | CU | CU | - | - | - | - |

### 5.2 Tipos de Certificados y Permisos

| Tipo Certificado | Quien Solicita | Quien Aprueba | Tiempo | Costo |
|------------------|----------------|---------------|--------|-------|
| Notas | Estudiante, Graduado | Registrador | 2.1 dias | $25,000 |
| Estudios | Estudiante, Graduado | Registrador | 2.5 dias | $20,000 |
| Grado | Graduado | Registrador | 3.2 dias | $40,000 |
| Matricula | Estudiante | Registrador | 1.8 dias | $15,000 |
| Programa | Estudiante, Graduado | Registrador | 2.7 dias | $30,000 |

---

## 6. Modulo 3: Control Interno de Gestion

### 6.1 Matriz de Actividades por Fase

#### FASE 1: Programacion

| Actividad | Jefe OCI | Aud. Lider | Aud. Oper. | Area Audit. | Sistema |
|-----------|----------|------------|------------|-------------|---------|
| Evaluar riesgos por proceso | CRU | R | - | - | - |
| Definir Plan Anual Auditorias | CU | R | - | - | - |
| Aprobar Plan Anual | A | - | - | - | - |
| Consultar universo auditoria | R | R | R | - | E |

#### FASE 2: Planeacion (Wizard 4 Pasos)

| Actividad | Jefe OCI | Aud. Lider | Aud. Oper. | Area Audit. | Sistema |
|-----------|----------|------------|------------|-------------|---------|
| Seleccionar auditoria programada | E | - | - | - | - |
| Configurar equipo auditor | CU | - | - | - | - |
| Establecer alcance y fechas | CU | R | - | - | - |
| Generar documentos automaticos | E | - | - | - | E |
| Iniciar auditoria | E | - | - | - | - |
| Notificar area auditada | - | - | - | - | N |

#### FASE 3: Ejecucion

| Actividad | Jefe OCI | Aud. Lider | Aud. Oper. | Area Audit. | Sistema |
|-----------|----------|------------|------------|-------------|---------|
| Recolectar evidencias | R | E | E | - | - |
| Aplicar listas de chequeo | R | E | E | - | - |
| Registrar hallazgos | R | CU | CU | - | - |
| Clasificar hallazgos | - | U | U | - | - |
| Cargar documentos soporte | - | C | C | C | - |

#### FASE 4: Comunicacion

| Actividad | Jefe OCI | Aud. Lider | Aud. Oper. | Area Audit. | Sistema |
|-----------|----------|------------|------------|-------------|---------|
| Elaborar informe preliminar | R | CU | - | - | - |
| Enviar a area auditada | - | E | - | - | N |
| Ejercer derecho contradiccion | - | - | - | CU | - |
| Analizar observaciones | A | U | - | - | - |
| Elaborar informe final | A | CU | - | - | - |
| Firmar informe | F | - | - | - | - |
| Generar plan de mejoramiento | - | - | - | - | E |

#### FASE 5: Seguimiento

| Actividad | Jefe OCI | Aud. Lider | Aud. Oper. | Area Audit. | Sistema |
|-----------|----------|------------|------------|-------------|---------|
| Cargar evidencias cumplimiento | - | - | - | CU | - |
| Validar evidencias | A | U | U | - | - |
| Calcular porcentaje cumplimiento | R | R | R | R | E |
| Cerrar hallazgo | A | E | - | - | - |
| Generar reportes seguimiento | R | R | - | R | E |

### 6.2 Roles y Colores del Sistema

| Rol | Color | Codigo | Permisos Clave |
|-----|-------|--------|----------------|
| Jefe OCI | Rojo | #DC2626 | TODOS |
| Auditor Lider | Azul | #003DA5 | Ejecutar, informes, validar |
| Auditor Operativo | Azul Claro | #3B82F6 | Ejecutar, hallazgos |
| Area Auditada | Verde | #10B981 | Cargar evidencias, consultar |
| Administrador | Purpura | #8B5CF6 | Configuracion |

---

## 7. Modulo 4: Control Interno Disciplinario

### 7.1 Matriz de Actividades por Etapa

| Actividad | Jefe OCID | Prof. Instr. | Investigado | Tribunal | Sistema |
|-----------|-----------|--------------|-------------|----------|---------|
| **RECEPCION** |
| Registrar noticia disciplinaria | C | C | - | - | - |
| Capturar datos denuncia | CU | CU | - | - | - |
| **VALORACION (30 dias)** |
| Analizar hechos y evidencias | R | R | - | - | - |
| Verificar competencia | A | E | - | - | - |
| Decidir: Investigar/Archivar/Devolver | A | - | - | - | - |
| Crear proceso disciplinario | C | - | - | - | - |
| Asignar profesional instructor | U | - | - | - | - |
| **E1: AVOCAMIENTO** |
| Elaborar auto de apertura | A | C | - | - | - |
| Notificar al investigado | - | E | - | - | N |
| Recopilar pruebas iniciales | - | E | - | - | - |
| Formular cargos | A | CU | - | - | - |
| **E2: DESCARGOS (10 dias)** |
| Recibir notificacion | - | - | R | - | N |
| Presentar descargos | - | - | C | - | - |
| Registrar aceptacion tacita | - | U | - | - | E |
| **E3: PRUEBAS (15 dias)** |
| Elaborar auto practica pruebas | A | C | - | - | - |
| Practicar pruebas | - | E | - | - | - |
| Solicitar pruebas adicionales | - | - | C | - | - |
| Elaborar auto cierre pruebas | A | C | - | - | - |
| **E4: ALEGATOS (10 dias)** |
| Presentar alegatos investigado | - | - | C | - | - |
| Presentar alegatos OCID | - | C | - | - | - |
| **E5: FALLO 1a INSTANCIA (30 dias)** |
| Elaborar fallo disciplinario | A | CU | - | - | - |
| Aprobar y firmar fallo | AF | - | - | - | - |
| Notificar fallo | - | E | - | - | N |
| Informar a RRHH (5 dias) | - | E | - | - | N |
| **E6: APELACION (10 dias)** |
| Presentar recurso apelacion | - | - | C | - | - |
| Remitir a tribunal | - | E | - | - | - |
| **E7: FALLO 2a INSTANCIA (30 dias)** |
| Analizar expediente | - | - | - | R | - |
| Emitir fallo segunda instancia | - | - | - | A | - |
| Ejecutar sancion | E | - | - | - | - |

### 7.2 Tipos de Sanciones por Responsable

| Tipo Falta | Sancion | Quien Impone | Quien Ejecuta |
|------------|---------|--------------|---------------|
| Leve | Amonestacion | Jefe OCID | Jefe OCID |
| Grave | Suspension 1-12 meses | Jefe OCID / Tribunal | RRHH |
| Grave | Multa hasta 5 SMMLV | Jefe OCID / Tribunal | Nomina |
| Gravisima | Destitucion | Tribunal | RRHH + Director |
| Gravisima | Inhabilidad hasta 10 anios | Tribunal | Procuraduria |

---

## 8. Modulo 5: Gestion Legal (SIGL)

### 8.1 Matriz General por Submodulo

| Submodulo | Jefe Jur. | Abogado | Auxiliar | Sistema |
|-----------|-----------|---------|----------|---------|
| MOD-01: Defensa Judicial | CRUDA | CRUE | R | EN |
| MOD-02: Juzgamiento Disciplinario | CRUDA | CRUE | R | EN |
| MOD-03: Asesoria Juridica | CRA | CRU | R | E |
| MOD-04: Centro Comunicaciones | RA | RU | CRU | EN |
| MOD-05: Terminos e Informes | RA | R | R | E |
| MOD-06: Organos de Control | CRUDA | CRUE | R | EN |
| MOD-07: Proceso Coactivo | CRUDA | CRUE | R | EN |
| MOD-08: Expedientes | RA | RU | RU | - |
| MOD-09: Plan de Accion | CUA | CU | R | E |
| MOD-10: Gestion Riesgos | CUA | CU | R | E |
| MOD-11: Planes de Mejora | CUA | CU | R | E |

### 8.2 Defensa Judicial - Actividades Detalladas

| Actividad | Jefe Jur. | Abogado | Auxiliar | Sistema |
|-----------|-----------|---------|----------|---------|
| Recibir demanda | R | R | C | N |
| Asignar abogado | U | - | - | - |
| Radicar proceso | - | C | C | - |
| Preparar contestacion | R | CU | - | - |
| Presentar contestacion | A | E | - | - |
| Solicitar pruebas | A | CU | - | - |
| Presentar alegatos | A | CU | - | - |
| Recibir sentencia | R | R | C | N |
| Decidir apelacion | A | R | - | - |
| Presentar apelacion | A | E | - | - |
| Ejecutar sentencia | A | E | - | - |
| Cerrar proceso | A | E | - | - |

### 8.3 Proceso Coactivo - Actividades Detalladas

| Actividad | Jefe Jur. | Abogado | Auxiliar | Sistema |
|-----------|-----------|---------|----------|---------|
| Identificar deudor | - | C | C | - |
| Calcular monto deuda | - | E | - | E |
| Enviar cobro persuasivo | A | E | - | N |
| Emitir mandamiento pago | A | C | - | - |
| Notificar mandamiento | - | E | - | N |
| Recibir excepciones | - | R | C | - |
| Resolver excepciones | A | CU | - | - |
| Ordenar medidas cautelares | A | E | - | - |
| Liquidar credito | A | E | - | E |
| Ordenar remate | A | E | - | - |
| Registrar recaudo | A | U | C | - |

### 8.4 Sistema de Semaforo de Terminos

| Dias Restantes | Color | Quien Recibe Alerta | Accion Automatica |
|----------------|-------|---------------------|-------------------|
| > 5 dias | Verde | - | Seguimiento normal |
| 2-5 dias | Amarillo | Abogado, Auxiliar | Email cada 2 dias |
| <= 2 dias | Rojo | Abogado, Jefe Jur. | Email diario, escalamiento |
| 0 o negativo | Rojo Oscuro | Jefe Jur., Direccion | Reporte incumplimiento |

---

## 9. Modulo 6: Gestion de Personas

### 9.1 Matriz de Actividades

| Actividad | Super Admin | Admin Sist. | Dir. Territ. | Coord. CETAP | Usuario |
|-----------|-------------|-------------|--------------|--------------|---------|
| **GESTION DE USUARIOS** |
| Crear usuario/persona | C | C | C | - | - |
| Editar datos usuario | U | U | U | - | U* |
| Eliminar usuario | D | D | - | - | - |
| Activar/Desactivar usuario | U | U | U | - | - |
| Bloquear usuario | U | U | - | - | - |
| Ver lista usuarios | R | R | R | R | - |
| Buscar usuarios | R | R | R | R | - |
| **GESTION DE ROLES** |
| Crear rol | C | C | - | - | - |
| Editar rol | U | U | - | - | - |
| Eliminar rol | D | - | - | - | - |
| Asignar rol a usuario | U | U | U | - | - |
| Revocar rol | U | U | U | - | - |
| **GESTION DE PERMISOS** |
| Crear permiso | C | - | - | - | - |
| Asignar permiso a rol | U | U | - | - | - |
| Ver permisos de usuario | R | R | R | R | R* |
| **GESTION DE SEDES** |
| Asignar sede a usuario | U | U | U | - | - |
| Cambiar sede principal | U | U | U | - | - |
| Remover sede | U | U | U | - | - |
| **CONTRASENAS** |
| Forzar cambio contrasena | E | E | E | - | - |
| Enviar recordatorio | E | E | E | - | - |
| Ver estado contrasenas | R | R | R | R | - |
| Cambiar propia contrasena | - | - | - | - | U |
| Recuperar contrasena | - | - | - | - | E |
| **AUDITORIA** |
| Ver historial cambios | R | R | R | - | R* |
| Exportar logs | X | X | - | - | - |

*Solo sobre su propio perfil

### 9.2 Permisos por Nivel de Jerarquia

```
+===========================================================================+
||                    HERENCIA DE PERMISOS                                 ||
+===========================================================================+

Super Administrador (Nivel 1)
    |
    +---> Todos los permisos de Admin Sistema
    +---> Configuracion global
    +---> Eliminar roles
    +---> Crear permisos
    |
    v
Admin Sistema (Nivel 2)
    |
    +---> Todos los permisos de Director Territorial
    +---> Crear roles
    +---> Bloquear usuarios
    +---> Exportar logs
    |
    v
Director Territorial (Nivel 4)
    |
    +---> CRUD usuarios de su sede
    +---> Asignar roles (hasta su nivel)
    +---> Ver reportes de sede
    |
    v
Coordinador CETAP (Nivel 5)
    |
    +---> Solo lectura
    +---> Buscar usuarios
    |
    v
Usuario Final (Nivel 6-7)
    |
    +---> Ver/editar propio perfil
    +---> Cambiar propia contrasena
```

---

## 10. Modulo 7: Landing Page

### 10.1 Matriz de Actividades

| Actividad | Usuario Anonimo | Verif. Externo | Sistema |
|-----------|-----------------|----------------|---------|
| **NAVEGACION** |
| Ver pagina principal | R | R | - |
| Ver estadisticas institucionales | R | R | E |
| Ver servicios disponibles | R | R | - |
| Ver informacion de contacto | R | R | - |
| **VALIDACION** |
| Validar certificado por QR | E | E | E |
| Validar certificado por codigo | E | E | E |
| Ver resultado validacion | R | R | - |
| Descargar constancia validacion | R | R | E |
| **VERIFICACION TITULOS** |
| Buscar graduado por documento | E | E | E |
| Ver informacion de titulo | R | R | - |
| Generar certificado verificacion | - | E | E |
| **ENROLAMIENTO** |
| Iniciar proceso activacion | E | - | - |
| Ingresar documento | E | - | - |
| Completar formulario | CU | - | - |
| Verificar email (codigo) | E | - | E |
| Crear contrasena | C | - | - |
| **SOLICITUDES** |
| Solicitar certificado laboral | C | - | - |
| Suscribirse a newsletter | C | - | - |
| **ACCESO** |
| Ir a login | E | - | - |
| Seleccionar ambiente (Portal/Backoffice) | R | - | - |

### 10.2 Flujos Publicos

```
ENROLAMIENTO:
Usuario Anonimo --> [Documento] --> Sistema --> [Valida Existencia]
                                       |
                    +------------------+------------------+
                    |                                     |
               EXISTE                               NO EXISTE
                    |                                     |
                    v                                     v
          [Flujo Verificacion]                  [Formulario Completo]
                    |                                     |
                    +------------------+------------------+
                                       |
                                       v
                              [Verificar Email]
                                       |
                                       v
                              [Crear Contrasena]
                                       |
                                       v
                              [Redirigir Login]
```

---

## 11. Modulo 8: Portal Transaccional

### 11.1 Matriz General por Rol de Portal

| Servicio | Estudiante | Docente | Admin. | Graduado | Aspirante |
|----------|------------|---------|--------|----------|-----------|
| **ACADEMICO** |
| Consultar notas | R | R | - | R | - |
| Registrar notas | - | CU | - | - | - |
| Ver horarios | R | R | - | - | - |
| Matricula academica | CU | - | - | - | - |
| Biblioteca virtual | R | R | - | R | - |
| **FINANCIERO** |
| Ver estado de cuenta | R | - | - | - | R |
| Realizar pagos | E | - | - | - | E |
| **TRAMITES** |
| Solicitar certificados | C | - | R | C | - |
| Ver mis solicitudes | R | - | R | R | - |
| **CONTROL INTERNO** |
| Ver expedientes legales | - | - | R | - | - |
| Ver investigaciones | - | - | R | - | - |
| Control interno gestion | - | - | RU | - | - |
| Plan de mejoramiento | - | - | RU | - | - |
| **RRHH** |
| Certificados laborales | - | R | R | - | - |
| Gestion vacaciones | - | - | CRU | - | - |
| **DOCUMENTOS** |
| Ver docs por firmar | - | R | R | - | - |
| Firmar documento | - | F | F | - | - |
| Devolver documento | - | E | E | - | - |
| Repositorio documental | - | R | R | - | - |
| **EMPLEO** |
| Ver bolsa empleo | - | - | - | R | - |
| Aplicar a ofertas | - | - | - | C | - |
| **COMUNIDAD** |
| Red de egresados | - | - | - | R | - |
| Educacion continua | - | - | - | R | - |
| **ADMISION** |
| Proceso inscripcion | - | - | - | - | CU |
| Carga documentos | - | - | - | - | CU |
| Ver programas | - | - | - | - | R |
| **GESTION DOCENTE** |
| Mis cursos | - | R | - | - | - |
| Control asistencia | - | CU | - | - | - |
| Material de clase | - | CU | - | - | - |
| Plan Trabajo Academico | - | CRUD | - | - | - |

### 11.2 Actividades de Firma Electronica

| Actividad | Docente | Admin. | Sistema |
|-----------|---------|--------|---------|
| Ver documentos pendientes | R | R | - |
| Ver documentos firmados | R | R | - |
| Ingresar codigo OTP | E | E | - |
| Ver documento | R | R | - |
| Firmar documento | F | F | - |
| Devolver documento | E | E | - |
| Ver historial firmas | R | R | - |
| Compartir para firma | E | E | - |
| Recibir notificacion | - | - | N |

### 11.3 Dashboard Area Auditada (Administrativo)

| Actividad | Funcionario con Compromiso | Sistema |
|-----------|----------------------------|---------|
| Ver notificaciones pendientes | R | N |
| Ver planes mejoramiento activos | R | - |
| Ver semaforo de avance | R | E |
| Ver hallazgos en mi area | R | - |
| Ver acciones correctivas | R | - |
| Cargar evidencia | CU | - |
| Recibir alertas vencimiento | - | N |

---

## 12. Matriz Consolidada por Actor

### 12.1 Super Administrador (A01)

| Modulo | Actividades Principales |
|--------|------------------------|
| Certificados Laborales | CRUD certificados, configurar plantillas, exportar |
| Registro Academico | CRUD certificados, gestionar graduados |
| Control Interno Gestion | CRUD auditorias, aprobar planes |
| Control Interno Disciplinario | CRUD procesos, supervision |
| SIGL | CRUD todos los submodulos |
| Gestion Personas | CRUD usuarios, roles, permisos |
| Landing Page | Solo lectura |
| Portal Transaccional | CRUD todos los servicios |

### 12.2 Estudiante (A16)

| Modulo | Actividades Principales |
|--------|------------------------|
| Registro Academico | Solicitar certificados, ver notas |
| Gestion Personas | Ver/editar perfil propio |
| Landing Page | Validar certificados, enrolarse |
| Portal Transaccional | Academico (notas, horarios, matricula), financiero, biblioteca |

### 12.3 Docente (A15)

| Modulo | Actividades Principales |
|--------|------------------------|
| Certificados Laborales | Solicitar para si mismo |
| Registro Academico | Registrar calificaciones, ver horarios |
| Gestion Personas | Ver/editar perfil propio |
| Portal Transaccional | Cursos, calificaciones, asistencia, PTA, firmar documentos |

### 12.4 Graduado (A17)

| Modulo | Actividades Principales |
|--------|------------------------|
| Certificados Laborales | Solicitar si fue empleado |
| Registro Academico | Solicitar certificados academicos, verificar titulo |
| Gestion Personas | Ver/editar perfil propio |
| Landing Page | Validar certificados |
| Portal Transaccional | Bolsa empleo, red egresados, educacion continua |

### 12.5 Funcionario/Administrativo (A19)

| Modulo | Actividades Principales |
|--------|------------------------|
| Certificados Laborales | Solicitar para si mismo |
| Control Interno Gestion | Cargar evidencias (si es area auditada) |
| Control Interno Disciplinario | Consultar (si es investigado) |
| Gestion Personas | Ver/editar perfil propio |
| Portal Transaccional | Expedientes, control interno, RRHH, firmar documentos |

---

## 13. Permisos y Restricciones

### 13.1 Restricciones por Ambito

| Ambito | Actores con Acceso | Restriccion |
|--------|-------------------|-------------|
| Nacional | Super Admin, Admin Sistema, Dir. Nacional, Jefes | Sin restriccion geografica |
| Territorial | Dir. Territorial, Coord. CETAP | Solo su sede y dependencias |
| Local | Docente, Estudiante | Solo su CETAP |
| Por Proceso | Auditor, Abogado, Instructor | Solo procesos asignados |
| Por Area | Area Auditada | Solo su area de trabajo |
| Personal | Investigado | Solo su expediente |

### 13.2 Restricciones Temporales

| Proceso | Plazo | Actor Afectado | Consecuencia |
|---------|-------|----------------|--------------|
| Descargos disciplinarios | 10 dias habiles | Investigado | Aceptacion tacita |
| Apelacion | 10 dias habiles | Investigado | Ejecutoria fallo |
| Contestacion tutela | 2 dias calendario | Abogado | Fallo en contra |
| Contestacion demanda | 30 dias habiles | Abogado | Rebeldia |
| Informe a RRHH | 5 dias habiles | Prof. Instructor | Reporte incumplimiento |
| Contradiccion auditoria | 5 dias habiles | Area Auditada | Hallazgo firme |

### 13.3 Separacion de Deberes

| Actividad 1 | Actividad 2 | Restriccion |
|-------------|-------------|-------------|
| Crear auditoria | Ejecutar auditoria | Jefe OCI != Auditor |
| Formular cargos | Emitir fallo | Instructor != Jefe OCID (recomendado) |
| Solicitar certificado | Aprobar certificado | Empleado != Registrador |
| Crear usuario | Asignar rol admin | Requiere 2 actores diferentes |

### 13.4 Controles de Acceso Especiales

| Control | Descripcion | Modulos Aplicables |
|---------|-------------|-------------------|
| **2FA** | Autenticacion de dos factores | Firma electronica, eliminacion masiva |
| **Codigo OTP** | Codigo de acceso a documento | Firma electronica |
| **Aprobacion dual** | Requiere 2 aprobadores | Fallo disciplinario, sancion |
| **Validacion jerarquica** | Solo superior puede aprobar | Auditoria, planes mejora |
| **Auditoria de acceso** | Log de todas las acciones | Todos los modulos |

---

## Anexos

### A. Glosario de Terminos

| Termino | Definicion |
|---------|------------|
| CRUD | Create, Read, Update, Delete |
| RBAC | Role-Based Access Control |
| OCI | Oficina de Control Interno |
| OCID | Oficina de Control Interno Disciplinario |
| SIGL | Sistema Integrado de Gestion Legal |
| CETAP | Centro de Estudios Territoriales de Administracion Publica |
| PTA | Plan de Trabajo Academico |
| OTP | One-Time Password |

### B. Control de Versiones

| Version | Fecha | Autor | Cambios |
|---------|-------|-------|---------|
| 1.0 | Enero 2026 | Equipo Arquitectura | Documento inicial con 8 modulos |

---

**Documento generado automaticamente**
**ESAP - Plataforma ComUNIdad**
**Enero 2026**

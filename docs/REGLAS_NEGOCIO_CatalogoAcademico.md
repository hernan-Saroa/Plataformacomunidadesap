# Reglas de Negocio — Catálogo Académico (Programas y Asignaturas)

**Sistema de Gestión Académica y Profesoral · Módulo Catálogo Académico · ESAP**

| Campo | Valor |
|---|---|
| Documento | Reglas de Negocio — Carga Masiva Catálogo Académico |
| Módulo | Catálogo Académico |
| Versión | 2.0 |
| Población | Programas y Asignaturas de la Oferta Académica |
| Base normativa | Circular Dispositiva 003/2025 |

> Este documento es la **fuente única de reglas de negocio** del Catálogo Académico. Cada regla está expresada como condición implementable. El identificador `[BR-xxx]` permite trazar cada regla a su validación en código.

---

## 1. Propósito y alcance

El Catálogo Académico es la fuente base para la programación académica y la concertación del **Plan de Trabajo Académico (PTA)**. Define los programas, las asignaturas, sus créditos, horas PTA y la oferta específica en las diferentes CETAPs y Direcciones Territoriales.

**Alcance:** Comprende la carga automatizada por medio de un archivo de Excel de 3 entidades principales en una sola operación transaccional: Programas, Asignaturas y Matriz de Oferta (CETAP-Programa).

**Integración:**
*   **Estructura Organizacional:** La oferta académica está intrínsecamente ligada a la estructura organizacional de la ESAP. Cada programa debe indicar en qué Territorial y CETAP se dicta.
*   **Banco de Docentes:** Es fundamental para poder vincular a cada docente registrado en el banco con los programas académicos y asignaturas que impartirá.
*   **Módulo PTA:** El cálculo de horas PTA se deriva directamente de estas reglas, descontando la asignación académica del total de horas disponibles del docente para el período.

---

## 2. Estructura de Entidades

### 2.1 Programa Académico

| Campo | Clasificación | Tipo | Descripción |
|---|---|---|---|
| CODIGO_PROGRAMA | Obligatorio | Texto (UQ) | Formato `PRO-NNN` |
| NOMBRE_PROGRAMA | Obligatorio | Texto | Nombre canónico |
| NOMBRE_CORTO | Obligatorio | Texto | Código operativo |
| TIPO_PROGRAMA | Obligatorio | Lista | pregrado, especializacion, maestria |
| CODIGO_FACULTAD | Obligatorio | Texto (FK) | Código de facultad |
| MODALIDAD_PRINCIPAL | Obligatorio | Lista | presencial, distancia |
| HORAS_BASE_POR_CREDITO | Obligatorio | Entero | 16 (general) o 12 (maestrías) |
| HORAS_PREGRADO_CENTRAL | Opcional | Entero | 64 fijas para AP Día/Noche/Economía |
| ACTIVO | Obligatorio | Booleano | TRUE si vigente |

### 2.2 Asignatura

| Campo | Clasificación | Tipo | Descripción |
|---|---|---|---|
| CODIGO_ASIGNATURA | Obligatorio | Texto (UQ) | Formato `ASIG-NNNNN` |
| NOMBRE_ASIGNATURA | Obligatorio | Texto | Nombre completo |
| CREDITOS | Obligatorio | Entero | Entre 1 y 20 |
| HORAS_CLASE | Obligatorio | Entero | Tabla 1 Circular 003 |
| HORAS_PTA | Calculado | Entero | Reglas de cálculo según Circular 003 |
| MODALIDAD | Obligatorio | Lista | presencial_dia, presencial_noche, virtual, etc. |
| NUCLEO_TEMATICO | Obligatorio | Texto | Área temática derivada |
| CODIGO_PROGRAMA | Obligatorio | Texto (FK) | Relación con Programa |
| TIPO_EXCEPCION | Opcional | Lista | seminario_enfasis, opciones_grado_ap, seminario_opciones_apt |
| REQUIERE_REVISION | Obligatorio | Booleano | TRUE si modalidad es "Por definir" |
| ACTIVA | Obligatorio | Booleano | TRUE si vigente |

### 2.3 Matriz de Oferta (CETAP-Programa)

| Campo | Clasificación | Tipo | Descripción |
|---|---|---|---|
| CODIGO_CETAP | Obligatorio | Texto (FK) | Código de CETAP existente en Estructura Org. |
| CODIGO_PROGRAMA | Obligatorio | Texto (FK) | Código de Programa a ofertar |

---

## 3. Reglas de Validación Transaccional Automática

**[BR-001] Integridad de la Carga.** La importación del catálogo desde el archivo Excel exige la presencia obligatoria de 3 hojas: `PROGRAMAS`, `ASIGNATURAS` y `MATRIZ_OFERTA`.
*   Si falta alguna hoja, se aborta la carga completa antes de iniciar.
*   Todo se procesa en una **única transacción** (All-or-Nothing).

**[BR-002] Validación Post-Carga.** Tras la inserción de datos en la base de datos, se deben validar los conteos:
*   La tabla `oferta_cetap_programa` **NO** puede quedar vacía. Si el conteo es 0 o no coincide con los totales esperados (14 programas, 427 asignaturas, 325 ofertas), se ejecuta un *rollback* completo.

---

## 4. Reglas de Cálculo de Horas PTA

Las horas PTA para cada asignatura se derivan automáticamente aplicando reglas de negocio basadas en la **Circular Dispositiva 003 de 2025**. El cálculo se aplica en orden de prioridad:

**[BR-003] Excepciones Específicas.**
*   Si `TIPO_EXCEPCION` = `seminario_enfasis` -> `HORAS_PTA` = 384
*   Si `TIPO_EXCEPCION` = `opciones_grado_ap` -> `HORAS_PTA` = 20
*   Si `TIPO_EXCEPCION` = `seminario_opciones_apt` -> `HORAS_PTA` = 144

**[BR-004] Pregrado Central.**
*   Si el programa tiene `HORAS_PREGRADO_CENTRAL` definido (ej. AP Día/Noche/Economía), entonces `HORAS_PTA` = `HORAS_PREGRADO_CENTRAL * 3`.

**[BR-005] Maestrías.**
*   Si el programa es Maestría (`HORAS_BASE_POR_CREDITO` = 12), entonces `HORAS_PTA` = `CREDITOS * 12 * 3`.

**[BR-006] Regla General.**
*   En cualquier otro caso, `HORAS_PTA` = `CREDITOS * 16 * 3`.

---

## 5. Reglas de Integración y Relacionamiento Institucional

### 5.1 Integración con Estructura Organizacional

**[BR-007] Existencia de Territorial y CETAP.** Cada `CODIGO_CETAP` declarado en la Matriz de Oferta debe existir previamente en el catálogo de Estructura Organizacional.
*   La carga de la Estructura Organizacional es un **prerrequisito estricto** para la carga del Catálogo Académico.

**[BR-008] Jerarquía de Oferta.** La oferta académica se construye jerárquicamente a partir de la Estructura Organizacional:
1.  **Territorial:** Define el territorio geográfico/administrativo (Ej: Antioquia).
2.  **CETAP:** Sede específica dentro de la territorial (Ej: Medellín).
3.  **Programa:** Programa ofertado en el CETAP (Ej: Administración Pública Diurno).
4.  **Asignatura:** Contenido curricular asignado al programa.

### 5.2 Integración con Banco de Docentes y PTA

**[BR-009] Asignación Docente-Programa-Asignatura.** El proceso de PTA se nutre de la combinación del Banco de Docentes y el Catálogo Académico. 
*   **Procedimiento:** A un Docente del Banco (Ej. Hernán Buitrago) se le asigna la enseñanza de una `Asignatura` particular, de un `Programa` específico, ubicado en una `Territorial/CETAP` autorizada por la Matriz de Oferta.
*   **Impacto de Horas:** Las `HORAS_PTA` calculadas en las Reglas [BR-003 a BR-006] de esa asignatura específica, se sumarán al plan de trabajo del docente y no pueden superar el máximo de horas derivado de su régimen en el Banco de Docentes.

**[BR-010] Modalidad "Por Definir" informativa.** Si una asignatura ingresa con modalidad "Por definir" (`REQUIERE_REVISION` = TRUE), el sistema conserva y muestra el indicador para revisión administrativa, pero no bloquea el guardado, la concertación ni el envío del PTA. Mientras no exista una modalidad exacta, tampoco se presume que la asignatura sea presencial o remota para validar cruces de fechas.

---

## 6. Resumen de Reglas para Implementación

| ID | Regla | Tipo | Acción si falla |
|---|---|---|---|
| BR-001 | Integridad de la Carga (3 hojas obligatorias) | Validación | Abortar importación de Excel |
| BR-002 | Validación Post-Carga (Matriz > 0) | Validación | Rollback completo |
| BR-003 | Cálculo PTA: Excepciones | Derivación | - |
| BR-004 | Cálculo PTA: Pregrado Central | Derivación | - |
| BR-005 | Cálculo PTA: Maestrías | Derivación | - |
| BR-006 | Cálculo PTA: Regla General | Derivación | - |
| BR-007 | Existencia de Territorial y CETAP | Integridad | Rechazar matriz si CETAP no existe |
| BR-008 | Jerarquía Territorial -> CETAP -> Programa | Modelo | - |
| BR-009 | Asignación Docente-Programa-CETAP | Modelo | Actualiza total horas PTA del docente |
| BR-010 | Modalidad "Por Definir" informativa | Flujo PTA | No bloquea el flujo |

---

*Fin del documento de reglas de negocio.*

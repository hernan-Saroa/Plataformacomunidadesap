# Asignación del proceso, visibilidad y aprobación por etapa

**Estado:** análisis y propuesta. No implementado.
**Origen:** matriz de flujo (actividad 3.4), «Formato usuario-roles-permisos Jun 2026» (Hoja1
columna «Visualizar todos los procesos», Hoja2 alcances por rol).

---

## 1. El flujo que falta

Hoy un proceso se crea y queda en el aire: nadie se entera, nadie lo tiene asignado y
cualquiera con acceso al módulo lo ve. El flujo que debería ocurrir es:

```
El radicador crea el proceso
        │
        ├──► AVISO a la Dirección de Contratación          ← no existe
        │
        ▼
   3.4 · Revisión y reparto
        · se revisan los documentos que radicó
        · se asigna a uno o varios abogados               ← no existe
        · se aprueba, o se observa y devuelve             ← no existe
        │
        ├──► AVISO al abogado asignado                    ← no existe
        │
        ▼
   El abogado lleva el proceso desde la 3.5 en adelante
```

De ese flujo, **hoy solo existe la actividad 3.4 como registro**: fecha, nota de
trazabilidad y adjunto opcional. Deja constancia de que la revisión ocurrió, pero no
reparte ni aprueba nada.

### Por qué la 3.4 es el punto de control

La matriz la describe como «revisiones, mesas de trabajo y observaciones al estudio previo»,
y el formato de roles describe el mismo tránsito desde el lado de las personas:

| Rol | Lo que dice el formato |
| --- | --- |
| Enlaces de contratación | «Elabora estudios previos y **pasa a aprobación** del jefe de área» |
| Jefes de Dependencia | «Editor y **aprueba** → **Radicado**» |

Es decir: hasta la 3.4 el proceso es de quien lo radicó; después es de quien lo lleva. Esa
bisagra es la que hoy no está.

---

## 2. Las aprobaciones no son solo la 3.4

Seis de las diez etapas tienen algún acto de aprobación, y cada una con su propia
competencia. Esto ya está implementado y **no debe tocarse**:

| Etapa | Actividad | Acto | Quién |
| --- | --- | --- | --- |
| 3 | 3.1 Estudio previo | aprobar / devolver | Revisor, Director |
| 4 | 4.2 Disponibilidad presupuestal | verificar | Dirección Financiera |
| 7 | 7.4 Acto de adjudicación | adjudicar | **solo** Ordenador del Gasto |
| 8 | 8.1 Suscripción del contrato | firmar | Gestor, Director, Ordenador |
| 8 | 8.4 Garantías | aprobar / rechazar | Revisor, Director |
| 9 | 9.1 Acta de inicio | suscribir | Supervisor, Ordenador, Gestor |
| 9 | 9.4 Cuenta de cobro | avalar / devolver | **solo** Supervisor vigente |
| 10 | 10.2 Liquidación | liquidar | Gestor, Director |

Transversales, fuera del riel de etapas: modificación contractual, decisión sancionatoria y
respaldo presupuestal de una adición.

**Sin acto de aprobación, y la matriz sugiere que deberían tenerlo:**

- **3.4 Revisión y reparto** — es de lo que trata este documento.
- **6.2 Evaluación de ofertas** — «el comité verifica requisitos jurídicos, financieros y
  técnicos». Hoy se registra el resultado; no hay aprobación del informe.
- **3.6 Comité de contratación** — «va o no / observa o no / **aprueba o no**». No tiene
  panel.

---

## 3. Visibilidad: lo que el formato pide y lo que hay

La Hoja1 tiene una columna **«Visualizar todos los procesos»** con **una sola X: Jefe de
Oficina**. Y la Hoja2 describe alcances distintos por rol:

| Rol | Alcance textual |
| --- | --- |
| Dirección Financiera | «Editor **solo en los numerales 1**» |
| Comité Evaluador | «Accede a consultar **las ofertas que estén cargadas**» |
| Supervisores | «vigilancia del contrato **desde que son designados**» |
| Organismos de control | «Consulta» |

### Lo implementado

**Sí está restringido** donde el acto es sobre un objeto concreto:

- El supervisor solo avala pagos de **su** contrato (`exigirSupervisor`).
- El comité solo registra evaluación **si es miembro de ese proceso**
  (`exigirQueSeaDelComite`).
- El informe final exige ser el supervisor vigente.

**No está restringido el listado.** `listarProcesos()` no recibe el usuario y devuelve todos
los procesos a cualquiera con acceso al módulo. Los dos permisos que deberían gobernarlo
—`contratacion.proceso.view-all` y `contratacion.proceso.assign`— están declarados y
sembrados, pero **ninguna línea de código los consulta**.

---

## 4. Propuesta

### 4.1 Asignación con historial

Una tabla propia y no una columna en `procesos`, por tres razones: hay más de un
responsable, el reparto cambia, y hay que poder auditar quién llevaba el proceso en cada
momento.

```
hiring.asignaciones_proceso
  proceso_id, usuario_id, usuario_nombre
  papel            PRINCIPAL | APOYO_JURIDICO | APOYO_FINANCIERO | APOYO_TECNICO
  asignado_por, asignado_at
  vigente_hasta    NULL = asignación vigente
  motivo_relevo
```

El papel se toma del propio formato, que distingue ABOGADOS / FINANCIEROS / APOYO. Cerrar
con `vigente_hasta` en vez de borrar es el mismo criterio que ya usa la supervisión del
contrato: un proceso auditado debe poder decir quién lo llevaba en marzo.

### 4.2 El filtro del listado

`listarProcesos()` pasa a recibir el usuario:

```
si tiene contratacion.proceso.view-all  → todos los procesos
si no                                    → los que creó  ∪  los que tiene asignados
```

Lo que ve cada rol con esa regla:

| Rol | Qué ve |
| --- | --- |
| Radicador | los que radicó |
| Abogado | los que le repartieron |
| Jefe de Oficina / Director | todos (tiene `view-all`) |
| Supervisor | los contratos que vigila |
| Ente de control | todos, solo lectura (por `expediente.auditar`) |

### 4.3 La 3.4 como acto de reparto

La actividad deja de ser solo registro y pasa a tener tres resultados posibles:

- **Aprobar y asignar** → el proceso queda repartido y el abogado lo ve.
- **Observar y devolver** → vuelve al radicador con las observaciones.
- **Reasignar** → después, sin repetir la 3.4, con `proceso.assign`.

La reasignación va aparte a propósito: la gente rota, y obligar a rehacer la revisión para
cambiar de abogado convertiría un trámite administrativo en un retroceso del flujo.

### 4.4 Avisos

Dos momentos, sobre el `notifications-service` que ya usa el cron de vencimientos:

| Cuándo | A quién | Por qué |
| --- | --- | --- |
| Se crea el proceso | Dirección de Contratación | si nadie se entera, nadie lo reparte |
| Se asigna | al asignado | si no se le avisa, no sabe que le toca |

### 4.5 Configurar qué actividad exige aprobación

La infraestructura ya está: `configuracion.service` tiene `crearRegla`, `reemplazarRegla` y
`derogarRegla`, y el DTO valida `tipo` contra `TIPOS_REGLA` con un `config` libre. Falta:

1. `EXIGE_APROBACION` en `TIPOS_REGLA` y en el CHECK de `reglas_actividad`.
2. Un interruptor en el panel de configuración de la actividad.
3. **Que el cierre de actividad consulte la regla** — hoy nadie lee esas reglas al cerrar,
   así que sin esto lo configurado no haría nada.

El punto 3 es el de más alcance y el que de verdad importa.

---

## 5. Preguntas para el área

1. **¿Quién asigna?** ¿El Director de Contratación, o cualquiera con `proceso.assign`?
2. **¿Un radicador ve el proceso después de repartido?** ¿Lo sigue viendo o lo pierde de
   vista?
3. **¿La Dirección Financiera ve todos los procesos** o solo aquellos donde tiene algo que
   hacer (CDP, RP, pagos)?
4. **¿El ente de control ve todos** o solo los que se le habiliten?
5. **¿La 6.2 (informe de evaluación) requiere aprobación** antes de publicarse?
6. **¿La 3.6 (comité de contratación) necesita panel propio**, o basta con registrar que
   sesionó?

---

## 6. Alcance

Esto **no cabe en las HU actuales**: no hay ninguna que hable de asignación ni de
visibilidad por usuario. Toca migración, listado, actividad 3.4, notificaciones y front.

Debería ser una historia propia con sus criterios de aceptación. Implementarlo sin eso
dejaría al sistema decidiendo quién ve qué sin que ninguna historia lo justifique, y en una
auditoría eso es exactamente lo que se pregunta.

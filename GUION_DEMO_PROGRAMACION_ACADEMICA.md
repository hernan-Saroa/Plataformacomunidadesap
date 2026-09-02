# Guion de demo — Módulo Programación Académica

**Muestra:** jueves · **Rama:** `feature/programacion-academica` (pendiente de merge a la de Henrry)
**Alcance mostrado:** Fase 1 (catálogo y grupos) y Fase 2 (horario). Fases 3 y 4 **fuera**.

---

## Antes de empezar — verificación de 2 minutos

1. Base con catálogo cargado: **14 programas, 427 asignaturas, 16 semestres**.
2. Migraciones 001–010 del servicio aplicadas.
3. Usuario de la demo con rol **`PROGRAMADOR_PREGRADO`**, autenticado (el servicio exige token).
4. Confirmar que el grupo sembrado existe (red de seguridad):

```sql
SELECT g.numero_grupo, a.nombre, count(f.*) AS sesiones
FROM "academic-schedule".grupo g
JOIN academic_work_plan.asignatura a ON a.id = g.id_asignatura
LEFT JOIN "academic-schedule".franja_horaria f ON f.id_grupo = g.id_grupo
WHERE g.observaciones = 'DEMO'
GROUP BY g.numero_grupo, a.nombre;
-- Esperado: 1 | Derecho Constitucional (AP_día) | 2
```

> Si algo falla en vivo, **abra ese grupo** en vez de improvisar: ya tiene horario cargado.

---

## Secuencia

### 1 · Entrar al módulo
**Clic:** menú lateral → **Programación Académica** → sección **Catálogo Académico**.
**Decir:** *"Este módulo reemplaza el control manual en hojas de cálculo. Arranca por el catálogo."*

### 2 · Seleccionar nivel y programa
**Clic:** Nivel → **Pregrado**. Programa → **Administración Pública - Diurno**.
**Decir:** *"El perfil decide qué ve. Esta usuaria es de la Decanatura de Pregrado, así que el selector de nivel solo le ofrece Pregrado — no puede programar posgrado ni por error."*

> Es RN-08 y está verificado por ambos lados: pedir el nivel ajeno responde un 403 explicado, no una pantalla en blanco.

### 3 · Ver el plan de estudios
**Decir:** *"El catálogo llega agrupado por semestre del plan de estudios, tal como lo entregó la Decanatura. Son las 427 asignaturas reales, no datos de ejemplo."*

**Si preguntan por las horas** → mostrar dos asignaturas y contrastar:

| Asignatura | Créditos | Horas clase |
|---|---|---|
| Cualquiera de 3 créditos | 3 | **64** |
| Derecho Constitucional | **4** | **64** |

*"Fíjense: distinto número de créditos, las mismas 64 horas. El sistema no multiplica créditos por 16 — respeta la Circular 003, que fija las horas por tipo de programa."*

**El caso fuerte:** buscar **`ASIG-00132` Seminario De Énfasis** — 10 créditos, **384 horas** por la excepción `seminario_enfasis` de la Circular. *"Este es un caso que una fórmula genérica calcularía mal."*

### 4 · Elegir una asignatura
**Clic:** **Derecho Constitucional** (Segundo semestre).
**Decir:** *"Al elegirla se abre la gestión de sus grupos."*

### 5 · Crear dos grupos
**Clic:** cantidad **2** → **Crear grupos**.
**Decir:** *"Una asignatura puede ofertarse en varios grupos según demanda. Cada grupo es independiente: tiene su propio docente, su horario y sus fechas. La numeración es automática."*

### 6 · Poner horario al grupo 1
**Clic:** en la fila del **Grupo 1** → se abre el calendario.
**Clic:** sobre el **lunes**, franja de la mañana → formulario.
**Datos:** Lunes · **11:00 – 13:00** · **Presencial** · Aula 204 → **Agregar sesión**.

**Clic:** sobre el **jueves** → **14:00 – 16:00** · **Mediada por tecnología**.

**Decir:** *"Este es el esquema real de Administración Pública. El tipo de sesión —presencial o mediada por tecnología— se define por sesión, y es distinto de la modalidad de la asignatura, que viene del SNIES."*

### 7 · Demostrar "sin intervalos fijos"
**Clic:** martes → cambiar a **11:05 – 12:35** → Agregar.
**Decir:** *"El horario no está atado a bloques de dos horas. Cualquier hora de inicio y fin, en múltiplos de cinco minutos. Una grilla de bloques fijos no puede hacer esto."*

### 8 · Mostrar la validación de cruce
**Clic:** lunes → **12:00 – 14:00** → Agregar.
**Resultado esperado:** *"La sesión se cruza con otra del mismo grupo el lunes de 11:00 a 13:00."*
**Decir:** *"El sistema no deja que un grupo se dicte dos veces a la vez, y dice exactamente contra qué choca."*

### 9 · Cerrar
**Clic:** volver al Grupo 2 → mostrar que **está vacío**.
**Decir:** *"Cada grupo es una instancia independiente: lo que hicimos en el grupo 1 no tocó el grupo 2."*

---

## ⛔ Qué NO tocar, y por qué

| No abrir | Razón |
|---|---|
| **Disponibilidad Docente** | Datos fijos. La asignación de docente es **Fase 3** (EFDS-1372/1373) |
| **Disponibilidad de Aulas** | Datos fijos. El bloqueo de aulas es **Fase 3** |
| **Validación de Cruces** | Datos fijos. El bloqueo transversal (RN-07) es **EFDS-1374** |
| **Programación General** | Muestra las 4 franjas de ejemplo del enabler, no datos reales |
| Asignaturas con **modalidad "Por definir"** | Son **249 de 427 (58 %)**. El dato llegó así del Excel de la Decanatura; en pantalla parece que el módulo está incompleto |
| Programas **de posgrado** | El usuario de la demo no tiene permiso: saldría un 403 correcto pero interrumpe el hilo |

> **Regla simple:** quédese en **Catálogo Académico**. Las otras tres secciones del menú son del enabler y aún no tienen datos reales.

---

## Preguntas que van a hacer

**"¿Y dónde asigno el docente?"** — *La más probable.*

> *"Todavía no. Esta entrega cubre las dos primeras fases: qué se oferta y cuándo se dicta. La asignación de docente es la fase siguiente, y es la más delicada, porque ahí entra el control automático de horas contra los topes del Estatuto: las 304 horas del catedrático, las 800 del de carrera. Preferimos dejar primero la estructura firme —el grupo y su horario— porque es sobre eso que se cuelga la carga. La estructura ya está: cada grupo tiene su ficha lista para recibir docente."*

**"¿Estos son datos reales?"**
> *"Sí. Los 14 programas y las 427 asignaturas del archivo de carga que ustedes entregaron. Las horas y las excepciones de la Circular 003 se cargaron tal cual, sin recalcular."*

**"¿Y si dos grupos chocan en el mismo salón o con el mismo docente?"**
> *"Dentro de un grupo ya está bloqueado, lo acaban de ver. El cruce entre grupos distintos y el bloqueo de aulas son de la fase 3: el modelo de datos ya está preparado para eso —las sesiones se pueden consultar por docente, día y rango horario— pero la validación aún no está activa."*

**"¿Por qué unas asignaturas dicen 'sin definir' en modalidad?"** *(si se topan con una)*
> *"Ese campo llegó vacío en el archivo de carga para 249 asignaturas. Lo cargamos tal como venía, sin inventar un valor. Se completa desde el módulo de Programas Académicos cuando la Decanatura lo defina."*

**"¿Cuándo está lo que falta?"**
> *No comprometer fechas.* *"Las fases 3 y 4 están planificadas y ya tienen sus historias creadas. El cronograma lo confirma la coordinación."*

---

## Si algo falla en vivo

| Síntoma | Qué hacer |
|---|---|
| El catálogo sale vacío o "Sin niveles habilitados" | El usuario no tiene el rol. Cambiar a uno con `PROGRAMADOR_PREGRADO` o `SUBDIRECTOR_ACADEMICO` |
| No cargan los programas | Verificar que el microservicio responde: `GET /programacion-academica/health` |
| Falla crear el grupo o la sesión | **Abrir el grupo sembrado** (Derecho Constitucional, marcado `DEMO`) y seguir desde el paso 6 mostrando su horario ya cargado |
| Aparece un 403 inesperado | Es la segregación por nivel funcionando. Decirlo como característica y volver a Pregrado |

---

## Nota para el equipo (no leer en la demo)

Lo que se muestra está **verificado end-to-end contra base real**, no solo con pruebas unitarias. Dos defectos aparecieron justamente en ese ensayo y se corrigieron:

1. El servicio leía la identidad de `req.user`, pero el gateway la reenvía por cabeceras → el catálogo daba **403 a todos** detrás del gateway.
2. Los permisos existían pero **ningún rol los tenía** → pantalla de "sin niveles habilitados".

Ninguno de los dos era visible en las 34 pruebas unitarias.

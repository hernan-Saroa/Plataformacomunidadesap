# REQ-RUND-F002 — Cabezote del perfil docente

Fecha: 7 de septiembre de 2026. Trazabilidad: REQ-RUND-F002, bloque Perfil
Docente, documento fuente TD-FO-019 ERS RUND. Depende de REQ-RUND-F003/NF001
(RBAC de datos sensibles), ya entregado.

## Objetivo y alcance

El cabezote es el encabezado del perfil RUND: muestra de un vistazo los datos
esenciales de vinculación del docente. Es informativo y de solo lectura para
todos los roles, sin excepción. No sustituye ni duplica el detalle del perfil,
la validación documental ni la edición: esas vistas siguen igual.

Se entrega en las dos vistas donde hoy se abre un perfil:

| Vista | Archivo | Fuente de datos |
|---|---|---|
| Detalle del listado RUND (GGP, administradores, consultores) | `apps/mfe-pta/src/components/pta/banco-docentes/BancoDocenteDetalleInline.tsx` | `GET /banco-docentes/:id/cabezote?periodoCarga=...`, protegido por RBAC |
| Autogestión del docente (Canal 3) | `apps/mfe-pta/src/components/pta/banco-docentes/AutogestionDocenteRUND.tsx` | `GET /banco-docentes/autogestion/me/{token}` |

Los siete campos ya existen en `academic_work_plan."Docente"` y en
`auth.personas`. La revisión posterior de la carga agregó conservación de
información original y territorial reportada mediante la migración 429,
descrita en [Revisión de columnas de carga](REVISION-CARGA-MASIVA-COLUMNAS.md).

## Campos del cabezote

| Campo | Origen | Nota |
|---|---|---|
| Nombre completo | `auth.personas.nom_largo`, o la composición de nombres y apellidos | Nunca es un dato sensible |
| Tipo de vinculación | `Docente."vinculacionDisplay"` / `"tipoVinculacion"` | Se prefiere la etiqueta legible sobre el código |
| Categoría | `Docente.escalafon` (alias `categoria` en el listado) | |
| Territorial | Territorial reportada en RUND; en su ausencia, nombre de la seccional desde `Docente."territorialId"` | Los registros históricos sin texto ni correspondencia permanecen pendientes; no se confunde el identificador con el nombre |
| Estado de vinculación | `Docente.estado` | Se clasifica igual que `estado_efectivo` del listado |
| Puntaje salarial | `Docente."puntajeSalarial"` | Dato sensible, ver RBAC |
| Última evaluación | `Docente."ultimaEvaluacion"` | Ver origen del dato |

El cabezote **no** muestra la cédula. La HU no la pide y omitirla reduce la
superficie de datos sensibles del encabezado.

### Estado de vinculación

`INACTIVO`, `RETIRADO`, `RETIRADO_DOCENTE`, `TERMINADO` y `DESVINCULADO` se
presentan como **Inactivo**; cualquier otro estado registrado se presenta como
**Activo**. Es la misma clasificación que ya aplica el SQL del listado, de modo
que la insignia del cabezote nunca contradice la columna ESTADO de la tabla.
Sin estado registrado se usa el indicador de usuario activo. El valor original
se conserva en `estado_vinculacion_detalle` para trazabilidad.

### Origen del campo "última evaluación" (EFDS-1898)

No existe todavía un módulo de evaluación docente. El dato vive en
`academic_work_plan."Docente"."ultimaEvaluacion"` como texto libre y llega por
el registro RUND. `canal_origen` identifica el canal de alta del perfil; no
constituye trazabilidad de la última modificación de la evaluación. Las
etiquetas de origen siguientes son una referencia provisional al canal del
perfil, pendiente de validar con el futuro módulo de evaluación:

| Canal (`Docente.canal_origen`) | Origen reportado | Etiqueta en la vista |
|---|---|---|
| `MASIVO` | `CARGA_MASIVA_RUND` | Origen: carga masiva RUND |
| `MODAL` | `REGISTRO_MANUAL_RUND` | Origen: registro manual RUND |
| `API` | `INTEROPERABILIDAD` | Origen: interoperabilidad |
| `AUTOGESTION` | `AUTOGESTION_DOCENTE` | Origen: autogestión del docente |
| Desconocido o ausente | `REGISTRO_RUND` | Origen: registro RUND |
| Sin valor | `SIN_REGISTRO` | Pendiente del módulo de evaluación docente |

Decisiones tomadas:

- El cabezote **no calcula ni infiere** una evaluación. Solo muestra lo que el
  RUND tiene registrado. No garantiza que sea la evaluación cronológicamente
  más reciente: hoy es texto libre y no existe una relación con evaluaciones.
- Sin valor no se afirma procedencia: el origen es `SIN_REGISTRO` y la vista
  declara que el dato queda pendiente del futuro módulo de evaluación docente.
  Así el usuario distingue "no evaluado aún" de "el sistema no lo trajo".
- La autogestión ya mostraba el campo como solo lectura y **no lo escribe**;
  eso no cambia.
- Cuando exista el módulo de evaluación docente, el único punto de integración
  que debe cambiar es `resolverUltimaEvaluacion` en
  `backend/academic-work-plan-service/src/pta/banco-docentes/rund-perfil-cabezote.ts`.
  La vista y el resto del cabezote no requieren cambios.

## Modo solo lectura

El cabezote no renderiza `input`, `textarea`, `select`, `button`, enlaces ni
elementos editables. La restricción no depende del rol: es una propiedad del
componente, verificada por prueba. La edición del perfil sigue viviendo en el
botón "Editar" de la fila del listado y en el modal de edición, con sus
permisos actuales (`banco-docentes.rund.manage`).

Se marca con una insignia "Solo lectura" para que el docente entienda por qué
no puede modificar ese bloque.

## RBAC y enmascaramiento del puntaje salarial (EFDS-1900)

Se reutiliza sin cambios el catálogo central de REQ-RUND-F003/NF001
(`banco-docentes-sensitive-data.ts`) y su matriz de visibilidad: solo
`GESTION_PROFESORAL` y `SUPER_ADMIN` ven el puntaje completo. Los permisos de
ruta (`banco-docentes.rund.view`, `manage`, etc.) autorizan la operación, no
la visibilidad del dato.

| Rol de sesión | Puntaje salarial en el cabezote |
|---|---|
| `GESTION_PROFESORAL`, `SUPER_ADMIN` | Valor formateado en notación colombiana |
| `ADMIN`, administrador territorial, consultores | "Información restringida" |
| `DOCENTE`, incluso en su propio perfil y en autogestión | "Información restringida" |

Reglas de implementación:

- El servidor anula el valor antes de responder. La vista no puede mostrar un
  puntaje que no recibió.
- El cabezote **no deriva ningún texto a partir del puntaje**. Si lo hiciera,
  el enmascaramiento del servidor no alcanzaría a esa cadena. Toda etiqueta se
  construye en la vista a partir de `proteccion_datos.acceso_completo`.
- La vista solo muestra el puntaje con `acceso_completo === true`. Si faltan
  los metadatos de autorización o no son válidos, muestra "Información
  restringida". Un perfil autorizado sin puntaje muestra "No registrado".
- Un rol restringido recibe además una nota explícita bajo el cabezote.

El acceso queda auditado en `academic_work_plan."RundAccesoDatosLog"` con el
endpoint `CABEZOTE_PERFIL_RUND`, igual que el resto de lecturas sensibles.

## API

| Método y ruta | Uso |
|---|---|
| `GET /banco-docentes/{cedula}/cabezote?periodoCarga={periodo}` | Cabezote consolidado del perfil |

Acepta también el UUID técnico, igual que el resto del controlador. Requiere
sesión y uno de los permisos `banco-docentes.rund.view` o `manage`. Un docente
solo obtiene su propio cabezote: la propiedad se valida comparando la persona
del perfil con la del usuario autenticado. Los roles de gestión no pasan por
esa validación.

Respuesta (`data`), con `puntaje_salarial` ya enmascarado cuando corresponde:

```json
{
  "docente_id": "…", "persona_id": "…",
  "nombre_completo": "MARIA LOPEZ RUIZ",
  "tipo_vinculacion": "Planta",
  "categoria": "Asociado",
  "territorial": "Antioquia",
  "estado_vinculacion": "ACTIVO",
  "estado_vinculacion_detalle": "ACTIVO",
  "puntaje_salarial": null,
  "ultima_evaluacion": "Sobresaliente 2025-2",
  "ultima_evaluacion_origen": "CARGA_MASIVA_RUND",
  "id_rund": "RUND-001", "periodo_carga": "2026-1",
  "solo_lectura": true,
  "campos": ["NOMBRE_COMPLETO", "TIPO_VINCULACION", "CATEGORIA_ESCALAFON",
             "TERRITORIAL", "ESTADO_VINCULACION", "PUNTAJE_SALARIAL",
             "ULTIMA_EVALUACION"],
  "proteccion_datos": { "acceso_completo": false,
                        "campos_sensibles": ["PUNTAJE_SALARIAL"],
                        "campos_enmascarados": ["PUNTAJE_SALARIAL"] }
}
```

Las dos vistas actuales pintan el cabezote con el perfil que ya tienen en
memoria, sin llamada adicional: ese perfil viene del mismo backend y ya está
protegido. El endpoint queda disponible como contrato estable para consumidores
externos y para vistas que no tengan el perfil cargado.

## Diseño de la vista

- Franja de identidad en azul institucional (`#003DA5` a `#2563EB`) con
  iniciales, nombre, registro y periodo, la insignia de estado y la de solo
  lectura.
- Rejilla de seis campos, cada uno con ícono, etiqueta y valor. El puntaje
  restringido usa tratamiento ámbar y candado.
- Los campos sin dato se atenúan con "No registrado" en lugar de dejar el
  espacio vacío.
- Estilos en línea. Los `index.css` de los micro-frontends son snapshots
  precompilados de Tailwind: una clase nueva no existiría en tiempo de
  ejecución.
- Responsivo sin media queries ni breakpoints:
  `repeat(auto-fit, minmax(max(200px, (100% - 20px) / 3), 1fr))` limita la
  rejilla a tres columnas, de modo que los seis campos quedan siempre
  balanceados (3+3 en escritorio, 2+2+2 en tableta, apilados en móvil) en lugar
  de un 5+1 con un hueco. Verificado sin desborde horizontal a 1280, 820 y
  390 px.
- Lista de definiciones (`dl`/`dt`/`dd`) con región etiquetada, para que el
  par etiqueta-valor sea legible por lectores de pantalla.

## Pruebas (EFDS-1896)

| Suite | Archivo | Cobertura |
|---|---|---|
| Contrato del cabezote | `rund-perfil-cabezote.spec.ts` | Siete campos, solo lectura, estados, orígenes de evaluación, enmascaramiento, perfil vacío |
| Endpoint | `rund-perfil-cabezote-http.spec.ts` | Visibilidad por rol, auditoría, propiedad del perfil del docente |
| Modelo de vista | `apps/mfe-pta/src/utils/rundPerfilCabezote.test.ts` | Resolución de valores, formato del puntaje, restringido frente a sin dato, alias camelCase |
| Componente | `apps/mfe-pta/src/components/pta/banco-docentes/PerfilDocenteCabezote.test.tsx` | Campos en pantalla, ausencia de controles editables, ausencia de cédula, aviso de restricción, accesibilidad |

Comandos:

```bash
cd backend/academic-work-plan-service && npx jest src/pta/banco-docentes
cd apps/mfe-pta && npx vitest run --config vitest.config.ts
cd apps/shell && npx vitest run src/test/rund-autogestion.test.tsx
```

La revisión añade pruebas de consulta del cabezote por periodo, respuestas
fuera de orden, error frente a ausencia de datos, actualización tras editar,
permisos ausentes, puntaje cero, referencias territoriales sin correspondencia
y acceso HTTP con el guard real. También comprueba los botones originales y
la paginación del listado.

Resultados de la revisión local:

- Backend: 181 pruebas de las 22 suites RUND, más 5 casos nuevos de HTTP
  ejecutados con los 7 existentes de esa suite (186 casos distintos aprobados).
- Frontend PTA: 94 pruebas de las 13 suites, más la prueba de listado,
  periodo y paginación (95 casos distintos aprobados).
- Shell: una prueba de regresión de autogestión aprobada.
- Compilaciones de backend PTA y micro-frontend PTA correctas.
- Chromium con datos ficticios: cabezote sin desbordamiento a 1440, 390 y
  320 px, seis campos bajo el nombre, sin controles editables y sin puntaje
  visible para un perfil restringido. Capturas locales en
  `build/qa-rund-cabezote/`.
- Servicio real contra PostgreSQL en transacción `READ ONLY`: comprobados
  listado y cabezote de los periodos 2025-2 y 2026-2 del caso reportado.

La suite Jest emitió un aviso de cierre de un worker y Testing Library un
aviso de API obsoleta; no hubo pruebas fallidas. La comprobación en Chromium
corresponde al componente aislado, no a una sesión autenticada completa.

## Hallazgos de la revisión

- El listado hacía una consulta inicial sin periodo y dejaba programada una
  búsqueda con ese mismo filtro inicial. Podía reemplazar el listado del
  periodo activo con registros históricos. Se cancela esa búsqueda al cambiar
  los filtros y se descartan las respuestas de consultas anteriores.
- El cabezote consulta el endpoint del periodo seleccionado. No mezcla datos
  de registros históricos para rellenar campos vacíos. Una consulta fallida
  muestra un error y mantiene disponible el panel documental.
- Se retiraron la barra redundante "Editar" / "X" y el código de acordeones
  que ya no se renderizaban. Siguen los controles de la fila y "Editar Datos";
  al guardar desde este último se actualizan listado y cabezote.
- La consulta de solo lectura del registro mostrado por el usuario confirmó
  que 2025-2 carece de categoría, puntaje y evaluación, mientras 2026-2 tiene
  categoría "Asociado", puntaje registrado y evaluación "Excelente 2024-1".
- Las referencias territoriales de esos dos registros (18 y 24) no existen
  en `auth.seccionales`. En la revisión posterior se recuperó la territorial
  informativa de 2026-2 desde el Excel entregado por el usuario, manteniendo
  las asignaciones operativas. Véase el informe de columnas enlazado arriba.

## Pendientes declarados

- El origen definitivo de "última evaluación" queda sujeto al futuro módulo de
  evaluación docente. Hasta entonces el cabezote reporta el canal RUND que
  registró el dato.
- El cabezote de la fila del listado y el encabezado del panel de validación
  muestran ambos el identificador RUND. Unificarlos exige tocar el panel de
  validación y se deja fuera de esta entrega para no alterar esa vista.

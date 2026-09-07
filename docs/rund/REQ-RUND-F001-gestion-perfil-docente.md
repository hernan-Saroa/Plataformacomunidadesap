# REQ-RUND-F001 — Gestión del perfil docente por cédula

## Objetivo

Permitir que Gestión Profesoral (GGP) y los administradores RUND creen,
consulten, editen y desactiven perfiles docentes. El docente autenticado solo
puede consultar su propio perfil. No existe borrado físico del perfil.

## Decisión de identidad y versionamiento

- `auth.personas.num_identificacion` es la llave natural universal del docente.
- La cédula se normaliza sin puntos, es única y no puede modificarse desde el
  CRUD RUND. Un trigger también impide cambiarla directamente en
  `auth.personas` cuando ya existe un perfil docente. Los registros históricos
  que aún no tengan documento pueden regularizarlo una sola vez.
- `auth.personas.id_person` y `academic_work_plan."Docente".id` son UUID
  técnicos. No reemplazan la cédula como identificador funcional.
- Los datos demográficos viven en `auth.personas`.
- Los datos de vinculación, formación y estado RUND viven en `Docente`.
- Puede existir una extensión `Docente` por persona y periodo para conservar el
  histórico de vinculaciones y PTA. Esto no representa personas duplicadas.
- La restricción global de cédula está definida en la migración
  `426_complete_req_rund_f001_profile_crud.sql`.

## Roles y permisos

| Operación | Roles | Permiso alternativo |
|---|---|---|
| Listar/consultar | GGP, administrador RUND | `banco-docentes.rund.view` o `manage` |
| Crear | GGP, administrador RUND | `banco-docentes.rund.manage` |
| Editar | GGP, administrador RUND | `banco-docentes.rund.edit` o `manage` |
| Activar/inactivar | GGP, administrador RUND | `banco-docentes.rund.manage` |
| Importar | GGP, administrador RUND | `banco-docentes.rund.import` o `manage` |
| Perfil propio | Docente | Solo lectura y validación de propiedad |

## API

La base del controlador acepta `/banco-docentes` y
`/pta/banco-docentes` bajo el prefijo configurado del servicio PTA.

| Método y ruta | Uso |
|---|---|
| `GET /banco-docentes?search={cedula}` | Listado y búsqueda |
| `GET /banco-docentes/{cedula}?periodoCarga={periodo}` | Perfil consolidado |
| `POST /banco-docentes` | Crear perfil manual |
| `PUT /banco-docentes/{cedula}` | Editar con soporte y justificación |
| `PUT /banco-docentes/{cedula}/estado` | Activar/inactivar con soporte |
| `POST /banco-docentes/bulk` | Validar o ejecutar carga masiva |
| `GET /banco-docentes/bulk/historial` | Historial de importaciones |
| `GET /banco-docentes/bulk/{id}/soporte` | Descargar archivo fuente |
| `GET /banco-docentes/{cedula}/auditoria` | Trazabilidad del perfil |

Los endpoints también aceptan el UUID técnico para compatibilidad interna.

## Flujo manual

1. El operador busca la cédula.
2. Si existe, el sistema consolida datos demográficos, contacto, vinculación y
   formación. Si se indicó periodo, la coincidencia es exacta.
3. Si no existe, el operador puede crear el perfil. La creación registra actor,
   canal, campos y periodo dentro de la misma transacción.
4. Para editar, primero se carga un soporte de tipo
   `soporte_edicion_perfil`; se exige una justificación.
5. La API verifica que el soporte exista, tenga archivo y pertenezca al mismo
   perfil. También rechaza cambios de cédula, periodo o estado por esta ruta.
6. La actualización y su auditoría se confirman en la misma transacción.
7. Para activar o inactivar se usa la acción específica y un soporte
   `soporte_cambio_estado_perfil`. Nunca se elimina la persona ni el histórico.

## Flujo de carga masiva

1. Se recibe XLSX, XLS o CSV, con máximo 15 MB.
2. `dry_run=true` valida en una transacción que siempre se revierte.
3. Se rechazan cédulas repetidas dentro del mismo archivo y filas inválidas.
4. En la ejecución definitiva se conserva el archivo original en
   `RundCargaMasiva`, incluyendo SHA-256, actor, IP, tamaño y justificación.
5. Una cédula existente actualiza la extensión del periodo; una nueva crea la
   persona y su extensión. La restricción única de `auth.personas` evita carreras
   o duplicados entre cargas concurrentes.
6. Cada fila creada o actualizada genera auditoría con el ID del archivo fuente,
   número de fila y campos modificados. Las filas sin cambios no generan una
   mutación ficticia.
7. El lote finaliza como `COMPLETADA` o `COMPLETADA_CON_ERRORES` y conserva su
   resumen. El contenido del soporte no puede modificarse ni eliminarse.

## Auditoría

`RundAprobacionLog` registra como mínimo docente, acción, actor, canal, fecha,
campos afectados, soporte, motivo y metadatos del cambio. Un trigger de base de
datos impide actualizar o eliminar sus entradas. Los valores sensibles de
puntaje salarial se marcan como protegidos en lugar de copiarse al log.

Para crear, editar y cambiar estado, la escritura del perfil y la entrada de
auditoría comparten transacción. Si la auditoría falla, el cambio se revierte.

## Criterios de prueba

1. Consultar una cédula devuelve datos demográficos, vinculación y formación.
2. Consultar con periodo inexistente responde `404`.
3. Crear dos personas con la misma cédula normalizada es rechazado por la base.
4. La cédula no puede cambiarse durante una edición.
5. Editar sin soporte, con soporte ajeno o rechazado devuelve `400`.
6. Cambiar estado sin soporte o justificación suficiente devuelve `400`.
7. Inactivar cambia únicamente el perfil del periodo y no elimina registros.
8. Una carga con cédulas repetidas bloquea esas filas.
9. Una carga definitiva conserva el archivo y audita cada mutación.
10. Un fallo de auditoría revierte la mutación correspondiente.
11. GGP y administradores pueden mantener perfiles; un docente solo ve el suyo.

## Trazabilidad

- Requisito: `REQ-RUND-F001`.
- Bloque: Perfil Docente.
- Fuente: TD-FO-019 ERS RUND.
- Implementación backend: `banco-docentes.controller.ts` y
  `banco-docentes.service.ts`.
- Implementación web: `BancoDocentesPTA.tsx`, `BancoDocenteEditModal.tsx`,
  `BancoDocenteEstadoModal.tsx` y `BancoDocentesBulkUpload.tsx`.

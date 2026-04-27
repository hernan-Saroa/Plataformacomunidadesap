# Roles Granulares - Gestión Legal

## Roles creados

| Código | Nombre | Categoría | Submódulos visibles |
|--------|--------|-----------|---------------------|
| `JEFE_GESTION_LEGAL` | Jefe Gestión Legal | directivo | Todos (incluye Reportes y Configuraciones) |
| `MONITOREO_GESTION_LEGAL` | Monitoreo Gestión Legal | administrativo | Todos excepto Configuraciones |
| `SECRETARIADO_GESTION_LEGAL` | Secretariado Gestión Legal | administrativo | Todos excepto Reportes y Configuraciones |
| `RESUELVE_GESTION_LEGAL` | Resuelve Gestión Legal | administrativo | Todos excepto Reportes y Configuraciones |

Migración: `db/migrations/210_create_roles_gestion_legal.sql`

---

## Permisos nuevos añadidos

Archivo: `packages/shared-types/src/permissions.ts`

| Permiso (enum) | Código | Descripción |
|----------------|--------|-------------|
| `GESTION_LEGAL_DEFENSA_JUDICIAL_ABOGADO_REASIGNAR` | `gestion-legal.defensa-judicial.abogado.reasignar` | Reasignar abogado sustanciador — Jefe y Secretariado |
| `GESTION_LEGAL_DEFENSA_JUDICIAL_AUDIENCIA_EDIT` | `gestion-legal.defensa-judicial.expediente.actuacion.audiencia.edit` | Editar/reasignar audiencias — solo Jefe |
| `GESTION_LEGAL_DEFENSA_JUDICIAL_AUDIENCIA_DELETE` | `gestion-legal.defensa-judicial.expediente.actuacion.audiencia.delete` | Eliminar audiencias — solo Jefe |
| `GESTION_LEGAL_DEFENSA_JUDICIAL_TAREA_EDIT` | `gestion-legal.defensa-judicial.expediente.tarea.edit` | Editar tareas ya creadas — Jefe y Secretariado |
| `GESTION_LEGAL_DEFENSA_JUDICIAL_TAREA_COMPLETE` | `gestion-legal.defensa-judicial.expediente.tarea.complete` | Marcar tarea como completada — Jefe y Resuelve |
| `GESTION_LEGAL_REPORTES_MANAGE` | `gestion-legal.reportes.manage` | Ver submódulo Reportes — Jefe y Monitoreo |

---

## Matriz de permisos por rol (Defensa Judicial)

| Acción                         | Jefe | Resuelve | Secretariado | Monitoreo |
|--------------------------------|:----:|:--------:|:------------:|:---------:|
| Ver expedientes                | ✅   | ✅      | ✅           | ✅        |
| Crear nueva demanda            | ✅   | ✅      | ✅           | ❌        |
| Registrar actuación            | ✅   | ✅      | ❌           | ❌        |
| Programar audiencia            | ✅   | ✅      | ❌           | ❌        |
| Reasignar/editar audiencia     | ✅   | ❌      | ❌           | ❌        |
| Eliminar audiencia             | ✅   | ❌      | ❌           | ❌        |
| Crear tarea                    | ✅   | ✅      | ✅           | ❌        |
| Editar tarea ya creada         | ✅   | ❌      | ✅           | ❌        |
| Eliminar tarea                 | ✅   | ✅      | ❌           | ❌        |
| Agregar nota interna           | ✅   | ✅      | ❌           | ❌        |
| Reasignar abogado sustanciador | ✅   | ❌      | ✅           | ❌        |
| Subir/eliminar documentos      | ✅   | ✅      | ❌           | ❌        |
| Editar datos del proceso       | ✅   | ✅      | ✅           | ❌        |
| Asociar proceso                | ✅   | ✅      | ✅           | ❌        |
| Marcar tarea completada        | ✅   | ✅      | ❌           | ❌        |
| Archivar expediente            | ✅   | ✅      | ✅           | ❌        |
| Restaurar/eliminar archivados  | ✅   | ✅      | ✅           | ❌        |
| Eliminar expediente            | ✅   | ✅      | ❌           | ❌        |

Permiso archivar/restaurar archivados: `GESTION_LEGAL_DEFENSA_JUDICIAL_ARCHIVAR` (separado de `ESTADOS_EDIT` que controla cambio de etapa y kanban)

---

## Matriz de permisos por rol (Asesoría Jurídica)

| Acción                         | Jefe | Resuelve | Secretariado | Monitoreo |
|--------------------------------|:----:|:--------:|:------------:|:---------:|
| Ver expedientes                | ✅   | ✅      | ✅           | ✅        |
| Crear nueva asesoría           | ✅   | ✅      | ✅           | ❌        |
| Editar datos expediente        | ✅   | ✅      | ✅           | ❌        |
| Cambiar etapa                  | ✅   | ✅      | ❌           | ❌        |
| Reasignar abogado              | ✅   | ✅      | ✅           | ❌        |
| Archivar expediente            | ✅   | ✅      | ✅           | ❌        |
| Agregar destinatario           | ✅   | ✅      | ✅           | ❌        |
| Redactar/enviar respuesta      | ✅   | ✅      | ❌           | ❌        |
| Agregar comentario interno     | ✅   | ✅      | ❌           | ❌        |
| Restaurar/eliminar archivados  | ✅   | ✅      | ✅           | ❌        |

Permisos de escritura:
- Escritura general (crear, editar, archivar, reasignar): `GESTION_LEGAL_ASESORIA_JURIDICA_CREATE`
- Redactar/enviar respuesta: `GESTION_LEGAL_ASESORIA_JURIDICA_RESPONDER` (Jefe y Resuelve — Secretariado NO)
- Cambiar etapa: `GESTION_LEGAL_ASESORIA_JURIDICA_ETAPA_EDIT` (Jefe y Resuelve)
- Agregar comentario: `GESTION_LEGAL_ASESORIA_JURIDICA_COMENTARIO_CREATE` (Jefe y Resuelve)

---

## Matriz de permisos por rol (Órganos de Control)

| Acción                           | Jefe | Resuelve | Secretariado | Monitoreo |
|----------------------------------|:----:|:--------:|:------------:|:---------:|
| Ver requerimientos               | ✅   | ✅      | ✅           | ✅        |
| Crear requerimiento              | ✅   | ✅      | ✅           | ❌        |
| Cambiar etapa (lista)            | ✅   | ✅      | ✅           | ❌        |
| Reasignar profesional            | ✅   | ✅      | ✅           | ❌        |
| Archivar/eliminar requerimiento  | ✅   | ✅      | ❌           | ❌        |
| Restaurar/eliminar archivados    | ✅   | ✅      | ✅           | ❌        |
| Elaborar respuesta (campos)      | ✅   | ✅      | ❌           | ❌        |
| Subir documentos en respuesta    | ✅   | ✅      | ✅           | ❌        |
| Eliminar documentos (gestión)    | ✅   | ✅      | ❌           | ❌        |
| Agregar comentario interno       | ✅   | ✅      | ✅           | ❌        |

---

## Matriz de permisos por rol (Procesos Coactivos)

| Acción                              | Jefe | Resuelve | Secretariado | Monitoreo |
|-------------------------------------|:----:|:--------:|:------------:|:---------:|
| Ver procesos                        | ✅   | ✅      | ✅           | ✅        |
| Crear nuevo proceso                 | ✅   | ✅      | ✅           | ❌        |
| Editar datos del proceso            | ✅   | ✅      | ✅           | ❌        |
| Archivar proceso                    | ✅   | ✅      | ✅           | ❌        |
| Restaurar/eliminar archivados       | ✅   | ✅      | ✅           | ❌        |
| Registrar pago                      | ✅   | ✅      | ✅           | ❌        |
| Ver historial de pagos              | ✅   | ✅      | ✅           | ✅        |
| Eliminar pago del historial         | ✅   | ✅      | ✅           | ❌        |

Permisos:
- Crear proceso: `GESTION_LEGAL_PROCESOS_COACTIVOS_CREATE` (Jefe, Resuelve y Secretariado)
- Editar proceso + registrar/eliminar pagos: `GESTION_LEGAL_PROCESOS_COACTIVOS_EDIT` (Jefe, Resuelve y Secretariado)
- Archivar/restaurar/eliminar: `GESTION_LEGAL_PROCESOS_COACTIVOS_DELETE` (Jefe, Resuelve y Secretariado)
- `canRegistrarPago` en `ModalGestionarPagos` usa `PROCESOS_COACTIVOS_EDIT` → Monitoreo ve solo lectura del historial de pagos

---

## Archivos modificados (continuación)

Permisos:
- Escritura/elaborar respuesta: `GESTION_LEGAL_ORGANOS_CONTROL_ELABORAR`
- Eliminar/archivar/restaurar: `GESTION_LEGAL_ORGANOS_CONTROL_DELETE`
- Reasignar profesional: `GESTION_LEGAL_ORGANOS_CONTROL_ABOGADO_REASIGNAR` (Jefe, Resuelve y Secretariado)
- Eliminar documentos en gestión: guarda con `GESTION_LEGAL_ORGANOS_CONTROL_ELABORAR` (no Secretariado ni Monitoreo)
- Elaborar respuesta — banner "Respuesta Enviada" solo aparece cuando el estado es ENVIADO/CERRADO, no por falta de permiso

---

## Archivos modificados

### Frontend — Sesión inicial (roles base)

| Archivo | Cambio |
|---------|--------|
| `apps/mfe-gestion-legal/src/components/modulos/ModalExpediente.tsx` | Guards en: Reasignar Profesional, Registrar actuación, Programar Audiencia, Reasignar/Eliminar Audiencia, Editar Tarea, Archivar, Eliminar, Agregar Nota |
| `apps/mfe-gestion-legal/src/components/modulos/ModuloDefensaJudicialV3.tsx` | Guard en botón eliminar demanda de tarjeta Kanban |
| `apps/mfe-gestion-legal/src/components/core/TabTareasExpediente.tsx` | `onCrearTarea`, `onEditarTarea` y `onMarcarCompletada` son opcionales; sus botones se ocultan si no hay permiso |
| `apps/mfe-gestion-legal/src/components/core/TabNotasExpediente.tsx` | `onAgregarNota` ahora es opcional; botón Agregar Nota se oculta si no hay permiso |
| `apps/mfe-gestion-legal/src/components/core/GestionLegalFull.tsx` | Submódulo "Reportes" usa `GESTION_LEGAL_REPORTES_MANAGE` (separado de Configuraciones) |
| `apps/shell/src/App.tsx` | Routing actualizado: los 4 nuevos roles son reconocidos y redirigen a `gestion-legal` con su `rolStr` correspondiente |

### Shared / Infraestructura

| Archivo | Cambio |
|---------|--------|
| `packages/shared-types/src/permissions.ts` | 5 permisos nuevos añadidos |
| `db/migrations/210_create_roles_gestion_legal.sql` | Crea los 4 roles, inserta los permisos nuevos en BD y asigna permisos a cada rol |

---

### Frontend — Sesión 2 (restricciones Monitoreo granulares)

#### Patrón general usado

- **Prop opcional + guard de existencia**: el prop de acción se hace opcional (`prop?`), el botón se renderiza solo si el prop existe (`{prop && <Button>}`), y se pasa `undefined` cuando no hay permiso.
- **Guard inline**: `{authService.hasPermission(Permissions.X) && <Button>}` para botones dentro de modales que no reciben la acción como prop.
- **`isReadOnly` inicializado desde permiso**: `useState(!authService.hasPermission(Permission))` — aprovecha el `disabled` ya cableado en todos los campos del modal.
- **Badge estático vs. selector**: cuando el prop de cambio de etapa es `undefined`, se renderiza un `<span>` con el mismo estilo visual del selector pero sin interacción.

#### Archivos modificados

| Archivo | Cambios aplicados |
|---------|-------------------|
| `apps/mfe-gestion-legal/src/components/design-system/VistaArchivados.tsx` | `onRestaurar?` y `onEliminarPermanente?` hechos opcionales; guards de botones cambiados de variables internas (que siempre eran `true`) a existencia del prop |
| `apps/mfe-gestion-legal/src/components/core/TabTareasExpediente.tsx` | Botón "Marcar Completada" envuelto en `{onMarcarCompletada && (...)}` — el handler interno lo eludía antes |
| `apps/mfe-gestion-legal/src/components/core/TabDocumentosExpediente.tsx` | Botón "Plantillas" y su banner solo visibles si `usaPlantillas && onUploadDocument`; botón "Subir" solo si `!usaPlantillas && onUploadDocument` |
| `apps/mfe-gestion-legal/src/components/modulos/ModuloDefensaJudicialV3.tsx` | `VistaArchivados.onRestaurar` y `onEliminarPermanente` condicionales con `GESTION_LEGAL_DEFENSA_JUDICIAL_ESTADOS_EDIT`; Kanban: `canDrag: () => authService.hasPermission(...)` en `useDrag`; `onMoverExpediente` condicional en vista lista |
| `apps/mfe-gestion-legal/src/components/modulos/VistaListaDefensaJudicial.tsx` | `onMoverExpediente` opcional en `FilaExpedienteTabla` y `FilaExpedienteMobile`; columna etapa: selector → badge estático cuando prop es `undefined` |
| `apps/mfe-gestion-legal/src/components/modulos/ModalExpedienteConsulta.tsx` | Ocultar: botón "Editar" cabecera, ambos botones "Cambiar etapa", botón reasignar abogado, botón "Archivar", input+botón "Agregar destinatario", botones "Enviar Respuesta Final"/"Guardar Borrador", card entera de comentarios — todos con `GESTION_LEGAL_ASESORIA_JURIDICA_CREATE`; textarea respuesta `disabled` cuando sin permiso |
| `apps/mfe-gestion-legal/src/components/modulos/ModuloAsesoriaJuridicaV3.tsx` | `VistaArchivados.onRestaurar` y `onEliminarPermanente` condicionales con `GESTION_LEGAL_ASESORIA_JURIDICA_CREATE` |
| `apps/mfe-gestion-legal/src/components/modulos/OrganosControl.tsx` | `onCambiarEtapa` opcional en `VistaListaOrganosControl`; columna etapa: selector → badge estático; prop condicional con `GESTION_LEGAL_ORGANOS_CONTROL_ELABORAR`; `VistaArchivados` condicional con `GESTION_LEGAL_ORGANOS_CONTROL_DELETE` |
| `apps/mfe-gestion-legal/src/components/modulos/ModalVerRequerimientoOrgano.tsx` | Importa `authService` y `Permissions`; botones "Archivar" y "Eliminar" ocultos con `GESTION_LEGAL_ORGANOS_CONTROL_DELETE` |
| `apps/mfe-gestion-legal/src/components/modulos/ModalRespuestaOrgano.tsx` | `isReadOnly` inicializado como `useState(!authService.hasPermission(GESTION_LEGAL_ORGANOS_CONTROL_ELABORAR))` — hace todos los campos, checkboxes y botones del modal de solo lectura para Monitoreo |
| `apps/mfe-gestion-legal/src/components/modulos/ModalGestionDocumentos.tsx` | Importa `authService`; botón eliminar documento oculto con `GESTION_LEGAL_ORGANOS_CONTROL_DELETE` |
| `apps/mfe-gestion-legal/src/components/modulos/ModalComentariosOrgano.tsx` | Importa `Permissions`; toda la sección "AGREGAR NUEVO COMENTARIO" envuelta en `{authService.hasPermission(GESTION_LEGAL_ORGANOS_CONTROL_ELABORAR) && <div>}` |
| `apps/mfe-gestion-legal/src/components/modulos/ProcesosCoactivosV3.tsx` | Botón "Nuevo Proceso" oculto con `PROCESOS_COACTIVOS_CREATE`; `onEditar`/`onArchivar`/`onEliminar` opcionales en `TarjetaProceso`, pasados con `EDIT`/`DELETE`; `VistaArchivados` condicional con `DELETE`; `ModalGestionarPagos` recibe `canRegistrarPago` con `EDIT` |
| `apps/mfe-gestion-legal/src/components/procesos-coactivos/ModalGestionarPagos.tsx` | Nueva prop `canRegistrarPago?`; oculta formulario de registro, botón "Registrar Pago", botón eliminar pago del historial; muestra empty state "Aún no hay pagos registrados" cuando no hay pagos y sin permiso |
| `apps/mfe-gestion-legal/src/components/modulos/Riesgos.tsx` | `VistaArchivados.onRestaurar` y `onEliminarPermanente` condicionales con `GESTION_LEGAL_RIESGOS_DELETE` |

---

## Cómo funciona el acceso al módulo

Los nuevos roles solo tienen permisos con prefijo `gestion-legal.*`, por lo que el JWT generado al login solo incluirá `modules: ['gestion-legal']`. El shell los redirige automáticamente a ese módulo y no tienen acceso a ningún otro.

Los submódulos visibles se controlan con la propiedad `visible: authService.hasPermission(Permissions.XYZ_MANAGE)` en el array `menuItems` de `GestionLegalFull.tsx`. Cada rol solo ve los submódulos para los que tiene el permiso `manage` correspondiente.

### Regla de oro para Monitoreo

> **Monitoreo nunca puede crear, editar, cambiar estado, subir, restaurar ni eliminar nada.**
> Solo tiene acceso de lectura a todos los submódulos visibles.
> Cualquier botón, input o selector que implique escritura debe ocultarse o deshabilitarse según el patrón descrito arriba.

# Actualización de la auditoría — 12 de noviembre de 2026

Los comentarios de Javier fueron recibidos y leídos; los contratos de Claude se leyeron desde origin. La implementación y sus comprobaciones están en [REPORTE-BUGS-QA-CODEX.md](REPORTE-BUGS-QA-CODEX.md). El siguiente registro corresponde a la preparación inicial, anterior a recibirlos; sus bloqueos ya no están vigentes. Sigue pendiente la integración compartida y la verificación remota de QA indicada en el reporte.

---

# Preparación de bugs QA — 12 de noviembre de 2026

Carpeta: `Plataforma-pa-codex4`. Rama: `feature/pa/bugs-qa-codex`. Base publicada: `78a1644cd`.

Esta es una auditoría de alcance, no una entrega de correcciones. Falta leer los comentarios de Javier en las HU, requisito explícito de la instrucción. La sesión no tiene Jira conectado; se solicitó acceso o una exportación a Tomás. También faltan los contratos nuevos de Claude en origin para las cuatro subtareas dependientes. No se consultó ni modificó la base, ni se iniciaron servicios reales.

| Subtarea | Hallazgo y archivos | Dependencia antes de implementar |
| --- | --- | --- |
| EFDS-2431 | Cuatro `input type="time"`: dos en `CalendarioHorario.tsx` y dos en `HorarioGruposVirtuales.tsx`. No se encontró formateo `hour12`/`toLocaleTimeString` en el MFE. Revisar además las cadenas recibidas en los calendarios, portal, asignación, informes y exportaciones. | Comentario de Javier. Diseñar campo de texto 24 h con teclado, validación y valores HH:mm. |
| EFDS-2428 | `SelectorCatalogo.tsx` monta el panel de grupos sin portal al body. Otro detalle de grupo se monta en `ProgramacionAcademicaModule.tsx`, compartido. `CalendarioHorario.tsx` tiene un modal de sesión independiente. El cierre debe considerar el borrador del ciclo, la oferta y la sesión. | Comentario de Javier. El parche del módulo compartido se describe para Claude, no se commitea. |
| EFDS-2433 | `CalendarioHorario` en modo consulta se reutiliza en `GruposAsignados` y `DisponibilidadDocente`; no tiene control para contraer. La bandeja no monta un calendario directamente: verificar el punto de entrada de cada perfil. | Comentario de Javier: identificar el recorrido exacto de Docente, Revisor y Aprobador. |
| EFDS-2427 | `mfe-programas-academicos/GestionPeriodos.tsx` contiene creación y otras acciones. `GestionOfertas.tsx` de PA ya tiene creación regular y personalizada; `periodosApi.ts` admite ambos cuerpos. | Comentario de Javier. Respetar la navegación configurada por el shell; documentar el cambio para Julián. |
| EFDS-2430 | `CalendarioHorario.tsx` crea una sola sesión por petición. | Contrato de creación/validación multidía, respuesta exacta, conflictos por día y atomicidad. |
| EFDS-2432 | Hay eliminación directa y falta la edición pedida. | Contrato de edición/eliminación, reglas por estado, errores y refresco de horas. |
| EFDS-2434 | `AsignacionAreaModal.tsx` actualmente usa una selección de candidato para un subconjunto de franjas. | Respuesta completa de candidatos bloqueados, motivos, reparto por franja y forma/atomicidad del envío. |
| EFDS-2429 | `GestionGrupos.tsx` consume ofertas y su diagnóstico; el selector muestra territorial/CETAP. | Diagnóstico de Claude sobre la oferta Sede Central y campos concretos para explicarlo sin inferir causas. |

## Matriz prevista para comprobar las correcciones

- MFE construido con la configuración del proyecto y servido con `preview`; no basta desarrollo.
- Navegadores `es-CO` y `en-US`, zonas `America/Bogota` y `UTC`.
- Vistas de 1920×1080, 1366×768, 1280×720 y móvil; comprobar anchura del documento, encabezado/cierre visibles y desplazamiento interno del calendario.
- Datos simulados con la forma publicada de las respuestas. Cubrir carga, vacío y error además del caso satisfactorio.
- Paneles: foco contenido/restaurado, Escape, X, Cerrar, confirmación de borradores y cancelación del descarte.
- Horas: escritura de teclado, 00:00/12:00/23:55, valores incompletos/inválidos y solicitud HH:mm idéntica en ambos idiomas y zonas.
- Periodos: Programas en consulta y enlace de navegación; creación regular/personalizada en PA y rechazo de permiso conforme al servidor.
- Sesiones/asignación: probar los contratos cuando se publiquen, sin inventar campos ni errores.

Estado de todas las subtareas: **no verificado en condiciones de QA**. La preparación no demuestra funcionamiento ni despliegue en el ambiente remoto. Se registrarán por subtarea resultados, capturas, esfuerzo y pasos de reconstrucción/despliegue al implementar y probar.

# Estados visuales de componentes PTA

La aplicabilidad se determina antes del estado global del plan. Un PTA aprobado
puede tener componentes que no le aplican.

| Caso | Presentación |
| --- | --- |
| Componente sin carga asignada | No aplica, tono gris; no cuenta como aprobado ni pendiente |
| Componente con carga, PTA en borrador | No iniciado |
| Componente con carga y trámite iniciado | Estado de revisión, devolución o aprobación correspondiente |
| PTA aprobado, en firme o finalizado | Aprobado únicamente en componentes aplicables |
| Última actividad retirada mediante solicitud de edición pendiente | Conserva la reaprobación humana requerida, incluso con cero horas |

El backend publica los cuatro grupos en `componentes_estado`, con sus horas y
contadores de componentes aplicables. El endpoint de aprobaciones granulares
añade `aplica`, `horas` y `estado_visual`: no cambia el `estado` persistido que
utiliza el flujo. Las aprobaciones automáticas de componentes vacíos no son
firmas humanas y no deben imprimirse como aprobaciones de “Sistema”.

`ptaComponentStatus.ts` centraliza la interpretación de tarjetas del portal,
detalle administrativo y reportes. El reporte individual utiliza los ámbitos
vigentes, incluidos Docencia Territorial y Complementarias de Gestión Profesoral.
Los permisos y las acciones de aprobar/devolver siguen usando la decisión interna.
No se requiere migración ni modificación de los PTA almacenados.

## Documentos y soportes

El selector deshabilita componentes sin carga con “No aplica”. Si hay carga pero
el cupo está reservado por soportes aprobados o pendientes, indica “Sin horas
disponibles”. Extensión solo ofrece secciones con carga real, sin utilizar las
horas de otra sección.

El backend valida la carga desde las actividades guardadas al registrar un
soporte y antes de aprobarlo; no confía en los totales enviados por el cliente.
Los adjuntos adicionales de 0 h siguen permitidos en componentes aplicables.
No se borran ni se reclasifican documentos históricos: siguen consultables y
pueden rechazarse. Los soportes antiguos de Extensión sin sección conservan su
revisión por carga global cuando Extensión sí aplica; los nuevos requieren sección.

## Verificación local

- Backend: `npm test` y `npm run build` desde `backend/academic-work-plan-service`.
- Frontend: `node node_modules/vitest/vitest.mjs run --config apps/mfe-pta/vitest.config.ts` desde la raíz.
- Compilación frontend: `npm run build -w @esap-mfe/pta`.

Caso de regresión: PTA aprobado con Docencia 384 h, Investigación 200 h,
Extensión 0 h y Complementarias 170 h. Debe mostrar tres componentes aprobados
y Extensión como No aplica en tarjetas y reportes. Los tests de renderizado
verifican también el tono gris de la tarjeta y las cuatro subsecciones vacías.

Para comprobarlo en el entorno integrado se deben actualizar tanto el servicio
PTA como el microfrontend, recargar el listado y abrir el portal, el detalle y
el reporte individual. Las pruebas locales no sustituyen esa comprobación con
una sesión real y la exportación PDF en navegador.

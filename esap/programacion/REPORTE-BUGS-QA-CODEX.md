# Bugs de QA — entrega de pantallas de Codex, 12 de noviembre de 2026

Rama: `feature/pa/bugs-qa-codex`. Carpeta: `Plataforma-pa-codex4`. Base: `78a1644cd`. Se leyó la exportación completa de los comentarios de Javier que entregó Tomás; las imágenes originales de Jira no estaban en esa exportación. Las capturas de esta entrega son de pruebas con datos simulados.

Contratos leídos desde **origin**, `feature/pa/bugs-qa-claude` `3fe8ab542`, §38. No se leyó la carpeta de Claude. Tomás aprobó en el chat las reglas de devolución de §38.3: confirmar antes de modificar una sesión TOMADA/en concertación; bloquear APROBADA/ACEPTADA. EFDS-2435, auditoría, permisos, migraciones y todo el backend pertenecen a Claude.

**Estado:** las ocho correcciones de pantalla están implementadas y probadas con build/preview y API simulada. **No están verificadas en condiciones de QA remoto.** Falta integrar el parche compartido del segundo acceso al horario, desplegar ambos MFE junto con el backend correspondiente y recorrer QA con cuentas reales. No se declara cerrada ninguna subtarea en Jira ni se afirma que haya sido desplegada.

## Resultado por subtarea

| Subtarea | Cambio y prueba | Evidencia | Esfuerzo estimado |
| --- | --- | --- | --- |
| EFDS-2431 | `CampoHora24` sustituye los cuatro campos nativos de CalendarioHorario/HorarioGruposVirtuales. Texto con teclado, HH:mm, ayuda 24 h, normalización al salir y validación de rango antes de enviar. Se revisaron tarjetas, calendarios, portal, disponibilidad, concertación y pendientes: muestran cadenas de hora sin formateo regional de Date/Intl. La búsqueda no encuentra `type=time`, `toLocaleTimeString` ni `hour12` en el MFE. Escritura real con teclado y solicitudes 18:15–19:15 iguales en es-CO/en-US, Bogotá/UTC y cuatro resoluciones. No existe exportador de horarios en el código de este MFE; reportes/exportaciones del servidor pendientes de validar en QA. | `sesion-hora24.png`; `resultado.json` | 2 h |
| EFDS-2428 | `PanelGrupos` usa portal al body, fondo atenuado, encabezado/X y pie/Cerrar fuera del desplazamiento. Foco contenido/restaurado; Escape. Borradores de cantidad/modalidad, oferta, ciclo y sesión avisan antes de descartarse; un guardado en curso impide cerrar. Cambiar/cerrar horario también confirma borradores; los editores se reinician por grupo. Rejilla desplazable dentro del panel. Catálogo usa el nuevo panel; el acceso desde el árbol requiere el parche de Claude descrito en integración. | `panel-1920x1080.png`, `panel-1366x768.png`, `panel-1280x720.png`, `panel-390x844.png`; prueba de cancelación de descarte | 3 h |
| EFDS-2433 | El calendario común de consulta tiene Ocultar horario/Ver horario y `aria-expanded`/`aria-controls`. Contraído conserva docente, periodo, vinculación, horas y tope. Es el componente usado por portal y disponibilidad; no tiene condiciones que restrinjan el control por rol. Se comprobó expandir/contraer en el arnés para los tres perfiles; no equivale a validar permisos o iniciar sesión con esas cuentas reales. | `calendario-contraido-Docente.png`, `calendario-contraido-Revisor.png`, `calendario-contraido-Aprobador.png` | 1 h |
| EFDS-2427 | Programas Académicos → Periodos queda en consulta: lista, fechas, tipo, principal/extraordinario y detalle de programas/CETAP. Sin formulario ni acciones de escritura/importación. Enlace de mismo origen con `?module=programacion-academica`, que ya resuelve el shell; sin URL de remoto ni puerto fijo. PA conserva el formulario regular y personalizado. Ambos cuerpos se comprobaron en producción simulada (año/semestre o tipo/nombre/código, fechas). Los tests antiguos de escritura en Programas se sustituyen por tests de consulta; la creación se prueba en PA. | `periodos-consulta-es-CO.png`, `periodos-consulta-en-US.png`; peticiones del recorrido de producción | 1,5 h |
| EFDS-2430 | Chips L/M/X/J/V/S/D y Todos. Validar días usa `/horarios/lote/validar` sin escrituras: conflictos por día y horas previstas. Solo una validación válida y correspondiente al borrador permite Agregar sesiones. Cualquier cambio invalida esa vista previa. `/horarios/lote` guarda atómicamente; la oferta de un aula se guarda solo al confirmar, no durante la validación. Horas posteriores vienen del servidor. | `conflictos-dias-es-CO.png`, `conflictos-dias-en-US.png`; pruebas de cero creaciones con conflicto y siete días con Todos | 2 h |
| EFDS-2432 | Clic/teclado o lápiz visible abre Editar sesión – Grupo N con datos cargados. PATCH y DELETE usan §38.3. Papelera visible; confirmación de día/horas y acción irreversible. Conflictos conservan el editor. FRANJA_TOMADA/EN_CONCERTACION pide una segunda confirmación explícita antes de enviar `confirmarDevolucion=true`; CONCERTACION_ACEPTADA conserva el error y no ofrece forzarla. Se muestran/refrescan horas del servidor. Auditoría y persistencia de las devoluciones son del backend y siguen sin comprobarse en QA. | `editar-devolucion-es-CO.png`, `editar-devolucion-en-US.png`; siete pruebas de horario; PATCH sin/tras confirmación y DELETE antes/tras confirmación en producción | 3 h |
| EFDS-2434 | `aviso` no oculta candidatos: disponibles y bloqueados se listan con tipo/mensaje/detalle del motivo, perfil, títulos, horas/tope y avisos no bloqueantes. Se añade el reparto de subconjuntos entre docentes; una franja tiene un único docente y se agrupan pares del mismo documento. Confirmar acepta un reparto válido o el candidato actual válido. `/asignaciones/multiple` respeta todo-o-nada, muestra errores por documento y no invalida un 200 con `asignado=false`. Se conserva la asignación virtual sin horario por la ruta compatible. | `candidatos-bloqueados-es-CO.png`, `candidatos-bloqueados-en-US.png`, `reparto-es-CO.png`, `reparto-en-US.png`; rechazo atómico y reintento | 2,5 h |
| EFDS-2429 | Consume `unicaSede` y muestra el `motivo` del servidor debajo del selector. No deduce el diagnóstico contando opciones ni inventa territoriales. Error de lista o diagnóstico queda visible. Crear grupos sigue disponible sin oferta, que es opcional. La causa específica de los datos de QA debe confirmarla Claude; no se asegura que la matriz real de QA sea la simulada. | Paneles, aviso de Sede Central y escenario de 503 con creación habilitada | 0,5 h |

Esfuerzo total estimado: **15,5 h**. Son horas por esfuerzo, no tiempo de reloj ni horas de rondas anteriores.

Todas las evidencias anteriores están en `apps/mfe-programacion-academica/tests/evidencia-qa/`. Para cada subtarea, el estado del ambiente remoto sigue siendo: **no verificado en condiciones de QA**.

## Verificación reproducible

- **74/74** pruebas del alcance, 14 suites: `npx vitest run apps/mfe-programacion-academica apps/mfe-programas-academicos/src/components/GestionPeriodos.consulta.test.tsx` (los tests propios declaran jsdom).
- Build normal de ambos MFE correcto: `npm run build -w @esap-mfe/programacion-academica` y `npm run build -w @esap-mfe/programas-academicos`.
- MFE real: se sirve el build normal con su `vite.config.ts` y `vite preview`; `qa-remoto-produccion.browser.mjs` abre la aplicación real, navega a Catálogo y crea una sesión mediante validación. Comprueba assets `.js` construidos, ausencia de `/src/` y `/@vite/`, errores JS y restauración de la vista al cerrar. `remoto-produccion.json` / `.png`. La hoja de estilos es la misma que aporta el shell, sin modificarlo.
- Arnés adicional **construido en modo producción**, también servido con preview: **18 grupos de escenarios**. Incluye las 16 combinaciones es-CO/en-US × America/Bogota/UTC × 1920×1080, 1366×768, 1280×720 y 390×844; más los casos de edición, eliminación, conflictos, reparto, consulta/creación de periodos, vacío y error. `resultado.json` conserva los resultados. Este arnés usa los componentes reales, con una entrada de pruebas; no sustituye la comprobación anterior del MFE real.
- Todas las llamadas API se interceptan con formas publicadas en §38 y contratos anteriores. No se inicia backend, no se escriben datos ni se usan cuentas reales. Las URL de preview se suministran por `PA_QA_PREVIEW_URL`, no por constantes del producto.
- La corrida conjunta de todas las pruebas de ambos módulos, sin jsdom global, tiene 10 fallos en suites ajenas al cambio por `document`/`localStorage` inexistentes. Con `--environment jsdom`, queda **94/96**; fallan `AsignaturasPlanEstudios.reglas-pta.test.tsx` (espera 150) e `ImportarAsignaturas.errores.test.tsx` (espera el encabezado «El archivo necesita ajustes»). No se cambiaron esos archivos ni sus componentes. No se presenta esa corrida como verde.
- TypeScript global aún informa los errores transversales TS2786 de React/Lucide e `ImportMeta.env`; la revisión filtrada no muestra otras familias de error. El build sí pasa.

Ejemplo de ejecución del arnés (la URL de preview la decide quien prueba):

```powershell
npx vite build --config apps/mfe-programacion-academica/tests/vite.qa.config.mjs
npx vite preview --config apps/mfe-programacion-academica/tests/vite.qa.config.mjs --host 127.0.0.1 --port <puerto>
$env:PA_QA_PREVIEW_URL = 'http://<host>:<puerto>/qa/qa-produccion.html'
node apps/mfe-programacion-academica/tests/qa-produccion.browser.mjs
```

Para el MFE real, construir y servir con `apps/mfe-programacion-academica/vite.config.ts`, poner en `PA_QA_PREVIEW_URL` la raíz de ese remoto (base del proyecto) y ejecutar `qa-remoto-produccion.browser.mjs`. Detener los preview al terminar. No hace falta cambiar `.env` ni editar la configuración de remotos.

## Integración y despliegue

1. Claude aplica el parche de `ProgramacionAcademicaModule.tsx` descrito en `INTEGRACION-codex.md`; ese archivo compartido no fue editado ni se incluye en los commits de Codex.
2. Integrar el backend de §38, sus permisos/migraciones y auditoría. No desplegar las pantallas multidía/reparto antes de las rutas correspondientes.
3. Reconstruir y desplegar **ambos** MFE con las variables y bases estándar del ambiente. Publicar assets y `remoteEntry.js` juntos; renovar la caché de entradas conforme a la política de despliegue. No hay configuración local que copiar a QA.
4. Julián: la pantalla de periodos de Programas se convierte intencionalmente en consulta, incluido su detalle. Se retiraron sus acciones de creación, activación, edición, importación y eliminación. El acceso de administración queda en PA; el servidor decide los permisos. La creación personalizada se conserva y se probó en PA.
5. Completar QA real con programador, asignador, Docente, Revisor y Aprobador; verificar datos de CETAP, persistencia, contador del servidor, auditoría y reglas por estado. Validar reportes/exportaciones de backend en 24 h. Hasta entonces, las subtareas no cumplen la definición de terminado remoto.

No hay cambios propios en shell, `package.json`, `.gitignore`, lockfile, migraciones ni backend. Solo se sube la rama de Codex; no se modifica `micro-frontend`.

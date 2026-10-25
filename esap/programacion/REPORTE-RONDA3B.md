# Ronda 3b — cobertura y entrega de Codex

24 de octubre de 2026. Contratos obtenidos de `origin/feature/pa/ronda3` y de `origin/feature/pa/ronda3-claude` (`814c564d4`, sección 21). No se leyó la carpeta de Claude.

## Cobertura primero

**La base local en 55432 no devolvió franjas de 2026-1**, ni en `programacion_historica` ni en la programación viva. Por tanto, su porcentaje de cobertura es **no calculable**, no 0 % ni 100 %. Todas las consultas se ejecutaron en una transacción `REPEATABLE READ READ ONLY`, con `default_transaction_read_only=on`; no se iniciaron servicios backend ni se hicieron cargas.

Medición separada del Excel `PROGRAMACIÓN ACADEMICA  2026_1.xlsx`, hoja `PROGRAMACIÓN`:

| Medida | Resultado |
|---|---:|
| Franjas con asignatura y día | 535 |
| Filas de asignatura sin día, fuera del denominador de franjas | 40 |
| Docentes de esas franjas | 113 |
| Con algún núcleo RUND reconocido | 20 |
| Con área derivada del puente | 113 |
| Sin ninguno | 0 |
| Franjas con área compatible usando solo RUND | 26 / 535 = **4,86 %** |
| Franjas con área compatible usando RUND o puente | 531 / 535 = **99,25 %** |

Los conteos de docentes con RUND y puente se superponen. Tener algún núcleo RUND no equivale a tener el área compatible con cada franja. No se reproduce el 17 % / 100 % citado en la instrucción: no se forzaron equivalencias adicionales para alcanzarlo. Esta medición comprueba compatibilidad de área, **no** disponibilidad, vinculación vigente ni tope de horas.

Las cuatro franjas sin cobertura son las filas 35, 36, 440 y 441: «Opción de grado», plan APT_52. En `PLAN_ESTUDIOS` existen «Opción de grado (Curso Profundización temática 1)» y «… 2», pero no ese nombre exacto. El contrato exige el cruce por plan y nombre normalizado: no se eliminó el contenido entre paréntesis para fabricar coincidencias. Las dos filas del puente afectadas son 147 y 172.

`resultados/2026-1/cobertura.json` contiene metodología, huellas SHA-256 de ambos Excel, núcleos sin cruce, incidencias y mediciones separadas. Hay seis textos de núcleo RUND sin cruce tras normalizar; entre ellos los dos expresamente pendientes, Procesos Étnicos e Interculturales y Gerencia Social.

## Archivos entregados

Dentro de `resultados/2026-1/datos/nucleos/`, según sección 21:

- `nucleo_equivalencia.csv`: 56 variantes únicas según la normalización del servidor, UTF-8 BOM, separador `;`. Incluye áreas canónicas, variantes observadas, prefijos, cuatro frases genéricas y dos núcleos sin área.
- `puente_docente_area.csv`: 278 filas únicas por docente, plan y asignatura; columnas exactas del contrato. Conserva el área original del plan, para que el servidor la interprete con las equivalencias.
- `puente_excluidas.csv`: tres filas: cédula 0 (fila 323), y los dos cruces fallidos de Opción de grado. La fila 19 tiene `ap` en minúsculas: se reporta, pero el cruce normalizado permite conservarla.

Todos los documentos incluidos en el puente se encontraron en `auth.personas`. No se creó ninguna persona. Las áreas canónicas **Opción de grado** y **Finanzas Públicas** no tienen código equivalente activo en la base consultada.

`catalogo-conciliacion.xlsx` es un **libro de revisión, no de importación**: contiene las 421 filas del plan, sus áreas, códigos NT existentes cuando se resuelven sin ambigüedad y posibles duplicados por nombre en la base. No inventa códigos de catálogo ni considera que una falta de coincidencia exacta autorice crear una asignatura. Hay 30 filas sin código de área único.

**Pendiente del catálogo definitivo:** falta la instrucción anterior referida por v2 (`INSTRUCCION-codex-ronda3b-PA.md`) y sus reglas concretas de formato/posgrado. No está en las ramas publicadas ni en los adjuntos disponibles. Se solicitó su ubicación a Tomás. No se presenta el libro de conciliación como una carga lista.

## Pantallas

- **EFDS-2344:** Programación General muestra programa → asignatura → grupo → franjas con plegables nativos de teclado. Incluye todos los docentes, vinculación, horas del servidor, oferta CETAP/territorial, ciclo, estados y alertas de faltantes/exceso. Filtro por nivel permitido y pendientes. Un valor `null` se muestra como no disponible. El menú y las acciones usan `getMisPermisos`; el acceso al horario editable requiere permiso de programar y periodo programable.
- **EFDS-2343:** Disponibilidad Docente permite buscar por cédula/nombre y abrir el calendario semanal. `CalendarioHorario` admite modo de consulta sin montar efectos ni controles de escritura. Lunes a domingo, horarios fuera de la ventana habitual, franjas simultáneas en columnas, ciclo, aula, horas/tope. `reservada` muestra solo hora y «Ocupado». El portal reutiliza ese calendario con `getMiCalendario`; en el flujo nuevo aprovecha la consulta de `GruposAsignados`.
- **EFDS-2341 y EFDS-2374:** pendientes de contrato publicado. No se inventaron candidatos, estados ni acciones de aceptación/novedad.

## Verificación

- Navegador Chromium con Puppeteer y API completamente interceptada: `apps/mfe-programacion-academica/tests/vistas-ronda3.browser.mjs`. Formatos de sección 19, envoltorio `{success,data}` verificado contra los controladores publicados. Árbol, varios docentes, pendientes, permisos, oferta/territorial, nulos, reserva, domingo a las 05:00, calendario propio, error 503 y vacío: pasan. Inspección visual con CSS existente del shell inyectado solo en la prueba; no se modificó el shell.
- MFE: **33/33** pruebas Vitest, seis suites.
- Regresión de navegador `periodo-unico.browser.mjs`: **9/9**, incluidos activar/cerrar, permisos, carga Excel validación→confirmación y filtros de aulas. Se actualizaron únicamente los fixtures de permisos y árbol que consume ahora el módulo.
- Datos: **3/3** pruebas Node: normalización, CSV/columnas/BOM/duplicados y exclusiones del puente.
- `npm run build`: pasa. `tsc` conserva errores transversales React/Lucide TS2786 y tipos del shell ya reportados; no se cambiaron dependencias compartidas para ocultarlos.

Estimación por esfuerzo, no tiempo de reloj: árbol 2 h; calendario/backoffice/portal 2,5 h; equivalencias/puente/cobertura 2,5 h; conciliación preliminar de catálogo 0,5 h; pruebas visuales, regresión y documentación 1,5 h. **Total estimado de esta entrega: 9 h.** No se imputan como terminados el catálogo importable ni los dos contratos pendientes.

## Regenerar

Desde la raíz, después de `npm install`:

```powershell
node esap/programacion/generar-datos.mjs --programacion "ruta\programacion.xlsx" --rund "ruta\rund.xlsx" --env "ruta\academic-schedule-service\.env" --periodo 2026-1
node --test esap/programacion/validar-datos.test.mjs
```

El generador solo usa `SELECT`, `SHOW`, `BEGIN READ ONLY` y `ROLLBACK`; fuerza host local y puerto 55432. Los archivos de salida quedan bajo `resultados/<periodo>`. El archivo de credenciales nunca se copia al reporte. El periodo debe corresponder al Excel suministrado; las filas sin día se reportan por separado.

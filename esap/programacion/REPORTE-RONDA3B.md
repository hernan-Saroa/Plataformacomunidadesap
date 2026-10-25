# Ronda 3b — cobertura y entrega de Codex

## Cierre de la continuación — 25 de octubre de 2026

**Cobertura con la regla vigente: 463/535 franjas del Excel (86,54 %)**: 32 por RUND y 431 por puente. El puente solo cuenta cuando el docente no tiene ningún núcleo RUND reconocido; no amplía áreas del RUND. Hay 68 franjas cuyo docente tiene RUND de otra área y cuatro sin cruce exacto de Opción de grado APT_52. `cobertura-regla-vigente.json` usa el intérprete puro publicado por Claude y las equivalencias activas consultadas el 24 de octubre; conserva la huella del intérprete. El 99,25 % del apartado original corresponde a la unión de fuentes anterior y no expresa la regla actual.

**Excel listo para el importador:** [catalogo-importable-2026-1.xlsx](resultados/2026-1/catalogo-importable-2026-1.xlsx). Incluye las hojas PROGRAMAS, ASIGNATURAS y MATRIZ_OFERTA del formato vigente: 427 asignaturas, 14 programas y 325 ofertas. El parser y el validador reales del PTA lo aceptan con cero errores y cero advertencias de validación previa.

- Conserva todos los códigos de la exportación base: cero códigos nuevos o retirados. Solo cambia el área en 65 asignaturas con cruce inequívoco por programa, nombre base y tabla de equivalencias. Semestre, créditos y plan sirven para acotar candidatos cuando existen; no se modifica ninguno de esos campos.
- Las 160 asignaturas de posgrado y todos sus campos originales se conservan. El Excel fuente tiene planes de pregrado: no permite inferir áreas de posgrado. Su área efectiva sigue siendo el programa según §22.1. Las huellas antes/después de códigos y datos de posgrado coinciden.
- `REVISION_CATALOGO` contiene 63 asignaturas cuyo cruce no autoriza cambiar el área: mantienen el valor anterior. `REVISION_OPCION_GRADO` contiene las cuatro franjas pedidas, con los dos nombres candidatos y decisión manual explícita. No se inventa la equivalencia entre los cursos 1 y 2.
- `nucleo_tematico` lleva el nombre que consume el importador actual; la columna adicional `codigo_nucleo_tematico` conserva el `NT-*` conocido para trazabilidad. `codigo_area_formacion` conserva el `AF-*` cuando se resuelve. Los códigos AF no sustituyen códigos NT.
- La consulta previa encontró Finanzas Públicas y Opción de grado en `area_formacion` (AF-04 y AF-17), pero sin NT equivalente en el snapshot de `nucleo_tematico`. Se reportan en `catalogo-importable-reporte.json`; el nombre aprobado se conserva para que el importador resuelva el núcleo al validar/confirmar.
- Al retomar el 25 de octubre, `127.0.0.1:55432` rechazó la conexión. Se preparó el archivo con la exportación conocida `carga-valida-catalogo.xlsx` y los snapshots leídos previamente. **La comparación con la base actual y la confirmación de carga quedan para Claude cuando la base esté disponible.** No se iniciaron servicios reales ni se escribieron datos.
- `INSTRUCCION-codex-ronda3-PA.md` no apareció en la ubicación externa indicada ni en origin. Se aplicaron las tres reglas expresas del pedido: reutilizar códigos, usar la tabla de áreas y verificar posgrado, junto con el formato real del importador publicado. La procedencia y sus huellas están en el reporte del archivo.

**Pantallas terminadas:**

- EFDS-2341: «Asignar docente» en cada grupo programable para el nivel que permite `getMisPermisos().asignar`. Modal de candidatos del área, todas las franjas por defecto, selección de subconjuntos, búsqueda, filtro de vinculación, sugerencia con razones, perfil, títulos, origen del núcleo, horas/tope, cruces y motivos. No hay campo de asignación libre. Un 200 con `asignado:false` conserva el modal y no invalida consultas. Título y botones permanecen visibles mientras se recorren los candidatos; foco contenido, Escape y retorno al botón.
- EFDS-2374: únicamente `POR_ACEPTAR` ofrece «Aceptar y firmar» o «Reportar novedad». La firma usa el modal OTP existente. La novedad exige tipo válido y diez caracteres de justificación; un error conserva lo ingresado. `ACEPTADA`, `NOVEDAD` y el histórico `APROBADA` no ofrecen acciones. Aceptar/novedad refrescan concertación, calendario y grupos después de una respuesta satisfactoria. Con el interruptor apagado se mantiene el flujo anterior del portal.
- Regresión §26.2: el filtro de jornada vuelve a Programación General, con los valores del backend. Selecciona grupos con franjas de esa jornada y muestra el grupo completo para preservar el contexto de asignación.

**Verificación:** MFE 38/38 (ocho suites); datos/catálogo 7/7; canario estático de rutas del cliente 3/3 (incluida jornada); navegador con API interceptada y respuestas de §§19, 22 y 23, incluidos rechazo 200, 409/503, subconjuntos, firma, novedad, foco y apagado; regresión de nueve escenarios de periodos/carga/aulas y prueba de árbol/calendario. Build correcto. Se ejecutan el parser, la matriz y las reglas R1-R6 originales; el arnés sustituye únicamente el decorador de inyección y la clase de error de Nest para no levantar el backend. No equivale a ejecutar el importador transaccional ni su validación contra la base.

Generadores: `generar-datos.mjs` para los cruces de lectura y `generar-catalogo.mjs` para el Excel. Para regenerar el catálogo:

```powershell
node esap/programacion/generar-catalogo.mjs --catalogo-base "ruta\catalogo-exportado.xlsx" --programacion "ruta\programacion.xlsx" --periodo 2026-1
node --test esap/programacion/validar-datos.test.mjs esap/programacion/catalogo-importable.test.mjs
```

Esfuerzo adicional estimado: modal 1,5 h; aceptación/novedad y refresco 1,5 h; catálogo y conciliación 2 h; pruebas/inspección visual 1,5 h; documentación e integración 0,5 h. **7 h adicionales**, sin repetir las 9 h estimadas de la entrega anterior.

## Registro de la primera entrega

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

# Punto de guardado para push y continuación: corte 61

Fecha: 2026-10-15. Rama: `feat/agregar_modulo_rund`.

El código puede guardarse en esta rama para respaldo y revisión. El punto funcional
actual es la sección 61 de ESTADO-MIGRACION-MICROSERVICIO.md. Este documento no certifica
un despliegue ni la independencia completa de RUND.

## Qué queda guardado

- **24 cortes técnicos locales desde el merge**, secciones 38–61; **11 pasos principales
  locales**. El paso 12/aceptación 12.5d.2 continúa abierto, con **5 frentes pendientes**.
- Contratos/lecturas entre RUND, Auth, PTA y Programación, catálogos, identidad, permisos
  y Macro Docente, con sus pruebas, verificadores y evidencias.
- La escritura de persona/cuenta/rol está delimitada y probada, pero todavía usa la
  misma transacción local Auth/RUND. La nueva API de prevalidación solo lee datos; su
  cliente preparatorio aún no se importa en los módulos activos de escritura de RUND.
- El RUND embebido en PTA se conserva. Su retiro y la aceptación por ambiente siguen
  pendientes. No se activan banderas ni se ejecutan migraciones de una instalación.

Las fuentes verificadas por el corte 61 tienen sus hashes encadenados en
`validacion-prevalidacion-identidad-auth-rund.json`. La revisión de publicación añade
un manifiesto de **todos los archivos pendientes del alcance RUND**, incluidos archivos
nuevos y la eliminación del antiguo notificador ya sustituido por el servicio propio.
No seleccionar únicamente el archivo abierto en el IDE ni omitir archivos sin seguimiento.

Manifiesto actual: `corte-61-rund.paths`. Revisión del paquete: `revision-push-corte-61.json`.
Resumen verificable de este cierre: `validacion-push-corte-61.json`.

## Validación disponible

| Alcance | Resultado |
|---|---|
| RUND | Build correcto; 62 suites / 1.108 pruebas. |
| Auth, identidad | Build correcto; 2 suites / 98 pruebas. No es toda la suite Auth. |
| Integración | 326 comprobaciones con main real y PostgreSQL temporal, eliminado al terminar. |
| Gateway HTTP | 17 comprobaciones, incluidas las API internas bloqueadas. |
| PTA | Build y 53 pruebas de su módulo interno correctos en el corte 59; las fuentes comprobadas siguen iguales. |
| Otros componentes y límites previos | Evidencias históricas del primer push y cortes 38–60; no se presentan como suites completas repetidas para este punto. |

El shell conserva los límites globales documentados en PRIMER-PUSH.md (suite
disciplinaria y TypeScript global); no se han resuelto ni repetido en este cierre.
Las validaciones actuales no certifican imágenes Docker, datos/configuración reales o
aceptación de DEV/QA/PRE/PROD. Las comprobaciones de publicación verifican la integridad
del paquete, imports locales, marcadores de conflicto y firmas concretas de secretos;
no son un escáner exhaustivo de credenciales.

## Guardar el avance

Desde la raíz del repositorio, regenerar/revisar el manifiesto antes de preparar el commit:

```powershell
git branch --show-current
node scripts/review-rund-push-checkpoint.cjs --checkpoint=61
```

Confirmar que la rama es `feat/agregar_modulo_rund` y que
`docs/rund/revision-push-corte-61.json` tiene findings y outsideCut vacíos. El script no
modifica el índice Git, hace commit/push, lee `.env` reales ni despliega.

```powershell
git add --pathspec-from-file=docs/rund/corte-61-rund.paths
git diff --cached --stat
git diff --cached --check
git diff --cached
git commit -m "feat(rund): guardar avance de independencia hasta corte 61"
git push origin feat/agregar_modulo_rund
```

Los comandos de staging/commit/push quedan para el usuario; no los ejecutó el agente.
Un push solo publica commits: los cambios sin commit no se guardan en el remoto.
Revisar el diff preparado antes del commit. Si cambian las fuentes, regenerar el
manifiesto y volver a revisar; el manifiesto describe este árbol de trabajo.

Los ocho workflows de build/publicación versionados se disparan por push a dev/qa/pre/prod.
Esta rama de funcionalidad no coincide con esos disparadores. No se inspeccionaron
automatizaciones externas. Integrar a las ramas de ambiente requiere otra revisión:
las rutas nuevas de Auth/PTA deben estar disponibles antes de los consumidores RUND
que las necesitan, con URL/token compatibles y los requisitos de los cortes anteriores.

## Retomar después

Leer primero la sección 61 y CONTRATO-PREVALIDACION-IDENTIDAD-AUTH.md. El siguiente ajuste
es el registro/consulta idempotente de operaciones y su recuperación, antes de conectar
escrituras remotas a los flujos activos. Debe conservar previsualización sin persistencia,
validación de soporte/auditoría/OCR, contraseña/roles existentes y tratamiento de fallos
tardíos. La huella actual no es un recibo persistido ni confirma una escritura remota.

No se incrementa el conteo de cortes técnicos por preparar este push. Se continúa desde
el **punto 61 terminado**, con el frente 4 y la aceptación operativa todavía abiertos.

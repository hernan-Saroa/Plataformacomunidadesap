# Primer corte publicable de RUND

> Documento histórico del primer corte. El último guardado preparado fue el
> [corte 91](PUSH-CORTE-91.md). El avance y el punto para retomar están en
> [ESTADO-MIGRACION-MICROSERVICIO.md](ESTADO-MIGRACION-MICROSERVICIO.md).

Fecha: 2026-10-14. Rama: `feat/agregar_modulo_rund`.

**Corte de código para respaldo/revisión de la rama, con límites conocidos.** Incluye
el servicio y MFE propios, integración documental gradual, compatibilidad histórica,
auditoría, migraciones y sus verificadores. No declara independencia completa,
activación ni aceptación operativa de los ambientes. No se realizó stage, commit o push.

## Hasta dónde llega el corte

- Pasos principales **1–11 implementados y validados localmente**.
- Trabajo de Carpeta Digital hasta **12.5d.1** implementado/revisado y probado localmente;
  incluye los 13 subhitos documentados del paso 12.
- Primeras comprobaciones reales de **12.5d.2** registradas: conexión Auth local de solo
  lectura y sondeos públicos de los orígenes documentados. Ese subpaso sigue abierto.
- Se conserva el RUND embebido en PTA. Las funciones nuevas de agregación, historial y
  proyección conservan sus banderas apagadas por defecto. Publicar el frontend sí puede
  cambiar las entradas del banco y la autogestión: esas rutas no dependen de esas banderas.

El corte debe viajar como conjunto: RUND, Auth, gateway, shell, Personas, los archivos
compartidos nuevos, SQL 004–007 y 667/668, Compose/workflows, runners, pruebas y documentación.
Las eliminaciones de archivos de `mfe-rund` corresponden a su limpieza ya validada;
no son eliminaciones del RUND original de PTA. Los builds y la resolución de imports
se comprobaron con ese estado de archivos.

## Validación ejecutada para este corte

| Componente | Resultado actual |
| --- | --- |
| Backend RUND | Build correcto; 42 suites / 512 pruebas correctas. |
| API gateway | Build correcto; 6 suites / 67 pruebas correctas; 9 checks HTTP con destinos ficticios. |
| Auth | Build correcto; sus 12 suites / 106 pruebas correctas, ejecutadas en tres grupos sin omitir programas/settings/app. |
| MFE RUND | Build aislado correcto; TypeScript correcto; 19 archivos / 180 pruebas correctas. |
| Gestión de Personas | Build aislado correcto; 8 archivos / 106 pruebas correctas. |
| Shell | Build aislado correcto; 14 archivos / 141 pruebas pasan. La suite completa conserva 1 suite fallida previa: `disciplinary.service.spec.ts`, `jest is not defined`. |
| TypeScript global del shell | 586 diagnósticos; mismas firmas que la evidencia 12.4, sin firmas nuevas o eliminadas. No pasa el chequeo global. |
| Integración RUND/Auth PostgreSQL | 121 checks correctos con datos ficticios y clúster temporal; procesos detenidos y clúster eliminado. |
| Workflows, selección de despliegue y sondeador | 115 pruebas correctas: 13 + 88 + 14. Docker/Compose y despliegues simulados en las pruebas de selección. |
| Compose | 19 composiciones correctas sin daemon ni `.env` reales; módulos ajenos a Auth/RUND iguales al baseline. |
| Paquete Git | Manifiesto de archivos y revisión de imports/firma de secretos concretas, sin modificar el índice. `git diff --check` correcto. |

Las tres compilaciones frontend se generaron bajo `tmp/primer-push-build` y
`tmp/primer-push-shell-build`; no reemplazaron el frontend publicado/local de `build`.
Los builds backend actualizaron sus salidas ignoradas `dist`, sin iniciar los servicios.
Las pruebas integrales no utilizaron bases existentes ni archivos `.env` reales.
No se repitieron las pruebas de navegador: su evidencia previa continúa identificada
como anterior, no como ejecución de este corte. Tampoco se construyeron imágenes Docker.

Los dos fallos globales del shell se presentan como límites efectivos del corte. No se
relajó TypeScript, cambiaron pruebas disciplinarias o modificó código ajeno para ocultarlos.
Si la política de integración exige todos los chequeos globales en verde, deben resolverse
antes de integrar la rama; este corte solo prepara su publicación para revisión/respaldo.

Evidencia consolidada: `validacion-primer-push-local.json` y `revision-primer-push.json`.

## Archivos para el primer commit/push

`primer-push-rund.paths` contiene las rutas exactas del corte con pathspec literal,
incluidos archivos nuevos y eliminaciones. No incluye `.env` reales, credenciales,
dependencias instaladas, `uploads`, builds, logs o temporales. La búsqueda automática
de secretos cubre firmas concretas; revisar también el diff antes de confirmar el commit.

Para regenerar el manifiesto tras cualquier cambio:

```powershell
node scripts/review-rund-push-checkpoint.cjs
```

El script solo lee Git/fuentes y genera manifiesto/reporte. No ejecuta las suites,
staging, commit, push o despliegue. Los hashes de `sourceHashes` permiten contrastar
si las fuentes siguen iguales al corte. Los JSON generados y el propio manifiesto
se excluyen de esas huellas para evitar referencias circulares.

Comandos propuestos para que el usuario revise y publique el corte desde la raíz:

```powershell
git branch --show-current
git add --pathspec-from-file=docs/rund/primer-push-rund.paths
git diff --cached --stat
git diff --cached --check
git diff --cached
git commit -m "feat(rund): preparar servicio e integracion documental gradual"
git push origin feat/agregar_modulo_rund
```

Revisar que la rama siga siendo `feat/agregar_modulo_rund` antes del commit. Los comandos
anteriores son instrucciones para el usuario; no se ejecutaron. La publicación de esta
rama no coincide con las ramas `dev/qa/pre/prod` que disparan los workflows versionados;
no se inspeccionaron automatizaciones externas al repositorio.

## Lo que falta para la independencia completa

Quedan **5 frentes, contando el actual**; no son cinco tareas del mismo tamaño:

1. Cerrar el paso 12: confirmar configuración/conexión y ejecución de RUND, migraciones
   pendientes y aceptación operativa en local/DEV/QA/PRE/PROD antes de activar funciones.
2. Completar consumidores de dashboard/reportes y accesos documentales históricos Auth
   todavía ligados a PTA.
3. Conectar PTA, Programación Académica y contrato-programación preservando sus reglas.
4. Resolver dependencias SQL directas entre propietarios que impiden el aislamiento.
5. Completar aceptación integral y cierre operativo; retirar RUND de PTA solo al final
   y con la confirmación explícita requerida por la sección 9.3 del estado de migración.

La lectura local actual no muestra las tablas RUND ni las de Auth 667/668 en la conexión
configurada por Auth. No certifica otra base propia de RUND. Los accesos/artefactos remotos
siguen sin verificar por conectividad y falta de configuración operativa en este checkout.
No se aplicaron esas migraciones ni se activaron banderas para cerrar este corte.

Después de este primer push se retoma 12.5d.2 con esos pendientes. El punto de corte
no aumenta el conteo de pasos principales ni convierte comprobaciones locales en
validación del ambiente.

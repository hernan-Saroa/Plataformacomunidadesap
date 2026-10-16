# Punto de guardado para push y continuación: corte 80

Fecha: 2026-10-16. Rama: `feat/agregar_modulo_rund`.
Commit de partida: `a5332853b93cfdee4f747510947376f9d08b0c6c`.

El avance está preparado para guardarlo como commit y publicarlo en esta rama de
funcionalidad para respaldo/revisión. La implementación termina en el punto 80 de
[ESTADO-MIGRACION-MICROSERVICIO.md](ESTADO-MIGRACION-MICROSERVICIO.md).
Preparar este guardado no añade otro punto técnico ni certifica un despliegue.

## Qué queda guardado

- **43 cortes técnicos locales desde el merge**, secciones 38–80; **11 pasos
  principales completados localmente**. El paso 12 y la aceptación 12.5d.2 siguen
  abiertos, con **5 frentes pendientes** en el
  [mapa de cierre](PENDIENTES-CIERRE-INDEPENDENCIA.md).
- El paquete pendiente desde el commit de partida incluye la preparación de
  operaciones de identidad Auth, coordinación/commit nativo RUND, recuperación,
  revisiones, solicitud/formulario manual, sesión del operador y correo durable
  con consulta de estado. Viajan juntos código, pruebas, SQL, contratos y evidencias.
- La aplicación y compensación de identidad en Auth conservan valores por defecto
  `false`. El módulo manual RUND y el consumidor de correo siguen fuera de AppModule;
  el llamador activo del banco no proporciona el cliente manual. La sesión del shell
  y `Cache-Control` de Auth sí contienen ajustes activos, cubiertos por sus pruebas.
- Se conserva el escritor vigente y el RUND embebido en PTA. Los otros canales de
  registro, edición, lotes y autogestión todavía requieren su adaptación gradual.

Manifiesto completo: [corte-80-rund.paths](corte-80-rund.paths).
Revisión del paquete: [revision-push-corte-80.json](revision-push-corte-80.json).
Comprobación de este guardado: [validacion-push-corte-80.json](validacion-push-corte-80.json).
Incluye los archivos nuevos sin seguimiento; seleccionar solo los archivos abiertos
en el IDE dejaría incompleto el commit.

## Validación disponible y sus límites

La evidencia técnica es
[validacion-consulta-correo-manual-rund.json](validacion-consulta-correo-manual-rund.json).
Para preparar este guardado se contrastaron sus 267 hashes de fuentes: todos
coincidían antes de editar la documentación de guardado. Después solo cambia, dentro
de esas fuentes, el enlace de continuación de este documento en el estado general.
Se conserva íntegra la evidencia técnica original. No se repiten suites ni builds
por estas modificaciones documentales.

| Alcance | Última validación de las fuentes conservadas |
|---|---|
| Backend RUND, corte 80 | Build correcto; 82 suites / 1.519 pruebas. |
| MFE RUND, corte 80 | TypeScript y build correctos; 28 archivos / 322 pruebas. |
| Integración, corte 80 | 579 comprobaciones con PostgreSQL temporal y datos sintéticos; sin SMTP real. |
| Gateway HTTP, corte 80 | 26 comprobaciones con destinos ficticios; código productivo sin cambios. |
| Auth, evidencia conservada | Build y 7 suites / 196 pruebas de identidad/sesión; no es toda la suite Auth. |
| Shell RUND, evidencia conservada | Build y 7 archivos / 80 pruebas; 9 controles HTTP de sesión del operador. |

El shell mantiene **586 diagnósticos globales de TypeScript previos** y el fallo
global previamente documentado de `disciplinary.service.spec.ts` por
`jest is not defined`. No se resolvieron ni se repitieron esas comprobaciones globales
en este guardado. Este corte permite respaldar/revisar la rama; si la política de
integración exige todas las comprobaciones globales correctas, esos problemas siguen
pendientes antes del merge.

La revisión del paquete comprueba imports locales resolubles, archivos excluidos,
marcadores de conflicto y firmas concretas de secretos; no es una auditoría exhaustiva
de credenciales. No incluye `.env` reales, dependencias instaladas, builds o logs.
No se instalan las migraciones nuevas de RUND 008–016 ni Auth 669–671 en bases
existentes. Su orden, los prerrequisitos anteriores y la configuración se deben
verificar antes de activar o desplegar en cada instalación.

## Guardar el avance

Desde la raíz del repositorio:

```powershell
git branch --show-current
node scripts/review-rund-push-checkpoint.cjs --checkpoint=80
```

La rama debe ser `feat/agregar_modulo_rund`. Revisar que `findings` y `outsideCut`
estén vacíos en `revision-push-corte-80.json`. Si aparece algún hallazgo, no continuar
con el commit hasta revisarlo. El verificador solo lee Git/fuentes y escribe su
manifiesto/reporte; no prepara el índice, hace commit/push o ejecuta migraciones.

Preparar y revisar el conjunto completo:

```powershell
git add --pathspec-from-file=docs/rund/corte-80-rund.paths
git diff --cached --stat
git diff --cached --check
git diff --cached
```

Continuar cuando el diff preparado corresponda al alcance revisado y la comprobación
no reporte errores. Si cambian fuentes, revisar esos cambios, ejecutar las pruebas
que correspondan y regenerar el manifiesto antes del commit. El reporte describe el
árbol de trabajo del momento; los hashes son de sus bytes locales.

```powershell
git commit -m "feat(rund): guardar avance de independencia hasta corte 80"
git push origin feat/agregar_modulo_rund
git status --short
```

Un push guarda commits; los cambios sin commit no se publican. Los comandos de
staging/commit/push quedan para el usuario y no los ejecutó el agente. Si el remoto
rechaza el push porque hay cambios nuevos, integrar/revisar esos cambios y repetir
la validación pertinente antes de publicar.

Los ocho workflows versionados de build/publicación solo escuchan push a `dev`,
`qa`, `pre` o `prod`; esta rama no coincide con esos disparadores. No se verificaron
automatizaciones externas ni el estado actual del remoto. La validación local no
certifica imágenes, configuración, datos ni aceptación de DEV/QA/PRE/PROD.

## Retomar después

Volver a la **sección 80 terminada**, leer el mapa de cierre y los contratos de
[correo durable](CONTRATO-CORREO-DURABLE-IDENTIDAD-RUND.md) y
[consulta de correo](CONTRATO-CONSULTA-CORREO-MANUAL-RUND.md).
El siguiente trabajo es validar con Auth el destinatario y el estado de credenciales
antes de autorizar el envío; el snapshot del alta puede haber cambiado.

Después siguen la conciliación de estados ENVIANDO/INCIERTO y los demás pendientes
del frente 4. SMTP no ofrece idempotencia remota: este guardado no habilita reenvíos,
el formulario manual ni el consumidor de correo. La aceptación por instalación y
el retiro final de PTA continúan pendientes. No se inicia el punto 81 al preparar
este push.

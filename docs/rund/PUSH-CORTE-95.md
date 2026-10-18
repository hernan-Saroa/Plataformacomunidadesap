# Punto de guardado para push y continuación: corte 95

Fecha: 2026-10-17. Rama: `feat/agregar_modulo_rund`.
Commit de partida: `ca960962917d3f31d4bb5e2d1112a282c3449fbb`.

El conjunto está preparado para guardarlo completo y publicarlo en esta rama para
respaldo/revisión. La implementación termina en el punto 95 del
[estado de migración](ESTADO-MIGRACION-MICROSERVICIO.md). Esta preparación conserva
ese punto técnico y añade las instrucciones para guardar y retomar.

## Alcance acumulado desde el commit de partida

- Punto 92: preview manual opcional sin captura, solicitud ni escritura remota.
- Punto 93: cliente y formulario opcionales para ese preview, con invalidación
  ante cambios de borrador/sesión y confirmación posterior independiente.
- Punto 94: preview masivo con propuestas compartidas y lecturas, sin escrituras,
  rollback ni consumo de secuencias. Conserva la auditoría de acceso HTTP.
- Punto 95: el preview masivo consulta identidad mediante una API mínima de Auth,
  sin SQL alternativo del consumidor. Viajan juntos productor, consumidor,
  contratos, pruebas, verificadores y evidencias.

El preview masivo activo sí cambia con este paquete. Para desplegarlo, se debe
publicar **Auth primero y RUND después**. Un Auth anterior devuelve errores de
preview por fila al nuevo consumidor. Este guardado no acredita la disponibilidad
del endpoint en las instalaciones reales.

La importación definitiva conserva su escritor vigente. Los módulos manual,
correo y revisiones siguen fuera de AppModule de RUND; las banderas de aplicación
y compensación Auth siguen apagadas por defecto. La entrada activa no proporciona
el cliente o activación manual opcionales. Se conserva el RUND embebido en PTA.
Los puntos 92–95 no añaden migraciones ni requieren nuevas variables de entorno.

## Validación conservada y revisión del paquete

Se contrastaron las **346 huellas** de la evidencia técnica del
[punto 95](validacion-preview-masivo-identidad-auth.json): todas coincidían antes
de preparar este guardado. Después solo cambian, dentro de esas fuentes, los
enlaces de guardado en el estado general y PRIMER-PUSH.md. La evidencia técnica
original se conserva. Esta preparación documental no repite suites o builds.

| Alcance | Última validación de las fuentes conservadas |
|---|---|
| Backend RUND, punto 95 | 92 suites / 1.832 pruebas y build correctos. |
| Auth identidad/sesión, punto 95 | 9 suites / 254 pruebas y build correctos; no es toda la suite Auth. |
| Integración PostgreSQL/TypeORM/HTTP, punto 95 | 710 comprobaciones, conservando las 703 anteriores; clúster temporal eliminado. |
| Recorrido de interfaz integrado | 22 escenarios HTTP con React/jsdom; cookie y proxy de prefijo simulados. |
| MFE RUND, evidencia conservada | 35 archivos / 542 pruebas, TypeScript y build correctos. |
| Shell RUND/sesión, evidencia conservada | 7 archivos / 80 pruebas y 9 controles HTTP de sesión. |
| Gateway HTTP, evidencia conservada | 31 comprobaciones con upstream y auditoría ficticios. |

Persisten los límites globales documentados del shell: 586 diagnósticos TypeScript
y el fallo `jest is not defined` en `disciplinary.service.spec.ts`. Esos controles
globales no se repiten aquí. Una política de integración que exija todos esos
controles en verde necesitará resolverlos antes de integrar.

El [manifiesto completo](corte-95-rund.paths) incluye archivos nuevos sin
seguimiento. La [revisión del paquete](revision-push-corte-95.json) comprueba
imports locales, exclusiones, marcadores de conflicto y firmas concretas de
secretos. La [validación del guardado](validacion-push-corte-95.json) registra las
huellas conservadas y los cambios documentales permitidos. Esa revisión no es una
auditoría exhaustiva de credenciales. Guardar solo los archivos abiertos en el IDE
dejaría incompleto el conjunto.

## Guardar y publicar

Desde la raíz del repositorio, comprobar la rama y regenerar la revisión:

```powershell
git branch --show-current
node scripts/review-rund-push-checkpoint.cjs --checkpoint=95
```

La rama debe ser `feat/agregar_modulo_rund`; `findings` y `outsideCut` deben estar
vacíos en el reporte. Si se modifica código después de este guardado, hay que
validar los cambios correspondientes y actualizar la evidencia antes de guardar.
El verificador no ejecuta pruebas, staging, commit o push.

Preparar y revisar el paquete completo:

```powershell
git add --pathspec-from-file=docs/rund/corte-95-rund.paths
git diff --cached --check
git diff --cached --stat
git diff --cached
```

Cuando esa revisión corresponda al alcance esperado y no tenga errores:

```powershell
git commit -m "feat(rund): guardar independencia y previews hasta corte 95"
git push origin feat/agregar_modulo_rund
git status --short
```

Un push publica commits; los cambios sin commit no se suben. El agente dejó el
índice intacto y no ejecutó commit o push. Al preparar este guardado, HEAD coincidía
con la referencia local del upstream; no se hizo fetch ni se comprobó el remoto en
vivo. Si el remoto rechaza el push por nuevos commits, hay que revisar e integrar
esos cambios y validar el resultado antes de publicar, sin forzar el push.

Los ocho workflows versionados escuchan push únicamente a dev/qa/pre/prod; esta
rama no coincide con esos disparadores. Las automatizaciones externas al repositorio
no están verificadas. Publicar este respaldo no acredita despliegue ni aceptación
operativa de los ambientes. Para integrar hacia ramas de ambiente, conservar el
orden Auth → RUND indicado arriba.

## Avance y punto para retomar

Hay **11 pasos principales completados localmente** y **58 cortes técnicos desde
el merge (38–95)**. El paso 12 y la aceptación 12.5d.2 siguen abiertos. Quedan
**5 frentes**, detallados en el [mapa de cierre](PENDIENTES-CIERRE-INDEPENDENCIA.md):
aislamiento de propietarios, consumidores históricos, integraciones con otros
módulos, instalaciones/activación y aceptación integral/retiro final de PTA.
El número de cortes no permite calcular un porcentaje o tiempo restante fiable.

Para continuar, leer la sección 95 y ese mapa. El siguiente trabajo técnico es
preparar la sustitución del escritor masivo Auth por operaciones propietarias
reanudables, preservando soportes, reglas, resultados y recuperación por fila, sin
activar todavía la ejecución remota. Siguen pendientes navegador real, aceptación
por instalación, resolución humana, otros rechazos e intervalo Auth–SMTP. Esta
preparación de push no inicia el punto 96 ni cierra esos frentes.

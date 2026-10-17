# Punto de guardado para push y continuación: corte 91

Fecha: 2026-10-16. Rama: `feat/agregar_modulo_rund`.
Commit de partida: `f1d91d35f9ef5af7126474b8b68357d5599c7ac6`.

El avance está preparado para guardarlo como commit y publicarlo en esta rama de
funcionalidad para respaldo/revisión. La implementación termina en el punto 91 de
[ESTADO-MIGRACION-MICROSERVICIO.md](ESTADO-MIGRACION-MICROSERVICIO.md).
Preparar este guardado no añade otro punto técnico o certifica un despliegue.

## Alcance y estado conservado

- **54 cortes técnicos locales desde el merge**, secciones 38–91; **11 pasos
  principales completados localmente**. El paso 12 y la aceptación 12.5d.2 siguen
  abiertos, con **5 frentes pendientes** en el
  [mapa de cierre](PENDIENTES-CIERRE-INDEPENDENCIA.md).
- El conjunto pendiente desde el commit de partida incluye los puntos 81–91:
  validación de vigencia propietaria en Auth, journal/conciliación del correo,
  revisiones/asignación/cierre, diagnóstico, omisión y revisión de incertidumbre,
  cliente/panel/bandeja y entrada opcionales, y recorrido HTTP integrado.
  Código, pruebas, migraciones 017–021, contratos y evidencias viajan juntos.
- La aplicación/compensación de identidad Auth conserva valores por defecto false.
  Los módulos manual/correo/revisiones RUND siguen fuera de AppModule. El banco
  activo no proporciona cliente o bandera manual y no monta la bandeja/entrada.
- Se conservan el escritor vigente, otras entradas y el RUND embebido en PTA.
  El paquete también contiene ajustes activos de Auth y comprobaciones del
  consumidor opcional, descritos en los contratos; no se presenta todo el diff
  como documentación o cambios inactivos.

Manifiesto completo: [corte-91-rund.paths](corte-91-rund.paths).
Revisión del paquete: [revision-push-corte-91.json](revision-push-corte-91.json).
Comprobación de este guardado: [validacion-push-corte-91.json](validacion-push-corte-91.json).
El manifiesto incluye archivos nuevos sin seguimiento. Guardar solo los archivos
abiertos en el IDE dejaría incompleto el commit.

## Validación disponible

Se contrastaron las **322 huellas** de la evidencia técnica
[validacion-recorrido-http-revisiones-rund.json](validacion-recorrido-http-revisiones-rund.json):
todas coincidían antes de preparar este guardado. Después solo cambian, dentro de
esas fuentes, los enlaces de guardado en el estado general y PRIMER-PUSH.md. La
evidencia técnica original permanece intacta. No se repiten suites o builds por
estos cambios documentales; la comprobación de guardado registra las excepciones.

| Alcance | Última validación de las fuentes conservadas |
|---|---|
| Integración RUND/Auth/PostgreSQL, corte 91 | 689 comprobaciones, conservando las 687 anteriores; clúster temporal eliminado. |
| Entrada de revisiones, corte 91 | 22 escenarios HTTP, 11 por modo directo/prefijo, con React/jsdom y clientes productivos; cookie y proxy de prefijo simulados. |
| Compilación/comprobación, corte 91 | Builds RUND/Auth y TypeScript del MFE correctos. |
| MFE RUND, evidencia conservada | 33 archivos / 488 pruebas y build aislado correctos. |
| Backend RUND, evidencia conservada | 89 suites / 1.725 pruebas; no es una ejecución nueva de este guardado. |
| Auth, evidencia conservada | 8 suites / 228 pruebas de identidad/sesión; no es toda la suite Auth. |
| Gateway HTTP, evidencia conservada | 31 comprobaciones con AppModule real y upstream/auditoría ficticios. |
| Shell RUND/sesión, evidencia conservada | 7 archivos / 80 pruebas y 9 controles HTTP de sesión. |

El shell conserva **586 diagnósticos globales previos de TypeScript** y el fallo
global previamente documentado de `disciplinary.service.spec.ts`, `jest is not defined`.
No se resolvieron ni se repitieron esos controles globales en este guardado. Se puede
respaldar/revisar la rama; una política que exija todos los controles globales en verde
necesitará resolver esos pendientes antes de integrar.

La revisión comprueba imports locales resolubles, exclusiones, marcadores de conflicto
y firmas concretas de secretos. No es una auditoría exhaustiva de credenciales. No
incluye .env reales, dependencias, builds, uploads, logs o temporales. No se aplican
migraciones a bases existentes, construyen imágenes o habilitan funcionalidades.
La aceptación de navegador/instalación sigue pendiente antes de activar.

## Guardar y publicar el conjunto

Desde la raíz, comprobar la rama y regenerar el manifiesto si cambió algún archivo:

```powershell
git branch --show-current
node scripts/review-rund-push-checkpoint.cjs --checkpoint=91
```

La rama debe ser `feat/agregar_modulo_rund`; `findings` y `outsideCut` deben estar
vacíos en el reporte. Si cambió código, sus pruebas correspondientes deben pasar
antes del commit. El verificador no ejecuta suites, staging, commit o push.

Preparar y revisar todo el paquete:

```powershell
git add --pathspec-from-file=docs/rund/corte-91-rund.paths
git diff --cached --stat
git diff --cached --check
git diff --cached
```

Cuando el diff preparado corresponda al alcance revisado y no tenga errores:

```powershell
git commit -m "feat(rund): guardar independencia y revisiones de correo hasta corte 91"
git push origin feat/agregar_modulo_rund
git status --short
```

Un push publica commits: los cambios sin commit no se suben. El agente no ejecutó
staging, commit o push. La referencia remota local coincidía con HEAD al preparar
este guardado; no se hizo fetch ni se verificó el remoto en vivo. Si el push es
rechazado por cambios remotos, revisar/integrarlos y validar antes de volver a publicar;
no forzar la actualización del remoto.

Los ocho workflows versionados solo escuchan push a dev/qa/pre/prod. Esta rama no
coincide con esos disparadores. No se inspeccionan automatizaciones externas al
repositorio; publicar para revisión no equivale a desplegar o certificar los ambientes.

## Retomar después

Leer la sección 91, este guardado y el mapa de cierre. El siguiente trabajo local es
revisar preview/preparación manual sin escritura remota. La entrada opcional ya tiene
recorrido HTTP local comprobado, pero siguen navegador real y aceptación/configuración
por instalación antes de habilitarla.

También continúan resolución humana sin evidencia adicional, otros rechazos,
intervalo Auth–SMTP, otros canales/propietarios y los demás frentes. No se inicia
el punto 92 al preparar este push ni se retira RUND de PTA.

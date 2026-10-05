# RUND: desplegar otros ajustes con la ampliación documental aplazada

## Estado actual: apagada por defecto

**Puedes continuar el despliegue habitual sin configurar OpenKM ni las variables
de la ampliación documental.** `RUND_DOCUMENTAL_ENABLED` vale `false` por defecto
en código y Compose. No necesitas agregarla al `.env` para mantenerlo así.

Mientras esté apagada:

- Los soportes de edición/cambio de estado conservan su almacenamiento y flujo
  anteriores; no pasan al nuevo expediente ni exigen OpenKM.
- El CRUD F010 mantiene su selección de proveedor, permisos locales y rutas previas.
  Listados y lecturas existentes siguen disponibles según sus permisos.
- No se prepara la estructura nueva ni se habilita gestión TRD o migración a OpenKM.
  El navegador oculta el botón nuevo y los avisos de configuración pendiente.
- OTP y envío de autogestión conservan el contrato anterior, sin exigir la nueva
  política configurada ni leer archivos de políticas pendientes.
- Los scripts DEV/QA/PRE/PROD no agregan el overlay ni sus comprobaciones nuevas.
  Conservan sus comandos habituales, incluyendo los que usan `down`.

No incorporar `.env.rund-documental.example` por ahora. No hay que mover archivos
ni aplicar la migración 665 para usar el modo aplazado. Esa migración es aditiva
si el procedimiento general de despliegue la aplica; no cambia referencias ni archivos.
Se mantienen las condiciones previas de cada servidor, incluida su persistencia;
desactivar esta ampliación no corrige almacenamiento efímero preexistente.

El resto de esta guía corresponde a la **activación futura**, cuando se retome la HU.
Activarla exige el valor exacto `RUND_DOCUMENTAL_ENABLED=true` (minúsculas, sin espacios), además de preparar
almacenamiento y políticas según corresponda.

## Activación futura: almacenamiento provisional

El código permite almacenamiento local persistente mediante la API de RUND sin
credenciales OpenKM. F011 necesita validación contra la instancia real; las TRD y
la política institucional siguen pendientes. No hay disposición física automática.

## Subir al repositorio

Versionar código, migración, pruebas y ejemplos. No subir `.env` reales, documentos
ni respaldos. Git y el contexto Docker académico excluyen configuraciones privadas
y uploads. El push no ejecuta una migración documental desde esta implementación.
Los workflows existentes publican imágenes en las ramas de ambientes: revisar si
el servidor tiene automatizaciones externas que las despliegan. El nuevo workflow
`validate-rund-documental.yml` es independiente y no condiciona esas publicaciones.

**Antes de activar la ampliación en servidores sin OpenKM hay que configurar LOCAL y disco
persistente.** QA/PRE/PROD conservan deshabilitada la escritura local por defecto.
Subir código por sí solo no habilita las cargas documentales allí.

## Local, ejecutando Node directamente

Incorporar en `backend/academic-work-plan-service/.env`, conservando las demás variables:

```dotenv
RUND_DOCUMENTAL_ENABLED=true
RUND_DOCUMENT_PROVIDER=LOCAL
RUND_DOCUMENT_ALLOW_LOCAL=true
RUND_DOCUMENT_LOCAL_ROOT=
RUND_TRD_POLICY_FILE=
RUND_PRIVACY_POLICY_FILE=
```

Arrancar desde la carpeta del servicio conserva `./uploads`. No cambiar la raíz
sin copiar y verificar antes los archivos existentes. El frontend no necesita
credenciales ni variables OpenKM.

## Docker en DEV, QA, PRE y PROD

Probar primero en QA. Cada ambiente usa su propia carpeta y base de datos.
Requisitos: Node.js 20 o posterior en el host y Docker Compose v2 actualizado.

1. Identificar el contenedor académico y todos sus uploads. Pausar cargas durante
   respaldo, copia, comparación y recreación. Respaldar base de datos y archivos.
2. Exportar uploads internos a un directorio privado persistente mientras el
   contenedor todavía existe. Si ya usa un bind persistente, conservar su carpeta.
   No montar una carpeta vacía sobre históricos ni eliminar el contenedor de origen.
3. Crear una carpeta privada para políticas; puede estar vacía hasta su aprobación.
   Verificar permisos de lectura/escritura de uploads para el usuario del contenedor.
4. Incorporar [`.env.rund-documental.example`](../../.env.rund-documental.example)
   al `.env.dev`, `.env.qa`, `.env.pre` o `.env.prod` existente. Sustituir las dos
   rutas de ejemplo por directorios absolutos reales. No reemplazar el `.env`
   completo ni subirlo a Git; conservar DB, JWT y demás configuración.
5. Verificar/aplicar mediante el procedimiento del ambiente la migración
   [`665_rund_categorias_expediente.sql`](../../db/migrations/665_rund_categorias_expediente.sql).
   Requiere el esquema documental previo; agrega categorías sin mover archivos.
6. Desde la raíz del repositorio ejecutar, sustituyendo `qa` según corresponda:

   ```bash
   node scripts/check-rund-documental-deploy.cjs --environment qa --verify-copy
   ```

   Lee el `.env` del ambiente y detecta `RUND_DOCUMENTAL_PERSISTENT=true`. Admite
   `--env-file RUTA`. No copia archivos, inicia contenedores ni imprime credenciales.
7. Con comprobación satisfactoria y cargas aún pausadas, actualizar sin `down`
   previo. Ejemplo para compilar y actualizar exclusivamente el backend en QA:

   ```bash
   bash deploy.qa.sh rebuild-service academic-work-plan-service
   ```

   Publicar también PTA mediante el procedimiento habitual. Verificar listado,
   descarga histórica, carga y preparación de expediente con una cuenta autorizada.

Con `RUND_DOCUMENTAL_ENABLED=true`, la bandera `RUND_DOCUMENTAL_PERSISTENT=true` incorpora el overlay
[`docker-compose.rund-documental.yml`](../../docker-compose.rund-documental.yml)
en los cuatro scripts `deploy.dev/qa/pre/prod.sh`. Antes de `up/create`, verifican
el montaje actual o comparan cada archivo original con la copia por tamaño y SHA-256.
Un fallo bloquea la recreación; la compilación puede haberse ejecutado previamente.

Con protección activa los wrappers bloquean `down/rm`: necesitan conservar el
contenedor para compararlo en la siguiente ejecución. Usar actualizaciones
incrementales y `stop` para una parada sin eliminación. Los comandos que hacen
`down` internamente, como `rebuild-fresh`, también se detienen. Con la bandera
desactivada se mantienen los comandos anteriores.

### Interpretar el resultado

- Código 0 y `persistenceVerified: true`: montaje conservado o copia verificada.
  Es una comprobación puntual; mantener pausadas las cargas hasta terminar.
- `UPLOADS_COPY_MISMATCH`: corregir la copia conservando el origen y repetir.
- Código 2, `NO_CURRENT_CONTAINER_VERIFY_HISTORICAL_BACKUP`: no existe contenedor
  con el que comparar. Para una instalación nueva, el operador debe confirmar que
  no hay históricos ni respaldos pendientes y realizar el arranque inicial mediante
  Compose con el overlay. En una recuperación, conciliar antes la base y el respaldo.
- `DOCKER_CHECK_FAILED`: revisar acceso al daemon, versión Compose y archivos
  privados. Su salida se oculta para no revelar secretos.

`--configuration-only` revisa el modelo Compose; no certifica persistencia. El
comprobador tampoco valida permisos efectivos del disco, esquema SQL, restauración
de respaldos ni conectividad OpenKM. Estas verificaciones requieren el ambiente real.

### Docker local y otras composiciones

El compose local hereda el montaje de uploads de DEV; conservarlo si ya se usa.
Los wrappers locales no incorporan automáticamente el overlay mediante la bandera.
Para otra carpeta, combinar `-f docker-compose.local.yml -f docker-compose.rund-documental.yml`
conservando las variables de red/sufijo del despliegue local y verificando la copia.
El comprobador admite `--environment local --persistent --verify-copy`.
Los modos `base` y `backend` requieren también incluir el overlay explícitamente.

## Activar OpenKM y políticas posteriormente

Configurar URL privada y cuenta técnica en el backend. Probar permisos, carpetas,
cargas y descargas reales en QA. Cambiar a `RUND_DOCUMENT_PROVIDER=OPENKM` y
`RUND_DOCUMENT_ALLOW_LOCAL=false`. Mantener el volumen para históricos: no se migran
ni borran al arrancar. La utilidad de copia verificable se ejecuta por separado.

Mantener vacíos los archivos TRD/privacidad mientras no haya políticas aprobadas.
Antes de configurar el aviso de privacidad, actualizar también la interfaz: se
exigirá la huella del aviso aprobado. Sin configurar esa política, el formulario
anterior sigue siendo compatible y la auditoría identifica su canal de aceptación.
Formatos y procedimientos en
[Configuración y operación documental](REQ-RUND-F013-configuracion-y-operacion.md).

## Validación del avance

- Modo aplazado: pruebas de rutas históricas, soportes de edición/estado, bloqueo
  de operaciones nuevas y OTP/envío sin políticas configuradas aprobadas.
- 33 configuraciones Compose aprobadas, incluidas 11 sin ninguna configuración
  nueva; 63 pruebas de despliegue y 22 de interfaz aprobadas.
- Última revisión del backend RUND: 36 suites y 386 pruebas aprobadas. PostgreSQL:
  7 escenarios aislados aprobados, incluido el CRUD anterior con la ampliación
  apagada. Los registros documentales reales se compararon antes/después sin cambios.
- La matriz Compose comprueba tanto el modo aplazado sin configuración nueva como
  la activación LOCAL/OPENKM en base, local, DEV, QA, PRE, PROD, backend y GHCR.
- Las pruebas cubren persistencia, wrappers, selección de servicios y funcionamiento
  anterior con la ampliación apagada, además del modo activado.
- Backend y frontend compilados; pruebas documentales/autogestión detalladas
  en la guía de operación.

OpenKM real y los montajes de cada servidor necesitan validación. Este avance no
ejecutó despliegues remotos.

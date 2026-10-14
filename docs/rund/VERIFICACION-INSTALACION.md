# Verificación de prerrequisitos de RUND por ambiente

Paso **12.5d.2**: primera revisión operativa realizada el 2026-10-14. La herramienta del
12.5d.1 conserva sus pruebas con clúster temporal. Se inspeccionó la conexión Auth local
en solo lectura y se sondearon los orígenes documentados de DEV, QA, PRE y PROD sin
credenciales. Las instalaciones completas todavía no están verificadas. Esta revisión
no activa banderas, inicia servicios, aplica migraciones ni retira el RUND de PTA.

## Resultado operativo actual (12.5d.2)

| Alcance examinado | Resultado observado | Pendiente |
| --- | --- | --- |
| Conexión configurada en `backend/auth-service/.env` | 67 comprobaciones READ ONLY: 14 correctas, 42 fallidas y 11 sin verificar. Faltan las tablas RUND del alcance y las tablas Auth de 667/668; el catálogo RUND tampoco cumple el contrato. | Confirmar la configuración/conexión que debe usar RUND y preparar sus migraciones en el destino correcto. La base inspeccionada es la de Auth; no se infiere otra base. |
| RUND local | No existe `backend/rund-service/.env`; `/health/ready` no respondió en el puerto de loopback esperado 3016. | Confirmar modo de ejecución y configuración efectiva. La ausencia de ese archivo no demuestra ausencia de configuración por otros mecanismos. |
| Docker local | `docker ps` no pudo acceder al endpoint del motor, también fuera de la sesión restringida. | No se pudo inspeccionar contenedores o digests; no se inició Docker. |
| DEV, QA, PRE documentados | Tres GET por origen sin respuesta HTTP dentro de cinco segundos. | Confirmar red/VPN, vigencia del origen y acceso de lectura a la instalación. |
| PROD documentado | Los GET no resolvieron el nombre (`ENOTFOUND`). | Confirmar DNS/red y origen vigente; no se recibió respuesta de la aplicación. |

Los resultados remotos describen la conectividad desde este equipo en ese momento;
**no demuestran que los ambientes estén caídos o tengan regresiones**. Tampoco prueban
qué revisión o imagen está desplegada. Los orígenes proceden de `DEPLOY_RUNBOOK.md` y
su vigencia/propiedad no se certificó. No se leyeron secretos ni bases remotas.

Evidencia: `revision-operativa-ambientes.json`, `revision-instalacion-local.json` y
`revision-endpoints-{dev,qa,pre,prod}.json`. El reporte local sí indica lectura de un
`.env` real y de una base existente; no debe confundirse con los fixtures anteriores.
Las transacciones terminaron con `ROLLBACK`, sin DDL/DML ni reparación automática.
Los 30 archivos de fuentes/SQL registrados en las evidencias previas siguen idénticos.

Antes de aplicar cambios, confirmar el destino propio de RUND y revisar recuperación,
prerrequisitos y alcance de 001–007 y 667/668. La falta de tablas en la conexión Auth
no autoriza a aplicar indiscriminadamente todos los SQL globales. No se creó `.env`
de RUND, aplicaron migraciones ni modificaron archivos reales de configuración.

## Sondeo público reproducible, sin sesión

```powershell
node scripts/review-rund-public-endpoints.cjs --environment dev --origin http://4.156.71.181
```

Usar una etiqueta `local|dev|qa|pre|prod` y el origen explícito que corresponda al
destino vigente. Rechaza usuario/contraseña, consulta, fragmentos o rutas en el origen.
Solo hace GET a readiness RUND mediante gateway y a los `remoteEntry.js` de RUND y
Personas; nunca sigue redirecciones ni envía cookies/tokens. Limita tiempo y tamaño,
mantiene la validación TLS y no guarda cuerpos ni errores privados.

No trata HTML del SPA con código 200 como un remote, ni salud de otro servicio como
RUND. Una respuesta con 401/403 queda sin verificar; no cambia la autenticación para
conseguir acceso. El hash de un remote observado permite comparar ese archivo local,
pero no demuestra exports/chunks completos, revisión Git, digest o todos sus recursos.
Una diferencia de hash tampoco demuestra por sí sola un error funcional.

Genera `revision-endpoints-<ambiente>.json`; devuelve error si algún endpoint no pudo
observarse con el contrato limitado. `activationReadiness` continúa en `not_verified`.
Validación del sondeador: **14 pruebas**, con respuestas ficticias y servidores de
loopback, mediante `node --test scripts/verify-rund-public-endpoints.test.cjs`.

## Inventario del repositorio

Desde la raíz, con las dependencias del repositorio instaladas:

```powershell
node scripts/review-rund-installation.cjs
```

Genera `docs/rund/revision-artefactos-repositorio.json`. No carga `.env`, abre conexiones,
invoca Docker ni consulta GHCR. Registra presencia, tamaño y SHA-256 de las 12 migraciones
del alcance y 11 archivos de compilación relevantes de RUND, Auth, gateway, shell y
Personas. Incluye los Compose y workflows de los cinco destinos y las plantillas de
imagen esperadas. La huella identifica el archivo examinado; no demuestra que se haya
compilado desde las fuentes actuales ni que sus exports/chunks estén completos.

En esta revisión se encontraron esos 12 SQL y 11 archivos locales. Esto no identifica
la imagen, digest, commit o frontend publicados en ninguna instalación. Cada destino
permanece con `installationChecked: false` y `publishedArtifactsVerified: false`.

## Diagnóstico de base, solo lectura y conexión explícita

Ejecutarlo desde el contexto que corresponda al destino, con una cuenta de revisión
autorizada y variables `PGHOST`, `PGPORT`, `PGUSER`, `PGDATABASE` y su autenticación
proporcionadas por el mecanismo de secretos del ambiente. No incluir credenciales en
la línea de comandos ni en evidencias. La etiqueta `--environment` es declarada por
el operador: la herramienta no descubre ni certifica que esa conexión sea del destino.
La configuración TLS de PostgreSQL debe corresponder al ambiente; no se deshabilita
la validación de certificados en el verificador.

```powershell
node scripts/review-rund-installation.cjs --database --environment local
```

Sustituir `local` por `dev`, `qa`, `pre` o `prod` en el contexto de ese ambiente.
No hay valores de conexión predeterminados: exige los cuatro parámetros PG indicados
y no carga archivos `.env`. Usa las dependencias `pg` de `backend/rund-service`.
Configura la conexión con lectura por defecto, abre una transacción
`REPEATABLE READ READ ONLY` y termina con `ROLLBACK`. Cada consulta tiene límite de
cinco segundos y espera de locks de un segundo; un timeout queda sin verificar.
No ejecuta procedimientos ni triggers de negocio, `nextval`, DDL o DML.

Comprueba un alcance delimitado:

- Tablas esperadas y acceso SELECT/USAGE del rol de revisión.
- Tipos y nulabilidad de columnas críticas de identidad, referencias y proyección.
- Tres triggers de la 668: tabla, habilitación para operaciones normales, función,
  eventos, condición y columna de actualización esperados.
- Restricciones seleccionadas del historial de versiones y configuración básica de
  la secuencia de tarjetas. No consume ni modifica números de secuencia.
- Los 16 permisos activos del catálogo asociados al módulo RUND activo. No concede
  permisos ni determina los roles efectivos de cada usuario.
- Evidencia del historial en `auth.migrations_db_log` y/o `rund.migrations_db_log`,
  compatible con los alias por ruta/basename. No crea las tablas si faltan.
- Conteos de perfiles sin persona canónica, sin periodo y grupos ambiguos por persona
  y periodo normalizado. No publica IDs/nombres, importa, enlaza o fusiona perfiles.

Genera `docs/rund/revision-instalacion-<ambiente>.json`. Solo publica resultados,
conteos, nombres de requisitos conocidos y códigos SQLSTATE; omite los mensajes privados
del driver, host, usuario, contraseña y filas de personas/documentos.
Un fallo de consulta se aísla con savepoint y queda `not_verified`, sin convertirlo en
un resultado vacío correcto. El rol de revisión debe poder leer las tablas del alcance;
sus privilegios no prueban los del usuario utilizado por la aplicación.

## Interpretación de resultados

| Resultado | Significado |
| --- | --- |
| `pass` | Esa comprobación concreta coincide con el contrato revisado. |
| `fail` | Falta o no coincide un requisito comprobado. |
| `review_required` | Hay perfiles/periodos que requieren evaluación; no se reparan automáticamente. |
| `not_verified` | No hubo evidencia suficiente, faltó historial o no pudo completarse una consulta. |
| `checked_scope_passed` | Pasaron todas las comprobaciones de base del alcance; no certifica activación. |
| `requires_review` | Hay al menos un resultado de base distinto de `pass`. |

El modo offline termina con código cero si pudo generar el inventario. El modo de base
devuelve código distinto de cero ante requisitos pendientes o un fallo de conexión.
**`activationReadiness` permanece siempre en `not_verified`.** Un registro de migración
no demuestra que su SQL se ejecutara correctamente; tampoco compara el hash del SQL
aplicado. Se inspeccionan columnas/restricciones concretas, no todo el DDL ni el cuerpo
de cada función. Nunca se debe reparar el historial solo para obtener un resultado verde.

La ruta RUND `/health/ready` comprueba conexión mediante `SELECT 1`; no reemplaza este
diagnóstico ni certifica el esquema. No se cambió su contrato durante este punto.

## Evidencia operativa que todavía falta (12.5d.2)

La primera lectura anterior identifica pendientes; **el paso 12.5d.2 continúa abierto**.
Los archivos `.env.dev`, `.env.qa`, `.env.pre` y `.env.prod` no están presentes en este
checkout y no se obtuvo un contexto de lectura de sus contenedores/bases. Conocer una
URL pública no proporciona esos accesos. No se sustituyen con la conexión local.

### Localización de accesos revisada en el proyecto (2026-10-14)

Se amplió la búsqueda por solicitud del usuario, sin requerirle que identifique de nuevo
los ambientes. Se revisaron documentación, scripts, los ocho workflows, nombres de
variables de configuración y candidatos ocultos/ignorados del checkout; no se imprimieron
valores privados ni se recuperaron secretos del historial de Git.

| Ambiente | Definición de despliegue encontrada | Configuración operativa esperada |
| --- | --- | --- |
| DEV | `DEPLOY_DEV.md`, `deploy.dev.sh`, `docker-compose.dev.yml` y overlays/workflows DEV | `.env.dev` en el directorio del proyecto del servidor DEV. |
| QA | `DEPLOY_QA.md`, `deploy.qa.sh`, `docker-compose.qa.yml` y overlays/workflows QA | `.env.qa` en el directorio del proyecto del servidor QA. |
| PRE | `DEPLOY_PRE.md`, `deploy.pre.sh`, `docker-compose.pre.yml` y overlays/workflows PRE | `.env.pre` en el directorio del proyecto del servidor PRE. |
| PROD | `DEPLOY_PROD.md`, `deploy.prod.sh`, `docker-compose.prod.yml` y overlays/workflows PROD | `.env.prod` en el directorio del proyecto del servidor PROD. |

La evidencia de esa ubicación es `DEPLOY_RUNBOOK.md`, secciones 1–2: requiere el proyecto
clonado en el servidor y su archivo `.env.<ambiente>`. Los cuatro `deploy.*.sh` cargan ese
archivo con `source`; no establecen una conexión SSH ni seleccionan un contexto Docker
remoto. No se ejecutaron los scripts para inspeccionarlos.

Los cuatro archivos no existen en esta copia, no están versionados y `.gitignore`
(líneas 191–194 al realizar esta revisión) los excluye expresamente. Tampoco se encontraron
archivos de acceso SSH/SFTP, infraestructura como código o pipeline de conexión remota
en el alcance revisado. Las menciones SFTP del diccionario de datos son valores de una
columna de negocio, no una configuración de acceso a los servidores.

Los **ocho workflows** usan runners `ubuntu-latest` y acciones de checkout, login GHCR,
metadata y build/push. Los de backend referencian `GITHUB_TOKEN`; los de frontend añaden
las referencias de configuración Microsoft del build. No contienen pasos SSH/SCP ni
despliegue a servidores. El token de GHCR no demuestra acceso a las bases o contenedores.
Los campos `AZURE_*` documentados para correo Microsoft Graph tampoco identifican
credenciales de administración de las máquinas.

**Conclusión acotada:** el proyecto sí define los ambientes y el procedimiento, pero
esta copia no contiene un mecanismo utilizable de acceso a sus instalaciones. No se
consultó la configuración privada remota de GitHub ni se inspeccionaron claves personales
fuera del proyecto, por lo que no se afirma que tales accesos no existan en otros lugares.
El siguiente lugar documentado para revisar es la copia del proyecto dentro de cada
servidor; actualmente no hay una conexión identificada para leerla desde este equipo.
Evidencia adicional: `revision-localizacion-accesos.json`. Este resultado no cierra
12.5d.2 ni añade un paso principal completado al conteo.

Para **cada** destino, registrar de forma verificable la revisión backend/frontend y
el digest de imágenes realmente publicados, su composición efectiva, esquema e historial
resultantes y los privilegios del rol real de aplicación. Comprobar por el proceso del
ambiente la sesión JWT/cookies y revocación, las rutas internas con credenciales correctas
e incorrectas, la persistencia/OpenKM y los recorridos de PTA, Programación, Personas,
portal y banco RUND. No adjuntar originales ni credenciales a los reportes.

Estos resultados no se deducen de un build local o de una matriz de CI. También queda
por validar el orden de arranque/publicación: los scripts actuales pueden iniciar
servicios antes de las migraciones. La guía de activación conserva esa limitación.

## Prueba aislada del verificador

```powershell
node --test scripts/verify-rund-installation.test.cjs
```

Requiere binarios locales de PostgreSQL (configurar `PG_BIN_DIR` cuando corresponda).
Crea un clúster nuevo en un directorio temporal, carga el DDL Auth y las migraciones
reales con datos ficticios, y cierra/elimina únicamente ese clúster al terminar.
No consulta bases existentes. Valida diagnóstico de errores, conservación de datos,
rechazo de escrituras incluso como administrador, historial, permisos y salida privada.
La evidencia está en `validacion-verificador-instalacion-local.json`.

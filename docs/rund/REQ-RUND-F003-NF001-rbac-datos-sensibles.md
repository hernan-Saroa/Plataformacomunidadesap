# Perfil RUND: protección de datos sensibles por roles

Fecha: 7 de septiembre de 2026. Trazabilidad: REQ-RUND-F003 y REQ-RUND-NF001.

## Resultado y alcance

Se completó el desarrollo de las seis subtareas de la historia entregada y su
verificación local. Se corrigieron accesos alternativos al perfil, se documentó
la matriz confirmada por el responsable y se prepararon pruebas y evidencia
de integración. La revisión toma los criterios y los seis títulos de la captura;
no se recibió el contenido interno de cada subtarea ni el ERS TD-FO-019 completo.
No se cambiaron estados en el gestor de tareas.

La protección cubre el perfil RUND, sus soportes y los datos docentes incluidos
en respuestas PTA. Carpeta Digital, gateway y cliente compartido tienen ajustes
necesarios para proteger esas mismas vías. No se cambiaron reglas de horas,
cupos, aprobación PTA, certificados o programas.

## Entrega por subtarea

| Subtarea | Entrega | Evidencia principal |
|---|---|---|
| EFDS-1801 — Enmascaramiento | Cédula parcial, puntaje nulo, históricos/soportes protegidos; vistas compatibles | `banco-docentes-sensitive-data.spec.ts`, `banco-docentes-sensitive-access.spec.ts`, `rund-autogestion.test.tsx` |
| EFDS-1802 — Diseño funcional y técnico | Este documento: flujos, decisiones, auditoría, pruebas y puesta en marcha | Secciones siguientes |
| EFDS-1804 — Matriz y catálogo | Roles autorizados y catálogo explícito; tratamiento de alias y originales | Matriz confirmada y catálogo central |
| EFDS-1803 — Auditoría | Actor, fecha/hora, campo, perfil/recurso y resultado; entrega condicionada al registro | Pruebas de auditoría, HTTP y PostgreSQL real |
| EFDS-1805 — Control RBAC | Autorización en servidor independiente del permiso general; archivos y sesiones protegidos | Pruebas de roles, permisos, JWT y descargas |
| EFDS-1806 — Casos de prueba | Casos positivos, negativos y de regresión ejecutables | Matriz de pruebas, comandos e informes JSON |

## Matriz de visibilidad confirmada

El responsable aprobó acceso completo exclusivamente para
`GESTION_PROFESORAL` y `SUPER_ADMIN`.

| Rol de sesión | Cédula | Puntaje salarial | Original documental RUND |
|---|---|---|---|
| `GESTION_PROFESORAL` (GGP) | Completa | Completo | Permitido y auditado |
| `SUPER_ADMIN` | Completa | Completo | Permitido y auditado |
| `ADMIN` | Parcial | `null` | Restringido |
| Administrador territorial | Parcial | `null` | Restringido |
| `DOCENTE`, incluso su propio perfil | Parcial | `null` | Restringido |
| Consultores y cualquier otro rol | Parcial | `null` | Restringido |

Los permisos `banco-docentes.rund.view`, `manage`, `edit`, `validate`, etc.
autorizan operaciones; por sí solos no conceden visibilidad completa. Con
varios roles basta uno de los dos autorizados. Se normalizan mayúsculas y
roles `{ code }`. `GGP` es la denominación funcional, no un tercer código.
Los nombres de roles territoriales/consultores en pruebas representan cualquier
rol fuera de la lista autorizada; no son un nuevo catálogo de roles de la base.

Esta matriz no concede acceso a perfiles ajenos ni sustituye los permisos de
ruta. La autogestión usa una sesión OTP verificada y recibe visibilidad
restringida. Un anónimo no puede descargar originales.

## Catálogo y comportamiento funcional

| Dato | Representaciones | Tratamiento restringido |
|---|---|---|
| `DOCUMENTO_IDENTIDAD` | `documento_identidad`, `documentoIdentidad`, `documentNumber`, `document_number`, `num_identificacion`, `identificacion`, `documento`, `document`, `numero_documento`, `cedula`, `docente_identificacion`, `documento_docente`, `Documento de identidad` | Últimos cuatro caracteres; anteriores sustituidos por `*`. Hasta cuatro caracteres: ocultación total |
| `PUNTAJE_SALARIAL` | `puntaje_salarial`, `puntajeSalarial` y variantes de mayúsculas, espacios y acentos | `null` en API; información restringida en la vista |
| Soportes | PDF, Excel original, versiones anteriores, copias y rutas históricas; nombres/URLs que pueden incluir cédulas | Original no entregado; metadatos protegidos. Se conservan categoría, estado, versión e identificadores |

El catálogo central es
`backend/academic-work-plan-service/src/pta/banco-docentes/banco-docentes-sensitive-data.ts`.
Procesa objetos/arreglos anidados, tarjeta `{ campo, valor }`, valores
históricos `datoPrevio`/`datoNuevo`, alias SQL y snapshots JSON sin modificar
la fuente persistida. Los campos sensibles de tarjeta se marcan restringidos
y dejan de ser editables cuando existe ese atributo.

`proteccion_datos` informa `acceso_completo`, `campos_sensibles` y
`campos_enmascarados`. Los archivos usan `contenidoRestringido` en RUND y
`contenido_restringido` en Carpeta Digital.

Los originales se consideran sensibles porque pueden incluir cédula o puntaje
en su contenido. Ocultar HTML no redacta un PDF o Excel. Un rol restringido
mantiene las operaciones documentales que su permiso permita, pero no descarga
el original. Reclasificar un documento RUND conserva su condición RUND.
Los adjuntos generales conservan su tratamiento anterior.

Las URLs de originales en Carpeta Digital se identifican permanentemente por
su hash en los eventos de carga, consulta, reclasificación, validación o retiro.
Al eliminar el registro documental se conserva esa identificación: el archivo
físico que pudiera quedar no se convierte en un recurso público.

La carga masiva conserva filas, columnas y conteos, sustituyendo mensajes
libres que pueden repetir datos sensibles. Si la carga ya terminó y falla
la auditoría de lectura del resultado, devuelve un recibo sin detalles y
advierte consultar el listado antes de repetir la importación.

Al editar un perfil se toma la identidad de `auth.personas`: se acepta la
representación enmascarada de la misma cédula sin persistir los asteriscos.
Se rechaza cambiarla mediante otro alias. Se conservan los requisitos de
soporte, justificación, estado y período, y los cambios de contacto ordinarios.

## Flujos protegidos

- Listado, detalle, tarjeta por docente/persona, duplicados y unicidad.
- Bloques, soportes por vencer, diagnóstico documental e historial del perfil.
- Respuestas de creación/edición, previsualización/importación e historial de cargas.
- Documentos versionados, descarga de Excel, `/uploads/rund-documentos` y
  carpetas RUND históricas; copias registradas en auth verificadas antes de servirlas.
- Docentes disponibles y docentes anidados en respuestas PTA. Los catálogos
  sin datos sensibles mantienen su acceso anterior.
- Macro Docente: consultas internas/externas, permiso independiente y auditoría obligatoria.
- Soportes RUND incluidos en Carpeta Digital. El portal conserva acceso general
  y verifica el JWT opcional para decidir la visibilidad de RUND.
- Borradores, consulta y envío del perfil por autogestión.

## Autogestión

El enlace de invitación no es una credencial de sesión. Validar OTP genera un
secreto aleatorio de 32 bytes; la base conserva SHA-256 y expiración de dos horas.
Se verifican invitación, sesión y estado antes de leer/guardar borradores,
enviar perfil o cargar soportes. Otro OTP o una invitación renovada revocan
la sesión anterior. El OTP usado deja de ser reutilizable.

El tablero conserva enlace y nombre del invitado, sin OTP, hash de sesión o
datos sensibles del borrador. Producción nunca devuelve el OTP aunque falle
el correo. En desarrollo/pruebas se requiere explícitamente
`RUND_ENABLE_DEV_OTP=true`; el ejemplo de configuración usa `false`.

El formulario admite la respuesta desenvuelta por apiClient, conserva cambios
del borrador sobre el perfil guardado y no recupera puntajes anteriores del
estado del navegador. El servidor restaura una cédula enmascarada desde una
fuente confiable. Una invitación nueva no puede apropiarse del perfil de otro
docente por su cédula. Una invitación al correo alternativo conserva el
institucional registrado.

Después de actualizar, las sesiones antiguas deben validar OTP nuevamente.
Las invitaciones y borradores persistidos no se eliminan.

## Auditoría

La entrega ocurre después de persistir el evento. Los perfiles identificados
conservan `RundAprobacionLog`; Macro Docente conserva su bitácora.
`RundAccesoDatosLog` cubre recursos sin perfil, archivos, borradores, cargas
y docentes incluidos en respuestas PTA.

La tabla nueva registra `actor_id`, `roles`, `endpoint`, `recurso_id`,
`docentes`, `campos`, `resultado`, `ip` cuando está disponible y `createdAt`
con zona horaria. Resultados: `COMPLETO`, `ENMASCARADO`, `DENEGADO`.
Los archivos históricos se identifican por el SHA-256 de la ruta, evitando
copiar una cédula presente en ella. Autogestión registra
`AUTOGESTION:<id-invitacion>` como identidad verificada.

Los eventos de acceso guardan nombres de campos, no valores sensibles.
Los historiales operativos anteriores pueden contener snapshots: sus lecturas
aplican protección por rol. La bitácora nueva rechaza UPDATE, DELETE y TRUNCATE.
Se conservan los controles existentes de la bitácora del perfil. Estos controles
no impiden a un administrador de PostgreSQL modificar el esquema o sus triggers.

Crear/editar registra el acceso de su respuesta dentro de la transacción;
un fallo revierte la operación. Una lectura no entrega datos cuando no puede
auditar. Las descargas responden 503 ante ese fallo. Algunos fallbacks de
vistas existentes devuelven datos vacíos en lugar de un error HTTP.

El gateway conserva operación, usuario y resultado, omitiendo cuerpos,
consultas y secretos de URLs RUND en su auditoría general. El servicio que
consulta los datos es responsable del evento de acceso a campos sensibles.

Consulta administrativa de la tabla nueva, sin extraer valores sensibles:

```sql
SELECT actor_id, roles, endpoint, recurso_id, docentes, campos, resultado,
       "createdAt" AT TIME ZONE 'America/Bogota' AS fecha_hora_colombia
FROM academic_work_plan."RundAccesoDatosLog"
ORDER BY "createdAt" DESC LIMIT 100;
```

## Caché

El cliente no almacena respuestas RUND en IndexedDB y retira sus copias
históricas, incluyendo datos docentes anidados en PTA. No borra la cola de
cambios ni la caché de módulos ajenos. RUND requiere conexión para leer/guardar
y verificar permisos/auditoría; no simula un guardado exitoso sin servidor.
Las respuestas documentales usan `Cache-Control: private, no-store`.
El código no puede retirar archivos ya descargados por usuarios ni copias
históricas administradas por proxies externos.

## Casos de prueba

| Caso | Comprobación |
|---|---|
| SEC-01 | GGP/SUPER_ADMIN reciben valores completos y evento de acceso |
| SEC-02 | ADMIN/docente/territorial/consultor reciben máscara y nulo |
| SEC-03 | Rol desconocido o permiso general no eleva visibilidad |
| SEC-04 | Pertenencia del perfil, identificadores y datos ordinarios conservados |
| SEC-05 | Historial, tarjeta, bloques, soportes y errores no repiten originales |
| SEC-06 | Originales PDF/Excel denegados al restringido y completos al autorizado; URL antigua protegida después del retiro |
| SEC-07 | JWT inválido/anónimo no descarga; catálogo PTA general sigue accesible |
| SEC-08 | Fallo de auditoría impide entrega; transacción revierte cuando corresponde |
| SEC-09 | Invitación pública/OTP usado no son sesión; vencimientos verificados |
| SEC-10 | Borrador se reanuda sin persistir asteriscos ni recuperar puntaje |
| SEC-11 | Invitación/alias manipulados no cambian el perfil destinatario |
| SEC-12 | Caché RUND histórica retirada; certificados/catálogos conservados |
| SEC-13 | Logs generales omiten cuerpos sensibles y secretos de URL |
| SEC-14 | Migración repetible; fecha/hora; bitácora rechaza modificación/borrado |
| SEC-15 | Regresión PTA: horas, cupos, territoriales, solicitudes, aprobaciones, períodos y CRUD documental |

Las pruebas usan datos ficticios. PostgreSQL se verifica en una base temporal
vacía, creada y eliminada por el script. Chromium usa un origen temporal
independiente del navegador del usuario.

## Ejecución y evidencia

Desde `backend/academic-work-plan-service`:

```text
node node_modules/jest/bin/jest.js --runInBand
npm run build
```

Desde la raíz, después de compilar el servicio académico y auth-service:

```text
node scripts/verify-rund-sensitive-rbac.cjs
node scripts/verify-rund-browser-cache.cjs
```

Desde `apps/shell`, usando su Vitest local:

```text
node node_modules/vitest/vitest.mjs run src/test/rund-autogestion.test.tsx src/services/api/rundCachePolicy.test.ts
```

Resultados finales en `validacion-rbac-resumen.json`. También se ejecutaron
las suites de gateway y auth y las compilaciones de ambos, PTA y shell.
Auth declara `ts-jest` pero esta instalación no lo resuelve: se ejecutaron
sus pruebas con Jest/ts-jest instalados en el servicio académico, manteniendo
la configuración de auth. No se cambiaron dependencias o lockfiles.

Informes de integración:

- `validacion-rbac-integracion.json`: 8 comprobaciones PostgreSQL y JWT/HTTP.
- `validacion-rbac-navegador.json`: 5 comprobaciones Chromium/IndexedDB.
- `validacion-rbac-migracion-local.json`: migración local, conteos antes/después
  y consulta SQL de Carpeta Digital verificada.

La suite general del shell tiene un fallo preexistente en
`src/services/api/disciplinary.service.spec.ts`: usa `jest.fn()` bajo Vitest
(`jest is not defined`). La prueba y su configuración son iguales a HEAD.
Las otras cuatro suites pasan, incluidas las dos de RUND. No se corrigió esa
prueba de otro módulo como parte de esta historia.

## Migración y puesta en marcha

`db/migrations/428_complete_rund_sensitive_access.sql` es aditiva e idempotente:
crea la bitácora y agrega dos columnas de sesión a invitaciones. Se probó dos
veces en la base temporal y se aplicó a `esap_db` local. Se conservaron los
conteos: 531 registros docentes, 303 personas y 0 invitaciones. Son totales,
no el listado filtrado por período.

En otro entorno: aplicar primero la migración; publicar/reiniciar servicio
académico, auth-service, api-gateway, shell y remoto PTA con sus compilaciones.
Mantener `TYPEORM_SYNC=false`. Las rutas de archivos RUND deben atravesar los
servicios protegidos; cualquier proxy que sirva uploads directamente debe
ajustar esa exposición para no omitir la autorización del servidor.

No se desplegó producción ni se modificaron usuarios, roles o perfiles reales
en las pruebas. Esta evidencia local no sustituye la aceptación en el entorno
desplegado con su proxy, repositorio documental, correo y cuentas reales.

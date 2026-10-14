# Preparación de activación de Carpeta Digital y RUND

Estado: preparación de los pasos 12.4–12.5d.2 para local, DEV, QA, PRE y PROD, según el alcance
confirmado por el usuario. **No ejecuta ni autoriza por sí sola una activación
en un ambiente existente.** Las pruebas con datos ficticios están en
`validacion-vistas-carpeta-local.json`; la lectura real de 12.5d.2 se registra por separado
en `revision-operativa-ambientes.json`. Gateway, cookies, permisos, storage y datos del
ambiente destino todavía requieren validación allí. El paso 12 continúa abierto.

## Revisión previa del repositorio (12.5, 2026-10-14)

La revisión offline confirmó pendientes antes de usar esta secuencia en un ambiente:

- **Corregido en 12.5a:** los cuatro workflows `build-backend-{dev,qa,pre,prod}.yml` incluyen
  ahora `rund-service` en su matriz. Nombre y tag coinciden con sus overlays GHCR. Se validó
  la configuración localmente; todavía no se ejecutó la construcción/publicación en GitHub
  ni se consultó el registro.
- **Corregido y validado localmente en 12.5c:** `migrate.local.sh`,
  `migrate.service.local.sh` y `deploy.{dev,qa,pre,prod}.sh` usan `psql -X` con
  `ON_ERROR_STOP=1`. Se detienen ante el primer error SQL o de historial y propagan el
  fallo al despliegue. El éxito se anuncia después de registrar la migración; los dos
  alias históricos se insertan en una sola sentencia. Pasaron 58 pruebas con PostgreSQL
  temporal y 88 de despliegue simulado. Docker y las instalaciones reales no se ejecutaron.
- **Corregido y validado localmente en 12.5b:** la política especial del gateway cubre las
  rutas nuevas RUND/Carpeta Digital, sus originales y los destinos internos. Conserva la
  operación sin copiar cuerpos/tokens/identificadores a la auditoría general. Build,
  67 tests y 9 checks HTTP con upstream/auditoría ficticios correctos; falta publicar y
  comprobar el gateway de cada instalación.

Evidencia reproducible: `node scripts/review-rund-preactivation.cjs`, que escribe
`revision-preactivacion-repositorio.json` sin cargar `.env`, acceder a redes/bases ni
ejecutar despliegues. Su salida exitosa significa que generó la revisión, no que se
pueda activar. El alcance comprende local y los cuatro ambientes; todavía falta verificar
sus instalaciones y los artefactos que efectivamente se publiquen.

La revisión inicial no cambió workflows, runners de migración, guards ni servicios. Los
ajustes posteriores 12.5a–c añadieron RUND a las matrices, completaron la protección de
auditoría y corrigieron la propagación de fallos/registro de migraciones. La revisión
offline actual informa cero hallazgos dentro de esas comprobaciones; todavía no certifica
los prerrequisitos de una instalación. Evidencias del último punto:
`validacion-migraciones-local.json` y `validacion-migraciones-despliegue-local.json`.

Los SQL conservan sus propias transacciones: no se impone `--single-transaction` porque
hay scripts históricos con `BEGIN/COMMIT` y operaciones que requieren ejecutarse fuera
de una transacción. Un fallo puede dejar cambios ya confirmados; si falla el registro
después del SQL, también pueden existir cambios sin historial. Revisar ambos casos antes
de reintentar, sin marcar manualmente una migración como aplicada sin verificarla. Este
ajuste no repara registros incorrectos anteriores ni convierte el despliegue en atómico:
los servicios pueden haber arrancado antes de las migraciones. Se conserva ese orden y
la selección de archivos/servicios existentes. `migrate.first.local.sh` queda fuera de
los seis runners revisados y no debe usarse como sustituto de este procedimiento.

## Qué controla cada bandera

| Variable | Servicio que la consume | Efecto y prerrequisito |
| --- | --- | --- |
| `RUND_CARPETA_ENABLED` | Auth | Agrega documentos, contadores y perfiles del servicio RUND. Requiere RUND disponible, credencial de lectura y perfiles asociados a las personas correctas. |
| `CARPETA_DOCUMENT_VERSIONING_ENABLED` | Auth | Habilita historial/reemplazo/restauración de archivos generales locales Auth; requiere migración 667. No versiona originales PTA ni sustituye el versionado nativo RUND. |
| `RUND_CARPETA_SYNC_ENABLED` | Auth y RUND | Auth publica el estado completo y el worker RUND lo proyecta separadamente. Requiere Auth 668 y RUND 007, URL interna y credencial de sincronización. |

Todas permanecen `false` por defecto. Son funciones separadas: habilitar una no habilita
las otras. El selector y los enlaces del frontend no tienen una bandera propia; publicar
el frontend sí cambia esos recorridos, incluso con agregación apagada. La bandera de
lectura apagada conserva el alcance Auth de los contadores y el catálogo histórico PTA.

La integración no copia los perfiles/archivos históricos PTA a RUND. Con RUND vacío no
se crea un docente por consultar ni se elige PTA como alternativa automática al propietario
predeterminado RUND. El usuario puede seleccionar el histórico expresamente.

## Prerrequisitos del ambiente destino

El paso 12.5d.1 incorpora el inventario offline y el diagnóstico de base de solo lectura
documentados en [VERIFICACION-INSTALACION.md](VERIFICACION-INSTALACION.md). El 12.5d.2 ya
inspeccionó la conexión Auth local: faltan las tablas RUND del alcance y Auth 667/668;
no certifica cuál deba ser la conexión propia de RUND. RUND no respondió en el puerto
local esperado y el motor Docker no estuvo disponible. Los GET a los cuatro orígenes
remotos documentados quedaron sin verificar por conectividad/DNS desde este equipo.
No se aplicaron migraciones, cambiaron `.env` ni activaron banderas. El 12.5d.2 sigue
abierto: falta contrastar instalaciones y artefactos publicados con acceso efectivo.

1. Identificar versión de backend/frontend, composición Compose, base y almacenamiento
   concretos. Conservar artefactos anteriores, respaldos recuperables y su procedimiento
   de restauración antes de cualquier operación de despliegue o migración.
2. Revisar el historial de migraciones de ese ambiente. El servicio propio requiere las
   migraciones `backend/rund-service/db/migrations/001...007` en orden y sus prerrequisitos
   Auth. El historial general añade `db/migrations/667_auth_carpeta_documento_versiones.sql`;
   la proyección añade `668_auth_carpeta_revision_rund.sql` y RUND 007. La 668 declara
   dependencia de 158, 309 y 339. No asumir que un dump de enero representa el esquema actual.
3. Comprobar las relaciones de identidad: `rund."Docente"."personaId"` debe señalar a la
   persona canónica Auth y cada periodo debe estar identificado. Revisar duplicados,
   perfiles sin persona y soportes antiguos sin versión. No vincular por nombre/cédula
   ni ejecutar una importación o reparación masiva como parte de esta verificación.
4. Comprobar permisos vigentes de roles y catálogo RUND (incluida migración 006), JWT
   compatible entre Auth/gateway/RUND y su revocación. El permiso general no concede
   originales: su visibilidad mantiene la política de GESTION_PROFESORAL/SUPER_ADMIN.
   La autogestión del docente conserva su mecanismo OTP propio.
5. Configurar credenciales por el mecanismo de secretos del ambiente, sin guardarlas en
   evidencias: `RUND_CARPETA_INTERNAL_TOKEN` debe coincidir en Auth/RUND y
   `RUND_CARPETA_SYNC_TOKEN` en RUND/Auth. Existe alternativa explícita mediante
   `INTERNAL_SERVICE_TOKEN`. La sincronización de identidades RUND → Auth usa por separado
   `AUTH_INTERNAL_SERVICE_TOKEN`; no confundir las tres finalidades.
6. Verificar desde los servicios la conectividad Auth → `RUND_SERVICE_URL` y RUND →
   `AUTH_SERVICE_URL`, sin exponer los contratos internos como rutas públicas. Compartir
   sesión solo mediante el contrato previsto, nunca en URL, capturas o reportes.
7. Comprobar originales y persistencia RUND: OpenKM en ambientes integrados, credenciales,
   disponibilidad y recuperación; el almacenamiento local requiere habilitación explícita
   y no debe habilitarse para ocultar un fallo OpenKM. Conservar también originales Auth,
   volúmenes y rutas históricas PTA. Verificar tamaño/formato permitido por el servidor.
8. Resolver o evaluar expresamente los errores globales TypeScript y la suite disciplinaria
   heredada del shell según el criterio de publicación del proyecto. Las verificaciones
   acotadas de esta migración no sustituyen ese criterio.

Estas consultas son de lectura y están preparadas para una revisión posterior por quien
administre el ambiente. **No se han ejecutado contra una base existente.**

```sql
SELECT name, to_regclass(name) AS relation
FROM unnest(ARRAY[
  'auth.personas', 'auth.carpeta_digital', 'auth.documento_carpeta_digital',
  'auth.documento_carpeta_version', 'auth.carpeta_revision_rund',
  'academic_work_plan."Docente"', 'academic_work_plan."RundSoporteCampo"',
  'academic_work_plan."RundAccesoDatosLog"',
  'rund."Docente"', 'rund."RundDocumentoPerfil"', 'rund."RundSoporteCampo"',
  'rund."RundAccesoDatosLog"', 'rund.carpeta_auth_sync',
  'rund.carpeta_auth_documento', 'rund.carpeta_auth_sync_evento'
]) AS required(name);

SELECT c.relname AS table_name, t.tgname, t.tgenabled
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'auth' AND NOT t.tgisinternal
  AND t.tgname IN ('documento_revision_rund', 'carpeta_revision_rund', 'persona_revision_rund');
```

Comprobar que existen las relaciones requeridas por las funciones que se habilitarán,
además de columnas, restricciones, permisos SQL e historial de migraciones. Para la 668
deben existir los tres triggers habilitados en las tablas correspondientes. Estas consultas
no demuestran por sí solas que las migraciones o el ambiente estén completos.

## Secuencia propuesta para un ambiente de validación

1. Publicar RUND y Auth compatibles con todas las banderas apagadas. Verificar salud,
   rutas internas con credencial correcta/incorrecta y registros de auditoría. Verificar
   que PTA, Programación y sus accesos históricos conservan sus respuestas.
2. Revisar/aplicar las migraciones necesarias mediante el proceso del ambiente; comprobar
   esquema y permisos resultantes. Esta guía no las ejecuta. Conservar los datos y originales
   existentes, sin limpiar tablas ni volúmenes para conseguir un arranque correcto.
3. Publicar shell y remotes compatibles (incluido `mfe-rund` y `mfe-gestion-personas`), con
   invalidación de caché de artefactos según el despliegue. Confirmar que los exports
   `rund/Module` y `rund/Autogestion` se sirven con sus chunks y recursos completos.
4. Habilitar primero la lectura agregada en Auth. Comparar la misma persona/periodo en banco,
   carpeta administrativa, Personas y portal. Confirmar totales por propietario, estado,
   nombres y periodos; comprobar que vacíos reales y errores se distinguen.
5. Habilitar el historial Auth solo tras comprobar 667. Probar con un archivo de validación
   autorizado: reemplazar/restaurar agrega versión y exige nueva revisión; una acción contra
   una revisión antigua recibe conflicto y no se repite sobre la última automáticamente.
6. Habilitar la proyección Auth → RUND en ambos servicios tras comprobar 668/007. Revisar
   `last_attempt_at`, `last_synced_at`, revisión y `error_code` en `rund.carpeta_auth_sync`;
   los eventos deben conservar versiones de estado coherentes sin modificar originales
   RUND/PTA. El worker comienza al arrancar y sondea cada 60 segundos, hasta 25 personas
   por ciclo; no prometer convergencia instantánea ni un tiempo fijo ante fallos/carga.
7. Mantener la observación acordada por el equipo antes de ampliar a otro ambiente. Anotar
   artefactos y resultados, con datos de prueba y evidencias sin originales ni credenciales.

## Matriz mínima de aceptación

| Recorrido | Resultado que debe comprobarse |
| --- | --- |
| Banco RUND y alias del menú | Sirven el remote RUND y consultan su servicio. |
| Personas y carpeta administrativa | Mismos documentos confirmados y contadores; los borradores no cuentan como guardados ni completan requisitos. |
| Portal “Mis documentos” | Conserva propietario/perfil/periodo, estado y versión; no expone URL restringida ni inventa versión/fecha/aprobación. |
| Dos periodos o mismo ID en PTA/RUND | Selección explícita por propietario + perfil; una carga solo alcanza ese perfil. |
| Reemplazo concurrente | Se envía el ID visto; un conflicto no reemplaza automáticamente otra versión. |
| Historial Auth y RUND | Cada propietario conserva sus versiones; copias históricas Auth no reemplazan originales PTA. |
| Rol limitado/sesión vencida | Se deniega el original según la política vigente, aun tras cambiar de rol o volver a abrir una vista. |
| RUND/PTA/auditoría no disponible | Error explícito, sin listado completo ficticio ni reenvío de cargas a otro propietario. |
| Rutas públicas | `/rund/autogestion/docentes` usa RUND; `/autogestion/docentes` conserva invitaciones/borradores PTA anteriores. |
| Bandera apagada | No hay llamadas de agregación RUND; se conserva el alcance histórico documentado. |

Las pruebas de Chrome locales interceptan APIs; aún falta comprobar gateway, cookies,
OpenKM y JWT reales en el ambiente seleccionado. Los fixtures PostgreSQL ejecutan servicios
reales, pero no todo el AppModule Auth ni todos sus módulos vecinos.

## Contención y reversión

Ante un incidente, suspender las operaciones de validación/escritura afectadas mediante
el procedimiento del ambiente y conservar los registros necesarios para identificar el
perfil/propietario que recibió cada operación. No repetir una carga incierta sobre PTA.

La proyección puede detenerse deshabilitando `RUND_CARPETA_SYNC_ENABLED` en ambos servicios
y reiniciando de forma controlada RUND; el worker espera su operación en curso al apagarse.
Conservar las tablas de proyección/checkpoints para diagnóstico y reanudación. Deshabilitar
lectura agregada en Auth mediante `RUND_CARPETA_ENABLED=false` retira RUND de esa carpeta,
pero no borra sus archivos ni revierte los enlaces/frontend: los originales siguen en su
banco propietario. El catálogo vuelve a la política predeterminada PTA documentada.

Deshabilitar historial Auth impide nuevas operaciones de versiones; no elimina archivos ni
versiones existentes. Para revertir código usar artefactos compatibles con el esquema y
los documentos ya creados, previa revisión de compatibilidad. No ejecutar migraciones
inversas, restauraciones destructivas ni borrar originales como mecanismo de reversión.

## Pendientes fuera de esta activación

El retiro del RUND embebido de PTA requiere confirmación explícita según la sección 9.3
del estado de migración. Reportes, dashboard, consumidores PTA/Programación, redacción de
auditoría y dependencias SQL entre esquemas de la sección 9.2 siguen pendientes. Activar
Carpeta Digital no completa el aislamiento de base de datos del microservicio RUND.

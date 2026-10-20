# Activación del RUND independiente: prueba local y despliegue

Procedimiento probado en local el 2026-10-19 contra la base de desarrollo, con Auth, PTA y RUND reales y HTTP real.
Úsese tal cual para DEV, QA, PRE y PROD, avanzando de ambiente solo cuando el anterior pase todas las comprobaciones.

## 1. Banderas (todas apagadas por defecto)

| Servicio | Variable | Qué hace |
|---|---|---|
| auth | `RUND_IDENTITY_APPLY_ENABLED` | Permite que RUND pida a Auth aplicar identidad por API. Sin ella, Auth responde 503. |
| auth | `RUND_IDENTITY_COMPENSATION_ENABLED` | Permite restaurar la identidad si RUND rechaza el perfil. |
| auth | `PTA_HISTORICO_API_ENABLED` | Carpeta Digital consulta a PTA por API (sin SQL cruzado). |
| rund | `RUND_IDENTITY_WRITE_VIA_AUTH_API` | Altas, ediciones, cargas y autogestión escriben la identidad por API de Auth. |
| rund | `RUND_OCR_IDENTITY_VIA_AUTH_API` | La confirmación OCR de identidad se coordina con Auth. |
| auth | `RUND_CARPETA_ENABLED` | Carpeta Digital consulta documentos, perfiles y conteos de RUND por API. |
| pta | `RUND_SYNC_ENABLED` | PTA sincroniza su copia de docentes desde RUND (al arrancar y cada 10 min). |
| rund | `RUND_DOCUMENT_ALLOW_LOCAL` / `OPENKM_BASE_URL` | Almacenamiento de documentos: repositorio OpenKM o, solo en local, disco. |
| rund | `RUND_OTP_SECRET` | Secreto del HMAC del OTP de autogestión (por defecto `JWT_SECRET`). |

Comunes: el mismo `INTERNAL_SERVICE_TOKEN` en auth, PTA y RUND; `AUTH_SERVICE_URL` en RUND; `ACADEMIC_WORK_PLAN_SERVICE_URL` en auth y RUND.
Opcionales de RUND para el recuperador: `RUND_IDENTITY_WRITE_IDLE_SECONDS` (120), `RUND_IDENTITY_WRITE_RECOVERY_MS` (60000),
`RUND_OCR_IDENTITY_IDLE_SECONDS`, `RUND_OCR_IDENTITY_RECONCILE_MS`.

Desde el punto 103, publicar Auth con soporte de `identidadEsperada` antes de RUND
y aplicar la migración RUND `023` antes de habilitar la escritura coordinada.
La edición con sugerencias conserva una precondición comprobada dentro de la transacción de Auth;
RUND confirma perfil, sugerencias y auditoría en su propia transacción. Con la frontera activa,
un contexto incompatible devuelve 400 y un escritor ausente o transacción externa devuelve 503;
ninguno autoriza regresar al SQL directo sobre Auth. El preview sigue siendo de lectura.
Las confirmaciones OCR de campos nativos (por ejemplo, pregrado) usan únicamente tablas RUND.
La autogestión conserva la posibilidad de enviar datos parciales sin período.
Los caminos SQL de transición siguen disponibles con las banderas apagadas hasta completar
la aceptación por ambiente; este cambio no activa banderas ni retira el RUND embebido.

## 2. Orden

1. **Respaldo** de la base (`pg_dump -Fc`).
2. **Migraciones** (solo las del RUND; el resto de pendientes son de otros equipos): Auth `663`, `669`, `670`, `671`, `672`; RUND `004` a `023`.
   Cada archivo con `ON_ERROR_STOP=1` y registrado en `auth.migrations_db_log`. La 672 corrige además el rechazo actual de la cédula por OCR.
   La preparación 673 y su activación LOCAL requieren el procedimiento específico de
   [protección de cédula en Auth independiente](PROTECCION-CEDULA-AUTH-INDEPENDIENTE.md):
   pausa de escritores, permisos propios e inventario conciliado, con Auth separado.
3. **Publicar** PTA y Auth, y **después** RUND, todavía con las banderas de RUND apagadas.
4. Activar primero las banderas de **auth**, luego las de **rund**, de una en una.
5. Antes de activar la política LOCAL de 673, si algo falla: apagar la bandera y revisar
   el diario. Después de activar LOCAL, conservar la pausa y seguir la reversión del
   procedimiento específico; apagar banderas por sí solo ya no restaura la topología anterior.

## 3. Comprobaciones tras activar (resultado local, todas correctas)

- API de PTA: perfiles, soportes y verificación de originales responden con token y dan 401 sin él.
- API de correcciones de Auth: aplicar, reintento idempotente, valor previo equivocado → 409 `VALOR_PREVIO_CAMBIO`, compensar; también con cambio de cédula.
- Alta por `POST /pta/banco-docentes`: una persona y una cuenta en Auth, perfil, 6 bloques y una auditoría; intención `CONFIRMADA`.
- Alta duplicada con otro nombre: 400 "ya existe" **y el nombre vuelve a su valor en Auth**; intención `ABORTADA`, resolución `COMPENSADA`.
- Auth con la aplicación remota apagada: el alta devuelve 503 y no deja nada; al encenderla el recuperador **cancela** la intención (no crea nada) y el reintento funciona.
- Confirmación OCR por HTTP de nombre y de número de documento: Auth cambia por API, la sugerencia queda `APROBADA`, el diario `CONFIRMADA`.
- Correo de bienvenida: sale `sent:false` si `notifications-service` no está levantado; no bloquea el alta.

## 4. Qué buscar en producción (señales de problema)

- `rund.identidad_ejecucion` con `decision='EN_CURSO'` y `preparada_en` antigua: el recuperador las resuelve; si se acumulan, revisar la conexión RUND↔Auth.
- `rund.identidad_resolucion_auth.estado='REVISION_REQUERIDA'`: una alta de identidad nueva que falló por negocio no se deshace sola; requiere revisión de soporte.
- `rund.identidad_correccion_ocr` en `REVISION` (`CAMBIOS_POSTERIORES`): el dato cambió por otra vía tras la corrección; no se pisa.
- Logs de rund con "Reversión pendiente" o "No se pudo recuperar la intención".

# Compensación propietaria de ediciones de identidad en Auth

Punto 68. Implementado y validado localmente; aplicación y compensación remotas
siguen deshabilitadas por defecto. El ejecutor RUND permanece desconectado de las
entradas reales. Este contrato completa la parte Auth para **ediciones existentes**;
las altas nuevas requieren revisión, sin borrado automático de personas/cuentas.

## Preparación y registro privado de efectos

Migraciones Auth: 669 → 670 → **671**. La versión actual del aplicador exige 671
antes de habilitar `RUND_IDENTITY_APPLY_ENABLED`. No hay migración al arrancar.
La bandera apagada conserva la ausencia de consultas/escrituras de ese aplicador,
incluso si 671 no está instalada. El escritor activo de RUND no usa estas tablas.

La aplicación captura preimagen y postimagen dentro de la misma transacción que
persona, cuenta, asignación DOCENTE y recibo APLICADA. Un fallo de captura revierte
todos esos efectos. La tabla privada `auth.rund_identidad_efecto` conserva:

- UUID/huella, persona/usuario aplicados, versión y orden monotónico de aplicación.
- Solo columnas restaurables de persona, username/updated_at de cuentas y estado/
  fechas de asignaciones de rol. No almacena contraseñas, hashes de contraseña,
  tokens o el comando completo. Las cuentas/asignaciones se ordenan por sus IDs.
- Revisión `xmin` de persona, todas sus cuentas y asignaciones. Detecta cambios
  posteriores incluso si alguien devuelve los valores a su estado anterior (ABA),
  y cambios de contraseña/activación sin copiar esos valores sensibles.
- Fechas timestamp en UTC con microsegundos, sin depender de la zona horaria de
  otra conexión. Seccional bigint como texto, conservando precisión.

El bloqueo asesor compartido serializa aplicar/compensar. Bloqueos EXCLUSIVE sobre
personas/user/user_roles protegen la captura y restauración frente a escritores
que no usan el advisory lock; solo durante la transacción preparatoria, con
lock_timeout de cinco segundos. Pueden hacer esperar a otros escritores al activar
esta API; la aceptación de activación debe considerar esa contención. No bloquean
lecturas ordinarias. Una identidad ambigua por duplicados se rechaza antes de aplicar.

Los registros privados son inmutables. La 671 no modifica el recibo histórico
APLICADA ni sus DTO previos; puede repetirse sin restaurar, eliminar o cambiar datos.

## API interna de compensación y recuperación

`POST /internal/rund/v1/personas/escritura/operaciones/:operacionId/compensar`

Body exacto:

```json
{
  "intencionId": "11111111-1111-4111-8111-111111111111",
  "huellaComando": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
}
```

No acepta prueba de aborto, preimagen, SQL, campos o valores anteriores del llamante.
Auth consulta por sí mismo al propietario:

`GET /internal/rund/v1/identidad/intenciones/:intencionId/aborto`

Usa RUND_SERVICE_URL e INTERNAL_SERVICE_TOKEN; sin JWT/cookies, redirects o reintento
automático. Verifica el DTO de nueve campos del punto 67, incluidos intención,
operación, huellas, aborto irreversible y ausencia de commit. Un 409 RUND conserva
conflicto; caída, 404, redirect y DTO parcial/ajeno devuelven 503 sin restauración o
registro falso. El HTTP termina **antes** de abrir la transacción Auth.

Requiere `RUND_IDENTITY_COMPENSATION_ENABLED=true` explícito y el token interno,
incluso con JWT. Bandera apagada: 503 antes de SQL/HTTP. ID/body inválido: 400;
operación ausente: 404; huella distinta, estado no aplicado u otra intención: 409.
La ruta y su GET de recuperación están bloqueados por el gateway, normal/codificado.
No-store en ambas respuestas.

La resolución terminal se guarda en `auth.rund_identidad_compensacion`, en la misma
transacción que cualquier restauración. Forma de respuesta Auth `data`:

```json
{
  "resolucion": {
    "version": 1,
    "operacionId": "22222222-2222-4222-8222-222222222222",
    "intencionId": "11111111-1111-4111-8111-111111111111",
    "huellaComando": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "estado": "COMPENSADA",
    "motivo": null,
    "resueltaEn": "2026-10-15T10:02:00.000Z",
    "identidadRevertida": true
  }
}
```

`GET /internal/rund/v1/personas/escritura/operaciones/:operacionId/compensacion`
devuelve `{consulta:{operacionId},encontrada,resolucion}`; sin resolución,
encontrada=false/resolucion=null. No devuelve preimagen/postimagen, prueba completa,
identidad, contraseña o resultado de perfil. Un HTTP 200 requiere inspeccionar
estado: REVISION_REQUERIDA **no** significa identidad revertida.

## Condiciones y restauración

Solo se restaura si existe imagen compatible y cuenta/persona anteriores; no hay
otra aplicación posterior registrada para la persona; coinciden todas las filas,
valores y revisiones con la postimagen; y el correo anterior no fue reclamado por
otra identidad. El orden de efectos detecta reutilización conocida por otra operación
remota aunque aquella no haya cambiado filas.

Se restauran exclusivamente las columnas propias permitidas. Username y su fecha
vuelven al valor anterior; contraseña, activación, estado temporal y otros campos no
se escriben. Una asignación creada por la edición se retira; una reactivada vuelve a
su estado/fechas anteriores. No se borran personas o cuentas. La postcondición compara
los valores restaurables con la preimagen antes de guardar COMPENSADA. Cualquier
fallo, incluido el recibo final, revierte toda la restauración.

Si no se puede demostrar que es seguro, no cambia identidad y guarda una resolución
inmutable REVISION_REQUERIDA, identidadRevertida=false y uno de estos códigos:

| Motivo | Situación |
|---|---|
| SIN_PREIMAGEN | Aplicación histórica sin captura; no se inventa una imagen retroactiva. |
| PREIMAGEN_INCOMPATIBLE | Imagen/versión/IDs incompatibles con el recibo. |
| ALTA_IDENTIDAD | Persona o cuenta creadas por la operación; no se prueba ausencia de referencias de otros módulos. |
| CAMBIOS_POSTERIORES | Cambió cualquier revisión/valor/cuenta/asignación desde la aplicación. |
| OTRA_OPERACION_POSTERIOR | Otra aplicación remota usó después la misma persona, incluso sin cambios físicos. |
| CORREO_REUTILIZADO | Otra identidad reclamó un correo que se restauraría. |

Repetir el mismo ID/intención/huella devuelve exactamente la resolución original,
sin otro HTTP RUND o restauración. Revisiones requeridas tampoco se reintentan
automáticamente tras cambiar los datos. El tratamiento humano y el cierre de altas
nuevas siguen pendientes de su política de negocio. Una revisión o consumo externo
sin escritura Auth ni registro de operación no se detecta mediante xmin; este corte
no certifica que todo consumidor operativo haya quedado coordinado.

Tras COMPENSADA, volver a POST aplicar del mismo UUID devuelve 409; no reaplica ni
presenta un nuevo éxito. GET/registro originales conservan el recibo APLICADA como
hecho histórico. Para saber su resolución actual hay que consultar compensacion.

## Alcance, validación y siguiente integración

Pruebas Auth unitarias, compilaciones, gateway real y HTTP/TypeORM/PostgreSQL sobre
bases ficticias separadas. Incluyen concurrencia, respuesta perdida, rollback tras
fallos de captura/restauración/recibo, ABA, contraseña/roles posteriores, reutilización
sin cambios y correo reclamado, aborto abierto/confirmado y prueba ajena/inválida.
Evidencia: [validacion-compensacion-identidad-auth-rund.json](validacion-compensacion-identidad-auth-rund.json).

El punto 69 añade la [conciliación durable en RUND](CONTRATO-CONCILIACION-COMPENSACION-RUND.md).
El journal original conserva AUTH_APLICADA como historial; un registro separado
acredita COMPENSADA o REVISION_REQUERIDA. Solo una compensación confirmada localmente
cierra resolucionAuthPendiente; una revisión lo mantiene abierto con indicador
explícito. Hasta recibir el nuevo recibo, RUND sigue pendiente aunque Auth ya haya
compensado. Continúa el tratamiento de revisiones/altas. La prueba y los servicios
RUND permanecen en módulo desconectado, publicado solo en el fixture de validación.

Después siguen entradas reales con permisos/OTP/prevalidación/soporte, preview sin
escritura remota, correo durable y aceptación por instalación. Ambas banderas siguen
false; no se modificaron .env reales, bases existentes, despliegues o el RUND de PTA.

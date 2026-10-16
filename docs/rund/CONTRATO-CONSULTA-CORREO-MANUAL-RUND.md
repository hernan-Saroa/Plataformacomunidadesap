# Consulta de correo por operador en la solicitud manual

Punto 80. Lectura autenticada y presentación en el formulario opcional. No activa
el consumidor de correo, el escritor remoto o la entrada manual vigente.

## Frontera HTTP

`GET /rund/api/v1/banco-docentes/identidad/solicitudes-manuales/:solicitudId/correo`
conserva JWT, rol de gestión o permiso manage del banco y `private, no-store`.
Exige UUID de cuenta y expiración numérica vigente de la sesión. El actor procede
de los claims verificados, no de persona/email, parámetros de query o body. El
token interno no sustituye la sesión. No existe POST de envío o reenvío en esta ruta.

`AuthIdentityManualMailStatusService` comprueba autorización antes y después de la
lectura. Los roles administrables consultan permisos frescos al propietario en ambos
puntos; roles de gestión conservan su alternativa por rol. Una revocación o un
vencimiento durante I/O impiden devolver incluso el recibo mínimo. No se afirma
atomicidad distribuida frente a una revocación posterior al último control.

La consulta SQL se limita a solicitud/actor y hechos locales de RUND; no descarga
el formulario, contexto, datos personales o mensaje. No llama al consumidor SMTP,
prevalida/escribe identidad, encola, reclama, repara, cierra o compensa operaciones.
Los permisos requieren su lectura Auth habitual, sin SQL de otro propietario desde
RUND. Catálogo o APIs de escritura caídos no impiden consultar un hecho autorizado.

Otro actor o solicitud desconocida: 404. Históricos sin captura: 409. Error SQL,
tabla ausente, aviso elegible perdido o recibo incoherente: 503 genérico. Una ausencia
de infraestructura no se transforma en NO_APLICA, SIN_CONFIRMAR o ENVIADO.

## Recibo mínimo

```ts
{
  version: 1,
  solicitudId: 'uuid-de-solicitud',
  intencionId: 'uuid-propietario',
  estado: 'SIN_CONFIRMAR' | 'NO_APLICA' | 'PENDIENTE' | 'ENVIANDO' | 'ENVIADO' | 'INCIERTO',
  registroConfirmado: boolean,
  requiereRevision: boolean
}
```

| Estado | Hecho comprobado |
|---|---|
| SIN_CONFIRMAR | Solicitud capturada sin commit nativo confirmado y sin aviso de correo. También cubre operaciones abortadas que nunca confirmaron. No acredita encolado o creación. |
| NO_APLICA | Commit confirmado y ambos recibos acreditan cuenta existente; no hay aviso. |
| PENDIENTE | Commit confirmado, cuenta nueva y aviso durable sin intento iniciado. |
| ENVIANDO | Aviso con intento iniciado y sin recibo final; puede estar en vuelo o requerir conciliación. |
| ENVIADO | El propietario de notificaciones confirmó su contrato de envío SMTP. No acredita recepción o lectura del buzón. |
| INCIERTO | El resultado del intento no se pudo confirmar y requiere revisión. |

`registroConfirmado` es false solo en SIN_CONFIRMAR. `requiereRevision` es true
solo para el INCIERTO conocido. ENVIANDO no se interpreta como fallo, éxito o permiso
de reenvío. Antes de mostrar estados de cuenta/correo se exige confirmación nativa
completa, contexto coincidente, Auth aplicado, decisión EN_CURSO y flags booleanos
coherentes de cuenta creada. Un aviso inesperado o ausente se rechaza.

Los seis campos no incluyen destinatario, documento, contraseña, contexto, hashes,
fechas internas o UUID de intento SMTP. El DTO de ejecución de nueve campos se
conserva; su `correo:PENDIENTE` sigue siendo un marcador de compatibilidad. La nueva
consulta es la fuente específica para el estado del correo.

## Cliente y formulario opcionales

`consultarCorreo()` requiere un UUID pendiente ya existente. Hace un GET sin
refresh, retries, logs privados o caché offline; valida campos exactos, versión,
UUID, estados y flags. Rechaza una respuesta si el UUID local cambió mientras esperaba.
Nunca crea/elimina un UUID, hace POST o da por finalizado un registro al recibir ENVIADO.

El modal ofrece **Consultar estado del correo** solo después de conocer un registro
confirmado por ejecución o cierre. No consulta al montar, recuperar resultado,
preparar o ejecutar, ni hace polling. Comprueba además que la intención de correo
coincida con la del recibo confirmado. SIN_CONFIRMAR o una intención ajena no
reemplazan el registro ya reconocido.

La pantalla muestra cada estado con su significado; deja de afirmar automáticamente
que el correo está pendiente al confirmar el perfil. No ofrece envío o reenvío.
Una consulta nueva descarta el recibo anterior. Un error de correo conserva el
registro confirmado y permite volver a consultar o finalizar por el circuito previo.
ENVIADO, INCIERTO y NO_APLICA no eliminan por sí mismos el UUID ni llaman onSaved.

El bloqueo en memoria evita doble clic. Cambiar cliente/sesión oculta el estado
anterior y descarta respuestas tardías; desmontar no publica resultados. Se conserva
la finalización explícita del registro, independiente de leer o enviar correo.

## Validación y siguientes pasos

Se verifican permisos y vencimiento durante SQL, aislamiento por actor, estados
reales del outbox, falta de aviso/tabla, ausencia histórica, GET concurrentes sin
mutaciones, gateway sin cuerpos de GET y recuperación visual sin escritura. Las
pruebas usan PostgreSQL temporal, JWT y servicios ficticios, sin SMTP real.

El banco activo continúa sin proporcionar cliente manual y el módulo fuera de
AppModule. No hay migración nueva, cambio de banderas, .env, Compose o despliegue.
Siguen la validación propietaria de destinatario/credenciales si Auth cambió desde
el alta, conciliación de ENVIANDO/INCIERTO, política de revisiones y aceptación por
instalación antes de activar envíos. El endpoint SMTP actual sigue sin idempotencia
remota; esta consulta no habilita reenvíos ni resuelve esa limitación.

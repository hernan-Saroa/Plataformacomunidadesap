# Omisión explícita de bienvenida por rechazo de vigencia

Punto 86. Un operador autorizado puede decidir no enviar esa bienvenida histórica
si Auth confirma un rechazo de vigencia. No corrige identidad/contraseña/destinatario,
activa cuentas o cancela envíos en curso. El módulo continúa fuera de AppModule.

## Registro y reglas

020, posterior a 019, crea `rund.identidad_correo_omision`: intención única, versión 1,
motivo propietario, cuenta y fecha del servidor. Es inmutable; no guarda destinatario,
documento, mensaje, contraseña, hash, contexto, credenciales o texto libre.

Solo admite aviso elegible PENDIENTE sin intento o resultado SMTP. Auth se consulta
con el comando del contexto servidor acreditado y debe responder apta false con
OPERACION_NO_ELEGIBLE, IDENTIDAD_NO_VIGENTE o CREDENCIALES_NO_VIGENTES. Una respuesta
positiva, caída o contrato incompleto no permiten omitir. El body no elige el motivo.
SQL garantiza elegibilidad y ausencia de intento; el servicio valida la evidencia
remota, que no puede acreditarse mediante una restricción SQL entre propietarios.

La decisión resuelve **no enviar esa bienvenida**, preservando PENDIENTE y ausencia
de intento. No afirma aceptación/rechazo SMTP. No hay borrado, rehabilitación,
cambio de correo o regeneración de credenciales por esta API. La recuperación de
acceso corresponde a Auth y no se implementa aquí. El motivo refleja una lectura
puntual; una vigencia positiva posterior no elimina la omisión.

## API opcional

Base: `/banco-docentes/identidad/correos/revisiones/por-intencion/:intencionId`.

| Método y ruta | Acción |
|---|---|
| GET `/omision` | Recibo o ausencia; sin vigencia Auth o escrituras |
| POST `/omitir-por-vigencia` | Decisión explícita de no enviar; cuerpo vacío |

JWT verificado, cuenta UUID, exp numérica finita vigente y manage efectivo o alternativa
vigente por roles de gestión. Token interno, permiso declarado por cliente o view no
sustituyen controles. Cuenta/roles/exp proceden de sesión; se revalidan tras leer,
tras consultar Auth y antes del commit. Revocación, fallo de permisos o vencimiento
impiden respuesta o revierten la inserción. La comprobación final puede hacer HTTP
Auth manteniendo bloqueo SQL; no hay atomicidad con cambios posteriores.

Siete campos: version, intencionId, omitida, motivo, omitidaPor, omitidaEn y
envioBloqueado. Sin registro: dos booleanos false y motivo/cuenta/fecha null. Con
registro: booleanos true, motivo propietario, cuenta y fecha UTC con seis decimales.
Todas las rutas mantienen `private, no-store`.

Misma cuenta: replay sin cambiar fecha/motivo ni consultar vigencia. Otra cuenta
autorizada puede leer, pero el POST recibe 409. Concurrencia y respuesta perdida
conservan una decisión y responsable. No se vuelve a enviar por recuperar un recibo.

Errores: 400 entrada/body; 401 sesión; 403 permiso; 404 aviso; 409 reservado,
otro autor, vigencia positiva o cambio local durante Auth; 503 SQL/contrato/vigencia
no disponibles. No se exponen parámetros, datos personales o excepciones originales.

## Serialización y consumidor

Auth se consulta fuera de transacciones. Después se bloquea el aviso y se relee en
una nueva sentencia para comprobar contexto/operación y otra omisión ya confirmada.
Si el consumidor ganó la reserva, se rechaza la omisión sin interrumpir SMTP.

El consumidor comprueba omisión antes de Auth y de nuevo después de adquirir el
bloqueo del aviso, en otra sentencia. Detecta así decisiones confirmadas mientras
esperaba, aunque su proyección inicial no las viera. Un aviso omitido devuelve 409
sin reservar/enviar. Un trigger adicional impide la reserva SQL directa; el trigger
de omisión bloquea el mismo aviso. Solo una decisión gana. Se impide editar/borrar
omisiones o crearlas para un intento reservado.

020 y sus permisos son prerrequisitos de nuevos envíos. Su ausencia falla antes de
Auth/reserva/SMTP. GET anterior y recuperación de ENVIANDO/ENVIADO/INCIERTO siguen
funcionando sin consultar omisión o volver a enviar. Sin omisión se conserva el
primer envío y su validación. No hay SMTP bajo las transacciones SQL.

## Compatibilidad y pendientes

No se cambian los cuatro estados/DTO. GET de correo conserva PENDIENTE para un aviso
omitido; `/omision` contiene la decisión administrativa. El diagnóstico del 85 describe
vigencia/evidencia y no sustituye ese recibo o habilita envío. Una vigencia positiva
no rehabilita el aviso. La interfaz futura debe consultar ambos contratos.

Sin conexiones nuevas al formulario/polling activos. Módulo y consumidor opcionales
siguen inactivos. Auth, frontends, gateway productivo, conciliación, revisión/cierre
y migraciones 001–019 conservan fuentes. 020 no hace backfill ni altera avisos.

Validación SQL/HTTP temporal con carreras en ambos sentidos, espera de bloqueo,
rollback, replay, triggers y migración repetible. Sin bases existentes, .env reales,
SMTP real, push o despliegue. El clúster temporal se elimina al terminar.

Siguen revisión durable de INCIERTO con resultado registrado, otras resoluciones
de rechazos, interfaz operativa e intervalo Auth–SMTP. También otros canales/
propietarios y aceptación por instalación; no se declara independencia completa
ni se retira el RUND embebido en PTA.

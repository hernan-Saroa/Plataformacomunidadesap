# Cierre auditable de revisiones de correo

Punto 84. Extiende el módulo opcional del punto 83 con un recibo de cierre cuando
existe aceptación registrada del mismo intento. El módulo continúa fuera de
AppModule; consumidor, conciliador, formulario activo y banderas conservan su estado.

## Evidencia y persistencia

La migración `019_rund_identidad_correo_revision_cierre.sql`, posterior a 018, crea
`rund.identidad_correo_revision_cierre`: caso, intención, intento, cuenta que cierra,
fecha del servidor y motivo fijo `ACEPTACION_REGISTRADA`. Caso, intención e intento
son únicos. El recibo es inmutable; el trigger impide UPDATE y DELETE.

Solo se inserta si el aviso está ENVIADO y el journal 017 contiene ACEPTADO para el
mismo intento que el caso. La fecha de cierre no puede preceder al caso, al resultado
o a la resolución del aviso. La aceptación indica lo observado por el proveedor;
no acredita lectura o entrega final en la bandeja del destinatario.

El cierre no registra resultados ni concilia. Un resultado ACEPTADO aún sin proyectar
en el aviso produce conflicto hasta que el conciliador existente haga su operación
explícita. ENVIANDO sin resultado, INCIERTO e históricos ENVIADO sin journal no permiten
cierre por esta vía. No se fabrican evidencias, reintentos o envíos nuevos.

## Rutas y autorización

Base: `/banco-docentes/identidad/correos/revisiones`.

| Método y ruta | Resultado |
|---|---|
| GET `/:casoId/cierre` | Consulta el recibo o informa ausencia, sin escribir |
| POST `/:casoId/cerrar` | Inserta o recupera el recibo; cuerpo vacío |

Exigen sesión JWT verificada, cuenta UUID, exp numérica finita vigente y autorización
manage efectiva o la alternativa existente de roles de gestión. Un permiso declarado
por el cliente o un token interno no sustituyen esos controles. Actor, roles y exp
proceden de sesión; no se aceptan responsable, fecha, motivo o resultado en el cuerpo.

Si el caso está EN_REVISION, solo su responsable puede cerrarlo, incluso frente a
otra cuenta ADMIN. Si permanece PENDIENTE y llegó la aceptación, un operador autorizado
puede cerrarlo sin nueva asignación: el punto 83 ya impide asignar después de ENVIADO.
La cuenta que cierra queda registrada. Otra cuenta autorizada puede consultar el
recibo, pero no repetir el cierre atribuyéndoselo.

Se revalida autorización tras las lecturas y antes del commit. Revocación, caída de
Auth o vencimiento durante SQL impiden la respuesta y revierten una inserción pendiente.
Los roles de gestión conservan su alternativa y el control de expiración. La comprobación
final puede consultar Auth manteniendo los bloqueos SQL; no hay atomicidad distribuida
con una revocación posterior a esa comprobación. No se hace SMTP bajo la transacción.

Todas las rutas mantienen `private, no-store`. El DTO contiene exactamente siete
campos: version, casoId, intencionId, cerrada, cerradaPor, cerradaEn y motivo.
Sin recibo: cerrada false y los últimos tres valores null. Con recibo: cerrada true,
UUID de cuenta, fecha UTC con seis decimales y motivo fijo. No incluye UUID del intento,
destinatario, documento, mensaje, contraseña, hash o credenciales.

Errores: 400 entrada inválida; 401 sesión inválida/vencida; 403 autorización no
confirmada; 404 caso inexistente; 409 evidencia incompatible, otro responsable o
cerrador; 503 SQL/proveedor opcional ausente, sin exponer parámetros internos.

## Historia, concurrencia y recuperación

Se bloquea aviso antes que caso, igual que registro, asignación y conciliación.
Dos cuentas que intentan cerrar un caso sin asignar tienen un único ganador. Repetir
con la misma cuenta conserva UUID, fecha y autor; una respuesta HTTP perdida se
recupera con el mismo caso. No se repite SMTP ni se modifica el journal.

El caso original de 018 conserva estado PENDIENTE/EN_REVISION, creador, estado inicial,
responsable y fechas. Sus cuatro rutas, DTO de doce campos y paginación permanecen
iguales. La bandeja sigue siendo de historia/asignación e incluye casos con recibo de
cierre: el estado administrativo de cierre se consulta por la nueva ruta. No se añade
un estado CERRADA al contrato anterior. Los DTO de correo/manual tampoco cambian.

019 no cierra automáticamente casos ni reconstruye recibos históricos. Se puede
repetir sin alterar recibos o datos previos. Su ausencia impide las operaciones nuevas
con 503 mientras el contrato anterior del caso sigue funcionando.

## Validación y límites

Pruebas unitarias, PostgreSQL temporal y HTTP verifican evidencia compatible,
inmutabilidad, concurrencia, respuesta perdida, autorización vigente, rollback real,
migración repetible y compatibilidad del contrato previo. El gateway conserva JWT,
no-store y omisión de cuerpos privados en auditoría; su código productivo no cambia.

La instalación de 019 se limita al clúster temporal de pruebas, eliminado al terminar.
No se activan módulos ni envíos, ni se usan bases existentes, .env reales o SMTP real.
Quedan política para intentos sin evidencia/rechazos de vigencia e intervalo Auth–SMTP,
revisión humana, otras entradas y propietarios, e instalación/aceptación por ambiente.
Este punto no declara independencia completa ni autoriza retirar el RUND de PTA.

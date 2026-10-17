# Vista operativa opcional del correo por intención

Punto 88. Integra diagnóstico, omisión y revisión en el modal opcional de creación
manual. No activa el flujo nuevo ni modifica el servidor. El llamador activo continúa
sin cliente manual; `enableMailOperations` es false por defecto y no se proporciona.

## Conexión y alcance

`BancoDocenteEditModal` acepta `enableMailOperations?: boolean` y lo propaga al modal
manual solo cuando existe su cliente opcional y se está creando un docente. El modal
manual monta `RundMailOperationsPanel` únicamente con esa opción explícita, un registro
CONFIRMADO y el mismo cliente/sesión. La edición de docentes existentes conserva su ruta.

`RundManualIdentityClient.operacionesCorreo()` crea de forma diferida un cliente estable
ligado a la cuenta que recibió del principal verificado, con el mismo transporte API.
No infiere actor desde persona/email, crea otra solicitud, cambia el ID pendiente o
almacena recibos. Construir el cliente o montar la vista no hace HTTP.

Es una vista por intención conocida del registro confirmado, no una bandeja global
de búsqueda. El componente/cliente pueden reutilizarse en una futura vista de gestión.
No modifica polling, formularios o entradas activas del banco/shell.

## Lectura explícita y precedencia

El botón Consultar gestión del correo realiza estas consultas, sin caché o retries:

1. GET del recibo de omisión. Si está omitido, informa el bloqueo y termina; no
   consulta vigencia ni ofrece nuevas decisiones. Si falla, no usa diagnóstico como alternativa.
2. POST vacío de diagnóstico, de solo lectura, únicamente si no hay omisión.
3. Si existe caso, GET del caso y su recibo separado de cierre. Comprueba intención,
   UUID de caso, estado, resultado compatible, cierre/fechas y responsable.

Los DTO mantienen los campos exactos del servidor: omisión 7, diagnóstico 10,
revisión 12 y cierre 7. Datos parciales, campos privados adicionales, IDs ajenos,
fechas inválidas, estados incoherentes o un permiso de reenvío inesperado se rechazan.
No se muestra una lectura anterior si falla o se inicia otra consulta.

## Decisiones disponibles

| Estado observado | Acción en la vista |
|---|---|
| Rechazo explícito de vigencia, sin omisión | Omitir bienvenida, con explicación y confirmación marcada |
| Falta de resultado, sin caso | Registrar revisión por la entrada anterior |
| INCIERTO registrado/conciliado, sin caso | Registrar revisión por la entrada del punto 87 |
| Caso PENDIENTE, correo aún sin aceptación | Asumir revisión para la cuenta de sesión |
| Aceptación registrada y caso sin cierre | Cerrar revisión con confirmación, si está sin asignar o asignado a esa cuenta |
| Omisión o cierre ya registrado | Mostrar el recibo, sin repetir decisiones |
| Vigencia no confirmada, resultado pendiente de conciliación o histórico sin journal | Informar el pendiente y permitir otra consulta |

La vista no ofrece enviar, reenviar, aceptar SMTP, conciliar o corregir identidad.
Asumir un caso no resuelve el resultado. ADMIN no sustituye a otro responsable al
cerrar. Una aceptación se describe como observada, sin afirmar recepción/lectura.

Omitir explica que bloqueará esa bienvenida y no recupera acceso o modifica la cuenta.
Cerrar explica que registra aceptación, sin acreditar entrega final. Ambas requieren
abrir la confirmación y marcar que se revisó la decisión. Cancelar/consultar de nuevo
descarta la confirmación. Los otros botones expresan directamente registro/asignación.

## Permisos, concurrencia y recuperación

Requiere autenticación visual y manage efectivo o alternativa vigente de gestión.
El servidor sigue siendo la autoridad: JWT/exp y permisos se verifican en cada API;
el actor del cliente solo permite ofrecer botones correspondientes a su cuenta.
Los POST envían únicamente `{}`, nunca responsable, resultado, motivo o credenciales.

El cliente usa el transporte existente con no-store, cero retries, sin refresh
automático o logs/toasts de errores privados. Solo permite rutas públicas fijas del
contrato, sin token interno o URLs elegidas por el usuario. Evita mutaciones concurrentes
para la misma intención. Las respuestas de asignación/cierre/omisión deben acreditar
la misma cuenta; la recuperación de un caso conserva su creador original.

Durante una operación se bloquea doble clic y se retiran las decisiones anteriores.
El formulario principal tampoco puede finalizar/cerrar u operar al mismo tiempo.
Después de un POST correcto se consulta el estado para actualizar la vista; esas
lecturas no ejecutan otra decisión. Si se pierde/falla la respuesta, se muestran
errores genéricos y solo una consulta permite recuperar el recibo antes de decidir.
Nunca se repite automáticamente el POST que pudo confirmarse en el servidor.

Cambio de cliente, intención o conexión, notificación de sesión, pérdida de permiso
o desmontaje descartan respuestas previas y retiran controles/datos. Se usa señal
de cancelación y comprobaciones antes/después del transporte: no se presupone que
el transporte pueda detener una escritura que ya llegó al servidor. La recuperación
usa los mismos IDs y recibos durables, sin otra identidad o envío.

La consulta es puntual, no una transacción distribuida. Si las lecturas de caso/cierre
no coinciden, se solicita consultar nuevamente; cada decisión vuelve a validar en el
servidor. La creación confirmada continúa siendo independiente del estado del correo
y puede finalizar una vez terminada la operación de gestión en curso.

## Validación y límites

Pruebas de contratos/cliente y React/jsdom con transporte simulado, más suite completa
del MFE, TypeScript y build aislado bajo tmp. Se comprueba la propagación de la opción
por el formulario real y su ausencia por defecto. El bundle activo no incorpora rutas
operativas o el cliente de creación manual; no se sustituyen archivos publicados.

Se conserva la evidencia HTTP/PostgreSQL del punto 87 sobre backend/gateway con fuentes
intactas; no se presenta como nueva ejecución. No se ejecutan migraciones, usan bases
existentes o envía correo. Build/pruebas usan envDir temporal vacío, sin .env reales.

Siguen bandeja global operativa, resolución humana de incertidumbres, otras resoluciones
de rechazos e intervalo Auth–SMTP; otros canales/propietarios y aceptación por instalación.
Antes de activar se deben comprobar backend/rutas, migraciones 016–021, permisos y sesión
por ambiente, con aceptación integrada de navegador. No se declaran independencia completa,
despliegue o retiro de PTA. Los módulos/banderas actuales permanecen desactivados.

# Previsualización manual de compatibilidad sin reserva

Puntos 92–93. Añaden una observación previa a la
[preparación manual](CONTRATO-ENTRADA-MANUAL-IDENTIDAD-RUND.md).
No crea solicitud, captura, intención o journal. El módulo manual sigue fuera
de AppModule y el formulario activo no cambia de transporte.

## Ruta opcional y respuesta

`POST /banco-docentes/identidad/solicitudes-manuales/previsualizar` recibe únicamente
`{formulario: campos del modal}`. No admite solicitudId, actor, opciones o permisos
elegidos por el navegador. Conserva los guards JWT/manage de la clase y responde
`Cache-Control: private, no-store`.

Actor, roles y expiración proceden de la sesión firmada. Antes/después del catálogo,
Auth y la lectura local se revalida la autorización aplicable. Se conserva la
alternativa por rol ADMIN/SUPER_ADMIN/GESTION_PROFESORAL del banco. Expiración no
finita o vencida falla incluso para esos roles. Los claims de permisos no sustituyen
la consulta de permisos efectivos que realizan los guards y servicios existentes.

La respuesta de compatibilidad contiene exactamente seis campos:

```json
{
  "version": 1,
  "compatibilidad": "COMPATIBLE_AL_CONSULTAR",
  "reserva": false,
  "solicitudCreada": false,
  "ejecucionAutorizada": false,
  "requierePreparacion": true
}
```

No devuelve formulario, datos personales, IDs de Auth, huellas, correlación interna,
contexto o auditoría. Es una observación puntual: no bloquea cambios concurrentes,
garantiza éxito posterior o autoriza ejecutar. Preparar y ejecutar deben conservar
sus verificaciones frescas; no aceptan una respuesta de preview como permiso.

## Propuesta compartida y aislamiento

`AuthIdentityManualEntryService.proponer` es una entrada interna de servidor que
normaliza/valida el formulario y consulta el catálogo territorial propietario.
Construye el mismo comando/contexto canónico que la preparación, sin leer o escribir
solicitudes. La preparación reutiliza ese bloque manteniendo la captura transaccional,
sus huellas, reintentos y recuperación anteriores. Proponer no es una ruta que entregue
ese contexto privado al navegador.

`AuthIdentityManualPreviewService` usa esa propuesta y la prevalidación propietaria
Auth existente. Genera un UUID efímero de correlación para esa lectura; no lo guarda
ni lo entrega. Auth debe confirmar rol docente y ausencia de conflicto de correo.
Si existe identidad, solo se consulta el perfil RUND del mismo período para impedir
un alta duplicada. No consulta tablas Auth por SQL.

No llama a preparar, reanudar, ejecución, escritor de identidad, reserva, correo o
secuencias. No abre transacciones de escritura ni depende de rollback para ocultar
efectos. Catálogo inválido/vacío, Auth indisponible/parcial, conflicto o perfil existente
impiden compatibilidad. Los fallos inesperados se convierten en 503 genérico, sin
entregar errores SQL con parámetros privados.

## Validación y límites

Las pruebas unitarias usan propuesta real compartida y cubren autoridad, reglas,
correlación, errores, revocación y expiración durante I/O. El verificador PostgreSQL
temporal incorpora la ruta con controlador/guards/clientes reales y compara tablas
RUND, identidades Auth, solicitudes remotas y estado de la secuencia antes/después.
Para esta consulta bloquea expresamente transacciones y SQL local que no sea SELECT.
Se conserva la regresión de preparación/ejecución y el recorrido HTTP del correo.

## Cliente y formulario opcionales (93)

`RundManualIdentityClient.previsualizar(formulario, signal)` llama a la ruta fija sin
leer/escribir sessionStorage, generar UUID o iniciar una solicitud. Copia el formulario
antes del transporte, acepta únicamente los seis campos/valores del recibo y convierte
errores en un mensaje genérico. Sin caché, refresh, reintentos, logs o toast de errores
privados. La cancelación se comprueba antes/después de esperar, incluso si el transporte
no interrumpe la petición física; no se modifica ApiClient global.

El modal requiere simultáneamente `manualIdentityClient`, `enableManualPreview=true`
y alta nueva opcional. La opción es false por defecto. Edición y solicitud pendiente
conservan sus recorridos anteriores. El banco activo no proporciona cliente/bandera.
No hay HTTP al montar o cambiar datos, polling o consulta de principal adicional.

La acción explícita «Consultar compatibilidad» usa la validación completa y el mismo
bloque de normalización que preparar, sin auditoría elegida por el navegador. No llama
a crear/editar, preparar, subir soporte o ejecutar. Mientras espera, no se permite
preparación concurrente o consulta duplicada. El formulario permite modificar datos;
esto retira la observación y descarta respuestas antiguas, también ante cambios que
después se deshacen. Navegar entre pasos sin cambiar datos conserva la observación.

El hook comprueba la sesión/permisos visuales actuales. Cambio de cuenta, cliente,
conexión o notificación de sesión exige reabrir; revocación de permiso retira el
resultado. Una respuesta anterior no reaparece al restaurar el permiso. Desmontar,
cambiar borrador o invalidar sesión cancela la observación y retira su suscripción.
AbortSignal se usa como descarte seguro; no se garantiza detener físicamente HTTP.
La autoridad final sigue en los guards y revalidaciones del servidor.

Solo se conserva en memoria una observación ligada al objeto del borrador. No se
guarda formulario, recibo o aprobación en almacenamiento. Se puede preparar sin haber
consultado; un preview compatible no habilita ejecución. Preparar vuelve a validar,
obtiene la captura del servidor y exige la confirmación visual anterior para crear.
Un error conserva la separación de acciones y no recurre al escritor anterior.

Pruebas del cliente y React con modal/cliente reales y respuestas simuladas verifican
estos casos, además de la regresión completa del MFE y TypeScript/build. La evidencia
SQL/HTTP del punto 92 se conserva sobre fuentes backend intactas, sin repetirse aquí.
Todavía falta aceptación de navegador e instalaciones de esta conexión opcional.

En los puntos 92–93 la previsualización masiva seguía usando el escritor dentro de
rollback. El [punto 94](CONTRATO-PREVISUALIZACION-MASIVA-SIN-ESCRITURA.md) separa esa
evaluación de las escrituras sin consumir secuencias. El
[punto 95](CONTRATO-PREVIEW-MASIVO-IDENTIDAD-AUTH.md) migra las lecturas del preview
masivo a Auth; siguen las del escritor definitivo antes de completar el aislamiento.
Período,
soporte y reglas de las importaciones se conservan.

Sin migraciones nuevas, cambios de Auth/gateway/shell, bases existentes, SMTP real,
activación o despliegue. Siguen aceptación de navegador/instalación, resolución humana,
otras resoluciones de rechazos, intervalo Auth–SMTP, demás canales y dependencias SQL.
No se declara cerrada toda la previsualización ni la independencia de RUND.

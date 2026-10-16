# Entrada manual protegida: captura, preparación y prevalidación

Punto 72. Conecta una API preparatoria con el vínculo del punto 71 y la prevalidación
propietaria del punto 61. AuthIdentityManualEntryModule sigue fuera de AppModule;
no sustituye el POST activo del banco ni publica ejecución remota.

El punto 73 agrega [ejecución explícita con checkpoints y recibo mínimo](CONTRATO-EJECUCION-MANUAL-IDENTIDAD-RUND.md),
con un cliente preparatorio separado. Se conservan estos tres métodos de preparación
y el módulo sigue fuera de AppModule; el formulario activo no cambia de transporte.

## API y controles existentes

Prefijo `banco-docentes/identidad/solicitudes-manuales`, sin alias PTA:

| Método | Ruta | Body | Resultado |
|---|---|---|---|
| POST | /:solicitudId/preparar | {formulario: campos del modal} | Captura, prepara contexto y prevalida Auth. |
| POST | /:solicitudId/reanudar-preparacion | {} o ausente | Recupera captura original y vuelve a prevalidar. |
| GET | /:solicitudId | Ausente | Consulta metadatos y preparación, sin aprobación remota. |

solicitudId es UUID estable de la operación que el futuro cliente debe conservar.
El actor procede del subject JWT firmado, con los alias existentes, y debe ser UUID.
No se acepta actor, comando, contexto, permisos, opciones o credenciales del body.
El formulario es un objeto plano de valores JSON escalares; admite los alias del
normalizador manual, con límites de tamaño y sin campos de control de servidor.

JwtAuthGuard y BancoDocentesRolesGuard usan las mismas reglas del modal activo:
roles GESTION_PROFESORAL/SUPER_ADMIN/ADMIN o permiso banco-docentes.rund.manage.
Los roles normales consultan sus permisos por HTTP Auth; los claims de permisos no
los conceden. Se conserva la alternativa por rol del banco, incluidos los roles de
gestión aunque no tengan grant explícito. No se inventa una política de permisos
distinta para esta preparación. Un token de servicio no sustituye la sesión JWT.

Cada llamada, también GET y recuperación, pasa por ambos guards. Actor ajeno recibe
404. fullAccess se deriva de los roles de sesión mediante la función existente;
el formulario no lo elige. IP desde el request, sin aceptar IP de auditoría del body.
Todas las respuestas usan private, no-store. El gateway conserva su transporte y
su redacción de cuerpos RUND en auditoría, comprobada también para esta ruta.
Los errores inesperados de infraestructura se convierten a un 503 genérico en la
frontera HTTP; no se propaga al logger un error SQL que incluya el formulario en
sus parámetros. Los errores HTTP de negocio conservan sus códigos.

## Captura privada y anterior a la preparación

Migración RUND **014**, después de 008–013, añade dos columnas nullable a
identidad_solicitud: huella_formulario y entrada_manual. No crea tablas ni copia datos.
Las solicitudes del punto 71 permanecen con ambos valores null. No se reconstruyen
sus formularios o auditorías ni se inventa prevalidación para ellas.

Una solicitud nueva valida el formulario con normalizeBancoDocentePayload,
validatePayload y validateManualBancoDocentePayload. Consulta el catálogo propietario
territoriales-banco y usa el mismo findTerritorialMatch del modal, sin fallback para
una territorial desconocida. Esta función solo se exporta; su cuerpo/llamadas no cambian.
Catálogo caído/parcial: 503; vacío/territorial desconocida: 400, sin reserva local.

El servidor construye comando, opciones estrictas MODAL/CREAR, auditoría, territorial
y acceso sensible. Guarda en una sola inserción transaccional el ID reservado, huellas
y un sobre versionado con formulario original y contexto nativo canónico. HTTP termina
antes de abrir esa transacción. La tabla contiene ahora datos personales privados,
además de los IDs del punto 71: no exponer entrada_manual en rutas o logs.

Constraints exigen ambas columnas juntas, versión/forma exactas, actor/canal/acción
coherentes y tamaño limitado. El trigger inmutable de 013 protege también las columnas
nuevas; 014 impide insertar un contexto nativo diferente del capturado. Repetirla
conserva datos, fechas y solicitudes históricas. El servicio comprueba ambas huellas
del contexto y la huella del formulario antes de recuperarlo.

La huella del formulario usa claves ordenadas y valores originales; no incluye la IP,
roles o catálogo del servidor. El mismo formulario/actor/solicitud recupera la primera
captura aunque cambie la IP o el rol autorizado. Dos formularios distintos para la
misma clave producen 409 sin sustituir al ganador. Cambiar de alias o valor también
es cambiar el formulario; el cliente debe conservar el original durante el reintento.

## Recuperación y observación Auth fresca

Después de confirmar la captura se llama al preparador del punto 71 con la intención
reservada. Un fallo puede dejar captura y journal sin contexto: GET devuelve PENDIENTE
y reanudar-preparacion completa el mismo ID usando formulario, auditoría y catálogo
guardados. No reconstruye IP/fechas ni necesita otra consulta de catálogo. Se conserva
el formulario original para que sus alias sigan normalizando correctamente.

La prevalidación Auth usa el UUID de operación persistido, documento/correo capturados
y resolverPorCorreo=false. El cliente del punto 61 valida respuesta completa y huella,
con token interno únicamente, timeout y sin redirects/JWT/cookies. Una ruta ausente,
caída o DTO parcial produce 503, conservando la captura para recuperar después.

Conflicto de correo: 409 sin copiar datos del otro titular. Rol docente sin configurar:
503. Si Auth confirma una persona y RUND ya tiene perfil para ella/período: 409. Son
observaciones previas; la escritura propietaria y el commit nativo todavía deben
revalidar sus reglas cuando se habilite una ejecución autorizada.

Una preparación compatible devuelve metadatos del vínculo y
prevalidacion={estado:COMPATIBLE,reserva:false}. No devuelve formulario, comando,
persona/cuenta ajenas o resultado de perfil. No guarda aprobación permanente:
cada POST de preparación/recuperación consulta Auth de nuevo. GET no acredita una
prevalidación actual. LISTA conserva el significado del punto 71, incluso si la
decisión de ejecución está abortada; no permite reactivarla o ejecutar por sí sola.

Estos endpoints no registran/aplican/cancelan/compensan identidad, confirman perfiles
o envían correo. Una respuesta perdida después de preparar se recupera con los mismos
IDs/fechas, sin pedir una nueva operación. Una captura histórica null produce 409 al
reanudar y requiere recuperación explícita de servidor, sin sobrescribir el historial.

## Validación y activación pendiente

Pruebas unitarias y de PostgreSQL/TypeORM, JWT, guards, catálogo y prevalidación Auth
reales en bases ficticias separadas. Incluyen permisos revocados, claims inventados,
actor ajeno, catálogo/contrato fallidos, conflictos, concurrencia, rollback, caída antes
de guardar contexto, respuesta perdida y restricciones/repetición de 014. El fixture
ejecuta explícitamente una intención para comprobar detección de perfil ya confirmado;
la API de preparación no expone ese método de ejecución.

Evidencia: [validacion-entrada-manual-identidad-rund.json](validacion-entrada-manual-identidad-rund.json).

Siguen conectar el cliente manual para conservar el ID/formulario y habilitar el
ciclo de ejecución con autorización/revalidación vigente. Editar, importar lotes y
autogestión necesitan sus propias entradas con soporte, sugerencias y OTP. Continúan
la política de altas/cierre de revisiones, preview sin escritura remota, correo durable
y aceptación por ambiente. No hay flags nuevos ni cambios .env/Compose; ambas banderas
Auth permanecen false y las migraciones no se ejecutan al arrancar. Sin bases existentes,
push, despliegue o retiro del RUND embebido de PTA.

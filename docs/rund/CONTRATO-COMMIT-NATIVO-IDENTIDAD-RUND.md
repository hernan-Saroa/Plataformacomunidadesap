# Contexto de negocio y confirmación del commit nativo RUND

Punto 65. Separa el escritor nativo y prepara su confirmación durable, manteniendo
el flujo activo con su escritura Auth local. Complementa el
[registro de coordinación](CONTRATO-COORDINACION-IDENTIDAD-RUND.md). El coordinador nuevo
sigue fuera de AppModule y de los módulos activos; no hay ruta HTTP o worker nuevo.

## Frontera nativa conservada

`rund-native-profile-write.ts` contiene el bloque nativo extraído de upsertDocente:
selección por persona/período, rechazo de existentes, perfil, correlativo, datos
originales, bloques, validación documental, invalidación de evidencias, auditoría,
segunda comprobación del soporte y registro de acceso sensible.

El bloque conserva sus instrucciones, valores, condiciones y orden. Las dos llamadas
a métodos del servicio se pasan como callbacks con el mismo manager. No hace SQL de
identidad, HTTP, commit o correo. upsertDocente conserva validaciones/normalización,
catálogo territorial, escritura Auth local, outerManager/savepoints, rollback y correo
posterior al commit; únicamente delega el bloque extraído en ese mismo escritor.

El flujo heredado tolera fallos al inicializar bloques. Ese comportamiento se conserva.
Solo el coordinador nuevo exige, antes de confirmar una creación, que estén todos los
bloques definidos por el servicio. No impone ese requisito nuevo a ediciones históricas.

## Contexto durable antes de HTTP

Migración RUND `009_rund_identidad_contexto_nativo.sql`, posterior a 008. Crea una tabla
con FK exclusivamente al journal RUND, huella, contexto, estado, fechas, docente y
resultado nativo. No agrega FK a identidad Auth ni ejecuta migraciones al arrancar.

`AuthIdentityNativeCommitService.preparar(intencionId, comandoAuth, escritura)`:

1. Recibe datos ya normalizados y autorizados por el proceso servidor. Valida el comando
   Auth del punto 63 y su vínculo con documento, correo, teléfono, nombre, opciones,
   territorial, actor y canal del contexto. Exige período y auditoría.
2. Conserva el payload normalizado, las columnas originales reconocidas por RUND y sus
   metadatos de fila/canal/cargador, territorial y opciones de auditoría/soporte.
   Fechas se congelan en ISO y se restauran como Date al ejecutar el escritor existente.
3. Canonicaliza objetos con claves ordenadas y SHA-256. Rechaza ciclos, binarios,
   funciones, números no finitos, profundidad excesiva, campos de credenciales y
   contextos superiores a 1 MiB. No conserva campos ajenos del payload original.
4. Prepara el journal local, sin HTTP; después bloquea esa intención y persiste el
   contexto. Una primera vinculación exige estado PREPARADA, antes de publicar la
   intención en Auth. Un reintento igual recupera el contexto; otro contexto devuelve 409.

Una caída entre ambas transacciones puede dejar solo el journal PREPARADA: el mismo
ID permite completar el contexto y no se ha iniciado HTTP desde este servicio. El
ejecutor futuro deberá exigir ese contexto antes de publicar/aplicar la intención.
No admite outerManager ni se debe llamar desde una transacción que bloquee la intención.

La tabla nueva sí conserva el comando Auth completo y datos personales de negocio.
Es una intención de escritura, no una copia autoritativa de usuarios Auth. No guarda
contraseña, hash de contraseña, JWT, OTP o archivos binarios. Acceso exclusivamente
servidor/base de datos: no agregar contexto o resultados a logs ni a rutas públicas.

## Commit y recuperación

`confirmarNativo(intencionId)` no hace HTTP ni aplica identidad. Requiere que el journal
ya conserve AUTH_APLICADA con su resultado, y un contexto con huella íntegra y el mismo
comando Auth. Adquiere bloqueos locales en orden journal/contexto, con lock_timeout de
cinco segundos. No acepta otro payload para sustituir el contexto congelado.

Mapea los IDs y diferencias de auditoría Auth originales al escritor nativo. Clona las
diferencias antes de que el escritor agregue cambios RUND, sin alterar el recibo Auth.
Perfil, evidencias, auditoría, comprobación final del soporte y marcador CONFIRMADA
usan la misma transacción/manager. El trigger exige el recibo aplicado y un perfil con
la persona y período esperados; impide falsos cambios de contexto y reescritura final.

| Resultado | Estado persistido |
|---|---|
| Auth aún no aplicado o intención cancelada | 409; no escribe perfil o marcador |
| Falla perfil, auditoría, soporte, bloques de un alta o guardado del marcador | Rollback nativo; contexto sigue PREPARADA y Auth continúa aplicado |
| Commit correcto | CONFIRMADA con docente, fecha y resultado original |
| Reintento después de commit, incluso tras perder la respuesta | Recupera resultado sin ejecutar de nuevo el escritor |

El marcador es histórico y no asegura que el perfil nunca cambie después. No agrega
una FK permanente al perfil que modifique sus flujos de eliminación. La intención y
su resultado no se borran o reactivan por TTL. Las secuencias PostgreSQL pueden avanzar
aun con rollback, igual que en el flujo previo.

CONFIRMADA acredita el commit nativo, no el envío del correo. El coordinador nuevo
no manda correos ni compensa Auth: ese cierre sigue pendiente. El flujo activo conserva
su envío posterior al commit tal como estaba.

## Validación y activación pendiente

Código compilado, TypeORM y escritor nativo real en una base RUND separada, sin schema
Auth; identidad aplicada previamente por HTTP al propietario. Pruebas de preparación
concurrente, contexto diferente, guardas Auth, confirmación simultánea, fallos de
auditoría/recibo/bloques, soporte rechazado, rejectExisting y recuperación tras pérdida
real de respuesta y reapertura de conexiones. Sin HTTP o cambios Auth dentro del commit.

La migración solo se probó en bases temporales ficticias. El main real conserva vacía
la tabla nueva durante los flujos actuales, incluido preview. No se habilita la bandera
Auth ni se sustituye el escritor de identidad local.

Sigue integrar un ejecutor completo: vincular la solicitud de negocio real a su ID
estable, conservar permisos/OTP/prevalidación/soportes, tratar fallos tardíos con
reconciliación y compensación segura, preview sin escritura remota y correo durable
posterior al commit. El contexto no prueba autorización ni sustituye esas validaciones.

El punto 71 agrega el [vínculo durable por solicitud manual](CONTRATO-SOLICITUD-IDENTIDAD-RUND.md):
reserva una intención de servidor por actor/solicitud antes de invocar este preparador.
Reutiliza reglas manuales y conserva la reserva ante fallos de contexto. Solo admite
CREAR_MODAL y sigue sin conectar las entradas activas; no sustituye permisos,
prevalidación Auth o revalidación de soportes/OTP de otros canales.

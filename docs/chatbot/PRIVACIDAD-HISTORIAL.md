# Privacidad del historial del chatbot

Implementación del primer punto de la revisión, 22 de octubre de 2026.

Actualización del 23 de octubre: se añadieron guard de activación, transacciones, control de caché, CORS explícito y configuración JWT obligatoria. La evidencia vigente y los requisitos de entrega están en [REVISION-PRE-PUSH.md](REVISION-PRE-PUSH.md). Las notas siguientes conservan el contexto del primer ajuste.

## Comportamiento

- Cada operación del chatbot exige un JWT válido, también cuando se llama directamente al microservicio.
- Se admiten Bearer y cookie `esap_access_token`. El servicio no confía en `x-user-*`, roles del token, identidad del body ni email de la URL para determinar al propietario.
- La cuenta debe estar activa. La identidad canónica y el permiso de lectura global se consultan en la base de datos en cada petición, sin caché de autorización.
- La creación asocia `propietario_usuario_id` con `auth."user".id_user`. Se conserva `usuario_id` como dato de compatibilidad; no autoriza el acceso.
- El listado personal, por defecto, filtra únicamente por el propietario verificado. Obtener, enviar mensajes y desactivar exigen acceso a la conversación y no revelan IDs de otras cuentas.
- Solo `chatbot.conversaciones.read_all`, asignado mediante roles activos y permisos activos, habilita lectura institucional. No concede escritura o borrado de conversaciones ajenas.
- El remitente de los mensajes del usuario siempre se guarda como `user`.
- El módulo completo abre el historial personal. El servidor habilita el selector de historial institucional mediante `GET /chat/acceso`; el widget siempre permanece en ámbito personal.
- Las respuestas de acceso denegado o sesión expirada se muestran como errores. El cliente envía credenciales en todas las llamadas y deja de remitir identidad declarada por el navegador.
- Las respuestas pendientes de una cuenta anterior se descartan al cambiar de usuario. Los detalles rechazados por el servidor no se recuperan desde el estado local.

## Historial anterior

La columna de propietario verificado empieza vacía para las conversaciones anteriores. No se rellenó a partir del email ni del identificador que antes enviaba el navegador: esa información podía suplantarse.

Esas conversaciones se conservan en la base de datos y pueden consultarse con el permiso institucional. No aparecen como conversaciones personales ni admiten mensajes o borrado hasta acreditar y asignar su propietario mediante un procedimiento administrativo posterior. No se elimina ni se reasigna historial automáticamente.

## Aplicación en cada entorno

1. Aplicar las migraciones del servicio en orden: `001`, `002` y `003_secure_conversation_ownership.sql`.
2. Verificar que el microservicio y auth-service/API Gateway utilizan el mismo `JWT_SECRET` y la misma base de datos de autenticación. La clave es configuración de entorno; no se debe copiar al código ni enviarla al navegador.
3. Desplegar conjuntamente el backend y `mfe-chatbot` actualizados. El frontend exige la capacidad `puedeEscribir` de la nueva API; una versión anterior del backend no proporciona ese contrato.
4. Comprobar con dos cuentas diferentes que cada una ve su historial y que el permiso institucional funciona exclusivamente como lectura.

La migración es aditiva e idempotente. Registra el permiso y lo concede inicialmente solo al rol activo `SUPER_ADMIN`. No reactiva permisos o asignaciones existentes que hayan sido deshabilitados. Otros roles pueden recibir el permiso desde la administración habitual de permisos. No se concede automáticamente a `ADMIN`, `ADMINISTRATIVO`, comodines ni roles declarados por el cliente.

No se aplicó la migración sobre tablas permanentes durante esta tarea. La validación SQL se realizó con tablas temporales y `ROLLBACK`.

## Compatibilidad del gateway

El gateway elimina `/:service/api/v1` antes de reenviar. El controlador del chatbot acepta ahora `/chat/*` para ese recorrido y conserva `/api/v1/chat/*` para llamadas directas existentes. Ambos caminos están protegidos por el mismo guard. No se cambiaron rutas, guard, política pública ni estrategia JWT generales del gateway.

## Verificación

- Backend: `cd backend/chatbot-service` y `npm test`.
- Frontend: `cd apps/mfe-chatbot` y `npm test`.
- Tipos frontend: `npx tsc --noEmit -p apps/mfe-chatbot/tsconfig.json` desde la raíz.
- Compilación backend habitual: `cd backend/chatbot-service` y `npm run build`, con las dependencias del servicio instaladas.
- PostgreSQL local: `node scripts/verify-chatbot-postgres.cjs`. Utiliza la configuración local ya validada por `scripts/rund-documental/local-context.cjs`, exclusivamente contra localhost y NODE_ENV development/test. Las tablas de prueba son TEMP y la transacción termina con ROLLBACK.

En este checkout faltaban dependencias propias del chatbot y no estaban disponibles en la caché de npm. Las pruebas HTTP y la compilación TypeScript del backend utilizaron las dependencias NestJS/TypeORM ya instaladas en `travel-expenses-service`; no se modificó ese servicio.

Los otros puntos de la revisión son trabajo separado. La corrección posterior del segundo punto elimina también las respuestas de demostración ante fallos de red/servidor y está descrita en [ERRORES-Y-RECUPERACION.md](ERRORES-Y-RECUPERACION.md). El motor de respuestas y la cobertura global de vistas mantienen su alcance anterior.

Resultados locales: 15 pruebas HTTP de backend y 12 de frontend correctas; comprobación de tipos del frontend correcta; compilación TypeScript del backend y build de producción del microfrontend correctos. La verificación de PostgreSQL confirmó idempotencia, conservación del historial previo, concesión inicial solo a SUPER_ADMIN y revocación efectiva al desactivar cualquiera de las asignaciones o la cuenta.

El sandbox impidió al empaquetador leer un directorio superior al cargar la configuración de pruebas. Se ejecutaron Vitest y Vite mediante sus API programáticas con la configuración del chatbot y sin modificar permisos del sistema. El build se emitió en un directorio temporal y se eliminó al terminar.

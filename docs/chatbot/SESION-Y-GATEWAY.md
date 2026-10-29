# Chatbot temporal: conversación y gateway

Comportamiento actualizado el 29 de octubre de 2026.

El chatbot ofrece orientación general sin iniciar sesión. Tanto el recuadro flotante como el módulo completo usan `POST /chatbot/api/v1/public/consultas`, con `credentials: 'omit'` y `cache: 'no-store'`. No recuperan conversaciones guardadas, consultan permisos del historial ni renuevan cookies de autenticación.

## Duración de la conversación

Los mensajes, el borrador y las consultas pendientes se mantienen únicamente en la memoria del módulo remoto durante la vida del documento. Se comparten entre sus vistas. Navegar entre módulos, minimizar el recuadro, abrir la vista completa o iniciar/cerrar sesión mediante navegación interna conserva esa conversación.

Una recarga completa, cerrar la pestaña o cargar un documento nuevo destruye esa memoria. No se utilizan localStorage, sessionStorage ni IndexedDB para recuperarla. Cada pestaña mantiene su propia conversación. «Nueva conversación» permite limpiarla antes de recargar. Un gateway diferente utiliza un estado separado y no recibe mensajes ni borradores del anterior.

El proveedor global conserva su instancia al cambiar de usuario. Las propiedades antiguas de identidad siguen siendo compatibles con los contenedores, pero no se envían a las consultas generales.

## Backend y contenido

El endpoint general comprueba que el módulo esté activo y utiliza orientación institucional compartida sobre viáticos, certificados, PTA, programación académica y otros módulos. No escribe conversaciones o mensajes. No consulta expedientes, historial privado ni la fuente documental interna de Isolución.

El gateway conserva la auditoría técnica de la operación sin guardar pregunta, respuesta, query ni contenido de errores de este endpoint. El historial privado anterior permanece protegido por los guards existentes y no se borra ni se hace público; la nueva interfaz no utiliza esas rutas. No se requiere una migración para el chat temporal.

## Gateway y ambientes

Se conserva el orden de resolución: base entregada por el contenedor, runtime `window.__ESAP_CONFIG__.API_URL`, `VITE_API_URL` y, como alternativa, `/services` del mismo origen. Las rutas relativas, HTTPS, localhost, IPv6, prefijos y túneles mantienen sus validaciones. Una configuración inválida no redirige silenciosamente a otro servidor.

El proxy de Vite para desarrollo/preview elimina únicamente `/services` al reenviar al gateway configurado por `ESAP_API_GATEWAY_URL`. En un despliegue estático esa ruta debe estar publicada por el proxy web. Otro origen necesita su configuración CORS; no se envían cookies del navegador para el chat temporal.

PostgreSQL admite `DB_USERNAME/DB_PASSWORD/DB_DATABASE` y `DB_USER/DB_PASS/DB_NAME`, conservando la precedencia de la primera familia. La configuración JWT sigue siendo necesaria para las rutas privadas anteriores, pero no interviene en las consultas generales.

## Verificación

- `cd apps/mfe-chatbot && npm test`: conversación temporal, errores, cambios de identidad, vistas compartidas y regresiones del cliente.
- `cd backend/chatbot-service && npm test`: consultas sin JWT y sin escrituras, disponibilidad, validación y protección del historial anterior.
- `cd backend/api-gateway && npx jest src/audit --runInBand`: auditoría técnica sin contenido de las consultas temporales.
- `node scripts/verify-chatbot-widget-browser.mjs`: navegador con artefactos de producción, diez tamaños, cambios de módulo/sesión, recarga real, gateway separado y ausencia de llamadas privadas.
- `node scripts/verify-chatbot-environments.cjs`: revisión estática de seis composiciones y proxies HTTP/HTTPS con datos ficticios.

Las comprobaciones no realizan despliegues ni modifican conversaciones reales. Cada ambiente debe aplicar el frontend, el servicio y el gateway actualizados.

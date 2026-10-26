# Sesión y gateway del chatbot

Tercer ajuste de la revisión, 22 de octubre de 2026.

## Integración con la plataforma

El módulo completo del backoffice y el widget reciben `apiBaseUrl={config.API_BASE_URL}`. Es la misma base que utiliza el cliente autenticado del shell; el chatbot ya no decide por separado si debe llamar a localhost, a otro host o a `/services` cuando se integra en la plataforma. El cuarto ajuste centraliza ese widget en el shell para todas las vistas; véase [COBERTURA-GLOBAL.md](COBERTURA-GLOBAL.md).

Cada instancia crea su propio cliente HTTP. No modifica la configuración global, no sobrescribe clientes de otros módulos y no almacena ni lee tokens del navegador. Si cambia el gateway recibido, se reinicia el contexto del chatbot: se descartan respuestas pendientes y borradores del destino anterior.

El envío de `credentials: 'include'`, ya corregido en los puntos anteriores, se mantiene para todas las operaciones privadas. El navegador gestiona la cookie HttpOnly; el cliente no construye cabeceras `Cookie` ni `Authorization`. La configuración y orientación públicas añadidas en el cuarto ajuste utilizan `credentials: 'omit'`.

## Apertura independiente del microfrontend

La base del gateway se resuelve en este orden:

1. `apiBaseUrl` entregado por el contenedor.
2. `window.__ESAP_CONFIG__.API_URL`, si existe.
3. `VITE_API_URL` del build del chatbot.
4. `/services`, en el mismo origen del navegador.

La configuración se consulta al preparar cada petición. Las bases relativas se resuelven con el origen actual y se normalizan las barras finales. Una configuración de loopback utilizada desde un dominio remoto se adapta al host y protocolo actuales, como hace el shell. Las bases locales explícitas conservan su hostname, puerto y protocolo; no se cambia `127.0.0.1` por `localhost`.

Una configuración inválida, con credenciales incrustadas, query, fragmento, protocolo incompatible o HTTP desde una página HTTPS produce un error visible de configuración antes de enviar la petición. No se cambia silenciosamente a otro servidor.

## Proxy local del chatbot

Vite, tanto en desarrollo como en preview, enruta `/services/*` al gateway indicado por `ESAP_API_GATEWAY_URL`. El valor predeterminado es `http://127.0.0.1:4000`, igual que el proxy local del shell. Solo se elimina el prefijo `/services` al reenviar; la ruta de servicio y versión permanece intacta.

Esto permite abrir el chatbot por separado en desarrollo sin agregar el puerto del microfrontend a la política CORS general ni cambiar las propiedades de las cookies. El proxy conserva las cabeceras de sesión y las respuestas `Set-Cookie`.

En un despliegue estático, `/services` debe estar publicado por el gateway web de la plataforma, como en el recorrido normal del shell. El proxy de Vite solo existe en desarrollo/preview. Un servidor que publique únicamente los archivos del remoto requiere la base de API explícita y la configuración de sesión/origen correspondiente.

## Alcance

Se añadieron únicamente la propiedad del gateway en las integraciones del chatbot, clientes HTTP por instancia y el proxy del propio microfrontend. No se modificaron la resolución general de entornos del shell, el login, los atributos HttpOnly/SameSite/Secure, la política CORS general ni los guards del gateway. No se añadieron rutas públicas de conversaciones.

Este punto no requiere una migración nueva. Sigue aplicando el contrato y la migración del primer ajuste, descritos en [PRIVACIDAD-HISTORIAL.md](PRIVACIDAD-HISTORIAL.md), así como la recuperación de errores del [segundo ajuste](ERRORES-Y-RECUPERACION.md).

## Verificación

- 65 pruebas frontend correctas: precedencia y normalización de URL, localhost/127.0.0.1/IPv6/HTTPS, runtime tardío, instancias independientes, entrega de la base al remoto, cambio de gateway y regresiones de privacidad/recuperación.
- 15 pruebas HTTP del backend correctas, con JWT firmados y datos ficticios: cookie HttpOnly y Bearer, JWT inválido o vencido, permisos revocados, propietario y acceso administrativo de solo lectura.
- TypeScript del microfrontend y build de producción correctos.
- Prueba en navegador contra el build de producción servido con Vite preview y un gateway ficticio: rechazo inicial sin sesión, recepción de una cookie HttpOnly mediante el proxy, cookie ausente de `document.cookie`, historial accesible por `/services`, historial accesible entre puertos del mismo host con CORS y credenciales, rechazo tras retirar la cookie y ausencia de cabeceras de autorización construidas por el frontend.
- Proxy de desarrollo comprobado por HTTP en un servidor Vite aislado usando la configuración real del chatbot; se verificaron el reenvío de la cookie y la eliminación exclusiva del prefijo `/services`.

Las comprobaciones de navegador utilizaron una sesión sintética y puertos temporales; no utilizaron cuentas reales ni modificaron conversaciones o servicios en ejecución. La validación HTTPS de URL está cubierta por pruebas de configuración; no se realizó un despliegue TLS en QA o producción.

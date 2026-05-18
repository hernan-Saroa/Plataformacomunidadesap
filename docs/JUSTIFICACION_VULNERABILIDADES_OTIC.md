# Justificacion tecnica de vulnerabilidades OTIC/ZAP

## Alcance revisado

Los hallazgos no se resuelven en `backend/auth-service/src/auth/authorization.constants.ts`. Ese archivo corresponde a constantes de autorizacion/roles y no controla almacenamiento del navegador ni headers HTTP.

La revision se hizo sobre los puntos donde realmente se corrigen estas vulnerabilidades:

- `backend/auth-service/src/auth/auth.controller.ts`
- `backend/auth-service/src/auth/auth.service.ts`
- `backend/auth-service/src/auth/strategies/jwt.strategy.ts`
- `backend/api-gateway/src/auth/jwt.strategy.ts`
- `backend/api-gateway/src/gateway/gateway.service.ts`
- `apps/shell/src/services/api/authService.ts`
- `apps/shell/src/config/environment.ts`
- `apps/shell/src/App.tsx`
- `nginx*.conf*`
- `docker/nginx/nginx.main.conf`
- `docker/nginx/40-esap-select-config.sh`

## Justificacion por hallazgo OTIC

### OTIC-001 - JWT almacenado en localStorage

**Estado propuesto para informe:** Corregido.

**Justificacion tecnica:**  
El JWT ya no se persiste en `localStorage` ni `sessionStorage`. El backend genera el token, pero no lo retorna como dato util al frontend; en su lugar lo instala en la cookie `esap_access_token` con atributos de seguridad: `httpOnly`, `sameSite: 'strict'`, `secure` en produccion, `maxAge` de una hora y `path: '/'`.

**Como se mitigo el riesgo:**  
Al usar cookie `HttpOnly`, el token no queda accesible mediante JavaScript del navegador. Esto reduce la posibilidad de robo del JWT ante un XSS o inspeccion del storage local. El frontend envia la cookie automaticamente con `credentials: 'include'`, y el gateway/microservicios la leen desde la cookie para mantener compatibilidad con la autenticacion existente.

**Evidencia principal:**

- `auth.controller.ts`: el login y refresh extraen `accessToken` del body y lo envian por cookie.
- `auth.controller.ts`: `setAuthCookie()` define `httpOnly`, `secure`, `sameSite` y `maxAge`.
- `authService.ts`: `saveTokens()` queda como no-op; no guarda JWT en storage.
- `gateway.service.ts`: si llega cookie HttpOnly, el gateway puede transformarla a `Authorization: Bearer` internamente para los microservicios.

**Riesgo residual:**  
Verificar que en produccion `NODE_ENV=production` y HTTPS esten activos para que la cookie viaje con `secure: true`.

### OTIC-002 - Datos sensibles del usuario en localStorage

**Estado propuesto para informe:** Corregido con control residual.

**Justificacion tecnica:**  
Los datos sensibles de sesion del usuario, roles y permisos ya no se guardan persistentemente en `localStorage` ni `sessionStorage`. La aplicacion usa cache en memoria (`window.__esap_auth_cache`) y, al recargar, valida la sesion contra el backend mediante `/verify`, usando la cookie HttpOnly.

**Como se mitigo el riesgo:**  
Se elimina la exposicion persistente de datos de usuario en el almacenamiento del navegador. La persistencia de sesion se reemplaza por una senal minima de sesion activa (`esap-sesion-activa`) que no contiene roles, permisos, token ni datos personales. La informacion real se recupera desde backend solo si la cookie sigue siendo valida.

**Evidencia principal:**

- `authService.ts`: cache de usuario en memoria, no persistente.
- `authService.ts`: `saveUserData()` usa `setCurrentUserCache()`.
- `App.tsx`: limpieza de residuos legacy de tokens y datos de usuario.
- `App.tsx`: restauracion de sesion mediante `authService.verifyToken()`.

**Riesgo residual:**  
Existen usos de `localStorage` para preferencias, cache local o configuraciones de interfaz. Eso no equivale al hallazgo OTIC-002 si no contiene datos sensibles de sesion, pero debe mantenerse vigilado.

### OTIC-003 - CSP Header ausente o implementacion incorrecta

**Estado propuesto para informe:** Corregido parcialmente / sujeto a validacion en ambiente.

**Justificacion tecnica:**  
Se agrego una politica CSP en Nginx para el frontend. La politica restringe origenes por defecto a `'self'`, define `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'self'`, `object-src 'none'`, y declara listas explicitas para imagenes, conexiones, frames, workers y media.

**Como se mitigo el riesgo:**  
La CSP reduce la posibilidad de ejecutar scripts, cargar recursos o embeber contenido desde origenes no autorizados. Tambien protege contra clickjacking con `frame-ancestors 'self'`. Para compatibilidad con estilos generados por la aplicacion, los elementos `<style>` se autorizan con nonce dinamico (`style-src-elem 'nonce-$request_id'`) y los atributos `style=""` necesarios para mediciones/animaciones de React se limitan a `style-src-attr 'unsafe-inline'`.

**Evidencia principal:**

- `nginx.frontend.gateway.conf`: variable `$esap_csp`.
- `nginx.frontend.gateway.conf`: `add_header Content-Security-Policy $esap_csp always`.
- `scripts/mfe.config.mjs`: inyecta `csp-nonce.js` antes del bundle principal para aplicar nonce a tags `style` creados dinamicamente.
- Archivos `index.html` de shell/MFEs: incluyen `meta name="csp-nonce"`.

**Riesgo residual:**  
El CSP se aplica principalmente a la SPA/frontend. Para cerrar completamente el hallazgo se debe validar en la URL exacta auditada que el header exista y no sea sobreescrito por otro proxy. Tambien se debe verificar que no existan rutas estaticas o de microfrontends servidas sin CSP.

### OTIC-004 - Anti-clickjacking header ausente

**Estado propuesto para informe:** Corregido.

**Justificacion tecnica:**  
Se agrego `X-Frame-Options: SAMEORIGIN` en Nginx y se reforzo la proteccion con CSP `frame-ancestors 'self'`.

**Como se mitigo el riesgo:**  
Esto impide que la plataforma sea embebida en iframes de terceros, reduciendo ataques de clickjacking donde un atacante superpone la interfaz legitima para inducir acciones no deseadas.

**Evidencia principal:**

- `nginx.frontend.gateway.conf`: `add_header X-Frame-Options "SAMEORIGIN" always`.
- `nginx.frontend.gateway.tls.conf.template`: mismo header en TLS.
- CSP: `frame-ancestors 'self'`.

**Riesgo residual:**  
Validar que los proxies intermedios no eliminen el header y que todas las rutas publicas relevantes pasen por esta configuracion Nginx.

### OTIC-005 - X-Content-Type-Options ausente

**Estado propuesto para informe:** Corregido.

**Justificacion tecnica:**  
Se agrego `X-Content-Type-Options: nosniff` en Nginx para respuestas del frontend, assets y rutas relevantes.

**Como se mitigo el riesgo:**  
El navegador deja de intentar interpretar archivos con un tipo MIME diferente al declarado. Esto reduce riesgos de ejecucion indebida de contenido cuando un recurso se sirve con un tipo incorrecto.

**Evidencia principal:**

- `nginx.frontend.gateway.conf`: `add_header X-Content-Type-Options "nosniff" always`.
- `nginx.frontend.gateway.tls.conf.template`: mismo header en TLS.
- `nginx.conf`: header aplicado en rutas estaticas y SPA.

**Riesgo residual:**  
Si algun microservicio se expone directamente sin pasar por Nginx, ese servicio deberia agregar el header por su propia cuenta o quedar detras del gateway.

### OTIC-006 - Server nginx/1.29.7 expuesto

**Estado propuesto para informe:** Corregido si el criterio OTIC es ocultar la version exacta.

**Justificacion tecnica:**  
Se configuro `server_tokens off;` en la configuracion principal de Nginx y en los bloques `server`. Esto elimina la version exacta del header `Server`.

**Como se mitigo el riesgo:**  
El header deja de exponer `nginx/1.29.7` y pasa a exponer, como maximo, `nginx`. Con esto se evita que un atacante identifique automaticamente la version exacta para buscar CVEs especificos.

**Evidencia principal:**

- `docker/nginx/nginx.main.conf`: `server_tokens off;` a nivel `http`.
- `nginx.frontend.gateway.conf`: `server_tokens off;`.
- `nginx.frontend.gateway.tls.conf.template`: `server_tokens off;`.
- `nginx-ssl-proxy.conf`: `server_tokens off;`.

**Riesgo residual:**  
Nginx open source estandar no elimina completamente el header `Server`; solo oculta la version. Si el auditor exige que el header no aparezca en absoluto, se requiere una imagen Nginx con modulo `headers-more` o un proxy/CDN que lo remueva. Sin embargo, el paso de remediacion OTIC de la evidencia indica que es aceptable que el header muestre solo `nginx` sin version.

### OTIC-007 - X-Powered-By: Express expuesto

**Estado propuesto para informe:** Corregido en superficie publica.

**Justificacion tecnica:**  
Se deshabilito `X-Powered-By` en `auth-service` y `api-gateway`, y Nginx oculta el header cuando proxifica respuestas de los servicios.

**Como se mitigo el riesgo:**  
El header ya no revela que la aplicacion usa Express/Nest sobre Node.js en la superficie publica. Esto reduce fingerprinting tecnologico y busquedas automatizadas de vulnerabilidades por framework.

**Evidencia principal:**

- `backend/auth-service/src/main.ts`: `disable('x-powered-by')`.
- `backend/api-gateway/src/main.ts`: `disable('x-powered-by')`.
- Nginx: `proxy_hide_header X-Powered-By`.

**Riesgo residual:**  
Algunos microservicios no tienen esta deshabilitacion local. Mientras todo pase por Nginx/API Gateway, el riesgo esta mitigado; si se exponen puertos internos directamente, debe replicarse el control en todos los `main.ts`.

### OTIC-008 - Strict-Transport-Security Header ausente

**Estado propuesto para informe:** Corregido en despliegue TLS.

**Justificacion tecnica:**  
Las plantillas TLS de Nginx agregan `Strict-Transport-Security` con valor parametrizable. El script de arranque construye el valor con `max-age`, `includeSubDomains` y opcion de `preload`.

**Como se mitigo el riesgo:**  
HSTS obliga a los navegadores a usar HTTPS durante el periodo configurado, reduciendo ataques de downgrade y conexiones accidentales por HTTP.

**Evidencia principal:**

- `nginx.frontend.gateway.tls.conf.template`: `add_header Strict-Transport-Security "${TLS_HSTS_VALUE}" always`.
- `docker/nginx/40-esap-select-config.sh`: construccion de `TLS_HSTS_VALUE`.

**Riesgo residual:**  
HSTS solo aplica cuando el sitio se sirve por HTTPS. En entornos locales HTTP no debe esperarse este header. Para produccion se debe validar que `ENABLE_TLS=true` o que el proxy TLS real agregue HSTS.

## Relacion con la segunda imagen

La segunda imagen muestra hallazgos de ZAP/escaneo que coinciden en gran parte con los OTIC, pero no son exactamente todos iguales.

| Hallazgo en imagen | Equivalencia revisada | Coincide con OTIC |
|---|---|---|
| Content Security Policy (CSP) Header Not Set | CSP ausente o incorrecta | OTIC-003 |
| Information Disclosure - JWT in Browser LocalStorage | JWT almacenado en localStorage | OTIC-001 |
| Missing Anti-clickjacking Header | Anti-clickjacking header ausente | OTIC-004 |
| Information Disclosure - Sensitive Information in Browser LocalStorage | Datos sensibles en localStorage | OTIC-002 |
| Private IP Disclosure | Divulgacion de IP privada | No aparece en la tabla OTIC inicial |
| Server Leaks Information via "X-Powered-By" HTTP Response Header | X-Powered-By expuesto | OTIC-007 |
| Server Leaks Version Information via "Server" HTTP Response Header | Server nginx/version expuesta | OTIC-006 |
| Strict-Transport-Security Header Not Set | HSTS ausente | OTIC-008 |
| X-Content-Type-Options Header Missing | X-Content-Type-Options ausente | OTIC-005 |

## Observacion sobre "Private IP Disclosure"

Este hallazgo no estaba en la tabla OTIC inicial que se reviso. En el codigo hay manejo de IPs en el API Gateway para reenviar informacion de cliente a servicios internos, pero eso es distinto a exponer IPs privadas en respuestas HTTP.

Para justificar o cerrar este punto se necesita la evidencia exacta del escaner: URL, parametro, respuesta o header donde aparece la IP privada. Sin esa evidencia no se puede afirmar que este corregido, porque puede venir de:

- un body JSON de algun endpoint,
- un header de proxy,
- un mensaje de error,
- una URL interna,
- documentacion o archivo estatico expuesto.

## Texto breve para cierre ejecutivo

Se revisaron los hallazgos OTIC y su equivalencia con los hallazgos del escaneo ZAP. Las vulnerabilidades relacionadas con JWT en localStorage, datos sensibles en storage, anti-clickjacking, X-Content-Type-Options, X-Powered-By, exposicion de version de Nginx y HSTS cuentan con controles implementados en backend, frontend y Nginx. La CSP fue implementada con una politica restrictiva y nonce dinamico, quedando su cierre sujeto a validacion sobre la URL exacta auditada. El hallazgo de divulgacion de IP privada no corresponde a un OTIC de la tabla inicial y requiere evidencia puntual del escaner para confirmar origen y correccion.

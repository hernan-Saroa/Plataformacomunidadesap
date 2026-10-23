# Revisión del chatbot antes del push

Fecha: 23 de octubre de 2026.

La comprobación adicional solicitada después de esta revisión añadió dos casos de regresión: revocación de lectura institucional durante el uso y saludos con la fuente documental habilitada. Ambos reprodujeron problemas y quedaron corregidos. El usuario puede recuperar solo su historial propio mediante GET después de un 403, sin escrituras ni repetición automática de envíos; los saludos no ejecutan ni simulan una búsqueda documental. La sesión inválida (401) continúa rechazándose. Los resultados finales de las pruebas se actualizan en la tabla siguiente.

Se revisaron los cambios del chatbot del checkout: interfaz remota, integración global en el shell, cliente HTTP, rutas del gateway, autorización e historial del backend, migración de propietario y conector Isolución. Se corrigieron problemas y se ejecutaron las verificaciones descritas abajo. Los cambios de PTA/RUND presentes en el checkout conservan su alcance independiente.

## Correcciones de esta revisión

### Persistencia y concurrencia

La prueba con TypeORM y PostgreSQL reales reprodujo un error `23502`: guardar la conversación con la colección anterior de mensajes cargada hacía que la cascada intentara desvincular mensajes que acababan de guardarse. Las pruebas anteriores en memoria no reproducían ese comportamiento del ORM.

- La creación de conversación y bienvenida ahora se guarda en una transacción.
- Cada intercambio guarda mensaje del usuario, respuesta y actualización de la conversación en una transacción. Una respuesta que no pueda persistirse revierte todo ese intercambio.
- La conversación se actualiza sin guardar sus relaciones. El borrado lógico tampoco guarda ni modifica la colección de mensajes.
- La búsqueda documental ocurre antes de abrir la transacción. Tras ella se revalida la propiedad y el estado activo bajo bloqueo de la fila, de modo que una conversación desactivada durante la consulta no recibe nuevos mensajes.
- Se asignan fechas crecientes explícitas a los mensajes para conservar el orden entre usuario y respuesta, incluyendo peticiones simultáneas; `now()` en PostgreSQL es constante dentro de una transacción.
- Los envíos y el borrado ya no cargan todo el historial para comprobar la propiedad.

### Sesión, privacidad y disponibilidad

- Se retiró el secreto JWT de respaldo del código. `JWT_SECRET` debe configurarse con el mismo valor del servicio de autenticación; si falta, la API privada rechaza la sesión.
- La desactivación de `auth.module.chatbot` se aplica también a todas las rutas privadas del servicio. Una comprobación fallida de disponibilidad impide continuar.
- Las respuestas privadas declaran `Cache-Control: private, no-store`.
- El CORS del servicio respeta una lista explícita de orígenes. `*` no autoriza compartir cookies con cualquier sitio. El tráfico del gateway al backend no necesita CORS.
- Se desactivó el registro de consultas SQL de TypeORM, que podía imprimir preguntas y extractos en desarrollo.
- Se habilitaron los hooks de cierre de Nest para cerrar el pool externo al finalizar el proceso.

Se mantienen la identidad obtenida del JWT/cuenta activa, la autorización consultada en la base de datos y el permiso específico de lectura institucional. Ese permiso no permite escribir ni borrar conversaciones ajenas. El chat público no recibe conversaciones privadas ni documentos de Isolución. En el gateway solo siguen abiertos los dos métodos públicos concretos del chatbot.

### Entrada, orientación e interfaz

- Mensajes de hasta 2000 caracteres y con contenido distinto de espacios, tanto en API como en el campo de entrada. Los metadatos deben ser un objeto.
- Título y contexto se validan con los límites reales de sus columnas: 255 y 100 caracteres.
- La orientación por reglas reconoce tildes. Evita confundir «contactar» con «acta», «acepta» con «PTA» y cualquier «proceso» con un expediente disciplinario. Se ajustaron textos que prometían disponibilidad inmediata de certificados o requisitos no verificados.
- La vista completa también alterna historial y chat en contenedores estrechos. Conserva el borrador al alternar o redimensionar. La medida se toma del contenedor mediante `ResizeObserver`, con alternativa basada en la ventana.
- El filtro de publicación de Isolución compara el valor completo de la columna, sin truncarlo antes de decidir qué registros están autorizados.

Se comprobaron el widget único por encima de las rutas, la conservación de borradores al navegar/minimizar, la limpieza de estado al cambiar de cuenta o gateway, los errores y recuperación sin repetir POST automáticamente, el renderizado sin interpretar HTML y la separación entre visitantes y cuentas autenticadas.

## Evidencia

| Verificación | Resultado |
| --- | --- |
| `npm test --workspace @esap-mfe/chatbot` | 99 pruebas aprobadas |
| `cd backend/chatbot-service` y `npm test` | 38 pruebas aprobadas |
| TypeScript de `apps/mfe-chatbot` | Correcto; incluye los componentes nuevos del shell importados por las pruebas |
| `cd backend/chatbot-service` y `npm run build` | Compilación NestJS correcta |
| Build de producción completo del shell | Correcto; salida en `.local/chatbot-review-shell-build`, sin reemplazar el build existente |
| `node scripts/verify-chatbot-widget-browser.mjs` | Build del remoto, federación y Chromium correctos; cinco tamaños, vista completa móvil, foco/Escape, historial, borradores, envío, aislamiento de cookies y cero errores de ejecución |
| `node scripts/verify-chatbot-postgres.cjs` | Migración idempotente, propietario legacy, permisos/revocaciones y activación comprobados con PostgreSQL y tablas TEMP |
| `node scripts/verify-chatbot-persistence.cjs` | TypeORM/PostgreSQL reales: historial íntegro y ordenado, envíos simultáneos, rollback por fallo SQL, propiedad y borrado durante consulta; exclusivamente tablas TEMP |
| `node --test scripts/verify-deploy-service-selection.test.cjs` | 24 pruebas aprobadas; selección de servicios/migraciones de dev, QA, pre y prod con despliegue simulado |
| `git diff --check` del alcance | Correcto |

El chequeo global de TypeScript del shell **no está aprobado**. La comparación virtual de los archivos de este cambio contra su versión `HEAD`, manteniendo el resto del checkout, encontró 616 diagnósticos antes y 615 después, sin diagnósticos nuevos. Hay errores existentes en certificados, control interno, componentes y utilidades compartidas, entre otros. No se alteraron esos módulos para ocultar o resolver sus errores. El resultado de esa comparación se conserva localmente en `.local/chatbot-shell-types.json`.

La compilación de la imagen Docker y la ejecución en servidores de destino no se realizaron. Se verificó la compilación local con Node 22 y se mantiene Node 22 en las dos etapas del Dockerfile del chatbot.

## Archivos y secretos

Se revisaron indicadores de credenciales en 71 archivos versionados o nuevos del alcance, sin encontrar contraseña configurada de Isolución ni claves privadas/tokens con los patrones comprobados. `.env.local`, `node_modules`, `dist` y los artefactos de `.local` están ignorados por Git. El `.dockerignore` impide copiar archivos `.env` a la imagen. La contraseña local de SQL está vacía y la búsqueda continúa desactivada. Los archivos temporales de la prueba de navegador se eliminaron.

La entrega incluye archivos nuevos además de modificaciones existentes. Deben incluirse los componentes/pruebas/CSS nuevos, el proveedor global, los guards y servicios nuevos, la migración `003`, la configuración de pruebas, los scripts de verificación, la superposición de Compose y la documentación. Los archivos locales de entorno y los artefactos de verificación permanecen fuera de Git.

Esta revisión no ejecutó commit, push, despliegue, reinicios de servicios ni migraciones sobre tablas permanentes.

## Requisitos al desplegar

1. Aplicar las migraciones del servicio en orden, incluida `003_secure_conversation_ownership.sql`, antes de usar el backend actualizado. Los scripts de selección de despliegue detectan las migraciones del chatbot; la prueba no ejecuta un despliegue real.
2. Desplegar coordinadamente gateway, backend del chatbot, remoto y shell. El contrato nuevo requiere `puedeEscribir` y los endpoints públicos de disponibilidad/orientación.
3. Configurar `JWT_SECRET` y PostgreSQL de forma coherente con autenticación. Para acceso directo desde navegador, declarar sus orígenes en `CORS_ORIGIN`; a través del gateway no hace falta habilitar CORS interno.
4. Mantener Isolución desactivado para búsqueda mientras falten las comprobaciones externas descritas abajo.

La migración no atribuye automáticamente conversaciones anteriores a una cuenta a partir de emails o IDs que antes enviaba el cliente. Ese historial se conserva y queda disponible con el permiso institucional de lectura. Acreditar un propietario anterior requiere un procedimiento administrativo separado.

## Lo que depende de Isolución y de la siguiente fase

El código del conector y su recorrido al chat privado están preparados y probados con datos ficticios. La validación real requiere:

- Conectividad desde la máquina/contenedor del chatbot y confirmación del puerto SQL o instancia. La última prueba de red documentada agotó el tiempo en TCP 1433.
- Credenciales locales/de entorno y SELECT sobre la vista.
- Descubrir esquema y columnas; asignar ID, título y texto, con URL/versión opcionales.
- Confirmar qué filtro limita los documentos a vigentes y autorizados para todos los usuarios autenticados del chatbot. Un estado «vigente» no equivale necesariamente a visibilidad. Si hay permisos por usuario, se debe ampliar la política antes de activar.
- Comprobar que haya contenido textual. Si la vista solo entrega metadatos o enlaces, habrá que implementar la obtención/extracción del documento correspondiente.

`npm run isolucion:check` arranca el diagnóstico independiente y actualmente devuelve `MISSING_CONFIG`, por la contraseña local vacía. No abre HTTP ni conecta a PostgreSQL.

El motor actual ofrece orientación por reglas y, al habilitarse la fuente, extractos documentales identificados. **Todavía no hay un modelo conversacional generativo integrado en el chatbot.** La selección/configuración de ese modelo y su evaluación con documentos reales pertenecen a la siguiente fase; este informe no las da por terminadas. Detalles: [integración Isolución](INTEGRACION-ISOLUCION.md) y [evaluación de IA](IA-Y-FUENTE-ISOLUCION.md).

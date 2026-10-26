# Fuente documental Isolución en el chatbot

## Estado

Se instaló `mssql` 12.7.11 en `backend/chatbot-service`, junto con sus tipos. El conector está registrado en el módulo del chat y dispone de diagnóstico independiente. No cambia PostgreSQL, certificados laborales, RUND, Ollama ni los permisos del gateway. Las dependencias del controlador requieren Node 22 o posterior; las dos etapas del Dockerfile del chatbot usan Node 22.

La comprobación del 22 de octubre de 2026 a las 23:56 UTC volvió a encontrar ruta VPN, pero TCP 1433 agotó diez segundos y SQL Browser UDP 1434 no respondió. No se pudo abrir sesión SQL, confirmar credenciales, descubrir esquema/columnas ni consultar documentos. El nombre del objeto no permite deducir sus campos.

La conexión se habilita independientemente de la búsqueda. Por defecto ambas están desactivadas. El archivo local ignorado `.env.local` prepara servidor, base, usuario y objeto proporcionados; deja la contraseña y el mapeo vacíos, y la búsqueda desactivada. No se copiaron contraseñas desde la conversación. No se reiniciaron servicios ni se desplegó el cambio.

## Funcionamiento

- `IsolucionService` abre un pool propio solo al solicitar diagnóstico o búsqueda. No conecta durante el arranque ni desde `/health`. Limita el pool a dos conexiones, apertura a cinco segundos y cada consulta a 2,5 segundos; aplica un presupuesto de 14 segundos a la operación y una pausa de reconexión tras fallos. El tiempo total también puede incluir esperas de adquisición/cancelación del controlador; no garantiza un límite absoluto de respuesta HTTP.
- El diagnóstico consulta únicamente `sys.views`, `sys.columns`, `sys.types` y `SELECT TOP (0)`. Descubre el esquema sin asumir `dbo`, comprueba SELECT y muestra columnas sin filas documentales. Si hay varias vistas homónimas, exige elegir esquema. Los mensajes SQL originales, usuarios y contraseñas no se imprimen.
- La búsqueda exige mapeo explícito y un filtro exacto de publicación autorizada. Comprueba que las columnas existan, parametriza términos y valores, escapa identificadores y devuelve tres resultados como máximo, con identificador, título, versión opcional, extracto de hasta 2000 caracteres y URL HTTP/HTTPS opcional. No ejecuta SQL suministrado por usuarios ni por modelos. No descarga archivos desde enlaces.
- La integración contiene únicamente consultas SELECT. `readOnlyIntent` solicita intención de lectura al servidor; **no sustituye los permisos SQL**. La cuenta debe tener los permisos mínimos sobre la vista. Referencias: [controlador mssql](https://github.com/tediousjs/node-mssql), [intención de lectura en Tedious](https://tediousjs.github.io/tedious/api-connection.html), [visibilidad de metadatos SQL Server](https://learn.microsoft.com/en-us/sql/relational-databases/security/metadata-visibility-configuration).
- El chat privado comprueba primero propiedad de la conversación. Si se activa búsqueda, devuelve extractos identificados y conserva las fuentes en `metadatos.fuentes`, también al recuperar historial. Diferencia falta de coincidencias de indisponibilidad de la fuente. No envía documentos de Isolución al chat público.
- Con búsqueda desactivada se conserva el motor actual. Esta entrega no incorpora un modelo conversacional, embeddings ni entrenamiento. La búsqueda es léxica, toma hasta cuatro términos y exige coincidencia de todos; no equivale a recuperación semántica ni garantiza localizar todos los documentos pertinentes. No puede responder contenido que la vista solo referencie mediante un enlace.

## Configuración y validación reales pendientes

1. Confirmar el puerto TCP/instancia y acceso VPN a `172.16.202.145`. Probar desde la máquina o contenedor que vaya a ejecutar el chatbot, pues el acceso del equipo no acredita el del contenedor.
2. Proporcionar `CHATBOT_ISOLUCION_PASSWORD` mediante el entorno o completar localmente el archivo ignorado del servicio. No usar argumentos de línea de comandos ni versionar credenciales. Mantener cifrado y validación de certificado habilitados; cualquier certificado institucional debe configurarse con la información real del servidor, sin desactivar validación automáticamente.
3. Desde `backend/chatbot-service`, ejecutar `npm run build` y `npm run isolucion:check`. El comando no abre HTTP ni conecta a PostgreSQL. Carga `.env` y `.env.local` con la misma precedencia que la aplicación, sin expandir `$` dentro de contraseñas. El entorno del proceso tiene prioridad. `connected: false` produce salida de proceso 1.
4. Con las columnas verificadas, completar `CHATBOT_ISOLUCION_SCHEMA` si hace falta y los campos `ID_COLUMN`, `TITLE_COLUMN`, `TEXT_COLUMN`; opcionalmente `URL_COLUMN` y `VERSION_COLUMN`. No asignar nombres de ejemplo sin comprobarlos. Si no hay texto, hace falta una fase de obtención y extracción del documento antes de habilitar respuestas de contenido.
5. Confirmar una columna y valor que limiten los registros a documentos vigentes y autorizados para **todos los usuarios autenticados del chatbot**, y asignarlos a `ALLOWED_COLUMN`/`ALLOWED_VALUE`. Un estado «vigente» por sí solo puede no acreditar visibilidad. Si se necesitan varios filtros, caducidad o permisos por usuario, ampliar la política antes de activar la búsqueda; el filtro simple de esta entrega no los implementa.
6. Revisar una muestra pequeña autorizada y comparar los extractos con la fuente. Solo entonces establecer `CHATBOT_ISOLUCION_SEARCH_ENABLED=true` y reiniciar únicamente el chatbot.

Los nombres completos de las variables y valores predeterminados están en `backend/chatbot-service/.env.example`. No hay un endpoint público de diagnóstico ni de listado de documentos.

## Docker opcional

`docker-compose.chatbot-isolucion.yml` añade el archivo local de entorno exclusivamente al chatbot. El `.dockerignore` del servicio impide copiar archivos `.env` a la imagen. Para aplicar después de completar y verificar la configuración:

```powershell
docker compose -f docker-compose.dev.yml -f docker-compose.chatbot-isolucion.yml up -d --build --no-deps chatbot-service
```

También puede superponerse al compose del entorno elegido, tras revisar sus opciones. No se modificaron los archivos de despliegue de QA/preproducción/producción. No se ejecutó el comando de despliegue.

## Verificación

`npm test` comprueba HTTP real de Nest con JWT y repositorios en memoria, aislamiento del chat público, propiedad e historial, fuentes y fallos, además de un controlador SQL simulado para permisos, esquema, mapeo, filtros, parámetros, límites y cierre de conexiones. Se comprueba también que la versión instalada de mssql acepte timeout por petición. Estas pruebas no sustituyen una conexión al SQL Server real.

Resultado actualizado al 23 de octubre: 38 pruebas aprobadas del backend y compilación NestJS correcta. `npm run isolucion:check` arrancó el módulo independiente y devolvió `connected: false`, `code: MISSING_CONFIG`, porque el archivo local no contiene contraseña. Esto es distinto del timeout TCP comprobado por el diagnóstico de red: ambos requisitos siguen pendientes. No se construyó ni desplegó una imagen Docker. La revisión adicional de persistencia, seguridad e interfaz está documentada en [revisión antes del push](REVISION-PRE-PUSH.md).

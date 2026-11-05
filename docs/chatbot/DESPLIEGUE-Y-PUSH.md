# Chatbot: preparación del push y despliegue por ambiente

El mismo código sirve para `dev`, `qa`, `pre` y `prod`. El backend y el navegador
obtienen sus direcciones de la configuración del ambiente; los enlaces internos
del chatbot son relativos al portal. No hay claves SQL o web dentro del código,
del frontend ni de la imagen. Los modelos se almacenan en volúmenes Docker, fuera
de Git. Esta preparación no realiza un push ni despliega servidores remotos.

## Una sola vez en cada servidor

Requiere la plataforma funcionando, sus migraciones habituales del chatbot
aplicadas, Node 22 para desarrollo/CI y Docker Compose **2.30 o posterior** para
el perfil GPU incluido. La instancia local necesita NVIDIA compatible y recursos
suficientes para Qwen 9B. También puede utilizarse un servidor de IA remoto.
El servidor del chatbot debe alcanzar SQL `172.16.202.145:1433` y el sitio HTTPS
de Isolución: instalar Qwen no crea rutas de red, VPN, credenciales ni certificados.

Desde la raíz del repositorio (ejemplo QA; sustituir por el ambiente):

```bash
bash scripts/chatbot/manage.sh qa init
# Completar la configuración privada y las dos credenciales antes de continuar.
bash scripts/chatbot/manage.sh qa install-ai
bash scripts/chatbot/manage.sh qa deploy
```

`init` crea `backend/chatbot-service/.env.knowledge.qa`, ignorado por Git y con
permisos privados en Linux. No sobrescribe archivos existentes ni guarda claves.
La plantilla ya contiene la vista, columnas, filtro de documentos aprobados y
URLs verificadas. Los parámetros se pueden cambiar sin modificar TypeScript.

Configurar una vez:

- `CHATBOT_ISOLUCION_PASSWORD` y `CHATBOT_ISOLUCION_WEB_PASSWORD`, mediante el
  gestor de secretos del servidor exportados al proceso de despliegue, o dentro
  del archivo privado. En un archivo usar comillas simples para preservar `$`.
  Nunca pasar claves como argumentos ni agregarlas a Git.
- `CHATBOT_CA_CERT_FILE`, si SQL o el sitio necesitan una CA institucional.
  El archivo PEM existente se monta solo en el chatbot y en modo de solo lectura.
  El perfil conserva `ENCRYPT=true` y `TRUST_SERVER_CERTIFICATE=false`.
- `CHATBOT_AI_SHARED_GPU=true` si comparte GPU con Gemma. El monitor indicado por
  `CHATBOT_AI_OCR_OLLAMA_URL` debe ser accesible **desde el contenedor**. En Linux,
  si Gemma solo publica en loopback, configurar `CHATBOT_AI_OCR_NETWORK` con su red
  Docker existente y `CHATBOT_AI_OCR_OLLAMA_URL=http://rund-ollama:11434` (o el nombre
  real del servicio). Se conecta solo el chatbot a esa red; no se modifica RUND.
  Usar `SHARED_GPU=false` solo con recursos dedicados que no compitan con el OCR.

El archivo privado admite líneas `CHATBOT_CLAVE=valor` y comentarios, sin variables
de otros módulos ni valores multilínea. No se ejecuta con `source`: Compose lo
interpreta como datos. El entorno del gestor de secretos tiene precedencia.
Se aceptan CRLF, espacios alrededor de las claves y comentarios en el selector
`CHATBOT_AI_USE_SIDECAR`; los valores booleanos deben seguir siendo `true` o `false`.
Las opciones desconocidas del instalador se rechazan antes de crear archivos o
ejecutar Docker. El montaje de CA tampoco crea carpetas si falta el certificado.

`install-ai` espera a que Ollama esté disponible y descarga únicamente
`qwen3.5:9b`. No instala ni sustituye Gemma. Los proyectos son `esap-chatbot-ai`
en dev (compatible con la instalación local existente) y
`esap-chatbot-ai-qa`, `esap-chatbot-ai-pre`, `esap-chatbot-ai-prod` en los demás.
Sus puertos de IA son respectivamente 11436, 11446, 11456 y 11466, publicados
solo en loopback, con redes y volúmenes propios. No inicia la plataforma completa.

Para IA remota, usar `init remote` como tercer argumento, configurar
`CHATBOT_OLLAMA_URL` y completar la elección de GPU compartida o dedicada. No se
requiere la red del sidecar ni GPU NVIDIA en el servidor del chatbot:

```bash
bash scripts/chatbot/manage.sh qa init remote
# Sustituir el host de ejemplo por el servidor real que ya tenga qwen3.5:9b.
bash scripts/chatbot/manage.sh qa deploy
```

## Actualizaciones posteriores

Los scripts `deploy.dev.sh`, `deploy.qa.sh`, `deploy.pre.sh` y `deploy.prod.sh`
detectan el archivo `.env.knowledge.<ambiente>` y añaden automáticamente los
overlays al desplegar el chatbot o levantar el conjunto completo. Un despliegue
dirigido a otro módulo no añade requisitos de red, certificados ni IA del chat.
Si el archivo no existe, mantienen su comportamiento anterior.
`CHATBOT_KNOWLEDGE_ENV_FILE` permite seleccionar una ruta explícita; si falta el
archivo solicitado, la operación falla sin tocar servicios. Se conserva la
configuración y validación existente de RUND.

Para actualizar **solo el chatbot**, usar:

```bash
bash scripts/chatbot/manage.sh qa deploy
bash scripts/chatbot/manage.sh qa status
```

`deploy` valida Compose, construye solo el chatbot y ejecuta un contenedor de
diagnóstico temporal antes del reemplazo. Comprueba activación, conexión SQL,
mapeo, modelo instalado y monitor de OCR cuando corresponda; además lee un
documento público aprobado (`CHATBOT_DEPLOY_DOCUMENT_CODE`, inicialmente
`GF-PT-008`). Este diagnóstico no infiere ni precarga documentos en segundo plano.
Si falla, no ejecuta `up`. Si pasa, aplica `up -d --no-deps chatbot-service`.
No ejecuta migraciones SQL, cargas de archivos, `down`, limpieza de volúmenes ni
reinicios de otros módulos. Las consultas de Isolución siguen siendo SELECT.

También existe `bash scripts/chatbot/manage.sh qa check` para repetir el diagnóstico
sin reemplazar el servicio; requiere que la imagen ya esté construida.
Una GPU compartida sigue siendo hardware compartido: el monitor da prioridad al
OCR, pero no constituye aislamiento físico ni garantiza capacidad simultánea.

## Qué debe entrar al commit

Revisar y añadir los cambios del chatbot en:

- `backend/chatbot-service/`, **incluido `package-lock.json`**.
- `apps/mfe-chatbot/` y los scripts `scripts/*chatbot*` y `scripts/chatbot/`.
- `docker-compose.chatbot-*.yml`, las entradas del chatbot en los Compose base,
  los cuatro `deploy.<ambiente>.sh` y la excepción del lockfile en `.gitignore`.
- `.github/workflows/build-backend-{dev,qa,pre,prod}.yml`,
  `.github/workflows/validate-chatbot.yml` y `docs/chatbot/`.

No añadir `.env.knowledge*`, `.env.<ambiente>`, `.local/`, `node_modules/`, modelos,
cookies ni certificados privados. Hay cambios previos de PTA/RUND en el árbol de
trabajo: revisarlos por separado; esta preparación no los descarta ni los agrega
al índice. No se han creado nuevos cambios de esquema para Isolución.

Las imágenes del chatbot entran en las cuatro matrices de publicación de backend.
Su trabajo ejecuta pruebas y compilación antes de publicar su imagen, con
`npm ci` y el lockfile versionado. El runtime Node y Ollama están fijados por
digest. Un workflow adicional valida contratos, despliegue simulado y Compose
con credenciales ficticias, sin instalar modelos ni usar datos reales.

## Verificaciones reproducibles

```bash
npm ci --prefix backend/chatbot-service
npm test --prefix backend/chatbot-service
npm run build --prefix backend/chatbot-service
CHATBOT_COMPOSE_RENDER_TEST=true node --test scripts/chatbot/*.test.cjs scripts/verify-deploy-service-selection.test.cjs scripts/rund-documental/deploy-guard.test.cjs
```

Ejecutar `npm ci` en CI o una copia de trabajo de validación, no sobre las
dependencias de un proceso Node que esté atendiendo solicitudes. Las pruebas de
despliegue usan Docker simulado; las pruebas Compose solo renderizan modelos
sintéticos y comprueban que los demás servicios permanecen idénticos.

## Resultado de esta preparación

- 157 pruebas de backend aprobadas en Linux, sin red y con solo las dependencias
  instaladas mediante el lockfile del chatbot.
- 120 pruebas de despliegue aprobadas, incluidas 20 configuraciones Compose reales
  con datos sintéticos, selección de servicios, coexistencia con RUND y secretos.
- Compilación Nest y construcción de la imagen de producción con `npm ci`
  correctas. Las cinco automatizaciones tienen YAML válido.
- Se comprobó con contenedores sin red que los signos `$` de claves ficticias
  llegan literalmente desde el archivo privado y desde el entorno del gestor.
- Las 12 comprobaciones del chatbot local volvieron a pasar tras reconectar la
  VPN (7–222 ms); una respuesta documental real de `GF-PT-008` tardó 194 ms y
  la navegación de títulos en el widget, 83 ms. Su proceso no se reemplazó.
  Son mediciones locales, no garantías
  de red o capacidad en otros servidores.
- OCR/Gemma conservaron sus procesos, cero reinicios y las mismas huellas de
  configuración. No se realizó commit, push ni despliegue remoto.

El verificador en vivo escribe fecha y estado en
`.local/chatbot-content-policy-live.json`, incluso si falla; un error no conserva
un informe positivo anterior. Si SQL deja de ser accesible desde la red actual,
la navegación puede seguir funcionando, pero las respuestas documentales no se
consideran verificadas. Repetir `check` desde el servidor con acceso institucional
antes de desplegar; no desactivar certificados ni cambiar otras redes para ocultar
ese fallo.

Referencias primarias: [opciones de servicios de Compose](https://docs.docker.com/reference/compose-file/services/)
y [precedencia, archivos de entorno e interpolación](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/).

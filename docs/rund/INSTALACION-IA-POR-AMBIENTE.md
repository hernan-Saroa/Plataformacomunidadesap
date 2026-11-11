# IA de OCR RUND por ambiente

El perfil reproduce **RUND/PaddleOCR y Gemma `gemma4:e4b`**, como la instalacion
activa verificada el 3 de noviembre de 2026. El chatbot conserva Qwen y sus
propios volumenes. La captura produce sugerencias con revision humana.

## Requisitos

Docker con Compose v2, Node.js 20 o 22 y acceso inicial a los registros de
imagenes y modelos. GPU NVIDIA con soporte Docker recomendada; CPU es posible
pero la velocidad depende del equipo. Los pesos de Gemma ocupan unos 6,6 GB;
reserve tambien disco para las imagenes y Paddle y dimensione RAM/VRAM. No se
garantiza una latencia fija para OCR.

La plataforma necesita sus variables habituales de BD/JWT, almacenamiento y
permisos. Instalar la IA no sustituye esos requisitos. Conserve el procedimiento
vigente de migraciones, en particular `422_create_rund_documentos_perfil.sql`,
`656_rund_extraccion_experimental.sql` y `657_rund_extraccion_progreso.sql`.
Hay otros archivos con los numeros 656/657: use los nombres completos.
El instalador no ejecuta SQL ni activa el modulo documental aplazado.

## Primera instalacion

Desde la raiz del repositorio, en Windows PowerShell o Linux:

```sh
node scripts/rund-ai/manage.cjs dev init
node scripts/rund-ai/manage.cjs dev install --gpu
node scripts/rund-ai/manage.cjs dev prepare
node scripts/rund-ai/manage.cjs dev check
```

Cambie `dev` por `qa`, `pre` o `prod` en todos los comandos. Para CPU omita
`--gpu`; mantenga esa opcion en futuras instalaciones si eligio GPU.
`init` crea `backend/academic-work-plan-service/.env.rund-ai.<ambiente>` con
exclusion de escritura: falla si ya existe. Se ignora en Git y solo admite las
nueve variables del ejemplo `rund-ai.env.example`, sin secretos. Para otra ruta
configure `RUND_AI_ENV_FILE`.

`install` prepara el motor con la correccion CPU/color/concurrencia que ya usa
RUND y descarga Gemma en un volumen exclusivo. La primera descarga puede tardar.
Las imagenes base estan fijadas por digest y el proyecto Docker es
`esap-rund-ai-<ambiente>`. No instala Qwen ni elimina modelos anteriores.

`prepare` compila la imagen PTA sin reemplazar el servicio actual. `check`
ejecuta un proceso diagnostico temporal con la red y variables de PTA:
consulta `/health`, `/api/tags` y metadatos PostgreSQL dentro de
`BEGIN READ ONLY`. No carga AppModule, no inicia el worker, no consume la cola,
no envia documentos a inferencia y no aplica migraciones. Si falta BD, un motor,
Gemma o el esquema RUND, finaliza con error. No mide precision OCR.

Despues de `check`, despliegue **solo PTA** mediante el script habitual,
que conserva las comprobaciones de almacenamiento documental del ambiente:

```sh
bash deploy.dev.sh rebuild-service academic-work-plan-service
node scripts/rund-ai/manage.cjs dev status
```

Este ultimo despliegue si reemplaza PTA. Los comandos previos de preparacion
no lo reinician. Los cuatro `deploy.*.sh` agregan el perfil solo si existe y la
operacion incluye PTA o un arranque completo. Desplegar otro servicio no depende
del perfil RUND. El overlay agrega cinco variables OCR y una red a PTA;
conserva las demas variables, montajes y red original.

## Puertos y aislamiento

| Ambiente | OCR desde el host | Ollama desde el host | Red |
|---|---|---|---|
| dev | 127.0.0.1:8091 | 127.0.0.1:11435 | esap-rund-ai-dev |
| qa | 127.0.0.1:8191 | 127.0.0.1:11535 | esap-rund-ai-qa |
| pre | 127.0.0.1:8291 | 127.0.0.1:11635 | esap-rund-ai-pre |
| prod | 127.0.0.1:8391 | 127.0.0.1:11735 | esap-rund-ai-prod |

PTA en Docker usa `http://rund-ocr:8000` y `http://rund-ollama:11434`;
**localhost dentro de PTA apunta al propio PTA**. Los puertos del host son
configurables y solo se publican en loopback. RUND `/extract-text` no usa el token
del experimento LOCAL: debe permanecer en una red privada. Cada ambiente tiene
volumenes separados para Paddle, temporales OCR y Gemma. No comparta esos
volumenes con el chatbot ni publique los motores mediante el proxy publico.

## Reutilizar motores existentes

Para PTA en Docker, genere el perfil y cambie exclusivamente:

```dotenv
RUND_AI_MODE=external
RUND_AI_NETWORK=rund_rund-network
RUND_OCR_URL=http://rund-ocr:8000
RUND_OLLAMA_URL=http://rund-ollama:11434
```

Es el caso del grupo local actual. En cada servidor ajuste la red y los nombres
privados reales. Con `external`, no ejecute `install`: use `prepare` y `check`.
PTA se conectara a la red existente sin recrear motores o volumenes.
Para PTA ejecutado directamente con Node, conserve su `.env` habitual con URL
de host (`localhost:8000/11434` en el equipo actual, o los puertos de la tabla
para motores nuevos). El perfil Docker no se carga en un proceso Node nativo.

El instalador anterior `setup-rund-ocr.ps1` corresponde a LOCAL/PP-OCRv6/Qwen.
Ahora rechaza configuraciones RUND/Gemma y conserva los modelos. No debe usarse
para migrar la instalacion activa.

## Deshabilitar y verificar

Cambie `RUND_OCR_ENABLED=false` y redespliegue solo PTA para deshabilitar la
extraccion conservando documentos y sugerencias. Para omitir el overlay en los
scripts existentes exporte `RUND_AI_DEPLOY_ENABLED=false`. No use `down -v` ni
limpiezas globales.

```sh
node --test scripts/rund-ai/*.test.cjs
```

Con Docker disponible, `RUND_AI_COMPOSE_RENDER_TEST=true` habilita las
comparaciones Compose de los cuatro ambientes con datos sinteticos. El workflow
`validate-rund-ai.yml` ejecuta estas comprobaciones y regresiones OCR con motores
simulados, sin descargar pesos. Los despliegues remotos deben ejecutar `check`
en su propia red antes de habilitar el perfil.

Verificacion local del 3 de noviembre de 2026: compilacion PTA y construccion de
ambas imagenes correctas; 1.458 pruebas PTA aprobadas (las que requieren una BD
de pruebas no disponible se omiten), 38 comprobaciones de despliegue/diagnostico
RUND y 120 de despliegue compartido aprobadas. El diagnostico tambien paso contra
los motores y el esquema actuales desde Node y desde la imagen PTA aislada.
No se reemplazaron servicios ni se enviaron documentos a inferencia en esta
revision de instalacion. Esto no equivale a probar los servidores remotos ni la
precision del OCR sobre todos los soportes institucionales.

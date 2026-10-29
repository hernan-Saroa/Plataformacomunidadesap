# REQ-RUND-F014 — Asistente documental experimental

Implementación del procesamiento local PP-OCRv6 → Qwen 3.5/Ollama para proponer datos del perfil RUND. El módulo requiere activación explícita y revisión humana; no es una dependencia de la carga documental, del perfil manual ni de los PTA. No implementa REQ-RUND-F016 (historial «En Firme»).

## Estado de entrega

La instalación local se actualizó y comprobó el 25 de septiembre de 2026 con un perfil de mayor precisión: PP-OCRv6 medium con corrección de orientación/perspectiva y Qwen 3.5 4B para interpretar los campos en español. Los dos modelos Gemma anteriores fueron retirados después de validar Qwen. Las migraciones 656 y 657 permanecen vigentes y no se ha desplegado en producción.

La prueba completa utilizó un diploma ficticio, motores reales y PostgreSQL con tablas temporales y rollback. PP-OCRv6 leyó correctamente todo el texto y Qwen extrajo «Administración Pública» con la cita exacta, mantuvo el perfil intacto mientras la sugerencia estaba pendiente y verificó la confirmación humana, el rollback conjunto, la no duplicación, el reemplazo documental, el descarte y los reintentos. En este equipo las tres lecturas OCR tardaron 74,3 / 56,6 / 54,1 segundos y Qwen 3,6 / 2,7 / 3,4 segundos. El nuevo perfil todavía debe medirse con el corpus institucional acordado.

Los artefactos reproducibles están en `.local/rund-extraction-real/`. No se analizaron ni modificaron expedientes reales para esta prueba. La interfaz se verificó en navegador con componentes reales y API simulada. **Sigue pendiente la evaluación de precisión con un conjunto representativo de soportes institucionales**: un diploma sintético no acredita precisión general. El módulo conserva su carácter experimental y la validación humana obligatoria.

## Uso del operador

El OCR es una ayuda opcional: el cargador puede adjuntar los soportes y el revisor puede validar los campos y aprobar los bloques sin usar, confirmar ni descartar sugerencias OCR. Sus estados de cola, procesamiento, error y propuestas pendientes no bloquean ese flujo. Analizar un documento o publicar sus sugerencias conserva las aprobaciones existentes. Solo aplicar voluntariamente una propuesta que cambie datos del perfil requiere revisar otra vez los bloques afectados. La validación humana descrita en este documento es obligatoria para **aplicar** un dato extraído, no para utilizar la revisión documental convencional.

1. Cargar el PDF mediante la gestión documental RUND existente. Con el asistente habilitado, seleccionar los archivos que se desean analizar y definir su orden antes de enviarlos a la cola. Las cargas nuevas no inician OCR automáticamente; el modo anterior requiere configurar expresamente `RUND_EXTRACCION_AUTOMATICA=true` en el servicio PTA.
2. Abrir el expediente con acceso GGP. Debajo de los documentos aparece **Asistente de captura · Experimental**; los estados se consultan cada 10 segundos sin bloquear el perfil.
3. Revisar el dato previo, la sugerencia, el fragmento OCR y su página. **Ver PDF de origen** abre la versión exacta. Una confianza baja queda marcada en naranja.
4. **Aplicar al perfil** guarda el dato exacto del OCR cuando el revisor lo confirma; **Confirmar coincidencia** registra la revisión de un valor que ya coincide. Las diferencias con el perfil se muestran como advertencias y no impiden aceptar una sugerencia. La decisión conserva el operador, la fecha y el PDF de origen. Para introducir otro valor se utiliza el editor habitual con su justificación y soporte.
5. **Descartar** exige un motivo y conserva el resultado original para trazabilidad.

Mientras trabaja, el asistente muestra una barra por etapas reales: **Preparar PDF → Leer texto → Extraer datos → Verificar sugerencias**, con tiempo transcurrido y mensajes de cola/reintento. No se presenta un porcentaje ficticio de tiempo restante. El progreso se guarda en PostgreSQL; salir del módulo, cerrar la pestaña o cerrar sesión no cancela el trabajo. En instalación local, el equipo y los servicios deben permanecer encendidos; si se detienen, la cola se recupera cuando vuelven a funcionar.

Al completar, agotar los reintentos o detectar un documento obsoleto, un proceso independiente entrega un aviso persistente al usuario que solicitó el análisis o cargó el soporte. La campanita lo muestra desde cualquier módulo, normalmente en su siguiente consulta de 30 segundos. **Ver resultado** abre el expediente por id, sin depender de filtros, página o periodo del listado. El aviso no incluye datos extraídos ni envía correo. Si notificaciones está fuera de servicio, se reintenta sin repetir el OCR; una clave estable impide duplicar el aviso o reiniciar su marca de lectura. Si no puede resolverse el usuario destinatario activo, no se difunde a otros usuarios y se vuelve a comprobar al día siguiente.

La aprobación de una sugerencia confirma el dato editado, pero **no aprueba automáticamente los soportes ni los bloques documentales**: siguen las validaciones del flujo RUND. Un PDF reemplazado/eliminado no puede respaldar una nueva aplicación. Si alguien modificó el mismo campo después de extraerlo, se rechaza el guardado asistido: hay que descartar la sugerencia y solicitar un nuevo análisis.

Los documentos anteriores a la primera activación se procesan solo mediante **Extraer sugerencias**. El reanálisis conserva los trabajos anteriores y requiere revisar o descartar sus sugerencias pendientes. Los errores permiten reintentar explícitamente.

## Arquitectura y persistencia

```mermaid
flowchart LR
  A[Carga PDF existente] --> B[Documento RUND versionado]
  B --> C[Cola PostgreSQL]
  C --> D[PP-OCRv6 local]
  D --> E[Qwen 3.5 en Ollama local]
  E --> F[Validación de campos y evidencia]
  F --> G[Sugerencias pendientes]
  G --> H[Revisión humana GGP]
  H --> I[Editor manual validado]
  I --> J[Perfil y decisión en una transacción]
  H --> K[Descarte con motivo]
```

Migración `db/migrations/656_rund_extraccion_experimental.sql`, posterior a las tablas documentales RUND:

- `RundExtraccionInicio`: marca persistente de primera activación; no se pierde al reiniciar el backend.
- `RundExtraccionTrabajo`: versión documental, docente, solicitante, estado, intentos, plazo de procesamiento, perfil al extraer, checksum y versiones de motores/contrato.
- `RundExtraccionSugerencia`: campo, original, propuesta, evidencia, página, confianza orientativa, decisión, valor confirmado, operador, motivo y fecha.

El worker del servicio PTA consulta cada 5 segundos. Usa una reserva de 90 segundos renovada cada 20 segundos mientras trabaja y `FOR UPDATE SKIP LOCKED`; un índice parcial impide dos trabajos activos para la misma versión. Si cae el proceso, la reserva expira y se recupera sin esperar el timeout completo del modelo. Los fallos tienen hasta tres intentos, con espera de un minuto entre intentos normales. Los resultados tardíos de una reserva vencida se ignoran. No se duplica automáticamente un documento ya analizado; un reanálisis explícito crea otro trabajo.

La migración `657_rund_extraccion_progreso.sql` agrega etapas, tiempos y estado de entrega del aviso. La reserva del trabajo y el descarte usan `WITH … UPDATE … RETURNING … SELECT`: conserva el contrato de filas al ejecutar con TypeORM. Su driver PostgreSQL devuelve `[filas, cantidad]` para un `UPDATE` directo, diferencia que causaba el estado «Procesando» sin iniciar OCR. La prueba de integración ahora usa **PostgresQueryRunner real**, no un adaptador que devuelva únicamente las filas.

La extracción solo inserta sugerencias. Al editar con `rundSuggestionIds`, el backend bloquea la sugerencia, el documento y el perfil, comprueba vigencia y dato previo, ejecuta las validaciones manuales existentes y guarda perfil + decisión en **la misma transacción**. Las ediciones sin sugerencias conservan su ruta habitual.

## Campos y confianza

La lista cerrada está en `rund-extraccion-fields.ts`; el modelo nunca determina columnas SQL. Se limita por tipo de soporte; un PDF general sin tipo se limita por categoría documental.

| Soporte | Campos candidatos |
| --- | --- |
| Identidad | Nombre completo y fecha de nacimiento |
| Diplomas y actas de grado | Pregrado, especialización, maestría, doctorado, posdoctorado |
| Hoja de vida | Perfil académico |
| Contrato / acto de vinculación | Acto y fechas de vinculación |
| Resoluciones específicas | Origen, situación administrativa, escalafón y núcleo temático |
| Certificaciones y evaluación | Investigación y última evaluación |

Desde un soporte de identidad se proponen tipo y número de documento, nombre completo, género, sexo biológico y fecha de nacimiento. El revisor puede confirmar cada dato, incluido un número de documento diferente al registrado. Las diferencias simultáneas de nombre y número son informativas: no bloquean la aplicación ni obligan a rechazar el PDF. La corrección del número conserva el UUID de la persona y comprueba que el número no esté asignado a otra persona. Género y sexo solo se normalizan cuando el documento contiene un marcador explícito; nunca se deducen del nombre o la fotografía. No se extraen contraseñas, permisos, estados, horas calculadas, puntaje salarial ni otros atributos sensibles inferidos. La fecha de nacimiento nunca se reconstruye a partir de una edad.

Se descartan campos desconocidos, repetidos, valores vacíos, páginas inexistentes y citas no presentes en el OCR. Los valores deben estar contenidos en la cita, salvo fechas normalizadas a `AAAA-MM-DD`, que siempre requieren una fecha válida y se marcan con confianza baja si no aparecen literalmente. Cada cita tiene como máximo 600 caracteres y cada valor 1000; las restricciones más precisas del formulario se aplican durante la revisión/guardado.

La puntuación es **orientativa, no una probabilidad calibrada**: mínimo de la confianza declarada por el modelo y el percentil 10 de confianza OCR de la página. Menos de `0,85` se marca como baja; fechas normalizadas sin coincidencia literal se limitan a `0,5`. **Ni siquiera confianza 1 elimina la revisión humana.** El texto del PDF se trata como contenido no confiable y no habilita herramientas ni acciones para el modelo.

## Contrato API

Base externa del gateway: `/pta/api/v1/pta/banco-docentes/:docenteId/extracciones`.

| Método / ruta relativa | Operación |
| --- | --- |
| `GET /` | `{success:true,data:{enabled,jobs,documents}}`; cada trabajo incluye sus sugerencias y la vigencia documental. Sin caché. |
| `POST /documentos/:documentId` | Solicitud/reintento explícito, cuerpo `{}`; HTTP 202 y `{success:true,data:{queued:true}}`. |
| `POST /sugerencias/:suggestionId/descartar` | Cuerpo `{motivo:"..."}` de 3 a 1000 caracteres; responde `discarded:true`. |

No existe un endpoint de aprobación automática. El endpoint existente de edición del docente recibe adicionalmente `rundSuggestionIds:["uuid"]`, junto con el valor revisado, `soporteEdicionId`, `justificacionEdicion` y el resto del formulario validado. Los IDs deben pertenecer a este docente y a campos distintos. El servidor obtiene el operador y su acceso de la sesión autenticada; no confía en un rol enviado por el navegador.

Se conservan los guards JWT y permisos RUND existentes. Además de editar/gestionar RUND, el operador debe tener acceso completo al documento original (GGP/SUPER_ADMIN); tener únicamente un permiso de edición con datos restringidos no permite consultar texto OCR. Consultas, solicitudes y descartes registran auditoría de acceso; la edición guarda su auditoría existente y los IDs de las sugerencias utilizadas.

Contrato privado OCR: `POST /extract`, `Authorization: Bearer <RUND_OCR_TOKEN>`, multipart `file` PDF. Respuesta `{motor,paginas:[{pagina,texto,confianza}]}`. `GET /health` no muestra documentos ni secretos. Ollama se consume con `POST /api/chat`, `stream:false`, esquema JSON cerrado y temperatura cero.

## Instalación local

### Despliegue por cambios en los servidores

`backend/rund-ocr-service` contiene el motor Python, cuyo servicio Compose se llama `rund-ocr` y está definido en `docker-compose.rund-ocr.yml`. No es un microservicio Node de los Compose de QA, preproducción, producción o desarrollo.

El comando `rebuild-changed` antes convertía cualquier carpeta `backend/*` en un nombre de servicio; por eso los cambios OCR causaban `no such service: rund-ocr-service`. Los cuatro scripts ahora identifican esa carpeta como infraestructura independiente y emiten un aviso. Además, validan los demás nombres con `compose config --services` antes de limpiar o reconstruir. Esta corrección desbloquea el despliegue de la aplicación; **no instala ni habilita el OCR en el servidor**.

Para recuperar un despliegue fallido, actualizar primero el script del ambiente y repetir `rebuild-changed` con un rango Git que incluya los cambios originales del intento fallido y la corrección. Usar solamente el último commit de la corrección puede omitir servicios pendientes del intento anterior. No es necesario borrar contenedores, documentos ni la base de datos.

Regresión reproducible: `node --test scripts/verify-deploy-service-selection.test.cjs`. Ejecuta la selección real de los cuatro scripts en Bash con las operaciones de Docker, Git, limpieza, migraciones y reinicio simuladas; no ejecuta despliegues ni lee secretos.

### Motores locales

Requisitos: Docker con contenedores Linux, espacio para imágenes/modelos y memoria suficiente para el sistema y ambos motores. El instalador detecta NVIDIA con al menos 6 GB de VRAM y aplica `docker-compose.rund-ocr.gpu.yml`; se puede elegir `-CpuOnly` explícitamente. La RAM y el espacio de disco son recursos distintos; disponer de GPU reduce la carga de RAM del modelo pero no la elimina. Los límites son 4 GB para OCR, 12 GB para Ollama en CPU y 6 GB de RAM más la GPU con el complemento NVIDIA. Para uso compartido, dimensionar un servidor dedicado tras medir los tiempos con el corpus acordado.

Desde la raíz del repositorio, PowerShell:

```powershell
# Prepara únicamente el archivo local y un token aleatorio; no inicia servicios.
.\scripts\setup-rund-ocr.ps1

# Con Docker iniciado y suficiente memoria: construye OCR y descarga los modelos locales.
.\scripts\setup-rund-ocr.ps1 -Start
```

El archivo generado `.env.rund-ocr.local` está ignorado por Git. No sobreescribe la configuración de la aplicación ni cambia una instalación existente de Ollama. El compose independiente usa OCR en `127.0.0.1:8091` y Ollama en `127.0.0.1:11435` para evitar colisión con un Ollama ya instalado en 11434. Las descargas iniciales de paquetes/modelos requieren Internet; los PDF se procesan localmente y no se envían a la nube. Los modelos se conservan en volúmenes Docker.

Versiones fijadas: PaddleOCR 3.7.0, PaddlePaddle 3.3.1, Ollama 0.34.0 y modelo local `qwen3.5:4b`. Se seleccionan explícitamente `PP-OCRv6_medium_det` y `PP-OCRv6_medium_rec`, con clasificación de orientación, corrección de perspectiva y orientación de líneas activas. MKLDNN permanece desactivado y se usan dos hilos CPU. El instalador descarga primero Qwen y PP-OCRv6, comprueba ambos motores y solo entonces elimina `gemma4:rund-e2b-text` y `gemma4:e2b-it-qat`; no conserva dos modelos de interpretación.

Después de preparar los motores:

1. Aplicar las migraciones 656 y 657, en ese orden, mediante el procedimiento de migraciones del ambiente, con el módulo aún deshabilitado. Agregan tablas, columnas e índices; no modifican perfiles existentes. Actualizar también `notifications-service`, cuyo `POST /notifications` acepta la clave UUID opcional `clave_idempotencia` (las llamadas existentes sin clave conservan su comportamiento).
2. Cargar las siguientes variables en **academic-work-plan-service**, usando el token del archivo local mediante el mecanismo de secretos del ambiente. Nest no carga automáticamente `.env.rund-ocr.local`.

```dotenv
RUND_OCR_ENABLED=true
RUND_OCR_PROVIDER=LOCAL
RUND_OCR_URL=http://localhost:8091
RUND_OCR_TOKEN=<token generado, mínimo 32 caracteres>
RUND_OLLAMA_URL=http://localhost:11435
RUND_OLLAMA_MODEL=qwen3.5:4b
```

3. Reiniciar el backend PTA. Si corre en otro contenedor, conectar ambos servicios a su red privada y usar `http://rund-ocr:8091` / `http://rund-ollama:11434`; `localhost` dentro del contenedor no es el host. No publicar Ollama ni el OCR en Internet. El servicio solo admite destinos locales/privados configurados; rechaza redirects, credenciales en URL y etiquetas de modelos cloud.
4. Probar un expediente de prueba con un PDF sintético y revisar la cola, el asistente y la aprobación/corrección/descarte. Validar aparte carga de PDF, edición manual y devolución/aprobación documental con la función habilitada y deshabilitada.

Para una instalación completamente local, el siguiente activador comprueba los motores, aplica la migración solo a PostgreSQL en localhost y copia exclusivamente las variables OCR al `.env` de PTA. No modifica las credenciales de BD ni perfiles. Debe reiniciarse el proceso PTA después:

```powershell
node scripts/activate-rund-ocr-local.cjs
node scripts/verify-rund-ocr-active.cjs
```

La verificación HTTP usa identidades sintéticas con JWT de un minuto: exige 401 sin sesión, 403 para docente y 200 con la función activa para GGP. Solo consulta un UUID inexistente y deja su registro de acceso en la auditoría local.

### Conectar el grupo Docker RUND existente

El grupo `rund` con imágenes `ocastelblanco/rund-ocr` usa `POST /extract-text`
en el puerto 8000 y devuelve `details` con texto y confianza por página. Para
conectar el asistente de captura de PTA a esa instalación, configurar en el
`.env` de **academic-work-plan-service** (y en `.env.rund-ocr.local` para los
comandos de comprobación):

```dotenv
RUND_OCR_ENABLED=true
RUND_OCR_PROVIDER=RUND
RUND_OCR_URL=http://localhost:8000
RUND_OLLAMA_URL=http://localhost:11434
RUND_OLLAMA_MODEL=gemma4:e4b
```

Reiniciar el proceso PTA con estas variables actualizadas. Si se lanzó con
`npm run dev:backend`, el lanzador conserva las variables cargadas al iniciar:
reiniciar solo su proceso hijo compilado reutiliza los valores anteriores.
El proveedor `RUND` adapta las páginas al contrato del asistente y conserva
la revisión humana obligatoria. `LOCAL` sigue usando `/extract` y exige su
token; `RUND` no envía ese token a un motor que tiene otro contrato.

Comprobar `GET http://localhost:8000/health`, los modelos de `rund-ollama` y
`node scripts/verify-rund-extraction.cjs --real`. Este último usa documentos
ficticios y tablas temporales con rollback. Los trabajos que agotaron sus
reintentos conservan su historial; pueden volver a solicitarse con **Reintentar**.
Los nuevos fallos guardan códigos de diagnóstico acotados, sin texto del PDF,
credenciales ni mensajes privados de los motores.

La imagen con PaddleOCR 2.9 y Paddle 3.2 requiere desactivar MKLDNN
explícitamente en los predictores: el valor `enable_mkldnn=False` de la capa
PaddleOCR no lo desactiva en esa combinación. El arranque de compatibilidad
está en `backend/rund-ocr-service/legacy-entrypoint.py`. Montarlo como archivo
de solo lectura en `/app/rund-local-entrypoint.py` y configurar el comando
`["python", "/app/rund-local-entrypoint.py"]` del servicio `rund-ocr`.
Conserva `/extract-text`, los modelos y el puerto 8000; limita el procesamiento
a un documento simultáneo. Conserva la imagen a color al pasar de RGB a BGR:
el umbral adaptativo del servicio anterior puede borrar texto sobre fondos de
seguridad de documentos de identidad. Comprobar varias solicitudes consecutivas:
`/health` por sí solo no detecta un fallo de inferencia posterior.

La detección usa un límite de 2048 píxeles en lugar de los 960 originales para
conservar etiquetas pequeñas cuando la cédula ocupa parte de una hoja completa.
La validación admite etiquetas documentales con palabras unidas por el OCR,
como `CEDULADECIUDADANIA`, conservando la cita exacta y exigiendo el nombre del
tipo documental en la evidencia. La comparación del perfil reconoce los códigos
demográficos (`M`/`Masculino`, `F`/`Femenino`) sin registrar una modificación por
un simple cambio de representación. El perfil no se utiliza para completar
datos ausentes del documento y la aplicación de propuestas sigue siendo manual.

Para apagar el experimento: `RUND_OCR_ENABLED=false` y reiniciar PTA. Se oculta el asistente y no se ejecuta el worker; se conservan sugerencias y trazabilidad. No borrar las tablas ni los documentos para desactivarlo. Para detener únicamente los motores locales:

```powershell
docker compose --env-file .env.rund-ocr.local -f docker-compose.rund-ocr.yml stop
```

## Límites y operación

- Solo PDFs; hasta 25 MB, 25 páginas y 50 000 caracteres OCR por documento. Las restricciones menores de la carga existente siguen vigentes. Imágenes adjuntas mantienen su flujo habitual, sin este análisis.
- OCR tiene un timeout de 180 segundos y Ollama de 600 segundos, incluido su arranque. El transporte HTTP del modelo espera esas cabeceras tardías, limita la respuesta a 2 MB y no sigue redirecciones. El heartbeat mantiene la reserva mientras cualquiera de las etapas continúa. El rendimiento depende del documento y hardware; un timeout deja el trabajo pendiente de reintento, no rechaza la carga del archivo.
- El OCR ejecuta una solicitud a la vez y devuelve 503 cuando está ocupado. No tiene acceso a perfiles ni a la base de datos. La renderización limita cada página a 12 millones de píxeles y cierra sus recursos.
- PDFs dañados, protegidos o sin texto legible pueden no producir sugerencias. Un documento con campos no compatibles informa que debe completarse manualmente.
- El SHA-256 se contrasta con el documento guardado. No se registran texto OCR, PDF, token ni respuestas del modelo en logs. Solo se persisten las citas necesarias bajo los permisos del expediente.
- El panel consulta los últimos 100 trabajos del expediente; los anteriores permanecen en la base para auditoría. La retención de documentos, citas y auditorías debe seguir la política documental del ambiente.

## Pruebas reproducibles

Resultado automatizado: **108 pruebas del backend PTA, 3 de notificaciones, 37 de interfaz PTA, 8 de la campanita y 7 Python aprobadas**, más las comprobaciones PostgreSQL TEMP y navegador descritas abajo. Se verificaron la compilación y los tipos de los componentes modificados; `docker compose config --quiet` validó la configuración. Las pruebas unitarias simulan los motores; la opción `--real` usa PaddleOCR y Gemma instalados, conservando las tablas temporales para proteger expedientes reales.

Desde la raíz:

```powershell
node scripts/verify-rund-extraction.cjs
node scripts/verify-rund-extraction.cjs --real
node scripts/verify-rund-notifications.cjs
node scripts/verify-rund-extraction-browser.mjs
node node_modules/vitest/vitest.mjs run --config apps/mfe-pta/vitest.config.ts src/components/pta/banco-docentes/RundExtractionPanel.test.tsx src/components/pta/banco-docentes/RundExtractionNotificationDetail.test.tsx src/components/pta/banco-docentes/BancoDocenteEditModal.extraction.test.tsx src/components/pta/banco-docentes/RundValidationPanel.workflow.test.tsx src/components/pta/banco-docentes/RundDocumentManager.test.tsx --threads false
```

La prueba PostgreSQL usa la configuración de desarrollo del repositorio, TypeORM real, tablas TEMP y rollback; no escribe expedientes reales. Comprueba idempotencia, nuevas cargas después de reiniciar, reintentos acotados, obsolescencia, confirmación humana y rollback conjunto. La prueba de notificaciones usa el repositorio real sobre una tabla TEMP: confirma que repetir un aviso conserva su id, destinatario y lectura, sin enviar avisos a personas reales. La prueba de navegador monta componentes reales con respuestas simuladas, verifica la barra de progreso en escritorio/móvil, bloquea solicitudes externas y genera capturas con datos ficticios en `.local/rund-extraction-preview/`.

`--real` genera un diploma ficticio y guarda en `.local/rund-extraction-real/` el PDF, las respuestas reales de los motores, los tiempos, las sugerencias pendientes y la decisión humana de prueba. Los fallos de disponibilidad al final de esa prueba se simulan deliberadamente para comprobar los reintentos sin detener la infraestructura.

Desde `backend/academic-work-plan-service`:

```powershell
node node_modules/jest/bin/jest.js --runInBand --runTestsByPath src/pta/banco-docentes/rund-local-http.spec.ts src/pta/banco-docentes/rund-extraccion.spec.ts src/pta/banco-docentes/rund-extraccion-notifications.service.spec.ts src/pta/banco-docentes/banco-docentes.manual-validation.spec.ts src/pta/banco-docentes/rund-documentos.service.spec.ts src/pta/banco-docentes/rund-documentos-crud.spec.ts src/pta/banco-docentes/rund-evidence-review.controller.spec.ts src/pta/banco-docentes/banco-docentes-channel-security.spec.ts src/pta/banco-docentes/banco-docentes-sensitive-access.spec.ts
npm run build
```

Prueba ligera del contrato Python, desde la raíz, sin descargar Paddle/Gemma:

```powershell
python -m venv .rund-ocr-testenv
.\.rund-ocr-testenv\Scripts\python.exe -m pip install -r backend/rund-ocr-service/requirements-test.txt
.\.rund-ocr-testenv\Scripts\python.exe -m unittest discover -s backend/rund-ocr-service -v
npm run build -w @esap-mfe/pta
```

## Correspondencia con subtareas

| Subtarea | Entrega |
| --- | --- |
| EFDS-1988 Arquitectura | Cola persistente independiente, worker, OCR separado y transacción de revisión |
| EFDS-1990 Ollama/Qwen local | Compose e instalador local; Qwen reemplazó a Gemma y la ejecución real se comprobó con GPU |
| EFDS-1986 Extracción asíncrona | Descubrimiento de nuevas versiones, OCR, modelo, reintentos y recuperación |
| EFDS-1987 Mapeo | Lista cerrada por soporte/categoría y validación de citas |
| EFDS-1989 Revisión humana | Asistente, PDF de origen, editor prellenado, corrección y descarte |
| EFDS-1985 Persistencia/trazabilidad | Migración, perfil previo, checksum, motores, operador y decisión transaccional |
| EFDS-1991 Baja confianza | Etiquetas explícitas y puntuación conservadora; sin aprobación automática |
| EFDS-1992 Pruebas | Unitarias, PostgreSQL TEMP, navegador y PDF sintético con motores reales; evaluación de precisión institucional pendiente |
| EFDS-1993 Documentación | Este documento y comandos reproducibles |

Referencias primarias: [PaddleOCR, pipeline OCR](https://www.paddleocr.ai/main/en/version3.x/pipeline_usage/OCR.html), [Qwen 3.5 en Ollama](https://ollama.com/library/qwen3.5), [API chat de Ollama](https://docs.ollama.com/api/chat).

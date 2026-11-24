# Guía para probar y grabar el flujo de Programación Académica

Para mí (Claude), para la próxima sesión: cómo comprobar que funciona **en QA y en el navegador** todo lo que subió en noviembre de 2026, y el guion del video corto que lo muestra. Esta guía **no se ejecuta sola**: se sigue en orden y se marca cada casilla.

---

## 0. Qué hay que mostrar

| Cambio | Dónde está | Estado |
|---|---|---|
| EFDS-2435 · interruptor de Interoperabilidad PA ↔ PTA (apagar con motivo, impacto, lo pendiente se aplica al encender sin pisar la docencia manual) | PTA → Configuración → Interoperabilidad; Docencia Directa del PTA; aviso en la bandeja de concertación | Publicado en `micro-frontend` (13 nov, `37ebc3c21`) |
| EFDS-2427 · crear periodos exige `programacion-academica.periodos.gestionar` | PA → Periodos; Programas Académicos → Periodos (solo consulta) | Publicado |
| EFDS-2434 · candidatos: todos los docentes del área, los bloqueados con su motivo; asignación múltiple todo o nada | Asignar docentes de un grupo | Publicado |
| EFDS-2430 · una sesión en varios días a la vez (validación previa, todo o nada) | Catálogo → grupo → «Asignar horario» | Publicado |
| EFDS-2432 · editar y eliminar una sesión según su estado, con horas recalculadas y auditoría | Calendario del grupo (lápiz / papelera) | Publicado |
| EFDS-2429 · motivo cuando el programa solo se dicta en una sede | Panel de grupos | Publicado |
| Panel de grupos sobre la barra lateral del shell (z-index) | Panel de grupos | Publicado |
| **Plantilla de Excel**: grupos, horarios y docentes en un archivo (todo o nada) | Programación → «Cargar desde Excel» | Rama `feature/pa/plantilla-y-reutilizar` (sin publicar al escribir esto) |
| **Reutilizar periodo anterior**: catálogo / + grupos / + docentes | Periodos → tarjeta → «Reutilizar datos de otro periodo»; y al **crear** un periodo | Misma rama |

Detalle técnico: `INTEGRACION-claude.md` §38–§41. Despliegue: `DEPLOY-bugs-qa.md`.

---

## 1. Antes de empezar (5 minutos)

- [ ] **Saber qué hay en QA.** Preguntarle a Tomás (o mirar el commit desplegado) si Henrry ya desplegó la ronda de bugs y si la rama de plantilla/reutilizar ya está en `micro-frontend`. Lo que no esté desplegado se prueba y se graba en el **stack desechable** (sección 2), no en QA.
- [ ] **PASO 0 del DEPLOY hecho en QA**: partición de auditoría del mes (`audit.request_logs_AAAA_MM`). Si falta, los cambios se guardan pero su auditoría se pierde.
- [ ] **Reglas de datos en QA** (no negociables):
  - Las **validaciones** (`…/validar`, «Revisar qué se copiaría», «Subir y validar») **no escriben**: se pueden usar en QA siempre.
  - **Escribir en QA** (crear periodo, copiar, cargar plantilla, apagar el interruptor) solo con **autorización expresa de Tomás** para esa prueba, en un periodo de prueba (EFDS-2435: periodo **extraordinario semestral**, ver DEPLOY §7) y con un docente **sin PTA activo** (`save` sin `id` reescribe el borrador de otro periodo).
  - Nunca tocar el periodo principal ni PTA enviados o firmados. Al terminar, deshacer lo creado (la lista de lo creado se anota durante la prueba).
- [ ] **Docker arriba** (se cierra solo): `docker ps` responde. Para QA no hace falta.

---

## 2. Dónde probar

### 2a. Stack desechable local («como QA»: base nueva, servicios en contenedores detrás del gateway, UTC)

- Base: contenedor `esap-base-nueva` (puerto 55433), creada **solo** con las migraciones del repo. Tiene: 2026-1 (planeación) con `ASIG-00003` grupo 1 (5 sesiones; docentes 9900000201 y 9900000202 = `qa.e2e.docente1` y `qa.e2e.docente2`), 325 ofertas CETAP, 427 asignaturas; 2026-2 extraordinario; 2027-1 de la prueba de carga.
- Levantar: `docker start esap-base-nueva` y `bash <scratchpad>/e2e-up.sh` (sesión `9a1ce787`). El script ya alinea el `JWT_SECRET` de PA y PTA con el de auth. Después:
  - `docker start e2e-onlyoffice` (nginx del frontend no arranca sin el host `onlyoffice`), luego `docker start e2e-front`.
  - El frontend del contenedor es una imagen vieja: **copiarle el build**. El build se hace **desde PowerShell** (en Git Bash, `VITE_API_URL=/services` se convierte en `C:/Program Files/Git/services` y el login falla en silencio):
    ```powershell
    Set-Location C:\Users\Tomas\Documents\ESAP\temporal\Plataformacomunidadesap
    $env:VITE_API_URL="/services"; node scripts/build-frontends.mjs      # todo (≈7 min)
    # o solo PA: npm run build -w "@esap-mfe/programacion-academica"
    ```
    ```bash
    MSYS_NO_PATHCONV=1 docker cp "$(cygpath -w build)/." e2e-front:/usr/share/nginx/html/
    ```
  - Si se reconstruyó el código de PA: `docker build -t esap-pa-e2e backend/academic-schedule-service` y recrear `e2e-pa` (comando en `e2e-up.sh`).
- URL: `http://localhost:8088`. Cuentas (clave `123456`): `superuser@esap.edu.co` (todo), `qa.e2e.docente1@esap.edu.co`, `qa.e2e.docente2@esap.edu.co`.
- Volver a cero el periodo de prueba 2027-1: `<scratchpad>/reset-2027.sql` (**solo** en `esap-base-nueva`).
- Pruebas por API ya escritas (scratchpad): `e2e-carga.mjs` (plantilla y reutilizar, 36 casos), `e2e-api*.mjs` (interruptor y docencia), `e2e-api4.mjs` (PTA en periodo extraordinario).

### 2b. QA (`https://esap-qa.fabricasoftware.co`)

Credenciales en `AGENTS.md` (no copiarlas a otros archivos). Login por API (la cookie `esap_access_token` es HttpOnly; el cuerpo no trae el token):

```bash
Q=https://esap-qa.fabricasoftware.co/services
curl -s -c /tmp/qa.cookies -H 'Content-Type: application/json' -X POST "$Q/auth/api/v1/login" \
  -d '{"username":"<usuario de AGENTS.md>","password":"<clave de AGENTS.md>"}' -o /dev/null -w '%{http_code}\n'
```

Comprobaciones **de solo lectura** (no escriben nada):

```bash
# 1. ¿Está desplegado lo nuevo? (404 = no está)
curl -s -b /tmp/qa.cookies "$Q/programacion-academica/api/v1/periodos" | head -c 400
curl -s -b /tmp/qa.cookies "$Q/pta/api/v1/configuracion/interoperabilidad"              # EFDS-2435: estado, origen, corte
curl -s -b /tmp/qa.cookies "$Q/programacion-academica/api/v1/carga-programacion/referencia?periodo=<idPeriodo>" | head -c 300   # plantilla
# 2. Validar una copia (revierte siempre): qué se copiaría de <origen> a <destino>
curl -s -b /tmp/qa.cookies -H 'Content-Type: application/json' -X POST \
  "$Q/programacion-academica/api/v1/periodos/<idDestino>/reutilizar/validar" \
  -d '{"idPeriodoOrigen":"<idOrigen>","alcance":"catalogo_grupos_docentes"}'
# 3. Validar filas de plantilla (revierte siempre)
curl -s -b /tmp/qa.cookies -H 'Content-Type: application/json' -X POST \
  "$Q/programacion-academica/api/v1/carga-programacion/validar" \
  -d '{"idPeriodo":"<idPeriodo>","filas":[{"fila":4,"codigoAsignatura":"ASIG-00003","grupo":9,"dia":"Lun","horaInicio":"8:00","horaFin":"10:00"}]}'
#    → valido:false con «Día «Lun» no reconocido» en la fila 4
```

- [ ] Las cinco respuestas son 200 (o el 404 esperado si no está desplegado) y **ninguna escribió** (revisar que el número de grupos del periodo no cambió).
- [ ] Permiso: con una cuenta sin `periodos.gestionar`, `…/reutilizar/validar` → 403 y `POST /pta/api/v1/periodos-academicos` → 403.

---

## 3. Recorrido en el navegador (también es el orden del video)

Cada capítulo: ruta, qué se hace, **qué tiene que verse** (si no se ve, se para y se anota), rótulo propuesto y quién actúa. Hacerlo **una vez sin grabar** y anotar lo que falle; grabar solo cuando todo pase.

### Cap. 1 · Crear un periodo reutilizando el anterior (Actúa: administrador de programación)
1. Programación Académica → **Periodos**. Formulario «Crear periodo»: año 2027, semestre 2, fechas.
2. «Reutilizar datos de (opcional)» = 2026-1; «Qué reutilizar» = **Catálogo + grupos + docentes**. Leer la explicación que aparece.
3. «Crear periodo» → se abre el panel «Reutilizar datos en 2027-2» **ya revisado**: ofertas CETAP, grupos, sesiones, «Fechas corridas N semana(s)», docentes asignados y **los que no se asignaron con su motivo**.
4. «Copiar de 2026-1» → «Copiado de 2026-1.».
- Debe verse: nada se copia antes de confirmar; los motivos de los docentes que no cumplen están escritos en lenguaje claro.
- Rótulos: «Al crear el periodo se puede partir del anterior», «Primero se revisa: todavía no se copia nada», «Si un docente ya no cumple, el grupo queda sin docente y se dice por qué».
- Contraprueba fuera de cámara: repetir la copia → «ya existían (no se tocan)».

### Cap. 2 · Cargar la programación desde la plantilla de Excel (Actúa: programador)
1. Programación → barra «Programación de 2027-2» → **«Cargar desde Excel»**.
2. «1. Descargar plantilla» → abrir el archivo: hoja PROGRAMACION (títulos azules = obligatorios, listas en DIA / MODALIDAD / TIPO_SESION), hojas ASIGNATURAS, CETAP y LEEME.
3. «2. Subir y validar» con `plantilla-con-errores.xlsx` → tabla «Fila / Error»: día mal escrito, asignatura inexistente, dos sesiones del mismo grupo que se cruzan, un docente con cruce o fuera de su área. Botón «3. Cargar» **deshabilitado**.
4. Subir `plantilla-corregida.xlsx` → «El archivo es válido» con el resumen (grupos nuevos, sesiones, docentes) y el aviso «sin fechas en el archivo, toma las del periodo».
5. «3. Cargar programación» → «Programación cargada.»; el árbol de programación muestra los grupos nuevos.
- Rótulos: «Una fila por sesión, como el Excel que ya usa la ESAP», «Se valida todo antes de escribir», «Un solo error y no se escribe nada: todo o nada».
- Archivos de la demo: generarlos con un script de node (exceljs) a partir de la plantilla descargada del mismo periodo. Contenido sugerido (datos del stack desechable): errores = filas de la sección 6 de `e2e-carga.mjs`; corregida = filas de la sección 7.

### Cap. 3 · Horario de un grupo (Actúa: programador) — EFDS-2430, 2432, 2429
1. Catálogo → una asignatura → panel de grupos (verificar que **no queda debajo** de la barra lateral del shell).
2. Programa con una sola sede: aparece el **motivo de «única sede»** (2429).
3. «Asignar horario» → chips L-M-X-J-V → «Validar días»: cada día con su resultado → «Agregar sesiones» (2430). Mostrar uno que choca: no se crea ninguna.
4. Lápiz sobre una sesión: cambiar la hora; horas del grupo recalculadas (2432). Papelera sobre otra: confirmación; en una sesión aprobada, el sistema avisa/rechaza según su estado.
- Rótulos: «Varios días de una vez; si un día choca, no se crea ninguno», «Editar o borrar respeta el estado de la sesión y queda auditado».

### Cap. 4 · Asignar docentes (Actúa: quien asigna) — EFDS-2434
1. Grupo `ASIG-00003` → «Asignar docentes»: aparecen **todos** los docentes del área; los bloqueados en gris con su motivo (cruce con día y hora, tope, situación, vinculación).
2. Repartir las franjas entre dos docentes → confirmar: todo o nada.
- Rótulo: «Nadie desaparece de la lista: si no se puede, se dice por qué».

### Cap. 5 · Interoperabilidad con el PTA (Actúa: administrador del PTA y docente) — EFDS-2435
1. PTA → Configuración → pestaña **Interoperabilidad**: estado, origen del valor, periodo de corte, último cambio.
2. «Apagar…» → modal con el **impacto** (concertaciones en curso, PTA con docencia aplicada) → motivo de 10+ caracteres → Confirmar.
3. Como docente (`qa.e2e.docente2`, PTA en borrador del periodo extraordinario): Docencia Directa **editable a mano**.
4. Bandeja de concertación de PA: aviso de que la interoperabilidad está apagada.
5. «Encender…» → resultado: aplicadas / **en conflicto (docencia manual: no se pisó)** / omitidas.
- Rótulos: «Un solo interruptor, con motivo y auditoría», «Apagado: el docente registra a mano, como antes», «Al encender no se pisa lo que el docente cargó».

### Cap. 6 · Permisos de periodos (Actúa: gestión profesoral) — EFDS-2427
1. Con una cuenta GESTION_PROFESORAL sin el permiso: crear periodo → mensaje 403 claro.
2. Programas Académicos → Periodos: **solo consulta**, con el enlace a Programación Académica.

---

## 4. Grabación

Seguir `C:\Users\Tomas\.claude\CLAUDE.md` (flujo de video con el MCP de Playwright) y la memoria «Videos de demostración»:
- **Iniciar sesión antes de grabar** (la clave nunca en un archivo).
- `browser_start_video` → `browser_video_show_actions` con el título de acciones **oculto**; rótulos propios en español (numerados, recuadro ámbar, «Actúa: <rol>»), guiones en `C:\Users\Tomas\Claude\demo\guiones\`.
- `browser_video_chapter` al inicio de cada capítulo de la sección 3; `browser_highlight` antes de cada clic importante.
- Pausas de lectura según el largo del rótulo; esperar a que cargue cada pantalla.
- `browser_stop_video` y guardar en `C:\Users\Tomas\Claude`. **Duración objetivo: 6–8 minutos** (capítulos 1, 2 y 5 completos; 3, 4 y 6 resumidos). Recortes, resolución y velocidad, con FFmpeg solo si Tomás lo pide.
- El MCP necesita `bypassCSP` (el portal bloquea las tarjetas de capítulo).

## 5. Después

- [ ] Deshacer lo creado (stack desechable: `reset-2027.sql`; QA: solo lo autorizado, con la lista anotada).
- [ ] Anotar en `INTEGRACION-claude.md` qué se verificó en QA y qué solo en el stack desechable (decirlo sin rodeos).
- [ ] Entregar el video y, aparte, la lista de lo que falló o se vio raro.

---

## 6. Primera pasada hecha (15 de nov de 2026) — qué se aprendió

**Resultado:** `C:\Users\Tomas\Claude\demo-pa\video-programacion-academica-nuevas-funciones.mp4` (≈12 min, 1920×1080, 6 capítulos). Clips crudos por capítulo y `armar.sh` (los une quitando tramos muertos) en la misma carpeta.

- **QA no tiene nada de esto desplegado** (comprobado de solo lectura el 15 nov): `GET /pta/api/v1/configuracion/interoperabilidad` y `GET …/carga-programacion/referencia` dan 404, y `…/concertacion/configuracion` sigue con la forma anterior. Todo se grabó en el **stack desechable**. QA no se tocó.
- **Duración:** salió ≈12 min, no 6–8. El ritmo lo marca el tiempo de lectura de cada rótulo (≈55 ms por carácter). Para un corte de 6–8 min: rótulos más cortos, o dejar fuera los capítulos 3 (editar/eliminar) y 6.
- **Se grabó por capítulos** (un clip por capítulo): un fallo no obliga a repetir todo. Los ayudantes de rótulos van dentro de la página (`window.dv`) y **se pierden cuando la página se recarga** (p. ej. al pulsar «Ir a Programación Académica»): reinstalarlos.
- **Capítulo 6:** la cuenta de Gestión Profesoral del stack no ve Programación Académica ni Programas Académicos, así que el «403» se muestra con una **llamada real a la API** desde esa sesión, con la respuesta en pantalla (no hay botón que pulsar).
- **Datos de la demo:** 2027-2 se crea y se copia desde 2026-1 en el capítulo 1; el 2 carga `ASIG-00003` grupo 5 y `ASIG-00005` grupo 1; el 3 usa `ASIG-00005` (sin docentes en su área: no sirve para el 4); el 4 usa `ASIG-00003` grupo 1 (sale un docente bloqueado por sabático y otro por cruce). Para repetir: `reset-2027.sql` y `preparar-2027-2.mjs` (scratchpad de la sesión).
- **Trampas de la pantalla:** «Cancelar» con datos escritos pide confirmar el descarte; el botón de la papelera de una sesión está dentro del bloque de la sesión (hay que buscarlo con nombre exacto «Eliminar sesión HH:MM–HH:MM»); `Lunes` viene marcado por defecto al agregar sesión.

## 7. Segunda pasada (16 de nov de 2026): flujo completo por rol

**Resultado:** `C:\Users\Tomas\Claude\demo-pa\video-programacion-academica-flujo-completo.mp4` (14:30, 7 capítulos). Reemplaza al de la primera pasada.

- **Una cuenta por rol** (no el superusuario): `qa.rol.admin`, `qa.rol.programador`, `qa.rol.asignador`, `qa.rol.revisor`, `qa.rol.aprobador`, `qa.rol.jefatura` (se crean con `cuentas-rol.sql`, solo en la base desechable) y `qa.e2e.docente2`. El superusuario solo aparece en el interruptor del PTA.
- Capítulos: 1 periodo y reutilizar (admin) · 2 Excel (admin) · 3 grupo **a distancia**, selector de CETAP sin buscador, varios días, editar/eliminar, aviso de tope de horas (programador) · 4 asignar y enviar a revisión (asignador) · 5 revisión, aprobación y aceptación con firma (revisor, aprobador, docente en su portal) · 6 interruptor (botón «Confirmar» visible) · 7 permiso de periodos.
- **Guiones en archivo:** `C:\Users\Tomas\Claude\demo-pa\guion2\` (`pasos/*.js` = cuerpo de cada paso; `node gen.cjs` genera `out/`). El navegador del MCP solo lee archivos bajo `C:\Users\Tomas\Claude`. Se carga `out/_preludio.js` una vez (deja los ayudantes en `page.__h`) y cada paso se ejecuta con `browser_run_code_unsafe { filename }`. `lN.js` = preparar e iniciar sesión (sin grabar); `cN.js` = lo que se graba.
- `armar-v2.sh` une los clips, quita los finales erróneos y baja la velocidad 25 % (los rótulos quedaban cortos de tiempo de lectura).
- Pruebas por API de esta pasada: `e2e-roles.mjs` (48 comprobaciones por rol) en el scratchpad de la sesión.
- Trampas nuevas: los selectores del catálogo no tienen etiqueta accesible (ubicarlos por posición); «Editar sesión HH:MM–HH:MM» necesita `exact: true` (el bloque de la sesión comparte el nombre); un grupo de 3 sesiones semanales durante todo el periodo excede el tope de horas del plan (se muestra y se corrige acortando el ciclo).

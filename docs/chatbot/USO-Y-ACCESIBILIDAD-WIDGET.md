# Uso y accesibilidad del widget

Quinto ajuste de la revisión, 22 de octubre de 2026.

## Comportamiento

- El panel se adapta al espacio visible del navegador, incluyendo los cambios de `visualViewport` al aparecer el teclado móvil. Utiliza áreas seguras y mantiene el campo de entrada dentro del panel. Puede ampliarse y restaurarse sin remontar el remoto ni perder el borrador.
- El botón identifica el diálogo con `aria-haspopup`, `aria-expanded` y `aria-controls`. El panel tiene título accesible y recibe el foco al abrirse. Minimizarlo o pulsar Escape desde su interior devuelve el foco al botón. Escape fuera del panel conserva el comportamiento de la página y no interfiere con composición de texto IME.
- El diálogo es no modal: no bloquea la página ni encierra el foco. La animación respeta la preferencia de movimiento reducido. Los controles del contenedor tienen áreas de 44 px y el botón principal de al menos 48 px.
- El widget autenticado ofrece «Historial», búsqueda, selección de conversaciones y «Nueva conversación». El historial sigue siendo personal aunque exista permiso de lectura institucional. Las operaciones pendientes bloquean cambios de conversación y nuevas creaciones para conservar el orden del flujo.
- Abrir el historial enfoca su búsqueda. Seleccionar o crear una conversación enfoca el campo de entrada al completar la operación. Los borradores se conservan por conversación; el foco no se reclama si la operación termina con el panel minimizado u oculto.
- El envío confirmado refresca también la lista del widget. Si falla esa lectura, el reintento solo consulta la lista y no repite el mensaje enviado. Las reglas anteriores para recuperación de errores y verificación de sesión siguen vigentes.
- La orientación pública ofrece «Nueva consulta», que limpia únicamente sus mensajes y texto en memoria, sin llamadas de creación o borrado al servidor.
- Las sugerencias aparecen también cuando la conversación solo contiene el saludo. Seleccionarlas completa el borrador y enfoca la entrada, sin enviar automáticamente.
- El texto del asistente admite énfasis simple `**texto**`; el HTML y los enlaces del contenido se mantienen como texto escapado por React. No se interpreta HTML recibido del servicio.

Los mensajes desplazan solamente su contenedor, en lugar de llamar a `scrollIntoView` sobre el documento. Los textos largos se parten para evitar desbordamiento horizontal. Los avisos y la introducción pública tienen desplazamiento propio cuando hay poca altura, conservando espacio para escribir.

Los estilos nuevos se limitan a clases `esap-chatbot-widget*`, `esap-chatbot-module*` y `esap-chatbot-public*`. Se distribuyen con el contenedor y el remoto correspondientes, sin depender de generar nuevas utilidades en la hoja precompilada del shell.

## Verificación

- 97 pruebas frontend correctas: incluyen apertura/minimización, Escape y devolución del foco, ampliación sin pérdida de borrador, cambios del viewport visual, búsqueda y selección, nueva conversación sin doble creación, sugerencias, recuperación de errores y regresiones de privacidad y sesión.
- TypeScript del chatbot correcto, incluyendo los componentes del shell importados por las pruebas.
- Build de producción del remoto y build completo del shell correctos, emitidos en directorios temporales.
- `node scripts/verify-chatbot-widget-browser.mjs` verifica con Chromium los artefactos reales de producción y la federación entre un contenedor de prueba y el remoto. Usa exclusivamente un gateway HTTP efímero con datos sintéticos y cookie HttpOnly ficticia.
- El navegador comprueba 1440×900, 390×844, 320×568, 844×390 y 390×300; entrada visible, mensajes largos sin desbordamiento horizontal, ampliación/restauración, conservación de borradores, historial, creación, envío, error 503 con borrador recuperado y funcionamiento del formulario de la página. También comprueba separación de cookies entre orientación pública e historial privado y ausencia de errores de ejecución.

El tamaño reducido reproduce el espacio disponible con teclado; no sustituye una prueba física de teclado y lector de pantalla en iOS/Android. La comprobación general de tipos del shell continúa con la limitación de otros módulos documentada en [COBERTURA-GLOBAL.md](COBERTURA-GLOBAL.md).

Este punto cambia la interfaz del chatbot y su contenedor. No añade endpoints, permisos, migraciones ni proveedor de IA. No modifica tablas permanentes, cuentas ni conversaciones reales. Para entregar el ajuste se deben actualizar el shell y el remoto del chatbot, conservando el gateway y servicio compatibles de los puntos anteriores.

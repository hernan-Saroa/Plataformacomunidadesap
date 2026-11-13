# Verificación de los bugs de Programación Académica

**Para Javier · 13 de noviembre de 2026**

**Ambiente:** [QA de ESAP](https://esap-qa.fabricasoftware.co/). **Periodo de prueba: 2050-2**, en planeación y con la programación abierta. Mantén ese periodo durante las pruebas de grupos, horarios y asignación; no lo actives ni cierres el periodo principal.

## Antes de comenzar

1. Comprueba que puedes seleccionar **2050-2** y que hay programas, asignaturas y ofertas CETAP cargadas. Si faltan, anota **No ejecutado: faltan datos de prueba** en los casos que dependan de ellos.
2. Ten una asignatura con oferta, un aula de esa oferta y un grupo de prueba cuyo ciclo sea una semana del periodo, sin festivos ni recesos. Un ciclo corto permite probar varios días sin exceder las horas del plan.
3. Identifica dos docentes del área con horas disponibles y un docente con un bloqueo conocido. Anota sus nombres, los grupos usados y las horas antes de modificar nada.
4. Para comprobar una sesión aprobada, utiliza una que el administrador haya reservado para consulta. No apruebes una programación ajena para fabricar ese caso.
5. Usa las cuentas de prueba correspondientes a cada perfil. Cierra sesión antes de cambiar de usuario o usa ventanas separadas. Para comprobar que un perfil no tiene una acción, usa una cuenta que tenga únicamente los permisos de ese perfil.
6. Repite la comprobación de horas y del panel con el navegador en **español de Colombia** y en **inglés de Estados Unidos**, y con zona horaria de **Bogotá** y **UTC**. Prueba los tamaños **1920×1080**, **1366×768**, **1280×720** y un teléfono en posición vertical.
7. Conserva una captura del problema si algo falla. Registra: subtarea, usuario y rol, periodo, asignatura/grupo, pasos, resultado esperado y resultado obtenido.
8. Si la pantalla del PTA no permite seleccionar 2050-2, registra **No ejecutado** para ese tramo. No cambies el periodo principal para forzar la prueba.

### Cuentas que se necesitan

| Usuario de prueba | Rol que debe tener | Para qué se usa |
| --- | --- | --- |
| Cuenta de administración general; si está habilitada, `superuser@esap.edu.co` | Administrador general | Preparar datos, consultar periodos y comprobar el acceso de administración. |
| Cuenta de programación de pregrado | Programador de pregrado | Crear grupos y administrar sus sesiones. Repetir con Programador de posgrado para su nivel cuando haya datos. |
| Cuenta de asignación de pregrado | Asignador de docentes de pregrado | Consultar candidatos, repartir franjas y enviar a revisión. Repetir con su equivalente de posgrado cuando haya datos. |
| Cuenta de un docente del grupo de prueba | Docente | Consultar Mi programación y su horario; aceptar o reportar una novedad cuando corresponda. |
| Cuenta de revisión académica | Revisor de Docencia | Revisar la concertación y consultar el calendario del docente. |
| Cuenta de aprobación | Aprobador de Docencia o Jefatura autorizada | Aprobar la concertación y consultar el calendario del docente. |
| Cuenta autorizada para configurar el PTA | Administrador del PTA | Probar Interoperabilidad con Programación Académica y consultar la auditoría. |

Los usuarios de programación y asignación son funciones distintas. Usa las cuentas habilitadas en QA para esos perfiles. Si falta una cuenta o un permiso, registra **No ejecutado**; no des por comprobada la restricción usando el administrador general.

## EFDS-2427 · Crear periodos solo desde Programación Académica

**Usuario y rol:** administrador general o administrador de Programación Académica. Para la restricción, una cuenta de Gestión Profesoral sin permiso de administración de Programación Académica.

1. Entra a **Programas Académicos → Periodos**.
2. Comprueba que puedes consultar los periodos y abrir su detalle.
3. Busca los botones **Crear periodo**, **Nuevo periodo** y cualquier formulario con Año, Semestre, Inicio y Fin. No deben estar disponibles en esta vista.
4. Pulsa **Ir a Programación Académica**. Debe abrir ese módulo.
5. Abre **Programación Académica → Periodos** y busca **Crear periodo**.
6. Comprueba los campos Año, Tipo de periodo/Semestre, Inicio y Fin. El tipo debe ofrecer primer semestre, segundo semestre y **Personalizado**.
7. Elige **Personalizado**. Deben aparecer Nombre del periodo y Código. Cambia de nuevo a un semestre: el formulario debe volver a la opción semestral.
8. Si 2050-2 ya existe, no lo elimines para recrearlo. Comprueba el intento duplicado del caso siguiente y deja anotado que no se creó otro periodo.

**Resultado esperado:** «La sección Crear periodo debe estar disponible solo en el menú Programación Académica». En Programas Académicos, los periodos se muestran en consulta y existe un enlace de redirección, sin duplicar el formulario. Programación Académica conserva la creación semestral y personalizada.

**Debe fallar:** intenta crear otra vez **2050-2**. Debe avisar que ya existe y mantener una sola entrada. Con Gestión Profesoral sin el permiso correspondiente, no debe ser posible crear un periodo. No pruebes esta restricción con una cuenta que también sea administrador general.

**Evidencia:** captura de Periodos en consulta, del enlace y del formulario de creación en Programación Académica, incluida la opción Personalizado. No hace falta activar un periodo para comprobar este bug.

## EFDS-2428 · Panel de grupos y horario adaptable y con cierre

**Usuario y rol:** Programador de pregrado; repetir el acceso con Programador de posgrado cuando corresponda.

1. Entra a **Programación Académica → Catálogo Académico** y selecciona nivel y programa del periodo 2050-2.
2. Abre una asignatura, por ejemplo **Constitución Del Territorio — ASIG-00001**, si está disponible.
3. En el panel de grupos, abre **Asignar horario** de un grupo de prueba.
4. Comprueba que el fondo queda atenuado y que el panel se adapta a la pantalla. Recorre el calendario: deben poder alcanzarse todos los días y horas, sin elementos superpuestos desordenadamente. En teléfono, puede ser necesario deslizar la rejilla lateralmente.
5. Comprueba que **X**, arriba a la derecha, y **Cerrar**, al pie, están visibles y se pueden alcanzar.
6. Sin modificar datos, cierra con **X**. Debes regresar al listado de asignaturas. Reabre y repite con **Cerrar** y con la tecla **Esc**.
7. Reabre, modifica una fecha del ciclo y no la guardes. Intenta cerrar. Debe pedir confirmación para descartar.
8. Pulsa **Cancelar** en la confirmación. La fecha escrita debe conservarse y el panel debe seguir abierto.
9. Vuelve a cerrar y confirma el descarte. Al reabrir, debe verse la fecha que estaba guardada, no el cambio descartado.
10. Repite el cierre con un borrador de nueva sesión o una oferta del grupo sin guardar. Comprueba también **Cerrar horario** y el cambio a otro grupo: no deben perder un horario modificado sin advertirlo.
11. Repite la apertura desde **Programación General → grupo → Ver horario del grupo**. Este segundo acceso debe tener el mismo cierre y adaptación.
12. Repite en los cuatro tamaños indicados al comienzo. Al cerrar, el foco del teclado debe volver al control que abrió el panel.

**Resultado esperado:** «El panel debe adaptarse al tamaño de pantalla […] sin cortar el calendario ni superponerse de forma desordenada al contenido de fondo». Debe tener X/Cerrar/Volver para regresar al listado y pedir confirmación si hay cambios sin guardar. **Cerrar horario** no debe confundirse con cerrar el panel completo.

**Debe fallar:** intenta salir de un panel modificado y cancela el descarte. La salida debe detenerse y la información escrita debe continuar disponible. Si se está guardando, no debe cerrar de una forma que deje incierto el resultado.

**Evidencia:** una captura por tamaño, una con la confirmación de descarte y otra después de cancelar conservando el dato.

## EFDS-2429 · Oferta CETAP y Direcciones Territoriales

**Usuario y rol:** Programador de pregrado, con un programa ofertado en el periodo. Cuando haya datos, repetir con un programa de posgrado.

1. Abre un grupo en **Programación Académica → Catálogo Académico**.
2. Despliega **Oferta CETAP del grupo**.
3. Compara las opciones con la oferta aprobada para ese programa y periodo. Deben corresponder al programa, al lugar donde se dicta y a su modalidad.
4. Comprueba que cada opción identifica la Dirección Territorial y el CETAP con nombre y código.
5. Repite el caso de Javier: **Administración Pública - Diurno — PRO-001**, asignatura ASIG-00001, si está cargada.
6. Si ese programa solo tiene oferta en Sede Central, comprueba que la pantalla lo explica expresamente para el periodo elegido. No es obligatorio que aparezcan territoriales donde el programa no se oferta.
7. Repite con un programa que sí tenga varias ofertas territoriales. Deben aparecer las ofertas que le correspondan; elegir una no debe cambiar las de los demás grupos.
8. Si no hay ofertas cargadas, la pantalla debe explicar qué falta y orientar a la carga del periodo. Un selector vacío o que solo dice Sin oferta no es explicación suficiente.

**Resultado esperado:** «El campo debe listar todas las Direcciones Territoriales y sus ofertas CETAP […] con nombre y código», coherentes con la modalidad y la oferta del programa. Si Diurno solo se oferta en Sede Central, la lista es correcta y la pantalla debe explicarlo. Si la consulta falla, debe informar con un mensaje claro.

**Debe fallar:** si durante la prueba la consulta no está disponible, debe aparecer el aviso de error y no presentarse como si el programa no tuviera oferta. La oferta es opcional para crear un grupo; la falta de consulta no debe impedir crear un grupo sin oferta. No debe ofrecerse una territorial ajena a la oferta del programa.

**Evidencia:** selector de un programa con varias ofertas y explicación del que solo se dicta en Sede Central. Si no se puede provocar una falla de consulta de manera controlada, registra ese caso como No ejecutado; no interrumpas el ambiente para fabricarla.

## EFDS-2430 · Nueva sesión en uno, varios o todos los días

**Usuario y rol:** Programador de pregrado o posgrado, sobre grupos de su nivel.

1. Abre el horario de un grupo de prueba con ciclo de una semana dentro de 2050-2. Anota sus horas programadas.
2. Pulsa **Agregar sesión**. Debe abrirse Nueva sesión con los días **L, M, X, J, V, S, D** y **Todos**.
3. Selecciona **Lunes y Miércoles**, inicio **18:15** y fin **19:15**. Elige la modalidad de sesión y, si es presencial, un aula de la oferta del grupo.
4. Pulsa **Validar días**. Deben verse los días revisados, si hay conflictos y las horas previstas. Todavía no debe aparecer ninguna sesión nueva en el calendario.
5. Si ambos días están libres, pulsa **Agregar sesiones**. Deben aparecer dos tarjetas, una por día, con el mismo horario, modalidad y aula. Las horas programadas deben actualizarse.
6. Reabre el grupo para comprobar que las dos sesiones quedaron guardadas.
7. En un grupo sin choques y con margen de horas, repite eligiendo **Todos**. La selección debe incluir los siete días; después de validar y confirmar, debe crearse una sesión por cada día.
8. Cambia la hora o uno de los días después de validar. Antes de guardar debe volver a comprobar esa selección modificada.

**Resultado esperado:** «Permitir selección múltiple […] con opción Todos». Al agregar, crear una sesión por día seleccionado, validar traslapes por cada día e informar los días con conflicto antes de guardar. Actualizar el contador con el total de sesiones creadas.

**Debe fallar:** prepara una sesión existente el miércoles en ese mismo grupo. Intenta agregar Lunes y Miércoles en un horario que la cruce. La validación debe señalar **Miércoles** y explicar el conflicto. No debe guardar a escondidas solo el lunes ni dejar una creación a medias. Prueba también sin seleccionar ningún día: no debe guardar.

**Evidencia:** selección de varios días, validación con el día conflictivo y calendario/contador después de una creación válida.

## EFDS-2431 · Formato de 24 horas en todo el recorrido

**Usuario y rol:** Programador para crear; Docente para Mi programación; Revisor y Aprobador para sus consultas de horario.

1. Con el navegador en español de Colombia, abre **Nueva sesión** y escribe con el teclado **18:15** en Inicio y **19:15** en Fin.
2. Comprueba que ambos campos muestran esas horas y una indicación de formato de 24 horas. No deben mostrar a. m./p. m.
3. Valida y guarda una sesión de prueba. La tarjeta del calendario debe mostrar **18:15–19:15**, sin convertirlo en 06:15–07:15.
4. Abre **Editar sesión**. Inicio y Fin deben conservar 18:15 y 19:15.
5. Consulta el horario del mismo docente en **Disponibilidad Docente**, en **Mi programación** y en las vistas de consulta de la concertación. Las horas deben coincidir.
6. Si el docente tiene un grupo virtual o a distancia con horario por definir, revisa allí también Inicio y Fin: deben usar 24 horas y admitir teclado.
7. Repite con el navegador en inglés de Estados Unidos y con las zonas Bogotá y UTC. El idioma o la zona del equipo no deben convertir las horas a 12 horas ni desplazarlas.
8. Si hay un reporte o descarga de horario disponible, ábrelo y comprueba el mismo rango de horas. Si no existe esa opción en el recorrido disponible, déjala como No ejecutado; no la des por comprobada mirando solo el calendario.

**Resultado esperado:** «Unificar el formato de hora en el calendario y en los campos Inicio/Fin […] en formato militar 24 h, ej.: 18:15–19:15». Mantenerlo también en las tarjetas, reportes y exportaciones.

**Debe fallar:** escribe **25:00** o una hora de fin anterior al inicio. Debe impedir guardar y explicar qué corregir, conservando los demás datos. Una hora incompleta no debe convertirse silenciosamente en otra sesión.

**Evidencia:** campos y tarjeta con 18:15–19:15 en ambos idiomas. Anota la zona horaria y el tamaño de pantalla usados.

## EFDS-2432 · Editar y eliminar sesiones

**Usuario y rol:** Programador del nivel del grupo. Para los casos restringidos, usar una sesión asignada/en concertación y otra aprobada, reservadas para la prueba.

1. Abre el horario de un grupo de prueba y anota sus horas programadas.
2. Comprueba que cada tarjeta muestra un **lápiz** y una **papelera** visibles.
3. Pulsa una tarjeta o su lápiz. Debe abrirse **Editar sesión – Grupo N** con día, inicio, fin, modalidad y aula cargados.
4. Cambia, por ejemplo, el fin de **08:45 a 09:45** en una sesión que empieza a las 07:45, siempre que el rango esté libre. Pulsa **Guardar cambios**.
5. Reabre la sesión y comprueba que el cambio quedó guardado. El contador de horas debe actualizarse.
6. Intenta un cambio que se cruce con otra sesión del grupo o con un aula ocupada en el mismo ciclo. El aviso debe explicar el conflicto y mantener abierto el editor con lo escrito.
7. En una sesión libre, pulsa **Eliminar sesión** o la papelera. La confirmación debe identificar el día y el rango, por ejemplo: «¿Desea eliminar la sesión del miércoles 07:45–08:45? Esta acción no se puede deshacer».
8. Primero pulsa **Cancelar**: la sesión y las horas deben permanecer. Repite y confirma: debe desaparecer esa sesión y actualizarse el contador.
9. En una sesión asignada, intenta editar o eliminar. Si está permitido devolverla, debe explicar el efecto y pedir confirmación antes de dejarla sin docente o devolver la concertación. Cancela primero y comprueba que no cambió; confirma únicamente sobre datos reservados para esta prueba.
10. Con un usuario autorizado, consulta **Auditoría**. Debe identificarse quién hizo la modificación o eliminación, cuándo y cuáles fueron los valores anterior y nuevo.

**Resultado esperado:** «Al dar clic sobre una sesión debe abrirse la ventana Editar sesión – Grupo N con los datos precargados» y los botones **Guardar cambios**, **Eliminar sesión** y **Cancelar**. «El contador de horas programadas vs. horas del plan debe actualizarse tras editar o eliminar». Debe mostrar lápiz/papelera, validar traslapes, confirmar la eliminación y registrar la acción en Auditoría. Las sesiones publicadas, asignadas o en concertación deben respetar las restricciones correspondientes.

**Debe fallar:** abre una sesión **aprobada** o cuya docencia ya haya sido aceptada y aplicada al PTA. No debe permitir modificarla ni eliminarla mediante una confirmación corriente; debe informar que hay que reabrirla. No debe modificar datos del PTA para permitir el cambio.

**Evidencia:** editor cargado, conflicto sin perder el formulario, confirmación de eliminación, contador antes/después y registro de auditoría. Anota los casos restringidos que no pudiste preparar sin afectar datos ajenos.

## EFDS-2433 · Contraer el calendario semanal

**Usuario y rol:** realizar el caso completo tres veces: **Docente**, **Revisor** y **Aprobador**.

1. Como Docente, entra a **Mi programación** y localiza el calendario de 2050-2.
2. Como Revisor y como Aprobador, entra a **Programación Académica → Disponibilidad Docente**, selecciona el docente y localiza su calendario. Revisa también el acceso desde Concertación si la pantalla lo ofrece.
3. En el encabezado **Calendario semanal**, pulsa **Ocultar horario** o el control de la flecha.
4. La rejilla debe ocultarse. Debe quedar el encabezado con docente, periodo, horas y tope.
5. Pulsa **Ver horario**. Debe aparecer el mismo calendario, sin perder los datos ni cambiar las horas.
6. Repite con una pantalla estrecha o un teléfono. El control debe seguir visible y el encabezado debe poder leerse.

**Resultado esperado:** «El encabezado Calendario semanal debe tener un control visible para contraer y desplegar». Contraído queda el resumen de docente, periodo, horas y tope; debe estar disponible para Docente, Revisor y Aprobador y comportarse de forma consistente con Cerrar horario del programador.

**Debe fallar:** intenta cambiar una sesión desde el calendario de consulta de Revisor o Aprobador. Contraer y desplegar no debe conceder permisos de edición ni cambiar la programación.

**Evidencia:** una captura del calendario contraído por cada rol, mostrando el encabezado y el control para volver a abrirlo.

## EFDS-2434 · Varios docentes por grupo y motivos de bloqueo

**Usuario y rol:** Asignador de docentes del nivel del grupo. Para consultar el resultado, cada Docente asignado. No basta comprobarlo con el administrador general.

1. Abre **Programación Académica → Programación General**, localiza el grupo de prueba y pulsa **Asignar docente**.
2. Con todas las franjas seleccionadas, comprueba que se listan los docentes del área. Cada uno debe indicar si está **Disponible** o **Bloqueado**.
3. Si aparece el aviso de que todos están bloqueados, recorre la lista: deben verse los docentes y el motivo específico de cada uno, por ejemplo cruce, tope, vinculación o situación administrativa. El aviso no debe reemplazar la lista.
4. Selecciona solo las franjas de **Lunes y Miércoles** que pueda dictar el primer docente. Elígelo y pulsa **Añadir al reparto y elegir otro docente**.
5. Selecciona una franja distinta, por ejemplo **Viernes**, y un segundo docente válido. Revisa que el reparto muestre quién dictará cada franja y pulsa **Confirmar**.
6. Reabre el grupo. Deben aparecer ambos docentes, cada uno en las franjas elegidas; una misma franja no puede quedar asignada a dos personas.
7. En otro grupo o asignatura, intenta asignar al primer docente en un horario que no se cruce y sin superar su tope. Debe permitirse; tener otro grupo no es por sí mismo motivo de bloqueo.
8. Comprueba que el aviso explica **un docente por franja**, no un único docente por grupo.
9. Si un docente tiene el aviso **sin situación administrativa / sin clasificar**, comprueba que el aviso se vea. Por sí solo no debe impedir la asignación cuando el docente figure como disponible y no tenga otros bloqueos.
10. Si el reparto es rechazado, debe indicar el docente y el motivo, conservar la selección para corregir y no guardar solo una parte del reparto.

**Resultado esperado:** «Permitir asignar uno o varios docentes a un mismo grupo, distribuyendo las franjas entre ellos», y el mismo docente en varios grupos/asignaturas cuando no haya cruces ni se superen topes. «Mostrar el listado de docentes del área con su estado (disponible / bloqueado) y el motivo específico del bloqueo». **Confirmar** debe habilitarse cuando exista al menos un docente válido con franjas seleccionadas.

**Debe fallar:** intenta asignar una franja que choque con otra del docente o supere su tope. Debe indicar la causa y no guardar el reparto. No debe permitir seleccionar una persona bloqueada ni asignar dos docentes a la misma franja. No es obligatorio mostrar la asignatura o programa que ocupa al docente para explicar el cruce: basta día y horas.

**Evidencia:** lista de bloqueados con motivos, reparto de dos docentes, resultado guardado y un rechazo que no deje cambios parciales.

## EFDS-2435 · Interoperabilidad del PTA con Programación Académica

**Usuarios y roles:** Administrador del PTA; dos cuentas de Docente de prueba sin PTA en 2050-2; Asignador, Revisor y Aprobador para completar la concertación. Usa dos docentes si necesitas comparar un PTA manual y uno automático sin intentar crear dos PTA del mismo docente en el mismo periodo.

### Encendido: Docencia desde Programación Académica

1. Como Administrador del PTA, entra a **PTA → Configuración**.
2. Localiza **Interoperabilidad con Programación Académica**, comprueba su estado y anótalo antes de cambiarlo.
3. Déjalo en **Encendido**. Si cambiaste el estado, revisa la advertencia y confirma.
4. Completa la concertación del primer docente de prueba: el Asignador envía a revisión; el Revisor revisa y firma; el Aprobador aprueba y firma; el Docente acepta y firma.
5. Como ese Docente, crea su PTA de 2050-2.
6. Comprueba que **Docencia Directa** trae las asignaturas y horas concertadas, aparece aprobada por la concertación y no permite agregar o editar esas asignaturas a mano. El mensaje debe explicar por qué.

### Apagado: PTA manual y concertación que sigue funcionando

1. Como Administrador del PTA, cambia el interruptor a **Apagado**. Primero cancela la confirmación: el estado anterior debe conservarse. Repite el cambio y confírmalo.
2. Cierra la configuración y vuelve a entrar para comprobar que quedó Apagado.
3. Como el segundo Docente de prueba, crea su PTA de 2050-2 y abre **Docencia Directa**.
4. Agrega manualmente una asignatura y sus horas; guarda y vuelve a abrir el PTA. Deben conservarse. El mensaje debe corresponder al modo manual, sin exigir que Programación Académica haya sido cargada o aprobada para poder registrar esa docencia.
5. Manteniendo el interruptor **Apagado**, completa una concertación de prueba en Programación Académica: asignar → enviar a revisión → revisar y firmar → aprobar y firmar → aceptar y firmar como Docente.
6. Comprueba que el apagado no oculta ese recorrido ni impide completar sus pasos. Al terminar, vuelve al PTA manual: el contenido guardado a mano no debe desaparecer ni duplicarse por completar la concertación.
7. Como Administrador, consulta **Auditoría**: el cambio del interruptor debe indicar usuario, fecha/hora y estado anterior/nuevo.
8. Restablece el estado que anotaste al comienzo y comprueba que quedó guardado. No uses PTAs ajenos para probar cambios de modo.

**Resultado esperado:** en **PTA → Configuración** existe el interruptor **Interoperabilidad con Programación Académica**. Encendido, la Docencia llega desde la concertación en consulta; apagado, el docente puede registrar y guardar asignaturas y horas manualmente en su PTA. Cambiarlo exige permiso y confirmación y queda auditado. **Apagar la interoperabilidad del PTA no debe impedir que la concertación se siga completando.** El mensaje de Docencia Directa debe reflejar el modo elegido.

**Debe fallar:** un Docente, Programador o Revisor sin permiso de configuración no debe poder cambiar el interruptor. Cancelar la confirmación no debe cambiar su estado. Encendido, no debe poder agregarse a mano una asignatura a la Docencia que corresponde a la concertación.

**Evidencia:** interruptor y confirmación, PTA manual guardado con el interruptor apagado, concertación completada mientras sigue apagado, PTA automático y registro de auditoría. Si no se dispone de los usuarios o de una concertación reservada, marca el tramo correspondiente como No ejecutado.

## Al terminar

1. Restaura el estado inicial de Interoperabilidad con Programación Académica.
2. Retira las asignaciones y elimina las sesiones y grupos creados para la prueba. Conserva los registros que ya existían.
3. No elimines el periodo 2050-2 ni cambies el periodo principal. No retires una aprobación o un PTA ajeno para facilitar la limpieza.
4. Si un registro de prueba ya aprobado no puede retirarse con los controles autorizados, anota exactamente cuál es y deja **Limpieza pendiente**; no lo ocultes ni marques la limpieza como realizada.
5. Para cada subtarea registra **Pasa**, **No pasa** o **No ejecutado**, con las capturas. Una falta de datos o de cuenta no es un resultado satisfactorio. Adjunta la evidencia a la subtarea correspondiente.

## Prueba de cinco minutos si no hay tiempo para el recorrido completo

Necesita un grupo de prueba ya preparado en 2050-2 y una cuenta autorizada para las consultas de administración. Esta prueba detecta los bloqueos principales; no sustituye las comprobaciones por rol ni permite dar por cerradas las nueve subtareas.

1. **Minuto 0–1 — Periodos y panel.** En Programas Académicos → Periodos comprueba que no hay Crear periodo y que el enlace lleva a Programación Académica. Abre una asignatura y un grupo: X y Cerrar deben verse; Esc debe permitir regresar.
2. **Minuto 1–2 — Horas y días.** En Nueva sesión escribe 18:15–19:15, selecciona Lunes y Miércoles y pulsa Validar días. Debe verse 24 h y el resultado de ambos días antes de guardar. Si están libres y el grupo es de prueba, confirma; deben aparecer dos sesiones y cambiar las horas.
3. **Minuto 2–3 — Cambios y protección.** Abre el lápiz de una sesión: datos cargados y Guardar cambios. Pulsa su papelera y cancela la confirmación; la sesión debe seguir. Modifica un dato sin guardarlo e intenta cerrar: Cancelar debe conservar lo escrito.
4. **Minuto 3–4 — Docentes y calendario.** En Asignar docente comprueba que los bloqueados se ven con sus motivos y que es posible preparar un reparto por franjas. En el calendario semanal pulsa Ocultar horario: deben quedar docente, periodo, horas y tope; Ver horario debe recuperarlo.
5. **Minuto 4–5 — PTA.** En PTA → Configuración comprueba el interruptor. Si la prueba está preparada y autorizada, verifica que Apagado deja Docencia manual y que Concertación continúa disponible. Restituye el estado inicial y elimina lo creado. La terminación completa de la concertación apagada y su auditoría se comprueban con el recorrido largo de EFDS-2435; no se consideran verificadas solo porque el menú se vea.

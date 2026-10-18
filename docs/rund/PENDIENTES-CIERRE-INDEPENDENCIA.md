# Estado para llegar al cierre de independencia

Actualizado con el punto 95. La referencia técnica y las evidencias están en
[ESTADO-MIGRACION-MICROSERVICIO.md](ESTADO-MIGRACION-MICROSERVICIO.md).

Hay 11 pasos de base completados en código/revisión y validación local. El paso 12
continúa abierto. Los 58 cortes técnicos posteriores al merge son avances de
distinto tamaño; su cantidad no mide el porcentaje de independencia ni certifica
el estado de las instalaciones. Todavía queda trabajo de implementación y aceptación.

| Frente abierto | Qué falta para cerrarlo | Evidencia de cierre necesaria |
|---|---|---|
| 4. Aislamiento de propietarios, trabajo técnico actual | Aceptación de navegador/instalación de la entrada opcional de revisiones y del preview manual antes de habilitarlos; resolución humana de incertidumbres sin evidencia adicional y otras resoluciones de rechazos; intervalo entre validación Auth y SMTP; política/cierre de altas y revisiones; recuperación de contextos inconsistentes tras publicación; activación del formulario con principal, consulta de correo y preview ya preparados; publicar Auth antes del consumidor RUND para aceptar el preview masivo propietario; preparar sustitución del escritor masivo por operaciones propietarias reanudables, preservando soporte y resultados por fila; adaptación de edición, lotes y autogestión con soportes/OTP; sustitución final de escritores/consultas SQL restantes entre propietarios | Inventario de dependencias resuelto y pruebas de cada entrada, fallos, recuperación y permisos, preservando los contratos existentes |
| 2. Consumidores históricos | Dashboard/reportes y accesos documentales históricos de Auth todavía asociados a PTA | Consultas y documentos históricos resueltos por el propietario correcto, con regresión y protección de datos |
| 3. Integraciones de otros módulos | PTA, Programación Académica y contrato-programación con sus relaciones y registros históricos | Escenarios integrados aprobados sin modificar reglas o perder enlaces |
| 1. Instalaciones y activación del paso 12 | Configuración, accesos, migraciones, artefactos y aceptación en local/DEV/QA/PRE/PROD | Evidencia de las instalaciones reales y sus prerrequisitos; las pruebas ficticias locales no la sustituyen |
| 5. Aceptación integral y cierre operativo | Flujos completos, recuperación/rollback y retiro final del RUND embebido en PTA | Aceptación integral y confirmación explícita para el retiro, conforme a la sección 9.3 |

El punto 83 permite registrar, consultar y asignar casos de revisión de intentos
sin resultado observado. El punto 84 añade un recibo de cierre solo con aceptación
registrada del mismo intento y aviso ENVIADO, sin cambiar el caso o enviar correo.
Si hay responsable, solo esa cuenta puede cerrar; el contrato previo conserva su
historia y paginación. El punto 85 añade diagnóstico autorizado y política conservadora:
rechazo explícito, indisponibilidad, ausencia de evidencia y aceptación se distinguen
sin cambiar datos o autorizar reenvíos. No se consideran resueltos los intentos sin
evidencia. El 86 agrega la decisión explícita e inmutable de no enviar una bienvenida
con rechazo propietario, preservando PENDIENTE sin intento. Consumidor y trigger SQL
bloquean avisos omitidos; una reserva ya iniciada no se cancela. El estado anterior y
diagnóstico no incorporan esa decisión: su recibo separado debe consultarse al integrar
la interfaz. El 87 permite abrir/recuperar revisión de un journal INCIERTO ya
conciliado, con el mismo caso y asignación. Conserva el resultado y no habilita
cierre o reenvío. El 88 integra cliente/vista por intención en el formulario opcional,
con omisión prioritaria, confirmación de decisiones y protección de sesión/concurrencia.
La opción sigue false y el llamador activo no proporciona cliente o activación.
El 89 prepara la bandeja opcional fuera del formulario con filtro de asignación,
paginación del propietario y consulta actual del detalle antes de decidir. No tiene
llamador activo y su opción es false por defecto. El 90 conecta su entrada opcional
al principal verificado, con apertura explícita, invalidación y reapertura limpia
ante cambios de sesión, sin modificar los componentes anteriores o montar un acceso
activo. El 91 comprueba ese recorrido con React/jsdom, lector/transporte productivos,
HTTP/JWT y SQL reales en el clúster temporal, tanto directo como con prefijo /services.
Siguen navegador real y aceptación por instalación antes de habilitarlo: el proxy de
prefijo y la incorporación de cookie son fixtures. También continúan resolución humana,
otras resoluciones e intervalo Auth–SMTP. El 92 añade previsualización manual opcional
de compatibilidad sin captura, solicitud, journal o escritura remota; comparte propuesta
y huellas con la preparación anterior. El 93 la conecta al cliente/formulario opcionales
sin reservar solicitud, con invalidación de borrador/sesión y confirmación posterior
independiente; requiere bandera explícita y continúa sin llamador activo. El siguiente
trabajo local tras el 95 es preparar la sustitución del escritor masivo preservando
soporte, reglas y resultados/reanudación por fila, sin activarlo. El 94 elimina
las escrituras y rollback del preview masivo con propuestas compartidas, sin consumir
secuencias; conserva la auditoría de acceso HTTP. Mantiene la importación definitiva
y todavía no cierra todo el aislamiento o habilita sus escritores HTTP. El 95 migra
las lecturas del preview a una API Auth mínima, sin SQL alternativo. Debe publicarse
primero el endpoint Auth y después RUND; un Auth anterior provoca errores de preview
por fila. La aceptación por instalación no se sustituye con la integración temporal.

No hay una estimación responsable de horas o porcentaje restante mientras sigan
abiertos estos bloques y su aceptación por ambiente. Una medida útil es registrar
qué criterio de esta tabla se cierra, en lugar de sumar nuevos cortes como si todos
tuvieran el mismo alcance. Los cinco frentes siguen abiertos tras el punto 95.

El flujo nuevo de escritura continúa desactivado. No se debe presentar el repositorio
como independencia completada, ambiente desplegado o retiro de PTA autorizado.

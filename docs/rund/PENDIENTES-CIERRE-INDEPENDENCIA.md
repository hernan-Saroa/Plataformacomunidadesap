# Estado para llegar al cierre de independencia

Actualizado con el punto 104. La referencia técnica y las evidencias están en
[ESTADO-MIGRACION-MICROSERVICIO.md](ESTADO-MIGRACION-MICROSERVICIO.md).

Hay 11 pasos de base completados en código/revisión y validación local. El paso 12
continúa abierto. Los cortes técnicos posteriores al merge son avances de
distinto tamaño; su cantidad no mide el porcentaje de independencia ni certifica
el estado de las instalaciones. Todavía queda trabajo de implementación y aceptación.

**Actualización del punto 103:** con `RUND_IDENTITY_WRITE_VIA_AUTH_API=true`, la edición
con sugerencias usa el coordinador propietario: Auth compara la identidad esperada
dentro de su transacción y RUND confirma perfil, sugerencias y auditoría en la suya.
Los errores de contexto/configuración ya no habilitan SQL alternativo sobre Auth.
Los campos OCR propios de RUND se confirman únicamente en sus tablas. Se conserva
la autogestión parcial sin período y el actor servidor de la carga definitiva.
Publicar Auth antes que RUND. La activación y aceptación por instalación siguen pendientes.

**Actualización del punto 104:** se prepara la migración Auth 673 con protección de
cédula basada en inventario propio y operaciones no compensadas. En modo LOCAL no
consulta perfiles ni sugerencias de RUND/PTA. Conserva HEREDADO por defecto. La activación
requiere Auth separado, inventario completo conciliado, permisos y escrituras propietarias
aceptadas; no se aplicó a instalaciones existentes. Procedimiento y reversión:
[PROTECCION-CEDULA-AUTH-INDEPENDIENTE.md](PROTECCION-CEDULA-AUTH-INDEPENDIENTE.md).

El mapa siguiente actualiza el alcance que se describió en el punto 95;
las tareas de escritor general, lotes y autogestión fueron implementadas en el 100,
y la edición con sugerencias queda incorporada en el 103. Reportes/dashboard y los
clientes de PTA/Programación ya están conectados en código (39 y 98): falta aceptación
integrada por ambiente. Siguen la activación del reemplazo del trigger inverso Auth, el SQL histórico
de transición, el rol SQL limitado, configuración de despliegue, operación de revisiones,
y el retiro final autorizado del RUND embebido.

| Frente abierto | Qué falta para cerrarlo | Evidencia de cierre necesaria |
|---|---|---|
| 4. Aislamiento de propietarios | Aceptar las escrituras por API y la migración 023 del punto 103; conciliar inventarios y activar/aceptar la política LOCAL de Auth 673 (104), retirar el SQL histórico de transición y limitar las credenciales SQL. Continúan la operación y cierre humano de revisiones/altas, incertidumbres de correo, intervalo Auth–SMTP y aceptación de las interfaces opcionales | Flujos activos con roles limitados a sus propietarios, protección de cédula en Auth separado, regresión y recuperación por cada entrada, más aceptación de instalación |
| 2. Consumidores históricos | Reportes/dashboard ya conectados en código. Los históricos documentales de Auth se consultan a PTA por API con PTA_HISTORICO_API_ENABLED (96); falta aceptar por ambiente y retirar SQL de transición | Consultas y documentos históricos resueltos por su propietario, con regresión y protección de datos |
| 3. Integraciones de otros módulos | Clientes PTA, Programación Académica y contrato-programación implementados (39/98); falta aceptación integral por ambiente de reglas, copias y relaciones históricas | Escenarios integrados aprobados sin pérdida de identificadores, relaciones o reglas |
| 1. Instalaciones y activación del paso 12 | Configuración, accesos, migraciones, artefactos y aceptación en local/DEV/QA/PRE/PROD | Evidencia de las instalaciones reales y sus prerrequisitos; las pruebas ficticias locales no la sustituyen |
| 5. Aceptación integral y cierre operativo | Flujos completos, recuperación/rollback y retiro final del RUND embebido en PTA | Aceptación integral y confirmación explícita para el retiro, conforme a la sección 9.3 |

## Referencia histórica de los puntos 83–95

Las conexiones y tareas descritas a continuación corresponden a esos cortes; los
avances posteriores de escritura están actualizados en los puntos 100–103.

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

Las banderas de escritura son optativas y siguen apagadas por defecto. El punto 101
documenta una activación local histórica; este mapa no certifica su configuración
actual ni la de otros ambientes. La independencia, el despliegue y el retiro de PTA
se cierran únicamente con la aceptación correspondiente.

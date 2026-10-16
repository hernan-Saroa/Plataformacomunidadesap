# Estado para llegar al cierre de independencia

Actualizado con el punto 80. La referencia técnica y las evidencias están en
[ESTADO-MIGRACION-MICROSERVICIO.md](ESTADO-MIGRACION-MICROSERVICIO.md).

Hay 11 pasos de base completados en código/revisión y validación local. El paso 12
continúa abierto. Los 43 cortes técnicos posteriores al merge son avances de
distinto tamaño; su cantidad no mide el porcentaje de independencia ni certifica
el estado de las instalaciones. Todavía queda trabajo de implementación y aceptación.

| Frente abierto | Qué falta para cerrarlo | Evidencia de cierre necesaria |
|---|---|---|
| 4. Aislamiento de propietarios, trabajo técnico actual | Validación propietaria del destinatario y del estado de credenciales en Auth antes del envío; conciliación de intentos de correo inciertos; política/cierre de altas y revisiones; recuperación de contextos inconsistentes tras publicación; conexión/activación del formulario con principal y consulta de correo ya preparados; preview sin escritura remota; adaptación de edición, lotes y autogestión con soportes/OTP; sustitución final de escritores/consultas SQL restantes entre propietarios | Inventario de dependencias resuelto y pruebas de cada entrada, fallos, recuperación y permisos, preservando los contratos existentes |
| 2. Consumidores históricos | Dashboard/reportes y accesos documentales históricos de Auth todavía asociados a PTA | Consultas y documentos históricos resueltos por el propietario correcto, con regresión y protección de datos |
| 3. Integraciones de otros módulos | PTA, Programación Académica y contrato-programación con sus relaciones y registros históricos | Escenarios integrados aprobados sin modificar reglas o perder enlaces |
| 1. Instalaciones y activación del paso 12 | Configuración, accesos, migraciones, artefactos y aceptación en local/DEV/QA/PRE/PROD | Evidencia de las instalaciones reales y sus prerrequisitos; las pruebas ficticias locales no la sustituyen |
| 5. Aceptación integral y cierre operativo | Flujos completos, recuperación/rollback y retiro final del RUND embebido en PTA | Aceptación integral y confirmación explícita para el retiro, conforme a la sección 9.3 |

El punto 80 prepara la consulta autenticada de correo por actor y su presentación
explícita en el formulario opcional, sin encolar o enviar al leer. El siguiente
trabajo acotado es validar destinatario y estado de credenciales con Auth antes de
autorizar el envío, manteniendo pendientes conciliación y activación.

No hay una estimación responsable de horas o porcentaje restante mientras sigan
abiertos estos bloques y su aceptación por ambiente. Una medida útil es registrar
qué criterio de esta tabla se cierra, en lugar de sumar nuevos cortes como si todos
tuvieran el mismo alcance. Los cinco frentes siguen abiertos tras el punto 80.

El flujo nuevo de escritura continúa desactivado. No se debe presentar el repositorio
como independencia completada, ambiente desplegado o retiro de PTA autorizado.

# Tres perfiles operativos RUND

En el editor de permisos se asigna una sola opción por responsabilidad:

| Perfil | Permiso | Facultades |
| --- | --- | --- |
| RUND · Cargador GGP | `banco-docentes.rund.carga` | Registra e importa aspirantes/docentes; consulta originales; edita perfiles con soporte y justificación; carga, reemplaza y retira documentos; aplica o corrige OCR. No aprueba ni devuelve soportes. |
| RUND · Revisor GGP | `banco-docentes.rund.revision` | Consulta originales y datos preparados; aprueba o devuelve filas y bloques. No registra docentes, carga archivos ni cambia datos OCR. |
| RUND · Responsable de incorporación | `banco-docentes.rund.incorporacion` | Consulta RUND; carga, reemplaza y retira contratos y actos de vinculación; registra número de contrato/acto y fechas con documento vigente, justificación y control de versión. No edita identidad, formación o categoría; no aprueba ni cambia el estado general del docente. |

Los roles predefinidos conservan los códigos `RUND_CARGADOR` y `RUND_APROBADOR`; se agrega `RUND_INCORPORADOR`. Cada uno tiene un único permiso RUND. No se asignan personas automáticamente. DTCC y Comité Docente son emisores de documentos que GGP registra; no necesitan perfiles separados para este alcance.

## Compatibilidad

La migración 671 actualiza únicamente los permisos RUND de estos tres roles predefinidos. Conserva los usuarios asignados, permisos de otros módulos y roles personalizados. Las capacidades granulares anteriores siguen aceptándose en el servidor para conservar el acceso de perfiles históricos.

El editor muestra las tres opciones funcionales. Si se edita otro módulo, conserva los permisos RUND históricos que estaban asignados. Al elegir o cambiar un perfil RUND, sustituye esos permisos anteriores por las facultades seleccionadas. Limpiar todos los permisos también retira los accesos conservados. Durante un despliegue sin la nueva migración, el catálogo anterior permanece disponible.

Las facultades de varios perfiles se acumulan. Una persona con permisos de carga y revisión puede cargar documentos, corregir datos OCR y aprobar o devolver sus propios soportes y bloques. SUPER_ADMIN también puede realizar ambas tareas. Tener únicamente permiso de carga no autoriza a aprobar ni devolver. El servidor conserva el motivo obligatorio de devolución, los controles de versiones y documentos vigentes y la auditoría con el actor autenticado. Gestión Profesoral conserva su administración anterior.

## Flujo existente

El OCR propone; el cargador confirma o corrige con motivo. Aplicar un dato no aprueba su soporte. Los cambios reabren la revisión del bloque afectado. El revisor decide cada fila y luego el bloque; una nueva versión exige nueva revisión y conserva el historial. Contacto sigue sin requerir soportes.

La contratación se registra en Vinculación, en **Datos de contratación**, después de cargar un contrato o acto de vinculación vigente. La petición solo acepta número/acto, fechas, motivo, soporte y versiones. La actualización y su auditoría son una transacción: un fallo revierte ambas. Cambiar datos de contratación reabre Vinculación y no modifica categoría, identidad, formación ni otras secciones.

Esta simplificación de permisos no implementa todavía las transiciones administrativas de la HU (`CARGADO_ELEGIBLE`, `VALIDADO_CUMPLE`, `VALIDADO_NO_CUMPLE`, `APTO_INCORPORACION`, `DOCENTE_ACTIVO`). Registrar la contratación aquí prepara datos para revisión; no declara automáticamente `DOCENTE_ACTIVO` ni altera la habilitación actual de PTA. La máquina de estados debe integrarse posteriormente con los actos y reglas de la HU.

## Instalación y verificación

Aplicar las migraciones 669, 670 y 671 en orden. La 671 no modifica expedientes, vinculaciones ni asignaciones de personas. Los permisos y asociaciones preexistentes del rol pueden respaldarse antes de aplicarla.

La 672 actualiza únicamente las descripciones para reflejar que la revisión depende de permisos, sin exigir una persona diferente. No modifica asignaciones, permisos concedidos ni estados activos.

La interfaz consulta la trazabilidad únicamente con permiso de revisión o administración y usa la sesión actual para decidir qué acciones mostrar; una sesión anterior almacenada no concede accesos. En el módulo integrado, únicamente el rol exacto `SUPER_ADMIN` concede acceso total: el correo electrónico no lo sustituye.

Verificación aislada: `node scripts/verify-rund-permission-separation.cjs` y `node scripts/verify-rund-evidence-workflow.cjs`. Utilizan tablas temporales y rollback. Los permisos del servidor tienen caché de hasta 60 segundos. Renovar la sesión actualiza las facultades del navegador después de cambiar permisos.

## Revisión del 22 de octubre de 2026

- 471 pruebas del backend y 269 de la interfaz aprobadas; comprobación de tipos del backend y compilación PTA correctas.
- Las combinaciones de carga, revisión e incorporación acumulan sus facultades, incluso cuando provienen de varios roles. Se comprobaron las seis pestañas y los dos alias de la API.
- El servidor deniega aprobación/devolución al cargador o incorporador sin revisión, aunque el navegador envíe permisos o un actor falsos. El incorporador tampoco reemplaza ni retira soportes de otras secciones.
- Roles, permisos o asignaciones inactivos no conceden acceso. La retirada de un permiso se respeta al vencer la caché; una consulta fallida no recupera facultades antiguas.
- La integración PostgreSQL comprueba aprobación y devolución por el mismo cargador autorizado, correcciones, nuevas versiones, pendientes OCR y auditoría. Utiliza datos sintéticos y revierte las pruebas.
- La prueba de navegador verifica los tres permisos visibles, la conservación de permisos históricos al editar otro módulo y el formulario limitado de contratación, con una API simulada.
- La comprobación final pasó 131 pruebas dirigidas de carga, OCR, revisión y sesión. Confirma que cambiar de Super Admin a revisor retira las facultades anteriores, y que retirar permisos de la misma persona también actualiza las acciones disponibles. Al abrir otro expediente desde una notificación, los datos anteriores se ocultan mientras se comprueba el nuevo acceso y permanecen ocultos si se deniega.

Para la prueba manual, usar una sesión nueva por perfil: cargador, revisor, incorporador, carga más revisión y SUPER_ADMIN. Comprobar las acciones permitidas y también la ausencia de las acciones restantes. Si se modifica un permiso del mismo rol, esperar hasta 60 segundos y renovar la sesión antes de volver a probar.

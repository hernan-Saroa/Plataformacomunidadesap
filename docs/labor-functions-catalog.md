# Catálogo local y validación individual de funciones laborales

## Comportamiento

- El listado, las estadísticas, la selección de perfiles, la carga masiva y la
  edición trabajan con los perfiles y funciones de PostgreSQL. El listado no
  lee las solicitudes de empleados ni consulta Oracle.
- Se retiraron la columna y el contador de asociados, su modal, exportación y
  endpoint `GET certificates/labor-functions/:id/associations`.
- `Consultar empleado` conserva la búsqueda informativa bajo demanda por nombre
  o documento. No es una enumeración de toda la vista. La búsqueda por nombre
  puede devolver varias personas; usa el documento completo para una persona.
- El autoservicio conserva la consulta por documento y la elección existente
  de vinculación, cargo, grado y contexto organizacional, incluidos encargos.
- Al seleccionar funciones se comprueba la coincidencia individual. Al solicitar
  se verifica nuevamente y al emitir el backend vuelve a resolver las funciones
  vigentes. Sin coincidencia o con ambigüedad no se emite con funciones. Se puede
  solicitar sin funciones desmarcando la opción.
- Los certificados emitidos conservan su `functions_snapshot` histórico. Este
  campo del certificado no es el sincronizador de matriz que se descartó.

## Validaciones de interfaz

Cambiar documento o tipo invalida las respuestas pendientes. Desmarcar funciones
impide que una respuesta anterior restablezca su mensaje de disponibilidad.
Si las funciones permanecen marcadas al cambiar la cédula, el formulario vuelve
a validarlas automáticamente 500 ms después de terminar de escribir. Esa espera
evita enviar una consulta individual a Oracle por cada dígito.
Ocultar salario invalida una validación de prima pendiente. Las verificaciones
simultáneas de funciones y prima para el mismo documento comparten únicamente la
petición en curso: no se reutilizan respuestas completadas para validar funciones.

Durante el envío del código se bloquean identidad y preferencias para evitar
mezclar solicitudes. Se evitan envíos duplicados y operaciones simultáneas de
validación/reenvío del código. El servidor sigue siendo la autoridad para emitir.
El catálogo distingue un error de lectura de una lista vacía y descarta respuestas
de búsquedas anteriores.

## Despliegue

Desplegar conjuntamente `certification-service`, `mfe-certificados-laborales` y el
`shell` (landing). No hay migraciones, paquetes ni variables nuevas para este
ajuste. Conservar la configuración Oracle existente en PRE/PROD; DEV/QA conservan
sus fuentes locales. No hace falta configurar `shadow` ni `on`.

La propuesta anterior de sincronización de matriz se retiró del código pendiente:
worker, rutas, migración 658 y variables nuevas de Compose y `.env.example`.
Si aquella propuesta llegó a instalarse en algún servidor, revisar ese ambiente
antes de limpiar objetos: este cambio no borra tablas remotas ni intenta revertir
automáticamente una migración ya aplicada. Sus variables de snapshot ya no se usan.

## Verificación local

- Suite de certification-service: 223 pruebas aprobadas, incluidas pruebas de
  catálogo sin llamadas a empleados/Oracle, >10.000 perfiles, coincidencia
  individual, ambigüedad y eliminación de perfiles entre consulta y emisión.
- Microfrontend de certificados: 39 pruebas aprobadas.
- Formulario público: 14 pruebas aprobadas de cambios de identidad/opciones,
  respuestas fuera de orden, reintentos y protección contra envíos duplicados.
- Compilaciones de backend, microfrontend y shell aprobadas.
- Suite general del shell: 44 pruebas aprobadas y una suite previa que no inicia:
  `disciplinary.service.spec.ts` usa `jest` bajo Vitest (`jest is not defined`).
  Ese módulo y su configuración no fueron modificados.

Las fuentes externas están simuladas en las pruebas. No se ejecutaron escrituras
en servidores ni pruebas contra bases de PRE/PROD. Antes de promover a producción,
comprobar en PRE carga/listado, consulta de empleado y certificados autorizados
con y sin funciones. Eliminar el cruce masivo no garantiza disponibilidad absoluta
de Oracle, PostgreSQL o la red.

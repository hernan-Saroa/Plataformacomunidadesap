# Funciones laborales por número de identificación

Desde el cambio del 28/09/2026, cada registro pertenece a una sola identificación. Cargo, grado, nivel, dependencia, grupo y tipo de vinculación ya no participan en la asociación de funciones.

## Gestión y plantilla

- Alta y edición: número de identificación y funciones. La identificación se guarda como texto, conserva ceros iniciales y admite puntos, espacios o guiones de presentación que se retiran al normalizar. No admite letras ni notación científica.
- Una identificación tiene como máximo un registro, incluso si está inactivo. La API y un índice único de PostgreSQL evitan duplicados. Para cambiar funciones se utiliza Editar.
- Plantilla Excel: dos columnas, `Número de identificación` y `FUNCIONES`, en la hoja `Matriz Funciones ESAP`. Se conservan las tres filas iniciales de identificación, instrucciones y encabezados. Los ejemplos ficticios van en otra hoja y no se importan.
- Una fila por persona y una función por línea dentro de la celda (Alt+Enter). Puede numerarse cada línea. Los números internos, como «numeral 2.», permanecen en el texto. Las funciones repetidas se deduplican conservando su orden.
- Máximo 10 MB y 5.000 registros por archivo; máximo 500 funciones por persona y entre 8 y 5.000 caracteres por función.
- Excel puede perder precisión después de 15 dígitos numéricos. Las identificaciones extensas deben guardarse y escribirse como texto; el importador rechaza las celdas numéricas que puedan haber perdido precisión.
- La carga valida cada fila y permite crear únicamente las válidas. No sobrescribe registros existentes. La importación vuelve a verificar unicidad y cada fila se guarda en una transacción.
- El listado busca por identificación y muestra identificación, cantidad de funciones y acciones según permisos. Seleccionar todos usa una sola lectura del catálogo.
- Consultar empleado sigue buscando por nombre o documento bajo demanda. La asociación se informa por identificación y no depende de la vinculación seleccionada, ni de la antigüedad de sus campos de cargo.

## Landing y certificado

El checkbox se llama `Incluir mis funciones laborales` y es voluntario. Al marcarlo se consulta la disponibilidad para el documento ingresado. Cambiar documento invalida respuestas anteriores y vuelve a verificar; desmarcar permite continuar sin funciones.

El servidor revalida las funciones al emitir. Si se eliminan, se inactivan o se reasignan después de la primera consulta, no se emite con funciones para la identificación anterior. La identidad y elegibilidad laboral mantienen sus validaciones existentes: cargar funciones no crea una persona ni le concede por sí solo acceso a certificados.

Los certificados nuevos guardan `profile_id`, `id_number`, `matched_at` y la lista ordenada en `functions_snapshot`. Las plantillas y el renderizado del PDF permanecen iguales. Los certificados anteriores conservan sus snapshots y sus funciones, aunque se edite o elimine la asignación actual.

## Datos anteriores y despliegue

Aplicar **`db/migrations/664_labor_functions_by_identification.sql` antes de arrancar la nueva versión de certification-service**. Desplegar coordinadamente el servicio, `mfe-certificados-laborales` y el shell. No hay paquetes ni variables de entorno nuevos.

La migración agrega la identificación y su índice único, permite que los campos antiguos de cargo sean nulos y conserva todas las filas y funciones existentes. No intenta deducir una identificación desde un cargo ni modifica certificados emitidos.

Los registros anteriores sin identificación aparecen como **Pendiente de identificación**. Conservan sus funciones y pueden completarse desde Editar. Mientras no se les asigne una identificación, no habilitan funciones para nuevas solicitudes. Si un antiguo perfil era compartido por varias personas, deben crearse registros separados por cada identificación; el primero puede reutilizarse mediante Editar y los demás mediante alta o la nueva plantilla.

La plantilla anterior de ocho columnas se rechaza expresamente para evitar interpretar códigos de cargo como documentos. No existe un fallback al cruce antiguo.

La migración fue comprobada dos veces sobre tablas temporales en PostgreSQL local. No se ha aplicado a las tablas reales ni se han desplegado servicios.

## Verificación reproducible

- Backend: `npm test -- --runInBand` y `npm run build` en `backend/certification-service`.
- Microfrontend: `npx vitest run` y `npm run build` en `apps/mfe-certificados-laborales`.
- Landing: `npx vitest run src/components/portal/SolicitarCertificadoLaboral.functions.test.tsx` y `npm run build` en `apps/shell`.
- Plantilla real y validación de ejemplos: `node scripts/verify-labor-functions-template.cjs`.
- Migración y operaciones reales del servicio sobre tablas TEMP: `node scripts/verify-labor-functions-db.cjs`. Solo admite el PostgreSQL local configurado en el `.env` de certification-service; revierte la transacción y nunca modifica tablas de aplicación.

Las pruebas incluyen asociación sin datos del cargo, aislamiento entre documentos, documentos normalizados, duplicados de creación/edición/importación, registros heredados, reasignación antes de emitir, conservación histórica, permisos y respuestas fuera de orden del landing.

Resultado local del 28/09/2026: 255 pruebas del backend, 72 del microfrontend y 16 del landing aprobadas; compilaciones del backend, microfrontend y shell aprobadas. También pasaron ambos scripts de verificación.

La comprobación de tipos de los archivos frontend afectados encontró ocho diagnósticos preexistentes en el cliente API (opciones `requiresAuth`/`params` y alias del código de verificación). Se compararon con los mismos archivos de HEAD en memoria: no aparecieron diagnósticos nuevos. Esto no equivale a una comprobación de tipos limpia de todo el repositorio.

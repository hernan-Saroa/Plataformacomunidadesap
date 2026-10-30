# Carga masiva de Graduados y nombres de roles

Revisión: 29 de octubre de 2026.

La carga masiva de Graduados utiliza su permiso `graduates.bulk_upload`. Un rol aprobador puede tenerlo como permiso adicional sin necesitar permisos de PTA ni de edición de graduados. Si se retira ese permiso, una carga abierta también deja de mostrarse.

La plantilla y la importación conservan el catálogo de títulos propio de Graduados, los campos obligatorios, fechas, duplicados, tamaño/formato del archivo y los controles numéricos de registro, acta y libro. Territorial y sede siguen siendo campos del graduado, pero se diligencian como texto libre: no se exige que existan en un catálogo ni que coincidan con una relación o periodo de PTA. El XLSX tampoco impone listas territoriales. Su hoja PARAMETROS explica las reglas propias de Graduados.

Los títulos se actualizan al llegar su propia consulta, sin esperar a la consulta de estructura utilizada por los filtros de la pantalla. Una consulta territorial pendiente no bloquea la plantilla.

Roles y Permisos muestra los nombres y descripciones devueltos por el servidor literalmente. Se retiró la corrección visual automática que añadía tildes a palabras como Verificacion o Titulos. Editar el nombre conserva el código técnico del rol y sus permisos.

Comprobaciones locales: 15 pruebas de plantilla/validación/importación (con XLSX reales), cuatro de permisos de Graduados y cuatro de nombres de roles. Incluyen carga sin catálogo territorial, consulta territorial sin respuesta, retirada del permiso, edición sin tildes y reapertura del rol. Compilaron Registro Académico y Gestión de Personas.

Para aplicar el cambio en producción se deben desplegar los remotos `mfe-registro-academico` y `mfe-gestion-personas` y recargar la aplicación. Este ajuste no requiere migraciones ni cambios de permisos o usuarios. No modifica las reglas del módulo PTA.

# REQ-RUND-F010 — Gestión documental del perfil docente

## Objetivo y alcance

Permitir que Gestión Profesoral (GGP) y los administradores autorizados carguen, consulten, descarguen, reemplacen y eliminen documentos PDF asociados a un perfil docente y organizados por categoría. El docente puede consultar sus propios documentos, pero no usar el CRUD administrativo. La carga de autogestión permanece aislada y exige una invitación OTP vigente perteneciente al mismo perfil.

## Actores y autorización

El administrador funcional predeterminado es el rol `GESTION_PROFESORAL`. `SUPER_ADMIN` mantiene el acceso global. Los roles personalizados se autorizan mediante `auth.role_permissions`, sin necesidad de agregar su código al backend.

| Permiso | Alcance |
|---|---|
| `banco-docentes.rund.view` | Listado, indicadores y consulta de perfiles |
| `banco-docentes.rund.manage` | Administración general del RUND |
| `banco-docentes.rund.edit` | Edición de datos del perfil |
| `banco-docentes.rund.validate` | Aprobación y devolución de bloques |
| `banco-docentes.rund.import` | Carga masiva |
| `banco-docentes.rund.export` | Exportación |
| `banco-docentes.rund.invite` | Invitaciones de autogestión |
| `banco-docentes.rund.documents.manage` | Cargar, reemplazar y eliminar documentos PDF |

Las migraciones `422_create_rund_documentos_perfil.sql` y `423_seed_rund_permissions.sql` deben ejecutarse en ese orden. La segunda registra el catálogo de permisos y asigna el conjunto completo a `GESTION_PROFESORAL`.

## Catálogo y validaciones

El catálogo inicial contiene `IDENTIDAD`, `TITULOS`, `CONTRATOS`, `CERTIFICADOS`, `RESOLUCIONES`, `AUTORIZACIONES` y `OTROS`. Es extensible mediante `academic_work_plan."RundDocumentoCategoria"` y permite configurar MIME, tamaño máximo, estado y orden por categoría.

La carga administrativa valida en servidor:

- existencia del perfil docente por UUID, persona o cédula;
- categoría activa;
- extensión `.pdf`;
- MIME `application/pdf`;
- firma binaria `%PDF-`;
- tamaño máximo de la categoría y `RUND_DOCUMENT_MAX_SIZE_BYTES`;
- un único documento activo para cada tipo de soporte integrado.

La validación del navegador mejora la experiencia, pero no sustituye la validación del backend.

## API

Base: `/pta/api/v1/pta/banco-docentes`.

| Método y ruta | Operación |
|---|---|
| `GET /documentos/categorias` | Consultar categorías activas |
| `GET /:docenteId/documentos` | Listar documentos vigentes |
| `GET /:docenteId/documentos?historial=true` | Consultar versiones y eliminados |
| `POST /:docenteId/documentos` | Cargar PDF (`multipart`: `file`, `categoria`, `descripcion`) |
| `POST /:docenteId/documentos/:documentId/reemplazo` | Crear una nueva versión |
| `GET /:docenteId/documentos/:documentId/contenido` | Visualizar en línea |
| `GET /:docenteId/documentos/:documentId/contenido?download=true` | Descargar |
| `DELETE /:docenteId/documentos/:documentId` | Eliminar el documento vigente |

El identificador del actor y la IP se toman de la petición autenticada; nunca se confía en un `actorId` enviado por el navegador.

## Versionamiento y trazabilidad

Cada carga crea un `documento_logico_id` y la versión 1. Reemplazar no sobrescribe: marca la versión vigente como `REEMPLAZADO`, crea la siguiente versión y conserva el historial. Eliminar marca el registro como `ELIMINADO`, retira el contenido del proveedor y oculta el documento del listado vigente.

Las acciones `CARGAR_DOCUMENTO`, `REEMPLAZAR_DOCUMENTO` y `ELIMINAR_DOCUMENTO` se registran en `RundAprobacionLog` con actor, fecha, IP, categoría, versión, archivo y proveedor, usando el canal `RUND_DOCUMENTAL`.

## OpenKM y almacenamiento local

Cuando existe `OPENKM_BASE_URL`, el servicio utiliza Basic Auth y las rutas REST oficiales de OpenKM para crear carpetas, cargar, leer y eliminar. La estructura es:

`/okm:root/RUND/{cedula}/{categoria}/{documentoLogicoId}/v{version}.pdf`

Variables requeridas en ambientes integrados:

- `OPENKM_BASE_URL`
- `OPENKM_USERNAME`
- `OPENKM_PASSWORD`
- `OPENKM_TIMEOUT_MS`
- `RUND_DOCUMENT_MAX_SIZE_BYTES`
- `RUND_DOCUMENT_ALLOW_LOCAL=false`

El proveedor local solamente es un respaldo explícito de desarrollo/pruebas. En producción, si OpenKM no está configurado y `RUND_DOCUMENT_ALLOW_LOCAL` es falso, la carga falla de forma segura y no almacena archivos silenciosamente en el contenedor.

## Matriz mínima de pruebas funcionales

| Caso | Resultado esperado |
|---|---|
| GGP carga PDF válido | Versión 1 activa, visible y auditada |
| Archivo con extensión, MIME o firma inválida | HTTP 400 |
| Archivo mayor al máximo | Rechazado |
| Categoría inexistente/inactiva | Rechazada |
| Reemplazo | Versión anterior reemplazada y nueva versión activa |
| Visualización/descarga | PDF del perfil solicitado, con disposición correcta |
| Eliminación | Documento fuera del listado vigente y acción auditada |
| Docente consulta otro perfil | HTTP 403 |
| Docente intenta cargar/reemplazar/eliminar | HTTP 403 |
| Rol personalizado con `documents.manage` | CRUD documental autorizado |
| Rol sin permiso | HTTP 403 |
| Autogestión con token vencido o de otro perfil | HTTP 403 |
| Producción sin OpenKM | Error de servicio; no usa almacenamiento local |

## Correspondencia con las subtareas

1. Servicio/API CRUD: controlador, `RundDocumentosService` y `RundDocumentStorageService`.
2. Validaciones/catálogo: tabla `RundDocumentoCategoria` y validación binaria del backend.
3. Trazabilidad: `RundAprobacionLog`, versiones inmutables y actor autenticado.
4. Interfaz: `RundDocumentManager` integrado en la validación integral del perfil.
5. Documentación: este documento.
6. Pruebas: especificaciones de validación, CRUD, almacenamiento OpenKM, autorización y autogestión en `src/pta/banco-docentes/*.spec.ts`.

# Permiso de Configuración PTA

Código: `pta.backoffice.config_reglas`.
Nombre en Roles y Permisos: **Ver y editar configuración PTA**.

Un único permiso habilita la pestaña Configuración y todas sus acciones: editar,
guardar, bloquear, desbloquear, exportar y restaurar versiones. No concede Gestión,
Solicitudes PTA, Seguimiento, revisión, aprobación ni permisos de otros módulos.
Una cuenta con únicamente este permiso entra directamente a Configuración.

Sin el permiso, la pestaña y el editor no se muestran. `GET /pta/api/v1/configuracion`
y `POST /pta/api/v1/configuracion` verifican la sesión y los permisos activos de la
cuenta en la base de datos en cada solicitud; retirar el permiso bloquea el siguiente
acceso incluso con un token anterior. SUPER_ADMIN conserva la excepción global
existente del sistema. El nombre de un rol administrativo no concede este acceso.

Los formularios docentes y los cálculos siguen leyendo las reglas operativas por
`GET /pta/api/v1/reglas`, sin historial, snapshots ni metadatos del bloqueo
administrativo. Esta consulta no permite modificar las reglas. No es necesario
asignar el nuevo permiso a docentes para que sus formularios sigan funcionando.
El cálculo de horas del plan de estudios en Programas Académicos consume también
esta ruta operativa, sin exigir el permiso de administración de PTA.

## Puesta en funcionamiento

1. Ejecutar `db/migrations/674_pta_manage_configuration_permission.sql` con el
   mecanismo habitual de migraciones. Es idempotente y no modifica asignaciones,
   PTAs ni valores de configuración.
2. Desplegar el servicio `academic-work-plan-service` y los frontends `mfe-pta` y
   `mfe-programas-academicos`: ambos consumen la nueva ruta operativa `/reglas`.
3. En Roles y Permisos, módulo PTA, habilitar **Ver y editar configuración PTA** en
   los roles autorizados. No se asigna automáticamente a roles ordinarios.
4. Actualizar la sesión del usuario para refrescar los permisos de la interfaz.

Comprobar con dos cuentas: una con el permiso y otra sin él. La primera debe poder
guardar un cambio; la segunda no debe ver la pestaña y debe recibir 403 si intenta
consultar o guardar configuración por API. Sin sesión, ambos endpoints devuelven
401. Un docente sin el nuevo permiso debe seguir cargando las reglas de su PTA.

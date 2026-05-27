# Administracion y Soporte Funcional: Configuracion, Usuarios y RBAC

## Plataforma ComUNIdadESAP

| Campo | Valor |
| --- | --- |
| Documento | Guia de administracion y soporte funcional |
| Fecha de elaboracion | 2026-05-25 |
| Alcance | Configuracion general y actualizacion; gestion de usuarios, permisos y roles RBAC |
| Base de verificacion | Pantallas frontend, servicios API, controladores, entidades y guards presentes en el repositorio |
| Modulo principal de administracion | `mfe-gestion-personas` con soporte de `auth-service` |

## 1. Proposito

Este documento orienta la operacion funcional de la plataforma para:

- Administrar configuraciones funcionales y sus actualizaciones controladas.
- Crear, consultar, actualizar, activar o inactivar usuarios.
- Asignar roles a usuarios y ajustar permisos asociados a cada rol.
- Atender incidentes de acceso, autorizacion o parametrizacion.
- Distinguir funcionalidades implementadas de pantallas, servicios o catalogos que aun dependen de datos mock o endpoints no confirmados.

No reemplaza los procedimientos institucionales de aprobacion de accesos, segregacion de funciones, proteccion de datos personales o auditoria.

## 2. Estado Funcional Verificado

### 2.1 Componentes de administracion y soporte

| Funcionalidad | Estado observado | Ubicacion principal |
| --- | --- | --- |
| Gestion de personas/usuarios | Conectada al backend para consulta, creacion, edicion, estado y reinicio administrativo de contrasena | `apps/mfe-gestion-personas/src/components/admin/UsersPersonsModulePremium.tsx`, `backend/auth-service/src/users/users.controller.ts` |
| Administracion de roles | Conectada al backend para listar, crear, editar, duplicar, activar/inactivar y alternar indicador 2FA | `RolesAdministrationModulePremium.tsx`, `roles.controller.ts` |
| Asignacion de permisos a rol | Conectada mediante editor de permisos y endpoint de actualizacion | `RolePermissionsEditor.tsx`, `roles.service.ts` |
| Catalogo de modulos y permisos | Disponible desde `auth-service` para construir el editor RBAC | `modules.controller.ts`, `modules.service.ts` |
| Asignacion de roles a usuario | Implementada mediante actualizacion del usuario con `roleIds` | `UsersPersonsModulePremium.tsx`, `users.service.ts` |
| Alcance de rol | Campo `alcance` disponible en entidad/servicio y modal frontend | `role.entity.ts`, `ScopeConfigModal.tsx` |
| Configuracion de estructura organizacional | CRUD de seccionales y sedes disponible en `auth-service` | `estructura-organizacional.controller.ts` |
| Datos maestros para roles/alcances | Endpoint existente, pero datos mock en backend | `datos-maestros.service.ts` |
| Configuracion control disciplinario | Endpoints y pantallas para etapas, parametros globales, autos, oficios y actas | `internal-disciplinary-control-service`, `mfe-control-disciplinario` |
| Configuracion profesionales OCIG | CRUD protegido por permisos | `internal-institutional-control-service/src/esap/configuraciones/` |
| Configuracion de plantillas de certificados | Lectura/actualizacion y carga de firma/logo con autenticacion global | `certification-service/src/certificates/template-config.controller.ts` |
| Configuracion gestion legal | Endpoint generico por clave presente | `legal-management-service/src/controllers/configurations.controller.ts` |

### 2.2 Restricciones y hallazgos que debe conocer soporte

| Prioridad | Hallazgo | Consecuencia funcional |
| --- | --- | --- |
| Alta | La asignacion de roles a usuario solo se reemplaza cuando `roleIds` contiene al menos un rol | No se puede retirar el ultimo rol desde el flujo verificado; se requiere regla funcional o ajuste tecnico |
| Alta | `userRolesService` del frontend declara historial, rol principal, activacion/desactivacion individual y validacion, pero esas rutas no aparecen en `UsersController` revisado | No reportar dichas funciones como operativas sin prueba o implementacion adicional |
| Alta | Configuracion de gestion legal tiene `GET/PUT /configurations/:key` sin guard visible ni guard global identificado en el servicio revisado | Debe revisarse autorizacion antes de habilitar administracion funcional en ambientes expuestos |
| Media | Estructura organizacional y catalogo de modulos de `auth-service` estan autenticados por guard global, pero sus controladores no declaran restriccion `ADMIN`/`SUPER_ADMIN` como usuarios y roles | Revisar que usuarios autenticados no puedan alterar parametros administrativos sin autorizacion especifica |
| Media | La configuracion de plantillas de certificados tiene autenticacion global, pero no se observo permiso granular de administracion en el controlador | Incorporar autorizacion funcional antes de delegar la operacion a roles no administradores |
| Media | `datos-maestros.service.ts` devuelve territoriales, CETAP y programas definidos en memoria | Las opciones pueden no reflejar catalogos institucionales reales |
| Media | Existen componentes/hook antiguos de roles con `mockRolesService`, aunque el modulo premium usa el servicio real | Soporte debe validar la ruta/pantalla activa antes de concluir que un cambio persistio |

## 3. Modelo Funcional de Acceso RBAC

### 3.1 Relacion de entidades

```text
Usuario (user)
  |-- tiene uno o varios Roles (role) mediante user_roles
        |-- tiene uno o varios Permisos (permission) mediante role_permissions
              `-- cada permiso pertenece a un Modulo (module)
```

| Entidad | Uso funcional |
| --- | --- |
| Usuario | Cuenta asociada a persona, estado activo/inactivo y credenciales |
| Rol | Perfil asignable, de sistema o personalizado; puede tener alcance, estado y requerimiento 2FA |
| Permiso | Accion autorizada sobre una funcionalidad, identificada por codigo |
| Modulo | Agrupador de permisos por dominio de negocio (`backoffice` o `portal`) |

### 3.2 Regla de autorizacion confirmada para administracion de usuarios y roles

El `auth-service` tiene autenticacion JWT global. Para operaciones de escritura sobre usuarios y roles, los controladores aplican `RolesGuard` con:

```text
SUPER_ADMIN o ADMIN
```

| Operacion | Acceso requerido comprobado |
| --- | --- |
| Crear, modificar, eliminar, activar/inactivar usuario y reiniciar contrasena | `SUPER_ADMIN` o `ADMIN` |
| Crear, modificar, eliminar, duplicar o activar/inactivar rol | `SUPER_ADMIN` o `ADMIN` |
| Actualizar permisos de rol | `SUPER_ADMIN` o `ADMIN` |
| Consultar usuarios/roles/permisos para integracion | Usuario autenticado o solicitud interna valida, segun endpoint |

Un rol marcado como `sistema` no puede eliminarse mediante el servicio de roles. La interfaz tambien presenta `SUPER_ADMIN` como rol especial.

### 3.3 Permisos por dominio

El repositorio contiene codigos de permisos granulares para dominios funcionales, entre ellos:

| Dominio | Ejemplos de configuracion controlable |
| --- | --- |
| Gestion legal | `gestion-legal.configuraciones.manage`, create, edit, delete |
| Control disciplinario | Configuraciones, etapas, cargos, autos, oficios, entidades, notificaciones y prescripcion |
| Control interno | `control-interno.configuraciones.manage` y permisos especificos de configuracion/kanban |

La existencia del codigo de permiso no confirma por si sola que cada endpoint lo aplique. La validacion final debe hacerse revisando el guard del controlador del dominio.

## 4. Roles Funcionales de Administracion

| Actor | Responsabilidad sugerida | Operaciones |
| --- | --- | --- |
| Administrador funcional | Gestionar parametros aprobados del modulo asignado | Actualizar configuraciones de negocio dentro de su competencia |
| Administrador de accesos | Ejecutar altas, bajas y modificaciones RBAC aprobadas | Crear usuario, asignar rol, ajustar permisos, inactivar acceso |
| Propietario de proceso | Aprobar cambios de configuracion o privilegios sensibles | Validar necesidad, alcance y segregacion |
| Mesa de soporte | Registrar, clasificar, diagnosticar y escalar solicitudes | Consultas, evidencia, validacion posterior |
| Auditor/seguridad | Revisar trazabilidad y privilegios | Revision periodica de roles y accesos |

Para cambios de permisos o roles privilegiados se recomienda el principio de doble validacion: un solicitante/aprobador y un ejecutor diferente.

## 5. Configuracion General y Actualizacion

### 5.1 Catalogo de configuraciones verificadas

| Dominio | Configuracion observada | Nivel de implementacion | Control de acceso observado |
| --- | --- | --- | --- |
| Usuarios / organizacion | Seccionales, sedes, ubicaciones y estadisticas | Backend CRUD | Autenticacion global en `auth-service`; sin rol administrativo explicito en controlador |
| Roles y permisos | Roles, alcance, estado, 2FA, permisos por modulo | Backend y UI conectados | Escritura restringida a `ADMIN`/`SUPER_ADMIN` |
| Control disciplinario | Etapas, configuracion global, alertas, autos, oficios, actas y plantillas | Backend y pantallas presentes | JWT y roles `SUPER_ADMIN`, `ADMIN` o acceso de modulo disciplinario |
| Control interno | Profesionales OCIG y permisos de configuracion | Backend y pantallas presentes | JWT y `control-interno.configuraciones.manage` |
| Certificados | Plantilla, firmante, firma, logo, contenido e historial de cambios | Backend presente | JWT global; sin permiso granular identificado en el controlador |
| Gestion legal | Configuracion por clave | Backend presente | Sin guard identificado en controlador o modulo revisado |
| Datos maestros | Territoriales, CETAP y programas para seleccion | Endpoint presente | Datos definidos en memoria; no es mantenimiento maestro persistente confirmado |

### 5.2 Flujo funcional para solicitar una actualizacion

1. Registrar la necesidad con modulo, parametro a cambiar, valor actual, valor nuevo, motivo, ambiente y fecha requerida.
2. Identificar el propietario funcional que debe aprobar el cambio.
3. Evaluar impacto:

| Tipo de cambio | Impacto a validar |
| --- | --- |
| Etapa, plazo o regla de alerta | Procesos activos, vencimientos, notificaciones y reportes |
| Plantilla, logo o firma | Documentos nuevos, validez institucional y version previa |
| Sede, seccional o alcance territorial | Visibilidad de usuarios y asignaciones operativas |
| Rol o permiso | Acceso a datos, segregacion de funciones y tareas pendientes |
| Activacion/inactivacion | Procesos que dependan del elemento desactivado |

4. Verificar que el solicitante no ejecute su propio incremento de privilegios sin aprobacion.
5. Aplicar el cambio mediante el modulo funcional correspondiente.
6. Probar el resultado con un usuario autorizado y, cuando aplique, con uno no autorizado.
7. Registrar evidencia, responsable, aprobador, resultado y procedimiento de reversion.

### 5.3 Procedimiento de actualizacion de configuracion

#### Antes del cambio

- Confirmar ambiente (`DEV`, `QA`, `PRE` o `PROD`) y respaldo o valor anterior.
- Confirmar permiso del ejecutor y aprobacion funcional.
- Capturar pantalla o exportar valor actual si la funcionalidad lo permite.
- Identificar si la modificacion afecta procesos en curso.

#### Durante el cambio

- Cambiar solo los parametros aprobados.
- No utilizar operaciones de `seed`, restablecimiento o eliminacion masiva como via habitual de actualizacion.
- Para archivos de plantilla, validar tipo, tamano y version institucional aprobada.
- Para etapas o plazos, confirmar si el backend actualiza entidades relacionadas.

#### Despues del cambio

- Reabrir la pantalla o consultar nuevamente el parametro para confirmar persistencia.
- Ejecutar un flujo representativo: carga de plantilla, generacion de documento, cambio de etapa o consulta de acceso, segun corresponda.
- Adjuntar evidencia y dejar valor anterior disponible para reversa.

### 5.4 Reversion funcional

| Configuracion | Reversion sugerida |
| --- | --- |
| Parametro simple o regla | Reponer el valor anterior aprobado |
| Plantilla/firma/logo | Restaurar archivo o version previa; certificados ya emitidos deben analizarse por separado |
| Rol/permisos | Retirar permiso agregado o restaurar matriz previa; validar sesiones vigentes |
| Etapa o plazo | No revertir sin evaluar procesos que ya fueron migrados o recalculados |
| Estructura organizacional | Restituir asignacion anterior con revision de usuarios afectados |

## 6. Gestion de Usuarios

### 6.1 Funciones soportadas

| Operacion | Pantalla/servicio | Endpoint funcional observado |
| --- | --- | --- |
| Consultar y filtrar usuarios | Usuarios/Personas | `GET /auth/api/v1/users` |
| Consultar detalle de usuario | Usuarios/Personas | `GET /auth/api/v1/users/:id` |
| Crear persona y usuario | Modal de creacion | `POST /auth/api/v1/users` |
| Editar datos personales y asignacion territorial | Modal de edicion | `PUT /auth/api/v1/users/:id` |
| Activar/inactivar usuario | Acciones de tabla | `PUT /auth/api/v1/users/:id/status` |
| Reinicio administrativo de contrasena | Modal de contrasena | `PUT /auth/api/v1/users/:id/password` |
| Asignar roles al usuario | Modal Asignar Roles | `PUT /auth/api/v1/users/:id` con `roleIds` |

### 6.2 Alta de usuario

#### Datos requeridos observados

| Campo | Condicion |
| --- | --- |
| Nombres y apellidos | Requeridos |
| Numero y tipo de identificacion | Requeridos; el backend controla duplicidad en actualizacion |
| Correo | Requerido y validado como email |
| Telefono y genero | Opcionales |
| Territorial (`idSeccional`) y CETAP (`idSede`) | Opcionales |
| Roles (`roleIds`) | Opcionales, con identificadores UUID existentes |

#### Procedimiento

1. Validar que la solicitud identifique persona, dependencia, rol requerido y aprobador.
2. Buscar previamente el usuario por identificacion o correo.
3. Crear la persona/usuario con ubicacion y roles estrictamente necesarios.
4. Confirmar que el usuario aparezca activo y con los roles asignados.
5. Comunicar el proceso seguro de acceso inicial o cambio de contrasena segun politica aplicable.

Nota funcional: en el flujo de creacion verificado, el backend genera inicialmente una contrasena por defecto en el servicio. Antes de uso productivo debe asegurarse un mecanismo de activacion o cambio obligatorio suficientemente seguro.

### 6.3 Modificacion, activacion e inactivacion

| Solicitud | Accion de soporte | Verificacion posterior |
| --- | --- | --- |
| Cambio de datos personales | Editar solo campos aprobados | Consultar detalle actualizado |
| Cambio de Territorial/CETAP | Modificar asignacion organizacional | Verificar filtros y visibilidad del usuario |
| Bloqueo o retiro | Inactivar usuario, no eliminar como primera opcion | Confirmar que no pueda iniciar sesion |
| Reactivacion | Activar tras nueva autorizacion | Validar roles vigentes antes del acceso |
| Restablecer contrasena | Ejecutar solo tras validacion de identidad/procedimiento | Evitar comunicar contrasena por canales inseguros |

### 6.4 Baja o eliminacion

La eliminacion debe ser excepcional. Antes de eliminar una persona/usuario:

- Verificar obligaciones de retencion, auditoria y trazabilidad.
- Revisar si tiene procesos, documentos, aprobaciones o responsabilidades asignadas.
- Preferir inactivacion cuando se deba preservar historial.
- Obtener aprobacion formal y documentar la reversion posible o imposibilidad de restauracion.

## 7. Administracion de Roles y Permisos

### 7.1 Funciones soportadas

| Operacion | Endpoint observado |
| --- | --- |
| Consultar roles y estadisticas | `GET /auth/api/v1/roles`, `GET /auth/api/v1/roles/stats` |
| Crear rol | `POST /auth/api/v1/roles` |
| Editar rol y alcance | `PUT /auth/api/v1/roles/:id` |
| Duplicar rol | `POST /auth/api/v1/roles/:id/duplicate` |
| Activar/inactivar rol | `PATCH /auth/api/v1/roles/:id/toggle-active` |
| Alternar requisito 2FA | `PATCH /auth/api/v1/roles/:id/toggle-2fa` |
| Consultar permisos de rol | `GET /auth/api/v1/roles/:id/permissions` |
| Reemplazar permisos de rol | `PUT /auth/api/v1/roles/:id/permissions` |
| Consultar modulos/permisos disponibles | `GET /auth/api/v1/modules`, `GET /auth/api/v1/modules/permissions` |

### 7.2 Creacion o ajuste de un rol

1. Definir nombre, codigo, descripcion, sistema destino (`Backoffice`, `Portal` o alcance aplicable) y justificacion.
2. Confirmar si debe ser un rol personalizado; los roles de sistema tienen protecciones especiales.
3. Elegir permisos minimos necesarios por modulo.
4. Definir alcance territorial o funcional cuando corresponda.
5. Definir si requiere 2FA segun sensibilidad.
6. Crear o actualizar el rol.
7. Validar con un usuario de prueba o usuario controlado:

| Prueba | Resultado esperado |
| --- | --- |
| Acceso permitido | El usuario visualiza y ejecuta solo las acciones aprobadas |
| Acceso no permitido | La plataforma bloquea operaciones fuera del rol |
| Alcance | La informacion visible corresponde a territorial/CETAP o dominio autorizado |
| Retiro de permiso | La accion deja de estar disponible o es rechazada por backend |

### 7.3 Asignacion de roles a un usuario

#### Flujo implementado

La pantalla `UsersPersonsModulePremium` carga roles disponibles, permite seleccionar varios roles y actualiza el usuario enviando `roleIds`.

#### Procedimiento funcional

1. Identificar usuario y solicitud aprobada.
2. Consultar roles actuales antes de modificar.
3. Seleccionar los roles requeridos, evitando acumulacion innecesaria.
4. Guardar y volver a consultar al usuario.
5. Validar acceso efectivo al modulo solicitado.
6. Registrar roles anteriores y posteriores.

#### Restriccion confirmada

El servicio backend solo modifica la relacion de roles cuando recibe al menos un `roleId`. Por ello:

- Retirar algunos roles conservando al menos uno esta soportado.
- Retirar todos los roles de un usuario no esta confirmado mediante la pantalla actual.
- Para revocar completamente el acceso se debe inactivar el usuario o implementar formalmente la asignacion vacia, segun decision funcional y tecnica.

### 7.4 Asignacion de permisos a un rol

El editor `RolePermissionsEditor` consulta modulos y permisos, carga permisos actuales del rol y guarda la nueva seleccion mediante `PUT /roles/:id/permissions`.

#### Buenas practicas

- No asignar permisos directos a usuarios si el modelo autorizado es por roles.
- Evitar modificar un rol compartido para resolver un caso individual; considerar un rol especifico aprobado.
- Para roles utilizados por muchos usuarios, evaluar impacto antes de guardar.
- Documentar permisos agregados y retirados mediante sus codigos.
- Verificar los permisos inactivos y no seleccionarlos salvo que exista habilitacion aprobada.

#### Regla tecnica observada

El backend filtra permisos inactivos al asignar. Ademas, para permisos de certificados laborales solo admite un subconjunto asignable definido en el servicio de roles.

## 8. Soporte Funcional de Acceso

### 8.1 Tipificacion de solicitudes

| Tipo de solicitud | Diagnostico inicial | Accion posible |
| --- | --- | --- |
| Usuario no puede ingresar | Verificar estado activo, credencial y autenticacion | Reactivar autorizadamente o escalar autenticacion |
| Usuario ingresa pero no ve modulo | Verificar roles, permisos del rol y alcance | Asignar rol/permiso aprobado o corregir alcance |
| Usuario ve accion no autorizada | Verificar matriz del rol y aplicacion del permiso en backend | Retirar permiso y escalar riesgo de autorizacion |
| Configuracion no guarda | Confirmar permiso, endpoint y valor enviado | Reintentar controlado o escalar defecto |
| Datos de territorial/CETAP no coinciden | Determinar si pantalla usa datos mock o persistidos | Corregir catalogo o advertir limitacion |
| Permiso asignado no surte efecto | Revisar sesion/token y guard del servicio destino | Renovar sesion si aplica y escalar si endpoint no valida permiso |

### 8.2 Diagnostico de un incidente RBAC

1. Capturar usuario, modulo, operacion, pantalla, fecha/hora y mensaje recibido.
2. Consultar el usuario y sus roles actuales.
3. Consultar los permisos del rol correspondiente.
4. Comparar el permiso necesario con el codigo usado por el dominio.
5. Verificar si el endpoint destino aplica guard por rol o permiso.
6. Probar con perfil administrador y perfil afectado, sin ampliar privilegios permanentemente.
7. Clasificar la solucion:

| Solucion | Cuando aplica |
| --- | --- |
| Ajuste funcional de rol | El permiso fue omitido en una asignacion aprobada |
| Ajuste de alcance | El rol existe, pero su cobertura territorial/funcional es incorrecta |
| Correccion tecnica | La UI oculta/expone mal acciones o el backend no aplica autorizacion |
| Actualizacion de catalogo | La opcion de configuracion no corresponde a datos vigentes |

## 9. Control de Cambios y Evidencia

### 9.1 Registro minimo de configuracion

| Campo | Descripcion |
| --- | --- |
| Solicitud y aprobacion | Numero de caso, solicitante y aprobador |
| Ambiente | Entorno donde se realizo el cambio |
| Modulo/configuracion | Pantalla, parametro o dominio |
| Valor anterior | Estado antes de la modificacion |
| Valor nuevo | Estado aplicado |
| Justificacion | Motivo funcional o normativo |
| Evidencia | Capturas, respuesta o comprobacion de flujo |
| Reversion | Valor o procedimiento para restaurar |

### 9.2 Registro minimo de acceso RBAC

| Campo | Descripcion |
| --- | --- |
| Usuario afectado | Identificacion institucional y cuenta |
| Roles anteriores/nuevos | Relacion antes y despues |
| Permisos sensibles | Codigos agregados o retirados, si se modifico rol |
| Alcance | Territorial, CETAP, modulo o dominio habilitado |
| Vigencia | Permanente o temporal, si aplica |
| Aprobador | Responsable funcional del acceso |
| Ejecutor | Administrador que aplico el cambio |
| Validacion | Prueba de acceso autorizado y denegacion esperada |

## 10. Controles Periodicos Recomendados

| Control | Periodicidad sugerida | Objetivo |
| --- | --- | --- |
| Revision de usuarios inactivos o retirados | Mensual | Evitar accesos vigentes no necesarios |
| Revision de roles `ADMIN` y `SUPER_ADMIN` | Mensual | Controlar privilegios elevados |
| Revision de roles sin usuarios o duplicados | Trimestral | Simplificar matriz RBAC |
| Revision de permisos por modulo | Trimestral o por cambio funcional | Aplicar minimo privilegio |
| Revision de configuraciones criticas | Mensual y antes de cierre operativo | Detectar valores no autorizados |
| Revision de catalogos mock o temporales | Por version | Evitar operar con informacion no institucional |
| Prueba de acceso permitido/denegado | Tras cada cambio RBAC relevante | Confirmar aplicacion efectiva |

## 11. Matriz de Riesgos y Acciones Pendientes

| Prioridad | Riesgo o pendiente | Accion recomendada |
| --- | --- | --- |
| Alta | No existe flujo confirmado para retirar todos los roles de un usuario | Definir regla de negocio e implementar revocacion controlada o exigir inactivacion |
| Alta | Rutas de historial/rol principal del frontend no estan confirmadas en backend | Ocultar flujo no disponible o completar endpoints con pruebas |
| Alta | Configuracion de gestion legal no evidencia control de acceso | Incorporar autenticacion y permiso granular antes de operacion productiva |
| Media | Mutaciones de estructura organizacional sin rol administrativo explicito en controlador | Restringir escritura a rol/permiso autorizado |
| Media | Plantillas de certificados sin permiso administrativo granular observado | Definir y aplicar permiso de gestion de plantillas |
| Media | Datos maestros usados para alcance provienen de arreglos mock | Migrar a catalogo persistente oficial o etiquetar funcionalidad como demostrativa |
| Media | Campo `created_by`/`updated_by` de roles recibe `'current_user'` como valor pendiente | Registrar usuario real que ejecuta cambios RBAC |
| Media | Pantallas legacy/hook mock coexisten con servicios conectados | Retirar o identificar claramente componentes no productivos |

## 12. Checklist de Atencion

### Configuracion o actualizacion

- [ ] Se identifico modulo, parametro y ambiente.
- [ ] Existe aprobacion funcional para el cambio.
- [ ] Se guardo valor anterior y procedimiento de reversa.
- [ ] Se confirmo que la pantalla usa backend real y no datos mock/locales.
- [ ] Se probo el efecto del cambio y se adjunto evidencia.

### Usuario

- [ ] Se valido identidad y necesidad de acceso.
- [ ] Se verifico si el usuario ya existia.
- [ ] Se asignaron solo roles necesarios.
- [ ] Para retiro, se inactivo el usuario o se aplico procedimiento aprobado.
- [ ] No se compartieron credenciales por medios inseguros.

### Rol o permisos

- [ ] Se documentaron roles/permisos antes y despues.
- [ ] Se valido segregacion de funciones y minimo privilegio.
- [ ] Se probo un acceso permitido y uno no permitido.
- [ ] Se reviso alcance territorial/funcional.
- [ ] Se registro ejecutor y aprobador.

## 13. Referencias Internas Revisadas

- `backend/auth-service/src/app.module.ts`
- `backend/auth-service/src/auth/authorization.constants.ts`
- `backend/auth-service/src/auth/guards/jwt-auth.guard.ts`
- `backend/auth-service/src/auth/guards/roles.guard.ts`
- `backend/auth-service/src/users/users.controller.ts`
- `backend/auth-service/src/users/users.service.ts`
- `backend/auth-service/src/users/roles.controller.ts`
- `backend/auth-service/src/users/roles.service.ts`
- `backend/auth-service/src/users/modules.controller.ts`
- `backend/auth-service/src/users/modules.service.ts`
- `backend/auth-service/src/users/estructura-organizacional.controller.ts`
- `backend/auth-service/src/users/datos-maestros.service.ts`
- `apps/mfe-gestion-personas/src/components/admin/UsersPersonsModulePremium.tsx`
- `apps/mfe-gestion-personas/src/components/admin/RolesAdministrationModulePremium.tsx`
- `apps/mfe-gestion-personas/src/components/admin/RolePermissionsEditor.tsx`
- `apps/mfe-gestion-personas/src/services/api/roles.service.ts`
- `apps/mfe-gestion-personas/src/services/api/userRolesService.ts`
- `apps/shell/src/services/api/modules.service.ts`
- `packages/shared-types/src/permissions.ts`
- `backend/internal-disciplinary-control-service/src/controllers/configuration.controller.ts`
- `backend/internal-disciplinary-control-service/src/controllers/autos-configuration.controller.ts`
- `backend/internal-disciplinary-control-service/src/controllers/oficio-configuration.controller.ts`
- `backend/internal-disciplinary-control-service/src/controllers/acta-configuration.controller.ts`
- `backend/internal-institutional-control-service/src/esap/configuraciones/configuraciones-profesionales-ocig.controller.ts`
- `backend/certification-service/src/certificates/template-config.controller.ts`
- `backend/legal-management-service/src/controllers/configurations.controller.ts`


# Contexto de Migración - Módulo PTA (Plan de Trabajo Académico)

Este documento ha sido generado para asegurar una transición limpia y estructurada del conocimiento técnico acumulado durante la migración del módulo PTA. Este archivo es **crítico para el próximo agente** que deba retomar el trabajo, solucionar los bugs pendientes y finalizar la migración a la nueva arquitectura.

## 1. Arquitectura de Destino

La migración está enfocada en pasar el antiguo monolito/código acoplado a un esquema moderno de **Aplicaciones Basadas en Microservicios y Micro-frontends (MFE)**.

### a. Frontend (Module Federation con Vite)
- **Host (Shell)**: Recibe los micro-frontends y maneja el enrutamiento global.
- **MFE PTA (`apps/mfe-pta`)**: Todo el ecosistema de componentes de interfaz del Docente y del Backoffice (Aprobadores).
  - Archivos críticos: `PTAForm.tsx`, `PTADetallePanelBackoffice.tsx`, `PortalDocentePTA.tsx`.
- **Estrategia de Ejecución Local**: La integración MFE actual provoca cuelgues o consumo excesivo de memoria por dependencias circulares si se deja el modo "watch" nativo. Por lo que **el frontend se está corriendo estáticamente** usando el comando: `npm run dev:all -- --apps=shell,mfe-pta --no-remote-watch`. 
  - *Nota para el próximo Agente:* Al modificar JSX/TSX en el MFE, indícale siempre al usuario que **el caché de Vite le bloqueará los cambios**. El usuario DEBE parar la terminal frontend, correr de nuevo el comando y refrescar el navegador con `Ctrl+F5`.

### b. Backend (NestJS + TypeORM)
- **Auth Service (`backend/auth-service`)**: Gestiona perfiles, roles y catálogos.
- **Academic Work Plan Service (`backend/academic-work-plan-service`)**: Es el microservicio aislado de PTA. 
  - Archivos críticos: `pta.controller.ts`, `pta.service.ts`, Entidades de TypeORM.
- **API Gateway (`localhost:3000`)**: Enruta todas las llamadas REST.

## 2. Estado de la Migración (% Estimado: 75% - 85%)

Se estructuraron casi todas las pantallas visuales y el backend base para listar e inyectar configuraciones:
- ✅ **Componentes UI (95%)**: Portados a MFE (Dashboards, Modal de Detalle, Formulario v2, firmas).
- ✅ **Backend Básico (90%)**: Los endpoints para CRUD y consultas DB de evidencias/catálogos/stats están enrutados vía Axios API Client.
- ⚠️ **Lógica de Estados de Flujo (70%)**: Se intentaron trazar transiciones como `avanzar_sin_cambios`, rechazos, o `revision_docente_N1` -> Devoluciones. 
- ❌ **Flujo de Transacción Crítica (Guardar/Enviar)**: Aquí hubo quiebres severos donde el flujo crashea al "Guardar Borrador" o "Enviar a Aprobación". 

## 3. Especificaciones de Base de Datos y Dependencias Resolutivas

### Problema del Acoplamiento de Entidades y Llaves Foráneas Compartidas
Dado que el monolito compartía tablas, el Microservicio de PTA tiene *sus propias tablas* (`academic_work_plan` schema), pero se vale de las entidades heredadas (`auth.personas`).

1. **Lectura de Nombre Docente (Nombres Legacy vs Modernos)**:
   - Las consultas SQL nativas del backend ahora hacen aliases hacia la tabla vieja para no reventar por columnas no encontradas.
   - En `pta.service.ts`, hacemos un `JOIN` y extraemos: `p.nom_tercero as primer_nombre`, `p.seg_nombre as segundo_nombre`, `p.pri_apellido as primer_apellido`, `p.seg_apellido as segundo_apellido`.
2. **Aprovisionamiento Automático (Dummy Entities)**:
   - Porque `academic_work_plan."Docente"` exige foráneas estrictas de usuarios y personas, cuando se evalúa un docente de `auth` que **no existe** en el aislamiento del microservicio de PTA, el código backend detecta la ID y **autoconstruye un Usuario y Persona fantasma** (upsert) en el schema de *academic_work_plan* antes de vincular el PTA.
   - **Crucial**: Este auto-aprovisionamiento fue cambiado de `save` a `.upsert([...], ['id'])` debido a que React dispara transacciones en paralelo y provocaba excepciones de concurrencia `23505: Llave duplicada (Usuario_pkey)`. Mantén en mente las _race conditions_.

### Uso de la Columna `datosEstructurados` de tipo JSONB
El `PlanTrabajoAcademicoEntity` guarda los metadatos flexibles en un JSON (`datosEstructurados`). Cuando pintes el UI (ej: *Programa* o *Territorial*), asegúrate de hacer un chain robusto de fallbacks en el objeto PTA debido a la hibridación de datos, ej: `pta.programa_academico || pta.programa || pta.programa_nombre`. 

## 4. Workarounds Actuales ("Parches de Silencio")

Para evitar llenar la consola del navegador del cliente con errores y hacer debug más fácil, temporalmente se han enmascarado/mockeado las consultas de estadísticas del portal.
- En `apps/mfe-pta/src/components/portal/portalApi.ts`, funciones como `getEstadisticasPortal` o `inicializarDatosPortal` se les hizo _fallback_ asíncrono para retornar `{ success: true, data: {...} }` si fallan (status 404), ya que esos endpoints en el gateway/backend probablemente aún no han sido implementados para este servicio aislado.

## 5. Misión Inmediata para el Próximo Agente

1. **Resolver la Transición "Borrador → Aprobación":** El usuario indicó que NO es posible enviar el borrador ni guardarlo exitosamente sin que el frontend o backend tiren transiciones desconocidas o ReferenceErrors al resolver los IDs del docente o de flujo. 
2. **Revisar Contextos Globales del Formulario (`PTAForm.tsx`)**: Revisa muy de cerca la función `handleSave()`. El frontend ha intentado inferir variables como la identidad del profesor (antes `userName`, ahora `docenteName` del Component State local) y variables mutadas del proceso (`isReenvio` etc.). Haz trazabilidad limpia del *Payload* que se arma allí hacia el API Gateway.
3. **Mantenimiento DB Migrations**: Dado que seguramente necesites aplicar cambios al esquema de la máquina de estados, el usuario pide rigurosamente que crees una instrucción SQL en el archivo `db/migrations/migration_N.sql`. Recuerda que el usuario prefiere ejecutar `.sql` manualmente por su cuenta. 

---

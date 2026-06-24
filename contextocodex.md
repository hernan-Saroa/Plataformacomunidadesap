# Contexto General: Módulo de Gestión Legal (Plataforma Comunidad ESAP)

Este documento centraliza el conocimiento arquitectónico, técnico y de negocio respecto al módulo de **Gestión Legal**. Su propósito es servir como "memoria" o "códex" para entender rápidamente cómo opera el sistema, cuáles son las dependencias y qué prácticas de desarrollo se deben seguir de forma estricta.

## 1. Visión General del Negocio

El módulo de Gestión Legal permite a la Escuela Superior de Administración Pública (ESAP) llevar el control y trazabilidad de todos sus procesos jurídicos, disciplinarios y administrativos. El sistema alerta a los abogados y responsables sobre vencimientos de términos procesales, permite el control documental de los expedientes y genera reportes en tiempo real para el Secretariado General.

### Submódulos Principales:
1. **Defensa Judicial**: Control de procesos judiciales donde la ESAP es demandante o demandada. Incluye vistas Kanban, semáforo de tiempos (verde, amarillo, rojo según días restantes) y flujos de etapas (ej. Admisión, Notificación, Probatoria, Fallo).
2. **Juzgamiento Disciplinario**: Procesos disciplinarios internos a funcionarios de la ESAP.
3. **Términos e Informes**: Seguimiento a plazos de entrega de informes obligatorios de Ley y respuestas a PQRSDs/Tutelas.
4. **Órganos de Control**: Requerimientos recibidos por entidades como Contraloría, Procuraduría o Fiscalía.
5. **Planes de Mejoramiento**: Módulo diseñado para hacer seguimiento a los hallazgos de las auditorías y definir planes de acción y compromisos para cerrarlos.
6. **Políticas y Daño Antijurídico**: Repositorio normativo y de políticas de prevención.
7. **Reportes de Gestión Legal**: Dashboard y exportación (Excel, PDF) de métricas cruzadas de todos los submódulos (integrado al "Motor de Reportes V2").

---

## 2. Arquitectura del Sistema

La plataforma está diseñada usando un enfoque desacoplado:

### 2.1 Micro-Frontends (MFE) - Frontend
- **Tecnología**: React, TypeScript, Vite, TailwindCSS, `@shadcn/ui` (con adaptaciones locales en `@esap-mfe/shared-ui`).
- **Aplicación principal**: `apps/mfe-gestion-legal`. Contiene todas las vistas y flujos del sistema legal.
- **Shell**: `apps/shell` actúa como orquestador general y provee el API Client, el contexto de usuario (AuthService) y el entorno.
- **Comunicación entre MFEs**: Se emplean CustomEvents (ej. `legal:open-expediente-detail`) para evitar recargas de página y permitir una navegación tipo SPA entre módulos.

### 2.2 Microservicios (Backend)
- **Tecnología**: Node.js, NestJS, TypeScript, TypeORM, PostgreSQL.
- **Servicio principal**: `backend/legal-management-service` (Puerto 3008). Maneja toda la lógica CRUD, relaciones y reglas de negocio de los expedientes, procesos y planes de mejoramiento.
- **Dependencias**:
  - `auth-service` (Puerto 3001): Controla la sesión, roles y permisos de los usuarios. Otorga listas de abogados con el rol `RESUELVE_GESTION_LEGAL`.
  - `notifications-service`: Maneja los envíos de notificaciones push o de sistema para alertar vencimientos.
- **Gateway / API Mode**: Dependiendo de si se levanta en Docker o en local (`API_MODE=direct`), el `apiClient` sabe si debe redirigir `/legal/api/v1/...` al gateway centralizado o directamente al puerto `3008`.

---

## 3. Mejores Prácticas y Reglas Críticas (El "Códex")

### 3.1 Control de Errores y Validaciones en UI
1. **Validación de Formularios**: Usar preferiblemente los hooks de validación centralizados (como `useFormValidation`) para controlar errores en tiempo real y evitar envíos nulos al backend. Al instanciar reglas de validación complejas, deben envolverse en un `useMemo` para evitar que las referencias cambien en cada render de React, lo que puede causar pérdida de foco en los inputs.
2. **Modales y Renderizado**: Evitar re-montajes destructivos de componentes en el frontend usando `key` dinámicos inestables.
3. **Caché y Frescura**: Las tablas, KPIs y reportes deben consumir datos frescos. Si hay inconsistencias, se debe evadir el singleton de cache en memoria (`legalService._cache`) o implementar métodos de re-fetch dedicados y limpios.

### 3.2 Backend y TypeORM
1. **Relaciones (Relations)**: Cuando se consultan expedientes judiciales, *siempre* se deben incluir las relaciones críticas (ej. `abogadoAsignado`, `documentos`, `actuaciones`) para evitar errores `500 Internal Server Error` cuando el mapeador espera esos arreglos.
2. **Restricciones de Llaves Foráneas (Foreign Keys)**: 
   Dado que los usuarios provienen de un microservicio diferente (`auth-service`), las columnas que referencian a un usuario (como `abogadoAsignadoId` o `responsableId`) **NO DEBEN** tener una restricción física de Foreing Key en la base de datos que apunte a una tabla local de usuarios inexistente. Debe usarse `createForeignKeyConstraints: false` en la definición `@ManyToOne` o `@JoinColumn` de TypeORM.
3. **Manejo de QueryBuilder**: Para filtros complejos, como agrupar tipos de expedientes que NO sean disciplinarios pero que incluyan Nulos u otros tipos, siempre preferir `.createQueryBuilder()` con sentencias `WHERE` explícitas en lugar del objeto nativo `find()` con operadores `Not()`.

### 3.3 Migraciones SQL (Flyway)
1. El proyecto maneja migraciones de base de datos automatizadas.
2. **NO modificar tablas directamente en producción (DBeaver/PgAdmin)**.
3. Las modificaciones estructurales (agregar columnas, quitar llaves foráneas, cambiar tipos) deben traducirse a archivos `.sql` serializados (ej. `V1.2.3__descripcion.sql`) para que Flyway las aplique durante el pipeline de CI/CD.
4. Si un constraint de llave foránea entra en conflicto (ej. error 500 al insertar), el arreglo definitivo es crear un script SQL que haga `ALTER TABLE tabla DROP CONSTRAINT nombre_fk;` y posteriormente actualizar la Entidad en TypeORM.

### 3.4 Git y Sincronización
- Siempre que se realice un fix crítico en local, asegurar que el diagnóstico identifique la causa raíz y esté validado en el Hot-Reloading de Vite / NestJS antes de darlo por terminado.

---

> *"Al trabajar en Gestión Legal, la precisión procesal es tan importante como la precisión técnica. Un día de error en un término judicial puede costar millones a la ESAP."*

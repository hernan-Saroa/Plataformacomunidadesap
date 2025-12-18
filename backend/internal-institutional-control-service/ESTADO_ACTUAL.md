# 📊 Estado Actual del Proyecto - Control Interno Gestión ESAP

**Proyecto:** Sistema de Control Interno Gestión - ESAP  
**Versión:** 3.0  
**Fecha:** Enero 2025

---

## 🎯 Resumen Ejecutivo

| Aspecto | Estado | Progreso |
|---------|--------|----------|
| **Estructura Backend** | ✅ | 100% |
| **Base de Datos** | ✅ | 100% |
| **Servicios Migrados a BD** | 🟡 | 60% (9/15) |
| **Endpoints REST** | 🟢 | 85% |
| **Compilación TypeScript** | ✅ | Sin errores |
| **Integraciones** | 🔴 | 10% (Power BI, SSO pendientes) |
| **Exportaciones** | 🔴 | 15% (PDFs/Excel reales pendientes) |

**PROGRESO TOTAL: ~60%**

---

## ✅ SERVICIOS MIGRADOS A BASE DE DATOS (9 servicios)

Estos servicios **están conectados a PostgreSQL** y funcionando:

1. ✅ **UniversoAuditoriasService** - `ProcesoAuditable`
2. ✅ **ProgramaAnualService** - `AuditoriaProgramada`
3. ✅ **PlanIndividualService** - `PlanIndividual`
4. ✅ **ListasChequeoService** - `ListaChequeo`, `ListaAplicada`
5. ✅ **HallazgosService** - `Hallazgo`
6. ✅ **InformesService** - `InformeLey`
7. ✅ **NotificacionesService** - `Notificacion`, `PreferenciaNotificacion`
8. ✅ **DocumentosService** - `Documento`
9. ✅ **ConfiguracionService** - `RolDecreto648`, `ActividadRol`, `TipoAuditoria`, `ParametroSistema`, `PlantillaEmail`

---

## ⏳ SERVICIOS CON MOCK DATA (6 servicios)

Estos servicios **aún usan arrays en memoria** y necesitan migración:

1. ⏳ **PlanAnualService** - `private plans = [...]`
2. ⏳ **EtapasAuditoriaService** - `private etapas: any[] = []`
3. ⏳ **PlanesMejoramientoService** - `private planes: any[] = [...]`
4. ⏳ **AprobacionesService** - `private aprobaciones: Array<...>`
5. ⏳ **DashboardService** - Consolida datos de otros servicios
6. ⏳ **RolesPermisosService** - `private roles = [...]`

**Nota:** Estos servicios funcionan pero los datos no persisten entre reinicios.

---

## 🚀 CÓMO INICIAR EL SERVICIO

### Requisitos Previos

1. **PostgreSQL corriendo**
2. **Base de datos creada:** `esap_db`
3. **Schema creado:** `control_interno`
4. **Tablas creadas:** Ejecutar `schema.sql`

### Pasos

#### 1. Configurar PostgreSQL

```sql
-- Crear base de datos
CREATE DATABASE esap_db;

-- Conectar
\c esap_db

-- Crear schema
CREATE SCHEMA IF NOT EXISTS control_interno;
```

#### 2. Ejecutar Schema SQL

```bash
psql -U postgres -d esap_db -f schema.sql
```

#### 3. Configurar Variables de Entorno (Opcional)

Crear archivo `.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=tu_password
DB_NAME=esap_db
DB_SCHEMA=control_interno
NODE_ENV=development
PORT=3007
```

**Si no creas `.env`**, el servicio usa valores por defecto.

#### 4. Ejecutar Seed (Datos de Prueba)

```bash
npm run seed
```

#### 5. Iniciar Servicio

```bash
npm run start:dev
```

**Deberías ver:**
```
🚀 Iniciando servicio...
📦 Creando aplicación NestJS...
🔌 Intentando conectar a PostgreSQL...
✅ Aplicación NestJS creada exitosamente
✅ Internal Institutional Control Service running on port 3007
📡 Endpoints disponibles en: http://localhost:3007/api/v1
```

---

## 📬 ENDPOINTS PRINCIPALES

### Base URL
```
http://localhost:3007/api/v1
```

### Headers Requeridos
```
Content-Type: application/json
Accept: application/json
```

### Endpoints por Servicio

#### 1. Universo de Auditorías
- `GET /universo-auditorias` - Listar universo
- `GET /universo-auditorias/procesos` - Listar procesos
- `POST /universo-auditorias/procesos` - Crear proceso
- `PUT /universo-auditorias/procesos/{id}` - Actualizar
- `DELETE /universo-auditorias/procesos/{id}` - Eliminar
- `GET /universo-auditorias/procesos/{id}/riesgo` - Evaluación de riesgo
- `POST /universo-auditorias/procesos/{id}/riesgo` - Evaluar riesgo
- `GET /universo-auditorias/matriz-riesgo` - Matriz de riesgo
- `GET /universo-auditorias/priorizacion` - Priorización

#### 2. Programa Anual
- `GET /programa-anual` - Listar programas
- `GET /programa-anual/{id}` - Obtener programa
- `POST /programa-anual` - Crear programa
- `POST /programa-anual/{id}/importar-auditorias` - Importar auditorías
- `GET /programa-anual/{id}/auditorias` - Auditorías del programa
- `GET /programa-anual/{id}/cronograma` - Cronograma
- `POST /programa-anual/auditorias/{auditoriaId}/ampliar-plazo` - Ampliar plazo

#### 3. Plan Individual
- `GET /plan-individual/auditoria/{auditoriaId}` - Obtener por auditoría
- `GET /plan-individual/{id}` - Obtener por ID
- `POST /plan-individual` - Crear plan
- `PUT /plan-individual/{id}` - Actualizar
- `POST /plan-individual/{id}/generar-documentos` - Generar documentos
- `POST /plan-individual/{id}/enviar-area-auditada` - Enviar a área

#### 4. Listas de Chequeo
- `GET /listas-chequeo` - Listar listas
- `GET /listas-chequeo/{id}` - Obtener lista
- `POST /listas-chequeo` - Crear lista
- `PUT /listas-chequeo/{id}` - Actualizar
- `DELETE /listas-chequeo/{id}` - Eliminar
- `GET /listas-chequeo/{id}/items` - Items de lista
- `POST /listas-chequeo/{id}/items` - Agregar item
- `POST /listas-chequeo/aplicar` - Aplicar a auditoría
- `GET /listas-chequeo/auditoria/{auditoriaId}` - Listas aplicadas
- `GET /listas-chequeo/auditoria/{auditoriaId}/resultados` - Resultados

#### 5. Hallazgos
- `GET /hallazgos` - Listar hallazgos
- `GET /hallazgos/{id}` - Obtener hallazgo
- `POST /hallazgos` - Crear hallazgo
- `PUT /hallazgos/{id}` - Actualizar
- `DELETE /hallazgos/{id}` - Eliminar

#### 6. Informes
- `GET /informes` - Listar informes
- `GET /informes/ley` - Informes de ley
- `GET /informes/ley/proximos-vencer` - Próximos a vencer
- `GET /informes/{id}` - Obtener informe

#### 7. Notificaciones
- `GET /notificaciones?usuarioId={id}` - Listar notificaciones
- `GET /notificaciones/{id}` - Obtener notificación
- `POST /notificaciones` - Crear notificación
- `PUT /notificaciones/{id}/leida` - Marcar como leída
- `GET /notificaciones/preferencias/{usuarioId}` - Preferencias
- `PUT /notificaciones/preferencias/{usuarioId}` - Actualizar preferencias

#### 8. Documentos
- `GET /documentos` - Listar documentos
- `GET /documentos/{id}` - Obtener documento
- `POST /documentos` - Crear documento
- `PUT /documentos/{id}` - Actualizar
- `DELETE /documentos/{id}` - Eliminar

#### 9. Configuración
- `GET /configuracion/roles` - Roles Decreto 648
- `GET /configuracion/tipos-auditoria` - Tipos de auditoría
- `GET /configuracion/parametros` - Parámetros del sistema
- `PUT /configuracion/parametros/{id}` - Actualizar parámetro

---

## 📦 POSTMAN COLLECTION

**Archivo:** `Postman_Collection.json`

**Importar en Postman:**
1. Abre Postman
2. File → Import
3. Selecciona `Postman_Collection.json`

**Variables de Entorno:**
- `base_url`: `http://localhost:3007`
- `api_prefix`: `/api/v1`

---

## 🔧 SOLUCIÓN DE PROBLEMAS

### Error: ECONNREFUSED en Postman

**Causa:** El servicio no está escuchando en el puerto 3007.

**Solución:**
1. Verifica que PostgreSQL esté corriendo
2. Verifica que la BD `esap_db` exista
3. Verifica que el schema `control_interno` exista
4. Ejecuta el servicio: `npm run start:dev`
5. Debes ver: `✅ Internal Institutional Control Service running on port 3007`

### El servicio se queda en "Found 0 errors"

**Causa:** Está esperando la conexión a PostgreSQL.

**Solución:**
1. Inicia PostgreSQL
2. Crea la base de datos y schema
3. Ejecuta `schema.sql`
4. Reinicia el servicio

### Error de Compilación TypeScript

**Estado:** ✅ **TODOS LOS ERRORES CORREGIDOS**

El proyecto compila sin errores. Si ves errores:
1. Ejecuta `npm run build` para ver errores específicos
2. Verifica que todas las dependencias estén instaladas: `npm install`

---

## 📋 ESTADO POR REQUERIMIENTO FUNCIONAL

### RF001 - Plan Anual de Auditoría
- **Estado:** 🟡 70% - **Usa mock data** ⏳

### RF002 - Universo de Auditorías
- **Estado:** 🟢 85% - **✅ MIGRADO A BD**

### RF003 - Programa Anual de Auditorías
- **Estado:** 🟢 85% - **✅ MIGRADO A BD**

### RF004 - Plan Individual de Auditoría
- **Estado:** 🟢 80% - **✅ MIGRADO A BD**

### RF005 - Etapas de Auditoría
- **Estado:** 🟡 75% - **Usa mock data** ⏳

### RF006 - Gestión de Hallazgos
- **Estado:** 🟢 85% - **✅ MIGRADO A BD**

### RF007 - Listas de Chequeo
- **Estado:** 🟢 80% - **✅ MIGRADO A BD**

### RF008 - Gestión de Hallazgos
- **Estado:** 🟢 85% - **✅ MIGRADO A BD**

### RF009 - Etapa de Comunicación
- **Estado:** 🟡 75% - Parcialmente implementado

### RF010 - Planes de Mejoramiento
- **Estado:** 🟡 85% - **Usa mock data** ⏳

### RF011 - Seguimiento Planes
- **Estado:** 🟡 70% - Parcialmente implementado

### RF012 - Informes de Ley
- **Estado:** 🟢 80% - **✅ MIGRADO A BD**

### RF013 - Gestión Documental
- **Estado:** 🟢 75% - **✅ MIGRADO A BD** (falta integración servidor G:)

### RF014 - Sistema de Notificaciones
- **Estado:** 🟢 80% - **✅ MIGRADO A BD** (falta automatización)

### RF015 - Roles y Permisos
- **Estado:** 🟡 60% - **Usa mock data** ⏳ (falta SSO)

### RF016 - Dashboard
- **Estado:** 🟡 70% - Consolida datos (algunos servicios usan mock)

### RF017 - Integración Power BI
- **Estado:** 🔴 0% - No implementado

### RF018 - Exportaciones
- **Estado:** 🔴 15% - Endpoints existen pero devuelven mock

### RF019 - Auditorías Especiales
- **Estado:** 🟢 80% - Implementado en ProgramaAnualService

### RF020 - Configuración
- **Estado:** 🟢 90% - **✅ MIGRADO A BD**

---

## 🗄️ BASE DE DATOS

### Schema: `control_interno`

### Tablas Principales:
- `proceso_auditable` - Procesos del universo
- `auditoria_programada` - Auditorías programadas
- `plan_individual` - Planes individuales
- `lista_chequeo` - Listas de chequeo
- `lista_aplicada` - Aplicaciones de listas
- `hallazgo` - Hallazgos identificados
- `informe_ley` - Informes de ley
- `notificacion` - Notificaciones
- `preferencia_notificacion` - Preferencias de usuarios
- `documento` - Documentos gestionados
- `rol_decreto_648` - Roles según Decreto 648
- `actividad_rol` - Actividades por rol
- `tipo_auditoria` - Tipos de auditoría
- `parametro_sistema` - Parámetros del sistema
- `plantilla_email` - Plantillas de email

**Schema SQL:** `schema.sql`

---

## 🎯 PRÓXIMOS PASOS

### Prioridad Alta
1. ⏳ Migrar **EtapasAuditoriaService** a TypeORM
2. ⏳ Migrar **PlanesMejoramientoService** a TypeORM
3. ⏳ Migrar **PlanAnualService** a TypeORM

### Prioridad Media
4. ⏳ Migrar **AprobacionesService** a TypeORM
5. ⏳ Migrar **RolesPermisosService** a TypeORM
6. ⏳ Implementar generación real de PDFs/Excel

### Prioridad Baja
7. 🔴 Implementar RF017 - Integración Power BI
8. 🔴 Implementar RF015 - SSO con Active Directory
9. 🔴 Implementar automatizaciones (cron jobs)

---

## 📝 NOTAS IMPORTANTES

1. **Servicios Migrados:** Funcionan con PostgreSQL, datos persisten
2. **Servicios con Mock:** Funcionan pero datos se pierden al reiniciar
3. **Compilación:** ✅ Sin errores TypeScript
4. **Build:** ✅ Exitoso
5. **Endpoints:** Mayoría implementados y funcionando

---

## 🚨 PROBLEMAS CONOCIDOS

1. **Servicio no inicia:** Verifica PostgreSQL y BD configurada
2. **ECONNREFUSED en Postman:** Servicio no está escuchando (ver arriba)
3. **Datos no persisten:** Algunos servicios aún usan mock data

---

## 📞 COMANDOS ÚTILES

```bash
# Iniciar servicio
npm run start:dev

# Compilar
npm run build

# Ejecutar seed (datos de prueba)
npm run seed

# Verificar errores
npm run build
```

---

**Última actualización:** Enero 2025  
**Servicios Migrados:** 9/15 (60%)  
**Estado General:** ✅ Funcional para desarrollo
















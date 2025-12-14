# 🏛️ Módulo de Arquitectura Empresarial MRAE - MinTIC

**Implementación Completa del Marco de Referencia de Arquitectura Empresarial para ESAP**

---

## 📋 Tabla de Contenidos

1. [Introducción](#introducción)
2. [Marco Normativo](#marco-normativo)
3. [Componentes del Módulo](#componentes-del-módulo)
4. [Dominios MRAE](#dominios-mrae)
5. [Seguimiento MinTIC](#seguimiento-mintic)
6. [Gestión de Artefactos](#gestión-de-artefactos)
7. [Integración con Roles](#integración-con-roles)
8. [Reportería y Exportación](#reportería-y-exportación)
9. [Casos de Uso](#casos-de-uso)

---

## 🎯 Introducción

El Módulo de Arquitectura Empresarial implementa el **Marco de Referencia de Arquitectura Empresarial (MRAE)** establecido por el **Ministerio de Tecnologías de la Información y las Comunicaciones (MinTIC)** de Colombia.

### Objetivos del Módulo

✅ **Cumplimiento Normativo**: Garantizar el cumplimiento de los requisitos MinTIC  
✅ **Gestión Integral**: Administrar los 5 dominios de arquitectura empresarial  
✅ **Seguimiento Territorial**: Monitorear madurez en Nacional y 16 Territoriales  
✅ **Trazabilidad**: Gestionar artefactos y evidencias de cumplimiento  
✅ **Reportería**: Generar informes ejecutivos y técnicos

---

## 📜 Marco Normativo

### Legislación Aplicable

| Norma | Descripción |
|-------|-------------|
| **Decreto 1078 de 2015** | Reglamenta el sector TIC |
| **Resolución 2375 de 2019** | Establece el MRAE para entidades públicas |
| **Guía MRAE v2.0** | Marco de referencia actualizado MinTIC |
| **Circular 002 de 2021** | Instrucciones de implementación AE |

### Requisitos Obligatorios MinTIC

```
✅ Plan Estratégico de TI (PETI) - Actualización anual
✅ Modelo de Gobierno de TI
✅ Catálogo de Datos Institucional
✅ Inventario de Aplicaciones
✅ Catálogo de Servicios TI
✅ Matriz de Madurez de AE
✅ Plan de Capacitación Digital
✅ Política de Calidad de Datos
```

---

## 🧩 Componentes del Módulo

### Estructura de Archivos

```
/components/arquitectura-empresarial/
├── ArquitecturaEmpresarialModule.tsx    # Módulo principal
├── SeguimientoMinTIC.tsx                # Seguimiento cumplimiento MinTIC
├── GestionArtefactosMRAE.tsx            # Gestión de artefactos
├── DashboardAE.tsx                      # Dashboard operativo
├── DashboardEjecutivoAE.tsx             # Dashboard ejecutivo
├── GestionProyectosAE.tsx               # Gestión de proyectos AE
├── ProyectosAE.tsx                      # Vista de proyectos
├── MatrizMadurez.tsx                    # Evaluación de madurez
├── MatrizMadurezCompleta.tsx            # Matriz detallada
├── GestionArtefactos.tsx                # Gestión general
├── ArtefactosMRAE.tsx                   # Catálogo de artefactos
├── SeguimientoTerritorialAE.tsx         # Seguimiento territorial
├── FormularioNuevoProyecto.tsx          # Formulario proyectos
└── dominios/
    ├── DominioEstrategiaTI.tsx          # Dominio 1
    ├── DominioInformacion.tsx           # Dominio 2
    ├── DominioSistemasInformacion.tsx   # Dominio 3
    ├── DominioServiciosTecnologicos.tsx # Dominio 4
    └── DominioUsoApropiacion.tsx        # Dominio 5
```

### Componentes Principales

#### 1. **ArquitecturaEmpresarialModule**
Módulo principal que integra todos los componentes.

**Características:**
- ✅ Navegación por dominios MRAE
- ✅ Dashboard ejecutivo
- ✅ Gestión de proyectos
- ✅ Seguimiento territorial
- ✅ Seguimiento MinTIC
- ✅ Gestión de artefactos

#### 2. **SeguimientoMinTIC**
Componente dedicado al seguimiento de cumplimiento MinTIC.

**Funcionalidades:**
- 📊 Resumen ejecutivo de cumplimiento
- ✅ Validación de requisitos obligatorios
- 📁 Gestión de entregables
- 📅 Cronograma de entregables
- 🎯 Indicadores de progreso
- ⚠️ Alertas de vencimientos

**Vistas Disponibles:**
- **Resumen Ejecutivo**: KPIs y cumplimiento global
- **Requisitos MinTIC**: Detalle de 8 requisitos obligatorios
- **Entregables**: Gestión de documentos requeridos
- **Cronograma**: Timeline de entregas 2025

#### 3. **GestionArtefactosMRAE**
Sistema completo de gestión documental de artefactos MRAE.

**Tipos de Artefactos:**
- 📄 **Documentos**: PETI, políticas, procedimientos
- 🔷 **Modelos**: Gobierno TI, datos, procesos
- 📊 **Matrices**: Madurez, alineación estratégica
- 🗺️ **Diagramas**: Arquitectura, procesos, flujos
- 📁 **Catálogos**: Datos, servicios, aplicaciones
- 📋 **Inventarios**: Aplicaciones, infraestructura
- 📜 **Políticas**: Gestión, seguridad, calidad
- 📝 **Procedimientos**: Operativos, cambios, incidentes

**Funcionalidades:**
- 🔍 Búsqueda avanzada
- 🏷️ Filtrado por tipo, dominio, estado
- ⬆️ Carga de archivos
- ⬇️ Descarga de documentos
- ✅ Control de versiones
- 📊 Dashboard de estadísticas
- 🔐 Control de aprobaciones

---

## 🎯 Dominios MRAE

### 1. Estrategia TI

**Objetivo**: Alineación estratégica con objetivos institucionales

**Artefactos Clave:**
- Plan Estratégico de TI (PETI)
- Modelo de Gobierno de TI
- Matriz de Alineación Estratégica
- Comité de TI

**Indicadores:**
- Nivel de madurez: 3.5/5.0
- Artefactos documentados: 12/15
- Cumplimiento: 75%

### 2. Información

**Objetivo**: Gestión y gobierno de datos e información

**Artefactos Clave:**
- Catálogo de Datos
- Modelo de Datos Institucional
- Política de Calidad de Datos
- Diccionario de Datos
- Gobierno de Datos

**Indicadores:**
- Nivel de madurez: 3.2/5.0
- Artefactos documentados: 15/20
- Cumplimiento: 68%

### 3. Sistemas de Información

**Objetivo**: Aplicaciones y soluciones tecnológicas

**Artefactos Clave:**
- Inventario de Aplicaciones
- Mapa de Aplicaciones
- Matriz de Dependencias
- Procedimiento Gestión de Cambios
- Roadmap de Aplicaciones

**Indicadores:**
- Nivel de madurez: 4.0/5.0
- Artefactos documentados: 18/22
- Cumplimiento: 82%

### 4. Servicios Tecnológicos

**Objetivo**: Infraestructura y servicios de soporte

**Artefactos Clave:**
- Catálogo de Servicios TI
- Acuerdos de Nivel de Servicio (SLA)
- Mapa de Infraestructura
- Plan de Continuidad
- Procedimientos ITIL

**Indicadores:**
- Nivel de madurez: 3.4/5.0
- Artefactos documentados: 14/18
- Cumplimiento: 71%

### 5. Uso y Apropiación

**Objetivo**: Capacitación y adopción tecnológica

**Artefactos Clave:**
- Plan de Capacitación Digital
- Matriz de Competencias
- Programa de Transformación Digital
- Indicadores de Adopción

**Indicadores:**
- Nivel de madurez: 2.8/5.0
- Artefactos documentados: 10/15
- Cumplimiento: 65%

---

## 📊 Seguimiento MinTIC

### Dashboard de Cumplimiento

```
┌─────────────────────────────────────────┐
│  CUMPLIMIENTO GLOBAL MRAE: 72%         │
├─────────────────────────────────────────┤
│  ✅ Requisitos Cumplidos:     3/8      │
│  🔄 Requisitos Parciales:     4/8      │
│  ❌ Requisitos No Cumple:     1/8      │
├─────────────────────────────────────────┤
│  📁 Entregables Completos:    3/8      │
│  ⏳ Entregables en Progreso:  4/8      │
│  ⚠️  Próximos a vencer:        2        │
└─────────────────────────────────────────┘
```

### Requisitos MinTIC Implementados

| ID | Requisito | Estado | Progreso |
|----|-----------|--------|----------|
| REQ-001 | PETI actualizado anualmente | ✅ Cumple | 100% |
| REQ-002 | Modelo de Gobierno de TI definido | 🔄 Parcial | 75% |
| REQ-003 | Catálogo de Datos completo | 🔄 Parcial | 68% |
| REQ-004 | Política de Calidad de Datos | ❌ No Cumple | 0% |
| REQ-005 | Inventario de Aplicaciones | ✅ Cumple | 100% |
| REQ-006 | Catálogo de Servicios TI | 🔄 Parcial | 82% |
| REQ-007 | Plan de Capacitación Digital | 🔄 Parcial | 55% |
| REQ-008 | Evaluación de Madurez AE | ❌ No Cumple | 15% |

### Entregables 2025

#### Primer Semestre (Enero - Junio)
- ✅ **PETI 2025-2029** - Entregado 28/03/2025
- 🔄 **Modelo de Gobierno TI v2.1** - En revisión (75%)
- ✅ **Inventario de Aplicaciones 2025** - Entregado 28/04/2025

#### Segundo Semestre (Julio - Diciembre)
- 🔄 **Catálogo de Datos v2.0** - En progreso (68%)
- 🔄 **Mapa de Servicios TI** - En progreso (82%)
- 🔄 **Plan de Capacitación 2025** - En progreso (55%)
- ⏳ **Modelo de Datos** - Pendiente (45%)
- ⏳ **Matriz de Madurez Territorial** - Pendiente (15%)

---

## 📁 Gestión de Artefactos

### Ciclo de Vida de Artefactos

```
Borrador → Revisión → Aprobado → Publicado → (Obsoleto)
```

### Estados de Artefactos

| Estado | Descripción | Color |
|--------|-------------|-------|
| **Borrador** | En elaboración | Gris |
| **Revisión** | En proceso de revisión | Amarillo |
| **Aprobado** | Aprobado por autoridad competente | Azul |
| **Publicado** | Publicado y en uso | Verde |
| **Obsoleto** | Archivado/reemplazado | Rojo |

### Catálogo de Artefactos Actual

**Total**: 69 artefactos documentados

**Por Estado:**
- 📗 Publicados: 23 (33%)
- 📘 Aprobados: 18 (26%)
- 📙 En Revisión: 15 (22%)
- 📄 Borradores: 13 (19%)

**Por Dominio:**
- Estrategia TI: 12 artefactos
- Información: 15 artefactos
- Sistemas de Información: 18 artefactos
- Servicios Tecnológicos: 14 artefactos
- Uso y Apropiación: 10 artefactos

### Flujo de Aprobación

```
1. Creación → Autor crea artefacto
2. Revisión → Responsable de dominio revisa
3. Aprobación → Comité de AE aprueba
4. Publicación → Se publica en repositorio oficial
5. Control de Cambios → Versionamiento y trazabilidad
```

---

## 👥 Integración con Roles

### Permisos por Rol

#### 1. **Rector Nacional / Vicerrector**
**Acceso**: Dashboard Ejecutivo (solo lectura)
- ✅ Ver indicadores de madurez
- ✅ Ver cumplimiento MinTIC
- ✅ Ver proyectos estratégicos
- ❌ No puede editar

#### 2. **Jefe de TI / Arquitecto Empresarial**
**Acceso**: Completo (lectura y escritura)
- ✅ Gestionar todos los dominios
- ✅ Crear/editar artefactos
- ✅ Aprobar documentos
- ✅ Gestionar proyectos AE
- ✅ Evaluar madurez

#### 3. **Coordinador TI Territorial**
**Acceso**: Su territorial (lectura y escritura)
- ✅ Ver datos de su territorial
- ✅ Actualizar artefactos locales
- ✅ Reportar avances
- ⚠️ No puede ver otras territoriales

#### 4. **Usuario Consulta AE**
**Acceso**: Repositorio (solo lectura)
- ✅ Consultar artefactos publicados
- ✅ Descargar documentos
- ❌ No puede editar
- ❌ No puede crear

### Usuario Especializado: `ar.empresarial@esap.edu.co`

**Características:**
- 🎯 Acceso directo al módulo de Arquitectura Empresarial
- 🔐 Permisos de administración completa
- 📊 Dashboard ejecutivo como vista principal
- ✅ Puede gestionar todos los dominios
- 📁 Administrador de artefactos MRAE

---

## 📈 Reportería y Exportación

### Reportes Disponibles

#### 1. **Reporte Ejecutivo de Cumplimiento MinTIC**
**Contenido:**
- Resumen de cumplimiento global
- Estado de requisitos obligatorios
- Entregables completados vs pendientes
- Cronograma de próximas entregas
- Alertas y recomendaciones

**Formato**: PDF ejecutivo (2-3 páginas)

#### 2. **Informe Detallado por Dominio**
**Contenido:**
- Análisis de madurez por dominio
- Artefactos documentados
- Gaps identificados
- Plan de acción

**Formato**: PDF técnico (10-15 páginas)

#### 3. **Matriz de Madurez Completa**
**Contenido:**
- Evaluación de 5 dominios
- Niveles de madurez (1-5)
- Comparativa Nacional vs Territoriales
- Recomendaciones de mejora

**Formato**: Excel con gráficos

#### 4. **Catálogo de Artefactos**
**Contenido:**
- Listado completo de artefactos
- Metadatos (autor, fecha, versión)
- Estado de aprobación
- Enlaces de descarga

**Formato**: Excel / PDF

### Exportación de Datos

**Formatos Soportados:**
- 📄 PDF
- 📊 Excel (.xlsx)
- 📋 Word (.docx)
- 📈 CSV

---

## 💼 Casos de Uso

### Caso de Uso 1: Evaluación Anual de Madurez

**Actor**: Arquitecto Empresarial  
**Objetivo**: Evaluar nivel de madurez de AE en ESAP

**Flujo:**
1. Accede a "Matriz de Madurez"
2. Selecciona evaluación nacional o territorial
3. Completa cuestionario de madurez (5 dominios)
4. Sistema calcula nivel automáticamente
5. Genera informe de madurez con gaps
6. Exporta reporte en PDF
7. Envía a Rector y MinTIC

### Caso de Uso 2: Preparación de Entregable MinTIC

**Actor**: Jefe de TI  
**Objetivo**: Preparar PETI para entrega a MinTIC

**Flujo:**
1. Accede a "Gestión de Artefactos MRAE"
2. Busca "PETI-2025"
3. Descarga plantilla oficial MinTIC
4. Completa documento con datos actuales
5. Sube nueva versión al sistema
6. Solicita revisión de Arquitecto
7. Arquitecto aprueba documento
8. Sistema genera código QR de trazabilidad
9. Exporta versión final en PDF firmado
10. Registra entrega en "Seguimiento MinTIC"

### Caso de Uso 3: Seguimiento Territorial

**Actor**: Coordinador TI Territorial Bogotá  
**Objetivo**: Reportar avance de implementación AE

**Flujo:**
1. Accede a "Seguimiento Territorial"
2. Selecciona "Territorial Bogotá"
3. Actualiza progreso de artefactos locales
4. Carga evidencias de cumplimiento
5. Completa matriz de madurez territorial
6. Sistema compara con nivel nacional
7. Genera reporte de brecha
8. Envía reporte a nivel nacional

### Caso de Uso 4: Consulta de Artefactos

**Actor**: Docente / Administrativo  
**Objetivo**: Consultar catálogo de servicios TI

**Flujo:**
1. Accede a "Gestión de Artefactos MRAE"
2. Filtra por dominio "Servicios Tecnológicos"
3. Busca "Catálogo de Servicios TI"
4. Visualiza documento publicado
5. Descarga PDF del catálogo
6. Consulta SLAs y contactos

---

## 🎨 Interfaz de Usuario

### Diseño y UX

**Paleta de Colores por Dominio:**
- 🔵 **Estrategia TI**: Azul (#003DA5)
- 🟣 **Información**: Púrpura (#7C3AED)
- 🟢 **Sistemas**: Verde (#10B981)
- 🟠 **Servicios**: Naranja (#F59E0B)
- 🔴 **Uso y Apropiación**: Rosa (#EC4899)

**Componentes UI:**
- ✅ Cards con gradientes
- ✅ Badges de estado
- ✅ Progress bars
- ✅ Modales responsive
- ✅ Tooltips informativos
- ✅ Iconografía Lucide React
- ✅ Animaciones Motion

### Navegación

```
Arquitectura Empresarial
├── Dashboard Ejecutivo
├── Dominios MRAE
│   ├── Estrategia TI
│   ├── Información
│   ├── Sistemas de Información
│   ├── Servicios Tecnológicos
│   └── Uso y Apropiación
├── Gestión
│   ├── Proyectos AE
│   ├── Matriz de Madurez
│   └── Artefactos
├── Seguimiento
│   ├── Seguimiento MinTIC
│   ├── Seguimiento Territorial
│   └── Gestión de Artefactos MRAE
└── Reportes
    └── Exportar informes
```

---

## 📊 Métricas y KPIs

### Indicadores Clave

| KPI | Valor Actual | Meta 2025 | Estado |
|-----|--------------|-----------|--------|
| **Nivel de Madurez Global** | 3.2/5.0 | 3.5/5.0 | 🟡 |
| **Artefactos Documentados** | 69/85 | 85/85 | 🟡 |
| **Cumplimiento MinTIC** | 72% | 90% | 🟡 |
| **Requisitos Obligatorios** | 3/8 | 8/8 | 🔴 |
| **Proyectos AE Activos** | 8 | 10 | 🟢 |
| **Territoriales con Madurez ≥ 3** | 6/16 | 16/16 | 🔴 |

### Dashboard de Indicadores

```
┌────────────────────────────────────────────────────┐
│  ARQUITECTURA EMPRESARIAL ESAP - KPIs 2025        │
├────────────────────────────────────────────────────┤
│                                                    │
│  Nivel de Madurez Global                          │
│  ████████████████░░░░  3.2 / 5.0     [64%]       │
│                                                    │
│  Artefactos Documentados                          │
│  ████████████████░░░░  69 / 85       [81%]       │
│                                                    │
│  Cumplimiento MinTIC                              │
│  ██████████████░░░░░░  72%           [72%]       │
│                                                    │
│  Proyectos Activos                                │
│  ████████████████░░░░  8 / 10        [80%]       │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## 🔄 Integración con Otros Módulos

### 1. Estructura Organizacional
- ✅ Visualización de unidades Nacional y Territoriales
- ✅ Asignación de responsables por dominio
- ✅ Seguimiento territorial automático

### 2. Portal Transaccional
- ✅ Consulta de servicios TI desde el portal
- ✅ Solicitud de soporte técnico
- ✅ Acceso a catálogos publicados

### 3. Gestión Profesoral
- ✅ Plan de capacitación digital para docentes
- ✅ Competencias digitales en evaluación
- ✅ Uso de sistemas académicos

### 4. Reportes v2
- ✅ Integración de indicadores AE en reportes institucionales
- ✅ Exportación de datos para BI
- ✅ Dashboards ejecutivos

---

## 🚀 Próximas Mejoras

### Fase 1 (Q1 2026)
- [ ] Integración con repositorio documental externo
- [ ] Firma digital de artefactos
- [ ] Workflow de aprobaciones automatizado
- [ ] Notificaciones de vencimientos

### Fase 2 (Q2 2026)
- [ ] API REST para integraciones externas
- [ ] Dashboard de BI con Power BI / Tableau
- [ ] Sistema de versionamiento Git
- [ ] Auditoría completa de cambios

### Fase 3 (Q3 2026)
- [ ] IA para recomendaciones de mejora
- [ ] Análisis predictivo de cumplimiento
- [ ] Chatbot de consulta de artefactos
- [ ] Portal público de transparencia AE

---

## 📞 Soporte y Contacto

**Responsable**: Arquitecto Empresarial ESAP  
**Email**: ar.empresarial@esap.edu.co  
**Extensión**: TI-AE-001

**Comité de Arquitectura Empresarial**:
- Jefe de TI Nacional (Coordinador)
- Arquitecto de Datos
- Arquitecto de Aplicaciones
- Coordinadores TI Territoriales

---

## 📚 Referencias

1. **MinTIC**. (2019). *Guía Marco de Referencia de Arquitectura Empresarial v2.0*
2. **MinTIC**. (2021). *Circular 002 - Implementación MRAE*
3. **TOGAF 9.2**. *The Open Group Architecture Framework*
4. **Decreto 1078/2015**. Ministerio TIC Colombia
5. **Resolución 2375/2019**. MinTIC - MRAE

---

**Última actualización**: 5 de Diciembre de 2025  
**Versión del documento**: 1.0  
**Estado**: ✅ Implementado

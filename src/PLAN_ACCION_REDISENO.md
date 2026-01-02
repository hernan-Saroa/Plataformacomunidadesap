# 🎯 Plan de Acción Institucional - REDISEÑO COMPLETO

## 📋 Resumen Ejecutivo

Se ha rediseñado completamente el módulo de **Plan de Acción Institucional** eliminando el diseño Kanban inadecuado y reemplazándolo con **4 vistas profesionales** tipo SAP Fiori / Microsoft Planner.

---

## ❌ PROBLEMA IDENTIFICADO

### Diseño Anterior: Kanban
- **Columnas**: Ejes Estratégicos (Gestión Institucional, Talento Humano, Transparencia, Tecnología)
- **Problema**: Los indicadores NO se "mueven" entre ejes estratégicos
- **Sin sentido**: No hay flujo de trabajo que justifique drag & drop
- **Conclusión**: Kanban es inapropiado para seguimiento de indicadores PEI

---

## ✅ SOLUCIÓN IMPLEMENTADA

### Nueva Arquitectura: 4 Vistas Profesionales

#### 1️⃣ **DASHBOARD** (Vista Ejecutiva)
**Propósito**: Visualización rápida de KPIs y alertas

**Componentes**:
- 📊 4 Cards por Eje Estratégico con % de cumplimiento
- ⚠️ Panel de "Indicadores que Requieren Atención"
- 📈 Progreso visual por cada eje con colores corporativos
- 🎯 Indicadores críticos (En Riesgo / Vencidos)

**Ideal para**: Jefes de Oficina, toma de decisiones rápida

---

#### 2️⃣ **LISTA** (Vista por Defecto) ⭐
**Propósito**: Gestión detallada agrupada por eje estratégico

**Componentes**:
- 📁 **Agrupación expandible** por Eje Estratégico (4 grupos)
- 📊 **Tabla completa** con columnas:
  - Código (GI-001, TH-001, TR-001, TEC-001)
  - Indicador + Descripción
  - Responsable (con avatar)
  - Meta vs Actual (con unidad de medida)
  - % Cumplimiento (barra de progreso + semáforo)
  - Estado (En Tiempo, En Riesgo, Vencido, Completado)
  - Fecha Límite
  - **Menú de acciones (⋮)**: Ver Detalles, Actualizar Avance, Editar, Descargar, Eliminar

**Características**:
- ✅ Expandir/Colapsar grupos
- ✅ Barra de progreso del eje en el header
- ✅ Semáforo automático (Verde ≥90%, Amarillo 50-89%, Rojo <50%)
- ✅ Avatares con iniciales del responsable

**Ideal para**: Trabajo diario, actualización de indicadores

---

#### 3️⃣ **TIMELINE** (Línea de Tiempo)
**Propósito**: Visualización cronológica de vencimientos

**Componentes**:
- 📅 Línea de tiempo vertical ordenada por fecha límite
- 🔵 Marcadores visuales con colores por eje estratégico
- ⏰ Días restantes o vencidos
- 📊 Barra de progreso en cada indicador
- 🎯 Estado visual (En Tiempo, En Riesgo, Vencido)

**Características**:
- Orden cronológico automático
- Alertas visuales de vencimientos próximos
- Color coding por eje estratégico

**Ideal para**: Planeación de actualizaciones, identificar urgencias

---

#### 4️⃣ **MATRIZ** (Cuadro de Mando Integral)
**Propósito**: Vista ejecutiva tipo Balanced Scorecard

**Componentes**:
- 📊 **Tabla de doble entrada**:
  - Filas: 4 Ejes Estratégicos
  - Columnas: Estados (En Tiempo, En Riesgo, Vencido)
- 🔢 Totales por fila y columna
- 🏷️ Chips con códigos de indicadores en cada celda
- 📈 Visualización rápida de distribución

**Características**:
- Vista gerencial 360°
- Identificación rápida de ejes problemáticos
- Totalizadores automáticos

**Ideal para**: Reportes ejecutivos, auditorías, rendición de cuentas

---

## 🎨 DISEÑO Y USABILIDAD

### Colores Corporativos ESAP 2025
- 🏛️ **Gestión Institucional**: Azul #2962FF
- 👥 **Talento Humano**: Naranja #F57C00
- 🔍 **Transparencia**: Verde #00C853
- 💻 **Tecnología**: Morado #9C27B0

### Sistema de Semáforos
- 🟢 **Verde** (≥90%): Meta cumplida o en vía de cumplimiento
- 🟡 **Amarillo** (50-89%): Cumplimiento parcial - requiere atención
- 🔴 **Rojo** (<50%): Cumplimiento bajo - acción correctiva urgente

### Estados de Indicadores
- ✅ **En Tiempo**: Avance según cronograma
- ⚠️ **En Riesgo**: Retraso moderado
- 🔴 **Vencido**: Plazo vencido
- 🎉 **Completado**: Meta alcanzada

---

## 🔍 FILTROS Y BÚSQUEDA

### Búsqueda Inteligente
- Por código de indicador
- Por nombre/descripción
- Por responsable

### Filtros Avanzados
- **Por Eje Estratégico**: Gestión, Talento, Transparencia, Tecnología
- **Por Estado**: En Tiempo, En Riesgo, Vencido, Completado
- **Contador de resultados** en tiempo real
- **Botón de limpiar filtros**

---

## 📊 MÉTRICAS PRINCIPALES (Header)

1. **Total Indicadores**: 8 indicadores activos
2. **Cumplimiento Promedio**: 73% (con tendencia)
3. **En Riesgo / Vencidos**: 5 indicadores críticos

---

## ⚙️ FUNCIONALIDADES DEL MENÚ (⋮)

Cada indicador tiene acceso a:
1. 👁️ **Ver Detalles**: Modal con información completa
2. 📈 **Actualizar Avance**: Registrar nuevo valor actual
3. ✏️ **Editar**: Modificar meta, responsable, fechas
4. 📥 **Descargar Reporte**: Exportar ficha del indicador
5. 🗑️ **Eliminar**: Eliminar indicador (con confirmación)

---

## 🎯 DATOS MOCK INCLUIDOS

8 Indicadores de ejemplo distribuidos:
- **Gestión Institucional**: 2 indicadores
  - GI-001: Reducción términos vencidos (94%)
  - GI-002: Digitalización expedientes (69%)
  
- **Talento Humano**: 2 indicadores
  - TH-001: Capacitación normativa (45%)
  - TH-002: Certificación profesional (35%) - VENCIDO
  
- **Transparencia**: 2 indicadores
  - TR-001: Publicación decisiones (92%)
  - TR-002: Derechos de petición (93%)
  
- **Tecnología**: 2 indicadores
  - TEC-001: Alertas automáticas (78%)
  - TEC-002: Firma electrónica (61%)

---

## 🚀 VENTAJAS DEL NUEVO DISEÑO

### ✅ Usabilidad
- Vista de lista agrupada es intuitiva y familiar
- Navegación clara entre 4 vistas según necesidad
- Filtros potentes para análisis específicos

### ✅ Funcionalidad
- Seguimiento real de cumplimiento de metas
- Identificación rápida de indicadores en riesgo
- Sistema de semáforos automático

### ✅ Profesionalismo
- Diseño tipo SAP Fiori / Microsoft Planner
- Alineado con estándares de gestión pública
- Coherente con diseño ESAP 2025

### ✅ Reportabilidad
- Vista Matriz ideal para reportes ejecutivos
- Dashboard para presentaciones rápidas
- Timeline para planeación de actualizaciones

---

## 📱 RESPONSIVE

- ✅ Móvil: Cards compactas con información esencial
- ✅ Tablet: Tabla con scroll horizontal
- ✅ Desktop: Tabla completa con todas las columnas

---

## 🎓 TOOLTIP INFORMATIVO

Incluye guía contextual con:
- 🎯 Propósito del módulo
- 📊 Explicación de las 4 vistas
- 🗂️ Ejes Estratégicos del PEI
- 🚦 Sistema de semáforos

---

## 📝 CONCLUSIÓN

El módulo de **Plan de Acción Institucional** ahora es:
- ✅ **Funcional**: Apropiado para seguimiento de indicadores PEI
- ✅ **Profesional**: Diseño tipo SAP Fiori/Microsoft Planner
- ✅ **Completo**: 4 vistas para diferentes necesidades
- ✅ **Usable**: Filtros, búsqueda, agrupación, menú de acciones
- ✅ **Corporativo**: Alineado con estándar ESAP 2025

**Archivo actualizado**: `/components/esap/gestion-legal/modulos/PlanAccionV4.tsx`
**Integración**: `/components/esap/gestion-legal/core/GestionLegalFull.tsx`

# Guía del Usuario - Sistema de Calendario Académico

## Introducción

El **Sistema de Calendario Académico V2** es una herramienta completa e intuitiva para gestionar periodos académicos, eventos y planificación en la ESAP. Esta guía explica paso a paso cómo utilizar todas las funcionalidades.

---

## 📅 Conceptos Básicos

### ¿Qué es un Periodo Académico?

Un **periodo** es un intervalo de tiempo específico en el calendario académico que puede ser:

- **Académico**: Semestres regulares (2025-I, 2025-II)
- **Vacaciones**: Recesos estudiantiles
- **Intersemestral**: Cursos cortos entre semestres

Cada periodo tiene:
- Nombre único
- Fechas de inicio y fin
- Estado (Planificado, Activo, Finalizado)
- Duración calculada en semanas
- Lista de eventos asociados

### ¿Qué es un Evento?

Un **evento** es una fecha importante dentro de un periodo que marca actividades clave:

- 📝 **Inscripciones**: Apertura de matrículas
- 📚 **Clases**: Inicio/fin de clases
- 📊 **Evaluaciones**: Fechas de exámenes
- 📄 **PTAs**: Entrega de Planes de Trabajo Académico
- 👥 **Convocatorias**: Apertura de convocatorias docentes
- 🏢 **Administrativo**: Eventos administrativos
- 📌 **Otro**: Eventos varios

Cada evento tiene:
- Título y descripción
- Fecha específica
- Tipo de evento
- Prioridad (🔴 Alta, 🟡 Media, 🟢 Baja)
- Estado (Pendiente, En Curso, Completado)

---

## 🚀 Guía Paso a Paso

### 1. Crear un Nuevo Periodo Académico

#### Paso 1: Hacer clic en "Nuevo Periodo"
- Ubicado en la esquina superior derecha del calendario
- Botón azul con icono ➕

#### Paso 2: Llenar el formulario
1. **Nombre del Periodo** *
   - Ejemplo: `2025-II`, `Intersemestre 2025`
   - Campo obligatorio

2. **Tipo de Periodo** *
   - Seleccionar: Académico, Vacaciones, o Intersemestral
   - Por defecto: Académico

3. **Fecha de Inicio** *
   - Usar el selector de calendario
   - Campo obligatorio

4. **Fecha de Fin** *
   - Usar el selector de calendario
   - Debe ser posterior a la fecha de inicio
   - Campo obligatorio

#### Paso 3: Validación automática
El sistema automáticamente:
- ✅ Calcula la duración en semanas
- ✅ Valida que no haya solapamiento con otros periodos
- ✅ Muestra errores si hay conflictos

#### Paso 4: Guardar
- Hacer clic en "Crear Periodo"
- El periodo aparecerá en la lista ordenado cronológicamente

### 2. Agregar Eventos a un Periodo

#### Opción A: Desde la vista expandida
1. Hacer clic en el icono ▼ junto al nombre del periodo
2. Hacer clic en "Agregar Evento" (botón azul)

#### Opción B: Desde la vista grid
1. Hacer clic en "Agregar Evento" dentro de la tarjeta del periodo

#### Llenar el formulario de evento:

1. **Título del Evento** *
   - Ejemplo: `Inicio de Clases`, `Entrega PTAs`
   - Campo obligatorio

2. **Descripción**
   - Información adicional del evento
   - Campo opcional

3. **Fecha** *
   - Debe estar dentro del rango del periodo
   - El sistema valida automáticamente

4. **Tipo**
   - Seleccionar de la lista: Inscripciones, Clases, Evaluaciones, PTAs, Convocatorias, Administrativo, Otro

5. **Prioridad**
   - 🔴 Alta: Eventos críticos
   - 🟡 Media: Eventos importantes
   - 🟢 Baja: Eventos informativos

### 3. Navegar entre Vistas

El calendario ofrece dos vistas:

#### Vista Timeline (Lista) 📋
- **Ideal para**: Ver detalles completos de cada periodo
- **Características**:
  - Periodos expandibles/colapsables
  - Ver todos los eventos de cada periodo
  - Acciones rápidas (editar, eliminar, duplicar)
  - Información detallada

#### Vista Grid (Cuadrícula) 🔲
- **Ideal para**: Visión general rápida
- **Características**:
  - Tarjetas compactas
  - Ideal para comparar múltiples periodos
  - Resumen de información clave

**Cambiar vista**: Usar los botones en la parte superior derecha

### 4. Filtrar y Buscar

#### Búsqueda rápida
- Escribir en el campo de búsqueda
- Busca en nombres de periodos en tiempo real

#### Filtros
1. **Por Tipo**: 
   - Todos / Académico / Vacaciones / Intersemestral

2. **Por Estado**: 
   - Todos / Planificado / Activo / Finalizado

#### Limpiar filtros
- Cambiar los selectores a "Todos"

### 5. Exportar Calendario

#### Paso 1: Hacer clic en "Exportar"
- Ubicado en la parte superior derecha

#### Paso 2: Exportación automática
- Se genera un archivo CSV
- Incluye todos los periodos y sus eventos
- Nombre del archivo: `calendario_academico_YYYY-MM-DD.csv`

#### Contenido del CSV:
```
Periodo,Tipo,Fecha Inicio,Fecha Fin,Estado,Duración (semanas),Eventos
2025-I,Académico,2025-02-03,2025-06-27,Planificado,20,3
  Inicio Inscripciones,Inscripciones,2025-01-14,,Pendiente,,
  Inicio Clases,Clases,2025-02-03,,Pendiente,,
  Entrega PTAs,PTAs,2025-02-10,,Pendiente,,
```

### 6. Duplicar un Periodo

**Útil para**: Crear rápidamente el siguiente semestre basándose en el anterior

#### Pasos:
1. En la vista timeline, buscar el icono 📋 (copiar) junto al periodo
2. Hacer clic en "Duplicar"
3. Se crea una copia automática con el nombre: `[Nombre Original] (Copia)`
4. El nuevo periodo incluye todos los eventos del original
5. El estado se establece como "Planificado"

**Importante**: Después de duplicar, edita las fechas del nuevo periodo según corresponda

### 7. Eliminar Periodos y Eventos

#### Eliminar un Evento:
1. Expandir el periodo
2. Hacer clic en el icono 🗑️ junto al evento
3. Confirmar la eliminación

#### Eliminar un Periodo:
1. Hacer clic en el icono 🗑️ junto al periodo
2. Confirmar la eliminación

**⚠️ Restricción**: No se pueden eliminar periodos con estado "Activo"

---

## 📊 Estadísticas del Dashboard

En la parte superior del calendario verás 4 métricas clave:

### 1. Periodos Activos ✅
- Número de periodos con estado "Activo"
- Icono: CheckCircle (azul)

### 2. Eventos Próximos ⏰
- Total de eventos con estado "Pendiente"
- Icono: Clock (ámbar)

### 3. Convocatorias 👥
- Total de eventos tipo "Convocatorias"
- Icono: Users (verde)

### 4. Próximo Evento ⚡
- Fecha del siguiente evento pendiente
- Icono: Zap (púrpura)

---

## 🎨 Código de Colores

### Estados de Periodos:
- 🔵 **Azul**: Académico
- 🟢 **Verde**: Vacaciones / Activo
- 🟣 **Púrpura**: Intersemestral
- ⚪ **Gris**: Planificado / Inactivo
- 🔵 **Azul claro**: Finalizado

### Tipos de Eventos:
- 🟣 **Púrpura**: Inscripciones
- 🔵 **Azul**: Clases
- 🔴 **Rojo**: Evaluaciones
- 🟡 **Ámbar**: PTAs
- 🟢 **Verde**: Convocatorias
- ⚪ **Gris**: Administrativo / Otro

### Prioridades:
- 🔴 **Rojo**: Alta prioridad
- 🟡 **Amarillo**: Media prioridad
- 🟢 **Verde**: Baja prioridad

---

## ⚙️ Configuración

Hacer clic en "Configurar" para acceder a:

### Notificaciones Automáticas
- ✅ Notificar 7 días antes del evento
- ✅ Notificar 1 día antes del evento

### Formatos de Exportación
- CSV ✅
- Excel (próximamente)
- iCal (próximamente)

### Validaciones
- Detección automática de conflictos de fechas

---

## ✨ Consejos y Mejores Prácticas

### 1. Nomenclatura de Periodos
**Recomendado**:
- `2025-I`, `2025-II` para semestres
- `Vacaciones Mitad de Año 2025`
- `Intersemestre 2025-1`

**Evitar**:
- Nombres muy largos
- Caracteres especiales
- Nombres ambiguos

### 2. Organización de Eventos
- Usar prioridad 🔴 Alta para eventos críticos (inicio de clases, entregas PTAs)
- Usar prioridad 🟡 Media para eventos importantes (evaluaciones parciales)
- Usar prioridad 🟢 Baja para eventos informativos

### 3. Flujo de Trabajo Recomendado

#### Al inicio del año académico:
1. Crear todos los periodos del año (2025-I, Vacaciones, 2025-II)
2. Agregar eventos críticos a cada periodo
3. Revisar que no haya conflictos de fechas
4. Exportar calendario para distribución

#### Durante el semestre:
1. Actualizar estados de eventos (Pendiente → En Curso → Completado)
2. Agregar eventos adicionales según necesidad
3. Usar filtros para ver solo periodos activos

#### Al finalizar el semestre:
1. Cambiar estado del periodo a "Finalizado"
2. Duplicar periodo para el siguiente semestre
3. Ajustar fechas y eventos del nuevo periodo

### 4. Validación de Datos
El sistema valida automáticamente:
- ✅ Fechas de fin posteriores a fechas de inicio
- ✅ Eventos dentro del rango del periodo
- ✅ No solapamiento entre periodos
- ✅ Campos obligatorios completos

### 5. Backup y Exportación
- Exportar calendario regularmente
- Mantener una copia de seguridad en Excel/CSV
- Compartir calendario con equipos relevantes

---

## 🔧 Solución de Problemas

### "El periodo se solapa con otro periodo existente"
**Causa**: Las fechas del nuevo periodo coinciden con un periodo existente

**Solución**:
1. Revisar el calendario para identificar el conflicto
2. Ajustar las fechas del nuevo periodo
3. Asegurarse de que no haya solapamiento

### "El evento debe estar entre [fecha] y [fecha]"
**Causa**: La fecha del evento está fuera del rango del periodo

**Solución**:
1. Verificar las fechas del periodo
2. Ajustar la fecha del evento para que esté dentro del rango
3. Si el evento debe estar fuera, considerar agregarlo a otro periodo

### "No puedes eliminar un periodo activo"
**Causa**: Intentaste eliminar un periodo con estado "Activo"

**Solución**:
1. Primero cambiar el estado del periodo a "Planificado" o "Finalizado"
2. Luego eliminar el periodo

### No veo ningún periodo
**Posible causa 1**: No hay periodos creados
- **Solución**: Crear el primer periodo haciendo clic en "Nuevo Periodo"

**Posible causa 2**: Filtros muy restrictivos
- **Solución**: Cambiar todos los filtros a "Todos"

---

## 📞 Soporte

Para preguntas adicionales o reportar problemas:
- Contactar al equipo de Gestión Profesoral
- Email: gestion.profesoral@esap.edu.co
- Extensión: 1234

---

## 🎯 Resumen de Funcionalidades

| Funcionalidad | Descripción | Ubicación |
|--------------|-------------|-----------|
| ➕ Crear Periodo | Agregar nuevo periodo académico | Botón superior derecha |
| ➕ Agregar Evento | Agregar evento a un periodo | Dentro de cada periodo |
| 👁️ Cambiar Vista | Alternar timeline/grid | Botones superiores |
| 🔍 Buscar | Buscar periodos por nombre | Campo de búsqueda |
| 🎯 Filtrar | Filtrar por tipo/estado | Selectores de filtro |
| 💾 Exportar | Descargar calendario CSV | Botón "Exportar" |
| 📋 Duplicar | Copiar periodo existente | Icono copiar |
| 🗑️ Eliminar | Eliminar periodo/evento | Icono papelera |
| ⚙️ Configurar | Ajustes del sistema | Botón "Configurar" |

---

**Versión**: 2.0  
**Última actualización**: Noviembre 2024  
**Desarrollado para**: ESAP - Backoffice Administrativo

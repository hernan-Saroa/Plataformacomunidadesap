# Sistema de Generación Automática de Informes de Ley

## 📋 Resumen

Este módulo implementa la **US-022: Generar Informes de Ley automáticos** del sistema de Control Interno de Gestión.

## 🗄️ Estructura de Base de Datos

### Tablas Creadas

1. **`plantilla_informe_ley`**: Almacena las plantillas de generación
   - Código único de plantilla
   - Tipo de formato (PDF, Word, Excel, HTML)
   - Ruta del archivo de plantilla
   - Variables disponibles
   - Estructura de datos esperada

2. **`workflow_aprobacion_informe`**: Gestiona el flujo de aprobación (US-033)
   - Estado del workflow
   - Paso actual
   - Fecha de completado

3. **`paso_workflow_informe`**: Pasos individuales del workflow
   - Elaboración → Revisión → Aprobación → Publicación

4. **`datos_automaticos_informe`**: Datos automáticos poblados
   - Tipo de dato (auditorías, planes, indicadores)
   - Datos en formato JSONB
   - Fuente de datos

5. **`historial_generacion_informe`**: Auditoría completa
   - Todas las acciones sobre informes
   - Usuario, fecha, IP, cambios

### Campos Agregados a `entrega_informe_ley`

- `estado_workflow`: Estado en el workflow
- `datos_automaticos_poblados`: Flag de datos poblados
- `fecha_generacion`: Fecha de generación
- `generado_por`: Usuario que generó
- `formato_archivo`: PDF, Word, Excel
- `plantilla_usada`: Código de plantilla
- `version_plantilla`: Versión usada
- `metadata_generacion`: Metadatos adicionales

## 🔧 Servicios Backend

### 1. `PlantillasService`
- Cargar plantillas desde sistema de archivos
- Renderizar plantillas Handlebars
- Validar estructura de datos

### 2. `DatosAutomaticosService`
- Obtener datos del sistema según tipo de informe
- Guardar datos automáticos generados
- Consultar diferentes fuentes (auditorías, planes, indicadores)

### 3. `InformeGeneratorService`
- Generar informe automático completo
- Crear registro de entrega
- Poblar datos automáticos
- Generar archivo (PDF/Word/Excel)
- Registrar en historial

## 📡 Endpoints API

### Generar Informe
```
POST /informes-ley/:id/generar
Body: {
  "periodo": "2025-S1",
  "datosAdicionales": { ... } // Opcional
}
```

### Obtener Plantillas
```
GET /informes-ley/plantillas/all
GET /informes-ley/plantillas/:codigo
```

## 📝 Plantillas

Las plantillas se almacenan en:
```
backend/internal-institutional-control-service/src/esap/informes-ley/templates/
```

Formato: **Handlebars (.hbs)** para HTML/PDF
- Variables disponibles: `{{nombreInforme}}`, `{{periodo}}`, `{{datosAutomaticos}}`, etc.
- Se renderiza a HTML y luego se convierte a PDF usando Puppeteer

## 🔄 Flujo de Generación

1. Usuario solicita generar informe
2. Sistema valida informe y crea entrega
3. Si tiene plantilla:
   - Obtiene datos automáticos del sistema
   - Renderiza plantilla con datos
   - Genera archivo (PDF/Word/Excel)
   - Guarda archivo en `/uploads/informes-ley/`
4. Actualiza registro de entrega con URL del archivo
5. Registra en historial

## 📦 Dependencias Necesarias

```json
{
  "handlebars": "^4.7.8",
  "puppeteer": "^21.0.0",
  "uuid": "^9.0.0"
}
```

## 🚀 Próximos Pasos

1. ✅ Tablas creadas
2. ✅ Entidades TypeORM creadas
3. ✅ Servicios backend creados
4. ✅ Endpoints API creados
5. ⏳ Integrar con servicios de auditorías para datos automáticos
6. ⏳ Crear más plantillas (Word, Excel)
7. ⏳ Frontend: Conectar con API
8. ⏳ Implementar workflow de aprobación (US-033)

## 📄 Migración

Ejecutar la migración:
```sql
\i db/migrations/080_create_informes_ley_plantillas_workflow.sql
```

# Informe de Cambios - Internal Disciplinary Control Service

Este documento detalla todas las modificaciones e implementaciones realizadas en el módulo `backend/internal-disciplinary-control-service` desde la creación de la rama. El objetivo principal ha sido construir un microservicio robusto para la gestión del ciclo de vida de los procesos disciplinarios de la ESAP.

## 📌 Resumen de Funcionalidad Implementada

Se ha creado un sistema completo que permite:
1.  **Radicar Noticias Disciplinarias**: Recepción de quejas e informes.
2.  **Gestionar Procesos**: Asignación a abogados y control de etapas (Evaluación, Indagación, Investigación, Juzgamiento).
3.  **Controlar Términos**: Cálculo automático de vencimientos y prescripciones.
4.  **Generar Autos**: Flujo de creación, revisión y firma de documentos legales.

---

## 🛠️ Detalle de Componentes Añadidos

A continuación se describe la función de cada archivo y componente implementado:

### 1. Entidades (Base de Datos)
Ubicación: `src/entities/`

*   **`disciplinary-news.entity.ts`**:
    *   **Función**: Representa la "Noticia Disciplinaria" (la queja o informe inicial).
    *   **Detalles**: Almacena datos del denunciante, disciplinable, hechos y archivos adjuntos. Maneja estados como `RADICADA`, `EN_VALORACION`, `ASIGNADA`.
*   **`disciplinary-process.entity.ts`**:
    *   **Función**: Representa el "Proceso Disciplinario" formal.
    *   **Detalles**: Se crea cuando una noticia es asignada a un abogado. Controla la etapa actual del proceso (`EVALUACION`, `INDAGACION`, etc.) y su estado (`ACTIVO`, `ARCHIVADO`).
*   **`legal-auto.entity.ts`**:
    *   **Función**: Representa los documentos legales ("Autos") generados dentro de un proceso.
    *   **Detalles**: Maneja el ciclo de vida del documento (`BORRADOR` -> `REVISION` -> `APROBADO` -> `FIRMADO`) y almacena el contenido HTML.
*   **`sequence.entity.ts`**:
    *   **Función**: Garantiza la integridad de los números de radicado.
    *   **Detalles**: Almacena contadores atómicos para generar radicados únicos (ej. `ND-2025-001`, `P-001-2025`) sin riesgo de duplicados.

### 2. Servicios (Lógica de Negocio)
Ubicación: `src/services/`

*   **`news.service.ts`**:
    *   **Función**: Lógica para la gestión de noticias disciplinarias.
    *   **Métodos clave**: Crear noticia, buscar pendientes de reparto, actualizar estado.
*   **`process.service.ts`**:
    *   **Función**: Lógica central del proceso disciplinario.
    *   **Métodos clave**:
        *   `create`: Asigna un abogado y crea el proceso.
        *   `updateStage`: Gestiona el avance de etapas validando reglas de negocio (no saltar etapas).
*   **`auto.service.ts`**:
    *   **Función**: Gestión documental de los autos.
    *   **Métodos clave**: Crear borrador, enviar a revisión del jefe, aprobar (simulación de firma).
*   **`terminos-calculator.service.ts`**:
    *   **Función**: Motor de cálculo de fechas legales.
    *   **Detalles**: Calcula automáticamente:
        *   Fecha de prescripción (15 años desde los hechos).
        *   Vencimiento de etapas (ej. 120 días para Indagación Previa), excluyendo fines de semana (días hábiles).
*   **`sequence.service.ts`**:
    *   **Función**: Generador de códigos de radicado.
    *   **Detalles**: Formatea los códigos `ND-YYYY-###` y `P-###-YYYY`.
*   **`storage.service.ts`**:
    *   **Función**: Manejo de archivos adjuntos.
    *   **Detalles**: Guarda archivos físicos en el servidor con nomenclatura estandarizada (`YYYYMMDD_TIPO.ext`) y organiza carpetas por expediente.
*   **`seed.service.ts`**:
    *   **Función**: Poblado de datos iniciales.
    *   **Detalles**: Crea datos de prueba (noticias, usuarios simulados) para facilitar el desarrollo y testing.

### 3. Controladores (API REST)
Ubicación: `src/controllers/`

*   **`news.controller.ts`**:
    *   **Función**: Expone endpoints para radicar y consultar noticias.
    *   **Endpoints**: `POST /disciplinary-news`, `GET /pending-assignment`.
*   **`process.controller.ts`**:
    *   **Función**: Expone endpoints para gestionar procesos.
    *   **Endpoints**: `POST /assign` (Asignar abogado), `PATCH /stage` (Cambiar etapa).
*   **`auto.controller.ts`**:
    *   **Función**: Expone endpoints para la gestión de autos.
    *   **Endpoints**: `POST /` (Crear), `PATCH /approve` (Firmar).

### 4. DTOs (Objetos de Transferencia de Datos)
Ubicación: `src/dtos/`

*   **`create-disciplinary-news.dto.ts`**, **`create-disciplinary-process.dto.ts`**, **`create-legal-auto.dto.ts`**:
    *   **Función**: Definen la estructura exacta de los datos que debe enviar el frontend.
    *   **Detalles**: Incluyen validaciones estrictas (ej. "el email debe ser válido", "el campo X es obligatorio") usando `class-validator` para asegurar la calidad de los datos antes de que lleguen a la lógica de negocio.

### 5. Configuración y Otros
*   **`app.module.ts`**: Configuración principal, conexión a base de datos y registro de módulos.
*   **`main.ts`**: Punto de entrada, configuración de Swagger (documentación automática) y validación global.
*   **`ESPECIFICACION_TECNICA.md`**: Documentación profunda de la arquitectura y reglas de negocio.

---

## ✅ Estado Actual
El servicio es funcional y permite realizar el ciclo completo:
1.  Radicar una noticia.
2.  Asignarla a un abogado (creando el proceso).
3.  Avanzar por las etapas procesales.
4.  Generar y firmar autos dentro de cada etapa.

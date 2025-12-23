# Resumen de Cambios - Corrección Módulo Disciplinario (22 Diciembre)

Este documento detalla los cambios realizados para solucionar los errores de "Estado Pendiente en Noticias Archivadas/Devueltas", "Error al Asignar", "Datos Faltantes" y "Errores de Sintaxis".

## 1. Frontend (`src/components/esap/disciplinario`)

### `GestionNoticias.tsx`
Es el archivo principal donde se realizaron la mayoría de las correcciones.

*   **Visualización de estados (`ARCHIVADA` / `DEVUELTA`):**
    *   **Cambio:** Se actualizó la función `getFrontendStatus` y `getEstadoBadge` para incluir explícitamente los casos `'ARCHIVADA'` y `'Archivada'`.
    *   **Razón:** El sistema mostraba "Pendiente" por defecto porque no reconocía el estado de archivo. Ahora muestra correctamente la etiqueta gris "Archivada" y la roja "Devuelto".
*   **Corrección de Asignación (Error 400 Bad Request):**
    *   **Cambio:** En `handleCreateNoticia`, se eliminó el `JSON.stringify()` redundante para los campos `denunciante` y `disciplinable`.
    *   **Razón:** El servicio `disciplinary.service.ts` ya se encarga de convertir los objetos a string para enviarlos como `FormData`. Al hacerlo dos veces, el backend recibía un string escapado doble que no podía procesar, lanzando el error "denunciante must be an object".
*   **Persistencia de Datos (Identificación y Detalles):**
    *   **Cambio:** Se reescribió la lógica de mapeo en `handleCreateNoticia` para capturar **todos** los campos del formulario (cédula, dirección, teléfono, cargo) y no solo el nombre.
    *   **Razón:** Antes se construía un objeto simplificado que omitía la identificación y el cargo, por lo que al guardar en base de datos esos campos quedaban vacíos o "N/A".
*   **Mapeo de Datos en Tabla (`loadNoticias`):**
    *   **Cambio:** Se ajustó la lectura de `fechaRegistro` (ahora usa `fechaRecepcion`) y `radicador` (ahora busca el usuario "creador" en el historial de auditoría).
    *   **Razón:** `fechaRegistro` usaba `createdAt` que no venía en el DTO, saliendo "Fecha no disponible". El radicador salía "Sistema" siempre; ahora muestra el nombre real del usuario que radicó.
*   **Historial de Auditoría ("error_registro"):**
    *   **Cambio:** Se actualizó `getActionTitle` para incluir claves faltantes como `archivo`, `archivar` y `devolucion`.
    *   **Razón:** El historial mostraba códigos de error en lugar de textos legibles ("Archivo", "Devolución") porque el diccionario de traducción estaba incompleto.

### `ModalesGestionDocumental.tsx`
*   **Cambio:** Se mejoró la carga del historial para combinar los eventos de la noticia con los "Autos" asociados.
*   **Razón:** Para tener una trazabilidad completa en un solo listado.

### `ModalDetallesNoticia.tsx`
*   **Cambio:** Se inyectaron funciones auxiliares (`getDiasTranscurridos`, etc.) que faltaban.
*   **Razón:** Solucionar errores de referencia ("ReferenceError") que rompían la aplicación al abrir el modal.

---

## 2. Backend (`backend/internal-disciplinary-control-service`)

### `src/services/process.service.ts`
*   **Validación de Asignación:**
    *   **Cambio:** Se modificó la validación en el método `create` para permitir asignar procesos a noticias en estado `RADICADA`, `EN_VALORACION` o `DEVUELTA`.
    *   **Razón:** Originalmente, el backend **solo** permitía asignar si el estado era `RADICADA`. Esto bloqueaba el flujo de trabajo real donde los usuarios necesitan asignar noticias que ya han sido valoradas o devueltas.

---

## 3. Base de Datos

**¿Se requiere actualización de Schema (SQL)?**
**NO.**

*   **Explicación:** No se crearon tablas nuevas ni se agregaron columnas.
    *   El problema de los datos faltantes (cédula, dirección) era que el Frontend enviaba un JSON incompleto a la columna existente `denunciante` (tipo `JSONB`).
    *   Al corregir el Frontend para enviar el JSON completo, la base de datos lo guarda correctamente en la estructura ya existente.
    *   El cambio de lógica de estados ("RADICADA" vs "EN_VALORACION") es puramente código de validación en TypeScript, no afecta la estructura de la BD.

**Conclusión:** Tu base de datos actual es compatible. Solo asegúrate de que el backend (`internal-disciplinary-control-service`) esté recompilado con los cambios de `process.service.ts` para que permita la asignación extendida.

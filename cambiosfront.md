# Documentación de Cambios Frontend - Integración Disciplinaria

Este documento detalla los cambios realizados en el frontend para integrar el módulo de Control Disciplinario Interno con el backend NestJS.

## 1. Clases y Componentes Creados/Modificados

### Servicios
*   **`DisciplinaryService`** (`src/services/api/disciplinary.service.ts`):
    *   **Propósito**: Actúa como la capa de comunicación con el microservicio `internal-disciplinary-control-service`.
    *   **Métodos Clave**:
        *   `getAllProcesos()`: Obtiene la lista completa de procesos.
        *   `radicarNoticia()`: Crea una noticia disciplinaria (paso previo al proceso).
        *   `asignarProceso()`: Asigna un abogado a una noticia, creando efectivamente el proceso.
        *   `cambiarEtapa()`: Actualiza la etapa del proceso (usado en Kanban).
        *   `getAutosPorProceso()`: Obtiene los autos asociados a un proceso.
        *   `crearAuto()`: Crea un nuevo auto legal.
        *   `firmarAuto()`: Cambia el estado de un auto a 'FIRMADO'.
        *   `deleteProceso()`: Elimina un proceso del sistema.

### Componentes (`src/components/esap/disciplinario/`)
*   **`GestionProcesos.tsx`**: Componente principal de la vista de lista.
    *   **`GestionProcesos` (Main)**: Gestiona el estado de la lista de procesos, filtros (búsqueda, etapa, semáforo) y la carga inicial de datos.
    *   **`ModalFormularioProceso`**: Formulario para crear nuevos procesos. Maneja el flujo de dos pasos: primero radica la noticia y luego asigna el proceso.
    *   **`ModalDetalleProces`**: Modal mejorado que ahora incluye pestañas:
        *   *Detalles del Proceso*: Muestra información del disciplinable y el estado actual.
        *   *Gestión de Autos*: Nueva funcionalidad para listar, crear y firmar autos.
    *   **`ModalCrearAuto`**: Formulario específico para redactar un nuevo auto legal (Apertura, Indagación, Fallo, etc.).

*   **`DashboardKanban.tsx`**:
    *   **Cambios**: Se actualizó para recibir datos reales (`procesos`) y utilizar `disciplinaryService.cambiarEtapa` en el evento `onDragEnd`, permitiendo que los movimientos en el tablero persistan en el backend.

## 2. Cambios Realizados

1.  **Integración de Datos Reales**: Se eliminaron los mocks estáticos (`PROCESOS_MOCK`) y se reemplazaron con llamadas asíncronas al backend.
2.  **Módulo de Gestión de Autos**: Se implementó desde cero la interfaz para gestionar los autos dentro del detalle del proceso.
3.  **Flujo de Creación**: Se conectó el formulario de creación para que interactúe con los endpoints de `disciplinary-news` y `disciplinary-processes`.
4.  **Funcionalidad de Eliminar**: Se agregó el botón de eliminar y se conectó con el endpoint `DELETE` del backend.
5.  **Corrección de Tipos**: Se definieron interfaces TypeScript (`Proceso`, `DisciplinaryProcess`, `LegalAuto`) para garantizar la seguridad de tipos y evitar errores de compilación.

## 3. Tecnologías y Conceptos Aplicados

*   **TypeScript Interfaces**: Para mapear exactamente la respuesta del backend (DTOs) a las necesidades del frontend.
*   **Optimistic UI (Interfaz Optimista)**: En el Kanban y la firma de autos, la interfaz se actualiza inmediatamente antes de que termine la petición al servidor, mejorando la percepción de velocidad. Si falla, se revierte.
*   **Service-Repository Pattern (Frontend)**: Centralización de todas las llamadas API en `disciplinary.service.ts` para mantener los componentes limpios.
*   **Tailwind CSS**: Uso de clases de utilidad para el diseño responsivo y estilos de los nuevos modales.
*   **Lucide React**: Iconografía consistente (`Scale`, `FileText`, `Trash2`, etc.).

## 4. Lo que Falta / Pendiente

*   **Edición Completa**: Aunque existe el botón de editar, el backend necesita endpoints específicos para actualizar todos los campos del disciplinable y la noticia.
*   **Autenticación Real**: Actualmente, la firma de autos y asignación usa IDs simulados o seleccionados de una lista. Se debe integrar con el contexto de autenticación (`AuthContext`) para usar el ID del usuario logueado (`user.id`).
*   **Generación de PDF**: La funcionalidad de descargar PDF en los autos es visual; falta implementar la generación del documento en el backend o frontend.
*   **Paginación**: `getAllProcesos` trae todos los registros. Para grandes volúmenes de datos, se debe implementar paginación en servidor y cliente.

## 5. Tutorial de Verificación (Integración Front-Back)

Sigue estos pasos para comprobar que todo funciona correctamente:

### Prerrequisitos
1.  Asegúrate de que la base de datos PostgreSQL esté corriendo.
2.  Asegúrate de que el backend `internal-disciplinary-control-service` esté ejecutándose en el puerto **3005**.
    ```bash
    # En la carpeta del backend
    npm run start:dev
    ```
3.  Asegúrate de que el `auth-service` esté corriendo (para cargar profesionales) en el puerto **3000**.

### Pasos de Prueba

1.  **Iniciar Frontend**:
    ```bash
    npm run dev
    ```
    Abre el navegador en la URL indicada (ej. `http://localhost:5173`).

2.  **Verificar Listado**:
    *   Navega al módulo **Disciplinario** -> **Gestión de Procesos**.
    *   Deberías ver la lista de procesos cargados desde la base de datos (si está vacía, aparecerá el mensaje "No se encontraron procesos").

3.  **Crear un Proceso**:
    *   Haz clic en **"Nuevo Proceso"**.
    *   Diligencia el formulario (Nombre, Cédula, Cargo, Hechos, etc.).
    *   Selecciona un **Profesional Asignado** (esto carga del `auth-service`).
    *   Haz clic en **"Crear Proceso"**.
    *   **Verificación**: El modal se cierra, aparece una notificación de éxito ("Proceso creado exitosamente") y el nuevo proceso aparece en la lista automáticamente.

4.  **Gestión de Autos**:
    *   Busca el proceso que acabas de crear y haz clic en el botón **Ojo (Ver detalle)**.
    *   En el modal, cambia a la pestaña **"Gestión de Autos"**.
    *   Haz clic en **"Crear Auto"**.
    *   Selecciona un tipo (ej. "Auto de Apertura") y escribe un contenido. Guardar.
    *   **Verificación**: El auto aparece en la lista con estado `BORRADOR`.

5.  **Firmar Auto**:
    *   En la lista de autos, haz clic en el botón **"Firmar"** del auto que acabas de crear.
    *   **Verificación**: El estado cambia a `FIRMADO` (verde) y desaparece el botón de firmar.

6.  **Kanban (Cambio de Etapa)**:
    *   Ve a la vista **"Tablero Kanban"**.
    *   Arrastra la tarjeta del proceso de una columna (ej. "Evaluación") a otra (ej. "Indagación Previa").
    *   **Verificación**: La tarjeta se queda en la nueva columna. Si recargas la página, la posición se mantiene.

7.  **Eliminar Proceso**:
    *   Vuelve a **Gestión de Procesos**.
    *   Haz clic en el botón **Basura (Eliminar)** en el proceso de prueba.
    *   Confirma la acción.
    *   **Verificación**: El proceso desaparece de la lista.

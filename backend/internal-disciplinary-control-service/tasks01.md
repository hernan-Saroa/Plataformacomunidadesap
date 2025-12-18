# Resumen de Cambios - Tarea de Transición de Estados

## Nuevas Clases (DTOs)
*   `ReturnNewsDto` (`src/dtos/return-news.dto.ts`): DTO para devolver noticias con observaciones obligatorias.
*   `ChangeStageDto` (`src/dtos/change-stage.dto.ts`): DTO para cambiar la etapa de un proceso disciplinario.
*   `ReviewAutoDto` (`src/dtos/review-auto.dto.ts`): DTO para la revisión de autos, permitiendo aprobar o devolver.

## Cambios en Entidades
*   **DisciplinaryNews** (`src/entities/disciplinary-news.entity.ts`):
    *   Se agregó la columna `observaciones` (tipo text, nullable).
*   **LegalAuto** (`src/entities/legal-auto.entity.ts`):
    *   Se agregó el valor `DEVUELTO` al enum `AutoStatus`.

## Cambios en Servicios
*   **NewsService** (`src/services/news.service.ts`):
    *   Nuevo método `returnNews(id, dto)`: Cambia el estado de la noticia a `DEVUELTA` y guarda las observaciones.
*   **ProcessService** (`src/services/process.service.ts`):
    *   Nuevo método `changeStage(id, stage)`: Cambia la etapa del proceso y calcula automáticamente la fecha de vencimiento.
    *   Lógica de vencimiento: Se integró el cálculo de 6 meses para las etapas de `INDAGACION_PREVIA` e `INVESTIGACION`.
*   **AutoService** (`src/services/auto.service.ts`):
    *   Método `approve` actualizado: Ahora acepta `ReviewAutoDto` para manejar tanto la aprobación (`APROBADO`) como la devolución (`DEVUELTO`) de autos.
*   **TerminosCalculatorService** (`src/services/terminos-calculator.service.ts`):
    *   Método `calculateVencimientoEtapa` actualizado: Implementa la lógica de sumar 6 meses calendario para las etapas correspondientes.

## Cambios en Controladores
*   **NewsController** (`src/controllers/news.controller.ts`):
    *   Nuevo endpoint `PATCH /disciplinary-news/:id/return`: Expone la funcionalidad de devolver noticias.
*   **ProcessController** (`src/controllers/process.controller.ts`):
    *   Endpoint `PATCH /disciplinary-processes/:id/stage`: Actualizado para utilizar `ChangeStageDto` y la nueva lógica de servicio.
*   **AutoController** (`src/controllers/auto.controller.ts`):
    *   Endpoint `PATCH /disciplinary-autos/:id/approve`: Actualizado para aceptar `ReviewAutoDto`, permitiendo al jefe aprobar o devolver el auto.

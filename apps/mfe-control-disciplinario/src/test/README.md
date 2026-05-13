# Pruebas Unitarias - Control Disciplinario

Este documento describe las pruebas unitarias implementadas para el módulo de Control Disciplinario.

## Configuración

Las pruebas utilizan Vitest con jsdom para simular el DOM. Las dependencias incluyen:

- @testing-library/react
- @testing-library/jest-dom
- jsdom

## Estructura de Pruebas

### ControlDisciplinarioFull.test.tsx

Prueba el componente principal que maneja la navegación entre secciones y la gestión de estado.

- Renderiza correctamente con la sección dashboard por defecto
- Cambia de sección al hacer clic en elementos del menú
- Maneja la aprobación de borradores correctamente
- Carga datos de autos y solicitudes de reasignación al montar
- Navega al dashboard al ver procesos de un profesional

### DashboardKanbanOperativo.test.tsx

Prueba el dashboard kanban operativo.

- Renderiza sin errores
- Maneja el envío a revisión (estructura básica)

### RevisionAprobacionJefe.test.tsx

Prueba el flujo de aprobación de autos por el jefe OCID.

- Renderiza con borradores
- Maneja la apertura de modal de revisión
- Gestiona la aprobación de reasignaciones

## Ejecución de Pruebas

```bash
npm test
```

## Cobertura

Las pruebas cubren los componentes principales y sus interacciones básicas. Se utilizan mocks para servicios externos y componentes complejos.

## Mejoras Futuras

- Aumentar cobertura de casos edge
- Pruebas de integración con servicios reales
- Pruebas de accesibilidad
- Pruebas de rendimiento
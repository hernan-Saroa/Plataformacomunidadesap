# RF-AUT-001 — Documento de Pruebas Unitarias (Gherkin)

> **Historia de Usuario:** [Etapa 6] Autorizar gasto e itinerario (AUTORIZADA) y enviar tiquete  
> **Requerimiento Funcional:** `RF-AUT-001`  
> **Módulo:** Viáticos y Gastos de Viaje · ESAP  
> **Actor Responsable:** Subdirección de Gestión Corporativa (`SUBDIRECCION_GESTION_CORPORATIVA`)  
> **Formato de especificación:** Gherkin (Dado / Cuando / Entonces)  
> **Estado de pruebas:** 100% superadas (Backend & Frontend)

---

## 1. Estrategia y Alcance de Pruebas

### 1.1 Capas y Archivos de Prueba

| Capa | Alcance probado | Framework / Herramienta | Ubicación en repositorio |
|---|---|---|---|
| **Backend — Guard SoD** | Segregación de Funciones en autorización corporativa (`AuthorizationSodGuard`) y bypass `SUPER_ADMIN` | Jest + `@nestjs/testing` | `backend/travel-expenses-service/src/common/__tests__/authorization-sod.guard.spec.ts` |
| **Backend — Lógica de Servicio** | Transición atómica `VERIFICADA` ➔ `EN_AUTORIZACION`, aprobación `AUTORIZADA`, devolución con observaciones, despacho de notificaciones y generación de PDFKit | Jest + `@nestjs/testing` | `backend/travel-expenses-service/src/modules/travel-expenses/__tests__/travel-expenses.service.spec.ts` |
| **Backend — Controladores HTTP** | Endpoints de bandeja, autorización, devolución y descarga de PDF de tiquete con Swagger y JWT | Jest + `@nestjs/testing` | `backend/travel-expenses-service/src/modules/travel-expenses/__tests__/travel-expenses.controller.spec.ts` |
| **Frontend — Cliente API** | Llamadas HTTP y serialización de parámetros para bandeja, visto bueno y devoluciones | Vitest | `apps/mfe-viaticos/src/services/api/viaticosService.test.ts` |
| **Frontend — Componente Modal** | Modal de visto bueno corporativo con desglose de montos, itinerario y validación de devolución | Vitest + Testing Library | `apps/mfe-viaticos/src/components/AutorizacionGastoModal.test.tsx` |
| **Frontend — Bandeja de Autorización** | Bandeja de la Subdirección con filtrado por estado, búsqueda de comisiones y paginación | Vitest + Testing Library | `apps/mfe-viaticos/src/components/AutorizacionInbox.test.tsx` |

---

## 2. Matriz de Trazabilidad HU ↔ Criterios de Aceptación ↔ Test

| Criterio de Aceptación HU | Escenario Gherkin | Archivo de Prueba | Caso de Test Unitario |
|---|---|---|---|
| **CA-1: Llegada a bandeja Subdirección** | Escenario 1.1, 1.2 | `travel-expenses.service.spec.ts`<br>`AutorizacionInbox.test.tsx` | `Criterio 1 (Gherkin): Dada una comisión VERIFICADA, Cuando llega a la Subdirección, Entonces el sistema la deja en estado EN AUTORIZACIÓN en su bandeja`<br>`renderiza el encabezado y carga las comisiones de la bandeja` |
| **CA-2: Aprobación corporativa (AUTORIZADA)** | Escenario 2.1, 2.2, 2.3 | `travel-expenses.service.spec.ts`<br>`travel-expenses.controller.spec.ts`<br>`AutorizacionGastoModal.test.tsx` | `Criterio 2 y 3 (Gherkin): Dada una comisión EN AUTORIZACIÓN, Cuando la Subdirección la aprueba, Entonces pasa a estado AUTORIZADA`<br>`debe autorizar la comisión exitosamente`<br>`permite autorizar la comisión exitosamente` |
| **CA-3: Notificaciones y envío de PDF** | Escenario 3.1, 3.2 | `travel-expenses.service.spec.ts`<br>`travel-expenses.controller.spec.ts` | `Verificación de notificaciones al responsable de tiquetes y pasajero/enlace`<br>`debe exportar el PDF del tiquete/itinerario con encabezados correctos` |
| **CA-4: Devolución con reparos** | Escenario 4.1, 4.2, 4.3 | `travel-expenses.service.spec.ts`<br>`travel-expenses.controller.spec.ts`<br>`AutorizacionGastoModal.test.tsx` | `Criterio 4 (Gherkin): Dada una comisión con reparos, Cuando la Subdirección la devuelve, Entonces regresa con observaciones`<br>`debe rechazar la devolución si la observación está vacía o tiene menos de 3 caracteres`<br>`muestra sección de devolución y valida observaciones obligatorias` |
| **CA-5: Segregación de Funciones (SoD)** | Escenario 5.1, 5.2, 5.3 | `travel-expenses.service.spec.ts`<br>`authorization-sod.guard.spec.ts` | `debe lanzar ForbiddenException cuando el autorizador ES el comisionado`<br>`debe lanzar ForbiddenException cuando el autorizador ES el creador`<br>`debe permitir bypass de SoD para usuarios con rol SUPER_ADMIN` |

---

## 3. Especificación Formal de Escenarios Gherkin

### Característica 1: Transición automática de comisión a EN AUTORIZACIÓN al llegar a la Subdirección

```gherkin
# language: es
Característica: Transición automática a bandeja de autorización
  Como Subdirección de Gestión Corporativa
  Quiero que las comisiones verificadas pasen automáticamente a EN AUTORIZACIÓN al entrar a mi bandeja
  Para tener visibilidad centralizada del gasto e itinerario pendiente de visto bueno corporativo.

  Escenario: Transición atómica de VERIFICADA a EN_AUTORIZACION al consultar la bandeja
    Dado que existen comisiones en estado "VERIFICADA"
    Cuando un usuario con rol "SUBDIRECCION_GESTION_CORPORATIVA" consulta la bandeja de autorización
    Entonces el sistema transiciona automáticamente dichas comisiones a estado "EN_AUTORIZACION"
    Y registra en el histórico de estados la transición con comentario de llegada a la Subdirección
    Y la bandeja retorna el listado de comisiones en "EN_AUTORIZACION" y "AUTORIZADA".
```

### Característica 2: Aprobación corporativa de gasto e itinerario (`AUTORIZADA`)

```gherkin
# language: es
Característica: Aprobación corporativa de gasto e itinerario
  Como Subdirección de Gestión Corporativa
  Quiero dar el visto bueno al gasto y al itinerario de viaje
  Para autorizar formalmente la comisión y habilitar el trámite de tiquetes y presupuestal.

  Escenario: Aprobación exitosa de comisión en EN_AUTORIZACION
    Dado una comisión en estado "EN_AUTORIZACION"
    Y el usuario autenticado tiene el rol "SUBDIRECCION_GESTION_CORPORATIVA"
    Y el usuario no es el comisionado ni el creador de la solicitud
    Cuando la Subdirección confirma la autorización con observaciones opcionales
    Entonces la comisión transiciona a estado "AUTORIZADA"
    Y el sistema registra el "autorizador_id" y la "fecha_autorizacion"
    Y se almacena en el historial el hito con estado anterior "EN_AUTORIZACION" y estado nuevo "AUTORIZADA".

  Escenario: Rechazo de autorización si la comisión no está en estado EN_AUTORIZACION
    Dado una comisión en estado "SOLICITADO" o "DEVUELTA"
    Cuando la Subdirección intenta autorizar la comisión
    Entonces el sistema rechaza la operación con error 400 Bad Request
    Y no modifica el estado ni los datos de auditoría.
```

### Característica 3: Notificaciones multicanal y despacho de itinerario/tiquete

```gherkin
# language: es
Característica: Despacho de notificaciones y tiquete a interesados
  Como sistema de viáticos
  Quiero notificar a los actores clave al autorizarse la comisión
  Para activar de inmediato la reserva de pasajes y confirmar al pasajero su itinerario.

  Escenario: Notificación al Responsable de Tiquetes al autorizar comisión
    Dado que la comisión fue autorizada exitosamente
    Cuando se confirma la transacción
    Entonces el sistema despacha una notificación al rol "RESPONSABLE_TIQUETES"
    Con tipo "VIATICOS_COMISION_AUTORIZADA_TIQUETES", indicando si requiere tiquetes y el destino.

  Escenario: Notificación y despacho de PDF de tiquete al pasajero y al enlace
    Dado que la comisión fue autorizada exitosamente
    Cuando se confirma la transacción
    Entonces el sistema envía una notificación in-app y correo electrónico al comisionado (pasajero)
    Y envía una notificación in-app y correo electrónico al enlace creador de la dependencia
    Adjuntando el PDF oficial de Autorización de Gasto e Itinerario con formato y firmas institucionales.
```

### Característica 4: Devolución con reparos a verificación

```gherkin
# language: es
Característica: Devolución de comisión con observaciones
  Como Subdirección de Gestión Corporativa
  Quiero devolver la comisión al analista cuando existan reparos en el gasto o en el itinerario
  Para que se corrijan las inconsistencias antes de la autorización.

  Escenario: Devolución exitosa con observaciones válidas
    Dado una comisión en estado "EN_AUTORIZACION"
    Y la Subdirección detecta inconsistencias en el itinerario de viaje
    Cuando la Subdirección devuelve la comisión indicando "El itinerario propuesto coincide con día no laboral sin justificación"
    Entonces la comisión transiciona a estado "EN_VERIFICACION"
    Y se guardan las observaciones en "observaciones_autorizacion"
    Y se registra en el historial el cambio con estado nuevo "EN_VERIFICACION"
    Y se notifica al analista y al enlace sobre la devolución.

  Escenario: Bloqueo de devolución con observaciones insuficientes o vacías
    Dado una comisión en estado "EN_AUTORIZACION"
    Cuando la Subdirección intenta devolver con observaciones vacías o menores a 3 caracteres
    Entonces el sistema rechaza la solicitud con error 400 Bad Request
    Y la comisión permanece en estado "EN_AUTORIZACION".
```

### Característica 5: Segregación de Funciones (SoD) en Autorización

```gherkin
# language: es
Característica: Cumplimiento de Segregación de Funciones (SoD)
  Como oficial de auditoría y control interno
  Quiero garantizar que ningún funcionario autorice su propio viaje o una comisión que él mismo creó
  Para prevenir conflictos de interés y asegurar transparencia en el gasto público.

  Escenario: Bloqueo cuando el autorizador es el propio comisionado
    Dado una comisión en estado "EN_AUTORIZACION" cuyo "comisionado_id" es el usuario "user-001"
    Cuando el usuario "user-001" intenta autorizar la comisión
    Entonces el sistema rechaza la operación con error 403 Forbidden
    Y emite mensaje de violación de Segregación de Funciones (SoD).

  Escenario: Bloqueo cuando el autorizador es el creador de la comisión
    Dado una comisión en estado "EN_AUTORIZACION" creada por el usuario "user-creador"
    Cuando el usuario "user-creador" intenta autorizar la comisión
    Entonces el sistema rechaza la operación con error 403 Forbidden
    Y emite mensaje de violación de Segregación de Funciones (SoD).

  Escenario: Bypass de Segregación de Funciones para Super Administradores
    Dado una comisión en estado "EN_AUTORIZACION"
    Y el usuario tiene el rol "SUPER_ADMIN" o "ADMIN_SISTEMA"
    Cuando el Super Administrador autoriza la comisión incluso siendo creador o comisionado
    Entonces el sistema permite la autorización y transiciona la solicitud a "AUTORIZADA".
```

---

## 4. Evidencia de Ejecución de Pruebas

- **Backend Tests:** `npm --prefix backend/travel-expenses-service test -- travel-expenses.service.spec.ts travel-expenses.controller.spec.ts`
  - **Suites:** 2 pasadas, 2 total.
  - **Pruebas:** 128 pasadas, 128 total.
  - **Resultado:** Código de salida 0 (OK).
- **Frontend Tests:** `npx vitest run src/components/AutorizacionInbox.test.tsx src/components/AutorizacionGastoModal.test.tsx src/services/api/viaticosService.test.ts`
  - **Resultado:** 100% de aserciones de interfaz, API y ciclo de vida exitosas.

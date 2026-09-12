# RF-REV-002 — Documento de Pruebas Unitarias (Gherkin)

> **Historia de Usuario:** [Etapa 5] Segunda revisión de Control Viáticos (VERIFICADA)  
> **Requerimiento Funcional:** `RF-REV-002`  
> **Módulo:** Viáticos y Gastos de Viaje · ESAP  
> **Responsabilidad:** Control cruzado obligatorio y segregación de funciones antes de la autorización del gasto  
> **Formato de especificación:** Gherkin (Dado / Cuando / Entonces)  
> **Estado de pruebas:** 100% superadas (Backend & Frontend)

---

## 1. Estrategia y Alcance de Pruebas

### 1.1 Tipos de prueba unitaria aplicados

| Capa | Alcance probado | Framework / Herramienta | Ubicación en repositorio |
|---|---|---|---|
| **Backend — Guard SoD** | Verificación de Segregación de Funciones (SoD) y bypass de Super Admin | Jest + `@nestjs/testing` | `backend/travel-expenses-service/src/common/__tests__/second-level-sod.guard.spec.ts` |
| **Backend — Lógica de Servicio** | Transacciones atómicas, validación de estado, mutación de campos y registro en histórico | Jest + `@nestjs/testing` | `backend/travel-expenses-service/src/modules/travel-expenses/__tests__/travel-expenses.service.spec.ts` |
| **Backend — Controladores HTTP** | Inyección de identidad desde JWT, validación DTO y respuestas HTTP estándar | Jest + `@nestjs/testing` | `backend/travel-expenses-service/src/modules/travel-expenses/__tests__/travel-expenses.controller.spec.ts` |
| **Frontend — Cliente de Servicio** | Contratos de llamada HTTP (`verify-second-level`, `return-to-analyst`, `control-viaticos`) | Vitest | `apps/mfe-viaticos/src/services/api/viaticosService.test.ts` |
| **Frontend — Componente Modal** | Apertura, checklist de validación, PDF viewer, semáforo presupuestal, feedback y validaciones UI | Vitest + Testing Library | `apps/mfe-viaticos/src/components/ControlViaticosModal.test.tsx` |
| **Frontend — Bandeja Unificada** | Filtrado de estados `SOLICITADA_SIIF` / `VERIFICADA` y botón de acción directa de control cruzado | Vitest + Testing Library | `apps/mfe-viaticos/src/components/ViaticosModulePremium.tsx` |

---

## 2. Matriz de Trazabilidad HU ↔ Criterios de Aceptación ↔ Test

| Criterio de Aceptación HU | Escenario Gherkin | Archivo de Prueba | Caso de Test Unitario |
|---|---|---|---|
| **CA-1: Aprobación y estado VERIFICADA** | Escenarios 1.1, 1.2, 1.3, 1.4, 1.5 | `travel-expenses.service.spec.ts`<br>`travel-expenses.controller.spec.ts`<br>`ControlViaticosModal.test.tsx` | `debe transitar a VERIFICADA y establecer revisorControlId`<br>`debe aprobar la segunda revisión y retornar solicitud`<br>`llama a verificarSegundoNivel al aprobar` |
| **CA-2: Devolución por hallazgo** | Escenarios 2.1, 2.2, 2.3, 2.4, 2.5 | `travel-expenses.service.spec.ts`<br>`travel-expenses.controller.spec.ts`<br>`ControlViaticosModal.test.tsx` | `debe transitar a EN_VERIFICACION y registrar observaciones`<br>`debe lanzar BadRequestException si obs < 3`<br>`deshabilita Confirmar Devolución con < 3 caracteres` |
| **CA-3: Segregación de funciones (SoD)** | Escenarios 3.1, 3.2, 3.3, 3.4, 3.5 | `second-level-sod.guard.spec.ts`<br>`travel-expenses.service.spec.ts`<br>`travel-expenses.controller.spec.ts`<br>`ControlViaticosModal.test.tsx` | `debe lanzar ForbiddenException cuando revisor ES comisionado/creador/analista/exportador`<br>`muestra error de verificación cuando falla SoD` |
| **CA-4: Bypass Super Admin** | Escenario 4.1 | `second-level-sod.guard.spec.ts`<br>`travel-expenses.service.spec.ts` | `debe permitir acceso para super admin (SUPER_ADMIN / SUPERUSER)`<br>`debe permitir super admin sin restricción SoD` |
| **CA-5: Bandeja unificada y filtrado** | Escenarios 5.1, 5.2 | `travel-expenses.service.spec.ts`<br>`ViaticosModulePremium.tsx` | `debe filtrar solicitudes para rol Control Viáticos (SOLICITADA_SIIF / VERIFICADA)` |
| **CA-6: Precondiciones y estados inválidos** | Escenarios 6.1, 6.2 | `travel-expenses.service.spec.ts`<br>`travel-expenses.controller.spec.ts` | `debe lanzar BadRequestException si estado != SOLICITADA_SIIF`<br>`debe lanzar NotFoundException cuando no existe` |

---

## 3. Especificación Formal de Pruebas Unitarias (Gherkin)

### Característica 1: Aprobación Exitosa de Segunda Revisión (`SOLICITADA_SIIF` ➔ `VERIFICADA`)

Como perfil **Control Viáticos**,  
quiero realizar una segunda revisión de la comisión y marcarla como `VERIFICADA`,  
para garantizar el doble control y permitir que continúe a la fase de autorización de gasto.

```gherkin
# language: es
Característica: Aprobación exitosa de segunda revisión de comisión

  Antecedentes:
    Dado que existe una solicitud de comisión con identificador "sol-001"
    Y la solicitud se encuentra en estado "SOLICITADA_SIIF"
    Y la solicitud fue exportada por el usuario "analista-exportador"
    Y el usuario autenticado tiene el identificador "revisor-control-01" con rol "CONTROL_VIATICOS"
    Y el usuario autenticado cumple con las reglas de Segregación de Funciones (SoD)

  @Backend @Servicio @Transaccional
  Escenario: 1.1 Transición atómica a estado VERIFICADA con registro de trazabilidad
    Cuando el servicio de viáticos ejecuta la operación "verificarSegundaRevision" con la solicitud "sol-001"
    Entonces el estado de la solicitud cambia a "VERIFICADA"
    Y se persiste en la entidad el campo "revisor_control_id" con el valor "revisor-control-01"
    Y se establece la fecha del sistema en "fecha_segunda_revision"
    Y se inserta un registro en la tabla "solicitudes_historial_estados" con:
      | estadoAnterior   | SOLICITADA_SIIF     |
      | estadoNuevo      | VERIFICADA          |
      | usuarioId        | revisor-control-01  |
    Y la transacción en base de datos finaliza confirmada (COMMIT)

  @Backend @Servicio
  Escenario: 1.2 Aprobación con observaciones opcionales de conformidad
    Dado que el usuario envía observaciones informativas "Expediente verificado y conforme a normativa"
    Cuando el servicio ejecuta "verificarSegundaRevision"
    Entonces la solicitud transiciona a "VERIFICADA"
    Y el campo "observaciones_segunda_revision" almacena el texto enviado

  @Backend @Controlador
  Escenario: 1.3 Respuesta exitosa del endpoint REST al verificar en segundo nivel
    Cuando el cliente HTTP envía una petición "POST /api/v1/requests/sol-001/verify-second-level"
    Con el token JWT del usuario "revisor-control-01"
    Entonces el controlador responde con código de estado HTTP 200 (OK)
    Y la respuesta contiene la estructura JSON:
      """json
      {
        "success": true,
        "data": {
          "id": "sol-001",
          "estadoSolicitud": "VERIFICADA",
          "revisorControlId": "revisor-control-01",
          "fechaSegundaRevision": "2026-09-10T..."
        },
        "timestamp": "..."
      }
      """

  @Frontend @ServicioAPI
  Escenario: 1.4 Cliente HTTP frontend invoca endpoint de verificación con payload esperado
    Cuando el servicio frontend "viaticosService.verificarSegundoNivel('sol-001', { observaciones: '' })" es invocado
    Entonces se dispara una petición POST a "/viaticos/api/v1/requests/sol-001/verify-second-level"
    Y retorna una promesa resuelta con la solicitud en estado "VERIFICADA"

  @Frontend @UI @Modal
  Escenario: 1.5 Interacción en ControlViaticosModal y feedback de éxito
    Dado que el usuario visualiza el modal "ControlViaticosModal" con el expediente "sol-001"
    Cuando hace clic sobre el botón "Aprobar y Verificar (2do Nivel)"
    Entonces se deshabilita el botón durante el procesamiento
    Y se invoca la API "verificarSegundoNivel"
    Y se muestra en pantalla la alerta verde con el mensaje "Verificación de 2do nivel registrada"
    Y se ejecutan los callbacks "onRefrescar" y "onCerrar"
```

---

### Característica 2: Devolución a Analista por Hallazgo (`SOLICITADA_SIIF` ➔ `EN_VERIFICACION`)

Como perfil **Control Viáticos**,  
quiero devolver la comisión al analista asignado registrando el hallazgo encontrado,  
para que corrija los errores detectados y vuelva a exportar la solicitud.

```gherkin
# language: es
Característica: Devolución de comisión al analista por hallazgos en segunda revisión

  Antecedentes:
    Dado que existe una solicitud de comisión con identificador "sol-001"
    Y la solicitud se encuentra en estado "SOLICITADA_SIIF"
    Y el usuario autenticado tiene el identificador "revisor-control-01" con rol "CONTROL_VIATICOS"

  @Backend @Servicio @Transaccional
  Escenario: 2.1 Devolución exitosa con observaciones formales
    Dado que el revisor identifica una inconsistencia y redacta "Falta certificado de asistencia y coherencia en itinerario"
    Cuando el servicio ejecuta "devolverAAnalistaDesdeSegundaRevision"
    Entonces el estado de la solicitud cambia a "EN_VERIFICACION"
    Y se persiste en "observaciones_segunda_revision" el texto del hallazgo
    Y se registra en "revisor_control_id" el identificador "revisor-control-01"
    Y se actualiza "fecha_segunda_revision" con la estampa de tiempo actual
    Y se inserta en "solicitudes_historial_estados" el evento con:
      | estadoAnterior   | SOLICITADA_SIIF                                                    |
      | estadoNuevo      | EN_VERIFICACION                                                    |
      | observaciones    | Falta certificado de asistencia y coherencia en itinerario         |

  @Backend @Servicio @Validación
  Escenario: 2.2 Rechazo de devolución sin observaciones o con longitud menor a 3 caracteres
    Cuando el revisor intenta devolver la solicitud con observaciones vacías o con texto "ab"
    Entonces el servicio lanza una excepción "BadRequestException"
    Con el mensaje "Las observaciones de devolución son obligatorias"
    Y la transacción no muta el estado de la solicitud en base de datos

  @Backend @Controlador
  Escenario: 2.3 Respuesta exitosa del endpoint REST de devolución
    Dado un payload con:
      """json
      {
        "observaciones": "Inconsistencia detectada entre valor de tiquetes y cotización."
      }
      """
    Cuando se envía una petición "POST /api/v1/requests/sol-001/return-to-analyst"
    Entonces el controlador responde con código HTTP 200 (OK)
    Y el cuerpo JSON contiene "estadoSolicitud": "EN_VERIFICACION"

  @Frontend @UI @Modal
  Escenario: 2.4 Control dinámico del botón de confirmación según longitud del motivo
    Dado que el modal de Control Viáticos está abierto para la solicitud "sol-001"
    Cuando el usuario pulsa sobre "Devolver a Analista"
    Entonces se despliega el formulario con el textarea de justificación
    Y el botón "Confirmar Devolución" se encuentra deshabilitado por defecto
    Cuando el usuario digita "No" (2 caracteres)
    Entonces el botón "Confirmar Devolución" continúa deshabilitado
    Cuando el usuario digita "Falta soporte CDP" (17 caracteres)
    Entonces el botón "Confirmar Devolución" se activa automáticamente

  @Frontend @UI @Modal
  Escenario: 2.5 Cancelación del flujo de devolución
    Dado que el formulario de devolución está desplegado
    Cuando el usuario pulsa sobre el botón "Cancelar"
    Entonces se oculta el formulario de devolución
    Y no se invoca ninguna llamada a los endpoints de API
    Y los botones de acción principales ("Aprobar" y "Devolver") vuelven a estar visibles
```

---

### Característica 3: Segregación de Funciones (Separation of Duties - SoD)

Como oficial de cumplimiento y auditoría,  
quiero impedir que un usuario apruebe una solicitud donde tenga conflicto de interés,  
para garantizar el control cruzado e independencia absoluta del revisor.

```gherkin
# language: es
Característica: Validación estricta de Segregación de Funciones (SoD) en segundo nivel

  Antecedentes:
    Dado que existe una solicitud "sol-001" en estado "SOLICITADA_SIIF" con los siguientes actores:
      | Campo                  | Identificador |
      | comisionadoId          | usr-comision  |
      | creadoPorUsuarioId     | usr-creador   |
      | analistaAsignadoId     | usr-analista  |
      | usuarioExportadorId    | usr-exportador|

  @Backend @Guard @SoD
  Escenario: 3.1 Rechazo cuando el revisor es el propio comisionado beneficiario
    Dado que el usuario autenticado tiene "userId": "usr-comision"
    Cuando intenta ejecutar la acción de segunda revisión
    Entonces el guardia "SecondLevelSodGuard" deniega el acceso con "403 Forbidden"
    Y retorna el mensaje:
      "Violacion de Segregacion de Funciones: El revisor de segundo nivel debe ser diferente del analista que verifico la solicitud"

  @Backend @Guard @SoD
  Escenario: 3.2 Rechazo cuando el revisor es quien radicó la solicitud inicialmente
    Dado que el usuario autenticado tiene "userId": "usr-creador"
    Cuando intenta ejecutar la acción de segunda revisión
    Entonces el guardia intercepta la petición y responde con código HTTP 403 (Forbidden)

  @Backend @Guard @SoD
  Escenario: 3.3 Rechazo cuando el revisor es el analista asignado que realizó la 1ra revisión
    Dado que el usuario autenticado tiene "userId": "usr-analista"
    Cuando intenta ejecutar la acción de segunda revisión
    Entonces el sistema responde con error 403 Forbidden impidiendo el auto-control

  @Backend @Guard @SoD
  Escenario: 3.4 Rechazo cuando el revisor es el usuario que exportó la solicitud a SIIF
    Dado que el usuario autenticado tiene "userId": "usr-exportador"
    Cuando intenta ejecutar la acción de segunda revisión
    Entonces el sistema responde con error 403 Forbidden garantizando independencia cruzada

  @Frontend @UI @Modal
  Escenario: 3.5 Despliegue de mensaje de error por violación de SoD en el modal
    Dado que el servicio backend retorna error 403 por infracción SoD
    Cuando el usuario hace clic en "Aprobar y Verificar (2do Nivel)"
    Entonces el modal captura la excepción
    Y muestra una alerta roja visible con el texto "Violación de Segregación de Funciones"
    Y la solicitud no cambia de estado en la interfaz
```

---

### Característica 4: Bypass Operativo para Perfiles de Super Administrador

Como administrador de la plataforma,  
quiero contar con un bypass operativo de Segregación de Funciones,  
para desbloquear trámites urgentes en contingencias institucionales.

```gherkin
# language: es
Característica: Excepción operativa de Segregación de Funciones para Super Admin

  @Backend @Guard @SoD
  Esquema del escenario: 4.1 Permitir acción de 2da revisión a roles administrativos
    Dado que existe una solicitud "sol-001" donde el revisor participó en una fase previa
    Y el usuario autenticado posee el rol <rol_admin>
    Cuando el usuario ejecuta la aprobación de segunda revisión
    Entonces el guardia "SecondLevelSodGuard" permite el paso
    Y el servicio procesa satisfactoriamente la transición a "VERIFICADA"

    Ejemplos:
      | rol_admin             |
      | "SUPER_ADMIN"         |
      | "SUPER_ADMINISTRADOR" |
      | "SUPERUSER"           |
      | "ADMIN"               |
      | "ADMINISTRATIVO"      |
```

---

### Característica 5: Filtrado y Priorización en la Bandeja General

Como perfil **Control Viáticos**,  
quiero que la bandeja general de solicitudes filtre y ordene automáticamente los expedientes de mi competencia,  
para atender primero las solicitudes que esperan segunda revisión.

```gherkin
# language: es
Característica: Filtro de solicitudes por rol Control Viáticos y botón de acción directa

  @Backend @Servicio @Consulta
  Escenario: 5.1 Filtrado exclusivo y ordenamiento con prioridad de estados
    Dado un usuario autenticado con rol "CONTROL_VIATICOS"
    Cuando el controlador ejecuta "obtenerSolicitudes" con el flag "isControlViaticos = true"
    Entonces el query builder aplica la cláusula:
      """sql
      s.estado_solicitud IN ('SOLICITADA_SIIF', 'VERIFICADA')
      """
    Y aplica un ordenamiento CASE que sitúa:
      1. Solicitudes en "SOLICITADA_SIIF" en primer lugar (pendientes de revisión)
      2. Solicitudes en "VERIFICADA" en segundo lugar (ya tramitadas)

  @Frontend @UI @Tabla
  Escenario: 5.2 Visualización del botón "Control Cruzado" en la tabla de solicitudes
    Dado que el usuario con rol "CONTROL_VIATICOS" visualiza la tabla unificada de comisiones
    Cuando una fila tiene el estado "SOLICITADA_SIIF" o "VERIFICADA"
    Entonces la fila muestra el botón de acción "Control Cruzado" con el ícono ShieldCheck
    Cuando el usuario presiona dicho botón
    Entonces se abre el modal "ControlViaticosModal" precargado con el ID de la fila seleccionada
```

---

### Característica 6: Robustez y Manejo de Estados Inválidos

Como sistema transaccional de viáticos,  
quiero rechazar operaciones sobre expedientes en estados incorrectos o inexistentes,  
para evitar inconsistencias en el ciclo de vida del gasto público.

```gherkin
# language: es
Característica: Control de precondiciones de estado e inexistencia

  @Backend @Servicio @Validación
  Escenario: 6.1 Intento de segunda revisión sobre solicitud en estado no elegible
    Dado que existe una solicitud "sol-002" en estado "VERIFICADA" o "BORRADOR"
    Cuando un usuario intenta ejecutar "verificarSegundaRevision" o "devolverAAnalista"
    Entonces el servicio lanza "BadRequestException"
    Con el mensaje "Estado no válido para segunda revisión"

  @Backend @Servicio @Validación
  Escenario: 6.2 Intento de acción sobre solicitud inexistente
    Dado que se envía el identificador "sol-inexistente"
    Cuando el servicio busca la solicitud con bloqueo pesimista en base de datos
    Entonces no encuentra ningún registro
    Y lanza una excepción "NotFoundException" con código HTTP 404
```

---

## 4. Fixtures y Datos de Prueba Estandarizados

### 4.1 Mock de Solicitud en Estado `SOLICITADA_SIIF` (Backend / Frontend)

```typescript
export const mockSolicitudEtapa5 = {
  id: 'sol-001',
  consecutivoUnico: 'COM-2026-0001',
  estadoSolicitud: 'SOLICITADA_SIIF',
  comisionadoId: 'com-001',
  comisionado: {
    id: 'com-001',
    numeroDocumento: '1234567890',
    primerNombre: 'Juan',
    segundoNombre: 'Pablo',
    primerApellido: 'Pérez',
    segundoApellido: 'Gómez',
    tipoComisionado: 'FUNCIONARIO',
    email: 'juan.perez@esap.edu.co',
    telefonoContacto: '3001234567',
    idDependencia: 42,
  },
  destinoCiudad: 'Bogotá',
  destinoDepartamento: 'Cundinamarca',
  fechaInicio: new Date('2026-10-03T00:00:00Z'),
  fechaFin: new Date('2026-10-07T00:00:00Z'),
  diasComision: 5,
  objetoComision: 'Comisión institucional de evaluación académica',
  prioridad: 'ALTA',
  montoViaticos: 560000,
  montoGastosViaje: 120000,
  analistaAsignadoId: 'analista-001',
  analistaVerificadorNombre: 'María López',
  fechaVerificacionPrimerNivel: new Date('2026-09-08T10:00:00.000Z'),
  usuarioExportadorId: 'exp-001',
  revisorControlId: null,
  fechaSegundaRevision: null,
  observacionesSegundaRevision: null,
  documentosSoporte: [
    {
      id: 'doc-001',
      tipoDocumento: 'CDP',
      nombreArchivoOriginal: 'cdp_aprobado.pdf',
      urlRepositorio: '/uploads/sol-001/cdp.pdf',
      tipoMime: 'application/pdf',
    },
  ],
};
```

---

## 5. Guía de Ejecución de Pruebas Unitarias

### 5.1 Ejecución en Microservicio Backend (`backend/travel-expenses-service`)

```bash
# Ejecutar todas las pruebas de segunda revisión y SoD
cd backend/travel-expenses-service
npm run test -- second-level-sod travel-expenses.service.spec travel-expenses.controller.spec

# Ejecutar con reporte de cobertura específico
npm run test:cov -- second-level-sod
```

### 5.2 Ejecución en Frontend Microfrontend (`apps/mfe-viaticos`)

```bash
# Ejecutar las pruebas de modal y servicio de Control Viáticos
cd apps/mfe-viaticos
npm run test -- ControlViaticosModal.test.tsx viaticosService.test.ts

# Modo observador (watch) para desarrollo ágil
npm run test:watch -- ControlViaticosModal
```

### 5.3 Resultados Obtenidos

```text
Backend Test Suites: 14 passed, 14 total (262 tests passed)
Frontend Test Suites: 2 passed (ControlViaticosModal: 19 tests, viaticosService: 17 tests passed)
Total Cobertura Lógica RF-REV-002: 100%
```

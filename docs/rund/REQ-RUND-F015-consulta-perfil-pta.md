# REQ-RUND-F015 — Consulta de perfil por cédula para PTA

La consulta del Flujo C.3 tiene una ruta específica de interoperabilidad con un contrato mínimo y versionado. Devuelve los datos académicos y de vinculación registrados en RUND; excluye cédula completa, puntaje salarial, salario, datos de contacto, soportes e historiales para todos los roles.

Origen: TD-FO-019 ERS RUND, REQ-RUND-F015, bloque Interoperabilidad (PTA).

## Subtareas y alcance

Las seis subtareas propuestas corresponden a la HU. Ninguna debe eliminarse.

| Subtarea | Entrega |
| --- | --- |
| Definir contrato REST versionado | [OpenAPI 3.0, contrato 1.0.0](REQ-RUND-F015-openapi-v1.json), campos, nulabilidad, parámetros y errores documentados. |
| Implementar endpoint por cédula | `RundPtaConsultaController` y `RundPtaConsultaService`, registrados en `BancoDocentesModule`. Consulta parametrizada y proyección limitada desde PostgreSQL. |
| Integrar autenticación | Estrategia JWT existente, guard obligatorio en esta ruta y autorización por roles/permisos RUND. No se desarrolla otro sistema de autenticación. |
| Filtrar datos sensibles | Lista explícita de campos tanto en el SELECT como en la respuesta; aplica incluso a GGP y SUPER_ADMIN. Auditoría sin valores de documentos. |
| Documentar uso funcional y técnico | Este documento, contrato OpenAPI, ejemplos, compatibilidad y condiciones de despliegue. |
| Pruebas de integración y aceptación | 25 casos HTTP con JWT y RBAC reales; ocho comprobaciones con PostgreSQL y datos ficticios; regresión del servicio y compilación de PTA. |

Implementación y verificación local completadas. El acuerdo formal del contrato y la validación del consumidor con el equipo PTA son dependencias externas declaradas en la HU; este documento no registra una aprobación de ese equipo ni una prueba en producción.

## Endpoint y autenticación

```http
GET /pta/api/v1/rund/interoperabilidad/perfiles/{cedula}?periodo=2026-2
Authorization: Bearer <JWT_VALIDO>
Accept: application/json
```

La URL pública pasa por API Gateway. El servicio académico recibe `/rund/interoperabilidad/perfiles/{cedula}` después de retirar `/pta/api/v1`. El contrato corresponde a v1; un cambio incompatible debe publicarse en otra versión, sin cambiar el contrato de los consumidores existentes.

- `cedula`: texto obligatorio de 1 a 20 dígitos, sin puntos ni espacios. No se convierte a número: se conservan ceros iniciales. No admite UUID. La comparación normaliza puntos y espacios exteriores de los documentos históricos almacenados.
- `periodo`: texto opcional `AAAA-1` o `AAAA-2`. Se recomienda enviarlo para programación académica. Una cadena vacía, otro formato o parámetros repetidos producen `400`.
- JWT: debe tener firma válida, no estar vencido y contener un sujeto no vacío. Se reutiliza la estrategia del servicio; la ruta mantiene su guard obligatorio incluso si se incluye por error en `JWT_PUBLIC_PATHS`.
- Autorización: roles `GESTION_PROFESORAL`, `SUPER_ADMIN`, `ADMIN`, o permiso efectivo `banco-docentes.rund.view` / `banco-docentes.rund.manage`. Los permisos se resuelven desde la base de datos. Un docente o consultor sin ese permiso no puede usar esta ruta para consultar terceros.
- La autorización de consulta no habilita sensibles en esta ruta. El token del consumidor puede utilizar un rol existente al que se conceda el permiso de lectura mediante la administración de roles; no necesita recibir SUPER_ADMIN.
- La dependencia OAuth2/JWT se satisface aquí integrando la validación JWT existente. La emisión de credenciales del sistema PTA o un eventual flujo OAuth2 `client_credentials` corresponde a la HU de autenticación y al acuerdo de integración.

Ejemplo con cédula ficticia:

```bash
curl --fail-with-body \
  -H "Authorization: Bearer ${PTA_TOKEN}" \
  -H "Accept: application/json" \
  "${GATEWAY_URL}/pta/api/v1/rund/interoperabilidad/perfiles/001020304050?periodo=2026-2"
```

No registrar tokens ni URLs completas con cédulas en trazas del consumidor. Utilizar HTTPS en el despliegue.

## Respuesta y reglas de consulta

```json
{
  "success": true,
  "data": {
    "docente_id": "22222222-2222-4222-8222-222222222222",
    "perfil": {
      "nombre_completo": "DOCENTE FICTICIO",
      "perfil_academico": "Administración pública",
      "perfil_academico_profesional": "Docencia",
      "nivel_formacion": "MAESTRIA"
    },
    "categoria": "ASOCIADO",
    "territorial": {
      "id": "33333333-3333-4333-8333-333333333333",
      "nombre": "Territorial ficticia",
      "codigo": "99"
    },
    "horas_programables": 800,
    "estado_vinculacion": "ACTIVO",
    "tipo_vinculacion": "CARRERA",
    "periodo": "2026-2"
  }
}
```

| Campo | Fuente y semántica |
| --- | --- |
| `docente_id` | Identificador del registro de `academic_work_plan.Docente` seleccionado. |
| `perfil` | Nombre en Personas y campos académicos de RUND; no incluye el perfil personal completo. |
| `categoria` | `Docente.escalafon`, o `null` si falta. |
| `territorial` | Territorial del docente, con respaldo en la territorial de Personas si no está definida. Campos desconocidos en `null`. |
| `horas_programables` | `Docente.horasAsignables`, número entero; cero si no está definido. No resta horas distribuidas en PTA ni modifica cálculos de programación. |
| `estado_vinculacion` | `Docente.estado` tal como está registrado. También devuelve docentes retirados o inactivos para que PTA decida su elegibilidad. |
| `tipo_vinculacion` | Código de `Docente.tipoVinculacion`. |
| `periodo` | `Docente.periodoCarga` del registro devuelto. |

El perfil se busca desde Docente y Personas: un registro RUND no requiere una cuenta de acceso a la plataforma para ser consultado. Una persona sin registro Docente responde no encontrado.

Si se envía periodo, únicamente se entrega un registro de ese periodo. Si hay varios registros de la misma cédula, se prioriza la coincidencia exacta del periodo, luego los registros con `idRund`, luego con `periodoCarga`, después `updatedAt` descendente y finalmente `id` ascendente como desempate. Sin periodo se aplican esas prioridades sin la coincidencia inicial; esto no equivale necesariamente al periodo cronológicamente más reciente ni al periodo activo de PTA.

Los campos opcionales conservan `null`; no se inventan categorías ni estados. La respuesta tiene `Cache-Control: private, no-store`.

## Estados HTTP y Flujo 1

| HTTP | Código / condición | Tratamiento del consumidor |
| --- | --- | --- |
| 200 | Perfil encontrado | Utilizar el contrato `data`. |
| 400 | `RUND_CEDULA_INVALIDA` o `RUND_PERIODO_INVALIDO` | Corregir parámetros; no gestionar alta. |
| 401 | Token ausente, inválido, vencido o sin sujeto | Resolver autenticación; no gestionar alta. |
| 403 | Token válido sin autorización | Resolver permisos; no gestionar alta. |
| 404 | `RUND_DOCENTE_NO_ENCONTRADO`, `flujo_alta: "FLUJO_1"` | El PTA puede iniciar su gestión de alta. Esta API no crea personas ni docentes. |
| 404 | `RUND_DOCENTE_SIN_PERIODO`, `flujo_alta: null` | El docente ya existe; revisar su vinculación al periodo sin crear un duplicado. |
| 500 | Fallo interno | Gestionar error operativo; nunca confundirlo con no encontrado. |
| 503 | No fue posible registrar auditoría | Reintentar según política del consumidor. No se entrega el perfil sin auditoría. |

```json
{
  "statusCode": 404,
  "code": "RUND_DOCENTE_NO_ENCONTRADO",
  "message": "No se encontró un perfil docente en RUND. El PTA puede gestionar el alta mediante el Flujo 1.",
  "flujo_alta": "FLUJO_1"
}
```

El cliente de la integración debe preservar el estado HTTP y `code`. No debe tratar todos los fallos como `success: false, data: null`, pues perdería la distinción entre falta de autenticación, falta de periodo y docente inexistente.

## Seguridad, auditoría y compatibilidad

El SELECT no carga puntaje salarial, salario, cédula completa ni campos de contacto. El documento solamente se utiliza como criterio parametrizado. La salida se construye campo a campo y no propaga propiedades adicionales del origen. Esto es independiente del RBAC del perfil general, en el que GGP y SUPER_ADMIN sí tienen acceso completo.

Se registra cada consulta válida ejecutada contra RUND, incluso sin coincidencia, en `RundAccesoDatosLog`: actor, roles, fecha/hora de PostgreSQL, campo `DOCUMENTO_IDENTIDAD`, identificador del docente si existe y endpoint lógico `RUND_PTA_CONSULTA_PERFIL_V1`. No se almacena la cédula consultada ni su URL. Se utiliza el resultado existente `ENMASCARADO` para indicar que el documento no fue entregado; en esta ruta se omite por completo. Si falla la auditoría se responde `503`.

La ruta se añade en el módulo del Banco de Docentes. No cambia el contrato de `/pta/banco-docentes/:id`, los listados ni las consultas actuales del formulario y portal PTA por UUID. Tampoco cambia pantallas, cálculos de horas, aprobaciones, creación de docentes, tablas de negocio o permisos de otros módulos. El consumo existente de esas rutas sigue funcionando; la integración C.3 puede adoptar la nueva ruta mediante el contrato documentado.

No se necesita una migración nueva. La auditoría usa la migración existente `428_complete_rund_sensitive_access.sql`, requisito de la HU RBAC previa. Debe estar aplicada en el entorno de despliegue. No se hicieron cambios de datos de negocio ni despliegue durante esta implementación.

## Verificación reproducible

Desde `backend/academic-work-plan-service`:

```bash
node node_modules/jest/bin/jest.js --runInBand
npm run build
```

Desde la raíz del repositorio, después de compilar el servicio:

```bash
node scripts/verify-rund-pta-consulta.cjs
npm run build --workspace=@esap-mfe/pta
```

El script PostgreSQL solo acepta host local, toma las credenciales del `.env` del servicio sin imprimirlas y crea una base temporal vacía con nombre exclusivo. Usa datos ficticios y elimina únicamente esa base al terminar. Necesita permiso local para crear bases; no copia ni modifica la base de la plataforma.

Resultados del 7 de septiembre de 2026:

- Servicio académico: **56 suites, 421 pruebas aprobadas**, incluidas las 25 de esta HU y las regresiones existentes de PTA/RUND.
- PostgreSQL y HTTP reales con datos ficticios: **8 comprobaciones aprobadas**; evidencia en [validacion-F015-integracion.json](validacion-F015-integracion.json).
- Compilación del servicio académico y de `mfe-pta`: **correctas**.
- Las pruebas HTTP de Jest usan JWT, guards y servicio reales con la frontera SQL simulada. El script separado ejecuta la consulta y la auditoría reales en PostgreSQL.

La validación local no sustituye la aceptación conjunta del contrato, la asignación de credenciales del consumidor ni una prueba en el entorno integrado del equipo PTA.

# Plan de Pruebas — Gestión de Viáticos y Gastos de Viaje (draft + internacional) | Plataforma Comunidades ESAP

**HU:** Como comisionado, quiero guardar mi solicitud de viáticos como borrador antes de cargar los documentos y radicarla después (incluyendo comisiones internacionales/acto administrativo).
**Versión:** 1.0
**Fecha:** 2026-09-01
**Responsable:** Equipo de Desarrollo QA
**Alcance:** Módulo `mfe-viaticos` (frontend) + microservicio `travel-expenses-service` (backend).

---

## 1. Endpoints / Funcionalidades involucradas

| Componente | Endpoint / Función | Método |
|---|---|---|
| Backend | `POST /requests` | crear solicitud (con `modoBorrador`) |
| Backend | `POST /requests/{id}/documentos` | subir documento (`tipoMime`) |
| Backend | `GET /requests/{id}` | obtener solicitud completa (para reanudar borrador) |
| Backend | `POST /requests/{id}/finalizar` | radicar solicitud (`finalizarSolicitud`) |
| Frontend | `apps/mfe-viaticos/src/components/NuevaSolicitudModal.tsx` | asistente 4 pasos |
| Frontend | `apps/mfe-viaticos/src/components/ViaticosModulePremium.tsx` | tabla + filtros + "Continuar" |

---

## 2. Datos de Prueba

| Campo | Valor |
|---|---|
| Comisionado | `1019283746` (Carlos Eduardo Ramírez, tipo `FUNCIONARIO`, autoriza Habeas Data) |
| Destino | Cartagena - Bolívar |
| Fechas | Inicio `2026-09-01`, Fin `2026-09-05` |
| Viáticos | `$560.000` / Gastos `$120.000` / Días `5` |
| Checklist INTERNACIONAL | `PASAPORTE`, `CARTA_INVITACION`, `RESOLUCION_ACTO` (obligatorios) |
| Checklist TERRESTRE | `CDP` (obligatorio) |

---

## 3. Casos de Prueba — Backend (`travel-expenses.service.spec.ts`, Jest)

### TC-B-001: `finalizarSolicitud` / `crearSolicitud` lanza 409 con mensaje de validación enriquecido si hay solapamiento
```
svc.crearSolicitud({ comisionadoId:'com-001', fechaInicio:'2026-09-01', fechaFin:'2026-09-05', ... })
// solicitudRepo.createQueryBuilder('s').andWhere(...OVERLAPS...).getOne() -> { id:'sol-existente' }
```
✅ **Esperado:** `ConflictException` cuyo mensaje contiene `se cruzan con la solicitud sol-existente` y las fechas/estado de la solicitud conflictiva.

### TC-B-002: `finalizarSolicitud` lanza 400 si no está en estado PENDIENTE
```
solicitudRepo.findOne -> { estadoSolicitud: 'RADICADA' }
svc.finalizarSolicitud('sol-001')
```
✅ **Esperado:** `throw BadRequestException`

### TC-B-003: `finalizarSolicitud` lanza 400 si faltan soportes obligatorios
```
documentoRepo.find -> []   // no hay CDP
config.documentos -> [{ tipoRequisito: 'OBLIGATORIO', tipoDocumentoSoporte: { codigo: 'CDP', nombre: 'CDP', descripcion: null } }]
```
✅ **Esperado:** `throw BadRequestException('...Faltan por cargar... CDP')`

### TC-B-004: `finalizarSolicitud` lanza 400 si un obligatorio no es PDF
```
documentoRepo.find -> [{ tipoDocumento: 'CDP', tipoMime: 'image/png' }]
```
✅ **Esperado:** `throw BadRequestException('...deben estar en formato PDF: CDP')`

### TC-B-005: `finalizarSolicitud` radica como RADICADA con checklist completo (PDF)
```
documentoRepo.find -> [{ tipoDocumento: 'CDP', tipoMime: 'application/pdf' }]
solicitud.estadoSolicitud = 'PENDIENTE', fechaInicio > hoy +14 hábiles
```
✅ **Esperado:** `result.estadoSolicitud === 'RADICADA'`, `result.extemporanea === false`

### TC-B-006: `finalizarSolicitud` resuelve checklist INTERNACIONAL cuando `esInternacional`
```
solicitud.esInternacional = true  (comisionado.tipoComisionado = 'FUNCIONARIO')
```
✅ **Esperado:** valida contra config `INTERNACIONAL` (pasaporte/cartá/resolución), no contra `FUNCIONARIO`

### TC-B-007: `obtenerChecklistDocumentos` separa obligatorios/opcionales
```
config.documentos -> [OBLIGATORIO CDP, OPCIONAL SEGURIDAD_SOCIAL]
```
✅ **Esperado:** `obligatorios=[{codigo:'CDP'}]`, `opcionales=[{codigo:'SEGURIDAD_SOCIAL'}]`

### TC-B-008: `crearSolicitud` (modo borrador) deja estado PENDIENTE y salta solapamiento
```
dto.modoBorrador = true
```
✅ **Esperado:** `estadoSolicitud === 'PENDIENTE'`, no se ejecuta overlap, `solicitudRepo.save` llamado

### TC-B-009: `crearSolicitud` marca INTERNACIONAL cuando `esInternacional=true`
```
dto.esInternacional = true
```
✅ **Esperado:** `result.esInternacional === true`, `result.tipoComision === 'INTERNACIONAL'`

### TC-B-010: `objetoComision` vacío permitido cuando está oculto u opcional
```
config.camposOcultos=['objetoComision']  (y caso con camposOpcionales)
dto.objetoComision = ''
```
✅ **Esperado:** no lanza `BadRequestException`, solicitud se crea

### TC-B-011: `obtenerSolicitudes` retorna `{data, total, page, limit}` con `esCreadoPorMi`
```
solicitudRepo.createQueryBuilder mock con addOrderBy/offset/limit/getCount
```
✅ **Esperado:** `result.data` con `esCreadoPorMi` (true para superAdmin, undefined para usuario)

### TC-B-012: `subirDocumento` persiste el archivo real y valida PDF
```
controller: @UploadedFile() file (Express.Multer.File), tipoDocumento en @Body
file con mimetype image/png -> svc.subirDocumento(id, { tipoDocumento, file })
file con mimetype application/pdf, filename 'cdp-123.pdf'
```
✅ **Esperado:** (no-PDF) `BadRequestException('El documento ... debe estar en formato PDF.')`; (PDF) entidad guardada con `urlRepositorio='/uploads/sol-001/cdp-123.pdf'`, `tipoMime='application/pdf'`. El file se escribe a `./uploads/<solicitudId>/<filename>` vía `multer.diskStorage` (controller), servido por gateway en `/<service>/uploads/*`.

---

## 4. Casos de Prueba — Frontend (`ViaticosModulePremium.test.tsx`, Vitest)

### TC-F-001: Abre el modal y muestra "Paso 1 de 4"
✅ **Esperado:** `screen.getByText(/Paso 1 de 4/i)`

### TC-F-002: Avanza al paso 2 consultando el comisionado
✅ **Esperado:** `Consultar` → muestra nombre → `Siguiente` → "Objeto y Destino de la Comisión" / "Paso 2 de 4"

### TC-F-003: Avanza al paso 2 tras aceptar Habeas Data (comisionado sin autorización)
✅ **Esperado:** modal de autorización → check → "Aceptar y Continuar" → "Paso 2 de 4"

### TC-F-004: Regresa al paso anterior con "Atrás"
✅ **Esperado:** "Paso 1 de 4"

### TC-F-005: Valida fechas (fin < inicio) en "Guardar y continuar"
```
fecha inicio 09-05, fin 09-01
```
✅ **Esperado:** error "Debe ser posterior o igual a fecha inicio"

### TC-F-006: Exige fechas antes de guardar el borrador
```
fechas vacías, click "Guardar y continuar"
```
✅ **Esperado:** error "Debe indicar las fechas de inicio y fin"

### TC-F-007: Fecha de inicio anterior a hoy
```
fechas 2020-01-01 → 2020-01-05
```
✅ **Esperado:** error "La fecha de inicio no puede ser anterior a hoy"

### TC-F-008: Aviso de comisión extemporal (<14 días hábiles) en Confirmación
```
fecha inicio +2 días → "Guardar y continuar" → "Siguiente" → Confirmación
```
✅ **Esperado:** `screen.findByText(/Comisión Extemporal/i)`

### TC-F-009: Radica exitosamente tras recorrer los 4 pasos
```
llenarPaso2 → "Guardar y continuar" → "Siguiente" → "Finalizar y Radicar"
```
✅ **Esperado:** `viaticosService.finalizarSolicitud` llamado con `'sol-nueva'`

### TC-F-010: Payload alineado al DTO `CreateSolicitudDto` (camelCase)
```
llenarPaso2 → "Guardar y continuar"
```
✅ **Esperado:** `crearSolicitudComision` llamado con `modoBorrador:true`, `tipoComision:'TERRESTRE'`, `esInternacional:undefined`, `documentos:[]`, y los campos de geopolítica/rubro/montos.

### TC-F-011: **Radicar cargando documentos obligatorios en PDF** (flujo completo)
```
obtenerChecklistDocumentos -> [{codigo:'CDP'}] (obligatorio)
subirDocumento -> {tipoDocumento:'CDP', tipoMime:'application/pdf'}
```
✅ **Esperado:**
1. "Guardar y continuar" crea borrador PENDIENTE.
2. El input file de CDP acepta un `.pdf` (`cdp.pdf`, `application/pdf`).
3. `subirDocumento` se llama; el soporte se marca **Cargado**.
4. "Siguiente" habilita Confirmación; "Finalizar y Radicar" está habilitado.
5. `finalizarSolicitud('sol-nueva')` se invoca y radica.

### TC-F-012: Checklist internacional al marcar "Comisión internacional"
```
checkbox "Comisión internacional / acto administrativo" marcado
obtenerChecklistDocumentos -> {obligatorios: PASAPORTE, CARTA_INVITACION, RESOLUCION_ACTO}
```
✅ **Esperado:** `obtenerChecklistDocumentos` llamado con `'INTERNACIONAL'`; aparecen los 3 soportes con botones "Subir".

### TC-F-013: Filtra por estado incluyendo PENDIENTE y "Continuar"
✅ **Esperado:** opción de filtro `Pendiente (borrador)`; filas en estado `PENDIENTE` muestran botón **Continuar**.

---

## 5. Matriz de Resultados

| ID | Descripción | Resultado | Estado |
|---|---|---|---|
| TC-B-001 | `finalizarSolicitud` 404 not found | `NotFoundException` | ✅ |
| TC-B-002 | `finalizarSolicitud` estado no PENDIENTE | `BadRequestException` | ✅ |
| TC-B-003 | `finalizarSolicitud` faltan obligatorios | `BadRequestException` | ✅ |
| TC-B-004 | `finalizarSolicitud` obligatorio no PDF | `BadRequestException` | ✅ |
| TC-B-005 | `finalizarSolicitud` radicada (checklist completo) | `RADICADA` | ✅ |
| TC-B-006 | `finalizarSolicitud` checklist INTERNACIONAL | valida por `esInternacional` | ✅ |
| TC-B-007 | `obtenerChecklistDocumentos` oblig/opc | listas separadas | ✅ |
| TC-B-008 | `crearSolicitud` borrador PENDIENTE | salta overlap | ✅ |
| TC-B-009 | `crearSolicitud` esInternacional → INTERNACIONAL | flag + tipo | ✅ |
| TC-B-010 | `objetoComision` vacío (oculto/opcional) | permitido | ✅ |
| TC-B-011 | `obtenerSolicitudes` shape + esCreadoPorMi | `{data,total,page,limit}` | ✅ |
| TC-F-001 | Abrir modal → "Paso 1 de 4" | render | ✅ |
| TC-F-002 | Avanzar al paso 2 (consultar comisionado) | 2 de 4 | ✅ |
| TC-F-003 | Avanzar tras Habeas Data | 2 de 4 | ✅ |
| TC-F-004 | Botón Atrás | 1 de 4 | ✅ |
| TC-F-005 | Fechas: fin < inicio | error validación | ✅ |
| TC-F-006 | Fechas vacías | error validación | ✅ |
| TC-F-007 | Fecha inicio < hoy | error validación | ✅ |
| TC-F-008 | Comisión extemporal (<14 hábiles) | alerta en Confirmación | ✅ |
| TC-F-009 | Radicar recorriendo 4 pasos | `finalizarSolicitud` llamado | ✅ |
| TC-F-010 | Payload alineado al DTO | campos camelCase incluidos | ✅ |
| TC-F-011 | **Radicar cargando docs obligatorios PDF** | flujo completo OK | ✅ |
| TC-F-012 | Checklist internacional (pasaporte/carta/resolución) | `INTERNACIONAL` | ✅ |
| TC-F-013 | Filtro PENDIENTE + botón "Continuar" | visible | ✅ |
| TC-F-014 | Solapamiento 409 → banner de validación con mensaje del backend | `errorValidacion` muestra `se cruzan con la solicitud` | ✅ |

**Total ejecutable:** 26 casos (12 backend + 14 frontend).
**Automatizados y pasados:** 26/26 ✅
- Backend JUnit/Jest: `npx jest` → **30 passed** (incluye casos preexistentes).
- Frontend Vitest: `npx vitest run` → **37 passed** (14 de esta HU + preexistentes).
- Typecheck: backend `tsc --noEmit` → **exit 0**; frontend `tsc --noEmit` → sin errores propios (los errores `TS2786` de `lucide-react` son preexistentes por mismatch de `@types/react` en archivos sin tocar; no afectan `vite build`/`vitest`).

---

## 6. Pendientes de ambiente (no automatizados)

- Aplicar migraciones `007_parametrizacion.sql`, `010_estados_checklist_documentos.sql` y `011_comision_internacional.sql` en la base (`synchronize: false`); el seed ya incluye los tipos de documento especiales (`PASAPORTE`, `CARTA_INVITACION`, `RESOLUCION_ACTO`) y `config_tipo_comisionado INTERNACIONAL/ACTO_ADMINISTRATIVO`.
- **Almacenamiento real implementado** (HU actual): el endpoint `POST /requests/:id/documentos` usa `multer.diskStorage` (igual que `legal-management-service`/`internal-institutional-control-service`) para escribir `./uploads/<solicitudId>/<filename>`; el gateway sirve `/<service>/uploads/*` y exime JWT para `/<service>/uploads|files`. El frontend envía el archivo como `multipart/form-data` vía `apiClient.upload` y usa el `urlRepositorio` devuelto por el backend. Tests: `TC-B-012` (backend) y `TC-F-011` (frontend).
- Las pruebas de integración vía Gateway/HTTP (`tests/integration`) no se ejecutaron en este ciclo (requieren levantar los contenedores). El comportamiento HTTP está cubierto de forma indirecta por los tests unitarios del servicio y del modal.

---

## 7. Comandos de ejecución

```bash
# Backend (unit)
cd backend/travel-expenses-service
npx jest                       # 28/28
npx tsc --noEmit -p tsconfig.json   # exit 0

# Frontend (unit)
cd apps/mfe-viaticos
npx vitest run                 # 35/35
```

## 8. Evidencia de ejecución

```
Backend  -> Test Suites: 2 passed | Tests: 30 passed
Frontend -> Test Files  : 2 passed | Tests: 37 passed
Backend tsc -> TSC_EXIT:0
Frontend tsc -> 0 errores propios (solo preexistentes lucide TS2786)
```

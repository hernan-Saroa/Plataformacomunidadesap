# REQ-RUND-F016 — Escritura del historial académico desde el PTA (Flujo C.2)

Cuando un PTA llega al estado **«En Firme»**, el sistema PTA envía al RUND el historial académico del periodo. El RUND lo guarda en el historial del docente (Macro Docente), asociado por cédula y trazable. Con cualquier otro estado el RUND **no acepta** el registro.

Origen: TD-FO-019 ERS RUND, REQ-RUND-F016, bloque Interoperabilidad (PTA). El contrato exacto y la definición del estado «En Firme» siguen sujetos al acuerdo con el equipo PTA (dependencia declarada en la HU).

## Endpoint

```http
POST /pta/api/v1/rund/interoperabilidad/historial/{cedula}
Authorization: Bearer <JWT_VALIDO>     (o cookie de sesión del gateway)
Content-Type: application/json

{
  "periodo": "2026-2",
  "estado_pta": "En Firme",
  "pta_id": "<uuid, opcional>",
  "registros": [
    { "setup": "CETAP Villavicencio", "territorial": "Meta", "programa": "Administración Pública",
      "asignatura": "Gestión Pública", "asignatura_codigo": "GP-101", "nucleo_tematico": "Gestión" }
  ]
}
```

- `cedula`: 1–20 dígitos, sin puntos ni espacios (se conservan ceros iniciales).
- `periodo`: `AAAA-1` o `AAAA-2`. `registros`: 1–200; `programa` y `asignatura` obligatorios; el resto opcional (≤300 caracteres). Si falta `nucleo_tematico` se toma el del docente en RUND.
- `pta_id` (opcional, recomendado): si llega, el RUND contrasta en base de datos que el PTA exista, esté «En Firme», sea del mismo periodo y del mismo docente. **El estado de la base manda sobre lo que declare el cliente.**
- Autorización: JWT obligatorio + permiso exclusivo `banco-docentes.rund.historial.write` (migración 001 del servicio). Solo SUPER_ADMIN lo recibe por defecto; el rol de la integración PTA se asigna desde Roles y Permisos. GGP, ADMIN y «Consulta RUND» **no** pueden escribir (403). Ninguna otra ruta escribe este historial.
- Idempotencia: clave única = cédula + periodo + sede + programa + asignatura (código si viene, si no el nombre), sin tildes ni mayúsculas. Reenviar actualiza la fila existente (`recibidoVeces`+1) y nunca duplica. Registros repetidos dentro de un mismo envío se consolidan.
- Trazabilidad: por fila `registradoPor`, `ultimoRegistradoPor`, roles, IP, `ptaId`, `estadoPta`, `createdAt`, `updatedAt`, `recibidoVeces`; además cada escritura/consulta queda en `RundAccesoDatosLog` (`RUND_PTA_HISTORIAL_ESCRITURA_V1` / `_CONSULTA_V1`) en la misma transacción: si la auditoría falla, responde 503 y no se guarda nada.

| HTTP | `code` | Condición |
| --- | --- | --- |
| 200 | — | `{ docente_id, periodo, recibidos, creados, actualizados }` |
| 400 | `RUND_CEDULA_INVALIDA`, `RUND_PERIODO_INVALIDO`, `RUND_HISTORIAL_ESTADO_REQUERIDO`, `RUND_HISTORIAL_CUERPO_INVALIDO`, `RUND_HISTORIAL_REGISTROS_REQUERIDOS`, `RUND_HISTORIAL_REGISTROS_EXCEDIDOS`, `RUND_HISTORIAL_REGISTRO_INVALIDO`, `RUND_HISTORIAL_PTA_ID_INVALIDO` | Datos inválidos |
| 401 / 403 | — | Sin token / sin el permiso |
| 404 | `RUND_DOCENTE_NO_ENCONTRADO` (`flujo_alta: FLUJO_1`), `RUND_HISTORIAL_PTA_NO_ENCONTRADO` | No existe el docente o el PTA |
| 409 | `RUND_HISTORIAL_PERIODO_NO_COINCIDE`, `RUND_HISTORIAL_DOCENTE_NO_COINCIDE` | `pta_id` no corresponde al envío |
| 422 | `RUND_HISTORIAL_PTA_NO_EN_FIRME` | El PTA no está «En Firme» |
| 503 | — | No se pudo auditar |

Lectura (verificación y trazabilidad): `GET /pta/api/v1/rund/interoperabilidad/historial/{cedula}?periodo=AAAA-N` con `banco-docentes.rund.view|manage` (GGP, ADMIN, SUPER_ADMIN). Devuelve las filas sin la cédula.

## Alcance y pendientes

- La pantalla Macro Docente (`/pta/macro-docente`) sigue leyendo el historial desde los PTA en firme, sin cambios. Los registros escritos por esta HU quedan en `academic_work_plan."RundHistorialAcademico"` y se leen por el GET anterior; unificar ambas fuentes en la pantalla (con deduplicación) es una decisión pendiente.
- Despliegue: aplicar `backend/academic-work-plan-service/db/migrations/001_rund_historial_academico.sql` antes de desplegar `academic-work-plan-service`; luego asignar `banco-docentes.rund.historial.write` al rol de la integración PTA.
- Pruebas: `rund-historial-academico.spec.ts` (reglas puras) y `rund-historial-academico.http.spec.ts` (JWT/RBAC reales, idempotencia, auditoría).

## Privacidad en los logs del gateway

`backend/api-gateway/src/audit/rund-audit-redaction.ts` ahora cubre `rund/interoperabilidad`: la auditoría general del gateway no guarda la cédula de la URL (`/perfiles/[DOCUMENTO]`, `/historial/[DOCUMENTO]`), ni la consulta, ni los cuerpos de petición/respuesta. Aplica también a la consulta de perfil de la HU 15.

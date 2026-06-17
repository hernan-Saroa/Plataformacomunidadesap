mi repo# Plan de Trazabilidad de Correos — Centro de Comunicaciones ESAP

> **Propósito**: Este documento sirve como guía completa para cualquier agente o desarrollador que necesite entender, continuar o depurar el sistema de trazabilidad de correos del módulo de Gestión Legal.

---

## 1. Contexto del Problema

El módulo de **Gestión Legal** tiene un submódulo llamado **Centro de Comunicaciones** que permite a los abogados de la Oficina Jurídica de la ESAP enviar, recibir, responder y reenviar correos electrónicos mediante la integración con **Microsoft Graph API** (correo institucional Outlook/Exchange).

Cada correo puede estar **vinculado a un expediente judicial o disciplinario**, y dentro del expediente hay un tab de **Timeline** que muestra el historial de acciones sobre ese correo.

### Problema original
Cuando un abogado envía un correo desde la plataforma, **no hay forma de saber**:
1. Si el correo fue abierto/leído por el destinatario
2. Si el destinatario abrió o descargó algún documento adjunto
3. No existía un flujo automático `ENVIADO → RECIBIDO → LEÍDO → DOCUMENTO_ABIERTO`

### Objetivo
Implementar un sistema de trazabilidad completo que registre automáticamente estos eventos en el Timeline del correo, tanto para **usuarios internos de la plataforma** (Etapa 1) como para **destinatarios externos** vía tracking pixel y links con token (Etapa 2).

---

## 2. Arquitectura Existente (Pre-implementación)

### Entidades clave (TypeORM)
| Entidad | Tabla | Archivo |
|---|---|---|
| `CorreoJuridico` | `legal_management.correos_juridicos` | `entities/correo-juridico.entity.ts` |
| `AdjuntoCorreo` | `legal_management.adjuntos_correo` | `entities/adjunto-correo.entity.ts` |
| `CorreoJuridicoHistorial` | `legal_management.correo_juridico_historial` | `entities/correo-juridico-historial.entity.ts` |

### Servicio principal
- **Archivo**: `backend/legal-management-service/src/services/correos-juridicos.service.ts`
- **Métodos relevantes**:
  - `sendEmail()` → Envía correo vía Graph API y guarda registro en DB
  - `replyEmail()` → Responde a un correo manteniendo el hilo
  - `forwardEmail()` → Reenvía un correo
  - `markAsRead()` → Marca como leído (DB + Graph)
  - `downloadAttachment()` → Descarga adjunto desde Graph (con caché local)
  - `registrarAccion()` → Guarda un evento en `correo_juridico_historial`
  - `getHistorial()` → Obtiene todos los eventos del historial de un correo

### Controlador
- **Archivo**: `backend/legal-management-service/src/controllers/correos-juridicos.controller.ts`

### Frontend
- **Modal del correo**: `apps/mfe-gestion-legal/src/components/modulos/ModalExpedienteComunicacion.tsx`
  - Tab "Timeline" (L724): Consume `correosJuridicosService.getHistorial(id)` y renderiza los eventos
  - Colores por tipo de evento (L196-203)

### Servicio frontend
- **Archivo**: `apps/services/api/legal.service.ts`
  - Clase `CorreosJuridicosServiceAPI` con métodos `getHistorial()`, `downloadAdjunto()`, etc.

---

## 3. Plan de Implementación

### Etapa 1: Tracking Interno (usuarios de la plataforma)

| # | Cambio | Archivo | Detalle |
|---|---|---|---|
| 1.1 | Registrar `ENVIADO` automáticamente | `correos-juridicos.service.ts` | En `sendEmail()`, `replyEmail()`, `forwardEmail()` |
| 1.2 | Registrar `DOCUMENTO_ABIERTO` | `correos-juridicos.service.ts` | Nuevo método + llamada en `downloadAttachment()` |
| 1.3 | Pasar usuario real al historial | `correos-juridicos.controller.ts` | Extraer usuario del JWT/Request en endpoints |
| 1.4 | Nuevos colores en Timeline UI | `ModalExpedienteComunicacion.tsx` | Agregar ENVIADO, DOCUMENTO_ABIERTO, CORREO_ABIERTO_EXTERNO, DOCUMENTO_ABIERTO_EXTERNO |

### Etapa 2: Tracking Externo (pixel + links con token)

| # | Cambio | Archivo | Detalle |
|---|---|---|---|
| 2.1 | Nueva entidad `CorreoTrackingToken` | `entities/correo-tracking-token.entity.ts` | Tabla para tokens de tracking |
| 2.2 | Migración SQL | Manual / TypeORM sync | Crear tabla `correo_tracking_tokens` |
| 2.3 | Inyectar pixel en correos enviados | `correos-juridicos.service.ts` | Modificar `sendEmail()`, `replyEmail()`, `forwardEmail()` |
| 2.4 | Convertir adjuntos a links trackeados | `correos-juridicos.service.ts` | En lugar de adjuntar inline, generar links con token |
| 2.5 | Endpoints de tracking | `correos-juridicos.controller.ts` | `GET /track/open/:token` y `GET /track/download/:token` |
| 2.6 | Registrar en AppModule | `app.module.ts` | Agregar nueva entidad al TypeORM |

---

## 4. Decisiones de Diseño

- **Todos los adjuntos** enviados se convierten a links con tracking, no solo los pesados
- **Aplica para todo tipo de correo**: envío directo, RE: (respuesta) y RV: (reenvío)
- El tracking pixel es "best effort" — muchos clientes bloquean imágenes remotas
- Los tokens de tracking son **UUID v4** para evitar adivinación
- El endpoint de tracking pixel retorna una imagen GIF 1x1 transparente con cache-control: no-store
- La tabla de tokens tiene campos para IP y User-Agent con fines de auditoría

---

## 5. Archivos Tocados (Post-implementación)

## 5. Archivos Tocados (Post-implementación) — ✅ COMPLETADO

### Archivos creados
- [x] `backend/legal-management-service/src/entities/correo-tracking-token.entity.ts`
  - Entidad TypeORM para la tabla `correo_tracking_tokens` (schema `legal_management`)
  - Campos: id, correoId, adjuntoId, token (UUID), tipo (OPEN_PIXEL | DOWNLOAD_LINK), abierto, fechaApertura, ipApertura, userAgent, destinatarioEmail
- [x] `db/migrations/229_create_correo_tracking_tokens.sql`
  - **Migración SQL manual** — debe ejecutarse antes de levantar el backend
  - Crea tabla, FKs (CASCADE a correos_juridicos, SET NULL a adjuntos_correo), índices y CHECK constraint

### Archivos modificados

#### `backend/legal-management-service/src/app.module.ts`
- Import de `CorreoTrackingToken` 
- Registro en `TypeOrmModule.forFeature([...])` (la tabla se crea automáticamente por TypeORM sync)

#### `backend/legal-management-service/src/services/correos-juridicos.service.ts`
- **Imports añadidos**: `CorreoTrackingToken`, `randomUUID` de crypto
- **Constructor**: Inyección de `trackingRepo: Repository<CorreoTrackingToken>`
- **`sendEmail()`**: Ahora llama `registrarAccion(ENVIADO)` y `injectTrackingIntoEmail()`
- **`replyEmail()`**: Ahora llama `registrarAccion(ENVIADO)` y `injectTrackingIntoEmail()`
- **`forwardEmail()`**: Ahora llama `registrarAccion(ENVIADO)` y `injectTrackingIntoEmail()`
- **`downloadAttachment()`**: Ahora llama `registrarAccion(DOCUMENTO_ABIERTO)` fire-and-forget
- **NUEVO `injectTrackingIntoEmail()`** (privado): Crea token de pixel + tokens por cada adjunto, inyecta HTML con pixel invisible y links trackeados, guarda HTML actualizado en DB
- **NUEVO `processTrackingPixel()`**: Procesa apertura de pixel → registra `CORREO_ABIERTO_EXTERNO` (solo primera vez)
- **NUEVO `processTrackingDownload()`**: Procesa descarga trackeada → registra `DOCUMENTO_ABIERTO_EXTERNO` + sirve el archivo

#### `backend/legal-management-service/src/controllers/correos-juridicos.controller.ts`
- **NUEVO `GET /correos/track/open/:token`**: Retorna GIF 1x1 transparente + registra apertura
- **NUEVO `GET /correos/track/download/:token`**: Sirve el adjunto + registra descarga

#### `apps/mfe-gestion-legal/src/components/modulos/ModalExpedienteComunicacion.tsx`
- **Timeline color mapping**: Agregados 4 nuevos tipos de evento:
  - `ENVIADO` → `#003DA5` (azul corporativo ESAP)
  - `DOCUMENTO_ABIERTO` → `#7C3AED` (violeta)
  - `CORREO_ABIERTO_EXTERNO` → `#059669` (esmeralda)
  - `DOCUMENTO_ABIERTO_EXTERNO` → `#D946EF` (fucsia)
  - `CLASIFICADO_MANUAL` → `#6366F1` (índigo)

### Catálogo completo de eventos del Timeline

| Evento | Cuándo se dispara | Color |
|---|---|---|
| `RECIBIDO` | Correo sincronizado desde Graph | Azul `#2563EB` |
| `ENVIADO` | Correo/Respuesta/Reenvío guardado | Azul ESAP `#003DA5` |
| `LEIDO` | Usuario marca como leído en plataforma | Verde `#10B981` |
| `DOCUMENTO_ABIERTO` | Usuario descarga adjunto en plataforma | Violeta `#7C3AED` |
| `CORREO_ABIERTO_EXTERNO` | Tracking pixel cargado por destinatario | Esmeralda `#059669` |
| `DOCUMENTO_ABIERTO_EXTERNO` | Link de descarga clickeado por externo | Fucsia `#D946EF` |
| `ARCHIVADO` | Correo archivado | Púrpura `#8B5CF6` |
| `DESARCHIVADO` | Correo restaurado | Amarillo `#F59E0B` |
| `RESPONDIDO` | Respuesta enviada | Cielo `#0284C7` |
| `REENVIADO` | Reenvío ejecutado | Naranja `#F97316` |
| `ASOCIADO_PROCESO` | Correo vinculado a expediente | Rosa `#E11D48` |
| `CLASIFICADO_MANUAL` | Clasificación manual del correo | Índigo `#6366F1` |

---

## 6. Cómo Probar

1. **Etapa 1**: Enviar correo → ver Timeline → debe mostrar "ENVIADO". Abrir correo → "LEÍDO". Descargar adjunto → "DOCUMENTO_ABIERTO"
2. **Etapa 2**: Enviar correo a email externo → abrir desde Gmail → Timeline debe mostrar "CORREO_ABIERTO_EXTERNO". Clic en link de documento → "DOCUMENTO_ABIERTO_EXTERNO"

---

## 7. Riesgos y Limitaciones

- **Pixel de tracking**: Gmail y Outlook empresarial frecuentemente proxy-an las imágenes, lo cual puede generar una sola apertura en vez de múltiples, o reportar la apertura del proxy en lugar del usuario
- **Links de descarga**: Requiere que la URL de la plataforma sea accesible desde internet (en producción). En desarrollo local no funcionará para tracking externo real
- **Privacidad**: El tracking externo debe ser documentado en los términos de uso de la plataforma

---

## 8. Notas para Otros Agentes

- **TypeORM synchronize es FALSE**: La tabla `correo_tracking_tokens` se crea ejecutando la migración `db/migrations/229_create_correo_tracking_tokens.sql` manualmente. **Nunca** usar synchronize:true. Todas las migraciones van en `db/migrations/` con numeración secuencial.
- **No se tocó el frontend service** (`legal.service.ts`): Los nuevos endpoints de tracking son públicos (los consume el cliente de correo del destinatario, no el frontend SPA). El frontend ya consume `getHistorial()` que automáticamente trae los nuevos eventos.
- **El tracking pixel se inyecta en el HTML guardado en DB**, no en lo que se envía vía Graph. Es decir, el correo real enviado NO tiene el pixel — el pixel apunta a la plataforma y solo funciona si el HTML fue procesado correctamente por el servicio `sendEmail`.
- **Para que el tracking externo funcione en producción**, la variable `API_GATEWAY_URL` debe apuntar a la URL pública del backend (ej: `https://plataforma.esap.edu.co`).


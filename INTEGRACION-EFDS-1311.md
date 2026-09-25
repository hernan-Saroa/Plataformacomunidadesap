# EFDS-1311 — Integración de paz y salvo

## Reporte de entrega — 25 de septiembre de 2026

**Estado: implementación y verificaciones entregadas; habilitación del rol de coordinación pendiente de respuesta de Tomás.** No se presenta como cierre funcional con un usuario real de coordinación.

| Subtarea | Veredicto verificado | Trabajo entregado | Horas reales | Commit |
| --- | --- | --- | --- | --- |
| Entorno | No existía el worktree | Rama y worktree aislados; puerto 3111; dependencias instaladas | No cronometradas por subtarea | Este commit |
| Pendientes | No existía | Consulta única C-1/C-4, exportada para EFDS-1286 | No cronometradas por subtarea | Este commit |
| Modelo y migraciones | No existía | Modelo tipado, tablas de documentos/eventos, migraciones 460–462 | No cronometradas por subtarea | Este commit |
| PDF | Parcial: existía patrón visual inline | Generador propio autorizado sin editar el servicio central | No cronometradas por subtarea | Este commit |
| OTP | Parcial: existía sin contexto | Contexto opcional, compatibilidad, separación de recuperación y consumo atómico | No cronometradas por subtarea | Este commit |
| Consulta/descarga/UI | No existía | API protegida, registro persistente, descarga e interfaz; rol real por confirmar | No cronometradas por subtarea | Este commit |
| Pruebas/integración | No existían para esta HU | Unitarias, DB, canario, Chromium y guía con diff de integración | No cronometradas por subtarea | Este commit |

- ✅ **Línea base:** 12 fallas, 426 pasan, 17 omitidas. Backend completo después de integrar 1310: las mismas 12 fallas, 433 pasan, 42 omitidas (incluye suites DB que se ejecutan aparte).
- ✅ **Pruebas propias: 26/26:** 9 OTP/auth, 7 permisos/cliente OTP, 7 PostgreSQL real y 3 UI. Repetidas después de incorporar EFDS-1310.
- ✅ **Canario:** todas las personas con pendientes de la base rechazan la emisión; dos personas pendientes al verificar. LEGALIZADO no bloquea.
- ✅ **Navegador:** los tres AC y ambos estados bloqueantes pasan en Chromium. Persistencia comprobada después de recargar. **Alcance limitado:** usuario ficticio con permiso explícito, correo interceptado y lectura del usuario sin relaciones por columna faltante en el esquema local. Falta validar con el rol real y auth sin adaptación.
- ✅ **Build:** auth-service y travel-expenses-service compilan.
- ✅ **TypeScript frontend ejecutado:** falla con 748 diagnósticos en archivos ajenos al módulo nuevo; ninguno menciona `paz-y-salvo`/`pazYSalvo`. No se declara aprobado el chequeo global.
- ✅ **Integración de etapa 9:** `git merge origin/feature/viaticos-etapa9` por avance rápido hasta `6ce82a5d2`, que incluye EFDS-1310. Pruebas propias y suite backend repetidas.
- ✅ **Archivos compartidos:** restaurados antes del commit. Sus líneas de integración se entregan abajo. `travel-expenses.service.ts` no se editó.
- ⚠️ **Horas:** no hubo cronómetro por subtarea; no se presentan estimaciones como horas reales.

### Desviaciones y asuntos pendientes

1. PDF propio siguiendo el patrón visual y cambios aditivos en auth, autorizados expresamente por Tomás.
2. Worktree y rama creados por Codex porque todavía no existían.
3. Falta configurar el rol real de coordinación: pregunta enviada, sin respuesta al preparar esta entrega. La migración 462 crea únicamente el permiso.
4. Esquema local de auth incompleto (`auth.personas.id_dependencia`); no se ejecutaron migraciones ajenas. Prueba de navegador adaptada solo para el fixture. El flujo productivo habitual de auth requiere corregir ese esquema antes de validarse localmente sin adaptación.
5. Endpoint interno de OTP sin `/auth`, a diferencia del texto del plan; se verificó en el controlador existente.
6. Configuración de modalidad ausente bloquea emisión por precaución; se documenta la interpretación fail-closed de C-1.
7. Al iniciar una vez el servicio completo se activó el barrido de 1309 sobre los dos casos pendientes del fixture; se restauró únicamente 9003 a PAGADA y se continuó con servidor aislado sin cron.
8. El almacenamiento privado es hermano del directorio configurado, para impedir que `main.ts` lo exponga públicamente mediante `/uploads`; requiere volumen persistente explícito.

**Pregunta pendiente:** ¿el permiso corresponde a CONTROL_VIATICOS o a un rol específico de coordinación? No asignar un rol por deducción.

## Decisiones autorizadas por Tomás

- El PDF del paz y salvo replica el patrón visual existente en lugar de reutilizar código compartido, para no tocar `travel-expenses.service.ts` mientras Juan Pablo trabaja ahí. Usa PDFKit, cabecera institucional, colores y tipografía del generador existente.
- OTP aditivo: `context` opcional en request/verify, columna nullable `auth.user.signature_otp_context` en la misma tabla. No cambia generación aleatoria ni expiración; no crea una tabla de OTP. Los consumidores sin contexto conservan su contrato. Los códigos con contexto no sirven para recuperación de contraseña ni para otros documentos.
- La verificación del OTP sucede entre servidores; el navegador solo entrega el código. Contexto: `paz-y-salvo:<uuid>:<sha256 del contenido>`. Consumo atómico para impedir verificaciones concurrentes exitosas.

## Orden de despliegue

1. Aplicar exclusivamente `backend/travel-expenses-service/db/migrations/460_contexto_firma_otp.sql`, `461_paz_y_salvo.sql` y `462_permiso_paz_y_salvo.sql`. La 460 afecta al esquema auth y debe preceder al despliegue de auth-service. La 462 registra el permiso en el módulo `viaticos` sin asignarlo a roles.
2. Desplegar auth-service con los cambios aditivos. Todos sus procesos deben estar actualizados antes de habilitar EFDS-1311.
3. Aplicar los cambios locales de integración indicados abajo a app.module.ts y al MFE real. No se incluyen en el commit por el contrato de propiedad.
4. Configurar `AUTH_SERVICE_URL` con la URL interna de auth-service. Predeterminado local: `http://localhost:3001`. El controlador interno atiende `/signature-otp/request|verify` (sin `/auth`); el prefijo de servicio corresponde al gateway.
5. Dar escritura al servicio en el directorio hermano `<TRAVEL_EXPENSES_STORAGE_PATH>-private/paz-y-salvo`. Si no se configura almacenamiento, se usa `uploads-private/paz-y-salvo`. Montar este directorio en un volumen persistente y respaldarlo junto con la base. No servirlo como estático: la descarga exige JWT y permiso.
6. Asignar `travel_expenses:paz_y_salvo.manage` al rol de coordinación confirmado por Tomás. **Pendiente confirmar el código del rol**; no se concede automáticamente a analistas, enlaces ni a CONTROL_VIATICOS. Como los JWT actuales llevan roles y no permisos, añadir ese permiso al fallback del rol confirmado en `permissions.guard.ts` (cambio local para probar, integración por Claude). La UI debe reconocer el mismo rol además del permiso si el payload frontend no lo incluye. Esto queda pendiente de la respuesta y no debe inferirse.

## Contratos e implementación

- C-4 intacto: `PendientesService.tieneLegalizacionesPendientes(idComisionado)`; exportado desde `PazYSalvoModule` para EFDS-1286.
- C-1: PAGADA/PENDIENTE_LEGALIZACION con configuración activa; LEGALIZADO no bloquea. Configuración ausente bloquea por precaución. Modalidad explícitamente inactiva no aplica.
- Persistencia SQL parametrizada y modelos tipados en `paz-y-salvo.model.ts`; sin entidades adicionales en el registro TypeORM.
- La certificación es histórica, a fecha de emisión. No promete vigencia indefinida frente a comisiones posteriores.
- Antes de emitir, se vuelve a consultar C-1 dentro de una transacción con bloqueos SHARE breves sobre solicitudes y configuración. No mantiene bloqueos durante la llamada OTP ni la generación/escritura del PDF. El bloqueo evita pagos o inserciones entre comprobación y commit; timeout de cinco segundos.
- Firma pendiente se representa con `firmado_en IS NULL` en el documento, sin agregar estados a las comisiones.
- Eventos persistidos: solicitud, solicitud OTP, firma verificada, consulta y descarga. Se conserva evidencia devuelta por auth, usuario, fechas y hash del archivo.
- PDF fuera del expediente. Se valida SHA-256 antes de descargar. Un fallo después de consumir OTP requiere solicitar otro; no publica documentos parciales.

## Rutas

Base del gateway: `/viaticos/api/v1/paz-y-salvos`.

| Método | Ruta | Uso |
| --- | --- | --- |
| GET | `/personas?q=` | Buscar comisionado por nombre/documento |
| GET | `/personas/:id` | Pendientes y documentos persistidos |
| POST | `/` | Preparar documento; body `{ comisionadoId }` |
| GET | `/:id` | Documento y trazabilidad |
| POST | `/:id/otp` | Solicitar código al correo del usuario autenticado |
| POST | `/:id/firmar` | Verificar y emitir; body `{ code }` |
| GET | `/:id/archivo` | Descargar PDF con `Accept: application/pdf` |

Todas exigen `travel_expenses:paz_y_salvo.manage`; UUID validados, rutas literales primero.

## Verificación reproducible

- Fixture de desarrollo: `backend/travel-expenses-service/db/dev-fixtures/fixture_paz_y_salvo_9001.sql`. Tres personas distintas y COM-2026-9001/9002/9003. No modifica COM-2026-0001.
- En auth-service: `npx jest src/auth/signature-otp-context.spec.ts --runInBand --verbose`.
- En travel-expenses-service (PowerShell): `$env:RUN_DB_TESTS='1'; npx jest src/modules/paz-y-salvo/paz-y-salvo.db.spec.ts --runInBand --verbose`.
- En mfe-viaticos: `npx vitest run src/components/paz-y-salvo/PazYSalvoCoordinadora.test.tsx --reporter=verbose`.
- Canario: recorre todos los comisionados de la base y comprueba que cada persona pendiente no puede iniciar una emisión. No modifica sus comisiones.
- Navegador: compilar auth y travel; ejecutar en terminales separadas los scripts `src/modules/paz-y-salvo/dev/servidor-auth.cjs`, `src/modules/paz-y-salvo/dev/servidor-viaticos.cjs` desde travel, y `src/components/paz-y-salvo/dev-server.mjs` desde el MFE. Ejecutar `src/modules/paz-y-salvo/dev/verificar-navegador.cjs` desde travel. Puertos 3112/3111/3117. OTP, persistencia y PDF reales. Se intercepta el correo del usuario ficticio `efds1311-coordinadora@example.invalid` y se carga ese usuario sin relaciones: la base local carece de `auth.personas.id_dependencia`, que necesita el findById habitual. Esta adaptación SOLO está en el runner, no en el servicio productivo. El usuario de prueba no tiene contraseña utilizable ni roles asignados. Los scripts usan un JWT local con permiso explícito, de corta duración, y nunca lo imprimen. No valida todavía el fallback del rol real de coordinación ni entrega SMTP. Artefactos y PDFs locales quedan en `.cache/efds1311`.
- No arrancar el servicio completo para el fixture: su cron de EFDS-1309 puede llevar 9003 de PAGADA a PENDIENTE_LEGALIZACION. En el primer arranque ocurrió y se restauró exclusivamente 9003; el log reportó dos aperturas, ambas del fixture. Las pruebas finales usaron un servidor aislado sin cron. No se corrieron migraciones ajenas ni se modificó COM-2026-0001.

## Cambios de integración no incluidos en los archivos compartidos

El siguiente diff contiene las líneas de montaje del backend y del MFE. Adaptar el contexto al merge de EFDS-1310, conservando su sección de revisión.

```diff
diff --git a/apps/mfe-viaticos/src/components/ViaticosModulePremium.tsx b/apps/mfe-viaticos/src/components/ViaticosModulePremium.tsx
index f92863551..892da67e1 100644
--- a/apps/mfe-viaticos/src/components/ViaticosModulePremium.tsx
+++ b/apps/mfe-viaticos/src/components/ViaticosModulePremium.tsx
@@ -47,6 +47,7 @@ import AutorizacionDireccionInbox from './AutorizacionDireccionInbox';
 import CancelarComisionModal from './CancelarComisionModal';
 import PresupuestoInbox from './PresupuestoInbox';
 import LegalizacionesSeccion from './LegalizacionesSeccion';
+import PazYSalvoCoordinadora from './paz-y-salvo/PazYSalvoCoordinadora';
 import VistaAnalistaViaticos from './VistaAnalistaViaticos';
 import ProcesarPagoModal from './ProcesarPagoModal';
 import { ModuleLayout, MenuGroup } from '../shared/ModuleLayout';
@@ -88,7 +89,7 @@ const Permissions = {
   VIATICOS_CONFIG_MANAGE: 'travel_expenses:manage_config',
 } as const;

-type Seccion = 'solicitudes' | 'tiquetes' | 'legalizaciones' | 'resoluciones' | 'configuracion' | 'mis-solicitudes' | 'autorizaciones' | 'autorizaciones-direccion' | 'presupuesto' | 'tesoreria' | 'sst';
+type Seccion = 'paz-y-salvo' | 'solicitudes' | 'tiquetes' | 'legalizaciones' | 'resoluciones' | 'configuracion' | 'mis-solicitudes' | 'autorizaciones' | 'autorizaciones-direccion' | 'presupuesto' | 'tesoreria' | 'sst';

 const ORDEN_ESTADOS_TABLA: Record<string, number> = {
   OBLIGADA: 1,
@@ -213,6 +214,10 @@ export default function ViaticosModulePremium() {
           icon: <Receipt className="w-5 h-5" />,
           color: '#D97706',
         },
+        {
+          id: 'paz-y-salvo', label: 'Paz y salvo', subtitle: 'Certificación y firma de Viáticos',
+          icon: <FileCheck className="w-5 h-5" />, color: '#003DA5',
+        },
         {
           id: 'resoluciones',
           label: 'Resoluciones Institucionales',
@@ -647,6 +652,7 @@ export default function ViaticosModulePremium() {
      authService.hasPermission('travel_expenses:reject_extemporaneous');

   const puedeCancelarComision = authService.canCancelarComision();
+  const puedeEmitirPazYSalvo = esSuperAdmin || authService.hasPermission('travel_expenses:paz_y_salvo.manage');
   const puedeVerPresupuesto =
     !tieneContextoAuth ||
     esSuperAdmin ||
@@ -684,6 +690,7 @@ export default function ViaticosModulePremium() {
         if (item.id === 'mis-solicitudes') return puedeVerSolicitudesAsignadas;
         if (item.id === 'tiquetes') return puedeVerTiquetes;
         if (item.id === 'legalizaciones') return puedeVerLegalizaciones;
+        if (item.id === 'paz-y-salvo') return puedeEmitirPazYSalvo;
         if (item.id === 'resoluciones') return puedeVerResoluciones;
         if (item.id === 'autorizaciones') return puedeVerAutorizaciones;
         if (item.id === 'autorizaciones-direccion') return puedeVerAutorizacionesDireccion;
@@ -1536,6 +1543,9 @@ export default function ViaticosModulePremium() {
            {seccion === 'legalizaciones' && puedeVerLegalizaciones && (
              <LegalizacionesSeccion />
           )}
+           {seccion === 'paz-y-salvo' && puedeEmitirPazYSalvo && (
+             <PazYSalvoCoordinadora />
+          )}

             {/* ── RESOLUCIONES ── */}
             {seccion === 'resoluciones' && puedeVerResoluciones && (
diff --git a/backend/travel-expenses-service/src/app.module.ts b/backend/travel-expenses-service/src/app.module.ts
index c1640b2b3..0d8e4d80b 100644
--- a/backend/travel-expenses-service/src/app.module.ts
+++ b/backend/travel-expenses-service/src/app.module.ts
@@ -35,6 +35,7 @@ import { TicketsModule } from './modules/tickets/tickets.module';
 import { ConsolidacionModule } from './modules/consolidacion/consolidacion.module';
 import { CommonModule } from './common/common.module';
 import { LegalizacionModule, LEGALIZACION_ENTITIES } from './modules/legalizacion/legalizacion.module';
+import { PazYSalvoModule } from './modules/paz-y-salvo/paz-y-salvo.module';

 @Module({
   imports: [
@@ -83,6 +84,7 @@ import { LegalizacionModule, LEGALIZACION_ENTITIES } from './modules/legalizacio
     NotificationsModule,
     CommonModule,
     LegalizacionModule,
+    PazYSalvoModule,
   ],
   controllers: [AppController],
   providers: [
```

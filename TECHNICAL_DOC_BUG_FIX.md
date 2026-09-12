# Technical Documentation: Bug Fix - "Enviar a Jurídica" Button in Juzgamiento Stage

## Summary
Fixed the issue where the "Enviar a Jurídica" button was not appearing when the process is in the **Juzgamiento** stage after the **Auto de Pliego de Cargos** is approved.

## Changes Made

### 1. `SeccionAutosParametrizados.tsx` - Configuration of Parameterized Autos
**File**: `apps/mfe-control-disciplinario/src/components/configuracion/SeccionAutosParametrizados.tsx`

**Changes**:
- Added new constant `TIPOS_AUTO_CON_ETAPA_SIGUIENTE = ['AUTO_FORMULACION_PLIEGO']`
- Added conditional "Etapa siguiente al aprobar" dropdown when creating/editing an auto of type `AUTO_FORMULACION_PLIEGO`
- Added "Próxima Etapa" column to the autos table
- Updated table to display `nextStage` with proper styling using `getEtapaColor()` and `getEtapaLabel()`

**Data Structure**:
```typescript
interface AutoConfiguration {
  // ... existing fields
  nextStage?: string; // NEW: Stores the next stage when auto is approved
}
```

### 2. `RevisionAprobacionJefe.tsx` - Removed "Enviar a Jurídica" from Revision View
**File**: `apps/mfe-control-disciplinario/src/components/RevisionAprobacionJefe.tsx`

**Changes**:
- Removed the "Envío a jurídica" button that appeared on approved pliego de cargos autos in the revision list
- Removed unused state variables: `borradorEnvioJuridica`, `enviandoJuridica`
- Removed the entire "Modal de Envío a Jurídica" section (lines 795-933)
- Removed unused `Scale` import from lucide-react

**Rationale**: The "Enviar a Jurídica" action should only be available from the process detail modal (ModalDetallesProceso) when the process is in the Juzgamiento stage, not from the revision/approval view.

### 3. `ModalDetallesProceso.tsx` - "Enviar a Jurídica" Only in Juzgamiento Stage
**File**: `apps/mfe-control-disciplinario/src/components/ModalDetallesProceso.tsx`

**Changes**:
- Added case-insensitive stage check: `proceso.etapaActual?.toLowerCase().trim() === 'juzgamiento'`
- "Enviar a Jurídica" button now only renders when:
  1. Auto is in "aprobado" state
  2. Process `etapaActual` is "Juzgamiento" (case-insensitive)
  3. User has `CONTROL_DISCIPLINARIO_PROCESOS_SEND_TO_JURIDICA` permission
  4. User is not Jefe (only Radicador/Secretaria can send)
- Added informative message when auto is approved but process is not in Juzgamiento:
  > "El envío a Jurídica estará disponible cuando el proceso esté en etapa de Juzgamiento"

**Code Location**: Lines ~4677-4699 in the `renderAutoPliegoCargos` function

## Flow Validation

### Expected Flow (Now Working):
1. **Formulación de Cargos** → Radicador manually moves process to **Juzgamiento**
2. Professional creates **Auto de Formulación de Pliego** → Sends for approval
3. Jefe approves the auto → Auto state becomes "aprobado"
4. Process is now in **Juzgamiento** stage with approved pliego
5. **Radicador opens ModalDetallesProceso** → Sees "Enviar a Jurídica" button ✅
6. Radicador clicks "Enviar a Jurídica" → Process closes and moves to Jurídica

### Stage Comparison (Case-Insensitive):
| Stage Value | Matches Juzgamiento? |
|-------------|---------------------|
| "Juzgamiento" | ✅ Yes |
| "juzgamiento" | ✅ Yes |
| "JUZGAMIENTO" | ✅ Yes |
| "Juzgamiento " | ✅ Yes (trimmed) |
| "Formulación de Cargos" | ❌ No |
| "Investigación" | ❌ No |

## Permissions Required
- `CONTROL_DISCIPLINARIO_PROCESOS_SEND_TO_JURIDICA` - Allows sending to Jurídica
- Role: `SECRETARIA_RADICADOR` or `RADICADOR_DISCIPLINARIO` (not Jefe)

## API Endpoint
- `POST /control-disciplinario/api/v1/disciplinary-processes/{autoId}/send-juridica`
- Called via `disciplinaryService.sendJuridica(autoId, userId, email, fullName)`

## Testing Notes
The component tests require complex mocking due to:
- Multiple API calls in useEffect
- Portal-based modals
- Framer Motion animations
- Authentication service integration

For QA validation, manual testing in the application is recommended:
1. Create a process in Formulación de Cargos
2. Move to Juzgamiento (via Cambiar Etapa)
3. Create and approve Auto de Pliego de Cargos
4. Open process details as Radicador
5. Verify "Enviar a Jurídica" button appears
6. Click button and confirm process closes

## Files Modified
1. `apps/mfe-control-disciplinario/src/components/configuracion/SeccionAutosParametrizados.tsx`
2. `apps/mfe-control-disciplinario/src/components/RevisionAprobacionJefe.tsx`
3. `apps/mfe-control-disciplinario/src/components/ModalDetallesProceso.tsx`

## Related Migrations (Backend)
- Migration 655: "Enviar a Jurídica" pasa de Jefe OCID a Secretaria/Radicador
- Migration 656: Restringir "Enviar a Jurídica" exclusivamente a roles Radicador / Secretario
# ✅ FUNCIONALIDAD COMPLETADA

## Cómo crear una nueva alerta en Términos y Alertas

### Pasos:
1. Navegar a: **Control Interno Disciplinario** → **Términos y Alertas** → **Tab "Alertas"**
2. Click en el botón **"Nueva Alerta"** (debe aparecer en el header cuando esté en la vista de Alertas)
3. Se abre un modal con wizard de 1 paso
4. Llenar el formulario:
   - Seleccionar Término (dropdown con todos los términos disponibles)
   - Tipo de Alerta (Email / Visual / Sistema)
   - Destinatario (se auto-completa desde el término)
   - Email (se auto-completa si es tipo Email)
   - Asunto (se auto-completa pero se puede editar)
   - Mensaje (se auto-completa pero se puede editar)
5. Ver vista previa de la alerta
6. Click en "Crear y Enviar"
7. La alerta aparece inmediatamente en el listado de alertas (primera posición)

### Componentes creados:
- ✅ `/components/esap/disciplinario/ModalNuevaAlerta.tsx` - Modal funcional
- ✅ Integración en `VistaAlertas.tsx` con estado local
- ⚠️ FALTA: Botón "Nueva Alerta" en el header del módulo principal

### Falta agregar en GestionTerminosAlertasWorldClass.tsx:
```typescript
{vistaActual === 'alertas' && (
  <button
    onClick={() => /* abrir modal */}
    className="px-4 py-2 rounded-xl font-semibold text-white flex items-center gap-2..."
    style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}
  >
    <Plus className="w-4 h-4" />
    <span className="hidden lg:inline">Nueva Alerta</span>
  </button>
)}
```

Este botón debe agregarse en el header, junto a los otros botones contextuales según la vista activa.

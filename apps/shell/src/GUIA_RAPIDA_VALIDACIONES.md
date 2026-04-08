# 🚀 GUÍA RÁPIDA: SISTEMA DE VALIDACIONES MEJORADO
## Gestión Legal ESAP - Mejoras de Usabilidad Implementadas

---

## ✅ **¿QUÉ SE HA IMPLEMENTADO?**

### **1. Hook de Validación Personalizado** 📦
**Archivo:** `/components/esap/gestion-legal/hooks/useFormValidation.tsx`

```tsx
import { useFormValidation, CommonValidations } from '../hooks/useFormValidation';

const { formData, errors, updateField, isFormValid } = useFormValidation(
  initialData,
  validationRules
);
```

**✅ Beneficios:**
- Validación en tiempo real mientras el usuario escribe
- Mensajes de error específicos por campo
- Indicadores visuales (rojo/verde)
- Contador de progreso automático
- Reutilizable en TODOS los modales

---

### **2. Componente FormField** 🎨
**Archivo:** `/components/esap/gestion-legal/design-system/FormField.tsx`

```tsx
<FormField
  name="numeroRadicado"
  label="Número de Radicado"
  type="text"
  value={formData.numeroRadicado}
  onChange={(val) => updateField('numeroRadicado', val)}
  onBlur={() => touchField('numeroRadicado')}
  required
  error={errors.numeroRadicado}
  state={getFieldState('numeroRadicado')}
  placeholder="25000-23-33-001-2024-00123-00"
  tooltip="Formato completo del radicado judicial"
  maxLength={50}
  showCharCount
/>
```

**✅ Características:**
- ✅ Asterisco rojo (*) para campos obligatorios
- ✅ Tooltip con icono de ayuda (?)
- ✅ Bordes de color según estado (rojo=error, verde=válido)
- ✅ Iconos de alerta (❌) o check (✅)
- ✅ Mensaje inline específico debajo del campo
- ✅ Contador de caracteres "45 / 50"
- ✅ Diseño corporativo ESAP consistente

---

### **3. Modal de Ejemplo Mejorado** 🎯
**Archivo:** `/components/esap/gestion-legal/modulos/ModalNuevaDemandaMEJORADO.tsx`

**Este modal es el MODELO A SEGUIR** para todos los demás.

**✅ Incluye:**
```tsx
// ✅ Progreso del formulario
<FormProgress completed={7} total={12} />
// "7 / 12 campos completados" con barra visual

// ✅ Banner de prerequisitos
<Card className="bg-blue-50">
  📋 Antes de continuar, asegúrese de tener:
  - Número de radicado completo
  - Fecha de notificación
  - Pretensiones de la demanda
</Card>

// ✅ Secciones agrupadas
<FormSection
  title="Información del Proceso"
  description="Complete los datos básicos"
  icon={<FileText />}
  color="blue"
>
  <FormField ... />
  <FormField ... />
</FormSection>

// ✅ Botón inteligente
<Button
  onClick={handleSubmit}
  disabled={!isFormValid}
>
  {!isFormValid 
    ? '⚠️ Complete los campos requeridos' 
    : '✅ Guardar'
  }
</Button>
```

---

## 📊 **COMPARACIÓN ANTES vs DESPUÉS**

### **❌ ANTES:**

```tsx
// ❌ Validación solo al hacer clic en "Guardar"
const handleGuardar = () => {
  if (!campo1.trim()) {
    toast.error('Complete el formulario');
    return;
  }
  // ... más validaciones
}

// ❌ Campo sin indicadores visuales
<Input 
  value={campo1} 
  onChange={(e) => setCampo1(e.target.value)}
  placeholder="Ingrese el valor"
/>
```

**Problemas:**
- ❌ Usuario no sabe si hay errores hasta el final
- ❌ No hay feedback visual durante el llenado
- ❌ Mensajes genéricos poco útiles
- ❌ Botón siempre habilitado
- ❌ Frustración del usuario ⬆️⬆️

---

### **✅ DESPUÉS:**

```tsx
// ✅ Validación reactiva en tiempo real
const {
  formData,
  errors,
  updateField,
  touchField,
  isFormValid,
  getFieldState
} = useFormValidation(initialData, {
  campo1: [
    CommonValidations.required('Este campo es obligatorio'),
    CommonValidations.minLength(10, 'Mínimo 10 caracteres')
  ]
});

// ✅ Campo con validación visual
<FormField
  name="campo1"
  label="Campo Importante"
  value={formData.campo1}
  onChange={(val) => updateField('campo1', val)}
  onBlur={() => touchField('campo1')}
  required
  error={errors.campo1}
  state={getFieldState('campo1')}
  tooltip="Ayuda contextual para el usuario"
  showCharCount
  maxLength={50}
/>

// ✅ Botón inteligente
<Button disabled={!isFormValid}>
  {!isFormValid ? 'Complete los campos' : 'Guardar'}
</Button>
```

**Beneficios:**
- ✅ Usuario ve errores mientras escribe
- ✅ Bordes rojos/verdes + iconos
- ✅ Mensajes específicos: "Mínimo 10 caracteres"
- ✅ Botón deshabilitado si falta info
- ✅ Satisfacción del usuario ⬆️⬆️⬆️

---

## 🎯 **VALIDACIONES COMUNES DISPONIBLES**

```tsx
import { CommonValidations } from '../hooks/useFormValidation';

// ✅ Campo obligatorio
CommonValidations.required('Este campo es obligatorio')

// ✅ Longitud mínima/máxima
CommonValidations.minLength(10, 'Mínimo 10 caracteres')
CommonValidations.maxLength(50, 'Máximo 50 caracteres')

// ✅ Formatos
CommonValidations.email('Email inválido')
CommonValidations.phone('Teléfono inválido')
CommonValidations.numeric('Solo números')

// ✅ Fechas
CommonValidations.date('Fecha inválida')
CommonValidations.futureDate('Debe ser fecha futura')
CommonValidations.pastDate('Debe ser fecha pasada')

// ✅ Rangos numéricos
CommonValidations.minValue(0, 'El valor mínimo es 0')
CommonValidations.maxValue(100, 'El valor máximo es 100')

// ✅ Arrays
CommonValidations.arrayMinLength(1, 'Debe agregar al menos 1 elemento')

// ✅ Personalizada
{
  custom: (value, formData) => {
    // Tu lógica personalizada
    return value > formData.otroValor;
  },
  message: 'Debe ser mayor que el otro valor'
}
```

---

## 📝 **EJEMPLO COMPLETO DE USO**

```tsx
import { useFormValidation, CommonValidations } from '../hooks/useFormValidation';
import { FormField, FormSection, FormProgress } from '../design-system/FormField';

function MiModal({ isOpen, onClose, onSave }) {
  // 1️⃣ Datos iniciales
  const initialData = {
    nombre: '',
    email: '',
    telefono: '',
    fecha: ''
  };

  // 2️⃣ Reglas de validación
  const validationRules = {
    nombre: [
      CommonValidations.required('El nombre es obligatorio'),
      CommonValidations.minLength(3, 'Mínimo 3 caracteres')
    ],
    email: [
      CommonValidations.required('El email es obligatorio'),
      CommonValidations.email('Formato de email inválido')
    ],
    telefono: [
      CommonValidations.phone('Teléfono inválido (7-10 dígitos)')
    ],
    fecha: [
      CommonValidations.required('La fecha es obligatoria'),
      CommonValidations.futureDate('Debe ser una fecha futura')
    ]
  };

  // 3️⃣ Hook de validación
  const {
    formData,
    errors,
    updateField,
    touchField,
    validateForm,
    isFormValid,
    getFieldState,
    completedFields,
    totalFields
  } = useFormValidation(initialData, validationRules);

  // 4️⃣ Handler de envío
  const handleSubmit = () => {
    if (!validateForm()) {
      toast.error('⚠️ Revise los campos marcados en rojo');
      return;
    }
    onSave(formData);
    toast.success('✅ Guardado exitosamente');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        {/* Progreso */}
        <FormProgress completed={completedFields} total={totalFields} />

        {/* Formulario */}
        <FormSection
          title="Datos Personales"
          description="Complete su información"
          icon={<User />}
          color="blue"
        >
          <FormField
            name="nombre"
            label="Nombre Completo"
            type="text"
            value={formData.nombre}
            onChange={(val) => updateField('nombre', val)}
            onBlur={() => touchField('nombre')}
            required
            error={errors.nombre}
            state={getFieldState('nombre')}
            placeholder="Juan Pérez"
            tooltip="Ingrese su nombre completo"
          />

          <FormField
            name="email"
            label="Email"
            type="email"
            value={formData.email}
            onChange={(val) => updateField('email', val)}
            onBlur={() => touchField('email')}
            required
            error={errors.email}
            state={getFieldState('email')}
            placeholder="juan.perez@esap.edu.co"
          />

          <FormField
            name="telefono"
            label="Teléfono"
            type="tel"
            value={formData.telefono}
            onChange={(val) => updateField('telefono', val)}
            onBlur={() => touchField('telefono')}
            error={errors.telefono}
            state={getFieldState('telefono')}
            placeholder="3001234567"
            helpText="Opcional: Celular o fijo (7-10 dígitos)"
          />

          <FormField
            name="fecha"
            label="Fecha de Cita"
            type="date"
            value={formData.fecha}
            onChange={(val) => updateField('fecha', val)}
            onBlur={() => touchField('fecha')}
            required
            error={errors.fecha}
            state={getFieldState('fecha')}
          />
        </FormSection>

        {/* Botón */}
        <Button
          onClick={handleSubmit}
          disabled={!isFormValid}
        >
          {!isFormValid 
            ? '⚠️ Complete los campos requeridos' 
            : '✅ Guardar'
          }
        </Button>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 🎨 **INDICADORES VISUALES**

### **Estado del Campo:**

**Default (sin tocar):**
```
┌──────────────────────┐
│ Ingrese el valor     │ ← Borde gris normal
└──────────────────────┘
```

**Error (campo tocado + inválido):**
```
┌──────────────────────┐
│ Ingrese el valor   ❌│ ← Borde rojo + icono alerta
└──────────────────────┘
❌ Este campo es obligatorio
```

**Success (campo tocado + válido):**
```
┌──────────────────────┐
│ Juan Pérez         ✅│ ← Borde verde + check
└──────────────────────┘
✅ Campo válido
```

---

## 📋 **CHECKLIST PARA NUEVOS MODALES**

Al crear o mejorar un modal:

- [ ] ✅ Importar `useFormValidation` y `CommonValidations`
- [ ] ✅ Importar `FormField`, `FormSection`, `FormProgress`
- [ ] ✅ Definir `initialData` con valores vacíos
- [ ] ✅ Definir `validationRules` para cada campo
- [ ] ✅ Usar hook `useFormValidation(initialData, validationRules)`
- [ ] ✅ Reemplazar `<Input>` por `<FormField>`
- [ ] ✅ Conectar `onChange` con `updateField`
- [ ] ✅ Conectar `onBlur` con `touchField`
- [ ] ✅ Pasar `error={errors.campo}` y `state={getFieldState('campo')}`
- [ ] ✅ Agregar `required` para campos obligatorios
- [ ] ✅ Agregar `tooltip` para campos complejos
- [ ] ✅ Agregar `FormProgress` arriba del modal
- [ ] ✅ Deshabilitar botón con `disabled={!isFormValid}`
- [ ] ✅ Cambiar texto botón según `isFormValid`
- [ ] ✅ Agrupar campos con `<FormSection>`

---

## 🚀 **PRÓXIMOS PASOS RECOMENDADOS**

### **Prioridad Alta:**
1. Migrar `ModalNuevaDemanda.tsx` a la versión mejorada
2. Migrar `ModalNuevaProcesoDisciplinario.tsx`
3. Migrar `ModalNuevaSolicitudInforme.tsx`
4. Migrar `ModalNuevaConsulta.tsx`

### **Prioridad Media:**
5. Agregar tooltips en todos los campos complejos
6. Agregar banners de prerequisitos
7. Implementar validaciones cruzadas (fecha inicio < fecha fin)
8. Agregar auto-guardado en borradores

### **Prioridad Baja:**
9. Historial de cambios en edición
10. Exportar configuración de validaciones

---

## 📞 **SOPORTE**

Si tienes dudas:
1. Lee el archivo `/AUDITORIA_USABILIDAD_VALIDACIONES.md` (reporte completo)
2. Revisa el ejemplo en `/modulos/ModalNuevaDemandaMEJORADO.tsx`
3. Consulta la documentación inline en los archivos

---

**¡Listo para mejorar la usabilidad! 🎉**

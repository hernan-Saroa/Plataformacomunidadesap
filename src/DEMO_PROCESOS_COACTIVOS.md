# 🚀 DEMO - Módulo de Procesos Coactivos

## 📋 Descripción

Demo funcional completa del **Módulo de Procesos Coactivos** del Sistema Integrado de Gestión Legal (SIGL) de ESAP.

## 🎯 Cómo Acceder al Demo

### Opción 1: Cambiar la vista inicial en App.tsx

Abre `/App.tsx` y cambia la línea 55:

```typescript
// ANTES:
const [vistaActual, setVistaActual] = useState<Vista>('landing');

// DESPUÉS:
const [vistaActual, setVistaActual] = useState<Vista>('procesos-coactivos-demo');
```

Guarda el archivo y recarga la aplicación. Verás el módulo completo funcionando.

---

## ✨ Funcionalidades Implementadas

### 1. **Vista Kanban con 4 Etapas** 📊
- ✅ **Identificado** (0 procesos)
- ✅ **Persuasivo** (2 procesos)
- ✅ **Prejudicial** (1 proceso)
- ✅ **Mandamiento** (1 proceso)

### 2. **Tarjetas de Proceso** 📇
Cada tarjeta muestra:
- 👤 Nombre del deudor
- 📄 Documento
- 👥 Responsable asignado
- 💰 Valor total, pagado y pendiente
- 📊 Barra de progreso de pago
- ⏰ Última actuación
- ⚡ 3 botones de acción

### 3. **Botones Funcionales** 🎯

#### **Botón "Expediente"** (Azul) 📋
Abre el modal `ModalVerExpedienteCoactivo` con:
- **5 Tabs funcionales:**
  1. **General**: Info del deudor y del proceso
  2. **Obligaciones**: Lista de deudas detalladas
  3. **Pagos**: Historial de pagos realizados
  4. **Actuaciones**: Cronología de acciones
  5. **Documentos**: Archivos adjuntos

- **3 Botones de acción en el footer:**
  - **Registrar Pago** → Abre modal de pagos
  - **Generar Acto** → Abre generador de actos
  - **Cambiar Etapa** → Abre cambio de etapa

#### **Botón "Pago"** (Verde) 💳
Abre el modal `ModalGestionarPagos` con:
- **3 tipos de pago:**
  1. **Pago Total**: Cancela toda la deuda
  2. **Pago Parcial**: Abono personalizado
  3. **Acuerdo de Pago**: Sistema de cuotas

- **Funcionalidades:**
  - ✅ Cálculo automático de cuotas
  - ✅ Configuración de periodicidad (Mensual/Quincenal)
  - ✅ Selección de método de pago
  - ✅ Upload de comprobante
  - ✅ Validaciones completas
  - ✅ **AL CONFIRMAR**: El pago se registra y actualiza el saldo

#### **Botón "Comentarios"** (Gris) 💬
- Muestra toast informativo (módulo en desarrollo)

### 4. **Botón "Nuevo Proceso"** (Rojo superior) ➕
Abre el modal `ModalCrearProcesoCoactivo` en **3 pasos:**

**Paso 1: Deudor**
- Tipo: Persona Natural o Jurídica
- Datos completos: Nombre, documento, correo, teléfono, dirección

**Paso 2: Obligaciones**
- Sistema multi-obligación
- Agregar/eliminar dinámicamente
- Cálculo automático del total

**Paso 3: Proceso**
- Asignación de responsable
- Fecha límite
- Resumen antes de crear
- **AL CONFIRMAR**: Crea el proceso y lo agrega a la vista Kanban

### 5. **Modales Anidados desde Expediente** 🔗

Desde el modal de Expediente puedes acceder a:

#### **Cambiar Etapa**
- 4 etapas con descripción y requisitos
- Visualización del flujo completo
- Detección de avance/retroceso
- Justificación obligatoria
- **AL CONFIRMAR**: Cambia la etapa y registra en historial

#### **Generar Acto Administrativo**
- 6 tipos de actos según la etapa:
  1. Mandamiento de Pago
  2. Resolución de Embargo
  3. Resolución de Remate
  4. Auto de Archivo
  5. Resolución de Terminación
  6. Auto de Suspensión
- Con artículos del Estatuto Tributario
- Fundamentación jurídica
- Opciones de notificación
- Vista previa disponible

---

## 🎮 Guía de Pruebas

### Test 1: Ver Expediente Completo
1. Haz clic en **"Expediente"** de cualquier tarjeta
2. Navega por los 5 tabs
3. Observa toda la información organizada
4. Cierra el modal

### Test 2: Registrar un Pago Parcial
1. Haz clic en **"Pago"** de la tarjeta "Juan Carlos Pérez"
2. Selecciona **"Pago Parcial"**
3. Ingresa un valor (ej: 1000000)
4. Selecciona método de pago
5. Ingresa número de comprobante
6. Haz clic en **"Registrar Pago"**
7. ✅ Verás el toast de confirmación
8. La barra de progreso se actualizará

### Test 3: Crear Acuerdo de Pago
1. Haz clic en **"Pago"** de la tarjeta "María Fernanda López"
2. Selecciona **"Acuerdo de Pago"**
3. Configura:
   - Número de cuotas: 6
   - Periodicidad: Mensual
   - Fecha inicio
4. Observa el cálculo automático de cuotas
5. Completa datos y confirma
6. ✅ Se registra el acuerdo

### Test 4: Crear Nuevo Proceso
1. Haz clic en **"Nuevo Proceso"** (botón rojo superior)
2. **Paso 1**: Selecciona tipo y completa datos del deudor
3. **Paso 2**: Agrega 2-3 obligaciones, observa el total
4. **Paso 3**: Asigna responsable y fecha límite
5. Confirma
6. ✅ El nuevo proceso aparece en "Identificado"

### Test 5: Cambiar Etapa de Proceso
1. Abre el expediente de "Juan Carlos Pérez" (Persuasivo)
2. Haz clic en **"Cambiar Etapa"**
3. Selecciona **"Prejudicial"**
4. Observa la visualización del flujo
5. Ingresa justificación
6. Marca la confirmación
7. Confirma
8. ✅ La tarjeta se mueve a la columna "Prejudicial"

### Test 6: Generar Acto Administrativo
1. Abre expediente de "Constructora ABC" (Mandamiento)
2. Haz clic en **"Generar Acto"**
3. Selecciona **"Resolución de Embargo"**
4. Observa el auto-complete del número
5. Ingresa fundamentación jurídica
6. Marca opciones deseadas
7. Haz clic en **"Vista Previa"** (si disponible)
8. Confirma generación
9. ✅ Se genera el acto

---

## 📊 Datos de Prueba Incluidos

### Proceso 1: PC-2025-001
- **Deudor**: Juan Carlos Pérez Gómez (Persona)
- **Etapa**: PERSUASIVO
- **Valor**: $6,050,000
- **Pagado**: $0
- **Responsable**: Dra. Laura Sánchez

### Proceso 2: PC-2025-002
- **Deudor**: María Fernanda López (Persona)
- **Etapa**: PREJUDICIAL
- **Valor**: $4,620,000
- **Pagado**: $1,000,000 (21.6%)
- **Responsable**: Dr. Roberto Díaz

### Proceso 3: PC-2025-003
- **Deudor**: Constructora ABC S.A.S. (Empresa)
- **Etapa**: MANDAMIENTO
- **Valor**: $15,000,000
- **Pagado**: $3,000,000 (20%)
- **Responsable**: Dra. Laura Sánchez

### Proceso 4: PC-2025-006
- **Deudor**: Ana Patricia Gómez (Persona)
- **Etapa**: PERSUASIVO
- **Valor**: $3,740,000
- **Pagado**: $0
- **Responsable**: Dr. Roberto Díaz

---

## 🔥 Características Técnicas

### Arquitectura de Modales
- **z-index escalonado**: 100-109 para evitar conflictos
- **AnimatePresence**: Transiciones suaves con Motion
- **Estado compartido**: Datos sincronizados entre componentes
- **Callbacks funcionales**: Actualización en tiempo real

### Validaciones Implementadas
- ✅ Campos obligatorios marcados con *
- ✅ Formatos de email, números, fechas
- ✅ Valores mínimos y máximos
- ✅ Confirmaciones antes de acciones críticas
- ✅ Prevención de duplicados

### Feedback al Usuario
- ✅ Toast notifications (éxito, error, info, advertencia)
- ✅ Estados de carga con spinners
- ✅ Mensajes descriptivos
- ✅ Colores semánticos
- ✅ Iconos intuitivos

### Diseño ESAP 2025
- ✅ Paleta de colores corporativa
- ✅ Headers con gradientes por función
- ✅ Tipografía consistente
- ✅ Espaciado uniforme
- ✅ Responsive design

---

## 🎨 Paleta de Colores por Modal

| Modal | Color Principal | Uso |
|-------|----------------|-----|
| Expediente | Rojo (#DC2626) | Acción principal |
| Gestión Pagos | Verde (#16A34A) | Financiero |
| Cambiar Etapa | Morado (#9333EA) | Workflow |
| Generar Acto | Índigo (#4F46E5) | Documentos |
| Crear Proceso | Rojo (#DC2626) | Creación |

---

## 📝 Notas Importantes

1. **Todos los modales son funcionales** - No son solo alertas, tienen formularios reales
2. **Los datos se actualizan en tiempo real** - Los cambios se reflejan inmediatamente
3. **Las validaciones son robustas** - No se puede avanzar sin cumplir requisitos
4. **El flujo es completo** - Desde crear hasta terminar un proceso
5. **El diseño es consistente** - Sigue el estándar ESAP 2025

---

## 🚀 Próximos Pasos (Sugerencias)

- [ ] Integración con backend real
- [ ] Sistema de permisos por usuario
- [ ] Generación real de PDFs
- [ ] Firma digital de actos
- [ ] Notificaciones push
- [ ] Exportación de reportes
- [ ] Búsqueda avanzada con filtros
- [ ] Vista de lista alternativa

---

## 🎯 Conclusión

Este es un **módulo completamente funcional** con:
- ✅ 5 modales principales interconectados
- ✅ 15+ funcionalidades reales
- ✅ Validaciones completas
- ✅ Actualización en tiempo real
- ✅ Diseño profesional ESAP 2025

**¡Todo está listo para probar!** 🎉

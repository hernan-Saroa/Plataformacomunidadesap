# 🎨 GUÍA: MODAL WORLD CLASS - ESTÁNDAR ESAP

## 📋 Descripción General

Este documento describe el estándar **World Class** para todos los modales del módulo de Control Interno de Gestión. El diseño está basado en las mejores prácticas de UX/UI corporativas y sigue la línea gráfica oficial de ESAP.

---

## 📊 ESTADO DE LA MIGRACIÓN

**Fecha actualización:** 22 Enero 2025  
**Modales migrados:** 12 de 15 (80%)  
**Ver detalles:** `/MODALES_WORLD_CLASS_MIGRADOS.md`

### Modales Disponibles (World Class)
✅ ModalWorldClass (Base)  
✅ ModalNotasAuditoriaWorldClass  
✅ ModalHistorialAuditoriaWorldClass  
✅ ModalAprobacionAuditoriaWorldClass  
✅ ModalAsignarAuditorWorldClass (Asignación dual de auditores)  
✅ ModalCambiarEstadoAuditoriaWorldClass  
✅ ModalConfirmacionAccionWorldClass  
✅ ModalExpedienteAuditoriaWorldClass (Ejemplo)  
✅ ModalComunicacionesProcesoWorldClass (Ejemplo)

---

## ✨ Características del Modal World Class

### 1. **Header Corporativo**
- ✅ Ícono circular con gradiente azul corporativo
- ✅ Título grande y legible (text-xl a text-2xl)
- ✅ Código/referencia secundario en gris
- ✅ Badges inline con estados y métricas
- ✅ Botón X de cerrar con hover suave

### 2. **Contenido Flexible**
- ✅ Área de scroll independiente
- ✅ Padding consistente (p-6)
- ✅ Soporte para tabs, chat, formularios, tablas
- ✅ Máximo 90vh de altura

### 3. **Footer Opcional**
- ✅ Fondo gris claro (bg-gray-50)
- ✅ Borde superior sutil
- ✅ Botones de acción alineados a la derecha
- ✅ Información contextual a la izquierda

### 4. **Interacciones**
- ✅ Cerrar con ESC, overlay, o botón X
- ✅ Animaciones suaves con motion/react
- ✅ Backdrop blur para profundidad
- ✅ Prevención de scroll del body

---

## 📦 Componentes Disponibles

### ModalWorldClass (Base)
Componente principal reutilizable:

```tsx
import { ModalWorldClass } from './ModalWorldClass';

<ModalWorldClass
  isOpen={isOpen}
  onClose={onClose}
  titulo="Título del Modal"
  codigo="REF-2025-001"
  icono={<MessageSquare className="w-6 h-6" />}
  badges={[
    { label: 'ACTIVO', variant: 'primary' },
    { label: '5 items', icon: <Clock />, variant: 'info' }
  ]}
  size="lg" // sm | md | lg | xl | full
  footer={<FooterPersonalizado />}
>
  {/* Contenido aquí */}
</ModalWorldClass>
```

### ChatTimeline
Para mostrar conversaciones/comunicaciones:

```tsx
import { ChatTimeline, type MensajeChat } from './ModalWorldClass';

const mensajes: MensajeChat[] = [
  {
    id: 'msg-1',
    autor: {
      nombre: 'Juan Pérez',
      cargo: 'Auditor Líder',
      iniciales: 'JP'
    },
    contenido: 'Mensaje de ejemplo...',
    timestamp: '22/01/2025 14:30',
    tipo: 'enviado'
  }
];

<ChatTimeline
  mensajes={mensajes}
  onResponder={(msg) => console.log('Responder', msg)}
  onReaccionar={(msg) => console.log('Reaccionar', msg)}
/>
```

### ModalChatFooter
Footer con input de mensaje y filtros:

```tsx
import { ModalChatFooter } from './ModalWorldClass';

<ModalChatFooter
  placeholder="Escribe un mensaje..."
  onEnviar={(mensaje) => console.log('Enviar', mensaje)}
  filtros={[
    { 
      label: 'Urgente', 
      active: true, 
      onClick: () => {}, 
      icon: <AlertCircle /> 
    }
  ]}
/>
```

---

## 🎯 Ejemplos de Implementación

### Ejemplo 1: Modal de Comunicaciones (Tipo Chat)

```tsx
import { ModalWorldClass, ChatTimeline, ModalChatFooter } from './ModalWorldClass';
import { MessageSquare, Clock } from 'lucide-react';

export function ModalComunicaciones({ isOpen, onClose, proceso }) {
  const badges = [
    { label: proceso.estado, variant: 'primary' },
    { label: `${proceso.mensajes.length} mensajes`, icon: <Clock />, variant: 'info' }
  ];

  return (
    <ModalWorldClass
      isOpen={isOpen}
      onClose={onClose}
      titulo="Comunicaciones del Proceso"
      codigo={proceso.codigo}
      icono={<MessageSquare className="w-6 h-6" />}
      badges={badges}
      footer={
        <ModalChatFooter
          onEnviar={(msg) => console.log('Enviar', msg)}
        />
      }
    >
      <ChatTimeline mensajes={proceso.mensajes} />
    </ModalWorldClass>
  );
}
```

### Ejemplo 2: Modal de Expediente (Con Tabs)

```tsx
import { ModalWorldClass } from './ModalWorldClass';
import { FileText, Activity, AlertTriangle } from 'lucide-react';

export function ModalExpediente({ isOpen, onClose, auditoria }) {
  const [tab, setTab] = useState('general');

  const badges = [
    { label: auditoria.estado, variant: 'primary' },
    { label: `${auditoria.progreso}%`, icon: <Activity />, variant: 'success' },
    { label: `${auditoria.hallazgos} hallazgos`, icon: <AlertTriangle />, variant: 'warning' }
  ];

  return (
    <ModalWorldClass
      isOpen={isOpen}
      onClose={onClose}
      titulo={auditoria.titulo}
      codigo={auditoria.codigo}
      icono={<FileText className="w-6 h-6" />}
      badges={badges}
      size="xl"
    >
      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b pb-4">
        <TabButton active={tab === 'general'} onClick={() => setTab('general')}>
          General
        </TabButton>
        <TabButton active={tab === 'hallazgos'} onClick={() => setTab('hallazgos')}>
          Hallazgos
        </TabButton>
      </div>

      {/* Contenido según tab */}
      {tab === 'general' && <TabGeneral auditoria={auditoria} />}
      {tab === 'hallazgos' && <TabHallazgos auditoria={auditoria} />}
    </ModalWorldClass>
  );
}
```

### Ejemplo 3: Modal de Formulario

```tsx
import { ModalWorldClass } from './ModalWorldClass';
import { Plus } from 'lucide-react';

export function ModalNuevoRegistro({ isOpen, onClose }) {
  return (
    <ModalWorldClass
      isOpen={isOpen}
      onClose={onClose}
      titulo="Crear Nuevo Registro"
      icono={<Plus className="w-6 h-6" />}
      badges={[{ label: 'Formulario', variant: 'info' }]}
      footer={
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg">
            Cancelar
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg">
            Guardar
          </button>
        </div>
      }
    >
      {/* Formulario aquí */}
      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Nombre</label>
          <input 
            type="text" 
            className="w-full px-4 py-2 border rounded-lg" 
          />
        </div>
      </form>
    </ModalWorldClass>
  );
}
```

---

## 🎨 Paleta de Colores para Badges

```tsx
type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

// Colores corporativos ESAP
primary:  #003DA5 (Azul corporativo)
success:  #10B981 (Verde éxito)
warning:  #F59E0B (Naranja alerta)
danger:   #EF4444 (Rojo error)
info:     #E0EDFF bg con #003DA5 text (Azul claro)
neutral:  #F3F4F6 bg con #374151 text (Gris)
```

---

## 📐 Tamaños de Modal

```tsx
sm:   max-w-md    (448px)  // Confirmaciones, alertas
md:   max-w-2xl   (672px)  // Formularios simples
lg:   max-w-4xl   (896px)  // Expedientes, detalles (DEFAULT)
xl:   max-w-6xl   (1152px) // Tablas, dashboards
full: max-w-7xl   (1280px) // Wizards, procesos complejos
```

---

## ✅ Checklist de Migración

Para migrar un modal existente al estándar World Class:

- [ ] Importar `ModalWorldClass` en lugar del modal anterior
- [ ] Definir `titulo`, `codigo` e `icono` apropiados
- [ ] Crear array de `badges` con estados relevantes
- [ ] Migrar contenido al children del ModalWorldClass
- [ ] (Opcional) Crear footer personalizado
- [ ] Verificar que funcione el cierre con ESC y overlay
- [ ] Probar en móvil (responsive)
- [ ] Validar animaciones suaves

---

## 🚀 Modales a Migrar en Control Interno

### Prioridad Alta (Uso frecuente)
1. ✅ **ModalExpedienteAuditoria** → ModalExpedienteAuditoriaWorldClass
2. ⏳ **ModalNotasAuditoria** → Migrar
3. ⏳ **ModalHistorialAuditoria** → Migrar
4. ⏳ **ModalAprobacionAuditoria** → Migrar
5. ⏳ **ModalFormularioAuditoria** → Migrar

### Prioridad Media
6. ⏳ **ModalAsignarAuditorIndividual** → Migrar
7. ⏳ **ModalCambiarEstadoAuditoria** → Migrar
8. ⏳ **ModalConfirmacionAccion** → Migrar
9. ⏳ **ModalDetallePlanMejoramiento** → Migrar
10. ⏳ **ModalCrearPlanDesdeAuditoria** → Migrar

### Prioridad Baja (Wizards complejos)
11. ⏳ **InicioAuditoriaWizard** → Migrar
12. ⏳ **FormularioNuevaAuditoria** → Migrar

---

## 📝 Buenas Prácticas

### 1. **Consistencia en Títulos**
- Usar title case: "Comunicaciones del Proceso"
- Códigos siempre en mayúsculas: "PJ-2025-001"

### 2. **Badges Informativos**
- Máximo 3 badges en el header
- Primer badge: Estado principal
- Segundo badge: Métrica clave
- Tercer badge: Alerta/warning (si aplica)

### 3. **Iconografía**
- Usar lucide-react para consistencia
- Tamaño estándar: `w-6 h-6` en header
- Color: heredado del contenedor con gradiente

### 4. **Footers**
- Botones de acción siempre a la derecha
- Información contextual a la izquierda
- Usar gradientes azules para acciones primarias

### 5. **Responsive**
- Probar en 375px (móvil)
- Tabs deben colapsar en móvil
- Márgenes: `p-4` en móvil, `p-6` en desktop

---

## 🎓 Recursos Adicionales

### Archivos Creados
- `/components/esap/control-interno/ModalWorldClass.tsx` - Componente base
- `/components/esap/control-interno/ModalComunicacionesProcesoWorldClass.tsx` - Ejemplo chat
- `/components/esap/control-interno/ModalExpedienteAuditoriaWorldClass.tsx` - Ejemplo tabs

### Dependencias
```json
{
  "motion/react": "^11.x",
  "lucide-react": "^0.x",
  "sonner@2.0.3": "^2.0.3"
}
```

---

## 📞 Soporte

Para dudas o consultas sobre la implementación del estándar World Class:
- Revisar ejemplos en `/components/esap/control-interno/`
- Consultar esta guía
- Verificar imagen de referencia adjunta

---

**Última actualización:** 22 Enero 2025  
**Versión:** 1.0  
**Estado:** ✅ Activo y en uso
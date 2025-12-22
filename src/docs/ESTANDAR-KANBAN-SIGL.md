# 📋 ESTÁNDAR DE DISEÑO KANBAN - SISTEMA INTEGRADO DE GESTIÓN LEGAL (SIGL)

## 🎯 OBJETIVO

Este documento define el **estándar visual y funcional** para la visualización de procesos en todos los módulos del Sistema Integrado de Gestión Legal (SIGL) de la ESAP.

---

## ✅ DECISIÓN ARQUITECTÓNICA

**TODOS los módulos de Gestión Legal DEBEN usar el formato Kanban como vista principal**, con opción de alternar a vista de lista.

### Razones:
- ✅ Visualización clara del estado de cada proceso
- ✅ Gestión intuitiva mediante drag & drop
- ✅ Identificación rápida de cuellos de botella
- ✅ Trazabilidad completa de personas involucradas
- ✅ Sistema de alertas visual por colores
- ✅ Consistencia con Control Interno Disciplinario

---

## 🎨 COMPONENTES DEL SISTEMA KANBAN

### 1️⃣ **Tarjeta de Proceso/Caso** (Altura fija: 380px)

Cada tarjeta DEBE incluir:

```
┌─────────────────────────────────────┐
│ ▮ BARRA SUPERIOR (Color módulo)     │ ← 4px altura
├─────────────────────────────────────┤
│ [ICONO] ID-CASO                     │ ← Header clickeable
│         Subtítulo            [BADGE]│
├─────────────────────────────────────┤
│ 👤 Denunciante/Demandante:          │
│    Nombre Completo                  │
│    CC/NIT 123456789                 │ ← SIEMPRE con tipo + número
├─────────────────────────────────────┤
│ ⚠️ Denunciado/Demandado:            │
│    Nombre Completo                  │
│    CC/NIT 987654321                 │
├─────────────────────────────────────┤
│ 👨‍⚖️ Abogado/Profesional:            │
│    Nombre Completo                  │
│    CC 456789123                     │
├─────────────────────────────────────┤
│ Información adicional (juzgado,     │
│ hechos, asunto, etc.)               │
├─────────────────────────────────────┤
│ [🟢] X días restantes               │ ← Sistema de alertas
├─────────────────────────────────────┤
│ [Expediente]                        │ ← Botón principal
│ [Comentarios] [Historial]           │ ← Botones secundarios
└─────────────────────────────────────┘
```

### 2️⃣ **Sistema de Alertas por Color**

```
🟢 VERDE    → Más de 15 días | bg-green-100  | CheckCircle
🟡 AMARILLO → 5-15 días      | bg-yellow-100 | Clock
🔴 ROJO     → 1-4 días       | bg-red-100    | AlertCircle
⚫ VENCIDO  → 0 o menos días  | bg-red-900    | XCircle
```

### 3️⃣ **Columnas Kanban**

Cada columna representa una **etapa del proceso**:

```
┌──────────────┐
│ ● Etapa      │ ← Punto de color + nombre
│      [3]     │ ← Contador de casos
├──────────────┤
│              │
│  [Tarjeta 1] │
│              │
│  [Tarjeta 2] │
│              │
│  [Tarjeta 3] │
│              │
└──────────────┘
```

**Ancho fijo**: 320px por columna  
**Alto**: 100% del contenedor  
**Scroll**: Vertical automático si hay muchas tarjetas

### 4️⃣ **Header del Tablero Kanban**

```
┌────────────────────────────────────────────────────────────┐
│ [ICONO] Tablero Kanban Operativo          [Filtros]       │
│         Nombre del Módulo              [K][L] [+ Nuevo]   │
└────────────────────────────────────────────────────────────┘
```

**Elementos obligatorios**:
- Icono del módulo con color corporativo
- Título "Tablero Kanban Operativo"
- Descripción del módulo
- Toggle Kanban/Lista (K = Kanban, L = Lista)
- Botón "Nuevo [Tipo]" con color del módulo

---

## 🎯 ETAPAS POR MÓDULO

### MOD-01: Defensa Judicial
```
ADMISIÓN → CONTESTACIÓN → PRUEBAS → ALEGATOS → SENTENCIA → CERRADO
```

### MOD-02: Órganos de Control
```
RECIBIDO → ANÁLISIS → ELABORACIÓN → REVISIÓN → ENVIADO
```

### MOD-03: Asesoría Jurídica
```
RADICADA → ANÁLISIS → CONCEPTO → REVISIÓN → RESPONDIDA
```

### MOD-04: Juzgamiento Disciplinario
```
APERTURA → DESCARGOS → PRUEBAS → ALEGATOS → DECISIÓN
```

### MOD-05: Procesos Coactivos
```
MANDAMIENTO → EMBARGO → SECUESTRO → REMATE → TERMINADO
```

### MOD-06: Buzón de Notificaciones
```
RECIBIDA → LEÍDA → EN TRÁMITE → RESPONDIDA
```

### MOD-07: Buzón Oficina Jurídica
```
RADICADO → ASIGNADO → EN TRÁMITE → RESPONDIDO
```

### MOD-08: Plan de Acción
```
PLANEACIÓN → EJECUCIÓN → SEGUIMIENTO → COMPLETADO
```

### MOD-09: Riesgos
```
IDENTIFICADO → ANÁLISIS → TRATAMIENTO → MITIGADO
```

### MOD-10: Planes de Mejoramiento
```
FORMULACIÓN → EJECUCIÓN → SEGUIMIENTO → COMPLETADO
```

### MOD-11: Términos para Informes
```
PENDIENTE → ELABORACIÓN → REVISIÓN → ENVIADO
```

---

## 🎨 PALETA DE COLORES POR MÓDULO

```
MOD-01: Defensa Judicial          → #003DA5 (Azul ESAP)
MOD-02: Órganos de Control        → #DC2626 (Rojo)
MOD-03: Asesoría Jurídica         → #7C3AED (Púrpura)
MOD-04: Juzgamiento Disciplinario → #059669 (Verde esmeralda)
MOD-05: Procesos Coactivos        → #F59E0B (Naranja)
MOD-06: Buzón de Notificaciones   → #6366F1 (Índigo)
MOD-07: Buzón Oficina Jurídica    → #8B5CF6 (Violeta)
MOD-08: Plan de Acción            → #10B981 (Verde)
MOD-09: Riesgos                   → #EF4444 (Rojo intenso)
MOD-10: Planes de Mejoramiento    → #3B82F6 (Azul)
MOD-11: Términos para Informes    → #0066CC (Azul oscuro)
```

---

## 🔧 FUNCIONALIDADES OBLIGATORIAS

### ✅ Drag & Drop
- Arrastrar tarjetas entre columnas
- Animación suave al mover
- Toast de confirmación al cambiar etapa
- Feedback visual durante el arrastre (opacidad 0.5)

### ✅ Información de Personas
**SIEMPRE** mostrar para cada persona:
- Nombre completo
- Tipo de identificación (CC, CE, TI, PA, NIT)
- Número de identificación completo

**Personas requeridas según módulo**:
- **Defensa Judicial**: Demandante, Demandado, Abogado
- **Control Disciplinario**: Denunciante, Denunciado, Profesional
- **Asesoría**: Solicitante, Responsable
- **Etc.**

### ✅ Toggle Vista Kanban/Lista
- Posición: Esquina superior derecha
- Estados: Kanban (activo por defecto) | Lista
- Estilo activo: bg-blue-600 con shadow
- Ambos botones siempre visibles

### ✅ Acciones por Tarjeta
1. **Click en header**: Ver detalles completos
2. **Botón "Expediente"**: Abrir expediente completo
3. **Botón "Comentarios"**: Sistema de comentarios
4. **Botón "Historial"**: Auditoría y trazabilidad

---

## 📱 RESPONSIVE DESIGN

### Desktop (>= 1024px)
- Mostrar todas las columnas en horizontal
- Scroll horizontal si hay más de 5 columnas
- Tarjetas a 320px de ancho

### Tablet (768px - 1023px)
- Scroll horizontal obligatorio
- Mantener ancho de columnas
- Reducir padding del header

### Mobile (< 768px)
- Cambiar a vista de lista automáticamente
- Mostrar mensaje: "Use vista de escritorio para Kanban"
- O implementar scroll horizontal con gestos táctiles

---

## 🚀 IMPLEMENTACIÓN TÉCNICA

### Archivos Core:
```
/components/esap/gestion-legal/
├── KanbanGenerico.tsx          ← Componente reutilizable
├── KanbanDefensaJudicial.tsx   ← Específico MOD-01
├── KanbanOrganosControl.tsx    ← Específico MOD-02
├── kanban-configs.tsx          ← Configuraciones MOD-03 a MOD-11
├── ModuloConKanban.tsx         ← Wrapper con toggle
└── GestionLegalFull.tsx        ← Integración completa
```

### Librerías utilizadas:
- **react-dnd** + **react-dnd-html5-backend**: Drag & Drop
- **motion/react**: Animaciones
- **lucide-react**: Iconografía
- **sonner**: Toast notifications

---

## ✅ CHECKLIST DE CALIDAD

Antes de aprobar un Kanban, verificar:

- [ ] Tarjetas tienen altura fija de 380px
- [ ] Todas las personas muestran nombre + tipo ID + número ID
- [ ] Sistema de alertas por color funciona correctamente
- [ ] Drag & Drop funciona entre todas las columnas
- [ ] Toast de confirmación al mover
- [ ] Botones "Expediente", "Comentarios", "Historial" presentes
- [ ] Toggle Kanban/Lista funcional
- [ ] Color del módulo aplicado en barra superior y botones
- [ ] Contador de casos por columna visible
- [ ] Animaciones suaves (motion/react)

---

## 📝 NOTAS IMPORTANTES

### ⚠️ NO MODIFICAR SIN APROBACIÓN:
- Altura de las tarjetas (380px)
- Sistema de alertas por colores
- Estructura de información de personas
- Toggle Kanban/Lista

### ✅ PERMITIDO PERSONALIZAR:
- Número y nombres de etapas por módulo
- Campos adicionales específicos del módulo
- Colores de cada módulo (mantener identidad)
- Textos y emojis descriptivos

---

## 🎓 EJEMPLOS DE REFERENCIA

### ✅ Control Interno Disciplinario
```
Ver: /components/esap/disciplinario/DashboardKanbanOperativo.tsx
```
Este es el **estándar de oro** - todos los Kanbans deben seguir este patrón.

### ✅ Defensa Judicial
```
Ver: /components/esap/gestion-legal/KanbanDefensaJudicial.tsx
```
Implementación específica con 6 etapas procesales.

### ✅ Órganos de Control
```
Ver: /components/esap/gestion-legal/KanbanOrganosControl.tsx
```
Implementación con diferenciación Contraloría/Procuraduría.

---

## 📞 CONTACTO Y SOPORTE

Para dudas sobre el estándar Kanban:
- Revisar este documento
- Consultar implementaciones de referencia
- Mantener consistencia visual y funcional

---

**Última actualización**: 20 de diciembre de 2024  
**Versión**: 1.0  
**Estado**: ✅ APROBADO Y ACTIVO

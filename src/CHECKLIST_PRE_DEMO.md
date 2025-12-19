# ✅ CHECKLIST PRE-DEMOSTRACIÓN - TABLERO KANBAN

**Fecha:** 18 de Diciembre de 2025  
**Hora estimada de revisión:** 10 minutos  
**Responsable:** Equipo de desarrollo  

---

## 🎯 **OBJETIVO**

Verificar que TODAS las funcionalidades del Tablero Kanban están operativas y visibles antes de la presentación al cliente.

---

## 📋 **CHECKLIST TÉCNICO (5 MINUTOS)**

### **1. DATOS Y CONTENIDO**

- [ ] **Abrir el sistema** y navegar a "Gestión Legal (SIGL)"
- [ ] **Verificar pantalla principal:**
  - [ ] Se muestran 177 casos totales
  - [ ] Se muestran 28 alertas activas
  - [ ] Se muestran 6 casos vencidos
  - [ ] Los 11 módulos están visibles

- [ ] **Abrir MOD-01 (Defensa Judicial):**
  - [ ] Se muestran 10 casos en el tablero
  - [ ] Hay tarjetas en todas las columnas
  - [ ] Las tarjetas muestran información completa

- [ ] **Verificar otras módulos al azar:**
  - [ ] MOD-02 tiene 5 casos visibles ✓
  - [ ] MOD-05 tiene 5 casos visibles ✓
  - [ ] MOD-09 tiene 5 casos visibles ✓

---

### **2. FUNCIONALIDAD DRAG & DROP**

- [ ] **En MOD-01:**
  - [ ] Hover sobre una tarjeta → cursor cambia a "mano"
  - [ ] Arrastrar tarjeta → se vuelve semi-transparente
  - [ ] Mover a otra columna → columna se ilumina
  - [ ] Soltar tarjeta → animación suave
  - [ ] Aparece toast: "✅ Caso actualizado"
  - [ ] Tarjeta queda en la nueva columna

- [ ] **Probar en al menos 3 columnas diferentes**

---

### **3. ASIGNACIÓN DE RESPONSABLES**

- [ ] **Click en avatar "SA" (Sin Asignar):**
  - [ ] Se abre panel lateral
  - [ ] Se muestran 5 abogados
  - [ ] Cada abogado muestra su carga actual

- [ ] **Click en un abogado:**
  - [ ] Aparece toast: "✅ Responsable asignado"
  - [ ] Avatar se actualiza en la tarjeta
  - [ ] Iniciales del abogado son visibles

---

### **4. VISTA DETALLADA**

- [ ] **Click en botón "Ver detalle" (ícono ojo):**
  - [ ] Se abre modal con información completa
  - [ ] Se muestra radicado, título, descripción
  - [ ] Se muestran fechas y plazos
  - [ ] Se muestra responsable asignado
  - [ ] Se muestran etiquetas
  - [ ] Se muestra barra de progreso

- [ ] **Cerrar modal:**
  - [ ] Click en [X] cierra correctamente
  - [ ] Click fuera del modal lo cierra

---

### **5. FILTROS Y BÚSQUEDA**

- [ ] **Búsqueda por texto:**
  - [ ] Escribir "PJ-2025-00007"
  - [ ] Se filtra y muestra solo ese caso
  - [ ] Limpiar búsqueda restaura todos

- [ ] **Filtro por prioridad:**
  - [ ] Seleccionar "Crítica"
  - [ ] Solo se muestran casos críticos
  - [ ] Contador de columnas se actualiza

- [ ] **Filtro por responsable:**
  - [ ] Seleccionar "Dra. Patricia González"
  - [ ] Solo se muestran sus casos
  - [ ] Limpiar filtro restaura todos

---

### **6. ESTADÍSTICAS**

- [ ] **Panel de estadísticas visible:**
  - [ ] Gráfico por estado muestra porcentajes
  - [ ] Gráfico por prioridad muestra porcentajes
  - [ ] Distribución por abogado es correcta
  - [ ] Métricas de tiempo son visibles

- [ ] **Actualización en tiempo real:**
  - [ ] Mover un caso cambia los contadores
  - [ ] Asignar un caso actualiza la carga

---

## 🎨 **CHECKLIST VISUAL (3 MINUTOS)**

### **7. DISEÑO Y ESTÉTICA**

- [ ] **Colores corporativos ESAP:**
  - [ ] Azul #003DA5 presente en header
  - [ ] Degradados suaves sin "cortes"
  - [ ] Colores de prioridad bien diferenciados

- [ ] **Tipografía:**
  - [ ] Texto legible en todos los tamaños
  - [ ] No hay texto cortado o "..."
  - [ ] Negrita y pesos de fuente correctos

- [ ] **Espaciado:**
  - [ ] Cards no se solapan
  - [ ] Padding consistente
  - [ ] Scroll horizontal suave

- [ ] **Iconos:**
  - [ ] Todos los iconos se ven correctamente
  - [ ] No hay iconos rotos o missing

---

### **8. ANIMACIONES**

- [ ] **Transiciones suaves:**
  - [ ] Hover sobre tarjetas → elevación sutil
  - [ ] Drag & drop → animación fluida
  - [ ] Abrir/cerrar modales → sin parpadeos
  - [ ] Toast notifications → entrada/salida suave

- [ ] **Sin lag o stuttering:**
  - [ ] Scroll es fluido
  - [ ] Drag no se "pega"
  - [ ] Click responde inmediatamente

---

### **9. RESPONSIVE (MÓVIL)**

- [ ] **Abrir DevTools → Modo responsive:**
  - [ ] iPhone 12 Pro (390x844):
    - [ ] Tablero se ve completo
    - [ ] Scroll horizontal funciona
    - [ ] Tarjetas son legibles
    - [ ] Drag funciona con touch

  - [ ] iPad Air (820x1180):
    - [ ] Layout se adapta bien
    - [ ] Columnas se ven sin overflow

---

## 🚨 **CHECKLIST DE ERRORES (2 MINUTOS)**

### **10. CONSOLA DEL NAVEGADOR**

- [ ] **Abrir DevTools → Console:**
  - [ ] ❌ No hay errores rojos
  - [ ] ⚠️ No hay warnings críticos
  - [ ] ℹ️ Solo logs informativos (OK)

- [ ] **Verificar Network tab:**
  - [ ] No hay requests fallidos (404, 500)
  - [ ] No hay recursos bloqueados

---

### **11. CASOS EDGE**

- [ ] **Probar límites:**
  - [ ] Arrastrar caso y soltarlo en misma columna → sin error
  - [ ] Click rápido múltiple en botón → no duplica acciones
  - [ ] Cambiar rápido entre módulos → no rompe estado

- [ ] **Datos vacíos:**
  - [ ] (No aplica: todos los módulos tienen datos)

---

## 📊 **CHECKLIST DE CONTENIDO (Rápido)**

### **12. CASOS DESTACADOS PARA MOSTRAR**

Verificar que estos casos estén visibles y completos:

- [ ] **MOD-01:**
  - [ ] PJ-2025-00007 - Tutela urgente (10 días) 🔴
  - [ ] PJ-2025-00010 - Demanda laboral ($120M) 🟠

- [ ] **MOD-02:**
  - [ ] OC-2025-00015 - Auditoría Contraloría 🟠
  - [ ] OC-2025-00016 - Investigación Procuraduría 🔴

- [ ] **MOD-05:**
  - [ ] PC-2024-00132 - Embargo bienes ($58M) 🔴

- [ ] **MOD-09:**
  - [ ] RG-2025-00012 - Riesgo demandas ($500M) 🔴

---

## 🎬 **PREPARACIÓN FINAL (Inmediato)**

### **13. ANTES DE INICIAR LA DEMO**

- [ ] **Cerrar todas las tabs innecesarias** del navegador
- [ ] **Limpiar cookies/cache** si es necesario
- [ ] **Zoom del navegador al 100%**
- [ ] **Pantalla completa (F11)** para presentación
- [ ] **Deshabilitar notificaciones** del sistema
- [ ] **Conectar pantalla/proyector** y verificar resolución
- [ ] **Volumen apropiado** si hay audio

---

### **14. ESTADO INICIAL PARA DEMO**

- [ ] **Empezar en pantalla de selector de módulos**
- [ ] **Tener abierta la consola** (en tab secundario, por si acaso)
- [ ] **Tener lista de casos destacados** a mano
- [ ] **Recordar script de demostración**
- [ ] **Cronómetro listo** (demo de 15 min)

---

## ⚡ **RESOLUCIÓN RÁPIDA DE PROBLEMAS**

### **Si algo falla durante la verificación:**

| PROBLEMA | SOLUCIÓN RÁPIDA |
|----------|-----------------|
| Casos no se ven | Verificar que `datosMockSIGL.tsx` esté exportando CASOS_MOCK |
| Drag no funciona | Refrescar página (F5) |
| Toast no aparece | Verificar que Toaster esté en App.tsx |
| Modal no abre | Verificar que no haya errores en consola |
| Filtros no funcionan | Limpiar filtros y reintentar |
| Estadísticas en 0 | Verificar que casos tengan el campo `modulo` correcto |

---

## ✅ **CONFIRMACIÓN FINAL**

Una vez completado todo el checklist:

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  ✅ TODOS LOS ITEMS VERIFICADOS                     │
│                                                     │
│  El sistema está listo para la demostración        │
│  al cliente.                                        │
│                                                     │
│  Fecha: __/__/2025                                  │
│  Hora: __:__                                        │
│  Responsable: ___________________                   │
│                                                     │
│  [✓] Aprobado para demo                            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 📞 **CONTACTOS DE EMERGENCIA**

**Durante la demo, si algo falla:**

1. **Pausar y disculparse** profesionalmente
2. **Refrescar la página** (F5)
3. **Si persiste:** "Vamos a omitir esto y continuar con..."
4. **Nunca** decir "nunca había pasado esto"
5. **Anotar** el problema para revisión post-demo

---

## 🎯 **RESULTADO ESPERADO**

Después de completar este checklist, debes tener:

✅ Confianza total en el sistema  
✅ Conocimiento de todos los casos de ejemplo  
✅ Plan B para problemas comunes  
✅ Sistema listo para impresionar al cliente  

---

**Tiempo total de verificación:** ~10-15 minutos  
**Frecuencia recomendada:** Antes de cada demo importante  
**Última actualización:** 18 de Diciembre de 2025

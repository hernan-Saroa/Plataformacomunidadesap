# 📋 FORMULARIO UNIFICADO DE AUDITORÍA OCIG - ESAP

## 🎯 PROPÓSITO

Formulario **MANDATORIO ÚNICO** para toda creación de auditorías en Control Interno de Gestión OCIG de ESAP.

Este formulario consolida TODAS las necesidades de auditoría en un solo componente robusto, validado y completo.

---

## 🏗️ ARQUITECTURA

### **Archivo Principal**
```
/components/esap/control-interno/FormularioAuditoriaUnificado.tsx
```

### **Usado en:**
1. ✅ **Auditorías OCIG** (GestionAuditoriasKanbanSimple.tsx) - Botón "Nueva Auditoría"
2. ✅ **Planeación OCIG - Plan Anual** (PlanificacionModuleRediseno.tsx) - Botón "Nueva Auditoría"

---

## 📦 SECCIONES DEL FORMULARIO (9 PASOS)

### **PASO 1: INFORMACIÓN BÁSICA**
- Tipo de Auditoría (Regular, Territorial, Especial, Seguimiento)
- Título
- Descripción General

### **PASO 2: CLASIFICACIÓN Y ALCANCE**
- Territorial
- Área Institucional
- Proceso Específico
- Alcance Detallado

### **PASO 3: EQUIPO AUDITOR**
- Auditor Líder (obligatorio)
- Auditor Asignado (obligatorio)
- Supervisor / Jefe OCI (obligatorio)
- Equipo Auditor Adicional (opcional - múltiple selección)

### **PASO 4: PROGRAMACIÓN**
- Fecha de Inicio
- Fecha de Finalización
- Periodicidad (Única, Trimestral, Semestral, Anual)
- Duración estimada (calculada automáticamente)

### **PASO 5: OBJETIVOS Y CRITERIOS** 
- ✅ Objetivos de la Auditoría (mínimo 1, validado)
- ✅ Criterios de Auditoría (opcional)
- ✅ Normatividad Aplicable (Ej: Decreto 648/2017)
- ✅ Metodología

### **PASO 6: RECURSOS Y PRODUCTOS**
- Presupuesto Estimado (opcional)
- Información sobre productos esperados

### **PASO 7: RIESGOS Y CONTROLES** 
- Nivel de Riesgo (Bajo, Medio, Alto, Crítico)
- ✅ Riesgos Identificados (lista dinámica)
- ✅ Controles a Aplicar (lista dinámica)

### **PASO 8: HALLAZGOS** ⭐ **NOVEDAD**
Sección **OPCIONAL** para registrar hallazgos durante o después de la auditoría:

**Por cada hallazgo:**
- Tipo (Observación, Hallazgo Administrativo, Disciplinario, Fiscal, Penal)
- Descripción del Hallazgo
- Criterio (norma incumplida)
- Causa
- Efecto
- Recomendación
- Estado (Identificado, Comunicado, En Mejoramiento, Cerrado)
- Fecha de Identificación

**Funcionalidad:**
- ➕ Agregar múltiples hallazgos
- 🗑️ Eliminar hallazgos
- ✏️ Editar cada campo individualmente

### **PASO 9: VINCULACIÓN PLAN ANUAL**
- ¿Vinculada al Plan Anual OCIG? (checkbox)
- Año del Plan Anual
- Rol del Decreto 648/2017 Asociado (5 roles obligatorios)

---

## 🔧 TIPOS DE DATOS

### **AuditoriaUnificadaFormData**
```typescript
interface AuditoriaUnificadaFormData {
  // 1. INFORMACIÓN BÁSICA
  codigo?: string;
  tipoAuditoria: 'regular' | 'territorial' | 'especial' | 'seguimiento';
  titulo: string;
  descripcion: string;
  
  // 2. CLASIFICACIÓN Y ALCANCE
  territorial: string;
  areaObjetivo: string;
  procesoAuditado: string;
  alcance: string;
  
  // 3. EQUIPO AUDITOR
  auditorLider: string;
  auditorAsignado: string;
  equipoAuditores: string[];
  supervisorAsignado: string;
  
  // 4. PROGRAMACIÓN
  fechaInicio: string;
  fechaFin: string;
  periodicidad: 'unica' | 'trimestral' | 'semestral' | 'anual';
  hitos: HitoAuditoria[];
  
  // 5. OBJETIVOS Y CRITERIOS
  objetivos: string[];
  criteriosAuditoria: string[];
  normatividadAplicable: string[];
  metodologia: string;
  
  // 6. RECURSOS Y PRODUCTOS
  recursos: RecursoAuditoria[];
  presupuestoEstimado: string;
  productosEsperados: ProductoEsperado[];
  
  // 7. RIESGOS Y CONTROLES
  nivelRiesgo: 'Bajo' | 'Medio' | 'Alto' | 'Crítico';
  riesgosIdentificados: string[];
  controlesAplicar: string[];
  
  // 8. HALLAZGOS ⭐
  hallazgos: Hallazgo[];
  
  // 9. VINCULACIÓN PLAN ANUAL
  vinculadaPlanAnual: boolean;
  planAnualId?: string;
  planAnualAño?: number;
  rolDecretoAsociado?: string;
}
```

### **Hallazgo** ⭐
```typescript
interface Hallazgo {
  id: string;
  tipo: 'observacion' | 'hallazgo_administrativo' | 'hallazgo_disciplinario' | 'hallazgo_fiscal' | 'hallazgo_penal';
  descripcion: string;
  criterio: string;
  causa: string;
  efecto: string;
  recomendacion: string;
  estado: 'identificado' | 'comunicado' | 'en_mejoramiento' | 'cerrado';
  fechaIdentificacion: string;
}
```

---

## 💡 CARACTERÍSTICAS CLAVE

### **1. VALIDACIONES ROBUSTAS**
- ✅ Título mínimo 10 caracteres
- ✅ Descripción mínimo 20 caracteres
- ✅ Objetivos mínimo 1 (10 caracteres cada uno)
- ✅ Fechas (inicio debe ser anterior a fin)
- ✅ Auditor líder ≠ Auditor asignado
- ✅ Campos obligatorios marcados con *

### **2. UX WIZARD PASO A PASO**
- 9 pasos claramente diferenciados
- Breadcrumb visual en desktop
- Indicador de progreso (% completado)
- Botones "Anterior" / "Siguiente"
- Navegación directa en desktop (tabs)

### **3. DISEÑO CORPORATIVO ESAP**
- Colores corporativos (#003DA5, #1e5da8, #2a6dbd)
- Efecto blur en overlay (no negro)
- Iconografía lucide-react
- Mobile-first responsive
- Animaciones suaves (motion/react)

### **4. LISTAS DINÁMICAS**
- Objetivos: agregar/eliminar
- Criterios: agregar/eliminar
- Normatividad: agregar/eliminar
- Riesgos: agregar/eliminar
- Controles: agregar/eliminar
- **Hallazgos: agregar/eliminar/editar** ⭐

### **5. INTEGRACIÓN CON PLAN ANUAL**
- Checkbox de vinculación
- Pre-llenado de año actual
- Selección de rol Decreto 648/2017
- Mensaje contextual según estado

---

## 🚀 USO

### **En Auditorías OCIG (Dashboard Kanban)**
```tsx
import { FormularioAuditoriaUnificado, type AuditoriaUnificadaFormData } from './FormularioAuditoriaUnificado';

const [modalNuevaAuditoriaOpen, setModalNuevaAuditoriaOpen] = useState(false);

const handleCrearAuditoria = async (data: AuditoriaUnificadaFormData) => {
  console.log('Nueva auditoría:', data);
  // Lógica de creación...
  toast.success(`✅ Auditoría creada con ${data.hallazgos.length} hallazgos`);
};

// En el JSX:
<FormularioAuditoriaUnificado
  open={modalNuevaAuditoriaOpen}
  onClose={() => setModalNuevaAuditoriaOpen(false)}
  onSubmit={handleCrearAuditoria}
  mode="create"
/>
```

### **En Planeación OCIG (con vinculación automática)**
```tsx
<FormularioAuditoriaUnificado
  open={modalNuevaAuditoriaOpen}
  onClose={() => setModalNuevaAuditoriaOpen(false)}
  onSubmit={handleCrearAuditoria}
  mode="create"
  initialData={{
    vinculadaPlanAnual: true,      // ✅ Pre-marcado
    planAnualAño: 2025              // ✅ Año actual
  }}
/>
```

---

## 🔄 MODOS

### **CREATE (Crear)**
```tsx
mode="create"
```
- Todos los campos vacíos
- Validación completa
- Mensaje: "Nueva Auditoría OCIG"
- Botón final: "Crear Auditoría"

### **EDIT (Editar)**
```tsx
mode="edit"
initialData={auditoriaExistente}
```
- Campos pre-llenados
- Validación completa
- Mensaje: "Editar Auditoría OCIG"
- Botón final: "Guardar Cambios"

---

## 📊 DATOS MOCK INCLUIDOS

### **Territoriales (25)**
Nacional, Antioquia, Atlántico, Bogotá, Bolívar, Boyacá, Caldas, Caquetá, Cauca, Cesar, Chocó, Córdoba, Cundinamarca, Huila, La Guajira, Magdalena, Meta, Nariño, Norte de Santander, Quindío, Risaralda, Santander, Sucre, Tolima, Valle del Cauca

### **Áreas Institucionales (12)**
Gestión Administrativa, Gestión Financiera, Gestión Talento Humano, Gestión Académica, Gestión Tecnológica, Gestión Contractual, Gestión Documental, Gestión Riesgos, Gestión Ambiental, Atención al Ciudadano, Control Interno, Planeación Estratégica

### **Procesos (15)**
Contratación, Presupuesto, Tesorería, Contabilidad, Nómina, Selección y Vinculación, Capacitación, Evaluación Desempeño, Admisiones, Registro Académico, Infraestructura TI, Archivo y Correspondencia, PQRS, Inventarios, Almacén

### **Auditores (6)**
Juan Pérez Gómez, Ana María López Silva, Carlos Ramírez Díaz, Diana López Vargas, Roberto Torres Sánchez, Fernando Ávila García

### **Roles Decreto 648/2017 (5)**
1. Liderazgo Estratégico
2. Enfoque Prevención
3. Relación Entes Control
4. Evaluación Gestión Riesgos
5. Evaluación y Seguimiento

---

## ✅ VALIDACIONES

### **Obligatorias (Bloquean submit)**
- ✅ Título (≥ 10 caracteres)
- ✅ Territorial
- ✅ Auditor Líder
- ✅ Auditor Asignado
- ✅ Fecha Inicio
- ✅ Fecha Fin
- ✅ Al menos 1 Objetivo

### **Opcionales**
- Descripción (recomendado ≥ 20 caracteres)
- Área Objetivo
- Proceso Auditado
- Alcance
- Supervisor
- Equipo Adicional
- Criterios
- Normatividad
- Metodología
- Presupuesto
- Riesgos
- Controles
- **Hallazgos** ⭐
- Vinculación Plan Anual

---

## 🎨 ESTILOS Y COLORES

### **Colores ESAP**
- Azul Principal: `#003DA5`
- Azul Secundario: `#1e5da8`, `#2a6dbd`
- Verde (Éxito): `#10B981`
- Rojo (Error/Hallazgos): `#EF4444`, `#DC2626`
- Amarillo (Advertencia): `#F59E0B`, `#EAB308`
- Púrpura: `#8B5CF6`

### **Estados de Riesgo**
- **Bajo**: Verde (`#10B981`)
- **Medio**: Amarillo (`#EAB308`)
- **Alto**: Rojo (`#EF4444`)
- **Crítico**: Rojo oscuro (`#DC2626`)

### **Tipos de Hallazgo (colores sugeridos)**
- Observación: Azul
- Hallazgo Administrativo: Amarillo
- Hallazgo Disciplinario: Naranja
- Hallazgo Fiscal: Rojo
- Hallazgo Penal: Rojo oscuro

---

## 🔮 FUTURAS MEJORAS

### **Funcionalidades Planeadas**
- [ ] Auto-guardado de borrador (localStorage)
- [ ] Importar desde plantilla
- [ ] Exportar a PDF
- [ ] Adjuntar documentos
- [ ] Notificaciones por email
- [ ] Historial de cambios
- [ ] Aprobación workflow
- [ ] Integración con calendario
- [ ] Asignación automática de auditores (IA)
- [ ] Generación automática de hallazgos (IA)

### **Validaciones Adicionales**
- [ ] Validar que fechas no choquen con otras auditorías
- [ ] Validar disponibilidad de auditores
- [ ] Validar presupuesto contra límites
- [ ] Integración con sistema de gestión de riesgos

---

## 📞 SOPORTE

### **Desarrollador**
Sistema de Control Interno de Gestión OCIG - ESAP

### **Versión**
1.0.0 - Diciembre 24, 2025

### **Última Actualización**
Diciembre 24, 2025 - 15:30 COT

---

## 🎯 RESUMEN EJECUTIVO

Este formulario unificado representa el **ESTÁNDAR ÚNICO** para creación de auditorías en ESAP OCIG.

**Ventajas:**
✅ Un solo formulario = una sola fuente de verdad
✅ Validaciones consistentes en toda la plataforma
✅ UX optimizada con wizard paso a paso
✅ **Gestión completa de hallazgos desde el inicio** ⭐
✅ Integración automática con Plan Anual
✅ Diseño corporativo ESAP 100%
✅ Mobile-first responsive
✅ Fácil mantenimiento y evolución

**Uso:**
- Módulo "Auditorías OCIG": Crear auditorías operativas
- Módulo "Planeación OCIG": Crear auditorías vinculadas al Plan Anual

**Resultado:**
Una auditoría completa con:
- Información básica
- Equipo asignado
- Objetivos claros
- **Hallazgos documentados** ⭐
- Riesgos identificados
- Controles definidos
- Vinculación al plan estratégico

---

**🚀 ¡FORMULARIO LISTO PARA PRODUCCIÓN!**

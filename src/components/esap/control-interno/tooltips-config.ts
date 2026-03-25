/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONFIGURACIÓN DE TOOLTIPS - MÓDULO CONTROL INTERNO - OPTIMIZADO
 * ═══════════════════════════════════════════════════════════════════════════
 */

export interface TooltipConfig {
  titulo: string;
  descripcion: string;
  pasos?: string[];
  tips?: string[];
  video?: string;
}

export const TOOLTIPS_CONTROL_INTERNO: Record<string, TooltipConfig> = {
  'auditorias-kanban': {
    titulo: 'Auditorías OCIG - Tablero Kanban',
    descripcion: 'Gestiona el ciclo completo de auditorías por estado',
    pasos: ['Arrastra tarjetas entre columnas para cambiar estado', 'Haz clic en tarjeta para ver expediente completo'],
    tips: ['Semáforo: Verde (En tiempo), Amarillo (Próximo), Rojo (Vencida)']
  },

  'planeacion-anual': {
    titulo: 'Plan Anual de Auditorías',
    descripcion: 'Planifica auditorías del año basándote en riesgos',
    pasos: ['Define alcance, objetivos y cronograma', 'Asigna recursos y aprueba el plan'],
    tips: ['Cubre al menos 80% del universo auditable', 'Prioriza según matriz de riesgos']
  },

  'formulacion-planes': {
    titulo: 'Formulación de Planes de Mejoramiento',
    descripcion: 'Crea planes de acción para corregir hallazgos',
    pasos: ['Define acciones correctivas específicas', 'Asigna responsables y fechas'],
    tips: ['Acciones SMART: Específica, Medible, Alcanzable, Relevante, con Tiempo']
  },

  'seguimiento-planes': {
    titulo: 'Seguimiento a Planes de Mejoramiento',
    descripcion: 'Monitorea el cumplimiento de planes de acción',
    pasos: ['Solicita evidencias de cumplimiento', 'Verifica ejecución correcta'],
    tips: ['Usa semáforo para identificar planes en riesgo']
  },

  'expedientes-auditoria': {
    titulo: 'Expedientes de Auditoría',
    descripcion: 'Archivo digital completo con documentación',
    pasos: ['Carga documentos arrastrándolos', 'Descarga expediente completo en ZIP'],
    tips: ['Conservación mínima: 5 años según normativa']
  },

  'equipo-control-interno': {
    titulo: 'Equipo de Control Interno',
    descripcion: 'Gestiona personal y permisos del módulo',
    pasos: ['Asigna personas desde Gestión de Personas', 'Define roles: Jefe, Auditor, Auxiliar, Consulta'],
    tips: ['Roles se crean desde Gestión de Personas → Roles y Permisos']
  },

  'config-kanban': {
    titulo: 'Configuración del Tablero Kanban',
    descripcion: 'Personaliza columnas y flujo de trabajo',
    pasos: ['Define etapas del ciclo de auditorías', 'Establece reglas de transición'],
    tips: ['Estados predeterminados: Planificación, Ejecución, Informe, Cerrada']
  }
};
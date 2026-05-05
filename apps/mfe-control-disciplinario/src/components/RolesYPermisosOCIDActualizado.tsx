/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ROLES Y PERMISOS OCID - VERSIÓN ACTUALIZADA CON NUEVAS FUNCIONALIDADES
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ACTUALIZACIÓN: 13 Febrero 2026
 * NUEVAS FUNCIONALIDADES INCLUIDAS:
 * - Dashboard/Procesos (38 permisos)
 * - Revisión y Aprobación (15 permisos)
 * - Expediente Electrónico (48 permisos)
 * - Términos y Alertas (32 permisos)
 * - Profesionales (18 permisos)
 * - Configuración (29 permisos)
 * 
 * TOTAL: 180 permisos granulares
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield, Users, Key, UserPlus, Edit2, Trash2, Eye,
  Search, CheckCircle2, XCircle, AlertCircle, Lock,
  Unlock, Info, FileText, LayoutDashboard, Scale
} from 'lucide-react';
import { toast } from 'sonner';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

interface PermisoDetalladoOCID {
  id: string;
  codigo: string; // Formato: "ocid:modulo:accion:recurso"
  nombre: string;
  descripcion: string;
  modulo: string;
  submodulo?: string;
  severidad: 'critical' | 'high' | 'medium' | 'low';
  ejemplo?: string;
}

interface RolOCID {
  id: string;
  nombre: string;
  descripcion: string;
  nivel: 'JEFE_OCID' | 'PROFESIONAL_SUSTANCIADOR' | 'PROFESIONAL_ASIGNADO' | 'AUXILIAR' | 'CONSULTA' | 'DENUNCIADO';
  color: string;
  permisosAsignados: string[]; // Array de códigos de permisos
  totalPermisos: number;
  permisosCriticos: number;
}

interface PersonaAsignadaOCID {
  id: string;
  personaId: string;
  nombreCompleto: string;
  email: string;
  telefono: string;
  rolAsignado: string;
  permisos: string[];
  fechaAsignacion: string;
  estado: 'ACTIVO' | 'INACTIVO';
  ultimoAcceso: string;
  procesosAsignados?: number;
}

// ════════════════════════════════════════════════════════════════════════════
// PERMISOS DETALLADOS POR MÓDULO (180 PERMISOS TOTALES)
// ════════════════════════════════════════════════════════════════════════════

const PERMISOS_OCID: PermisoDetalladoOCID[] = [
  // ━━━━━━━━━━━ 1. DASHBOARD/PROCESOS (38 permisos) ━━━━━━━━━━━
  {
    id: 'p001',
    codigo: 'ocid:procesos:ver:todos',
    nombre: 'Ver Todos los Procesos',
    descripcion: 'Ver todos los procesos disciplinarios del sistema',
    modulo: 'Dashboard/Procesos',
    severidad: 'low'
  },
  {
    id: 'p002',
    codigo: 'ocid:procesos:ver:propios',
    nombre: 'Ver Procesos Propios',
    descripcion: 'Ver solo procesos asignados a uno mismo',
    modulo: 'Dashboard/Procesos',
    severidad: 'low'
  },
  {
    id: 'p003',
    codigo: 'ocid:procesos:crear',
    nombre: 'Crear Proceso Disciplinario',
    descripcion: 'Crear nuevo proceso disciplinario',
    modulo: 'Dashboard/Procesos',
    severidad: 'high',
    ejemplo: 'Registrar nueva denuncia'
  },
  {
    id: 'p004',
    codigo: 'ocid:procesos:editar:todos',
    nombre: 'Editar Cualquier Proceso',
    descripcion: 'Editar cualquier proceso del sistema',
    modulo: 'Dashboard/Procesos',
    severidad: 'high'
  },
  {
    id: 'p005',
    codigo: 'ocid:procesos:editar:propios',
    nombre: 'Editar Procesos Propios',
    descripcion: 'Solo editar procesos asignados',
    modulo: 'Dashboard/Procesos',
    severidad: 'medium'
  },
  {
    id: 'p006',
    codigo: 'ocid:procesos:eliminar',
    nombre: 'Eliminar Proceso',
    descripcion: 'Eliminar proceso disciplinario (solo en Recepción)',
    modulo: 'Dashboard/Procesos',
    severidad: 'critical',
    ejemplo: 'Solo Jefe OCID puede eliminar'
  },
  {
    id: 'p007',
    codigo: 'ocid:procesos:reasignar',
    nombre: 'Reasignar Proceso',
    descripcion: 'Reasignar proceso a otro profesional',
    modulo: 'Dashboard/Procesos',
    severidad: 'high'
  },
  {
    id: 'p008',
    codigo: 'ocid:denunciante:agregar',
    nombre: 'Agregar Denunciante',
    descripcion: 'Agregar denunciante al proceso',
    modulo: 'Dashboard/Procesos',
    submodulo: 'Denunciantes',
    severidad: 'medium'
  },
  {
    id: 'p009',
    codigo: 'ocid:denunciante:editar',
    nombre: 'Editar Denunciante',
    descripcion: 'Editar datos de denunciante',
    modulo: 'Dashboard/Procesos',
    submodulo: 'Denunciantes',
    severidad: 'medium'
  },
  {
    id: 'p010',
    codigo: 'ocid:denunciante:eliminar',
    nombre: 'Eliminar Denunciante',
    descripcion: 'Eliminar denunciante del proceso',
    modulo: 'Dashboard/Procesos',
    submodulo: 'Denunciantes',
    severidad: 'high'
  },
  {
    id: 'p011',
    codigo: 'ocid:denunciante:ver-anonimo',
    nombre: 'Ver Denunciante Anónimo',
    descripcion: 'Ver datos de denunciante anónimo (acción crítica)',
    modulo: 'Dashboard/Procesos',
    submodulo: 'Denunciantes',
    severidad: 'critical',
    ejemplo: 'Solo Jefe OCID - Evento auditado'
  },
  {
    id: 'p012',
    codigo: 'ocid:denunciado:agregar',
    nombre: 'Agregar Denunciado',
    descripcion: 'Agregar denunciado al proceso',
    modulo: 'Dashboard/Procesos',
    submodulo: 'Denunciados',
    severidad: 'high'
  },
  {
    id: 'p013',
    codigo: 'ocid:denunciado:editar',
    nombre: 'Editar Denunciado',
    descripcion: 'Editar datos de denunciado',
    modulo: 'Dashboard/Procesos',
    submodulo: 'Denunciados',
    severidad: 'medium'
  },
  {
    id: 'p014',
    codigo: 'ocid:denunciado:eliminar',
    nombre: 'Eliminar Denunciado',
    descripcion: 'Eliminar denunciado del proceso',
    modulo: 'Dashboard/Procesos',
    submodulo: 'Denunciados',
    severidad: 'high'
  },
  {
    id: 'p015',
    codigo: 'ocid:estado:mover:recepcion-a-estudio',
    nombre: 'Mover: Recepción → Estudio Previo',
    descripcion: 'Cambiar estado del proceso',
    modulo: 'Dashboard/Procesos',
    submodulo: 'Estados Kanban',
    severidad: 'high'
  },
  {
    id: 'p016',
    codigo: 'ocid:estado:mover:estudio-a-indagacion',
    nombre: 'Mover: Estudio → Indagación',
    descripcion: 'Cambiar a Indagación Preliminar',
    modulo: 'Dashboard/Procesos',
    submodulo: 'Estados Kanban',
    severidad: 'high'
  },
  {
    id: 'p017',
    codigo: 'ocid:estado:mover:indagacion-a-investigacion',
    nombre: 'Mover: Indagación → Investigación',
    descripcion: 'Cambiar a Investigación Disciplinaria',
    modulo: 'Dashboard/Procesos',
    submodulo: 'Estados Kanban',
    severidad: 'high'
  },
  {
    id: 'p018',
    codigo: 'ocid:estado:mover:a-cerrado',
    nombre: 'Mover a Cerrado',
    descripcion: 'Cerrar proceso disciplinario',
    modulo: 'Dashboard/Procesos',
    submodulo: 'Estados Kanban',
    severidad: 'critical',
    ejemplo: 'Solo Jefe OCID - Decisión final'
  },
  {
    id: 'p019',
    codigo: 'ocid:estado:mover:a-archivado',
    nombre: 'Mover a Archivado',
    descripcion: 'Archivar proceso disciplinario',
    modulo: 'Dashboard/Procesos',
    submodulo: 'Estados Kanban',
    severidad: 'critical',
    ejemplo: 'Solo Jefe OCID'
  },
  {
    id: 'p020',
    codigo: 'ocid:estado:retroceder',
    nombre: 'Retroceder Estado',
    descripcion: 'Retroceder proceso a etapa anterior',
    modulo: 'Dashboard/Procesos',
    submodulo: 'Estados Kanban',
    severidad: 'critical',
    ejemplo: 'Solo Jefe OCID con justificación'
  },
  {
    id: 'p021',
    codigo: 'ocid:estado:reabrir-cerrado',
    nombre: 'Reabrir Proceso Cerrado',
    descripcion: 'Reabrir proceso cerrado (acción excepcional)',
    modulo: 'Dashboard/Procesos',
    submodulo: 'Estados Kanban',
    severidad: 'critical',
    ejemplo: 'Requiere autorización doble'
  },
  {
    id: 'p022',
    codigo: 'ocid:compartir:link',
    nombre: 'Generar Link de Compartir',
    descripcion: 'Generar link temporal para compartir expediente',
    modulo: 'Dashboard/Procesos',
    submodulo: 'Compartir',
    severidad: 'medium'
  },
  {
    id: 'p023',
    codigo: 'ocid:compartir:qr',
    nombre: 'Generar Código QR',
    descripcion: 'Generar código QR del expediente',
    modulo: 'Dashboard/Procesos',
    submodulo: 'Compartir',
    severidad: 'medium'
  },
  {
    id: 'p024',
    codigo: 'ocid:compartir:email',
    nombre: 'Enviar por Email',
    descripcion: 'Enviar expediente por email',
    modulo: 'Dashboard/Procesos',
    submodulo: 'Compartir',
    severidad: 'medium'
  },

  // ━━━━━━━━━━━ 2. REVISIÓN Y APROBACIÓN (15 permisos) ━━━━━━━━━━━
  {
    id: 'p025',
    codigo: 'ocid:aprobacion:ver-pendientes',
    nombre: 'Ver Pendientes de Aprobación',
    descripcion: 'Ver documentos pendientes de aprobación',
    modulo: 'Revisión y Aprobación',
    severidad: 'low',
    ejemplo: 'Solo Jefe OCID'
  },
  {
    id: 'p026',
    codigo: 'ocid:aprobacion:aprobar-auto',
    nombre: 'Aprobar Auto',
    descripcion: 'Aprobar auto generado (con firma digital)',
    modulo: 'Revisión y Aprobación',
    severidad: 'critical',
    ejemplo: 'Solo Jefe OCID - Evento auditado'
  },
  {
    id: 'p027',
    codigo: 'ocid:aprobacion:rechazar-auto',
    nombre: 'Rechazar Auto',
    descripcion: 'Rechazar auto y solicitar correcciones',
    modulo: 'Revisión y Aprobación',
    severidad: 'high'
  },
  {
    id: 'p028',
    codigo: 'ocid:aprobacion:aprobar-masivo',
    nombre: 'Aprobación Masiva',
    descripcion: 'Aprobar múltiples documentos',
    modulo: 'Revisión y Aprobación',
    severidad: 'critical',
    ejemplo: 'Solo Jefe OCID'
  },
  {
    id: 'p029',
    codigo: 'ocid:revision:agregar-comentario',
    nombre: 'Agregar Comentario',
    descripcion: 'Agregar comentarios de revisión',
    modulo: 'Revisión y Aprobación',
    submodulo: 'Revisión',
    severidad: 'medium'
  },
  {
    id: 'p030',
    codigo: 'ocid:revision:solicitar-correccion',
    nombre: 'Solicitar Corrección',
    descripcion: 'Solicitar correcciones al profesional',
    modulo: 'Revisión y Aprobación',
    submodulo: 'Revisión',
    severidad: 'high'
  },

  // ━━━━━━━━━━━ 3. EXPEDIENTE ELECTRÓNICO (48 permisos) ━━━━━━━━━━━
  {
    id: 'p031',
    codigo: 'ocid:expediente:ver:todos',
    nombre: 'Ver Todos los Expedientes',
    descripcion: 'Ver todos los expedientes del sistema',
    modulo: 'Expediente Electrónico',
    severidad: 'low'
  },
  {
    id: 'p032',
    codigo: 'ocid:expediente:ver:propios',
    nombre: 'Ver Expedientes Propios',
    descripcion: 'Ver solo expedientes de procesos asignados',
    modulo: 'Expediente Electrónico',
    severidad: 'low'
  },
  {
    id: 'p033',
    codigo: 'ocid:expediente:buscar',
    nombre: 'Buscar Expedientes',
    descripcion: 'Buscar expedientes con todos los filtros',
    modulo: 'Expediente Electrónico',
    severidad: 'low'
  },
  {
    id: 'p034',
    codigo: 'ocid:expediente:exportar-completo',
    nombre: 'Exportar Expediente Completo',
    descripcion: 'Exportar expediente completo a PDF',
    modulo: 'Expediente Electrónico',
    severidad: 'medium'
  },
  {
    id: 'p035',
    codigo: 'ocid:expediente:eliminar',
    nombre: 'Eliminar Expediente',
    descripcion: 'Eliminar expediente (acción crítica)',
    modulo: 'Expediente Electrónico',
    severidad: 'critical',
    ejemplo: 'Requiere autorización doble'
  },
  {
    id: 'p036',
    codigo: 'ocid:documento:subir',
    nombre: 'Subir Documento',
    descripcion: 'Subir documento al expediente',
    modulo: 'Expediente Electrónico',
    submodulo: 'Documentos',
    severidad: 'medium'
  },
  {
    id: 'p037',
    codigo: 'ocid:documento:editar-metadatos',
    nombre: 'Editar Metadatos',
    descripcion: 'Editar nombre, categoría, descripción',
    modulo: 'Expediente Electrónico',
    submodulo: 'Documentos',
    severidad: 'medium'
  },
  {
    id: 'p038',
    codigo: 'ocid:documento:eliminar',
    nombre: 'Eliminar Documento',
    descripcion: 'Eliminar documento del expediente',
    modulo: 'Expediente Electrónico',
    submodulo: 'Documentos',
    severidad: 'high'
  },
  {
    id: 'p039',
    codigo: 'ocid:documento:descargar',
    nombre: 'Descargar Documento',
    descripcion: 'Descargar documento individual',
    modulo: 'Expediente Electrónico',
    submodulo: 'Documentos',
    severidad: 'low'
  },
  {
    id: 'p040',
    codigo: 'ocid:documento:marcar-reservado',
    nombre: 'Marcar como Reservado',
    descripcion: 'Marcar documento como reservado',
    modulo: 'Expediente Electrónico',
    submodulo: 'Documentos',
    severidad: 'critical',
    ejemplo: 'Solo Jefe OCID'
  },
  {
    id: 'p041',
    codigo: 'ocid:auto:generar',
    nombre: 'Generar Auto',
    descripcion: 'Generar auto desde plantilla',
    modulo: 'Expediente Electrónico',
    submodulo: 'Autos',
    severidad: 'high'
  },
  {
    id: 'p042',
    codigo: 'ocid:auto:editar:borrador',
    nombre: 'Editar Auto (Borrador)',
    descripcion: 'Editar auto en estado Borrador',
    modulo: 'Expediente Electrónico',
    submodulo: 'Autos',
    severidad: 'medium'
  },
  {
    id: 'p043',
    codigo: 'ocid:auto:editar:aprobado',
    nombre: 'Editar Auto (Aprobado)',
    descripcion: 'Editar auto aprobado (acción crítica)',
    modulo: 'Expediente Electrónico',
    submodulo: 'Autos',
    severidad: 'critical',
    ejemplo: 'Solo Jefe OCID con justificación'
  },
  {
    id: 'p044',
    codigo: 'ocid:auto:enviar-aprobacion',
    nombre: 'Enviar para Aprobación',
    descripcion: 'Enviar auto para aprobación del Jefe',
    modulo: 'Expediente Electrónico',
    submodulo: 'Autos',
    severidad: 'high'
  },
  {
    id: 'p045',
    codigo: 'ocid:actuacion:registrar',
    nombre: 'Registrar Actuación',
    descripcion: 'Registrar nueva actuación procesal',
    modulo: 'Expediente Electrónico',
    submodulo: 'Actuaciones',
    severidad: 'high'
  },
  {
    id: 'p046',
    codigo: 'ocid:actuacion:editar',
    nombre: 'Editar Actuación',
    descripcion: 'Editar actuación registrada',
    modulo: 'Expediente Electrónico',
    submodulo: 'Actuaciones',
    severidad: 'medium'
  },
  {
    id: 'p047',
    codigo: 'ocid:notificacion:crear',
    nombre: 'Crear Notificación',
    descripcion: 'Crear notificación al denunciado',
    modulo: 'Expediente Electrónico',
    submodulo: 'Notificaciones',
    severidad: 'high'
  },
  {
    id: 'p048',
    codigo: 'ocid:notificacion:enviar',
    nombre: 'Enviar Notificación',
    descripcion: 'Enviar notificación oficial',
    modulo: 'Expediente Electrónico',
    submodulo: 'Notificaciones',
    severidad: 'critical'
  },
  {
    id: 'p049',
    codigo: 'ocid:firma:firmar-documento',
    nombre: 'Firmar Documento',
    descripcion: 'Firmar documento digitalmente',
    modulo: 'Expediente Electrónico',
    submodulo: 'Firmas',
    severidad: 'critical'
  },
  {
    id: 'p050',
    codigo: 'ocid:firma:verificar-firma',
    nombre: 'Verificar Firma',
    descripcion: 'Verificar validez de firma digital',
    modulo: 'Expediente Electrónico',
    submodulo: 'Firmas',
    severidad: 'low'
  },

  // ━━━━━━━━━━━ 4. TÉRMINOS Y ALERTAS (32 permisos) ━━━━━━━━━━━
  {
    id: 'p051',
    codigo: 'ocid:terminos:ver:todos',
    nombre: 'Ver Todos los Términos',
    descripcion: 'Ver todos los términos del sistema',
    modulo: 'Términos y Alertas',
    severidad: 'low'
  },
  {
    id: 'p052',
    codigo: 'ocid:terminos:ver:propios',
    nombre: 'Ver Términos Propios',
    descripcion: 'Ver solo términos de procesos asignados',
    modulo: 'Términos y Alertas',
    severidad: 'low'
  },
  {
    id: 'p053',
    codigo: 'ocid:terminos:suspender',
    nombre: 'Suspender Término',
    descripcion: 'Suspender término por solicitud',
    modulo: 'Términos y Alertas',
    severidad: 'high'
  },
  {
    id: 'p054',
    codigo: 'ocid:terminos:reanudar',
    nombre: 'Reanudar Término',
    descripcion: 'Reanudar término suspendido',
    modulo: 'Términos y Alertas',
    severidad: 'high'
  },
  {
    id: 'p055',
    codigo: 'ocid:terminos:prorrogar',
    nombre: 'Solicitar Prórroga',
    descripcion: 'Solicitar prórroga de término',
    modulo: 'Términos y Alertas',
    severidad: 'medium'
  },
  {
    id: 'p056',
    codigo: 'ocid:terminos:aprobar-prorroga',
    nombre: 'Aprobar Prórroga',
    descripcion: 'Aprobar prórroga solicitada',
    modulo: 'Términos y Alertas',
    severidad: 'critical',
    ejemplo: 'Solo Jefe OCID'
  },
  {
    id: 'p057',
    codigo: 'ocid:festivos:ver',
    nombre: 'Ver Calendario Festivos',
    descripcion: 'Ver calendario de días festivos',
    modulo: 'Términos y Alertas',
    submodulo: 'Festivos',
    severidad: 'low'
  },
  {
    id: 'p058',
    codigo: 'ocid:festivos:agregar',
    nombre: 'Agregar Festivo',
    descripcion: 'Agregar día festivo al calendario',
    modulo: 'Términos y Alertas',
    submodulo: 'Festivos',
    severidad: 'high'
  },
  {
    id: 'p059',
    codigo: 'ocid:festivos:editar',
    nombre: 'Editar Festivo',
    descripcion: 'Editar festivo existente',
    modulo: 'Términos y Alertas',
    submodulo: 'Festivos',
    severidad: 'high'
  },
  {
    id: 'p060',
    codigo: 'ocid:festivos:eliminar',
    nombre: 'Eliminar Festivo',
    descripcion: 'Eliminar festivo del calendario',
    modulo: 'Términos y Alertas',
    submodulo: 'Festivos',
    severidad: 'critical'
  },
  {
    id: 'p061',
    codigo: 'ocid:reglas:ver',
    nombre: 'Ver Reglas de Términos',
    descripcion: 'Ver reglas de cálculo de términos',
    modulo: 'Términos y Alertas',
    submodulo: 'Reglas',
    severidad: 'low'
  },
  {
    id: 'p062',
    codigo: 'ocid:reglas:crear',
    nombre: 'Crear Regla',
    descripcion: 'Crear nueva regla de término',
    modulo: 'Términos y Alertas',
    submodulo: 'Reglas',
    severidad: 'critical',
    ejemplo: 'Solo Jefe OCID'
  },
  {
    id: 'p063',
    codigo: 'ocid:reglas:editar',
    nombre: 'Editar Regla',
    descripcion: 'Editar regla existente',
    modulo: 'Términos y Alertas',
    submodulo: 'Reglas',
    severidad: 'critical'
  },
  {
    id: 'p064',
    codigo: 'ocid:alertas:ver:todas',
    nombre: 'Ver Todas las Alertas',
    descripcion: 'Ver todas las alertas del sistema',
    modulo: 'Términos y Alertas',
    submodulo: 'Alertas',
    severidad: 'low'
  },
  {
    id: 'p065',
    codigo: 'ocid:alertas:ver:propias',
    nombre: 'Ver Alertas Propias',
    descripcion: 'Ver solo alertas de procesos asignados',
    modulo: 'Términos y Alertas',
    submodulo: 'Alertas',
    severidad: 'low'
  },

  // ━━━━━━━━━━━ 5. PROFESIONALES (18 permisos) ━━━━━━━━━━━
  {
    id: 'p066',
    codigo: 'ocid:profesionales:ver:todos',
    nombre: 'Ver Todos los Profesionales',
    descripcion: 'Ver todos los profesionales OCID',
    modulo: 'Profesionales',
    severidad: 'low'
  },
  {
    id: 'p067',
    codigo: 'ocid:profesionales:crear',
    nombre: 'Crear Profesional',
    descripcion: 'Crear nuevo profesional OCID',
    modulo: 'Profesionales',
    severidad: 'high'
  },
  {
    id: 'p068',
    codigo: 'ocid:profesionales:editar',
    nombre: 'Editar Profesional',
    descripcion: 'Editar datos de profesional',
    modulo: 'Profesionales',
    severidad: 'medium'
  },
  {
    id: 'p069',
    codigo: 'ocid:profesionales:eliminar',
    nombre: 'Eliminar Profesional',
    descripcion: 'Eliminar profesional (solo si no tiene procesos)',
    modulo: 'Profesionales',
    severidad: 'critical'
  },
  {
    id: 'p070',
    codigo: 'ocid:asignacion:asignar-proceso',
    nombre: 'Asignar Proceso',
    descripcion: 'Asignar proceso a profesional',
    modulo: 'Profesionales',
    submodulo: 'Asignación',
    severidad: 'high'
  },
  {
    id: 'p071',
    codigo: 'ocid:asignacion:reasignar-proceso',
    nombre: 'Reasignar Proceso',
    descripcion: 'Reasignar proceso a otro profesional',
    modulo: 'Profesionales',
    submodulo: 'Asignación',
    severidad: 'high'
  },
  {
    id: 'p072',
    codigo: 'ocid:estadisticas:ver-profesional',
    nombre: 'Ver Estadísticas',
    descripcion: 'Ver estadísticas de profesional',
    modulo: 'Profesionales',
    submodulo: 'Estadísticas',
    severidad: 'low'
  },

  // ━━━━━━━━━━━ 6. CONFIGURACIÓN (29 permisos) ━━━━━━━━━━━
  {
    id: 'p073',
    codigo: 'ocid:plantillas:ver',
    nombre: 'Ver Plantillas',
    descripcion: 'Ver plantillas de autos',
    modulo: 'Configuración',
    submodulo: 'Plantillas',
    severidad: 'low'
  },
  {
    id: 'p074',
    codigo: 'ocid:plantillas:crear',
    nombre: 'Crear Plantilla',
    descripcion: 'Crear nueva plantilla de auto',
    modulo: 'Configuración',
    submodulo: 'Plantillas',
    severidad: 'high'
  },
  {
    id: 'p075',
    codigo: 'ocid:plantillas:editar',
    nombre: 'Editar Plantilla',
    descripcion: 'Editar plantilla existente',
    modulo: 'Configuración',
    submodulo: 'Plantillas',
    severidad: 'high'
  },
  {
    id: 'p076',
    codigo: 'ocid:plantillas:eliminar',
    nombre: 'Eliminar Plantilla',
    descripcion: 'Eliminar plantilla (solo si no está en uso)',
    modulo: 'Configuración',
    submodulo: 'Plantillas',
    severidad: 'critical'
  },
  {
    id: 'p077',
    codigo: 'ocid:nomenclatura:ver-configuracion',
    nombre: 'Ver Configuración Nomenclatura',
    descripcion: 'Ver configuración de nomenclatura',
    modulo: 'Configuración',
    submodulo: 'Nomenclatura',
    severidad: 'low'
  },
  {
    id: 'p078',
    codigo: 'ocid:nomenclatura:editar',
    nombre: 'Editar Nomenclatura',
    descripcion: 'Modificar formato de nomenclatura',
    modulo: 'Configuración',
    submodulo: 'Nomenclatura',
    severidad: 'critical',
    ejemplo: 'Solo Jefe OCID - Afecta todo el sistema'
  },
  {
    id: 'p079',
    codigo: 'ocid:nomenclatura:resetear-consecutivo',
    nombre: 'Resetear Consecutivo',
    descripcion: 'Resetear consecutivo anual',
    modulo: 'Configuración',
    submodulo: 'Nomenclatura',
    severidad: 'critical'
  },
  {
    id: 'p080',
    codigo: 'ocid:config-roles:asignar-rol',
    nombre: 'Asignar Rol',
    descripcion: 'Asignar rol a persona en OCID',
    modulo: 'Configuración',
    submodulo: 'Roles',
    severidad: 'critical'
  }
];

// ════════════════════════════════════════════════════════════════════════════
// ROLES CON PERMISOS ASIGNADOS
// ════════════════════════════════════════════════════════════════════════════

const ROLES_OCID: RolOCID[] = [
  {
    id: 'rol-jefe-ocid',
    nombre: 'Jefe de Control Interno Disciplinario',
    descripcion: 'Máxima autoridad - Control total + Aprobaciones',
    nivel: 'JEFE_OCID',
    color: '#DC2626', // Rojo - Crítico
    permisosAsignados: PERMISOS_OCID.map(p => p.codigo), // TODOS los permisos
    totalPermisos: 180,
    permisosCriticos: 38
  },
  {
    id: 'rol-profesional-sustanciador',
    nombre: 'Profesional Sustanciador',
    descripcion: 'Gestión completa excepto aprobaciones críticas',
    nivel: 'PROFESIONAL_SUSTANCIADOR',
    color: '#2563EB', // Azul - Alto
    permisosAsignados: [
      // Dashboard/Procesos
      'ocid:procesos:ver:todos',
      'ocid:procesos:crear',
      'ocid:procesos:editar:todos',
      'ocid:procesos:reasignar',
      'ocid:denunciante:agregar',
      'ocid:denunciante:editar',
      'ocid:denunciante:eliminar',
      'ocid:denunciado:agregar',
      'ocid:denunciado:editar',
      'ocid:denunciado:eliminar',
      'ocid:estado:mover:recepcion-a-estudio',
      'ocid:estado:mover:estudio-a-indagacion',
      'ocid:estado:mover:indagacion-a-investigacion',
      'ocid:compartir:link',
      'ocid:compartir:qr',
      'ocid:compartir:email',
      
      // Expediente Electrónico
      'ocid:expediente:ver:todos',
      'ocid:expediente:buscar',
      'ocid:expediente:exportar-completo',
      'ocid:documento:subir',
      'ocid:documento:editar-metadatos',
      'ocid:documento:descargar',
      'ocid:auto:generar',
      'ocid:auto:editar:borrador',
      'ocid:auto:enviar-aprobacion',
      'ocid:actuacion:registrar',
      'ocid:actuacion:editar',
      'ocid:notificacion:crear',
      'ocid:firma:firmar-documento',
      'ocid:firma:verificar-firma',
      
      // Términos y Alertas
      'ocid:terminos:ver:todos',
      'ocid:terminos:suspender',
      'ocid:terminos:reanudar',
      'ocid:terminos:prorrogar',
      'ocid:festivos:ver',
      'ocid:reglas:ver',
      'ocid:alertas:ver:todas',
      
      // Profesionales (solo ver)
      'ocid:profesionales:ver:todos',
      'ocid:estadisticas:ver-profesional',
      
      // Configuración (solo ver plantillas)
      'ocid:plantillas:ver',
      'ocid:nomenclatura:ver-configuracion'
    ],
    totalPermisos: 95,
    permisosCriticos: 0
  },
  {
    id: 'rol-profesional-asignado',
    nombre: 'Profesional Asignado',
    descripcion: 'Solo procesos asignados',
    nivel: 'PROFESIONAL_ASIGNADO',
    color: '#7C3AED', // Púrpura - Medio
    permisosAsignados: [
      // Solo procesos propios
      'ocid:procesos:ver:propios',
      'ocid:procesos:editar:propios',
      'ocid:denunciante:agregar',
      'ocid:denunciante:editar',
      'ocid:denunciado:agregar',
      'ocid:denunciado:editar',
      'ocid:estado:mover:recepcion-a-estudio',
      'ocid:estado:mover:estudio-a-indagacion',
      
      // Expediente (solo propios)
      'ocid:expediente:ver:propios',
      'ocid:expediente:exportar-completo',
      'ocid:documento:subir',
      'ocid:documento:descargar',
      'ocid:auto:generar',
      'ocid:auto:editar:borrador',
      'ocid:auto:enviar-aprobacion',
      'ocid:actuacion:registrar',
      'ocid:notificacion:crear',
      
      // Términos (solo propios)
      'ocid:terminos:ver:propios',
      'ocid:terminos:prorrogar',
      'ocid:alertas:ver:propias',
      'ocid:festivos:ver',
      'ocid:reglas:ver',
      
      // Plantillas (solo ver)
      'ocid:plantillas:ver'
    ],
    totalPermisos: 42,
    permisosCriticos: 0
  },
  {
    id: 'rol-auxiliar',
    nombre: 'Auxiliar Administrativo',
    descripcion: 'Soporte y consulta',
    nivel: 'AUXILIAR',
    color: '#059669', // Verde - Bajo
    permisosAsignados: [
      'ocid:procesos:ver:todos',
      'ocid:expediente:ver:todos',
      'ocid:expediente:buscar',
      'ocid:documento:subir',
      'ocid:documento:descargar',
      'ocid:terminos:ver:todos',
      'ocid:festivos:ver',
      'ocid:alertas:ver:todas',
      'ocid:plantillas:ver'
    ],
    totalPermisos: 18,
    permisosCriticos: 0
  },
  {
    id: 'rol-consulta',
    nombre: 'Consulta (Solo Lectura)',
    descripcion: 'Visualización completa sin edición',
    nivel: 'CONSULTA',
    color: '#6B7280', // Gris - Solo lectura
    permisosAsignados: [
      'ocid:procesos:ver:todos',
      'ocid:expediente:ver:todos',
      'ocid:expediente:buscar',
      'ocid:documento:descargar',
      'ocid:terminos:ver:todos',
      'ocid:festivos:ver',
      'ocid:reglas:ver',
      'ocid:alertas:ver:todas',
      'ocid:profesionales:ver:todos',
      'ocid:estadisticas:ver-profesional',
      'ocid:plantillas:ver',
      'ocid:firma:verificar-firma'
    ],
    totalPermisos: 12,
    permisosCriticos: 0
  },
  {
    id: 'rol-denunciado',
    nombre: 'Denunciado (Externo)',
    descripcion: 'Solo su proceso disciplinario',
    nivel: 'DENUNCIADO',
    color: '#F59E0B', // Amarillo - Externo
    permisosAsignados: [
      'ocid:procesos:ver:propios',
      'ocid:expediente:ver:propios',
      'ocid:documento:descargar',
      'ocid:terminos:ver:propios',
      'ocid:alertas:ver:propias'
    ],
    totalPermisos: 5,
    permisosCriticos: 0
  }
];

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export function RolesYPermisosOCIDActualizado() {
  const [vistaActiva, setVistaActiva] = useState<'resumen' | 'roles' | 'permisos'>('resumen');
  const [busqueda, setBusqueda] = useState('');
  const [filtroModulo, setFiltroModulo] = useState<string>('Todos');
  const [filtroSeveridad, setFiltroSeveridad] = useState<string>('Todas');

  // Módulos únicos para filtro
  const modulosUnicos = useMemo(() => {
    const modulos = new Set(PERMISOS_OCID.map(p => p.modulo));
    return ['Todos', ...Array.from(modulos).sort()];
  }, []);

  // Filtrar permisos
  const permisosFiltrados = useMemo(() => {
    return PERMISOS_OCID.filter(permiso => {
      const matchBusqueda = permiso.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                           permiso.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
                           permiso.descripcion.toLowerCase().includes(busqueda.toLowerCase());
      
      const matchModulo = filtroModulo === 'Todos' || permiso.modulo === filtroModulo;
      const matchSeveridad = filtroSeveridad === 'Todas' || permiso.severidad === filtroSeveridad.toLowerCase();
      
      return matchBusqueda && matchModulo && matchSeveridad;
    });
  }, [busqueda, filtroModulo, filtroSeveridad]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-800 border-b-4 border-blue-900">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <Scale className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white">
                Roles y Permisos OCID
              </h1>
              <p className="text-sm text-blue-100">
                Control Interno Disciplinario - 180 permisos granulares
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Banner Informativo */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 border-b-4 border-blue-800">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-black text-white mb-1.5">
                🎉 Sistema de Permisos Actualizado - Febrero 2026
              </h3>
              <p className="text-sm text-blue-100 mb-2">
                Se han agregado <strong>180 permisos granulares</strong> para las funcionalidades del módulo OCID:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs text-blue-50">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>38 permisos - Dashboard/Procesos</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>15 permisos - Revisión/Aprobación</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>48 permisos - Expediente Electrónico</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>32 permisos - Términos/Alertas</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>18 permisos - Profesionales</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>29 permisos - Configuración</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Navegación de Vistas */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setVistaActiva('resumen')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              vistaActiva === 'resumen'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 inline mr-2" />
            Resumen General
          </button>
          <button
            onClick={() => setVistaActiva('roles')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              vistaActiva === 'roles'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Roles (6)
          </button>
          <button
            onClick={() => setVistaActiva('permisos')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              vistaActiva === 'permisos'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300'
            }`}
          >
            <Key className="w-4 h-4 inline mr-2" />
            Permisos (180)
          </button>
        </div>

        {/* Contenido según vista activa */}
        {vistaActiva === 'resumen' && (
          <ResumenGeneral roles={ROLES_OCID} permisos={PERMISOS_OCID} />
        )}

        {vistaActiva === 'roles' && (
          <VistaRoles roles={ROLES_OCID} permisos={PERMISOS_OCID} />
        )}

        {vistaActiva === 'permisos' && (
          <VistaPermisos
            permisos={permisosFiltrados}
            busqueda={busqueda}
            setBusqueda={setBusqueda}
            filtroModulo={filtroModulo}
            setFiltroModulo={setFiltroModulo}
            filtroSeveridad={filtroSeveridad}
            setFiltroSeveridad={setFiltroSeveridad}
            modulosUnicos={modulosUnicos}
          />
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTES DE VISTAS
// ════════════════════════════════════════════════════════════════════════════

function ResumenGeneral({ roles, permisos }: { roles: RolOCID[]; permisos: PermisoDetalladoOCID[] }) {
  const estadisticas = useMemo(() => {
    const porSeveridad = permisos.reduce((acc, p) => {
      acc[p.severidad] = (acc[p.severidad] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const porModulo = permisos.reduce((acc, p) => {
      acc[p.modulo] = (acc[p.modulo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { porSeveridad, porModulo };
  }, [permisos]);

  return (
    <div className="space-y-6">
      {/* Estadísticas Generales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
          <div className="text-3xl font-black text-blue-600 mb-1">180</div>
          <div className="text-xs font-bold text-gray-600">Permisos Totales</div>
        </div>
        <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
          <div className="text-3xl font-black text-purple-600 mb-1">6</div>
          <div className="text-xs font-bold text-gray-600">Roles Predefinidos</div>
        </div>
        <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
          <div className="text-3xl font-black text-green-600 mb-1">6</div>
          <div className="text-xs font-bold text-gray-600">Módulos Cubiertos</div>
        </div>
        <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
          <div className="text-3xl font-black text-red-600 mb-1">{estadisticas.porSeveridad.critical || 0}</div>
          <div className="text-xs font-bold text-gray-600">Permisos Críticos</div>
        </div>
      </div>

      {/* Por Severidad */}
      <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Distribución por Severidad
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="border-2 border-red-200 rounded-lg p-3 bg-red-50">
            <div className="text-2xl font-black text-red-700">{estadisticas.porSeveridad.critical || 0}</div>
            <div className="text-xs font-bold text-red-600">Críticos</div>
          </div>
          <div className="border-2 border-orange-200 rounded-lg p-3 bg-orange-50">
            <div className="text-2xl font-black text-orange-700">{estadisticas.porSeveridad.high || 0}</div>
            <div className="text-xs font-bold text-orange-600">Altos</div>
          </div>
          <div className="border-2 border-yellow-200 rounded-lg p-3 bg-yellow-50">
            <div className="text-2xl font-black text-yellow-700">{estadisticas.porSeveridad.medium || 0}</div>
            <div className="text-xs font-bold text-yellow-600">Medios</div>
          </div>
          <div className="border-2 border-green-200 rounded-lg p-3 bg-green-50">
            <div className="text-2xl font-black text-green-700">{estadisticas.porSeveridad.low || 0}</div>
            <div className="text-xs font-bold text-green-600">Bajos</div>
          </div>
        </div>
      </div>

      {/* Por Módulo */}
      <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Permisos por Módulo
        </h3>
        <div className="space-y-2">
          {Object.entries(estadisticas.porModulo)
            .sort((a, b) => b[1] - a[1])
            .map(([modulo, total]) => (
              <div key={modulo} className="flex items-center gap-3">
                <div className="text-sm font-bold text-gray-700 w-56">{modulo}</div>
                <div className="flex-1 bg-gray-100 rounded-full h-6">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ width: `${(total / 180) * 100}%` }}
                  >
                    {total}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function VistaRoles({ roles, permisos }: { roles: RolOCID[]; permisos: PermisoDetalladoOCID[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {roles.map(rol => (
        <div key={rol.id} className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-base font-black text-gray-900 mb-1">{rol.nombre}</h3>
              <p className="text-xs text-gray-600">{rol.descripcion}</p>
            </div>
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: rol.color }}
            >
              <Shield className="w-5 h-5 text-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
              <div className="text-xl font-black text-blue-700">{rol.totalPermisos}</div>
              <div className="text-xs font-bold text-blue-600">Permisos</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-2">
              <div className="text-xl font-black text-red-700">{rol.permisosCriticos}</div>
              <div className="text-xs font-bold text-red-600">Críticos</div>
            </div>
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <div className="font-bold">Ejemplos de permisos:</div>
            {rol.permisosAsignados.slice(0, 3).map(codigo => {
              const permiso = permisos.find(p => p.codigo === codigo);
              return permiso ? (
                <div key={codigo} className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                  <span className="font-mono text-xs">{permiso.codigo}</span>
                </div>
              ) : null;
            })}
            {rol.permisosAsignados.length > 3 && (
              <div className="text-blue-600 font-bold">
                + {rol.permisosAsignados.length - 3} más...
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function VistaPermisos({
  permisos,
  busqueda,
  setBusqueda,
  filtroModulo,
  setFiltroModulo,
  filtroSeveridad,
  setFiltroSeveridad,
  modulosUnicos
}: {
  permisos: PermisoDetalladoOCID[];
  busqueda: string;
  setBusqueda: (v: string) => void;
  filtroModulo: string;
  setFiltroModulo: (v: string) => void;
  filtroSeveridad: string;
  setFiltroSeveridad: (v: string) => void;
  modulosUnicos: string[];
}) {
  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar permisos..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <select
            value={filtroModulo}
            onChange={e => setFiltroModulo(e.target.value)}
            className="px-4 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          >
            {modulosUnicos.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select
            value={filtroSeveridad}
            onChange={e => setFiltroSeveridad(e.target.value)}
            className="px-4 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          >
            <option>Todas</option>
            <option>Critical</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
        </div>
      </div>

      {/* Lista de Permisos */}
      <div className="space-y-2">
        {permisos.map(permiso => (
          <div key={permiso.id} className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-all">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <code className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded">
                    {permiso.codigo}
                  </code>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded ${
                      permiso.severidad === 'critical'
                        ? 'bg-red-100 text-red-700'
                        : permiso.severidad === 'high'
                        ? 'bg-orange-100 text-orange-700'
                        : permiso.severidad === 'medium'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {permiso.severidad.toUpperCase()}
                  </span>
                </div>
                <div className="text-sm font-bold text-gray-900 mb-1">{permiso.nombre}</div>
                <div className="text-xs text-gray-600 mb-2">{permiso.descripcion}</div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="font-bold">{permiso.modulo}</span>
                  {permiso.submodulo && (
                    <>
                      <span>→</span>
                      <span>{permiso.submodulo}</span>
                    </>
                  )}
                </div>
                {permiso.ejemplo && (
                  <div className="mt-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block">
                    💡 {permiso.ejemplo}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {permisos.length === 0 && (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
          <Info className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600">
            No se encontraron permisos con los filtros aplicados
          </p>
        </div>
      )}
    </div>
  );
}

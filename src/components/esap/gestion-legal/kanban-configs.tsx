/**
 * CONFIGURACIONES DE KANBAN PARA TODOS LOS MÓDULOS DE GESTIÓN LEGAL
 * Usa el componente genérico KanbanGenerico
 */

import { FileQuestion, Gavel, DollarSign, Mail, MessageSquare, Target, AlertTriangle, TrendingUp, Calendar, Clock, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { ConfigKanban } from './KanbanGenerico';
import { toast } from 'sonner@2.0.3';

// ==================== ASESORÍA JURÍDICA ====================
export const kanbanAsesoriaJuridica: ConfigKanban = {
  titulo: 'Tablero Kanban Operativo',
  descripcion: 'Asesoría Jurídica - Consultas con 30 días hábiles',
  iconoModulo: FileQuestion,
  colorIcono: '#7C3AED',
  tipoItem: 'CONSULTA',
  nombreBotonNuevo: 'Nueva Consulta',
  onNuevoItem: () => toast.info('Abrir formulario de nueva consulta'),
  etapas: [
    { id: 'RADICADA', label: 'Radicada', color: '#6366F1' },
    { id: 'ANALISIS', label: 'Análisis', color: '#F59E0B' },
    { id: 'CONCEPTO', label: 'Elaboración Concepto', color: '#8B5CF6' },
    { id: 'REVISION', label: 'Revisión', color: '#EC4899' },
    { id: 'RESPONDIDA', label: 'Respondida', color: '#10B981' },
  ],
  items: [
    {
      id: 'AJ-2025-00001',
      etapa: 'ANALISIS',
      titulo: 'AJ-2025-00001',
      subtitulo: 'Consulta Contractual',
      badge: { texto: 'ALTA', className: 'bg-red-100 text-red-800' },
      campos: [
        { label: 'Solicitante', valor: 'Dra. María Fernanda González', emoji: '👤' },
        { label: 'Dependencia', valor: 'Subdirección de Contratación', emoji: '🏢' },
        { label: 'Asunto', valor: 'Adición y prórroga de contrato de obra', emoji: '📄' },
      ],
      indicador: {
        texto: '29 días',
        className: 'bg-green-100',
        icon: <CheckCircle className="w-3.5 h-3.5 text-green-600" />
      },
      colorBarra: '#7C3AED',
    },
    {
      id: 'AJ-2025-00002',
      etapa: 'CONCEPTO',
      titulo: 'AJ-2025-00002',
      subtitulo: 'Consulta Laboral',
      badge: { texto: 'ALTA', className: 'bg-red-100 text-red-800' },
      campos: [
        { label: 'Solicitante', valor: 'Dr. Jorge Luis Parra', emoji: '👤' },
        { label: 'Dependencia', valor: 'Subdirección de Talento Humano', emoji: '🏢' },
        { label: 'Asunto', valor: 'Procedimiento terminación contrato', emoji: '📄' },
      ],
      indicador: {
        texto: '11 días',
        className: 'bg-yellow-100',
        icon: <Clock className="w-3.5 h-3.5 text-yellow-600" />
      },
      colorBarra: '#7C3AED',
    },
  ],
};

// ==================== JUZGAMIENTO DISCIPLINARIO ====================
export const kanbanJuzgamiento: ConfigKanban = {
  titulo: 'Tablero Kanban Operativo',
  descripcion: 'Juzgamiento Disciplinario - Primera Instancia',
  iconoModulo: Gavel,
  colorIcono: '#059669',
  tipoItem: 'PROCESO_JUZGAMIENTO',
  nombreBotonNuevo: 'Nuevo Proceso',
  onNuevoItem: () => toast.info('Abrir formulario de nuevo proceso'),
  etapas: [
    { id: 'APERTURA', label: 'Apertura', color: '#6366F1' },
    { id: 'DESCARGOS', label: 'Descargos', color: '#F59E0B' },
    { id: 'PRUEBAS', label: 'Pruebas', color: '#8B5CF6' },
    { id: 'ALEGATOS', label: 'Alegatos', color: '#EC4899' },
    { id: 'DECISION', label: 'Decisión', color: '#10B981' },
  ],
  items: [
    {
      id: 'JD-2025-00001',
      etapa: 'DESCARGOS',
      titulo: 'JD-2025-00001',
      subtitulo: 'Proceso Disciplinario',
      badge: { texto: 'EN TRÁMITE', className: 'bg-yellow-100 text-yellow-800' },
      campos: [
        { label: 'Investigado', valor: 'Pedro González Ruiz (CC 123456)', emoji: '⚠️' },
        { label: 'Conducta', valor: 'Incumplimiento de deberes funcionales', emoji: '📋' },
        { label: 'Abogado', valor: 'Dr. Carlos Mendoza López', emoji: '👨‍⚖️' },
      ],
      indicador: {
        texto: '45 días',
        className: 'bg-green-100',
        icon: <CheckCircle className="w-3.5 h-3.5 text-green-600" />
      },
      colorBarra: '#059669',
    },
  ],
};

// ==================== PROCESOS COACTIVOS ====================
export const kanbanCoactivos: ConfigKanban = {
  titulo: 'Tablero Kanban Operativo',
  descripcion: 'Procesos Coactivos - Cobro Judicial',
  iconoModulo: DollarSign,
  colorIcono: '#F59E0B',
  tipoItem: 'PROCESO_COACTIVO',
  nombreBotonNuevo: 'Nuevo Proceso Coactivo',
  onNuevoItem: () => toast.info('Abrir formulario de nuevo proceso coactivo'),
  etapas: [
    { id: 'MANDAMIENTO', label: 'Mandamiento de Pago', color: '#6366F1' },
    { id: 'EMBARGO', label: 'Embargo', color: '#F59E0B' },
    { id: 'SECUESTRO', label: 'Secuestro', color: '#8B5CF6' },
    { id: 'REMATE', label: 'Remate', color: '#EC4899' },
    { id: 'TERMINADO', label: 'Terminado', color: '#10B981' },
  ],
  items: [
    {
      id: 'PC-2025-00001',
      etapa: 'MANDAMIENTO',
      titulo: 'PC-2025-00001',
      subtitulo: 'Proceso Coactivo',
      badge: { texto: 'ACTIVO', className: 'bg-orange-100 text-orange-800' },
      campos: [
        { label: 'Deudor', valor: 'Constructora XYZ S.A.S. (NIT 900123456)', emoji: '🏢' },
        { label: 'Concepto', valor: 'Incumplimiento Contrato 2024-015', emoji: '📄' },
        { label: 'Valor', valor: '$ 45.000.000', emoji: '💰' },
      ],
      indicador: {
        texto: '30 días',
        className: 'bg-green-100',
        icon: <CheckCircle className="w-3.5 h-3.5 text-green-600" />
      },
      colorBarra: '#F59E0B',
    },
  ],
};

// ==================== BUZÓN DE NOTIFICACIONES ====================
export const kanbanNotificaciones: ConfigKanban = {
  titulo: 'Tablero Kanban Operativo',
  descripcion: 'Buzón de Notificaciones - Control de Términos',
  iconoModulo: Mail,
  colorIcono: '#6366F1',
  tipoItem: 'NOTIFICACION',
  nombreBotonNuevo: 'Registrar Notificación',
  onNuevoItem: () => toast.info('Abrir formulario de nueva notificación'),
  etapas: [
    { id: 'RECIBIDA', label: 'Recibida', color: '#6366F1' },
    { id: 'LEIDA', label: 'Leída', color: '#F59E0B' },
    { id: 'EN_TRAMITE', label: 'En Trámite', color: '#8B5CF6' },
    { id: 'RESPONDIDA', label: 'Respondida', color: '#10B981' },
  ],
  items: [
    {
      id: 'BN-2025-00001',
      etapa: 'LEIDA',
      titulo: 'BN-2025-00001',
      subtitulo: 'Notificación Judicial',
      badge: { texto: 'PENDIENTE', className: 'bg-yellow-100 text-yellow-800' },
      campos: [
        { label: 'Expediente', valor: 'PJ-2025-00001', emoji: '📁' },
        { label: 'Tipo', valor: 'Auto admisorio demanda', emoji: '📄' },
        { label: 'Juzgado', valor: 'Juzgado 25 Civil Municipal', emoji: '⚖️' },
      ],
      indicador: {
        texto: '8 días',
        className: 'bg-yellow-100',
        icon: <Clock className="w-3.5 h-3.5 text-yellow-600" />
      },
      colorBarra: '#6366F1',
    },
  ],
};

// ==================== BUZÓN OFICINA JURÍDICA ====================
export const kanbanBuzonJuridica: ConfigKanban = {
  titulo: 'Tablero Kanban Operativo',
  descripcion: 'Buzón Oficina Jurídica - Correspondencia Entrante',
  iconoModulo: MessageSquare,
  colorIcono: '#8B5CF6',
  tipoItem: 'DOCUMENTO',
  nombreBotonNuevo: 'Radicar Documento',
  onNuevoItem: () => toast.info('Abrir formulario de radicación'),
  etapas: [
    { id: 'RADICADO', label: 'Radicado', color: '#6366F1' },
    { id: 'ASIGNADO', label: 'Asignado', color: '#F59E0B' },
    { id: 'EN_TRAMITE', label: 'En Trámite', color: '#8B5CF6' },
    { id: 'RESPONDIDO', label: 'Respondido', color: '#10B981' },
  ],
  items: [
    {
      id: 'BJ-2025-00001',
      etapa: 'RADICADO',
      titulo: 'BJ-2025-00001',
      subtitulo: 'Oficio',
      badge: { texto: 'PENDIENTE', className: 'bg-gray-100 text-gray-700' },
      campos: [
        { label: 'Remitente', valor: 'Ministerio de Educación', emoji: '🏛️' },
        { label: 'Asunto', valor: 'Solicitud información programas', emoji: '📄' },
        { label: 'Fecha', valor: '18 dic 2024', emoji: '📅' },
      ],
      indicador: {
        texto: 'Hoy',
        className: 'bg-blue-100',
        icon: <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
      },
      colorBarra: '#8B5CF6',
    },
  ],
};

// ==================== PLAN DE ACCIÓN ====================
export const kanbanPlanAccion: ConfigKanban = {
  titulo: 'Tablero Kanban Operativo',
  descripcion: 'Plan de Acción - Seguimiento Institucional',
  iconoModulo: Target,
  colorIcono: '#10B981',
  tipoItem: 'PLAN_ACCION',
  nombreBotonNuevo: 'Nuevo Plan',
  onNuevoItem: () => toast.info('Abrir formulario de nuevo plan'),
  etapas: [
    { id: 'PLANEACION', label: 'Planeación', color: '#6366F1' },
    { id: 'EJECUCION', label: 'Ejecución', color: '#F59E0B' },
    { id: 'SEGUIMIENTO', label: 'Seguimiento', color: '#8B5CF6' },
    { id: 'COMPLETADO', label: 'Completado', color: '#10B981' },
  ],
  items: [
    {
      id: 'PA-2025-001',
      etapa: 'EJECUCION',
      titulo: 'PA-2025-001',
      subtitulo: 'Plan de Acción 2025',
      badge: { texto: '15%', className: 'bg-blue-100 text-blue-800' },
      campos: [
        { label: 'Plan', valor: 'Plan de Mejoramiento Gestión Legal', emoji: '📋' },
        { label: 'Responsable', valor: 'Dra. Patricia González', emoji: '👤' },
        { label: 'Vencimiento', valor: '31 dic 2025', emoji: '📅' },
      ],
      indicador: {
        texto: 'Avance 15%',
        className: 'bg-yellow-100',
        icon: <Clock className="w-3.5 h-3.5 text-yellow-600" />
      },
      colorBarra: '#10B981',
    },
  ],
};

// ==================== RIESGOS ====================
export const kanbanRiesgos: ConfigKanban = {
  titulo: 'Tablero Kanban Operativo',
  descripcion: 'Gestión de Riesgos Jurídicos',
  iconoModulo: AlertTriangle,
  colorIcono: '#EF4444',
  tipoItem: 'RIESGO',
  nombreBotonNuevo: 'Registrar Riesgo',
  onNuevoItem: () => toast.info('Abrir formulario de nuevo riesgo'),
  etapas: [
    { id: 'IDENTIFICADO', label: 'Identificado', color: '#6366F1' },
    { id: 'ANALISIS', label: 'En Análisis', color: '#F59E0B' },
    { id: 'TRATAMIENTO', label: 'En Tratamiento', color: '#8B5CF6' },
    { id: 'MITIGADO', label: 'Mitigado', color: '#10B981' },
  ],
  items: [
    {
      id: 'R-2025-001',
      etapa: 'TRATAMIENTO',
      titulo: 'R-2025-001',
      subtitulo: 'Riesgo Alto',
      badge: { texto: 'ALTO', className: 'bg-red-100 text-red-800' },
      campos: [
        { label: 'Descripción', valor: 'Posible demanda colectiva graduados', emoji: '⚠️' },
        { label: 'Responsable', valor: 'Dr. Carlos Mendoza López', emoji: '👤' },
        { label: 'Probabilidad', valor: '70%', emoji: '📊' },
        { label: 'Impacto', valor: '85%', emoji: '💥' },
      ],
      indicador: {
        texto: 'En tratamiento',
        className: 'bg-orange-100',
        icon: <AlertCircle className="w-3.5 h-3.5 text-orange-600" />
      },
      colorBarra: '#EF4444',
    },
  ],
};

// ==================== PLANES DE MEJORAMIENTO ====================
export const kanbanMejoramiento: ConfigKanban = {
  titulo: 'Tablero Kanban Operativo',
  descripcion: 'Planes de Mejoramiento - Hallazgos Órganos de Control',
  iconoModulo: TrendingUp,
  colorIcono: '#3B82F6',
  tipoItem: 'PLAN_MEJORAMIENTO',
  nombreBotonNuevo: 'Nuevo Plan de Mejoramiento',
  onNuevoItem: () => toast.info('Abrir formulario de nuevo plan'),
  etapas: [
    { id: 'FORMULACION', label: 'Formulación', color: '#6366F1' },
    { id: 'EJECUCION', label: 'Ejecución', color: '#F59E0B' },
    { id: 'SEGUIMIENTO', label: 'Seguimiento', color: '#8B5CF6' },
    { id: 'COMPLETADO', label: 'Completado', color: '#10B981' },
  ],
  items: [
    {
      id: 'PM-2025-001',
      etapa: 'EJECUCION',
      titulo: 'PM-2025-001',
      subtitulo: 'Plan de Mejoramiento',
      badge: { texto: '25%', className: 'bg-blue-100 text-blue-800' },
      campos: [
        { label: 'Origen', valor: 'Contraloría General', emoji: '🏛️' },
        { label: 'Hallazgo', valor: 'Deficiencias en archivo de contratos', emoji: '📋' },
        { label: 'Responsable', valor: 'Subdirección Administrativa', emoji: '👤' },
      ],
      indicador: {
        texto: 'Avance 25%',
        className: 'bg-yellow-100',
        icon: <Clock className="w-3.5 h-3.5 text-yellow-600" />
      },
      colorBarra: '#3B82F6',
    },
  ],
};

// ==================== TÉRMINOS PARA INFORMES ====================
export const kanbanTerminos: ConfigKanban = {
  titulo: 'Tablero Kanban Operativo',
  descripcion: 'Términos para Informes - Control de Fechas Límite',
  iconoModulo: Calendar,
  colorIcono: '#0066CC',
  tipoItem: 'INFORME',
  nombreBotonNuevo: 'Registrar Informe',
  onNuevoItem: () => toast.info('Abrir formulario de nuevo informe'),
  etapas: [
    { id: 'PENDIENTE', label: 'Pendiente', color: '#6366F1' },
    { id: 'ELABORACION', label: 'En Elaboración', color: '#F59E0B' },
    { id: 'REVISION', label: 'Revisión', color: '#8B5CF6' },
    { id: 'ENVIADO', label: 'Enviado', color: '#10B981' },
  ],
  items: [
    {
      id: 'TI-2025-001',
      etapa: 'PENDIENTE',
      titulo: 'TI-2025-001',
      subtitulo: 'Informe Trimestral',
      badge: { texto: 'TRIMESTRAL', className: 'bg-indigo-100 text-indigo-800' },
      campos: [
        { label: 'Informe', valor: 'Gestión Legal Trimestral', emoji: '📊' },
        { label: 'Destino', valor: 'Ministerio de Educación', emoji: '🏛️' },
        { label: 'Vencimiento', valor: '31 ene 2025', emoji: '📅' },
      ],
      indicador: {
        texto: '44 días',
        className: 'bg-green-100',
        icon: <CheckCircle className="w-3.5 h-3.5 text-green-600" />
      },
      colorBarra: '#0066CC',
    },
  ],
};

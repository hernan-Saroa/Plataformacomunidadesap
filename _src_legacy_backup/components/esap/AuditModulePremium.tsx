import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Download, Filter, Calendar, ChevronDown, FileText, Shield, BarChart3, Activity, List, Clock, AlertTriangle } from 'lucide-react';
import { AuditLogTable } from './AuditLogTable';
import { AuditEventDetail, AuditEvent } from './AuditEventDetail';
import { AuditAnalytics } from './AuditAnalytics';
import { AuditAdvancedFilters } from './AuditAdvancedFilters';
import { AuditTimeline } from './AuditTimeline';
import { AuditAnomaliesDetector } from './AuditAnomaliesDetector';
import { toast } from 'sonner';
import { mapLogToEvent, loadAuditLogs, loadAvailableModules, type LoadLogsParams } from './audit/auditUtils';
import type { AuditLog } from '../../services/api/audit.service';
import { auditService } from '../../services/auditService';

type ViewMode = 'table' | 'timeline' | 'anomalies';

interface FilterOptions {
  dateRange: string;
  startDate: string;
  endDate: string;
  severities: string[];
  modules: string[];
  statuses: string[];
  userSearch: string;
  ipAddress: string;
}

export function AuditModulePremium() {
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(100);
  
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: 'last24h',
    startDate: '',
    endDate: '',
    severities: [],
    modules: [],
    statuses: [],
    userSearch: '',
    ipAddress: ''
  });
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params: LoadLogsParams = {
        startDate: filters.startDate,
        endDate: filters.endDate,
        ipAddress: filters.ipAddress,
        modules: filters.modules,
      };
      const result = await loadAuditLogs(params);
      setLogs(result.logs || []);
      setTotal(result.total || 0);
    } catch (error) {
      console.error('Error loading audit logs:', error);
      toast.error('Error al cargar logs de auditoría');
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [filters.startDate, filters.endDate, filters.ipAddress, filters.modules]);

  const events: AuditEvent[] = useMemo(() => {
    if (!logs || !Array.isArray(logs)) return [];
    return logs.map(mapLogToEvent);
  }, [logs]);

  // Mock data - ACTUALIZADO con eventos de Usuario Persona, Roles y 2FA (fallback si no hay logs)
  const mockEvents: AuditEvent[] = [
    // ============ EVENTOS DE CONTROL INTERNO DE GESTIÓN ============
    
    // ━━━━━ PLAN ANUAL ━━━━━
    {
      id: 'EVT-CI-001',
      timestamp: '2025-11-17 16:30:00',
      user: 'Mario Osvaldo Bernal Rodríguez',
      userId: 'PER-OCI-001',
      action: 'Creación de Plan Anual de Auditoría 2025',
      module: 'Control Interno - Plan Anual',
      severity: 'high',
      status: 'success',
      ipAddress: '192.168.1.10',
      device: 'Windows 11 - Desktop',
      browser: 'Chrome 119.0',
      location: 'Bogotá, Colombia',
      duration: '3.5s',
      details: 'Se creó el Plan Anual de Auditoría 2025 con 45 auditorías programadas',
      changes: [
        { field: 'Año', before: 'N/A', after: '2025' },
        { field: 'Total Auditorías', before: '0', after: '45' },
        { field: 'Horas Estimadas', before: '0', after: '2,400 horas' },
        { field: 'Estado', before: 'N/A', after: 'Borrador' }
      ]
    },
    {
      id: 'EVT-CI-002',
      timestamp: '2025-11-17 16:25:30',
      user: 'Mario Osvaldo Bernal Rodríguez',
      userId: 'PER-OCI-001',
      action: 'Aprobación de Plan Anual por Rectoría',
      module: 'Control Interno - Plan Anual',
      severity: 'critical',
      status: 'success',
      ipAddress: '192.168.1.10',
      device: 'Windows 11 - Desktop',
      browser: 'Chrome 119.0',
      location: 'Bogotá, Colombia',
      duration: '2.1s',
      details: 'Plan Anual 2025 aprobado oficialmente - Activación automática de programa',
      changes: [
        { field: 'Estado', before: 'En Revisión', after: 'Aprobado' },
        { field: 'Aprobado Por', before: 'N/A', after: 'Dr. Ricardo Montes - Rector' },
        { field: 'Fecha Aprobación', before: 'N/A', after: '17/11/2025 16:25' }
      ]
    },
    
    // ━━━━━ UNIVERSO AUDITORÍAS ━━━━━
    {
      id: 'EVT-CI-003',
      timestamp: '2025-11-17 16:20:15',
      user: 'Sandra Montero',
      userId: 'PER-OCI-002',
      action: 'Creación de Área Auditable',
      module: 'Control Interno - Universo Auditorías',
      severity: 'medium',
      status: 'success',
      ipAddress: '192.168.1.11',
      device: 'Windows 10 - Desktop',
      browser: 'Edge 119.0',
      location: 'Bogotá, Colombia',
      duration: '1.8s',
      details: 'Se agregó nueva área "Gestión de Tecnología" al universo de auditorías',
      changes: [
        { field: 'Nombre', before: 'N/A', after: 'Gestión de Tecnología' },
        { field: 'Nivel de Riesgo', before: 'N/A', after: 'Alto' },
        { field: 'Frecuencia Auditoría', before: 'N/A', after: 'Anual' }
      ]
    },
    {
      id: 'EVT-CI-004',
      timestamp: '2025-11-17 16:15:42',
      user: 'Sandra Montero',
      userId: 'PER-OCI-002',
      action: 'Actualización de evaluación de riesgo',
      module: 'Control Interno - Universo Auditorías',
      severity: 'medium',
      status: 'success',
      ipAddress: '192.168.1.11',
      device: 'Windows 10 - Desktop',
      browser: 'Edge 119.0',
      location: 'Bogotá, Colombia',
      duration: '2.3s',
      details: 'Evaluación de riesgo actualizada para "Oficina Jurídica" - Incremento de nivel',
      changes: [
        { field: 'Nivel de Riesgo', before: 'Medio', after: 'Alto' },
        { field: 'Justificación', before: 'N/A', after: 'Incremento de litigios' },
        { field: 'Prioridad Auditoría', before: 'Normal', after: 'Alta' }
      ]
    },
    
    // ━━━━━ PROGRAMA ANUAL ━━━━━
    {
      id: 'EVT-CI-005',
      timestamp: '2025-11-17 16:10:20',
      user: 'Mario Osvaldo Bernal Rodríguez',
      userId: 'PER-OCI-001',
      action: 'Programación masiva de auditorías',
      module: 'Control Interno - Programa Anual',
      severity: 'high',
      status: 'success',
      ipAddress: '192.168.1.10',
      device: 'Windows 11 - Desktop',
      browser: 'Chrome 119.0',
      location: 'Bogotá, Colombia',
      duration: '5.2s',
      details: 'Se programaron 45 auditorías del Q1 2025 - Asignación automática de auditores',
      changes: [
        { field: 'Auditorías Programadas', before: '12', after: '45' },
        { field: 'Período', before: 'Q4 2024', after: 'Q1 2025' },
        { field: 'Auditores Asignados', before: '3', after: '8' }
      ]
    },
    
    // ━━━━━ AUDITORÍAS (KANBAN) ━━━━━
    {
      id: 'EVT-CI-006',
      timestamp: '2025-11-17 16:05:15',
      user: 'Sandra Montero',
      userId: 'PER-OCI-002',
      action: 'Cambio de estado: Planificada → En Curso',
      module: 'Control Interno - Auditorías',
      severity: 'medium',
      status: 'success',
      ipAddress: '192.168.1.11',
      device: 'Windows 10 - Desktop',
      browser: 'Edge 119.0',
      location: 'Bogotá, Colombia',
      duration: '1.5s',
      details: 'Auditoría "AUD-2025-003 - Gestión Financiera" iniciada oficialmente',
      changes: [
        { field: 'Estado Kanban', before: 'Planificada', after: 'En Curso' },
        { field: 'Fecha Inicio Real', before: 'N/A', after: '17/11/2025' },
        { field: 'Auditor Líder', before: 'Sin asignar', after: 'Sandra Montero' }
      ]
    },
    {
      id: 'EVT-CI-007',
      timestamp: '2025-11-17 16:00:30',
      user: 'Sandra Montero',
      userId: 'PER-OCI-002',
      action: 'Apertura de expediente de auditoría',
      module: 'Control Interno - Auditorías',
      severity: 'info',
      status: 'success',
      ipAddress: '192.168.1.11',
      device: 'Windows 10 - Desktop',
      browser: 'Edge 119.0',
      location: 'Bogotá, Colombia',
      duration: '2.1s',
      details: 'Expediente creado automáticamente para AUD-2025-003 con todos los documentos base',
      changes: [
        { field: 'Expediente', before: 'No existe', after: 'EXP-2025-003' },
        { field: 'Documentos Iniciales', before: '0', after: '12 documentos' }
      ]
    },
    
    // ━━━━━ HALLAZGOS ━━━━━
    {
      id: 'EVT-CI-008',
      timestamp: '2025-11-17 15:55:20',
      user: 'Sandra Montero',
      userId: 'PER-OCI-002',
      action: 'Registro de hallazgo crítico',
      module: 'Control Interno - Hallazgos',
      severity: 'critical',
      status: 'success',
      ipAddress: '192.168.1.11',
      device: 'Windows 10 - Desktop',
      browser: 'Edge 119.0',
      location: 'Bogotá, Colombia',
      duration: '3.2s',
      details: 'Hallazgo crítico detectado en Gestión Financiera - Falta de segregación de funciones',
      changes: [
        { field: 'Código', before: 'N/A', after: 'HAL-2025-008' },
        { field: 'Tipo', before: 'N/A', after: 'No Conformidad Mayor' },
        { field: 'Nivel Riesgo', before: 'N/A', after: 'Crítico' },
        { field: 'Área Notificada', before: 'N/A', after: 'Dirección Financiera' }
      ]
    },
    {
      id: 'EVT-CI-009',
      timestamp: '2025-11-17 15:50:45',
      user: 'Sandra Montero',
      userId: 'PER-OCI-002',
      action: 'Notificación automática de hallazgo a área',
      module: 'Control Interno - Hallazgos',
      severity: 'high',
      status: 'success',
      ipAddress: '192.168.1.11',
      device: 'Windows 10 - Desktop',
      browser: 'Edge 119.0',
      location: 'Bogotá, Colombia',
      duration: '0.8s',
      details: 'Email automático enviado a Jefe de Área Financiera con hallazgo HAL-2025-008',
      changes: [
        { field: 'Notificación Enviada', before: 'No', after: 'Sí' },
        { field: 'Destinatarios', before: 'N/A', after: 'Jefe Área + Director Financiero' }
      ]
    },
    
    // ━━━━━ PLANES DE MEJORAMIENTO ━━━━━
    {
      id: 'EVT-CI-010',
      timestamp: '2025-11-17 15:45:30',
      user: 'María Pérez González',
      userId: 'PER-FIN-001',
      action: 'Formulación de Plan de Mejoramiento',
      module: 'Control Interno - Planes de Mejoramiento',
      severity: 'high',
      status: 'success',
      ipAddress: '192.168.1.25',
      device: 'Windows 10 - Laptop',
      browser: 'Chrome 119.0',
      location: 'Bogotá, Colombia',
      duration: '4.5s',
      details: 'Plan de mejoramiento creado para hallazgo HAL-2025-008 con 4 acciones correctivas',
      changes: [
        { field: 'Código Plan', before: 'N/A', after: 'PM-2025-003' },
        { field: 'Acciones Definidas', before: '0', after: '4 acciones' },
        { field: 'Plazo', before: 'N/A', after: '60 días' },
        { field: 'Responsable', before: 'N/A', after: 'María Pérez González' }
      ]
    },
    {
      id: 'EVT-CI-011',
      timestamp: '2025-11-17 15:40:15',
      user: 'Mario Osvaldo Bernal Rodríguez',
      userId: 'PER-OCI-001',
      action: 'Aprobación de Plan de Mejoramiento',
      module: 'Control Interno - Planes de Mejoramiento',
      severity: 'medium',
      status: 'success',
      ipAddress: '192.168.1.10',
      device: 'Windows 11 - Desktop',
      browser: 'Chrome 119.0',
      location: 'Bogotá, Colombia',
      duration: '1.8s',
      details: 'Plan PM-2025-003 aprobado oficialmente - Inicio de seguimiento automático',
      changes: [
        { field: 'Estado', before: 'En Revisión', after: 'Aprobado' },
        { field: 'Observaciones', before: 'Ninguna', after: 'Aprobado sin observaciones' }
      ]
    },
    
    // ━━━━━ SEGUIMIENTO ━━━━━
    {
      id: 'EVT-CI-012',
      timestamp: '2025-11-17 15:35:42',
      user: 'María Pérez González',
      userId: 'PER-FIN-001',
      action: 'Actualización de avance de acción',
      module: 'Control Interno - Seguimiento',
      severity: 'info',
      status: 'success',
      ipAddress: '192.168.1.25',
      device: 'Windows 10 - Laptop',
      browser: 'Chrome 119.0',
      location: 'Bogotá, Colombia',
      duration: '2.1s',
      details: 'Avance actualizado al 45% para acción "Implementación de segregación de funciones"',
      changes: [
        { field: 'Avance', before: '25%', after: '45%' },
        { field: 'Estado', before: 'En Proceso', after: 'En Proceso' },
        { field: 'Evidencias', before: '2 archivos', after: '5 archivos' }
      ]
    },
    {
      id: 'EVT-CI-013',
      timestamp: '2025-11-17 15:30:20',
      user: 'Sistema Automático',
      userId: 'SYS-0001',
      action: 'Alerta de vencimiento próximo',
      module: 'Control Interno - Seguimiento',
      severity: 'medium',
      status: 'warning',
      ipAddress: '127.0.0.1',
      device: 'Server Ubuntu 22.04',
      browser: 'N/A',
      location: 'Servidor Principal',
      duration: '0.5s',
      details: 'Notificación automática enviada - Plan PM-2025-001 vence en 7 días',
      changes: [
        { field: 'Alerta Enviada', before: 'No', after: 'Sí' },
        { field: 'Días Restantes', before: '7', after: '7 (CRÍTICO)' }
      ]
    },
    
    // ━━━━━ GESTIÓN DOCUMENTAL ━━━━━
    {
      id: 'EVT-CI-014',
      timestamp: '2025-11-17 15:25:30',
      user: 'Sandra Montero',
      userId: 'PER-OCI-002',
      action: 'Carga de documento de auditoría',
      module: 'Control Interno - Gestión Documental',
      severity: 'info',
      status: 'success',
      ipAddress: '192.168.1.11',
      device: 'Windows 10 - Desktop',
      browser: 'Edge 119.0',
      location: 'Bogotá, Colombia',
      duration: '3.4s',
      details: 'Documento "Informe Final AUD-2025-003" cargado (2.4 MB)',
      changes: [
        { field: 'Nombre Archivo', before: 'N/A', after: 'Informe_Final_AUD_2025_003.pdf' },
        { field: 'Tamaño', before: 'N/A', after: '2.4 MB' },
        { field: 'Tipo', before: 'N/A', after: 'Informe Final' }
      ]
    },
    {
      id: 'EVT-CI-015',
      timestamp: '2025-11-17 15:20:15',
      user: 'María Pérez González',
      userId: 'PER-FIN-001',
      action: 'Carga de evidencia de mejoramiento',
      module: 'Control Interno - Gestión Documental',
      severity: 'info',
      status: 'success',
      ipAddress: '192.168.1.25',
      device: 'Windows 10 - Laptop',
      browser: 'Chrome 119.0',
      location: 'Bogotá, Colombia',
      duration: '2.8s',
      details: 'Evidencia fotográfica cargada para acción PM-2025-003',
      changes: [
        { field: 'Carpeta', before: 'Planes de Mejoramiento', after: 'Planes de Mejoramiento/PM-2025-003' },
        { field: 'Archivos', before: '5', after: '6' }
      ]
    },
    
    // ━━━━━ EXPEDIENTES ━━━━━
    {
      id: 'EVT-CI-016',
      timestamp: '2025-11-17 15:15:42',
      user: 'Sandra Montero',
      userId: 'PER-OCI-002',
      action: 'Creación de expediente digital',
      module: 'Control Interno - Expedientes',
      severity: 'medium',
      status: 'success',
      ipAddress: '192.168.1.11',
      device: 'Windows 10 - Desktop',
      browser: 'Edge 119.0',
      location: 'Bogotá, Colombia',
      duration: '2.5s',
      details: 'Expediente EXP-2025-004 creado automáticamente para auditoría AUD-2025-004',
      changes: [
        { field: 'Código', before: 'N/A', after: 'EXP-2025-004' },
        { field: 'Auditoría Asociada', before: 'N/A', after: 'AUD-2025-004' },
        { field: 'Estado', before: 'N/A', after: 'Activo' }
      ]
    },
    {
      id: 'EVT-CI-017',
      timestamp: '2025-11-17 15:10:20',
      user: 'Mario Osvaldo Bernal Rodríguez',
      userId: 'PER-OCI-001',
      action: 'Búsqueda avanzada en expedientes',
      module: 'Control Interno - Expedientes',
      severity: 'low',
      status: 'success',
      ipAddress: '192.168.1.10',
      device: 'Windows 11 - Desktop',
      browser: 'Chrome 119.0',
      location: 'Bogotá, Colombia',
      duration: '1.2s',
      details: 'Búsqueda realizada: "Gestión Financiera 2024" - 12 expedientes encontrados'
    },
    
    // ━━━━━ CONFIGURACIONES ━━━━━
    {
      id: 'EVT-CI-018',
      timestamp: '2025-11-17 15:05:30',
      user: 'Mario Osvaldo Bernal Rodríguez',
      userId: 'PER-OCI-001',
      action: 'Creación de tipo de auditoría',
      module: 'Control Interno - Configuraciones',
      severity: 'medium',
      status: 'success',
      ipAddress: '192.168.1.10',
      device: 'Windows 11 - Desktop',
      browser: 'Chrome 119.0',
      location: 'Bogotá, Colombia',
      duration: '1.8s',
      details: 'Nuevo tipo de auditoría creado: "Auditoría de Tecnología"',
      changes: [
        { field: 'Nombre', before: 'N/A', after: 'Auditoría de Tecnología' },
        { field: 'Color', before: 'N/A', after: '#8B5CF6 (Púrpura)' },
        { field: 'Duración Estimada', before: 'N/A', after: '40 horas' }
      ]
    },
    {
      id: 'EVT-CI-019',
      timestamp: '2025-11-17 15:00:15',
      user: 'Mario Osvaldo Bernal Rodríguez',
      userId: 'PER-OCI-001',
      action: 'Actualización de configuración de Kanban',
      module: 'Control Interno - Configuraciones',
      severity: 'low',
      status: 'success',
      ipAddress: '192.168.1.10',
      device: 'Windows 11 - Desktop',
      browser: 'Chrome 119.0',
      location: 'Bogotá, Colombia',
      duration: '0.9s',
      details: 'Columnas del Kanban reorganizadas - Nueva columna "Revisión Interna" agregada',
      changes: [
        { field: 'Columnas', before: '6', after: '7' },
        { field: 'Nueva Columna', before: 'N/A', after: 'Revisión Interna' }
      ]
    },
    
    // ━━━━━ NOTIFICACIONES ━━━━━
    {
      id: 'EVT-CI-020',
      timestamp: '2025-11-17 14:55:42',
      user: 'Sistema Automático',
      userId: 'SYS-0001',
      action: 'Envío masivo de notificaciones',
      module: 'Control Interno - Notificaciones',
      severity: 'info',
      status: 'success',
      ipAddress: '127.0.0.1',
      device: 'Server Ubuntu 22.04',
      browser: 'N/A',
      location: 'Servidor Principal',
      duration: '2.3s',
      details: 'Recordatorios de auditorías próximas enviados a 8 auditores',
      changes: [
        { field: 'Notificaciones Enviadas', before: '0', after: '8' },
        { field: 'Tipo', before: 'N/A', after: 'Recordatorio de Auditoría' }
      ]
    },
    
    // ━━━━━ DASHBOARD KANBAN ━━━━━
    {
      id: 'EVT-CI-021',
      timestamp: '2025-11-17 14:50:30',
      user: 'Sandra Montero',
      userId: 'PER-OCI-002',
      action: 'Actualización de métricas del dashboard',
      module: 'Control Interno - Dashboard Kanban',
      severity: 'low',
      status: 'success',
      ipAddress: '192.168.1.11',
      device: 'Windows 10 - Desktop',
      browser: 'Edge 119.0',
      location: 'Bogotá, Colombia',
      duration: '1.5s',
      details: 'Métricas recalculadas automáticamente - Dashboard actualizado'
    },
    
    // ━━━━━ TRAZABILIDAD ━━━━━
    {
      id: 'EVT-CI-022',
      timestamp: '2025-11-17 14:45:20',
      user: 'Mario Osvaldo Bernal Rodríguez',
      userId: 'PER-OCI-001',
      action: 'Consulta de historial de auditoría',
      module: 'Control Interno - Trazabilidad',
      severity: 'low',
      status: 'success',
      ipAddress: '192.168.1.10',
      device: 'Windows 11 - Desktop',
      browser: 'Chrome 119.0',
      location: 'Bogotá, Colombia',
      duration: '0.8s',
      details: 'Historial completo consultado para AUD-2025-003 - 47 eventos registrados'
    },
    
    // ━━━━━ COMUNICACIONES ━━━━━
    {
      id: 'EVT-CI-023',
      timestamp: '2025-11-17 14:40:15',
      user: 'Sandra Montero',
      userId: 'PER-OCI-002',
      action: 'Envío de comunicación oficial',
      module: 'Control Interno - Comunicaciones',
      severity: 'medium',
      status: 'success',
      ipAddress: '192.168.1.11',
      device: 'Windows 10 - Desktop',
      browser: 'Edge 119.0',
      location: 'Bogotá, Colombia',
      duration: '1.6s',
      details: 'Comunicación oficial enviada a Dirección Financiera sobre hallazgo crítico',
      changes: [
        { field: 'Destinatario', before: 'N/A', after: 'Dirección Financiera' },
        { field: 'Tipo', before: 'N/A', after: 'Hallazgo Crítico' },
        { field: 'Estado', before: 'N/A', after: 'Enviado' }
      ]
    },
    
    // ━━━━━ APROBACIONES ━━━━━
    {
      id: 'EVT-CI-024',
      timestamp: '2025-11-17 14:35:30',
      user: 'Mario Osvaldo Bernal Rodríguez',
      userId: 'PER-OCI-001',
      action: 'Aprobación de informe final',
      module: 'Control Interno - Aprobaciones',
      severity: 'high',
      status: 'success',
      ipAddress: '192.168.1.10',
      device: 'Windows 11 - Desktop',
      browser: 'Chrome 119.0',
      location: 'Bogotá, Colombia',
      duration: '2.2s',
      details: 'Informe final AUD-2025-002 aprobado y firmado digitalmente',
      changes: [
        { field: 'Estado', before: 'En Revisión', after: 'Aprobado' },
        { field: 'Firma Digital', before: 'No', after: 'Sí' },
        { field: 'Fecha Aprobación', before: 'N/A', after: '17/11/2025 14:35' }
      ]
    },
    {
      id: 'EVT-CI-025',
      timestamp: '2025-11-17 14:30:45',
      user: 'Mario Osvaldo Bernal Rodríguez',
      userId: 'PER-OCI-001',
      action: 'Rechazo de documento con observaciones',
      module: 'Control Interno - Aprobaciones',
      severity: 'medium',
      status: 'warning',
      ipAddress: '192.168.1.10',
      device: 'Windows 11 - Desktop',
      browser: 'Chrome 119.0',
      location: 'Bogotá, Colombia',
      duration: '1.9s',
      details: 'Documento rechazado - Se requieren correcciones en metodología',
      changes: [
        { field: 'Estado', before: 'Pendiente', after: 'Rechazado' },
        { field: 'Observaciones', before: 'Ninguna', after: 'Metodología incompleta' }
      ]
    },
    
    // ━━━━━ HISTORIAL ━━━━━
    {
      id: 'EVT-CI-026',
      timestamp: '2025-11-17 14:25:30',
      user: 'Sandra Montero',
      userId: 'PER-OCI-002',
      action: 'Exportación de historial de auditoría',
      module: 'Control Interno - Historial',
      severity: 'info',
      status: 'success',
      ipAddress: '192.168.1.11',
      device: 'Windows 10 - Desktop',
      browser: 'Edge 119.0',
      location: 'Bogotá, Colombia',
      duration: '3.8s',
      details: 'Historial completo de AUD-2025-001 exportado a PDF - 89 páginas generadas',
      changes: [
        { field: 'Formato', before: 'N/A', after: 'PDF' },
        { field: 'Eventos Incluidos', before: '0', after: '127 eventos' },
        { field: 'Tamaño Archivo', before: 'N/A', after: '4.2 MB' }
      ]
    },

    // ============ EVENTOS DE AUTENTICACIÓN 2FA ============
    {
      id: 'EVT-2FA-001',
      timestamp: '2025-11-17 14:45:22',
      user: 'María Rodríguez',
      userId: 'PER-1034',
      action: 'Inicio de sesión con 2FA exitoso',
      module: 'Autenticación 2FA',
      severity: 'info',
      status: 'success',
      ipAddress: '192.168.1.45',
      device: 'Windows 11 - Desktop',
      browser: 'Chrome 119.0',
      location: 'Bogotá, Colombia',
      duration: '2.3s',
      details: 'Usuario con rol Super Administrador verificó código 2FA correctamente. Código enviado a: m***a@esap.edu.co'
    },
    {
      id: 'EVT-2FA-002',
      timestamp: '2025-11-17 14:40:15',
      user: 'Carlos Mendoza',
      userId: 'PER-2045',
      action: 'Fallo en verificación 2FA',
      module: 'Autenticación 2FA',
      severity: 'medium',
      status: 'warning',
      ipAddress: '192.168.1.67',
      device: 'iPhone 14 - Mobile',
      browser: 'Safari Mobile 17.1',
      location: 'Medellín, Colombia',
      duration: '1.2s',
      details: 'Código 2FA incorrecto ingresado. Intento 2 de 3 permitidos.'
    },

    // ============ EVENTOS DE ROLES Y PERMISOS ============
    {
      id: 'EVT-ROL-001',
      timestamp: '2025-11-17 14:30:42',
      user: 'Admin Sistema',
      userId: 'PER-0001',
      action: 'Activación de 2FA en rol',
      module: 'Roles y Permisos',
      severity: 'high',
      status: 'success',
      ipAddress: '192.168.1.10',
      device: 'MacBook Pro - Laptop',
      browser: 'Safari 17.1',
      location: 'Bogotá, Colombia',
      duration: '0.8s',
      details: 'Se activó autenticación de dos factores para el rol "Coordinador Académico"',
      changes: [
        { field: 'Requiere 2FA', before: 'No', after: 'Sí' },
        { field: 'Nivel de Seguridad', before: 'Estándar', after: 'Alto' },
        { field: 'Afecta a usuarios', before: '0', after: '12 usuarios ahora requieren 2FA' }
      ]
    },
    {
      id: 'EVT-ROL-002',
      timestamp: '2025-11-17 14:25:15',
      user: 'Admin Sistema',
      userId: 'PER-0001',
      action: 'Creación de rol personalizado',
      module: 'Roles y Permisos',
      severity: 'medium',
      status: 'success',
      ipAddress: '192.168.1.10',
      device: 'MacBook Pro - Laptop',
      browser: 'Safari 17.1',
      location: 'Bogotá, Colombia',
      duration: '1.1s',
      details: 'Se creó un nuevo rol personalizado "Coordinador de Sede Medellín"',
      changes: [
        { field: 'Nombre', before: 'N/A', after: 'Coordinador de Sede Medellín' },
        { field: 'Color', before: 'N/A', after: '#16a34a (Verde)' },
        { field: 'Icono', before: 'N/A', after: 'Building2' },
        { field: 'Requiere 2FA', before: 'N/A', after: 'Sí' },
        { field: 'Permisos asignados', before: 'N/A', after: '18 permisos' }
      ]
    },
    {
      id: 'EVT-ROL-003',
      timestamp: '2025-11-17 14:20:33',
      user: 'Admin Sistema',
      userId: 'PER-0001',
      action: 'Modificación de permisos de rol',
      module: 'Roles y Permisos',
      severity: 'high',
      status: 'success',
      ipAddress: '192.168.1.10',
      device: 'MacBook Pro - Laptop',
      browser: 'Safari 17.1',
      location: 'Bogotá, Colombia',
      duration: '1.5s',
      details: 'Se modificaron permisos del rol "Docente" - Se agregaron permisos de gestión de calificaciones',
      changes: [
        { field: 'Permisos de Escritura', before: 'Ver Calificaciones', after: 'Ver y Editar Calificaciones' },
        { field: 'Permisos Adicionales', before: 'Ninguno', after: 'Exportar Calificaciones' }
      ]
    },
    {
      id: 'EVT-ROL-004',
      timestamp: '2025-11-17 14:15:20',
      user: 'Admin Sistema',
      userId: 'PER-0001',
      action: 'Generación de QR para enrolamiento',
      module: 'Roles y Permisos',
      severity: 'info',
      status: 'success',
      ipAddress: '192.168.1.10',
      device: 'MacBook Pro - Laptop',
      browser: 'Safari 17.1',
      location: 'Bogotá, Colombia',
      duration: '0.5s',
      details: 'Se generó código QR para enrolamiento automático del rol "Estudiante". QR descargado para imprimir.'
    },
    {
      id: 'EVT-ROL-005',
      timestamp: '2025-11-17 14:10:45',
      user: 'Admin Sistema',
      userId: 'PER-0001',
      action: 'Duplicación de rol',
      module: 'Roles y Permisos',
      severity: 'medium',
      status: 'success',
      ipAddress: '192.168.1.10',
      device: 'MacBook Pro - Laptop',
      browser: 'Safari 17.1',
      location: 'Bogotá, Colombia',
      duration: '0.7s',
      details: 'Se duplicó el rol "Administrativo" para crear "Administrativo Regional"',
      changes: [
        { field: 'Rol origen', before: 'N/A', after: 'Administrativo' },
        { field: 'Rol nuevo', before: 'N/A', after: 'Administrativo Regional' },
        { field: 'Permisos copiados', before: 'N/A', after: '24 permisos' }
      ]
    },

    // ============ EVENTOS DE USUARIO PERSONA ============
    {
      id: 'EVT-USR-001',
      timestamp: '2025-11-17 14:05:30',
      user: 'Coordinador Académico',
      userId: 'PER-5023',
      action: 'Creación de Usuario Persona - Estudiante',
      module: 'Usuario Persona',
      severity: 'medium',
      status: 'success',
      ipAddress: '192.168.1.34',
      device: 'Windows 10 - Desktop',
      browser: 'Edge 119.0',
      location: 'Cali, Colombia',
      duration: '1.8s',
      details: 'Se creó nuevo Usuario Persona con rol Estudiante - Laura Martínez - CC 1.234.567.890',
      changes: [
        { field: 'Nombre Completo', before: 'N/A', after: 'Laura Martínez Gómez' },
        { field: 'Documento', before: 'N/A', after: 'CC 1.234.567.890' },
        { field: 'Rol Principal', before: 'N/A', after: 'Estudiante' },
        { field: 'Email Institucional', before: 'N/A', after: 'laura.martinez@esap.edu.co' },
        { field: 'Estado', before: 'N/A', after: 'Activo - Perfil Incompleto (35%)' }
      ]
    },
    {
      id: 'EVT-USR-002',
      timestamp: '2025-11-17 14:00:15',
      user: 'Sistema Enrolamiento',
      userId: 'SYS-ENROLL',
      action: 'Solicitud de enrolamiento por QR',
      module: 'Usuario Persona',
      severity: 'info',
      status: 'success',
      ipAddress: '192.168.1.156',
      device: 'Android 13 - Mobile',
      browser: 'Chrome Mobile 119.0',
      location: 'Barranquilla, Colombia',
      duration: '0.9s',
      details: 'Usuario escaneó QR de rol "Aspirante" y completó solicitud de enrolamiento. Estado: Pendiente de Aprobación',
      changes: [
        { field: 'Nombre', before: 'N/A', after: 'Juan Pérez Castro' },
        { field: 'Documento', before: 'N/A', after: 'CC 9.876.543.210' },
        { field: 'Rol Solicitado', before: 'N/A', after: 'Aspirante' },
        { field: 'Estado Solicitud', before: 'N/A', after: 'Pendiente Aprobación' }
      ]
    },
    {
      id: 'EVT-USR-003',
      timestamp: '2025-11-17 13:55:42',
      user: 'Coordinador Académico',
      userId: 'PER-5023',
      action: 'Aprobación de solicitud de enrolamiento',
      module: 'Usuario Persona',
      severity: 'medium',
      status: 'success',
      ipAddress: '192.168.1.34',
      device: 'Windows 10 - Desktop',
      browser: 'Edge 119.0',
      location: 'Cali, Colombia',
      duration: '1.2s',
      details: 'Se aprobó solicitud de enrolamiento de Ana Torres - Rol: Estudiante',
      changes: [
        { field: 'Estado Solicitud', before: 'Pendiente', after: 'Aprobada' },
        { field: 'Usuario Creado', before: 'No', after: 'Sí - ana.torres@esap.edu.co' },
        { field: 'Notificación', before: 'No enviada', after: 'Email de bienvenida enviado' }
      ]
    },
    {
      id: 'EVT-USR-004',
      timestamp: '2025-11-17 13:50:20',
      user: 'Jefe Talento Humano',
      userId: 'PER-8034',
      action: 'Activación de rol adicional',
      module: 'Usuario Persona',
      severity: 'medium',
      status: 'success',
      ipAddress: '192.168.1.78',
      device: 'MacBook Air - Laptop',
      browser: 'Firefox 120.0',
      location: 'Bogotá, Colombia',
      duration: '1.0s',
      details: 'Se activó rol DOCENTE adicional para María López (ya tiene rol ESTUDIANTE)',
      changes: [
        { field: 'Roles Activos', before: 'Estudiante', after: 'Estudiante, Docente' },
        { field: 'Dashboard', before: 'Vista Simple', after: 'Vista Dual con Selector' },
        { field: 'Permisos', before: '12 permisos', after: '28 permisos (suma de ambos roles)' }
      ]
    },
    {
      id: 'EVT-USR-005',
      timestamp: '2025-11-17 13:45:10',
      user: 'Coordinador Académico',
      userId: 'PER-5023',
      action: 'Evolución de rol: Estudiante → Graduado',
      module: 'Usuario Persona',
      severity: 'info',
      status: 'success',
      ipAddress: '192.168.1.34',
      device: 'Windows 10 - Desktop',
      browser: 'Edge 119.0',
      location: 'Cali, Colombia',
      duration: '1.5s',
      details: 'Usuario completó todos los créditos y se graduó - Activación automática de rol Graduado',
      changes: [
        { field: 'Rol Estudiante', before: 'Activo', after: 'Histórico' },
        { field: 'Rol Graduado', before: 'Inactivo', after: 'Activo' },
        { field: 'Estado Académico', before: 'Cursando', after: 'Graduado' },
        { field: 'Diploma Digital', before: 'No generado', after: 'Generado en Carpeta Digital' }
      ]
    },
    {
      id: 'EVT-USR-006',
      timestamp: '2025-11-17 13:40:55',
      user: 'Roberto Díaz',
      userId: 'PER-6045',
      action: 'Carga masiva de usuarios',
      module: 'Usuario Persona',
      severity: 'high',
      status: 'success',
      ipAddress: '192.168.1.156',
      device: 'Windows 11 - Desktop',
      browser: 'Chrome 119.0',
      location: 'Barranquilla, Colombia',
      duration: '45.3s',
      details: 'Se cargaron 247 usuarios masivamente desde archivo Excel - Rol: Estudiante',
      changes: [
        { field: 'Archivo', before: 'N/A', after: 'estudiantes_2025-1.xlsx' },
        { field: 'Registros Procesados', before: '0', after: '247' },
        { field: 'Exitosos', before: '0', after: '243' },
        { field: 'Con Errores', before: '0', after: '4 (documentos duplicados)' }
      ]
    },

    // ============ EVENTOS DE PERFIL Y DOCUMENTOS ============
    {
      id: 'EVT-DOC-001',
      timestamp: '2025-11-17 13:35:30',
      user: 'Laura Martínez',
      userId: 'PER-9012',
      action: 'Completitud de perfil alcanzada',
      module: 'Usuario Persona',
      severity: 'info',
      status: 'success',
      ipAddress: '192.168.1.203',
      device: 'iPhone 14 - Mobile',
      browser: 'Safari Mobile 17.1',
      location: 'Cartagena, Colombia',
      duration: '0.6s',
      details: 'Usuario completó 100% de su perfil - Ahora tiene acceso a todos los servicios',
      changes: [
        { field: 'Completitud', before: '65%', after: '100%' },
        { field: 'Documentos Subidos', before: '3/5', after: '5/5' },
        { field: 'Acceso Servicios', before: 'Limitado', after: 'Completo' }
      ]
    },
    {
      id: 'EVT-DOC-002',
      timestamp: '2025-11-17 13:30:15',
      user: 'Validador de Documentos',
      userId: 'PER-4055',
      action: 'Aprobación de documento',
      module: 'Usuario Persona',
      severity: 'info',
      status: 'success',
      ipAddress: '192.168.1.89',
      device: 'iPad Pro - Tablet',
      browser: 'Safari Mobile 17.1',
      location: 'Medellín, Colombia',
      duration: '0.8s',
      details: 'Se aprobó documento "Cédula de Ciudadanía" de Pedro Sánchez',
      changes: [
        { field: 'Estado Documento', before: 'En Revisión', after: 'Aprobado' },
        { field: 'Completitud Perfil', before: '75%', after: '85%' }
      ]
    },
    {
      id: 'EVT-DOC-003',
      timestamp: '2025-11-17 13:25:40',
      user: 'Validador de Documentos',
      userId: 'PER-4055',
      action: 'Rechazo de documento',
      module: 'Usuario Persona',
      severity: 'medium',
      status: 'warning',
      ipAddress: '192.168.1.89',
      device: 'iPad Pro - Tablet',
      browser: 'Safari Mobile 17.1',
      location: 'Medellín, Colombia',
      duration: '1.2s',
      details: 'Se rechazó documento "Diploma de Bachiller" por baja calidad de imagen',
      changes: [
        { field: 'Estado Documento', before: 'En Revisión', after: 'Rechazado' },
        { field: 'Motivo', before: 'N/A', after: 'Imagen borrosa - Por favor cargar foto clara' },
        { field: 'Notificación', before: 'No enviada', after: 'Email enviado al usuario' }
      ]
    },

    // ============ EVENTOS CRÍTICOS DE SEGURIDAD ============
    {
      id: 'EVT-SEC-001',
      timestamp: '2025-11-17 13:20:15',
      user: 'Ana García',
      userId: 'PER-3021',
      action: 'Múltiples intentos fallidos de login',
      module: 'Seguridad',
      severity: 'critical',
      status: 'failed',
      ipAddress: '45.123.67.89',
      device: 'Android 13 - Mobile',
      browser: 'Chrome Mobile 119.0',
      location: 'Desconocido - IP sospechosa',
      duration: '5.2s',
      details: '5 intentos fallidos de inicio de sesión en 2 minutos - Cuenta bloqueada temporalmente por 30 minutos'
    },
    {
      id: 'EVT-SEC-002',
      timestamp: '2025-11-17 13:15:30',
      user: 'Sistema de Seguridad',
      userId: 'SYS-SEC',
      action: 'Detección de inicio de sesión inusual',
      module: 'Seguridad',
      severity: 'high',
      status: 'warning',
      ipAddress: '203.45.67.89',
      device: 'Linux Ubuntu - Desktop',
      browser: 'Firefox 120.0',
      location: 'Estados Unidos',
      duration: '0.3s',
      details: 'Inicio de sesión desde ubicación inusual detectado para usuario Carlos Mendoza',
      changes: [
        { field: 'Ubicación Habitual', before: 'Colombia', after: 'Estados Unidos (nueva)' },
        { field: 'Notificación', before: 'No enviada', after: 'Email de alerta enviado' },
        { field: 'Acción', before: 'N/A', after: 'Requiere verificación adicional' }
      ]
    },

    // ============ EVENTOS DEL SISTEMA ============
    {
      id: 'EVT-SYS-001',
      timestamp: '2025-11-17 13:10:00',
      user: 'Sistema Automático',
      userId: 'SYS-0001',
      action: 'Respaldo automático de base de datos',
      module: 'Sistema',
      severity: 'info',
      status: 'success',
      ipAddress: '127.0.0.1',
      device: 'Server Ubuntu 22.04',
      browser: 'N/A',
      location: 'Servidor Principal',
      duration: '45.3s',
      details: 'Respaldo programado ejecutado correctamente - 2.3 GB respaldados'
    },
    {
      id: 'EVT-SYS-002',
      timestamp: '2025-11-17 13:05:30',
      user: 'Sistema Automático',
      userId: 'SYS-0001',
      action: 'Limpieza de códigos 2FA expirados',
      module: 'Sistema',
      severity: 'low',
      status: 'success',
      ipAddress: '127.0.0.1',
      device: 'Server Ubuntu 22.04',
      browser: 'N/A',
      location: 'Servidor Principal',
      duration: '2.7s',
      details: 'Se eliminaron 47 códigos 2FA que expiraron hace más de 24 horas'
    },

    // ============ EVENTOS DE REPORTES Y EXPORTACIÓN ============
    {
      id: 'EVT-RPT-001',
      timestamp: '2025-11-17 13:00:20',
      user: 'Javier Gómez',
      userId: 'PER-8067',
      action: 'Generación de reporte de usuarios',
      module: 'Reportes',
      severity: 'info',
      status: 'success',
      ipAddress: '192.168.1.78',
      device: 'Windows 10 - Desktop',
      browser: 'Chrome 119.0',
      location: 'Bucaramanga, Colombia',
      duration: '3.4s',
      details: 'Se generó reporte de "Usuarios por Rol" - 1,247 registros exportados'
    },
    {
      id: 'EVT-RPT-002',
      timestamp: '2025-11-17 12:55:45',
      user: 'Lucía Torres',
      userId: 'PER-5034',
      action: 'Exportación masiva de datos',
      module: 'Reportes',
      severity: 'medium',
      status: 'success',
      ipAddress: '192.168.1.89',
      device: 'MacBook Air - Laptop',
      browser: 'Firefox 120.0',
      location: 'Bogotá, Colombia',
      duration: '8.2s',
      details: 'Se exportaron 1,342 registros de estudiantes activos en formato Excel',
      changes: [
        { field: 'Formato', before: 'N/A', after: 'Excel (.xlsx)' },
        { field: 'Registros', before: '0', after: '1,342' },
        { field: 'Campos Incluidos', before: 'N/A', after: '18 campos' }
      ]
    }
  ];

  const [availableModulesList, setAvailableModulesList] = useState<string[]>([]);

  useEffect(() => {
    loadAvailableModules().then(modules => {
      setAvailableModulesList(modules);
    }).catch(() => {
      setAvailableModulesList(Array.from(new Set(events.map(e => e.module))));
    });
  }, []);

  const availableModules = useMemo(() => {
    if (availableModulesList.length > 0) return availableModulesList;
    return Array.from(new Set(events.map(e => e.module)));
  }, [availableModulesList, events]);

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // Search query
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = 
          event.user.toLowerCase().includes(searchLower) ||
          event.action.toLowerCase().includes(searchLower) ||
          event.module.toLowerCase().includes(searchLower) ||
          event.userId.toLowerCase().includes(searchLower) ||
          event.details.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Severity filter
      if (filters.severities.length > 0 && !filters.severities.includes(event.severity)) {
        return false;
      }

      // Module filter
      if (filters.modules.length > 0 && !filters.modules.includes(event.module)) {
        return false;
      }

      // Status filter
      if (filters.statuses.length > 0 && !filters.statuses.includes(event.status)) {
        return false;
      }

      // User search
      if (filters.userSearch) {
        const userLower = filters.userSearch.toLowerCase();
        const matchesUser = 
          event.user.toLowerCase().includes(userLower) ||
          event.userId.toLowerCase().includes(userLower);
        if (!matchesUser) return false;
      }

      // IP Address filter
      if (filters.ipAddress && !event.ipAddress.includes(filters.ipAddress)) {
        return false;
      }

      return true;
    });
  }, [events, searchQuery, filters]);

  const handleEventClick = (event: AuditEvent) => {
    setSelectedEvent(event);
    setIsDetailOpen(true);
  };

  const handleExport = async (format: 'csv' | 'excel' | 'pdf', singleEvent?: AuditEvent) => {
    try {
      setExportMenuOpen(false);
      const eventsToExport = singleEvent ? [singleEvent] : filteredEvents;
      
      if (eventsToExport.length === 0) {
        toast.warning('No hay eventos para exportar');
        return;
      }

      toast.info('Generando archivo de exportación...', {
        description: `Preparando ${format.toUpperCase()} con ${eventsToExport.length} ${singleEvent ? 'evento' : 'eventos'}`
      });

      let blob: Blob;
      let filename: string;
      const dateStr = new Date().toISOString().split('T')[0];
      const eventId = singleEvent ? `_${singleEvent.id}` : '';

      switch (format) {
        case 'csv':
          blob = auditService.exportEventsToCSV(eventsToExport);
          filename = `auditoria${eventId}_${dateStr}.csv`;
          break;
        case 'excel':
          blob = await auditService.exportEventsToExcel(eventsToExport);
          filename = `auditoria${eventId}_${dateStr}.xlsx`;
          break;
        case 'pdf':
          blob = await auditService.exportEventsToPDF(eventsToExport);
          filename = `auditoria${eventId}_${dateStr}.pdf`;
          break;
      }

      auditService.downloadBlob(blob, filename);
      toast.success('Archivo exportado correctamente', {
        description: `El archivo ${filename} ha sido descargado`
      });
    } catch (error: any) {
      console.error('Error al exportar:', error);
      toast.error('Error al exportar', {
        description: error.message || 'No se pudo generar el archivo de exportación'
      });
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilters({
      dateRange: 'last24h',
      startDate: '',
      endDate: '',
      severities: [],
      modules: [],
      statuses: [],
      userSearch: '',
      ipAddress: ''
    });
    toast.success('Filtros limpiados');
  };

  const viewModes = [
    { id: 'table', label: 'Tabla', icon: List, description: 'Vista detallada' },
    { id: 'timeline', label: 'Timeline', icon: Clock, description: 'Cronología' },
    { id: 'anomalies', label: 'Anomalías', icon: AlertTriangle, description: 'Detección de riesgos' }
  ];

  return (
    <div className="space-y-4 md:space-y-6 pb-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-white to-blue-50/30 rounded-2xl p-4 md:p-6 shadow-lg border border-gray-100"
      >
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-[#1e5da8] to-blue-600 flex items-center justify-center shadow-lg">
                <Shield className="w-6 h-6 md:w-7 md:h-7 text-white" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-[--esap-gray-900] tracking-tight">
                  Auditoría Premium
                </h1>
                <p className="text-xs md:text-sm font-medium text-[--esap-gray-600] mt-1">
                  Trazabilidad completa con análisis avanzado de seguridad
                </p>
              </div>
            </div>
          </div>

          {/* Export Button */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              className="flex items-center gap-2 px-4 md:px-5 py-2.5 md:py-3 bg-gradient-to-r from-[#1e5da8] to-blue-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all text-sm md:text-base w-full lg:w-auto justify-center group"
            >
              <Download className="w-4 h-4 group-hover:animate-bounce" />
              <span>Exportar</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${exportMenuOpen ? 'rotate-180' : ''}`} />
            </motion.button>

            {exportMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setExportMenuOpen(false)}
                />
                
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50"
                >
                  <div className="p-2">
                    <button
                      onClick={() => handleExport('csv')}
                      className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors font-medium text-gray-700 flex items-center gap-3 rounded-lg group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                        <FileText className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">Exportar CSV</p>
                        <p className="text-xs text-gray-500">Archivo de datos</p>
                      </div>
                    </button>
                    <button
                      onClick={() => handleExport('excel')}
                      className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors font-medium text-gray-700 flex items-center gap-3 rounded-lg group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                        <FileText className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">Exportar Excel</p>
                        <p className="text-xs text-gray-500">Hoja de cálculo</p>
                      </div>
                    </button>
                    <button
                      onClick={() => handleExport('pdf')}
                      className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors font-medium text-gray-700 flex items-center gap-3 rounded-lg group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center group-hover:bg-red-200 transition-colors">
                        <FileText className="w-4 h-4 text-red-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">Exportar PDF</p>
                        <p className="text-xs text-gray-500">Documento portátil</p>
                      </div>
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar eventos por usuario, acción, módulo..."
            className="w-full pl-12 pr-4 py-3 md:py-3.5 border-2 border-gray-300 rounded-xl focus:border-[#1e5da8] focus:ring-4 focus:ring-blue-100 transition-all text-sm md:text-base"
          />
        </div>
      </motion.div>

      {/* Filtros Avanzados */}
      <AuditAdvancedFilters
        filters={filters}
        onFiltersChange={setFilters}
        availableModules={availableModules}
        onClearFilters={handleClearFilters}
      />

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e5da8] mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando logs de auditoría...</p>
          </div>
        </div>
      )}

      {/* Content Based on View Mode */}
      {!loading && viewMode === 'table' && (
        <AuditLogTable 
          events={filteredEvents}
          onEventClick={handleEventClick}
          searchQuery={searchQuery}
          onExportEvent={(event, format) => handleExport(format, event)}
        />
      )}

      {viewMode === 'timeline' && (
        <AuditTimeline 
          events={filteredEvents}
          onEventClick={handleEventClick}
        />
      )}

      {viewMode === 'anomalies' && (
        <AuditAnomaliesDetector events={filteredEvents} />
      )}

      {/* Event Detail Modal */}
      <AuditEventDetail
        event={selectedEvent}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />
    </div>
  );
}
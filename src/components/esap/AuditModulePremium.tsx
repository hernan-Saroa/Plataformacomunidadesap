import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Download, Filter, Calendar, ChevronDown, FileText, Shield, BarChart3, Activity, List, Clock, AlertTriangle } from 'lucide-react';
import { AuditLogTable } from './AuditLogTable';
import { AuditEventDetail, AuditEvent } from './AuditEventDetail';
import { AuditAnalytics } from './AuditAnalytics';
import { AuditAdvancedFilters } from './AuditAdvancedFilters';
import { AuditTimeline } from './AuditTimeline';
import { AuditAnomaliesDetector } from './AuditAnomaliesDetector';
import { toast } from 'sonner@2.0.3';

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

  // Mock data - ACTUALIZADO con eventos de Usuario Persona, Roles y 2FA
  const mockEvents: AuditEvent[] = [
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

  // Obtener módulos únicos para filtros
  const availableModules = useMemo(() => {
    return Array.from(new Set(mockEvents.map(e => e.module)));
  }, [mockEvents]);

  // Aplicar filtros
  const filteredEvents = useMemo(() => {
    return mockEvents.filter(event => {
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
  }, [mockEvents, searchQuery, filters]);

  const handleEventClick = (event: AuditEvent) => {
    setSelectedEvent(event);
    setIsDetailOpen(true);
  };

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    toast.success('Exportando registros', {
      description: `Generando archivo ${format.toUpperCase()} con ${filteredEvents.length} eventos...`
    });
    setExportMenuOpen(false);
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

      {/* Content Based on View Mode */}
      {viewMode === 'table' && (
        <AuditLogTable 
          events={filteredEvents}
          onEventClick={handleEventClick}
          searchQuery={searchQuery}
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
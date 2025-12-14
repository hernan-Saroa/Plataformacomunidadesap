import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, TrendingDown, Users, Shield, FolderOpen, Activity, 
  AlertTriangle, CheckCircle, Clock, Download, BarChart3, Eye, 
  UserCheck, UserPlus, UserX, Lock, Zap, Star, ThumbsUp, 
  Target, Award, MapPin, BookOpen, GraduationCap, FileX, Database, 
  Server, Calendar, Key, Layers, ArrowUpRight, ArrowDownRight, 
  FileText, Settings, Globe, Briefcase, Percent, DollarSign,
  ClipboardList, BadgeCheck, X, QrCode, Upload, FileCheck, FolderKanban, Layout
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, PieChart as RechartPie, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, 
  PolarRadiusAxis, Radar, ComposedChart
} from 'recharts';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { CountUpAnimation } from './CountUpAnimation';
import { DateRangePicker } from './DateRangePicker';
import { CategoryFilter } from './CategoryFilter';
import { toast } from 'sonner';

interface ExecutiveDashboardProps {
  userRole: 'super-admin' | 'director' | 'coordinador' | 'docente' | 'auxiliar';
  restrictedMode?: 'certificados-laborales' | 'arquitectura-empresarial'; // Nuevo: modo restringido para usuarios especiales
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-lg rounded-xl p-4 border-2 border-gray-200 shadow-2xl">
        <p className="font-bold text-gray-900 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-sm font-medium text-gray-700">{entry.name}:</span>
            <span className="text-sm font-bold text-gray-900">
              {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const CustomLegend = ({ payload }: any) => {
  return (
    <div className="flex flex-wrap justify-center gap-4 mt-4">
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-sm font-medium text-gray-700">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

// Componente de KPI Moderno
interface ModernKPIProps {
  label: string;
  value: number | string;
  icon: any;
  bgColor: string;
  badge?: { text: string; icon?: any; trend?: 'up' | 'down' | 'neutral' };
  delay?: number;
}

const ModernKPI = ({ label, value, icon: Icon, bgColor, badge, delay = 0 }: ModernKPIProps) => {
  return (
    <motion.div
      className="relative overflow-hidden rounded-xl p-4 lg:p-3.5 xl:p-4 cursor-pointer transition-all duration-300"
      style={{ background: bgColor }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{ 
        scale: 1.02,
        boxShadow: '0 12px 28px rgba(0, 0, 0, 0.15)'
      }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="absolute top-0 right-0 w-20 h-20 lg:w-16 lg:h-16 xl:w-20 xl:h-20 rounded-full opacity-10 bg-white -mr-6 -mt-6 lg:-mr-4 lg:-mt-4 xl:-mr-6 xl:-mt-6" />
      
      <div className="relative flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 lg:gap-1.5 xl:gap-2 mb-2 lg:mb-1.5 xl:mb-2">
            <Icon className="w-4 h-4 lg:w-3.5 lg:h-3.5 xl:w-4 xl:h-4 text-white/80 flex-shrink-0" strokeWidth={2.5} />
            <span className="text-[11px] lg:text-[10px] xl:text-[11px] font-semibold text-white/90 uppercase tracking-wide truncate">{label}</span>
          </div>
          <div className="flex items-baseline gap-2 lg:gap-1.5 xl:gap-2 flex-wrap">
            {typeof value === 'number' ? (
              <CountUpAnimation
                end={value}
                duration={2000}
                className="text-2xl lg:text-xl xl:text-2xl font-extrabold text-white"
              />
            ) : (
              <span className="text-2xl lg:text-xl xl:text-2xl font-extrabold text-white truncate">{value}</span>
            )}
            {badge && (
              <div className="flex items-center gap-1 px-1.5 lg:px-1.5 xl:px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-md flex-shrink-0">
                {badge.icon && <badge.icon className="w-3 h-3 lg:w-2.5 lg:h-2.5 xl:w-3 xl:h-3 text-white" strokeWidth={2.5} />}
                <span className="text-[10px] lg:text-[9px] xl:text-[10px] font-bold text-white whitespace-nowrap">{badge.text}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Componente de KPI Secundario Compacto
interface CompactKPIProps {
  label: string;
  value: number | string;
  icon: any;
  color: string;
  delay?: number;
}

const CompactKPI = ({ label, value, icon: Icon, color, delay = 0 }: CompactKPIProps) => {
  return (
    <motion.div
      className="relative overflow-hidden rounded-lg p-3 lg:p-2.5 xl:p-3 cursor-pointer transition-all"
      style={{ 
        background: `linear-gradient(135deg, ${color}08 0%, ${color}18 100%)`,
        borderLeft: `3px solid ${color}`
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3 }}
      whileHover={{ scale: 1.03, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' }}
    >
      <div className="flex items-center gap-2 lg:gap-1.5 xl:gap-2 mb-1 lg:mb-0.5 xl:mb-1">
        <div className="w-7 h-7 lg:w-6 lg:h-6 xl:w-7 xl:h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color }}>
          <Icon className="w-3.5 h-3.5 lg:w-3 lg:h-3 xl:w-3.5 xl:h-3.5 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-[11px] lg:text-[10px] xl:text-[11px] font-bold text-gray-700 truncate uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-lg lg:text-base xl:text-lg font-extrabold ml-9 lg:ml-8 xl:ml-9 truncate" style={{ color }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </motion.div>
  );
};

export function ExecutiveDashboard({ userRole, restrictedMode }: ExecutiveDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [selectedModule, setSelectedModule] = useState<'all' | 'users' | 'roles' | 'personas' | 'audit' | 'aspirants' | 'verification' | 'profesoral'>('all');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined } | undefined>();
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['all']);

  // Métricas específicas de Certificados Laborales
  const certificadosMetrics = {
    totalGenerados: 20,
    activos: 16,
    expirados: 2,
    revocados: 2,
    verificacionesQR: 47,
    verificacionesHoy: 5,
    verificacionesSemana: 23,
    promedioVerificaciones: 2.35,
    tiempoPromedioGeneracion: '2.3 min',
    tasaAprobacion: 95.5,
  };

  const certificadosPorMes = [
    { mes: 'Ene', generados: 2, verificaciones: 5 },
    { mes: 'Feb', generados: 3, verificaciones: 8 },
    { mes: 'Mar', generados: 4, verificaciones: 12 },
    { mes: 'Abr', generados: 3, verificaciones: 7 },
    { mes: 'May', generados: 4, verificaciones: 9 },
    { mes: 'Jun', generados: 4, verificaciones: 6 },
  ];

  const certificadosPorTipo = [
    { tipo: 'Docentes', cantidad: 11, color: '#8b5cf6' },
    { tipo: 'Administrativos', cantidad: 9, color: '#f59e0b' },
  ];

  // Métricas específicas de Arquitectura Empresarial
  const arquitecturaMetrics = {
    totalArtefactos: 21,
    dominiosMRAE: 5,
    proyectosActivos: 8,
    madurezPromedio: 3.2,
    aplicacionesESAP: 11,
    serviciosDigitales: 24,
    documentosCompletos: 18,
    avanceGlobal: 85.7,
  };

  const verificacionesPorDia = [
    { dia: 'Lun', verificaciones: 8, exitosas: 8, fallidas: 0 },
    { dia: 'Mar', verificaciones: 7, exitosas: 6, fallidas: 1 },
    { dia: 'Mié', verificaciones: 9, exitosas: 9, fallidas: 0 },
    { dia: 'Jue', verificaciones: 6, exitosas: 6, fallidas: 0 },
    { dia: 'Vie', verificaciones: 8, exitosas: 7, fallidas: 1 },
    { dia: 'Sáb', verificaciones: 5, exitosas: 5, fallidas: 0 },
    { dia: 'Dom', verificaciones: 4, exitosas: 4, fallidas: 0 },
  ];

  // PALETA CORPORATIVA ESAP SIMPLIFICADA Y LIMPIA
  const COLORS = {
    // Azul ESAP - Color principal institucional
    primary: ['#003DA5', '#0052D9', '#1E5DA8', '#3B7FE0', '#5CA3FF'],
    // Verde - Éxito y positivo
    success: ['#10B981', '#34D399', '#6EE7B7', '#A7F3D0'],
    // Amarillo/Naranja - Advertencias y pendientes
    warning: ['#F59E0B', '#FBBF24', '#FCD34D', '#FDE68A'],
    // Rojo - Errores y crítico
    danger: ['#EF4444', '#F87171', '#FCA5A5', '#FECACA'],
    // Morado - Certificados y secundario
    purple: ['#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE'],
    // Cyan - Información y datos
    cyan: ['#06B6D4', '#22D3EE', '#67E8F9', '#A5F3FC'],
    // Colores sólidos para casos específicos
    solid: {
      esapBlue: '#003DA5',    // Azul ESAP oficial
      green: '#10B981',       // Verde éxito
      orange: '#F59E0B',      // Naranja advertencia
      blue: '#0052D9',        // Azul alternativo
      purple: '#8B5CF6',      // Morado
      cyan: '#06B6D4',        // Cyan
      red: '#EF4444',         // Rojo error
      gray: '#6B7280'         // Gris neutro
    }
  };

  const systemMetrics = {
    totalUsers: 1847,
    activeUsers: 1342,
    userGrowth: 12.5,
    userRetention: 87.3,
    systemUptime: 99.8,
    avgResponseTime: 234,
    satisfaction: 4.7,
    nps: 72,
    totalSessions: 8934,
    apiCallsToday: 125678,
    errorRate: 0.02,
    averageLoadTime: 1.2
  };

  const usersMetrics = {
    totalUsers: 1847,
    activeUsers: 1342,
    pendingUsers: 45,
    blockedUsers: 23,
    verifiedUsers: 1698,
    newToday: 12,
    newThisWeek: 48,
    newThisMonth: 127,
    mobileUsers: 892,
    desktopUsers: 955,
    multiFactorEnabled: 1234,
  };

  const userGrowthTrend = [
    { month: 'Ene', usuarios: 1420, activos: 1102, nuevos: 45, proyectado: 1450 },
    { month: 'Feb', usuarios: 1523, activos: 1198, nuevos: 103, proyectado: 1550 },
    { month: 'Mar', usuarios: 1634, activos: 1245, nuevos: 111, proyectado: 1640 },
    { month: 'Abr', usuarios: 1721, activos: 1289, nuevos: 87, proyectado: 1730 },
    { month: 'May', usuarios: 1785, activos: 1312, nuevos: 64, proyectado: 1790 },
    { month: 'Jun', usuarios: 1847, activos: 1342, nuevos: 62, proyectado: 1860 },
  ];

  const userActivityByDay = [
    { day: 'Lun', logins: 456, registros: 23, sesiones: 892 },
    { day: 'Mar', logins: 512, registros: 31, sesiones: 967 },
    { day: 'Mié', logins: 489, registros: 28, sesiones: 934 },
    { day: 'Jue', logins: 534, registros: 35, sesiones: 1023 },
    { day: 'Vie', logins: 398, registros: 19, sesiones: 756 },
    { day: 'Sáb', logins: 187, registros: 8, sesiones: 298 },
    { day: 'Dom', logins: 145, registros: 6, sesiones: 234 },
  ];

  const usersByRoleData = [
    { name: 'Estudiantes', value: 1245, percentage: 67.4, color: COLORS.primary[2] },
    { name: 'Docentes', value: 342, percentage: 18.5, color: COLORS.success[1] },
    { name: 'Administrativos', value: 158, percentage: 8.6, color: COLORS.warning[1] },
    { name: 'Graduados', value: 89, percentage: 4.8, color: COLORS.purple[1] },
    { name: 'Directivos', value: 13, percentage: 0.7, color: COLORS.danger[1] },
  ];

  const userEngagementByHour = [
    { hora: '00:00', usuarios: 45, acciones: 123 },
    { hora: '03:00', usuarios: 23, acciones: 67 },
    { hora: '06:00', usuarios: 89, acciones: 234 },
    { hora: '09:00', usuarios: 456, acciones: 1234 },
    { hora: '12:00', usuarios: 567, acciones: 1567 },
    { hora: '15:00', usuarios: 489, acciones: 1345 },
    { hora: '18:00', usuarios: 334, acciones: 892 },
    { hora: '21:00', usuarios: 178, acciones: 456 },
  ];

  const userDeviceDistribution = [
    { device: 'Móvil iOS', value: 445, color: COLORS.primary[2] },
    { device: 'Móvil Android', value: 447, color: COLORS.success[1] },
    { device: 'Desktop Windows', value: 578, color: COLORS.warning[1] },
    { device: 'Desktop Mac', value: 277, color: COLORS.purple[1] },
    { device: 'Tablet', value: 100, color: COLORS.danger[1] },
  ];

  const userLocationData = [
    { ciudad: 'Bogotá', usuarios: 892 },
    { ciudad: 'Medellín', usuarios: 334 },
    { ciudad: 'Cali', usuarios: 245 },
    { ciudad: 'Barranquilla', usuarios: 178 },
    { ciudad: 'Cartagena', usuarios: 123 },
    { ciudad: 'Otras', usuarios: 75 },
  ];

  const rolesMetrics = {
    totalRoles: 8,
    totalPermissions: 42,
    assignedPermissions: 187,
    pendingChanges: 12,
    roleChangesThisMonth: 15,
    avgPermissionsPerRole: 23,
  };

  const permissionDistribution = [
    { module: 'Usuarios', asignados: 38, pendientes: 7 },
    { module: 'Roles', asignados: 29, pendientes: 3 },
    { module: 'Personas', asignados: 35, pendientes: 3 },
    { module: 'Auditoría', asignados: 25, pendientes: 3 },
    { module: 'Informes', asignados: 40, pendientes: 4 },
  ];

  const roleUsageData = [
    { role: 'Super Admin', usuarios: 5, permisos: 42 },
    { role: 'Director', usuarios: 8, permisos: 38 },
    { role: 'Coordinador', usuarios: 25, permisos: 28 },
    { role: 'Docente', usuarios: 342, permisos: 18 },
    { role: 'Estudiante', usuarios: 1245, permisos: 8 },
    { role: 'Auxiliar', usuarios: 122, permisos: 12 },
  ];

  const permissionChangesTrend = [
    { mes: 'Ene', agregados: 12, removidos: 5, modificados: 8 },
    { mes: 'Feb', agregados: 15, removidos: 7, modificados: 12 },
    { mes: 'Mar', agregados: 9, removidos: 3, modificados: 6 },
    { mes: 'Abr', agregados: 18, removidos: 8, modificados: 14 },
    { mes: 'May', agregados: 11, removidos: 4, modificados: 9 },
    { mes: 'Jun', agregados: 14, removidos: 6, modificados: 11 },
  ];

  const personasMetrics = {
    totalPersonas: 2134,
    estudiantesActivos: 1245,
    docentesActivos: 342,
    documentosPendientes: 89,
    registrosCompletos: 1876,
    documentosValidados: 1987,
    verifiedPersonas: 1876,
  };

  const documentValidationTrend = [
    { mes: 'Ene', validados: 145, pendientes: 34, rechazados: 12 },
    { mes: 'Feb', validados: 167, pendientes: 28, rechazados: 9 },
    { mes: 'Mar', validados: 189, pendientes: 45, rechazados: 15 },
    { mes: 'Abr', validados: 201, pendientes: 38, rechazados: 11 },
    { mes: 'May', validados: 178, pendientes: 41, rechazados: 14 },
    { mes: 'Jun', validados: 156, pendientes: 52, rechazados: 18 },
  ];

  const personasPorPrograma = [
    { programa: 'Admin. Pública', cantidad: 456, color: COLORS.primary[2] },
    { programa: 'Gestión Pública', cantidad: 389, color: COLORS.success[1] },
    { programa: 'C. Políticas', cantidad: 267, color: COLORS.warning[1] },
    { programa: 'D. Territorial', cantidad: 198, color: COLORS.purple[1] },
    { programa: 'G. Ambiental', cantidad: 145, color: COLORS.danger[1] },
    { programa: 'Otros', cantidad: 679, color: COLORS.primary[4] },
  ];

  const personasByTipo = [
    { tipo: 'Est. Pregrado', cantidad: 892, color: COLORS.primary[2] },
    { tipo: 'Est. Posgrado', cantidad: 353, color: COLORS.primary[3] },
    { tipo: 'Doc. T. Completo', cantidad: 187, color: COLORS.success[1] },
    { tipo: 'Doc. Cátedra', cantidad: 155, color: COLORS.success[2] },
    { tipo: 'Administrativo', cantidad: 158, color: COLORS.warning[1] },
    { tipo: 'Graduado', cantidad: 389, color: COLORS.purple[1] },
  ];

  const documentTypeDistribution = [
    { tipo: 'Cédula', validados: 2098, pendientes: 12, rechazados: 24 },
    { tipo: 'Diploma', validados: 1234, pendientes: 45, rechazados: 15 },
    { tipo: 'Certificado', validados: 1567, pendientes: 67, rechazados: 28 },
    { tipo: 'Acta', validados: 892, pendientes: 34, rechazados: 11 },
  ];

  const auditMetrics = {
    totalEvents: 15234,
    eventsToday: 456,
    criticalEvents: 23,
    warningEvents: 187,
    securityAlerts: 34,
    complianceScore: 94.5,
    openIncidents: 12,
  };

  const eventsBySeverity = [
    { severity: 'Crítico', cantidad: 23, color: COLORS.danger[1] },
    { severity: 'Alto', cantidad: 89, color: COLORS.warning[1] },
    { severity: 'Medio', cantidad: 187, color: COLORS.warning[2] },
    { severity: 'Bajo', cantidad: 1012, color: COLORS.primary[2] },
    { severity: 'Info', cantidad: 13923, color: COLORS.success[1] },
  ];

  const auditTrendByModule = [
    { dia: 'Lun', usuarios: 234, roles: 45, personas: 123, sistema: 67 },
    { dia: 'Mar', usuarios: 267, roles: 52, personas: 145, sistema: 73 },
    { dia: 'Mié', usuarios: 298, roles: 48, personas: 167, sistema: 81 },
    { dia: 'Jue', usuarios: 312, roles: 59, personas: 189, sistema: 92 },
    { dia: 'Vie', usuarios: 289, roles: 44, personas: 156, sistema: 78 },
    { dia: 'Sáb', usuarios: 134, roles: 23, personas: 78, sistema: 45 },
    { dia: 'Dom', usuarios: 98, roles: 18, personas: 56, sistema: 34 },
  ];

  const securityEventsByType = [
    { tipo: 'Login Fallido', cantidad: 145, color: COLORS.danger[1] },
    { tipo: 'Acceso Denegado', cantidad: 89, color: COLORS.warning[1] },
    { tipo: 'Cambio Contraseña', cantidad: 234, color: COLORS.success[1] },
    { tipo: 'IP Sospechosa', cantidad: 23, color: COLORS.danger[2] },
    { tipo: 'Sesión Expirada', cantidad: 567, color: COLORS.primary[2] },
  ];

  const complianceMetrics = [
    { area: 'GDPR', score: 95, target: 90 },
    { area: 'ISO 27001', score: 92, target: 85 },
    { area: 'SOC 2', score: 88, target: 90 },
    { area: 'HIPAA', score: 94, target: 95 },
    { area: 'PCI DSS', score: 90, target: 85 },
  ];

  const performanceData = [
    { hour: '00:00', cpu: 23, memoria: 45, latencia: 120 },
    { hour: '04:00', cpu: 18, memoria: 42, latencia: 110 },
    { hour: '08:00', cpu: 67, memoria: 68, latencia: 245 },
    { hour: '12:00', cpu: 89, memoria: 82, latencia: 312 },
    { hour: '16:00', cpu: 78, memoria: 75, latencia: 278 },
    { hour: '20:00', cpu: 45, memoria: 58, latencia: 189 },
    { hour: '23:59', cpu: 32, memoria: 51, latencia: 156 },
  ];

  const moduleHealthRadar = [
    { metric: 'Disponibilidad', usuarios: 98, roles: 100, personas: 95, audit: 99 },
    { metric: 'Rendimiento', usuarios: 87, roles: 92, personas: 85, audit: 90 },
    { metric: 'Seguridad', usuarios: 94, roles: 98, personas: 91, audit: 100 },
    { metric: 'Uso', usuarios: 95, roles: 78, personas: 88, audit: 82 },
    { metric: 'Satisfacción', usuarios: 89, roles: 85, personas: 92, audit: 88 },
  ];

  const apiPerformance = [
    { endpoint: 'GET /users', calls: 12345, avgTime: 145, errors: 12 },
    { endpoint: 'POST /auth', calls: 8934, avgTime: 234, errors: 45 },
    { endpoint: 'GET /roles', calls: 5678, avgTime: 123, errors: 8 },
    { endpoint: 'PUT /personas', calls: 3456, avgTime: 289, errors: 15 },
    { endpoint: 'GET /audit', calls: 2341, avgTime: 167, errors: 5 },
  ];

  // Métricas de Aspirantes
  const aspirantsMetrics = {
    totalAspirants: 456,
    pendingApplications: 89,
    pendingAspirants: 89,
    underReview: 134,
    approved: 187,
    rejected: 34,
    enrolled: 12,
    documentCompletionRate: 78.5,
    averageScore: 82.3,
    byProgram: {
      'Admin. Pública': 156,
      'Gestión Pública': 98,
      'C. Políticas': 87,
      'D. Territorial': 65,
      'Otros': 50
    }
  };

  const aspirantsGrowthTrend = [
    { month: 'Ene', total: 298, aprobados: 145, rechazados: 23, inscritos: 8 },
    { month: 'Feb', total: 334, aprobados: 167, rechazados: 28, inscritos: 10 },
    { month: 'Mar', total: 389, aprobados: 189, rechazados: 31, inscritos: 9 },
    { month: 'Abr', total: 412, aprobados: 178, rechazados: 29, inscritos: 11 },
    { month: 'May', total: 438, aprobados: 182, rechazados: 32, inscritos: 12 },
    { month: 'Jun', total: 456, aprobados: 187, rechazados: 34, inscritos: 12 },
  ];

  const aspirantsByStatus = [
    { status: 'Pendiente', cantidad: 89, color: COLORS.warning[1] },
    { status: 'En Revisión', cantidad: 134, color: COLORS.primary[2] },
    { status: 'Aprobado', cantidad: 187, color: COLORS.success[1] },
    { status: 'Rechazado', cantidad: 34, color: COLORS.danger[1] },
    { status: 'Inscrito', cantidad: 12, color: COLORS.purple[1] },
  ];

  // Métricas de Verificación de Títulos
  const verificationMetrics = {
    totalTitles: 2847,
    verified: 2456,
    pending: 278,
    rejected: 89,
    expired: 24,
    verificationRate: 86.3,
    avgVerificationTime: 4.2, // horas
    publicVerifications: 1834,
    byTitleType: {
      'Pregrado': 1456,
      'Especialización': 678,
      'Maestría': 489,
      'Doctorado': 134,
      'Técnico': 90
    }
  };

  const verificationTrend = [
    { month: 'Ene', verificados: 289, pendientes: 45, rechazados: 12 },
    { month: 'Feb', verificados: 312, pendientes: 38, rechazados: 9 },
    { month: 'Mar', verificados: 356, pendientes: 52, rechazados: 15 },
    { month: 'Abr', verificados: 398, pendientes: 48, rechazados: 11 },
    { month: 'May', verificados: 421, pendientes: 56, rechazados: 14 },
    { month: 'Jun', verificados: 456, pendientes: 62, rechazados: 13 },
  ];

  const titlesByType = [
    { tipo: 'Pregrado', cantidad: 1456, color: COLORS.primary[2] },
    { tipo: 'Especialización', cantidad: 678, color: COLORS.success[1] },
    { tipo: 'Maestría', cantidad: 489, color: COLORS.purple[1] },
    { tipo: 'Doctorado', cantidad: 134, color: COLORS.warning[1] },
    { tipo: 'Técnico', cantidad: 90, color: COLORS.danger[1] },
  ];

  // GESTIÓN PROFESORAL - Métricas
  const profesoralMetrics = {
    docentesActivos: 698,
    docentesTotales: 752,
    docentesLicencia: 12,
    crecimientoDocentes: 3.2,
    ptasAprobados: 104,
    ptasPorcentaje: 72,
    ptasEnRevision: 26,
    ptasPendientes: 15,
    ptasTotal: 145,
    asignaturasProgramadas: 312,
    asignaturasActivas: 289,
    asignaturasPendientes: 23,
    promedioEvaluacion: 84.2,
    evaluacionesCompletadas: 598,
    evaluacionesPendientes: 154,
  };

  const distribucionEscalafon = [
    { nombre: 'Asociado', cantidad: 245, porcentaje: 35, color: COLORS.primary[0] },
    { nombre: 'Asistente', cantidad: 189, porcentaje: 27, color: COLORS.primary[2] },
    { nombre: 'Titular', cantidad: 154, porcentaje: 22, color: COLORS.purple[1] },
    { nombre: 'Auxiliar', cantidad: 110, porcentaje: 16, color: COLORS.cyan[1] }
  ];

  const distribucionTerritorial = [
    { territorial: 'Bogotá', cantidad: 245, color: COLORS.primary[2] },
    { territorial: 'Medellín', cantidad: 156, color: COLORS.success[1] },
    { territorial: 'Cali', cantidad: 123, color: COLORS.warning[1] },
    { territorial: 'Barranquilla', cantidad: 87, color: COLORS.purple[1] },
    { territorial: 'Bucaramanga', cantidad: 87, color: COLORS.cyan[1] }
  ];

  const tendenciaContrataciones = [
    { mes: 'Ene', contrataciones: 12, evaluacion: 82.5 },
    { mes: 'Feb', contrataciones: 8, evaluacion: 83.1 },
    { mes: 'Mar', contrataciones: 15, evaluacion: 83.8 },
    { mes: 'Abr', contrataciones: 22, evaluacion: 84.0 },
    { mes: 'May', contrataciones: 18, evaluacion: 84.2 }
  ];

  const docentesDestacados = [
    { nombre: 'María López Gómez', territorial: 'Bogotá', evaluacion: 4.8, publicaciones: 12 },
    { nombre: 'Carlos Ruiz Pérez', territorial: 'Medellín', evaluacion: 4.7, publicaciones: 8 },
    { nombre: 'Ana Martínez Silva', territorial: 'Cali', evaluacion: 4.6, publicaciones: 10 }
  ];

  const handleExportReport = () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2000)),
      {
        loading: 'Generando reporte ejecutivo completo...',
        success: 'Reporte descargado exitosamente',
        error: 'Error al generar reporte'
      }
    );
  };

  const canExportReports = ['super-admin', 'director', 'coordinador'].includes(userRole);

  // Vista simplificada para usuario de Certificados Laborales
  if (restrictedMode === 'certificados-laborales') {
    return (
      <div className="space-y-6">
        {/* HEADER - Certificados Laborales */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
              <FileCheck className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">Dashboard de Certificados Laborales</h1>
              <p className="text-xs text-gray-600 mt-0.5">
                Estadísticas y métricas del módulo • {new Date().toLocaleString('es-CO', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  day: '2-digit',
                  month: 'short'
                })}
              </p>
            </div>
          </div>
        </motion.div>

        {/* KPIs Principales - Certificados */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ModernKPI
            label="Total Generados"
            value={certificadosMetrics.totalGenerados}
            icon={FileCheck}
            bgColor="linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)"
            badge={{ text: `${certificadosMetrics.activos} activos`, trend: 'up' }}
            delay={0}
          />
          <ModernKPI
            label="Verificaciones QR"
            value={certificadosMetrics.verificacionesQR}
            icon={QrCode}
            bgColor="linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)"
            badge={{ text: `${certificadosMetrics.verificacionesHoy} hoy`, trend: 'up' }}
            delay={0.1}
          />
          <ModernKPI
            label="Certificados Expirados"
            value={certificadosMetrics.expirados}
            icon={Clock}
            bgColor="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
            delay={0.2}
          />
          <ModernKPI
            label="Certificados Revocados"
            value={certificadosMetrics.revocados}
            icon={X}
            bgColor="linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
            delay={0.3}
          />
        </div>

        {/* Gráficas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Certificados por Mes */}
          <motion.div
            className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Certificados por Mes</h3>
                <p className="text-sm text-gray-600">Generación y verificaciones</p>
              </div>
              <Calendar className="w-8 h-8 text-indigo-500" />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={certificadosPorMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="mes" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend content={<CustomLegend />} />
                <Bar dataKey="generados" name="Generados" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                <Line type="monotone" dataKey="verificaciones" name="Verificaciones" stroke="#06b6d4" strokeWidth={3} />
              </ComposedChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Certificados por Tipo */}
          <motion.div
            className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Certificados por Tipo</h3>
                <p className="text-sm text-gray-600">Distribución por rol</p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <RechartPie>
                <Pie
                  data={certificadosPorTipo}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="cantidad"
                >
                  {certificadosPorTipo.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend content={<CustomLegend />} />
              </RechartPie>
            </ResponsiveContainer>
          </motion.div>

          {/* Verificaciones por Día */}
          <motion.div
            className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-lg lg:col-span-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Verificaciones por Día</h3>
                <p className="text-sm text-gray-600">Última semana</p>
              </div>
              <Activity className="w-8 h-8 text-cyan-500" />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={verificacionesPorDia}>
                <defs>
                  <linearGradient id="colorVerificaciones" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="dia" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend content={<CustomLegend />} />
                <Area 
                  type="monotone" 
                  dataKey="verificaciones" 
                  name="Total Verificaciones"
                  stroke="#06b6d4" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorVerificaciones)" 
                />
                <Line 
                  type="monotone" 
                  dataKey="exitosas" 
                  name="Exitosas"
                  stroke="#10b981" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Métricas Adicionales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-green-700 mb-1">Tasa de Aprobación</p>
                <p className="text-3xl font-bold text-green-900">{certificadosMetrics.tasaAprobacion}%</p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
          </motion.div>

          <motion.div
            className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border-2 border-blue-200"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-700 mb-1">Verificaciones/Certificado</p>
                <p className="text-3xl font-bold text-blue-900">{certificadosMetrics.promedioVerificaciones}</p>
              </div>
              <BarChart3 className="w-12 h-12 text-blue-500" />
            </div>
          </motion.div>

          <motion.div
            className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border-2 border-purple-200"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.9 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-purple-700 mb-1">Tiempo Promedio</p>
                <p className="text-3xl font-bold text-purple-900">{certificadosMetrics.tiempoPromedioGeneracion}</p>
              </div>
              <Clock className="w-12 h-12 text-purple-500" />
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Vista simplificada para usuario de Arquitectura Empresarial
  if (restrictedMode === 'arquitectura-empresarial') {
    return (
      <div className="space-y-6">
        {/* HEADER - Arquitectura Empresarial */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700 shadow-lg">
              <BarChart3 className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">Dashboard de Arquitectura Empresarial</h1>
              <p className="text-xs text-gray-600 mt-0.5">
                Analíticas MRAE MinTIC • {new Date().toLocaleString('es-CO', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  day: '2-digit',
                  month: 'short'
                })}
              </p>
            </div>
          </div>
        </motion.div>

        {/* KPIs Principales - Arquitectura Empresarial */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border-2 border-blue-300"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-semibold text-blue-700 bg-blue-200 px-2 py-1 rounded-full">
                +4% este mes
              </span>
            </div>
            <p className="text-sm font-semibold text-blue-700 mb-1">Índice Madurez Global</p>
            <p className="text-3xl font-bold text-blue-900">3.2<span className="text-lg text-blue-600">/5.1</span></p>
          </motion.div>

          <motion.div
            className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border-2 border-purple-300"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-semibold text-purple-700 bg-purple-200 px-2 py-1 rounded-full">
                +4 esta hora
              </span>
            </div>
            <p className="text-sm font-semibold text-purple-700 mb-1">Artefactos Documentados</p>
            <p className="text-3xl font-bold text-purple-900">69<span className="text-lg text-purple-600">/3</span></p>
          </motion.div>

          <motion.div
            className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border-2 border-green-300"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
                <FolderKanban className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-semibold text-green-700 bg-green-200 px-2 py-1 rounded-full">
                ↑ este mes
              </span>
            </div>
            <p className="text-sm font-semibold text-green-700 mb-1">Dominios Activos</p>
            <p className="text-3xl font-bold text-green-900">8</p>
          </motion.div>

          <motion.div
            className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-5 border-2 border-orange-300"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center">
                <Award className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-semibold text-orange-700 bg-orange-200 px-2 py-1 rounded-full">
                +6% este año
              </span>
            </div>
            <p className="text-sm font-semibold text-orange-700 mb-1">Lineamiento MinTIC</p>
            <p className="text-3xl font-bold text-orange-900">72</p>
          </motion.div>
        </div>

        {/* Nivel de Madurez por Dominio MRAE */}
        <motion.div
          className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Nivel de Madurez por Dominio MRAE</h2>
              <p className="text-xs text-gray-600">Evaluación según modelo de madurez MinTIC</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Dominio 1: Estrategia TI */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-300">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                  <Target className="w-4 h-4 text-white" />
                </div>
                <p className="text-xs font-semibold text-blue-900">Estrategia TI</p>
              </div>
              <p className="text-2xl font-bold text-blue-900 mb-1">3.5</p>
              <p className="text-xs text-blue-700">Nivel actual</p>
              <div className="mt-3 bg-white/60 rounded-full h-2 overflow-hidden">
                <div className="bg-blue-500 h-full" style={{ width: '70%' }}></div>
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-blue-600">Dominio 1</p>
                <p className="text-xs font-semibold text-blue-700">70%</p>
              </div>
            </div>

            {/* Dominio 4: Información */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-300">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center">
                  <Database className="w-4 h-4 text-white" />
                </div>
                <p className="text-xs font-semibold text-purple-900">Información</p>
              </div>
              <p className="text-2xl font-bold text-purple-900 mb-1">3.5</p>
              <p className="text-xs text-purple-700">Nivel actual</p>
              <div className="mt-3 bg-white/60 rounded-full h-2 overflow-hidden">
                <div className="bg-purple-500 h-full" style={{ width: '64%' }}></div>
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-purple-600">Dominio 4</p>
                <p className="text-xs font-semibold text-purple-700">64%</p>
              </div>
            </div>

            {/* Dominio 2: Sistemas de Información */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-300">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
                  <Server className="w-4 h-4 text-white" />
                </div>
                <p className="text-xs font-semibold text-green-900">Sistemas de Información</p>
              </div>
              <p className="text-2xl font-bold text-green-900 mb-1">3.2</p>
              <p className="text-xs text-green-700">Nivel actual</p>
              <div className="mt-3 bg-white/60 rounded-full h-2 overflow-hidden">
                <div className="bg-green-500 h-full" style={{ width: '76%' }}></div>
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-green-600">Dominio 2</p>
                <p className="text-xs font-semibold text-green-700">76%</p>
              </div>
            </div>

            {/* Dominio 3: Servicios Tecnológicos */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-300">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <p className="text-xs font-semibold text-orange-900">Servicios Tecnológicos</p>
              </div>
              <p className="text-2xl font-bold text-orange-900 mb-1">3.8</p>
              <p className="text-xs text-orange-700">Nivel actual</p>
              <div className="mt-3 bg-white/60 rounded-full h-2 overflow-hidden">
                <div className="bg-orange-500 h-full" style={{ width: '68%' }}></div>
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-orange-600">Dominio 3</p>
                <p className="text-xs font-semibold text-orange-700">68%</p>
              </div>
            </div>

            {/* Dominio 2.0: Uso y Apropiación */}
            <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg p-4 border border-pink-300">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-pink-500 flex items-center justify-center">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <p className="text-xs font-semibold text-pink-900">Uso y Apropiación</p>
              </div>
              <p className="text-2xl font-bold text-pink-900 mb-1">3.4</p>
              <p className="text-xs text-pink-700">Nivel actual</p>
              <div className="mt-3 bg-white/60 rounded-full h-2 overflow-hidden">
                <div className="bg-pink-500 h-full" style={{ width: '68%' }}></div>
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-pink-600">Dominio 2.0</p>
                <p className="text-xs font-semibold text-pink-700">+0%</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Grid: Proyectos Activos y Artefactos Pendientes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Proyectos Activos */}
          <motion.div
            className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Proyectos Activos</h3>
                <p className="text-xs text-gray-600">8 proyectos en ejecución</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Proyecto 1 */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-300">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-orange-900">Migración Cloud AWS</p>
                  <span className="text-xs font-semibold text-orange-700 bg-orange-200 px-2 py-1 rounded-full">Alta</span>
                </div>
                <p className="text-xs text-orange-700 mb-3">Dominio: Servicios Tecnológicos</p>
                <div className="bg-white/60 rounded-full h-2 overflow-hidden mb-2">
                  <div className="bg-orange-500 h-full" style={{ width: '68%' }}></div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-orange-600">En progreso</p>
                  <p className="text-xs font-semibold text-orange-700">68%</p>
                </div>
              </div>

              {/* Proyecto 2 */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-300">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-orange-900">Implementación Data Governance</p>
                  <span className="text-xs font-semibold text-orange-700 bg-orange-200 px-2 py-1 rounded-full">Alta</span>
                </div>
                <p className="text-xs text-orange-700 mb-3">Dominio: Información</p>
                <div className="bg-white/60 rounded-full h-2 overflow-hidden mb-2">
                  <div className="bg-orange-500 h-full" style={{ width: '40%' }}></div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-orange-600">En progreso</p>
                  <p className="text-xs font-semibold text-orange-700">40%</p>
                </div>
              </div>

              {/* Resumen */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    <p className="text-xs font-semibold text-blue-900">Otros 6 proyectos activos</p>
                  </div>
                  <p className="text-xs font-semibold text-blue-700">Promedio: 54%</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Artefactos Pendientes */}
          <motion.div
            className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Artefactos Pendientes</h3>
                <p className="text-xs text-gray-600">Documentos actualización urgente</p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Artefacto 1 */}
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-300">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-red-900">Catálogo de Servicios TI</p>
                  <span className="text-xs font-semibold text-red-700 bg-red-200 px-2 py-1 rounded-full">Alta</span>
                </div>
                <p className="text-xs text-red-700">Vence en 14 días</p>
              </div>

              {/* Artefacto 2 */}
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-300">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-yellow-900">Mapa de Procesos vs Aplicaciones</p>
                  <span className="text-xs font-semibold text-yellow-700 bg-yellow-200 px-2 py-1 rounded-full">Media</span>
                </div>
                <p className="text-xs text-yellow-700">Vence en 1 mes</p>
              </div>

              {/* Artefacto 3 */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-300">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-blue-900">Inventario de Componentes</p>
                  <span className="text-xs font-semibold text-blue-700 bg-blue-200 px-2 py-1 rounded-full">Baja</span>
                </div>
                <p className="text-xs text-blue-700">Vence en 12 días</p>
              </div>

              {/* Artefacto 4 */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-300">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-blue-900">Plan de Continuidad TI</p>
                  <span className="text-xs font-semibold text-blue-700 bg-blue-200 px-2 py-1 rounded-full">Baja</span>
                </div>
                <p className="text-xs text-blue-700">Sin vencimiento definido</p>
              </div>

              {/* Resumen */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 border border-gray-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-600" />
                    <p className="text-xs font-semibold text-gray-900">Total artefactos pendientes</p>
                  </div>
                  <p className="text-xs font-semibold text-gray-700">4 documentos</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Resumen General */}
        <motion.div
          className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-6 border-2 border-gray-200"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <Award className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Estado del Marco de Referencia</h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                La institución cuenta con <strong>69 artefactos documentados</strong> distribuidos en los 8 dominios activos del MRAE (Marco de Referencia de Arquitectura Empresarial) de MinTIC Colombia. 
                El nivel de madurez global institucional es de <strong>3.2/5.1</strong>, con 8 proyectos activos en ejecución y 4 artefactos pendientes de actualización.
              </p>
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                  <Target className="w-3 h-3 mr-1" />
                  Madurez 3.2/5
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  8 proyectos activos
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                  <FileText className="w-3 h-3 mr-1" />
                  69 artefactos
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">
                  <Award className="w-3 h-3 mr-1" />
                  Lineamiento MinTIC: 72
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-6 xl:space-y-8">
      {/* HEADER */}
      <div className="space-y-4">
        {/* Título y Controles Principales */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between gap-4">
            {/* Título */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 lg:w-10 lg:h-10 xl:w-11 xl:h-11 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#1e5da8] to-[#3b82f6] shadow-lg flex-shrink-0">
                <BarChart3 className="w-5 h-5 lg:w-5 lg:h-5 text-white" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl lg:text-xl xl:text-2xl font-extrabold text-gray-900 truncate">Dashboard Ejecutivo</h1>
                <p className="text-xs lg:text-[11px] xl:text-xs text-gray-600 mt-0.5 truncate">
                  Vista estratégica integral • {new Date().toLocaleString('es-CO', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    day: '2-digit',
                    month: 'short'
                  })}
                </p>
              </div>
            </div>

            {/* Botones de Categoría y Calendario */}
            <div className="hidden md:flex items-center gap-2">
              <CategoryFilter 
                value={selectedCategories}
                onChange={setSelectedCategories}
              />
              <DateRangePicker 
                value={dateRange}
                onChange={setDateRange}
              />
            </div>
          </div>
        </motion.div>

        {/* Botones Mobile - Categoría y Calendario */}
        <div className="flex md:hidden gap-2">
          <CategoryFilter 
            value={selectedCategories}
            onChange={setSelectedCategories}
            className="flex-1"
          />
          <DateRangePicker 
            value={dateRange}
            onChange={setDateRange}
            className="flex-1"
          />
        </div>

        {/* Controles */}
        <motion.div 
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 lg:gap-2.5 xl:gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {/* Filtros de Período y Módulo */}
          <div className="flex items-center gap-2 lg:gap-2 xl:gap-2.5 overflow-x-auto pb-1 scrollbar-hide w-full sm:w-auto">
            {/* Período */}
            <div className="flex bg-white rounded-lg lg:rounded-lg p-1 border border-gray-200 shadow-sm flex-shrink-0">
              {[
                { value: '7d', label: '7 días', short: '7d' },
                { value: '30d', label: '30 días', short: '30d' },
                { value: '90d', label: '90 días', short: '90d' },
                { value: '1y', label: '1 año', short: '1a' }
              ].map((period) => (
                <button
                  key={period.value}
                  onClick={() => setSelectedPeriod(period.value as any)}
                  className={`px-3 lg:px-2.5 xl:px-3 py-1.5 lg:py-1.5 rounded-md text-[11px] lg:text-[10px] xl:text-[11px] font-semibold transition-all ${
                    selectedPeriod === period.value
                      ? 'bg-gradient-to-br from-[#1e5da8] to-[#2a6dbd] text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span className="hidden sm:inline">{period.label}</span>
                  <span className="inline sm:hidden">{period.short}</span>
                </button>
              ))}
            </div>

            {/* Módulos */}
            <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm flex-shrink-0">
              {[
                { value: 'all', label: 'Todo', icon: Layers },
                { value: 'users', label: 'Usuarios', icon: Users },
                { value: 'roles', label: 'Roles', icon: Shield },
                { value: 'personas', label: 'Personas', icon: FolderOpen },
                { value: 'aspirants', label: 'Aspirantes', icon: ClipboardList },
                { value: 'verification', label: 'Verificación', icon: BadgeCheck },
                { value: 'profesoral', label: 'Profesoral', icon: BookOpen },
                { value: 'audit', label: 'Auditoría', icon: Activity }
              ].map((module) => (
                <Tooltip key={module.value}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setSelectedModule(module.value as any)}
                      className={`px-2.5 lg:px-1.5 xl:px-2 py-1.5 rounded-md text-[11px] lg:text-[10px] xl:text-[11px] font-semibold transition-all flex items-center gap-1.5 lg:gap-1 xl:gap-1.5 whitespace-nowrap ${
                        selectedModule === module.value
                          ? 'bg-gradient-to-br from-[#1e5da8] to-[#2a6dbd] text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <module.icon className="w-3.5 h-3.5 lg:w-3 lg:h-3 xl:w-3.5 xl:h-3.5 flex-shrink-0" strokeWidth={2} />
                      <span className="hidden sm:inline xl:inline">{module.label}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs sm:hidden">{module.label}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>

          {/* Botón Exportar */}
          {canExportReports && (
            <motion.button
              onClick={handleExportReport}
              className="px-4 lg:px-3.5 xl:px-4 py-2 lg:py-1.5 xl:py-2 rounded-lg text-white text-xs lg:text-[11px] xl:text-xs font-semibold transition-all flex items-center justify-center gap-2 lg:gap-1.5 xl:gap-2 bg-gradient-to-br from-[#1e5da8] to-[#3b82f6] shadow-md hover:shadow-lg active:scale-95 whitespace-nowrap"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Download className="w-3.5 h-3.5 lg:w-3 lg:h-3 xl:w-3.5 xl:h-3.5 flex-shrink-0" strokeWidth={2} />
              <span>Exportar</span>
            </motion.button>
          )}
        </motion.div>

        {/* Indicador de Filtros Activos */}
        {(dateRange?.from || (!selectedCategories.includes('all') && selectedCategories.length > 0)) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg"
          >
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              <span className="text-xs font-semibold text-[#1e5da8]">Filtros activos:</span>
              
              {dateRange?.from && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-md border border-blue-200">
                  <Calendar className="w-3 h-3 text-[#1e5da8]" />
                  <span className="text-xs font-medium text-gray-700">
                    {dateRange.to 
                      ? `${new Date(dateRange.from).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} - ${new Date(dateRange.to).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}`
                      : new Date(dateRange.from).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <button
                    onClick={() => setDateRange(undefined)}
                    className="p-0.5 hover:bg-gray-100 rounded"
                  >
                    <X className="w-3 h-3 text-gray-500" />
                  </button>
                </div>
              )}

              {!selectedCategories.includes('all') && selectedCategories.length > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-md border border-blue-200">
                  <FolderOpen className="w-3 h-3 text-[#1e5da8]" />
                  <span className="text-xs font-medium text-gray-700">
                    {selectedCategories.length === 1 ? '1 categoría' : `${selectedCategories.length} categorías`}
                  </span>
                  <button
                    onClick={() => setSelectedCategories(['all'])}
                    className="p-0.5 hover:bg-gray-100 rounded"
                  >
                    <X className="w-3 h-3 text-gray-500" />
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setDateRange(undefined);
                setSelectedCategories(['all']);
                toast.info('Filtros limpiados', {
                  description: 'Mostrando todos los datos disponibles'
                });
              }}
              className="text-xs font-medium text-[#1e5da8] hover:underline whitespace-nowrap"
            >
              Limpiar todo
            </button>
          </motion.div>
        )}
      </div>

      {/* 6 INDICADORES PRINCIPALES */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 min-h-[100px]"
      >
        <ModernKPI 
          label="Usuarios" 
          value={systemMetrics.totalUsers} 
          icon={Users} 
          bgColor="linear-gradient(135deg, #1e5da8 0%, #2a6dbd 100%)"
          badge={{ text: `+${systemMetrics.userGrowth}%`, icon: TrendingUp }}
          delay={0.1}
        />
        <ModernKPI 
          label="Activos" 
          value={systemMetrics.activeUsers} 
          icon={UserCheck} 
          bgColor="linear-gradient(135deg, #10b981 0%, #059669 100%)"
          badge={{ text: `${systemMetrics.userRetention}%` }}
          delay={0.15}
        />
        <ModernKPI 
          label="Roles" 
          value={rolesMetrics.totalRoles} 
          icon={Shield} 
          bgColor="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
          badge={{ text: `${rolesMetrics.totalPermissions} permisos` }}
          delay={0.2}
        />
        <ModernKPI 
          label="Personas" 
          value={`${(personasMetrics.totalPersonas / 1000).toFixed(1)}K`}
          icon={FolderOpen} 
          bgColor="linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)"
          badge={{ text: `${personasMetrics.verifiedPersonas} verificadas` }}
          delay={0.25}
        />
        <ModernKPI 
          label="Aspirantes" 
          value={aspirantsMetrics.totalAspirants} 
          icon={ClipboardList} 
          bgColor="linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)"
          badge={{ text: `${aspirantsMetrics.pendingAspirants} pendientes` }}
          delay={0.3}
        />
        <ModernKPI 
          label="Alertas" 
          value={auditMetrics.criticalEvents} 
          icon={AlertTriangle} 
          bgColor="linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
          badge={{ text: auditMetrics.criticalEvents > 0 ? 'Revisar' : 'OK', icon: auditMetrics.criticalEvents > 0 ? AlertTriangle : CheckCircle }}
          delay={0.35}
        />
      </motion.div>

      {/* MÓDULO USUARIOS */}
      {(selectedModule === 'all' || selectedModule === 'users') && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="border-t-4 border-gray-200 pt-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                <Users className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900">Módulo de Usuarios</h2>
                <p className="text-sm text-gray-600">Análisis detallado de usuarios y actividad</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 lg:gap-2.5 xl:gap-3 mb-5 lg:mb-5 xl:mb-6">
              <CompactKPI label="Nuevos Hoy" value={usersMetrics.newToday} icon={UserPlus} color="#3b82f6" delay={0.7} />
              <CompactKPI label="Verificados" value={usersMetrics.verifiedUsers} icon={CheckCircle} color="#10b981" delay={0.73} />
              <CompactKPI label="Pendientes" value={usersMetrics.pendingUsers} icon={Clock} color="#f59e0b" delay={0.76} />
              <CompactKPI label="Bloqueados" value={usersMetrics.blockedUsers} icon={UserX} color="#ef4444" delay={0.79} />
            </div>


            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}>
                <div className="mb-6">
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Distribución por Dispositivo</h3>
                  <p className="text-xs text-gray-600">Plataformas de acceso</p>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartPie>
                    <Pie
                      data={userDeviceDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ device, value }) => `${device}: ${value}`}
                    >
                      {userDeviceDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                  </RechartPie>
                </ResponsiveContainer>
              </motion.div>

              <motion.div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}>
                <div className="mb-6">
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Usuarios por Ciudad</h3>
                  <p className="text-xs text-gray-600">Distribución geográfica</p>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={userLocationData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" stroke="#6b7280" />
                    <YAxis dataKey="ciudad" type="category" stroke="#6b7280" width={90} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Bar dataKey="usuarios" fill={COLORS.primary[2]} radius={[0, 8, 8, 0]} name="Usuarios" />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}

      {/* MÓDULO ROLES */}
      {(selectedModule === 'all' || selectedModule === 'roles') && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="border-t-4 border-gray-200 pt-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg">
                <Shield className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900">Módulo de Roles y Permisos</h2>
                <p className="text-sm text-gray-600">Gestión de acceso y autorizaciones</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <CompactKPI label="Roles" value={rolesMetrics.totalRoles} icon={Shield} color="#f59e0b" delay={1.2} />
              <CompactKPI label="Permisos" value={rolesMetrics.totalPermissions} icon={Key} color="#3b82f6" delay={1.23} />
              <CompactKPI label="Asignados" value={rolesMetrics.assignedPermissions} icon={CheckCircle} color="#10b981" delay={1.26} />
              <CompactKPI label="Pendientes" value={rolesMetrics.pendingChanges} icon={Clock} color="#f59e0b" delay={1.29} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <motion.div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}>
                <div className="mb-6">
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Distribución de Permisos</h3>
                  <p className="text-xs text-gray-600">Por módulo del sistema</p>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={permissionDistribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" stroke="#6b7280" />
                    <YAxis dataKey="module" type="category" stroke="#6b7280" />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend content={<CustomLegend />} />
                    <Bar dataKey="asignados" stackId="a" fill={COLORS.success[1]} radius={[0, 4, 4, 0]} name="Asignados" />
                    <Bar dataKey="pendientes" stackId="a" fill={COLORS.warning[1]} radius={[0, 4, 4, 0]} name="Pendientes" />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>

              <motion.div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}>
                <div className="mb-6">
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Uso por Rol</h3>
                  <p className="text-xs text-gray-600">Usuarios y permisos</p>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={roleUsageData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="role" stroke="#6b7280" angle={-15} textAnchor="end" height={80} />
                    <YAxis stroke="#6b7280" />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend content={<CustomLegend />} />
                    <Bar dataKey="usuarios" fill={COLORS.primary[2]} name="Usuarios" />
                    <Line type="monotone" dataKey="permisos" stroke={COLORS.warning[1]} strokeWidth={3} name="Permisos" />
                  </ComposedChart>
                </ResponsiveContainer>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <motion.div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}>
                <div className="mb-6">
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Tendencia de Cambios</h3>
                  <p className="text-xs text-gray-600">Evolución de permisos</p>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={permissionChangesTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="mes" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend content={<CustomLegend />} />
                    <Line type="monotone" dataKey="agregados" stroke={COLORS.success[1]} strokeWidth={3} dot={{ r: 5 }} name="Agregados" />
                    <Line type="monotone" dataKey="modificados" stroke={COLORS.warning[1]} strokeWidth={3} dot={{ r: 5 }} name="Modificados" />
                    <Line type="monotone" dataKey="removidos" stroke={COLORS.danger[1]} strokeWidth={3} dot={{ r: 5 }} name="Removidos" />
                  </LineChart>
                </ResponsiveContainer>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}

      {/* MÓDULO PERSONAS */}
      {(selectedModule === 'all' || selectedModule === 'personas') && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="border-t-4 border-gray-200 pt-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
                <FolderOpen className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900">Módulo de Personas</h2>
                <p className="text-sm text-gray-600">Gestión de perfiles y documentación</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <CompactKPI label="Total" value={personasMetrics.totalPersonas} icon={FolderOpen} color="#8b5cf6" delay={1.6} />
              <CompactKPI label="Estudiantes" value={personasMetrics.estudiantesActivos} icon={GraduationCap} color="#3b82f6" delay={1.63} />
              <CompactKPI label="Docentes" value={personasMetrics.docentesActivos} icon={BookOpen} color="#10b981" delay={1.66} />
              <CompactKPI label="Completos" value={personasMetrics.registrosCompletos} icon={CheckCircle} color="#10b981" delay={1.69} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <motion.div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }}>
                <div className="mb-6">
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Validación de Documentos</h3>
                  <p className="text-xs text-gray-600">Tendencia mensual</p>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={documentValidationTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="mes" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend content={<CustomLegend />} />
                    <Line type="monotone" dataKey="validados" stroke={COLORS.success[1]} strokeWidth={3} dot={{ r: 5 }} name="Validados" />
                    <Line type="monotone" dataKey="pendientes" stroke={COLORS.warning[1]} strokeWidth={3} dot={{ r: 5 }} name="Pendientes" />
                    <Line type="monotone" dataKey="rechazados" stroke={COLORS.danger[1]} strokeWidth={3} dot={{ r: 5 }} name="Rechazados" />
                  </LineChart>
                </ResponsiveContainer>
              </motion.div>

              <motion.div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }}>
                <div className="mb-6">
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Por Programa</h3>
                  <p className="text-xs text-gray-600">Distribución académica</p>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={personasPorPrograma}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="programa" stroke="#6b7280" angle={-20} textAnchor="end" height={100} />
                    <YAxis stroke="#6b7280" />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Bar dataKey="cantidad" fill={COLORS.purple[1]} radius={[8, 8, 0, 0]} name="Cantidad">
                      {personasPorPrograma.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.9 }}>
                <div className="mb-6">
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Por Tipo</h3>
                  <p className="text-xs text-gray-600">Clasificación</p>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={personasByTipo} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" stroke="#6b7280" />
                    <YAxis dataKey="tipo" type="category" stroke="#6b7280" width={150} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Bar dataKey="cantidad" fill={COLORS.purple[1]} radius={[0, 8, 8, 0]} name="Cantidad">
                      {personasByTipo.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>

              <motion.div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.9 }}>
                <div className="mb-6">
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Documentos por Tipo</h3>
                  <p className="text-xs text-gray-600">Estado de validación</p>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={documentTypeDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="tipo" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend content={<CustomLegend />} />
                    <Bar dataKey="validados" stackId="a" fill={COLORS.success[1]} name="Validados" />
                    <Bar dataKey="pendientes" stackId="a" fill={COLORS.warning[1]} name="Pendientes" />
                    <Bar dataKey="rechazados" stackId="a" fill={COLORS.danger[1]} name="Rechazados" />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}

      {/* MÓDULO AUDITORÍA */}
      {(selectedModule === 'all' || selectedModule === 'audit') && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="border-t-4 border-gray-200 pt-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-red-500 to-red-600 shadow-lg">
                <Activity className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900">Módulo de Auditoría</h2>
                <p className="text-sm text-gray-600">Eventos, seguridad y cumplimiento</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <CompactKPI label="Total" value={auditMetrics.totalEvents} icon={Activity} color="#ef4444" delay={2.0} />
              <CompactKPI label="Hoy" value={auditMetrics.eventsToday} icon={Calendar} color="#3b82f6" delay={2.03} />
              <CompactKPI label="Críticos" value={auditMetrics.criticalEvents} icon={AlertTriangle} color="#ef4444" delay={2.06} />
              <CompactKPI label="Seguridad" value={auditMetrics.securityAlerts} icon={Shield} color="#f59e0b" delay={2.09} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <motion.div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2 }}>
                <div className="mb-6">
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Por Severidad</h3>
                  <p className="text-xs text-gray-600">Distribución de eventos</p>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartPie>
                    <Pie
                      data={eventsBySeverity}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="cantidad"
                      label={({ severity, cantidad }) => `${severity}: ${cantidad}`}
                    >
                      {eventsBySeverity.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                  </RechartPie>
                </ResponsiveContainer>
              </motion.div>

              <motion.div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2 }}>
                <div className="mb-6">
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Por Módulo</h3>
                  <p className="text-xs text-gray-600">Actividad semanal</p>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={auditTrendByModule}>
                    <defs>
                      <linearGradient id="colorUsuariosAudit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorRolesAudit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="dia" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend content={<CustomLegend />} />
                    <Area type="monotone" dataKey="usuarios" stroke="#3b82f6" strokeWidth={2} fill="url(#colorUsuariosAudit)" name="Usuarios" />
                    <Area type="monotone" dataKey="roles" stroke="#f59e0b" strokeWidth={2} fill="url(#colorRolesAudit)" name="Roles" />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.3 }}>
                <div className="mb-6">
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Eventos de Seguridad</h3>
                  <p className="text-xs text-gray-600">Por tipo</p>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={securityEventsByType}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="tipo" stroke="#6b7280" angle={-15} textAnchor="end" height={80} />
                    <YAxis stroke="#6b7280" />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Bar dataKey="cantidad" fill={COLORS.danger[1]} radius={[8, 8, 0, 0]} name="Cantidad">
                      {securityEventsByType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>

              <motion.div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.3 }}>
                <div className="mb-6">
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Compliance</h3>
                  <p className="text-xs text-gray-600">Scores por área</p>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={complianceMetrics} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" domain={[0, 100]} stroke="#6b7280" />
                    <YAxis dataKey="area" type="category" stroke="#6b7280" />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend content={<CustomLegend />} />
                    <Bar dataKey="score" fill={COLORS.success[1]} radius={[0, 8, 8, 0]} name="Score Actual" />
                    <Line type="monotone" dataKey="target" stroke={COLORS.danger[1]} strokeWidth={2} strokeDasharray="5 5" name="Objetivo" />
                  </ComposedChart>
                </ResponsiveContainer>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}

      {/* RENDIMIENTO SISTEMA */}
      {selectedModule === 'all' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="border-t-4 border-gray-200 pt-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg">
                <Server className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900">Rendimiento del Sistema</h2>
                <p className="text-sm text-gray-600">Performance y salud de módulos</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <motion.div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.4 }}>
                <div className="mb-6">
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Métricas de Rendimiento</h3>
                  <p className="text-xs text-gray-600">CPU, Memoria y Latencia 24h</p>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={performanceData}>
                    <defs>
                      <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorMemoria" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorLatencia" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="hour" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend content={<CustomLegend />} />
                    <Area type="monotone" dataKey="cpu" stroke="#ef4444" strokeWidth={2} fill="url(#colorCpu)" name="CPU (%)" />
                    <Area type="monotone" dataKey="memoria" stroke="#f59e0b" strokeWidth={2} fill="url(#colorMemoria)" name="Memoria (%)" />
                    <Area type="monotone" dataKey="latencia" stroke="#3b82f6" strokeWidth={2} fill="url(#colorLatencia)" name="Latencia (ms)" />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>

              <motion.div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.4 }}>
                <div className="mb-6">
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Salud de Módulos</h3>
                  <p className="text-xs text-gray-600">Comparativa inter-módulos</p>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={moduleHealthRadar}>
                    <PolarGrid stroke="#d1d5db" />
                    <PolarAngleAxis dataKey="metric" stroke="#6b7280" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#6b7280" />
                    <Radar name="Usuarios" dataKey="usuarios" stroke={COLORS.primary[2]} fill={COLORS.primary[2]} fillOpacity={0.3} strokeWidth={2} />
                    <Radar name="Roles" dataKey="roles" stroke={COLORS.warning[1]} fill={COLORS.warning[1]} fillOpacity={0.3} strokeWidth={2} />
                    <Radar name="Personas" dataKey="personas" stroke={COLORS.purple[1]} fill={COLORS.purple[1]} fillOpacity={0.3} strokeWidth={2} />
                    <Radar name="Auditoría" dataKey="audit" stroke={COLORS.danger[1]} fill={COLORS.danger[1]} fillOpacity={0.3} strokeWidth={2} />
                    <Legend content={<CustomLegend />} />
                    <RechartsTooltip content={<CustomTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <motion.div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }}>
                <div className="mb-6">
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Rendimiento de APIs</h3>
                  <p className="text-xs text-gray-600">Llamadas, tiempo y errores por endpoint</p>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={apiPerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="endpoint" stroke="#6b7280" angle={-15} textAnchor="end" height={80} />
                    <YAxis yAxisId="left" stroke="#6b7280" />
                    <YAxis yAxisId="right" orientation="right" stroke="#6b7280" />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend content={<CustomLegend />} />
                    <Bar yAxisId="left" dataKey="calls" fill={COLORS.primary[2]} name="Llamadas" />
                    <Line yAxisId="right" type="monotone" dataKey="avgTime" stroke={COLORS.warning[1]} strokeWidth={3} name="Tiempo (ms)" />
                    <Line yAxisId="right" type="monotone" dataKey="errors" stroke={COLORS.danger[1]} strokeWidth={3} name="Errores" />
                  </ComposedChart>
                </ResponsiveContainer>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}

      {/* MÓDULO ASPIRANTES */}
      {(selectedModule === 'all' || selectedModule === 'aspirants') && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="border-t-4 border-gray-200 pt-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                <ClipboardList className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900">Módulo de Aspirantes</h2>
                <p className="text-sm text-gray-600">Gestión y análisis de solicitudes de admisión</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 lg:gap-2.5 xl:gap-3 mb-5 lg:mb-5 xl:mb-6">
              <CompactKPI label="Pendientes" value={aspirantsMetrics.pendingApplications} icon={Clock} color="#f59e0b" delay={0.7} />
              <CompactKPI label="En Revisión" value={aspirantsMetrics.underReview} icon={Eye} color="#3b82f6" delay={0.73} />
              <CompactKPI label="Aprobados" value={aspirantsMetrics.approved} icon={CheckCircle} color="#10b981" delay={0.76} />
              <CompactKPI label="Rechazados" value={aspirantsMetrics.rejected} icon={FileX} color="#ef4444" delay={0.79} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-4 xl:gap-5 2xl:gap-6 mb-5 lg:mb-5 xl:mb-6">
              <motion.div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.95 }}>
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 mb-1">Evolución de Aspirantes</h3>
                    <p className="text-xs text-gray-600">Tendencia de solicitudes y resultados</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={aspirantsGrowthTrend}>
                    <defs>
                      <linearGradient id="colorAspTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1e5da8" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#1e5da8" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorAspAprobados" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px', fontWeight: 600 }} />
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px', fontWeight: 600 }} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend content={<CustomLegend />} />
                    <Area type="monotone" dataKey="total" stroke="#1e5da8" strokeWidth={3} fill="url(#colorAspTotal)" name="Total" />
                    <Area type="monotone" dataKey="aprobados" stroke="#10b981" strokeWidth={3} fill="url(#colorAspAprobados)" name="Aprobados" />
                    <Line type="monotone" dataKey="inscritos" stroke="#8b5cf6" strokeWidth={2} name="Inscritos" />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>

              <motion.div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.0 }}>
                <div className="mb-6">
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Distribución por Estado</h3>
                  <p className="text-xs text-gray-600">Estado actual de solicitudes</p>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <RechartPie>
                    <Pie
                      data={aspirantsByStatus}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="cantidad"
                      nameKey="status"
                    >
                      {aspirantsByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                  </RechartPie>
                </ResponsiveContainer>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <motion.div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}>
                <div className="mb-6">
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Aspirantes por Programa</h3>
                  <p className="text-xs text-gray-600">Distribución de solicitudes por programa académico</p>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={Object.entries(aspirantsMetrics.byProgram).map(([programa, cantidad]) => ({ programa, cantidad }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="programa" stroke="#6b7280" angle={-15} textAnchor="end" height={80} />
                    <YAxis stroke="#6b7280" />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Bar dataKey="cantidad" fill={COLORS.primary[2]} name="Aspirantes" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}

      {/* MÓDULO VERIFICACIÓN DE TÍTULOS */}
      {(selectedModule === 'all' || selectedModule === 'verification') && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="border-t-4 border-gray-200 pt-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
                <BadgeCheck className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900">Módulo de Verificación de Títulos</h2>
                <p className="text-sm text-gray-600">Validación y certificación de títulos académicos</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 lg:gap-2.5 xl:gap-3 mb-5 lg:mb-5 xl:mb-6">
              <CompactKPI label="Verificados" value={verificationMetrics.verified} icon={CheckCircle} color="#10b981" delay={0.7} />
              <CompactKPI label="Pendientes" value={verificationMetrics.pending} icon={Clock} color="#f59e0b" delay={0.73} />
              <CompactKPI label="Rechazados" value={verificationMetrics.rejected} icon={FileX} color="#ef4444" delay={0.76} />
              <CompactKPI label="Tasa Verificación" value={`${verificationMetrics.verificationRate}%`} icon={Target} color="#8b5cf6" delay={0.79} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-4 xl:gap-5 2xl:gap-6 mb-5 lg:mb-5 xl:mb-6">
              <motion.div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.95 }}>
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 mb-1">Evolución de Verificaciones</h3>
                    <p className="text-xs text-gray-600">Tendencia mensual de verificaciones</p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 rounded-lg">
                    <ArrowUpRight className="w-4 h-4 text-green-700" strokeWidth={2} />
                    <span className="text-sm font-bold text-green-700">+{verificationMetrics.verificationRate}%</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={verificationTrend}>
                    <defs>
                      <linearGradient id="colorVerificados" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px', fontWeight: 600 }} />
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px', fontWeight: 600 }} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend content={<CustomLegend />} />
                    <Area type="monotone" dataKey="verificados" stroke="#10b981" strokeWidth={3} fill="url(#colorVerificados)" name="Verificados" />
                    <Bar dataKey="pendientes" fill="#f59e0b" name="Pendientes" />
                    <Line type="monotone" dataKey="rechazados" stroke="#ef4444" strokeWidth={2} name="Rechazados" />
                  </ComposedChart>
                </ResponsiveContainer>
              </motion.div>

              <motion.div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.0 }}>
                <div className="mb-6">
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Títulos por Tipo</h3>
                  <p className="text-xs text-gray-600">Distribución de títulos verificados</p>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <RechartPie>
                    <Pie
                      data={titlesByType}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ tipo, percent }) => `${tipo} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="cantidad"
                      nameKey="tipo"
                    >
                      {titlesByType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                  </RechartPie>
                </ResponsiveContainer>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <motion.div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}>
                <div className="mb-6">
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Distribución por Tipo de Título</h3>
                  <p className="text-xs text-gray-600">Cantidad de títulos verificados por nivel académico</p>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={Object.entries(verificationMetrics.byTitleType).map(([tipo, cantidad]) => ({ tipo, cantidad }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="tipo" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Bar dataKey="cantidad" fill={COLORS.success[1]} name="Títulos Verificados" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}

      {/* FOOTER */}
      <motion.div
        className="bg-gradient-to-br from-[#1e5da8] via-[#2a6dbd] to-[#3b82f6] rounded-2xl p-4 sm:p-6 md:p-8 shadow-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.6 }}
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4 md:gap-6">
          <div className="text-center md:text-left">
            <h3 className="text-lg sm:text-xl md:text-2xl font-extrabold text-white mb-1 sm:mb-2">Sistema Operando Normalmente</h3>
            <p className="text-xs sm:text-sm text-white/80">
              Todos los módulos funcionando correctamente • {auditMetrics.totalEvents.toLocaleString()} eventos procesados
            </p>
          </div>
          {/* MOBILE FIRST: Grid 3 columnas en mobile, flex en desktop */}
          <div className="grid grid-cols-3 md:flex items-center gap-2 sm:gap-3 md:gap-4 w-full md:w-auto">
            <div className="text-center px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 bg-white/20 backdrop-blur-sm rounded-lg md:rounded-xl border border-white/30">
              <p className="text-[10px] sm:text-xs font-semibold text-white/90 mb-0.5 sm:mb-1">Uptime</p>
              <p className="text-base sm:text-xl md:text-2xl font-extrabold text-white">{systemMetrics.systemUptime}%</p>
            </div>
            <div className="text-center px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 bg-white/20 backdrop-blur-sm rounded-lg md:rounded-xl border border-white/30">
              <p className="text-[10px] sm:text-xs font-semibold text-white/90 mb-0.5 sm:mb-1">Latencia</p>
              <p className="text-base sm:text-xl md:text-2xl font-extrabold text-white">{systemMetrics.avgResponseTime}ms</p>
            </div>
            <div className="text-center px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 bg-white/20 backdrop-blur-sm rounded-lg md:rounded-xl border border-white/30">
              <p className="text-[10px] sm:text-xs font-semibold text-white/90 mb-0.5 sm:mb-1">Satisfacción</p>
              <p className="text-base sm:text-xl md:text-2xl font-extrabold text-white">{systemMetrics.satisfaction}/5</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* MÓDULO GESTIÓN PROFESORAL */}
      {(selectedModule === 'all' || selectedModule === 'profesoral') && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="border-t-4 border-gray-200 pt-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#1e5da8] to-[#3b82f6] shadow-lg flex-shrink-0">
                <BookOpen className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900">Gestión Profesoral</h2>
                <p className="text-sm text-gray-600 mt-1">Métricas de docentes, PTAs, asignaturas y evaluación</p>
              </div>
            </div>

            {/* KPIs Principales */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <CompactKPI label="Docentes Activos" value={profesoralMetrics.docentesActivos} icon={Users} color={COLORS.solid.blue} delay={0} />
              <CompactKPI label="PTAs Aprobados" value={`${profesoralMetrics.ptasPorcentaje}%`} icon={FileText} color={COLORS.solid.green} delay={0.1} />
              <CompactKPI label="Asignaturas" value={profesoralMetrics.asignaturasProgramadas} icon={BookOpen} color={COLORS.solid.purple} delay={0.2} />
              <CompactKPI label="Promedio Eval." value={profesoralMetrics.promedioEvaluacion} icon={Star} color={COLORS.solid.orange} delay={0.3} />
            </div>

            {/* Alertas */}
            {(profesoralMetrics.ptasPendientes > 0 || profesoralMetrics.evaluacionesPendientes > 0) && (
              <div className="mb-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Alertas Pendientes</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profesoralMetrics.ptasPendientes > 0 && (
                    <motion.div 
                      className="bg-red-50 border-2 border-red-200 rounded-xl p-4"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-red-900 mb-1">PTAs pendientes de aprobación</h4>
                          <p className="text-sm text-red-700">{profesoralMetrics.ptasPendientes} PTAs requieren revisión urgente</p>
                        </div>
                        <div className="text-2xl font-extrabold text-red-600">{profesoralMetrics.ptasPendientes}</div>
                      </div>
                    </motion.div>
                  )}
                  {profesoralMetrics.evaluacionesPendientes > 0 && (
                    <motion.div 
                      className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                          <Star className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-amber-900 mb-1">Evaluaciones pendientes</h4>
                          <p className="text-sm text-amber-700">{profesoralMetrics.evaluacionesPendientes} evaluaciones docentes sin completar</p>
                        </div>
                        <div className="text-2xl font-extrabold text-amber-600">{profesoralMetrics.evaluacionesPendientes}</div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            )}

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Distribución por Escalafón */}
              <motion.div 
                className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="mb-6">
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Distribución por Escalafón</h3>
                  <p className="text-xs text-gray-600">Docentes por categoría académica</p>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <RechartPie>
                    <Pie
                      data={distribucionEscalafon}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ nombre, porcentaje }) => `${nombre} ${porcentaje}%`}
                      outerRadius={90}
                      fill="#8884d8"
                      dataKey="cantidad"
                      nameKey="nombre"
                    >
                      {distribucionEscalafon.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                  </RechartPie>
                </ResponsiveContainer>
              </motion.div>

              {/* Distribución por Territorial */}
              <motion.div 
                className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <div className="mb-6">
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Distribución por Territorial</h3>
                  <p className="text-xs text-gray-600">Docentes por sede regional</p>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={distribucionTerritorial}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="territorial" stroke="#6b7280" style={{ fontSize: '11px', fontWeight: 600 }} />
                    <YAxis stroke="#6b7280" style={{ fontSize: '11px', fontWeight: 600 }} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Bar dataKey="cantidad" fill="#1e5da8" radius={[8, 8, 0, 0]}>
                      {distribucionTerritorial.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            </div>

            {/* Tendencia de Contrataciones */}
            <div className="grid grid-cols-1 gap-6 mb-8">
              <motion.div 
                className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <div className="mb-6">
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Tendencia de Contrataciones y Evaluación</h3>
                  <p className="text-xs text-gray-600">Nuevas contrataciones vs promedio de evaluación mensual</p>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={tendenciaContrataciones}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="mes" stroke="#6b7280" style={{ fontSize: '12px', fontWeight: 600 }} />
                    <YAxis yAxisId="left" stroke="#6b7280" style={{ fontSize: '12px', fontWeight: 600 }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#6b7280" style={{ fontSize: '12px', fontWeight: 600 }} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend content={<CustomLegend />} />
                    <Bar yAxisId="left" dataKey="contrataciones" fill="#3b82f6" name="Contrataciones" radius={[8, 8, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="evaluacion" stroke="#10b981" strokeWidth={3} name="Evaluación Promedio" />
                  </ComposedChart>
                </ResponsiveContainer>
              </motion.div>
            </div>

            {/* Docentes Destacados */}
            <div className="grid grid-cols-1 gap-6">
              <motion.div 
                className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <div className="mb-6">
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Docentes Destacados</h3>
                  <p className="text-xs text-gray-600">Top 3 docentes por evaluación y producción académica</p>
                </div>
                <div className="space-y-4">
                  {docentesDestacados.map((docente, index) => (
                    <motion.div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-100 rounded-xl hover:shadow-lg transition-shadow"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + index * 0.1 }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1e5da8] to-[#3b82f6] flex items-center justify-center text-white font-extrabold text-lg">
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900">{docente.nombre}</h4>
                          <p className="text-sm text-gray-600">{docente.territorial}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <div className="flex items-center gap-1 text-amber-600">
                            <Star className="w-4 h-4 fill-current" />
                            <span className="font-bold">{docente.evaluacion}</span>
                          </div>
                          <p className="text-xs text-gray-600">Evaluación</p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center gap-1 text-blue-600">
                            <Award className="w-4 h-4" />
                            <span className="font-bold">{docente.publicaciones}</span>
                          </div>
                          <p className="text-xs text-gray-600">Publicaciones</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

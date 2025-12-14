/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * INTEGRACIÓN COMPLETA CON PORTAL TRANSACCIONAL POR ROL
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Sistema de integración entre Arquitectura Empresarial y Portal Transaccional
 * - Tareas personalizadas por rol
 * - Notificaciones contextuales
 * - Workflow de aprobaciones
 * - Dashboard personalizado
 * - Sistema de "Usuario Persona" con múltiples roles
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  Users,
  FileText,
  Upload,
  Download,
  MessageSquare,
  Calendar,
  Target,
  TrendingUp,
  Award,
  Zap,
  Eye,
  Edit,
  Trash2,
  Send,
  Check,
  X,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  Plus,
  RefreshCw,
  Settings,
  Shield,
  UserCheck,
  Building2,
  Briefcase,
  GraduationCap,
  BookOpen,
  BarChart3,
  Activity,
  Star,
  Flag,
  Paperclip,
  Share2,
  ExternalLink,
  Info,
  AlertTriangle,
  Play,
  Pause,
  Archive
} from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner@2.0.3';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TIPOS Y DEFINICIONES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type RolUsuario = 
  | 'Estudiante'
  | 'Docente'
  | 'Administrativo'
  | 'Directivo'
  | 'Arquitecto TI'
  | 'Revisor AE'
  | 'CISO'
  | 'Director TI'
  | 'Coordinador Territorial'
  | 'Coordinador CETAP';

type TipoTarea = 
  | 'revision'
  | 'aprobacion'
  | 'carga'
  | 'actualizacion'
  | 'comentario'
  | 'lectura';

type EstadoTarea = 'Pendiente' | 'En Progreso' | 'Completada' | 'Vencida';
type PrioridadTarea = 'Crítica' | 'Alta' | 'Media' | 'Baja';

interface Tarea {
  id: string;
  titulo: string;
  descripcion: string;
  tipo: TipoTarea;
  estado: EstadoTarea;
  prioridad: PrioridadTarea;
  asignadoA: string;
  asignadoPor: string;
  fechaCreacion: string;
  fechaVencimiento: string;
  lineamientoCodigo?: string;
  lineamientoNombre?: string;
  evidenciaId?: string;
  progreso: number;
  comentarios: number;
  adjuntos: number;
}

interface Notificacion {
  id: string;
  tipo: 'info' | 'success' | 'warning' | 'error';
  titulo: string;
  mensaje: string;
  fecha: string;
  leida: boolean;
  accion?: {
    texto: string;
    onClick: () => void;
  };
}

interface UsuarioPersona {
  id: string;
  nombre: string;
  email: string;
  roles: RolUsuario[];
  rolActivo: RolUsuario;
  avatar?: string;
  territorial?: string;
  cetap?: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DATOS DE EJEMPLO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const USUARIO_EJEMPLO: UsuarioPersona = {
  id: 'USR001',
  nombre: 'María González',
  email: 'maria.gonzalez@esap.edu.co',
  roles: ['Arquitecto TI', 'Revisor AE', 'Administrativo'],
  rolActivo: 'Arquitecto TI',
  avatar: 'MG',
  territorial: 'Bogotá',
  cetap: 'Sede Central'
};

const TAREAS_EJEMPLO: Tarea[] = [
  {
    id: 'T001',
    titulo: 'Revisar evidencia de evaluación de madurez AE',
    descripcion: 'Revisar y aprobar la evidencia cargada para el lineamiento MAE.LI.PA.01',
    tipo: 'revision',
    estado: 'Pendiente',
    prioridad: 'Alta',
    asignadoA: 'María González',
    asignadoPor: 'Director TI',
    fechaCreacion: '2025-12-07',
    fechaVencimiento: '2025-12-10',
    lineamientoCodigo: 'MAE.LI.PA.01',
    lineamientoNombre: 'Evaluación del nivel de madurez',
    evidenciaId: 'EV001',
    progreso: 0,
    comentarios: 2,
    adjuntos: 1
  },
  {
    id: 'T002',
    titulo: 'Aprobar Plan de Ejercicios AE 2025-2026',
    descripcion: 'Revisar y aprobar el plan estratégico de ejercicios de arquitectura empresarial',
    tipo: 'aprobacion',
    estado: 'En Progreso',
    prioridad: 'Crítica',
    asignadoA: 'María González',
    asignadoPor: 'Secretaria General',
    fechaCreacion: '2025-12-06',
    fechaVencimiento: '2025-12-08',
    lineamientoCodigo: 'MAE.LI.PA.02',
    lineamientoNombre: 'Planeación de los ejercicios de AE',
    evidenciaId: 'EV002',
    progreso: 45,
    comentarios: 5,
    adjuntos: 3
  },
  {
    id: 'T003',
    titulo: 'Actualizar catálogo de elementos de infraestructura',
    descripcion: 'Actualizar el inventario completo de infraestructura tecnológica institucional',
    tipo: 'actualizacion',
    estado: 'Pendiente',
    prioridad: 'Media',
    asignadoA: 'María González',
    asignadoPor: 'Coordinador Infraestructura',
    fechaCreacion: '2025-12-05',
    fechaVencimiento: '2025-12-15',
    lineamientoCodigo: 'MAE.LI.AT.01',
    lineamientoNombre: 'Catálogo de elementos de infraestructura',
    progreso: 0,
    comentarios: 0,
    adjuntos: 0
  },
  {
    id: 'T004',
    titulo: 'Cargar evidencia de arquitectura de seguridad',
    descripcion: 'Cargar el documento de arquitectura de seguridad actualizado con todos los controles',
    tipo: 'carga',
    estado: 'Pendiente',
    prioridad: 'Alta',
    asignadoA: 'María González',
    asignadoPor: 'CISO',
    fechaCreacion: '2025-12-07',
    fechaVencimiento: '2025-12-12',
    lineamientoCodigo: 'MAE.LI.AS.03',
    lineamientoNombre: 'Arquitectura de Seguridad',
    progreso: 0,
    comentarios: 1,
    adjuntos: 0
  },
  {
    id: 'T005',
    titulo: 'Completar revisión de flujos de información',
    descripcion: 'Finalizar la revisión de los diagramas de flujos de información y aprobar',
    tipo: 'revision',
    estado: 'Completada',
    prioridad: 'Media',
    asignadoA: 'María González',
    asignadoPor: 'Arquitecto de Datos',
    fechaCreacion: '2025-12-01',
    fechaVencimiento: '2025-12-05',
    lineamientoCodigo: 'MAE.LI.AI.01',
    lineamientoNombre: 'Flujos de información',
    progreso: 100,
    comentarios: 8,
    adjuntos: 2
  }
];

const NOTIFICACIONES_EJEMPLO: Notificacion[] = [
  {
    id: 'N001',
    tipo: 'warning',
    titulo: 'Tarea próxima a vencer',
    mensaje: 'La tarea "Aprobar Plan de Ejercicios AE 2025-2026" vence en 1 día',
    fecha: '2025-12-07 14:30',
    leida: false
  },
  {
    id: 'N002',
    tipo: 'info',
    titulo: 'Nueva tarea asignada',
    mensaje: 'Te han asignado la tarea "Revisar evidencia de evaluación de madurez AE"',
    fecha: '2025-12-07 10:15',
    leida: false
  },
  {
    id: 'N003',
    tipo: 'success',
    titulo: 'Evidencia aprobada',
    mensaje: 'La evidencia "PETI 2025-2028" ha sido aprobada por el Director TI',
    fecha: '2025-12-07 09:00',
    leida: true
  },
  {
    id: 'N004',
    tipo: 'error',
    titulo: 'Evidencia rechazada',
    mensaje: 'La evidencia "Diagrama de Flujos" fue rechazada. Motivo: Falta información de interoperabilidad',
    fecha: '2025-12-06 16:45',
    leida: true
  },
  {
    id: 'N005',
    tipo: 'info',
    titulo: 'Nuevo comentario',
    mensaje: 'El Director TI ha comentado en la tarea "Aprobar Plan de Ejercicios AE"',
    fecha: '2025-12-06 14:20',
    leida: true
  }
];

interface IntegracionPortalTransaccionalProps {
  usuario?: UsuarioPersona;
}

export function IntegracionPortalTransaccional({ 
  usuario = USUARIO_EJEMPLO 
}: IntegracionPortalTransaccionalProps) {
  const [selectedRol, setSelectedRol] = useState<RolUsuario>(usuario.rolActivo);
  const [tareas, setTareas] = useState<Tarea[]>(TAREAS_EJEMPLO);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>(NOTIFICACIONES_EJEMPLO);
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTarea, setExpandedTarea] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);

  // Filtrar tareas según rol, estado y búsqueda
  const tareasFiltradas = useMemo(() => {
    let resultado = tareas;

    // Filtro por búsqueda
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      resultado = resultado.filter(t =>
        t.titulo.toLowerCase().includes(q) ||
        t.descripcion.toLowerCase().includes(q) ||
        t.lineamientoCodigo?.toLowerCase().includes(q) ||
        t.lineamientoNombre?.toLowerCase().includes(q)
      );
    }

    // Filtro por estado
    if (filtroEstado !== 'todos') {
      resultado = resultado.filter(t => t.estado === filtroEstado);
    }

    // Filtro por prioridad
    if (filtroPrioridad !== 'todos') {
      resultado = resultado.filter(t => t.prioridad === filtroPrioridad);
    }

    return resultado;
  }, [tareas, searchQuery, filtroEstado, filtroPrioridad]);

  // Estadísticas de tareas
  const stats = useMemo(() => {
    const total = tareas.length;
    const pendientes = tareas.filter(t => t.estado === 'Pendiente').length;
    const enProgreso = tareas.filter(t => t.estado === 'En Progreso').length;
    const completadas = tareas.filter(t => t.estado === 'Completada').length;
    const vencidas = tareas.filter(t => t.estado === 'Vencida').length;
    const criticas = tareas.filter(t => t.prioridad === 'Crítica' && t.estado !== 'Completada').length;
    const notificacionesNoLeidas = notificaciones.filter(n => !n.leida).length;

    return {
      total,
      pendientes,
      enProgreso,
      completadas,
      vencidas,
      criticas,
      notificacionesNoLeidas
    };
  }, [tareas, notificaciones]);

  const getEstadoBadge = (estado: EstadoTarea) => {
    const config: Record<EstadoTarea, { bg: string; text: string; icon: any }> = {
      'Pendiente': { bg: '#FEF3C7', text: '#92400E', icon: Clock },
      'En Progreso': { bg: '#DBEAFE', text: '#1E40AF', icon: Activity },
      'Completada': { bg: '#D1FAE5', text: '#065F46', icon: CheckCircle },
      'Vencida': { bg: '#FEE2E2', text: '#991B1B', icon: AlertCircle }
    };
    const style = config[estado];
    const Icon = style.icon;
    return (
      <Badge className="border-0 text-xs" style={{ background: style.bg, color: style.text, fontWeight: 600 }}>
        <Icon className="w-3 h-3 mr-1" />
        {estado}
      </Badge>
    );
  };

  const getPrioridadBadge = (prioridad: PrioridadTarea) => {
    const config: Record<PrioridadTarea, { bg: string; text: string }> = {
      'Crítica': { bg: '#FEE2E2', text: '#991B1B' },
      'Alta': { bg: '#FEF3C7', text: '#92400E' },
      'Media': { bg: '#DBEAFE', text: '#1E40AF' },
      'Baja': { bg: '#F3F4F6', text: '#6B7280' }
    };
    const style = config[prioridad];
    return (
      <Badge className="border-0 text-xs" style={{ background: style.bg, color: style.text, fontWeight: 600 }}>
        {prioridad}
      </Badge>
    );
  };

  const getTipoIcon = (tipo: TipoTarea) => {
    const icons: Record<TipoTarea, any> = {
      'revision': Eye,
      'aprobacion': CheckCircle,
      'carga': Upload,
      'actualizacion': RefreshCw,
      'comentario': MessageSquare,
      'lectura': BookOpen
    };
    return icons[tipo];
  };

  const getRolIcon = (rol: RolUsuario) => {
    const icons: Record<RolUsuario, any> = {
      'Estudiante': GraduationCap,
      'Docente': BookOpen,
      'Administrativo': Briefcase,
      'Directivo': Building2,
      'Arquitecto TI': Shield,
      'Revisor AE': Eye,
      'CISO': Shield,
      'Director TI': UserCheck,
      'Coordinador Territorial': Target,
      'Coordinador CETAP': Users
    };
    return icons[rol];
  };

  const handleCompletarTarea = (tareaId: string) => {
    setTareas(tareas.map(t => 
      t.id === tareaId ? { ...t, estado: 'Completada' as EstadoTarea, progreso: 100 } : t
    ));
    toast.success('Tarea completada correctamente');
  };

  const handleIniciarTarea = (tareaId: string) => {
    setTareas(tareas.map(t => 
      t.id === tareaId ? { ...t, estado: 'En Progreso' as EstadoTarea } : t
    ));
    toast.info('Tarea iniciada');
  };

  const handleMarcarNotificacionLeida = (notifId: string) => {
    setNotificaciones(notificaciones.map(n =>
      n.id === notifId ? { ...n, leida: true } : n
    ));
  };

  const getNotificationIcon = (tipo: Notificacion['tipo']) => {
    const icons = {
      'info': Info,
      'success': CheckCircle,
      'warning': AlertTriangle,
      'error': AlertCircle
    };
    return icons[tipo];
  };

  const getNotificationColor = (tipo: Notificacion['tipo']) => {
    const colors = {
      'info': { bg: '#EFF6FF', text: '#1E40AF', border: '#DBEAFE' },
      'success': { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' },
      'warning': { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
      'error': { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' }
    };
    return colors[tipo];
  };

  return (
    <div className="space-y-6">
      {/* Header con Usuario Persona */}
      <Card className="p-6 border border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl"
              style={{ background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)' }}
            >
              {usuario.avatar || usuario.nombre.split(' ').map(n => n[0]).join('')}
            </div>

            {/* Info del usuario */}
            <div>
              <h2 className="font-bold text-xl text-gray-900 mb-1">
                {usuario.nombre}
              </h2>
              <p className="text-sm text-gray-600 mb-2">
                {usuario.email}
              </p>
              <div className="flex items-center gap-2">
                <Badge className="border-0" style={{ background: '#003DA5', color: 'white' }}>
                  <UserCheck className="w-3 h-3 mr-1" />
                  {selectedRol}
                </Badge>
                {usuario.territorial && (
                  <Badge className="border-0" style={{ background: '#E5E7EB', color: '#374151' }}>
                    <Building2 className="w-3 h-3 mr-1" />
                    {usuario.territorial}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Selector de roles + Notificaciones */}
          <div className="flex items-center gap-3">
            {/* Notificaciones */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative"
              >
                <Bell className="w-4 h-4" />
                {stats.notificacionesNoLeidas > 0 && (
                  <span 
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: '#EF4444', color: 'white' }}
                  >
                    {stats.notificacionesNoLeidas}
                  </span>
                )}
              </Button>

              {/* Panel de notificaciones */}
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 top-12 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50"
                  >
                    <div className="p-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm text-gray-900">Notificaciones</h3>
                        <Badge className="border-0" style={{ background: '#EF4444', color: 'white' }}>
                          {stats.notificacionesNoLeidas} nuevas
                        </Badge>
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notificaciones.map((notif) => {
                        const Icon = getNotificationIcon(notif.tipo);
                        const colors = getNotificationColor(notif.tipo);
                        return (
                          <div
                            key={notif.id}
                            className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${!notif.leida ? 'bg-blue-50' : ''}`}
                            onClick={() => handleMarcarNotificacionLeida(notif.id)}
                          >
                            <div className="flex items-start gap-3">
                              <div 
                                className="p-2 rounded-lg"
                                style={{ background: colors.bg }}
                              >
                                <Icon className="w-4 h-4" style={{ color: colors.text }} />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-sm text-gray-900 mb-1">
                                  {notif.titulo}
                                </p>
                                <p className="text-xs text-gray-600 mb-2">
                                  {notif.mensaje}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {notif.fecha}
                                </p>
                              </div>
                              {!notif.leida && (
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="p-3 border-t border-gray-200 text-center">
                      <Button variant="ghost" size="sm" className="text-xs">
                        Ver todas las notificaciones
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Cambiar rol */}
            <select
              value={selectedRol}
              onChange={(e) => setSelectedRol(e.target.value as RolUsuario)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium"
            >
              {usuario.roles.map((rol) => {
                const Icon = getRolIcon(rol);
                return (
                  <option key={rol} value={rol}>
                    {rol}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </Card>

      {/* Estadísticas Rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <p className="text-xs text-gray-600">Total</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </Card>

        <Card className="p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-orange-600" />
            <p className="text-xs text-gray-600">Pendientes</p>
          </div>
          <p className="text-2xl font-bold text-orange-600">{stats.pendientes}</p>
        </Card>

        <Card className="p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-blue-600" />
            <p className="text-xs text-gray-600">En Progreso</p>
          </div>
          <p className="text-2xl font-bold text-blue-600">{stats.enProgreso}</p>
        </Card>

        <Card className="p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <p className="text-xs text-gray-600">Completadas</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.completadas}</p>
        </Card>

        <Card className="p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <p className="text-xs text-gray-600">Vencidas</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.vencidas}</p>
        </Card>

        <Card className="p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Flag className="w-4 h-4 text-red-600" />
            <p className="text-xs text-gray-600">Críticas</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.criticas}</p>
        </Card>
      </div>

      {/* Barra de búsqueda y filtros */}
      <Card className="p-4 border border-gray-200">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar tareas por título, descripción o lineamiento..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Estado</label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="todos">Todos</option>
                <option value="Pendiente">Pendientes ({stats.pendientes})</option>
                <option value="En Progreso">En Progreso ({stats.enProgreso})</option>
                <option value="Completada">Completadas ({stats.completadas})</option>
                <option value="Vencida">Vencidas ({stats.vencidas})</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Prioridad</label>
              <select
                value={filtroPrioridad}
                onChange={(e) => setFiltroPrioridad(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="todos">Todas</option>
                <option value="Crítica">Crítica</option>
                <option value="Alta">Alta</option>
                <option value="Media">Media</option>
                <option value="Baja">Baja</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setFiltroEstado('todos');
                  setFiltroPrioridad('todos');
                }}
                className="w-full"
              >
                <X className="w-4 h-4 mr-1" />
                Limpiar
              </Button>
            </div>

            <div className="flex items-end">
              <Button
                onClick={() => toast.info('Abriendo modal de nueva tarea...')}
                className="w-full"
                style={{ background: '#003DA5', color: 'white' }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Nueva Tarea
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600 pt-2 border-t border-gray-200">
            <span>
              Mostrando <strong>{tareasFiltradas.length}</strong> de <strong>{stats.total}</strong> tareas
            </span>
          </div>
        </div>
      </Card>

      {/* Lista de Tareas */}
      <div className="space-y-3">
        {tareasFiltradas.map((tarea) => {
          const Icon = getTipoIcon(tarea.tipo);
          const isExpanded = expandedTarea === tarea.id;

          return (
            <Card key={tarea.id} className="border border-gray-200 overflow-hidden hover:shadow-lg transition-all">
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {/* Icono de tipo */}
                  <div className="p-2.5 rounded-lg bg-blue-50">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>

                  {/* Contenido principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getEstadoBadge(tarea.estado)}
                          {getPrioridadBadge(tarea.prioridad)}
                          {tarea.lineamientoCodigo && (
                            <Badge className="text-xs border-0 bg-gray-100 text-gray-700">
                              {tarea.lineamientoCodigo}
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-sm text-gray-900 mb-1">
                          {tarea.titulo}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {tarea.descripcion}
                        </p>
                        {tarea.lineamientoNombre && (
                          <p className="text-xs text-gray-500 mb-2">
                            Lineamiento: {tarea.lineamientoNombre}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Progreso */}
                    {tarea.estado !== 'Pendiente' && tarea.estado !== 'Vencida' && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-600">Progreso</span>
                          <span className="font-semibold text-gray-900">{tarea.progreso}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: `${tarea.progreso}%`,
                              background: tarea.estado === 'Completada' ? '#10B981' : '#3B82F6'
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-xs text-gray-600 mb-3">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {tarea.asignadoPor}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Vence: {tarea.fechaVencimiento}
                      </span>
                      {tarea.comentarios > 0 && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {tarea.comentarios}
                        </span>
                      )}
                      {tarea.adjuntos > 0 && (
                        <span className="flex items-center gap-1">
                          <Paperclip className="w-3 h-3" />
                          {tarea.adjuntos}
                        </span>
                      )}
                    </div>

                    {/* Botones de acción */}
                    <div className="flex items-center gap-2">
                      {tarea.estado === 'Pendiente' && (
                        <Button
                          size="sm"
                          onClick={() => handleIniciarTarea(tarea.id)}
                          style={{ background: '#3B82F6', color: 'white' }}
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Iniciar
                        </Button>
                      )}

                      {tarea.estado === 'En Progreso' && (
                        <Button
                          size="sm"
                          onClick={() => handleCompletarTarea(tarea.id)}
                          style={{ background: '#10B981', color: 'white' }}
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Completar
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setExpandedTarea(isExpanded ? null : tarea.id)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        {isExpanded ? 'Ocultar' : 'Ver más'}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toast.info('Abriendo evidencia...')}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Abrir
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toast.info('Abriendo comentarios...')}
                      >
                        <MessageSquare className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Sección expandida */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-4 pt-4 border-t border-gray-200"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold text-sm text-gray-900 mb-2">Detalles</h4>
                          <div className="space-y-2 text-xs text-gray-600">
                            <div className="flex items-center justify-between">
                              <span>Asignado a:</span>
                              <span className="font-medium text-gray-900">{tarea.asignadoA}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Asignado por:</span>
                              <span className="font-medium text-gray-900">{tarea.asignadoPor}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Fecha creación:</span>
                              <span className="font-medium text-gray-900">{tarea.fechaCreacion}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Fecha vencimiento:</span>
                              <span className="font-medium text-gray-900">{tarea.fechaVencimiento}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold text-sm text-gray-900 mb-2">Acciones Rápidas</h4>
                          <div className="space-y-2">
                            <Button variant="outline" size="sm" className="w-full justify-start">
                              <Download className="w-3 h-3 mr-2" />
                              Descargar evidencia
                            </Button>
                            <Button variant="outline" size="sm" className="w-full justify-start">
                              <Share2 className="w-3 h-3 mr-2" />
                              Compartir tarea
                            </Button>
                            <Button variant="outline" size="sm" className="w-full justify-start">
                              <Calendar className="w-3 h-3 mr-2" />
                              Reagendar vencimiento
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Card>
          );
        })}
      </div>

      {tareasFiltradas.length === 0 && (
        <Card className="p-12 border border-gray-200 text-center">
          <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="font-semibold text-lg text-gray-900 mb-2">
            No se encontraron tareas
          </h3>
          <p className="text-gray-600 mb-4">
            Intenta ajustar los filtros o crea una nueva tarea
          </p>
          <Button style={{ background: '#003DA5', color: 'white' }}>
            <Plus className="w-4 h-4 mr-1" />
            Nueva Tarea
          </Button>
        </Card>
      )}
    </div>
  );
}

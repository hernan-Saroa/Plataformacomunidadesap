/**
 * MÓDULO: DASHBOARD ÁREA AUDITADA - PORTAL TRANSACCIONAL
 * 
 * Dashboard personal para empleados ESAP (docentes, administrativos, coordinadores)
 * que tienen compromisos de auditoría en sus áreas.
 * 
 * FUNCIONALIDADES:
 * - Notificaciones pendientes de auditorías
 * - Planes de mejoramiento activos con semáforos
 * - Hallazgos identificados en su área
 * - Acciones correctivas pendientes
 * - Carga rápida de evidencias
 * - Alertas de vencimientos
 * 
 * USUARIOS: Personal de áreas auditadas (todos los empleados ESAP)
 * ROL: Área Auditada
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Shield,
  Bell,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Upload,
  Eye,
  ChevronRight,
  AlertCircle,
  XCircle,
  Calendar,
  Target,
  TrendingUp,
  ListChecks,
  Download,
  MessageSquare,
  CheckSquare,
  Info,
  ArrowLeft
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { toast } from 'sonner';

// Tipos
interface Notificacion {
  id: string;
  tipo: 'nueva-auditoria' | 'hallazgo' | 'seguimiento' | 'plan-aprobado' | 'plan-rechazado' | 'vencimiento';
  titulo: string;
  descripcion: string;
  auditoria: string;
  fecha: string;
  prioridad: 'alta' | 'media' | 'baja';
  leida: boolean;
}

interface PlanMejoramientoActivo {
  id: string;
  auditoria: string;
  codigoAuditoria: string;
  fechaInicio: string;
  fechaFin: string;
  estado: 'al-dia' | 'proximo-vencimiento' | 'vencido';
  avance: number;
  accionesTotales: number;
  accionesCompletadas: number;
  accionesVencidas: number;
  proximoSeguimiento: string;
  diasParaSeguimiento: number;
}

interface Hallazgo {
  id: string;
  numero: string;
  auditoria: string;
  tipo: 'no-conformidad' | 'observacion' | 'oportunidad-mejora';
  gravedad: 'critico' | 'mayor' | 'menor';
  descripcion: string;
  fechaIdentificacion: string;
  estadoPlan: 'pendiente' | 'en-revision' | 'aprobado' | 'en-ejecucion' | 'cerrado';
  tieneControversia: boolean;
}

interface AccionCorrectiva {
  id: string;
  hallazgo: string;
  accion: string;
  responsable: string;
  fechaInicio: string;
  fechaFin: string;
  estado: 'pendiente' | 'en-proceso' | 'completada' | 'vencida';
  diasRestantes: number;
  requiereEvidencia: boolean;
}

interface DashboardAreaAuditadaProps {
  onVolver?: () => void;
}

export function DashboardAreaAuditada({ onVolver }: DashboardAreaAuditadaProps) {
  // Usuario actual (en producción vendría del contexto de autenticación)
  const usuarioActual = {
    nombre: 'María Fernanda Rodríguez López',
    area: 'Gestión Contractual',
    cargo: 'Coordinadora de Contratación',
    email: 'maria.rodriguez@esap.edu.co'
  };

  // Mock data - Notificaciones
  const [notificaciones] = useState<Notificacion[]>([
    {
      id: 'NOT-001',
      tipo: 'vencimiento',
      titulo: 'Plan de mejoramiento vencido',
      descripcion: 'El plan de mejoramiento de la auditoría de Gestión Contractual tiene acciones vencidas',
      auditoria: 'Auditoría Gestión Contractual 2025',
      fecha: '2025-11-15',
      prioridad: 'alta',
      leida: false
    },
    {
      id: 'NOT-002',
      tipo: 'seguimiento',
      titulo: 'Seguimiento trimestral próximo',
      descripcion: 'Debe cargar evidencias de cumplimiento en los próximos 13 días',
      auditoria: 'Auditoría Gestión Administrativa 2025',
      fecha: '2025-11-14',
      prioridad: 'media',
      leida: false
    },
    {
      id: 'NOT-003',
      tipo: 'nueva-auditoria',
      titulo: 'Nueva auditoría asignada',
      descripcion: 'Se ha programado una nueva auditoría a su área para el mes de diciembre',
      auditoria: 'Auditoría Gestión Contractual 2026',
      fecha: '2025-11-10',
      prioridad: 'baja',
      leida: false
    },
    {
      id: 'NOT-004',
      tipo: 'plan-aprobado',
      titulo: 'Plan de mejoramiento aprobado',
      descripcion: 'El Jefe de Control Interno aprobó su plan de mejoramiento',
      auditoria: 'Auditoría Talento Humano 2025',
      fecha: '2025-11-08',
      prioridad: 'baja',
      leida: true
    }
  ]);

  // Planes de mejoramiento activos
  const [planesActivos] = useState<PlanMejoramientoActivo[]>([
    {
      id: 'PM-2024-045',
      auditoria: 'Gestión Contractual',
      codigoAuditoria: 'AUD-2024-032',
      fechaInicio: '2024-08-01',
      fechaFin: '2025-11-15',
      estado: 'vencido',
      avance: 40,
      accionesTotales: 8,
      accionesCompletadas: 3,
      accionesVencidas: 3,
      proximoSeguimiento: '2025-12-01',
      diasParaSeguimiento: -12
    },
    {
      id: 'PM-2025-012',
      auditoria: 'Gestión Administrativa',
      codigoAuditoria: 'AUD-2025-008',
      fechaInicio: '2025-03-01',
      fechaFin: '2026-02-28',
      estado: 'proximo-vencimiento',
      avance: 75,
      accionesTotales: 4,
      accionesCompletadas: 3,
      accionesVencidas: 0,
      proximoSeguimiento: '2025-11-28',
      diasParaSeguimiento: 13
    },
    {
      id: 'PM-2025-018',
      auditoria: 'Talento Humano',
      codigoAuditoria: 'AUD-2025-015',
      fechaInicio: '2025-06-01',
      fechaFin: '2026-05-31',
      estado: 'al-dia',
      avance: 100,
      accionesTotales: 3,
      accionesCompletadas: 3,
      accionesVencidas: 0,
      proximoSeguimiento: '2026-01-15',
      diasParaSeguimiento: 58
    }
  ]);

  // Hallazgos
  const [hallazgos] = useState<Hallazgo[]>([
    {
      id: 'HALL-001',
      numero: 'H-2024-032-01',
      auditoria: 'Gestión Contractual 2024',
      tipo: 'no-conformidad',
      gravedad: 'critico',
      descripcion: 'No se encontró evidencia de actas del comité de contratación para 5 contratos superiores a 100 SMMLV',
      fechaIdentificacion: '2024-07-15',
      estadoPlan: 'en-ejecucion',
      tieneControversia: false
    },
    {
      id: 'HALL-002',
      numero: 'H-2024-032-02',
      auditoria: 'Gestión Contractual 2024',
      tipo: 'observacion',
      gravedad: 'mayor',
      descripcion: 'Los expedientes contractuales no cuentan con el orden establecido en la Guía de Gestión Documental',
      fechaIdentificacion: '2024-07-15',
      estadoPlan: 'en-ejecucion',
      tieneControversia: false
    },
    {
      id: 'HALL-003',
      numero: 'H-2025-008-01',
      auditoria: 'Gestión Administrativa 2025',
      tipo: 'oportunidad-mejora',
      gravedad: 'menor',
      descripcion: 'Se sugiere implementar un sistema digital para el control de bienes devolutivos',
      fechaIdentificacion: '2025-03-20',
      estadoPlan: 'en-ejecucion',
      tieneControversia: false
    }
  ]);

  // Acciones correctivas pendientes
  const [accionesPendientes] = useState<AccionCorrectiva[]>([
    {
      id: 'ACC-001',
      hallazgo: 'H-2024-032-01',
      accion: 'Actualizar procedimiento de convocatoria del comité de contratación',
      responsable: 'Coordinadora de Contratación',
      fechaInicio: '2024-08-01',
      fechaFin: '2025-11-15',
      estado: 'vencida',
      diasRestantes: -12,
      requiereEvidencia: true
    },
    {
      id: 'ACC-002',
      hallazgo: 'H-2024-032-02',
      accion: 'Socializar Guía de Gestión Documental con el equipo',
      responsable: 'Coordinadora de Contratación',
      fechaInicio: '2024-08-01',
      fechaFin: '2025-12-15',
      estado: 'en-proceso',
      diasRestantes: 18,
      requiereEvidencia: true
    },
    {
      id: 'ACC-003',
      hallazgo: 'H-2025-008-01',
      accion: 'Evaluar soluciones tecnológicas para control de bienes',
      responsable: 'Coordinadora de Contratación',
      fechaInicio: '2025-03-01',
      fechaFin: '2025-12-01',
      estado: 'en-proceso',
      diasRestantes: 4,
      requiereEvidencia: true
    }
  ]);

  const getNotificacionIcon = (tipo: string) => {
    const icons = {
      'nueva-auditoria': { Icon: Shield, color: 'text-blue-600' },
      'hallazgo': { Icon: AlertTriangle, color: 'text-red-600' },
      'seguimiento': { Icon: Clock, color: 'text-yellow-600' },
      'plan-aprobado': { Icon: CheckCircle, color: 'text-green-600' },
      'plan-rechazado': { Icon: XCircle, color: 'text-red-600' },
      'vencimiento': { Icon: AlertCircle, color: 'text-red-600' }
    };
    const config = icons[tipo as keyof typeof icons] || icons['nueva-auditoria'];
    return <config.Icon className={`w-5 h-5 ${config.color}`} />;
  };

  const getPrioridadBadge = (prioridad: string) => {
    const estilos = {
      'alta': { bg: 'bg-red-100', text: 'text-red-800', label: 'Alta' },
      'media': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Media' },
      'baja': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Baja' }
    };
    const estilo = estilos[prioridad as keyof typeof estilos];
    return (
      <Badge className={`${estilo.bg} ${estilo.text} border-0 px-2 py-1 text-xs`}>
        {estilo.label}
      </Badge>
    );
  };

  const getEstadoPlanBadge = (estado: string) => {
    const estilos = {
      'al-dia': { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, label: 'Al día' },
      'proximo-vencimiento': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock, label: 'Próximo vencimiento' },
      'vencido': { bg: 'bg-red-100', text: 'text-red-800', icon: AlertCircle, label: 'Vencido' }
    };
    const estilo = estilos[estado as keyof typeof estilos];
    const Icon = estilo.icon;
    return (
      <Badge className={`${estilo.bg} ${estilo.text} border-0 px-2 py-1 flex items-center gap-1 w-fit text-xs`}>
        <Icon className="w-3 h-3" />
        {estilo.label}
      </Badge>
    );
  };

  const getTipoHallazgoBadge = (tipo: string) => {
    const estilos = {
      'no-conformidad': { bg: 'bg-red-100', text: 'text-red-800', label: 'No Conformidad' },
      'observacion': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Observación' },
      'oportunidad-mejora': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Oportunidad de Mejora' }
    };
    const estilo = estilos[tipo as keyof typeof estilos];
    return (
      <Badge className={`${estilo.bg} ${estilo.text} border-0 px-2 py-1 text-xs`}>
        {estilo.label}
      </Badge>
    );
  };

  const getGravedadBadge = (gravedad: string) => {
    const estilos = {
      'critico': { bg: 'bg-red-100', text: 'text-red-800', label: 'Crítico' },
      'mayor': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Mayor' },
      'menor': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Menor' }
    };
    const estilo = estilos[gravedad as keyof typeof estilos];
    return (
      <Badge className={`${estilo.bg} ${estilo.text} border-0 px-2 py-1 text-xs`}>
        {estilo.label}
      </Badge>
    );
  };

  const getEstadoAccionBadge = (estado: string) => {
    const estilos = {
      'pendiente': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Pendiente' },
      'en-proceso': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'En Proceso' },
      'completada': { bg: 'bg-green-100', text: 'text-green-800', label: 'Completada' },
      'vencida': { bg: 'bg-red-100', text: 'text-red-800', label: 'Vencida' }
    };
    const estilo = estilos[estado as keyof typeof estilos];
    return (
      <Badge className={`${estilo.bg} ${estilo.text} border-0 px-2 py-1 text-xs`}>
        {estilo.label}
      </Badge>
    );
  };

  const notificacionesNoLeidas = notificaciones.filter(n => !n.leida).length;
  const planesConAlerta = planesActivos.filter(p => p.estado === 'vencido' || p.estado === 'proximo-vencimiento').length;
  const hallazgosCriticos = hallazgos.filter(h => h.gravedad === 'critico' || h.gravedad === 'mayor').length;
  const accionesVencidas = accionesPendientes.filter(a => a.estado === 'vencida').length;

  return (
    <div className="min-h-screen bg-gray-50 pt-16 pb-20 md:pb-0">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header con botón de volver */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          {/* Botón de volver (si existe la función) */}
          {onVolver && (
            <Button
              onClick={() => {
                console.log('DashboardAreaAuditada - Botón Volver clickeado');
                onVolver();
              }}
              variant="ghost"
              className="mb-4 hover:bg-gray-100 gap-2 font-semibold text-gray-700 hover:text-emerald-600"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver al Panel Administrativo</span>
            </Button>
          )}

          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)',
                    boxShadow: '0 4px 12px rgba(0, 61, 165, 0.15)'
                  }}
                >
                  <Shield className="w-6 h-6 text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                    Mis Compromisos de Auditoría
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    {usuarioActual.nombre} • {usuarioActual.area}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="gap-2 relative">
                <Bell className="w-4 h-4" />
                Notificaciones
                {notificacionesNoLeidas > 0 && (
                  <Badge className="bg-red-500 text-white border-0 absolute -top-2 -right-2 px-1.5 py-0.5 text-xs min-w-[20px] h-5 flex items-center justify-center">
                    {notificacionesNoLeidas}
                  </Badge>
                )}
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="w-4 h-4" />
                Mis Informes
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Alerta si hay compromisos vencidos */}
        {(planesConAlerta > 0 || accionesVencidas > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border-2 border-red-300 rounded-xl p-4"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-1">
                  Atención: Tiene compromisos vencidos
                </h3>
                <p className="text-sm text-red-800">
                  {accionesVencidas > 0 && `${accionesVencidas} ${accionesVencidas === 1 ? 'acción correctiva vencida' : 'acciones correctivas vencidas'}`}
                  {accionesVencidas > 0 && planesConAlerta > 0 && ' • '}
                  {planesConAlerta > 0 && `${planesConAlerta} ${planesConAlerta === 1 ? 'plan requiere atención' : 'planes requieren atención'}`}
                </p>
              </div>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => {
                  toast.info('Navegando a acciones vencidas');
                }}
              >
                Ver Detalles
              </Button>
            </div>
          </motion.div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* KPI 1: Notificaciones */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-6 border-l-4 border-l-blue-500">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Bell className="w-6 h-6 text-blue-600" />
                </div>
                {notificacionesNoLeidas > 0 && (
                  <Badge className="bg-blue-500 text-white border-0">
                    {notificacionesNoLeidas} nuevas
                  </Badge>
                )}
              </div>
              <h3 className="text-sm text-gray-600 mb-1">Notificaciones</h3>
              <p className="text-3xl font-bold text-gray-900">{notificaciones.length}</p>
              <p className="text-xs text-blue-600 mt-2">
                {notificacionesNoLeidas} sin leer
              </p>
            </Card>
          </motion.div>

          {/* KPI 2: Planes Activos */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-6 border-l-4 border-l-green-500">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Target className="w-6 h-6 text-green-600" />
                </div>
                {planesConAlerta > 0 && (
                  <Badge className="bg-yellow-500 text-white border-0">
                    {planesConAlerta} alertas
                  </Badge>
                )}
              </div>
              <h3 className="text-sm text-gray-600 mb-1">Planes de Mejoramiento</h3>
              <p className="text-3xl font-bold text-gray-900">{planesActivos.length}</p>
              <p className="text-xs text-gray-600 mt-2">
                {planesActivos.filter(p => p.estado === 'al-dia').length} al día
              </p>
            </Card>
          </motion.div>

          {/* KPI 3: Hallazgos */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-6 border-l-4 border-l-orange-500">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                </div>
                {hallazgosCriticos > 0 && (
                  <Badge className="bg-red-500 text-white border-0">
                    {hallazgosCriticos} críticos
                  </Badge>
                )}
              </div>
              <h3 className="text-sm text-gray-600 mb-1">Hallazgos</h3>
              <p className="text-3xl font-bold text-gray-900">{hallazgos.length}</p>
              <p className="text-xs text-orange-600 mt-2">
                En mi área
              </p>
            </Card>
          </motion.div>

          {/* KPI 4: Acciones Pendientes */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="p-6 border-l-4 border-l-purple-500">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <ListChecks className="w-6 h-6 text-purple-600" />
                </div>
                {accionesVencidas > 0 && (
                  <Badge className="bg-red-500 text-white border-0">
                    {accionesVencidas} vencidas
                  </Badge>
                )}
              </div>
              <h3 className="text-sm text-gray-600 mb-1">Acciones Correctivas</h3>
              <p className="text-3xl font-bold text-gray-900">{accionesPendientes.length}</p>
              <p className="text-xs text-gray-600 mt-2">
                {accionesPendientes.filter(a => a.estado === 'completada').length} completadas
              </p>
            </Card>
          </motion.div>
        </div>

        {/* Notificaciones Pendientes */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#003DA5]" />
              Notificaciones Pendientes
              {notificacionesNoLeidas > 0 && (
                <Badge className="bg-[#003DA5] text-white border-0 ml-2">
                  {notificacionesNoLeidas} nuevas
                </Badge>
              )}
            </h3>
            <Button variant="outline" size="sm" className="gap-2">
              Ver Todas
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-3">
            {notificaciones.slice(0, 3).map((notif) => (
              <Card 
                key={notif.id} 
                className={`p-4 hover:shadow-md transition-shadow cursor-pointer ${
                  !notif.leida ? 'bg-blue-50 border-blue-200' : ''
                }`}
                onClick={() => {
                  toast.info('Abriendo notificación');
                }}
              >
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    {getNotificacionIcon(notif.tipo)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">{notif.titulo}</h4>
                          {!notif.leida && (
                            <Badge className="bg-blue-500 text-white border-0 px-2 py-0.5 text-xs">
                              Nueva
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{notif.descripcion}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(notif.fecha).toLocaleDateString('es-CO')}
                          </span>
                          <span>•</span>
                          <span>{notif.auditoria}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getPrioridadBadge(notif.prioridad)}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Card>

        {/* Planes de Mejoramiento Activos */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-[#003DA5]" />
              Mis Planes de Mejoramiento Activos
            </h3>
          </div>

          <div className="space-y-4">
            {planesActivos.map((plan) => (
              <Card key={plan.id} className="p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-gray-900 text-lg">{plan.auditoria}</h4>
                      {getEstadoPlanBadge(plan.estado)}
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      Código: <strong>{plan.codigoAuditoria}</strong> • ID Plan: <strong>{plan.id}</strong>
                    </p>
                    <p className="text-sm text-gray-600">
                      Vigencia: {new Date(plan.fechaInicio).toLocaleDateString('es-CO')} - {new Date(plan.fechaFin).toLocaleDateString('es-CO')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 mb-1">Acciones Totales</p>
                    <p className="text-2xl font-bold text-gray-900">{plan.accionesTotales}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 mb-1">Completadas</p>
                    <p className="text-2xl font-bold text-green-600">{plan.accionesCompletadas}</p>
                  </div>
                  {plan.accionesVencidas > 0 && (
                    <div className="bg-red-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Vencidas</p>
                      <p className="text-2xl font-bold text-red-600">{plan.accionesVencidas}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Avance General</span>
                    <span className="font-semibold text-gray-900">{plan.avance}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        plan.estado === 'al-dia' ? 'bg-green-500' :
                        plan.estado === 'proximo-vencimiento' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${plan.avance}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm">
                    {plan.diasParaSeguimiento > 0 ? (
                      <p className="text-gray-600">
                        Próximo seguimiento: <strong>{new Date(plan.proximoSeguimiento).toLocaleDateString('es-CO')}</strong>
                        <span className="text-yellow-600 ml-2">({plan.diasParaSeguimiento} días)</span>
                      </p>
                    ) : (
                      <p className="text-red-600 font-medium">
                        Seguimiento vencido hace {Math.abs(plan.diasParaSeguimiento)} días
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Eye className="w-4 h-4" />
                      Ver Plan
                    </Button>
                    <Button 
                      size="sm" 
                      className="bg-[#003DA5] hover:bg-[#002873] gap-2"
                      onClick={() => {
                        toast.success('Abriendo formulario de evidencias');
                      }}
                    >
                      <Upload className="w-4 h-4" />
                      Cargar Evidencias
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Card>

        {/* Hallazgos y Acciones Correctivas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hallazgos */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#003DA5]" />
                Hallazgos en Mi Área
              </h3>
              <Button variant="outline" size="sm" className="gap-2">
                Ver Todos
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3">
              {hallazgos.map((hallazgo) => (
                <Card key={hallazgo.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">{hallazgo.numero}</Badge>
                        {getTipoHallazgoBadge(hallazgo.tipo)}
                        {getGravedadBadge(hallazgo.gravedad)}
                      </div>
                      <p className="text-sm text-gray-900 mb-2">{hallazgo.descripcion}</p>
                      <p className="text-xs text-gray-600">
                        {hallazgo.auditoria} • {new Date(hallazgo.fechaIdentificacion).toLocaleDateString('es-CO')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t mt-3">
                    <Badge className="bg-blue-100 text-blue-800 border-0 text-xs">
                      Plan en ejecución
                    </Badge>
                    <Button variant="ghost" size="sm" className="gap-2 text-[#003DA5]">
                      Ver Detalles
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </Card>

          {/* Acciones Correctivas Pendientes */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-[#003DA5]" />
                Acciones Correctivas
              </h3>
            </div>

            <div className="space-y-3">
              {accionesPendientes.map((accion) => (
                <Card key={accion.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getEstadoAccionBadge(accion.estado)}
                        {accion.requiereEvidencia && (
                          <Badge className="bg-orange-100 text-orange-800 border-0 text-xs flex items-center gap-1">
                            <Upload className="w-3 h-3" />
                            Requiere evidencia
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-900 mb-2">{accion.accion}</p>
                      <p className="text-xs text-gray-600 mb-1">
                        Hallazgo: {accion.hallazgo}
                      </p>
                      <p className="text-xs text-gray-600">
                        Responsable: <strong>{accion.responsable}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="text-xs">
                      {accion.diasRestantes > 0 ? (
                        <p className="text-gray-600">
                          Vence: {new Date(accion.fechaFin).toLocaleDateString('es-CO')}
                          <span className={`ml-2 font-medium ${
                            accion.diasRestantes <= 7 ? 'text-yellow-600' : 'text-gray-600'
                          }`}>
                            ({accion.diasRestantes} días)
                          </span>
                        </p>
                      ) : (
                        <p className="text-red-600 font-medium">
                          Vencida hace {Math.abs(accion.diasRestantes)} días
                        </p>
                      )}
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="gap-2"
                      onClick={() => {
                        toast.info('Abriendo formulario de actualización');
                      }}
                    >
                      Actualizar
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </div>

        {/* Información de ayuda */}
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">Información Importante</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Recibirá notificaciones automáticas 7 días antes de los seguimientos trimestrales</li>
                <li>• Las acciones vencidas afectan los indicadores de cumplimiento de su área</li>
                <li>• Puede presentar controversias sobre hallazgos dentro de los 5 días siguientes a su notificación</li>
                <li>• Los planes de mejoramiento requieren aprobación del Jefe de Control Interno</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
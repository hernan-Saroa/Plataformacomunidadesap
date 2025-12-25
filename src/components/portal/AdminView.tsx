/**
 * Vista de Administrativo - Portal Transaccional
 * 
 * Vista especializada para usuarios con rol ADMINISTRATIVO activo.
 * Diseño consistente con el Portal Transaccional ESAP.
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Briefcase,
  FileText,
  Users,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  ChevronRight,
  ExternalLink,
  Bell,
  Calendar,
  ClipboardList,
  Settings,
  Shield,
  Scale,
  Gavel,
  Building2,
  Activity,
  FileCheck,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Separator } from '../ui/separator';
import { MisExpedientesLegales } from './MisExpedientesLegales';
import { DashboardAreaAuditada } from './control-interno/DashboardAreaAuditada';

interface AdminViewProps {
  userName: string;
  userEmail: string;
  adminData?: {
    area: string;
    cargo: string;
    dependencia: string;
    codigo_empleado: string;
    solicitudes_pendientes: number;
    reportes_generados: number;
    perfil?: {
      foto?: string;
    };
  };
}

export function AdminView({ userName, userEmail, adminData }: AdminViewProps) {
  const [vistaActual, setVistaActual] = useState<'dashboard' | 'expedientes-legales' | 'control-interno'>('dashboard');

  // Datos mock si no se proveen
  const data = adminData || {
    area: 'Planeación',
    cargo: 'Funcionario Administrativo',
    dependencia: 'Oficina de Control Interno',
    codigo_empleado: 'EMP-00234',
    solicitudes_pendientes: 12,
    reportes_generados: 8,
    perfil: {
      foto: undefined
    }
  };

  // Función para volver al dashboard principal
  const volverADashboard = () => {
    setVistaActual('dashboard');
  };

  // Si está en una vista específica de módulo, renderizarla
  if (vistaActual === 'expedientes-legales') {
    return <MisExpedientesLegales onVolver={volverADashboard} />;
  }

  if (vistaActual === 'control-interno') {
    return <DashboardAreaAuditada onVolver={volverADashboard} />;
  }

  // Vista del dashboard principal con diseño del Portal Transaccional
  return (
    <div className="min-h-screen bg-gray-50 pt-16 pb-20 md:pb-0">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-12 gap-8">
          {/* Sidebar Izquierdo - Perfil Administrativo */}
          <div className="lg:col-span-4 space-y-6">
            {/* Perfil Card */}
            <Card className="overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
              <div className="relative h-24 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd]" />
              <CardContent className="pt-0 px-6 pb-6">
                <div className="flex flex-col items-center -mt-12">
                  <Avatar className="w-24 h-24 ring-4 ring-white shadow-xl">
                    <AvatarImage src={data.perfil?.foto} alt={userName} />
                    <AvatarFallback className="bg-gradient-to-br from-[#1e5da8] to-[#2a6dbd] text-white text-xl">
                      {userName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="mt-4 text-lg font-black text-gray-900 text-center">{userName}</h3>
                  <p className="text-sm text-gray-600 text-center mb-3 px-2">
                    {data.cargo}
                  </p>
                  <Badge variant="secondary" className="text-xs font-semibold bg-blue-50 text-blue-700 border-blue-200">
                    Administrativo
                  </Badge>

                  <Separator className="w-full my-5" />

                  {/* Información Usuario */}
                  <div className="w-full space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Dependencia</span>
                      <span className="text-sm font-bold text-gray-900 text-right">{data.dependencia}</span>
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm text-gray-600 flex-shrink-0">Área</span>
                      <span className="text-sm font-bold text-gray-900 text-right break-words">{data.area}</span>
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm text-gray-600 flex-shrink-0">Correo</span>
                      <span className="text-sm font-bold text-gray-900 text-right break-words">{userEmail}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Código</span>
                      <span className="text-sm font-black text-[#1e5da8]">
                        {data.codigo_empleado}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Estado</span>
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-semibold">
                        Activo
                      </Badge>
                    </div>
                  </div>

                  <Separator className="w-full my-5" />

                  <Button 
                    variant="outline" 
                    className="w-full gap-2 hover:bg-[#1e5da8] hover:text-white hover:border-[#1e5da8] transition-all duration-300 font-semibold"
                  >
                    <Settings className="w-4 h-4" />
                    Ver Mi Perfil
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Métricas Rápidas */}
            <Card className="shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#1e5da8]" />
                  Métricas del Periodo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="text-sm font-semibold text-gray-900">Pendientes</span>
                  </div>
                  <span className="text-xl font-bold text-red-600">{data.solicitudes_pendientes}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileCheck className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-semibold text-gray-900">Completados</span>
                  </div>
                  <span className="text-xl font-bold text-blue-600">{data.reportes_generados}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-semibold text-gray-900">Eficiencia</span>
                  </div>
                  <span className="text-xl font-bold text-blue-600">94%</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contenido Principal */}
          <div className="lg:col-span-8 space-y-8">
            {/* Banner de Bienvenida */}
            <Card className="overflow-hidden bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-8">
                <div className="flex items-center justify-between gap-6">
                  <div className="flex-1">
                    <h2 className="text-3xl font-black mb-3">
                      ¡Bienvenido, {userName}! 👋
                    </h2>
                    <p className="text-blue-100 mb-5 text-lg">
                      Panel administrativo para gestión de procesos internos y control institucional.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                        <p className="text-xs text-blue-100 mb-1">Solicitudes</p>
                        <p className="text-xl font-bold">{data.solicitudes_pendientes}</p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                        <p className="text-xs text-blue-100 mb-1">Reportes</p>
                        <p className="text-xl font-bold">{data.reportes_generados}</p>
                      </div>
                    </div>
                  </div>
                  <Briefcase className="w-24 h-24 text-white/20" />
                </div>
              </CardContent>
            </Card>

            {/* Accesos Rápidos a Módulos */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Módulos Administrativos</h3>
                <Badge variant="outline" className="text-xs">3 módulos disponibles</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <QuickAccessCard
                  icon={<Gavel className="w-6 h-6" />}
                  title="Control Disciplinario"
                  description="Procesos disciplinarios"
                  badge={3}
                  color="from-indigo-500 to-indigo-600"
                  onClick={() => setVistaActual('expedientes-legales')}
                />
                <QuickAccessCard
                  icon={<ClipboardList className="w-6 h-6" />}
                  title="Control de Gestión"
                  description="Auditorías y hallazgos"
                  badge={2}
                  color="from-blue-500 to-blue-600"
                  onClick={() => setVistaActual('control-interno')}
                />
                <QuickAccessCard
                  icon={<Scale className="w-6 h-6" />}
                  title="Gestión Legal"
                  description="Procesos judiciales"
                  badge={3}
                  color="from-purple-600 to-purple-700"
                  onClick={() => setVistaActual('expedientes-legales')}
                />
              </div>
            </div>

            {/* Solicitudes Pendientes */}
            <Card className="shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    Solicitudes Pendientes
                  </CardTitle>
                  <Badge variant="destructive" className="text-xs">
                    {data.solicitudes_pendientes} urgentes
                  </Badge>
                </div>
                <CardDescription>Requieren tu atención inmediata</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  {
                    tipo: 'Proceso Disciplinario',
                    descripcion: 'Presunto incumplimiento de horario - DISC-2024-003',
                    usuario: 'Carlos Andrés Pérez',
                    fecha: 'Hace 2 horas',
                    urgente: true,
                    icono: Gavel,
                    color: 'red',
                  },
                  {
                    tipo: 'Hallazgo de Auditoría',
                    descripcion: 'Falta documentación procesos contratación',
                    usuario: 'Ricardo Sánchez',
                    fecha: 'Hace 5 horas',
                    urgente: true,
                    icono: ClipboardList,
                    color: 'yellow',
                  },
                  {
                    tipo: 'Proceso Legal',
                    descripcion: 'Demanda laboral - Próxima audiencia',
                    usuario: 'Hernando Pérez',
                    fecha: 'Hace 1 día',
                    urgente: false,
                    icono: Scale,
                    color: 'blue',
                  },
                ].map((solicitud, index) => {
                  const Icon = solicitud.icono;
                  return (
                    <div
                      key={index}
                      className={`flex items-start gap-3 p-4 rounded-lg transition-colors border-2 ${
                        solicitud.urgente
                          ? 'bg-red-50 border-red-200 hover:bg-red-100'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                          solicitud.color === 'red' ? 'text-red-600' :
                          solicitud.color === 'yellow' ? 'text-yellow-600' :
                          'text-blue-600'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-gray-900">{solicitud.tipo}</span>
                          {solicitud.urgente && (
                            <Badge variant="destructive" className="text-xs">
                              Urgente
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 mb-1">{solicitud.descripcion}</p>
                        <p className="text-xs text-gray-600">Responsable: {solicitud.usuario}</p>
                        <p className="text-xs text-gray-500 mt-1">{solicitud.fecha}</p>
                      </div>
                      <Button size="sm" variant="outline" className="text-xs h-8 px-3">
                        Ver Detalle
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Actividad Reciente */}
            <Card className="shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-600" />
                  Actividad Reciente
                </CardTitle>
                <CardDescription>Últimas acciones administrativas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  {
                    accion: 'Aprobó proceso disciplinario DISC-2024-002',
                    tipo: 'Sanción aplicada: Suspensión 30 días',
                    timestamp: 'Hace 30 min',
                    estado: 'success',
                    icono: CheckCircle2,
                  },
                  {
                    accion: 'Generó reporte de control interno',
                    tipo: 'Auditoría proceso de contratación',
                    timestamp: 'Hace 1 hora',
                    estado: 'info',
                    icono: FileText,
                  },
                  {
                    accion: 'Actualizó plan de mejoramiento',
                    tipo: 'GEST-2024-001 - Avance 40%',
                    timestamp: 'Hace 3 horas',
                    estado: 'info',
                    icono: TrendingUp,
                  },
                  {
                    accion: 'Revisó expediente legal LEG-2024-001',
                    tipo: 'Audiencia programada para feb 10',
                    timestamp: 'Ayer',
                    estado: 'warning',
                    icono: Scale,
                  },
                ].map((actividad, index) => {
                  const Icon = actividad.icono;
                  return (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <Icon
                        className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                          actividad.estado === 'success'
                            ? 'text-green-600'
                            : actividad.estado === 'warning'
                            ? 'text-orange-600'
                            : 'text-blue-600'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 mb-0.5">{actividad.accion}</p>
                        <p className="text-xs text-gray-600 mb-1">{actividad.tipo}</p>
                        <p className="text-xs text-gray-500">{actividad.timestamp}</p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Estadísticas */}
            <Card className="shadow-sm hover:shadow-md transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-emerald-600" />
                  Estadísticas del Periodo
                </CardTitle>
                <CardDescription>Resumen de actividad administrativa - Diciembre 2024</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg">
                    <p className="text-3xl font-bold text-indigo-600">8</p>
                    <p className="text-xs text-gray-600 mt-1 font-semibold">Procesos Activos</p>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                    <p className="text-3xl font-bold text-green-600">2</p>
                    <p className="text-xs text-gray-600 mt-1 font-semibold">Resueltos</p>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
                    <p className="text-3xl font-bold text-orange-600">5</p>
                    <p className="text-xs text-gray-600 mt-1 font-semibold">Hallazgos</p>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                    <p className="text-3xl font-bold text-purple-600">{data.reportes_generados}</p>
                    <p className="text-xs text-gray-600 mt-1 font-semibold">Reportes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente auxiliar para Quick Access Cards
interface QuickAccessCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  badge?: number;
  onClick: () => void;
}

function QuickAccessCard({ icon, title, description, color, badge, onClick }: QuickAccessCardProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group relative overflow-hidden rounded-xl border-2 border-gray-200 hover:border-emerald-500 transition-all bg-white p-6 text-left shadow-sm hover:shadow-lg"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-5 transition-opacity`} />
      {badge !== undefined && badge > 0 && (
        <Badge className="absolute top-3 right-3 bg-red-500 text-white border-none font-bold">
          {badge}
        </Badge>
      )}
      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white mb-4 shadow-md group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <h3 className="font-bold text-gray-900 mb-1 text-base">{title}</h3>
      <p className="text-xs text-gray-600">{description}</p>
      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all absolute bottom-4 right-4" />
    </motion.button>
  );
}
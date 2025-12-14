/**
 * Vista de Administrativo - Portal Transaccional
 * 
 * Vista especializada para usuarios con rol ADMINISTRATIVO activo.
 * Muestra dashboard administrativo ligero con accesos rápidos al Backoffice.
 */

import { useState, useCallback } from 'react';
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
  X,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
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
  };
}

export function AdminView({ userName, userEmail, adminData }: AdminViewProps) {
  const [vistaActual, setVistaActual] = useState<'dashboard' | 'expedientes-legales' | 'control-interno'>('dashboard');

  // Datos mock si no se proveen
  const data = adminData || {
    area: 'Gestión Académica',
    cargo: 'Secretaria Ejecutiva',
    dependencia: 'Vicerrectoría Académica',
    codigo_empleado: 'EMP-00234',
    solicitudes_pendientes: 12,
    reportes_generados: 8,
  };

  // Función para volver al dashboard principal
  const volverADashboard = () => {
    console.log('volverADashboard llamado - cambiando vista a dashboard');
    setVistaActual('dashboard');
  };

  console.log('AdminView - Vista actual:', vistaActual);

  // Si está en una vista específica de módulo, renderizarla
  if (vistaActual === 'expedientes-legales') {
    return <MisExpedientesLegales onVolver={volverADashboard} />;
  }

  if (vistaActual === 'control-interno') {
    return <DashboardAreaAuditada onVolver={volverADashboard} />;
  }

  // Vista del dashboard principal
  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header administrativo */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-6 text-white shadow-xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="w-6 h-6" />
              <h1 className="text-2xl sm:text-3xl font-bold">
                Panel Administrativo
              </h1>
            </div>
            <p className="text-emerald-100 text-sm sm:text-base mb-1">
              {data.cargo}
            </p>
            <p className="text-emerald-50 text-xs mb-4">
              {data.dependencia} • {data.area}
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                <p className="text-xs text-emerald-100">Solicitudes Pendientes</p>
                <p className="text-xl font-bold">{data.solicitudes_pendientes}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                <p className="text-xs text-emerald-100">Reportes Generados</p>
                <p className="text-xl font-bold">{data.reportes_generados}</p>
              </div>
            </div>
          </div>
          <Badge className="bg-green-500 text-white border-none">
            Activo
          </Badge>
        </div>
      </motion.div>

      {/* Accesos rápidos - Módulos del Portal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <QuickAccessCard
          icon={<ClipboardList className="w-6 h-6" />}
          title="Control Interno"
          description="Auditorías y hallazgos"
          color="from-cyan-500 to-cyan-600"
          onClick={() => setVistaActual('control-interno')}
        />
        <QuickAccessCard
          icon={<Shield className="w-6 h-6" />}
          title="Control Interno Disciplinario"
          description="Procesos disciplinarios"
          badge={2}
          color="from-orange-500 to-orange-600"
          onClick={() => setVistaActual('expedientes-legales')}
        />
        <QuickAccessCard
          icon={<Scale className="w-6 h-6" />}
          title="Gestión Legal"
          description="Juzgamiento disciplinario"
          color="from-purple-600 to-purple-700"
          onClick={() => setVistaActual('expedientes-legales')}
        />
      </div>

      {/* Segunda fila de accesos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <QuickAccessCard
          icon={<BarChart3 className="w-6 h-6" />}
          title="Reportes"
          description="Ver estadísticas"
          color="from-emerald-500 to-emerald-600"
          onClick={() => console.log('Reportes')}
        />
        <QuickAccessCard
          icon={<Settings className="w-6 h-6" />}
          title="Configuración"
          description="Ajustes del sistema"
          color="from-gray-500 to-gray-600"
          onClick={() => console.log('Configuración')}
        />
      </div>

      {/* Cards principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Solicitudes pendientes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-emerald-600" />
              Solicitudes Pendientes
            </CardTitle>
            <CardDescription>
              Requieren tu aprobación
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              {
                tipo: 'Certificado Académico',
                usuario: 'María González',
                fecha: 'Hace 2 horas',
                urgente: true,
              },
              {
                tipo: 'Homologación Materias',
                usuario: 'Carlos Ramírez',
                fecha: 'Hace 5 horas',
                urgente: false,
              },
              {
                tipo: 'Cambio de Programa',
                usuario: 'Ana Martínez',
                fecha: 'Hace 1 día',
                urgente: false,
              },
              {
                tipo: 'Validación de Título',
                usuario: 'Juan Pérez',
                fecha: 'Hace 2 días',
                urgente: true,
              },
            ].map((solicitud, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                  solicitud.urgente
                    ? 'bg-red-50 border border-red-200'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <AlertCircle
                  className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    solicitud.urgente ? 'text-red-600' : 'text-orange-600'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{solicitud.tipo}</span>
                    {solicitud.urgente && (
                      <Badge variant="destructive" className="text-xs">
                        Urgente
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-600">Solicitante: {solicitud.usuario}</p>
                  <p className="text-xs text-gray-500 mt-1">{solicitud.fecha}</p>
                </div>
                <Button size="sm" variant="outline" className="text-xs h-7">
                  Revisar
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Actividades recientes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              Actividad Reciente
            </CardTitle>
            <CardDescription>
              Últimas acciones administrativas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              {
                accion: 'Aprobó solicitud de certificado',
                usuario: 'Pedro López',
                timestamp: 'Hace 30 min',
                tipo: 'success',
              },
              {
                accion: 'Generó reporte de matrícula',
                timestamp: 'Hace 1 hora',
                tipo: 'info',
              },
              {
                accion: 'Actualizó información de estudiante',
                usuario: 'Luisa García',
                timestamp: 'Hace 3 horas',
                tipo: 'info',
              },
              {
                accion: 'Rechazó solicitud de homologación',
                usuario: 'Roberto Díaz',
                timestamp: 'Ayer',
                tipo: 'warning',
              },
            ].map((actividad, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <CheckCircle2
                  className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    actividad.tipo === 'success'
                      ? 'text-green-600'
                      : actividad.tipo === 'warning'
                      ? 'text-orange-600'
                      : 'text-blue-600'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm mb-0.5">{actividad.accion}</p>
                  {actividad.usuario && (
                    <p className="text-xs text-gray-600">Usuario: {actividad.usuario}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">{actividad.timestamp}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Estadísticas administrativas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            Estadísticas del Periodo
          </CardTitle>
          <CardDescription>
            Resumen de actividad administrativa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-emerald-50 rounded-lg">
              <p className="text-3xl font-bold text-emerald-600">156</p>
              <p className="text-xs text-gray-600 mt-1">Solicitudes Procesadas</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-3xl font-bold text-blue-600">42</p>
              <p className="text-xs text-gray-600 mt-1">Usuarios Creados</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-3xl font-bold text-purple-600">{data.reportes_generados}</p>
              <p className="text-xs text-gray-600 mt-1">Reportes Generados</p>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-lg">
              <p className="text-3xl font-bold text-amber-600">94%</p>
              <p className="text-xs text-gray-600 mt-1">Tiempo Respuesta</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Acceso al Backoffice completo */}
      <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Backoffice Administrativo</h3>
                <p className="text-sm text-gray-600">
                  Accede al panel completo de administración
                </p>
              </div>
            </div>
            <Button className="bg-emerald-600 hover:bg-emerald-700 whitespace-nowrap">
              Ir al Backoffice <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente auxiliar para Quick Access
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
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group relative overflow-hidden rounded-xl border-2 border-gray-200 hover:border-emerald-600 transition-all bg-white p-4 text-left"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-5 transition-opacity`} />
      {badge !== undefined && badge > 0 && (
        <Badge className="absolute top-2 right-2 bg-red-500 text-white border-none">
          {badge}
        </Badge>
      )}
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white mb-3 shadow-md`}>
        {icon}
      </div>
      <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-xs text-gray-600">{description}</p>
      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 transition-colors absolute bottom-4 right-4" />
    </motion.button>
  );
}
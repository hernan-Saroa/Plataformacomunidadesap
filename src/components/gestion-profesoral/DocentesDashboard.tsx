import { motion } from 'motion/react';
import { 
  Users, 
  GraduationCap, 
  FileText, 
  BarChart3, 
  Calendar, 
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  BookOpen,
  Award,
  UserCheck
} from 'lucide-react';
import { Card } from '../ui/card';

interface DocentesDashboardProps {
  className?: string;
}

export function DocentesDashboard({ className = '' }: DocentesDashboardProps) {
  // Mock data - En producción vendría de Supabase
  const stats = {
    docentes: {
      total: 752,
      activos: 698,
      licencia: 12,
      retirados: 42,
      cambio: '+5.2%'
    },
    ptas: {
      total: 145,
      aprobados: 104,
      enRevision: 26,
      pendientes: 15,
      cumplimiento: 78.5
    },
    convocatorias: {
      abiertas: 3,
      enProceso: 2,
      candidatos: 247
    },
    evaluaciones: {
      completadas: 598,
      pendientes: 154,
      promedio: 84.2
    }
  };

  const alertas = [
    { id: 1, tipo: 'warning', mensaje: '5 contratos vencen en 30 días', icono: Clock },
    { id: 2, tipo: 'info', mensaje: '12 PTAs pendientes de aprobación', icono: FileText },
    { id: 3, tipo: 'error', mensaje: '3 conflictos de horario detectados', icono: AlertCircle },
    { id: 4, tipo: 'success', mensaje: '15 evaluaciones completadas hoy', icono: CheckCircle }
  ];

  const distribucionEscalafon = [
    { categoria: 'Titular', cantidad: 45, porcentaje: 6, color: '#1e5da8' },
    { categoria: 'Asociado', cantidad: 156, porcentaje: 21, color: '#2a6dbd' },
    { categoria: 'Asistente', cantidad: 298, porcentaje: 40, color: '#4a8fd6' },
    { categoria: 'Auxiliar', cantidad: 253, porcentaje: 33, color: '#7ab3e8' }
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Gestión Profesoral
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Sistema integral de gestión del cuerpo docente ESAP
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Periodo:</span>
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium">
            <option>2025-I</option>
            <option>2024-II</option>
            <option>2024-I</option>
          </select>
        </div>
      </div>

      {/* Stats Cards - Grid Responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Docentes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Docentes Activos</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.docentes.activos}</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-600">{stats.docentes.cambio}</span>
                  <span className="text-xs text-gray-500">vs mes anterior</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-[#1e5da8]" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Total: {stats.docentes.total}</span>
                <span className="text-gray-600">Licencia: {stats.docentes.licencia}</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Card 2: PTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">PTAs Aprobados</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.ptas.aprobados}</p>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-sm font-medium text-blue-600">
                    {Math.round((stats.ptas.aprobados / stats.ptas.total) * 100)}%
                  </span>
                  <span className="text-xs text-gray-500">del total</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">En revisión: {stats.ptas.enRevision}</span>
                <span className="text-amber-600">Pendientes: {stats.ptas.pendientes}</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Card 3: Convocatorias */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Convocatorias Abiertas</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.convocatorias.abiertas}</p>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-sm font-medium text-green-600">
                    {stats.convocatorias.candidatos}
                  </span>
                  <span className="text-xs text-gray-500">candidatos totales</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">En proceso: {stats.convocatorias.enProceso}</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Card 4: Evaluaciones */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Promedio Evaluación</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.evaluaciones.promedio}</p>
                <div className="flex items-center gap-1 mt-2">
                  <Award className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-600">Satisfactorio</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Completadas: {stats.evaluaciones.completadas}</span>
                <span className="text-amber-600">Pendientes: {stats.evaluaciones.pendientes}</span>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Alertas */}
        <div className="lg:col-span-1">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Alertas Pendientes</h3>
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="space-y-3">
              {alertas.map((alerta, index) => {
                const Icon = alerta.icono;
                const colorClasses = {
                  warning: 'bg-amber-50 text-amber-700 border-amber-200',
                  info: 'bg-blue-50 text-blue-700 border-blue-200',
                  error: 'bg-red-50 text-red-700 border-red-200',
                  success: 'bg-green-50 text-green-700 border-green-200'
                };
                
                return (
                  <motion.div
                    key={alerta.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className={`p-3 rounded-lg border ${colorClasses[alerta.tipo as keyof typeof colorClasses]} flex items-start gap-3`}
                  >
                    <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <p className="text-sm flex-1">{alerta.mensaje}</p>
                  </motion.div>
                );
              })}
            </div>
            <button className="w-full mt-4 py-2 text-sm font-medium text-[#1e5da8] hover:bg-blue-50 rounded-lg transition-colors">
              Ver todas las alertas
            </button>
          </Card>
        </div>

        {/* Right Column - Distribución por Escalafón */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-gray-900">Distribución por Escalafón</h3>
              <GraduationCap className="w-5 h-5 text-[#1e5da8]" />
            </div>
            <div className="space-y-4">
              {distribucionEscalafon.map((item, index) => (
                <motion.div
                  key={item.categoria}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm font-medium text-gray-900">{item.categoria}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">{item.cantidad} docentes</span>
                      <span className="text-sm font-bold text-gray-900">{item.porcentaje}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.porcentaje}%` }}
                      transition={{ delay: 0.8 + index * 0.1, duration: 0.5 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="p-4 bg-gradient-to-br from-[#1e5da8] to-[#2a6dbd] text-white rounded-xl shadow-lg hover:shadow-xl transition-shadow"
        >
          <Users className="w-6 h-6 mb-2" />
          <span className="text-sm font-medium">Nuevo Docente</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="p-4 bg-gradient-to-br from-purple-600 to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-shadow"
        >
          <FileText className="w-6 h-6 mb-2" />
          <span className="text-sm font-medium">Crear PTA</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="p-4 bg-gradient-to-br from-green-600 to-green-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-shadow"
        >
          <UserCheck className="w-6 h-6 mb-2" />
          <span className="text-sm font-medium">Nueva Convocatoria</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="p-4 bg-gradient-to-br from-amber-600 to-amber-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-shadow"
        >
          <BarChart3 className="w-6 h-6 mb-2" />
          <span className="text-sm font-medium">Ver Reportes</span>
        </motion.button>
      </div>
    </div>
  );
}

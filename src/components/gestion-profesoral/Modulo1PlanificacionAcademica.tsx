import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Calendar,
  Grid3x3,
  Table,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  FileText,
  Download,
  Settings
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { CalendarioAcademico } from './CalendarioAcademico';
import { PlanificacionList } from './PlanificacionList';
import { MatrizAsignaciones } from './MatrizAsignaciones';
import { DeteccionConflictos } from './DeteccionConflictos';
import { toast } from 'sonner@2.0.3';

interface Modulo1PlanificacionAcademicaProps {
  className?: string;
}

export function Modulo1PlanificacionAcademica({ className = '' }: Modulo1PlanificacionAcademicaProps) {
  const [activeSubTab, setActiveSubTab] = useState<string>('calendario');

  const handleExportar = () => {
    const csvContent = 'Modulo,Asignaturas,Docentes,Conflictos\nPlanificación Académica,165,87,8\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `planificacion_academica_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Datos de planificación exportados exitosamente');
  };

  const handleConfigurar = () => {
    toast.info('Configuración de Planificación Académica - Funcionalidad próximamente');
  };

  // Stats mock
  const stats = [
    {
      label: 'Asignaturas Programadas',
      value: '165',
      subtext: '2025-I',
      icon: FileText,
      color: 'bg-blue-500',
      trend: '+12'
    },
    {
      label: 'Docentes Asignados',
      value: '87',
      subtext: 'De 105 disponibles',
      icon: CheckCircle,
      color: 'bg-green-500',
      trend: null
    },
    {
      label: 'Conflictos Detectados',
      value: '8',
      subtext: 'Requieren acción',
      icon: AlertTriangle,
      color: 'bg-amber-500',
      trend: '-3'
    },
    {
      label: 'Días para Inicio',
      value: '15',
      subtext: '3 Feb 2025',
      icon: Clock,
      color: 'bg-purple-500',
      trend: null
    }
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-br from-[#003DA5] to-[#1e5da8] rounded-2xl p-4 md:p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
          <div className="flex items-start gap-3">
            <Calendar className="w-7 h-7 md:w-8 md:h-8 flex-shrink-0" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Planificación Académica</h1>
              <p className="text-xs md:text-sm opacity-90 mt-1">
                Gestión de periodos, oferta académica, horarios y asignación docente
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="secondary" 
              size="sm" 
              className="bg-white/10 hover:bg-white/20 text-white border-white/30 text-xs md:text-sm"
              onClick={handleExportar}
            >
              <Download className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
            <Button 
              variant="secondary" 
              size="sm" 
              className="bg-white/10 hover:bg-white/20 text-white border-white/30 text-xs md:text-sm"
              onClick={handleConfigurar}
            >
              <Settings className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Configurar</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-3 md:p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-600 mb-1 truncate">{stat.label}</p>
                    <div className="flex items-baseline gap-1 md:gap-2">
                      <p className="text-xl md:text-2xl font-bold text-gray-900">{stat.value}</p>
                      {stat.trend && (
                        <span className={`text-xs font-medium whitespace-nowrap ${
                          stat.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {stat.trend}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 truncate">{stat.subtext}</p>
                  </div>
                  <div className={`p-1.5 md:p-2 ${stat.color} rounded-lg flex-shrink-0 ml-2`}>
                    <Icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Sub-tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="calendario" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Calendario</span>
          </TabsTrigger>
          <TabsTrigger value="asignaturas" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Asignaturas</span>
          </TabsTrigger>
          <TabsTrigger value="matriz" className="flex items-center gap-2">
            <Grid3x3 className="w-4 h-4" />
            <span className="hidden sm:inline">Matriz</span>
          </TabsTrigger>
          <TabsTrigger value="conflictos" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="hidden sm:inline">Conflictos</span>
            {stats[2].value !== '0' && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                {stats[2].value}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendario" className="mt-6">
          <CalendarioAcademico />
        </TabsContent>

        <TabsContent value="asignaturas" className="mt-6">
          <PlanificacionList />
        </TabsContent>

        <TabsContent value="matriz" className="mt-6">
          <MatrizAsignaciones />
        </TabsContent>

        <TabsContent value="conflictos" className="mt-6">
          <DeteccionConflictos />
        </TabsContent>
      </Tabs>
    </div>
  );
}
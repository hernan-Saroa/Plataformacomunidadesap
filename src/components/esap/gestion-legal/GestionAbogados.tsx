/**
 * GESTIÓN DE ABOGADOS SUSTANCIADORES
 * Administración de abogados y visualización de carga de trabajo
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Users, Plus, Search, BarChart3, FileText, Clock, AlertTriangle,
  Mail, Phone, Building, Award, TrendingUp, CheckCircle
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Avatar, AvatarFallback } from '../../ui/avatar';

interface Abogado {
  id: string;
  nombre: string;
  cedula: string;
  email: string;
  telefono: string;
  especialidad: string;
  expedientesAsignados: number;
  expedientesCriticos: number;
  expedientesTerminados: number;
  tasaExito: number;
  antiguedad: string;
  estado: 'Activo' | 'Inactivo' | 'Vacaciones';
}

const ABOGADOS_MOCK: Abogado[] = [
  {
    id: '1',
    nombre: 'Dr. Carlos Mendoza',
    cedula: '79123456',
    email: 'carlos.mendoza@esap.edu.co',
    telefono: '3101234567',
    especialidad: 'Derecho Disciplinario',
    expedientesAsignados: 12,
    expedientesCriticos: 2,
    expedientesTerminados: 45,
    tasaExito: 78,
    antiguedad: '5 años',
    estado: 'Activo'
  },
  {
    id: '2',
    nombre: 'Dra. María Torres',
    cedula: '52987654',
    email: 'maria.torres@esap.edu.co',
    telefono: '3209876543',
    especialidad: 'Derecho Administrativo',
    expedientesAsignados: 15,
    expedientesCriticos: 3,
    expedientesTerminados: 38,
    tasaExito: 82,
    antiguedad: '3 años',
    estado: 'Activo'
  },
  {
    id: '3',
    nombre: 'Dr. Luis Ramírez',
    cedula: '11223344',
    email: 'luis.ramirez@esap.edu.co',
    telefono: '3151122334',
    especialidad: 'Derecho Disciplinario',
    expedientesAsignados: 10,
    expedientesCriticos: 1,
    expedientesTerminados: 52,
    tasaExito: 85,
    antiguedad: '7 años',
    estado: 'Activo'
  },
  {
    id: '4',
    nombre: 'Dra. Patricia González',
    cedula: '33445566',
    email: 'patricia.gonzalez@esap.edu.co',
    telefono: '3003344556',
    especialidad: 'Derecho Público',
    expedientesAsignados: 8,
    expedientesCriticos: 0,
    expedientesTerminados: 28,
    tasaExito: 75,
    antiguedad: '2 años',
    estado: 'Activo'
  },
  {
    id: '5',
    nombre: 'Dr. Andrés Castillo',
    cedula: '44556677',
    email: 'andres.castillo@esap.edu.co',
    telefono: '3124455667',
    especialidad: 'Derecho Disciplinario',
    expedientesAsignados: 0,
    expedientesCriticos: 0,
    expedientesTerminados: 15,
    tasaExito: 80,
    antiguedad: '1 año',
    estado: 'Vacaciones'
  }
];

export function GestionAbogados() {
  const [abogados] = useState<Abogado[]>(ABOGADOS_MOCK);
  const [busqueda, setBusqueda] = useState('');

  const abogadosFiltrados = abogados.filter(abogado =>
    abogado.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    abogado.email.toLowerCase().includes(busqueda.toLowerCase())
  );

  const totalExpedientes = abogados.reduce((sum, a) => sum + a.expedientesAsignados, 0);
  const totalCriticos = abogados.reduce((sum, a) => sum + a.expedientesCriticos, 0);
  const promedioTasaExito = Math.round(abogados.reduce((sum, a) => sum + a.tasaExito, 0) / abogados.length);
  const abogadosActivos = abogados.filter(a => a.estado === 'Activo').length;

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'Activo':
        return { bg: '#D1FAE5', color: '#065F46' };
      case 'Vacaciones':
        return { bg: '#FEF3C7', color: '#92400E' };
      default:
        return { bg: '#F3F4F6', color: '#6B7280' };
    }
  };

  const getCargaColor = (expedientes: number) => {
    if (expedientes > 12) return '#DC2626';
    if (expedientes > 8) return '#F59E0B';
    return '#10B981';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold mb-2" style={{ color: '#6F42C1' }}>
            Abogados Sustanciadores
          </h2>
          <p className="text-sm" style={{ color: '#6B7280' }}>
            Gestión de profesionales y distribución de carga de trabajo
          </p>
        </div>
      </div>

      {/* Métricas Generales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5 border-2 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-xl" style={{ background: '#F3E8FF' }}>
              <Users className="w-6 h-6" style={{ color: '#6F42C1' }} />
            </div>
            <Badge style={{ background: '#D1FAE5', color: '#065F46' }}>
              Activos
            </Badge>
          </div>
          <p className="text-3xl font-black mb-1" style={{ color: '#1F2937' }}>
            {abogadosActivos}
          </p>
          <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
            Abogados Activos
          </p>
        </Card>

        <Card className="p-5 border-2 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-xl" style={{ background: '#E0F2FE' }}>
              <FileText className="w-6 h-6" style={{ color: '#0284C7' }} />
            </div>
          </div>
          <p className="text-3xl font-black mb-1" style={{ color: '#1F2937' }}>
            {totalExpedientes}
          </p>
          <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
            Expedientes Asignados
          </p>
        </Card>

        <Card className="p-5 border-2 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-xl" style={{ background: '#FEE2E2' }}>
              <AlertTriangle className="w-6 h-6" style={{ color: '#DC2626' }} />
            </div>
            <Badge style={{ background: '#FEE2E2', color: '#991B1B' }}>
              Urgente
            </Badge>
          </div>
          <p className="text-3xl font-black mb-1" style={{ color: '#1F2937' }}>
            {totalCriticos}
          </p>
          <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
            Expedientes Críticos
          </p>
        </Card>

        <Card className="p-5 border-2 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-xl" style={{ background: '#D1FAE5' }}>
              <TrendingUp className="w-6 h-6" style={{ color: '#10B981' }} />
            </div>
          </div>
          <p className="text-3xl font-black mb-1" style={{ color: '#1F2937' }}>
            {promedioTasaExito}%
          </p>
          <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
            Tasa de Éxito Promedio
          </p>
        </Card>
      </div>

      {/* Barra de Búsqueda */}
      <Card className="p-4 border-2">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#9CA3AF' }} />
            <Input
              placeholder="Buscar por nombre o email..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10 border-2"
              style={{ borderColor: '#E5E7EB' }}
            />
          </div>
          <Button variant="outline" className="border-2">
            <BarChart3 className="w-4 h-4 mr-2" />
            Reporte de Carga
          </Button>
        </div>
      </Card>

      {/* Grid de Abogados */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {abogadosFiltrados.map((abogado, index) => {
          const estadoStyle = getEstadoColor(abogado.estado);
          const cargaColor = getCargaColor(abogado.expedientesAsignados);

          return (
            <motion.div
              key={abogado.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="p-5 border-2 hover:shadow-lg transition-all cursor-pointer">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback style={{ background: '#F3E8FF', color: '#6F42C1' }}>
                        {abogado.nombre.split(' ').slice(0, 2).map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold" style={{ color: '#1F2937' }}>
                        {abogado.nombre}
                      </p>
                      <p className="text-xs" style={{ color: '#9CA3AF' }}>
                        {abogado.especialidad}
                      </p>
                    </div>
                  </div>
                  <Badge
                    className="text-xs"
                    style={{ background: estadoStyle.bg, color: estadoStyle.color }}
                  >
                    {abogado.estado}
                  </Badge>
                </div>

                {/* Contacto */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm" style={{ color: '#6B7280' }}>
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{abogado.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm" style={{ color: '#6B7280' }}>
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span>{abogado.telefono}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm" style={{ color: '#6B7280' }}>
                    <Award className="w-4 h-4 flex-shrink-0" />
                    <span>Antigüedad: {abogado.antiguedad}</span>
                  </div>
                </div>

                {/* Estadísticas */}
                <div className="space-y-3 pt-3 border-t-2" style={{ borderColor: '#E5E7EB' }}>
                  {/* Carga de Trabajo */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold" style={{ color: '#9CA3AF' }}>
                        CARGA DE TRABAJO
                      </span>
                      <span className="text-xs font-bold" style={{ color: cargaColor }}>
                        {abogado.expedientesAsignados} expedientes
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min((abogado.expedientesAsignados / 15) * 100, 100)}%`,
                          background: cargaColor
                        }}
                      />
                    </div>
                  </div>

                  {/* Métricas */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 rounded-lg" style={{ background: '#FEE2E2' }}>
                      <p className="text-lg font-black" style={{ color: '#DC2626' }}>
                        {abogado.expedientesCriticos}
                      </p>
                      <p className="text-xs" style={{ color: '#991B1B' }}>
                        Críticos
                      </p>
                    </div>
                    <div className="text-center p-2 rounded-lg" style={{ background: '#D1FAE5' }}>
                      <p className="text-lg font-black" style={{ color: '#10B981' }}>
                        {abogado.expedientesTerminados}
                      </p>
                      <p className="text-xs" style={{ color: '#065F46' }}>
                        Finalizados
                      </p>
                    </div>
                    <div className="text-center p-2 rounded-lg" style={{ background: '#E0F2FE' }}>
                      <p className="text-lg font-black" style={{ color: '#0284C7' }}>
                        {abogado.tasaExito}%
                      </p>
                      <p className="text-xs" style={{ color: '#075985' }}>
                        Éxito
                      </p>
                    </div>
                  </div>
                </div>

                {/* Acción */}
                <Button
                  variant="outline"
                  className="w-full mt-4 border-2"
                  style={{ borderColor: '#E5E7EB' }}
                >
                  Ver Expedientes Asignados
                </Button>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Gráfico de Distribución */}
      <Card className="p-6 border-2">
        <h3 className="font-bold text-lg mb-4" style={{ color: '#1F2937' }}>
          Distribución de Carga de Trabajo
        </h3>
        <div className="space-y-3">
          {abogadosFiltrados.map((abogado) => {
            const porcentaje = (abogado.expedientesAsignados / totalExpedientes) * 100;
            const color = getCargaColor(abogado.expedientesAsignados);

            return (
              <div key={abogado.id}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback style={{ background: '#F3E8FF', color: '#6F42C1', fontSize: '10px' }}>
                        {abogado.nombre.split(' ').slice(0, 2).map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium" style={{ color: '#4B5563' }}>
                      {abogado.nombre}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold" style={{ color }}>
                      {abogado.expedientesAsignados}
                    </span>
                    <span className="text-xs" style={{ color: '#9CA3AF' }}>
                      ({porcentaje.toFixed(0)}%)
                    </span>
                  </div>
                </div>
                <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${porcentaje}%` }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="h-full rounded-full"
                    style={{ background: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
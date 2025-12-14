import { useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, CheckCircle, Clock, Users, Calendar, XCircle } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface DeteccionConflictosProps {
  className?: string;
}

interface Conflicto {
  id: string;
  tipo: 'Cruce Horario' | 'Sobrecarga' | 'Disponibilidad' | 'Recurso';
  gravedad: 'Crítico' | 'Alto' | 'Medio' | 'Bajo';
  descripcion: string;
  docente?: string;
  asignatura?: string;
  fecha_deteccion: string;
  estado: 'Pendiente' | 'En Proceso' | 'Resuelto';
}

export function DeteccionConflictos({ className = '' }: DeteccionConflictosProps) {
  const [filtroGravedad, setFiltroGravedad] = useState('todos');

  const conflictos: Conflicto[] = [
    {
      id: '1',
      tipo: 'Cruce Horario',
      gravedad: 'Crítico',
      descripcion: 'Juan Torres tiene asignadas dos clases simultáneas: Lunes 08:00-10:00',
      docente: 'Juan Torres Ramírez',
      asignatura: 'Teoría Política / Historia Política',
      fecha_deteccion: '2025-02-18',
      estado: 'Pendiente'
    },
    {
      id: '2',
      tipo: 'Sobrecarga',
      gravedad: 'Alto',
      descripcion: 'María López tiene asignadas 44 horas semanales, excede el límite de 40h',
      docente: 'María López Gómez',
      fecha_deteccion: '2025-02-17',
      estado: 'En Proceso'
    },
    {
      id: '3',
      tipo: 'Disponibilidad',
      gravedad: 'Medio',
      descripcion: 'Carlos Ruiz marcó no disponible Viernes 14:00-16:00 pero tiene clase asignada',
      docente: 'Carlos Ruiz Pérez',
      asignatura: 'Gestión Pública',
      fecha_deteccion: '2025-02-16',
      estado: 'Resuelto'
    }
  ];

  const getGravedadColor = (gravedad: Conflicto['gravedad']) => {
    switch (gravedad) {
      case 'Crítico': return 'bg-red-100 text-red-700 border-red-200';
      case 'Alto': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Medio': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Bajo': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  const getEstadoColor = (estado: Conflicto['estado']) => {
    switch (estado) {
      case 'Pendiente': return 'bg-red-100 text-red-700';
      case 'En Proceso': return 'bg-blue-100 text-blue-700';
      case 'Resuelto': return 'bg-green-100 text-green-700';
    }
  };

  const conflictosFiltrados = filtroGravedad === 'todos' 
    ? conflictos 
    : conflictos.filter(c => c.gravedad === filtroGravedad);

  const stats = {
    total: conflictos.length,
    criticos: conflictos.filter(c => c.gravedad === 'Crítico').length,
    pendientes: conflictos.filter(c => c.estado === 'Pendiente').length,
    resueltos: conflictos.filter(c => c.estado === 'Resuelto').length
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Detección de Conflictos</h1>
          <p className="text-gray-600 mt-1">Sistema automático de detección</p>
        </div>
        <Button size="sm" className="bg-[#1e5da8]">Ejecutar Análisis</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <AlertTriangle className="w-8 h-8 text-gray-400" />
            <span className="text-2xl font-bold">{stats.total}</span>
          </div>
          <p className="text-sm text-gray-600 mt-1">Total Conflictos</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <XCircle className="w-8 h-8 text-red-400" />
            <span className="text-2xl font-bold text-red-600">{stats.criticos}</span>
          </div>
          <p className="text-sm text-gray-600 mt-1">Críticos</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <Clock className="w-8 h-8 text-amber-400" />
            <span className="text-2xl font-bold text-amber-600">{stats.pendientes}</span>
          </div>
          <p className="text-sm text-gray-600 mt-1">Pendientes</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <CheckCircle className="w-8 h-8 text-green-400" />
            <span className="text-2xl font-bold text-green-600">{stats.resueltos}</span>
          </div>
          <p className="text-sm text-gray-600 mt-1">Resueltos</p>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        {['todos', 'Crítico', 'Alto', 'Medio', 'Bajo'].map((gravedad) => (
          <button
            key={gravedad}
            onClick={() => setFiltroGravedad(gravedad)}
            className={`px-3 py-1 rounded-lg text-sm font-medium ${
              filtroGravedad === gravedad ? 'bg-[#1e5da8] text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {gravedad}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {conflictosFiltrados.map((conflicto, index) => (
          <motion.div
            key={conflicto.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getGravedadColor(conflicto.gravedad)}>{conflicto.gravedad}</Badge>
                    <Badge variant="secondary">{conflicto.tipo}</Badge>
                    <Badge className={getEstadoColor(conflicto.estado)}>{conflicto.estado}</Badge>
                  </div>
                  <p className="font-medium text-gray-900 mb-2">{conflicto.descripcion}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    {conflicto.docente && (
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{conflicto.docente}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{conflicto.fecha_deteccion}</span>
                    </div>
                  </div>
                </div>
                {conflicto.estado === 'Pendiente' && (
                  <Button size="sm">Resolver</Button>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

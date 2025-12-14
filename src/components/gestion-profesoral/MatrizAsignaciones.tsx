import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Calendar,
  Users,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  Plus,
  Search,
  Filter,
  Download,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { AsignaturaFormModal } from './AsignaturaFormModal';

interface MatrizAsignacionesProps {
  className?: string;
}

interface Asignacion {
  id: string;
  docente_id: string;
  docente_nombre: string;
  asignatura: string;
  codigo_asignatura: string;
  programa: string;
  horario: string;
  aula: string;
  cupos: number;
  inscritos: number;
  territorial: string;
  tipo: 'Teoría' | 'Práctica' | 'Laboratorio';
  estado: 'Asignado' | 'Pendiente' | 'Conflicto';
}

interface Docente {
  id: string;
  nombre: string;
  foto_url?: string;
  horas_asignadas: number;
  horas_disponibles: number;
  territorial: string;
}

export function MatrizAsignaciones({ className = '' }: MatrizAsignacionesProps) {
  const [vistaActual, setVistaActual] = useState<'semanal' | 'docentes' | 'asignaturas'>('semanal');
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroTerritorial, setFiltroTerritorial] = useState('todas');
  const [selectedDocente, setSelectedDocente] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Mock data de asignaciones
  const asignaciones: Asignacion[] = [
    {
      id: '1',
      docente_id: '1',
      docente_nombre: 'María López Gómez',
      asignatura: 'Derecho Administrativo I',
      codigo_asignatura: 'DER-301',
      programa: 'Derecho Público',
      horario: 'Lun-Mie 08:00-10:00',
      aula: 'A-301',
      cupos: 40,
      inscritos: 38,
      territorial: 'Bogotá',
      tipo: 'Teoría',
      estado: 'Asignado'
    },
    {
      id: '2',
      docente_id: '1',
      docente_nombre: 'María López Gómez',
      asignatura: 'Procedimiento Administrativo',
      codigo_asignatura: 'DER-405',
      programa: 'Derecho Público',
      horario: 'Mar-Jue 14:00-16:00',
      aula: 'B-205',
      cupos: 35,
      inscritos: 32,
      territorial: 'Bogotá',
      tipo: 'Teoría',
      estado: 'Asignado'
    },
    {
      id: '3',
      docente_id: '2',
      docente_nombre: 'Carlos Ruiz Pérez',
      asignatura: 'Gestión Pública',
      codigo_asignatura: 'ADM-201',
      programa: 'Administración Pública',
      horario: 'Lun-Mie 10:00-12:00',
      aula: 'C-102',
      cupos: 45,
      inscritos: 45,
      territorial: 'Medellín',
      tipo: 'Teoría',
      estado: 'Asignado'
    },
    {
      id: '4',
      docente_id: '2',
      docente_nombre: 'Carlos Ruiz Pérez',
      asignatura: 'Políticas Públicas',
      codigo_asignatura: 'ADM-302',
      programa: 'Administración Pública',
      horario: 'Mar-Jue 08:00-10:00',
      aula: 'C-104',
      cupos: 40,
      inscritos: 35,
      territorial: 'Medellín',
      tipo: 'Teoría',
      estado: 'Asignado'
    },
    {
      id: '5',
      docente_id: '3',
      docente_nombre: 'Ana Martínez Silva',
      asignatura: 'Economía Colombiana',
      codigo_asignatura: 'ECO-101',
      programa: 'Economía',
      horario: 'Vie 08:00-12:00',
      aula: 'D-201',
      cupos: 50,
      inscritos: 48,
      territorial: 'Cali',
      tipo: 'Teoría',
      estado: 'Asignado'
    },
    {
      id: '6',
      docente_id: '',
      docente_nombre: '',
      asignatura: 'Estadística Aplicada',
      codigo_asignatura: 'ECO-203',
      programa: 'Economía',
      horario: 'Lun-Mie 14:00-16:00',
      aula: 'D-205',
      cupos: 30,
      inscritos: 0,
      territorial: 'Cali',
      tipo: 'Práctica',
      estado: 'Pendiente'
    },
    {
      id: '7',
      docente_id: '4',
      docente_nombre: 'Juan Torres Ramírez',
      asignatura: 'Teoría Política',
      codigo_asignatura: 'POL-101',
      programa: 'Ciencias Políticas',
      horario: 'Lun-Mie 08:00-10:00',
      aula: 'E-301',
      cupos: 35,
      inscritos: 30,
      territorial: 'Barranquilla',
      tipo: 'Teoría',
      estado: 'Conflicto'
    }
  ];

  // Mock data de docentes
  const docentes: Docente[] = [
    {
      id: '1',
      nombre: 'María López Gómez',
      horas_asignadas: 16,
      horas_disponibles: 24,
      territorial: 'Bogotá'
    },
    {
      id: '2',
      nombre: 'Carlos Ruiz Pérez',
      horas_asignadas: 16,
      horas_disponibles: 24,
      territorial: 'Medellín'
    },
    {
      id: '3',
      nombre: 'Ana Martínez Silva',
      horas_asignadas: 4,
      horas_disponibles: 36,
      territorial: 'Cali'
    },
    {
      id: '4',
      nombre: 'Juan Torres Ramírez',
      horas_asignadas: 8,
      horas_disponibles: 32,
      territorial: 'Barranquilla'
    },
    {
      id: '5',
      nombre: 'Laura García Castro',
      horas_asignadas: 0,
      horas_disponibles: 40,
      territorial: 'Bogotá'
    }
  ];

  // Horarios de la semana
  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  const horariosBloque = [
    '06:00-08:00',
    '08:00-10:00',
    '10:00-12:00',
    '12:00-14:00',
    '14:00-16:00',
    '16:00-18:00',
    '18:00-20:00'
  ];

  const getEstadoColor = (estado: Asignacion['estado']) => {
    switch (estado) {
      case 'Asignado':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'Pendiente':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Conflicto':
        return 'bg-red-100 text-red-700 border-red-200';
    }
  };

  const getTipoColor = (tipo: Asignacion['tipo']) => {
    switch (tipo) {
      case 'Teoría':
        return 'bg-blue-500';
      case 'Práctica':
        return 'bg-purple-500';
      case 'Laboratorio':
        return 'bg-green-500';
    }
  };

  const getInitials = (nombre: string) => {
    const parts = nombre.split(' ');
    return `${parts[0]?.charAt(0) || ''}${parts[1]?.charAt(0) || ''}`.toUpperCase();
  };

  const getOcupacionColor = (porcentaje: number) => {
    if (porcentaje >= 90) return 'text-red-600';
    if (porcentaje >= 70) return 'text-amber-600';
    return 'text-green-600';
  };

  // Estadísticas
  const stats = {
    total_asignaciones: asignaciones.length,
    asignadas: asignaciones.filter(a => a.estado === 'Asignado').length,
    pendientes: asignaciones.filter(a => a.estado === 'Pendiente').length,
    conflictos: asignaciones.filter(a => a.estado === 'Conflicto').length,
    docentes_activos: docentes.filter(d => d.horas_asignadas > 0).length
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Matriz de Asignaciones
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gestión de asignación docente por asignatura
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button size="sm" className="bg-[#1e5da8] hover:bg-[#1a4d8f]" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Asignación
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total_asignaciones}</p>
            </div>
            <BookOpen className="w-8 h-8 text-gray-400" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Asignadas</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.asignadas}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pendientes</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pendientes}</p>
            </div>
            <Clock className="w-8 h-8 text-amber-400" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Conflictos</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{stats.conflictos}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Docentes</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{stats.docentes_activos}</p>
            </div>
            <Users className="w-8 h-8 text-blue-400" />
          </div>
        </Card>
      </div>

      {/* Filters and View Toggle */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar docente o asignatura..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <select
            value={filtroTerritorial}
            onChange={(e) => setFiltroTerritorial(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="todas">Todas las territoriales</option>
            <option value="Bogotá">Bogotá</option>
            <option value="Medellín">Medellín</option>
            <option value="Cali">Cali</option>
            <option value="Barranquilla">Barranquilla</option>
          </select>

          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setVistaActual('semanal')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                vistaActual === 'semanal'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Semanal
            </button>
            <button
              onClick={() => setVistaActual('docentes')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                vistaActual === 'docentes'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Por Docente
            </button>
            <button
              onClick={() => setVistaActual('asignaturas')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                vistaActual === 'asignaturas'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Por Asignatura
            </button>
          </div>
        </div>
      </Card>

      {/* Vista Semanal */}
      {vistaActual === 'semanal' && (
        <Card className="p-6 overflow-x-auto">
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700">
                <strong>Nota:</strong> Arrastra las asignaturas para reasignar horarios. Los conflictos se resaltan en rojo.
              </p>
            </div>
          </div>

          <div className="min-w-[800px]">
            {/* Header de días */}
            <div className="grid grid-cols-6 gap-2 mb-2">
              <div className="p-2 text-sm font-medium text-gray-600">Horario</div>
              {diasSemana.map((dia) => (
                <div key={dia} className="p-2 text-sm font-bold text-center text-gray-900 bg-gray-100 rounded-lg">
                  {dia}
                </div>
              ))}
            </div>

            {/* Grid de horarios */}
            <div className="space-y-2">
              {horariosBloque.map((horario) => (
                <div key={horario} className="grid grid-cols-6 gap-2">
                  <div className="p-3 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg flex items-center">
                    {horario}
                  </div>
                  {diasSemana.map((dia) => {
                    // Buscar asignaciones para este horario y día
                    const asignacion = asignaciones.find(a => {
                      const horarioMatch = a.horario.includes(horario.split('-')[0]);
                      const diaMatch = a.horario.includes(dia.substring(0, 3));
                      return horarioMatch && diaMatch;
                    });

                    return (
                      <div
                        key={`${dia}-${horario}`}
                        className={`p-2 min-h-[80px] border-2 border-dashed rounded-lg transition-colors ${
                          asignacion
                            ? asignacion.estado === 'Conflicto'
                              ? 'border-red-300 bg-red-50'
                              : 'border-gray-200 bg-white'
                            : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                        }`}
                      >
                        {asignacion && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={`p-2 rounded-md cursor-move ${getTipoColor(asignacion.tipo)} text-white text-xs`}
                          >
                            <p className="font-bold truncate">{asignacion.codigo_asignatura}</p>
                            <p className="truncate opacity-90">{asignacion.asignatura}</p>
                            <p className="mt-1 truncate opacity-80">{asignacion.docente_nombre}</p>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs opacity-80">{asignacion.aula}</span>
                              {asignacion.estado === 'Conflicto' && (
                                <AlertTriangle className="w-3 h-3" />
                              )}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Vista Por Docente */}
      {vistaActual === 'docentes' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {docentes.map((docente) => {
            const asignacionesDocente = asignaciones.filter(a => a.docente_id === docente.id);
            const porcentajeOcupacion = (docente.horas_asignadas / 40) * 100;

            return (
              <motion.div
                key={docente.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-4 mb-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={docente.foto_url} />
                      <AvatarFallback className="bg-[#1e5da8] text-white">
                        {getInitials(docente.nombre)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">{docente.nombre}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <MapPin className="w-3 h-3 text-gray-600" />
                        <span className="text-sm text-gray-600">{docente.territorial}</span>
                      </div>
                    </div>
                  </div>

                  {/* Ocupación */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Ocupación</span>
                      <span className={`text-sm font-bold ${getOcupacionColor(porcentajeOcupacion)}`}>
                        {docente.horas_asignadas}h / 40h
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          porcentajeOcupacion >= 90
                            ? 'bg-red-500'
                            : porcentajeOcupacion >= 70
                            ? 'bg-amber-500'
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${porcentajeOcupacion}%` }}
                      />
                    </div>
                  </div>

                  {/* Asignaciones */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      Asignaciones ({asignacionesDocente.length})
                    </h4>
                    {asignacionesDocente.length === 0 ? (
                      <p className="text-sm text-gray-600 text-center py-4">
                        Sin asignaciones
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {asignacionesDocente.map((asignacion) => (
                          <div
                            key={asignacion.id}
                            className="p-3 bg-gray-50 rounded-lg text-sm"
                          >
                            <div className="flex items-start justify-between mb-1">
                              <p className="font-medium text-gray-900">{asignacion.codigo_asignatura}</p>
                              <Badge className={getEstadoColor(asignacion.estado)}>
                                {asignacion.estado}
                              </Badge>
                            </div>
                            <p className="text-gray-600 mb-1">{asignacion.asignatura}</p>
                            <div className="flex items-center gap-3 text-xs text-gray-600">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{asignacion.horario}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                <span>{asignacion.aula}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Vista Por Asignatura */}
      {vistaActual === 'asignaturas' && (
        <div className="space-y-3">
          {asignaciones.map((asignacion, index) => (
            <motion.div
              key={asignacion.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-6">
                  <div className={`w-1 h-full rounded-full ${getTipoColor(asignacion.tipo)}`} />
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900">{asignacion.asignatura}</h3>
                          <Badge variant="secondary">{asignacion.codigo_asignatura}</Badge>
                          <Badge className={getEstadoColor(asignacion.estado)}>
                            {asignacion.estado}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{asignacion.programa}</p>
                      </div>
                      
                      <Badge className={`${getTipoColor(asignacion.tipo)} text-white`}>
                        {asignacion.tipo}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="w-4 h-4" />
                        <span>{asignacion.docente_nombre || 'Sin asignar'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{asignacion.horario}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{asignacion.aula}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <BookOpen className="w-4 h-4" />
                        <span>{asignacion.inscritos} / {asignacion.cupos} estudiantes</span>
                      </div>
                    </div>

                    {asignacion.estado === 'Pendiente' && (
                      <Button size="sm" className="bg-[#1e5da8] hover:bg-[#1a4d8f]">
                        <Plus className="w-4 h-4 mr-1" />
                        Asignar Docente
                      </Button>
                    )}

                    {asignacion.estado === 'Conflicto' && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-red-700 text-sm">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="font-medium">Conflicto detectado:</span>
                          <span>Cruce de horario con otra asignación del docente</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal para nueva asignatura */}
      <AsignaturaFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(data) => {
          console.log('Asignatura creada:', data);
          setIsModalOpen(false);
        }}
      />
    </div>
  );
}
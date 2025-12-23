/**
 * DASHBOARD DE PTAS
 * 
 * Panel principal con métricas, estadísticas y gestión de PTAs
 * Adaptado según el rol del usuario (Docente, Director, Programación)
 * 
 * Fecha: 23 de diciembre de 2024
 */

import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Send,
  AlertCircle,
  TrendingUp,
  Users,
  Calendar,
  Filter,
  Search,
  Download,
  Plus,
  Eye,
  Edit,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  History
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { PTAFormModal } from './PTAFormModal';
import { PTARevisionModal } from './PTARevisionModal';
import { PTADetallesModal } from './PTADetallesModal';
import { toast } from 'sonner@2.0.3';

interface PTADashboardProps {
  rol: 'docente' | 'director' | 'programacion' | 'admin';
  usuarioActual?: any;
}

// Mock data - En producción vendría de la base de datos
const mockPTAs = [
  {
    id: 'pta-001',
    codigo: 'PTA-2025-1-001',
    docente_id: 'doc-001',
    docente_nombre: 'Juan Pérez García',
    docente_cedula: '123456789',
    territorial: 'Antioquia',
    periodo: '2025-1',
    estado: 'APROBADO_FINAL',
    fecha_creacion: '2024-12-01T10:00:00Z',
    fecha_envio_aprobacion: '2024-12-05T15:30:00Z',
    fecha_aprobacion_final: '2024-12-15T11:20:00Z',
    horas_programables: 360,
    horas_totales: 354,
    componenteDocencia: { horas: 192, porcentaje: 53.3, actividades: [{ nombreAsignatura: 'Teoría del Estado' }] },
    componenteInvestigacion: { horas: 80, porcentaje: 22.2, actividades: [] },
    componenteExtension: { horas: 40, porcentaje: 11.1, actividades: [] },
    componenteComplementarias: { horas: 42, porcentaje: 11.7, actividades: [] },
    componenteAdministrativas: { horas: 0, porcentaje: 0, actividades: [] }
  },
  {
    id: 'pta-002',
    codigo: 'PTA-2025-1-002',
    docente_id: 'doc-002',
    docente_nombre: 'María López Rodríguez',
    docente_cedula: '987654321',
    territorial: 'Bogotá',
    periodo: '2025-1',
    estado: 'EN_APROBACION',
    fecha_creacion: '2024-12-10T09:00:00Z',
    fecha_envio_aprobacion: '2024-12-15T14:00:00Z',
    horas_programables: 360,
    horas_totales: 360,
    componenteDocencia: { horas: 200, porcentaje: 55.5, actividades: [] },
    componenteInvestigacion: { horas: 100, porcentaje: 27.8, actividades: [] },
    componenteExtension: { horas: 60, porcentaje: 16.7, actividades: [] },
    componenteComplementarias: { horas: 0, porcentaje: 0, actividades: [] },
    componenteAdministrativas: { horas: 0, porcentaje: 0, actividades: [] }
  },
  {
    id: 'pta-003',
    codigo: 'PTA-2025-1-003',
    docente_id: 'doc-003',
    docente_nombre: 'Carlos Gómez Sánchez',
    docente_cedula: '456789123',
    territorial: 'Valle',
    periodo: '2025-1',
    estado: 'CONSTRUCCION',
    fecha_creacion: '2024-12-18T08:30:00Z',
    horas_programables: 360,
    horas_totales: 250,
    componenteDocencia: { horas: 150, porcentaje: 60, actividades: [] },
    componenteInvestigacion: { horas: 100, porcentaje: 40, actividades: [] },
    componenteExtension: { horas: 0, porcentaje: 0, actividades: [] },
    componenteComplementarias: { horas: 0, porcentaje: 0, actividades: [] },
    componenteAdministrativas: { horas: 0, porcentaje: 0, actividades: [] }
  },
  {
    id: 'pta-004',
    codigo: 'PTA-2025-1-004',
    docente_id: 'doc-004',
    docente_nombre: 'Ana Martínez Torres',
    docente_cedula: '789123456',
    territorial: 'Antioquia',
    periodo: '2025-1',
    estado: 'APROBADO_DIRECTOR',
    fecha_creacion: '2024-12-08T11:00:00Z',
    fecha_envio_aprobacion: '2024-12-12T16:00:00Z',
    fecha_aprobacion_director: '2024-12-20T10:00:00Z',
    horas_programables: 360,
    horas_totales: 345,
    componenteDocencia: { horas: 180, porcentaje: 52.2, actividades: [] },
    componenteInvestigacion: { horas: 90, porcentaje: 26.1, actividades: [] },
    componenteExtension: { horas: 45, porcentaje: 13, actividades: [] },
    componenteComplementarias: { horas: 30, porcentaje: 8.7, actividades: [] },
    componenteAdministrativas: { horas: 0, porcentaje: 0, actividades: [] }
  }
];

export function PTADashboard({ rol, usuarioActual }: PTADashboardProps) {
  
  const [ptas, setPtas] = useState(mockPTAs);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroTerritorial, setFiltroTerritorial] = useState<string>('todos');
  const [modalCrear, setModalCrear] = useState(false);
  const [modalRevision, setModalRevision] = useState(false);
  const [modalDetalles, setModalDetalles] = useState(false);
  const [ptaSeleccionado, setPtaSeleccionado] = useState<any>(null);
  const [modoRevision, setModoRevision] = useState<'visualizacion' | 'aprobacion'>('visualizacion');
  
  // Filtrar PTAs según rol
  const ptasFiltrados = useMemo(() => {
    let filtrados = ptas;
    
    // Filtrar por rol
    if (rol === 'docente' && usuarioActual) {
      filtrados = filtrados.filter(pta => pta.docente_id === usuarioActual.id);
    } else if (rol === 'director' && usuarioActual) {
      // Director solo ve PTAs de su territorial en estado EN_APROBACION
      filtrados = filtrados.filter(
        pta => pta.territorial === usuarioActual.territorial && 
               pta.estado === 'EN_APROBACION'
      );
    } else if (rol === 'programacion') {
      // Programación solo ve PTAs aprobados por director
      filtrados = filtrados.filter(pta => pta.estado === 'APROBADO_DIRECTOR');
    }
    
    // Filtrar por búsqueda
    if (busqueda) {
      filtrados = filtrados.filter(pta =>
        pta.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
        pta.docente_nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        pta.docente_cedula.includes(busqueda)
      );
    }
    
    // Filtrar por estado
    if (filtroEstado !== 'todos') {
      filtrados = filtrados.filter(pta => pta.estado === filtroEstado);
    }
    
    // Filtrar por territorial
    if (filtroTerritorial !== 'todos') {
      filtrados = filtrados.filter(pta => pta.territorial === filtroTerritorial);
    }
    
    return filtrados;
  }, [ptas, busqueda, filtroEstado, filtroTerritorial, rol, usuarioActual]);
  
  // Calcular métricas
  const metricas = useMemo(() => {
    const total = ptasFiltrados.length;
    const enConstruccion = ptasFiltrados.filter(p => p.estado === 'CONSTRUCCION').length;
    const enAprobacion = ptasFiltrados.filter(p => p.estado === 'EN_APROBACION').length;
    const aprobados = ptasFiltrados.filter(p => p.estado === 'APROBADO_FINAL').length;
    const rechazados = ptasFiltrados.filter(p => p.estado.includes('RECHAZADO')).length;
    const aprobadosDirector = ptasFiltrados.filter(p => p.estado === 'APROBADO_DIRECTOR').length;
    
    return {
      total,
      enConstruccion,
      enAprobacion,
      aprobados,
      rechazados,
      aprobadosDirector,
      tasaAprobacion: total > 0 ? ((aprobados / total) * 100).toFixed(1) : '0'
    };
  }, [ptasFiltrados]);
  
  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'CONSTRUCCION':
        return <Badge className="bg-gray-600">En Construcción</Badge>;
      case 'EN_APROBACION':
        return <Badge className="bg-blue-600">En Aprobación</Badge>;
      case 'APROBADO_DIRECTOR':
        return <Badge className="bg-purple-600">Aprobado Director</Badge>;
      case 'APROBADO_PROGRAMACION':
        return <Badge className="bg-green-600">Aprobado Programación</Badge>;
      case 'APROBADO_FINAL':
        return <Badge className="bg-green-600">Aprobado Final</Badge>;
      case 'RECHAZADO_DIRECTOR':
        return <Badge className="bg-red-600">Rechazado Director</Badge>;
      case 'RECHAZADO_PROGRAMACION':
        return <Badge className="bg-red-600">Rechazado Programación</Badge>;
      default:
        return <Badge>{estado}</Badge>;
    }
  };
  
  const handleVerDetalles = (pta: any) => {
    setPtaSeleccionado(pta);
    setModalDetalles(true);
  };
  
  const handleRevisar = (pta: any) => {
    setPtaSeleccionado(pta);
    setModoRevision('aprobacion');
    setModalRevision(true);
  };
  
  const handleEditar = (pta: any) => {
    setPtaSeleccionado(pta);
    setModalCrear(true);
  };
  
  const handleEliminar = (pta: any) => {
    if (confirm(`¿Está seguro de eliminar el PTA ${pta.codigo}?`)) {
      setPtas(ptas.filter(p => p.id !== pta.id));
      toast.success('PTA eliminado exitosamente');
    }
  };
  
  const handleEnviarAprobacion = (pta: any) => {
    if (confirm(`¿Desea enviar el PTA ${pta.codigo} a aprobación?`)) {
      setPtas(ptas.map(p => 
        p.id === pta.id 
          ? { ...p, estado: 'EN_APROBACION', fecha_envio_aprobacion: new Date().toISOString() }
          : p
      ));
      toast.success('PTA enviado a aprobación exitosamente');
    }
  };
  
  const handleAprobar = (ptaId: string, observaciones: string) => {
    setPtas(ptas.map(p => {
      if (p.id === ptaId) {
        if (rol === 'director') {
          return {
            ...p,
            estado: 'APROBADO_DIRECTOR',
            fecha_aprobacion_director: new Date().toISOString(),
            aprobado_por_director: usuarioActual?.nombre || 'Director',
            observaciones_director: observaciones
          };
        } else if (rol === 'programacion') {
          return {
            ...p,
            estado: 'APROBADO_FINAL',
            fecha_aprobacion_programacion: new Date().toISOString(),
            fecha_aprobacion_final: new Date().toISOString(),
            aprobado_por_programacion: usuarioActual?.nombre || 'Coordinador',
            observaciones_programacion: observaciones
          };
        }
      }
      return p;
    }));
    setModalRevision(false);
  };
  
  const handleRechazar = (ptaId: string, motivo: string, observaciones: string) => {
    setPtas(ptas.map(p => {
      if (p.id === ptaId) {
        if (rol === 'director') {
          return {
            ...p,
            estado: 'CONSTRUCCION',
            fecha_rechazo_director: new Date().toISOString(),
            rechazado_por_director: usuarioActual?.nombre || 'Director',
            motivo_rechazo_director: motivo,
            observaciones_director: observaciones
          };
        } else if (rol === 'programacion') {
          return {
            ...p,
            estado: 'CONSTRUCCION',
            fecha_rechazo_programacion: new Date().toISOString(),
            rechazado_por_programacion: usuarioActual?.nombre || 'Coordinador',
            motivo_rechazo_programacion: motivo,
            observaciones_programacion: observaciones
          };
        }
      }
      return p;
    }));
    setModalRevision(false);
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {rol === 'docente' && 'Mis Planes de Trabajo Académico'}
            {rol === 'director' && 'PTAs Pendientes de Aprobación'}
            {rol === 'programacion' && 'PTAs para Aprobación Final'}
            {rol === 'admin' && 'Gestión de PTAs'}
          </h1>
          <p className="text-gray-600 mt-1">
            {rol === 'docente' && 'Crea y gestiona tus PTAs del período académico'}
            {rol === 'director' && 'Revisa y aprueba los PTAs de tu territorial'}
            {rol === 'programacion' && 'Aprobación final de PTAs'}
            {rol === 'admin' && 'Vista completa de todos los PTAs del sistema'}
          </p>
        </div>
        
        {rol === 'docente' && (
          <Button onClick={() => setModalCrear(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Crear PTA
          </Button>
        )}
      </div>
      
      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total PTAs</p>
              <p className="text-2xl font-bold text-gray-900">{metricas.total}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">
                {rol === 'director' || rol === 'programacion' ? 'Pendientes' : 'En Construcción'}
              </p>
              <p className="text-2xl font-bold text-orange-600">
                {rol === 'director' || rol === 'programacion' 
                  ? metricas.enAprobacion + metricas.aprobadosDirector
                  : metricas.enConstruccion}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Aprobados</p>
              <p className="text-2xl font-bold text-green-600">{metricas.aprobados}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Tasa Aprobación</p>
              <p className="text-2xl font-bold text-purple-600">{metricas.tasaAprobacion}%</p>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Filtros */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por código, nombre o cédula..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="CONSTRUCCION">En Construcción</SelectItem>
              <SelectItem value="EN_APROBACION">En Aprobación</SelectItem>
              <SelectItem value="APROBADO_DIRECTOR">Aprobado Director</SelectItem>
              <SelectItem value="APROBADO_FINAL">Aprobado Final</SelectItem>
            </SelectContent>
          </Select>
          
          {(rol === 'admin' || rol === 'programacion') && (
            <Select value={filtroTerritorial} onValueChange={setFiltroTerritorial}>
              <SelectTrigger>
                <SelectValue placeholder="Territorial" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas las territoriales</SelectItem>
                <SelectItem value="Antioquia">Antioquia</SelectItem>
                <SelectItem value="Bogotá">Bogotá</SelectItem>
                <SelectItem value="Valle">Valle</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </Card>
      
      {/* Lista de PTAs */}
      <div className="space-y-3">
        {ptasFiltrados.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">No hay PTAs</h3>
              <p className="text-gray-600 mb-4">
                {rol === 'docente' 
                  ? 'Aún no has creado ningún PTA. Crea tu primer Plan de Trabajo Académico.'
                  : 'No hay PTAs pendientes de revisión en este momento.'}
              </p>
              {rol === 'docente' && (
                <Button onClick={() => setModalCrear(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear mi primer PTA
                </Button>
              )}
            </div>
          </Card>
        ) : (
          ptasFiltrados.map((pta) => (
            <motion.div
              key={pta.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-6 h-6 text-purple-600" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900">{pta.codigo}</h3>
                          {getEstadoBadge(pta.estado)}
                          
                          {/* Indicador de progreso */}
                          {pta.estado === 'CONSTRUCCION' && (
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                              {((pta.horas_totales / pta.horas_programables) * 100).toFixed(0)}% completado
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Docente</p>
                            <p className="font-medium text-gray-900">{pta.docente_nombre}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Territorial</p>
                            <p className="font-medium text-gray-900">{pta.territorial}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Período</p>
                            <p className="font-medium text-gray-900">{pta.periodo}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Horas</p>
                            <p className="font-medium text-gray-900">
                              {pta.horas_totales}h / {pta.horas_programables}h
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                          <span>Creado: {formatDate(pta.fecha_creacion)}</span>
                          {pta.fecha_envio_aprobacion && (
                            <>
                              <span>•</span>
                              <span>Enviado: {formatDate(pta.fecha_envio_aprobacion)}</span>
                            </>
                          )}
                          {pta.fecha_aprobacion_final && (
                            <>
                              <span>•</span>
                              <span>Aprobado: {formatDate(pta.fecha_aprobacion_final)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Acciones */}
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVerDetalles(pta)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Ver
                    </Button>
                    
                    {/* Acciones según rol y estado */}
                    {rol === 'docente' && pta.estado === 'CONSTRUCCION' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditar(pta)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleEnviarAprobacion(pta)}
                          disabled={pta.horas_totales < pta.horas_programables * 0.9}
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Enviar
                        </Button>
                      </>
                    )}
                    
                    {(rol === 'director' && pta.estado === 'EN_APROBACION') && (
                      <Button
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700"
                        onClick={() => handleRevisar(pta)}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Revisar
                      </Button>
                    )}
                    
                    {(rol === 'programacion' && pta.estado === 'APROBADO_DIRECTOR') && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleRevisar(pta)}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Aprobar
                      </Button>
                    )}
                    
                    {rol === 'docente' && pta.estado === 'CONSTRUCCION' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleEliminar(pta)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>
      
      {/* Modales */}
      {modalCrear && (
        <PTAFormModal
          isOpen={modalCrear}
          onClose={() => {
            setModalCrear(false);
            setPtaSeleccionado(null);
          }}
          pta={ptaSeleccionado}
          onGuardar={(data) => {
            console.log('Guardar PTA:', data);
            setModalCrear(false);
            setPtaSeleccionado(null);
            toast.success('PTA guardado exitosamente');
          }}
        />
      )}
      
      {modalRevision && ptaSeleccionado && (
        <PTARevisionModal
          isOpen={modalRevision}
          onClose={() => {
            setModalRevision(false);
            setPtaSeleccionado(null);
          }}
          pta={ptaSeleccionado}
          docente={{ nombre: ptaSeleccionado.docente_nombre }}
          modo={modoRevision}
          rol={rol === 'director' ? 'director' : 'programacion'}
          onAprobar={handleAprobar}
          onRechazar={handleRechazar}
        />
      )}
      
      {modalDetalles && ptaSeleccionado && (
        <PTADetallesModal
          isOpen={modalDetalles}
          onClose={() => {
            setModalDetalles(false);
            setPtaSeleccionado(null);
          }}
          pta={ptaSeleccionado}
          docente={{ nombre: ptaSeleccionado.docente_nombre }}
        />
      )}
    </div>
  );
}

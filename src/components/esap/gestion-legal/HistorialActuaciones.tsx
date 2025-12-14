/**
 * HISTORIAL DE ACTUACIONES
 * Registro cronológico detallado de todas las actuaciones por expediente
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, Clock, User, Download, Search, Filter, Plus,
  CheckCircle, AlertCircle, FileCheck, Scale, Upload, MessageSquare, 
  X, Calendar, Eye, Edit, Trash2
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { toast } from 'sonner@2.0.3';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';

interface Actuacion {
  id: string;
  expediente: string;
  tipo: 'Auto' | 'Notificación' | 'Descargo' | 'Prueba' | 'Alegato' | 'Fallo' | 'Recurso' | 'Otro';
  descripcion: string;
  fecha: string;
  hora: string;
  responsable: string;
  documentos: number;
  estado: 'Completada' | 'Pendiente' | 'Verificada';
  observaciones?: string;
}

const ACTUACIONES_MOCK: Actuacion[] = [
  {
    id: '1',
    expediente: 'PD-2025-0125',
    tipo: 'Auto',
    descripcion: 'Auto que define procedimiento y traslado para descargos',
    fecha: '2025-01-05',
    hora: '09:30',
    responsable: 'Dr. Carlos Mendoza',
    documentos: 1,
    estado: 'Verificada',
    observaciones: 'Firmado por Jefe de Oficina Jurídica'
  },
  {
    id: '2',
    expediente: 'PD-2025-0125',
    tipo: 'Notificación',
    descripcion: 'Notificación personal del auto de avocamiento',
    fecha: '2025-01-08',
    hora: '14:15',
    responsable: 'Dra. Patricia González',
    documentos: 2,
    estado: 'Verificada',
    observaciones: 'Notificado personalmente en sede principal'
  },
  {
    id: '3',
    expediente: 'PD-2025-0125',
    tipo: 'Descargo',
    descripcion: 'Recepción de escrito de descargos',
    fecha: '2025-01-12',
    hora: '11:00',
    responsable: 'Dr. Carlos Mendoza',
    documentos: 5,
    estado: 'Completada',
    observaciones: 'Presentado dentro del término. Incluye 4 anexos'
  },
  {
    id: '4',
    expediente: 'PD-2025-0098',
    tipo: 'Auto',
    descripcion: 'Auto de avocamiento conocimiento',
    fecha: '2025-01-28',
    hora: '10:00',
    responsable: 'Dra. María Torres',
    documentos: 1,
    estado: 'Pendiente',
    observaciones: 'Pendiente firma del Jefe'
  },
  {
    id: '5',
    expediente: 'PD-2024-0234',
    tipo: 'Prueba',
    descripcion: 'Diligencia de interrogatorio de testigos',
    fecha: '2025-01-10',
    hora: '15:30',
    responsable: 'Dr. Luis Ramírez',
    documentos: 1,
    estado: 'Verificada',
    observaciones: 'Acta de audiencia firmada por todas las partes'
  },
  {
    id: '6',
    expediente: 'PD-2024-0234',
    tipo: 'Alegato',
    descripcion: 'Presentación de alegatos de conclusión',
    fecha: '2025-01-18',
    hora: '09:00',
    responsable: 'Dr. Luis Ramírez',
    documentos: 1,
    estado: 'Completada'
  },
  {
    id: '7',
    expediente: 'PD-2024-0234',
    tipo: 'Fallo',
    descripcion: 'Fallo de primera instancia - Sanción de suspensión',
    fecha: '2025-01-20',
    hora: '16:00',
    responsable: 'Dr. Luis Ramírez',
    documentos: 1,
    estado: 'Verificada',
    observaciones: 'Suspensión de 6 meses'
  }
];

export function HistorialActuaciones() {
  const [actuaciones, setActuaciones] = useState<Actuacion[]>(ACTUACIONES_MOCK);
  const [busqueda, setBusqueda] = useState('');
  const [filtroExpediente, setFiltroExpediente] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [filtrosAvanzadosOpen, setFiltrosAvanzadosOpen] = useState(false);
  const [modalRegistrarOpen, setModalRegistrarOpen] = useState(false);
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [actuacionSeleccionada, setActuacionSeleccionada] = useState<Actuacion | null>(null);

  // Estados para el formulario de nueva actuación
  const [nuevaActuacion, setNuevaActuacion] = useState({
    expediente: '',
    tipo: 'Auto' as Actuacion['tipo'],
    descripcion: '',
    fecha: new Date().toISOString().split('T')[0],
    hora: new Date().toTimeString().slice(0, 5),
    responsable: 'Dr. Carlos Mendoza',
    documentos: 0,
    estado: 'Pendiente' as Actuacion['estado'],
    observaciones: ''
  });

  const actuacionesFiltradas = actuaciones.filter(act => {
    const matchBusqueda = act.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
                         act.responsable.toLowerCase().includes(busqueda.toLowerCase());
    const matchExpediente = !filtroExpediente || act.expediente === filtroExpediente;
    const matchEstado = !filtroEstado || act.estado === filtroEstado;
    const matchTipo = !filtroTipo || act.tipo === filtroTipo;
    return matchBusqueda && matchExpediente && matchEstado && matchTipo;
  });

  const expedientesUnicos = [...new Set(actuaciones.map(a => a.expediente))];

  const getTipoIcon = (tipo: string) => {
    const iconos: Record<string, React.ReactNode> = {
      'Auto': <Scale className="w-5 h-5" />,
      'Notificación': <FileCheck className="w-5 h-5" />,
      'Descargo': <MessageSquare className="w-5 h-5" />,
      'Prueba': <FileText className="w-5 h-5" />,
      'Alegato': <MessageSquare className="w-5 h-5" />,
      'Fallo': <Scale className="w-5 h-5" />,
      'Recurso': <Upload className="w-5 h-5" />,
      'Otro': <FileText className="w-5 h-5" />
    };
    return iconos[tipo] || <FileText className="w-5 h-5" />;
  };

  const getTipoColor = (tipo: string) => {
    const colores: Record<string, string> = {
      'Auto': '#6F42C1',
      'Notificación': '#0284C7',
      'Descargo': '#F59E0B',
      'Prueba': '#8B5CF6',
      'Alegato': '#EC4899',
      'Fallo': '#10B981',
      'Recurso': '#FD7E14',
      'Otro': '#6B7280'
    };
    return colores[tipo] || '#6B7280';
  };

  const getEstadoStyle = (estado: string) => {
    const estilos: Record<string, { bg: string; text: string }> = {
      'Completada': { bg: '#E0F2FE', text: '#075985' },
      'Verificada': { bg: '#D1FAE5', text: '#065F46' },
      'Pendiente': { bg: '#FEF3C7', text: '#92400E' }
    };
    return estilos[estado] || { bg: '#F3F4F6', text: '#6B7280' };
  };

  const handleExportar = () => {
    toast.success('Exportando historial de actuaciones...', {
      description: 'El archivo CSV se descargará en breve',
      duration: 3000
    });
    
    // Simulación de exportación
    setTimeout(() => {
      toast.success('Exportación completada', {
        description: 'El archivo se ha descargado exitosamente',
        duration: 2000
      });
    }, 2000);
  };

  const handleDescargarDocumento = (actuacion: Actuacion) => {
    toast.success(`Descargando documento de ${actuacion.tipo}`, {
      description: `Expediente: ${actuacion.expediente}`,
      duration: 2000
    });
  };

  const handleRegistrarActuacion = () => {
    if (!nuevaActuacion.expediente || !nuevaActuacion.descripcion) {
      toast.error('Error al registrar actuación', {
        description: 'Por favor completa todos los campos requeridos',
        duration: 3000
      });
      return;
    }

    const nuevaAct: Actuacion = {
      ...nuevaActuacion,
      id: (actuaciones.length + 1).toString()
    };

    setActuaciones([nuevaAct, ...actuaciones]);
    setModalRegistrarOpen(false);
    
    // Resetear formulario
    setNuevaActuacion({
      expediente: '',
      tipo: 'Auto',
      descripcion: '',
      fecha: new Date().toISOString().split('T')[0],
      hora: new Date().toTimeString().slice(0, 5),
      responsable: 'Dr. Carlos Mendoza',
      documentos: 0,
      estado: 'Pendiente',
      observaciones: ''
    });

    toast.success('✅ Actuación registrada exitosamente', {
      description: `${nuevaAct.tipo} agregada al expediente ${nuevaAct.expediente}`,
      duration: 3000
    });
  };

  const handleLimpiarFiltros = () => {
    setBusqueda('');
    setFiltroExpediente('');
    setFiltroEstado('');
    setFiltroTipo('');
    toast.info('Filtros limpiados', {
      description: 'Mostrando todas las actuaciones',
      duration: 2000
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold mb-2" style={{ color: '#6F42C1' }}>
            Historial de Actuaciones
          </h2>
          <p className="text-sm" style={{ color: '#6B7280' }}>
            Registro cronológico de todas las actuaciones procesales
          </p>
        </div>
        <Button
          className="font-bold"
          style={{ background: '#6F42C1', color: '#FFFFFF' }}
          onClick={() => setModalRegistrarOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Registrar Actuación
        </Button>
      </div>

      {/* Filtros */}
      <Card className="p-4 border-2" style={{ borderColor: '#E5E7EB' }}>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#9CA3AF' }} />
            <Input
              placeholder="Buscar por descripción o responsable..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10 border-2"
            />
          </div>
          <select
            value={filtroExpediente}
            onChange={(e) => setFiltroExpediente(e.target.value)}
            className="px-3 py-2 border-2 rounded-lg"
          >
            <option value="">Todos los expedientes</option>
            {expedientesUnicos.map(exp => (
              <option key={exp} value={exp}>{exp}</option>
            ))}
          </select>
          <Button variant="outline" className="border-2" onClick={() => setFiltrosAvanzadosOpen(true)}>
            <Filter className="w-4 h-4 mr-2" />
            Más Filtros
          </Button>
          <Button variant="outline" className="border-2" onClick={handleExportar}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </Card>

      {/* Timeline de Actuaciones */}
      <Card className="p-6 border-2" style={{ borderColor: '#E5E7EB' }}>
        <h3 className="font-bold text-lg mb-6" style={{ color: '#1F2937' }}>
          Línea de Tiempo ({actuacionesFiltradas.length} actuaciones)
        </h3>

        <div className="space-y-4">
          {actuacionesFiltradas
            .sort((a, b) => new Date(b.fecha + ' ' + b.hora).getTime() - new Date(a.fecha + ' ' + a.hora).getTime())
            .map((actuacion, index) => {
              const tipoColor = getTipoColor(actuacion.tipo);
              const estadoStyle = getEstadoStyle(actuacion.estado);

              return (
                <motion.div
                  key={actuacion.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="relative"
                >
                  {/* Línea Conectora */}
                  {index < actuacionesFiltradas.length - 1 && (
                    <div
                      className="absolute left-6 top-16 bottom-0 w-0.5"
                      style={{ background: '#E5E7EB' }}
                    />
                  )}

                  <div className="flex gap-4">
                    {/* Icono y Tipo */}
                    <div className="flex-shrink-0">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center relative z-10"
                        style={{ background: `${tipoColor}20` }}
                      >
                        <div style={{ color: tipoColor }}>
                          {getTipoIcon(actuacion.tipo)}
                        </div>
                      </div>
                    </div>

                    {/* Contenido */}
                    <Card className="flex-1 p-4 border-2 hover:shadow-lg transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge
                              className="text-xs font-bold"
                              style={{ background: `${tipoColor}20`, color: tipoColor }}
                            >
                              {actuacion.tipo}
                            </Badge>
                            <Badge
                              className="text-xs"
                              style={{ background: estadoStyle.bg, color: estadoStyle.text }}
                            >
                              {actuacion.estado}
                            </Badge>
                            <Badge className="text-xs" style={{ background: '#F3E8FF', color: '#6F42C1' }}>
                              {actuacion.expediente}
                            </Badge>
                          </div>
                          <p className="font-bold mb-1" style={{ color: '#1F2937' }}>
                            {actuacion.descripcion}
                          </p>
                          <div className="flex items-center gap-4 text-sm" style={{ color: '#6B7280' }}>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>
                                {new Date(actuacion.fecha).toLocaleDateString('es-ES', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric'
                                })} • {actuacion.hora}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <FileText className="w-4 h-4" />
                              <span>{actuacion.documentos} documento(s)</span>
                            </div>
                          </div>
                        </div>

                        {/* Acciones */}
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleDescargarDocumento(actuacion)}>
                            <Download className="w-4 h-4" style={{ color: '#6F42C1' }} />
                          </Button>
                        </div>
                      </div>

                      {/* Footer con Responsable */}
                      <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: '#E5E7EB' }}>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarFallback style={{ background: '#F3E8FF', color: '#6F42C1', fontSize: '10px' }}>
                              {actuacion.responsable.split(' ').slice(1, 3).map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium" style={{ color: '#4B5563' }}>
                            {actuacion.responsable}
                          </span>
                        </div>

                        {actuacion.estado === 'Verificada' && (
                          <div className="flex items-center gap-1 text-xs" style={{ color: '#10B981' }}>
                            <CheckCircle className="w-4 h-4" />
                            <span>Verificada</span>
                          </div>
                        )}
                      </div>

                      {/* Observaciones */}
                      {actuacion.observaciones && (
                        <div className="mt-3 p-3 rounded-lg" style={{ background: '#F9FAFB' }}>
                          <p className="text-sm" style={{ color: '#6B7280' }}>
                            📝 <strong>Observaciones:</strong> {actuacion.observaciones}
                          </p>
                        </div>
                      )}
                    </Card>
                  </div>
                </motion.div>
              );
            })}
        </div>

        {/* Empty State */}
        {actuacionesFiltradas.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: '#F3E8FF' }}>
              <FileText className="w-8 h-8" style={{ color: '#6F42C1' }} />
            </div>
            <p className="font-bold mb-2" style={{ color: '#1F2937' }}>
              No se encontraron actuaciones
            </p>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Intenta ajustar los filtros de búsqueda
            </p>
          </div>
        )}
      </Card>

      {/* Estadísticas por Expediente */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {expedientesUnicos.slice(0, 3).map(expediente => {
          const actuacionesExp = actuaciones.filter(a => a.expediente === expediente);
          const completadas = actuacionesExp.filter(a => a.estado === 'Verificada').length;
          const porcentaje = (completadas / actuacionesExp.length) * 100;

          return (
            <Card key={expediente} className="p-5 border-2 hover:shadow-lg transition-shadow">
              <Badge className="text-xs mb-3" style={{ background: '#F3E8FF', color: '#6F42C1' }}>
                {expediente}
              </Badge>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: '#6B7280' }}>
                  Actuaciones completadas
                </span>
                <span className="font-bold" style={{ color: '#1F2937' }}>
                  {completadas}/{actuacionesExp.length}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${porcentaje}%`,
                    background: '#6F42C1'
                  }}
                />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Info */}
      <Card className="p-4 border-2" style={{ borderColor: '#E5E7EB' }}>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg" style={{ background: '#E0F2FE' }}>
            <AlertCircle className="w-5 h-5" style={{ color: '#0284C7' }} />
          </div>
          <div>
            <p className="text-sm font-bold mb-1" style={{ color: '#1F2937' }}>
              📋 Trazabilidad Completa
            </p>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Todas las actuaciones quedan registradas automáticamente con fecha, hora, responsable y documentos asociados. 
              Este historial garantiza la trazabilidad completa del proceso disciplinario.
            </p>
          </div>
        </div>
      </Card>

      {/* Modal de Filtros Avanzados */}
      <Dialog open={filtrosAvanzadosOpen} onOpenChange={setFiltrosAvanzadosOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Filtros Avanzados</DialogTitle>
            <DialogDescription>
              Aplica filtros adicionales para refinar tu búsqueda.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="estado">Estado</Label>
              <select
                id="estado"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="px-3 py-2 border-2 rounded-lg w-full"
              >
                <option value="">Todos los estados</option>
                <option value="Completada">Completada</option>
                <option value="Verificada">Verificada</option>
                <option value="Pendiente">Pendiente</option>
              </select>
            </div>
            <div>
              <Label htmlFor="tipo">Tipo</Label>
              <select
                id="tipo"
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="px-3 py-2 border-2 rounded-lg w-full"
              >
                <option value="">Todos los tipos</option>
                <option value="Auto">Auto</option>
                <option value="Notificación">Notificación</option>
                <option value="Descargo">Descargo</option>
                <option value="Prueba">Prueba</option>
                <option value="Alegato">Alegato</option>
                <option value="Fallo">Fallo</option>
                <option value="Recurso">Recurso</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setFiltrosAvanzadosOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleLimpiarFiltros}
            >
              Limpiar Filtros
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Registro de Actuación */}
      <Dialog open={modalRegistrarOpen} onOpenChange={setModalRegistrarOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Registrar Actuación</DialogTitle>
            <DialogDescription>
              Ingresa los detalles de la nueva actuación.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="expediente">Expediente</Label>
              <select
                id="expediente"
                value={nuevaActuacion.expediente}
                onChange={(e) => setNuevaActuacion({ ...nuevaActuacion, expediente: e.target.value })}
                className="px-3 py-2 border-2 rounded-lg w-full"
              >
                <option value="">Selecciona un expediente</option>
                {expedientesUnicos.map(exp => (
                  <option key={exp} value={exp}>{exp}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="tipo">Tipo</Label>
              <select
                id="tipo"
                value={nuevaActuacion.tipo}
                onChange={(e) => setNuevaActuacion({ ...nuevaActuacion, tipo: e.target.value as Actuacion['tipo'] })}
                className="px-3 py-2 border-2 rounded-lg w-full"
              >
                <option value="Auto">Auto</option>
                <option value="Notificación">Notificación</option>
                <option value="Descargo">Descargo</option>
                <option value="Prueba">Prueba</option>
                <option value="Alegato">Alegato</option>
                <option value="Fallo">Fallo</option>
                <option value="Recurso">Recurso</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div>
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={nuevaActuacion.descripcion}
                onChange={(e) => setNuevaActuacion({ ...nuevaActuacion, descripcion: e.target.value })}
                className="px-3 py-2 border-2 rounded-lg w-full"
              />
            </div>
            <div>
              <Label htmlFor="fecha">Fecha</Label>
              <Input
                id="fecha"
                type="date"
                value={nuevaActuacion.fecha}
                onChange={(e) => setNuevaActuacion({ ...nuevaActuacion, fecha: e.target.value })}
                className="px-3 py-2 border-2 rounded-lg w-full"
              />
            </div>
            <div>
              <Label htmlFor="hora">Hora</Label>
              <Input
                id="hora"
                type="time"
                value={nuevaActuacion.hora}
                onChange={(e) => setNuevaActuacion({ ...nuevaActuacion, hora: e.target.value })}
                className="px-3 py-2 border-2 rounded-lg w-full"
              />
            </div>
            <div>
              <Label htmlFor="responsable">Responsable</Label>
              <Input
                id="responsable"
                value={nuevaActuacion.responsable}
                onChange={(e) => setNuevaActuacion({ ...nuevaActuacion, responsable: e.target.value })}
                className="px-3 py-2 border-2 rounded-lg w-full"
              />
            </div>
            <div>
              <Label htmlFor="documentos">Documentos</Label>
              <Input
                id="documentos"
                type="number"
                value={nuevaActuacion.documentos}
                onChange={(e) => setNuevaActuacion({ ...nuevaActuacion, documentos: parseInt(e.target.value) })}
                className="px-3 py-2 border-2 rounded-lg w-full"
              />
            </div>
            <div>
              <Label htmlFor="estado">Estado</Label>
              <select
                id="estado"
                value={nuevaActuacion.estado}
                onChange={(e) => setNuevaActuacion({ ...nuevaActuacion, estado: e.target.value as Actuacion['estado'] })}
                className="px-3 py-2 border-2 rounded-lg w-full"
              >
                <option value="Completada">Completada</option>
                <option value="Verificada">Verificada</option>
                <option value="Pendiente">Pendiente</option>
              </select>
            </div>
            <div>
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                value={nuevaActuacion.observaciones}
                onChange={(e) => setNuevaActuacion({ ...nuevaActuacion, observaciones: e.target.value })}
                className="px-3 py-2 border-2 rounded-lg w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalRegistrarOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleRegistrarActuacion}
            >
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalle de Actuación */}
      <Dialog open={modalDetalleOpen} onOpenChange={setModalDetalleOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Detalle de Actuación</DialogTitle>
            <DialogDescription>
              Información detallada de la actuación seleccionada.
            </DialogDescription>
          </DialogHeader>
          {actuacionSeleccionada && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="expediente">Expediente</Label>
                <Input
                  id="expediente"
                  value={actuacionSeleccionada.expediente}
                  readOnly
                  className="px-3 py-2 border-2 rounded-lg w-full"
                />
              </div>
              <div>
                <Label htmlFor="tipo">Tipo</Label>
                <Input
                  id="tipo"
                  value={actuacionSeleccionada.tipo}
                  readOnly
                  className="px-3 py-2 border-2 rounded-lg w-full"
                />
              </div>
              <div>
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={actuacionSeleccionada.descripcion}
                  readOnly
                  className="px-3 py-2 border-2 rounded-lg w-full"
                />
              </div>
              <div>
                <Label htmlFor="fecha">Fecha</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={actuacionSeleccionada.fecha}
                  readOnly
                  className="px-3 py-2 border-2 rounded-lg w-full"
                />
              </div>
              <div>
                <Label htmlFor="hora">Hora</Label>
                <Input
                  id="hora"
                  type="time"
                  value={actuacionSeleccionada.hora}
                  readOnly
                  className="px-3 py-2 border-2 rounded-lg w-full"
                />
              </div>
              <div>
                <Label htmlFor="responsable">Responsable</Label>
                <Input
                  id="responsable"
                  value={actuacionSeleccionada.responsable}
                  readOnly
                  className="px-3 py-2 border-2 rounded-lg w-full"
                />
              </div>
              <div>
                <Label htmlFor="documentos">Documentos</Label>
                <Input
                  id="documentos"
                  type="number"
                  value={actuacionSeleccionada.documentos}
                  readOnly
                  className="px-3 py-2 border-2 rounded-lg w-full"
                />
              </div>
              <div>
                <Label htmlFor="estado">Estado</Label>
                <Input
                  id="estado"
                  value={actuacionSeleccionada.estado}
                  readOnly
                  className="px-3 py-2 border-2 rounded-lg w-full"
                />
              </div>
              <div>
                <Label htmlFor="observaciones">Observaciones</Label>
                <Textarea
                  id="observaciones"
                  value={actuacionSeleccionada.observaciones || ''}
                  readOnly
                  className="px-3 py-2 border-2 rounded-lg w-full"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalDetalleOpen(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
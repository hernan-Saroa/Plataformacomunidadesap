import { useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Calendar,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  BookOpen,
  FileText,
  GraduationCap,
  Save
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { toast } from 'sonner@2.0.3';

interface CalendarioAcademicoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FechaImportante {
  id: string;
  tipo: 'inicio' | 'fin' | 'inscripcion' | 'examenes' | 'festivo' | 'reunion' | 'otro';
  titulo: string;
  descripcion?: string;
  fecha: string;
  fecha_fin?: string;
  es_rango: boolean;
  color: string;
}

const tiposFecha = [
  { value: 'inicio', label: 'Inicio de Clases', icon: BookOpen, color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'fin', label: 'Fin de Clases', icon: CheckCircle, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'inscripcion', label: 'Inscripciones', icon: FileText, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'examenes', label: 'Exámenes', icon: FileText, color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'festivo', label: 'Festivo', icon: Calendar, color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'reunion', label: 'Reunión', icon: Clock, color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { value: 'otro', label: 'Otro', icon: AlertCircle, color: 'bg-gray-100 text-gray-700 border-gray-200' }
];

const fechasMock: FechaImportante[] = [
  {
    id: 'f-001',
    tipo: 'inscripcion',
    titulo: 'Inscripciones Pregrado',
    descripcion: 'Periodo de inscripción para programas de pregrado',
    fecha: '2025-01-15',
    fecha_fin: '2025-01-31',
    es_rango: true,
    color: 'bg-purple-100 text-purple-700 border-purple-200'
  },
  {
    id: 'f-002',
    tipo: 'inicio',
    titulo: 'Inicio de Clases 2025-I',
    descripcion: 'Inicio del periodo académico 2025-I',
    fecha: '2025-02-03',
    es_rango: false,
    color: 'bg-green-100 text-green-700 border-green-200'
  },
  {
    id: 'f-003',
    tipo: 'examenes',
    titulo: 'Primer Corte - Exámenes',
    descripcion: 'Semana de evaluaciones del primer corte',
    fecha: '2025-03-17',
    fecha_fin: '2025-03-21',
    es_rango: true,
    color: 'bg-amber-100 text-amber-700 border-amber-200'
  },
  {
    id: 'f-004',
    tipo: 'festivo',
    titulo: 'Semana Santa',
    descripcion: 'Receso académico por Semana Santa',
    fecha: '2025-04-14',
    fecha_fin: '2025-04-18',
    es_rango: true,
    color: 'bg-red-100 text-red-700 border-red-200'
  },
  {
    id: 'f-005',
    tipo: 'examenes',
    titulo: 'Segundo Corte - Exámenes',
    descripcion: 'Semana de evaluaciones del segundo corte',
    fecha: '2025-05-05',
    fecha_fin: '2025-05-09',
    es_rango: true,
    color: 'bg-amber-100 text-amber-700 border-amber-200'
  },
  {
    id: 'f-006',
    tipo: 'examenes',
    titulo: 'Exámenes Finales',
    descripcion: 'Semana de evaluaciones finales del periodo',
    fecha: '2025-06-09',
    fecha_fin: '2025-06-13',
    es_rango: true,
    color: 'bg-amber-100 text-amber-700 border-amber-200'
  },
  {
    id: 'f-007',
    tipo: 'fin',
    titulo: 'Fin de Clases 2025-I',
    descripcion: 'Finalización del periodo académico 2025-I',
    fecha: '2025-06-20',
    es_rango: false,
    color: 'bg-blue-100 text-blue-700 border-blue-200'
  }
];

export function CalendarioAcademicoModal({ isOpen, onClose }: CalendarioAcademicoModalProps) {
  const [fechas, setFechas] = useState<FechaImportante[]>(fechasMock);
  const [isAgregarMode, setIsAgregarMode] = useState(false);
  const [fechaEditando, setFechaEditando] = useState<FechaImportante | null>(null);

  // Formulario para nueva fecha
  const [nuevaFecha, setNuevaFecha] = useState({
    tipo: 'inicio' as FechaImportante['tipo'],
    titulo: '',
    descripcion: '',
    fecha: '',
    fecha_fin: '',
    es_rango: false
  });

  const handleAgregarFecha = () => {
    if (!nuevaFecha.titulo.trim() || !nuevaFecha.fecha) {
      toast.error('Por favor completa los campos obligatorios');
      return;
    }

    if (nuevaFecha.es_rango && !nuevaFecha.fecha_fin) {
      toast.error('Por favor selecciona la fecha de fin');
      return;
    }

    if (nuevaFecha.es_rango && nuevaFecha.fecha >= nuevaFecha.fecha_fin!) {
      toast.error('La fecha de fin debe ser posterior a la fecha de inicio');
      return;
    }

    const tipoConfig = tiposFecha.find(t => t.value === nuevaFecha.tipo);

    const nuevaFechaCompleta: FechaImportante = {
      id: `f-${Date.now()}`,
      ...nuevaFecha,
      color: tipoConfig?.color || 'bg-gray-100 text-gray-700 border-gray-200'
    };

    setFechas(prev => [...prev, nuevaFechaCompleta].sort((a, b) => 
      new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    ));

    toast.success('Fecha agregada al calendario');

    // Reset
    setNuevaFecha({
      tipo: 'inicio',
      titulo: '',
      descripcion: '',
      fecha: '',
      fecha_fin: '',
      es_rango: false
    });
    setIsAgregarMode(false);
  };

  const handleEliminarFecha = (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta fecha?')) {
      setFechas(prev => prev.filter(f => f.id !== id));
      toast.success('Fecha eliminada');
    }
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatFechaCorta = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short'
    });
  };

  const getTipoConfig = (tipo: string) => {
    return tiposFecha.find(t => t.value === tipo) || tiposFecha[tiposFecha.length - 1];
  };

  // Agrupar fechas por mes
  const fechasPorMes = fechas.reduce((acc, fecha) => {
    const mes = new Date(fecha.fecha).toLocaleString('es-CO', { month: 'long', year: 'numeric' });
    if (!acc[mes]) {
      acc[mes] = [];
    }
    acc[mes].push(fecha);
    return acc;
  }, {} as Record<string, FechaImportante[]>);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd]">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Calendario Académico 2025-I
            </h2>
            <p className="text-sm text-blue-100 mt-1">
              {fechas.length} fechas importantes registradas
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Botón Agregar */}
          {!isAgregarMode && (
            <Button
              onClick={() => setIsAgregarMode(true)}
              size="sm"
              className="mb-6 bg-[#1e5da8] hover:bg-[#1a4d8f]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar Fecha Importante
            </Button>
          )}

          {/* Formulario Agregar */}
          {isAgregarMode && (
            <Card className="p-6 mb-6 border-2 border-[#1e5da8]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Nueva Fecha Importante</h3>
                <button
                  onClick={() => setIsAgregarMode(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                      Tipo <span className="text-red-500">*</span>
                    </Label>
                    <select
                      value={nuevaFecha.tipo}
                      onChange={(e) => setNuevaFecha({ ...nuevaFecha, tipo: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      {tiposFecha.map(tipo => (
                        <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                      Título <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      placeholder="Ej: Inicio de Clases"
                      value={nuevaFecha.titulo}
                      onChange={(e) => setNuevaFecha({ ...nuevaFecha, titulo: e.target.value })}
                      className="w-full"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label className="text-sm font-medium text-gray-700 mb-1.5">
                      Descripción
                    </Label>
                    <Input
                      type="text"
                      placeholder="Descripción opcional de la fecha"
                      value={nuevaFecha.descripcion}
                      onChange={(e) => setNuevaFecha({ ...nuevaFecha, descripcion: e.target.value })}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 cursor-pointer mb-3">
                      <input
                        type="checkbox"
                        checked={nuevaFecha.es_rango}
                        onChange={(e) => setNuevaFecha({ ...nuevaFecha, es_rango: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-[#1e5da8] focus:ring-[#1e5da8]"
                      />
                      <span className="text-sm text-gray-700">Es un rango de fechas</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                      {nuevaFecha.es_rango ? 'Fecha de Inicio' : 'Fecha'} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="date"
                      value={nuevaFecha.fecha}
                      onChange={(e) => setNuevaFecha({ ...nuevaFecha, fecha: e.target.value })}
                      className="w-full"
                    />
                  </div>

                  {nuevaFecha.es_rango && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                        Fecha de Fin <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="date"
                        value={nuevaFecha.fecha_fin}
                        onChange={(e) => setNuevaFecha({ ...nuevaFecha, fecha_fin: e.target.value })}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    onClick={handleAgregarFecha}
                    size="sm"
                    className="bg-[#1e5da8] hover:bg-[#1a4d8f]"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Fecha
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAgregarMode(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Timeline de Fechas */}
          <div className="space-y-6">
            {Object.entries(fechasPorMes).map(([mes, fechasMes]) => (
              <div key={mes}>
                <h3 className="font-bold text-gray-900 mb-3 capitalize">{mes}</h3>
                <div className="space-y-3">
                  {fechasMes.map((fecha, index) => {
                    const tipoConfig = getTipoConfig(fecha.tipo);
                    const Icon = tipoConfig.icon;

                    return (
                      <motion.div
                        key={fecha.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className="p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start gap-4">
                            {/* Icono y Fecha */}
                            <div className="flex-shrink-0">
                              <div className={`w-12 h-12 rounded-full ${tipoConfig.color} flex items-center justify-center`}>
                                <Icon className="w-6 h-6" />
                              </div>
                              <div className="text-center mt-2">
                                <p className="text-xs font-bold text-gray-900">
                                  {formatFechaCorta(fecha.fecha)}
                                </p>
                                {fecha.es_rango && fecha.fecha_fin && (
                                  <p className="text-xs text-gray-600">
                                    al {formatFechaCorta(fecha.fecha_fin)}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Info */}
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h4 className="font-semibold text-gray-900 mb-1">{fecha.titulo}</h4>
                                  {fecha.descripcion && (
                                    <p className="text-sm text-gray-600">{fecha.descripcion}</p>
                                  )}
                                </div>
                                <Badge className={tipoConfig.color}>
                                  {tipoConfig.label}
                                </Badge>
                              </div>

                              <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>{formatFecha(fecha.fecha)}</span>
                                </div>
                                {fecha.es_rango && fecha.fecha_fin && (
                                  <>
                                    <span>→</span>
                                    <div className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      <span>{formatFecha(fecha.fecha_fin)}</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Acciones */}
                            <div className="flex-shrink-0 flex items-center gap-1">
                              <button
                                onClick={() => handleEliminarFecha(fecha.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}

            {fechas.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">No hay fechas registradas</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Agrega fechas importantes para el calendario académico
                </p>
                <Button
                  onClick={() => setIsAgregarMode(true)}
                  size="sm"
                  className="bg-[#1e5da8] hover:bg-[#1a4d8f]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Primera Fecha
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-gray-200 bg-gray-50">
          <Button onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

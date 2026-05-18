/**
 * KANBAN DEFENSA JUDICIAL - Gestión Visual de Expedientes Judiciales.
 * 4 Jurisdicciones: Constitucional, Contencioso, Laboral, Ordinaria
 */

import { useState, useEffect } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { motion } from 'motion/react';
import {
  Scale, FileText, Clock, Eye, MessageSquare, History, AlertCircle,
  CheckCircle, XCircle, List, Columns3, Plus, Filter, Send
} from 'lucide-react';
import { Card } from '@esap-mfe/shared-ui/card';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Button } from '@esap-mfe/shared-ui/button';
import { toast } from 'sonner';
import { FormularioExpedienteJudicial } from './defensa-judicial/FormularioExpedienteJudicial';
import { ModuloDefensaJudicial } from './ModuloDefensaJudicial';
import { legalService } from '../../../services/api/legal.service';
import { authService } from '../../../services/api/authService';

type Jurisdiccion = 'CONSTITUCIONAL' | 'CONTENCIOSO' | 'LABORAL' | 'ORDINARIA';
type Etapa = 'ADMISION' | 'CONTESTACION' | 'PRUEBAS' | 'ALEGATOS' | 'SENTENCIA' | 'CERRADO';
type ColorAlerta = 'VERDE' | 'AMARILLO' | 'ROJO' | 'VENCIDO';

interface Expediente {
  id: string; // UUID
  radicado: string; // Display ID
  jurisdiccion: Jurisdiccion;
  demandante: { nombre: string; identificacion: string };
  demandado: { nombre: string; identificacion: string };
  juzgado: string;
  medioControl: string;
  abogadoAsignado: { nombre: string; identificacion: string };
  etapa: Etapa;
  diasRestantes: number;
  tiempoRestante: string;
  tipoConteoTermino?: 'HABILES' | 'CALENDARIO'; // Tipo de conteo de días
  colorAlerta: ColorAlerta;
  fechaNotificacion: string;
  valorDemanda?: number;
}

const ETAPAS: { id: Etapa; label: string; color: string }[] = [
  { id: 'ADMISION', label: 'Admisión', color: '#6366F1' },
  { id: 'CONTESTACION', label: 'Contestación', color: '#F59E0B' },
  { id: 'PRUEBAS', label: 'Pruebas', color: '#8B5CF6' },
  { id: 'ALEGATOS', label: 'Alegatos', color: '#EC4899' },
  { id: 'SENTENCIA', label: 'Sentencia', color: '#10B981' },
  { id: 'CERRADO', label: 'Cerrado', color: '#6B7280' },
];

// Mock removed - data now comes from backend via legalService.getExpedientes()

// Modal de Detalles del Expediente
function DetalleExpedienteModal({ expediente, isOpen, onClose }: { expediente: Expediente | null; isOpen: boolean; onClose: () => void }) {
  const [showActuaciones, setShowActuaciones] = useState(false);
  const [actuaciones, setActuaciones] = useState<any[]>([]);
  const [loadingActuaciones, setLoadingActuaciones] = useState(false);

  // New actuacion form state
  const [showNuevaActuacion, setShowNuevaActuacion] = useState(false);
  const [savingActuacion, setSavingActuacion] = useState(false);
  const [nuevaActuacion, setNuevaActuacion] = useState({
    tipoActuacion: '',
    fechaActuacion: '',
    descripcion: ''
  });

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowActuaciones(false);
      setActuaciones([]);
      setShowNuevaActuacion(false);
      setNuevaActuacion({ tipoActuacion: '', fechaActuacion: '', descripcion: '' });
    }
  }, [isOpen]);

  const TIPOS_ACTUACION = [
    'RADICACION',
    'NOTIFICACION',
    'AUTO',
    'CONTESTACION',
    'PRUEBAS',
    'ALEGATOS',
    'SENTENCIA',
    'AUDIENCIA',
    'MEMORIAL',
    'RECURSO',
    'OTRO'
  ];

  const handleVerActuaciones = async () => {
    if (!expediente) return;

    if (showActuaciones) {
      setShowActuaciones(false);
      return;
    }

    setLoadingActuaciones(true);
    try {
      const data = await legalService.getActuaciones(expediente.id);
      setActuaciones(data || []);
      setShowActuaciones(true);
    } catch (error) {
      console.error('Error fetching actuaciones:', error);
      toast.error('No se pudieron cargar las actuaciones');
    } finally {
      setLoadingActuaciones(false);
    }
  };

  const handleGuardarActuacion = async () => {
    if (!expediente) return;

    if (!nuevaActuacion.tipoActuacion || !nuevaActuacion.descripcion) {
      toast.error('Por favor complete tipo y descripción');
      return;
    }

    setSavingActuacion(true);
    try {
      const data = {
        tipoActuacion: nuevaActuacion.tipoActuacion,
        descripcion: nuevaActuacion.descripcion,
        fechaActuacion: nuevaActuacion.fechaActuacion || new Date().toISOString(),
        usuarioResponsable: (() => {
          const u = authService.getCurrentUser() as any;
          return u?.fullName ?? u?.full_name ?? u?.name ?? u?.nombre ?? (u?.person?.first_name ? `${u.person.first_name} ${u.person.last_name ?? ''}`.trim() : null) ?? u?.email ?? u?.person?.email ?? 'Usuario';
        })()
      };

      await legalService.registrarActuacion(expediente.id, data);
      toast.success('Actuación registrada exitosamente');

      // Reset form and refresh list
      setNuevaActuacion({ tipoActuacion: '', fechaActuacion: '', descripcion: '' });
      setShowNuevaActuacion(false);

      // Refresh actuaciones list
      const updatedActuaciones = await legalService.getActuaciones(expediente.id);
      setActuaciones(updatedActuaciones || []);
      setShowActuaciones(true);
    } catch (error) {
      console.error('Error saving actuacion:', error);
      toast.error('Error al guardar la actuación');
    } finally {
      setSavingActuacion(false);
    }
  };

  if (!isOpen || !expediente) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
  };

  const alertaColor = {
    VERDE: { bg: 'bg-green-100', text: 'text-green-800', label: 'Sin riesgo' },
    AMARILLO: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Próximo a vencer' },
    ROJO: { bg: 'bg-red-100', text: 'text-red-800', label: 'Urgente' },
    VENCIDO: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Vencido' },
  }[expediente.colorAlerta];

  const tipoActuacionIcon = (tipo: string) => {
    const icons: Record<string, string> = {
      'RADICACION': '📄',
      'NOTIFICACION': '📨',
      'AUDIENCIA': '⚖️',
      'CONTESTACION': '📝',
      'PRUEBAS': '🔍',
      'ALEGATOS': '🎤',
      'SENTENCIA': '⚖️',
      'AUTO': '📋',
      'MEMORIAL': '📃',
      'RECURSO': '📑'
    };
    return icons[tipo?.toUpperCase()] || '📌';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">Expediente</p>
              <h2 className="text-xl font-bold">{expediente.radicado}</h2>
            </div>
            <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            <Badge className="bg-white/20 text-white">{expediente.jurisdiccion}</Badge>
            <Badge className={`${alertaColor.bg} ${alertaColor.text}`}>{alertaColor.label}</Badge>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Partes */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase font-medium mb-1">Demandante</p>
              <p className="font-semibold text-gray-900">{expediente.demandante.nombre}</p>
              <p className="text-sm text-gray-600">{expediente.demandante.identificacion}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase font-medium mb-1">Demandado</p>
              <p className="font-semibold text-gray-900">{expediente.demandado.nombre}</p>
              <p className="text-sm text-gray-600">{expediente.demandado.identificacion}</p>
            </div>
          </div>

          {/* Detalles del Proceso */}
          <div className="border-t pt-4 space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Scale className="w-4 h-4 text-blue-600" />
              Detalles del Proceso
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Medio de Control</p>
                <p className="font-medium text-gray-900">{expediente.medioControl}</p>
              </div>
              <div>
                <p className="text-gray-500">Etapa Procesal</p>
                <p className="font-medium text-gray-900">{expediente.etapa}</p>
              </div>
              <div>
                <p className="text-gray-500">Juzgado</p>
                <p className="font-medium text-gray-900">{expediente.juzgado}</p>
              </div>
              <div>
                <p className="text-gray-500">Valor de la Demanda</p>
                <p className="font-medium text-gray-900">{formatCurrency(expediente.valorDemanda || 0)}</p>
              </div>
            </div>
          </div>

          {/* Abogado Asignado */}
          <div className="border-t pt-4 space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Abogado Asignado
            </h3>
            <div className="bg-blue-50 rounded-lg p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {expediente.abogadoAsignado.nombre.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{expediente.abogadoAsignado.nombre}</p>
                <p className="text-sm text-gray-600">{expediente.abogadoAsignado.identificacion}</p>
              </div>
            </div>
          </div>

          {/* Plazos y Fechas */}
          <div className="border-t pt-4 space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Plazos y Fechas
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Fecha de Notificación</p>
                <p className="font-medium text-gray-900">
                  {expediente.fechaNotificacion
                    ? new Date(expediente.fechaNotificacion).toLocaleDateString('es-CO')
                    : 'Sin definir'}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Días Restantes</p>
                <p className={`font-medium ${expediente.diasRestantes < 0 ? 'text-red-600' : expediente.diasRestantes <= 7 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {expediente.tiempoRestante}
                </p>
              </div>
            </div>
          </div>

          {/* Actuaciones Timeline */}
          {showActuaciones && (
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-600" />
                  Historial de Actuaciones
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNuevaActuacion(!showNuevaActuacion)}
                  className="text-xs"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Nueva
                </Button>
              </div>

              {/* Form para nueva actuación */}
              {showNuevaActuacion && (
                <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-gray-900 text-sm">Registrar Nueva Actuación</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Tipo de Actuación *</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        value={nuevaActuacion.tipoActuacion}
                        onChange={(e) => setNuevaActuacion(prev => ({ ...prev, tipoActuacion: e.target.value }))}
                      >
                        <option value="">Seleccione...</option>
                        {TIPOS_ACTUACION.map(tipo => (
                          <option key={tipo} value={tipo}>{tipo}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Fecha</label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        value={nuevaActuacion.fechaActuacion}
                        onChange={(e) => setNuevaActuacion(prev => ({ ...prev, fechaActuacion: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Descripción *</label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={3}
                      placeholder="Describa la actuación procesal..."
                      value={nuevaActuacion.descripcion}
                      onChange={(e) => setNuevaActuacion(prev => ({ ...prev, descripcion: e.target.value }))}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowNuevaActuacion(false);
                        setNuevaActuacion({ tipoActuacion: '', fechaActuacion: '', descripcion: '' });
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={handleGuardarActuacion}
                      disabled={savingActuacion}
                    >
                      {savingActuacion ? 'Guardando...' : 'Guardar Actuación'}
                    </Button>
                  </div>
                </div>
              )}

              {actuaciones.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No hay actuaciones registradas</p>
                </div>
              ) : (
                <div className="relative pl-4 border-l-2 border-blue-200 space-y-4 max-h-60 overflow-y-auto">
                  {actuaciones.map((act, index) => (
                    <div key={act.id || index} className="relative">
                      <div className="absolute -left-[21px] w-4 h-4 rounded-full bg-blue-600 border-2 border-white" />
                      <div className="bg-gray-50 rounded-lg p-3 ml-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{tipoActuacionIcon(act.tipoActuacion)}</span>
                          <span className="font-semibold text-gray-900 text-sm">{act.tipoActuacion}</span>
                          <span className="text-xs text-gray-500 ml-auto">
                            {act.fechaActuacion ? new Date(act.fechaActuacion).toLocaleDateString('es-CO') : 'Sin fecha'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{act.descripcion}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleVerActuaciones}
            disabled={loadingActuaciones}
          >
            {loadingActuaciones ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Cargando...
              </>
            ) : showActuaciones ? (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Ocultar Actuaciones
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Ver Actuaciones
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// Modal de Comentarios (acceso desde tarjeta del Kanban)
function ComentariosModal({ expediente, isOpen, onClose }: { expediente: Expediente | null; isOpen: boolean; onClose: () => void }) {
  const [comentarios, setComentarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && expediente) {
      fetchComentarios();
    }
    if (!isOpen) {
      setComentarios([]);
      setNuevoComentario('');
    }
  }, [isOpen, expediente]);

  const fetchComentarios = async () => {
    if (!expediente) return;
    setLoading(true);
    try {
      const data = await legalService.getComentariosExpediente(expediente.id);
      setComentarios(data || []);
    } catch (error) {
      console.error('Error fetching comentarios:', error);
      toast.error('No se pudieron cargar los comentarios');
    } finally {
      setLoading(false);
    }
  };

  const handleGuardar = async () => {
    if (!expediente || !nuevoComentario.trim()) return;

    setSaving(true);
    try {
      const u = authService.getCurrentUser() as any;
      const usuarioNombre = u?.fullName ?? u?.full_name ?? u?.name ?? u?.nombre ?? (u?.person?.first_name ? `${u.person.first_name} ${u.person.last_name ?? ''}`.trim() : null) ?? u?.email ?? u?.person?.email ?? 'Usuario';

      await legalService.createComentarioExpediente(expediente.id, {
        contenido: nuevoComentario.trim(),
        usuarioNombre: usuarioNombre
      });
      toast.success('Comentario agregado');
      setNuevoComentario('');
      fetchComentarios();
    } catch (error) {
      console.error('Error saving comentario:', error);
      toast.error('Error al guardar comentario');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !expediente) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-3 rounded-t-xl flex items-center justify-between">
          <div>
            <p className="text-xs opacity-80">Comentarios</p>
            <h2 className="font-bold">{expediente.radicado}</h2>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 rounded-lg p-1.5">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-8 h-8 mx-auto mb-2 animate-spin" />
              Cargando...
            </div>
          ) : comentarios.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay comentarios aún</p>
            </div>
          ) : (
            <div className="space-y-3">
              {comentarios.map((com, index) => (
                <div key={com.id || index} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900 text-sm">{com.usuarioNombre}</span>
                    <span className="text-xs text-gray-500">
                      {com.createdAt ? new Date(com.createdAt).toLocaleString('es-CO') : ''}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{com.contenido}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t p-4 flex gap-2">
          <input
            type="text"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            placeholder="Escriba un comentario..."
            value={nuevoComentario}
            onChange={(e) => setNuevoComentario(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleGuardar()}
          />
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleGuardar}
            disabled={saving || !nuevoComentario.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
function TarjetaExpediente({ expediente, onVerDetalle, onVerComentarios }: {
  expediente: Expediente;
  onVerDetalle: (exp: Expediente) => void;
  onVerComentarios: (exp: Expediente) => void;
}) {
  const [{ isDragging }, drag] = useDrag({
    type: 'EXPEDIENTE',
    item: expediente,
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  const getColorAlerta = (color: ColorAlerta) => {
    switch (color) {
      case 'VERDE': return { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle };
      case 'AMARILLO': return { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock };
      case 'ROJO': return { bg: 'bg-red-100', text: 'text-red-800', icon: AlertCircle };
      case 'VENCIDO': return { bg: 'bg-red-900', text: 'text-white', icon: XCircle };
    }
  };

  const alertaColor = getColorAlerta(expediente.colorAlerta);
  const AlertIcon = alertaColor.icon;

  return (
    <motion.div
      ref={drag}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: isDragging ? 0.5 : 1, scale: isDragging ? 0.95 : 1 }}
      className="cursor-move"
    >
      <Card className="bg-white border border-gray-200 hover:shadow-md transition-all" style={{ height: '380px', minHeight: '380px', maxHeight: '380px' }}>
        <div className="h-1 bg-blue-600" style={{ background: '#003DA5' }} />

        <div className="p-3 flex flex-col overflow-y-auto" style={{ height: 'calc(100% - 4px)' }}>
          {/* Header */}
          <div className="flex items-start justify-between mb-2 cursor-pointer hover:bg-gray-50 -mx-3 -mt-0 px-3 pt-2 pb-2 rounded-t-lg" onClick={() => onVerDetalle(expediente)}>
            <div className="flex items-center gap-2 flex-1">
              <div className="p-1.5 rounded-lg bg-blue-50">
                <Scale className="w-4 h-4 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-sm truncate text-gray-900">{expediente.radicado}</h4>
                <p className="text-xs text-gray-500 truncate">{expediente.medioControl}</p>
              </div>
            </div>
            <Badge className="text-xs px-2 font-semibold ml-2 bg-blue-50 text-blue-700 border border-blue-200">
              {expediente.jurisdiccion}
            </Badge>
          </div>

          {/* Demandante */}
          <div className="mb-2 pb-2 border-b border-gray-200">
            <p className="text-xs text-gray-500 mb-0.5">👤 Demandante:</p>
            <p className="font-bold text-sm text-gray-900 line-clamp-1">{expediente.demandante.nombre}</p>
            <p className="text-xs text-gray-600">{expediente.demandante.identificacion}</p>
          </div>

          {/* Demandado */}
          <div className="mb-2 pb-2 border-b border-gray-200">
            <p className="text-xs text-gray-500 mb-0.5">⚖️ Demandado:</p>
            <p className="font-bold text-sm text-gray-900 line-clamp-1">{expediente.demandado.nombre}</p>
            <p className="text-xs text-gray-600">{expediente.demandado.identificacion}</p>
          </div>

          {/* Abogado Asignado */}
          <div className="mb-3 pb-2 border-b border-gray-200">
            <p className="text-xs text-gray-500 mb-0.5">👨‍⚖️ Abogado:</p>
            <p className="font-bold text-sm text-gray-900 line-clamp-1">{expediente.abogadoAsignado.nombre}</p>
            <p className="text-xs text-gray-600">{expediente.abogadoAsignado.identificacion}</p>
          </div>

          {/* Juzgado */}
          <div className="mb-3">
            <p className="text-xs text-gray-700 line-clamp-2">{expediente.juzgado}</p>
          </div>

          {/* Días Restantes */}
          <div className="flex items-center justify-between mb-3">
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${alertaColor.bg}`}>
              <AlertIcon className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">{expediente.tiempoRestante}</span>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="mt-auto space-y-1.5">
            <Button
              className="w-full text-xs py-2 bg-blue-600 hover:bg-blue-700 text-white"
              size="sm"
              onClick={() => onVerDetalle(expediente)}
            >
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              Expediente
            </Button>
            <div className="grid grid-cols-2 gap-1.5">
              <Button
                variant="outline"
                className="text-xs py-2"
                size="sm"
                onClick={() => onVerComentarios(expediente)}
              >
                <MessageSquare className="w-3.5 h-3.5 mr-1" />
                Comentarios
              </Button>
              <Button variant="outline" className="text-xs py-2" size="sm">
                <History className="w-3.5 h-3.5 mr-1" />
                Historial
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function ColumnaKanban({ etapa, expedientes, onDrop, onVerDetalle, onVerComentarios }: {
  etapa: typeof ETAPAS[0];
  expedientes: Expediente[];
  onDrop: (item: Expediente, etapa: Etapa) => void;
  onVerDetalle: (exp: Expediente) => void;
  onVerComentarios: (exp: Expediente) => void;
}) {
  const [{ isOver }, drop] = useDrop({
    accept: 'EXPEDIENTE',
    drop: (item: Expediente) => onDrop(item, etapa.id),
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  });

  return (
    <div ref={drop} className={`flex flex-col h-full transition-all ${isOver ? 'bg-blue-50' : 'bg-gray-50'}`} style={{ minWidth: '320px', maxWidth: '320px' }}>
      <div className="p-3 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: etapa.color }} />
            <h3 className="font-bold text-sm text-gray-900">{etapa.label}</h3>
          </div>
          <Badge className="bg-gray-100 text-gray-700">{expedientes.length}</Badge>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {expedientes.map((exp) => (
          <TarjetaExpediente key={exp.id} expediente={exp} onVerDetalle={onVerDetalle} onVerComentarios={onVerComentarios} />
        ))}
      </div>
    </div>
  );
}

export function KanbanDefensaJudicial() {
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [vistaActual, setVistaActual] = useState<'kanban' | 'lista'>('kanban');
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [selectedExpediente, setSelectedExpediente] = useState<Expediente | null>(null);
  const [detalleAbierto, setDetalleAbierto] = useState(false);

  // Comentarios modal state
  const [comentariosExpediente, setComentariosExpediente] = useState<Expediente | null>(null);
  const [comentariosAbierto, setComentariosAbierto] = useState(false);

  const handleVerDetalle = (expediente: Expediente) => {
    setSelectedExpediente(expediente);
    setDetalleAbierto(true);
  };

  const handleVerComentariosCard = (expediente: Expediente) => {
    setComentariosExpediente(expediente);
    setComentariosAbierto(true);
  };

  // Fetch initial data


  useEffect(() => {
    fetchExpedientes();
  }, []);

  const fetchExpedientes = async () => {
    try {
      // Fetch both expedientes and abogados in parallel
      const [data, abogadosList] = await Promise.all([
        legalService.getExpedientes(),
        legalService.getAbogadosDashboard()
      ]);

      // Create a map of abogado IDs to names for quick lookup
      const abogadosMap = new Map<string, { nombre: string; email: string }>();
      if (abogadosList) {
        abogadosList.forEach((a: any) => {
          abogadosMap.set(a.id, {
            nombre: a.nombreCompleto || a.nombre || 'Sin nombre',
            email: a.email || 'N/A'
          });
        });
      }

      if (data) {
        // Función para calcular días hábiles entre dos fechas (excluyendo fines de semana)
        const calcularDiasHabiles = (fechaInicio: Date, fechaFin: Date): number => {
          let dias = 0;
          const fecha = new Date(fechaInicio);
          fecha.setHours(0, 0, 0, 0);
          const fin = new Date(fechaFin);
          fin.setHours(0, 0, 0, 0);

          while (fecha <= fin) {
            const dia = fecha.getDay();
            if (dia !== 0 && dia !== 6) { // Excluir domingos (0) y sábados (6)
              dias++;
            }
            fecha.setDate(fecha.getDate() + 1);
          }
          return dias;
        };

        const mappedData: Expediente[] = data.map((item: any) => {
          // Resolve abogado name from ID
          const abogadoId = item.abogadoSustanciador;
          const abogadoInfo = abogadoId ? abogadosMap.get(abogadoId) : null;

          // Calculate remaining time
          const fechaVencimiento = item.fechaVencimientoTermino ? new Date(item.fechaVencimientoTermino) : null;
          const now = new Date();
          let diasRestantes = 0;
          let tiempoRestante = 'Por definir';
          const tipoConteo = item.tipoConteoTermino || 'HABILES'; // Default a días hábiles

          if (fechaVencimiento) {
            if (tipoConteo === 'HABILES') {
              // Calcular días hábiles restantes
              if (fechaVencimiento > now) {
                diasRestantes = calcularDiasHabiles(now, fechaVencimiento);
                tiempoRestante = `${diasRestantes} días hábiles`;
              } else {
                diasRestantes = -calcularDiasHabiles(fechaVencimiento, now);
                tiempoRestante = `Vencido hace ${Math.abs(diasRestantes)} días hábiles`;
              }
            } else {
              // Días calendario (simple)
              const diff = fechaVencimiento.getTime() - now.getTime();
              const dayMs = 1000 * 60 * 60 * 24;
              diasRestantes = Math.ceil(diff / dayMs);

              if (diff > 0) {
                tiempoRestante = `${diasRestantes} días calendario`;
              } else {
                tiempoRestante = `Vencido hace ${Math.abs(diasRestantes)} días calendario`;
              }
            }
          } else {
            diasRestantes = item.terminoProcesalDias || 30;
            const tipoLabel = tipoConteo === 'HABILES' ? 'hábiles' : 'calendario';
            tiempoRestante = `${diasRestantes} días ${tipoLabel}`;
          }

          return {
            id: item.id, // UUID
            radicado: item.radicado,
            jurisdiccion: item.jurisdiccion as Jurisdiccion,
            demandante: { nombre: item.demandante, identificacion: item.numeroIdDemandante || 'N/A' },
            demandado: { nombre: item.demandado, identificacion: item.numeroIdDemandado || 'N/A' },
            juzgado: item.juzgadoConocimiento || 'Por definir',
            medioControl: item.medioControl || 'Nulidad',
            abogadoAsignado: {
              nombre: item.abogadoAsignado?.nombre || abogadoInfo?.nombre || item.abogadoSustanciador || 'Por asignar',
              identificacion: item.abogadoAsignado?.identificacion || abogadoInfo?.email || 'N/A'
            },
            etapa: mapEtapa(item.etapaProcesal),
            diasRestantes,
            tiempoRestante,
            tipoConteoTermino: tipoConteo as 'HABILES' | 'CALENDARIO',
            colorAlerta: item.riesgoPrescripcion ? 'ROJO' : 'VERDE',
            fechaNotificacion: item.fechaNotificacion,
            valorDemanda: Number(item.cuantia) || 0,
          };
        });
        setExpedientes(mappedData);
      }
    } catch (error) {
      console.error('Error fetching expedientes:', error);
      toast.error('Error al cargar expedientes');
    }
  };

  const mapEtapa = (etapa: string): Etapa => {
    // Map BE stages to FE Kanban stages
    const map: Record<string, Etapa> = {
      'RADICACION': 'ADMISION',
      'ADMISION': 'ADMISION',
      'CONTESTACION': 'CONTESTACION',
      'PRUEBAS': 'PRUEBAS',
      'ALEGATOS': 'ALEGATOS',
      'SENTENCIA': 'SENTENCIA',
      'CERRADO': 'CERRADO'
    };
    return map[etapa] || 'ADMISION';
  };


  const handleDrop = async (item: Expediente, nuevaEtapa: Etapa) => {
    if (!nuevaEtapa) {
      console.error('❌ Intento de mover expediente a etapa indefinida (undefined/null)');
      return;
    }

    // Guard to prevent unnecessary updates
    if (item.etapa === nuevaEtapa) return;

    // Validar tareas pendientes antes de cambiar etapa
    try {
      const tareas = await legalService.getTareasByExpediente(item.id);
      const tareasPendientes = (tareas || []).filter(
        (t: any) => t.estado !== 'completada' && t.estado !== 'cancelada'
      );
      if (tareasPendientes.length > 0) {
        toast.error('No se puede cambiar de etapa', {
          description: `El expediente tiene ${tareasPendientes.length} tarea(s) pendiente(s). Complete o cancele todas las tareas antes de cambiar de etapa.`
        });
        return;
      }
    } catch (error) {
      // Si falla la consulta de tareas, permitir el cambio (fallo silencioso)
      console.warn('No se pudieron verificar tareas:', error);
    }

    // Optimistic Update
    const previousExpedientes = [...expedientes];
    setExpedientes(prevExpedientes =>
      prevExpedientes.map(exp =>
        exp.id === item.id ? { ...exp, etapa: nuevaEtapa } : exp
      )
    );

    try {
      // Call Backend to update
      await legalService.updateExpediente(item.id, {
        etapaProcesal: nuevaEtapa
      });
      toast.success(`Expediente ${item.radicado} movido a ${nuevaEtapa}`);
    } catch (error) {
      console.error('Error updating stage:', error);
      toast.error('Error al actualizar etapa');
      setExpedientes(previousExpedientes);
    }
  };

  const expedientesPorEtapa = (etapa: Etapa) => expedientes.filter(exp => exp.etapa === etapa);

  // Estadísticas
  const totalExpedientes = expedientes.length;
  const expedientesConAlerta = expedientes.filter(exp => exp.colorAlerta === 'ROJO' || exp.colorAlerta === 'VENCIDO').length;
  const expedientesEnProceso = expedientes.filter(exp => exp.etapa !== 'CERRADO').length;

  const handleExpedienteCreado = (data: any) => {
    // data is the full backend entity response
    const nuevoExpediente: Expediente = {
      id: data.id,
      radicado: data.radicado,
      jurisdiccion: (data.jurisdiccion as Jurisdiccion),
      demandante: { nombre: data.demandante || 'Sin Nombre', identificacion: data.numeroIdDemandante || 'N/A' },
      demandado: { nombre: data.demandado || 'Sin Nombre', identificacion: data.numeroIdDemandado || 'N/A' },
      juzgado: data.juzgadoConocimiento || 'Por definir',
      medioControl: data.medioControl || 'Nulidad',
      abogadoAsignado: { nombre: data.abogadoSustanciador || 'Por asignar', identificacion: 'N/A' },
      etapa: mapEtapa(data.etapaProcesal),
      diasRestantes: data.terminoProcesalDias || 30,
      tiempoRestante: `${data.terminoProcesalDias || 30} días`,
      colorAlerta: data.riesgoPrescripcion ? 'ROJO' : 'VERDE',
      fechaNotificacion: data.fechaNotificacion,
      valorDemanda: Number(data.cuantia) || 0,
    };

    setExpedientes((prev) => [nuevoExpediente, ...prev]);
    toast.success(`Expediente ${data.radicado} agregado al tablero`);
    setFormularioAbierto(false);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col h-screen bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Scale className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Tablero Kanban Operativo</h1>
                <p className="text-sm text-gray-600">Defensa Judicial de 4 Jurisdicciones</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Estadísticas rápidas */}
              <div className="hidden md:flex items-center gap-3 mr-4 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-sm font-semibold text-gray-700">{totalExpedientes}</span>
                  <span className="text-xs text-gray-500">Total</span>
                </div>
                <div className="w-px h-4 bg-gray-300" />
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  <span className="text-sm font-semibold text-gray-700">{expedientesEnProceso}</span>
                  <span className="text-xs text-gray-500">En Proceso</span>
                </div>
                <div className="w-px h-4 bg-gray-300" />
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-sm font-semibold text-gray-700">{expedientesConAlerta}</span>
                  <span className="text-xs text-gray-500">Alertas</span>
                </div>
              </div>

              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filtros
              </Button>
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <Button
                  variant={vistaActual === 'kanban' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setVistaActual('kanban')}
                  className={vistaActual === 'kanban' ? 'bg-white shadow-sm text-blue-700 font-semibold' : 'text-gray-600'}
                >
                  <Columns3 className="w-4 h-4 mr-2" />
                  Kanban
                </Button>
                <Button
                  variant={vistaActual === 'lista' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setVistaActual('lista')}
                  className={vistaActual === 'lista' ? 'bg-white shadow-sm text-blue-700 font-semibold' : 'text-gray-600'}
                >
                  <List className="w-4 h-4 mr-2" />
                  Lista
                </Button>
              </div>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => setFormularioAbierto(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Expediente
              </Button>
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        {vistaActual === 'kanban' ? (
          <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <div className="flex h-full gap-4 p-4" style={{ minWidth: 'max-content' }}>
              {ETAPAS.map((etapa) => (
                <ColumnaKanban
                  key={etapa.id}
                  etapa={etapa}
                  expedientes={expedientesPorEtapa(etapa.id)}
                  onDrop={handleDrop}
                  onVerDetalle={handleVerDetalle}
                  onVerComentarios={handleVerComentariosCard}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto bg-gray-50">
            <ModuloDefensaJudicial
              onVolverKanban={() => setVistaActual('kanban')}
              hideHeader={true} // We might need this prop to avoid double headers
            />
          </div>
        )}
      </div>

      {/* Modal Formulario Creación */}
      <FormularioExpedienteJudicial
        isOpen={formularioAbierto}
        onClose={() => setFormularioAbierto(false)}
        onExpedienteCreado={handleExpedienteCreado}
      />

      {/* Modal Detalle Expediente */}
      <DetalleExpedienteModal
        expediente={selectedExpediente}
        isOpen={detalleAbierto}
        onClose={() => setDetalleAbierto(false)}
      />

      {/* Modal Comentarios (desde tarjeta) */}
      <ComentariosModal
        expediente={comentariosExpediente}
        isOpen={comentariosAbierto}
        onClose={() => setComentariosAbierto(false)}
      />
    </DndProvider>
  );
}

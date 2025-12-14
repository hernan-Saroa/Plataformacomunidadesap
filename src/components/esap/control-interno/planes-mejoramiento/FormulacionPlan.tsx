/**
 * FORMULACIÓN DE PLAN DE MEJORAMIENTO - RF010
 * Formato EM-FO-002 - Excel de Plan de Mejoramiento
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft, Plus, Save, Send, FileText, AlertTriangle, CheckCircle2,
  Edit, Trash2, Calendar, User, Target, DollarSign, Clock
} from 'lucide-react';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { ResponsiveModal } from '../../shared/ResponsiveModal';
import { toast } from 'sonner@2.0.3';

interface PlanMejoramiento {
  id: string;
  codigo: string;
  auditoria: string;
  codigoAuditoria: string;
  territorial: string;
  sede: string;
  responsableArea: string;
}

interface Hallazgo {
  id: string;
  codigo: string;
  descripcion: string;
  tipo: 'no-conformidad' | 'observacion' | 'oportunidad-mejora';
  gravedad: 'Crítica' | 'Alta' | 'Media' | 'Baja';
}

interface AccionCorrectiva {
  id: string;
  hallazgoId: string;
  descripcion: string;
  responsable: string;
  fechaInicio: string;
  fechaFin: string;
  recursos: string;
  indicador: string;
  metaIndicador: string;
  estado: 'programada' | 'en-progreso' | 'implementada' | 'vencida';
  porcentajeAvance: number;
  observaciones: string;
}

interface FormulacionPlanProps {
  plan: PlanMejoramiento | null;
  onVolver: () => void;
}

const RESPONSABLES_AREA = [
  'Director Financiero - Juan Carlos Pérez',
  'Directora Académica - María López',
  'Jefe RRHH - Carlos Gómez',
  'Coord. Contabilidad - Ana Ramírez',
  'Coord. Presupuesto - Luis Martínez',
  'Jefe Tesorería - Sandra Torres',
  'Coord. TI - Fernando Castro'
];

// Hallazgos mock
const MOCK_HALLAZGOS: Hallazgo[] = [
  {
    id: '1',
    codigo: 'HAL-2024-001',
    descripcion: 'Incumplimiento en conciliaciones bancarias mensuales durante agosto y septiembre',
    tipo: 'no-conformidad',
    gravedad: 'Alta'
  },
  {
    id: '2',
    codigo: 'HAL-2024-002',
    descripcion: 'Falta de segregación de funciones en aprobación y pago de cuentas',
    tipo: 'no-conformidad',
    gravedad: 'Crítica'
  },
  {
    id: '3',
    codigo: 'HAL-2024-003',
    descripcion: 'Oportunidad de mejora en automatización de reportes financieros',
    tipo: 'oportunidad-mejora',
    gravedad: 'Baja'
  }
];

// Acciones mock
const MOCK_ACCIONES: AccionCorrectiva[] = [
  {
    id: '1',
    hallazgoId: '1',
    descripcion: 'Elaborar las conciliaciones bancarias pendientes de agosto y septiembre con el debido soporte documental',
    responsable: 'Coord. Contabilidad - Ana Ramírez',
    fechaInicio: '2024-12-23',
    fechaFin: '2024-12-31',
    recursos: 'Equipo contable actual, sistemas existentes',
    indicador: 'Número de conciliaciones completadas / Total requeridas',
    metaIndicador: '100% (2/2 meses)',
    estado: 'implementada',
    porcentajeAvance: 100,
    observaciones: 'Completadas ambas conciliaciones con soportes adjuntos'
  },
  {
    id: '2',
    hallazgoId: '1',
    descripcion: 'Implementar recordatorio automático mensual para elaboración de conciliaciones antes del día 5',
    responsable: 'Coord. Contabilidad - Ana Ramírez',
    fechaInicio: '2025-01-02',
    fechaFin: '2025-01-15',
    recursos: 'Sistema de alertas Microsoft Outlook',
    indicador: 'Conciliaciones realizadas a tiempo / Total mensual',
    metaIndicador: '100% durante 3 meses consecutivos',
    estado: 'en-progreso',
    porcentajeAvance: 60,
    observaciones: 'Recordatorio configurado, en proceso de validación'
  },
  {
    id: '3',
    hallazgoId: '2',
    descripcion: 'Contratar funcionario para el cargo de Coordinador de Pagos según proceso de selección en curso',
    responsable: 'Jefe RRHH - Carlos Gómez',
    fechaInicio: '2024-12-15',
    fechaFin: '2025-01-31',
    recursos: 'Presupuesto aprobado para nueva contratación',
    indicador: 'Cargo ocupado (Sí/No)',
    metaIndicador: 'Sí - Con funcionario posesionado',
    estado: 'en-progreso',
    porcentajeAvance: 45,
    observaciones: 'Proceso de selección en fase de entrevistas'
  },
  {
    id: '4',
    hallazgoId: '2',
    descripcion: 'Actualizar manual de funciones y procedimientos de pagos con segregación de responsabilidades',
    responsable: 'Director Financiero - Juan Carlos Pérez',
    fechaInicio: '2025-02-01',
    fechaFin: '2025-02-28',
    recursos: 'Asesoría jurídica interna',
    indicador: 'Manual actualizado y aprobado (Sí/No)',
    metaIndicador: 'Sí - Con aprobación formal',
    estado: 'programada',
    porcentajeAvance: 0,
    observaciones: 'Pendiente de inicio tras posesión nuevo funcionario'
  }
];

export function FormulacionPlan({ plan, onVolver }: FormulacionPlanProps) {
  const [hallazgos] = useState<Hallazgo[]>(MOCK_HALLAZGOS);
  const [acciones, setAcciones] = useState<AccionCorrectiva[]>(MOCK_ACCIONES);
  const [modalNuevaAccion, setModalNuevaAccion] = useState(false);
  const [hallazgoSeleccionado, setHallazgoSeleccionado] = useState<string | null>(null);
  const [accionEditando, setAccionEditando] = useState<AccionCorrectiva | null>(null);

  const [formAccion, setFormAccion] = useState({
    descripcion: '',
    responsable: '',
    fechaInicio: '',
    fechaFin: '',
    recursos: '',
    indicador: '',
    metaIndicador: '',
    observaciones: ''
  });

  const resetForm = () => {
    setFormAccion({
      descripcion: '',
      responsable: '',
      fechaInicio: '',
      fechaFin: '',
      recursos: '',
      indicador: '',
      metaIndicador: '',
      observaciones: ''
    });
    setHallazgoSeleccionado(null);
    setAccionEditando(null);
  };

  const handleAgregarAccion = () => {
    if (!hallazgoSeleccionado || !formAccion.descripcion || !formAccion.responsable ||
        !formAccion.fechaInicio || !formAccion.fechaFin || !formAccion.indicador || !formAccion.metaIndicador) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }

    if (accionEditando) {
      // Editar acción existente
      const updatedAcciones = acciones.map(a =>
        a.id === accionEditando.id
          ? {
              ...a,
              descripcion: formAccion.descripcion,
              responsable: formAccion.responsable,
              fechaInicio: formAccion.fechaInicio,
              fechaFin: formAccion.fechaFin,
              recursos: formAccion.recursos,
              indicador: formAccion.indicador,
              metaIndicador: formAccion.metaIndicador,
              observaciones: formAccion.observaciones
            }
          : a
      );
      setAcciones(updatedAcciones);
      toast.success('Acción correctiva actualizada');
    } else {
      // Nueva acción
      const nuevaAccion: AccionCorrectiva = {
        id: Date.now().toString(),
        hallazgoId: hallazgoSeleccionado,
        descripcion: formAccion.descripcion,
        responsable: formAccion.responsable,
        fechaInicio: formAccion.fechaInicio,
        fechaFin: formAccion.fechaFin,
        recursos: formAccion.recursos,
        indicador: formAccion.indicador,
        metaIndicador: formAccion.metaIndicador,
        estado: 'programada',
        porcentajeAvance: 0,
        observaciones: formAccion.observaciones
      };
      setAcciones([...acciones, nuevaAccion]);
      toast.success('Acción correctiva agregada');
    }

    setModalNuevaAccion(false);
    resetForm();
  };

  const handleEditarAccion = (accion: AccionCorrectiva) => {
    setAccionEditando(accion);
    setHallazgoSeleccionado(accion.hallazgoId);
    setFormAccion({
      descripcion: accion.descripcion,
      responsable: accion.responsable,
      fechaInicio: accion.fechaInicio,
      fechaFin: accion.fechaFin,
      recursos: accion.recursos,
      indicador: accion.indicador,
      metaIndicador: accion.metaIndicador,
      observaciones: accion.observaciones
    });
    setModalNuevaAccion(true);
  };

  const handleEliminarAccion = (accionId: string) => {
    setAcciones(acciones.filter(a => a.id !== accionId));
    toast.success('Acción correctiva eliminada');
  };

  const handleAprobarPlan = () => {
    // Validar que todos los hallazgos tengan al menos una acción
    const hallazgosSinAccion = hallazgos.filter(h =>
      !acciones.find(a => a.hallazgoId === h.id)
    );

    if (hallazgosSinAccion.length > 0) {
      toast.error(`Faltan acciones correctivas para ${hallazgosSinAccion.length} hallazgo(s)`);
      return;
    }

    toast.success('Plan de Mejoramiento aprobado y enviado al área responsable');
    setTimeout(() => onVolver(), 1500);
  };

  const getTipoHallazgoColor = (tipo: string) => {
    switch (tipo) {
      case 'no-conformidad': return '#EF4444';
      case 'observacion': return '#F59E0B';
      case 'oportunidad-mejora': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getEstadoAccionColor = (estado: string) => {
    switch (estado) {
      case 'implementada': return '#10B981';
      case 'en-progreso': return '#3B82F6';
      case 'programada': return '#6B7280';
      case 'vencida': return '#EF4444';
      default: return '#6B7280';
    }
  };

  // Calcular estadísticas
  const totalAcciones = acciones.length;
  const accionesImplementadas = acciones.filter(a => a.estado === 'implementada').length;
  const porcentajeGeneral = totalAcciones > 0
    ? Math.round((accionesImplementadas / totalAcciones) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onVolver}
            className="border-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div>
            <h2 className="text-xl font-black" style={{ color: '#1F2937' }}>
              {plan ? `Plan de Mejoramiento ${plan.codigo}` : 'Nuevo Plan de Mejoramiento'}
            </h2>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              {plan ? `${plan.codigoAuditoria} - ${plan.auditoria}` : 'Formulación de acciones correctivas'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="border-2">
            <Save className="w-4 h-4 mr-2" />
            Guardar Borrador
          </Button>
          <Button
            onClick={handleAprobarPlan}
            style={{ background: '#10B981', color: '#FFFFFF' }}
          >
            <Send className="w-4 h-4 mr-2" />
            Aprobar y Enviar
          </Button>
        </div>
      </div>

      {/* PROGRESO GENERAL */}
      <motion.div
        className="p-6 rounded-2xl border-2"
        style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <div className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>
              Total Hallazgos
            </div>
            <div className="text-2xl font-black" style={{ color: '#EF4444' }}>
              {hallazgos.length}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>
              Total Acciones
            </div>
            <div className="text-2xl font-black" style={{ color: '#3B82F6' }}>
              {totalAcciones}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>
              Implementadas
            </div>
            <div className="text-2xl font-black" style={{ color: '#10B981' }}>
              {accionesImplementadas}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>
              Progreso General
            </div>
            <div className="text-2xl font-black" style={{ color: '#F97316' }}>
              {porcentajeGeneral}%
            </div>
          </div>
        </div>

        <div className="h-4 rounded-full" style={{ background: '#E5E7EB' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ background: '#F97316', width: `${porcentajeGeneral}%` }}
          />
        </div>
      </motion.div>

      {/* HALLAZGOS Y ACCIONES CORRECTIVAS */}
      <div className="space-y-6">
        {hallazgos.map((hallazgo) => {
          const accionesHallazgo = acciones.filter(a => a.hallazgoId === hallazgo.id);

          return (
            <motion.div
              key={hallazgo.id}
              className="p-6 rounded-2xl border-2"
              style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* HEADER DEL HALLAZGO */}
              <div className="flex items-start justify-between mb-4 pb-4 border-b-2" style={{ borderColor: '#E5E7EB' }}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5" style={{ color: getTipoHallazgoColor(hallazgo.tipo) }} />
                    <span className="font-bold" style={{ color: '#6B7280' }}>
                      {hallazgo.codigo}
                    </span>
                    <Badge
                      style={{
                        background: `${getTipoHallazgoColor(hallazgo.tipo)}20`,
                        color: getTipoHallazgoColor(hallazgo.tipo)
                      }}
                    >
                      {hallazgo.tipo === 'no-conformidad' ? 'No Conformidad' :
                       hallazgo.tipo === 'observacion' ? 'Observación' : 'Oportunidad de Mejora'}
                    </Badge>
                    <Badge
                      style={{
                        background: `${hallazgo.gravedad === 'Crítica' ? '#DC2626' : 
                                      hallazgo.gravedad === 'Alta' ? '#EF4444' : 
                                      hallazgo.gravedad === 'Media' ? '#F59E0B' : '#10B981'}20`,
                        color: hallazgo.gravedad === 'Crítica' ? '#DC2626' : 
                               hallazgo.gravedad === 'Alta' ? '#EF4444' : 
                               hallazgo.gravedad === 'Media' ? '#F59E0B' : '#10B981'
                      }}
                    >
                      Gravedad: {hallazgo.gravedad}
                    </Badge>
                  </div>
                  <p className="text-sm" style={{ color: '#1F2937' }}>
                    {hallazgo.descripcion}
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setHallazgoSeleccionado(hallazgo.id);
                    setModalNuevaAccion(true);
                  }}
                  style={{ background: '#F97316', color: '#FFFFFF' }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Acción
                </Button>
              </div>

              {/* ACCIONES CORRECTIVAS */}
              {accionesHallazgo.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: '#9CA3AF' }} />
                  <p className="text-sm font-semibold mb-2" style={{ color: '#6B7280' }}>
                    No hay acciones correctivas para este hallazgo
                  </p>
                  <Button
                    size="sm"
                    onClick={() => {
                      setHallazgoSeleccionado(hallazgo.id);
                      setModalNuevaAccion(true);
                    }}
                    style={{ background: '#F97316', color: '#FFFFFF' }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Primera Acción
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {accionesHallazgo.map((accion, index) => (
                    <motion.div
                      key={accion.id}
                      className="p-4 rounded-xl border-2 hover:shadow-md transition-all"
                      style={{ background: '#F9FAFB', borderColor: '#E5E7EB' }}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-white"
                          style={{ background: '#F97316' }}
                        >
                          {index + 1}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <p className="font-bold mb-2" style={{ color: '#1F2937' }}>
                                {accion.descripcion}
                              </p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                <div className="flex items-center gap-2" style={{ color: '#6B7280' }}>
                                  <User className="w-4 h-4" />
                                  <span className="font-semibold">Responsable:</span>
                                  <span>{accion.responsable}</span>
                                </div>
                                <div className="flex items-center gap-2" style={{ color: '#6B7280' }}>
                                  <Calendar className="w-4 h-4" />
                                  <span className="font-semibold">Fechas:</span>
                                  <span>
                                    {new Date(accion.fechaInicio).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })} -{' '}
                                    {new Date(accion.fechaFin).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                                  </span>
                                </div>
                                {accion.recursos && (
                                  <div className="flex items-start gap-2 md:col-span-2" style={{ color: '#6B7280' }}>
                                    <DollarSign className="w-4 h-4 mt-0.5" />
                                    <div>
                                      <span className="font-semibold">Recursos:</span>{' '}
                                      <span>{accion.recursos}</span>
                                    </div>
                                  </div>
                                )}
                                <div className="flex items-start gap-2 md:col-span-2" style={{ color: '#6B7280' }}>
                                  <Target className="w-4 h-4 mt-0.5" />
                                  <div>
                                    <span className="font-semibold">Indicador:</span>{' '}
                                    <span>{accion.indicador}</span>
                                    <br />
                                    <span className="font-semibold">Meta:</span>{' '}
                                    <span>{accion.metaIndicador}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col gap-2 ml-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditarAccion(accion)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEliminarAccion(accion.id)}
                                style={{ color: '#EF4444' }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          {accion.observaciones && (
                            <div className="mb-3 p-3 rounded-lg text-sm" style={{ background: '#FEF3C7', color: '#78350F' }}>
                              <span className="font-semibold">Observaciones:</span> {accion.observaciones}
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <Badge
                              style={{
                                background: `${getEstadoAccionColor(accion.estado)}20`,
                                color: getEstadoAccionColor(accion.estado)
                              }}
                            >
                              {accion.estado === 'implementada' ? 'Implementada' :
                               accion.estado === 'en-progreso' ? 'En Progreso' :
                               accion.estado === 'programada' ? 'Programada' : 'Vencida'}
                            </Badge>
                            <div className="flex items-center gap-2">
                              <div className="h-2 rounded-full w-24" style={{ background: '#E5E7EB' }}>
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    background: getEstadoAccionColor(accion.estado),
                                    width: `${accion.porcentajeAvance}%`
                                  }}
                                />
                              </div>
                              <span className="text-sm font-bold" style={{ color: '#6B7280' }}>
                                {accion.porcentajeAvance}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* MODAL NUEVA/EDITAR ACCIÓN */}
      <ResponsiveModal
        isOpen={modalNuevaAccion}
        onClose={() => {
          setModalNuevaAccion(false);
          resetForm();
        }}
        title={accionEditando ? 'Editar Acción Correctiva' : 'Nueva Acción Correctiva'}
        subtitle={`Formato EM-FO-002 - Plan de Mejoramiento`}
        icon={<FileText className="w-6 h-6" style={{ color: '#F97316' }} />}
        maxWidth="3xl"
        footer={
          <div className="flex items-center gap-3">
            <button
              onClick={handleAgregarAccion}
              className="flex-1 px-6 py-3 rounded-xl font-semibold"
              style={{ background: '#F97316', color: '#FFFFFF' }}
            >
              <Save className="w-4 h-4 mr-2 inline" />
              {accionEditando ? 'Guardar Cambios' : 'Agregar Acción'}
            </button>
            <button
              onClick={() => {
                setModalNuevaAccion(false);
                resetForm();
              }}
              className="px-6 py-3 rounded-xl font-semibold"
              style={{ background: '#F3F4F6', color: '#4B5563' }}
            >
              Cancelar
            </button>
          </div>
        }
      >
        <div className="space-y-4 p-1">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
              Descripción de la Acción Correctiva *
            </label>
            <textarea
              rows={3}
              required
              className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#F97316]"
              style={{ borderColor: '#E5E7EB' }}
              value={formAccion.descripcion}
              onChange={(e) => setFormAccion({ ...formAccion, descripcion: e.target.value })}
              placeholder="Describe la acción correctiva a implementar..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                Responsable de la Acción *
              </label>
              <select
                required
                className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#F97316]"
                style={{ borderColor: '#E5E7EB' }}
                value={formAccion.responsable}
                onChange={(e) => setFormAccion({ ...formAccion, responsable: e.target.value })}
              >
                <option value="">Seleccione responsable...</option>
                {RESPONSABLES_AREA.map(resp => (
                  <option key={resp} value={resp}>{resp}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                Recursos Necesarios
              </label>
              <input
                type="text"
                className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#F97316]"
                style={{ borderColor: '#E5E7EB' }}
                value={formAccion.recursos}
                onChange={(e) => setFormAccion({ ...formAccion, recursos: e.target.value })}
                placeholder="Ej: Presupuesto $X, Personal, Sistemas..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                Fecha de Inicio *
              </label>
              <input
                type="date"
                required
                className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#F97316]"
                style={{ borderColor: '#E5E7EB' }}
                value={formAccion.fechaInicio}
                onChange={(e) => setFormAccion({ ...formAccion, fechaInicio: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                Fecha de Finalización *
              </label>
              <input
                type="date"
                required
                className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#F97316]"
                style={{ borderColor: '#E5E7EB' }}
                value={formAccion.fechaFin}
                onChange={(e) => setFormAccion({ ...formAccion, fechaFin: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
              Indicador de Cumplimiento *
            </label>
            <input
              type="text"
              required
              className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#F97316]"
              style={{ borderColor: '#E5E7EB' }}
              value={formAccion.indicador}
              onChange={(e) => setFormAccion({ ...formAccion, indicador: e.target.value })}
              placeholder="Ej: Número de conciliaciones completadas / Total requeridas"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
              Meta del Indicador *
            </label>
            <input
              type="text"
              required
              className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#F97316]"
              style={{ borderColor: '#E5E7EB' }}
              value={formAccion.metaIndicador}
              onChange={(e) => setFormAccion({ ...formAccion, metaIndicador: e.target.value })}
              placeholder="Ej: 100% (2/2 meses)"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
              Observaciones Iniciales
            </label>
            <textarea
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#F97316]"
              style={{ borderColor: '#E5E7EB' }}
              value={formAccion.observaciones}
              onChange={(e) => setFormAccion({ ...formAccion, observaciones: e.target.value })}
              placeholder="Notas o comentarios adicionales..."
            />
          </div>
        </div>
      </ResponsiveModal>
    </div>
  );
}

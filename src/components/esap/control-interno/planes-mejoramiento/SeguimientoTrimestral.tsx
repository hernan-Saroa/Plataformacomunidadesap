/**
 * SEGUIMIENTO TRIMESTRAL - RF011
 * Fórmulas del Excel EM-FO-002:
 * - Cumplimiento: IF(implementadas >= programadas, 2, IF(implementadas >= 1, 1, 0))
 * - Efectividad: IF(controles <> repeticion, 1, IF(controles="SI", 2, 0))
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Calendar, TrendingUp, CheckCircle2, AlertCircle, Plus,
  Save, Download, Eye, Clock, Target, Users, FileText
} from 'lucide-react';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { ResponsiveModal } from '../../shared/ResponsiveModal';
import { toast } from 'sonner@2.0.3';

interface PlanMejoramiento {
  id: string;
  codigo: string;
  auditoria: string;
  territorial: string;
  sede: string;
}

interface SeguimientoTrimestre {
  id: string;
  trimestre: number;
  año: number;
  fechaInicio: string;
  fechaFin: string;
  fechaSeguimiento?: string;
  estado: 'pendiente' | 'en-curso' | 'completado';
  accionesRevisadas: number;
  accionesTotales: number;
  porcentajeCumplimiento: number; // Calculado con fórmula
  porcentajeEfectividad: number; // Calculado con fórmula
  observacionesGenerales: string;
}

interface RegistroSeguimiento {
  id: string;
  accionId: string;
  trimestreId: string;
  accionDescripcion: string;
  // Datos para fórmula de Cumplimiento
  accionesProgramadas: number;
  accionesImplementadas: number;
  puntajeCumplimiento: 0 | 1 | 2; // Resultado fórmula Excel
  // Datos para fórmula de Efectividad
  controlesImplementados: 'SI' | 'NO' | 'PARCIAL';
  hallazgoSeRepite: 'SI' | 'NO';
  puntajeEfectividad: 0 | 1 | 2; // Resultado fórmula Excel
  observaciones: string;
  evidencias: string[];
}

interface SeguimientoTrimestralProps {
  plan: PlanMejoramiento;
  onVolver: () => void;
}

// Mock de trimestres
const MOCK_TRIMESTRES: SeguimientoTrimestre[] = [
  {
    id: '1',
    trimestre: 1,
    año: 2025,
    fechaInicio: '2025-01-01',
    fechaFin: '2025-03-31',
    fechaSeguimiento: '2025-01-15',
    estado: 'completado',
    accionesRevisadas: 8,
    accionesTotales: 8,
    porcentajeCumplimiento: 75, // Promedio de puntajes
    porcentajeEfectividad: 87,
    observacionesGenerales: 'Primer seguimiento muestra avance satisfactorio en la mayoría de acciones'
  },
  {
    id: '2',
    trimestre: 2,
    año: 2025,
    fechaInicio: '2025-04-01',
    fechaFin: '2025-06-30',
    fechaSeguimiento: '2025-04-15',
    estado: 'completado',
    accionesRevisadas: 8,
    accionesTotales: 8,
    porcentajeCumplimiento: 87,
    porcentajeEfectividad: 100,
    observacionesGenerales: 'Mejora significativa. Todas las acciones en curso o completadas'
  },
  {
    id: '3',
    trimestre: 3,
    año: 2025,
    fechaInicio: '2025-07-01',
    fechaFin: '2025-09-30',
    estado: 'en-curso',
    accionesRevisadas: 3,
    accionesTotales: 8,
    porcentajeCumplimiento: 62,
    porcentajeEfectividad: 66,
    observacionesGenerales: ''
  },
  {
    id: '4',
    trimestre: 4,
    año: 2025,
    fechaInicio: '2025-10-01',
    fechaFin: '2025-12-31',
    estado: 'pendiente',
    accionesRevisadas: 0,
    accionesTotales: 8,
    porcentajeCumplimiento: 0,
    porcentajeEfectividad: 0,
    observacionesGenerales: ''
  }
];

// Mock de registros de seguimiento
const MOCK_REGISTROS: RegistroSeguimiento[] = [
  {
    id: '1',
    accionId: '1',
    trimestreId: '1',
    accionDescripcion: 'Elaborar conciliaciones bancarias pendientes de agosto y septiembre',
    accionesProgramadas: 1,
    accionesImplementadas: 1,
    puntajeCumplimiento: 2, // Formula: implementadas (1) >= programadas (1) = 2 puntos
    controlesImplementados: 'SI',
    hallazgoSeRepite: 'NO',
    puntajeEfectividad: 2, // Formula: controles SI y NO repite = 2 puntos
    observaciones: 'Ambas conciliaciones completadas exitosamente con documentación de soporte',
    evidencias: ['conciliacion-agosto.pdf', 'conciliacion-septiembre.pdf']
  },
  {
    id: '2',
    accionId: '2',
    trimestreId: '1',
    accionDescripcion: 'Implementar recordatorio automático mensual para conciliaciones',
    accionesProgramadas: 1,
    accionesImplementadas: 1,
    puntajeCumplimiento: 2,
    controlesImplementados: 'PARCIAL',
    hallazgoSeRepite: 'NO',
    puntajeEfectividad: 1, // Formula: controles diferentes a repetición = 1 punto
    observaciones: 'Recordatorio configurado pero falta validación completa',
    evidencias: ['config-recordatorio.png']
  },
  {
    id: '3',
    accionId: '3',
    trimestreId: '1',
    accionDescripcion: 'Contratar funcionario para Coordinador de Pagos',
    accionesProgramadas: 1,
    accionesImplementadas: 0,
    puntajeCumplimiento: 0, // Formula: implementadas (0) < programadas = 0 puntos
    controlesImplementados: 'NO',
    hallazgoSeRepite: 'SI',
    puntajeEfectividad: 0, // Formula: hallazgo se repite = 0 puntos
    observaciones: 'Proceso de selección en curso, no completado en este trimestre',
    evidencias: []
  }
];

export function SeguimientoTrimestral({ plan, onVolver }: SeguimientoTrimestralProps) {
  const [trimestres, setTrimestres] = useState<SeguimientoTrimestre[]>(MOCK_TRIMESTRES);
  const [registros, setRegistros] = useState<RegistroSeguimiento[]>(MOCK_REGISTROS);
  const [trimestreSeleccionado, setTrimestreSeleccionado] = useState<SeguimientoTrimestre | null>(null);
  const [modalDetalle, setModalDetalle] = useState(false);
  const [modalNuevoRegistro, setModalNuevoRegistro] = useState(false);

  const [formRegistro, setFormRegistro] = useState({
    accionDescripcion: '',
    accionesProgramadas: 1,
    accionesImplementadas: 0,
    controlesImplementados: 'NO' as 'SI' | 'NO' | 'PARCIAL',
    hallazgoSeRepite: 'NO' as 'SI' | 'NO',
    observaciones: ''
  });

  // FÓRMULA DE CUMPLIMIENTO (del Excel EM-FO-002)
  const calcularPuntajeCumplimiento = (implementadas: number, programadas: number): 0 | 1 | 2 => {
    if (implementadas >= programadas) return 2;
    if (implementadas >= 1) return 1;
    return 0;
  };

  // FÓRMULA DE EFECTIVIDAD (del Excel EM-FO-002)
  const calcularPuntajeEfectividad = (
    controles: 'SI' | 'NO' | 'PARCIAL',
    repeticion: 'SI' | 'NO'
  ): 0 | 1 | 2 => {
    // IF(controles <> repeticion, 1, IF(controles="SI", 2, 0))
    if (controles !== repeticion && controles === 'PARCIAL') return 1;
    if (controles === 'SI' && repeticion === 'NO') return 2;
    if (repeticion === 'SI') return 0;
    return 1;
  };

  const handleAgregarRegistro = () => {
    if (!trimestreSeleccionado || !formRegistro.accionDescripcion) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }

    const puntajeCumplimiento = calcularPuntajeCumplimiento(
      formRegistro.accionesImplementadas,
      formRegistro.accionesProgramadas
    );

    const puntajeEfectividad = calcularPuntajeEfectividad(
      formRegistro.controlesImplementados,
      formRegistro.hallazgoSeRepite
    );

    const nuevoRegistro: RegistroSeguimiento = {
      id: Date.now().toString(),
      accionId: Date.now().toString(),
      trimestreId: trimestreSeleccionado.id,
      accionDescripcion: formRegistro.accionDescripcion,
      accionesProgramadas: formRegistro.accionesProgramadas,
      accionesImplementadas: formRegistro.accionesImplementadas,
      puntajeCumplimiento,
      controlesImplementados: formRegistro.controlesImplementados,
      hallazgoSeRepite: formRegistro.hallazgoSeRepite,
      puntajeEfectividad,
      observaciones: formRegistro.observaciones,
      evidencias: []
    };

    setRegistros([...registros, nuevoRegistro]);

    // Recalcular porcentajes del trimestre
    const registrosTrimestre = [...registros, nuevoRegistro].filter(
      r => r.trimestreId === trimestreSeleccionado.id
    );
    const promedioCumplimiento = Math.round(
      (registrosTrimestre.reduce((sum, r) => sum + r.puntajeCumplimiento, 0) / 
       registrosTrimestre.length / 2) * 100
    );
    const promedioEfectividad = Math.round(
      (registrosTrimestre.reduce((sum, r) => sum + r.puntajeEfectividad, 0) / 
       registrosTrimestre.length / 2) * 100
    );

    const updatedTrimestres = trimestres.map(t =>
      t.id === trimestreSeleccionado.id
        ? {
            ...t,
            accionesRevisadas: registrosTrimestre.length,
            porcentajeCumplimiento: promedioCumplimiento,
            porcentajeEfectividad: promedioEfectividad
          }
        : t
    );
    setTrimestres(updatedTrimestres);

    toast.success('Registro de seguimiento agregado');
    setModalNuevoRegistro(false);
    setFormRegistro({
      accionDescripcion: '',
      accionesProgramadas: 1,
      accionesImplementadas: 0,
      controlesImplementados: 'NO',
      hallazgoSeRepite: 'NO',
      observaciones: ''
    });
  };

  const handleCompletarTrimestre = () => {
    if (!trimestreSeleccionado) return;

    const updated = trimestres.map(t =>
      t.id === trimestreSeleccionado.id
        ? { ...t, estado: 'completado' as const, fechaSeguimiento: new Date().toISOString().split('T')[0] }
        : t
    );
    setTrimestres(updated);
    toast.success(`Seguimiento del Trimestre ${trimestreSeleccionado.trimestre} completado`);
    setModalDetalle(false);
  };

  const getEstadoTrimestreColor = (estado: string) => {
    switch (estado) {
      case 'completado': return '#10B981';
      case 'en-curso': return '#3B82F6';
      case 'pendiente': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getPuntajeColor = (puntaje: number) => {
    if (puntaje === 2) return '#10B981';
    if (puntaje === 1) return '#F59E0B';
    return '#EF4444';
  };

  const getPorcentajeColor = (porcentaje: number) => {
    if (porcentaje >= 80) return '#10B981';
    if (porcentaje >= 60) return '#3B82F6';
    if (porcentaje >= 40) return '#F59E0B';
    return '#EF4444';
  };

  // Calcular promedios generales
  const trimestresCompletados = trimestres.filter(t => t.estado === 'completado');
  const cumplimientoGeneral = trimestresCompletados.length > 0
    ? Math.round(
        trimestresCompletados.reduce((sum, t) => sum + t.porcentajeCumplimiento, 0) / 
        trimestresCompletados.length
      )
    : 0;
  const efectividadGeneral = trimestresCompletados.length > 0
    ? Math.round(
        trimestresCompletados.reduce((sum, t) => sum + t.porcentajeEfectividad, 0) / 
        trimestresCompletados.length
      )
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
              Seguimiento Trimestral - {plan.codigo}
            </h2>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              {plan.auditoria} - {plan.territorial}
            </p>
          </div>
        </div>
        <Button variant="outline" className="border-2">
          <Download className="w-4 h-4 mr-2" />
          Exportar Consolidado
        </Button>
      </div>

      {/* MÉTRICAS GENERALES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          className="p-5 rounded-xl border-2"
          style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg" style={{ background: '#DBEAFE' }}>
              <Calendar className="w-5 h-5" style={{ color: '#3B82F6' }} />
            </div>
            <span className="text-2xl font-black" style={{ color: '#3B82F6' }}>
              {trimestresCompletados.length}/4
            </span>
          </div>
          <h4 className="text-sm font-semibold" style={{ color: '#6B7280' }}>Trimestres Completados</h4>
        </motion.div>

        <motion.div
          className="p-5 rounded-xl border-2"
          style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg" style={{ background: '#D1FAE5' }}>
              <CheckCircle2 className="w-5 h-5" style={{ color: '#10B981' }} />
            </div>
            <span className="text-2xl font-black" style={{ color: '#10B981' }}>
              {cumplimientoGeneral}%
            </span>
          </div>
          <h4 className="text-sm font-semibold" style={{ color: '#6B7280' }}>Cumplimiento General</h4>
          <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Fórmula Excel aplicada</p>
        </motion.div>

        <motion.div
          className="p-5 rounded-xl border-2"
          style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg" style={{ background: '#DDD6FE' }}>
              <Target className="w-5 h-5" style={{ color: '#8B5CF6' }} />
            </div>
            <span className="text-2xl font-black" style={{ color: '#8B5CF6' }}>
              {efectividadGeneral}%
            </span>
          </div>
          <h4 className="text-sm font-semibold" style={{ color: '#6B7280' }}>Efectividad General</h4>
          <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Fórmula Excel aplicada</p>
        </motion.div>

        <motion.div
          className="p-5 rounded-xl border-2"
          style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg" style={{ background: '#FEF3C7' }}>
              <Clock className="w-5 h-5" style={{ color: '#F59E0B' }} />
            </div>
            <span className="text-2xl font-black" style={{ color: '#F59E0B' }}>
              {trimestres.find(t => t.estado === 'en-curso')?.trimestre || '-'}
            </span>
          </div>
          <h4 className="text-sm font-semibold" style={{ color: '#6B7280' }}>Trimestre Actual</h4>
          <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>En seguimiento</p>
        </motion.div>
      </div>

      {/* LÍNEA DE TIEMPO DE TRIMESTRES */}
      <div>
        <h3 className="font-black mb-4" style={{ color: '#1F2937' }}>
          Trimestres del Año 2025
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {trimestres.map((trimestre, index) => {
            const registrosTrimestre = registros.filter(r => r.trimestreId === trimestre.id);

            return (
              <motion.div
                key={trimestre.id}
                className="relative cursor-pointer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => {
                  setTrimestreSeleccionado(trimestre);
                  setModalDetalle(true);
                }}
              >
                <div
                  className="p-5 rounded-2xl border-2 hover:shadow-lg transition-all"
                  style={{
                    background: '#FFFFFF',
                    borderColor: trimestre.estado === 'en-curso' ? getEstadoTrimestreColor(trimestre.estado) : '#E5E7EB'
                  }}
                >
                  {/* Número del trimestre */}
                  <div
                    className="absolute -top-3 -left-3 w-10 h-10 rounded-full flex items-center justify-center font-black text-white"
                    style={{ background: getEstadoTrimestreColor(trimestre.estado) }}
                  >
                    T{trimestre.trimestre}
                  </div>

                  <div className="mb-4">
                    <h4 className="font-bold mb-2" style={{ color: '#1F2937' }}>
                      Trimestre {trimestre.trimestre}
                    </h4>
                    <Badge
                      style={{
                        background: `${getEstadoTrimestreColor(trimestre.estado)}20`,
                        color: getEstadoTrimestreColor(trimestre.estado)
                      }}
                    >
                      {trimestre.estado === 'completado' ? 'Completado' :
                       trimestre.estado === 'en-curso' ? 'En Curso' : 'Pendiente'}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-xs mb-4" style={{ color: '#6B7280' }}>
                    <div>
                      <span className="font-semibold">Período:</span><br />
                      {new Date(trimestre.fechaInicio).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })} -{' '}
                      {new Date(trimestre.fechaFin).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                    {trimestre.fechaSeguimiento && (
                      <div>
                        <span className="font-semibold">Seguimiento:</span><br />
                        {new Date(trimestre.fechaSeguimiento).toLocaleDateString('es-CO')}
                      </div>
                    )}
                    <div>
                      <span className="font-semibold">Acciones revisadas:</span><br />
                      {trimestre.accionesRevisadas}/{trimestre.accionesTotales}
                    </div>
                  </div>

                  {trimestre.estado !== 'pendiente' && (
                    <>
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span style={{ color: '#6B7280' }}>Cumplimiento</span>
                            <span className="font-bold" style={{ color: getPorcentajeColor(trimestre.porcentajeCumplimiento) }}>
                              {trimestre.porcentajeCumplimiento}%
                            </span>
                          </div>
                          <div className="h-2 rounded-full" style={{ background: '#E5E7EB' }}>
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                background: getPorcentajeColor(trimestre.porcentajeCumplimiento),
                                width: `${trimestre.porcentajeCumplimiento}%`
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span style={{ color: '#6B7280' }}>Efectividad</span>
                            <span className="font-bold" style={{ color: getPorcentajeColor(trimestre.porcentajeEfectividad) }}>
                              {trimestre.porcentajeEfectividad}%
                            </span>
                          </div>
                          <div className="h-2 rounded-full" style={{ background: '#E5E7EB' }}>
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                background: getPorcentajeColor(trimestre.porcentajeEfectividad),
                                width: `${trimestre.porcentajeEfectividad}%`
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {registrosTrimestre.length > 0 && (
                        <div className="mt-3 pt-3 border-t-2" style={{ borderColor: '#E5E7EB' }}>
                          <div className="text-xs" style={{ color: '#6B7280' }}>
                            {registrosTrimestre.length} registro(s) de seguimiento
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {trimestre.estado === 'completado' && (
                    <div className="mt-3 flex items-center gap-1 text-xs" style={{ color: '#10B981' }}>
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="font-semibold">Completado</span>
                    </div>
                  )}
                </div>

                {/* Flecha entre trimestres */}
                {index < trimestres.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-6 transform -translate-y-1/2 z-10">
                    <div className="w-12 h-0.5" style={{ background: '#D1D5DB' }} />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* MODAL DETALLE DEL TRIMESTRE */}
      <ResponsiveModal
        isOpen={modalDetalle}
        onClose={() => {
          setModalDetalle(false);
          setTrimestreSeleccionado(null);
        }}
        title={`Trimestre ${trimestreSeleccionado?.trimestre} - 2025`}
        subtitle={`Seguimiento detallado de acciones correctivas`}
        icon={<Calendar className="w-6 h-6" style={{ color: '#3B82F6' }} />}
        maxWidth="4xl"
        footer={
          <div className="flex items-center gap-3">
            {trimestreSeleccionado?.estado !== 'completado' && (
              <>
                <button
                  onClick={() => {
                    setModalNuevoRegistro(true);
                  }}
                  className="flex-1 px-6 py-3 rounded-xl font-semibold"
                  style={{ background: '#3B82F6', color: '#FFFFFF' }}
                >
                  <Plus className="w-4 h-4 mr-2 inline" />
                  Agregar Registro
                </button>
                <button
                  onClick={handleCompletarTrimestre}
                  className="flex-1 px-6 py-3 rounded-xl font-semibold"
                  style={{ background: '#10B981', color: '#FFFFFF' }}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2 inline" />
                  Completar Trimestre
                </button>
              </>
            )}
            <button
              onClick={() => {
                setModalDetalle(false);
                setTrimestreSeleccionado(null);
              }}
              className="px-6 py-3 rounded-xl font-semibold"
              style={{ background: '#F3F4F6', color: '#4B5563' }}
            >
              Cerrar
            </button>
          </div>
        }
      >
        {trimestreSeleccionado && (
          <div className="space-y-6 p-1">
            {/* Info del trimestre */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl" style={{ background: '#F9FAFB' }}>
              <div>
                <div className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Período</div>
                <div className="font-bold" style={{ color: '#1F2937' }}>
                  {new Date(trimestreSeleccionado.fechaInicio).toLocaleDateString('es-CO')} -{' '}
                  {new Date(trimestreSeleccionado.fechaFin).toLocaleDateString('es-CO')}
                </div>
              </div>
              {trimestreSeleccionado.fechaSeguimiento && (
                <div>
                  <div className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Fecha de Seguimiento</div>
                  <div className="font-bold" style={{ color: '#1F2937' }}>
                    {new Date(trimestreSeleccionado.fechaSeguimiento).toLocaleDateString('es-CO')}
                  </div>
                </div>
              )}
              <div>
                <div className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Cumplimiento (Fórmula Excel)</div>
                <div className="text-2xl font-black" style={{ color: getPorcentajeColor(trimestreSeleccionado.porcentajeCumplimiento) }}>
                  {trimestreSeleccionado.porcentajeCumplimiento}%
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Efectividad (Fórmula Excel)</div>
                <div className="text-2xl font-black" style={{ color: getPorcentajeColor(trimestreSeleccionado.porcentajeEfectividad) }}>
                  {trimestreSeleccionado.porcentajeEfectividad}%
                </div>
              </div>
            </div>

            {/* Registros de seguimiento */}
            <div>
              <h4 className="font-bold mb-3" style={{ color: '#1F2937' }}>
                Registros de Seguimiento ({registros.filter(r => r.trimestreId === trimestreSeleccionado.id).length})
              </h4>

              {registros.filter(r => r.trimestreId === trimestreSeleccionado.id).length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: '#9CA3AF' }} />
                  <p className="text-sm" style={{ color: '#6B7280' }}>
                    No hay registros de seguimiento para este trimestre
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {registros
                    .filter(r => r.trimestreId === trimestreSeleccionado.id)
                    .map((registro, index) => (
                      <div
                        key={registro.id}
                        className="p-4 rounded-xl border-2"
                        style={{ background: '#F9FAFB', borderColor: '#E5E7EB' }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-white"
                            style={{ background: '#3B82F6' }}
                          >
                            {index + 1}
                          </div>

                          <div className="flex-1">
                            <p className="font-bold mb-3" style={{ color: '#1F2937' }}>
                              {registro.accionDescripcion}
                            </p>

                            <div className="grid grid-cols-2 gap-3 mb-3">
                              <div>
                                <div className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>
                                  Cumplimiento (Fórmula Excel)
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    style={{
                                      background: `${getPuntajeColor(registro.puntajeCumplimiento)}20`,
                                      color: getPuntajeColor(registro.puntajeCumplimiento)
                                    }}
                                  >
                                    {registro.puntajeCumplimiento} / 2 puntos
                                  </Badge>
                                  <span className="text-xs" style={{ color: '#6B7280' }}>
                                    ({registro.accionesImplementadas}/{registro.accionesProgramadas} impl.)
                                  </span>
                                </div>
                              </div>

                              <div>
                                <div className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>
                                  Efectividad (Fórmula Excel)
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    style={{
                                      background: `${getPuntajeColor(registro.puntajeEfectividad)}20`,
                                      color: getPuntajeColor(registro.puntajeEfectividad)
                                    }}
                                  >
                                    {registro.puntajeEfectividad} / 2 puntos
                                  </Badge>
                                  <span className="text-xs" style={{ color: '#6B7280' }}>
                                    (Controles: {registro.controlesImplementados}, Repite: {registro.hallazgoSeRepite})
                                  </span>
                                </div>
                              </div>
                            </div>

                            {registro.observaciones && (
                              <div className="p-3 rounded-lg text-sm mb-2" style={{ background: '#FFFFFF', color: '#4B5563' }}>
                                <span className="font-semibold">Observaciones:</span> {registro.observaciones}
                              </div>
                            )}

                            {registro.evidencias.length > 0 && (
                              <div className="flex items-center gap-2 text-xs" style={{ color: '#6B7280' }}>
                                <FileText className="w-3 h-3" />
                                <span>{registro.evidencias.length} evidencia(s) adjunta(s)</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Observaciones generales */}
            {trimestreSeleccionado.observacionesGenerales && (
              <div>
                <h4 className="font-bold mb-2" style={{ color: '#1F2937' }}>Observaciones Generales del Trimestre</h4>
                <div className="p-4 rounded-xl" style={{ background: '#FEF3C7', color: '#78350F' }}>
                  {trimestreSeleccionado.observacionesGenerales}
                </div>
              </div>
            )}
          </div>
        )}
      </ResponsiveModal>

      {/* MODAL NUEVO REGISTRO */}
      <ResponsiveModal
        isOpen={modalNuevoRegistro}
        onClose={() => {
          setModalNuevoRegistro(false);
          setFormRegistro({
            accionDescripcion: '',
            accionesProgramadas: 1,
            accionesImplementadas: 0,
            controlesImplementados: 'NO',
            hallazgoSeRepite: 'NO',
            observaciones: ''
          });
        }}
        title="Nuevo Registro de Seguimiento"
        subtitle={`Trimestre ${trimestreSeleccionado?.trimestre} - Formato EM-FO-002`}
        icon={<Plus className="w-6 h-6" style={{ color: '#3B82F6' }} />}
        maxWidth="2xl"
        footer={
          <div className="flex items-center gap-3">
            <button
              onClick={handleAgregarRegistro}
              className="flex-1 px-6 py-3 rounded-xl font-semibold"
              style={{ background: '#3B82F6', color: '#FFFFFF' }}
            >
              <Save className="w-4 h-4 mr-2 inline" />
              Guardar Registro
            </button>
            <button
              onClick={() => {
                setModalNuevoRegistro(false);
                setFormRegistro({
                  accionDescripcion: '',
                  accionesProgramadas: 1,
                  accionesImplementadas: 0,
                  controlesImplementados: 'NO',
                  hallazgoSeRepite: 'NO',
                  observaciones: ''
                });
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
              Acción Correctiva a Evaluar *
            </label>
            <textarea
              rows={2}
              required
              className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#3B82F6]"
              style={{ borderColor: '#E5E7EB' }}
              value={formRegistro.accionDescripcion}
              onChange={(e) => setFormRegistro({ ...formRegistro, accionDescripcion: e.target.value })}
              placeholder="Descripción de la acción correctiva..."
            />
          </div>

          <div className="p-4 rounded-xl" style={{ background: '#EFF6FF' }}>
            <h4 className="font-bold text-sm mb-3" style={{ color: '#1E40AF' }}>
              Datos para Fórmula de Cumplimiento
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#4B5563' }}>
                  Acciones Programadas
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  className="w-full px-3 py-2 rounded-lg border-2 focus:outline-none focus:border-[#3B82F6]"
                  style={{ borderColor: '#E5E7EB' }}
                  value={formRegistro.accionesProgramadas}
                  onChange={(e) => setFormRegistro({ ...formRegistro, accionesProgramadas: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#4B5563' }}>
                  Acciones Implementadas
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  className="w-full px-3 py-2 rounded-lg border-2 focus:outline-none focus:border-[#3B82F6]"
                  style={{ borderColor: '#E5E7EB' }}
                  value={formRegistro.accionesImplementadas}
                  onChange={(e) => setFormRegistro({ ...formRegistro, accionesImplementadas: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="mt-2 p-2 rounded text-xs font-mono" style={{ background: '#FFFFFF', color: '#1E40AF' }}>
              Puntaje: {calcularPuntajeCumplimiento(formRegistro.accionesImplementadas, formRegistro.accionesProgramadas)} / 2
              <br />
              IF(implementadas &gt;= programadas, 2, IF(implementadas &gt;= 1, 1, 0))
            </div>
          </div>

          <div className="p-4 rounded-xl" style={{ background: '#F0FDF4' }}>
            <h4 className="font-bold text-sm mb-3" style={{ color: '#166534' }}>
              Datos para Fórmula de Efectividad
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#4B5563' }}>
                  Controles Implementados
                </label>
                <select
                  required
                  className="w-full px-3 py-2 rounded-lg border-2 focus:outline-none focus:border-[#10B981]"
                  style={{ borderColor: '#E5E7EB' }}
                  value={formRegistro.controlesImplementados}
                  onChange={(e) => setFormRegistro({ ...formRegistro, controlesImplementados: e.target.value as any })}
                >
                  <option value="SI">SÍ - Controles efectivos</option>
                  <option value="PARCIAL">PARCIAL - Controles parciales</option>
                  <option value="NO">NO - Sin controles</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: '#4B5563' }}>
                  ¿Hallazgo se repite?
                </label>
                <select
                  required
                  className="w-full px-3 py-2 rounded-lg border-2 focus:outline-none focus:border-[#10B981]"
                  style={{ borderColor: '#E5E7EB' }}
                  value={formRegistro.hallazgoSeRepite}
                  onChange={(e) => setFormRegistro({ ...formRegistro, hallazgoSeRepite: e.target.value as any })}
                >
                  <option value="NO">NO - No se repite</option>
                  <option value="SI">SÍ - Se repite</option>
                </select>
              </div>
            </div>
            <div className="mt-2 p-2 rounded text-xs font-mono" style={{ background: '#FFFFFF', color: '#166534' }}>
              Puntaje: {calcularPuntajeEfectividad(formRegistro.controlesImplementados, formRegistro.hallazgoSeRepite)} / 2
              <br />
              IF(controles &lt;&gt; repeticion, 1, IF(controles=&quot;SI&quot;, 2, 0))
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
              Observaciones del Seguimiento
            </label>
            <textarea
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#3B82F6]"
              style={{ borderColor: '#E5E7EB' }}
              value={formRegistro.observaciones}
              onChange={(e) => setFormRegistro({ ...formRegistro, observaciones: e.target.value })}
              placeholder="Comentarios sobre el avance y estado de la acción..."
            />
          </div>
        </div>
      </ResponsiveModal>

      {/* EXPLICACIÓN DE FÓRMULAS */}
      <motion.div
        className="p-6 rounded-xl border-2"
        style={{ background: '#F9FAFB', borderColor: '#E5E7EB' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <h4 className="font-bold mb-4" style={{ color: '#1F2937' }}>
          Fórmulas del Formato EM-FO-002 (Excel)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h5 className="font-semibold text-sm mb-2 flex items-center gap-2" style={{ color: '#3B82F6' }}>
              <Target className="w-4 h-4" />
              Cumplimiento
            </h5>
            <div className="p-3 rounded-lg text-xs font-mono mb-2" style={{ background: '#EFF6FF', color: '#1E40AF' }}>
              IF(implementadas &gt;= programadas, 2, IF(implementadas &gt;= 1, 1, 0))
            </div>
            <ul className="text-xs space-y-1" style={{ color: '#6B7280' }}>
              <li>• <span className="font-semibold">2 puntos:</span> Se implementaron todas las acciones programadas</li>
              <li>• <span className="font-semibold">1 punto:</span> Se implementó al menos 1 acción (parcial)</li>
              <li>• <span className="font-semibold">0 puntos:</span> No se implementó ninguna acción</li>
            </ul>
          </div>

          <div>
            <h5 className="font-semibold text-sm mb-2 flex items-center gap-2" style={{ color: '#10B981' }}>
              <CheckCircle2 className="w-4 h-4" />
              Efectividad
            </h5>
            <div className="p-3 rounded-lg text-xs font-mono mb-2" style={{ background: '#F0FDF4', color: '#166534' }}>
              IF(controles &lt;&gt; repeticion, 1, IF(controles=&quot;SI&quot;, 2, 0))
            </div>
            <ul className="text-xs space-y-1" style={{ color: '#6B7280' }}>
              <li>• <span className="font-semibold">2 puntos:</span> Controles efectivos y hallazgo no se repite</li>
              <li>• <span className="font-semibold">1 punto:</span> Controles parciales o diferentes a repetición</li>
              <li>• <span className="font-semibold">0 puntos:</span> El hallazgo se repite (controles inefectivos)</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
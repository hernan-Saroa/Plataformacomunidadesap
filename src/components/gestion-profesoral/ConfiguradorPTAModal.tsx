/**
 * CONFIGURADOR DE PTA - MODAL INTERACTIVO
 * 
 * Permite al docente crear y editar su Plan de Trabajo Académico con
 * validaciones en tiempo real según el motor de reglas.
 * 
 * Requerimiento: REQ-MOD-PTA-004 - Características Principales del PTA
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Plus,
  Save,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Book,
  FlaskConical,
  Users,
  Briefcase,
  Trash2,
  Info,
  Send
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Progress } from '../ui/progress';
import { toast } from 'sonner@2.0.3';
import {
  MotorReglasPTA,
  PlanTrabajoAcademico,
  ActividadPTA,
  ComponentePTA,
  CATALOGO_ACTIVIDADES,
  crearPTAVacio,
  mostrarResultadoValidacion,
  TipoVinculacion,
  TipoDedicacion
} from './MotorReglasPTA';

interface ConfiguradorPTAModalProps {
  isOpen: boolean;
  onClose: () => void;
  docenteId?: string;
  docenteNombre?: string;
  periodo?: string;
  ptaExistente?: PlanTrabajoAcademico;
  onGuardar?: (pta: PlanTrabajoAcademico) => void;
}

export function ConfiguradorPTAModal({
  isOpen,
  onClose,
  docenteId = 'docente-001',
  docenteNombre = 'María Elena Rodríguez',
  periodo = '2025-1',
  ptaExistente,
  onGuardar
}: ConfiguradorPTAModalProps) {
  const [motor] = useState(() => new MotorReglasPTA());
  const [pta, setPta] = useState<PlanTrabajoAcademico>(() => 
    ptaExistente || crearPTAVacio(docenteId, docenteNombre, periodo)
  );
  const [componenteActivo, setComponenteActivo] = useState<ComponentePTA>('docencia');
  const [actividadEnEdicion, setActividadEnEdicion] = useState<Partial<ActividadPTA> | null>(null);

  // Calcular distribución actual en tiempo real
  const distribucionActual = motor.getDistribucion().map(comp => {
    const horasAsignadas = pta.actividades
      .filter(a => a.componente === comp.componente)
      .reduce((sum, a) => sum + a.horasAsignadas, 0);
    
    const porcentaje = (horasAsignadas / pta.configuracion.horasTotales) * 100;

    return {
      ...comp,
      horasAsignadas,
      porcentaje,
      cumple: horasAsignadas >= comp.horasMinimas && horasAsignadas <= comp.horasMaximas
    };
  });

  const horasTotalesAsignadas = pta.actividades.reduce((sum, a) => sum + a.horasAsignadas, 0);
  const horasPendientes = pta.configuracion.horasTotales - horasTotalesAsignadas;
  const porcentajeCompletado = (horasTotalesAsignadas / pta.configuracion.horasTotales) * 100;

  // Validar PTA en tiempo real
  const validacion = motor.validarPTA(pta);

  // Agregar nueva actividad
  const agregarActividad = () => {
    if (!actividadEnEdicion || !actividadEnEdicion.nombre || !actividadEnEdicion.horasAsignadas) {
      toast.error('Complete todos los campos obligatorios');
      return;
    }

    const nuevaActividad: ActividadPTA = {
      id: `act-${Date.now()}`,
      codigo: actividadEnEdicion.codigo || '',
      nombre: actividadEnEdicion.nombre,
      descripcion: actividadEnEdicion.descripcion || '',
      componente: componenteActivo,
      horasAsignadas: actividadEnEdicion.horasAsignadas,
      horasPorSemana: motor.calcularHorasPorSemana(actividadEnEdicion.horasAsignadas),
      esObligatoria: actividadEnEdicion.esObligatoria || false,
      requiereEvidencia: actividadEnEdicion.requiereEvidencia || false,
      evidencias: [],
      observaciones: actividadEnEdicion.observaciones
    };

    // Verificar si se puede agregar
    const verificacion = motor.puedeAgregarActividad(pta.actividades, nuevaActividad);
    if (!verificacion.posible) {
      toast.error('No se puede agregar la actividad', {
        description: verificacion.razon
      });
      return;
    }

    setPta({
      ...pta,
      actividades: [...pta.actividades, nuevaActividad],
      horasTotalesAsignadas: horasTotalesAsignadas + nuevaActividad.horasAsignadas,
      fechaUltimaModificacion: new Date().toISOString()
    });

    setActividadEnEdicion(null);
    toast.success('Actividad agregada correctamente');
  };

  // Eliminar actividad
  const eliminarActividad = (actividadId: string) => {
    setPta({
      ...pta,
      actividades: pta.actividades.filter(a => a.id !== actividadId),
      fechaUltimaModificacion: new Date().toISOString()
    });
    toast.success('Actividad eliminada');
  };

  // Guardar PTA
  const guardarPTA = () => {
    const validacion = motor.validarPTA(pta);
    
    if (!validacion.esValido) {
      mostrarResultadoValidacion(validacion);
      return;
    }

    if (validacion.advertencias.length > 0) {
      mostrarResultadoValidacion(validacion);
      // Continuar con el guardado
    }

    onGuardar?.(pta);
    toast.success('PTA guardado correctamente');
  };

  // Enviar a aprobación
  const enviarAprobacion = () => {
    const validacion = motor.validarPTA(pta);
    
    if (!validacion.esValido) {
      mostrarResultadoValidacion(validacion);
      toast.error('Corrija los errores antes de enviar a aprobación');
      return;
    }

    setPta({
      ...pta,
      estado: 'en-aprobacion',
      fechaUltimaModificacion: new Date().toISOString()
    });

    toast.success('PTA enviado a aprobación', {
      description: 'Se notificará al Director Territorial para su revisión'
    });

    onGuardar?.(pta);
    onClose();
  };

  // Iconos por componente
  const iconoComponente: { [key in ComponentePTA]: any } = {
    'docencia': Book,
    'investigacion': FlaskConical,
    'extension': Users,
    'academico-administrativo': Briefcase
  };

  // Colores por componente
  const colorComponente: { [key in ComponentePTA]: string } = {
    'docencia': 'bg-blue-500',
    'investigacion': 'bg-purple-500',
    'extension': 'bg-green-500',
    'academico-administrativo': 'bg-amber-500'
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#003DA5] to-[#0052CC] text-white p-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">Plan de Trabajo Académico</h2>
              <p className="text-blue-100 text-sm">
                {docenteNombre} • Periodo {periodo} • {pta.configuracion.periodicidad} ({pta.configuracion.horasTotales}h)
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Estado y Progreso */}
          <div className="p-6 bg-gray-50 border-b">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <Badge 
                  variant={pta.estado === 'construccion' ? 'secondary' : 'default'}
                  className="px-3 py-1"
                >
                  {pta.estado === 'construccion' && '📝 En construcción'}
                  {pta.estado === 'en-aprobacion' && '🔄 En aprobación'}
                  {pta.estado === 'aprobado' && '✅ Aprobado'}
                  {pta.estado === 'devuelto-ajustes' && '↩️ Devuelto para ajustes'}
                  {pta.estado === 'en-firme' && '🔒 En firme'}
                </Badge>
                
                {validacion.esValido ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">PTA válido</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">{validacion.errores.length} errores</span>
                  </div>
                )}
              </div>

              <div className="text-right">
                <div className="text-2xl font-bold text-[#003DA5]">
                  {horasTotalesAsignadas} / {pta.configuracion.horasTotales}h
                </div>
                <div className="text-sm text-gray-500">
                  {horasPendientes > 0 ? `Faltan ${horasPendientes}h` : 'Completo'}
                </div>
              </div>
            </div>

            <Progress value={porcentajeCompletado} className="h-2" />
          </div>

          {/* Contenido Principal */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Columna Izquierda: Componentes */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 mb-3">Componentes del PTA</h3>
                
                {distribucionActual.map(comp => {
                  const Icon = iconoComponente[comp.componente];
                  return (
                    <Card
                      key={comp.componente}
                      className={`p-4 cursor-pointer transition-all ${
                        componenteActivo === comp.componente 
                          ? 'ring-2 ring-[#003DA5] shadow-md' 
                          : 'hover:shadow-md'
                      }`}
                      onClick={() => setComponenteActivo(comp.componente)}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`${colorComponente[comp.componente]} p-2 rounded-lg`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 text-sm">{comp.nombre}</h4>
                          <p className="text-xs text-gray-500 mt-1">
                            {comp.porcentajeMinimo}% - {comp.porcentajeMaximo}%
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">Asignadas</span>
                          <span className={`font-semibold ${
                            comp.cumple ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {comp.horasAsignadas}h
                          </span>
                        </div>
                        <Progress 
                          value={(comp.horasAsignadas / comp.horasMaximas) * 100} 
                          className="h-1.5"
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Mín: {comp.horasMinimas}h</span>
                          <span>Máx: {comp.horasMaximas}h</span>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Columna Central: Actividades */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">
                    Actividades de {distribucionActual.find(c => c.componente === componenteActivo)?.nombre}
                  </h3>
                  <Button
                    onClick={() => setActividadEnEdicion({
                      componente: componenteActivo,
                      esObligatoria: false,
                      requiereEvidencia: false
                    })}
                    size="sm"
                    className="bg-[#003DA5] hover:bg-[#002F85]"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Actividad
                  </Button>
                </div>

                {/* Formulario de nueva actividad */}
                {actividadEnEdicion && (
                  <Card className="p-4 bg-blue-50 border-blue-200">
                    <h4 className="font-semibold mb-3 text-[#003DA5]">Nueva Actividad</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                          Seleccionar del catálogo
                        </label>
                        <select
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          onChange={(e) => {
                            const actividad = CATALOGO_ACTIVIDADES[componenteActivo].find(
                              a => a.codigo === e.target.value
                            );
                            if (actividad) {
                              setActividadEnEdicion({
                                ...actividadEnEdicion,
                                codigo: actividad.codigo,
                                nombre: actividad.nombre,
                                requiereEvidencia: actividad.requiereEvidencia
                              });
                            }
                          }}
                        >
                          <option value="">Seleccione una actividad...</option>
                          {CATALOGO_ACTIVIDADES[componenteActivo].map(act => (
                            <option key={act.codigo} value={act.codigo}>
                              {act.nombre}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                          Nombre de la actividad *
                        </label>
                        <Input
                          value={actividadEnEdicion.nombre || ''}
                          onChange={(e) => setActividadEnEdicion({
                            ...actividadEnEdicion,
                            nombre: e.target.value
                          })}
                          placeholder="Ej: Docencia de Administración Pública I"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                          Horas asignadas *
                        </label>
                        <Input
                          type="number"
                          min="0"
                          value={actividadEnEdicion.horasAsignadas || ''}
                          onChange={(e) => setActividadEnEdicion({
                            ...actividadEnEdicion,
                            horasAsignadas: parseInt(e.target.value) || 0
                          })}
                          placeholder="Ej: 80"
                        />
                        {actividadEnEdicion.horasAsignadas && (
                          <p className="text-xs text-gray-500 mt-1">
                            {motor.calcularHorasPorSemana(actividadEnEdicion.horasAsignadas)} horas/semana
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                          Descripción (opcional)
                        </label>
                        <Textarea
                          value={actividadEnEdicion.descripcion || ''}
                          onChange={(e) => setActividadEnEdicion({
                            ...actividadEnEdicion,
                            descripcion: e.target.value
                          })}
                          placeholder="Describa brevemente la actividad..."
                          rows={2}
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={agregarActividad}
                          className="flex-1 bg-[#003DA5] hover:bg-[#002F85]"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Agregar
                        </Button>
                        <Button
                          onClick={() => setActividadEnEdicion(null)}
                          variant="outline"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Lista de actividades */}
                <div className="space-y-2">
                  {pta.actividades
                    .filter(a => a.componente === componenteActivo)
                    .map(actividad => (
                      <Card key={actividad.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h5 className="font-medium text-gray-900">{actividad.nombre}</h5>
                              {actividad.requiereEvidencia && (
                                <Badge variant="secondary" className="text-xs">
                                  Requiere evidencia
                                </Badge>
                              )}
                            </div>
                            {actividad.descripcion && (
                              <p className="text-sm text-gray-600 mb-2">{actividad.descripcion}</p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span className="font-semibold text-[#003DA5]">
                                {actividad.horasAsignadas}h
                              </span>
                              <span>•</span>
                              <span>{actividad.horasPorSemana}h/semana</span>
                            </div>
                          </div>
                          <Button
                            onClick={() => eliminarActividad(actividad.id)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}

                  {pta.actividades.filter(a => a.componente === componenteActivo).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Info className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No hay actividades en este componente</p>
                      <p className="text-sm">Haga clic en "Nueva Actividad" para agregar</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Errores y Advertencias */}
            {(validacion.errores.length > 0 || validacion.advertencias.length > 0) && (
              <div className="mt-6 space-y-2">
                {validacion.errores.map((error, idx) => (
                  <div key={`error-${idx}`} className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                ))}
                {validacion.advertencias.map((advertencia, idx) => (
                  <div key={`warning-${idx}`} className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">{advertencia}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer con acciones */}
          <div className="border-t p-6 bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Última modificación: {new Date(pta.fechaUltimaModificacion).toLocaleString('es-CO')}
            </div>
            <div className="flex gap-3">
              <Button
                onClick={onClose}
                variant="outline"
              >
                Cancelar
              </Button>
              <Button
                onClick={guardarPTA}
                variant="outline"
                className="border-[#003DA5] text-[#003DA5] hover:bg-blue-50"
              >
                <Save className="w-4 h-4 mr-2" />
                Guardar Borrador
              </Button>
              <Button
                onClick={enviarAprobacion}
                disabled={!validacion.esValido}
                className="bg-[#003DA5] hover:bg-[#002F85]"
              >
                <Send className="w-4 h-4 mr-2" />
                Enviar a Aprobación
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

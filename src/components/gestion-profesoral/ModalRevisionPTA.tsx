/**
 * MODAL DE REVISIÓN PTA
 * 
 * Permite a los aprobadores revisar, aprobar o rechazar un PTA
 * con visualización completa del contenido y timeline de aprobaciones.
 * 
 * Requerimiento: REQ-MOD-PTA-004.3 - Flujos de Aprobación Digital
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  Book,
  FlaskConical,
  Users,
  Briefcase,
  AlertCircle,
  FileText,
  Send
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Progress } from '../ui/progress';
import { toast } from 'sonner@2.0.3';
import {
  PTAConAprobacion,
  GestorFlujoAprobacion,
  NivelAprobacion,
  TipoAccionAprobacion,
  obtenerNombreNivel,
  obtenerColorNivel
} from './FlujoAprobacionPTA';
import { ComponentePTA } from './MotorReglasPTA';

interface ModalRevisionPTAProps {
  isOpen: boolean;
  onClose: () => void;
  pta: PTAConAprobacion;
  usuarioId: string;
  usuarioNombre: string;
  usuarioCargo: string;
  usuarioEmail: string;
  onAprobar?: (pta: PTAConAprobacion) => void;
  onRechazar?: (pta: PTAConAprobacion) => void;
}

export function ModalRevisionPTA({
  isOpen,
  onClose,
  pta,
  usuarioId,
  usuarioNombre,
  usuarioCargo,
  usuarioEmail,
  onAprobar,
  onRechazar
}: ModalRevisionPTAProps) {
  const [observaciones, setObservaciones] = useState('');
  const [accionSeleccionada, setAccionSeleccionada] = useState<'aprobar' | 'rechazar' | null>(null);
  const [procesando, setProcesando] = useState(false);

  const gestor = new GestorFlujoAprobacion();
  const { puede, razon } = gestor.puedeAprobar(pta, usuarioCargo);
  const resumenAprobacion = gestor.obtenerResumenAprobacion(pta);
  const historialFirmas = gestor.obtenerHistorialFirmas(pta);

  // Calcular distribución por componente
  const distribucionComponentes: { [key in ComponentePTA]?: number } = {};
  pta.actividades.forEach(actividad => {
    if (!distribucionComponentes[actividad.componente]) {
      distribucionComponentes[actividad.componente] = 0;
    }
    distribucionComponentes[actividad.componente]! += actividad.horasAsignadas;
  });

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

  // Nombres por componente
  const nombreComponente: { [key in ComponentePTA]: string } = {
    'docencia': 'Docencia',
    'investigacion': 'Investigación',
    'extension': 'Extensión',
    'academico-administrativo': 'Académico-Administrativo'
  };

  // Manejar aprobación
  const handleAprobar = async () => {
    if (!pta.estadoFlujo.nivelActual) return;

    setProcesando(true);

    const resultado = gestor.aprobarPTA(
      pta,
      pta.estadoFlujo.nivelActual,
      usuarioId,
      usuarioNombre,
      usuarioCargo,
      usuarioEmail,
      observaciones
    );

    if (resultado.exito) {
      pta.estado = resultado.nuevoEstado;
      
      toast.success('✅ PTA aprobado', {
        description: resultado.mensaje
      });

      onAprobar?.(pta);
      onClose();
    } else {
      toast.error('❌ Error al aprobar', {
        description: resultado.mensaje
      });
    }

    setProcesando(false);
  };

  // Manejar rechazo
  const handleRechazar = async () => {
    if (!pta.estadoFlujo.nivelActual) return;

    if (!observaciones || observaciones.trim().length === 0) {
      toast.error('Debe proporcionar observaciones para rechazar el PTA');
      return;
    }

    setProcesando(true);

    const resultado = gestor.rechazarPTA(
      pta,
      pta.estadoFlujo.nivelActual,
      usuarioId,
      usuarioNombre,
      usuarioCargo,
      usuarioEmail,
      observaciones
    );

    if (resultado.exito) {
      pta.estado = resultado.nuevoEstado;
      
      toast.success('📝 PTA devuelto para ajustes', {
        description: resultado.mensaje
      });

      onRechazar?.(pta);
      onClose();
    } else {
      toast.error('❌ Error al rechazar', {
        description: resultado.mensaje
      });
    }

    setProcesando(false);
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
          <div className="bg-gradient-to-r from-[#003DA5] to-[#0052CC] text-white p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-1">Revisión de Plan de Trabajo Académico</h2>
                <p className="text-blue-100 text-sm">
                  {pta.docenteNombre} • Periodo {pta.periodo}
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

            {/* Estado de aprobación */}
            <div className="mt-4 flex items-center gap-4">
              <Badge variant="secondary" className="px-3 py-1">
                {pta.estado === 'en-aprobacion' && '🔄 En aprobación'}
                {pta.estado === 'aprobado' && '✅ Aprobado'}
                {pta.estado === 'devuelto-ajustes' && '↩️ Devuelto para ajustes'}
              </Badge>
              {pta.estadoFlujo.nivelActual && (
                <Badge variant="default" className="px-3 py-1">
                  {obtenerNombreNivel(pta.estadoFlujo.nivelActual)}
                </Badge>
              )}
            </div>
          </div>

          {/* Contenido */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Indicador de permisos */}
              {!puede && (
                <Card className="p-4 bg-amber-50 border-amber-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-900">No puede aprobar este PTA</p>
                      <p className="text-sm text-amber-700 mt-1">{razon}</p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Información general */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <User className="w-5 h-5 text-[#003DA5]" />
                    <span className="text-sm font-medium text-gray-600">Docente</span>
                  </div>
                  <p className="font-semibold text-gray-900">{pta.docenteNombre}</p>
                  <p className="text-sm text-gray-500 capitalize">{pta.tipoVinculacion}</p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="w-5 h-5 text-[#003DA5]" />
                    <span className="text-sm font-medium text-gray-600">Periodo</span>
                  </div>
                  <p className="font-semibold text-gray-900">{pta.periodo}</p>
                  <p className="text-sm text-gray-500 capitalize">
                    {pta.configuracion.periodicidad} • {pta.configuracion.horasTotales}h
                  </p>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="w-5 h-5 text-[#003DA5]" />
                    <span className="text-sm font-medium text-gray-600">Horas Asignadas</span>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {pta.horasTotalesAsignadas} / {pta.configuracion.horasTotales}h
                  </p>
                  <Progress 
                    value={(pta.horasTotalesAsignadas / pta.configuracion.horasTotales) * 100} 
                    className="h-2 mt-2"
                  />
                </Card>
              </div>

              {/* Distribución por componente */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Distribución por Componente</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(Object.keys(nombreComponente) as ComponentePTA[]).map(comp => {
                    const horas = distribucionComponentes[comp] || 0;
                    const porcentaje = (horas / pta.configuracion.horasTotales) * 100;
                    const Icon = iconoComponente[comp];

                    return (
                      <Card key={comp} className="p-4">
                        <div className="flex items-start gap-3 mb-3">
                          <div className={`${colorComponente[comp]} p-2 rounded-lg`}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{nombreComponente[comp]}</h4>
                            <p className="text-sm text-gray-500">{horas}h ({porcentaje.toFixed(1)}%)</p>
                          </div>
                        </div>
                        <Progress value={porcentaje} className="h-2" />
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Actividades detalladas */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  Actividades ({pta.actividades.length})
                </h3>
                <div className="space-y-2">
                  {pta.actividades.map(actividad => {
                    const Icon = iconoComponente[actividad.componente];
                    return (
                      <Card key={actividad.id} className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`${colorComponente[actividad.componente]} p-2 rounded-lg`}>
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-1">
                              <h5 className="font-medium text-gray-900">{actividad.nombre}</h5>
                              <div className="text-right">
                                <p className="font-semibold text-[#003DA5]">{actividad.horasAsignadas}h</p>
                                <p className="text-xs text-gray-500">{actividad.horasPorSemana}h/semana</p>
                              </div>
                            </div>
                            {actividad.descripcion && (
                              <p className="text-sm text-gray-600 mb-2">{actividad.descripcion}</p>
                            )}
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {nombreComponente[actividad.componente]}
                              </Badge>
                              {actividad.requiereEvidencia && (
                                <Badge variant="outline" className="text-xs">
                                  Requiere evidencia
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Timeline de aprobaciones */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Historial de Aprobaciones</h3>
                <Card className="p-4">
                  <div className="space-y-4">
                    {/* Nivel 1 */}
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-full ${
                        resumenAprobacion.nivel1.completado ? 'bg-green-500' : 'bg-gray-300'
                      } flex items-center justify-center flex-shrink-0`}>
                        {resumenAprobacion.nivel1.completado ? (
                          <CheckCircle className="w-5 h-5 text-white" />
                        ) : (
                          <Clock className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">Nivel 1: Dirección Territorial</h4>
                        {resumenAprobacion.nivel1.completado ? (
                          <div className="text-sm text-gray-600 mt-1">
                            <p>✅ Aprobado por {resumenAprobacion.nivel1.aprobador}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(resumenAprobacion.nivel1.fecha!).toLocaleString('es-CO')}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 mt-1">Pendiente de revisión</p>
                        )}
                      </div>
                    </div>

                    {/* Nivel 2 */}
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-full ${
                        resumenAprobacion.nivel2.completado ? 'bg-green-500' : 'bg-gray-300'
                      } flex items-center justify-center flex-shrink-0`}>
                        {resumenAprobacion.nivel2.completado ? (
                          <CheckCircle className="w-5 h-5 text-white" />
                        ) : (
                          <Clock className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">Nivel 2: Coordinación Académica</h4>
                        {resumenAprobacion.nivel2.completado ? (
                          <div className="text-sm text-gray-600 mt-1">
                            <p>✅ Aprobado por {resumenAprobacion.nivel2.aprobador}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(resumenAprobacion.nivel2.fecha!).toLocaleString('es-CO')}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 mt-1">Pendiente de revisión</p>
                        )}
                      </div>
                    </div>

                    {/* Nivel 3 */}
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-full ${
                        resumenAprobacion.nivel3.completado ? 'bg-green-500' : 'bg-gray-300'
                      } flex items-center justify-center flex-shrink-0`}>
                        {resumenAprobacion.nivel3.completado ? (
                          <CheckCircle className="w-5 h-5 text-white" />
                        ) : (
                          <Clock className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">Nivel 3: Subdirección Nacional Académica</h4>
                        {resumenAprobacion.nivel3.completado ? (
                          <div className="text-sm text-gray-600 mt-1">
                            <p>✅ Aprobado por {resumenAprobacion.nivel3.aprobador}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(resumenAprobacion.nivel3.fecha!).toLocaleString('es-CO')}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 mt-1">Pendiente de revisión</p>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Historial de firmas completo */}
              {historialFirmas.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Historial Completo</h3>
                  <Card className="p-4">
                    <div className="space-y-3">
                      {historialFirmas.map(firma => (
                        <div key={firma.id} className="flex items-start gap-3 pb-3 border-b last:border-b-0 last:pb-0">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={firma.accion === 'aprobar' ? 'default' : 'secondary'}>
                                {firma.accion === 'aprobar' && '✅ Aprobado'}
                                {firma.accion === 'rechazar' && '❌ Rechazado'}
                                {firma.accion === 'enviar' && '📤 Enviado'}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {obtenerNombreNivel(firma.nivel)}
                              </Badge>
                            </div>
                            <p className="text-sm font-medium text-gray-900">
                              {firma.aprobadorNombre} ({firma.aprobadorCargo})
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(firma.fecha).toLocaleString('es-CO')}
                            </p>
                            {firma.observaciones && (
                              <p className="text-sm text-gray-600 mt-2 p-2 bg-gray-50 rounded">
                                {firma.observaciones}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              )}

              {/* Sección de aprobación/rechazo */}
              {puede && pta.estado === 'en-aprobacion' && (
                <Card className="p-4 bg-blue-50 border-blue-200">
                  <h3 className="font-semibold text-gray-900 mb-3">Acción de Revisión</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Observaciones {accionSeleccionada === 'rechazar' && '(obligatorias)'}
                      </label>
                      <Textarea
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        placeholder={
                          accionSeleccionada === 'rechazar'
                            ? 'Explique los motivos del rechazo y las correcciones necesarias...'
                            : 'Agregue comentarios u observaciones (opcional)...'
                        }
                        rows={4}
                        className="resize-none"
                      />
                    </div>

                    {accionSeleccionada === 'aprobar' && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800">
                          ✅ Va a aprobar este PTA. {
                            pta.estadoFlujo.nivelActual === NivelAprobacion.NIVEL_3
                              ? 'Esta es la aprobación final, el PTA quedará aprobado.'
                              : `El PTA pasará al ${obtenerNombreNivel((pta.estadoFlujo.nivelActual! + 1) as NivelAprobacion)}.`
                          }
                        </p>
                      </div>
                    )}

                    {accionSeleccionada === 'rechazar' && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800">
                          ❌ Va a rechazar este PTA. Se devolverá al docente para ajustes.
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* Footer con acciones */}
          <div className="border-t p-6 bg-gray-50 flex items-center justify-between">
            <Button onClick={onClose} variant="outline">
              Cerrar
            </Button>

            {puede && pta.estado === 'en-aprobacion' && (
              <div className="flex gap-3">
                {accionSeleccionada === null ? (
                  <>
                    <Button
                      onClick={() => setAccionSeleccionada('rechazar')}
                      variant="outline"
                      className="border-red-600 text-red-600 hover:bg-red-50"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Rechazar
                    </Button>
                    <Button
                      onClick={() => setAccionSeleccionada('aprobar')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Aprobar
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={() => {
                        setAccionSeleccionada(null);
                        setObservaciones('');
                      }}
                      variant="outline"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={accionSeleccionada === 'aprobar' ? handleAprobar : handleRechazar}
                      disabled={procesando || (accionSeleccionada === 'rechazar' && !observaciones.trim())}
                      className={
                        accionSeleccionada === 'aprobar'
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-red-600 hover:bg-red-700'
                      }
                    >
                      {procesando ? 'Procesando...' : (
                        accionSeleccionada === 'aprobar' ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Confirmar Aprobación
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 mr-2" />
                            Confirmar Rechazo
                          </>
                        )
                      )}
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

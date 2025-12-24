/**
 * TIMELINE DE APROBACIONES PTA
 * 
 * Componente visual que muestra el progreso del PTA a través de los 3 niveles
 * de aprobación con indicadores de estado y detalles de cada firma.
 * 
 * Requerimiento: REQ-MOD-PTA-004.3 - Trazabilidad de Aprobaciones
 */

import { motion } from 'motion/react';
import {
  CheckCircle,
  Clock,
  XCircle,
  User,
  Calendar,
  MessageSquare,
  Shield,
  Award,
  Building
} from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  PTAConAprobacion,
  NivelAprobacion,
  FirmaDigital,
  TipoAccionAprobacion,
  obtenerNombreNivel
} from './FlujoAprobacionPTA';

interface TimelineAprobacionesPTAProps {
  pta: PTAConAprobacion;
  compacto?: boolean;
}

export function TimelineAprobacionesPTA({ pta, compacto = false }: TimelineAprobacionesPTAProps) {
  // Obtener firmas de aprobación por nivel
  const firmasPorNivel: { [key in NivelAprobacion]?: FirmaDigital } = {};
  
  pta.firmas
    .filter(f => f.accion === TipoAccionAprobacion.APROBAR)
    .forEach(firma => {
      firmasPorNivel[firma.nivel] = firma;
    });

  // Obtener última firma de rechazo si existe
  const ultimoRechazo = pta.firmas
    .filter(f => f.accion === TipoAccionAprobacion.RECHAZAR)
    .sort((a, b) => b.timestamp - a.timestamp)[0];

  // Determinar estado de cada nivel
  const getNivelEstado = (nivel: NivelAprobacion): 'completado' | 'actual' | 'pendiente' | 'rechazado' => {
    if (ultimoRechazo && ultimoRechazo.nivel === nivel) {
      return 'rechazado';
    }
    
    if (firmasPorNivel[nivel]) {
      return 'completado';
    }

    if (pta.estadoFlujo.nivelActual === nivel) {
      return 'actual';
    }

    return 'pendiente';
  };

  // Iconos por nivel
  const iconoNivel: { [key in NivelAprobacion]: any } = {
    [NivelAprobacion.NIVEL_1]: Building,
    [NivelAprobacion.NIVEL_2]: Shield,
    [NivelAprobacion.NIVEL_3]: Award
  };

  // Colores por estado
  const coloresPorEstado = {
    completado: {
      bg: 'bg-green-500',
      border: 'border-green-500',
      text: 'text-green-700',
      bgLight: 'bg-green-50'
    },
    actual: {
      bg: 'bg-blue-500',
      border: 'border-blue-500',
      text: 'text-blue-700',
      bgLight: 'bg-blue-50'
    },
    pendiente: {
      bg: 'bg-gray-300',
      border: 'border-gray-300',
      text: 'text-gray-500',
      bgLight: 'bg-gray-50'
    },
    rechazado: {
      bg: 'bg-red-500',
      border: 'border-red-500',
      text: 'text-red-700',
      bgLight: 'bg-red-50'
    }
  };

  // Nombres descriptivos de niveles
  const nombresNivel = {
    [NivelAprobacion.NIVEL_1]: 'Dirección Territorial',
    [NivelAprobacion.NIVEL_2]: 'Coordinación Académica',
    [NivelAprobacion.NIVEL_3]: 'Subdirección Nacional'
  };

  const niveles = [NivelAprobacion.NIVEL_1, NivelAprobacion.NIVEL_2, NivelAprobacion.NIVEL_3];

  if (compacto) {
    // Vista compacta - solo indicadores
    return (
      <div className="flex items-center gap-2">
        {niveles.map((nivel, index) => {
          const estado = getNivelEstado(nivel);
          const colores = coloresPorEstado[estado];
          const Icon = iconoNivel[nivel];

          return (
            <div key={nivel} className="flex items-center">
              <div className="relative">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={`w-8 h-8 rounded-full ${colores.bg} flex items-center justify-center shadow-md`}
                  title={nombresNivel[nivel]}
                >
                  {estado === 'completado' && <CheckCircle className="w-4 h-4 text-white" />}
                  {estado === 'actual' && <Clock className="w-4 h-4 text-white animate-pulse" />}
                  {estado === 'pendiente' && <Icon className="w-4 h-4 text-white opacity-50" />}
                  {estado === 'rechazado' && <XCircle className="w-4 h-4 text-white" />}
                </motion.div>

                {/* Badge de nivel */}
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span className="text-xs text-gray-500">N{nivel}</span>
                </div>
              </div>

              {/* Conector */}
              {index < niveles.length - 1 && (
                <div className={`w-12 h-0.5 mx-1 ${
                  estado === 'completado' ? 'bg-green-500' : 'bg-gray-300'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Vista completa - timeline detallado
  return (
    <div className="space-y-4">
      {niveles.map((nivel, index) => {
        const estado = getNivelEstado(nivel);
        const colores = coloresPorEstado[estado];
        const Icon = iconoNivel[nivel];
        const firma = firmasPorNivel[nivel];
        const esUltimo = index === niveles.length - 1;

        return (
          <div key={nivel} className="relative">
            <div className="flex items-start gap-4">
              {/* Línea vertical conectora */}
              {!esUltimo && (
                <div className="absolute left-6 top-14 bottom-0 w-0.5 bg-gray-200" />
              )}

              {/* Icono del nivel */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.15 }}
                className="relative z-10"
              >
                <div className={`w-12 h-12 rounded-full ${colores.bg} flex items-center justify-center shadow-lg`}>
                  {estado === 'completado' && <CheckCircle className="w-6 h-6 text-white" />}
                  {estado === 'actual' && (
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      <Clock className="w-6 h-6 text-white" />
                    </motion.div>
                  )}
                  {estado === 'pendiente' && <Icon className="w-6 h-6 text-white opacity-50" />}
                  {estado === 'rechazado' && <XCircle className="w-6 h-6 text-white" />}
                </div>

                {/* Badge de nivel */}
                <Badge
                  variant={estado === 'completado' ? 'default' : 'secondary'}
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs px-2 py-0"
                >
                  N{nivel}
                </Badge>
              </motion.div>

              {/* Contenido del nivel */}
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.15 + 0.1 }}
                className="flex-1"
              >
                <Card className={`p-4 ${colores.bgLight} border-2 ${colores.border}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">{nombresNivel[nivel]}</h4>
                      <p className="text-sm text-gray-600">{obtenerNombreNivel(nivel)}</p>
                    </div>
                    
                    <Badge
                      variant={estado === 'completado' ? 'default' : 'secondary'}
                      className={`${
                        estado === 'completado' ? 'bg-green-600' :
                        estado === 'actual' ? 'bg-blue-600 animate-pulse' :
                        estado === 'rechazado' ? 'bg-red-600' :
                        'bg-gray-400'
                      }`}
                    >
                      {estado === 'completado' && '✅ Aprobado'}
                      {estado === 'actual' && '🔄 En revisión'}
                      {estado === 'pendiente' && '⏳ Pendiente'}
                      {estado === 'rechazado' && '❌ Rechazado'}
                    </Badge>
                  </div>

                  {/* Detalles de la firma */}
                  {firma && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      transition={{ delay: index * 0.15 + 0.2 }}
                      className="mt-3 pt-3 border-t border-gray-200 space-y-2"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-gray-900">{firma.aprobadorNombre}</span>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-600">{firma.aprobadorCargo}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span>{new Date(firma.fecha).toLocaleString('es-CO', {
                          dateStyle: 'long',
                          timeStyle: 'short'
                        })}</span>
                      </div>

                      {firma.observaciones && (
                        <div className="flex items-start gap-2 text-sm">
                          <MessageSquare className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                          <p className="text-gray-700 italic">{firma.observaciones}</p>
                        </div>
                      )}

                      {/* Componentes revisados (para firmas específicas) */}
                      {firma.componentesRevisados && firma.componentesRevisados.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-gray-500">Componentes:</span>
                          {firma.componentesRevisados.map(comp => (
                            <Badge key={comp} variant="outline" className="text-xs">
                              {comp}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Mensaje de rechazo */}
                  {estado === 'rechazado' && ultimoRechazo && ultimoRechazo.nivel === nivel && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="mt-3 pt-3 border-t border-red-200 bg-red-50 p-3 rounded-lg"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span className="font-semibold text-red-900 text-sm">Devuelto para ajustes</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-red-700 mb-2">
                        <User className="w-4 h-4" />
                        <span>{ultimoRechazo.aprobadorNombre} ({ultimoRechazo.aprobadorCargo})</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-red-600 mb-2">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(ultimoRechazo.fecha).toLocaleString('es-CO')}</span>
                      </div>

                      {ultimoRechazo.observaciones && (
                        <div className="mt-2 p-2 bg-white rounded border border-red-200">
                          <p className="text-sm text-red-900">
                            <strong>Observaciones:</strong> {ultimoRechazo.observaciones}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Estado actual */}
                  {estado === 'actual' && (
                    <div className="mt-3 pt-3 border-t border-blue-200 bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-blue-900 flex items-center gap-2">
                        <Clock className="w-4 h-4 animate-pulse" />
                        <span>En espera de revisión y aprobación</span>
                      </p>
                      {pta.estadoFlujo.firmasPendientes.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-blue-700 mb-1">Pendiente de firma de:</p>
                          <div className="flex flex-wrap gap-1">
                            {pta.estadoFlujo.firmasPendientes.map((cargo, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs bg-white">
                                {cargo}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Estado pendiente */}
                  {estado === 'pendiente' && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm text-gray-500 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>Pendiente. Se habilitará tras aprobación del nivel anterior.</span>
                      </p>
                    </div>
                  )}
                </Card>
              </motion.div>
            </div>
          </div>
        );
      })}

      {/* Estado final - PTA aprobado */}
      {pta.estado === 'aprobado' && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
              <Award className="w-6 h-6 text-white" />
            </div>

            <Card className="flex-1 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-500">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <h4 className="font-bold text-green-900 text-lg">PTA Aprobado Completamente</h4>
              </div>
              <p className="text-sm text-green-700">
                El Plan de Trabajo Académico ha sido aprobado por todos los niveles jerárquicos
                y está listo para su ejecución.
              </p>
              {pta.estado === 'en-firme' && (
                <Badge className="mt-3 bg-green-700">
                  🔒 En Firme - No editable
                </Badge>
              )}
            </Card>
          </div>
        </motion.div>
      )}
    </div>
  );
}

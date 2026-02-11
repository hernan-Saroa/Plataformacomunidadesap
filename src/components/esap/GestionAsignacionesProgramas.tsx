/**
 * Componente para gestionar asignaciones de programas académicos a usuarios
 * Permite asignar múltiples programas con validación y selección de principal
 */

import React, { useState } from 'react';
import { Plus, Trash2, GraduationCap, AlertCircle, Star, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import type { CreateAsignacionProgramaDTO } from '../../types';
import { PROGRAMAS_ESAP } from '../../data/oferta-academica-esap';
import { getProgramasDisponiblesEnSede, getInfoCompatibilidadSedePrograma } from '../../utils/validacion-sede-programa';

interface GestionAsignacionesProgramasProps {
  asignaciones: CreateAsignacionProgramaDTO[];
  onChange: (asignaciones: CreateAsignacionProgramaDTO[]) => void;
  required?: boolean;
  sedesAsignadas?: string[]; // ✅ NUEVO: Para validar compatibilidad
}

export function GestionAsignacionesProgramas({
  asignaciones,
  onChange,
  required = false,
  sedesAsignadas = [],
}: GestionAsignacionesProgramasProps) {
  const [showAgregarPrograma, setShowAgregarPrograma] = useState(false);
  const [nuevaAsignacion, setNuevaAsignacion] = useState<Partial<CreateAsignacionProgramaDTO>>({
    programaId: '',
    ambitoAcceso: 'local',
    esPrincipal: false,
    fechaInicio: new Date().toISOString().split('T')[0],
  });

  // Obtener programas ya asignados
  const programasAsignados = asignaciones.map((a) => a.programaId);

  // Filtrar programas disponibles
  const programasDisponibles = PROGRAMAS_ESAP.filter(
    (programa) => !programasAsignados.includes(programa.codigo)
  );

  const handleAgregarAsignacion = () => {
    if (!nuevaAsignacion.programaId) {
      toast.error('Debe seleccionar un programa académico');
      return;
    }

    const programa = PROGRAMAS_ESAP.find((p) => p.codigo === nuevaAsignacion.programaId);
    if (!programa) {
      toast.error('Programa no encontrado');
      return;
    }

    const nuevasAsignaciones: CreateAsignacionProgramaDTO[] = [
      ...asignaciones,
      {
        programaId: nuevaAsignacion.programaId!,
        ambitoAcceso: nuevaAsignacion.ambitoAcceso || 'local',
        esPrincipal: nuevaAsignacion.esPrincipal || false,
        fechaInicio: nuevaAsignacion.fechaInicio,
        fechaFin: nuevaAsignacion.fechaFin,
        observaciones: nuevaAsignacion.observaciones,
      },
    ];

    onChange(nuevasAsignaciones);
    
    // Reset form
    setNuevaAsignacion({
      programaId: '',
      ambitoAcceso: 'local',
      esPrincipal: false,
      fechaInicio: new Date().toISOString().split('T')[0],
    });
    setShowAgregarPrograma(false);
    
    toast.success(`Programa "${programa.nombre}" agregado`);
  };

  const handleEliminarAsignacion = (index: number) => {
    const programaEliminado = PROGRAMAS_ESAP.find(
      (p) => p.codigo === asignaciones[index].programaId
    );
    
    const nuevasAsignaciones = asignaciones.filter((_, i) => i !== index);
    onChange(nuevasAsignaciones);
    
    toast.info(`Programa "${programaEliminado?.nombre}" eliminado`);
  };

  const handleMarcarComoPrincipal = (index: number) => {
    const nuevasAsignaciones = asignaciones.map((asignacion, i) => ({
      ...asignacion,
      esPrincipal: i === index,
    }));
    onChange(nuevasAsignaciones);
    
    const programa = PROGRAMAS_ESAP.find((p) => p.codigo === asignaciones[index].programaId);
    toast.success(`"${programa?.nombre}" marcado como programa principal`);
  };

  const getProgramaInfo = (codigoPrograma: string) => {
    return PROGRAMAS_ESAP.find((p) => p.codigo === codigoPrograma);
  };

  const getNivelColor = (nivel: string) => {
    switch (nivel) {
      case 'Pregrado':
        return { bg: '#EFF6FF', color: '#3B82F6' };
      case 'Especialización':
        return { bg: '#F3E8FF', color: '#A855F7' };
      case 'Maestría':
        return { bg: '#FEF3C7', color: '#F59E0B' };
      default:
        return { bg: '#F3F4F6', color: '#6B7280' };
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-purple-600" />
          <h3 className="font-bold text-gray-900">Programas Académicos</h3>
          {required && <span className="text-sm text-red-500">*</span>}
        </div>
        <button
          type="button"
          onClick={() => setShowAgregarPrograma(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors font-semibold"
        >
          <Plus className="w-4 h-4" />
          Agregar Programa
        </button>
      </div>

      {/* Lista de Programas Asignados */}
      <AnimatePresence>
        {asignaciones.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">
              {required ? 'Debe asignar al menos un programa académico' : 'No hay programas asignados'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {asignaciones.map((asignacion, index) => {
              const programa = getProgramaInfo(asignacion.programaId);
              if (!programa) return null;

              const nivelColor = getNivelColor(programa.nivel);

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-lg border-2 border-gray-200 p-4 hover:border-purple-300 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-bold text-gray-900">{programa.nombre}</h4>
                        {asignacion.esPrincipal && (
                          <Badge
                            className="text-xs gap-1"
                            style={{ backgroundColor: '#8b5cf6', color: 'white' }}
                          >
                            <Star className="w-3 h-3 fill-current" />
                            Principal
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge
                          variant="outline"
                          className="gap-1"
                          style={{ backgroundColor: nivelColor.bg, color: nivelColor.color, borderColor: nivelColor.color }}
                        >
                          {programa.nivel}
                        </Badge>
                        <Badge variant="outline" className="gap-1">
                          {programa.modalidad}
                        </Badge>
                        <Badge variant="outline" className="gap-1">
                          {programa.duracionSemestres} semestres
                        </Badge>
                        <Badge variant="outline" className="gap-1">
                          {programa.creditos} créditos
                        </Badge>
                      </div>
                      {asignacion.fechaInicio && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-2">
                          <Calendar className="w-3 h-3" />
                          <span>
                            Desde {new Date(asignacion.fechaInicio).toLocaleDateString('es-CO')}
                            {asignacion.fechaFin &&
                              ` hasta ${new Date(asignacion.fechaFin).toLocaleDateString('es-CO')}`}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {!asignacion.esPrincipal && (
                        <button
                          type="button"
                          onClick={() => handleMarcarComoPrincipal(index)}
                          className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                          title="Marcar como principal"
                        >
                          <Star className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleEliminarAsignacion(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar programa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {/* Advertencia si no hay principal */}
      {asignaciones.length > 0 && !asignaciones.some((a) => a.esPrincipal) && (
        <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-yellow-800">
            Debe marcar un programa como principal haciendo clic en el icono de estrella
          </p>
        </div>
      )}

      {/* Modal Agregar Programa */}
      <AnimatePresence>
        {showAgregarPrograma && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50 z-[300]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAgregarPrograma(false)}
            />
            <div className="fixed inset-0 z-[301] flex items-center justify-center p-4">
              <motion.div
                className="bg-white rounded-xl w-full max-w-md p-6"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-purple-600" />
                  Agregar Programa Académico
                </h3>

                <div className="space-y-4">
                  {/* Selector de Programa */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Programa *
                    </label>
                    <select
                      value={nuevaAsignacion.programaId || ''}
                      onChange={(e) =>
                        setNuevaAsignacion({ ...nuevaAsignacion, programaId: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    >
                      <option value="">Seleccione un programa...</option>
                      {programasDisponibles.map((programa) => (
                        <option key={programa.codigo} value={programa.codigo}>
                          {programa.nombre} ({programa.nivel} - {programa.modalidad})
                        </option>
                      ))}
                    </select>
                    {programasDisponibles.length === 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Todos los programas ya están asignados
                      </p>
                    )}
                  </div>

                  {/* Fecha de Inicio */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Fecha de Inicio
                    </label>
                    <input
                      type="date"
                      value={nuevaAsignacion.fechaInicio || ''}
                      onChange={(e) =>
                        setNuevaAsignacion({ ...nuevaAsignacion, fechaInicio: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                  </div>

                  {/* Fecha de Fin (Opcional) */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Fecha de Fin (Opcional)
                    </label>
                    <input
                      type="date"
                      value={nuevaAsignacion.fechaFin || ''}
                      onChange={(e) =>
                        setNuevaAsignacion({ ...nuevaAsignacion, fechaFin: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                  </div>

                  {/* Marcar como Principal */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="esPrincipal"
                      checked={nuevaAsignacion.esPrincipal || false}
                      onChange={(e) =>
                        setNuevaAsignacion({ ...nuevaAsignacion, esPrincipal: e.target.checked })
                      }
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <label htmlFor="esPrincipal" className="text-sm text-gray-700">
                      Marcar como programa principal
                    </label>
                  </div>

                  {/* Observaciones */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Observaciones (Opcional)
                    </label>
                    <textarea
                      value={nuevaAsignacion.observaciones || ''}
                      onChange={(e) =>
                        setNuevaAsignacion({ ...nuevaAsignacion, observaciones: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                      rows={2}
                      placeholder="Información adicional..."
                    />
                  </div>
                </div>

                {/* Botones */}
                <div className="flex gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAgregarPrograma(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleAgregarAsignacion}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
                    disabled={!nuevaAsignacion.programaId}
                  >
                    Agregar
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
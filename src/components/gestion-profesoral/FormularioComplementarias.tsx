/**
 * FORMULARIO DE ACTIVIDADES ACADÉMICO-ADMINISTRATIVAS COMPLEMENTARIAS - PTA ESAP
 * 
 * Gestiona las 24 actividades complementarias según Anexo 1 de la Circular 003/2025.
 * 
 * Incluye:
 * - Actividades de gestión académica (coordinaciones, direcciones)
 * - Participación en órganos colegiados
 * - Actividades de representación
 * - Miembro Junta Directiva Sindicato (320 hrs titular / 160 hrs suplente)
 * 
 * Límite: 25% del PTA (200 hrs para TC de 800 hrs)
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Trash2,
  Briefcase,
  Info,
  Calendar,
  Edit2,
  Save,
  X,
  AlertCircle,
  Users as UsersIcon,
  Shield
} from 'lucide-react';

// ============================================================================
// TIPOS
// ============================================================================

export interface ActividadComplementaria {
  id: string;
  actividad: string; // Código de la actividad según catálogo
  nombrePersonalizado?: string; // Si es "otra"
  categoria: 'Gestión Académica' | 'Órganos Colegiados' | 'Representación' | 'Otras';
  horas: number;
  esJuntaSindicato?: boolean; // Caso especial
  tipoMiembroSindicato?: 'titular' | 'suplente'; // Si es junta sindicato
  descripcion: string;
  fechaInicio: string;
  fechaTerminacion: string;
  observaciones: string;
}

interface FormularioComplementariasProps {
  actividades: ActividadComplementaria[];
  horasProgramables: number;
  onChange: (actividades: ActividadComplementaria[]) => void;
}

// ============================================================================
// CATÁLOGO DE ACTIVIDADES COMPLEMENTARIAS (Anexo 1 - Circular 003/2025)
// ============================================================================

const ACTIVIDADES_COMPLEMENTARIAS = [
  // GESTIÓN ACADÉMICA
  {
    codigo: 'coord_programa',
    nombre: 'Coordinador de Programa Académico',
    categoria: 'Gestión Académica',
    horas: 160
  },
  {
    codigo: 'coord_investigacion',
    nombre: 'Coordinador de Investigaciones de la Territorial',
    categoria: 'Gestión Académica',
    horas: 120
  },
  {
    codigo: 'coord_extension',
    nombre: 'Coordinador de Extensión de la Territorial',
    categoria: 'Gestión Académica',
    horas: 120
  },
  {
    codigo: 'coord_posgrado',
    nombre: 'Coordinador de Posgrado de la Territorial',
    categoria: 'Gestión Académica',
    horas: 120
  },
  {
    codigo: 'dir_revista',
    nombre: 'Director de Revista Institucional',
    categoria: 'Gestión Académica',
    horas: 96
  },
  {
    codigo: 'coord_bienestar',
    nombre: 'Coordinador de Bienestar Universitario Territorial',
    categoria: 'Gestión Académica',
    horas: 80
  },
  {
    codigo: 'coord_biblioteca',
    nombre: 'Coordinador de Biblioteca Territorial',
    categoria: 'Gestión Académica',
    horas: 80
  },
  {
    codigo: 'coord_calidad',
    nombre: 'Coordinador de Calidad Académica',
    categoria: 'Gestión Académica',
    horas: 80
  },

  // ÓRGANOS COLEGIADOS
  {
    codigo: 'consejo_academico',
    nombre: 'Miembro Consejo Académico',
    categoria: 'Órganos Colegiados',
    horas: 64
  },
  {
    codigo: 'consejo_facultad',
    nombre: 'Miembro Consejo de Facultad o Escuela',
    categoria: 'Órganos Colegiados',
    horas: 48
  },
  {
    codigo: 'comite_curricular',
    nombre: 'Miembro Comité Curricular',
    categoria: 'Órganos Colegiados',
    horas: 40
  },
  {
    codigo: 'comite_investigacion',
    nombre: 'Miembro Comité de Investigaciones',
    categoria: 'Órganos Colegiados',
    horas: 40
  },
  {
    codigo: 'comite_extension',
    nombre: 'Miembro Comité de Extensión',
    categoria: 'Órganos Colegiados',
    horas: 40
  },
  {
    codigo: 'comite_autoevaluacion',
    nombre: 'Miembro Comité de Autoevaluación y Acreditación',
    categoria: 'Órganos Colegiados',
    horas: 48
  },
  {
    codigo: 'comite_bienestar',
    nombre: 'Miembro Comité de Bienestar Universitario',
    categoria: 'Órganos Colegiados',
    horas: 32
  },

  // REPRESENTACIÓN
  {
    codigo: 'rep_consejo_superior',
    nombre: 'Representante Profesoral ante Consejo Superior',
    categoria: 'Representación',
    horas: 96
  },
  {
    codigo: 'rep_consejo_academico',
    nombre: 'Representante Profesoral ante Consejo Académico Nacional',
    categoria: 'Representación',
    horas: 80
  },
  {
    codigo: 'rep_comision',
    nombre: 'Representante en Comisión de Personal Docente',
    categoria: 'Representación',
    horas: 64
  },
  
  // JUNTA DIRECTIVA SINDICATO (CASO ESPECIAL)
  {
    codigo: 'junta_sindicato',
    nombre: 'Miembro Junta Directiva Sindicato',
    categoria: 'Representación',
    horas: 320, // Titular: 320, Suplente: 160
    esEspecial: true
  },

  // OTRAS ACTIVIDADES
  {
    codigo: 'tutor_nuevos',
    nombre: 'Tutor de Docentes Nuevos (Programa Inducción)',
    categoria: 'Otras',
    horas: 32
  },
  {
    codigo: 'par_autoevaluacion',
    nombre: 'Par Académico en Procesos de Autoevaluación',
    categoria: 'Otras',
    horas: 40
  },
  {
    codigo: 'evaluador_trabajos',
    nombre: 'Evaluador de Trabajos de Grado',
    categoria: 'Otras',
    horas: 24
  },
  {
    codigo: 'monitor_calidad',
    nombre: 'Monitor de Calidad Académica',
    categoria: 'Otras',
    horas: 32
  },
  {
    codigo: 'otra',
    nombre: 'Otra Actividad Complementaria',
    categoria: 'Otras',
    horas: 0,
    personalizable: true
  }
];

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function FormularioComplementarias({
  actividades,
  horasProgramables,
  onChange
}: FormularioComplementariasProps) {
  const [modoCreacion, setModoCreacion] = useState(false);
  const [actividadEditando, setActividadEditando] = useState<ActividadComplementaria | null>(null);

  const handleAgregarActividad = () => {
    setModoCreacion(true);
    setActividadEditando({
      id: `comp-${Date.now()}`,
      actividad: '',
      categoria: 'Gestión Académica',
      horas: 0,
      descripcion: '',
      fechaInicio: '',
      fechaTerminacion: '',
      observaciones: ''
    });
  };

  const handleGuardarActividad = (actividad: ActividadComplementaria) => {
    if (actividades.find(a => a.id === actividad.id)) {
      onChange(actividades.map(a => (a.id === actividad.id ? actividad : a)));
    } else {
      onChange([...actividades, actividad]);
    }
    setModoCreacion(false);
    setActividadEditando(null);
  };

  const handleEliminarActividad = (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta actividad complementaria?')) {
      onChange(actividades.filter(a => a.id !== id));
    }
  };

  const handleEditarActividad = (actividad: ActividadComplementaria) => {
    setModoCreacion(true);
    setActividadEditando(actividad);
  };

  const handleCancelar = () => {
    setModoCreacion(false);
    setActividadEditando(null);
  };

  const totalHorasComplementarias = actividades.reduce((sum, act) => sum + act.horas, 0);
  const maxHorasComplementarias = horasProgramables * 0.25; // 25%
  const porcentajeUsado = (totalHorasComplementarias / maxHorasComplementarias) * 100;
  const excedeMaximo = totalHorasComplementarias > maxHorasComplementarias;

  // Agrupar por categoría
  const actividadesPorCategoria = {
    'Gestión Académica': actividades.filter(a => a.categoria === 'Gestión Académica'),
    'Órganos Colegiados': actividades.filter(a => a.categoria === 'Órganos Colegiados'),
    'Representación': actividades.filter(a => a.categoria === 'Representación'),
    'Otras': actividades.filter(a => a.categoria === 'Otras')
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Actividades Académico-Administrativas Complementarias
          </h2>
          <p className="text-gray-600">
            Registra actividades de gestión, órganos colegiados y representación.
          </p>
        </div>

        {!modoCreacion && (
          <button
            onClick={handleAgregarActividad}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            Agregar Actividad
          </button>
        )}
      </div>

      {/* Información sobre categorías y límites */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-orange-900 mb-1">
              Categorías de Actividades Complementarias
            </h4>
            <div className="text-sm text-orange-700 space-y-1">
              <p>• <strong>Gestión Académica:</strong> Coordinaciones, direcciones (80-160 hrs)</p>
              <p>• <strong>Órganos Colegiados:</strong> Consejos, comités (32-64 hrs)</p>
              <p>• <strong>Representación:</strong> Representantes profesorales (64-96 hrs)</p>
              <p>• <strong>Junta Sindicato:</strong> Titular 320 hrs / Suplente 160 hrs</p>
              <p className="mt-2">• <strong>Límite global:</strong> 25% del PTA ({maxHorasComplementarias} hrs)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Resumen por categoría */}
      {!modoCreacion && actividades.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {Object.entries(actividadesPorCategoria).map(([categoria, acts]) => (
            <div
              key={categoria}
              className="bg-white border border-gray-200 rounded-lg p-3 text-center"
            >
              <p className="text-xs text-gray-600 mb-1">{categoria}</p>
              <p className="text-lg font-bold text-orange-600">{acts.length}</p>
              <p className="text-xs text-gray-500">
                {acts.reduce((sum, a) => sum + a.horas, 0)} hrs
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Formulario de Creación/Edición */}
      <AnimatePresence>
        {modoCreacion && actividadEditando && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6"
          >
            <FormularioActividadComplementaria
              actividad={actividadEditando}
              onGuardar={handleGuardarActividad}
              onCancelar={handleCancelar}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de Actividades */}
      {actividades.length > 0 ? (
        <div className="space-y-4">
          {actividades.map((actividad, index) => {
            const actividadInfo = ACTIVIDADES_COMPLEMENTARIAS.find(a => a.codigo === actividad.actividad);
            const nombreActividad = actividadInfo?.nombre || actividad.nombrePersonalizado || 'Actividad complementaria';

            return (
              <motion.div
                key={actividad.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white border border-orange-200 rounded-lg p-4 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-orange-50 rounded-lg">
                        <Briefcase className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900">
                            {nombreActividad}
                          </h4>
                          {actividad.esJuntaSindicato && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              {actividad.tipoMiembroSindicato === 'titular' ? 'Titular' : 'Suplente'}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{actividad.categoria}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditarActividad(actividad)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEliminarActividad(actividad.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 mb-1">Horas Asignadas</p>
                    <p className="font-bold text-orange-600">{actividad.horas} hrs</p>
                  </div>
                  
                  <div className="md:col-span-2">
                    <p className="text-gray-600 mb-1">Periodo</p>
                    <div className="flex items-center gap-1 text-xs text-gray-700">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      {actividad.fechaInicio && actividad.fechaTerminacion ? (
                        <span>
                          {new Date(actividad.fechaInicio).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })} - {' '}
                          {new Date(actividad.fechaTerminacion).toLocaleDateString('es-CO', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      ) : (
                        <span className="text-gray-400">Sin fechas</span>
                      )}
                    </div>
                  </div>
                </div>

                {actividad.descripcion && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-600">{actividad.descripcion}</p>
                  </div>
                )}
              </motion.div>
            );
          })}

          {/* Total de Horas Complementarias */}
          <div className={`border rounded-lg p-4 ${
            excedeMaximo 
              ? 'bg-red-50 border-red-200' 
              : 'bg-orange-50 border-orange-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Briefcase className={`w-5 h-5 ${
                  excedeMaximo ? 'text-red-600' : 'text-orange-600'
                }`} />
                <span className={`font-semibold ${
                  excedeMaximo ? 'text-red-900' : 'text-orange-900'
                }`}>
                  Total Horas Complementarias
                </span>
              </div>
              <div className="text-right">
                <span className={`text-2xl font-bold ${
                  excedeMaximo ? 'text-red-600' : 'text-orange-600'
                }`}>
                  {totalHorasComplementarias} hrs
                </span>
                <p className="text-xs text-gray-600">
                  de {maxHorasComplementarias} hrs máx (25%)
                </p>
              </div>
            </div>

            {/* Barra de progreso */}
            <div className="h-2 bg-white rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  excedeMaximo ? 'bg-red-500' : 'bg-orange-500'
                }`}
                style={{ width: `${Math.min(porcentajeUsado, 100)}%` }}
              />
            </div>

            {excedeMaximo && (
              <div className="flex items-start gap-2 mt-3">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">
                  Excedes el máximo permitido de 25% en Complementarias. 
                  Reduce {totalHorasComplementarias - maxHorasComplementarias} horas.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Briefcase className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <h3 className="font-semibold text-gray-900 mb-1">
            No hay actividades complementarias
          </h3>
          <p className="text-gray-600 mb-4">
            Agrega actividades de gestión o representación (opcional)
          </p>
          <button
            onClick={handleAgregarActividad}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
          >
            Agregar Primera Actividad
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTE: FORMULARIO ACTIVIDAD COMPLEMENTARIA
// ============================================================================

interface FormularioActividadComplementariaProps {
  actividad: ActividadComplementaria;
  onGuardar: (actividad: ActividadComplementaria) => void;
  onCancelar: () => void;
}

function FormularioActividadComplementaria({
  actividad: actividadInicial,
  onGuardar,
  onCancelar
}: FormularioActividadComplementariaProps) {
  const [actividad, setActividad] = useState(actividadInicial);

  // Filtrar actividades por categoría
  const actividadesFiltradas = actividad.categoria 
    ? ACTIVIDADES_COMPLEMENTARIAS.filter(a => a.categoria === actividad.categoria)
    : ACTIVIDADES_COMPLEMENTARIAS;

  const handleCambioCategoria = (categoria: string) => {
    setActividad({
      ...actividad,
      categoria: categoria as any,
      actividad: '',
      horas: 0
    });
  };

  const handleCambioActividad = (codigo: string) => {
    const actividadInfo = ACTIVIDADES_COMPLEMENTARIAS.find(a => a.codigo === codigo);
    
    // Caso especial: Junta Sindicato
    if (codigo === 'junta_sindicato') {
      setActividad({
        ...actividad,
        actividad: codigo,
        esJuntaSindicato: true,
        tipoMiembroSindicato: 'titular',
        horas: 320 // Titular por defecto
      });
    } else {
      setActividad({
        ...actividad,
        actividad: codigo,
        esJuntaSindicato: false,
        tipoMiembroSindicato: undefined,
        horas: actividadInfo?.horas || 0
      });
    }
  };

  const handleCambioTipoSindicato = (tipo: 'titular' | 'suplente') => {
    setActividad({
      ...actividad,
      tipoMiembroSindicato: tipo,
      horas: tipo === 'titular' ? 320 : 160
    });
  };

  const handleGuardar = () => {
    if (!actividad.actividad) {
      alert('Selecciona una actividad');
      return;
    }
    
    const actividadSeleccionada = ACTIVIDADES_COMPLEMENTARIAS.find(a => a.codigo === actividad.actividad);
    if (actividadSeleccionada?.personalizable && !actividad.nombrePersonalizado?.trim()) {
      alert('Ingresa el nombre de la actividad');
      return;
    }

    if (actividad.horas <= 0) {
      alert('Las horas deben ser mayor a 0');
      return;
    }
    if (!actividad.fechaInicio || !actividad.fechaTerminacion) {
      alert('Ingresa las fechas de la actividad');
      return;
    }

    onGuardar(actividad);
  };

  const actividadSeleccionada = ACTIVIDADES_COMPLEMENTARIAS.find(a => a.codigo === actividad.actividad);
  const esPersonalizable = actividadSeleccionada?.personalizable;

  return (
    <div className="bg-white border-2 border-orange-300 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900">
          {actividadInicial.actividad ? 'Editar Actividad' : 'Nueva Actividad Complementaria'}
        </h3>
        <button
          onClick={onCancelar}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 mb-6">
        {/* Categoría */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Categoría *
          </label>
          <select
            value={actividad.categoria}
            onChange={(e) => handleCambioCategoria(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="Gestión Académica">Gestión Académica</option>
            <option value="Órganos Colegiados">Órganos Colegiados</option>
            <option value="Representación">Representación</option>
            <option value="Otras">Otras</option>
          </select>
        </div>

        {/* Actividad */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Actividad *
          </label>
          <select
            value={actividad.actividad}
            onChange={(e) => handleCambioActividad(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Selecciona...</option>
            {actividadesFiltradas.map(a => (
              <option key={a.codigo} value={a.codigo}>
                {a.nombre} {!a.personalizable && a.horas > 0 && `(${a.horas} hrs)`}
              </option>
            ))}
          </select>
        </div>

        {/* Nombre personalizado si es "Otra" */}
        {esPersonalizable && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de la Actividad *
            </label>
            <input
              type="text"
              value={actividad.nombrePersonalizado || ''}
              onChange={(e) => setActividad({ ...actividad, nombrePersonalizado: e.target.value })}
              placeholder="Especifica el nombre de la actividad..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        )}

        {/* Tipo de miembro si es Junta Sindicato */}
        {actividad.esJuntaSindicato && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Miembro *
            </label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tipoSindicato"
                  checked={actividad.tipoMiembroSindicato === 'titular'}
                  onChange={() => handleCambioTipoSindicato('titular')}
                  className="w-4 h-4 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-sm text-gray-700">Titular (320 hrs)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tipoSindicato"
                  checked={actividad.tipoMiembroSindicato === 'suplente'}
                  onChange={() => handleCambioTipoSindicato('suplente')}
                  className="w-4 h-4 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-sm text-gray-700">Suplente (160 hrs)</span>
              </label>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          {/* Horas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Horas *
            </label>
            <input
              type="number"
              min="0"
              value={actividad.horas}
              onChange={(e) => setActividad({ ...actividad, horas: parseInt(e.target.value) || 0 })}
              disabled={!esPersonalizable && !actividad.esJuntaSindicato}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
            />
            {!esPersonalizable && !actividad.esJuntaSindicato && (
              <p className="text-xs text-gray-500 mt-1">Horas predefinidas</p>
            )}
          </div>

          {/* Fecha Inicio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha Inicio *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={actividad.fechaInicio}
                onChange={(e) => setActividad({ ...actividad, fechaInicio: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Fecha Terminación */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha Fin *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={actividad.fechaTerminacion}
                onChange={(e) => setActividad({ ...actividad, fechaTerminacion: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Descripción */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Descripción de la Actividad
        </label>
        <textarea
          value={actividad.descripcion}
          onChange={(e) => setActividad({ ...actividad, descripcion: e.target.value })}
          rows={3}
          placeholder="Describe brevemente la actividad..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {/* Observaciones */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Observaciones (opcional)
        </label>
        <textarea
          value={actividad.observaciones}
          onChange={(e) => setActividad({ ...actividad, observaciones: e.target.value })}
          rows={2}
          placeholder="Información adicional..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {/* Botones */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={onCancelar}
          className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleGuardar}
          className="flex items-center gap-2 px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors font-medium"
        >
          <Save className="w-4 h-4" />
          Guardar Actividad
        </button>
      </div>
    </div>
  );
}

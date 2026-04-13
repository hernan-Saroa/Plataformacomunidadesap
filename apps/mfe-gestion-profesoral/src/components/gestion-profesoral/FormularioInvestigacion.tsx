/**
 * FORMULARIO DE ACTIVIDADES DE INVESTIGACIÓN - PTA ESAP
 * 
 * Permite registrar:
 * 1. Proyectos de investigación con roles específicos
 * 2. Actividades de apoyo a la investigación
 * 
 * Reglas de negocio (Circular 003/2025 - Sección 7):
 * - Investigador Líder: hasta 400 hrs (50% PTA)
 * - Coinvestigador: hasta 300 hrs (37.5% PTA)
 * - Asistente Nivel II: hasta 200 hrs (25% PTA)
 * - Si recibe estímulo económico: NO se registra en PTA
 * - Máximo global: 50% del PTA (400 hrs)
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Trash2,
  FlaskConical,
  Info,
  Calendar,
  Edit2,
  Save,
  X,
  AlertCircle,
  DollarSign,
  Users as UsersIcon,
  BookOpen,
  Award
} from 'lucide-react';

// ============================================================================
// TIPOS
// ============================================================================

export interface ActividadInvestigacion {
  id: string;
  tipo: 'proyecto' | 'apoyo';
  
  // Para tipo 'proyecto'
  nombreProyecto?: string;
  grupoInvestigacion?: string;
  lineaInvestigacion?: string;
  rol?: 'Líder' | 'Coinvestigador' | 'Asistente II';
  recibeEstimulo: boolean; // Si SÍ, NO se registra en PTA
  
  // Para tipo 'apoyo'
  actividad?: string;
  
  // Comunes
  horas: number;
  descripcion: string;
  fechaInicio: string;
  fechaTerminacion: string;
  observaciones: string;
}

interface FormularioInvestigacionProps {
  actividades: ActividadInvestigacion[];
  horasProgramables: number;
  onChange: (actividades: ActividadInvestigacion[]) => void;
}

// ============================================================================
// CATÁLOGOS (Según Documento Maestro - Sección 7)
// ============================================================================

const ROLES_INVESTIGACION = [
  { codigo: 'Líder', nombre: 'Investigador Líder de Proyecto', maxHoras: 400, porcentaje: '50%' },
  { codigo: 'Coinvestigador', nombre: 'Coinvestigador', maxHoras: 300, porcentaje: '37.5%' },
  { codigo: 'Asistente II', nombre: 'Asistente de Investigación Nivel II', maxHoras: 200, porcentaje: '25%' }
];

const GRUPOS_INVESTIGACION = [
  'Administración y Políticas Públicas',
  'Gestión Pública Territorial',
  'Estado, Instituciones y Gobernabilidad',
  'Economía Pública y Desarrollo',
  'Innovación en Gestión Pública',
  'Gestión del Conocimiento',
  'Políticas Sociales',
  'Otro'
];

const LINEAS_INVESTIGACION = [
  'Políticas Públicas',
  'Administración Pública',
  'Gestión Territorial',
  'Economía Pública',
  'Estado y Democracia',
  'Gestión del Talento Humano',
  'Innovación Pública',
  'Gestión del Conocimiento',
  'Otra'
];

// Actividades de apoyo (sin rol de proyecto - Sección 7.2)
const ACTIVIDADES_APOYO = [
  { codigo: 'semillero', nombre: 'Líder de Semillero de Investigación (reconocido SNI)', horas: 120 },
  { codigo: 'enlace', nombre: 'Enlace Territorial de Investigaciones', horas: 200 },
  { codigo: 'lider_grupo', nombre: 'Líder o Director de Grupo de Investigación', horas: 200 },
  { codigo: 'par_propuesta', nombre: 'Par evaluador propuestas de proyecto', horas: 20 },
  { codigo: 'par_resultados', nombre: 'Par evaluador resultados/productos', horas: 20 },
  { codigo: 'diseno_curso', nombre: 'Diseño cursos formación investigativa', horas: 32 },
  { codigo: 'capacitador', nombre: 'Capacitador cursos formación investigativa', horas: 32 },
  { codigo: 'articulo', nombre: 'Producción artículos científicos adicionales', horas: 96 },
  { codigo: 'libro', nombre: 'Producción libro (mín 3 capítulos) adicional', horas: 144 }
];

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function FormularioInvestigacion({
  actividades,
  horasProgramables,
  onChange
}: FormularioInvestigacionProps) {
  const [modoCreacion, setModoCreacion] = useState(false);
  const [actividadEditando, setActividadEditando] = useState<ActividadInvestigacion | null>(null);
  const [tipoNueva, setTipoNueva] = useState<'proyecto' | 'apoyo'>('proyecto');

  const handleAgregarActividad = (tipo: 'proyecto' | 'apoyo') => {
    setTipoNueva(tipo);
    setModoCreacion(true);
    
    if (tipo === 'proyecto') {
      setActividadEditando({
        id: `inv-${Date.now()}`,
        tipo: 'proyecto',
        nombreProyecto: '',
        grupoInvestigacion: '',
        lineaInvestigacion: '',
        rol: 'Líder',
        recibeEstimulo: false,
        horas: 400,
        descripcion: '',
        fechaInicio: '',
        fechaTerminacion: '',
        observaciones: ''
      });
    } else {
      setActividadEditando({
        id: `inv-${Date.now()}`,
        tipo: 'apoyo',
        actividad: '',
        recibeEstimulo: false,
        horas: 120,
        descripcion: '',
        fechaInicio: '',
        fechaTerminacion: '',
        observaciones: ''
      });
    }
  };

  const handleGuardarActividad = (actividad: ActividadInvestigacion) => {
    if (actividades.find(a => a.id === actividad.id)) {
      onChange(actividades.map(a => (a.id === actividad.id ? actividad : a)));
    } else {
      onChange([...actividades, actividad]);
    }
    setModoCreacion(false);
    setActividadEditando(null);
  };

  const handleEliminarActividad = (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta actividad de investigación?')) {
      onChange(actividades.filter(a => a.id !== id));
    }
  };

  const handleEditarActividad = (actividad: ActividadInvestigacion) => {
    setModoCreacion(true);
    setActividadEditando(actividad);
  };

  const handleCancelar = () => {
    setModoCreacion(false);
    setActividadEditando(null);
  };

  // Calcular total de horas (excluyendo las que reciben estímulo)
  const totalHorasInvestigacion = actividades
    .filter(act => !act.recibeEstimulo)
    .reduce((sum, act) => sum + act.horas, 0);
  
  const maxHorasInvestigacion = horasProgramables * 0.5; // 50%
  const porcentajeUsado = (totalHorasInvestigacion / maxHorasInvestigacion) * 100;
  const excedeMaximo = totalHorasInvestigacion > maxHorasInvestigacion;

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Actividades de Investigación
          </h2>
          <p className="text-gray-600">
            Registra tus proyectos de investigación o actividades de apoyo a la investigación.
          </p>
        </div>

        {!modoCreacion && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAgregarActividad('proyecto')}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              Proyecto
            </button>
            <button
              onClick={() => handleAgregarActividad('apoyo')}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              Actividad de Apoyo
            </button>
          </div>
        )}
      </div>

      {/* Información sobre límites */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-purple-900 mb-1">
              Límites de Investigación
            </h4>
            <div className="text-sm text-purple-700 space-y-1">
              <p>• <strong>Máximo global:</strong> 50% del PTA ({maxHorasInvestigacion} hrs)</p>
              <p>• <strong>Investigador Líder:</strong> hasta 400 hrs</p>
              <p>• <strong>Coinvestigador:</strong> hasta 300 hrs</p>
              <p>• <strong>Asistente Nivel II:</strong> hasta 200 hrs</p>
              <p className="flex items-center gap-1 mt-2">
                <DollarSign className="w-4 h-4" />
                <span>Si recibes estímulo económico, las horas <strong>NO</strong> se registran en el PTA</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Formulario de Creación/Edición */}
      <AnimatePresence>
        {modoCreacion && actividadEditando && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6"
          >
            {actividadEditando.tipo === 'proyecto' ? (
              <FormularioProyecto
                actividad={actividadEditando}
                onGuardar={handleGuardarActividad}
                onCancelar={handleCancelar}
              />
            ) : (
              <FormularioApoyo
                actividad={actividadEditando}
                onGuardar={handleGuardarActividad}
                onCancelar={handleCancelar}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de Actividades */}
      {actividades.length > 0 ? (
        <div className="space-y-4">
          {actividades.map((actividad, index) => (
            <motion.div
              key={actividad.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-white border rounded-lg p-4 hover:shadow-md transition-all ${
                actividad.recibeEstimulo ? 'border-gray-300 bg-gray-50' : 'border-purple-200'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg ${
                      actividad.recibeEstimulo ? 'bg-gray-100' : 'bg-purple-50'
                    }`}>
                      <FlaskConical className={`w-5 h-5 ${
                        actividad.recibeEstimulo ? 'text-gray-400' : 'text-purple-600'
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900">
                          {actividad.tipo === 'proyecto' 
                            ? actividad.nombreProyecto 
                            : ACTIVIDADES_APOYO.find(a => a.codigo === actividad.actividad)?.nombre || 'Actividad de apoyo'}
                        </h4>
                        {actividad.recibeEstimulo && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            Estímulo económico
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {actividad.tipo === 'proyecto' 
                          ? `Rol: ${actividad.rol} • ${actividad.grupoInvestigacion}`
                          : 'Actividad de apoyo a la investigación'}
                      </p>
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

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {actividad.tipo === 'proyecto' && actividad.rol && (
                  <div>
                    <p className="text-gray-600 mb-1">Rol</p>
                    <div className="flex items-center gap-1">
                      <Award className="w-4 h-4 text-gray-400" />
                      <p className="font-semibold text-gray-900">{actividad.rol}</p>
                    </div>
                  </div>
                )}
                
                <div>
                  <p className="text-gray-600 mb-1">Horas Asignadas</p>
                  <p className={`font-bold ${
                    actividad.recibeEstimulo 
                      ? 'text-gray-400 line-through' 
                      : 'text-purple-600'
                  }`}>
                    {actividad.horas} hrs
                  </p>
                  {actividad.recibeEstimulo && (
                    <p className="text-xs text-gray-500">No cuenta en PTA</p>
                  )}
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
          ))}

          {/* Total de Horas de Investigación */}
          <div className={`border rounded-lg p-4 ${
            excedeMaximo 
              ? 'bg-red-50 border-red-200' 
              : 'bg-purple-50 border-purple-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FlaskConical className={`w-5 h-5 ${
                  excedeMaximo ? 'text-red-600' : 'text-purple-600'
                }`} />
                <span className={`font-semibold ${
                  excedeMaximo ? 'text-red-900' : 'text-purple-900'
                }`}>
                  Total Horas Investigación
                </span>
              </div>
              <div className="text-right">
                <span className={`text-2xl font-bold ${
                  excedeMaximo ? 'text-red-600' : 'text-purple-600'
                }`}>
                  {totalHorasInvestigacion} hrs
                </span>
                <p className="text-xs text-gray-600">
                  de {maxHorasInvestigacion} hrs máx (50%)
                </p>
              </div>
            </div>

            {/* Barra de progreso */}
            <div className="h-2 bg-white rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  excedeMaximo ? 'bg-red-500' : 'bg-purple-500'
                }`}
                style={{ width: `${Math.min(porcentajeUsado, 100)}%` }}
              />
            </div>

            {excedeMaximo && (
              <div className="flex items-start gap-2 mt-3">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">
                  Excedes el máximo permitido de 50% en Investigación. 
                  Reduce {totalHorasInvestigacion - maxHorasInvestigacion} horas.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <FlaskConical className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <h3 className="font-semibold text-gray-900 mb-1">
            No hay actividades de investigación
          </h3>
          <p className="text-gray-600 mb-4">
            Agrega un proyecto o actividad de apoyo (opcional)
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => handleAgregarActividad('proyecto')}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Agregar Proyecto
            </button>
            <button
              onClick={() => handleAgregarActividad('apoyo')}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Agregar Actividad de Apoyo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTE: FORMULARIO PROYECTO
// ============================================================================

interface FormularioProyectoProps {
  actividad: ActividadInvestigacion;
  onGuardar: (actividad: ActividadInvestigacion) => void;
  onCancelar: () => void;
}

function FormularioProyecto({
  actividad: actividadInicial,
  onGuardar,
  onCancelar
}: FormularioProyectoProps) {
  const [actividad, setActividad] = useState(actividadInicial);

  const handleCambioRol = (rol: string) => {
    const rolInfo = ROLES_INVESTIGACION.find(r => r.codigo === rol);
    setActividad({
      ...actividad,
      rol: rol as any,
      horas: rolInfo?.maxHoras || 400
    });
  };

  const handleGuardar = () => {
    if (!actividad.nombreProyecto?.trim()) {
      alert('Ingresa el nombre del proyecto');
      return;
    }
    if (!actividad.grupoInvestigacion) {
      alert('Selecciona un grupo de investigación');
      return;
    }
    if (!actividad.lineaInvestigacion) {
      alert('Selecciona una línea de investigación');
      return;
    }
    if (!actividad.fechaInicio || !actividad.fechaTerminacion) {
      alert('Ingresa las fechas del proyecto');
      return;
    }

    onGuardar(actividad);
  };

  const rolSeleccionado = ROLES_INVESTIGACION.find(r => r.codigo === actividad.rol);

  return (
    <div className="bg-white border-2 border-purple-300 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900">
          {actividadInicial.nombreProyecto ? 'Editar Proyecto' : 'Nuevo Proyecto de Investigación'}
        </h3>
        <button
          onClick={onCancelar}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Nombre del Proyecto */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nombre del Proyecto *
          </label>
          <input
            type="text"
            value={actividad.nombreProyecto}
            onChange={(e) => setActividad({ ...actividad, nombreProyecto: e.target.value })}
            placeholder="Ej: Análisis de políticas públicas en Colombia..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Grupo de Investigación */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Grupo de Investigación *
          </label>
          <select
            value={actividad.grupoInvestigacion}
            onChange={(e) => setActividad({ ...actividad, grupoInvestigacion: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Selecciona...</option>
            {GRUPOS_INVESTIGACION.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        {/* Línea de Investigación */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Línea de Investigación *
          </label>
          <select
            value={actividad.lineaInvestigacion}
            onChange={(e) => setActividad({ ...actividad, lineaInvestigacion: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Selecciona...</option>
            {LINEAS_INVESTIGACION.map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>

        {/* Rol */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rol que Cumples *
          </label>
          <select
            value={actividad.rol}
            onChange={(e) => handleCambioRol(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {ROLES_INVESTIGACION.map(r => (
              <option key={r.codigo} value={r.codigo}>
                {r.nombre} (máx {r.maxHoras} hrs - {r.porcentaje})
              </option>
            ))}
          </select>
        </div>

        {/* Recibe Estímulo Económico */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ¿Recibes Estímulo Económico? *
          </label>
          <div className="flex items-center gap-4 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="estimulo"
                checked={!actividad.recibeEstimulo}
                onChange={() => setActividad({ ...actividad, recibeEstimulo: false })}
                className="w-4 h-4 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">NO - Se registra en PTA</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="estimulo"
                checked={actividad.recibeEstimulo}
                onChange={() => setActividad({ ...actividad, recibeEstimulo: true })}
                className="w-4 h-4 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">SÍ - NO se registra en PTA</span>
            </label>
          </div>
          {actividad.recibeEstimulo && (
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Las horas de este proyecto NO contarán en tu PTA
            </p>
          )}
        </div>

        {/* Fecha Inicio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fecha de Inicio *
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={actividad.fechaInicio}
              onChange={(e) => setActividad({ ...actividad, fechaInicio: e.target.value })}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Fecha Terminación */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fecha de Terminación *
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={actividad.fechaTerminacion}
              onChange={(e) => setActividad({ ...actividad, fechaTerminacion: e.target.value })}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Información del Rol */}
      {rolSeleccionado && (
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Award className="w-5 h-5 text-purple-600" />
            <h4 className="font-semibold text-purple-900">
              Rol: {rolSeleccionado.nombre}
            </h4>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-purple-700 mb-1">Horas Asignadas</p>
              <p className="text-2xl font-bold text-purple-900">{actividad.horas} hrs</p>
            </div>
            <div>
              <p className="text-purple-700 mb-1">Porcentaje del PTA</p>
              <p className="text-2xl font-bold text-purple-900">{rolSeleccionado.porcentaje}</p>
            </div>
          </div>
        </div>
      )}

      {/* Descripción */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Descripción del Proyecto
        </label>
        <textarea
          value={actividad.descripcion}
          onChange={(e) => setActividad({ ...actividad, descripcion: e.target.value })}
          rows={3}
          placeholder="Breve descripción del proyecto, objetivos, metodología..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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
          className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
        >
          <Save className="w-4 h-4" />
          Guardar Proyecto
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTE: FORMULARIO ACTIVIDAD DE APOYO
// ============================================================================

interface FormularioApoyoProps {
  actividad: ActividadInvestigacion;
  onGuardar: (actividad: ActividadInvestigacion) => void;
  onCancelar: () => void;
}

function FormularioApoyo({
  actividad: actividadInicial,
  onGuardar,
  onCancelar
}: FormularioApoyoProps) {
  const [actividad, setActividad] = useState(actividadInicial);

  const handleCambioActividad = (codigo: string) => {
    const actividadInfo = ACTIVIDADES_APOYO.find(a => a.codigo === codigo);
    setActividad({
      ...actividad,
      actividad: codigo,
      horas: actividadInfo?.horas || 0
    });
  };

  const handleGuardar = () => {
    if (!actividad.actividad) {
      alert('Selecciona una actividad de apoyo');
      return;
    }
    if (!actividad.fechaInicio || !actividad.fechaTerminacion) {
      alert('Ingresa las fechas de la actividad');
      return;
    }

    onGuardar(actividad);
  };

  const actividadSeleccionada = ACTIVIDADES_APOYO.find(a => a.codigo === actividad.actividad);

  return (
    <div className="bg-white border-2 border-purple-300 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900">
          Actividad de Apoyo a la Investigación
        </h3>
        <button
          onClick={onCancelar}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 mb-6">
        {/* Actividad */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de Actividad *
          </label>
          <select
            value={actividad.actividad}
            onChange={(e) => handleCambioActividad(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Selecciona...</option>
            {ACTIVIDADES_APOYO.map(a => (
              <option key={a.codigo} value={a.codigo}>
                {a.nombre} ({a.horas} hrs)
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Fecha Inicio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de Inicio *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={actividad.fechaInicio}
                onChange={(e) => setActividad({ ...actividad, fechaInicio: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Fecha Terminación */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de Terminación *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={actividad.fechaTerminacion}
                onChange={(e) => setActividad({ ...actividad, fechaTerminacion: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Información de Horas */}
      {actividadSeleccionada && (
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-purple-600" />
              <h4 className="font-semibold text-purple-900">
                {actividadSeleccionada.nombre}
              </h4>
            </div>
            <div className="text-right">
              <p className="text-sm text-purple-700 mb-1">Horas Asignadas</p>
              <p className="text-2xl font-bold text-purple-900">{actividad.horas} hrs</p>
            </div>
          </div>
        </div>
      )}

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
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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
          className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
        >
          <Save className="w-4 h-4" />
          Guardar Actividad
        </button>
      </div>
    </div>
  );
}

/**
 * FORMULARIO DE ACTIVIDADES DE EXTENSIÓN - PTA ESAP
 * 
 * Gestiona actividades de extensión académica según 4 categorías:
 * 1. Capacitación (Actividades de Formación y Capacitación)
 * 2. Procesos de Selección (Apoyo a procesos de selección y evaluación)
 * 3. Gestión Estatal (Participación en espacios de gestión pública)
 * 4. Alto Gobierno (Participación en altos cuerpos colegiados del Estado)
 * 
 * Límite: 25% del PTA (200 hrs para TC de 800 hrs)
 * 
 * Circular 003/2025 - Sección 8
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Trash2,
  Users as UsersIcon,
  Info,
  Calendar,
  Edit2,
  Save,
  X,
  AlertCircle,
  Building2,
  Award,
  FileCheck,
  Landmark
} from 'lucide-react';

// ============================================================================
// TIPOS
// ============================================================================

export interface ActividadExtension {
  id: string;
  tipo: 'Capacitación' | 'Procesos Selección' | 'Gestión Estatal' | 'Alto Gobierno';
  actividad: string; // Código de la actividad según catálogo
  nombreActividad?: string; // Nombre personalizado si es "Otra"
  entidadTerritorial?: string;
  horas: number;
  descripcion: string;
  fechaInicio: string;
  fechaTerminacion: string;
  observaciones: string;
}

interface FormularioExtensionProps {
  actividades: ActividadExtension[];
  horasProgramables: number;
  onChange: (actividades: ActividadExtension[]) => void;
}

// ============================================================================
// CATÁLOGOS DE EXTENSIÓN (Circular 003/2025 - Sección 8)
// ============================================================================

const ACTIVIDADES_CAPACITACION = [
  { codigo: 'cap_diplomado', nombre: 'Diplomado de formación de funcionarios públicos', horas: 48 },
  { codigo: 'cap_curso', nombre: 'Curso de formación de funcionarios públicos', horas: 32 },
  { codigo: 'cap_taller', nombre: 'Taller de formación de funcionarios públicos', horas: 16 },
  { codigo: 'cap_seminario', nombre: 'Seminario o conversatorio', horas: 8 },
  { codigo: 'cap_conferencia', nombre: 'Conferencia magistral', horas: 4 },
  { codigo: 'cap_panel', nombre: 'Panel o mesa redonda', horas: 4 },
  { codigo: 'cap_foro', nombre: 'Foro o encuentro académico', horas: 8 },
  { codigo: 'cap_otro', nombre: 'Otra actividad de capacitación', horas: 0 }
];

const ACTIVIDADES_PROCESOS_SELECCION = [
  { codigo: 'sel_evaluador', nombre: 'Evaluador en procesos de selección de directivos públicos', horas: 32 },
  { codigo: 'sel_jurado', nombre: 'Jurado en concursos de méritos', horas: 24 },
  { codigo: 'sel_entrevistador', nombre: 'Entrevistador en procesos de selección', horas: 16 },
  { codigo: 'sel_par', nombre: 'Par evaluador de hojas de vida', horas: 16 },
  { codigo: 'sel_veedor', nombre: 'Veedor en procesos de selección', horas: 8 },
  { codigo: 'sel_otro', nombre: 'Otra actividad de procesos de selección', horas: 0 }
];

const ACTIVIDADES_GESTION_ESTATAL = [
  { codigo: 'ges_consejo_territorial', nombre: 'Miembro Consejo Territorial de Planeación', horas: 80 },
  { codigo: 'ges_consejo_politica', nombre: 'Miembro Consejo de Política Social', horas: 64 },
  { codigo: 'ges_comite_control', nombre: 'Miembro Comité de Control Social', horas: 48 },
  { codigo: 'ges_mesa_participacion', nombre: 'Participación en mesas de concertación ciudadana', horas: 32 },
  { codigo: 'ges_consultor', nombre: 'Consultoría o asesoría técnica a entidades públicas', horas: 64 },
  { codigo: 'ges_evaluador_proyectos', nombre: 'Evaluador de proyectos de inversión pública', horas: 40 },
  { codigo: 'ges_otro', nombre: 'Otra actividad de gestión estatal', horas: 0 }
];

const ACTIVIDADES_ALTO_GOBIERNO = [
  { codigo: 'ag_comision_regulacion', nombre: 'Miembro Comisión de Regulación', horas: 120 },
  { codigo: 'ag_comision_estudio', nombre: 'Miembro Comisión de Estudio (nacional)', horas: 96 },
  { codigo: 'ag_consejo_superior', nombre: 'Miembro Consejo Superior de entidad descentralizada', horas: 80 },
  { codigo: 'ag_junta_directiva', nombre: 'Miembro Junta Directiva de entidad del Estado', horas: 96 },
  { codigo: 'ag_consejo_asesor', nombre: 'Miembro Consejo Asesor Ministerial o Presidencial', horas: 80 },
  { codigo: 'ag_otro', nombre: 'Otra actividad de alto gobierno', horas: 0 }
];

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function FormularioExtension({
  actividades,
  horasProgramables,
  onChange
}: FormularioExtensionProps) {
  const [modoCreacion, setModoCreacion] = useState(false);
  const [actividadEditando, setActividadEditando] = useState<ActividadExtension | null>(null);
  const [tipoNueva, setTipoNueva] = useState<ActividadExtension['tipo']>('Capacitación');

  const handleAgregarActividad = (tipo: ActividadExtension['tipo']) => {
    setTipoNueva(tipo);
    setModoCreacion(true);
    setActividadEditando({
      id: `ext-${Date.now()}`,
      tipo,
      actividad: '',
      horas: 0,
      descripcion: '',
      fechaInicio: '',
      fechaTerminacion: '',
      observaciones: ''
    });
  };

  const handleGuardarActividad = (actividad: ActividadExtension) => {
    if (actividades.find(a => a.id === actividad.id)) {
      onChange(actividades.map(a => (a.id === actividad.id ? actividad : a)));
    } else {
      onChange([...actividades, actividad]);
    }
    setModoCreacion(false);
    setActividadEditando(null);
  };

  const handleEliminarActividad = (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta actividad de extensión?')) {
      onChange(actividades.filter(a => a.id !== id));
    }
  };

  const handleEditarActividad = (actividad: ActividadExtension) => {
    setModoCreacion(true);
    setActividadEditando(actividad);
  };

  const handleCancelar = () => {
    setModoCreacion(false);
    setActividadEditando(null);
  };

  const totalHorasExtension = actividades.reduce((sum, act) => sum + act.horas, 0);
  const maxHorasExtension = horasProgramables * 0.25; // 25%
  const porcentajeUsado = (totalHorasExtension / maxHorasExtension) * 100;
  const excedeMaximo = totalHorasExtension > maxHorasExtension;

  // Agrupar actividades por tipo
  const actividadesPorTipo = {
    Capacitación: actividades.filter(a => a.tipo === 'Capacitación'),
    'Procesos Selección': actividades.filter(a => a.tipo === 'Procesos Selección'),
    'Gestión Estatal': actividades.filter(a => a.tipo === 'Gestión Estatal'),
    'Alto Gobierno': actividades.filter(a => a.tipo === 'Alto Gobierno')
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Actividades de Extensión
          </h2>
          <p className="text-gray-600">
            Registra tus actividades de extensión académica y proyección social.
          </p>
        </div>
      </div>

      {/* Información sobre categorías */}
      <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-teal-900 mb-1">
              Categorías de Extensión
            </h4>
            <div className="text-sm text-teal-700 space-y-1">
              <p>• <strong>Capacitación:</strong> Formación de funcionarios públicos (diplomados, cursos, talleres)</p>
              <p>• <strong>Procesos de Selección:</strong> Participación en selección de directivos públicos</p>
              <p>• <strong>Gestión Estatal:</strong> Consejos, comités, consultorías a entidades públicas</p>
              <p>• <strong>Alto Gobierno:</strong> Comisiones, juntas directivas, consejos asesores nacionales</p>
              <p className="mt-2">• <strong>Límite global:</strong> 25% del PTA ({maxHorasExtension} hrs)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Botones por categoría */}
      {!modoCreacion && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <button
            onClick={() => handleAgregarActividad('Capacitación')}
            className="flex flex-col items-center gap-2 p-4 bg-teal-50 border-2 border-teal-200 hover:border-teal-400 rounded-lg transition-all group"
          >
            <Award className="w-6 h-6 text-teal-600 group-hover:scale-110 transition-transform" />
            <span className="font-medium text-teal-900 text-sm">Capacitación</span>
            <span className="text-xs text-teal-600">
              {actividadesPorTipo.Capacitación.length} actividad(es)
            </span>
          </button>

          <button
            onClick={() => handleAgregarActividad('Procesos Selección')}
            className="flex flex-col items-center gap-2 p-4 bg-blue-50 border-2 border-blue-200 hover:border-blue-400 rounded-lg transition-all group"
          >
            <FileCheck className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform" />
            <span className="font-medium text-blue-900 text-sm">Procesos Selección</span>
            <span className="text-xs text-blue-600">
              {actividadesPorTipo['Procesos Selección'].length} actividad(es)
            </span>
          </button>

          <button
            onClick={() => handleAgregarActividad('Gestión Estatal')}
            className="flex flex-col items-center gap-2 p-4 bg-emerald-50 border-2 border-emerald-200 hover:border-emerald-400 rounded-lg transition-all group"
          >
            <Building2 className="w-6 h-6 text-emerald-600 group-hover:scale-110 transition-transform" />
            <span className="font-medium text-emerald-900 text-sm">Gestión Estatal</span>
            <span className="text-xs text-emerald-600">
              {actividadesPorTipo['Gestión Estatal'].length} actividad(es)
            </span>
          </button>

          <button
            onClick={() => handleAgregarActividad('Alto Gobierno')}
            className="flex flex-col items-center gap-2 p-4 bg-indigo-50 border-2 border-indigo-200 hover:border-indigo-400 rounded-lg transition-all group"
          >
            <Landmark className="w-6 h-6 text-indigo-600 group-hover:scale-110 transition-transform" />
            <span className="font-medium text-indigo-900 text-sm">Alto Gobierno</span>
            <span className="text-xs text-indigo-600">
              {actividadesPorTipo['Alto Gobierno'].length} actividad(es)
            </span>
          </button>
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
            <FormularioActividadExtension
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
            const IconoTipo = 
              actividad.tipo === 'Capacitación' ? Award :
              actividad.tipo === 'Procesos Selección' ? FileCheck :
              actividad.tipo === 'Gestión Estatal' ? Building2 :
              Landmark;

            const colorClase = 
              actividad.tipo === 'Capacitación' ? 'border-teal-200 bg-teal-50' :
              actividad.tipo === 'Procesos Selección' ? 'border-blue-200 bg-blue-50' :
              actividad.tipo === 'Gestión Estatal' ? 'border-emerald-200 bg-emerald-50' :
              'border-indigo-200 bg-indigo-50';

            const colorIcono = 
              actividad.tipo === 'Capacitación' ? 'text-teal-600' :
              actividad.tipo === 'Procesos Selección' ? 'text-blue-600' :
              actividad.tipo === 'Gestión Estatal' ? 'text-emerald-600' :
              'text-indigo-600';

            const obtenerNombreActividad = () => {
              const catalogo = 
                actividad.tipo === 'Capacitación' ? ACTIVIDADES_CAPACITACION :
                actividad.tipo === 'Procesos Selección' ? ACTIVIDADES_PROCESOS_SELECCION :
                actividad.tipo === 'Gestión Estatal' ? ACTIVIDADES_GESTION_ESTATAL :
                ACTIVIDADES_ALTO_GOBIERNO;
              
              return catalogo.find(a => a.codigo === actividad.actividad)?.nombre || actividad.nombreActividad || 'Actividad de extensión';
            };

            return (
              <motion.div
                key={actividad.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-white border rounded-lg p-4 hover:shadow-md transition-all ${colorClase}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 ${colorClase} rounded-lg`}>
                        <IconoTipo className={`w-5 h-5 ${colorIcono}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900">
                            {obtenerNombreActividad()}
                          </h4>
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                            {actividad.tipo}
                          </span>
                        </div>
                        {actividad.entidadTerritorial && (
                          <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                            <Building2 className="w-3 h-3" />
                            {actividad.entidadTerritorial}
                          </p>
                        )}
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
                    <p className="font-bold text-teal-600">{actividad.horas} hrs</p>
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

          {/* Total de Horas de Extensión */}
          <div className={`border rounded-lg p-4 ${
            excedeMaximo 
              ? 'bg-red-50 border-red-200' 
              : 'bg-teal-50 border-teal-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <UsersIcon className={`w-5 h-5 ${
                  excedeMaximo ? 'text-red-600' : 'text-teal-600'
                }`} />
                <span className={`font-semibold ${
                  excedeMaximo ? 'text-red-900' : 'text-teal-900'
                }`}>
                  Total Horas Extensión
                </span>
              </div>
              <div className="text-right">
                <span className={`text-2xl font-bold ${
                  excedeMaximo ? 'text-red-600' : 'text-teal-600'
                }`}>
                  {totalHorasExtension} hrs
                </span>
                <p className="text-xs text-gray-600">
                  de {maxHorasExtension} hrs máx (25%)
                </p>
              </div>
            </div>

            {/* Barra de progreso */}
            <div className="h-2 bg-white rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  excedeMaximo ? 'bg-red-500' : 'bg-teal-500'
                }`}
                style={{ width: `${Math.min(porcentajeUsado, 100)}%` }}
              />
            </div>

            {excedeMaximo && (
              <div className="flex items-start gap-2 mt-3">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">
                  Excedes el máximo permitido de 25% en Extensión. 
                  Reduce {totalHorasExtension - maxHorasExtension} horas.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <UsersIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <h3 className="font-semibold text-gray-900 mb-1">
            No hay actividades de extensión
          </h3>
          <p className="text-gray-600 mb-4">
            Agrega actividades de extensión académica (opcional)
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTE: FORMULARIO ACTIVIDAD EXTENSIÓN
// ============================================================================

interface FormularioActividadExtensionProps {
  actividad: ActividadExtension;
  onGuardar: (actividad: ActividadExtension) => void;
  onCancelar: () => void;
}

function FormularioActividadExtension({
  actividad: actividadInicial,
  onGuardar,
  onCancelar
}: FormularioActividadExtensionProps) {
  const [actividad, setActividad] = useState(actividadInicial);

  const catalogoActividades = 
    actividad.tipo === 'Capacitación' ? ACTIVIDADES_CAPACITACION :
    actividad.tipo === 'Procesos Selección' ? ACTIVIDADES_PROCESOS_SELECCION :
    actividad.tipo === 'Gestión Estatal' ? ACTIVIDADES_GESTION_ESTATAL :
    ACTIVIDADES_ALTO_GOBIERNO;

  const handleCambioActividad = (codigo: string) => {
    const actividadInfo = catalogoActividades.find(a => a.codigo === codigo);
    setActividad({
      ...actividad,
      actividad: codigo,
      horas: actividadInfo?.horas || 0
    });
  };

  const handleGuardar = () => {
    if (!actividad.actividad) {
      alert('Selecciona una actividad');
      return;
    }
    
    const actividadSeleccionada = catalogoActividades.find(a => a.codigo === actividad.actividad);
    if (actividadSeleccionada?.codigo.endsWith('_otro') && !actividad.nombreActividad?.trim()) {
      alert('Ingresa el nombre de la actividad');
      return;
    }

    if (actividad.horas <= 0) {
      alert('Ingresa las horas de la actividad');
      return;
    }
    if (!actividad.fechaInicio || !actividad.fechaTerminacion) {
      alert('Ingresa las fechas de la actividad');
      return;
    }

    onGuardar(actividad);
  };

  const actividadSeleccionada = catalogoActividades.find(a => a.codigo === actividad.actividad);
  const esOtraActividad = actividadSeleccionada?.codigo.endsWith('_otro');

  const colorBorde = 
    actividad.tipo === 'Capacitación' ? 'border-teal-300' :
    actividad.tipo === 'Procesos Selección' ? 'border-blue-300' :
    actividad.tipo === 'Gestión Estatal' ? 'border-emerald-300' :
    'border-indigo-300';

  const colorBoton = 
    actividad.tipo === 'Capacitación' ? 'bg-teal-600 hover:bg-teal-700' :
    actividad.tipo === 'Procesos Selección' ? 'bg-blue-600 hover:bg-blue-700' :
    actividad.tipo === 'Gestión Estatal' ? 'bg-emerald-600 hover:bg-emerald-700' :
    'bg-indigo-600 hover:bg-indigo-700';

  return (
    <div className={`bg-white border-2 ${colorBorde} rounded-lg p-6`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900">
          {actividadInicial.actividad ? 'Editar Actividad' : `Nueva Actividad - ${actividad.tipo}`}
        </h3>
        <button
          onClick={onCancelar}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 mb-6">
        {/* Tipo de Actividad */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Actividad *
          </label>
          <select
            value={actividad.actividad}
            onChange={(e) => handleCambioActividad(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Selecciona...</option>
            {catalogoActividades.map(a => (
              <option key={a.codigo} value={a.codigo}>
                {a.nombre} {a.horas > 0 && `(${a.horas} hrs)`}
              </option>
            ))}
          </select>
        </div>

        {/* Nombre personalizado si es "Otra" */}
        {esOtraActividad && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de la Actividad *
            </label>
            <input
              type="text"
              value={actividad.nombreActividad || ''}
              onChange={(e) => setActividad({ ...actividad, nombreActividad: e.target.value })}
              placeholder="Especifica el nombre de la actividad..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        )}

        {/* Entidad Territorial (opcional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Entidad o Territorial (opcional)
          </label>
          <input
            type="text"
            value={actividad.entidadTerritorial || ''}
            onChange={(e) => setActividad({ ...actividad, entidadTerritorial: e.target.value })}
            placeholder="Ej: Gobernación de Cundinamarca, Alcaldía de Bogotá..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

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
              disabled={!esOtraActividad}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-100"
            />
            {!esOtraActividad && (
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
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
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
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
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
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
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
          className={`flex items-center gap-2 px-6 py-2 text-white rounded-lg transition-colors font-medium ${colorBoton}`}
        >
          <Save className="w-4 h-4" />
          Guardar Actividad
        </button>
      </div>
    </div>
  );
}

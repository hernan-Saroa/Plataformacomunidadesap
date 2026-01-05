/**
 * FORMULARIO DE ACTIVIDADES DE DOCENCIA - PTA ESAP
 * 
 * Permite agregar asignaturas con cálculo automático de horas según Criterio 1+2
 * de la Circular 003/2025:
 * 
 * Horas PTA = Horas Base × 3
 * (1 hora clase + 1 hora preparación + 1 hora acompañamiento)
 * 
 * Soporta:
 * - Pregrado AP/EP (Sede Central): 64 hrs base → 192 hrs PTA
 * - Pregrado APT (Nacional): 16 hrs/crédito × créditos × 3
 * - Especializaciones: 16 hrs/crédito × créditos × 3
 * - Maestrías: 12 hrs/crédito × créditos × 3
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Trash2,
  BookOpen,
  Calculator,
  Info,
  Users as UsersIcon,
  Calendar,
  Edit2,
  Save,
  X
} from 'lucide-react';

// ============================================================================
// TIPOS
// ============================================================================

export interface ActividadDocencia {
  id: string;
  territorial: string;
  programa: 'AP' | 'EP' | 'APT' | 'ESP' | 'MAE' | 'DOC';
  asignatura: string;
  nucleoTematico: string;
  ubicacionSemestral: number;
  totalEstudiantes: number;
  creditos: number;
  horasBase: number;
  horasPTA: number; // Calculado: horasBase × 3
  fechaInicio: string;
  fechaTerminacion: string;
  observaciones: string;
}

interface FormularioDocenciaProps {
  actividades: ActividadDocencia[];
  onChange: (actividades: ActividadDocencia[]) => void;
}

// ============================================================================
// CATÁLOGOS (Simplificados - vendrán de /data/catalogosPTA.ts)
// ============================================================================

const PROGRAMAS = [
  { codigo: 'AP', nombre: 'Administración Pública (Pregrado Sede Central)', horasBasePorCredito: 64, tipo: 'fijo' },
  { codigo: 'EP', nombre: 'Economía Pública (Pregrado Sede Central)', horasBasePorCredito: 64, tipo: 'fijo' },
  { codigo: 'APT', nombre: 'Administración Pública Territorial', horasBasePorCredito: 16, tipo: 'variable' },
  { codigo: 'ESP', nombre: 'Especialización', horasBasePorCredito: 16, tipo: 'variable' },
  { codigo: 'MAE', nombre: 'Maestría', horasBasePorCredito: 12, tipo: 'variable' }
];

const NUCLEOS_TEMATICOS = [
  'Estado y Poder',
  'Gestión Pública',
  'Hacienda Pública',
  'Gestión Territorial',
  'Idioma Extranjero',
  'Fundamentación Cuantitativa',
  'Alta Dirección',
  'Investigación'
];

const TERRITORIALES = [
  'Sede Central',
  'Antioquia',
  'Atlántico',
  'Bolívar',
  'Boyacá',
  'Caldas',
  'Cauca',
  'Cesar',
  'Chocó',
  'Cundinamarca',
  'Huila',
  'Meta',
  'Nariño',
  'Norte de Santander',
  'Quindío',
  'Risaralda',
  'Santander',
  'Tolima',
  'Valle del Cauca'
];

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function FormularioDocencia({ actividades, onChange }: FormularioDocenciaProps) {
  const [modoCreacion, setModoCreacion] = useState(false);
  const [actividadEditando, setActividadEditando] = useState<ActividadDocencia | null>(null);

  const handleAgregarActividad = () => {
    setModoCreacion(true);
    setActividadEditando({
      id: `doc-${Date.now()}`,
      territorial: '',
      programa: 'AP',
      asignatura: '',
      nucleoTematico: '',
      ubicacionSemestral: 1,
      totalEstudiantes: 0,
      creditos: 3,
      horasBase: 64,
      horasPTA: 192,
      fechaInicio: '',
      fechaTerminacion: '',
      observaciones: ''
    });
  };

  const handleGuardarActividad = (actividad: ActividadDocencia) => {
    if (actividades.find(a => a.id === actividad.id)) {
      // Editar existente
      onChange(actividades.map(a => (a.id === actividad.id ? actividad : a)));
    } else {
      // Agregar nueva
      onChange([...actividades, actividad]);
    }
    setModoCreacion(false);
    setActividadEditando(null);
  };

  const handleEliminarActividad = (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta actividad de docencia?')) {
      onChange(actividades.filter(a => a.id !== id));
    }
  };

  const handleEditarActividad = (actividad: ActividadDocencia) => {
    setModoCreacion(true);
    setActividadEditando(actividad);
  };

  const handleCancelar = () => {
    setModoCreacion(false);
    setActividadEditando(null);
  };

  const totalHorasDocencia = actividades.reduce((sum, act) => sum + act.horasPTA, 0);

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Actividades de Docencia
          </h2>
          <p className="text-gray-600">
            Agrega las asignaturas que impartirás este período. El sistema calcula
            automáticamente las horas según el Criterio 1+2.
          </p>
        </div>

        {!modoCreacion && (
          <button
            onClick={handleAgregarActividad}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            Agregar Asignatura
          </button>
        )}
      </div>

      {/* Información del Criterio 1+2 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-1">
              Criterio 1+2 (Circular 003/2025)
            </h4>
            <p className="text-sm text-blue-700">
              Por cada hora de clase se incluyen 2 horas adicionales de dedicación curricular
              (1 hora preparación + 1 hora acompañamiento). El sistema calcula:{' '}
              <span className="font-semibold">Horas PTA = Horas Base × 3</span>
            </p>
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
            <FormularioActividadDocencia
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
          {actividades.map((actividad, index) => (
            <motion.div
              key={actividad.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <BookOpen className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{actividad.asignatura}</h4>
                      <p className="text-sm text-gray-600">
                        {PROGRAMAS.find(p => p.codigo === actividad.programa)?.nombre} •{' '}
                        {actividad.territorial}
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
                <div>
                  <p className="text-gray-600 mb-1">Créditos</p>
                  <p className="font-semibold text-gray-900">{actividad.creditos}</p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Estudiantes</p>
                  <div className="flex items-center gap-1">
                    <UsersIcon className="w-4 h-4 text-gray-400" />
                    <p className="font-semibold text-gray-900">{actividad.totalEstudiantes}</p>
                  </div>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Horas Base</p>
                  <p className="font-semibold text-gray-900">{actividad.horasBase} hrs</p>
                </div>
                <div className="md:col-span-1">
                  <p className="text-gray-600 mb-1">Horas PTA (× 3)</p>
                  <div className="flex items-center gap-1">
                    <Calculator className="w-4 h-4 text-blue-600" />
                    <p className="font-bold text-blue-600">{actividad.horasPTA} hrs</p>
                  </div>
                </div>
              </div>

              {actividad.observaciones && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-600">{actividad.observaciones}</p>
                </div>
              )}
            </motion.div>
          ))}

          {/* Total de Horas de Docencia */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-blue-900">Total Horas Docencia</span>
              </div>
              <span className="text-2xl font-bold text-blue-600">
                {totalHorasDocencia} hrs
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <h3 className="font-semibold text-gray-900 mb-1">
            No hay actividades de docencia
          </h3>
          <p className="text-gray-600 mb-4">
            Agrega al menos una asignatura para continuar
          </p>
          <button
            onClick={handleAgregarActividad}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Agregar Primera Asignatura
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTE: FORMULARIO DE ACTIVIDAD
// ============================================================================

interface FormularioActividadDocenciaProps {
  actividad: ActividadDocencia;
  onGuardar: (actividad: ActividadDocencia) => void;
  onCancelar: () => void;
}

function FormularioActividadDocencia({
  actividad: actividadInicial,
  onGuardar,
  onCancelar
}: FormularioActividadDocenciaProps) {
  const [actividad, setActividad] = useState(actividadInicial);

  // Calcular horas automáticamente cuando cambian programa o créditos
  const calcularHoras = (programa: string, creditos: number) => {
    const prog = PROGRAMAS.find(p => p.codigo === programa);
    if (!prog) return { horasBase: 0, horasPTA: 0 };

    let horasBase = 0;

    if (prog.tipo === 'fijo') {
      // AP y EP: 64 hrs fijas
      horasBase = 64;
    } else {
      // APT, ESP, MAE: hrs por crédito × créditos
      horasBase = prog.horasBasePorCredito * creditos;
    }

    const horasPTA = horasBase * 3; // Criterio 1+2

    return { horasBase, horasPTA };
  };

  const handleCambioPrograma = (programa: string) => {
    const { horasBase, horasPTA } = calcularHoras(programa, actividad.creditos);
    setActividad({
      ...actividad,
      programa: programa as any,
      horasBase,
      horasPTA
    });
  };

  const handleCambioCreditos = (creditos: number) => {
    const { horasBase, horasPTA } = calcularHoras(actividad.programa, creditos);
    setActividad({
      ...actividad,
      creditos,
      horasBase,
      horasPTA
    });
  };

  const handleGuardar = () => {
    // Validaciones básicas
    if (!actividad.territorial) {
      alert('Selecciona una sede territorial');
      return;
    }
    if (!actividad.asignatura.trim()) {
      alert('Ingresa el nombre de la asignatura');
      return;
    }
    if (!actividad.nucleoTematico) {
      alert('Selecciona un núcleo temático');
      return;
    }
    if (!actividad.fechaInicio || !actividad.fechaTerminacion) {
      alert('Ingresa las fechas de inicio y terminación');
      return;
    }

    onGuardar(actividad);
  };

  const programaSeleccionado = PROGRAMAS.find(p => p.codigo === actividad.programa);

  return (
    <div className="bg-white border-2 border-blue-300 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900">
          {actividadInicial.asignatura ? 'Editar Asignatura' : 'Nueva Asignatura'}
        </h3>
        <button
          onClick={onCancelar}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Territorial */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sede Territorial *
          </label>
          <select
            value={actividad.territorial}
            onChange={(e) => setActividad({ ...actividad, territorial: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecciona...</option>
            {TERRITORIALES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Programa */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Programa Académico *
          </label>
          <select
            value={actividad.programa}
            onChange={(e) => handleCambioPrograma(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {PROGRAMAS.map(p => (
              <option key={p.codigo} value={p.codigo}>{p.nombre}</option>
            ))}
          </select>
        </div>

        {/* Nombre Asignatura */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nombre de la Asignatura *
          </label>
          <input
            type="text"
            value={actividad.asignatura}
            onChange={(e) => setActividad({ ...actividad, asignatura: e.target.value })}
            placeholder="Ej: Gestión Pública, Estado y Poder..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Núcleo Temático */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Núcleo Temático *
          </label>
          <select
            value={actividad.nucleoTematico}
            onChange={(e) => setActividad({ ...actividad, nucleoTematico: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecciona...</option>
            {NUCLEOS_TEMATICOS.map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        {/* Ubicación Semestral */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ubicación Semestral
          </label>
          <input
            type="number"
            min="1"
            max="10"
            value={actividad.ubicacionSemestral}
            onChange={(e) => setActividad({ ...actividad, ubicacionSemestral: parseInt(e.target.value) || 1 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Total Estudiantes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Total Estudiantes
          </label>
          <input
            type="number"
            min="0"
            value={actividad.totalEstudiantes}
            onChange={(e) => setActividad({ ...actividad, totalEstudiantes: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Créditos */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Número de Créditos *
          </label>
          <input
            type="number"
            min="1"
            max="4"
            value={actividad.creditos}
            onChange={(e) => handleCambioCreditos(parseInt(e.target.value) || 1)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Cálculo Automático de Horas */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <Calculator className="w-5 h-5 text-blue-600" />
          <h4 className="font-semibold text-blue-900">Cálculo Automático (Criterio 1+2)</h4>
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-blue-700 mb-1">Horas Base</p>
            <p className="text-xl font-bold text-blue-900">{actividad.horasBase}</p>
            <p className="text-xs text-blue-600">
              {programaSeleccionado?.tipo === 'fijo' 
                ? 'Fijas' 
                : `${programaSeleccionado?.horasBasePorCredito} × ${actividad.creditos}`}
            </p>
          </div>
          <div>
            <p className="text-sm text-blue-700 mb-1">Multiplicador</p>
            <p className="text-xl font-bold text-blue-900">× 3</p>
            <p className="text-xs text-blue-600">Criterio 1+2</p>
          </div>
          <div className="bg-white rounded-lg p-2">
            <p className="text-sm text-blue-700 mb-1">Horas PTA</p>
            <p className="text-2xl font-bold text-blue-600">{actividad.horasPTA}</p>
            <p className="text-xs text-blue-600">Total asignado</p>
          </div>
        </div>
      </div>

      {/* Observaciones */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Observaciones (opcional)
        </label>
        <textarea
          value={actividad.observaciones}
          onChange={(e) => setActividad({ ...actividad, observaciones: e.target.value })}
          rows={3}
          placeholder="Información adicional sobre esta asignatura..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
        >
          <Save className="w-4 h-4" />
          Guardar Asignatura
        </button>
      </div>
    </div>
  );
}

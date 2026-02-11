/**
 * ============================================
 * SECCIÓN: HALLAZGOS EN EXPEDIENTE
 * ============================================
 * 
 * Componente para gestionar hallazgos dentro del expediente de auditoría
 * 
 * FUNCIONALIDADES:
 * - Lista de hallazgos con filtros
 * - Crear nuevo hallazgo
 * - Editar hallazgo existente
 * - Ver detalle de hallazgo
 * - Filtros por tipo, severidad, estado
 * 
 * ÚLTIMA ACTUALIZACIÓN: 23 Enero 2026
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertCircle, Plus, Edit2, Eye, Trash2, Search, Filter,
  CheckCircle, Clock, AlertTriangle, FileText, X
} from 'lucide-react';
import { ButtonSIGL } from '../gestion-legal/design-system/ButtonSIGL';
import { BadgeSIGL } from '../gestion-legal/design-system/BadgeSIGL';
import { CardSIGL } from '../gestion-legal/design-system/CardSIGL';
import { useHallazgos, type Hallazgo, type TipoHallazgo, type SeveridadHallazgo, type EstadoHallazgo } from './HallazgosContext';
import { toast } from 'sonner@2.0.3';

interface Props {
  auditoriaId: string;
}

export function SeccionHallazgosExpediente({ auditoriaId }: Props) {
  const {
    obtenerHallazgosPorAuditoria,
    contarHallazgos,
    contarHallazgosCriticos,
    filtrarHallazgos
  } = useHallazgos();

  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<TipoHallazgo | ''>('');
  const [filtroSeveridad, setFiltroSeveridad] = useState<SeveridadHallazgo | ''>('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoHallazgo | ''>('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [hallazgoSeleccionado, setHallazgoSeleccionado] = useState<Hallazgo | null>(null);

  // Obtener hallazgos filtrados
  const hallazgosFiltrados = filtrarHallazgos(auditoriaId, {
    tipo: filtroTipo || undefined,
    severidad: filtroSeveridad || undefined,
    estado: filtroEstado || undefined,
    busqueda: busqueda || undefined
  });

  // Función para obtener color según severidad
  const getColorSeveridad = (severidad: SeveridadHallazgo): string => {
    switch (severidad) {
      case 'Crítica':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'Alta':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Media':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Baja':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Función para obtener color según estado
  const getColorEstado = (estado: EstadoHallazgo): string => {
    switch (estado) {
      case 'Abierto':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'En Análisis':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'Plan de Mejora':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'En Seguimiento':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Cerrado':
        return 'bg-green-50 text-green-700 border-green-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header con estadísticas */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            Hallazgos de Auditoría
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {contarHallazgos(auditoriaId)} hallazgo{contarHallazgos(auditoriaId) !== 1 ? 's' : ''} registrado{contarHallazgos(auditoriaId) !== 1 ? 's' : ''}
            {contarHallazgosCriticos(auditoriaId) > 0 && (
              <span className="ml-2 text-red-600 font-semibold">
                • {contarHallazgosCriticos(auditoriaId)} crítico{contarHallazgosCriticos(auditoriaId) !== 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
        <ButtonSIGL
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => {
            // TODO: Abrir modal de creación de hallazgo
            toast.info('Funcionalidad de creación en desarrollo');
          }}
        >
          Nuevo Hallazgo
        </ButtonSIGL>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por código, título o descripción..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <ButtonSIGL
            variant={mostrarFiltros ? 'primary' : 'outline'}
            icon={<Filter className="w-4 h-4" />}
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
          >
            Filtros
          </ButtonSIGL>
        </div>

        {/* Panel de filtros */}
        <AnimatePresence>
          {mostrarFiltros && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tipo de Hallazgo
                  </label>
                  <select
                    value={filtroTipo}
                    onChange={(e) => setFiltroTipo(e.target.value as TipoHallazgo | '')}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todos</option>
                    <option value="No Conformidad Mayor">No Conformidad Mayor</option>
                    <option value="No Conformidad Menor">No Conformidad Menor</option>
                    <option value="Observación">Observación</option>
                    <option value="Oportunidad de Mejora">Oportunidad de Mejora</option>
                    <option value="Hallazgo Positivo">Hallazgo Positivo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Severidad
                  </label>
                  <select
                    value={filtroSeveridad}
                    onChange={(e) => setFiltroSeveridad(e.target.value as SeveridadHallazgo | '')}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todas</option>
                    <option value="Crítica">Crítica</option>
                    <option value="Alta">Alta</option>
                    <option value="Media">Media</option>
                    <option value="Baja">Baja</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Estado
                  </label>
                  <select
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value as EstadoHallazgo | '')}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todos</option>
                    <option value="Abierto">Abierto</option>
                    <option value="En Análisis">En Análisis</option>
                    <option value="Plan de Mejora">Plan de Mejora</option>
                    <option value="En Seguimiento">En Seguimiento</option>
                    <option value="Cerrado">Cerrado</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Lista de hallazgos */}
      <div className="space-y-3">
        {hallazgosFiltrados.length === 0 ? (
          <CardSIGL variant="secondary">
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">
                {contarHallazgos(auditoriaId) === 0
                  ? 'No hay hallazgos registrados en esta auditoría'
                  : 'No se encontraron hallazgos con los filtros aplicados'}
              </p>
              {contarHallazgos(auditoriaId) === 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  Haz clic en "Nuevo Hallazgo" para registrar el primer hallazgo
                </p>
              )}
            </div>
          </CardSIGL>
        ) : (
          hallazgosFiltrados.map((hallazgo) => (
            <motion.div
              key={hallazgo.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CardSIGL hover>
                <div className="p-4">
                  {/* Header del hallazgo */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-xs font-mono font-bold px-2 py-1 rounded"
                          style={{ background: '#E0EDFF', color: '#003DA5' }}
                        >
                          {hallazgo.codigo}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-1 rounded border ${getColorSeveridad(hallazgo.severidad)}`}>
                          {hallazgo.severidad}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-1 rounded border ${getColorEstado(hallazgo.estado)}`}>
                          {hallazgo.estado}
                        </span>
                      </div>
                      <h4 className="font-bold text-gray-900 text-sm mb-1">
                        {hallazgo.titulo}
                      </h4>
                      <p className="text-xs text-gray-600">
                        {hallazgo.tipo}
                      </p>
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-1">
                      <button
                        onClick={() => setHallazgoSeleccionado(hallazgo)}
                        className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                        title="Ver detalle"
                      >
                        <Eye className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => toast.info('Edición en desarrollo')}
                        className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>

                  {/* Descripción */}
                  <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                    {hallazgo.descripcion}
                  </p>

                  {/* Footer con información adicional */}
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200">
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Área Responsable:</p>
                      <p className="text-xs font-semibold text-gray-900">{hallazgo.areaResponsable}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Detectado por:</p>
                      <p className="text-xs font-semibold text-gray-900">{hallazgo.responsableDeteccion}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Criterio Normativo:</p>
                      <p className="text-xs font-semibold text-gray-900">{hallazgo.criterioNormativo}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Fecha Detección:</p>
                      <p className="text-xs font-semibold text-gray-900">{hallazgo.fechaDeteccion}</p>
                    </div>
                  </div>

                  {/* Evidencias */}
                  {hallazgo.evidencias && hallazgo.evidencias.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Evidencias:</p>
                      <div className="flex gap-2 flex-wrap">
                        {hallazgo.evidencias.map((evidencia, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200 flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3" />
                            {evidencia}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardSIGL>
            </motion.div>
          ))
        )}
      </div>

      {/* Modal de detalle (simple por ahora) */}
      <AnimatePresence>
        {hallazgoSeleccionado && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setHallazgoSeleccionado(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">
                  Detalle del Hallazgo
                </h3>
                <button
                  onClick={() => setHallazgoSeleccionado(null)}
                  className="p-1 rounded hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-sm font-mono font-bold px-3 py-1 rounded"
                      style={{ background: '#E0EDFF', color: '#003DA5' }}
                    >
                      {hallazgoSeleccionado.codigo}
                    </span>
                    <span className={`text-sm font-semibold px-3 py-1 rounded border ${getColorSeveridad(hallazgoSeleccionado.severidad)}`}>
                      {hallazgoSeleccionado.severidad}
                    </span>
                    <span className={`text-sm font-semibold px-3 py-1 rounded border ${getColorEstado(hallazgoSeleccionado.estado)}`}>
                      {hallazgoSeleccionado.estado}
                    </span>
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">
                    {hallazgoSeleccionado.titulo}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {hallazgoSeleccionado.tipo}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">
                    Descripción:
                  </label>
                  <p className="text-sm text-gray-700">
                    {hallazgoSeleccionado.descripcion}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">
                    Causa Raíz:
                  </label>
                  <p className="text-sm text-gray-700">
                    {hallazgoSeleccionado.causaRaiz}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">
                    Criterio Normativo:
                  </label>
                  <p className="text-sm text-gray-700">
                    {hallazgoSeleccionado.criterioNormativo}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">
                      Área Responsable:
                    </label>
                    <p className="text-sm text-gray-700">
                      {hallazgoSeleccionado.areaResponsable}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {hallazgoSeleccionado.responsableArea}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">
                      Detectado por:
                    </label>
                    <p className="text-sm text-gray-700">
                      {hallazgoSeleccionado.responsableDeteccion}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {hallazgoSeleccionado.fechaDeteccion}
                    </p>
                  </div>
                </div>

                {hallazgoSeleccionado.observaciones && (
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">
                      Observaciones:
                    </label>
                    <p className="text-sm text-gray-700">
                      {hallazgoSeleccionado.observaciones}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * MODAL NUEVO TIPO DE OFICIO
 * Modal para crear o editar tipos de oficios
 */

import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { motion } from 'motion/react';
import { CATEGORIAS_OFICIOS, type CategoriaOficioId, type TipoOficio } from './SeccionPlantillasOficiosUnificada';

interface ModalNuevoTipoOficioProps {
  tipoOficioEdicion: TipoOficio | null;
  onGuardar: (tipo: Omit<TipoOficio, 'id' | 'plantillas' | 'fechaCreacion' | 'fechaModificacion'>) => void;
  onCerrar: () => void;
}

export function ModalNuevoTipoOficio({ tipoOficioEdicion, onGuardar, onCerrar }: ModalNuevoTipoOficioProps) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState<CategoriaOficioId>('TRAMITE');
  const [orden, setOrden] = useState(1);
  const [activo, setActivo] = useState(true);

  useEffect(() => {
    if (tipoOficioEdicion) {
      setNombre(tipoOficioEdicion.nombre);
      setDescripcion(tipoOficioEdicion.descripcion);
      setCategoria(tipoOficioEdicion.categoria);
      setOrden(tipoOficioEdicion.orden);
      setActivo(tipoOficioEdicion.activo);
    }
  }, [tipoOficioEdicion]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGuardar({ nombre, descripcion, categoria, orden, activo });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" style={{ zIndex: 1000 }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
      >
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div 
            className="px-5 py-4 flex items-center justify-between text-white"
            style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' }}
          >
            <h3 className="text-lg font-bold">
              {tipoOficioEdicion ? 'Editar Tipo de Oficio' : 'Nuevo Tipo de Oficio'}
            </h3>
            <button type="button" onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-white/20">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Contenido */}
          <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nombre del Oficio *
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                placeholder="Ej: Oficio de Notificación de Auto"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Categoría *
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as CategoriaOficioId)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                {(Object.keys(CATEGORIAS_OFICIOS) as CategoriaOficioId[]).map((key) => (
                  <option key={key} value={key}>
                    {CATEGORIAS_OFICIOS[key].nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Descripción *
              </label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                required
                rows={3}
                placeholder="Describe cuándo y cómo usar este tipo de oficio..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Orden
                </label>
                <input
                  type="number"
                  value={orden}
                  onChange={(e) => setOrden(parseInt(e.target.value))}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Estado
                </label>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setActivo(!activo)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      activo ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      activo ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                  <span className="text-sm text-gray-700">{activo ? 'Activo' : 'Inactivo'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t px-6 py-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCerrar}
              className="px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-white"
              style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' }}
            >
              <Save className="w-4 h-4" />
              {tipoOficioEdicion ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

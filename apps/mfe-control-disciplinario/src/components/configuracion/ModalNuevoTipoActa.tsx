/**
 * MODAL NUEVO TIPO DE ACTA
 * Modal para crear o editar tipos de actas
 */

import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { motion } from 'motion/react';
import { TIPOS_ACTAS, type TipoActaId, type TipoActa } from './SeccionPlantillasActasUnificada';

interface ModalNuevoTipoActaProps {
  tipoActaEdicion: TipoActa | null;
  onGuardar: (tipo: Omit<TipoActa, 'id' | 'plantillas' | 'fechaCreacion' | 'fechaModificacion'>) => void;
  onCerrar: () => void;
}

export function ModalNuevoTipoActa({ tipoActaEdicion, onGuardar, onCerrar }: ModalNuevoTipoActaProps) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipo, setTipo] = useState<TipoActaId>('AUDIENCIA');
  const [orden, setOrden] = useState(1);
  const [activo, setActivo] = useState(true);

  useEffect(() => {
    if (tipoActaEdicion) {
      setNombre(tipoActaEdicion.nombre);
      setDescripcion(tipoActaEdicion.descripcion);
      setTipo(tipoActaEdicion.tipo);
      setOrden(tipoActaEdicion.orden);
      setActivo(tipoActaEdicion.activo);
    }
  }, [tipoActaEdicion]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGuardar({ nombre, descripcion, tipo, orden, activo });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
      >
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div 
            className="px-5 py-4 flex items-center justify-between text-white"
            style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}
          >
            <h3 className="text-lg font-bold">
              {tipoActaEdicion ? 'Editar Tipo de Acta' : 'Nuevo Tipo de Acta'}
            </h3>
            <button type="button" onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-white/20">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Contenido */}
          <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nombre del Acta *
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                placeholder="Ej: Acta de Audiencia de Descargos"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tipo de Acta *
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoActaId)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              >
                {(Object.keys(TIPOS_ACTAS) as TipoActaId[]).map((key) => (
                  <option key={key} value={key}>
                    {TIPOS_ACTAS[key].nombre}
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
                placeholder="Describe cuándo y cómo usar este tipo de acta..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
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
              style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}
            >
              <Save className="w-4 h-4" />
              {tipoActaEdicion ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

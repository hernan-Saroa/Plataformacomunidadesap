/**
 * CONFIGURACIÓN DE CARGOS Y CAPACIDAD
 * Componente modular para gestionar capacidad de cargos
 * Control Interno Disciplinario
 */

import { useState } from 'react';
import { Plus, AlertCircle, Trash2, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface Cargo {
  id: string;
  nombre: string;
  capacidad: number;
  activo: boolean;
}

const CARGOS_DEFECTO: Cargo[] = [
  { id: 'especializado', nombre: 'PROFESIONAL ESPECIALIZADO', capacidad: 12, activo: true },
  { id: 'universitario', nombre: 'PROFESIONAL UNIVERSITARIO', capacidad: 10, activo: true },
  { id: 'senior', nombre: 'PROFESIONAL SENIOR', capacidad: 15, activo: true },
  { id: 'coordinador', nombre: 'COORDINADOR', capacidad: 8, activo: true },
];

export function ConfiguracionCargos() {
  const [cargos, setCargos] = useState<Cargo[]>(CARGOS_DEFECTO);
  const [cambiosPendientes, setCambiosPendientes] = useState(false);

  const agregarCargo = () => {
    const nuevoCargo: Cargo = {
      id: `cargo-${Date.now()}`,
      nombre: 'NUEVO CARGO',
      capacidad: 10,
      activo: true,
    };
    setCargos([...cargos, nuevoCargo]);
    setCambiosPendientes(true);
    toast.success('Cargo agregado correctamente');
  };

  const eliminarCargo = (cargoId: string) => {
    if (window.confirm('¿Está seguro de eliminar este cargo?')) {
      setCargos(cargos.filter(c => c.id !== cargoId));
      setCambiosPendientes(true);
      toast.success('Cargo eliminado correctamente');
    }
  };

  const actualizarCargo = (cargoId: string, cambios: Partial<Cargo>) => {
    setCargos(cargos.map(c => 
      c.id === cargoId ? { ...c, ...cambios } : c
    ));
    setCambiosPendientes(true);
  };

  const guardarConfiguraciones = () => {
    try {
      localStorage.setItem('disciplinario-cargos', JSON.stringify(cargos));
      setCambiosPendientes(false);
      toast.success('Configuraciones guardadas correctamente');
    } catch (error) {
      console.error('❌ Error al guardar:', error);
      toast.error('Error al guardar configuraciones');
    }
  };

  const restablecerDefecto = () => {
    if (window.confirm('¿Está seguro de restablecer a valores por defecto?')) {
      setCargos(CARGOS_DEFECTO);
      setCambiosPendientes(true);
      toast.success('Configuraciones restablecidas');
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header con acciones */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Capacidad por Cargo</h3>
          <p className="text-sm text-gray-600 mt-1">
            Número máximo de procesos que puede gestionar cada tipo de profesional
          </p>
        </div>
        <div className="flex items-center gap-3">
          {cambiosPendientes && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
              <AlertCircle className="w-3 h-3 mr-1" />
              Sin guardar
            </span>
          )}
          <button
            onClick={restablecerDefecto}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Restablecer
          </button>
          <button
            onClick={guardarConfiguraciones}
            disabled={!cambiosPendientes}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ 
              background: cambiosPendientes ? 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' : '#9CA3AF',
            }}
          >
            <Save className="w-4 h-4" />
            Guardar Cambios
          </button>
        </div>
      </div>

      {/* Botón agregar */}
      <div className="flex justify-end">
        <button
          onClick={agregarCargo}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg"
          style={{ 
            background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)',
            boxShadow: '0 2px 4px rgba(41, 98, 255, 0.2)'
          }}
        >
          <Plus className="w-4 h-4" />
          Agregar Cargo
        </button>
      </div>

      {/* Grid de cargos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cargos.map((cargo) => (
          <div key={cargo.id} className="p-4 rounded-lg border-2 border-gray-200 bg-gradient-to-br from-blue-50 to-white">
            <div className="mb-3">
              <input
                type="text"
                value={cargo.nombre}
                onChange={(e) => actualizarCargo(cargo.id, { nombre: e.target.value.toUpperCase() })}
                className="w-full px-3 py-1.5 text-sm font-bold uppercase border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nombre del cargo"
              />
            </div>

            <div className="mb-3">
              <label className="text-xs font-semibold text-gray-700 mb-1 block text-center">
                Capacidad Máxima
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={cargo.capacidad}
                onChange={(e) => actualizarCargo(cargo.id, { capacidad: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ color: '#003DA5' }}
              />
              <p className="text-xs text-center mt-2 text-gray-600">
                procesos máximo
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cargo.activo}
                  onChange={(e) => actualizarCargo(cargo.id, { activo: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs font-semibold text-gray-700">Activo</span>
              </label>
              
              <button
                onClick={() => eliminarCargo(cargo.id)}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Nota informativa */}
      <div className="p-4 rounded-lg bg-blue-50 border-l-4 border-blue-500">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-800">
              <span className="font-bold">Recordatorio:</span> Estas son configuraciones de capacidad. Los usuarios se crean únicamente desde{' '}
              <span className="font-bold">Administración de Personas → Roles y Permisos</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

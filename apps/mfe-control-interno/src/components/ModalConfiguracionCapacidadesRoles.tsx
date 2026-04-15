import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Save, AlertCircle, RefreshCw, Briefcase, Clock, Target } from 'lucide-react';
import { toast } from 'sonner';
import { type CapacidadRol, CAPACIDADES_POR_DEFECTO } from './services/useConfiguracionCapacidadesGlobales';

interface ModalConfiguracionCapacidadesProps {
  capacidadesIniciales: CapacidadRol[];
  onGuardar: (nuevasCapacidades: CapacidadRol[]) => Promise<void>;
  onCerrar: () => void;
}

export function ModalConfiguracionCapacidadesRoles({
  capacidadesIniciales,
  onGuardar,
  onCerrar
}: ModalConfiguracionCapacidadesProps) {
  const [capacidades, setCapacidades] = useState<CapacidadRol[]>([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    // Inicializar estado con copia profunda para poder editar independientemente
    setCapacidades(JSON.parse(JSON.stringify(capacidadesIniciales)));
  }, [capacidadesIniciales]);

  const handleChange = (rol: string, campo: 'capacidadMaximaAuditorias' | 'horasMensualesDisponibles', valor: number) => {
    if (valor < 0) return;
    setCapacidades(prev => prev.map(c => c.rol === rol ? { ...c, [campo]: valor } : c));
  };

  const restaurarValoresPorDefecto = () => {
    setCapacidades(JSON.parse(JSON.stringify(CAPACIDADES_POR_DEFECTO)));
    toast.success('Valores restablecidos. Recuerda guardar los cambios.');
  };

  const handleGuardar = async () => {
    setGuardando(true);
    await onGuardar(capacidades);
    setGuardando(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Cabecera */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-blue-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900">Capacidades Globales por Rol</h3>
              <p className="text-sm text-gray-500">Configura los límites aplicados a todos los profesionales (Nuevos y actuales).</p>
            </div>
          </div>
          <button
            onClick={onCerrar}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabla */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 font-semibold text-gray-600 text-sm">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-blue-500" />
                      Rol OCI
                    </div>
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-600 text-sm w-40 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Target className="w-4 h-4 text-green-500" />
                      Auditorías Máx.
                    </div>
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-600 text-sm w-40 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Clock className="w-4 h-4 text-purple-500" />
                      Horas / Mes
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {capacidades.map(cap => (
                  <tr key={cap.rol} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-gray-800">{cap.rol}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={cap.capacidadMaximaAuditorias}
                        onChange={(e) => handleChange(cap.rol, 'capacidadMaximaAuditorias', parseInt(e.target.value) || 0)}
                        className="w-20 px-3 py-1.5 text-center border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 transition-shadow"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        min="0"
                        max="400"
                        step="10"
                        value={cap.horasMensualesDisponibles}
                        onChange={(e) => handleChange(cap.rol, 'horasMensualesDisponibles', parseInt(e.target.value) || 0)}
                        className="w-24 px-3 py-1.5 text-center border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-shadow"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-start gap-3 p-4 bg-blue-50 text-blue-800 rounded-xl border border-blue-100">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-600" />
            <p className="text-sm">
              <strong className="font-bold block mb-1">Aviso sobre la aplicación de cambios:</strong>
              Guardar esta configuración actualizará la capacidad y horas de <strong>todos los profesionales</strong> asignados actualmente bajo ese rol y servirá como valor predeterminado para los nuevos.
            </p>
          </div>
        </div>

        {/* Botones */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-white">
          <button
            type="button"
            onClick={restaurarValoresPorDefecto}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Valores por defecto
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onCerrar}
              className="px-5 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              disabled={guardando}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg shadow-sm transition-all"
            >
              {guardando ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Guardar Capacidades
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Necesario exportar este icono para el nuevo componente ya que no lo importe directo de lucide 
function Settings({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
    </svg>
  );
}

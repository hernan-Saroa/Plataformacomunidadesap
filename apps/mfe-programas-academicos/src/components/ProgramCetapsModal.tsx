import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Building2, MapPin, Search } from 'lucide-react';

interface ProgramCetapsModalProps {
  onClose: () => void;
  programaNombre: string;
  cetapsList: { ofertaId: string; estudiantes: number; cetap: string; dt: string }[];
  onUpdateEstudiantes: (ofertaId: string, estudiantes: number) => Promise<void>;
}

export function ProgramCetapsModal({ onClose, programaNombre, cetapsList, onUpdateEstudiantes }: ProgramCetapsModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [isUpdating, setIsUpdating] = useState(false);

  // Regla de negocio: mínimo 1, máximo 100 estudiantes por CETAP.
  const MIN_ESTUDIANTES = 1;
  const MAX_ESTUDIANTES = 100;
  const clampEstudiantes = (v: number) => {
    const n = Math.floor(Number(v));
    if (!Number.isFinite(n)) return MIN_ESTUDIANTES;
    return Math.min(MAX_ESTUDIANTES, Math.max(MIN_ESTUDIANTES, n));
  };

  const handleSave = async (ofertaId: string) => {
    const value = clampEstudiantes(editValue);
    try {
      setIsUpdating(true);
      await onUpdateEstudiantes(ofertaId, value);
      setEditingId(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(false);
    }
  };

  // Group and filter CETAPs by DT
  const groupedCetaps = useMemo(() => {
    const filtered = cetapsList.filter(
      c => 
        c.cetap.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.dt.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const grouped: Record<string, { ofertaId: string; estudiantes: number; cetap: string }[]> = {};
    filtered.forEach(item => {
      if (!grouped[item.dt]) {
        grouped[item.dt] = [];
      }
      grouped[item.dt].push(item);
    });

    return grouped;
  }, [cetapsList, searchTerm]);

  const dtNames = Object.keys(groupedCetaps).sort();

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[111] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#003DA5] to-[#0052cc] px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">
                  CETAPs Ofertados
                </h2>
                <p className="text-sm text-white/80">
                  {programaNombre} ({cetapsList.length} CETAPs en total)
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre de CETAP o Dirección Territorial..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] transition-all text-sm"
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
            {dtNames.length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900">No se encontraron CETAPs</h3>
                <p className="text-sm text-gray-500">
                  No hay resultados que coincidan con la búsqueda "{searchTerm}"
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {dtNames.map(dt => (
                  <div key={dt} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                      <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#003DA5]" />
                        {dt}
                      </h4>
                      <span className="bg-blue-100 text-[#003DA5] text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {groupedCetaps[dt].length}
                      </span>
                    </div>
                    <ul className="p-2 max-h-48 overflow-y-auto custom-scrollbar">
                      {groupedCetaps[dt].map((item, idx) => {
                        const isEditing = editingId === item.ofertaId;
                        return (
                          <li key={idx} className="px-3 py-2 hover:bg-blue-50/50 rounded-lg text-sm text-gray-600 transition-colors flex items-center justify-between group">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-300" />
                              {item.cetap}
                            </div>
                            <div className="flex items-center gap-2">
                              {isEditing ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    value={editValue}
                                    onChange={e => setEditValue(clampEstudiantes(Number(e.target.value)))}
                                    onBlur={() => setEditValue(v => clampEstudiantes(v))}
                                    className="w-16 h-6 px-1 border border-[#003DA5] rounded text-xs text-center"
                                    min={MIN_ESTUDIANTES}
                                    max={MAX_ESTUDIANTES}
                                    title="Entre 1 y 100 estudiantes"
                                    disabled={isUpdating}
                                  />
                                  <button 
                                    onClick={() => handleSave(item.ofertaId)}
                                    disabled={isUpdating}
                                    className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded hover:bg-green-200"
                                  >
                                    OK
                                  </button>
                                  <button 
                                    onClick={() => setEditingId(null)}
                                    disabled={isUpdating}
                                    className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded hover:bg-gray-200"
                                  >
                                    x
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full group-hover:bg-blue-100 transition-colors">
                                    {item.estudiantes} est.
                                  </span>
                                  <button 
                                    onClick={() => { setEditingId(item.ofertaId); setEditValue(item.estudiantes); }}
                                    className="opacity-0 group-hover:opacity-100 text-xs text-blue-600 hover:underline transition-opacity"
                                  >
                                    Editar
                                  </button>
                                </>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
}

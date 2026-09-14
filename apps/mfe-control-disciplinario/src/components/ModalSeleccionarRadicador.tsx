/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  MODAL SELECCIÓN DE RADICADOR - WORLD CLASS DESIGN          ║
 * ║  Control Interno Disciplinario - ESAP                       ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Modal para seleccionar un Secretario/Radicador al aprobar un auto.
 * Muestra la carga laboral de cada usuario.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, User, Users, TrendingUp, CheckCircle, Search,
  Mail, Briefcase, Clock, AlertCircle, Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { disciplinaryService } from '../../../services/api/disciplinary.service';

interface Radicador {
  id: string;
  nombre: string;
  email: string;
  autosAsignados: number;
  cargaPorcentaje: number;
}

interface ModalSeleccionarRadicadorProps {
  isOpen: boolean;
  autoTipo: string;
  procesoNumero: string;
  onClose: () => void;
  onSelect: (radicadorId: string, radicadorNombre: string) => void;
}

export function ModalSeleccionarRadicador({
  isOpen,
  autoTipo,
  procesoNumero,
  onClose,
  onSelect,
}: ModalSeleccionarRadicadorProps) {
  const [radicadores, setRadicadores] = useState<Radicador[]>([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [seleccionado, setSeleccionado] = useState<string>('');
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    if (isOpen) {
      cargarRadicadores();
    }
  }, [isOpen]);

  const cargarRadicadores = async () => {
    try {
      setLoading(true);
      const data = await disciplinaryService.getRadicadoresDisponibles();
      setRadicadores(data || []);
    } catch {
      toast.error('No se pudieron cargar los radicadores disponibles');
    } finally {
      setLoading(false);
    }
  };

  const radicadoresFiltrados = radicadores.filter((r) =>
    r.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    r.email.toLowerCase().includes(busqueda.toLowerCase())
  );

  const getCargaColor = (porcentaje: number) => {
    if (porcentaje >= 80) return { bg: '#FEE2E2', text: '#DC2626', border: '#FECACA' };
    if (porcentaje >= 50) return { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' };
    return { bg: '#D1FAE5', text: '#059669', border: '#A7F3D0' };
  };

  const handleConfirmar = async () => {
    if (!seleccionado) {
      toast.error('Debe seleccionar un radicador');
      return;
    }

    try {
      setConfirmando(true);
      const radicador = radicadores.find((r) => r.id === seleccionado);
      if (!radicador) return;

      onSelect(radicador.id, radicador.nombre);
    } catch {
      toast.error('Error al asignar radicador');
    } finally {
      setConfirmando(false);
    }
  };

  const tipoAutoFormateado = autoTipo.replace(/_/g, ' ').toLowerCase();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center z-[10001]"
          style={{ backgroundColor: 'rgba(0,0,0,0.60)', padding: '4vh 4vw' }}
          onClick={(e) => e.target === e.currentTarget && !confirmando && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl shadow-2xl w-full overflow-hidden flex flex-col"
            style={{ maxWidth: 700, maxHeight: '88vh' }}
          >
            {/* Header */}
            <div className="p-6 border-b" style={{ borderColor: '#E5E7EB' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#E0EDFF' }}>
                    <User className="w-6 h-6" style={{ color: '#003DA5' }} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold" style={{ color: '#1F2937' }}>
                      Asignar Secretario/Radicador
                    </h2>
                    <p className="text-sm" style={{ color: '#6B7280' }}>
                      {tipoAutoFormateado} — Proceso {procesoNumero}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  disabled={confirmando}
                  className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${confirmando ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <X className="w-5 h-5" style={{ color: '#6B7280' }} />
                </button>
              </div>
              <p className="text-sm mt-2" style={{ color: '#6B7280' }}>
                Seleccione el Secretario/Radicador responsable de realizar las actuaciones del auto.
              </p>
            </div>

            {/* Búsqueda */}
            <div className="px-6 pt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9CA3AF' }} />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre o correo..."
                  className="w-full pl-10 pr-4 py-2 border-2 rounded-xl focus:outline-none focus:border-[#003DA5] text-sm"
                  style={{ borderColor: '#E5E7EB' }}
                />
              </div>
            </div>

            {/* Lista de radicadores */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {loading ? (
                <div className="text-center py-10">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#003DA5]"></div>
                  <p className="text-sm text-gray-500 mt-2">Cargando radicadores...</p>
                </div>
              ) : radicadoresFiltrados.length === 0 ? (
                <div className="text-center py-10">
                  <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-600 font-semibold">No hay radicadores disponibles</p>
                </div>
              ) : (
                radicadoresFiltrados.map((radicador) => {
                  const carga = getCargaColor(radicador.cargaPorcentaje);
                  const isSelected = seleccionado === radicador.id;

                  return (
                    <div
                      key={radicador.id}
                      onClick={() => setSeleccionado(radicador.id)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected ? 'border-[#003DA5] bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                          style={{ background: isSelected ? '#003DA5' : '#E5E7EB', color: isSelected ? 'white' : '#6B7280' }}>
                          {radicador.nombre.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-sm" style={{ color: '#1F2937' }}>
                              {radicador.nombre}
                            </p>
                            {isSelected && (
                              <CheckCircle className="w-4 h-4" style={{ color: '#003DA5' }} />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Mail className="w-3 h-3" style={{ color: '#9CA3AF' }} />
                            <p className="text-xs" style={{ color: '#6B7280' }}>{radicador.email}</p>
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold"
                              style={{ background: carga.bg, color: carga.text, border: `1px solid ${carga.border}` }}
                            >
                              <Clock className="w-3 h-3" />
                              Carga: {radicador.cargaPorcentaje}%
                            </span>
                            <span className="text-xs" style={{ color: '#6B7280' }}>
                              {radicador.autosAsignados} auto(s) asignado(s)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t flex gap-3 justify-end" style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}>
              <button
                onClick={onClose}
                disabled={confirmando}
                className={`px-6 py-3 rounded-xl font-semibold border-2 hover:bg-gray-100 transition-colors ${confirmando ? 'opacity-60 cursor-not-allowed' : ''}`}
                style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmar}
                disabled={!seleccionado || confirmando}
                className={`px-6 py-3 rounded-xl font-semibold text-white hover:opacity-90 transition-opacity flex items-center gap-2 ${!seleccionado || confirmando ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{ background: '#003DA5' }}
              >
                {confirmando ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Asignando...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    Confirmar Asignación
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

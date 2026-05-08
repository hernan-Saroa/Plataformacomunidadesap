import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import {
  X,
  Shield,
  Users,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Globe,
  Check,
  Save
} from 'lucide-react';
import { toast } from 'sonner';
import { localRolesService, type Territorial, type CETAP, type ProgramaAcademico } from '../../services/api';

interface SystemRole {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  type: 'sistema' | 'personalizado';
  sistema_destino?: string;
  is_active: boolean;
  requires_2fa: boolean;
  usuarios_count: number;
  permisos_count: number;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at?: string;
  alcance?: {
    tipo: 'Global' | 'Filtrado';
    territorial: string;
    cetap: string;
    programa: string;
  };
}

interface ScopeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: SystemRole | null;
  onSave?: (roleId: string, alcanceData: any) => void;
}

export function ScopeConfigModal({ isOpen, onClose, role, onSave }: ScopeConfigModalProps) {
  const [territoriales, setTerritoriales] = useState<Territorial[]>([]);
  const [cetaps, setCetaps] = useState<CETAP[]>([]);
  const [programas, setProgramas] = useState<ProgramaAcademico[]>([]);
  const [loadingTerritoriales, setLoadingTerritoriales] = useState(false);
  const [loadingCetaps, setLoadingCetaps] = useState(false);
  const [loadingProgramas, setLoadingProgramas] = useState(false);

  // Paso 2 State
  const [tipoAlcance, setTipoAlcance] = useState<'Global' | 'Filtrado'>('Global');
  const [selTerritorial, setSelTerritorial] = useState<string>('Todas');
  const [selCetap, setSelCetap] = useState<string>('Todos');
  const [selPrograma, setSelPrograma] = useState<string>('Todos');

  // Load initial data
  useEffect(() => {
    if (isOpen) {
      loadTerritoriales();
      loadProgramas();

      // Load existing alcance data
      if (role?.alcance) {
        setTipoAlcance(role.alcance.tipo);
        setSelTerritorial(role.alcance.territorial || 'Todas');
        setSelCetap(role.alcance.cetap || 'Todos');
        setSelPrograma(role.alcance.programa || 'Todos');
      } else {
        // Default values
        setTipoAlcance('Global');
        setSelTerritorial('Todas');
        setSelCetap('Todos');
        setSelPrograma('Todos');
      }
    }
  }, [isOpen, role]);

  // Fetch CETAPs when territorial changes
  useEffect(() => {
    if (selTerritorial !== 'Todas' && territoriales.length > 0) {
      loadCetaps(selTerritorial);
    } else {
      setCetaps([]);
    }
  }, [selTerritorial, territoriales]);

  const loadTerritoriales = async () => {
    try {
      setLoadingTerritoriales(true);
      const territorialesData = await localRolesService.getTerritoriales();
      setTerritoriales(territorialesData);
    } catch (error) {
      console.error('Error loading territoriales:', error);
      toast.error('Error al cargar territoriales', {
        description: 'No se pudieron cargar las territoriales disponibles'
      });
    } finally {
      setLoadingTerritoriales(false);
    }
  };

  const loadCetaps = async (territorialId: string) => {
    try {
      setLoadingCetaps(true);
      const cetapsData = await localRolesService.getCETAPs(territorialId);
      setCetaps(cetapsData);
    } catch (error) {
      console.error('Error loading CETAPs:', error);
      toast.error('Error al cargar CETAPs', {
        description: 'No se pudieron cargar los CETAPs disponibles'
      });
    } finally {
      setLoadingCetaps(false);
    }
  };

  const loadProgramas = async () => {
    try {
      setLoadingProgramas(true);
      const programasData = await localRolesService.getProgramasAcademicos();
      setProgramas(programasData);
    } catch (error) {
      console.error('Error loading programas académicos:', error);
      toast.error('Error al cargar programas académicos', {
        description: 'No se pudieron cargar los programas académicos disponibles'
      });
    } finally {
      setLoadingProgramas(false);
    }
  };

  const handleTerritorialChange = (v: string) => {
    setSelTerritorial(v);
    setSelCetap('Todos'); // reset cascade
  };

  const getTerritorialName = (territorialId: string) => {
    if (territorialId === 'Todas') return 'Todas';
    const territorial = territoriales.find(t => t.id === territorialId);
    return territorial ? territorial.nombre : territorialId;
  };

  const getCetapName = (cetapId: string) => {
    if (cetapId === 'Todos') return 'Todos';
    const cetap = cetaps.find(c => c.id === cetapId);
    return cetap ? cetap.nombre : cetapId;
  };

  const getProgramaName = (programaId: string) => {
    if (programaId === 'Todos') return 'Todos';
    const programa = programas.find(p => p.id === programaId);
    return programa ? programa.nombre : programaId;
  };

  const handleSubmit = () => {
    if (!role) return;

    const alcanceData = {
      tipo: tipoAlcance,
      territorial: getTerritorialName(selTerritorial),
      cetap: getCetapName(selCetap),
      programa: getProgramaName(selPrograma)
    };

    onSave?.(role.id, alcanceData);

    // Resetear el estado
    setTipoAlcance('Global');
    setSelTerritorial('Todas');
    setSelCetap('Todos');
    setSelPrograma('Todos');
    setTerritoriales([]);
    setCetaps([]);
    setProgramas([]);
    onClose();
  };

  const getUsuariosSimulados = () => {
    if (tipoAlcance === 'Global') return role?.usuarios_count || 1250;
    let count = role?.usuarios_count || 1250;
    if (selTerritorial !== 'Todas') count = Math.floor(count / 7); // approx divider
    if (selCetap !== 'Todos') count = Math.floor(count / 3);
    if (selPrograma !== 'Todos') count = Math.floor(count / 5);
    return count;
  };

  if (!isOpen || !role) return null;

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-4 sm:p-0 z-[9999]">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}
      />

      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden"
        style={{ border: `1px solid #003DA5` }}
      >
        {/* HEADER */}
        <div
          className="flex items-center justify-between p-5 shrink-0 bg-[#003DA5] text-white"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl flex items-center justify-center bg-white/10">
              <Shield size={24} style={{ color: '#fff' }} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Configurar Alcance Administrativo</h2>
              <p className="text-xs text-blue-100">
                Configurando alcance para: {role.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl transition-colors hover:bg-white/10 text-white/80 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* CONTENIDO */}
        <div className="relative overflow-hidden" style={{ minHeight: '62vh', maxHeight: '75vh', overflowY: 'auto' }}>
          <div className="p-6 space-y-7">
            {/* Notice Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <strong>Alcance administrativo:</strong> Define las restricciones territoriales, CETAP y programas académicos para este rol. Los usuarios asignados a este rol tendrán acceso limitado según la configuración definida.
              </div>
            </div>

            <div className="space-y-4">
              {/* Tipo de Alcance */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Tipo de Alcance</label>
                <div className="grid grid-cols-2 gap-4">
                  <div
                    onClick={() => setTipoAlcance('Global')}
                    className={`cursor-pointer rounded-2xl border-2 p-5 transition-all ${tipoAlcance === 'Global' ? 'border-[#4ADE80] bg-[#4ADE80]/5' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 ${tipoAlcance === 'Global' ? 'border-[#4ADE80] bg-[#4ADE80]' : 'border-gray-300'}`}>
                        {tipoAlcance === 'Global' && <Check size={12} className="text-white" />}
                      </div>
                      <span className={`font-bold ${tipoAlcance === 'Global' ? 'text-[#166534]' : 'text-gray-900'}`}>Global</span>
                    </div>
                    <p className={`text-[13px] font-medium ml-8 ${tipoAlcance === 'Global' ? 'text-[#15803D]' : 'text-gray-500'}`}>El usuario podrá ver la información de todo el sistema sin filtros jerárquicos.</p>
                  </div>

                  <div
                    onClick={() => setTipoAlcance('Filtrado')}
                    className={`cursor-pointer rounded-2xl border-2 p-5 transition-all ${tipoAlcance === 'Filtrado' ? 'border-[#003DA5] bg-blue-50/50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 ${tipoAlcance === 'Filtrado' ? 'border-[#003DA5] bg-[#003DA5]' : 'border-gray-300'}`}>
                        {tipoAlcance === 'Filtrado' && <Check size={12} className="text-white" />}
                      </div>
                      <span className="font-bold text-gray-900">Filtrado</span>
                    </div>
                    <p className="text-[13px] text-gray-500 font-medium ml-8">Acceso segmentado utilizando la cascada jerárquica de la entidad.</p>
                  </div>
                </div>
              </div>

              {tipoAlcance === 'Filtrado' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Unidad Territorial</label>
                    <select
                      value={selTerritorial} onChange={e => handleTerritorialChange(e.target.value)}
                      disabled={loadingTerritoriales}
                      className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm outline-none focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] disabled:bg-gray-100 disabled:text-gray-400 font-medium"
                    >
                      <option value="Todas">Todas las territoriales</option>
                      {territoriales.map(territorial => (
                        <option key={territorial.id} value={territorial.id}>
                          {territorial.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">CETAP Jurisdiccional</label>
                    <select
                      value={selCetap} onChange={e => setSelCetap(e.target.value)}
                      disabled={selTerritorial === 'Todas' || loadingCetaps}
                      className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm outline-none focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] disabled:bg-gray-100 disabled:text-gray-400 font-medium"
                    >
                      <option value="Todos">Todos los CETAPs</option>
                      {cetaps.map(cetap => (
                        <option key={cetap.id} value={cetap.id}>
                          {cetap.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Programa Académico</label>
                    <select
                      value={selPrograma} onChange={e => setSelPrograma(e.target.value)}
                      disabled={loadingProgramas}
                      className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm outline-none focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] disabled:bg-gray-100 disabled:text-gray-400 font-medium"
                    >
                      <option value="Todos">Todos los programas</option>
                      {programas.map(programa => (
                        <option key={programa.id} value={programa.id}>
                          {programa.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                </motion.div>
              )}

              {tipoAlcance === 'Global' && (
                 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#4ADE80]/5 rounded-2xl border border-[#4ADE80]/20 p-6 flex flex-col items-center justify-center text-center">
                   <Globe size={40} className="text-[#4ADE80] mb-4 opacity-50" />
                   <h4 className="font-bold text-[#166534] mb-2">Alcance Irrestricto</h4>
                   <p className="text-sm text-[#15803D] max-w-sm">
                     Este rol tendrá la capacidad de consultar y gestionar registros de todas las sedes nacionales de manera predeterminada.
                   </p>
                 </motion.div>
              )}
            </div>

            {/* Preview */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Vista Previa del Alcance</h3>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-700">Usuarios afectados:</span>
                  <motion.div
                    key={getUsuariosSimulados()}
                    initial={{ scale: 1.2, color: '#059669' }} animate={{ scale: 1, color: '#111827' }}
                    className="text-2xl font-black"
                  >
                    {getUsuariosSimulados()}
                  </motion.div>
                </div>
                <div className="text-xs text-gray-600">
                  {tipoAlcance === 'Global' ? 'usuarios (todos)' : 'usuarios filtrados'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between p-4 sm:px-6 shrink-0 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">Cancelar</button>
          </div>

          <div className="flex gap-3 ml-auto">
            <button
              onClick={handleSubmit}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white rounded-xl transition-all hover:-translate-y-0.5 shadow-lg shadow-blue-900/20"
              style={{ background: '#003DA5' }}
            >
              <Save size={16} strokeWidth={3} />
              Guardar Alcance
            </button>
          </div>
        </div>
      </motion.div>
    </div>, document.body
  );
}
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import {
  X,
  Shield,
  Users,
  Globe,
  Check,
  Save,
  Search
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

interface User {
  id: string;
  name: string;
  territorial: string;
  cetap: string;
  programa: string;
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
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Alcance State
  const [tipoAlcance, setTipoAlcance] = useState<'Global' | 'Filtrado'>('Global');
  const [selTerritorial, setSelTerritorial] = useState<string>('Todas');
  const [selCetap, setSelCetap] = useState<string>('Todos');
  const [selPrograma, setSelPrograma] = useState<string>('Todos');

  // Search States
  const [searchTerritorial, setSearchTerritorial] = useState('');
  const [searchCetap, setSearchCetap] = useState('');
  const [searchPrograma, setSearchPrograma] = useState('');

  // Load initial data
  useEffect(() => {
    if (isOpen && role) {
      loadTerritoriales();
      loadProgramas();
      loadUsers(role.id);

      // Load existing alcance data
      if (role?.alcance) {
        setTipoAlcance(role.alcance.tipo);
        setSelTerritorial(role.alcance.territorial === 'Todas' ? 'Todas' : role.alcance.territorial);
        setSelCetap(role.alcance.cetap === 'Todos' ? 'Todos' : role.alcance.cetap);
        setSelPrograma(role.alcance.programa === 'Todos' ? 'Todos' : role.alcance.programa);
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
      const territorial = territoriales.find(t => t.nombre === selTerritorial);
      if (territorial) loadCetaps(territorial.id);
    } else {
      setCetaps([]);
    }
  }, [selTerritorial, territoriales]);

  // Filtered data
  const filteredTerritoriales = territoriales.filter(t => t.nombre.toLowerCase().includes(searchTerritorial.toLowerCase()));
  const filteredCetaps = cetaps.filter(c => c.nombre.toLowerCase().includes(searchCetap.toLowerCase()));
  const filteredProgramas = programas.filter(p => p.nombre.toLowerCase().includes(searchPrograma.toLowerCase()));

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

  const loadUsers = async (roleId: string) => {
    try {
      setLoadingUsers(true);
      const usersData = await localRolesService.getUsersByRole(roleId);
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Error al cargar usuarios asignados', {
        description: 'No se pudieron cargar los usuarios del rol'
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleTerritorialChange = (v: string) => {
    setSelTerritorial(v);
    setSelCetap('Todos'); // reset cascade
    if (v !== 'Todas') {
      const territorial = territoriales.find(t => t.nombre === v);
      if (territorial) loadCetaps(territorial.id);
    } else {
      setCetaps([]);
    }
  };

  const handleSubmit = () => {
    if (!role) return;

    const alcanceData = {
      tipo: tipoAlcance,
      territorial: selTerritorial,
      cetap: selCetap,
      programa: selPrograma
    };

    onSave?.(role.id, alcanceData);

    // Resetear el estado
    setTipoAlcance('Global');
    setSelTerritorial('Todas');
    setSelCetap('Todos');
    setSelPrograma('Todos');
    setSearchTerritorial('');
    setSearchCetap('');
    setSearchPrograma('');
    setTerritoriales([]);
    setCetaps([]);
    setProgramas([]);
    setUsers([]);
    onClose();
  };

  const getUsuariosSimulados = () => {
    if (users.length > 0) {
      if (tipoAlcance === 'Global') return users.length;
      return users.filter(user => {
        let matches = true;
        if (selTerritorial !== 'Todas' && user.territorial !== selTerritorial) matches = false;
        if (selCetap !== 'Todos' && user.cetap !== selCetap) matches = false;
        if (selPrograma !== 'Todos' && user.programa !== selPrograma) matches = false;
        return matches;
      }).length;
    }
    // Fallback to simulation
    if (tipoAlcance === 'Global') return role?.usuarios_count || 1250;
    let count = role?.usuarios_count || 1250;
    if (selTerritorial !== 'Todas') count = Math.floor(count / 7);
    if (selCetap !== 'Todos') count = Math.floor(count / 3);
    if (selPrograma !== 'Todos') count = Math.floor(count / 5);
    return count;
  };

  const getAffectedUsers = () => {
    if (users.length === 0 || tipoAlcance === 'Global') return [];
    return users.filter(user => {
      let matches = true;
      if (selTerritorial !== 'Todas' && user.territorial !== selTerritorial) matches = false;
      if (selCetap !== 'Todos' && user.cetap !== selCetap) matches = false;
      if (selPrograma !== 'Todos' && user.programa !== selPrograma) matches = false;
      return !matches;
    });
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
          <div className="flex h-full min-h-[50vh]">
            {/* Columna Izquierda: Configuración */}
            <div className="flex-1 p-6 border-r border-gray-100 flex flex-col">
              <h3 className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-wider flex items-center gap-2">
                <Shield size={14} /> TIPO DE ALCANCE
              </h3>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div
                  onClick={() => setTipoAlcance('Global')}
                  className={`cursor-pointer rounded-2xl border-2 p-5 transition-all ${tipoAlcance === 'Global' ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-5 h-5 rounded-full border-2 ${tipoAlcance === 'Global' ? 'border-green-400 bg-green-400' : 'border-gray-300'}`}>
                      {tipoAlcance === 'Global' && <Check size={12} className="text-white" />}
                    </div>
                    <span className="font-bold text-gray-900">Global</span>
                  </div>
                  <p className={`text-[13px] font-medium ml-8 ${tipoAlcance === 'Global' ? 'text-green-600' : 'text-gray-500'}`}>El usuario podrá ver la información de todo el sistema sin filtros jerárquicos.</p>
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

              {tipoAlcance === 'Filtrado' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex-1 bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Unidad Territorial</label>
                    <div className="mb-2">
                      <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          value={searchTerritorial} onChange={e => setSearchTerritorial(e.target.value)}
                          placeholder="Buscar territoriales..."
                          disabled={loadingTerritoriales}
                          className="w-full h-9 border border-gray-300 rounded-lg pl-9 pr-3 text-sm outline-none focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] disabled:bg-gray-100 disabled:text-gray-400 font-medium"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                      <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${selTerritorial === 'Todas' ? 'border-[#003DA5] bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input
                          type="radio"
                          name="territorial"
                          value="Todas"
                          checked={selTerritorial === 'Todas'}
                          onChange={() => handleTerritorialChange('Todas')}
                          className="hidden"
                        />
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selTerritorial === 'Todas' ? 'border-[#003DA5] bg-[#003DA5]' : 'border-gray-300'}`}>
                          {selTerritorial === 'Todas' && <Check size={10} className="text-white" />}
                        </div>
                        <span className="text-sm font-medium text-gray-700">Todas las territoriales</span>
                      </label>
                      {filteredTerritoriales.map(territorial => (
                        <label key={territorial.id} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${selTerritorial === territorial.nombre ? 'border-[#003DA5] bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                          <input
                            type="radio"
                            name="territorial"
                            value={territorial.nombre}
                            checked={selTerritorial === territorial.nombre}
                            onChange={() => handleTerritorialChange(territorial.nombre)}
                            className="hidden"
                          />
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selTerritorial === territorial.nombre ? 'border-[#003DA5] bg-[#003DA5]' : 'border-gray-300'}`}>
                            {selTerritorial === territorial.nombre && <Check size={10} className="text-white" />}
                          </div>
                          <span className="text-sm font-medium text-gray-700 truncate">{territorial.nombre}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">CETAP Jurisdiccional</label>
                    <div className="mb-2">
                      <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          value={searchCetap} onChange={e => setSearchCetap(e.target.value)}
                          placeholder="Buscar CETAPs..."
                          disabled={selTerritorial === 'Todas' || loadingCetaps}
                          className="w-full h-9 border border-gray-300 rounded-lg pl-9 pr-3 text-sm outline-none focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] disabled:bg-gray-100 disabled:text-gray-400 font-medium"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                      <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${selCetap === 'Todos' ? 'border-[#003DA5] bg-blue-50' : 'border-gray-200 hover:border-gray-300'} ${selTerritorial === 'Todas' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <input
                          type="radio"
                          name="cetap"
                          value="Todos"
                          checked={selCetap === 'Todos'}
                          onChange={() => setSelCetap('Todos')}
                          disabled={selTerritorial === 'Todas'}
                          className="hidden"
                        />
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selCetap === 'Todos' ? 'border-[#003DA5] bg-[#003DA5]' : 'border-gray-300'}`}>
                          {selCetap === 'Todos' && <Check size={10} className="text-white" />}
                        </div>
                        <span className="text-sm font-medium text-gray-700">Todos los CETAPs</span>
                      </label>
                      {selTerritorial !== 'Todas' && filteredCetaps.map(cetap => (
                        <label key={cetap.id} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${selCetap === cetap.nombre ? 'border-[#003DA5] bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                          <input
                            type="radio"
                            name="cetap"
                            value={cetap.nombre}
                            checked={selCetap === cetap.nombre}
                            onChange={() => setSelCetap(cetap.nombre)}
                            className="hidden"
                          />
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selCetap === cetap.nombre ? 'border-[#003DA5] bg-[#003DA5]' : 'border-gray-300'}`}>
                            {selCetap === cetap.nombre && <Check size={10} className="text-white" />}
                          </div>
                          <span className="text-sm font-medium text-gray-700 truncate">{cetap.nombre}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Programa Académico</label>
                    <div className="mb-2">
                      <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          value={searchPrograma} onChange={e => setSearchPrograma(e.target.value)}
                          placeholder="Buscar programas..."
                          disabled={loadingProgramas}
                          className="w-full h-9 border border-gray-300 rounded-lg pl-9 pr-3 text-sm outline-none focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] disabled:bg-gray-100 disabled:text-gray-400 font-medium"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                      <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${selPrograma === 'Todos' ? 'border-[#003DA5] bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input
                          type="radio"
                          name="programa"
                          value="Todos"
                          checked={selPrograma === 'Todos'}
                          onChange={() => setSelPrograma('Todos')}
                          className="hidden"
                        />
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selPrograma === 'Todos' ? 'border-[#003DA5] bg-[#003DA5]' : 'border-gray-300'}`}>
                          {selPrograma === 'Todos' && <Check size={10} className="text-white" />}
                        </div>
                        <span className="text-sm font-medium text-gray-700">Todos los programas</span>
                      </label>
                      {filteredProgramas.map(programa => (
                        <label key={programa.id} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${selPrograma === programa.nombre ? 'border-[#003DA5] bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                          <input
                            type="radio"
                            name="programa"
                            value={programa.nombre}
                            checked={selPrograma === programa.nombre}
                            onChange={() => setSelPrograma(programa.nombre)}
                            className="hidden"
                          />
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selPrograma === programa.nombre ? 'border-[#003DA5] bg-[#003DA5]' : 'border-gray-300'}`}>
                            {selPrograma === programa.nombre && <Check size={10} className="text-white" />}
                          </div>
                          <span className="text-sm font-medium text-gray-700 truncate">{programa.nombre}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                </motion.div>
              )}

              {tipoAlcance === 'Global' && (
                 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex-1 bg-[#4ADE80]/5 rounded-2xl border border-[#4ADE80]/20 p-6 flex flex-col items-center justify-center text-center">
                  <Globe size={40} className="text-[#4ADE80] mb-4 opacity-50" />
                  <h4 className="font-bold text-[#166534] mb-2">Alcance Irrestricto</h4>
                  <p className="text-sm text-[#15803D] max-w-sm">
                    Este rol tendrá la capacidad de consultar y gestionar registros de todas las sedes nacionales de manera predeterminada.
                  </p>
                </motion.div>
              )}
            </div>

            {/* Columna Derecha: Preview */}
            <div className="w-80 bg-gray-50 p-6 flex flex-col border-l border-gray-100">
              <h3 className="text-sm font-bold text-gray-500 mb-6 uppercase tracking-wider flex items-center gap-2">
                <Users size={14} /> PREVIEW EN TIEMPO REAL
              </h3>

              <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center shadow-sm mb-6">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users size={24} />
                </div>
                <motion.div
                  key={getUsuariosSimulados()}
                  initial={{ scale: 1.2, color: '#059669' }} animate={{ scale: 1, color: '#111827' }}
                  className="text-2xl font-black border-b border-gray-100 pb-2 mb-2"
                >
                  {getUsuariosSimulados()}
                </motion.div>
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  {tipoAlcance === 'Global' ? 'usuarios (todos)' : 'usuarios filtrados'}
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Resumen de Alcance</div>

                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2 font-medium text-gray-600"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Territoriales</div>
                  <div className="font-bold text-gray-900 truncate max-w-[150px]" title={tipoAlcance === 'Global' ? 'Todas' : selTerritorial}>{tipoAlcance === 'Global' ? 'Todas' : selTerritorial}</div>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2 font-medium text-gray-600"><div className="w-2 h-2 rounded-full bg-amber-500"></div> CETAPs</div>
                  <div className="font-bold text-gray-900 truncate max-w-[150px]" title={tipoAlcance === 'Global' ? 'Todos' : selCetap}>{tipoAlcance === 'Global' ? 'Todos' : selCetap}</div>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2 font-medium text-gray-600"><div className="w-2 h-2 rounded-full bg-purple-500"></div> Programas</div>
                  <div className="font-bold text-gray-900 truncate max-w-[150px]" title={tipoAlcance === 'Global' ? 'Todos' : selPrograma}>{tipoAlcance === 'Global' ? 'Todos' : selPrograma}</div>
                </div>

                    <div className="pt-4 mt-2 border-t border-gray-100 text-[11px] font-medium text-gray-500 leading-relaxed">
                      {tipoAlcance === 'Global'
                        ? 'Acceso global a todas las territoriales, CETAPs y programas. No se requerirá asignar jurisdicciones manuales a los usuarios.'
                        : 'El acceso será estrictamente delimitado por la jurisdicción asignada al usuario dentro de sus parámetros de contratación.'}
                    </div>

                    {getAffectedUsers().length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2">Usuarios que perderán acceso ({getAffectedUsers().length})</div>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {getAffectedUsers().map(user => (
                            <div key={user.id} className="text-xs text-gray-600 bg-red-50 p-2 rounded border border-red-100">
                              {user.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between p-4 sm:px-6 shrink-0 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-gray-500">
            <Users size={14} /> {users.length > 0 ? 'Basado en usuarios asignados actualmente.' : 'La proyección de usuarios es una estimación.'}
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
import React, { useState } from 'react';
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
  Check
} from 'lucide-react';
import { toast } from 'sonner';

interface CreateRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (data: {
    nombre: string;
    descripcion: string;
    sistema_destino: 'Backoffice' | 'Portal' | 'Ambos';
    color: string;
    icono: string;
    requiere_2fa: boolean;
    alcance: {
      tipo: 'Global' | 'Filtrado';
      territorial: string;
      cetap: string;
      programa: string;
    };
  }) => void;
}

// Constantes
const PRESET_COLORS = [
  '#003DA5', '#DC2626', '#16A34A', '#F97316', '#10B981',
  '#9333EA', '#0891B2', '#7C3AED', '#DB2777', '#0284C7'
];

const ICONS_MAP: Record<string, React.ComponentType<any>> = {
  Shield, Users, AlertTriangle, ArrowRight, Globe
};

export function CreateRoleModal({ isOpen, onClose, onSave }: CreateRoleModalProps) {
  const [step, setStep] = useState<1 | 2>(1);

  // Paso 1 State
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [sistemaDestino, setSistemaDestino] = useState<'Backoffice' | 'Portal' | 'Ambos'>('Backoffice');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [iconName, setIconName] = useState('Shield');
  const [requiere2FA, setRequiere2FA] = useState(false);

  // Paso 2 State
  const [tipoAlcance, setTipoAlcance] = useState<'Global' | 'Filtrado'>('Global');
  const [selTerritorial, setSelTerritorial] = useState<string>('Todas');
  const [selCetap, setSelCetap] = useState<string>('Todos');
  const [selPrograma, setSelPrograma] = useState<string>('Todos');

  if (!isOpen) return null;

  const getUsuariosSimulados = () => {
    if (tipoAlcance === 'Global') return 1250;
    let count = 1250;
    if (selTerritorial !== 'Todas') count = Math.floor(count / 7); // approx divider
    if (selCetap !== 'Todos') count = Math.floor(count / 3);
    if (selPrograma !== 'Todos') count = Math.floor(count / 5);
    return count;
  };

  const handleTerritorialChange = (v: string) => {
    setSelTerritorial(v);
    setSelCetap('Todos'); // reset cascade
  };

  const handleSubmit = () => {
    if (!nombre.trim()) return;

    // Preparar el objeto con la data del Wizard
    onSave?.({
      nombre,
      descripcion,
      sistema_destino: sistemaDestino,
      color,
      icono: iconName,
      requiere_2fa: requiere2FA,
      alcance: {
        tipo: tipoAlcance,
        territorial: selTerritorial,
        cetap: selCetap,
        programa: selPrograma
      }
    });

    // Resetear el estado
    setStep(1);
    setNombre('');
    setDescripcion('');
    setSistemaDestino('Backoffice');
    setColor(PRESET_COLORS[0]);
    setIconName('Shield');
    setRequiere2FA(false);
    setTipoAlcance('Global');
    setSelTerritorial('Todas');
    setSelCetap('Todos');
    setSelPrograma('Todos');
    onClose();
  };

  const currentIcon = ICONS_MAP[iconName];

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
        style={{ border: `1px solid ${step === 2 ? '#003DA5' : '#E5E7EB'}` }}
      >
        {/* HEADER */}
        <div
          className={`flex items-center justify-between p-5 shrink-0 transition-colors duration-300 ${step === 2 ? 'bg-[#003DA5] text-white' : 'border-b border-gray-200'}`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl flex items-center justify-center ${step === 2 ? 'bg-white/10' : 'bg-blue-50'}`}>
              <Shield size={24} style={{ color: step === 2 ? '#fff' : '#003DA5' }} />
            </div>
            <div>
              <h2 className="text-xl font-bold">{step === 1 ? 'Crear Nuevo Rol' : 'Alcance Administrativo'}</h2>
              <p className={`text-xs ${step === 2 ? 'text-blue-100' : 'text-gray-500'}`}>
                {step === 1 ? 'Paso 1 de 2: Configuración del rol' : `Cascada jerárquica para el Rol: "${nombre || 'Sin Nombre'}"`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${step === 2 ? 'hover:bg-white/10 text-white/80 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'}`}
          >
            <X size={20} />
          </button>
        </div>

        {/* CONTENIDO INTERNO */}
        <div className="relative overflow-hidden" style={{ minHeight: '62vh', maxHeight: '75vh', overflowY: 'auto' }}>
          <AnimatePresence mode='wait'>
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="p-6 space-y-7"
              >
                {/* Notice Banner */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                  <div className="text-sm">
                    <strong>Rol de sistema:</strong> Algunos campos como el nombre pueden tener restricciones según el entorno.
                    Los permisos granulares se gestionan posteriormente desde "Gestionar Permisos".
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Nombre */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Nombre del rol <span className="text-red-500">*</span></label>
                    <input
                      value={nombre} onChange={e => setNombre(e.target.value)}
                      placeholder="Ej: Director Académico"
                      className="w-full h-11 border border-gray-300 rounded-xl px-4 text-sm outline-none focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5]/20 transition-all font-medium"
                    />
                  </div>

                  {/* Descripción */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Descripción <span className="text-red-500">*</span></label>
                    <textarea
                      value={descripcion} onChange={e => setDescripcion(e.target.value)}
                      placeholder="Describe las responsabilidades del rol..." rows={3} maxLength={200}
                      className="w-full border border-gray-300 rounded-xl p-3 text-sm outline-none focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5]/20 transition-all resize-none font-medium"
                    />
                    <div className="text-right text-[11px] text-gray-400 mt-1 font-medium">{descripcion.length}/200 caracteres</div>
                  </div>

                  {/* Sistema Destino */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Sistema destino</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'Backoffice', desc: 'Gestión interna y administrativa' },
                        { id: 'Portal', desc: 'Acceso de estudiantes y docentes' },
                        { id: 'Ambos', desc: 'Acceso a Backoffice y Portal' }
                      ].map(sis => (
                        <div
                          key={sis.id}
                          onClick={() => setSistemaDestino(sis.id as any)}
                          className={`cursor-pointer rounded-xl border-2 p-3 transition-all ${sistemaDestino === sis.id ? 'border-[#003DA5] bg-blue-50/50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}
                        >
                          <div className={`text-sm font-bold mb-1 ${sistemaDestino === sis.id ? 'text-[#003DA5]' : 'text-gray-800'}`}>{sis.id}</div>
                          <div className="text-[11px] text-gray-500 leading-tight font-medium">{sis.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Color e Icono */}
                  <div className="grid grid-cols-2 gap-6 pt-2">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Color identificativo</label>
                      <div className="flex flex-wrap gap-2">
                        {PRESET_COLORS.map(c => (
                          <div
                            key={c} onClick={() => setColor(c)}
                            className="w-8 h-8 rounded-full cursor-pointer flex items-center justify-center transition-transform hover:scale-110 shadow-sm"
                            style={{ backgroundColor: c, border: color === c ? '2px solid white' : 'none', outline: color === c ? `2px solid ${c}` : 'none' }}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Ícono</label>
                      <div className="relative">
                        <select
                          value={iconName} onChange={e => setIconName(e.target.value)}
                          className="w-full h-11 border border-gray-300 rounded-xl pl-10 pr-4 text-sm outline-none focus:border-[#003DA5] appearance-none font-medium cursor-pointer"
                        >
                          {Object.keys(ICONS_MAP).map(icon => <option key={icon} value={icon}>{icon}</option>)}
                        </select>
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                          {React.createElement(ICONS_MAP[iconName], { size: 18 })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2FA Toggle */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl mt-4 bg-gray-50/50">
                    <div>
                      <div className="text-sm font-bold text-gray-900">Requiere 2FA</div>
                      <div className="text-xs text-gray-500 font-medium">Autenticación de dos factores obligatoria para este rol.</div>
                    </div>
                    <button
                      onClick={() => setRequiere2FA(!requiere2FA)}
                      className={`w-12 h-6 rounded-full transition-colors relative flex items-center ${requiere2FA ? 'bg-[#003DA5]' : 'bg-gray-300'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform absolute ${requiere2FA ? 'translate-x-7' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                className="flex h-full min-h-[50vh]"
              >
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
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 ${tipoAlcance === 'Global' ? 'border-green-400 bg-green-400' : 'border-gray-300'}`}>
                          {tipoAlcance === 'Global' && <Check size={12} className="text-white" />}
                        </div>
                        <span className={`font-bold ${tipoAlcance === 'Global' ? 'text-green-800' : 'text-gray-900'}`}>Global</span>
                      </div>
                      <p className={`text-[13px] font-medium ml-8 ${tipoAlcance === 'Global' ? 'text-green-600' : 'text-gray-500'}`}>El usuario podrá ver la información de todo el sistema sin filtros jerárquicos.</p>
                    </div>

                    <div
                      onClick={() => setTipoAlcance('Filtrado')}
                      className={`cursor-pointer rounded-2xl border-2 p-5 transition-all ${tipoAlcance === 'Filtrado' ? 'border-esap-blue bg-esap-blue-light' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 ${tipoAlcance === 'Filtrado' ? 'border-esap-blue bg-esap-blue' : 'border-gray-300'}`}>
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
                        <select
                          value={selTerritorial} onChange={e => handleTerritorialChange(e.target.value)}
                          className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm outline-none focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] font-medium"
                        >
                          <option value="Todas">Todas las territoriales</option>
                          {/* Aquí irían las opciones dinámicas */}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">CETAP Jurisdiccional</label>
                        <select
                          value={selCetap} onChange={e => setSelCetap(e.target.value)}
                          disabled={selTerritorial === 'Todas'}
                          className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm outline-none focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] disabled:bg-gray-100 disabled:text-gray-400 font-medium"
                        >
                          <option value="Todos">Todos los CETAPs</option>
                          {/* Aquí irían las opciones dinámicas */}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Programa Académico</label>
                        <select
                          value={selPrograma} onChange={e => setSelPrograma(e.target.value)}
                          className="w-full h-10 border border-gray-300 rounded-lg px-3 text-sm outline-none focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5] font-medium"
                        >
                          <option value="Todos">Todos los programas</option>
                          {/* Aquí irían las opciones dinámicas */}
                        </select>
                      </div>

                    </motion.div>
                  )}

                  {tipoAlcance === 'Global' && (
                     <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex-1 bg-green-50 rounded-2xl border border-green-200 p-6 flex flex-col items-center justify-center text-center">
                      <Globe size={40} className="text-green-500 mb-4 opacity-50" />
                      <h4 className="font-bold text-green-800 mb-2">Alcance Irrestricto</h4>
                      <p className="text-sm text-green-600 max-w-sm">
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
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between p-4 sm:px-6 shrink-0 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          {step === 2 ? (
            <div className="flex items-center gap-2 text-[12px] font-semibold text-gray-500">
              <Users size={14} /> La proyección de usuarios es una estimación.
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">Cancelar</button>
            </div>
          )}

          <div className="flex gap-3 ml-auto">
            {step === 1 ? (
               <button
                onClick={() => setStep(2)}
                disabled={!nombre.trim() || !descripcion.trim()}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white rounded-xl disabled:opacity-50 transition-all hover:bg-[#002873] shadow-md disabled:shadow-none"
                style={{ background: '#003DA5' }}
              >
                Siguiente Paso <ArrowRight size={16} />
              </button>
            ) : (
              <>
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-gray-600 border-2 border-gray-200 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <ArrowLeft size={16} /> Volver
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white rounded-xl transition-all hover:-translate-y-0.5 shadow-lg shadow-blue-900/20"
                  style={{ background: '#003DA5' }}
                >
                  Guardar Alcance <Check size={16} strokeWidth={3} />
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>, document.body
  );
}
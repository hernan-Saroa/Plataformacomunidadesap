/**
 * Mi Perfil Portal - Vista refactorizada "World-Class" (Legacy PTA)
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Shield,
  User,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  Building2,
  EyeOff,
  FileText,
  Loader2,
  Save,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { getPerfilPortal, updatePerfilPortal, updatePrivacidad } from './portalApi';

interface MiPerfilPortalProps {
  userName: string;
  userEmail: string;
  personaId: string;
  adminData?: {
    area?: string;
    cargo?: string;
    dependencia?: string;
    codigo_empleado?: string;
  };
  activeRole?: string;
  onBack: () => void;
}

type Tab = 'personal' | 'laboral' | 'privacidad';

const TABS = [
  { id: 'personal' as Tab, label: 'Personal', icon: User },
  { id: 'laboral' as Tab, label: 'Laboral', icon: Briefcase },
  { id: 'privacidad' as Tab, label: 'Privacidad', icon: Shield },
];

const PRIVACY_FIELDS = [
  { key: 'email', label: 'Correo Institucional', icon: Mail, iconClass: 'text-blue-600 bg-blue-100' },
  { key: 'telefono', label: 'Teléfono Móvil', icon: Phone, iconClass: 'text-emerald-600 bg-emerald-100' },
  { key: 'direccion', label: 'Dirección Residencial', icon: MapPin, iconClass: 'text-amber-600 bg-amber-100' },
  { key: 'documento', label: 'Número de Documentación', icon: FileText, iconClass: 'text-indigo-600 bg-indigo-100' },
];

export function MiPerfilPortal({ userName, userEmail, personaId, adminData, activeRole, onBack }: MiPerfilPortalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('personal');
  const [perfil, setPerfil] = useState<any>(null);
  const [privacidadConfig, setPrivacidadConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    if (!personaId) return;
    setLoading(true);
    getPerfilPortal(personaId)
      .then((res) => {
        if (res && (res as any).success) {
          setPerfil((res as any).data);
          setPrivacidadConfig((res as any).data?.privacidad || {});
        }
      })
      .catch((err) => console.error('[MiPerfil] Error:', err))
      .finally(() => setLoading(false));
  }, [personaId]);

  const handleTogglePrivacy = async (key: string) => {
    const current = privacidadConfig[key] || 'Privado';
    const next = current === 'Público' ? 'Privado' : 'Público';
    const updated = { ...privacidadConfig, [key]: next };
    setPrivacidadConfig(updated);

    try {
      await updatePrivacidad(personaId, { [key]: next });
      toast.success(`Visibilidad modificada a ${next}`);
    } catch (err) {
      console.error('[MiPerfil] Error actualizando privacidad:', err);
      toast.error('Ocurrió un error al actualizar la privacidad.');
      setPrivacidadConfig({ ...privacidadConfig, [key]: current });
    }
  };

  const handleSaveField = async (fieldKey: string) => {
    if (editValue.trim() === '') return;
    setSaving(true);
    try {
      await updatePerfilPortal(personaId, { [fieldKey]: editValue.trim() });
      setPerfil((prev: any) => ({ ...prev, [fieldKey]: editValue.trim() }));
      setEditingField(null);
      setEditValue('');
      toast.success('Información actualizada correctamente');
    } catch (err: any) {
      toast.error('Error al guardar', { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const p = perfil || {};

  const determineCompletitud = () => {
    if (!perfil) return 0;
    const coreFields = [p.email || userEmail, p.telefono, p.direccion, p.identificacion, p.territorial || p.tipoVinculacion];
    const filled = coreFields.filter((v) => v && String(v).trim() !== '').length;
    return Math.min(100, Math.round((filled / coreFields.length) * 100));
  };

  const completitud = determineCompletitud();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 text-gray-400">
        <Loader2 className="w-10 h-10 animate-spin mb-4 opacity-40" />
        <span className="text-sm font-semibold tracking-wide">Sincronizando identidad...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-200/80 pb-6">
        <div>
          <button
            onClick={onBack}
            className="group flex items-center gap-2 text-[12px] font-bold text-[#003DA5] hover:text-[#002868] transition-colors mb-5 bg-blue-50/70 hover:bg-blue-100 px-3.5 py-1.5 rounded-full"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
            Volver al Inicio
          </button>
          <h1 className="text-[28px] font-black text-[#002868] tracking-tight leading-none mb-2">Mi Perfil</h1>
          <p className="text-[14px] font-medium text-gray-500">
            Administra tus credenciales, datos de contacto y opciones de privacidad.
          </p>
        </div>

        <div className="bg-white px-5 py-4 rounded-2xl border border-gray-200/80 shadow-sm w-full md:w-64 shrink-0 transition-transform hover:-translate-y-0.5 duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Estado del Perfil</span>
            <span className="text-[16px] font-black text-[#003DA5]">{completitud}%</span>
          </div>
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completitud}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className={`h-full rounded-full ${completitud === 100 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-[#003DA5]'}`}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none hide-scrollbar">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[14px] font-bold transition-all duration-300 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[#003DA5] focus:ring-offset-2 ${
                isActive
                  ? 'bg-[#003DA5] text-white shadow-md'
                  : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 hover:text-gray-900 border-b-2'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-[1.5rem] border border-gray-200/80 shadow-sm overflow-hidden mb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'personal' && renderPersonalTab()}
            {activeTab === 'laboral' && renderLaboralTab()}
            {activeTab === 'privacidad' && renderPrivacidadTab()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );

  function DataRow({
    label,
    value,
    fieldKey,
    isEditable,
    icon,
  }: {
    label: string;
    value: string;
    fieldKey: string;
    isEditable: boolean;
    icon: React.ReactNode;
  }) {
    const isEditing = editingField === fieldKey;

    return (
      <div className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 md:px-7 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">{icon}</div>
          <div className="flex flex-col flex-1">
            <span className="text-[12px] font-bold text-gray-400 mb-0.5">{label}</span>

            {isEditing ? (
              <div className="flex items-center gap-2 mr-4">
                <input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  autoFocus
                  className="w-full max-w-sm h-9 rounded-lg border border-blue-200 focus:border-[#003DA5] focus:ring-2 focus:ring-blue-100 px-3 text-[14px] font-semibold text-gray-800 transition-all outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveField(fieldKey);
                    if (e.key === 'Escape') {
                      setEditingField(null);
                      setEditValue('');
                    }
                  }}
                />
              </div>
            ) : (
              <span className="text-[15px] font-bold text-gray-800">
                {value || <span className="text-gray-300 font-normal italic">Sin registrar</span>}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {isEditable && !isEditing && (
            <button
              onClick={() => {
                setEditingField(fieldKey);
                setEditValue(value || '');
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity px-4 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[13px]"
            >
              Editar
            </button>
          )}

          {isEditing && (
            <>
              <button
                disabled={saving}
                onClick={() => handleSaveField(fieldKey)}
                className="px-4 h-9 rounded-xl bg-[#003DA5] hover:bg-[#002868] text-white font-bold text-[13px] flex items-center gap-2 disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar
              </button>
              <button
                onClick={() => {
                  setEditingField(null);
                  setEditValue('');
                }}
                className="px-4 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[13px]"
              >
                Cancelar
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  function renderPersonalTab() {
    return (
      <div>
        <div className="p-6 md:px-8 border-b border-gray-100 bg-gradient-to-r from-blue-50/50 to-white">
          <h2 className="text-[16px] font-black text-gray-900 tracking-tight mb-1">Información Personal</h2>
          <p className="text-[13px] text-gray-500">Datos básicos y de contacto asociados a tu cuenta.</p>
        </div>
        <DataRow label="Nombre Completo" value={userName} fieldKey="nombre" isEditable={false} icon={<User className="w-5 h-5" />} />
        <DataRow label="Correo Institucional" value={userEmail} fieldKey="email" isEditable={false} icon={<Mail className="w-5 h-5" />} />
        <DataRow label="Teléfono" value={p.telefono || ''} fieldKey="telefono" isEditable={true} icon={<Phone className="w-5 h-5" />} />
        <DataRow label="Dirección" value={p.direccion || ''} fieldKey="direccion" isEditable={true} icon={<MapPin className="w-5 h-5" />} />
      </div>
    );
  }

  function renderLaboralTab() {
    return (
      <div>
        <div className="p-6 md:px-8 border-b border-gray-100 bg-gradient-to-r from-emerald-50/40 to-white">
          <h2 className="text-[16px] font-black text-gray-900 tracking-tight mb-1">Información Laboral</h2>
          <p className="text-[13px] text-gray-500">Datos institucionales asociados a tu rol actual.</p>
        </div>

        <DataRow
          label="Área"
          value={adminData?.area || p.area || ''}
          fieldKey="area"
          isEditable={false}
          icon={<Building2 className="w-5 h-5" />}
        />
        <DataRow
          label="Cargo"
          value={adminData?.cargo || p.cargo || ''}
          fieldKey="cargo"
          isEditable={false}
          icon={<Briefcase className="w-5 h-5" />}
        />
        <DataRow
          label="Dependencia"
          value={adminData?.dependencia || p.dependencia || ''}
          fieldKey="dependencia"
          isEditable={false}
          icon={<Building2 className="w-5 h-5" />}
        />
      </div>
    );
  }

  function renderPrivacidadTab() {
    return (
      <div>
        <div className="p-6 md:px-8 border-b border-gray-100 bg-gradient-to-r from-purple-50/40 to-white">
          <h2 className="text-[16px] font-black text-gray-900 tracking-tight mb-1">Privacidad</h2>
          <p className="text-[13px] text-gray-500">Controla qué información es visible para otros usuarios.</p>
        </div>

        <div className="divide-y divide-gray-100">
          {PRIVACY_FIELDS.map((f) => {
            const Icon = f.icon;
            const current = privacidadConfig[f.key] || 'Privado';
            const isPublic = current === 'Público';
            return (
              <div key={f.key} className="flex items-center justify-between p-5 md:px-7 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${f.iconClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[14px] font-black text-gray-900">{f.label}</div>
                    <div className="text-[12px] text-gray-500">Visibilidad: {current}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleTogglePrivacy(f.key)}
                  className={`px-4 h-9 rounded-xl font-bold text-[13px] transition-all ${
                    isPublic ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {isPublic ? (
                    <span className="inline-flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Público
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <EyeOff className="w-4 h-4" /> Privado
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <div className="p-5 md:px-7 border-t border-gray-100 bg-gray-50">
          <div className="flex items-start gap-3 text-[12px] text-gray-600">
            <AlertCircle className="w-4 h-4 text-gray-400 mt-0.5" />
            <p>
              Estas configuraciones pueden afectar la visibilidad de tu perfil en el portal. La información institucional obligatoria se mantiene
              protegida.
            </p>
          </div>
        </div>
      </div>
    );
  }
}


import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Shield,
  GraduationCap,
  BookOpen,
  Briefcase,
  Award,
  UserCircle,
  Building2,
  FileText,
  MessageSquare,
  FolderOpen,
  BarChart3,
  Cog,
  AlertTriangle,
  Info,
  Save
} from 'lucide-react';

interface SystemRole {
  id: string;
  nombre: string;
  descripcion?: string;
  icono?: string;
  color?: string;
  tipo: 'sistema' | 'personalizado';
  sistema_destino?: string;
  requiere_2fa?: boolean;
  usuarios_count: number;
  permisos_count: number;
  created_at?: string;
  created_by?: string;
}

interface EditRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditRole: (roleData: {
    nombre: string;
    descripcion: string;
    sistema_destino: string;
    icono: string;
    color: string;
    requiere_2fa: boolean;
  }) => void;
  role: SystemRole;
}

const SISTEMAS = [
  { value: 'Backoffice', label: 'Backoffice', desc: 'Gestión interna y administrativa' },
  { value: 'Portal', label: 'Portal', desc: 'Acceso de estudiantes, egresados y docentes' },
  { value: 'Ambos', label: 'Ambos', desc: 'Acceso a backoffice y portal' }
];

const COLORES = [
  '#003DA5',
  '#1E5DA8',
  '#DC2626',
  '#16A34A',
  '#F97316',
  '#10B981',
  '#9333EA',
  '#0891B2',
  '#7C3AED',
  '#DB2777',
  '#0284C7',
  '#EA580C'
];

const ICONOS = [
  { value: 'Shield', label: 'Escudo' },
  { value: 'Graduation-cap', label: 'Graduación' },
  { value: 'Book-open', label: 'Libro' },
  { value: 'Briefcase', label: 'Maletín' },
  { value: 'Award', label: 'Premio' },
  { value: 'User-circle', label: 'Usuario' },
  { value: 'Building-2', label: 'Edificio' },
  { value: 'File-text', label: 'Documento' },
  { value: 'Message-square', label: 'Mensaje' },
  { value: 'Folder-open', label: 'Carpeta' },
  { value: 'Bar-chart-3', label: 'Gráfico' },
  { value: 'Cog', label: 'Configuración' }
];

export function EditRoleModal({ open, onOpenChange, onEditRole, role }: EditRoleModalProps) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [sistemaDestino, setSistemaDestino] = useState<string>('backoffice');
  const [icono, setIcono] = useState('shield');
  const [color, setColor] = useState('#003DA5');
  const [requiere2FA, setRequiere2FA] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync state when role changes or modal opens
  useEffect(() => {
    console.log('role', role);
    console.log('open', open);
    if (role && open) {
      setNombre(role.nombre || '');
      setDescripcion(role.descripcion || '');
      setSistemaDestino(role.sistema_destino || 'Backoffice');
      setIcono(role.icono || 'shield');
      setColor(role.color || '#003DA5');
      setRequiere2FA(role.requiere_2fa || false);
      setErrors({});
    }
  }, [role, open]);

  if (!open) return null;

  const isSistema = role.tipo === 'sistema';

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!nombre.trim()) newErrors.nombre = 'El nombre es obligatorio';
    if (nombre.trim().length < 3) newErrors.nombre = 'Minimo 3 caracteres';
    if (!descripcion.trim()) newErrors.descripcion = 'La descripcion es obligatoria';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await onEditRole({
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        sistema_destino: sistemaDestino as any,
        icono,
        color,
        requiere_2fa: requiere2FA,
      });
      onOpenChange(false); // cerrar modal en éxito
    } catch (error) {
      // error ya manejado en onEditRole
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => onOpenChange(false);

  const hasChanges =
    nombre !== (role.nombre || '') ||
    descripcion !== (role.descripcion || '') ||
    sistemaDestino !== (role.sistema_destino || 'backoffice') ||
    icono !== (role.icono || 'shield') ||
    color !== (role.color || '#003DA5') ||
    requiere2FA !== (role.requiere_2fa || false);

  return createPortal(
    <div className="fixed inset-0 flex items-end sm:items-center justify-center pt-10 sm:p-0" style={{ zIndex: 9999 }}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div
        className="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-lg sm:mx-4 max-h-[92dvh] sm:max-h-[90vh] flex flex-col motion-safe:animate-in motion-safe:slide-in-from-bottom-5"
        style={{ border: '1px solid #E5E7EB' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 shrink-0" style={{ borderBottom: '1px solid #E5E7EB' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: `${color}15` }}
            >
              {(() => {
                const IconComp = {
                  shield: Shield,
                  'Graduation-cap': GraduationCap,
                  'Book-open': BookOpen,
                  'Briefcase': Briefcase,
                  'Award': Award,
                  'User-circle': UserCircle,
                  'Building-2': Building2,
                  'File-text': FileText,
                  'Message-square': MessageSquare,
                  'Folder-open': FolderOpen,
                  'Bar-chart-3': BarChart3,
                  cog: Cog,
                }[icono] || Shield;
                return <IconComp size={18} style={{ color }} />;
              })()}
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: '#111827' }}>Editar Rol</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {role.tipo === 'sistema' ? 'Rol de sistema' : 'Rol personalizado'} · ID: {role.id.slice(0, 8)}...
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} style={{ color: '#6B7280' }} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Aviso para roles de sistema */}
          {isSistema && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 leading-relaxed">
                <strong>Rol de sistema:</strong> Algunos campos como el nombre pueden tener restricciones.
                Los permisos se gestionan desde "Gestionar Permisos".
              </div>
            </div>
          )}

          {/* Nombre */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>
              Nombre del rol <span className="text-red-500">*</span>
            </label>
            <input
              value={nombre}
              onChange={e => { setNombre(e.target.value); setErrors(prev => ({ ...prev, nombre: '' })); }}
              placeholder="Ej: Coordinador Academico"
              className={`w-full h-11 px-3 rounded-xl text-sm outline-none transition-colors ${
                errors.nombre
                  ? 'border-2 border-red-400 focus:border-red-500'
                  : 'border border-gray-200 focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5]/20'
              }`}
            />
            {errors.nombre && <p className="text-[11px] text-red-500 mt-1">{errors.nombre}</p>}
          </div>

          {/* Descripcion */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>
              Descripcion <span className="text-red-500">*</span>
            </label>
            <textarea
              value={descripcion}
              onChange={e => { setDescripcion(e.target.value); setErrors(prev => ({ ...prev, descripcion: '' })); }}
              placeholder="Describe brevemente las responsabilidades de este rol..."
              rows={3}
              className={`w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none transition-colors ${
                errors.descripcion
                  ? 'border-2 border-red-400 focus:border-red-500'
                  : 'border border-gray-200 focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5]/20'
              }`}
            />
            {errors.descripcion && <p className="text-[11px] text-red-500 mt-1">{errors.descripcion}</p>}
            <p className="text-[10px] text-gray-400 mt-1">{descripcion.length}/200 caracteres</p>
          </div>

          {/* Sistema destino */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>
              Sistema destino
            </label>
            <div className="grid grid-cols-3 gap-2">
              {SISTEMAS.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSistemaDestino(s.value)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    sistemaDestino === s.value
                      ? 'border-[#003DA5] bg-[#003DA5]/5 ring-1 ring-[#003DA5]/20'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`text-xs font-bold ${sistemaDestino === s.value ? 'text-[#003DA5]' : 'text-gray-700'}`}>
                    {s.label.split(' ')[0]}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5 leading-tight">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>
              Color identificativo
            </label>
            <div className="flex flex-wrap gap-2">
              {COLORES.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-lg transition-all ${
                    color === c ? 'ring-2 ring-offset-2 scale-110' : 'hover:scale-105'
                  }`}
                  style={{ background: c, ringColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Icono */}
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>
              Icono
            </label>
            <select
              value={icono}
              onChange={e => setIcono(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#003DA5] focus:ring-1 focus:ring-[#003DA5]/20"
            >
              {ICONOS.map(i => (
                <option key={i.value} value={i.value}>{i.label}</option>
              ))}
            </select>
          </div>

          {/* 2FA Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50">
            <div>
              <div className="text-xs font-bold text-gray-700">Requiere 2FA</div>
              <div className="text-[10px] text-gray-400 mt-0.5">Autenticacion de dos factores obligatoria</div>
            </div>
            <button
              type="button"
              onClick={() => setRequiere2FA(!requiere2FA)}
              className={`relative w-10 h-5.5 rounded-full transition-colors ${
                requiere2FA ? 'bg-[#003DA5]' : 'bg-gray-300'
              }`}
              style={{ width: 40, height: 22 }}
            >
              <div
                className="absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-transform"
                style={{
                  width: 18, height: 18, top: 2,
                  transform: requiere2FA ? 'translateX(20px)' : 'translateX(2px)',
                }}
              />
            </button>
          </div>

          {/* Metadata */}
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Info size={12} className="text-gray-400" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Metadatos del rol</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-gray-400">Tipo:</span>{' '}
                <span className="font-semibold text-gray-600">{role.tipo}</span>
              </div>
              <div>
                <span className="text-gray-400">Usuarios:</span>{' '}
                <span className="font-semibold text-gray-600">{role.usuarios_count}</span>
              </div>
              <div>
                <span className="text-gray-400">Permisos:</span>{' '}
                <span className="font-semibold text-gray-600">{role.permisos_count}</span>
              </div>
              <div>
                <span className="text-gray-400">Creado:</span>{' '}
                <span className="font-semibold text-gray-600">
                  {role.created_at ? new Date(role.created_at).toLocaleDateString('es-CO') : '—'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-400">Creado por:</span>{' '}
                <span className="font-semibold text-gray-600">{role.created_by || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 shrink-0" style={{ borderTop: '1px solid #E5E7EB' }}>
          <div>
            {hasChanges && (
              <span className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Cambios sin guardar
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium rounded-xl hover:bg-gray-100 transition-colors"
              style={{ color: '#374151', border: '1px solid #D1D5DB' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110"
              style={{ background: '#003DA5' }}
            >
              <Save size={15} />
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
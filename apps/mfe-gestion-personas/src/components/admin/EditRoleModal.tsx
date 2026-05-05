import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@esap-mfe/shared-ui/dialog';
import { Button } from '@esap-mfe/shared-ui/button';
import { Input } from '@esap-mfe/shared-ui/input';
import { Label } from '@esap-mfe/shared-ui/label';
import { Textarea } from '@esap-mfe/shared-ui/textarea';
import { 
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
  Check,
  Save
} from 'lucide-react';

interface SystemRole {
  id: string;
  nombre: string;
  descripcion: string;
  icono: string;
  color: string;
  tipo: 'sistema' | 'personalizado';
}

interface EditRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: SystemRole;
  onEditRole: (roleData: {
    nombre: string;
    descripcion: string;
    icono: string;
    color: string;
  }) => void;
}

const AVAILABLE_ICONS = [
  { name: 'Shield', component: Shield, label: 'Escudo' },
  { name: 'GraduationCap', component: GraduationCap, label: 'Graduación' },
  { name: 'BookOpen', component: BookOpen, label: 'Libro' },
  { name: 'Briefcase', component: Briefcase, label: 'Maletín' },
  { name: 'Award', component: Award, label: 'Premio' },
  { name: 'UserCircle', component: UserCircle, label: 'Usuario' },
  { name: 'Building2', component: Building2, label: 'Edificio' },
  { name: 'FileText', component: FileText, label: 'Documento' },
  { name: 'MessageSquare', component: MessageSquare, label: 'Mensaje' },
  { name: 'FolderOpen', component: FolderOpen, label: 'Carpeta' },
  { name: 'BarChart3', component: BarChart3, label: 'Gráfico' },
  { name: 'Cog', component: Cog, label: 'Configuración' }
];

const AVAILABLE_COLORS = [
  { value: '#1e5da8', label: 'Azul ESAP' },
  { value: '#dc2626', label: 'Rojo' },
  { value: '#16a34a', label: 'Verde' },
  { value: '#f97316', label: 'Naranja' },
  { value: '#10b981', label: 'Esmeralda' },
  { value: '#9333ea', label: 'Púrpura' },
  { value: '#0891b2', label: 'Cian' },
  { value: '#7c3aed', label: 'Violeta' },
  { value: '#db2777', label: 'Rosa' },
  { value: '#0284c7', label: 'Azul Cielo' }
];

export function EditRoleModal({ 
  open, 
  onOpenChange, 
  role,
  onEditRole 
}: EditRoleModalProps) {
  const [nombre, setNombre] = useState(role?.nombre || '');
  const [descripcion, setDescripcion] = useState(role?.descripcion || '');
  const [selectedIcon, setSelectedIcon] = useState(role?.icono || 'Shield');
  const [selectedColor, setSelectedColor] = useState(role?.color || '#003DA5');

  // Reset form when role changes
  useEffect(() => {
    if (role) {
      setNombre(role.nombre || '');
      setDescripcion(role.descripcion || '');
      setSelectedIcon(role.icono || 'Shield');
      setSelectedColor(role.color || '#003DA5');
    }
  }, [role]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nombre?.trim() || !descripcion?.trim()) {
      return;
    }

    onEditRole({
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      icono: selectedIcon,
      color: selectedColor
    });

    onOpenChange(false);
  };

  const isSystemRole = role.tipo === 'sistema';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-extrabold text-[--esap-gray-900]">
            Editar Rol: {role.nombre}
          </DialogTitle>
          <DialogDescription className="text-base font-medium">
            {isSystemRole 
              ? 'Los roles del sistema tienen restricciones de edición para mantener la integridad'
              : 'Modifica la información y apariencia de este rol personalizado'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nombre del Rol */}
          <div className="space-y-2">
            <Label htmlFor="edit-role-name" className="text-sm font-bold">
              Nombre del Rol <span className="text-red-500">*</span>
            </Label>
            <Input
              id="edit-role-name"
              placeholder="Ej: Coordinador Regional de Sede"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              disabled={isSystemRole}
              className="h-12 border-2 border-gray-300 focus:border-[#1e5da8] font-medium disabled:opacity-60"
            />
            {isSystemRole && (
              <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
                <Shield className="w-3 h-3" />
                No se puede modificar el nombre de roles del sistema
              </p>
            )}
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="edit-role-description" className="text-sm font-bold">
              Descripción <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="edit-role-description"
              placeholder="Describe las responsabilidades, alcance y funciones principales de este rol..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              required
              className="min-h-[100px] border-2 border-gray-300 focus:border-[#1e5da8] font-medium resize-none"
            />
          </div>

          {/* Selección de Icono */}
          <div className="space-y-3">
            <Label className="text-sm font-bold">
              Icono Representativo
            </Label>
            {/* MOBILE FIRST: 4 columnas mobile, 6 desktop */}
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {AVAILABLE_ICONS.map((icon) => {
                const Icon = icon.component;
                const isSelected = selectedIcon === icon.name;
                
                return (
                  <button
                    key={icon.name}
                    type="button"
                    onClick={() => setSelectedIcon(icon.name)}
                    className={`relative p-2 sm:p-3 rounded-xl border-2 transition-all group ${
                      isSelected
                        ? 'border-[#1e5da8] bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    title={icon.label}
                  >
                    <Icon 
                      className={`w-5 h-5 sm:w-6 sm:h-6 mx-auto ${
                        isSelected ? 'text-[#1e5da8]' : 'text-gray-600 group-hover:text-gray-900'
                      }`}
                      strokeWidth={2}
                    />
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-[#1e5da8] rounded-full flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selección de Color */}
          <div className="space-y-3">
            <Label className="text-sm font-bold">
              Color Identificador
            </Label>
            {/* MOBILE FIRST: 5 columnas consistente */}
            <div className="grid grid-cols-5 gap-2">
              {AVAILABLE_COLORS.map((color) => {
                const isSelected = selectedColor === color.value;
                
                return (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setSelectedColor(color.value)}
                    className={`relative p-2 sm:p-3 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-gray-900 scale-105'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    title={color.label}
                  >
                    <div 
                      className="w-full h-6 sm:h-8 rounded-lg"
                      style={{ backgroundColor: color.value }}
                    />
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-gray-900 rounded-full flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Vista Previa */}
          <div className="p-4 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border-2 border-gray-200">
            <p className="text-xs font-bold text-gray-600 uppercase mb-3 tracking-wide">
              Vista Previa
            </p>
            <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
              <div className="flex items-center gap-3">
                <div 
                  className="p-3 rounded-xl"
                  style={{ backgroundColor: `${selectedColor}20` }}
                >
                  {(() => {
                    const IconPreview = AVAILABLE_ICONS.find(i => i.name === selectedIcon)?.component || Shield;
                    return (
                      <IconPreview 
                        className="w-6 h-6" 
                        style={{ color: selectedColor }}
                        strokeWidth={2}
                      />
                    );
                  })()}
                </div>
                <div className="flex-1">
                  <h4 className="font-extrabold text-lg text-[--esap-gray-900]">
                    {nombre}
                  </h4>
                  <p className="text-sm font-medium text-[--esap-gray-600] line-clamp-2">
                    {descripcion}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="font-bold border-2"
            >
              Cancelar
            </Button>
            <Button 
              type="submit"
              disabled={!nombre.trim() || !descripcion.trim()}
              className="bg-gradient-to-r from-[#1e5da8] to-blue-600 hover:from-[#1a4d8a] hover:to-blue-700 text-white font-bold shadow-lg"
            >
              <Save className="w-4 h-4 mr-2" />
              Guardar Cambios
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useEffect, useMemo, useState } from 'react';
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
  Check
} from 'lucide-react';

interface CreateRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateRole: (roleData: {
    nombre: string;
    descripcion: string;
    tipo: string;
    icono: string;
    color: string;
    codigo: string;
  }) => void;
}

export function CreateRoleModal({ open, onOpenChange, onCreateRole }: CreateRoleModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('custom');
  const [selectedIcon, setSelectedIcon] = useState('Shield');
  const [selectedColor, setSelectedColor] = useState('#003DA5');
  const [code, setCode] = useState('');

  const AVAILABLE_ICONS = useMemo(() => [
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
  ], []);

  const AVAILABLE_COLORS = useMemo(() => [
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
  ], []);

  const generateCode = (value: string) => {
    const normalized = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const cleaned = normalized
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    const finalCode = cleaned || 'ROL_SIN_NOMBRE';
    return finalCode.slice(0, 50);
  };

  useEffect(() => {
    setCode(generateCode(name));
  }, [name]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateRole({
      nombre: name,
      descripcion: description,
      tipo: type,
      icono: selectedIcon,
      color: selectedColor,
      codigo: code
    });
    setName('');
    setDescription('');
    setType('custom');
    setSelectedIcon('Shield');
    setSelectedColor('#003DA5');
    setCode('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Rol</DialogTitle>
          <DialogDescription>
            Define un rol personalizado para tu organización
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="role-name">
              Nombre del Rol <span className="text-red-500">*</span>
            </Label>
            <Input
              id="role-name"
              placeholder="Ej: Coordinador de Sede Regional"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2" style={{display: 'none'}}>
            <Label htmlFor="role-code">
              Código (se genera automáticamente)
            </Label>
            <Input
              id="role-code"
              value={code}
              readOnly
              className="bg-gray-50 font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role-description">
              Descripción <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="role-description"
              placeholder="Describe las responsabilidades y alcance de este rol..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role-type">Tipo de Rol</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="role-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Rol Personalizado</SelectItem>
                <SelectItem value="clone">Clonar desde Rol Existente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Iconos */}
          <div className="space-y-3">
            <Label className="text-sm font-bold">
              Icono
            </Label>
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

          {/* Colores */}
          <div className="space-y-3">
            <Label className="text-sm font-bold">
              Color
            </Label>
            <div className="grid grid-cols-5 gap-2">
              {AVAILABLE_COLORS.map((color) => {
                const isSelected = selectedColor === color.value;
                return (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setSelectedColor(color.value)}
                    className={`h-10 rounded-xl border-2 transition-all ${
                      isSelected ? 'border-[#1e5da8] ring-2 ring-blue-100' : 'border-gray-200'
                    }`}
                    style={{ background: color.value }}
                    title={color.label}
                  />
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Crear y Configurar Permisos</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

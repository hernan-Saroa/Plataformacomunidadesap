import { useState } from 'react';
import { X, Save, Upload, Mail, Phone, MapPin, User, Lock, Bell } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Separator } from '../ui/separator';
import { toast } from 'sonner';

interface ProfileConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  userData: {
    nombre: string;
    email: string;
    programa: string;
    foto?: string;
  };
}

export function ProfileConfigModal({ isOpen, onClose, userData }: ProfileConfigModalProps) {
  const [activeTab, setActiveTab] = useState<'personal' | 'contact' | 'preferences' | 'security'>('personal');
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    // Personal
    nombre: userData.nombre || '',
    apellido: 'García Rodríguez',
    cedula: '1024567890',
    fechaNacimiento: '1999-05-15',
    // Contacto
    email: userData.email || '',
    telefono: '+57 300 123 4567',
    direccion: 'Calle 72 # 15-30',
    ciudad: 'Bogotá',
    // Preferencias
    notificacionesEmail: true,
    notificacionesPush: true,
    idioma: 'es',
    // Security
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [photoPreview, setPhotoPreview] = useState(userData.foto || '');

  if (!isOpen) return null;

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('La imagen no debe superar 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
        toast.success('Foto actualizada');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    // Simular guardado
    setTimeout(() => {
      toast.success('¡Perfil actualizado exitosamente!', {
        description: 'Tus cambios han sido guardados.',
        duration: 3000,
      });
      setIsSaving(false);
      onClose();
    }, 1500);
  };

  const tabs = [
    { id: 'personal', label: 'Información Personal', icon: User },
    { id: 'contact', label: 'Contacto', icon: Phone },
    { id: 'preferences', label: 'Preferencias', icon: Bell },
    { id: 'security', label: 'Seguridad', icon: Lock },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-black text-gray-900">Configuración de Perfil</h2>
            <p className="text-sm text-gray-600 mt-1">
              Actualiza tu información personal y preferencias
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Sidebar Tabs */}
          <div className="w-64 border-r border-gray-200 p-4 space-y-1 flex-shrink-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                    activeTab === tab.id
                      ? 'bg-[#003DA5] text-white font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Información Personal */}
            {activeTab === 'personal' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="font-black text-gray-900 mb-1">Información Personal</h3>
                  <p className="text-sm text-gray-600">Actualiza tu información básica y foto de perfil</p>
                </div>

                {/* Foto de Perfil */}
                <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-lg">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={photoPreview} alt={formData.nombre} />
                    <AvatarFallback className="bg-[#003DA5] text-white text-xl">
                      {formData.nombre.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">Foto de Perfil</h4>
                    <p className="text-sm text-gray-600 mb-3">JPG, PNG o GIF. Máximo 2MB.</p>
                    <input
                      type="file"
                      id="photo-upload"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('photo-upload')?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Cambiar Foto
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Nombre y Apellido */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre" className="font-semibold">Nombre</Label>
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apellido" className="font-semibold">Apellido</Label>
                    <Input
                      id="apellido"
                      value={formData.apellido}
                      onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                    />
                  </div>
                </div>

                {/* Cédula */}
                <div className="space-y-2">
                  <Label htmlFor="cedula" className="font-semibold">Cédula</Label>
                  <Input
                    id="cedula"
                    value={formData.cedula}
                    onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                  />
                </div>

                {/* Fecha de Nacimiento */}
                <div className="space-y-2">
                  <Label htmlFor="fechaNacimiento" className="font-semibold">Fecha de Nacimiento</Label>
                  <Input
                    id="fechaNacimiento"
                    type="date"
                    value={formData.fechaNacimiento}
                    onChange={(e) => setFormData({ ...formData, fechaNacimiento: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* Contacto */}
            {activeTab === 'contact' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="font-black text-gray-900 mb-1">Información de Contacto</h3>
                  <p className="text-sm text-gray-600">Mantén actualizada tu información de contacto</p>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-semibold flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Correo Electrónico
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                  <p className="text-xs text-gray-500">Este es tu correo institucional de ESAP</p>
                </div>

                {/* Teléfono */}
                <div className="space-y-2">
                  <Label htmlFor="telefono" className="font-semibold flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Teléfono
                  </Label>
                  <Input
                    id="telefono"
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  />
                </div>

                <Separator />

                {/* Dirección */}
                <div className="space-y-2">
                  <Label htmlFor="direccion" className="font-semibold flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Dirección
                  </Label>
                  <Input
                    id="direccion"
                    value={formData.direccion}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  />
                </div>

                {/* Ciudad */}
                <div className="space-y-2">
                  <Label htmlFor="ciudad" className="font-semibold">Ciudad</Label>
                  <Input
                    id="ciudad"
                    value={formData.ciudad}
                    onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* Preferencias */}
            {activeTab === 'preferences' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="font-black text-gray-900 mb-1">Preferencias</h3>
                  <p className="text-sm text-gray-600">Personaliza tu experiencia en el portal</p>
                </div>

                {/* Notificaciones */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Notificaciones</h4>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Notificaciones por Email</p>
                      <p className="text-sm text-gray-600">Recibe actualizaciones en tu correo</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.notificacionesEmail}
                      onChange={(e) => setFormData({ ...formData, notificacionesEmail: e.target.checked })}
                      className="w-4 h-4"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Notificaciones Push</p>
                      <p className="text-sm text-gray-600">Alertas en tiempo real</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.notificacionesPush}
                      onChange={(e) => setFormData({ ...formData, notificacionesPush: e.target.checked })}
                      className="w-4 h-4"
                    />
                  </div>
                </div>

                <Separator />

                {/* Idioma */}
                <div className="space-y-2">
                  <Label htmlFor="idioma" className="font-semibold">Idioma</Label>
                  <select
                    id="idioma"
                    value={formData.idioma}
                    onChange={(e) => setFormData({ ...formData, idioma: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="es">Español</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
            )}

            {/* Seguridad */}
            {activeTab === 'security' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="font-black text-gray-900 mb-1">Seguridad</h3>
                  <p className="text-sm text-gray-600">Actualiza tu contraseña para mantener tu cuenta segura</p>
                </div>

                {/* Contraseña Actual */}
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="font-semibold">Contraseña Actual</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={formData.currentPassword}
                    onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>

                <Separator />

                {/* Nueva Contraseña */}
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="font-semibold">Nueva Contraseña</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={formData.newPassword}
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                    placeholder="••••••••"
                  />
                  <p className="text-xs text-gray-500">Mínimo 8 caracteres, incluyendo mayúsculas y números</p>
                </div>

                {/* Confirmar Contraseña */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="font-semibold">Confirmar Nueva Contraseña</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Importante:</strong> Si cambias tu contraseña, deberás iniciar sesión nuevamente en todos tus dispositivos.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3 flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            className="bg-[#003DA5] hover:bg-[#002d7a] gap-2"
            disabled={isSaving}
          >
            {isSaving ? (
              'Guardando...'
            ) : (
              <>
                <Save className="w-4 h-4" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, User, Mail, Phone, Building2, Shield, Calendar, Clock, MapPin, Globe, 
  Edit2, Save, Eye, Key, Activity, TrendingUp, Award, Zap, LogOut,
  Settings, Bell, Lock, Sparkles, CheckCircle2, BarChart3, Users,
  Camera, Upload, Link as LinkIcon, MessageSquare, Hash
} from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@esap-mfe/shared-ui/avatar';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Separator } from '@esap-mfe/shared-ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@esap-mfe/shared-ui/tabs';
import { ChangePasswordModal } from './ChangePasswordModal';
import { Dialog } from '@esap-mfe/shared-ui/dialog';
import { authService } from '../../services/api/authService';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userEmail: string;
  userRole: string;
  userInitials: string;
  onLogout?: () => void;
}

export function ProfileModal({ 
  isOpen, 
  onClose, 
  userName, 
  userEmail, 
  userRole,
  userInitials,
  onLogout 
}: ProfileModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [viewAllPermissions, setViewAllPermissions] = useState('');
  const [formData, setFormData] = useState({
    fullName: userName,
    email: userEmail,
    phone: '+57 300 123 4567',
    position: userRole,
    department: 'Administración',
    location: 'Bogotá, Colombia',
    timezone: 'GMT-5 (Colombia)',
    bio: 'Administrador del sistema con más de 5 años de experiencia en gestión de plataformas educativas.',
  });

  // Mock: Roles activos del usuario (basado en sistema Usuario-Persona)
  const userLogged = authService.getCurrentUser();
  userRole = userLogged?.roles[0].name || userRole;
  // const rolesActivos = ['Super Administrador', 'Administrativo'];
  const rolesActivos = userLogged?.roles?.map((role: any) => ({
    code: role.code,
    name: role.name,
    permissions: role.permissions || []
  })) || [{ name: 'Sin Rol Activo', permissions: [], code: '' }];
  const isSuperAdmin = userLogged?.roles?.some((role: any) => role.code === 'SUPER_ADMIN');
  // Mock: Última sesión
  const lastSession = {
    date: new Date().toLocaleDateString('es-CO'),
    time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
    device: 'Chrome en Windows',
    location: 'Bogotá, Colombia',
    ip: 'IP interna protegida'
  };

  // Mock data para estadísticas
  const stats = [
    { label: 'Sesiones', value: '234', icon: Activity, color: 'from-blue-500 to-blue-600', change: '+12%' },
    { label: 'Asistencia', value: '87%', icon: TrendingUp, color: 'from-purple-500 to-purple-600', change: '+5%' },
    { label: 'Notificaciones', value: '10', icon: Bell, color: 'from-green-500 to-green-600', change: '+3' },
    { label: 'Pendientes', value: '2', icon: Clock, color: 'from-orange-500 to-orange-600', change: '-1' },
  ];

  const recentActivity = [
    { action: 'Inicio de sesión exitoso', time: 'Hace 2 horas', type: 'success' },
    { action: 'Perfil actualizado', time: 'Hace 1 día', type: 'info' },
    { action: 'Cambio de contraseña', time: 'Hace 3 días', type: 'warning' },
    { action: 'Nuevo dispositivo detectado', time: 'Hace 5 días', type: 'info' },
  ];

  const handleSave = () => {
    toast.success('Perfil actualizado exitosamente', {
      description: 'Todos tus cambios se han guardado correctamente',
    });
    setIsEditing(false);
  };

  console.log('🟡 ProfileModal render', { isOpen });

  return (
    <>
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-start md:items-start justify-end">
        {/* Backdrop Premium con Blur - Animación más rápida */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />

        {/* Drawer/Slide-over Container - MEJORADO Y ALINEADO ARRIBA */}
        <motion.div
          initial={{ x: 500, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 500, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 400, mass: 0.8 }}
          className="relative w-full sm:w-[95vw] md:w-[85vw] lg:w-[420px] xl:w-[450px] 2xl:w-[480px] bg-white shadow-2xl overflow-hidden flex flex-col h-full rounded-none sm:rounded-l-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile Drag Handle */}
          <div className="md:hidden flex justify-center pt-2 pb-1 bg-gradient-to-br from-[#1e5da8] to-[#2563eb] flex-shrink-0">
            <div className="w-10 h-1 bg-white/30 rounded-full"></div>
          </div>

          {/* Header Premium - COMPACTO */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#1e5da8] via-[#2563eb] to-[#3b82f6] flex-shrink-0">
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: 'radial-gradient(circle at 25% 50%, rgba(255, 255, 255, 0.4) 0%, transparent 50%), radial-gradient(circle at 75% 50%, rgba(255, 255, 255, 0.3) 0%, transparent 50%)'
            }} />

            {/* Botones - MÁS PEQUEÑOS */}
            <div className="absolute top-1.5 right-1.5 z-20 flex items-center gap-1">
              {!isEditing && (
                <motion.button
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setIsEditing(true)}
                  className="w-6 h-6 md:w-7 md:h-7 rounded-md bg-white/10 backdrop-blur-md hover:bg-white/20 flex items-center justify-center transition-all border border-white/20 group active:scale-95"
                  title="Editar perfil"
                >
                  <Edit2 className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" />
                </motion.button>
              )} 
              
              {isEditing && (
                <motion.button
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  onClick={handleSave}
                  className="w-6 h-6 md:w-7 md:h-7 rounded-md bg-green-500/90 backdrop-blur-md hover:bg-green-600 flex items-center justify-center transition-all border border-white/20 group shadow-lg active:scale-95"
                  title="Guardar cambios"
                >
                  <Save className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" />
                </motion.button>
              )} 
              
              <button
                onClick={onClose}
                className="w-6 h-6 md:w-7 md:h-7 rounded-md bg-white/10 backdrop-blur-md hover:bg-white/20 flex items-center justify-center transition-all border border-white/20 group active:scale-95"
                title="Cerrar"
              >
                <X className="w-3 h-3 md:w-3.5 md:h-3.5 text-white" />
              </button>
            </div>

            {/* Avatar y Info - MEJORADO CON TEXTO MÁS GRANDE */}
            <div className="relative p-2.5 md:p-3 pr-[64px] md:pr-[72px]">
              <div className="flex items-center gap-2 md:gap-2.5">
                <div className="relative group flex-shrink-0">
                  <Avatar className="w-12 h-12 md:w-14 md:h-14 ring-2 ring-white/40">
                    <AvatarFallback className="bg-white/20 backdrop-blur-md text-white text-base md:text-lg font-black">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="text-base md:text-lg font-black text-white mb-0.5 tracking-tight truncate leading-tight">{userName}</h2>
                  <div className="flex items-center gap-1 mb-1">
                    <Mail className="w-3 h-3 md:w-3.5 md:h-3.5 text-white/70 flex-shrink-0" />
                    <p className="text-[11px] md:text-xs text-white/90 truncate font-medium">{userEmail}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    <Badge className="bg-white/20 backdrop-blur-md border-white/30 text-white text-[9px] md:text-[10px] py-0.5 px-2 h-auto font-semibold"
                      style={{textWrap: 'wrap'}}>
                      <Shield className="w-2.5 h-2.5 mr-1" />
                      {userRole}
                    </Badge>
                    <Badge className="bg-green-500/20 backdrop-blur-md border-green-400/30 text-white text-[9px] md:text-[10px] py-0.5 px-2 h-auto font-semibold">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse mr-1" />
                      En línea
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs - ULTRA COMPACTOS */}
          <div className="bg-white border-b border-gray-200 flex-shrink-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-1.5 py-0.5 overflow-x-auto">
                <TabsList className="bg-gray-100/80 border border-gray-200/60 h-auto p-0.5 gap-0.5 rounded-md inline-flex">
                  <TabsTrigger 
                    value="general" 
                    className="data-[state=active]:bg-white data-[state=active]:text-[#1e5da8] data-[state=active]:shadow-sm data-[state=inactive]:text-gray-600 px-1.5 py-1 rounded text-[9px] md:text-[10px] font-semibold whitespace-nowrap"
                  >
                    <User className="w-2.5 h-2.5 mr-0.5" />
                    General
                  </TabsTrigger>
                  <TabsTrigger 
                    value="activity" 
                    className="data-[state=active]:bg-white data-[state=active]:text-[#1e5da8] data-[state=active]:shadow-sm data-[state=inactive]:text-gray-600 px-1.5 py-1 rounded text-[9px] md:text-[10px] font-semibold whitespace-nowrap"
                  >
                    <Activity className="w-2.5 h-2.5 mr-0.5" />
                    Actividad
                  </TabsTrigger>
                  <TabsTrigger 
                    value="security" 
                    className="data-[state=active]:bg-white data-[state=active]:text-[#1e5da8] data-[state=active]:shadow-sm data-[state=inactive]:text-gray-600 px-1.5 py-1 rounded text-[9px] md:text-[10px] font-semibold whitespace-nowrap"
                  >
                    <Lock className="w-2.5 h-2.5 mr-0.5" />
                    Seguridad
                  </TabsTrigger>
                  <TabsTrigger 
                    value="preferences" 
                    className="data-[state=active]:bg-white data-[state=active]:text-[#1e5da8] data-[state=active]:shadow-sm data-[state=inactive]:text-gray-600 px-1.5 py-1 rounded text-[9px] md:text-[10px] font-semibold whitespace-nowrap"
                  >
                    <Settings className="w-2.5 h-2.5 mr-0.5" />
                    Ajustes
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Contenido - ULTRA DENSO */}
              <div className="flex-1 overflow-y-auto p-1 md:p-1.5 max-h-[calc(100vh-360px)] md:max-h-[calc(100vh-240px)]" style={{ scrollbarGutter: 'stable' }}>
                {/* Tab: General */}
                <TabsContent value="general" className="mt-0 space-y-1.5">
                  {/* Bio Section */}
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white rounded-lg border border-gray-200 p-1.5 md:p-2 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs md:text-sm font-black text-gray-900 flex items-center gap-1.5">
                        <MessageSquare className="w-3 h-3 md:w-3.5 md:h-3.5 text-[#1e5da8]" />
                        Biografía
                      </h3>
                      {!isEditing && (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="text-[10px] md:text-xs text-[#1e5da8] hover:text-[#174a8a] font-semibold flex items-center gap-1 active:scale-95 transition-transform"
                        >
                          <Edit2 className="w-3 h-3" />
                          Editar
                        </button>
                      )}
                    </div>
                    {isEditing ? (
                      <textarea
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        className="w-full px-2.5 py-2 border-2 border-gray-200 rounded-lg text-[11px] md:text-xs focus:border-[#1e5da8] outline-none resize-none transition-colors"
                        rows={2}
                      />
                    ) : (
                      <p className="text-[11px] md:text-xs text-gray-600 leading-relaxed">{formData.bio}</p>
                    )}
                  </motion.div>

                  {/* Personal Info Grid */}
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.05 }}
                    className="bg-white rounded-lg border border-gray-200 p-2.5 md:p-3 hover:shadow-md transition-shadow"
                  >
                    <h3 className="text-xs md:text-sm font-black text-gray-900 mb-2 flex items-center gap-1.5">
                      <User className="w-3 h-3 md:w-3.5 md:h-3.5 text-[#1e5da8]" />
                      Información Personal
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[9px] md:text-[10px] font-bold text-gray-500 uppercase tracking-wide">Nombre Completo</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            className="w-full px-2.5 py-1.5 border-2 border-gray-200 rounded-lg text-[11px] md:text-xs focus:border-[#1e5da8] outline-none"
                          />
                        ) : (
                          <div className="px-2.5 py-1.5 bg-gray-50 rounded-lg font-semibold text-[11px] md:text-xs text-gray-900">
                            {formData.fullName}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] md:text-[10px] font-bold text-gray-500 uppercase tracking-wide">Teléfono</label>
                        {isEditing ? (
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full px-2.5 py-1.5 border-2 border-gray-200 rounded-lg text-[11px] md:text-xs focus:border-[#1e5da8] outline-none"
                          />
                        ) : (
                          <div className="px-2.5 py-1.5 bg-gray-50 rounded-lg font-semibold text-[11px] md:text-xs text-gray-900 flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-gray-400" />
                            {formData.phone}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] md:text-[10px] font-bold text-gray-500 uppercase tracking-wide">Ubicación</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            className="w-full px-2.5 py-1.5 border-2 border-gray-200 rounded-lg text-[11px] md:text-xs focus:border-[#1e5da8] outline-none"
                          />
                        ) : (
                          <div className="px-2.5 py-1.5 bg-gray-50 rounded-lg font-semibold text-[11px] md:text-xs text-gray-900 flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            {formData.location}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] md:text-[10px] font-bold text-gray-500 uppercase tracking-wide">Zona Horaria</label>
                        <div className="px-2.5 py-1.5 bg-gray-50 rounded-lg font-semibold text-[11px] md:text-xs text-gray-900 flex items-center gap-1.5">
                          <Globe className="w-3 h-3 text-gray-400" />
                          {formData.timezone}
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Roles Activos (Sistema Usuario-Persona) */}
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.1 }}
                    className="bg-white rounded-lg border border-gray-200 p-2.5 md:p-3 hover:shadow-md transition-shadow"
                  >
                    <h3 className="text-xs md:text-sm font-black text-gray-900 mb-2 flex items-center gap-1.5">
                      <Users className="w-3 h-3 md:w-3.5 md:h-3.5 text-[#1e5da8]" />
                      Roles Activos
                    </h3>
                    <div className="space-y-2">
                      {rolesActivos.map((rol, idx) => (
                        <div key={idx} className="p-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1e5da8] to-[#154a85] flex items-center justify-center">
                              <Shield className="w-3.5 h-3.5 text-white" />
                            </div>
                            <div>
                              <p className="text-[11px] md:text-xs font-bold text-gray-900">{rol.name}</p>
                              {!isSuperAdmin ? (
                              <p className="text-[9px] md:text-[10px] text-gray-600">{rol.permissions.length} accesos &nbsp;
                                <button onClick={() => setViewAllPermissions(viewAllPermissions === rol.code ? '' : rol.code)}className="text-blue-600 hover:underline" style={{fontSize: '10px'}}>
                                  {viewAllPermissions === rol.code ? 'ocultar permisos' : 'ver permisos'}
                                </button></p>
                              ) : (
                                <p className="text-[9px] md:text-[10px] text-gray-600">Acceso completo</p>
                              )}
                            </div>
                          </div>
                          <Badge className="bg-green-100 text-green-700 border-green-200 text-[9px]">
                            <CheckCircle2 className="w-2 h-2 mr-0.5" />
                            Activo
                          </Badge>
                          </div>
                          {viewAllPermissions === rol.code && (
                            <div >
                              {rol.permissions.map((permission: any) => (
                                <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-[9px] mr-1">
                                  {permission.name}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Work Info */}
                  <motion.div 
                    style={{display: 'none'}}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.15 }}
                    className="bg-white rounded-lg border border-gray-200 p-2.5 md:p-3 hover:shadow-md transition-shadow"
                  >
                    <h3 className="text-xs md:text-sm font-black text-gray-900 mb-2 flex items-center gap-1.5">
                      <Building2 className="w-3 h-3 md:w-3.5 md:h-3.5 text-[#1e5da8]" />
                      Información Laboral
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[9px] md:text-[10px] font-bold text-gray-500 uppercase tracking-wide">Cargo</label>
                        <div className="px-2.5 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg font-semibold text-[11px] md:text-xs text-gray-900 flex items-center gap-1.5">
                          <Shield className="w-3 h-3 text-[#1e5da8]" />
                          {formData.position}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] md:text-[10px] font-bold text-gray-500 uppercase tracking-wide">Departamento</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={formData.department}
                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                            className="w-full px-2.5 py-1.5 border-2 border-gray-200 rounded-lg text-[11px] md:text-xs focus:border-[#1e5da8] outline-none"
                          />
                        ) : (
                          <div className="px-2.5 py-1.5 bg-gray-50 rounded-lg font-semibold text-[11px] md:text-xs text-gray-900">
                            {formData.department}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </TabsContent>

                {/* Tab: Activity */}
                <TabsContent value="activity" className="mt-0 space-y-4">
                  <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5">
                    <h3 className="font-black text-gray-900 mb-3 flex items-center gap-2 text-sm">
                      <Activity className="w-4 h-4 text-[#1e5da8]" />
                      Actividad Reciente
                    </h3>
                    <div className="space-y-3">
                      {recentActivity.map((activity, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                        >
                          <div className={`w-2 h-2 rounded-full mt-2 ${
                            activity.type === 'success' ? 'bg-green-500' :
                            activity.type === 'warning' ? 'bg-orange-500' :
                            'bg-blue-500'
                          }`} />
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{activity.action}</p>
                            <p className="text-sm text-gray-500">{activity.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Tab: Security */}
                <TabsContent value="security" className="mt-0 space-y-4">
                  <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5">
                    <h3 className="font-black text-gray-900 mb-3 flex items-center gap-2 text-sm">
                      <Lock className="w-4 h-4 text-[#1e5da8]" />
                      Seguridad de la Cuenta
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="font-bold text-green-900">Autenticación Verificada</p>
                            <p className="text-sm text-green-700">Tu cuenta está protegida con Office 365</p>
                          </div>
                        </div>
                        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                      </div>

                      {/* Cambiar Contraseña - Botón Premium */}
                      <button
                        onClick={() => setShowChangePassword(true)}
                        className="w-full p-4 bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-2 border-blue-200 hover:border-blue-300 rounded-xl transition-all group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#1e5da8] rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Key className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-left">
                              <p className="font-bold text-gray-900">Cambiar Contraseña</p>
                              <p className="text-sm text-gray-600">Actualiza tu contraseña de acceso</p>
                            </div>
                          </div>
                          <div className="text-[#1e5da8] group-hover:translate-x-1 transition-transform">
                            →
                          </div>
                        </div>
                      </button>

                      {/* Última Sesión - Información Detallada */}
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
                        <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <Activity className="w-5 h-5 text-[#1e5da8]" />
                          Última Sesión Activa
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <div>
                              <p className="text-xs font-bold text-gray-500 uppercase mb-1">Fecha y Hora</p>
                              <p className="font-semibold text-gray-900">{lastSession.date} a las {lastSession.time}</p>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-500 uppercase mb-1">Dispositivo</p>
                              <p className="font-semibold text-gray-900">{lastSession.device}</p>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <p className="text-xs font-bold text-gray-500 uppercase mb-1">Ubicación</p>
                              <p className="font-semibold text-gray-900 flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                {lastSession.location}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-500 uppercase mb-1">Dirección IP</p>
                              <p className="font-semibold text-gray-900 font-mono text-sm">{lastSession.ip}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 rounded-xl">
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="text-xs font-bold text-gray-500 uppercase">Primer Acceso</span>
                          </div>
                          <p className="font-bold text-gray-900">
                            {new Date().toLocaleDateString('es-ES', { 
                              day: '2-digit', 
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-xl">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="text-xs font-bold text-gray-500 uppercase">Duración Sesión</span>
                          </div>
                          <p className="font-bold text-gray-900">2h 34m</p>
                        </div>
                      </div>

                      <button className="w-full py-3 px-4 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl font-semibold text-red-600 transition-all flex items-center justify-center gap-2">
                        <LogOut className="w-4 h-4" />
                        Cerrar todas las sesiones
                      </button>
                    </div>
                  </div>
                </TabsContent>

                {/* Tab: Preferences */}
                <TabsContent value="preferences" className="mt-0 space-y-4">
                  <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5">
                    <h3 className="font-black text-gray-900 mb-3 flex items-center gap-2 text-sm">
                      <Settings className="w-4 h-4 text-[#1e5da8]" />
                      Preferencias
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div>
                          <p className="font-semibold text-gray-900">Notificaciones por email</p>
                          <p className="text-sm text-gray-500">Recibir actualizaciones importantes</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1e5da8]"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div>
                          <p className="font-semibold text-gray-900">Tema oscuro</p>
                          <p className="text-sm text-gray-500">Cambiar apariencia de la interfaz</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1e5da8]"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Footer Premium - Sticky siempre visible - MEJORADO */}
          <div className="mt-auto border-t-2 border-gray-200 bg-white flex-shrink-0">
            {/* Footer con acciones de edición */}
            {isEditing && (
              <div className="px-2 py-2 md:px-3 md:py-2.5 bg-gradient-to-br from-amber-50 to-orange-50 border-b-2 border-amber-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 md:w-3.5 md:h-3.5 text-amber-600" />
                  <p className="text-[10px] md:text-xs text-amber-800 font-semibold">
                    Los cambios se guardarán de forma inmediata
                  </p>
                </div>
                <div className="flex gap-1.5 md:gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex-1 md:flex-none px-3 py-1.5 md:px-4 md:py-2 text-[10px] md:text-xs font-bold text-gray-700 hover:bg-white/80 bg-white border border-gray-200 rounded-lg transition-all active:scale-95"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 md:flex-none px-3 py-1.5 md:px-4 md:py-2 text-[10px] md:text-xs font-bold text-white bg-gradient-to-r from-[#1e5da8] to-[#2563eb] rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <Save className="w-3 h-3 md:w-3.5 md:h-3.5" />
                    Guardar
                  </button>
                </div>
              </div>
            )}

            {/* Footer principal - Sesión y Logout - SIEMPRE VISIBLE */}
            <div className="px-2 py-2 md:px-2.5 md:py-2 bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 md:gap-1.5">
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-500 animate-pulse"></div>
                <Shield className="w-2.5 h-2.5 md:w-3 md:h-3 text-gray-500" />
                <span className="text-[9px] md:text-[10px] text-gray-600 font-semibold">Sesión activa vía Office 365</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevenir propagación del evento
                  console.log('🔴 Botón Cerrar Sesión clickeado');
                  if (onLogout) {
                    console.log('✅ Ejecutando onLogout');
                    onClose(); // Cerrar el drawer primero
                    setTimeout(() => {
                      onLogout();
                    }, 200); // Ejecutar logout con pequeño delay
                  } else {
                    console.log('❌ No hay onLogout definido');
                    toast.error('Error al cerrar sesión', {
                      description: 'No se pudo cerrar la sesión. Intenta de nuevo.',
                    });
                  }
                }}
                className="flex items-center gap-1 px-2 py-1 md:px-2.5 md:py-1.5 text-[9px] md:text-[10px] font-bold text-red-600 hover:text-red-700 hover:bg-red-50 border-2 border-transparent hover:border-red-200 rounded-lg transition-all active:scale-95 shadow-sm hover:shadow-md cursor-pointer"
                type="button"
              >
                <LogOut className="w-2.5 h-2.5 md:w-3 md:h-3" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>

    {/* Modal de Cambiar Contraseña */}
    <ChangePasswordModal
      isOpen={showChangePassword}
      onClose={() => setShowChangePassword(false)}
      userEmail={userEmail}
      mode="authenticated"
    />
    </>
  );
}

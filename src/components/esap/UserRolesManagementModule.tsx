import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  Plus,
  X,
  Check,
  Calendar,
  Clock,
  AlertCircle,
  Star,
  History,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  BookOpen,
  Briefcase,
  Award,
  Search
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';

// Types basados en usuarios_persona_roles
interface UserRole {
  id_rol_usuario: string;
  tipo_rol: 'Aspirante' | 'Estudiante' | 'Docente' | 'Administrativo' | 'Graduado';
  esta_activo: boolean;
  es_rol_principal: boolean;
  fecha_activacion: string;
  fecha_desactivacion?: string;
  motivo_activacion: string;
  motivo_desactivacion?: string;
  datos_rol?: Record<string, any>;
  activado_por_nombre?: string;
  desactivado_por_nombre?: string;
}

interface UserInfo {
  id_usuario: string;
  nombre_completo: string;
  email_institucional: string;
  numero_documento: string;
  foto_perfil_url?: string;
}

interface UserRolesManagementModuleProps {
  userId: string;
}

export function UserRolesManagementModule({ userId }: UserRolesManagementModuleProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [newRoleType, setNewRoleType] = useState<string>('');
  const [newRoleReason, setNewRoleReason] = useState('');

  // Mock data
  const userInfo: UserInfo = {
    id_usuario: userId,
    nombre_completo: 'María López Rodríguez',
    email_institucional: 'maria.lopez@esap.edu.co',
    numero_documento: '1234567890'
  };

  // Mock: 4 roles activos según lógica Usuario Persona ESAP
  const activeRoles: UserRole[] = [
    {
      id_rol_usuario: '1',
      tipo_rol: 'Estudiante',
      esta_activo: true,
      es_rol_principal: true,
      fecha_activacion: '2024-01-15',
      motivo_activacion: 'Matrícula en Pregrado de Administración Pública - Modalidad Presencial',
      datos_rol: {
        programa: 'Administración Pública',
        nivel: 'Pregrado',
        semestre: 6,
        jornada: 'Diurna',
        codigo_estudiante: 'EST-2024-00789'
      },
      activado_por_nombre: 'Sistema Académico'
    },
    {
      id_rol_usuario: '2',
      tipo_rol: 'Docente',
      esta_activo: true,
      es_rol_principal: false,
      fecha_activacion: '2024-06-10',
      motivo_activacion: 'Contratación como docente de cátedra en Derecho Administrativo',
      datos_rol: {
        dedicacion: 'Medio tiempo',
        area: 'Derecho Público',
        codigo_docente: 'DOC-00456',
        horas_semanales: 8
      },
      activado_por_nombre: 'Recursos Humanos'
    },
    {
      id_rol_usuario: '3',
      tipo_rol: 'Graduado',
      esta_activo: true,
      es_rol_principal: false,
      fecha_activacion: '2023-12-15',
      motivo_activacion: 'Graduación exitosa de Maestría en Gobierno y Políticas Públicas',
      datos_rol: {
        programa: 'Maestría en Gobierno y Políticas Públicas',
        fecha_grado: '2023-12-01',
        promedio_final: 4.5,
        distincion: 'Cum Laude'
      },
      activado_por_nombre: 'Sistema Académico'
    },
    {
      id_rol_usuario: '4',
      tipo_rol: 'Administrativo',
      esta_activo: true,
      es_rol_principal: false,
      fecha_activacion: '2024-09-01',
      motivo_activacion: 'Monitor de apoyo en Dirección de Investigación',
      datos_rol: {
        dependencia: 'Dirección de Investigación',
        cargo: 'Monitor',
        tipo_vinculacion: 'Apoyo Académico',
        horas_semanales: 10
      },
      activado_por_nombre: 'Director de Investigación'
    }
  ];

  const roleHistory: UserRole[] = [
    {
      id_rol_usuario: '5',
      tipo_rol: 'Aspirante',
      esta_activo: false,
      es_rol_principal: false,
      fecha_activacion: '2023-11-15',
      fecha_desactivacion: '2024-01-15',
      motivo_activacion: 'Solicitud de admisión a Pregrado de Administración Pública',
      motivo_desactivacion: 'Admisión exitosa - Transición a rol Estudiante',
      activado_por_nombre: 'Sistema de Admisiones',
      desactivado_por_nombre: 'Sistema Académico'
    },
    {
      id_rol_usuario: '6',
      tipo_rol: 'Administrativo',
      esta_activo: false,
      es_rol_principal: false,
      fecha_activacion: '2022-03-01',
      fecha_desactivacion: '2024-08-31',
      motivo_activacion: 'Auxiliar administrativo en prácticas',
      motivo_desactivacion: 'Finalización del programa de prácticas',
      activado_por_nombre: 'Recursos Humanos',
      desactivado_por_nombre: 'Jefe de Talento Humano'
    }
  ];

  const getRoleConfig = (role: string) => {
    const configs: Record<string, { icon: any; color: string; bg: string; label: string }> = {
      'Aspirante': {
        icon: Users,
        color: 'text-purple-600',
        bg: 'bg-purple-50',
        label: 'Aspirante'
      },
      'Estudiante': {
        icon: GraduationCap,
        color: 'text-[#1e5da8]',
        bg: 'bg-blue-50',
        label: 'Estudiante'
      },
      'Docente': {
        icon: BookOpen,
        color: 'text-green-600',
        bg: 'bg-green-50',
        label: 'Docente'
      },
      'Administrativo': {
        icon: Briefcase,
        color: 'text-orange-600',
        bg: 'bg-orange-50',
        label: 'Administrativo'
      },
      'Graduado': {
        icon: Award,
        color: 'text-indigo-600',
        bg: 'bg-indigo-50',
        label: 'Graduado'
      }
    };
    return configs[role] || configs.Estudiante;
  };

  const handleAddRole = () => {
    if (!newRoleType || !newRoleReason.trim()) return;
    console.log('Agregando rol:', { tipo: newRoleType, motivo: newRoleReason });
    setShowAddModal(false);
    setNewRoleType('');
    setNewRoleReason('');
  };

  const handleDeactivateRole = (roleId: string) => {
    console.log('Desactivando rol:', roleId);
  };

  const handleSetPrincipal = (roleId: string) => {
    console.log('Estableciendo rol principal:', roleId);
  };

  const formatDuration = (startDate: string, endDate?: string) => {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));
    const years = Math.floor(diffMonths / 12);
    const months = diffMonths % 12;
    
    if (years > 0) {
      return `${years} ${years === 1 ? 'año' : 'años'}${months > 0 ? ` ${months} meses` : ''}`;
    }
    return `${months} ${months === 1 ? 'mes' : 'meses'}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <h1 className="text-2xl lg:text-xl xl:text-2xl font-extrabold text-[--esap-gray-900] tracking-tight">
              Roles y Permisos - Usuario Persona
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 text-blue-700 rounded-full text-xs font-bold">
              <Users className="w-3.5 h-3.5" />
              Múltiples Roles
            </span>
          </div>
          <p className="text-xs lg:text-[11px] xl:text-xs text-[--esap-gray-600]">
            Una persona puede tener múltiples roles activos simultáneamente con trazabilidad completa
          </p>
        </div>
      </motion.div>

      {/* User Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="p-6 border-2 border-[--esap-gray-200]" style={{ boxShadow: 'var(--esap-shadow-md)' }}>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-[#1e5da8] to-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl font-extrabold shadow-lg">
              {userInfo.nombre_completo.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-extrabold text-[--esap-gray-900] mb-1">{userInfo.nombre_completo}</h3>
              <p className="text-sm text-[--esap-gray-600] mb-0.5">{userInfo.email_institucional}</p>
              <p className="text-xs font-medium text-[--esap-gray-500]">CC: {userInfo.numero_documento}</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#1e5da8] to-blue-600 text-white rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-semibold">Agregar Rol</span>
            </button>
          </div>
        </Card>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div
            className="bg-white rounded-xl p-4 border border-[--esap-gray-200]"
            style={{ boxShadow: 'var(--esap-shadow-sm)' }}
            whileHover={{ y: -2, boxShadow: 'var(--esap-shadow-md)' }}
          >
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-50 flex-shrink-0">
                <Check className="w-5 h-5 text-blue-600" strokeWidth={2} />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-[--esap-gray-900] mb-1">{activeRoles.length}</p>
            <p className="text-xs font-semibold text-[--esap-gray-600]">Roles Activos</p>
          </motion.div>

          <motion.div
            className="bg-white rounded-xl p-4 border border-[--esap-gray-200]"
            style={{ boxShadow: 'var(--esap-shadow-sm)' }}
            whileHover={{ y: -2, boxShadow: 'var(--esap-shadow-md)' }}
          >
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-amber-100 to-amber-50 flex-shrink-0">
                <Star className="w-5 h-5 text-amber-600" strokeWidth={2} />
              </div>
            </div>
            <p className="text-lg font-extrabold text-[--esap-gray-900] mb-1">
              {activeRoles.find(r => r.es_rol_principal)?.tipo_rol || 'N/A'}
            </p>
            <p className="text-xs font-semibold text-[--esap-gray-600]">Rol Principal</p>
          </motion.div>

          <motion.div
            className="bg-white rounded-xl p-4 border border-[--esap-gray-200]"
            style={{ boxShadow: 'var(--esap-shadow-sm)' }}
            whileHover={{ y: -2, boxShadow: 'var(--esap-shadow-md)' }}
          >
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-green-100 to-green-50 flex-shrink-0">
                <Clock className="w-5 h-5 text-green-600" strokeWidth={2} />
              </div>
            </div>
            <p className="text-lg font-extrabold text-[--esap-gray-900] mb-1">
              {formatDuration(
                activeRoles.sort((a, b) => 
                  new Date(a.fecha_activacion).getTime() - new Date(b.fecha_activacion).getTime()
                )[0]?.fecha_activacion
              )}
            </p>
            <p className="text-xs font-semibold text-[--esap-gray-600]">Rol Más Antiguo</p>
          </motion.div>

          <motion.div
            className="bg-white rounded-xl p-4 border border-[--esap-gray-200]"
            style={{ boxShadow: 'var(--esap-shadow-sm)' }}
            whileHover={{ y: -2, boxShadow: 'var(--esap-shadow-md)' }}
          >
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-purple-100 to-purple-50 flex-shrink-0">
                <History className="w-5 h-5 text-purple-600" strokeWidth={2} />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-[--esap-gray-900] mb-1">{roleHistory.length}</p>
            <p className="text-xs font-semibold text-[--esap-gray-600]">Roles en Historial</p>
          </motion.div>
        </div>
      </motion.div>

      {/* Active Roles */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold text-[--esap-gray-900]">Roles Activos</h2>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            <History className="w-4 h-4" />
            <span className="text-sm font-bold">{showHistory ? 'Ocultar' : 'Ver'} Historial</span>
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeRoles.map((role) => {
            const config = getRoleConfig(role.tipo_rol);
            const Icon = config.icon;

            return (
              <motion.div
                key={role.id_rol_usuario}
                className="bg-white rounded-2xl p-6 border-2 border-[--esap-gray-200]"
                style={{ boxShadow: 'var(--esap-shadow-sm)' }}
                whileHover={{ y: -2, boxShadow: 'var(--esap-shadow-md)' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${config.bg}`}>
                      <Icon className={`w-6 h-6 ${config.color}`} strokeWidth={2} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-extrabold text-base text-[--esap-gray-900]">{config.label}</h3>
                        {role.es_rol_principal && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-gradient-to-r from-amber-100 to-amber-50 border-2 border-amber-300 text-amber-700 rounded-lg text-xs font-bold">
                            <Star className="w-3 h-3" />
                            Principal
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-[--esap-gray-600]">
                        Activo desde {new Date(role.fecha_activacion).toLocaleDateString('es-CO')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Role Data */}
                {role.datos_rol && Object.keys(role.datos_rol).length > 0 && (
                  <div className="mb-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50/30 rounded-xl border border-gray-200">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {Object.entries(role.datos_rol).map(([key, value]) => (
                        <div key={key}>
                          <p className="text-xs font-semibold text-[--esap-gray-600] capitalize mb-1">
                            {key.replace(/_/g, ' ')}
                          </p>
                          <p className="font-bold text-[--esap-gray-900] truncate">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="space-y-2.5 mb-4 text-sm">
                  <div className="flex items-center gap-2 text-[--esap-gray-700]">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="font-medium">Duración: {formatDuration(role.fecha_activacion)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[--esap-gray-700]">
                    <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="font-medium">Activado por: {role.activado_por_nombre}</span>
                  </div>
                  {role.motivo_activacion && (
                    <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
                      <span className="text-xs font-medium text-blue-900">{role.motivo_activacion}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t-2 border-gray-200">
                  {!role.es_rol_principal && (
                    <button
                      onClick={() => handleSetPrincipal(role.id_rol_usuario)}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl hover:from-amber-600 hover:to-amber-700 hover:shadow-lg transition-all font-bold text-sm"
                    >
                      <Star className="w-4 h-4" />
                      Hacer Principal
                    </button>
                  )}
                  <button
                    onClick={() => handleDeactivateRole(role.id_rol_usuario)}
                    disabled={activeRoles.length === 1}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 hover:shadow-lg transition-all font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
                  >
                    <X className="w-4 h-4" />
                    Desactivar
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* History */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-white rounded-2xl p-6 border-2 border-[--esap-gray-200]" style={{ boxShadow: 'var(--esap-shadow-sm)' }}>
              <h3 className="text-lg font-extrabold text-[--esap-gray-900] mb-4">Historial de Roles Desactivados</h3>
          <Badge variant="outline">{roleHistory.length}</Badge>
              <div className="space-y-3">
                {roleHistory.map((role) => {
                  const config = getRoleConfig(role.tipo_rol);
                  const Icon = config.icon;

                  return (
                    <motion.div
                      key={role.id_rol_usuario}
                      className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-300 opacity-80"
                      whileHover={{ opacity: 1 }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${config.bg} border-2 border-gray-300`}>
                          <Icon className={`w-5 h-5 ${config.color}`} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-extrabold text-[--esap-gray-900]">{config.label}</h4>
                          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[--esap-gray-600] mt-1">
                            <span>
                              {new Date(role.fecha_activacion).toLocaleDateString('es-CO')} - 
                              {role.fecha_desactivacion ? new Date(role.fecha_desactivacion).toLocaleDateString('es-CO') : 'Activo'}
                            </span>
                            <span>•</span>
                            <span>{formatDuration(role.fecha_activacion, role.fecha_desactivacion)}</span>
                          </div>
                          {role.motivo_desactivacion && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                              <p className="text-xs font-medium text-red-900">
                                Motivo: {role.motivo_desactivacion}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Role Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto border-2 border-[--esap-gray-200]"
              style={{ boxShadow: 'var(--esap-shadow-2xl)' }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-extrabold text-[--esap-gray-900]">Agregar Nuevo Rol</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-bold mb-3 block text-[--esap-gray-900]">
                    Selecciona el Tipo de Rol <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2.5">
                    {['Aspirante', 'Estudiante', 'Docente', 'Administrativo', 'Graduado'].map(role => {
                      const config = getRoleConfig(role);
                      const Icon = config.icon;
                      const isSelected = newRoleType === role;
                      
                      return (
                        <button
                          key={role}
                          onClick={() => setNewRoleType(role)}
                          className={`w-full flex items-center gap-4 p-4 rounded-xl border-3 transition-all transform ${
                            isSelected
                              ? `${config.bg} border-current ${config.color} shadow-lg scale-[1.02] ring-2 ring-offset-2 ${config.color.replace('text-', 'ring-')}`
                              : 'border-gray-300 hover:border-[#1e5da8] hover:bg-blue-50/30 hover:shadow-md'
                          }`}
                        >
                          <div className={`w-12 h-12 rounded-xl ${config.bg} flex items-center justify-center ${isSelected ? 'shadow-md' : ''}`}>
                            <Icon className={`w-6 h-6 ${config.color}`} strokeWidth={2.5} />
                          </div>
                          <span className={`flex-1 text-left font-bold text-[--esap-gray-900] ${isSelected ? 'text-lg' : 'text-base'}`}>{role}</span>
                          {isSelected && (
                            <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                              <Check className="w-5 h-5 text-white" strokeWidth={3} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold mb-2 block text-[--esap-gray-900]">
                    Motivo de Activación <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={newRoleReason}
                    onChange={(e) => setNewRoleReason(e.target.value)}
                    placeholder="Ejemplo: Contratación como docente de cátedra en el área de Administración Pública..."
                    className="w-full h-32 p-4 border-2 border-gray-300 rounded-xl resize-none focus:outline-none focus:border-[#1e5da8] focus:ring-2 focus:ring-[#1e5da8]/20 transition-all text-sm font-medium bg-white"
                  />
                  <div className="flex items-start gap-2 mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs font-semibold text-blue-900">
                      Este motivo quedará registrado permanentemente en la trazabilidad del usuario
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setNewRoleType('');
                      setNewRoleReason('');
                    }}
                    className="flex-1 px-5 py-3.5 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 hover:shadow-md transition-all font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAddRole}
                    disabled={!newRoleType || !newRoleReason.trim()}
                    className="flex-1 px-5 py-3.5 bg-gradient-to-r from-[#1e5da8] to-blue-600 text-white rounded-xl hover:from-[#1a4d8a] hover:to-blue-700 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:translate-y-0 transition-all font-bold"
                  >
                    ✓ Agregar Rol
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

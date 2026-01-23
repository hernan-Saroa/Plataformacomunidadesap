import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  GraduationCap, 
  BookOpen, 
  Briefcase, 
  Award, 
  UserCircle, 
  Building2, 
  FileText,
  Plus,
  Search,
  Users,
  Check,
  X,
  Calendar,
  Edit,
  Lock,
  Unlock,
  Copy,
  Trash2,
  AlertCircle,
  MoreVertical,
  ChevronDown,
  Cog,
  Eye,
  Filter,
  Scale
} from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { toast } from 'sonner@2.0.3';
import { CreateRoleModal } from './CreateRoleModal';
import { EditRoleModal } from './EditRoleModal';
import { RolePermissionsEditor } from './RolePermissionsEditor';
import { useConfirmation } from './ConfirmationModal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { PaginationPremium } from '../shared/PaginationPremium';

// ============================================================================
// TIPOS
// ============================================================================

interface SystemRole {
  id: string;
  nombre: string;
  descripcion: string;
  icono: string;
  color: string;
  tipo: 'sistema' | 'personalizado';
  usuarios_count: number;
  permisos_count: number;
  esta_activo: boolean;
  requiere_2fa: boolean;
  fecha_creacion: string;
  creado_por: string;
  ultima_modificacion?: string;
  modificado_por?: string;
}

interface RoleStats {
  total_roles: number;
  roles_sistema: number;
  usuarios_asignados: number;
  permisos_disponibles: number;
}

// ============================================================================
// DATA MOCK
// ============================================================================

const MOCK_ROLES: SystemRole[] = [
  {
    id: '1',
    nombre: 'Super Administrador',
    descripcion: 'Acceso total al sistema con todos los permisos administrativos',
    icono: 'Shield',
    color: '#dc2626',
    tipo: 'sistema',
    usuarios_count: 3,
    permisos_count: 45,
    esta_activo: true,
    requiere_2fa: true,
    fecha_creacion: '2024-01-01',
    creado_por: 'Sistema'
  },
  {
    id: '2',
    nombre: 'Estudiante',
    descripcion: 'Rol básico para estudiantes activos de la institución',
    icono: 'GraduationCap',
    color: '#003DA5',
    tipo: 'sistema',
    usuarios_count: 1247,
    permisos_count: 12,
    esta_activo: true,
    requiere_2fa: false,
    fecha_creacion: '2024-01-01',
    creado_por: 'Sistema'
  },
  {
    id: '3',
    nombre: 'Docente',
    descripcion: 'Acceso para profesores con permisos de gestión académica',
    icono: 'BookOpen',
    color: '#16a34a',
    tipo: 'sistema',
    usuarios_count: 89,
    permisos_count: 18,
    esta_activo: true,
    requiere_2fa: false,
    fecha_creacion: '2024-01-01',
    creado_por: 'Sistema'
  },
  {
    id: '4',
    nombre: 'Administrativo',
    descripcion: 'Personal administrativo con permisos de gestión operativa',
    icono: 'Briefcase',
    color: '#f97316',
    tipo: 'sistema',
    usuarios_count: 45,
    permisos_count: 28,
    esta_activo: true,
    requiere_2fa: true,
    fecha_creacion: '2024-01-01',
    creado_por: 'Sistema'
  },
  {
    id: '5',
    nombre: 'Graduado',
    descripcion: 'Ex-estudiantes graduados con acceso a servicios alumni',
    icono: 'Award',
    color: '#10b981',
    tipo: 'sistema',
    usuarios_count: 3421,
    permisos_count: 10,
    esta_activo: true,
    requiere_2fa: false,
    fecha_creacion: '2024-01-01',
    creado_por: 'Sistema'
  },
  {
    id: '6',
    nombre: 'Aspirante',
    descripcion: 'Personas en proceso de admisión a la institución',
    icono: 'UserCircle',
    color: '#9333ea',
    tipo: 'sistema',
    usuarios_count: 234,
    permisos_count: 5,
    esta_activo: true,
    requiere_2fa: false,
    fecha_creacion: '2024-01-01',
    creado_por: 'Sistema'
  },
  {
    id: '7',
    nombre: 'Coordinador Regional',
    descripcion: 'Gestión de operaciones en sedes regionales',
    icono: 'Building2',
    color: '#0891b2',
    tipo: 'personalizado',
    usuarios_count: 12,
    permisos_count: 22,
    esta_activo: true,
    requiere_2fa: true,
    fecha_creacion: '2024-03-15',
    creado_por: 'Admin Principal',
    ultima_modificacion: '2024-10-20',
    modificado_por: 'Admin Principal'
  },
  // ============ ROLES PARA CONTROL DISCIPLINARIO ============
  {
    id: 'cd-1',
    nombre: 'Profesional Especializado Disciplinario',
    descripcion: 'Profesional especializado del equipo disciplinario con capacidad de gestión completa de procesos',
    icono: 'Scale',
    color: '#dc2626',
    tipo: 'personalizado',
    usuarios_count: 5,
    permisos_count: 75,
    esta_activo: true,
    requiere_2fa: true,
    fecha_creacion: '2026-01-21',
    creado_por: 'Sistema'
  },
  {
    id: 'cd-2',
    nombre: 'Profesional Universitario Disciplinario',
    descripcion: 'Profesional universitario del equipo disciplinario con permisos de gestión operativa',
    icono: 'Scale',
    color: '#dc2626',
    tipo: 'personalizado',
    usuarios_count: 8,
    permisos_count: 60,
    esta_activo: true,
    requiere_2fa: true,
    fecha_creacion: '2026-01-21',
    creado_por: 'Sistema'
  },
  {
    id: 'cd-3',
    nombre: 'Profesional Senior Disciplinario',
    descripcion: 'Profesional senior con permisos avanzados incluyendo revisión y aprobación',
    icono: 'Scale',
    color: '#dc2626',
    tipo: 'personalizado',
    usuarios_count: 3,
    permisos_count: 85,
    esta_activo: true,
    requiere_2fa: true,
    fecha_creacion: '2026-01-21',
    creado_por: 'Sistema'
  },
  {
    id: 'cd-4',
    nombre: 'Coordinador Disciplinario',
    descripcion: 'Coordinador del equipo disciplinario con permisos ejecutivos y de supervisión',
    icono: 'Scale',
    color: '#dc2626',
    tipo: 'personalizado',
    usuarios_count: 2,
    permisos_count: 95,
    esta_activo: true,
    requiere_2fa: true,
    fecha_creacion: '2026-01-21',
    creado_por: 'Sistema'
  },
  {
    id: 'cd-5',
    nombre: 'Jefe Control Disciplinario',
    descripcion: 'Jefe de Control Disciplinario con acceso completo incluyendo configuración y administración',
    icono: 'Shield',
    color: '#7c2d12',
    tipo: 'personalizado',
    usuarios_count: 1,
    permisos_count: 95,
    esta_activo: true,
    requiere_2fa: true,
    fecha_creacion: '2026-01-21',
    creado_por: 'Sistema'
  },
  {
    id: 'cd-6',
    nombre: 'Consultor Disciplinario',
    descripcion: 'Rol de solo lectura para consulta de procesos disciplinarios sin permisos de modificación',
    icono: 'Eye',
    color: '#64748b',
    tipo: 'personalizado',
    usuarios_count: 4,
    permisos_count: 15,
    esta_activo: true,
    requiere_2fa: false,
    fecha_creacion: '2026-01-21',
    creado_por: 'Sistema'
  }
];

const MOCK_STATS: RoleStats = {
  total_roles: 12,
  roles_sistema: 10,
  usuarios_asignados: 5067,
  permisos_disponibles: 45
};

// ============================================================================
// ICONOS HELPER
// ============================================================================

const ICON_MAP: Record<string, any> = {
  Shield,
  GraduationCap,
  BookOpen,
  Briefcase,
  Award,
  UserCircle,
  Building2,
  FileText,
  Cog,
  Scale
};

const getIconComponent = (iconName: string) => {
  return ICON_MAP[iconName] || Shield;
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function RolesAdministrationModulePremium() {
  const [roles, setRoles] = useState<SystemRole[]>(MOCK_ROLES);
  const [stats, setStats] = useState<RoleStats>(MOCK_STATS);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'todos' | 'sistema' | 'personalizado'>('todos');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'activo' | 'inactivo'>('todos');
  const [filter2FA, setFilter2FA] = useState<'todos' | 'con2fa' | 'sin2fa'>('todos');
  const [selectedRole, setSelectedRole] = useState<SystemRole | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPermissionsEditorOpen, setIsPermissionsEditorOpen] = useState(false);
  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { confirm, ConfirmationDialog } = useConfirmation();

  // Filtrado de roles
  const filteredRoles = roles.filter(role => {
    const matchesSearch = role.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          role.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'todos' || role.tipo === filterType;
    const matchesStatus = filterStatus === 'todos' || 
                         (filterStatus === 'activo' && role.esta_activo) ||
                         (filterStatus === 'inactivo' && !role.esta_activo);
    const matches2FA = filter2FA === 'todos' ||
                      (filter2FA === 'con2fa' && role.requiere_2fa) ||
                      (filter2FA === 'sin2fa' && !role.requiere_2fa);
    return matchesSearch && matchesType && matchesStatus && matches2FA;
  });

  // Paginación
  const totalPages = Math.ceil(filteredRoles.length / itemsPerPage);
  const paginatedRoles = filteredRoles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Crear nuevo rol
  const handleCreateRole = (roleData: any) => {
    const newRole: SystemRole = {
      id: (roles.length + 1).toString(),
      nombre: roleData.nombre,
      descripcion: roleData.descripcion,
      icono: roleData.icono,
      color: roleData.color,
      tipo: 'personalizado',
      usuarios_count: 0,
      permisos_count: 0,
      esta_activo: true,
      requiere_2fa: roleData.requiere_2fa || false,
      fecha_creacion: new Date().toISOString(),
      creado_por: 'Usuario Actual'
    };

    setRoles([...roles, newRole]);
    setStats({
      ...stats,
      total_roles: stats.total_roles + 1
    });

    toast.success('Rol Creado', {
      description: `El rol "${roleData.nombre}" ha sido creado exitosamente`
    });

    // Abrir editor de permisos
    setSelectedRole(newRole);
    setIsPermissionsEditorOpen(true);
  };

  // Editar rol
  const handleEditRole = (roleData: any) => {
    if (!selectedRole) return;

    const updatedRoles = roles.map(role =>
      role.id === selectedRole.id
        ? {
            ...role,
            nombre: roleData.nombre,
            descripcion: roleData.descripcion,
            icono: roleData.icono,
            color: roleData.color,
            ultima_modificacion: new Date().toISOString(),
            modificado_por: 'Usuario Actual'
          }
        : role
    );

    setRoles(updatedRoles);
    toast.success('Rol Actualizado', {
      description: `Los cambios en "${roleData.nombre}" se han guardado`
    });
  };

  // Eliminar rol
  const handleDeleteRole = async (role: SystemRole) => {
    const confirmed = await confirm({
      onConfirm: () => {},
      title: '¿Eliminar rol?',
      description: `¿Estás seguro de que deseas eliminar el rol "${role.nombre}"? Esta acción afectará a ${role.usuarios_count} usuarios.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger'
    });

    if (confirmed) {
      setRoles(roles.filter(r => r.id !== role.id));
      setStats({
        ...stats,
        total_roles: stats.total_roles - 1
      });

      toast.success('Rol Eliminado', {
        description: `El rol "${role.nombre}" ha sido eliminado`
      });
    }
  };

  // Duplicar rol con confirmación
  const handleDuplicateRole = async (role: SystemRole) => {
    const confirmed = await confirm({
      onConfirm: () => {},
      title: '¿Duplicar rol?',
      description: `Se creará una copia de "${role.nombre}" con los mismos permisos. Podrás editarlo después de la duplicación.`,
      confirmText: 'Duplicar',
      cancelText: 'Cancelar',
      type: 'info'
    });

    if (confirmed) {
      const duplicatedRole: SystemRole = {
        ...role,
        id: (roles.length + 1).toString(),
        nombre: `${role.nombre} (Copia)`,
        tipo: 'personalizado',
        usuarios_count: 0,
        fecha_creacion: new Date().toISOString(),
        creado_por: 'Usuario Actual',
        ultima_modificacion: undefined,
        modificado_por: undefined
      };

      setRoles([...roles, duplicatedRole]);
      setStats({
        ...stats,
        total_roles: stats.total_roles + 1
      });

      toast.success('Rol Duplicado Exitosamente', {
        description: `Se ha creado "${duplicatedRole.nombre}" con ${role.permisos_count} permisos`
      });

      // Abrir automáticamente el editor para personalizar
      setTimeout(() => {
        setSelectedRole(duplicatedRole);
        setIsEditModalOpen(true);
      }, 500);
    }
  };

  // Toggle estado activo con validación
  const handleToggleActive = async (role: SystemRole) => {
    // Si está desactivando un rol con usuarios, pedir confirmación
    if (role.esta_activo && role.usuarios_count > 0) {
      const confirmed = await confirm({
        onConfirm: () => {},
        title: '¿Desactivar rol con usuarios asignados?',
        description: `Este rol tiene ${role.usuarios_count} usuarios asignados. Al desactivarlo, estos usuarios perderán acceso a las funcionalidades asociadas. ¿Deseas continuar?`,
        confirmText: 'Desactivar',
        cancelText: 'Cancelar',
        type: 'warning'
      });

      if (!confirmed) return;
    }

    const updatedRoles = roles.map(r =>
      r.id === role.id ? { 
        ...r, 
        esta_activo: !r.esta_activo,
        ultima_modificacion: new Date().toISOString(),
        modificado_por: 'Usuario Actual'
      } : r
    );
    setRoles(updatedRoles);

    toast.info(
      role.esta_activo ? 'Rol Desactivado' : 'Rol Activado',
      {
        description: role.esta_activo 
          ? `El rol "${role.nombre}" ha sido desactivado. Los ${role.usuarios_count} usuarios asignados no tendrán acceso.`
          : `El rol "${role.nombre}" ha sido activado y está disponible para asignación.`
      }
    );
  };

  // Toggle 2FA con validación
  const handleToggle2FA = async (role: SystemRole) => {
    // Si está desactivando 2FA en rol administrativo, advertir
    if (role.requiere_2fa && (role.nombre.toLowerCase().includes('admin') || role.nombre.toLowerCase().includes('super'))) {
      const confirmed = await confirm({
        onConfirm: () => {},
        title: '⚠️ Desactivar 2FA en rol de seguridad',
        description: `"${role.nombre}" es un rol de alto privilegio. Desactivar la autenticación de dos factores puede comprometer la seguridad del sistema. ¿Estás seguro?`,
        confirmText: 'Desactivar 2FA',
        cancelText: 'Mantener 2FA',
        type: 'danger'
      });

      if (!confirmed) return;
    }

    const updatedRoles = roles.map(r =>
      r.id === role.id ? { 
        ...r, 
        requiere_2fa: !r.requiere_2fa,
        ultima_modificacion: new Date().toISOString(),
        modificado_por: 'Usuario Actual'
      } : r
    );
    setRoles(updatedRoles);

    toast.success(
      role.requiere_2fa ? '2FA Desactivado' : '2FA Activado',
      {
        description: role.requiere_2fa 
          ? `La autenticación de dos factores para "${role.nombre}" ha sido desactivada. Los usuarios ya no necesitarán código 2FA.`
          : `La autenticación de dos factores para "${role.nombre}" ha sido activada. Los usuarios deberán configurar 2FA en su próximo login.`
      }
    );
  };

  // Gestionar permisos con preparación
  const handleManagePermissions = (role: SystemRole) => {
    setSelectedRole(role);
    setIsPermissionsEditorOpen(true);
    
    toast.info('Editor de Permisos', {
      description: `Gestionando ${role.permisos_count} permisos para "${role.nombre}"`
    });
  };

  const getRoleIcon = (role: SystemRole) => {
    const IconComponent = getIconComponent(role.icono);
    return (
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${role.color}15` }}
      >
        <IconComponent
          className="w-5 h-5"
          style={{ color: role.color }}
          strokeWidth={2.5}
        />
      </div>
    );
  };

  const getStatusBadge = (role: SystemRole) => {
    if (role.esta_activo) {
      return (
        <Badge className="bg-green-100 text-green-700 border-green-300 hover:bg-green-100">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
            Activo
          </div>
        </Badge>
      );
    }
    return (
      <Badge className="bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-100">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
          Inactivo
        </div>
      </Badge>
    );
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setFilterType('todos');
    setFilterStatus('todos');
    setFilter2FA('todos');
  };

  const hasActiveFilters = searchTerm || filterType !== 'todos' || filterStatus !== 'todos' || filter2FA !== 'todos';

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
          <h1 className="text-2xl lg:text-xl xl:text-2xl font-extrabold text-[--esap-gray-900] tracking-tight">
            Roles y Permisos
          </h1>
          <p className="text-xs lg:text-[11px] xl:text-xs text-[--esap-gray-600]">
            Administra roles del sistema y asigna permisos granulares
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#003DA5] to-[#0052cc] text-white rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all font-semibold"
        >
          <Plus className="w-5 h-5" />
          <span className="text-sm">Crear Rol</span>
        </button>
      </motion.div>

      {/* Búsqueda y Filtros Premium */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
      >
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-10 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-2">
            {/* Filtro por Tipo */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] bg-white cursor-pointer font-medium text-sm transition-all"
            >
              <option value="todos">Todos los tipos</option>
              <option value="sistema">Sistema</option>
              <option value="personalizado">Personalizado</option>
            </select>

            {/* Filtro por Estado */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] bg-white cursor-pointer font-medium text-sm transition-all"
            >
              <option value="todos">Todos los estados</option>
              <option value="activo">Activos</option>
              <option value="inactivo">Inactivos</option>
            </select>

            {/* Filtro por 2FA */}
            <select
              value={filter2FA}
              onChange={(e) => setFilter2FA(e.target.value as any)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] bg-white cursor-pointer font-medium text-sm transition-all"
            >
              <option value="todos">Todos (2FA)</option>
              <option value="con2fa">Con 2FA</option>
              <option value="sin2fa">Sin 2FA</option>
            </select>
          </div>
        </div>

        {/* Filtros activos */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
            <span className="text-xs font-semibold text-gray-500">Filtros activos:</span>
            {searchTerm && (
              <Badge variant="outline" className="gap-1">
                Búsqueda: "{searchTerm}"
                <button onClick={() => setSearchTerm('')} className="ml-1 hover:bg-gray-200 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {filterType !== 'todos' && (
              <Badge variant="outline" className="gap-1">
                Tipo: {filterType}
                <button onClick={() => setFilterType('todos')} className="ml-1 hover:bg-gray-200 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {filterStatus !== 'todos' && (
              <Badge variant="outline" className="gap-1">
                Estado: {filterStatus}
                <button onClick={() => setFilterStatus('todos')} className="ml-1 hover:bg-gray-200 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {filter2FA !== 'todos' && (
              <Badge variant="outline" className="gap-1">
                2FA: {filter2FA === 'con2fa' ? 'Con 2FA' : 'Sin 2FA'}
                <button onClick={() => setFilter2FA('todos')} className="ml-1 hover:bg-gray-200 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            <button
              onClick={clearAllFilters}
              className="text-xs font-semibold text-[#003DA5] hover:underline ml-auto"
            >
              Limpiar todos
            </button>
          </div>
        )}
      </motion.div>

      {/* Tabla Premium de Roles - Responsive */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card className="overflow-hidden">
          {/* Header de Tabla */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-black text-gray-900 text-lg">Lista de Roles</h2>
                <p className="text-xs text-gray-600 mt-0.5">
                  Mostrando {paginatedRoles.length} de {filteredRoles.length} roles
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-semibold">
                  Total: {filteredRoles.length}
                </Badge>
              </div>
            </div>
          </div>

          {/* Vista Desktop - Tabla */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">
                    Usuarios
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">
                    Permisos
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-black text-gray-700 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                <AnimatePresence mode="popLayout">
                  {paginatedRoles.map((role, index) => (
                    <>
                      <motion.tr
                        key={`role-${role.id}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                        className="hover:bg-gray-50 transition-colors cursor-pointer group"
                        onClick={() => setExpandedRoleId(expandedRoleId === role.id ? null : role.id)}
                      >
                        {/* Rol */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {getRoleIcon(role)}
                            <div>
                              <p className="font-bold text-gray-900 text-sm group-hover:text-[#003DA5] transition-colors">
                                {role.nombre}
                              </p>
                              <p className="text-xs text-gray-500 line-clamp-1">
                                {role.descripcion}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Tipo */}
                        <td className="px-6 py-4">
                          <Badge
                            variant={role.tipo === 'sistema' ? 'default' : 'secondary'}
                            className={`font-semibold text-xs ${
                              role.tipo === 'sistema'
                                ? 'bg-purple-100 text-purple-700 border-purple-300'
                                : 'bg-blue-100 text-blue-700 border-blue-300'
                            }`}
                          >
                            {role.tipo === 'sistema' ? 'Sistema' : 'Personalizado'}
                          </Badge>
                        </td>

                        {/* Usuarios */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-bold text-gray-900">
                              {role.usuarios_count.toLocaleString()}
                            </span>
                          </div>
                        </td>

                        {/* Permisos */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-bold text-gray-900">
                              {role.permisos_count}
                            </span>
                          </div>
                        </td>

                        {/* Estado */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5">
                            {getStatusBadge(role)}
                            {role.requiere_2fa && (
                              <Badge className="bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-100 text-xs">
                                <Lock className="w-3 h-3 mr-1" />
                                2FA
                              </Badge>
                            )}
                          </div>
                        </td>

                        {/* Acciones */}
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                  <MoreVertical className="w-5 h-5 text-gray-600" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => handleManagePermissions(role)}>
                                  <Shield className="w-4 h-4 mr-2" />
                                  Gestionar Permisos
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setSelectedRole(role);
                                  setIsEditModalOpen(true);
                                }}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Editar Rol
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDuplicateRole(role)}>
                                  <Copy className="w-4 h-4 mr-2" />
                                  Duplicar Rol
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleToggleActive(role)}>
                                  {role.esta_activo ? (
                                    <>
                                      <X className="w-4 h-4 mr-2" />
                                      Desactivar
                                    </>
                                  ) : (
                                    <>
                                      <Check className="w-4 h-4 mr-2" />
                                      Activar
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggle2FA(role)}>
                                  {role.requiere_2fa ? (
                                    <>
                                      <Unlock className="w-4 h-4 mr-2" />
                                      Desactivar 2FA
                                    </>
                                  ) : (
                                    <>
                                      <Lock className="w-4 h-4 mr-2" />
                                      Activar 2FA
                                    </>
                                  )}
                                </DropdownMenuItem>
                                {role.tipo === 'personalizado' && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => handleDeleteRole(role)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Eliminar Rol
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <button
                              onClick={() => setExpandedRoleId(expandedRoleId === role.id ? null : role.id)}
                              className="p-2 hover:bg-[#003DA5] hover:text-white rounded-lg transition-all"
                            >
                              <ChevronDown 
                                className={`w-5 h-5 transition-transform ${expandedRoleId === role.id ? 'rotate-180' : ''}`}
                              />
                            </button>
                          </div>
                        </td>
                      </motion.tr>

                      {/* Detalle Expandido */}
                      {expandedRoleId === role.id && (
                        <motion.tr
                          key={`role-expanded-${role.id}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <td colSpan={6} className="px-0 py-0">
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: 'auto' }}
                              exit={{ height: 0 }}
                              transition={{ duration: 0.3 }}
                              className="overflow-hidden"
                            >
                              <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-t border-b-2 border-[#003DA5]/20 p-6">
                                <div className="grid md:grid-cols-2 gap-4">
                                  {/* Información */}
                                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                                    <h4 className="font-black text-gray-900 text-sm mb-3">Información del Rol</h4>
                                    <div className="space-y-2 text-sm">
                                      <div>
                                        <span className="text-gray-600">Descripción:</span>
                                        <p className="text-gray-900 font-medium">{role.descripcion}</p>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <span className="text-gray-600 text-xs">Creado:</span>
                                          <p className="text-gray-900 font-medium text-xs">
                                            {new Date(role.fecha_creacion).toLocaleDateString('es-CO')}
                                          </p>
                                          <p className="text-gray-600 text-xs">por {role.creado_por}</p>
                                        </div>
                                        {role.ultima_modificacion && (
                                          <div>
                                            <span className="text-gray-600 text-xs">Modificado:</span>
                                            <p className="text-gray-900 font-medium text-xs">
                                              {new Date(role.ultima_modificacion).toLocaleDateString('es-CO')}
                                            </p>
                                            <p className="text-gray-600 text-xs">por {role.modificado_por}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Configuración */}
                                  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                                    <h4 className="font-black text-gray-900 text-sm mb-3">Configuración</h4>
                                    <div className="space-y-3">
                                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                        <span className="text-sm text-gray-700">Estado</span>
                                        {getStatusBadge(role)}
                                      </div>
                                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                        <span className="text-sm text-gray-700">Autenticación 2FA</span>
                                        <Badge className={role.requiere_2fa ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-gray-100 text-gray-700 border-gray-300'}>
                                          {role.requiere_2fa ? 'Activa' : 'Inactiva'}
                                        </Badge>
                                      </div>
                                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                        <span className="text-sm text-gray-700">Tipo de rol</span>
                                        <Badge className={role.tipo === 'sistema' ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-blue-100 text-blue-700 border-blue-300'}>
                                          {role.tipo === 'sistema' ? 'Sistema' : 'Personalizado'}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          </td>
                        </motion.tr>
                      )}
                    </>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Vista Mobile - Cards */}
          <div className="lg:hidden divide-y divide-gray-200">
            <AnimatePresence mode="popLayout">
              {paginatedRoles.map((role, index) => (
                <motion.div
                  key={role.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  {/* Card Header */}
                  <div className="flex items-start gap-3 mb-3">
                    {getRoleIcon(role)}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-sm">{role.nombre}</h3>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{role.descripcion}</p>
                      <div className="mt-2 flex gap-1.5">
                        <Badge variant={role.tipo === 'sistema' ? 'default' : 'secondary'} className={`text-xs ${
                          role.tipo === 'sistema'
                            ? 'bg-purple-100 text-purple-700 border-purple-300'
                            : 'bg-blue-100 text-blue-700 border-blue-300'
                        }`}>
                          {role.tipo === 'sistema' ? 'Sistema' : 'Personalizado'}
                        </Badge>
                        {getStatusBadge(role)}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0">
                          <MoreVertical className="w-5 h-5 text-gray-600" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => handleManagePermissions(role)}>
                          <Shield className="w-4 h-4 mr-2" />
                          Gestionar Permisos
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setSelectedRole(role);
                          setIsEditModalOpen(true);
                        }}>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar Rol
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicateRole(role)}>
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicar Rol
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleToggleActive(role)}>
                          {role.esta_activo ? (
                            <>
                              <X className="w-4 h-4 mr-2" />
                              Desactivar
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4 mr-2" />
                              Activar
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggle2FA(role)}>
                          {role.requiere_2fa ? (
                            <>
                              <Unlock className="w-4 h-4 mr-2" />
                              Desactivar 2FA
                            </>
                          ) : (
                            <>
                              <Lock className="w-4 h-4 mr-2" />
                              Activar 2FA
                            </>
                          )}
                        </DropdownMenuItem>
                        {role.tipo === 'personalizado' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteRole(role)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Eliminar Rol
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="font-bold text-gray-900">{role.usuarios_count.toLocaleString()}</span>
                      <span className="text-gray-500">usuarios</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-gray-400" />
                      <span className="font-bold text-gray-900">{role.permisos_count}</span>
                      <span className="text-gray-500">permisos</span>
                    </div>
                    {role.requiere_2fa && (
                      <Badge className="bg-purple-100 text-purple-700 border-purple-300">
                        <Lock className="w-3 h-3 mr-1" />
                        2FA
                      </Badge>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Empty State */}
          {filteredRoles.length === 0 && (
            <div className="py-16 px-4 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <Shield className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-2">No se encontraron roles</h3>
              <p className="text-sm text-gray-600 mb-6">
                {hasActiveFilters
                  ? 'Intenta ajustar los filtros de búsqueda'
                  : 'Aún no hay roles creados en el sistema'}
              </p>
              {hasActiveFilters ? (
                <button
                  onClick={clearAllFilters}
                  className="px-4 py-2 bg-[#003DA5] text-white rounded-lg hover:bg-[#002d7a] transition-colors font-semibold text-sm"
                >
                  Limpiar Filtros
                </button>
              ) : (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-4 py-2 bg-[#003DA5] text-white rounded-lg hover:bg-[#002d7a] transition-colors font-semibold text-sm"
                >
                  Crear Primer Rol
                </button>
              )}
            </div>
          )}

          {/* Paginación Premium */}
          {filteredRoles.length > 0 && (
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
              <PaginationPremium
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={filteredRoles.length}
              />
            </div>
          )}
        </Card>
      </motion.div>

      {/* Modals */}
      <CreateRoleModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onCreateRole={handleCreateRole}
      />

      {selectedRole && (
        <>
          <EditRoleModal
            open={isEditModalOpen}
            onOpenChange={setIsEditModalOpen}
            onEditRole={handleEditRole}
            role={selectedRole}
          />

          <RolePermissionsEditor
            open={isPermissionsEditorOpen}
            onOpenChange={setIsPermissionsEditorOpen}
            role={selectedRole}
          />
        </>
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog />
    </div>
  );
}
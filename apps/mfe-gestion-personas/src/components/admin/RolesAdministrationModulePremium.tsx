import React, { useState, useEffect } from 'react';
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
  MessageSquare,
  FolderOpen,
  BarChart3,
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
  Loader2,
  Scale,
  Monitor,
  Tablet,
  Menu,
  ShieldIcon
} from 'lucide-react';
import { Card } from '@esap-mfe/shared-ui/card';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { toast } from 'sonner';
import { Toaster } from '@esap-mfe/shared-ui/sonner';
import { ResponsiveHeader } from '@esap-mfe/shared-ui';
import { CreateRoleModal } from './CreateRoleModal';
import { EditRoleModal } from './EditRoleModal';
import { RolePermissionsEditor } from './RolePermissionsEditor';
import { ScopeConfigModal } from './ScopeConfigModal';
import { useConfirmation } from './ConfirmationModal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@esap-mfe/shared-ui/dropdown-menu';
import { PaginationPremium } from '../shared/PaginationPremium';
import { localRolesService as rolesService, type SystemRole, type RoleStats, type RoleFilters } from '../../services/api';
import { useAuth } from '../../hooks';

// ============================================================================
// TIPOS
// ============================================================================

// Usar tipos del servicio API


// ============================================================================
// ICONOS HELPER
// ============================================================================

const ICON_MAP: Record<string, any> = {
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
  Cog: Cog,
  Scale: Scale
};

const getIconComponent = (iconName: string) => {
  return ICON_MAP[iconName] || Shield;
};

const ROLE_MOJIBAKE_PATTERN = /[ÃÂâ�]|\?\?/;

const ROLE_TEXT_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bSubdirecci(?:\?\?|�)n\b/g, 'Subdirección'],
  [/\bsubdirecci(?:\?\?|�)n\b/g, 'subdirección'],
  [/\bSecretar(?:\?\?|�)a\b/g, 'Secretaría'],
  [/\bsecretar(?:\?\?|�)a\b/g, 'secretaría'],
  [/\bAcad(?:\?\?|�)mico\b/g, 'Académico'],
  [/\bacad(?:\?\?|�)mico\b/g, 'académico'],
  [/\bAcad(?:\?\?|�)mica\b/g, 'Académica'],
  [/\bacad(?:\?\?|�)mica\b/g, 'académica'],
  [/\bJur(?:\?\?|�)dica\b/g, 'Jurídica'],
  [/\bjur(?:\?\?|�)dica\b/g, 'jurídica'],
  [/\bPlaneaci(?:\?\?|�)n\b/g, 'Planeación'],
  [/\bplaneaci(?:\?\?|�)n\b/g, 'planeación'],
  [/\bVerificaci(?:\?\?|�)n\b/g, 'Verificación'],
  [/\bverificaci(?:\?\?|�)n\b/g, 'verificación'],
  [/\bT(?:\?\?|�)tulos\b/g, 'Títulos'],
  [/\bt(?:\?\?|�)tulos\b/g, 'títulos'],
  [/\bDecisi(?:\?\?|�)n\b/g, 'Decisión'],
  [/\bdecisi(?:\?\?|�)n\b/g, 'decisión'],
  [/\bC(?:\?\?|�)digo\b/g, 'Código'],
  [/\bc(?:\?\?|�)digo\b/g, 'código'],
  [/\bB(?:\?\?|�)squeda\b/g, 'Búsqueda'],
  [/\bb(?:\?\?|�)squeda\b/g, 'búsqueda'],
  [/(^|[\s([{¿¡"'`-])(?:\?\?|�)rea\b/g, '$1área'],
  [/(^|[\s([{¿¡"'`-])(?:\?\?|�)rganos\b/g, '$1órganos'],
  [/\bAcademico\b/g, 'Académico'],
  [/\bacademico\b/g, 'académico'],
  [/\bAcademica\b/g, 'Académica'],
  [/\bacademica\b/g, 'académica'],
  [/\bVerificacion\b/g, 'Verificación'],
  [/\bverificacion\b/g, 'verificación'],
  [/\bTitulos\b/g, 'Títulos'],
  [/\btitulos\b/g, 'títulos'],
  [/\bPlaneacion\b/g, 'Planeación'],
  [/\bplaneacion\b/g, 'planeación'],
  [/\bJuridica\b/g, 'Jurídica'],
  [/\bjuridica\b/g, 'jurídica'],
  [/\bSecretaria\b/g, 'Secretaría'],
  [/\bsecretaria\b/g, 'secretaría'],
  [/\bSubdireccion\b/g, 'Subdirección'],
  [/\bsubdireccion\b/g, 'subdirección'],
  [/\bDecision\b/g, 'Decisión'],
  [/\bdecision\b/g, 'decisión'],
  [/\bCodigo\b/g, 'Código'],
  [/\bcodigo\b/g, 'código'],
  [/\bBusqueda\b/g, 'Búsqueda'],
  [/\bbusqueda\b/g, 'búsqueda'],
];

const applyRoleTextCorrections = (value: string) =>
  ROLE_TEXT_REPLACEMENTS.reduce(
    (text, [pattern, fixed]) => text.replace(pattern, fixed),
    value,
  );

const repairRoleDisplayText = (value?: string | null) => {
  if (!value) return '';

  if (ROLE_MOJIBAKE_PATTERN.test(value)) {
    const isLatin1Only = Array.from(value).every((char) => char.charCodeAt(0) <= 255);
    if (isLatin1Only) {
      try {
        const bytes = Uint8Array.from(
          Array.from(value),
          (char) => char.charCodeAt(0) & 0xff,
        );
        const repaired = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
        if (!repaired.includes('\uFFFD')) return applyRoleTextCorrections(repaired);
      } catch {
        // Fall back to targeted display replacements.
      }
    }
  }

  return applyRoleTextCorrections(value);
};

const getRoleDisplayName = (role: SystemRole | null) =>
  repairRoleDisplayText(role?.name || '');

const getRoleDisplayDescription = (role: SystemRole | null) =>
  repairRoleDisplayText(role?.description || '');

const generateRoleCode = (name: string): string => {
  if (!name.trim()) return 'ROL_SIN_NOMBRE';

  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const cleaned = normalized
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  return cleaned.slice(0, 50) || 'ROL_GENERADO';
};

const getSistemaBadge = (sistemaDestino: string) => {
  const sistema = sistemaDestino || 'Backoffice';

  switch (sistema.toLowerCase()) {
    case 'backoffice':
      return (
        <Badge className="inline-flex items-center justify-center rounded-md border px-2 py-0.5 w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden [a&]:hover:bg-primary/90 bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-50 font-semibold text-[11px] gap-1">
          <Monitor className="w-3 h-3" />
          Backoffice
        </Badge>
      );
    case 'portal':
      return (
        <Badge className="inline-flex items-center justify-center rounded-md border px-2 py-0.5 w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden [a&]:hover:bg-primary/90 bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-50 font-semibold text-[11px] gap-1">
          <Tablet className="w-3 h-3" />
          Portal
        </Badge>
      );
    case 'ambos':
      return (
        <Badge className="inline-flex items-center justify-center rounded-md border px-2 py-0.5 w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden [a&]:hover:bg-primary/90 bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50 font-semibold text-[11px] gap-1">
          <Menu className="w-3 h-3" />
          Ambos
        </Badge>
      );
    default:
      return (
        <Badge className="bg-green-100 text-green-700 border-green-300 hover:bg-green-100 font-semibold text-xs">
          {sistema}
        </Badge>
      );
  }
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function RolesAdministrationModulePremium() {
  const [roles, setRoles] = useState<SystemRole[]>([]);
  const [stats, setStats] = useState<RoleStats>({
    total_roles: 0,
    roles_sistema: 0,
    usuarios_asignados: 0,
    permisos_disponibles: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'todos' | 'sistema' | 'personalizado'>('todos');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'activo' | 'inactivo'>('todos');
  const [filter2FA, setFilter2FA] = useState<'todos' | 'con2fa' | 'sin2fa'>('todos');
  const [filterSistemaDestino, setFilterSistemaDestino] = useState<'todos' | 'Backoffice' | 'Portal'>('todos');
  const [selectedRole, setSelectedRole] = useState<SystemRole | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPermissionsEditorOpen, setIsPermissionsEditorOpen] = useState(false);
  const [isScopeConfigOpen, setIsScopeConfigOpen] = useState(false);
  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 20;
  const { confirm, ConfirmationDialog } = useConfirmation();
  const { hasRole } = useAuth();
  const isSuperAdmin = hasRole('SUPER_ADMIN');

  // Normaliza el rol seleccionado para el modal de edición
  const selectedRoleForModal = selectedRole
    ? {
        id: selectedRole.id,
        nombre: getRoleDisplayName(selectedRole),
        descripcion: getRoleDisplayDescription(selectedRole),
        icono: selectedRole.icon || 'shield',
        color: selectedRole.color || '#003DA5',
        tipo: (selectedRole.type || 'personalizado') as 'sistema' | 'personalizado',
        sistema_destino: selectedRole.sistema_destino || 'Backoffice',
        requiere_2fa: selectedRole.requires_2fa || false,
        usuarios_count: selectedRole.usuarios_count || 0,
        permisos_count: selectedRole.permisos_count || 0,
        created_at: selectedRole.created_at,
        created_by: selectedRole.created_by,
      }
    : null;

    console.log("Roles cargados:", selectedRoleForModal);

  const selectedRoleForPermissions = selectedRole
    ? {
        ...selectedRole,
        name: getRoleDisplayName(selectedRole),
        description: getRoleDisplayDescription(selectedRole),
      }
    : null;

  // Cargar datos iniciales
  useEffect(() => {
    loadRoles();
    loadStats();
  }, [currentPage, searchTerm, filterType, filterStatus, filter2FA, filterSistemaDestino]);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const filters: RoleFilters = {
        search: searchTerm || undefined,
        type: filterType !== 'todos' ? filterType : undefined,
        status: filterStatus !== 'todos' ? filterStatus : undefined,
        requires_2fa: filter2FA !== 'todos' ? filter2FA : undefined,
        sistema_destino: filterSistemaDestino !== 'todos' ? filterSistemaDestino : undefined,
        page: currentPage,
        limit: itemsPerPage,
      };

      const response = await rolesService.getRoles(filters);
      setRoles(response.roles);
      setTotalItems(response.total);
      console.log("Roles cargados:", response.roles);
      console.log("Total de roles:", response.total);
    } catch (error) {
      console.error('Error loading roles:', error);
      toast.error('Error al cargar roles', {
        description: 'No se pudieron cargar los roles del sistema'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await rolesService.getStats();
      setStats(statsData);
   } catch (error) {
     console.error('Error loading stats:', error);
     toast.error('Error al cargar estadísticas', {
       description: 'No se pudieron cargar las estadísticas de roles'
     });
   }
  };

  // Los roles ya vienen paginados del backend
  const paginatedRoles = roles;

  // Cálculo de páginas totales usando el total del backend
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Resetear página si es mayor que el total de páginas disponibles
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      console.log("Resetting currentPage from", currentPage, "to 1 because totalPages is", totalPages);
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  // Crear nuevo rol
  const handleCreateRole = async (roleData: any) => {
    try {
      // Generar código automáticamente si no viene
      const roleCode = roleData.codigo || generateRoleCode(roleData.nombre);

      const newRole = await rolesService.createRole({
        name: roleData.nombre,
        description: roleData.descripcion,
        code: roleCode,
        icon: roleData.icono,
        color: roleData.color,
        type: 'personalizado',
        sistema_destino: roleData.sistema_destino,
        requires_2fa: roleData.requiere_2fa || false,
        permissionIds: roleData.permissionIds || [],
        alcance: roleData.alcance
      });

      // Recargar datos
      await loadRoles();
      await loadStats();

      toast.success('Rol Creado', {
        description: `El rol "${roleData.nombre}" ha sido creado exitosamente`
      });

      // Abrir editor de permisos
      setSelectedRole(newRole);
      setIsPermissionsEditorOpen(true);
    } catch (error: any) {
      console.error('Error creating role:', error);
      toast.error('Error al crear rol', {
        description: error.message || 'No se pudo crear el rol'
      });
    }
  };

  // Editar rol
  const handleEditRole = async (roleData: any) => {
    if (!selectedRole) return;

    try {
      const updatedRole = await rolesService.updateRole(selectedRole.id, {
        name: roleData.nombre,
        description: roleData.descripcion,
        icon: roleData.icono,
        color: roleData.color,
        sistema_destino: roleData.sistema_destino,
        requires_2fa: roleData.requiere_2fa,
        permissionIds: roleData.permissionIds
      });

      // Recargar datos
      await loadRoles();
      setSelectedRole(updatedRole);

      toast.success('Rol Actualizado', {
        description: `Los cambios en "${roleData.nombre}" se han guardado`
      });
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error('Error al actualizar rol', {
        description: error.message || 'No se pudo actualizar el rol'
      });
    }
  };

  // Actualizar alcance del rol
  const handleUpdateScope = async (roleId: string, alcanceData: any) => {
    try {
      const updatedRole = await rolesService.updateRole(roleId, {
        alcance: alcanceData
      });

      // Recargar datos
      await loadRoles();
      setSelectedRole(updatedRole);

      toast.success('Alcance Actualizado', {
        description: `El alcance administrativo del rol ha sido configurado`
      });
    } catch (error: any) {
      console.error('Error updating scope:', error);
      toast.error('Error al actualizar alcance', {
        description: error.message || 'No se pudo actualizar el alcance del rol'
      });
    }
  };

  // Eliminar rol
  const handleDeleteRole = async (role: SystemRole) => {
    const roleDisplayName = getRoleDisplayName(role);
    const confirmed = await confirm({
      onConfirm: () => {},
      title: '¿Eliminar rol?',
      description: `¿Estás seguro de que deseas eliminar el rol "${roleDisplayName}"? Esta acción afectará a ${role.usuarios_count} usuarios.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger'
    });

    if (confirmed) {
      try {
        await rolesService.deleteRole(role.id);

        // Recargar datos
        await loadRoles();
        await loadStats();

        toast.success('Rol Eliminado', {
          description: `El rol "${roleDisplayName}" ha sido eliminado`
        });
      } catch (error: any) {
        console.error('Error deleting role:', error);
        toast.error('Error al eliminar rol', {
          description: error.message || 'No se pudo eliminar el rol'
        });
      }
    }
  };

  // Duplicar rol con confirmación
  const handleDuplicateRole = async (role: SystemRole) => {
    const roleDisplayName = getRoleDisplayName(role);
  const confirmed = await confirm({
    onConfirm: () => {},
    title: '¿Duplicar rol?',
    description: `Se creará una copia de "${roleDisplayName}" con los mismos permisos. Podrás editarlo después de la duplicación.`,
    confirmText: 'Duplicar',
    cancelText: 'Cancelar',
    type: 'warning'
  });

    if (confirmed) {
      try {
        const duplicatedRole = await rolesService.duplicateRole(role.id);

        // Recargar datos
        await loadRoles();
        await loadStats();

        toast.success('Rol Duplicado Exitosamente', {
          description: `Se ha creado "${getRoleDisplayName(duplicatedRole)}" con ${role.permisos_count} permisos`
        });

        // Abrir automáticamente el editor para personalizar
        setTimeout(() => {
          setSelectedRole(duplicatedRole);
          setIsEditModalOpen(true);
        }, 500);
      } catch (error: any) {
        console.error('Error duplicating role:', error);
        toast.error('Error al duplicar rol', {
          description: error.message || 'No se pudo duplicar el rol'
        });
      }
    }
  };

  // Toggle estado activo con validación
  const handleToggleActive = async (role: SystemRole) => {
    const roleDisplayName = getRoleDisplayName(role);

    // Pedir confirmación solo para desactivar
    if (role.is_active) {
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

    try {
      await rolesService.toggleActive(role.id);

      // Recargar datos
      await loadRoles();

      toast.success(
        role.is_active ? 'Rol Desactivado' : 'Rol Activado',
        {
          description: role.is_active
            ? `El rol "${roleDisplayName}" ha sido desactivado. Los ${role.usuarios_count} usuarios asignados no tendrán acceso.`
            : `El rol "${roleDisplayName}" ha sido activado y está disponible para asignación.`
        }
      );
    } catch (error: any) {
      console.error('Error toggling role active status:', error);
      toast.error('Error al cambiar estado del rol', {
        description: error.message || 'No se pudo cambiar el estado del rol'
      });
    }
  };

  // Toggle 2FA con validación
  const handleToggle2FA = async (role: SystemRole) => {
    const roleDisplayName = getRoleDisplayName(role);
    const action = role.requires_2fa ? 'desactivar' : 'activar';
    const confirmText = role.requires_2fa ? 'Desactivar 2FA' : 'Activar 2FA';
    const cancelText = role.requires_2fa ? 'Mantener 2FA' : 'Cancelar';

  // Pedir confirmación siempre
  let confirmed = false;
  if (role.requires_2fa && (role.name.toLowerCase().includes('admin') || role.name.toLowerCase().includes('super'))) {
    confirmed = await confirm({
      onConfirm: () => {},
      title: 'Desactivar 2FA en rol de seguridad',
      description: '"' + roleDisplayName + '" es un rol de alto privilegio. Desactivar la autenticación de dos factores puede comprometer la seguridad del sistema. ¿Estás seguro?',
      confirmText: 'Desactivar 2FA',
      cancelText: 'Mantener 2FA',
      type: 'danger'
    });
  } else {
    confirmed = await confirm({
      onConfirm: () => {},
      title: `¿${action} 2FA?`,
      description: `¿Estás seguro de que deseas ${action} la autenticación de dos factores para el rol "${roleDisplayName}"?`,
      confirmText,
      cancelText,
      type: 'info'
    });
  }
  if (!confirmed) return;

    if (!confirmed) return;

    try {
      await rolesService.toggle2FA(role.id);

      // Recargar datos
      await loadRoles();

      toast.success(
        role.requires_2fa ? '2FA Desactivado' : '2FA Activado',
        {
          description: role.requires_2fa
            ? `La autenticación de dos factores para "${roleDisplayName}" ha sido desactivada. Los usuarios ya no necesitarán código 2FA.`
            : `La autenticación de dos factores para "${roleDisplayName}" ha sido activada. Los usuarios deberán configurar 2FA en su próximo login.`
        }
      );
    } catch (error: any) {
      console.error('Error toggling 2FA:', error);
      toast.error('Error al cambiar 2FA del rol', {
        description: error.message || 'No se pudo cambiar la configuración de 2FA'
      });
    }
  };

  // Gestionar permisos con preparación
  const handleManagePermissions = (role: SystemRole) => {
    setSelectedRole(role);
    setIsPermissionsEditorOpen(true);

    toast.success('Editor de Permisos', {
      description: `Gestionando ${role.permisos_count} permisos para "${getRoleDisplayName(role)}"`
    });
  };

  const getRoleIcon = (role: SystemRole) => {
    const IconComponent = getIconComponent(role.icon);
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
    if (role.is_active) {
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
    setFilterSistemaDestino('todos');
  };

  const hasActiveFilters = searchTerm || filterType !== 'todos' || filterStatus !== 'todos' || filter2FA !== 'todos' || filterSistemaDestino !== 'todos';

  const primaryAction = isSuperAdmin ? {
    label: "Crear Rol",
    icon: Plus,
    onClick: () => setIsCreateModalOpen(true),
    variant: "primary",
  } : undefined;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <ResponsiveHeader
        key="header"
        title="Roles y Permisos"
        description="Administra roles del sistema y asigna permisos granulares"
        icon={ShieldIcon}
        primaryAction={primaryAction}
      />

      {/* Búsqueda y Filtros Premium */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
      >
        <div className="space-y-4">
          {/* Búsqueda */}
          <div className="w-full">
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

            {/* Filtro por Sistema Destino */}
            <select
              value={filterSistemaDestino}
              onChange={(e) => setFilterSistemaDestino(e.target.value as any)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] bg-white cursor-pointer font-medium text-sm transition-all"
            >
              <option value="todos">Todos los sistemas</option>
              <option value="Backoffice">Backoffice</option>
              <option value="Portal">Portal</option>
            </select>
          </div>
        </div>

        {/* Filtros activos */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
            <span className="text-xs font-semibold text-gray-500">Filtros activos:</span>
            {searchTerm && (
              <Badge key="search" variant="outline" className="gap-1">
                Búsqueda: "{searchTerm}"
                <button onClick={() => setSearchTerm('')} className="ml-1 hover:bg-gray-200 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {filterType !== 'todos' && (
              <Badge key="type" variant="outline" className="gap-1">
                Tipo: {filterType}
                <button onClick={() => setFilterType('todos')} className="ml-1 hover:bg-gray-200 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {filterStatus !== 'todos' && (
              <Badge key="status" variant="outline" className="gap-1">
                Estado: {filterStatus}
                <button onClick={() => setFilterStatus('todos')} className="ml-1 hover:bg-gray-200 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {filter2FA !== 'todos' && (
              <Badge key="2fa" variant="outline" className="gap-1">
                2FA: {filter2FA === 'con2fa' ? 'Con 2FA' : 'Sin 2FA'}
                <button onClick={() => setFilter2FA('todos')} className="ml-1 hover:bg-gray-200 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {filterSistemaDestino !== 'todos' && (
              <Badge key="sistema" variant="outline" className="gap-1">
                Sistema: {filterSistemaDestino}
                <button onClick={() => setFilterSistemaDestino('todos')} className="ml-1 hover:bg-gray-200 rounded-full p-0.5">
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
                  Mostrando {paginatedRoles.length} de {totalItems} roles
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-semibold">
                  Total: {totalItems}
                </Badge>
              </div>
            </div>
          </div>

          {/* Vista Desktop - Tabla */}
          <div className="hidden lg:block overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-[#003DA5]" />
                <span className="ml-3 text-gray-600">Cargando roles...</span>
              </div>
            ) : (
              <React.Fragment>
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
                        Sistema
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
                    <AnimatePresence>
                      {paginatedRoles.map((role, index) => (
                        <React.Fragment key={`role-group-${role.id}-${index}`}>
                          <motion.tr
                            key={`role-main-row-${role.id}`}
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
                                    {getRoleDisplayName(role)}
                                  </p>
                                  <p className="text-xs text-gray-500 line-clamp-1">
                                    {getRoleDisplayDescription(role)}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Tipo */}
                            <td className="px-6 py-4">
                              <Badge
                                variant={role.type === 'sistema' ? 'default' : 'secondary'}
                                className={`font-semibold text-xs ${
                                  role.type === 'sistema'
                                    ? 'bg-purple-100 text-purple-700 border-purple-300'
                                    : 'bg-blue-100 text-blue-700 border-blue-300'
                                }`}
                              >
                                {role.type === 'sistema' ? 'Sistema' : 'Personalizado'}
                              </Badge>
                            </td>

                            {/* Sistema */}
                            <td className="px-6 py-4">
                              {getSistemaBadge(role.sistema_destino)}
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
                                  { role.code === 'SUPER_ADMIN' ? 'Todos' : role.permisos_count }
                                </span>
                              </div>
                            </td>

                            {/* Estado */}
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1.5">
                                {getStatusBadge(role)}
                                {role.requires_2fa && (
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
                                     <DropdownMenuItem key="manage-permissions" onClick={() => handleManagePermissions(role)}>
                                       <Shield className="w-4 h-4 mr-2" />
                                       Gestionar Permisos
                                     </DropdownMenuItem>
                                     <DropdownMenuItem key="configure-scope" onClick={() => {
                                        setSelectedRole(role);
                                        setIsScopeConfigOpen(true);
                                      }}>
                                        <Filter className="w-4 h-4 mr-2" />
                                        Configurar Alcance
                                      </DropdownMenuItem>
                                     <DropdownMenuItem key="edit-role" onClick={() => {
                                       setSelectedRole(role);
                                       setIsEditModalOpen(true);
                                     }}>
                                       <Edit className="w-4 h-4 mr-2" />
                                       Editar Rol
                                     </DropdownMenuItem>
                                      <DropdownMenuItem key="duplicate-role" onClick={() => handleDuplicateRole(role)} className="text-gray-900 hover:text-blue-600">
                                        <Copy className="w-4 h-4 mr-2" />
                                        Duplicar Rol
                                      </DropdownMenuItem>
                                      
                                      <DropdownMenuSeparator key="separator-1" />
                                     <DropdownMenuItem key="toggle-active" onClick={() => handleToggleActive(role)}>
                                       {role.is_active ? (
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
                                     <DropdownMenuItem key="toggle-2fa" onClick={() => handleToggle2FA(role)}>
                                       {role.requires_2fa ? (
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
                                     {/* {role.type === 'personalizado' && (
                                       <>
                                         <DropdownMenuSeparator key="separator-2" />
                                         <DropdownMenuItem
                                           key="delete-role"
                                           onClick={() => handleDeleteRole(role)}
                                           className="text-red-600"
                                         >
                                           <Trash2 className="w-4 h-4 mr-2" />
                                           Eliminar Rol
                                         </DropdownMenuItem>
                                       </>
                                     )} */}
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
                          <AnimatePresence>
                            {expandedRoleId === role.id && (
                              <motion.tr
                                key={`role-expanded-row-${role.id}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <td colSpan={7} className="px-0 py-0">
                                  <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: 'auto' }}
                                    exit={{ height: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-t border-b-2 border-[#003DA5]/20 p-6">
                                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                                        {/* Información */}
                                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                                          <h4 className="font-black text-gray-900 text-sm mb-3">Información del Rol</h4>
                                          <div className="space-y-2 text-sm">
                                            <div>
                                              <span className="text-gray-600">Descripción:</span>
                                              <p className="text-gray-900 font-medium">{getRoleDisplayDescription(role)}</p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                              <div key="created">
                                                <span className="text-gray-600 text-xs">Creado:</span>
                                                <p className="text-gray-900 font-medium text-xs">
                                                  {new Date(role.created_at).toLocaleDateString('es-CO')}
                                                </p>
                                                <p className="text-gray-600 text-xs">por {role.created_by}</p>
                                              </div>
                                              {role.updated_at && (
                                                <div key="updated">
                                                  <span className="text-gray-600 text-xs">Modificado:</span>
                                                  <p className="text-gray-900 font-medium text-xs">
                                                    {new Date(role.updated_at).toLocaleDateString('es-CO')}
                                                  </p>
                                                  <p className="text-gray-600 text-xs">por {role.updated_by}</p>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Configuración */}
                                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                                          <h4 className="font-black text-gray-900 text-sm mb-3">Configuración</h4>
                                           <div className="space-y-3">
                                             <div key="estado" className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                               <span className="text-sm text-gray-700">Estado</span>
                                               {getStatusBadge(role)}
                                             </div>
                                             <div key="sistema" className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                               <span className="text-sm text-gray-700">Sistema destino</span>
                                               {getSistemaBadge(role.sistema_destino)}
                                             </div>
                                             <div key="2fa" className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                               <span className="text-sm text-gray-700">Autenticación 2FA</span>
                                               <Badge className={role.requires_2fa ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-gray-100 text-gray-700 border-gray-300'}>
                                                 {role.requires_2fa ? 'Activa' : 'Inactiva'}
                                               </Badge>
                                             </div>
                                             <div key="tipo" className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                               <span className="text-sm text-gray-700">Tipo de rol</span>
                                               <Badge className={role.type === 'sistema' ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-blue-100 text-blue-700 border-blue-300'}>
                                                 {role.type === 'sistema' ? 'Sistema' : 'Personalizado'}
                                               </Badge>
                                             </div>

                                           </div>
                                        </div>
                                      </div>

                                      {/* Alcance Administrativo */}
                                      <div className="mt-4 bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                                        <div className="flex items-center justify-between mb-3">
                                          <h4 className="font-black text-gray-900 text-sm flex items-center gap-2">
                                            <Filter className="w-4 h-4 text-[#003DA5]" />
                                            Alcance Administrativo
                                          </h4>
                                           {(
                                             <button
                                               onClick={(e) => {
                                                 e.stopPropagation();
                                                 setSelectedRole(role);
                                                 setIsScopeConfigOpen(true);
                                               }}
                                               className="px-3 py-1.5 text-xs font-bold text-[#003DA5] border border-[#003DA5] rounded-lg hover:bg-[#003DA5] hover:text-white transition-all"
                                             >
                                               {(!role.alcance || role.alcance.tipo === 'Global') ? 'Configurar' : 'Editar Alcance'}
                                             </button>
                                           )}
                                        </div>
                                        {role.alcance ? (
                                          <div className="space-y-2">
                                            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                                              <span className="text-xs text-gray-600">Tipo:</span>
                                              <Badge className={
                                                role.alcance.tipo === 'Global'
                                                  ? 'bg-green-100 text-green-700 border-green-300'
                                                  : 'bg-blue-100 text-blue-700 border-blue-300'
                                              }>
                                                {role.alcance.tipo === 'Global' ? 'Global' : 'Filtrado'}
                                              </Badge>
                                            </div>
                                            <p className="text-xs text-gray-600 px-2">
                                              {role.alcance.tipo === 'Global'
                                                ? 'Acceso global a todas las territoriales, CETAPs y programas. No se requerirá asignar jurisdicciones manuales a los usuarios.'
                                                : 'El acceso será estrictamente delimitado por la jurisdicción asignada al usuario dentro de sus parámetros de contratación.'}
                                            </p>
                                             {role.alcance.tipo !== 'Global' && (
                                               <div className="flex flex-wrap gap-1.5 px-2">
                                                 {role.alcance.territorial && role.alcance.territorial !== 'Todas' && (
                                                   <span key="territorial" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-medium border border-emerald-200">
                                                     {role.alcance.territorial}
                                                   </span>
                                                 )}
                                                 {role.alcance.cetap && role.alcance.cetap !== 'Todos' && (
                                                   <span key="cetap" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 text-[10px] font-medium border border-orange-200">
                                                     {role.alcance.cetap}
                                                   </span>
                                                 )}
                                                 {role.alcance.programa && role.alcance.programa !== 'Todos' && (
                                                   <span key="programa" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-medium border border-purple-200">
                                                     {role.alcance.programa}
                                                   </span>
                                                 )}
                                               </div>
                                             )}
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                            <p className="text-xs text-amber-700">
                                              No configurado. Este rol tiene acceso global por defecto. Haz clic en "Configurar" para definir el alcance territorial, CETAP y programas académicos.
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </motion.div>
                                </td>
                              </motion.tr>
                            )}
                          </AnimatePresence>
                        </React.Fragment>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </React.Fragment>
            )}
          </div>

          {/* Vista Mobile - Cards */}
          <div className="lg:hidden divide-y divide-gray-200">
            <AnimatePresence>
              {paginatedRoles.map((role, index) => (
                <motion.div
                  key={`mobile-role-${role.id}-${index}`}
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
                      <h3 className="font-bold text-gray-900 text-sm">{getRoleDisplayName(role)}</h3>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{getRoleDisplayDescription(role)}</p>
                       <div className="mt-2 flex gap-1.5">
                         <Badge key="tipo-mobile" variant={role.type === 'sistema' ? 'default' : 'secondary'} className={`text-xs ${
                           role.type === 'sistema'
                             ? 'bg-purple-100 text-purple-700 border-purple-300'
                             : 'bg-blue-100 text-blue-700 border-blue-300'
                         }`}>
                           {role.type === 'sistema' ? 'Sistema' : 'Personalizado'}
                         </Badge>
                         {React.cloneElement(getStatusBadge(role), { key: 'status-mobile' })}
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
                          {role.is_active ? (
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
                          {role.requires_2fa ? (
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
                        {role.type === 'personalizado' && (
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
                     <div key="usuarios" className="flex items-center gap-1.5">
                       <Users className="w-4 h-4 text-gray-400" />
                       <span className="font-bold text-gray-900">{role.usuarios_count.toLocaleString()}</span>
                       <span className="text-gray-500">usuarios</span>
                     </div>
                     <div key="permisos" className="flex items-center gap-1.5">
                       <Shield className="w-4 h-4 text-gray-400" />
                       <span className="font-bold text-gray-900">{role.permisos_count}</span>
                       <span className="text-gray-500">permisos</span>
                     </div>
                     {role.requires_2fa && (
                       <Badge key="2fa-mobile" className="bg-purple-100 text-purple-700 border-purple-300">
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
          {paginatedRoles.length === 0 && (
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
          {totalItems > 0 && (
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
              <PaginationPremium
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={totalItems}
              />
            </div>
          )}
        </Card>
      </motion.div>

      {/* Modals */}
      <CreateRoleModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateRole}
      />

      {selectedRoleForModal && selectedRoleForPermissions && (
        <>
          <EditRoleModal
            open={isEditModalOpen}
            onOpenChange={setIsEditModalOpen}
            onEditRole={handleEditRole}
            role={selectedRoleForModal}
          />

          <RolePermissionsEditor
            open={isPermissionsEditorOpen}
            onOpenChange={setIsPermissionsEditorOpen}
            role={selectedRoleForPermissions}
            onSaved={() => {
              loadRoles();
              loadStats();
            }}
          />

          <ScopeConfigModal
            isOpen={isScopeConfigOpen}
            onClose={() => setIsScopeConfigOpen(false)}
            role={selectedRole}
            onSave={handleUpdateScope}
          />
        </>
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog />

      <Toaster position="bottom-right" richColors />
    </div>
  );
}

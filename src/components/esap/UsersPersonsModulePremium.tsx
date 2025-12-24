/**
 * MÓDULO PREMIUM: GESTIÓN DE USUARIOS (PERSONAS)
 * Alineado exactamente con PROMPT_FIGMA_COMPLETO_Modulo_Usuarios_ESAP.md
 * 
 * Especificaciones de diseño:
 * - Paleta de colores ESAP (#003DA5 primario)
 * - Tipografía Inter con pesos específicos
 * - Componentes según sistema de diseño
 * - Lógica Usuario-Persona: Una persona puede tener múltiples roles simultáneos
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  UserPlus, 
  Download, 
  Upload, 
  UserCheck, 
  UserX, 
  TrendingUp, 
  Search, 
  Filter, 
  X, 
  MoreVertical, 
  ChevronDown, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  FileText, 
  Clock, 
  Shield,
  Edit,
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle,
  XCircle,
  QrCode,  // ✅ AGREGADO para gestión de QR
  Lock,    // ✅ NUEVO - Para bloquear usuario
  Unlock,  // ✅ NUEVO - Para activar usuario
  Building2, // ✅ FIX - Para métricas por sede
  FolderOpen // ✅ CARPETA DIGITAL
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { PaginationPremium } from '../shared/PaginationPremium';
import { CreatePersonModal } from './CreatePersonModal';
import { UserEnrollmentSection } from './UserEnrollmentSection';  // ✅ NUEVO
import { EnrollmentConfigModal } from './EnrollmentConfigModal';  // ✅ MODAL CONFIGURACIÓN
import { AssignAccessModal } from './AssignAccessModal';  // ✅ MODAL ASIGNAR ACCESOS
import { AssignRolesModal } from './AssignRolesModal';  // ✅ MODAL ASIGNAR ROLES
import { EditUserModal } from './EditUserModal';  // ✅ MODAL EDITAR CON SEDES
import { DashboardSedesMetrics } from './DashboardSedesMetrics';  // ✅ DASHBOARD SEDES
import { CarpetaDigitalGlobal } from './CarpetaDigitalGlobal';  // ✅ CARPETA DIGITAL GLOBAL
import { ExportUsersBySede } from './ExportUsersBySede';  // ✅ EXPORTAR POR SEDE
import { MOCK_USERS_WITH_SEDES } from '../../data/mockUsersWithSedes';  // ✅ USUARIOS CON SEDES
import { usersService, type User, type UserFilters } from '../../services/usersService';  // ✅ SERVICIO DE USUARIOS
import { rolesService } from '../../services/api';
import type { SystemRole } from '../../services/api/roles.service';
import { BadgesSedesUsuario } from '../estructura-organizacional/BadgesSedesUsuario';  // ✅ BADGES
import { SelectorEstructuraCompacto } from '../estructura-organizacional/SelectorEstructura';  // ✅ FILTRO
import { FiltroEstructuraOrganizacional } from '../estructura-organizacional/FiltroEstructuraOrganizacional';  // ✅ FILTRO COHERENTE
import { DigitalFolderSection } from './DigitalFolderSection';  // ✅ CARPETA DIGITAL COMO SECCIÓN
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';  // ✅ TABS
import { UserExpandedView } from './UserExpandedView';  // ✅ VISTA EXPANDIDA REDISEÑADA
import { RolesYPermisosActualizado } from './RolesYPermisosActualizado';  // ✅ RF015 - ROLES Y PERMISOS ACTUALIZADO
import { EstadisticasDocentesESAP } from './EstadisticasDocentesESAP';  // ✅ ESTADÍSTICAS DOCENTES ESAP
import React, { useEffect } from 'react';

export function UsersPersonsModulePremium() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [unidadOrganizacionalFilter, setUnidadOrganizacionalFilter] = useState<string | undefined>(undefined);  // ✅ FILTRO COHERENTE CON ESTRUCTURA
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEnrollmentConfig, setShowEnrollmentConfig] = useState(false);  // ✅ NUEVO
  const [showAssignAccessModal, setShowAssignAccessModal] = useState(false);  // ✅ MODAL ASIGNAR ACCESOS
  const [showEditModal, setShowEditModal] = useState(false);  // ✅ MODAL EDITAR
  const [showAssignRolesModal, setShowAssignRolesModal] = useState(false);  // ✅ MODAL ASIGNAR ROLES
  const [showSedesMetrics, setShowSedesMetrics] = useState(false);  // ✅ DASHBOARD SEDES
  const [showExportModal, setShowExportModal] = useState(false);  // ✅ MODAL EXPORTAR
  const [viewMode, setViewMode] = useState<'users' | 'digital-folder' | 'roles-permisos' | 'estadisticas-docentes'>('users');  // ✅ NUEVO - Vista actual con RF015 + Estadísticas
  const [selectedUser, setSelectedUser] = useState<any | null>(null);  // ✅ USUARIO SELECCIONADO
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);  // ✅ ESTADO MODAL CREAR
  const [users, setUsers] = useState<User[]>([]);  // ✅ ESTADO PARA USUARIOS REALES
  const [loading, setLoading] = useState(false);  // ✅ ESTADO DE CARGA
  const [totalUsers, setTotalUsers] = useState(0);  // ✅ TOTAL DE USUARIOS
  const [totalActiveUsers, setTotalActiveUsers] = useState(0);  // ✅ TOTAL DE USUARIOS ACTIVOS
  const [totalBlockedUsers, setTotalBlockedUsers] = useState(0);  // ✅ TOTAL DE USUARIOS BLOQUEADOS
  const [availableRoles, setAvailableRoles] = useState<SystemRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesSaving, setRolesSaving] = useState(false);
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());
  const itemsPerPage = 10;

  // ✅ FUNCIÓN PARA CARGAR USUARIOS DESDE EL BACKEND
  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await usersService.getUsers({
        page: currentPage,
        limit: itemsPerPage
      });

      // Mapear usuarios de la API al formato esperado por el componente
      // El backend devuelve: { ...person, user: { id_user, roles, is_active }, seccional, sede }
      const mappedUsers = response.data.map((item: any) => ({
        id: item.user.id_user,
        id_user: item.user.id_user,
        firstName: item.first_name,
        lastName: item.last_name,
        email: item.email,
        phone: item.phone || '',
        document: item.identification_number,
        identification_number: item.identification_number,
        identificationType: item.identification_type,
        gender: item.gender || '',
        status: item.user.is_active ? 'active' : 'inactive',
        is_active: item.user.is_active,
        roles: (item.user.roles || []).map((role: any) => ({
          id: role.id,
          name: role.name,
          color: role.color,
          type: role.type,
          code: role.code
        })),
        location: item.seccional?.ubicacion || item.sede?.ubicacion || 'Sin ubicación',
        lastActivity: item.user.updated_at,
        avatar: '',
        person: {
          id: item.id,
          first_name: item.first_name,
          last_name: item.last_name,
          identification_number: item.identification_number,
          identification_type: item.identification_type,
          email: item.email,
          phone: item.phone,
          gender: item.gender
        },
        // Datos de Territorial (Seccional) y CETAP (Sede) del backend
        seccional: item.seccional,
        sede: item.sede,
        // IDs para el modal de edición
        idSeccional: item.seccional?.id || item.idSeccional || undefined,
        idSede: item.sede?.id || item.idSede || undefined,
        sedes: [], // Mantener para compatibilidad
        enrollmentMethod: 'manual' as 'qr' | 'manual' | 'massive'
      }));

      setUsers(mappedUsers);
      setTotalUsers(response.meta.total);
      setTotalActiveUsers(response.meta.totalActive);
      setTotalBlockedUsers(response.meta.totalBlocked);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      toast.error('Error al cargar usuarios', {
        description: 'No se pudieron cargar los usuarios. Usando datos de prueba.'
      });
      // En caso de error, usamos los datos mock
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ CARGAR USUARIOS AL MONTAR EL COMPONENTE
  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]); // Recargar cuando cambia la página

  // Usuarios actuales (de API o mock)
  const currentUsers = users;

  // Stats calculadas - Usar valores del backend si están disponibles, sino calcular del frontend
  const stats = {
    total: totalUsers > 0 ? totalUsers : currentUsers.length,
    active: totalActiveUsers > 0 ? totalActiveUsers : currentUsers.filter(u => u.status === 'active').length,
    blocked: totalBlockedUsers > 0 ? totalBlockedUsers : currentUsers.filter(u => u.status === 'blocked').length,
    growth: 12.5
  };

  // ✅ Stats de enrolamiento para el modal
  const enrollmentStats = {
    qr: (users.length ? users.filter(u => u.enrollmentMethod === 'qr').length : 0),
    manual: (users.length ? users.filter(u => u.enrollmentMethod === 'manual').length : 0),
    massive: (users.length ? users.filter(u => u.enrollmentMethod === 'massive').length : 0),
    total: users.length || MOCK_USERS_WITH_SEDES.length
  };

  // Filtros únicos para los selectores
  const uniqueRoles = Array.from(new Set(MOCK_USERS_WITH_SEDES.flatMap(u => u.roles.map(r => r.name))));
  const uniqueLocations = Array.from(new Set(MOCK_USERS_WITH_SEDES.map(u => u.location)));

  // Filtrado
  const filteredUsers = currentUsers.filter(user => {
    const matchesSearch = searchQuery === '' ||
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.document || user.identification_number || '').includes(searchQuery);

    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    const matchesRole = roleFilter === 'all' || user.roles.some(r => r.name === roleFilter);
    const matchesLocation = locationFilter === 'all' || user.location === locationFilter;

    // ✅ FILTRO POR UNIDAD ORGANIZACIONAL (Coherente con estructura)
    const matchesUnidadOrganizacional = !unidadOrganizacionalFilter ||
      (user.sedes && user.sedes.some(sede => sede.id === unidadOrganizacionalFilter));

    return matchesSearch && matchesStatus && matchesRole && matchesLocation && matchesUnidadOrganizacional;
  });

  // Paginación - Usar totalPages del backend cuando no hay filtros activos
  const hasActiveFilters = searchQuery !== '' || statusFilter !== 'all' || roleFilter !== 'all' || locationFilter !== 'all' || unidadOrganizacionalFilter;
  const totalPages = hasActiveFilters
    ? Math.ceil(filteredUsers.length / itemsPerPage)
    : Math.ceil(totalUsers / itemsPerPage);

  // Si hay filtros activos, paginar en frontend. Si no, los datos ya vienen paginados del backend
  const paginatedUsers = hasActiveFilters
    ? filteredUsers.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      )
    : filteredUsers;

  const displayUsers = paginatedUsers.map(user => {
    // ✅ Usar datos de seccional y sede del backend
    // Si no hay datos del backend, usar el formato anterior para compatibilidad
    const territorial = user.seccional ? {
      nombre: user.seccional.nomSeccional,
      codigo: user.seccional.codSeccional,
      departamento: user.seccional.ubicacion || user.location
    } : (user.sedes?.find((sede: any) => sede.nivel === 'territorial') ? {
      nombre: user.sedes.find((sede: any) => sede.nivel === 'territorial').nombre,
      codigo: user.sedes.find((sede: any) => sede.nivel === 'territorial').codigo,
      departamento: user.location
    } : null);

    const cetap = user.sede ? {
      nombre: user.sede.nomSede,
      codigo: user.sede.codSede,
      ciudad: user.sede.ubicacion || user.location
    } : (user.sedes?.find((sede: any) => sede.nivel === 'cetap') ? {
      nombre: user.sedes.find((sede: any) => sede.nivel === 'cetap').nombre,
      codigo: user.sedes.find((sede: any) => sede.nivel === 'cetap').codigo,
      ciudad: user.location
    } : null);

    const sedeCentral = user.sedes?.find((sede: any) => sede.nivel === 'sede-central');

    return {
      ...user,
      // Normalizar campos para compatibilidad
      firstName: user.firstName || user.person?.first_name || '',
      lastName: user.lastName || user.person?.last_name || '',
      email: user.email || user.person?.email || '',
      document: user.document || user.person?.identification_number || '',
      status: user.status || (user.is_active !== undefined ? (user.is_active ? 'active' : 'inactive') : 'active'),
      territorial,
      cetap,
      sedeCentral: sedeCentral ? {
        nombre: sedeCentral.nombre,
        codigo: sedeCentral.codigo
      } : null
    };
  });

  // Helpers
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
      active: { 
        label: 'Activo', 
        className: 'bg-[#ECFDF5] text-[#065F46] border-[#10B981]',
        icon: CheckCircle
      },
      blocked: { 
        label: 'Bloqueado', 
        className: 'bg-[#FEF2F2] text-[#991B1B] border-[#EF4444]',
        icon: XCircle
      },
      inactive: { 
        label: 'Inactivo', 
        className: 'bg-[#F3F4F6] text-[#374151] border-[#D1D5DB]',
        icon: AlertCircle
      }
    };
    
    const config = statusConfig[status] || statusConfig.inactive;
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.className} border hover:${config.className}`}>
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold">{config.label}</span>
        </div>
      </Badge>
    );
  };

  const getRoleBadge = (roleName: string, roleColor: string) => {
    const colorConfig: Record<string, string> = {
      blue: 'bg-[#EFF6FF] text-[#1E40AF] border-[#3B82F6]',
      purple: 'bg-[#EDE9FE] text-[#5B21B6] border-[#8B5CF6]',
      green: 'bg-[#D1FAE5] text-[#065F46] border-[#10B981]',
      orange: 'bg-[#FEF3C7] text-[#92400E] border-[#F59E0B]',
      red: 'bg-[#FEE2E2] text-[#991B1B] border-[#EF4444]'
    };
    
    return (
      <Badge className={`${colorConfig[roleColor] || colorConfig.blue} border text-xs font-medium`}>
        {roleName}
      </Badge>
    );
  };

  const hasSuperAdminRole = (user: any) =>
    (user.roles || []).some((role: any) => {
      return role.code === 'SUPER_ADMIN'
    });

  // ✅ FUNCIÓN HELPER PARA BADGES DE ENROLAMIENTO
  const getEnrollmentBadge = (method: 'qr' | 'manual' | 'massive') => {
    const methodConfig: Record<string, { label: string; className: string; icon: any }> = {
      qr: { 
        label: 'QR Code', 
        className: 'bg-[#EDE9FE] text-[#5B21B6] border-[#8B5CF6]',
        icon: QrCode
      },
      manual: { 
        label: 'Manual', 
        className: 'bg-[#EFF6FF] text-[#1E40AF] border-[#3B82F6]',
        icon: UserPlus
      },
      massive: { 
        label: 'Carga Masiva', 
        className: 'bg-[#D1FAE5] text-[#065F46] border-[#10B981]',
        icon: Upload
      }
    };
    
    const config = methodConfig[method];
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.className} border hover:${config.className}`}>
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold">{config.label}</span>
        </div>
      </Badge>
    );
  };

  const formatLastActivity = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  };

  const handleEdit = (user: any) => {
    setSelectedUser(user);
    setShowEditModal(true);  // ✅ Abrir modal de edición con sedes
  };

  const handleSaveEdit = async (userData: any) => {
    try {
      setLoading(true);

      // Mapear datos del formulario al formato esperado por el backend
      const updateUserData = {
        first_name: userData.firstName,
        last_name: userData.lastName,
        identification_number: userData.documentNumber || userData.document || userData.identification_number,
        identification_type: userData.documentType || userData.identificationType,
        email: userData.email,
        phone: userData.phone || '',
        gender: userData.gender || '',
        roleIds: userData.roleIds || [],
        // Agregar seccional y sede si están definidos
        idSeccional: userData.idSeccional ? Number(userData.idSeccional) : undefined,
        idSede: userData.idSede ? Number(userData.idSede) : undefined,
      };

      await usersService.updateUser(userData.id_user || userData.id, updateUserData);

      toast.success('Usuario Actualizado', {
        description: `${userData.firstName} ${userData.lastName} ha sido actualizado exitosamente.`
      });

      setShowEditModal(false);
      setSelectedUser(null);
      // Refetch users
      await loadUsers();
    } catch (error: any) {
      console.error('Error al actualizar usuario:', error);
      toast.error('Error al actualizar usuario', {
        description: error?.message || 'No se pudo actualizar el usuario. Intente nuevamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (user: any) => {
    const confirmed = window.confirm(
      `¿Estás seguro de eliminar a ${user.firstName} ${user.lastName}?\n\nEsta acción no se puede deshacer.`
    );

    if (confirmed) {
      try {
        setLoading(true);
        await usersService.deleteUser(user.id_user || user.id);

        toast.success('Usuario Eliminado', {
          description: `${user.firstName} ${user.lastName} ha sido eliminado del sistema.`
        });

        // Refetch users
        await loadUsers();
      } catch (error: any) {
        console.error('Error al eliminar usuario:', error);
        toast.error('Error al eliminar usuario', {
          description: error?.message || 'No se pudo eliminar el usuario. Intente nuevamente.'
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleViewDetails = (user: any) => {
    setExpandedUserId(expandedUserId === (user.id || user.id_user) ? null : (user.id || user.id_user));
  };

  // ✅ NUEVO: Asignar Accesos
  const handleAssignAccess = (user: any) => {
    setSelectedUser(user);
    setShowAssignAccessModal(true);
  };

  const handleAssignAccessSubmit = (userId: string, accesses: string[]) => {
    console.log('Asignando accesos:', { userId, accesses });
    // En producción: await assignUserAccess(userId, accesses); refetch();
  };

  // ✅ NUEVO: Asignar Roles
  const loadRoles = async () => {
    try {
      setRolesLoading(true);
      const response = await rolesService.getRoles({ page: 1, limit: 200 });
      setAvailableRoles(response.roles);
    } catch (error) {
      console.error('Error al cargar roles:', error);
      toast.error('Error al cargar roles', {
        description: 'No se pudieron obtener los roles del sistema'
      });
      setAvailableRoles([]);
    } finally {
      setRolesLoading(false);
    }
  };

  const handleAssignRoles = async (user: any) => {
    if (hasSuperAdminRole(user)) {
      toast.info('Acción no disponible', {
        description: 'El usuario SUPER_ADMIN no requiere asignación de roles.'
      });
      return;
    }
    setSelectedUser(user);
    setSelectedRoleIds(new Set((user.roles || []).map((role: any) => role.id)));
    setShowAssignRolesModal(true);
    await loadRoles();
  };

  const toggleRoleSelection = (roleId: string) => {
    setSelectedRoleIds(prev => {
      const next = new Set(prev);
      if (next.has(roleId)) {
        next.delete(roleId);
      } else {
        next.add(roleId);
      }
      return next;
    });
  };

  const handleSaveAssignedRoles = async () => {
    if (!selectedUser) return;
    if (selectedRoleIds.size === 0) {
      toast.error('Selecciona al menos un rol', {
        description: 'Un usuario debe tener al menos un rol asignado.'
      });
      return;
    }

    try {
      setRolesSaving(true);
      await usersService.updateUser(selectedUser.id_user || selectedUser.id, {
        roleIds: Array.from(selectedRoleIds)
      });
      toast.success('Roles asignados', {
        description: `Se actualizaron los roles de ${selectedUser.firstName} ${selectedUser.lastName}`
      });
      setShowAssignRolesModal(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (error: any) {
      console.error('Error al asignar roles:', error);
      toast.error('Error al asignar roles', {
        description: error?.message || 'No se pudieron actualizar los roles'
      });
    } finally {
      setRolesSaving(false);
    }
  };

  // ✅ NUEVO: Bloquear usuario
  const handleBlockUser = async (user: any) => {
    const confirmed = window.confirm(
      `¿Estás seguro de bloquear a ${user.firstName} ${user.lastName}?`
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      await usersService.updateUserStatus(user.id_user || user.id, false);

      toast.success('Usuario Bloqueado', {
        description: `${user.firstName} ${user.lastName} ha sido bloqueado exitosamente.`
      });

      // Refetch users
      await loadUsers();
    } catch (error: any) {
      console.error('Error al bloquear usuario:', error);
      toast.error('Error al bloquear usuario', {
        description: error?.message || 'No se pudo bloquear el usuario. Intente nuevamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ NUEVO: Activar usuario
  const handleActivateUser = async (user: any) => {
    try {
      setLoading(true);
      await usersService.updateUserStatus(user.id_user || user.id, true);

      toast.success('Usuario Activado', {
        description: `${user.firstName} ${user.lastName} ha sido activado exitosamente.`
      });

      // Refetch users
      await loadUsers();
    } catch (error: any) {
      console.error('Error al activar usuario:', error);
      toast.error('Error al activar usuario', {
        description: error?.message || 'No se pudo activar el usuario. Intente nuevamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ NUEVO: Handler para crear usuario
  const handleCreateUser = async (userData: any) => {
    try {
      setLoading(true);

      // Mapear datos del formulario al formato esperado por el backend
      const createUserData = {
        first_name: userData.firstName,
        last_name: userData.lastName,
        identification_number: userData.documentNumber || userData.document || userData.identification_number,
        identification_type: userData.documentType || userData.identificationType || 'CC',
        email: userData.email,
        phone: userData.phone || '',
        gender: userData.gender || '',
        roleIds: userData.roleIds || [],
        // Agregar seccional y sede si están definidos
        idSeccional: userData.idSeccional ? Number(userData.idSeccional) : undefined,
        idSede: userData.idSede ? Number(userData.idSede) : undefined,
      };

      const newUser = await usersService.createUser(createUserData);

      toast.success('Usuario Creado Exitosamente', {
        description: `${userData.firstName} ${userData.lastName} ha sido registrado.`
      });

      setShowCreateModal(false);
      // Refetch users
      await loadUsers();
    } catch (error: any) {
      console.error('Error al crear usuario:', error);
      toast.error('Error al crear usuario', {
        description: error?.message || 'No se pudo crear el usuario. Intente nuevamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setRoleFilter('all');
    setLocationFilter('all');
  };

  // Si estamos en la vista de carpeta digital, mostrar esa sección
  if (viewMode === 'digital-folder') {
    return (
      <DigitalFolderSection
        onBack={() => setViewMode('users')}
        initialUserId={selectedUser?.id_user || selectedUser?.id}
        users={currentUsers.map(u => ({
          id: u.id_user || u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          document: u.document || u.identification_number,
          email: u.email,
          avatar: u.avatar
        }))}
        canUpload={true}
      />
    );
  }

  // ✅ RF015 - Si estamos en la vista de Roles y Permisos
  if (viewMode === 'roles-permisos') {
    return (
      <div className="space-y-4">
        {/* Botón de Retorno */}
        <button
          onClick={() => setViewMode('users')}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          ← Volver a Gestión de Personas
        </button>
        
        {/* Componente RF015 Actualizado */}
        <RolesYPermisosActualizado />
      </div>
    );
  }

  // ✅ ESTADÍSTICAS DOCENTES ESAP - Vista detallada de los 263 docentes integrados
  if (viewMode === 'estadisticas-docentes') {
    return (
      <div className="space-y-4">
        {/* Botón de Retorno */}
        <button
          onClick={() => setViewMode('users')}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          ← Volver a Gestión de Personas
        </button>
        
        {/* Estadísticas de Docentes ESAP */}
        <EstadisticasDocentesESAP />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - Según especificaciones Figma */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)',
                boxShadow: '0 4px 12px rgba(0, 61, 165, 0.15)'
              }}
            >
              <Users className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            {/* H1: 32px Bold, line-height 40px, letter-spacing -0.25px */}
            <h1 
              className="font-bold tracking-tight"
              style={{
                fontSize: '32px',
                lineHeight: '40px',
                letterSpacing: '-0.25px',
                color: '#1F2937'
              }}
            >
              Administración
            </h1>
          </div>
          {/* Body: 14px Regular, line-height 20px */}
          <p 
            className="font-normal"
            style={{
              fontSize: '14px',
              lineHeight: '20px',
              color: '#6B7280'
            }}
          >
            Administra usuarios con sistema de roles múltiples simultáneos
          </p>
        </div>

        {/* Botones de Acción */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* ✅ Botón Exportar por Sede */}
          <button
            onClick={() => setShowExportModal(true)}
            className="inline-flex items-center justify-center gap-2 transition-all"
            style={{
              background: '#FFFFFF',
              color: '#10B981',
              border: '2px solid #10B981',
              borderRadius: '8px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ECFDF5';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#FFFFFF';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Download className="w-5 h-5" strokeWidth={2} />
            <span>Exportar por Sede</span>
          </button>

          {/* ✅ Botón Configurar Enrolamiento QR */}
          <button
            onClick={() => setShowEnrollmentConfig(true)}
            className="inline-flex items-center justify-center gap-2 transition-all"
            style={{
              background: '#FFFFFF',
              color: '#003DA5',
              border: '2px solid #003DA5',
              borderRadius: '8px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#F0F6FF';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#FFFFFF';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <QrCode className="w-5 h-5" strokeWidth={2} />
            <span>Configurar Enrolamiento</span>
          </button>

          {/* Botón Primario - Crear Usuario */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center gap-2 transition-all"
            style={{
              background: '#003DA5',
              color: '#FFFFFF',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: 500,
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#002D7A';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 61, 165, 0.15)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#003DA5';
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <UserPlus className="w-5 h-5" strokeWidth={2} />
            <span>Crear Usuario</span>
          </button>
        </div>
      </motion.div>

      {/* Stats Cards - Card Stats según especificaciones */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Card Total Usuarios */}
          <motion.div
            className="bg-white rounded-xl p-6 border border-[#E5E7EB]"
            style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}
            whileHover={{ 
              y: -2, 
              boxShadow: '0 4px 12px rgba(0, 61, 165, 0.08)',
              transition: { duration: 0.2 }
            }}
          >
            {/* Icon con background */}
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{
                background: '#F0F6FF',
                border: '1px solid #DBEAFE'
              }}
            >
              <Users 
                className="w-6 h-6" 
                strokeWidth={2.5}
                style={{ color: '#003DA5' }}
              />
            </div>
            
            {/* Number - Display: 48px Extrabold */}
            <p 
              className="font-extrabold mb-1"
              style={{
                fontSize: '48px',
                lineHeight: '56px',
                letterSpacing: '-0.5px',
                color: '#1F2937'
              }}
            >
              {stats.total}
            </p>
            
            {/* Label: 14px Regular */}
            <p 
              className="font-normal"
              style={{
                fontSize: '14px',
                lineHeight: '20px',
                color: '#6B7280'
              }}
            >
              Total Usuarios
            </p>
          </motion.div>

          {/* Card Activos */}
          <motion.div
            className="bg-white rounded-xl p-6 border border-[#E5E7EB]"
            style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}
            whileHover={{ 
              y: -2, 
              boxShadow: '0 4px 12px rgba(0, 61, 165, 0.08)',
              transition: { duration: 0.2 }
            }}
          >
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{
                background: '#ECFDF5',
                border: '1px solid #D1FAE5'
              }}
            >
              <UserCheck 
                className="w-6 h-6" 
                strokeWidth={2.5}
                style={{ color: '#10B981' }}
              />
            </div>
            <p 
              className="font-extrabold mb-1"
              style={{
                fontSize: '48px',
                lineHeight: '56px',
                letterSpacing: '-0.5px',
                color: '#1F2937'
              }}
            >
              {stats.active}
            </p>
            <p 
              className="font-normal"
              style={{
                fontSize: '14px',
                lineHeight: '20px',
                color: '#6B7280'
              }}
            >
              Usuarios Activos
            </p>
          </motion.div>

          {/* Card Bloqueados */}
          <motion.div
            className="bg-white rounded-xl p-6 border border-[#E5E7EB]"
            style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}
            whileHover={{ 
              y: -2, 
              boxShadow: '0 4px 12px rgba(0, 61, 165, 0.08)',
              transition: { duration: 0.2 }
            }}
          >
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{
                background: '#FEF2F2',
                border: '1px solid #FEE2E2'
              }}
            >
              <UserX 
                className="w-6 h-6" 
                strokeWidth={2.5}
                style={{ color: '#EF4444' }}
              />
            </div>
            <p 
              className="font-extrabold mb-1"
              style={{
                fontSize: '48px',
                lineHeight: '56px',
                letterSpacing: '-0.5px',
                color: '#1F2937'
              }}
            >
              {stats.blocked}
            </p>
            <p 
              className="font-normal"
              style={{
                fontSize: '14px',
                lineHeight: '20px',
                color: '#6B7280'
              }}
            >
              Bloqueados
            </p>
          </motion.div>

          {/* Card Crecimiento */}
          <motion.div
            className="bg-white rounded-xl p-6 border border-[#E5E7EB]"
            style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}
            whileHover={{ 
              y: -2, 
              boxShadow: '0 4px 12px rgba(0, 61, 165, 0.08)',
              transition: { duration: 0.2 }
            }}
          >
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{
                background: '#FEF3C7',
                border: '1px solid #FDE68A'
              }}
            >
              <TrendingUp 
                className="w-6 h-6" 
                strokeWidth={2.5}
                style={{ color: '#F59E0B' }}
              />
            </div>
            <p 
              className="font-extrabold mb-1"
              style={{
                fontSize: '48px',
                lineHeight: '56px',
                letterSpacing: '-0.5px',
                color: '#1F2937'
              }}
            >
              +{stats.growth}%
            </p>
            <p 
              className="font-normal"
              style={{
                fontSize: '14px',
                lineHeight: '20px',
                color: '#6B7280'
              }}
            >
              Crecimiento
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* ✅ Carpeta Digital Global - Todos los Usuarios */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.12 }}
      >
        <button
          onClick={() => setShowSedesMetrics(!showSedesMetrics)}
          className="w-full bg-white rounded-xl border border-[#E5E7EB] p-4 mb-4 hover:bg-gray-50 transition-colors flex items-center justify-between"
          style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}
        >
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-[--esap-primary]" />
            <span className="font-semibold text-gray-900">
              Carpeta Digital
            </span>
            <Badge variant="outline" className="ml-2">
              {filteredUsers.length} usuarios
            </Badge>
          </div>
          <ChevronDown 
            className={`w-5 h-5 text-gray-500 transition-transform ${showSedesMetrics ? 'rotate-180' : ''}`}
          />
        </button>

        {showSedesMetrics && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4"
          >
            <CarpetaDigitalGlobal usuarios={filteredUsers} />
          </motion.div>
        )}
      </motion.div>

      {/* Búsqueda y Filtros - Input estándar según especificaciones */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="bg-white rounded-xl border border-[#E5E7EB] p-4"
        style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}
      >
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Input búsqueda */}
          <div className="flex-1">
            <div className="relative">
              <Search 
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
                style={{ color: '#9CA3AF' }}
              />
              <input
                type="text"
                placeholder="Buscar por nombre, correo o documento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border-2 rounded-lg transition-all"
                style={{
                  paddingLeft: '48px',
                  paddingRight: searchQuery ? '48px' : '16px',
                  paddingTop: '12px',
                  paddingBottom: '12px',
                  fontSize: '14px',
                  lineHeight: '20px',
                  color: '#1F2937',
                  borderColor: '#D1D5DB',
                  height: '44px',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#003DA5';
                  e.target.style.boxShadow = '0 0 0 3px rgba(0, 61, 165, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#D1D5DB';
                  e.target.style.boxShadow = 'none';
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-[#F9FAFB] rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                </button>
              )}
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 border-2 border-[#D1D5DB] rounded-lg bg-white cursor-pointer font-medium text-sm transition-all"
              style={{ height: '44px' }}
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="blocked">Bloqueados</option>
              <option value="inactive">Inactivos</option>
            </select>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-3 border-2 border-[#D1D5DB] rounded-lg bg-white cursor-pointer font-medium text-sm transition-all"
              style={{ height: '44px' }}
            >
              <option value="all">Todos los roles</option>
              {uniqueRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>

            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="px-4 py-3 border-2 border-[#D1D5DB] rounded-lg bg-white cursor-pointer font-medium text-sm transition-all"
              style={{ height: '44px' }}
            >
              <option value="all">Todas las ubicaciones</option>
              {uniqueLocations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>

            {/* ✅ FILTRO DE UNIDAD ORGANIZACIONAL */}
            <div style={{ minWidth: '280px' }}>
              <FiltroEstructuraOrganizacional
                value={unidadOrganizacionalFilter}
                onChange={setUnidadOrganizacionalFilter}
                placeholder="Todas las unidades"
                showClearButton={true}
              />
            </div>
          </div>
        </div>

        {/* Chips de filtros activos */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#E5E7EB]">
            <span className="text-xs font-semibold" style={{ color: '#6B7280' }}>
              Filtros activos:
            </span>
            {searchQuery && (
              <Badge variant="outline" className="gap-1">
                Búsqueda: "{searchQuery}"
                <button onClick={() => setSearchQuery('')} className="ml-1 hover:bg-gray-200 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {statusFilter !== 'all' && (
              <Badge variant="outline" className="gap-1">
                Estado: {statusFilter}
                <button onClick={() => setStatusFilter('all')} className="ml-1 hover:bg-gray-200 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {roleFilter !== 'all' && (
              <Badge variant="outline" className="gap-1">
                Rol: {roleFilter}
                <button onClick={() => setRoleFilter('all')} className="ml-1 hover:bg-gray-200 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {locationFilter !== 'all' && (
              <Badge variant="outline" className="gap-1">
                Ubicación: {locationFilter}
                <button onClick={() => setLocationFilter('all')} className="ml-1 hover:bg-gray-200 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            <button
              onClick={clearAllFilters}
              className="text-xs font-semibold hover:underline ml-auto"
              style={{ color: '#003DA5' }}
            >
              Limpiar todos
            </button>
          </div>
        )}
      </motion.div>

      {/* Tabla Premium - Según especificaciones de Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card className="overflow-hidden relative">
          {/* Header de tabla */}
          <div
            className="border-b px-6 py-4"
            style={{
              background: '#F9FAFB',
              borderBottom: '2px solid #E5E7EB'
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2
                  className="font-bold"
                  style={{
                    fontSize: '18px',
                    lineHeight: '24px',
                    color: '#1F2937'
                  }}
                >
                  Lista de Usuarios
                </h2>
                <p
                  className="mt-0.5"
                  style={{
                    fontSize: '12px',
                    lineHeight: '16px',
                    color: '#6B7280'
                  }}
                >
                  {loading ? 'Cargando usuarios...' : `Mostrando ${displayUsers.length} de ${totalUsers} usuarios`}
                </p>
              </div>
              <Badge variant="outline" className="font-semibold">
                Total: {totalUsers}
              </Badge>
            </div>
          </div>

          {/* Indicador de carga */}
          {loading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003DA5]"></div>
                <p className="text-sm font-medium text-gray-600">Cargando usuarios...</p>
              </div>
            </div>
          )}

          {/* Vista Desktop - Table según especificaciones */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: '800px' }}>
              <thead 
                style={{
                  background: '#F9FAFB',
                  borderBottom: '2px solid #E5E7EB',
                  position: 'sticky',
                  top: 0,
                  zIndex: 10
                }}
              >
                <tr>
                  <th 
                    className="text-left font-semibold uppercase"
                    style={{
                      padding: '12px 16px',
                      fontSize: '12px',
                      lineHeight: '16px',
                      color: '#6B7280',
                      letterSpacing: '0.5px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Usuario
                  </th>
                  <th 
                    className="text-left font-semibold uppercase"
                    style={{
                      padding: '12px 16px',
                      fontSize: '12px',
                      lineHeight: '16px',
                      color: '#6B7280',
                      letterSpacing: '0.5px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Roles
                  </th>
                  <th 
                    className="text-left font-semibold uppercase"
                    style={{
                      padding: '12px 16px',
                      fontSize: '12px',
                      lineHeight: '16px',
                      color: '#6B7280',
                      letterSpacing: '0.5px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Territorial
                  </th>
                  <th 
                    className="text-left font-semibold uppercase"
                    style={{
                      padding: '12px 16px',
                      fontSize: '12px',
                      lineHeight: '16px',
                      color: '#6B7280',
                      letterSpacing: '0.5px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    CETAP
                  </th>
                  <th 
                    className="text-center font-semibold uppercase"
                    style={{
                      padding: '12px 16px',
                      fontSize: '12px',
                      lineHeight: '16px',
                      color: '#6B7280',
                      letterSpacing: '0.5px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Carpeta Digital
                  </th>
                  <th 
                    className="text-left font-semibold uppercase"
                    style={{
                      padding: '12px 16px',
                      fontSize: '12px',
                      lineHeight: '16px',
                      color: '#6B7280',
                      letterSpacing: '0.5px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Estado
                  </th>
                  <th 
                    className="text-left font-semibold uppercase"
                    style={{
                      padding: '12px 16px',
                      fontSize: '12px',
                      lineHeight: '16px',
                      color: '#6B7280',
                      letterSpacing: '0.5px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Última Actividad
                  </th>
                  <th 
                    className="text-right font-semibold uppercase"
                    style={{
                      padding: '12px 16px',
                      fontSize: '12px',
                      lineHeight: '16px',
                      color: '#6B7280',
                      letterSpacing: '0.5px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody style={{ background: '#FFFFFF' }}>
                <AnimatePresence mode="popLayout">
                  {displayUsers.map((user, index) => (
                    <React.Fragment key={user.id}>
                      <motion.tr
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="group cursor-pointer"
                        style={{
                          borderBottom: '1px solid #E5E7EB',
                          transition: 'background 150ms ease'
                        }}
                        onClick={() => handleViewDetails(user)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#F9FAFB';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#FFFFFF';
                        }}
                      >
                        {/* Celda Usuario */}
                        <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10 flex-shrink-0">
                              <AvatarFallback 
                                className="font-semibold"
                                style={{
                                  background: '#E0EDFF',
                                  color: '#003DA5'
                                }}
                              >
                                {user.firstName[0]}{user.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p 
                                className="font-semibold group-hover:text-[#003DA5] transition-colors"
                                style={{
                                  fontSize: '14px',
                                  lineHeight: '20px',
                                  color: '#1F2937'
                                }}
                              >
                                {user.firstName} {user.lastName}
                              </p>
                              <p 
                                style={{
                                  fontSize: '12px',
                                  lineHeight: '16px',
                                  color: '#6B7280'
                                }}
                              >
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Celda Roles - Mostrar todos los roles simultáneos */}
                        <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                          <div className="flex flex-wrap gap-1.5">
                            {user.roles.map((role, idx) => (
                              <div key={idx}>
                                {getRoleBadge(role.name, role.color)}
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* ✅ Celda Territorial */}
                        <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                          {user.territorial ? (
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-green-600" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {user.territorial.nombre}
                                </p>
                                {user.territorial.departamento && (
                                  <p className="text-xs text-gray-500">
                                    {user.territorial.departamento}
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">Sin territorial</span>
                          )}
                        </td>

                        {/* ✅ Celda CETAP */}
                        <td style={{ padding: '16px', verticalAlign: 'middle' }} onClick={(e) => e.stopPropagation()}>
                          {user.cetap ? (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-orange-600" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {user.cetap.nombre}
                                </p>
                                {user.cetap.ciudad && (
                                  <p className="text-xs text-gray-500">
                                    {user.cetap.ciudad}
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : user.sedeCentral ? (
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-blue-600" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  Sede Central
                                </p>
                                <p className="text-xs text-gray-500">
                                  Bogotá D.C.
                                </p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">Sin CETAP</span>
                          )}
                        </td>

                        {/* ✅ Celda Carpeta Digital */}
                        <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUser(user);
                                setViewMode('digital-folder');
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all hover:shadow-md"
                              style={{
                                background: 'linear-gradient(135deg, #E0EDFF 0%, #F0F6FF 100%)',
                                border: '1px solid #DBEAFE'
                              }}
                            >
                              <FolderOpen className="w-4 h-4" style={{ color: '#003DA5' }} />
                              <span className="font-bold text-sm" style={{ color: '#003DA5' }}>
                                {Math.floor(Math.random() * 15) + 5}
                              </span>
                            </button>
                          </div>
                        </td>

                        {/* Celda Estado */}
                        <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                          {getStatusBadge(user.status)}
                        </td>

                        {/* Celda Última Actividad */}
                        <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                            <span 
                              style={{
                                fontSize: '14px',
                                lineHeight: '20px',
                                color: '#4B5563'
                              }}
                            >
                              {formatLastActivity(user.lastActivity)}
                            </span>
                          </div>
                        </td>

                        {/* Celda Acciones */}
                        <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button 
                                  className="p-2 rounded-lg transition-colors"
                                  style={{ 
                                    border: '1px solid #E5E7EB',
                                    background: '#FFFFFF'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#F9FAFB';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '#FFFFFF';
                                  }}
                                >
                                  <MoreVertical className="w-5 h-5" style={{ color: '#6B7280' }} />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuItem onClick={() => handleViewDetails(user)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  Ver Detalles
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setViewMode('digital-folder');
                                  }}
                                  className="bg-blue-50 hover:bg-blue-100"
                                  style={{ color: '#003DA5' }}
                                >
                                  <FolderOpen className="w-4 h-4 mr-2" />
                                  Ver Carpeta Digital
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleEdit(user)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Editar Usuario
                                </DropdownMenuItem>
                                {!hasSuperAdminRole(user) && (
                                  <DropdownMenuItem
                                    onClick={() => handleAssignRoles(user)}
                                    className="bg-blue-50 hover:bg-blue-100"
                                    style={{ color: '#003DA5' }}
                                  >
                                    <Users className="w-4 h-4 mr-2" />
                                    Asignar Roles
                                  </DropdownMenuItem>
                                )}
                                {/* <DropdownMenuItem
                                  onClick={() => handleAssignAccess(user)}
                                  className="bg-amber-50 hover:bg-amber-100"
                                  style={{ color: '#D97706' }}
                                >
                                  <Shield className="w-4 h-4 mr-2" />
                                  Asignar Accesos
                                </DropdownMenuItem> */}
                                <DropdownMenuSeparator />
                                {user.status === 'active' || user.is_active ? (
                                  <DropdownMenuItem
                                    onClick={() => handleBlockUser(user)}
                                    style={{ color: '#F59E0B' }}
                                  >
                                    <Lock className="w-4 h-4 mr-2" />
                                    Bloquear Usuario
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => handleActivateUser(user)}
                                    className="bg-green-50 hover:bg-green-100"
                                    style={{ color: '#10B981' }}
                                  >
                                    <Unlock className="w-4 h-4 mr-2" />
                                    Activar Usuario
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDelete(user)}
                                  style={{ color: '#EF4444' }}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            
                            <button
                              onClick={() => handleViewDetails(user)}
                              className="p-2 rounded-lg transition-all"
                              style={{
                                border: '1px solid #E5E7EB',
                                background: '#FFFFFF'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#003DA5';
                                const icon = e.currentTarget.querySelector('svg');
                                if (icon) (icon as SVGElement).style.color = '#FFFFFF';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#FFFFFF';
                                const icon = e.currentTarget.querySelector('svg');
                                if (icon) (icon as SVGElement).style.color = '#6B7280';
                              }}
                            >
                              <ChevronDown 
                                className={`w-5 h-5 transition-transform ${expandedUserId === user.id ? 'rotate-180' : ''}`}
                                style={{ color: '#6B7280' }}
                              />
                            </button>
                          </div>
                        </td>
                      </motion.tr>

                      {/* Fila expandida - Detalles del usuario - REDISEÑADA */}
                      {expandedUserId === user.id && (
                        <motion.tr
                          key={`${user.id}-expanded`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <td colSpan={8} className="p-0">
                            <UserExpandedView
                              user={user}
                              getStatusBadge={getStatusBadge}
                              getRoleBadge={getRoleBadge}
                              onOpenDigitalFolder={() => {
                                setSelectedUser(user);
                                setViewMode('digital-folder');
                              }}
                            />
                          </td>
                        </motion.tr>
                      )}
                    </React.Fragment>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Vista Mobile - Cards */}
          <div className="lg:hidden divide-y" style={{ borderColor: '#E5E7EB' }}>
            <AnimatePresence mode="popLayout">
              {displayUsers.map((user, index) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4"
                  style={{
                    background: '#FFFFFF',
                    transition: 'background 150ms ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#F9FAFB';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#FFFFFF';
                  }}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar className="w-10 h-10 flex-shrink-0">
                        <AvatarFallback 
                          className="font-semibold"
                          style={{
                            background: '#E0EDFF',
                            color: '#003DA5'
                          }}
                        >
                          {user.firstName[0]}{user.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 
                          className="font-semibold"
                          style={{
                            fontSize: '14px',
                            lineHeight: '20px',
                            color: '#1F2937'
                          }}
                        >
                          {user.firstName} {user.lastName}
                        </h3>
                        <p 
                          style={{
                            fontSize: '12px',
                            lineHeight: '16px',
                            color: '#6B7280'
                          }}
                        >
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(user.status)}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button 
                            className="p-2 rounded-lg transition-colors"
                            style={{ 
                              border: '1px solid #E5E7EB',
                              background: '#FFFFFF'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#F9FAFB';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#FFFFFF';
                            }}
                          >
                            <MoreVertical className="w-4 h-4" style={{ color: '#6B7280' }} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuItem onClick={() => handleViewDetails(user)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Detalles
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedUser(user);
                              setViewMode('digital-folder');
                            }}
                            className="bg-blue-50 hover:bg-blue-100"
                            style={{ color: '#003DA5' }}
                          >
                            <FolderOpen className="w-4 h-4 mr-2" />
                            Ver Carpeta Digital
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleEdit(user)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar Usuario
                          </DropdownMenuItem>
                          {!hasSuperAdminRole(user) && (
                            <DropdownMenuItem
                              onClick={() => handleAssignRoles(user)}
                              className="bg-blue-50 hover:bg-blue-100"
                              style={{ color: '#003DA5' }}
                            >
                              <Users className="w-4 h-4 mr-2" />
                              Asignar Roles
                            </DropdownMenuItem>
                          )}
                          {/* <DropdownMenuItem
                            onClick={() => handleAssignAccess(user)}
                            className="bg-amber-50 hover:bg-amber-100"
                            style={{ color: '#D97706' }}
                          >
                            <Shield className="w-4 h-4 mr-2" />
                            Asignar Accesos
                          </DropdownMenuItem> */}
                          <DropdownMenuSeparator />
                          {user.status === 'active' || user.is_active ? (
                            <DropdownMenuItem
                              onClick={() => handleBlockUser(user)}
                              style={{ color: '#F59E0B' }}
                            >
                              <Lock className="w-4 h-4 mr-2" />
                              Bloquear Usuario
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleActivateUser(user)}
                              className="bg-green-50 hover:bg-green-100"
                              style={{ color: '#10B981' }}
                            >
                              <Unlock className="w-4 h-4 mr-2" />
                              Activar Usuario
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(user)}
                            style={{ color: '#EF4444' }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {user.roles.map((role, idx) => (
                      <div key={idx}>
                        {getRoleBadge(role.name, role.color)}
                      </div>
                    ))}
                  </div>
                  
                  {/* ✅ Información Territorial y CETAP en Mobile */}
                  <div className="flex flex-col gap-1.5 mb-2">
                    {user.territorial && (
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Building2 className="w-3.5 h-3.5 text-green-600" />
                        <span className="font-medium">{user.territorial.nombre}</span>
                      </div>
                    )}
                    {user.cetap && (
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <MapPin className="w-3.5 h-3.5 text-orange-600" />
                        <span className="font-medium">{user.cetap.nombre}</span>
                      </div>
                    )}
                    {user.sedeCentral && !user.territorial && !user.cetap && (
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Building2 className="w-3.5 h-3.5 text-blue-600" />
                        <span className="font-medium">Sede Central - Bogotá D.C.</span>
                      </div>
                    )}
                  </div>
                  
                  <div 
                    className="flex items-center gap-2"
                    style={{
                      fontSize: '12px',
                      lineHeight: '16px',
                      color: '#6B7280'
                    }}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    {formatLastActivity(user.lastActivity)}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Empty State */}
          {filteredUsers.length === 0 && (
            <div className="py-16 px-4 text-center">
              <div 
                className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{ background: '#F3F4F6' }}
              >
                <Users className="w-8 h-8" style={{ color: '#9CA3AF' }} />
              </div>
              <h3 
                className="font-bold mb-2"
                style={{
                  fontSize: '18px',
                  lineHeight: '24px',
                  color: '#1F2937'
                }}
              >
                No se encontraron usuarios
              </h3>
              <p 
                className="mb-6"
                style={{
                  fontSize: '14px',
                  lineHeight: '20px',
                  color: '#6B7280'
                }}
              >
                {hasActiveFilters ? 'Intenta ajustar los filtros de búsqueda' : 'Aún no hay usuarios registrados'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="px-4 py-2 rounded-lg font-semibold text-sm transition-all"
                  style={{
                    background: '#003DA5',
                    color: '#FFFFFF'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#002D7A';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#003DA5';
                  }}
                >
                  Limpiar Filtros
                </button>
              )}
            </div>
          )}

          {/* Paginación */}
          {filteredUsers.length > 0 && (
            <div 
              className="px-6 py-4"
              style={{
                borderTop: '1px solid #E5E7EB',
                background: '#F9FAFB'
              }}
            >
              <PaginationPremium
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={totalUsers}
              />
            </div>
          )}
        </Card>
      </motion.div>

      {/* Modal Crear Usuario */}
      <CreatePersonModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateUser}
      />

      {/* Modal Editar Usuario */}
      <CreatePersonModal 
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedUser(null);
        }}
        onCreate={handleCreateUser}
        editMode={true}
        initialData={selectedUser}
      />

      {/* Modal Asignar Accesos */}
      {showAssignAccessModal && selectedUser && (
        <AssignAccessModal
          isOpen={showAssignAccessModal}
          onClose={() => {
            setShowAssignAccessModal(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
          onAssign={handleAssignAccessSubmit}
        />
      )}

      {/* ✅ Modal Editar Usuario con Sedes */}
      {showEditModal && selectedUser && (
        <EditUserModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
          onSave={handleSaveEdit}
        />
      )}

      {/* ✅ Modal Asignar Roles */}
      {showAssignRolesModal && selectedUser && (
        <AssignRolesModal
          isOpen={showAssignRolesModal}
          onClose={() => {
            setShowAssignRolesModal(false);
            setSelectedUser(null);
            setSelectedRoleIds(new Set());
          }}
          user={selectedUser}
          roles={availableRoles}
          selectedRoleIds={selectedRoleIds}
          onToggleRole={toggleRoleSelection}
          onSave={handleSaveAssignedRoles}
          loading={rolesLoading}
          saving={rolesSaving}
        />
      )}

      {/* ✅ Modal Exportar Usuarios por Sede */}
      <ExportUsersBySede
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        usuarios={filteredUsers}
      />

      {/* Modal Configuración de Enrolamiento */}
      {showEnrollmentConfig && (
        <EnrollmentConfigModal
          onClose={() => setShowEnrollmentConfig(false)}
          enrollmentStats={enrollmentStats}
        />
      )}

    </div>
  );
}

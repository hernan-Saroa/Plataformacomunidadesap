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

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  UserPlus,
  Download,
  Upload,
  Search,
  X,
  MoreVertical,
  ChevronDown,
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
  Lock, // ✅ NUEVO - Para bloquear usuario
  Unlock, // ✅ NUEVO - Para activar usuario
  Building2, // ✅ FIX - Para métricas por sede
  FolderOpen, // ✅ CARPETA DIGITAL
  GraduationCap,
  BookOpen,
  Briefcase,
  Award,
  UserCircle,
  MessageSquare,
  BarChart3,
  Cog,
  Scale,
  QrCode,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  KeyRound, // Para forzar restablecimiento de contraseña
  Mail // Para correo de restablecimiento
} from 'lucide-react';
import { Card, Badge, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, Avatar, AvatarFallback, AvatarImage, Container4K, ResponsiveHeader } from '@esap-mfe/shared-ui';
import { toast } from 'sonner';
import { Toaster } from '@esap-mfe/shared-ui/sonner';
import { PaginationPremium } from '../shared/PaginationPremium';
import { CreatePersonModal } from './CreatePersonModal';
import { AssignAccessModal } from './AssignAccessModal';  
import { AssignRolesModal } from './AssignRolesModal';  
import { EditUserModal } from './EditUserModal';  
import { ExportUsersBySede } from './ExportUsersBySede';  
import { MOCK_USERS_WITH_SEDES } from '../../data/mockUsersWithSedes';  
import { usersService, type User, type UserFilters } from '../../services/usersService';  
import { rolesService } from '../../services/api/roles.service';
import type { SystemRole } from '../../services/api/roles.service';
import { FiltroEstructuraOrganizacional } from '../estructura-organizacional/FiltroEstructuraOrganizacional';  
import { DigitalFolderSection } from './DigitalFolderSection';  
import { UserExpandedView } from './UserExpandedView';  
import { RolesYPermisosActualizado } from './RolesYPermisosActualizado';  
import { EstadisticasDocentesESAP } from './EstadisticasDocentesESAP';  
import React, { useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../hooks';
import { ModalCambiarContrasena } from "./ModalCambiarContrasena"; 
import { estructuraService } from '../../services/estructuraService';
import { PasswordHistoryModal } from './PasswordHistoryModal';
import { useTableColumns, ColumnSelector } from '../../hooks/useTableColumns';
import type { ColumnDefinition } from '../../hooks/useTableColumns';

const ICON_MAP: Record<string, any> = {
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
  Scale
};

const getIconComponent = (iconName: string) => {
  return ICON_MAP[iconName] || Shield;
};

// ✅ DÍA 4: Container4K para padding adaptativo
// ✅ DÍA 5: ResponsiveHeader para headers adaptativos

const PERSONAS_COLUMNS: ColumnDefinition[] = [
  { key: 'roles', label: 'Roles', default: true },
  { key: 'territorial', label: 'Territorial', default: true },
  { key: 'cetap', label: 'CETAP', default: true },
  { key: 'carpeta', label: 'Carpeta Digital', default: false },
  { key: 'estado', label: 'Estado', default: true },
  { key: 'actividad', label: 'Última Actividad', default: false },
];

export function UsersPersonsModulePremium() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] =
    useState<string>("all");
  const [
    unidadOrganizacionalFilter,
    setUnidadOrganizacionalFilter,
  ] = useState<string | undefined>(undefined); // ✅ FILTRO COHERENTE CON ESTRUCTURA
  const [sortField, setSortField] = useState<string | undefined>('usuario');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>('asc');

  const [expandedUserId, setExpandedUserId] = useState<
    string | null
  >(null);
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
  const [isRoleFilterOpen, setIsRoleFilterOpen] = useState(false);
  const [roleFilterSearch, setRoleFilterSearch] = useState('');
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false); // ✅ MODAL CAMBIAR CONTRASEÑA
  const [showPasswordHistoryModal, setShowPasswordHistoryModal] = useState(false);
  const [passwordHistory, setPasswordHistory] = useState<any[]>([]);
  const [isLoadingPasswordHistory, setIsLoadingPasswordHistory] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem('usersItemsPerPage');
    return saved ? parseInt(saved, 10) : 10;
  });

  const handleItemsPerPageChange = (newItems: number) => {
    setItemsPerPage(newItems);
    localStorage.setItem('usersItemsPerPage', newItems.toString());
    setCurrentPage(1); // Resetear a la primera página
  };

  const { hasRole } = useAuth();
  const isSuperAdmin = hasRole('SUPER_ADMIN');
  const isMountedRef = useRef(true);
  const latestLoadUsersRequestRef = useRef(0);
  const { visibleCols, setVisibleCols } = useTableColumns('personas', PERSONAS_COLUMNS);

  const sortedAvailableRoles = useMemo(
    () => [...availableRoles].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' })
    ),
    [availableRoles]
  );

  const filteredRoleOptions = useMemo(() => {
    const query = roleFilterSearch.trim().toLowerCase();
    if (!query) return sortedAvailableRoles;
    return sortedAvailableRoles.filter((role) =>
      (role.name || '').toLowerCase().includes(query) ||
      (role.code || '').toLowerCase().includes(query)
    );
  }, [roleFilterSearch, sortedAvailableRoles]);

  const selectedRoleFilter = useMemo(
    () => sortedAvailableRoles.find((role) => role.id === roleFilter),
    [roleFilter, sortedAvailableRoles]
  );

  // ✅ FUNCIÓN PARA CARGAR USUARIOS DESDE EL BACKEND
  const loadUsers = async () => {
    const requestId = ++latestLoadUsersRequestRef.current;

    try {
      setLoading(true);
      const response = await usersService.getUsers({
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearchQuery.trim() || undefined,
        status: statusFilter === 'all' ? undefined : (statusFilter as 'active' | 'inactive'),
        role: roleFilter === 'all' ? undefined : roleFilter,
        sortBy: sortField,
        sortOrder: sortOrder,
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
        birthDate: item.fec_nacimiento || '',
        address: item.dir_residencia || '',
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
        idSeccional: item.seccional?.idSeccional || item.idSeccional || undefined,
        idSede: item.sede?.idSede || item.idSede || undefined,
        sedes: [], // Mantener para compatibilidad
        enrollmentMethod: 'manual' as 'qr' | 'manual' | 'massive'
      }));

      if (!isMountedRef.current || requestId !== latestLoadUsersRequestRef.current) {
        return;
      }

      setUsers(mappedUsers);
      setTotalUsers(response.meta.total);
      setTotalActiveUsers(response.meta.totalActive);
      setTotalBlockedUsers(response.meta.totalBlocked);
    } catch (error) {
      if (!isMountedRef.current || requestId !== latestLoadUsersRequestRef.current) {
        return;
      }

      console.error('Error al cargar usuarios:', error);
      toast.error('Error al cargar usuarios', {
        description: 'No se pudieron cargar los usuarios. Usando datos de prueba.'
      });
      // En caso de error, usamos los datos mock
      setUsers([]);
    } finally {
      if (isMountedRef.current && requestId === latestLoadUsersRequestRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Debounce para búsqueda en backend
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  // Volver a primera página cuando cambia la búsqueda o filtros backend
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, statusFilter, roleFilter]);

  // Paginación local: reiniciar cuando cambian filtros frontend
  useEffect(() => {
    setCurrentPage(1);
  }, [locationFilter, unidadOrganizacionalFilter]);

  // ✅ CARGAR USUARIOS AL MONTAR EL COMPONENTE
  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, debouncedSearchQuery, statusFilter, roleFilter, sortField, sortOrder, itemsPerPage]); // Recargar cuando cambia paginación, límite, orden o filtros backend

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortOrder === 'asc') setSortOrder('desc');
      else if (sortOrder === 'desc') {
        setSortField(undefined);
        setSortOrder(undefined);
      }
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Usuarios actuales (de API o mock)
  const currentUsers = users;

  // Filtros únicos para los selectores (roles desde backend)
  const uniqueLocations = Array.from(
    new Set(MOCK_USERS_WITH_SEDES.map((u) => u.location)),
  );

  // Filtrado
  const filteredUsers = currentUsers.filter(user => {
    const matchesLocation = locationFilter === 'all' || user.location === locationFilter;

    // ✅ FILTRO POR UNIDAD ORGANIZACIONAL (Coherente con estructura)
    const matchesUnidadOrganizacional = !unidadOrganizacionalFilter ||
      (user.sedes && user.sedes.some(sede => sede.id === unidadOrganizacionalFilter));

    return matchesLocation && matchesUnidadOrganizacional;
  });

  // Filtros activos (UI)
  const hasActiveFilters = searchQuery !== '' || statusFilter !== 'all' || roleFilter !== 'all' || locationFilter !== 'all' || unidadOrganizacionalFilter;
  // Filtros que todavía se aplican en frontend (búsqueda se aplica en backend)
  const hasClientSideFilters = locationFilter !== 'all' || !!unidadOrganizacionalFilter;

  // Paginación: backend para búsqueda; frontend para filtros locales
  const totalPages = hasClientSideFilters
    ? Math.ceil(filteredUsers.length / itemsPerPage)
    : Math.ceil(totalUsers / itemsPerPage);

  const paginatedUsers = hasClientSideFilters
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
    const statusConfig: Record<
      string,
      { label: string; className: string; icon: any }
    > = {
      active: {
        label: "Activo",
        className:
          "bg-[#ECFDF5] text-[#065F46] border-[#10B981]",
        icon: CheckCircle,
      },
      blocked: {
        label: "Bloqueado",
        className:
          "bg-[#FEF2F2] text-[#991B1B] border-[#EF4444]",
        icon: XCircle,
      },
      inactive: {
        label: "Inactivo",
        className:
          "bg-[#F3F4F6] text-[#374151] border-[#D1D5DB]",
        icon: AlertCircle,
      },
    };

    const config =
      statusConfig[status] || statusConfig.inactive;
    const Icon = config.icon;

    return (
      <Badge
        className={`${config.className} border hover:${config.className}`}
      >
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold">
            {config.label}
          </span>
        </div>
      </Badge>
    );
  };

  const getRoleBadge = (
    roleName: string,
    roleColor: string,
  ) => {
    const colorConfig: Record<string, string> = {
      blue: "bg-[#EFF6FF] text-[#1E40AF] border-[#3B82F6]",
      purple: "bg-[#EDE9FE] text-[#5B21B6] border-[#8B5CF6]",
      green: "bg-[#D1FAE5] text-[#065F46] border-[#10B981]",
      orange: "bg-[#FEF3C7] text-[#92400E] border-[#F59E0B]",
      red: "bg-[#FEE2E2] text-[#991B1B] border-[#EF4444]",
    };

    return (
      <Badge
        className={`${colorConfig[roleColor] || colorConfig.blue} border text-xs font-medium`}
      >
        {roleName}
      </Badge>
    );
  };

  const hasSuperAdminRole = (user: any) =>
    (user.roles || []).some((role: any) => {
      return role.code === 'SUPER_ADMIN'
    });

  // ✅ FUNCIÓN HELPER PARA BADGES DE ENROLAMIENTO
  const getEnrollmentBadge = (
    method: "qr" | "manual" | "massive",
  ) => {
    const methodConfig: Record<
      string,
      { label: string; className: string; icon: any }
    > = {
      qr: {
        label: "QR Code",
        className:
          "bg-[#EDE9FE] text-[#5B21B6] border-[#8B5CF6]",
        icon: QrCode,
      },
      manual: {
        label: "Manual",
        className:
          "bg-[#EFF6FF] text-[#1E40AF] border-[#3B82F6]",
        icon: UserPlus,
      },
      massive: {
        label: "Carga Masiva",
        className:
          "bg-[#D1FAE5] text-[#065F46] border-[#10B981]",
        icon: Upload,
      },
    };

    const config = methodConfig[method];
    const Icon = config.icon;

    return (
      <Badge
        className={`${config.className} border hover:${config.className}`}
      >
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold">
            {config.label}
          </span>
        </div>
      </Badge>
    );
  };

  // ✅ FUNCIÓN HELPER PARA ESTADO DE CONTRASEÑA
  const getPasswordStatus = (userId: string) => {
    // Simulación de datos de contraseñas (en producción vendría de API)
    const passwordData: Record<string, { lastChange: Date; expiresIn: number }> = {
      '1': { lastChange: new Date('2024-08-01'), expiresIn: 152 },
      '2': { lastChange: new Date('2024-06-15'), expiresIn: 13 },
      '3': { lastChange: new Date('2023-12-05'), expiresIn: -22 },
      '4': { lastChange: new Date('2024-07-20'), expiresIn: 141 },
      '5': { lastChange: new Date('2024-06-30'), expiresIn: 30 },
      '6': { lastChange: new Date('2023-11-10'), expiresIn: -43 },
      '7': { lastChange: new Date('2024-09-15'), expiresIn: 105 },
    };

    const data = passwordData[userId] || { lastChange: new Date(), expiresIn: 90 };
    
    if (data.expiresIn < 0) {
      return {
        status: 'expired',
        label: `Vencida (${Math.abs(data.expiresIn)} días)`,
        className: 'bg-red-50 text-red-700 border-red-300',
        icon: AlertCircle,
        color: '#DC2626'
      };
    } else if (data.expiresIn <= 30) {
      return {
        status: 'expiring',
        label: `Por vencer (${data.expiresIn}d)`,
        className: 'bg-yellow-50 text-yellow-700 border-yellow-300',
        icon: Clock,
        color: '#F59E0B'
      };
    } else {
      return {
        status: 'valid',
        label: `Vigente (${data.expiresIn}d)`,
        className: 'bg-green-50 text-green-700 border-green-300',
        icon: CheckCircle,
        color: '#10B981'
      };
    }
  };

  const formatLastActivity = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Hace un momento";
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays === 1) return "Ayer";
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return date.toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
    });
  };

  const handleEdit = (user: any) => {
    setSelectedUser(user);
    setShowEditModal(true); // ✅ Abrir modal de edición con sedes
  };

  const handleSaveEdit = async (userData: any) => {
    try {
      setLoading(true);

      const userId = selectedUser?.id_user || selectedUser?.id;
      if (!userId) {
        throw new Error("No se pudo identificar el usuario a editar.");
      }

      const principalAsignacion =
        userData.asignacionesSedes?.find((a: any) => a.esPrincipal) ||
        userData.asignacionesSedes?.[0];
      const sedeIdSeleccionada = userData.idSede || userData.sedePrincipalId || principalAsignacion?.unidadId;
      const sedeIdNumerica = sedeIdSeleccionada ? Number(sedeIdSeleccionada) : undefined;
      let seccionalIdNumerica = userData.idSeccional ? Number(userData.idSeccional) : undefined;

      // Si hay sede seleccionada y no viene seccional en el formulario, resolverla desde estructura-organizacional
      if (!Number.isFinite(seccionalIdNumerica as number) && Number.isFinite(sedeIdNumerica as number)) {
        try {
          const sedeResponse = await estructuraService.obtenerSedePorId(sedeIdNumerica as number);
          const resolvedSeccionalId = sedeResponse?.data?.idSeccional;
          if (resolvedSeccionalId) {
            seccionalIdNumerica = Number(resolvedSeccionalId);
          }
        } catch (error) {
          console.warn('No se pudo resolver idSeccional desde idSede:', error);
        }
      }

      // Map single string role to roleIds array
      let mappedRoleIds = userData.roleIds || [];
      if (mappedRoleIds.length === 0 && userData.role) {
        const roleObj = availableRoles.find(
          (r: any) => r.name === userData.role || r.nombre === userData.role || r.code === userData.role
        );
        if (roleObj) {
          mappedRoleIds = [roleObj.id];
        }
      }

      // Mapear datos del formulario al formato esperado por el backend
      const updateUserData = {
        first_name: userData.firstName,
        last_name: userData.lastName,
        identification_number: userData.documentNumber || userData.document || userData.identification_number,
        identification_type: userData.documentType || userData.identificationType,
        email: userData.email,
        phone: userData.phone || '',
        gender: userData.gender || '',
        birth_date: userData.birthDate,
        address: userData.address,
        city: userData.city,
        empresa_contratista: userData.empresaContratista,
        dependencia_grupo_programa: userData.dependenciaGrupoPrograma,
        cargo_semestre: userData.cargoSemestre,
        contrato: userData.contrato,
        enrollment_date: userData.enrollmentDate,
        fecha_fin_contrato: userData.fechaFinContrato,
        observaciones: userData.observaciones,
        tipo_vinculacion: userData.tipoVinculacion,
        horas_asignables: userData.horasAsignables,
        pregrado_detalle: userData.pregradoDetalle,
        doctorado_detalle: userData.doctoradoDetalle,
        puntaje_salarial: userData.puntajeSalarial,
        roleIds: mappedRoleIds,
        status: userData.status,
        // Agregar seccional y sede si están definidos
        idSeccional: Number.isFinite(seccionalIdNumerica as number) ? seccionalIdNumerica : undefined,
        idSede: Number.isFinite(sedeIdNumerica as number) ? sedeIdNumerica : undefined,
      };

      await usersService.updateUser(userId, updateUserData);

      // Si el estado cambió, actualizarlo usando el endpoint específico
      const wasActive = selectedUser?.status === 'active' || selectedUser?.is_active === true;
      const isNowActive = userData.status === 'active';
      if (wasActive !== isNowActive) {
        await usersService.updateUserStatus(userId, isNowActive);
      }

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

  const handleAssignAccessSubmit = (
    userId: string,
    accesses: string[],
  ) => {
    console.log("Asignando accesos:", { userId, accesses });
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

  useEffect(() => {
    loadRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const triggerBancoDocentesSync = async () => {
    try {
      const ptaBase = import.meta.env.VITE_API_MODE === 'direct'
        ? 'http://localhost:3003'
        : (import.meta.env.VITE_API_URL || window.location.origin + '/services') + '/pta/api/v1';
      await fetch(`${ptaBase}/pta/banco-docentes/sync-from-auth`, { method: 'POST' });
    } catch { /* best-effort, no bloqueamos al usuario */ }
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

      // Si se asignó rol DOCENTE, sincronizar con banco de docentes
      const assignedRoles = availableRoles.filter(r => selectedRoleIds.has(r.id));
      const hasDocente = assignedRoles.some(r => r.code === 'DOCENTE');
      if (hasDocente) triggerBancoDocentesSync();

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

  // ✅ NUEVO: Forzar restablecimiento de contraseña
  const handleForcePasswordReset = async (user: any) => {
    const userEmail = user.email || user.person?.email || user.username;
    if (!userEmail) {
      toast.error('Error', { description: 'No se encontró el correo electrónico del usuario.' });
      return;
    }

    const confirmed = window.confirm(
      `¿Enviar correo de restablecimiento de contraseña a ${user.firstName || user.person?.first_name} ${user.lastName || user.person?.last_name}?\n\nSe enviará un código OTP al correo: ${userEmail}`
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      await usersService.forcePasswordReset(userEmail);
      toast.success('Correo de restablecimiento enviado', {
        description: `Se envió un código OTP a ${userEmail}. El usuario deberá ingresar el código y crear una nueva contraseña.`,
        duration: 6000,
      });
    } catch (error: any) {
      console.error('Error al forzar restablecimiento:', error);
      toast.error('Error al enviar correo de restablecimiento', {
        description: error?.message || 'No se pudo enviar el correo. Intente nuevamente.',
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

      const principalAsignacion =
        userData.asignacionesSedes?.find((a: any) => a.esPrincipal) ||
        userData.asignacionesSedes?.[0];
      const sedeIdSeleccionada = userData.idSede || userData.sedePrincipalId || principalAsignacion?.unidadId;
      const sedeIdNumerica = sedeIdSeleccionada ? Number(sedeIdSeleccionada) : undefined;
      let seccionalIdNumerica = userData.idSeccional ? Number(userData.idSeccional) : undefined;

      // Si hay sede seleccionada y no viene seccional en el formulario, resolverla desde estructura-organizacional
      if (!Number.isFinite(seccionalIdNumerica as number) && Number.isFinite(sedeIdNumerica as number)) {
        try {
          const sedeResponse = await estructuraService.obtenerSedePorId(sedeIdNumerica as number);
          const resolvedSeccionalId = sedeResponse?.data?.idSeccional;
          if (resolvedSeccionalId) {
            seccionalIdNumerica = Number(resolvedSeccionalId);
          }
        } catch (error) {
          console.warn('No se pudo resolver idSeccional desde idSede:', error);
        }
      }

      // Map single string role to roleIds array
      let mappedRoleIds = userData.roleIds || [];
      if (mappedRoleIds.length === 0 && userData.role) {
        const roleObj = availableRoles.find(
          (r: any) => r.name === userData.role || r.nombre === userData.role || r.code === userData.role
        );
        if (roleObj) {
          mappedRoleIds = [roleObj.id];
        }
      }

      // Mapear datos del formulario al formato esperado por el backend
      const createUserData = {
        first_name: String(userData.firstName || '').trim(),
        last_name: String(userData.lastName || '').trim(),
        identification_number: String(
          userData.documentNumber || userData.document || userData.identification_number || ''
        ).trim(),
        identification_type: userData.documentType || userData.identificationType || 'CC',
        email: String(userData.email || '').trim().toLowerCase(),
        phone: String(userData.phone || '').trim(),
        gender: userData.gender || '',
        birth_date: userData.birthDate,
        address: userData.address,
        city: userData.city,
        empresa_contratista: userData.empresaContratista,
        dependencia_grupo_programa: userData.dependenciaGrupoPrograma,
        cargo_semestre: userData.cargoSemestre,
        contrato: userData.contrato,
        enrollment_date: userData.enrollmentDate,
        fecha_fin_contrato: userData.fechaFinContrato,
        observaciones: userData.observaciones,
        tipo_vinculacion: userData.tipoVinculacion,
        horas_asignables: userData.horasAsignables,
        pregrado_detalle: userData.pregradoDetalle,
        doctorado_detalle: userData.doctoradoDetalle,
        puntaje_salarial: userData.puntajeSalarial,
        roleIds: mappedRoleIds,
        // Agregar seccional y sede si están definidos
        idSeccional: Number.isFinite(seccionalIdNumerica as number) ? seccionalIdNumerica : undefined,
        idSede: Number.isFinite(sedeIdNumerica as number) ? sedeIdNumerica : undefined,
      };

      const newUser = await usersService.createUser(createUserData);

      // Si se creó con rol DOCENTE, sincronizar con banco de docentes
      if (createUserData.roleIds?.length) {
        const assignedRoles = availableRoles.filter(r => createUserData.roleIds!.includes(r.id));
        if (assignedRoles.some(r => r.code === 'DOCENTE')) triggerBancoDocentesSync();
      }

      toast.success('Usuario Creado Exitosamente', {
        description: `${userData.firstName} ${userData.lastName} ha sido registrado.`
      });

      setShowCreateModal(false);
      await loadUsers();
    } catch (error: any) {
      console.error('Error al crear usuario:', error);
      toast.error('Error al crear usuario', {
        description: error?.message || 'No se pudo crear el usuario. Intente nuevamente.'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ✅ GESTIÓN DE CONTRASEÑAS - Handlers
  const handleSendPasswordReminder = (user: any) => {
    toast.success("Recordatorio Enviado", {
      description: `Se envió un recordatorio de cambio de contraseña a ${user.email}`,
    });
    // En producción: await sendPasswordReminder(user.id);
  };

  const handleForcePasswordChange = (user: any) => {
    setSelectedUser(user);
    setShowChangePasswordModal(true);
  };

  const handleViewPasswordHistory = (user: any) => {
    setSelectedUser(user);
    setPasswordHistory([]);
    setIsLoadingPasswordHistory(false);
    setShowPasswordHistoryModal(true);
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setRoleFilter("all");
    setLocationFilter("all");
  };

  // const hasActiveFilters =
  //   searchQuery ||
  //   statusFilter !== "all" ||
  //   roleFilter !== "all" ||
  //   locationFilter !== "all";

  // ✅ FILTROS RÁPIDOS POR ROL - Contadores de usuarios por rol

  const quickFiltersData = [...availableRoles]
    .sort((a, b) => (b.usuarios_count || 0) - (a.usuarios_count || 0))
    .slice(0, 6)
    .map((role, index) => {
      return {
        id: role.id,
        role: role.name,
        code: role.code || role.id,
        icon: getIconComponent(role.icon || 'Shield'),
        color: role.color,
        bgColor: role.color+'20',
        borderColor: role.color,
        count: role.usuarios_count || 0,
      };
    });

  // Si estamos en la vista de carpeta digital, mostrar esa sección
  if (viewMode === "digital-folder") {
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
          avatar: u.avatar,
        }))}
        canUpload={true}
      />
    );
  }

  // ✅ RF015 - Si estamos en la vista de Roles y Permisos
  if (viewMode === "roles-permisos") {
    return (
      <div className="space-y-4">
        {/* Botón de Retorno */}
        <button
          onClick={() => setViewMode("users")}
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
  if (viewMode === "estadisticas-docentes") {
    return (
      <div className="space-y-4">
        {/* Botón de Retorno */}
        <button
          onClick={() => setViewMode("users")}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          ← Volver a Gestión de Personas
        </button>

        {/* Estadísticas de Docentes ESAP */}
        <EstadisticasDocentesESAP />
      </div>
    );
  }

  const renderSortableHeader = (label: string, field: string, align: 'left' | 'center' | 'right' = 'left') => {
    const isSorted = sortField === field;
    return (
      <th
        className={`text-${align} font-semibold uppercase cursor-pointer hover:bg-gray-100 transition-colors group`}
        style={{
          padding: "12px 16px",
          fontSize: "12px",
          lineHeight: "16px",
          color: isSorted ? "#003DA5" : "#6B7280",
          letterSpacing: "0.5px",
          whiteSpace: "nowrap",
          userSelect: "none",
        }}
        onClick={() => handleSort(field)}
        title={`Organizar por ${label.toLowerCase()}`}
      >
        <div className={`flex items-center gap-1.5 ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'}`}>
          {label}
          <div className={`flex items-center justify-center w-4 h-4 rounded transition-colors ${isSorted ? 'bg-blue-50 text-[#003DA5]' : 'text-gray-400 opacity-0 group-hover:opacity-100'}`}>
            {isSorted && sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> :
             isSorted && sortOrder === 'desc' ? <ArrowDown className="w-3 h-3" /> :
             <ArrowUpDown className="w-3 h-3" />}
          </div>
        </div>
      </th>
    );
  };

  // ═══════════════════════════════ RENDER ═══════════════════════════════
  return (
    <>
    <Toaster position="top-right" richColors />
    <Container4K className="space-y-6">
      {/* Header - DÍA 5: ResponsiveHeader */}
      <ResponsiveHeader
        key="header"
        title="Gestión Personas"
        description="Gestión integral de personas con asignación de roles múltiples simultáneos"
        icon={Users}
        primaryAction={{
          label: "Crear Usuario",
          icon: UserPlus,
          onClick: () => setShowCreateModal(true),
          variant: "primary"
        }}
        secondaryActions={[
          {
            label: "Exportar por Sede",
            icon: Download,
            onClick: () => setShowExportModal(true),
            variant: "secondary"
          }
        ]}
      />

      {/* Búsqueda y Filtros - Input estándar según especificaciones */}
      <motion.div
        key="search-and-filters"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="bg-white rounded-xl border border-[#E5E7EB] p-4"
        style={{ boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)" }}
      >
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Input búsqueda */}
          <div className="flex-1">
            <div className="relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
                style={{ color: "#9CA3AF" }}
              />
              <input
                type="text"
                placeholder="Buscar por nombre, correo o documento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border-2 rounded-lg transition-all"
                style={{
                  paddingLeft: "48px",
                  paddingRight: searchQuery ? "48px" : "16px",
                  paddingTop: "12px",
                  paddingBottom: "12px",
                  fontSize: "14px",
                  lineHeight: "20px",
                  color: "#1F2937",
                  borderColor: "#D1D5DB",
                  height: "44px",
                  outline: "none",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#003DA5";
                  e.target.style.boxShadow =
                    "0 0 0 3px rgba(0, 61, 165, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#D1D5DB";
                  e.target.style.boxShadow = "none";
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-[#F9FAFB] rounded-lg transition-colors"
                >
                  <X
                    className="w-4 h-4"
                    style={{ color: "#9CA3AF" }}
                  />
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
              style={{ height: "44px" }}
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="blocked">Bloqueados</option>
              <option value="inactive">Inactivos</option>
            </select>

            <div className="relative" style={{ minWidth: "280px" }}>
              <button
                type="button"
                onClick={() => setIsRoleFilterOpen(!isRoleFilterOpen)}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm text-left focus:outline-none focus:ring-2 focus:ring-[#003DA5] hover:border-[#003DA5] transition-colors flex items-center justify-between bg-white"
                style={{ height: "44px" }}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Shield className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  {selectedRoleFilter ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: selectedRoleFilter.color || "#003DA5" }}
                      />
                      <span className="text-gray-900 truncate">{selectedRoleFilter.name}</span>
                    </div>
                  ) : (
                    <span className="text-gray-500">{rolesLoading ? "Cargando roles..." : "Todos los roles"}</span>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {roleFilter !== "all" && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        event.stopPropagation();
                        setRoleFilter("all");
                        setRoleFilterSearch("");
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          event.stopPropagation();
                          setRoleFilter("all");
                          setRoleFilterSearch("");
                        }
                      }}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                      title="Limpiar filtro"
                    >
                      <X className="w-3 h-3 text-gray-500" />
                    </span>
                  )}
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isRoleFilterOpen ? "rotate-180" : ""}`} />
                </div>
              </button>

              {isRoleFilterOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsRoleFilterOpen(false)} />
                  <div className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-hidden">
                    <div className="p-3 border-b border-gray-200">
                      <input
                        type="text"
                        placeholder="Buscar rol..."
                        value={roleFilterSearch}
                        onChange={(e) => setRoleFilterSearch(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#003DA5]"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    <div className="overflow-y-auto max-h-80">
                      <button
                        type="button"
                        onClick={() => {
                          setRoleFilter("all");
                          setIsRoleFilterOpen(false);
                          setRoleFilterSearch("");
                        }}
                        className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                          roleFilter === "all" ? "bg-blue-50" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-900">Todos los roles</span>
                        </div>
                      </button>

                      {rolesLoading ? (
                        <div className="p-4 text-center text-sm text-gray-500">Cargando roles...</div>
                      ) : filteredRoleOptions.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500">No se encontraron roles</div>
                      ) : (
                        filteredRoleOptions.map((role) => (
                          <button
                            key={role.id}
                            type="button"
                            onClick={() => {
                              setRoleFilter(role.id);
                              setIsRoleFilterOpen(false);
                              setRoleFilterSearch("");
                            }}
                            className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                              roleFilter === role.id ? "bg-blue-50" : ""
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: role.color || "#003DA5" }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-900 truncate">{role.name}</span>
                                </div>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>

                    <div className="bg-gray-50 px-3 py-2 border-t border-gray-200 text-xs text-gray-600">
                      <div className="flex items-center justify-between">
                        <span>Total: {filteredRoleOptions.length} roles</span>
                        <span className="text-gray-500">Orden alfabético</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <select
              value={locationFilter}
              onChange={(e) =>
                setLocationFilter(e.target.value)
              }
              className="px-4 py-3 border-2 border-[#D1D5DB] rounded-lg bg-white cursor-pointer font-medium text-sm transition-all"
              style={{ height: "44px", display: 'none' }}
            >
              <option value="all">Todas las ubicaciones</option>
              {uniqueLocations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>

            {/* ✅ FILTRO DE UNIDAD ORGANIZACIONAL */}
            <div style={{ minWidth: "280px" }}>
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
            <span
              className="text-xs font-semibold"
              style={{ color: "#6B7280" }}
            >
              Filtros activos:
            </span>
            {searchQuery && (
              <Badge variant="outline" className="gap-1">
                Búsqueda: "{searchQuery}"
                <button
                  onClick={() => setSearchQuery("")}
                  className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {statusFilter !== "all" && (
              <Badge variant="outline" className="gap-1">
                Estado: {statusFilter}
                <button
                  onClick={() => setStatusFilter("all")}
                  className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {roleFilter !== "all" && (
              <Badge variant="outline" className="gap-1">
                Rol: {selectedRoleFilter?.name}
                <button
                  onClick={() => setRoleFilter("all")}
                  className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {locationFilter !== "all" && (
              <Badge variant="outline" className="gap-1">
                Ubicación: {locationFilter}
                <button
                  onClick={() => setLocationFilter("all")}
                  className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            <button
              onClick={clearAllFilters}
              className="text-xs font-semibold hover:underline ml-auto"
              style={{ color: "#003DA5" }}
            >
              Limpiar todos
            </button>
          </div>
        )}
      </motion.div>

      {/* 🚀 TARJETAS DE FILTROS RAPIDOS POR ROL */}
      <motion.div
        key="quick-filters-cards"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.18 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4"
      >
        {quickFiltersData.map((filter, filterIdx) => {
          const Icon = filter.icon;
          const isActive = roleFilter === filter.id;
          
          return (
            <motion.button
              key={filter.code ? `${filter.code}-${filterIdx}` : `filter-${filterIdx}`}
              onClick={() => {
                if (isActive) {
                  setRoleFilter("all");
                  toast.info("Filtro Eliminado", {
                    description: `Se eliminó el filtro de ${filter.role}`,
                  });
                } else {
                  setRoleFilter(filter.id);
                  toast.success("Filtro Aplicado", {
                    description: `Mostrando usuarios con rol ${filter.role}`,
                  });
                }
              }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="relative overflow-hidden rounded-xl border-2 p-4 text-left transition-all"
              style={{
                backgroundColor: isActive ? filter.bgColor : '#FFFFFF',
                borderColor: isActive ? filter.borderColor : '#E5E7EB',
                boxShadow: isActive 
                  ? `0 4px 12px ${filter.color}20` 
                  : '0 1px 3px rgba(0, 0, 0, 0.05)',
              }}
            >
              {/* Badge de filtro activo */}
              {isActive && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2"
                >
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: filter.color }}
                  />
                </motion.div>
              )}

              {/* Icono */}
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                style={{ 
                  backgroundColor: filter.bgColor,
                  border: `2px solid ${filter.borderColor}60`
                }}
              >
                <Icon 
                  className="w-5 h-5" 
                  style={{ color: filter.color }}
                  strokeWidth={2.5}
                />
              </div>

              {/* Contenido */}
              <div>
                <p 
                  className="font-semibold mb-1"
                  style={{ 
                    fontSize: '14px',
                    color: isActive ? filter.color : '#1F2937'
                  }}
                >
                  {filter.role}
                </p>
                <div className="flex items-center gap-2">
                  <span 
                    className="font-bold"
                    style={{ 
                      fontSize: '24px',
                      color: filter.color
                    }}
                  >
                    {filter.count}
                  </span>
                  <span 
                    className="text-xs"
                    style={{ color: '#6B7280' }}
                  >
                    usuarios
                  </span>
                </div>
              </div>

              {/* Indicador hover */}
              <div 
                className="absolute bottom-0 left-0 right-0 h-1 transition-all"
                style={{ 
                  backgroundColor: filter.color,
                  opacity: isActive ? 1 : 0
                }}
              />
            </motion.button>
          );
        })}
      </motion.div>

      {/* Tabla Premium - Según especificaciones de Table */}
      <motion.div
        key="premium-table-container"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card className="overflow-hidden relative">
          {/* Header de tabla */}
          <div
            className="border-b px-6 py-4"
            style={{
              background: "#F9FAFB",
              borderBottom: "2px solid #E5E7EB",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2
                  className="font-bold"
                  style={{
                    fontSize: "18px",
                    lineHeight: "24px",
                    color: "#1F2937",
                  }}
                >
                  Lista de Usuarios
                </h2>
                <p
                  className="mt-0.5"
                  style={{
                    fontSize: "12px",
                    lineHeight: "16px",
                    color: "#6B7280",
                  }}
                >
                  {loading ? 'Cargando usuarios...' : `Mostrando ${displayUsers.length} de ${totalUsers} usuarios`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-semibold">
                  Total: {totalUsers}
                </Badge>
                <ColumnSelector
                  columns={PERSONAS_COLUMNS}
                  visibleCols={visibleCols}
                  setVisibleCols={setVisibleCols}
                />
              </div>
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
            <table
              className="w-full border-collapse"
              style={{ minWidth: "800px" }}
            >
              <thead
                style={{
                  background: "#F9FAFB",
                  borderBottom: "2px solid #E5E7EB",
                  position: "sticky",
                  top: 0,
                  zIndex: 10,
                }}
              >
                <tr>
                  {renderSortableHeader('Usuario', 'usuario')}
                  {visibleCols.has('roles') && renderSortableHeader('Roles', 'roles')}
                  {visibleCols.has('territorial') && renderSortableHeader('Territorial', 'territorial')}
                  {visibleCols.has('cetap') && renderSortableHeader('CETAP', 'cetap')}
                  {visibleCols.has('carpeta') && renderSortableHeader('Carpeta Digital', 'carpeta', 'center')}
                  {visibleCols.has('estado') && renderSortableHeader('Estado', 'estado')}
                  {visibleCols.has('actividad') && renderSortableHeader('Última Actividad', 'actividad')}
                  <th
                    className="text-right font-semibold uppercase"
                    style={{
                      padding: "12px 16px",
                      fontSize: "12px",
                      lineHeight: "16px",
                      color: "#6B7280",
                      letterSpacing: "0.5px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody style={{ background: "#FFFFFF" }}>
                <AnimatePresence mode="popLayout">
                  {displayUsers.flatMap((user, index) => {
                    const items = [
                      <motion.tr
                        key={user.id ? `row-${user.id}-${index}` : `row-${index}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{
                          duration: 0.2,
                          delay: index * 0.05,
                        }}
                        className="group cursor-pointer"
                        style={{
                          borderBottom: "1px solid #E5E7EB",
                          transition: "background 150ms ease",
                        }}
                        onClick={() => handleViewDetails(user)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            "#F9FAFB";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background =
                            "#FFFFFF";
                        }}
                      >
                        {/* Celda Usuario */}
                        <td
                          style={{
                            padding: "16px",
                            verticalAlign: "middle",
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10 flex-shrink-0">
                              <AvatarFallback
                                className="font-semibold"
                                style={{
                                  background: "#E0EDFF",
                                  color: "#003DA5",
                                }}
                              >
                                {user.firstName[0]}
                                {user.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p
                                className="font-semibold group-hover:text-[#003DA5] transition-colors"
                                style={{
                                  fontSize: "14px",
                                  lineHeight: "20px",
                                  color: "#1F2937",
                                }}
                              >
                                {user.firstName} {user.lastName}
                              </p>
                              <p
                                style={{
                                  fontSize: "12px",
                                  lineHeight: "16px",
                                  color: "#6B7280",
                                }}
                              >
                                {user.email}
                              </p>
                              <p
                                style={{
                                  fontSize: "11px",
                                  lineHeight: "14px",
                                  color: "#9CA3AF",
                                  marginTop: "2px"
                                }}
                              >
                                {user.identificationType} {user.document}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Celda Roles - Mostrar todos los roles simultáneos */}
                        {visibleCols.has('roles') && (
                        <td
                          style={{
                            padding: "16px",
                            verticalAlign: "middle",
                          }}
                        >
                          <div className="flex flex-wrap gap-1.5">
                            {user.roles.map((role, idx) => (
                              <div key={idx}>
                                {getRoleBadge(
                                  role.name,
                                  role.color,
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                        )}

                        {/* ✅ Celda Territorial */}
                        {visibleCols.has('territorial') && (
                        <td
                          style={{
                            padding: "16px",
                            verticalAlign: "middle",
                          }}
                        >
                          {user.seccional ? (
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-green-600" />
                              <div>
                                <p className="text-sm font-medium text-gray-900" title={user.seccional.nomSeccional}>
                                  {user.seccional.nomSeccional.length > 25 ? `${user.seccional.nomSeccional.substring(0, 25)}...` : user.seccional.nomSeccional}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {user.seccional.codSeccional && `Cód: ${user.seccional.codSeccional}`}
                                  {user.seccional.ubicacion && ` • ${user.seccional.ubicacion}`}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">
                              Sin territorial
                            </span>
                          )}
                        </td>
                        )}

                        {/* ✅ Celda CETAP */}
                        {visibleCols.has('cetap') && (
                        <td
                          style={{
                            padding: "16px",
                            verticalAlign: "middle",
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {user.sede ? (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-orange-600" />
                              <div>
                                <p className="text-sm font-medium text-gray-900" title={user.sede.nomSede}>
                                  {user.sede.nomSede.length > 25 ? `${user.sede.nomSede.substring(0, 25)}...` : user.sede.nomSede}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {user.sede.codSede && `Cód: ${user.sede.codSede}`}
                                  {user.sede.ubicacion && ` • ${user.sede.ubicacion}`}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">
                              Sin CETAP
                            </span>
                          )}
                        </td>
                        )}

                        {/* ✅ Celda Carpeta Digital */}
                        {visibleCols.has('carpeta') && (
                        <td
                          style={{
                            padding: "16px",
                            verticalAlign: "middle",
                          }}
                        >
                          <div className="flex items-center justify-center gap-2" style={{display: hasSuperAdminRole(user) ? 'none' : 'block'}}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUser(user);
                                setViewMode("digital-folder");
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all hover:shadow-md"
                              style={{
                                background:
                                  "linear-gradient(135deg, #E0EDFF 0%, #F0F6FF 100%)",
                                border: "1px solid #DBEAFE",
                              }}
                            >
                              <FolderOpen
                                className="w-4 h-4"
                                style={{ color: "#003DA5" }}
                              />
                              <span
                                className="font-bold text-sm"
                                style={{ color: "#003DA5" }}
                              >
                                {Math.floor(
                                  Math.random() * 15,
                                ) + 5}
                              </span>
                            </button>
                          </div>
                        </td>
                        )}

                        {/* Celda Estado */}
                        {visibleCols.has('estado') && (
                        <td
                          style={{
                            padding: "16px",
                            verticalAlign: "middle",
                          }}
                        >
                          <div className="flex flex-col gap-2">
                            {getStatusBadge(user.status)}
                            {/* ✅ Indicador de contraseña */}
                            {(() => {
                              const pwdStatus = getPasswordStatus(user.id);
                              const Icon = pwdStatus.icon;
                              return (
                                <Badge
                                  className={`${pwdStatus.className} border hover:${pwdStatus.className} w-fit`}
                                  title={`Contraseña: ${pwdStatus.label}`}
                                >
                                  <div className="flex items-center gap-1.5">
                                    <Lock className="w-3 h-3" />
                                    <span className="text-xs font-semibold">
                                      {pwdStatus.label}
                                    </span>
                                  </div>
                                </Badge>
                              );
                            })()}
                          </div>
                        </td>
                        )}

                        {/* Celda Última Actividad */}
                        {visibleCols.has('actividad') && (
                        <td
                          style={{
                            padding: "16px",
                            verticalAlign: "middle",
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <Clock
                              className="w-4 h-4"
                              style={{ color: "#9CA3AF" }}
                            />
                            <span
                              style={{
                                fontSize: "14px",
                                lineHeight: "20px",
                                color: "#4B5563",
                              }}
                            >
                              {formatLastActivity(
                                user.lastActivity,
                              )}
                            </span>
                          </div>
                        </td>
                        )}

                        {/* Celda Acciones */}
                        <td
                          style={{
                            padding: "16px",
                            verticalAlign: "middle",
                          }}
                        >
                          <div
                            className="flex items-center justify-end gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  className="p-2 rounded-lg transition-colors"
                                  style={{
                                    border: "1px solid #E5E7EB",
                                    background: "#FFFFFF",
                                    display: hasSuperAdminRole(user) ? 'none' : 'block'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background =
                                      "#F9FAFB";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background =
                                      "#FFFFFF";
                                  }}
                                >
                                  <MoreVertical
                                    className="w-5 h-5"
                                    style={{ color: "#6B7280" }}
                                  />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-56"
                              >
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleViewDetails(user)
                                  }
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  Ver Detalles
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setViewMode(
                                      "digital-folder",
                                    );
                                  }}
                                  className="text-[#003DA5] data-[highlighted]:bg-[#003DA5] data-[highlighted]:text-white"
                                >
                                  <FolderOpen className="w-4 h-4 mr-2" />
                                  Ver Carpeta Digital
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleEdit(user)
                                  }
                                >
                                  <Edit className="w-4 h-4 mr-2" />
                                  Editar Usuario
                                </DropdownMenuItem>
                                {!hasSuperAdminRole(user) && (
                                  <DropdownMenuItem
                                    onClick={() => handleAssignRoles(user)}
                                    className="text-[#003DA5] data-[highlighted]:bg-[#003DA5] data-[highlighted]:text-white"
                                  >
                                    <Users className="w-4 h-4 mr-2" />
                                    Asignar Roles
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => handleForcePasswordReset(user)}
                                  className="text-[#7C3AED] data-[highlighted]:bg-[#7C3AED] data-[highlighted]:text-white"
                                >
                                  <KeyRound className="w-4 h-4 mr-2" />
                                  Forzar Restablecer Contraseña
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {user.status === 'active' || user.is_active ? (
                                  <DropdownMenuItem
                                    onClick={() => handleBlockUser(user)}
                                    className="text-amber-500 data-[highlighted]:bg-amber-500 data-[highlighted]:text-white"
                                  >
                                    <Lock className="w-4 h-4 mr-2" />
                                    Bloquear Usuario
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => handleActivateUser(user)}
                                    className="text-emerald-600 data-[highlighted]:bg-emerald-600 data-[highlighted]:text-white"
                                  >
                                    <Unlock className="w-4 h-4 mr-2" />
                                    Activar Usuario
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDelete(user)}
                                  className="text-red-500 data-[highlighted]:bg-red-500 data-[highlighted]:text-white"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>

                            <button
                              onClick={() =>
                                handleViewDetails(user)
                              }
                              className="p-2 rounded-lg transition-all"
                              style={{
                                border: "1px solid #E5E7EB",
                                background: "#FFFFFF",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background =
                                  "#003DA5";
                                const icon =
                                  e.currentTarget.querySelector(
                                    "svg",
                                  );
                                if (icon)
                                  (
                                    icon as SVGElement
                                  ).style.color = "#FFFFFF";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background =
                                  "#FFFFFF";
                                const icon =
                                  e.currentTarget.querySelector(
                                    "svg",
                                  );
                                if (icon)
                                  (
                                    icon as SVGElement
                                  ).style.color = "#6B7280";
                              }}
                            >
                              <ChevronDown
                                className={`w-5 h-5 transition-transform ${expandedUserId === user.id ? "rotate-180" : ""}`}
                                style={{ color: "#6B7280" }}
                              />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ];
                    if (expandedUserId === user.id) {
                      items.push(
                        <motion.tr
                          key={user.id ? `${user.id}-expanded-${index}` : `expanded-${index}`}
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
                                setViewMode("digital-folder");
                              }}
                            />
                          </td>
                        </motion.tr>
                      );
                    }
                    return items;
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Vista Mobile - Cards */}
          <div
            className="lg:hidden divide-y"
            style={{ borderColor: "#E5E7EB" }}
          >
            <AnimatePresence mode="popLayout">
              {displayUsers.map((user, index) => (
                <motion.div
                  key={user.id ? `mobile-user-${user.id}-${index}` : `mobile-user-${index}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{
                    duration: 0.2,
                    delay: index * 0.05,
                  }}
                  className="p-4"
                  style={{
                    background: "#FFFFFF",
                    transition: "background 150ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      "#F9FAFB";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background =
                      "#FFFFFF";
                  }}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar className="w-10 h-10 flex-shrink-0">
                        <AvatarFallback
                          className="font-semibold"
                          style={{
                            background: "#E0EDFF",
                            color: "#003DA5",
                          }}
                        >
                          {user.firstName[0]}
                          {user.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3
                          className="font-semibold"
                          style={{
                            fontSize: "14px",
                            lineHeight: "20px",
                            color: "#1F2937",
                          }}
                        >
                          {user.firstName} {user.lastName}
                        </h3>
                        <p
                          style={{
                            fontSize: "12px",
                            lineHeight: "16px",
                            color: "#6B7280",
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
                              border: "1px solid #E5E7EB",
                              background: "#FFFFFF",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background =
                                "#F9FAFB";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background =
                                "#FFFFFF";
                            }}
                          >
                            <MoreVertical
                              className="w-4 h-4"
                              style={{ color: "#6B7280" }}
                            />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-56"
                        >
                          <DropdownMenuItem
                            onClick={() =>
                              handleViewDetails(user)
                            }
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Detalles
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedUser(user);
                              setViewMode("digital-folder");
                            }}
                            className="text-blue-700 data-[highlighted]:bg-blue-600 data-[highlighted]:text-white"
                          >
                            <FolderOpen className="w-4 h-4 mr-2" />
                            Ver Carpeta Digital
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleEdit(user)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Editar Usuario
                          </DropdownMenuItem>
                          {!hasSuperAdminRole(user) && (
                            <DropdownMenuItem
                              onClick={() => handleAssignRoles(user)}
                              className="text-blue-700 data-[highlighted]:bg-blue-600 data-[highlighted]:text-white"
                            >
                              <Users className="w-4 h-4 mr-2" />
                              Asignar Roles
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleForcePasswordReset(user)}
                            className="text-purple-700 data-[highlighted]:bg-purple-600 data-[highlighted]:text-white"
                          >
                            <KeyRound className="w-4 h-4 mr-2" />
                            Forzar Restablecer Contraseña
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {user.status === 'active' || user.is_active ? (
                            <DropdownMenuItem
                              onClick={() => handleBlockUser(user)}
                              className="text-amber-600 data-[highlighted]:bg-amber-500 data-[highlighted]:text-white"
                            >
                              <Lock className="w-4 h-4 mr-2" />
                              Bloquear Usuario
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleActivateUser(user)}
                              className="text-green-600 data-[highlighted]:bg-green-600 data-[highlighted]:text-white"
                            >
                              <Unlock className="w-4 h-4 mr-2" />
                              Activar Usuario
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(user)}
                            className="text-red-600 data-[highlighted]:bg-red-600 data-[highlighted]:text-white"
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
                        <span className="font-medium">
                          {user.territorial.nombre}
                        </span>
                      </div>
                    )}
                    {user.cetap && (
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <MapPin className="w-3.5 h-3.5 text-orange-600" />
                        <span className="font-medium">
                          {user.cetap.nombre}
                        </span>
                      </div>
                    )}
                    {user.sedeCentral &&
                      !user.territorial &&
                      !user.cetap && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Building2 className="w-3.5 h-3.5 text-blue-600" />
                          <span className="font-medium">
                            Sede Central - Bogotá D.C.
                          </span>
                        </div>
                      )}
                  </div>

                  <div
                    className="flex items-center gap-2"
                    style={{
                      fontSize: "12px",
                      lineHeight: "16px",
                      color: "#6B7280",
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
                style={{ background: "#F3F4F6" }}
              >
                <Users
                  className="w-8 h-8"
                  style={{ color: "#9CA3AF" }}
                />
              </div>
              <h3
                className="font-bold mb-2"
                style={{
                  fontSize: "18px",
                  lineHeight: "24px",
                  color: "#1F2937",
                }}
              >
                No se encontraron usuarios
              </h3>
              <p
                className="mb-6"
                style={{
                  fontSize: "14px",
                  lineHeight: "20px",
                  color: "#6B7280",
                }}
              >
                {hasActiveFilters
                  ? "Intenta ajustar los filtros de búsqueda"
                  : "Aún no hay usuarios registrados"}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="px-4 py-2 rounded-lg font-semibold text-sm transition-all"
                  style={{
                    background: "#003DA5",
                    color: "#FFFFFF",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      "#002D7A";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background =
                      "#003DA5";
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
                borderTop: "1px solid #E5E7EB",
                background: "#F9FAFB",
              }}
            >
              <PaginationPremium
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={totalUsers}
                onItemsPerPageChange={handleItemsPerPageChange}
              />
            </div>
          )}
        </Card>
      </motion.div>

      {/* Modal Crear Usuario */}
      <CreatePersonModal
        key="create-person-modal"
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateUser}
      />

      {/* Modal Editar Usuario */}
      <CreatePersonModal
        key="edit-person-modal"
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
          key="assign-access-modal"
          isOpen={showAssignAccessModal}
          onClose={() => {
            setShowAssignAccessModal(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
          onAssign={handleAssignAccessSubmit}
        />
      )}

      {/* ✅ Modal Editar Usuario Unificado */}
      {showEditModal && selectedUser && (
        <CreatePersonModal
          key="unified-edit-person-modal"
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          initialData={selectedUser}
          onCreate={handleSaveEdit}
          editMode={true}
        />
      )}

      {/* ✅ Modal Asignar Roles */}
      {showAssignRolesModal && selectedUser && (
        <AssignRolesModal
          key="assign-roles-modal"
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
        key="export-users-by-sede"
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        usuarios={filteredUsers}
      />

      {/* ✅ Modal Cambiar Contraseña */}
      {showChangePasswordModal && selectedUser && (
        <ModalCambiarContrasena
          key="modal-cambiar-contrasena"
          isOpen={showChangePasswordModal}
          onClose={() => {
            setShowChangePasswordModal(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
          mode="admin-reset"
        />
      )}

      {/* ✅ Modal Historial de Contraseñas */}
      {showPasswordHistoryModal && selectedUser && (
        <PasswordHistoryModal
          key="password-history-modal"
          isOpen={showPasswordHistoryModal}
          onClose={() => {
            setShowPasswordHistoryModal(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
          history={passwordHistory}
          isLoading={isLoadingPasswordHistory}
        />
      )}
    </Container4K>
    </>
  );
}

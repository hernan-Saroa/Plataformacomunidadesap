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
  Lock, // ✅ NUEVO - Para bloquear usuario
  Unlock, // ✅ NUEVO - Para activar usuario
  Building2, // ✅ FIX - Para métricas por sede
  FolderOpen, // ✅ CARPETA DIGITAL
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../ui/avatar";
import { PaginationPremium } from "../shared/PaginationPremium";
import { CreatePersonModal } from "./CreatePersonModal";
import { AssignAccessModal } from "./AssignAccessModal"; // ✅ MODAL ASIGNAR ACCESOS
import { EditUserModal } from "./EditUserModal"; // ✅ MODAL EDITAR CON SEDES
import { DashboardSedesMetrics } from "./DashboardSedesMetrics"; // ✅ DASHBOARD SEDES
import { ExportUsersBySede } from "./ExportUsersBySede"; // ✅ EXPORTAR POR SEDE
import { MOCK_USERS_WITH_SEDES } from "../../data/mockUsersWithSedes"; // ✅ USUARIOS CON SEDES
import { BadgesSedesUsuario } from "../estructura-organizacional/BadgesSedesUsuario"; // ✅ BADGES
import { SelectorEstructuraCompacto } from "../estructura-organizacional/SelectorEstructura"; // ✅ FILTRO
import { FiltroEstructuraOrganizacional } from "../estructura-organizacional/FiltroEstructuraOrganizacional"; // ✅ FILTRO COHERENTE
import { DigitalFolderSection } from "./DigitalFolderSection"; // ✅ CARPETA DIGITAL COMO SECCIÓN
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../ui/tabs"; // ✅ TABS
import { UserExpandedView } from "./UserExpandedView"; // ✅ VISTA EXPANDIDA REDISEÑADA
import { RolesYPermisosActualizado } from "./RolesYPermisosActualizado"; // ✅ RF015 - ROLES Y PERMISOS ACTUALIZADO
import { EstadisticasDocentesESAP } from "./EstadisticasDocentesESAP"; // ✅ ESTADÍSTICAS DOCENTES ESAP
import { GestionUsuariosPasswordTracking } from "./admin/GestionUsuariosPasswordTracking"; // ✅ GESTIÓN DE CONTRASEÑAS
import { ModalCambiarContrasena } from "./admin/ModalCambiarContrasena"; // ✅ MODAL CAMBIAR CONTRASEÑA
import React from "react";

// ✅ DÍA 4: Container4K para padding adaptativo
// ✅ DÍA 5: ResponsiveHeader para headers adaptativos
import { Container4K, ResponsiveHeader } from '@/components/ui';

export function UsersPersonsModulePremium() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] =
    useState<string>("all");
  const [
    unidadOrganizacionalFilter,
    setUnidadOrganizacionalFilter,
  ] = useState<string | undefined>(undefined); // ✅ FILTRO COHERENTE CON ESTRUCTURA
  const [expandedUserId, setExpandedUserId] = useState<
    string | null
  >(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignAccessModal, setShowAssignAccessModal] =
    useState(false); // ✅ MODAL ASIGNAR ACCESOS
  const [showEditModal, setShowEditModal] = useState(false); // ✅ MODAL EDITAR
  const [showSedesMetrics, setShowSedesMetrics] =
    useState(false); // ✅ DASHBOARD SEDES
  const [showExportModal, setShowExportModal] = useState(false); // ✅ MODAL EXPORTAR
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false); // ✅ MODAL CAMBIAR CONTRASEÑA
  const [viewMode, setViewMode] = useState<
    | "users"
    | "digital-folder"
    | "roles-permisos"
    | "estadisticas-docentes"
  >("users"); // ✅ NUEVO - Vista actual con RF015 + Estadísticas
  const [selectedUser, setSelectedUser] = useState<any | null>(
    null,
  ); // ✅ USUARIO SELECCIONADO
  const [isCreateModalOpen, setIsCreateModalOpen] =
    useState(false); // ✅ ESTADO MODAL CREAR
  const itemsPerPage = 10;

  // ✅ FIX: Manejo defensivo de datos - evitar crash si MOCK_USERS_WITH_SEDES no está definido
  const users = MOCK_USERS_WITH_SEDES || [];

  // Stats calculadas
  const stats = {
    total: users.length,
    active: users.filter(
      (u) => u.status === "active",
    ).length,
    blocked: users.filter(
      (u) => u.status === "blocked",
    ).length,
    growth: 12.5,
  };

  // Filtros únicos para los selectores
  const uniqueRoles = Array.from(
    new Set(
      users.flatMap((u) =>
        u.roles.map((r) => r.name),
      ),
    ),
  );
  const uniqueLocations = Array.from(
    new Set(users.map((u) => u.location)),
  );

  // Filtrado
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      searchQuery === "" ||
      `${user.firstName} ${user.lastName}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      user.email
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      (user.document && user.document.includes(searchQuery)) ||
      (user.documentNumber &&
        user.documentNumber.includes(searchQuery));

    const matchesStatus =
      statusFilter === "all" || user.status === statusFilter;
    const matchesRole =
      roleFilter === "all" ||
      user.roles.some((r) => r.name === roleFilter);
    const matchesLocation =
      locationFilter === "all" ||
      user.location === locationFilter;

    // ✅ FILTRO POR UNIDAD ORGANIZACIONAL (Coherente con estructura)
    const matchesUnidadOrganizacional =
      !unidadOrganizacionalFilter ||
      user.sedes.some(
        (sede) => sede.id === unidadOrganizacionalFilter,
      );

    return (
      matchesSearch &&
      matchesStatus &&
      matchesRole &&
      matchesLocation &&
      matchesUnidadOrganizacional
    );
  });

  // Paginación
  const totalPages = Math.ceil(
    filteredUsers.length / itemsPerPage,
  );
  const paginatedUsers = filteredUsers
    .slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage,
    )
    .map((user) => {
      // ✅ Extraer territorial y CETAP de las sedes asignadas
      const territorial = user.sedes.find(
        (sede) => sede.nivel === "territorial",
      );
      const cetap = user.sedes.find(
        (sede) => sede.nivel === "cetap",
      );
      const sedeCentral = user.sedes.find(
        (sede) => sede.nivel === "sede-central",
      );

      return {
        ...user,
        territorial: territorial
          ? {
            nombre: territorial.nombre,
            codigo: territorial.codigo,
            departamento: user.location, // Usando location como departamento
          }
          : null,
        cetap: cetap
          ? {
            nombre: cetap.nombre,
            codigo: cetap.codigo,
            ciudad: user.location,
          }
          : null,
        sedeCentral: sedeCentral
          ? {
            nombre: sedeCentral.nombre,
            codigo: sedeCentral.codigo,
          }
          : null,
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

  const handleSaveEdit = (userData: any) => {
    console.log("Guardando cambios de usuario:", userData);
    toast.success("Usuario Actualizado", {
      description: `${userData.firstName} ${userData.lastName} ha sido actualizado exitosamente.`,
    });
    setShowEditModal(false);
    setSelectedUser(null);
  };

  const handleDelete = async (user: (typeof MOCK_USERS)[0]) => {
    const confirmed = window.confirm(
      `¿Estás seguro de eliminar a ${user.firstName} ${user.lastName}?\n\nEsta acción no se puede deshacer.`,
    );

    if (confirmed) {
      toast.success("Usuario Eliminado", {
        description: `${user.firstName} ${user.lastName} ha sido eliminado del sistema.`,
      });
      // En producción: await deleteUser(user.id); refetch();
    }
  };

  const handleViewDetails = (user: (typeof MOCK_USERS)[0]) => {
    setExpandedUserId(
      expandedUserId === user.id ? null : user.id,
    );
  };

  // ✅ NUEVO: Asignar Accesos
  const handleAssignAccess = (user: (typeof MOCK_USERS)[0]) => {
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

  // ✅ NUEVO: Bloquear usuario
  const handleBlockUser = (user: (typeof MOCK_USERS)[0]) => {
    toast.success("Usuario Bloqueado", {
      description: `${user.firstName} ${user.lastName} ha sido bloqueado exitosamente.`,
    });
    // En producción: actualizar estado en backend y refrescar lista
  };

  // ✅ NUEVO: Activar usuario
  const handleActivateUser = (user: (typeof MOCK_USERS)[0]) => {
    toast.success("Usuario Activado", {
      description: `${user.firstName} ${user.lastName} ha sido activado exitosamente.`,
    });
    // En producción: actualizar estado en backend y refrescar lista
  };

  // ✅ NUEVO: Handler para crear usuario
  const handleCreateUser = (userData: any) => {
    console.log("Creando usuario:", userData);
    toast.success("Usuario Creado Exitosamente", {
      description: `${userData.firstName} ${userData.lastName} ha sido registrado.`,
    });
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
    toast.info("Historial de Contraseñas", {
      description: `Mostrando historial de ${user.firstName} ${user.lastName}`,
    });
    // En producción: abrir modal con historial de cambios
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setRoleFilter("all");
    setLocationFilter("all");
  };

  const hasActiveFilters =
    searchQuery ||
    statusFilter !== "all" ||
    roleFilter !== "all" ||
    locationFilter !== "all";

  // ✅ FILTROS RÁPIDOS POR ROL - Contadores de usuarios por rol
  const quickFiltersData = [
    {
      role: 'Docente',
      code: 'DOCENTE',
      icon: Users,
      color: '#2962FF',
      bgColor: '#EFF6FF',
      borderColor: '#3B82F6',
      count: users.filter(u => u.roles.some(r => r.name === 'Docente')).length
    },
    {
      role: 'Estudiante',
      code: 'ESTUDIANTE',
      icon: UserCheck,
      color: '#10B981',
      bgColor: '#D1FAE5',
      borderColor: '#10B981',
      count: users.filter(u => u.roles.some(r => r.name === 'Estudiante')).length
    },
    {
      role: 'Coordinador Académico',
      code: 'COORD_ACAD',
      icon: Shield,
      color: '#8B5CF6',
      bgColor: '#EDE9FE',
      borderColor: '#8B5CF6',
      count: users.filter(u => u.roles.some(r => r.name === 'Coordinador Académico')).length
    },
    {
      role: 'Director Territorial',
      code: 'DIR_TERRITORIAL',
      icon: Building2,
      color: '#F59E0B',
      bgColor: '#FEF3C7',
      borderColor: '#F59E0B',
      count: users.filter(u => u.roles.some(r => r.name === 'Director Territorial')).length
    },
    {
      role: 'Directivo',
      code: 'DIRECTIVO',
      icon: Shield,
      color: '#EF4444',
      bgColor: '#FEE2E2',
      borderColor: '#EF4444',
      count: users.filter(u => u.roles.some(r => r.name === 'Directivo')).length
    },
  ];

  // Si estamos en la vista de carpeta digital, mostrar esa sección
  if (viewMode === "digital-folder") {
    return (
      <DigitalFolderSection
        onBack={() => setViewMode("users")}
        initialUserId={selectedUser?.id}
        users={users.map((u) => ({
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          document: u.document,
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

  return (
    <Container4K className="space-y-6">
      {/* Header - DÍA 5: ResponsiveHeader */}
      <ResponsiveHeader
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

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-3 border-2 border-[#D1D5DB] rounded-lg bg-white cursor-pointer font-medium text-sm transition-all"
              style={{ height: "44px" }}
            >
              <option value="all">Todos los roles</option>
              {uniqueRoles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>

            <select
              value={locationFilter}
              onChange={(e) =>
                setLocationFilter(e.target.value)
              }
              className="px-4 py-3 border-2 border-[#D1D5DB] rounded-lg bg-white cursor-pointer font-medium text-sm transition-all"
              style={{ height: "44px" }}
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
                Rol: {roleFilter}
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

      {/* ✅ TARJETAS DE FILTROS RÁPIDOS POR ROL */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.18 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4"
      >
        {quickFiltersData.map((filter) => {
          const Icon = filter.icon;
          const isActive = roleFilter === filter.role;

          return (
            <motion.button
              key={filter.code}
              onClick={() => {
                if (isActive) {
                  setRoleFilter("all");
                  toast.info("Filtro Eliminado", {
                    description: `Se eliminó el filtro de ${filter.role}`,
                  });
                } else {
                  setRoleFilter(filter.role);
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
                  border: `2px solid ${filter.borderColor}20`
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
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card className="overflow-hidden">
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
                  Mostrando {paginatedUsers.length} de{" "}
                  {filteredUsers.length} usuarios
                </p>
              </div>
              <Badge
                variant="outline"
                className="font-semibold"
              >
                Total: {filteredUsers.length}
              </Badge>
            </div>
          </div>

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
                  <th
                    className="text-left font-semibold uppercase"
                    style={{
                      padding: "12px 16px",
                      fontSize: "12px",
                      lineHeight: "16px",
                      color: "#6B7280",
                      letterSpacing: "0.5px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Usuario
                  </th>
                  <th
                    className="text-left font-semibold uppercase"
                    style={{
                      padding: "12px 16px",
                      fontSize: "12px",
                      lineHeight: "16px",
                      color: "#6B7280",
                      letterSpacing: "0.5px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Roles
                  </th>
                  <th
                    className="text-left font-semibold uppercase"
                    style={{
                      padding: "12px 16px",
                      fontSize: "12px",
                      lineHeight: "16px",
                      color: "#6B7280",
                      letterSpacing: "0.5px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Territorial
                  </th>
                  <th
                    className="text-left font-semibold uppercase"
                    style={{
                      padding: "12px 16px",
                      fontSize: "12px",
                      lineHeight: "16px",
                      color: "#6B7280",
                      letterSpacing: "0.5px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    CETAP
                  </th>
                  <th
                    className="text-center font-semibold uppercase"
                    style={{
                      padding: "12px 16px",
                      fontSize: "12px",
                      lineHeight: "16px",
                      color: "#6B7280",
                      letterSpacing: "0.5px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Carpeta Digital
                  </th>
                  <th
                    className="text-left font-semibold uppercase"
                    style={{
                      padding: "12px 16px",
                      fontSize: "12px",
                      lineHeight: "16px",
                      color: "#6B7280",
                      letterSpacing: "0.5px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Estado
                  </th>
                  <th
                    className="text-left font-semibold uppercase"
                    style={{
                      padding: "12px 16px",
                      fontSize: "12px",
                      lineHeight: "16px",
                      color: "#6B7280",
                      letterSpacing: "0.5px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Última Actividad
                  </th>
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
                {paginatedUsers.flatMap((user, index) => {
                  const isExpanded = expandedUserId === user.id;

                  const mainRow = (
                    <motion.tr
                      key={`user-row-${user.id}`}
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
                          </div>
                        </div>
                      </td>

                      {/* Celda Roles - Mostrar todos los roles simultáneos */}
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

                      {/* ✅ Celda Territorial */}
                      <td
                        style={{
                          padding: "16px",
                          verticalAlign: "middle",
                        }}
                      >
                        {user.territorial ? (
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-green-600" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {user.territorial.nombre}
                              </p>
                              {user.territorial
                                .departamento && (
                                  <p className="text-xs text-gray-500">
                                    {
                                      user.territorial
                                        .departamento
                                    }
                                  </p>
                                )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">
                            Sin territorial
                          </span>
                        )}
                      </td>

                      {/* ✅ Celda CETAP */}
                      <td
                        style={{
                          padding: "16px",
                          verticalAlign: "middle",
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
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
                          <span className="text-xs text-gray-400">
                            Sin CETAP
                          </span>
                        )}
                      </td>

                      {/* ✅ Celda Carpeta Digital */}
                      <td
                        style={{
                          padding: "16px",
                          verticalAlign: "middle",
                        }}
                      >
                        <div className="flex items-center justify-center gap-2">
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

                      {/* Celda Estado */}
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

                      {/* Celda Última Actividad */}
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
                                className="bg-blue-50 hover:bg-blue-100"
                                style={{ color: "#003DA5" }}
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
                              <DropdownMenuItem
                                onClick={() =>
                                  handleAssignAccess(user)
                                }
                                className="bg-amber-50 hover:bg-amber-100"
                                style={{ color: "#D97706" }}
                              >
                                <Shield className="w-4 h-4 mr-2" />
                                Asignar Accesos
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {/* ✅ Acciones de Contraseña */}
                              <DropdownMenuItem
                                onClick={() =>
                                  handleSendPasswordReminder(user)
                                }
                                className="bg-orange-50 hover:bg-orange-100"
                                style={{ color: "#EA580C" }}
                              >
                                <Mail className="w-4 h-4 mr-2" />
                                Enviar Recordatorio
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleForcePasswordChange(user)
                                }
                                className="bg-yellow-50 hover:bg-yellow-100"
                                style={{ color: "#D97706" }}
                              >
                                <Lock className="w-4 h-4 mr-2" />
                                Restablecer Contraseña
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleViewPasswordHistory(user)
                                }
                                className="bg-blue-50 hover:bg-blue-100"
                                style={{ color: "#2563EB" }}
                              >
                                <Clock className="w-4 h-4 mr-2" />
                                Ver Historial Contraseñas
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  handleDelete(user)
                                }
                                style={{ color: "#EF4444" }}
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
                  );

                  // Return array with main row and conditionally expanded row
                  if (isExpanded) {
                    const expandedRow = (
                      <motion.tr
                        key={`user-expanded-${user.id}`}
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
                    return [mainRow, expandedRow];
                  }

                  return [mainRow];
                })}
              </tbody>
            </table>
          </div>

          {/* Vista Mobile - Cards */}
          <div
            className="lg:hidden divide-y"
            style={{ borderColor: "#E5E7EB" }}
          >
            <AnimatePresence mode="popLayout">
              {paginatedUsers.map((user, index) => (
                <motion.div
                  key={user.id}
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
                            className="bg-blue-50 hover:bg-blue-100"
                            style={{ color: "#003DA5" }}
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
                          <DropdownMenuItem
                            onClick={() =>
                              handleAssignAccess(user)
                            }
                            className="bg-amber-50 hover:bg-amber-100"
                            style={{ color: "#D97706" }}
                          >
                            <Shield className="w-4 h-4 mr-2" />
                            Asignar Accesos
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(user)}
                            style={{ color: "#EF4444" }}
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
                totalItems={filteredUsers.length}
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

      {/* ✅ Modal Exportar Usuarios por Sede */}
      <ExportUsersBySede
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        usuarios={filteredUsers}
      />

      {/* ✅ Modal Cambiar Contraseña */}
      {showChangePasswordModal && selectedUser && (
        <ModalCambiarContrasena
          isOpen={showChangePasswordModal}
          onClose={() => {
            setShowChangePasswordModal(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
          mode="admin-reset"
        />
      )}
    </Container4K>
  );
}
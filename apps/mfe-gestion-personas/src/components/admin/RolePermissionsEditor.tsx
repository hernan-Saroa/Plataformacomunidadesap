import { Fragment, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@esap-mfe/shared-ui/dialog';
import { Button } from '@esap-mfe/shared-ui/button';
import { Input } from '@esap-mfe/shared-ui/input';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { motion } from 'motion/react';
import {
  Shield,
  Check,
  X,
  Search,
  Save,
  RotateCcw,
  CheckCircle,
  Circle,
  MinusCircle,
  Users,
  GraduationCap,
  Award,
  FileText,
  MessageSquare,
  Briefcase,
  ClipboardList,
  FolderOpen,
  BarChart3,
  ScrollText,
  Cog,
  TrendingUp,
  Building2,
  BookOpen,
  CalendarDays,
  FileCheck,
  UserPlus,
  Activity,
  Database,
  Settings,
  Bell,
  Scale,
  Clock,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

// Importar configuración centralizada de permisos (fallback)
import { PERMISSION_MODULES } from '../../data/permissions-config-updated';
import type { Permission, PermissionModule } from '../../data/permissions-config-updated';
import { modulesService } from '../../services/api/modules.service';
import { rolesService } from '../../services/api';

interface SystemRole {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
}

interface RolePermissionsEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: SystemRole;
  onSaved?: () => void;
}

type PermissionWithCode = Permission & { code?: string };
type PermissionModuleWithCodes = Omit<PermissionModule, 'permissions' | 'permissionGroups'> & {
  permissions: PermissionWithCode[];
  permissionGroups?: { group: string; permissions: PermissionWithCode[] }[];
};

type AcademicProfileId = 'head' | 'approver' | 'reviewer';

interface AcademicProfile {
  id: AcademicProfileId;
  label: string;
  required: string[];
  allowed: string[];
}

const GRADUATES_PERMISSION_CODES = [
  'graduates.edit',
  'graduates.export',
  'graduates.verify_certificate',
];

const TITLE_VERIFICATION_PERMISSION_CODES = [
  'graduates-certificates.solicitude.aprobar',
  'graduates-certificates.certificates.view',
  'graduates-certificates.certificates.edit',
  'graduates-certificates.solicitude.review',
  'graduates-certificates.certificates.export',
  'graduates-certificates.solicitude.rechazar',
  'graduates-certificates.certificates.reenviar',
  'graduates-certificates.solicitude.view',
];

const ACADEMIC_PERMISSION_CODES = new Set([
  ...GRADUATES_PERMISSION_CODES,
  ...TITLE_VERIFICATION_PERMISSION_CODES,
]);

const ACADEMIC_PROFILES: AcademicProfile[] = [
  {
    id: 'head',
    label: 'Jefe',
    allowed: [...GRADUATES_PERMISSION_CODES, ...TITLE_VERIFICATION_PERMISSION_CODES],
    required: [
      'graduates.edit',
      'graduates.export',
      'graduates.verify_certificate',
      'graduates-certificates.solicitude.aprobar',
      'graduates-certificates.certificates.view',
      'graduates-certificates.certificates.edit',
      'graduates-certificates.certificates.export',
      'graduates-certificates.solicitude.rechazar',
      'graduates-certificates.certificates.reenviar',
    ],
  },
  {
    id: 'approver',
    label: 'Aprobador',
    allowed: [
      'graduates.verify_certificate',
      'graduates-certificates.solicitude.aprobar',
      'graduates-certificates.certificates.view',
      'graduates-certificates.certificates.edit',
      'graduates-certificates.solicitude.review',
      'graduates-certificates.solicitude.rechazar',
      'graduates-certificates.certificates.reenviar',
      'graduates-certificates.solicitude.view',
    ],
    required: [
      'graduates.verify_certificate',
      'graduates-certificates.solicitude.aprobar',
      'graduates-certificates.certificates.view',
      'graduates-certificates.solicitude.rechazar',
      'graduates-certificates.certificates.reenviar',
    ],
  },
  {
    id: 'reviewer',
    label: 'Revisor',
    allowed: [
      'graduates.verify_certificate',
      'graduates-certificates.certificates.view',
      'graduates-certificates.solicitude.review',
      'graduates-certificates.certificates.reenviar',
      'graduates-certificates.solicitude.view',
    ],
    required: [
      'graduates.verify_certificate',
      'graduates-certificates.certificates.view',
      'graduates-certificates.solicitude.review',
      'graduates-certificates.solicitude.view',
    ],
  },
];

const getPermissionCode = (permission: PermissionWithCode) => permission.code || permission.id;

const getPermissionMaps = (modules: PermissionModuleWithCodes[]) => {
  const idToCode = new Map<string, string>();
  const codeToId = new Map<string, string>();

  modules.forEach((module) => {
    module.permissions.forEach((permission) => {
      const code = getPermissionCode(permission);
      idToCode.set(permission.id, code);
      codeToId.set(code, permission.id);
    });
  });

  return { idToCode, codeToId };
};

const getSelectedPermissionCodes = (
  selectedIds: Set<string>,
  modules: PermissionModuleWithCodes[],
) => {
  const { idToCode } = getPermissionMaps(modules);
  return Array.from(selectedIds)
    .map((permissionId) => idToCode.get(permissionId))
    .filter((code): code is string => Boolean(code));
};

const matchesAcademicProfile = (
  profile: AcademicProfile,
  selectedCodes: string[],
) => {
  const selectedCodeSet = new Set(selectedCodes);
  const hasRequired = profile.required.every((code) => selectedCodeSet.has(code));
  if (!hasRequired) return false;

  return selectedCodes.every((code) => {
    if (!ACADEMIC_PERMISSION_CODES.has(code)) return true;
    return profile.allowed.includes(code);
  });
};

const getActiveAcademicProfile = (
  selectedIds: Set<string>,
  modules: PermissionModuleWithCodes[],
) => {
  const selectedCodes = getSelectedPermissionCodes(selectedIds, modules);
  return ACADEMIC_PROFILES.find((profile) =>
    matchesAcademicProfile(profile, selectedCodes),
  ) || null;
};

export function RolePermissionsEditor({ 
  open, 
  onOpenChange,
  role,
  onSaved
}: RolePermissionsEditorProps) {
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [permissionModules, setPermissionModules] = useState<PermissionModuleWithCodes[]>(PERMISSION_MODULES as PermissionModuleWithCodes[]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeAcademicProfileId, setActiveAcademicProfileId] = useState<AcademicProfileId | null>(null);
  const activeAcademicProfile = activeAcademicProfileId
    ? ACADEMIC_PROFILES.find((profile) => profile.id === activeAcademicProfileId) || null
    : null;

  const iconMap: Record<string, any> = {
    Shield,
    Users,
    GraduationCap,
    Award,
    FileText,
    MessageSquare,
    Briefcase,
    ClipboardList,
    FolderOpen,
    BarChart3,
    ScrollText,
    Cog,
    TrendingUp,
    Building2,
    BookOpen,
    CalendarDays,
    FileCheck,
    UserPlus,
    Activity,
    Database,
    Settings,
    Bell,
    Scale,
    Clock
  };

  const resolveIcon = (icon: any) => {
    if (typeof icon === 'string') {
      return iconMap[icon] || Shield;
    }
    return icon || Shield;
  };

  const formatGroupName = (group: string) => (group || '').split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ').trim() || 'Grupo';

  useEffect(() => {
    if (!open || !role?.id) return;

    let cancelled = false;
    const loadPermissions = async () => {
      setPermissionsLoading(true);
      try {
        const [modules, rolePermissions] = await Promise.all([
          modulesService.getModulesWithPermissions({ is_active: true }),
          rolesService.getRolePermissions(role.id),
        ]);

        if (cancelled) return;
        const mappedModules = modulesService.mapToPermissionModules(modules) as PermissionModuleWithCodes[];
        const loadedPermissions = new Set(rolePermissions.map((permission) => permission.id));
        const loadedAcademicProfile = getActiveAcademicProfile(
          loadedPermissions,
          mappedModules,
        );

        setPermissionModules(mappedModules);
        setSelectedPermissions(loadedPermissions);
        setActiveAcademicProfileId(loadedAcademicProfile?.id || null);
        setHasChanges(false);
      } catch (error) {
        console.error('Error loading permissions:', error);
        toast.error('Error al cargar permisos', {
          description: 'No se pudo obtener la lista de permisos desde el servidor'
        });
        if (!cancelled) {
          setPermissionModules(PERMISSION_MODULES as PermissionModuleWithCodes[]);
          setActiveAcademicProfileId(null);
        }
      } finally {
        if (!cancelled) setPermissionsLoading(false);
      }
    };

    loadPermissions();

    return () => {
      cancelled = true;
    };
  }, [open, role.id]);

  const getPermissionAcademicState = (
    permission: PermissionWithCode,
  ): 'required' | 'optional' | 'outside' | null => {
    if (!activeAcademicProfile) return null;

    const code = getPermissionCode(permission);
    if (!ACADEMIC_PERMISSION_CODES.has(code)) return null;
    if (activeAcademicProfile.required.includes(code)) return 'required';
    if (activeAcademicProfile.allowed.includes(code)) return 'optional';
    return 'outside';
  };

  // Toggle permission
  const togglePermission = (permission: PermissionWithCode) => {
    const code = getPermissionCode(permission);

    if (
      activeAcademicProfile &&
      ACADEMIC_PERMISSION_CODES.has(code) &&
      !activeAcademicProfile.allowed.includes(code) &&
      !selectedPermissions.has(permission.id)
    ) {
      toast.warning('Permiso fuera del perfil', {
        description: `Ese permiso no hace parte del maximo permitido para ${activeAcademicProfile.label}. Desmarca el perfil para elegirlo manualmente.`,
      });
      return;
    }

    const newPermissions = new Set(selectedPermissions);
    if (newPermissions.has(permission.id)) {
      newPermissions.delete(permission.id);
      if (activeAcademicProfile?.required.includes(code)) {
        setActiveAcademicProfileId(null);
        toast.warning('Permiso necesario', {
          description: `Ese permiso es necesario para ser ${activeAcademicProfile.label}. Al quitarlo se desmarca ${activeAcademicProfile.label}.`,
        });
      }
    } else {
      newPermissions.add(permission.id);
    }
    setSelectedPermissions(newPermissions);
    setHasChanges(true);
  };

  // Toggle all permissions in module
  const toggleModulePermissions = (modulePermissions: PermissionWithCode[]) => {
    const toggleablePermissions =
      activeAcademicProfile
        ? modulePermissions.filter((permission) => {
            const code = getPermissionCode(permission);
            return (
              !ACADEMIC_PERMISSION_CODES.has(code) ||
              activeAcademicProfile.allowed.includes(code)
            );
          })
        : modulePermissions;
    const blockedAcademicCount = activeAcademicProfile
      ? modulePermissions.length - toggleablePermissions.length
      : 0;
    const modulePermissionIds = toggleablePermissions.map(p => p.id);
    const allSelected = modulePermissionIds.every(id => selectedPermissions.has(id));
    
    const newPermissions = new Set(selectedPermissions);
    if (allSelected) {
      modulePermissionIds.forEach(id => newPermissions.delete(id));
      if (
        activeAcademicProfile &&
        toggleablePermissions.some((permission) =>
          activeAcademicProfile.required.includes(getPermissionCode(permission)),
        )
      ) {
        setActiveAcademicProfileId(null);
        toast.warning('Perfil desmarcado', {
          description: `Quitaste permisos necesarios para ser ${activeAcademicProfile.label}.`,
        });
      }
    } else {
      modulePermissionIds.forEach(id => newPermissions.add(id));
      if (blockedAcademicCount > 0) {
        toast.info('Permisos fuera del perfil omitidos', {
          description: `No se marcaron ${blockedAcademicCount} permisos fuera del maximo de ${activeAcademicProfile?.label}.`,
        });
      }
    }
    setSelectedPermissions(newPermissions);
    setHasChanges(true);
  };

  const applyAcademicProfile = (profile: AcademicProfile) => {
    const { idToCode, codeToId } = getPermissionMaps(permissionModules);
    const newPermissions = new Set(selectedPermissions);

    if (activeAcademicProfile?.id === profile.id) {
      profile.required.forEach((code) => {
        const permissionId = codeToId.get(code);
        if (permissionId) newPermissions.delete(permissionId);
      });
      setActiveAcademicProfileId(null);
      toast.info(`${profile.label} desmarcado`, {
        description: 'Los permisos opcionales que ya estaban activos se conservaron.',
      });
    } else {
      Array.from(newPermissions).forEach((permissionId) => {
        const code = idToCode.get(permissionId);
        if (code && ACADEMIC_PERMISSION_CODES.has(code)) {
          newPermissions.delete(permissionId);
        }
      });

      profile.required.forEach((code) => {
        const permissionId = codeToId.get(code);
        if (permissionId) newPermissions.add(permissionId);
      });
      setActiveAcademicProfileId(profile.id);

      toast.success(`${profile.label} seleccionado`, {
        description: 'Se aplicaron los permisos necesarios; los opcionales quedan disponibles para elegir.',
      });
    }

    setSelectedPermissions(newPermissions);
    setHasChanges(true);
  };

  // Save permissions
  const handleSave = async () => {
    try {
      setIsSaving(true);
      await rolesService.updateRolePermissions(role.id, Array.from(selectedPermissions));
      toast.success('Permisos Guardados', {
        description: `Se actualizaron ${selectedPermissions.size} permisos para el rol "${role.name}"`
      });
      setHasChanges(false);
      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('Error al guardar permisos', {
        description: 'No se pudieron guardar los permisos del rol'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset permissions
  const handleReset = () => {
    setSelectedPermissions(new Set());
    setActiveAcademicProfileId(null);
    setHasChanges(selectedPermissions.size > 0);
  };

  // Filter modules
  const filteredModules = permissionModules.filter(module =>
    module.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    module.permissions.some(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const totalPermissions = permissionModules.reduce((acc, m) => acc + m.permissions.length, 0);
  const selectedCount = selectedPermissions.size;
  const progressPercent = totalPermissions > 0 ? (selectedCount / totalPermissions) * 100 : 0;
  const firstAcademicModuleId = filteredModules.find((module) =>
    module.permissions.some((permission) =>
      ACADEMIC_PERMISSION_CODES.has(getPermissionCode(permission)),
    ),
  )?.id;

  const renderAcademicProfileSelector = () => (
    <div className="rounded-xl border-2 border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-slate-900">
            Perfil de Registro Academico
          </p>
          <p className="text-xs font-semibold text-slate-500">
            {activeAcademicProfile
              ? `${activeAcademicProfile.label} activo`
              : 'Sin perfil activo'}
          </p>
        </div>
        {activeAcademicProfile && (
          <Badge className="bg-green-100 text-green-700 border border-green-200">
            {activeAcademicProfile.required.length} necesarios
          </Badge>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {ACADEMIC_PROFILES.map((profile) => {
          const isActive = activeAcademicProfile?.id === profile.id;
          const optionalCount = profile.allowed.length - profile.required.length;

          return (
            <button
              key={profile.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => applyAcademicProfile(profile)}
              className={`min-h-[72px] rounded-lg border-2 p-3 text-left transition-all ${
                isActive
                  ? 'border-green-400 bg-green-50 shadow-sm'
                  : 'border-slate-200 bg-slate-50 hover:border-[#1e5da8] hover:bg-white'
              }`}
            >
              <div className="flex items-start gap-2">
                <span
                  className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border ${
                    isActive
                      ? 'border-green-500 bg-green-500 text-white'
                      : 'border-slate-300 bg-white text-transparent'
                  }`}
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-extrabold text-slate-900">
                    {profile.label}
                  </span>
                  <span className="mt-1 block text-xs font-semibold text-slate-500">
                    {profile.required.length} necesarios / {optionalCount} opcionales
                  </span>
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-extrabold text-[--esap-gray-900] flex items-center gap-3">
            <Shield className="w-7 h-7" style={{ color: role.color }} />
            Permisos: {role.name}
          </DialogTitle>
          <DialogDescription className="text-base font-medium">
            Selecciona los permisos específicos que tendrá este rol en cada módulo del sistema
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-gray-900">
              Permisos Asignados
            </span>
            <Badge className="bg-[#1e5da8] text-white font-bold">
              {selectedCount} / {totalPermissions}
            </Badge>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              className="h-full bg-gradient-to-r from-[#1e5da8] to-blue-600"
            />
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar permisos por módulo o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 border-2 border-gray-300 focus:border-[#1e5da8] font-medium"
            />
          </div>
        </div>

        {/* Permissions List */}
        <div className="flex-1 overflow-y-auto px-6 space-y-4">
          {permissionsLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-gray-500">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Cargando permisos...
            </div>
          ) : (
            filteredModules.map((module) => {
              const Icon = resolveIcon(module.icon);
              const modulePermissions = module.permissions;
              const modulePermissionsGroups = module.permissionGroups || [];  
              const enabledCount = modulePermissions.filter(p => 
                selectedPermissions.has(p.id)
              ).length;
              const allSelected = enabledCount === modulePermissions.length;
              const someSelected = enabledCount > 0 && enabledCount < modulePermissions.length;

              return (
                <Fragment key={module.id}>
                  {module.id === firstAcademicModuleId && renderAcademicProfileSelector()}
                  <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl p-5 border-2 border-gray-200 hover:border-[#1e5da8] transition-all"
                >
                  {/* Module Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${module.bgColor}`}>
                        <Icon className={`w-5 h-5 ${module.color}`} strokeWidth={2} />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-[--esap-gray-900]">{module.name}</h3>
                        <p className="text-xs font-medium text-[--esap-gray-600]">
                          {enabledCount}/{modulePermissions.length} permisos activos
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleModulePermissions(modulePermissions)}
                      className={`p-2 rounded-lg transition-all ${
                        allSelected
                          ? 'bg-green-500 text-white hover:bg-green-600'
                          : someSelected
                          ? 'bg-amber-500 text-white hover:bg-amber-600'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                      title={allSelected ? 'Desmarcar todo' : 'Marcar todo'}
                    >
                      {allSelected ? (
                        <CheckCircle className="w-5 h-5" strokeWidth={2} />
                      ) : someSelected ? (
                        <MinusCircle className="w-5 h-5" strokeWidth={2} />
                      ) : (
                        <Circle className="w-5 h-5" strokeWidth={2} />
                      )}
                    </button>
                  </div>

                  {/* Permissions */}
                  {modulePermissionsGroups.length > 0 ? (
                    <div className="space-y-4">
                      {modulePermissionsGroups.map((permissionGroup) => (
                        <div key={permissionGroup.group} className="space-y-2">
                          <p className="text-md font-bold text-gray-800" style={{ margin: 0 }}>
                            {formatGroupName(permissionGroup.group)}
                          </p>
                          <hr></hr>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 px-3">
                            {permissionGroup.permissions.map((permission) => {
                              const isEnabled = selectedPermissions.has(permission.id);
                              const academicState = getPermissionAcademicState(permission);
                              const isBlockedByProfile = academicState === 'outside' && !isEnabled;
                              const inactiveClass =
                                academicState === 'optional'
                                  ? 'bg-slate-50 border-slate-300 hover:border-slate-400 hover:bg-slate-100'
                                  : academicState === 'outside'
                                    ? 'bg-amber-50 border-amber-200 opacity-75 cursor-not-allowed'
                                    : 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:bg-gray-100';
                              return (
                                <button
                                  key={permission.id}
                                  type="button"
                                  disabled={isBlockedByProfile}
                                  onClick={() => togglePermission(permission)}
                                  className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                                    isEnabled
                                      ? 'bg-green-50 border-green-300 hover:bg-green-100'
                                      : inactiveClass
                                  }`}
                                >
                                  <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                    isEnabled ? 'bg-green-500' : 'bg-gray-300'
                                  }`}>
                                    {isEnabled && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <p className="font-bold text-sm text-[--esap-gray-900]">{permission.name}</p>
                                      {academicState === 'required' && (
                                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-normal text-green-700">
                                          Necesario
                                        </span>
                                      )}
                                      {academicState === 'optional' && (
                                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-normal text-slate-600">
                                          Opcional
                                        </span>
                                      )}
                                      {academicState === 'outside' && (
                                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-normal text-amber-700">
                                          Fuera del perfil
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs font-medium text-[--esap-gray-600] mt-0.5">
                                      {permission.description}
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) :(
                  <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {modulePermissions.map((permission) => {
                      const isEnabled = selectedPermissions.has(permission.id);
                      const academicState = getPermissionAcademicState(permission);
                      const isBlockedByProfile = academicState === 'outside' && !isEnabled;
                      const inactiveClass =
                        academicState === 'optional'
                          ? 'bg-slate-50 border-slate-300 hover:border-slate-400 hover:bg-slate-100'
                          : academicState === 'outside'
                            ? 'bg-amber-50 border-amber-200 opacity-75 cursor-not-allowed'
                            : 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:bg-gray-100';

                      return (
                        <button
                          key={permission.id}
                          type="button"
                          disabled={isBlockedByProfile}
                          onClick={() => togglePermission(permission)}
                          className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                            isEnabled
                              ? 'bg-green-50 border-green-300 hover:bg-green-100'
                              : inactiveClass
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            isEnabled ? 'bg-green-500' : 'bg-gray-300'
                          }`}>
                            {isEnabled && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="font-bold text-sm text-[--esap-gray-900]">{permission.name}</p>
                              {academicState === 'required' && (
                                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-normal text-green-700">
                                  Necesario
                                </span>
                              )}
                              {academicState === 'optional' && (
                                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-normal text-slate-600">
                                  Opcional
                                </span>
                              )}
                              {academicState === 'outside' && (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-normal text-amber-700">
                                  Fuera del perfil
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-medium text-[--esap-gray-600] mt-0.5">
                              {permission.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  </>
                  )}
                  </motion.div>
                </Fragment>
              );
            })
          )}
        </div>

        {/* Actions Footer */}
        <div className="px-6 py-4 border-t bg-gray-50">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <Button
              variant="outline"
              onClick={handleReset}
              className="w-full sm:w-auto font-bold border-2 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Limpiar Todo
            </Button>
            <div className="flex gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 sm:flex-none font-bold border-2"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className="flex-1 sm:flex-none bg-gradient-to-r from-[#1e5da8] to-blue-600 hover:from-[#1a4d8a] hover:to-blue-700 text-white font-bold shadow-lg disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Permisos
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

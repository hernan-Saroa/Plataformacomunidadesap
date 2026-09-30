import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userRolesService, type UserRole } from '../services/api/userRolesService';
import { toast } from '../utils/toast';

export function useUserRoles(userId: string) {
  const queryClient = useQueryClient();

  // Obtener todos los roles
  const { data: rolesData, isLoading } = useQuery({
    queryKey: ['user-roles', userId],
    queryFn: () => userRolesService.getUserRoles(userId),
    enabled: !!userId,
  });

  // Obtener solo roles activos
  const { data: activeRoles } = useQuery({
    queryKey: ['user-roles', userId, 'active'],
    queryFn: () => userRolesService.getActiveRoles(userId),
    enabled: !!userId,
  });

  // Obtener rol principal
  const { data: principalRole } = useQuery({
    queryKey: ['user-roles', userId, 'principal'],
    queryFn: () => userRolesService.getPrincipalRole(userId),
    enabled: !!userId,
  });

  // Agregar rol
  const addRoleMutation = useMutation({
    mutationFn: (data: any) => userRolesService.addRole(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles', userId] });
      toast.success('Rol agregado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Error al agregar rol');
    },
  });

  // Desactivar rol
  const deactivateRoleMutation = useMutation({
    mutationFn: ({ roleId, data }: { roleId: string; data: { motivo_desactivacion: string } }) => 
      userRolesService.deactivateRole(userId, roleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles', userId] });
      toast.success('Rol desactivado');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Error al desactivar rol');
    },
  });

  // Establecer rol principal
  const setPrincipalMutation = useMutation({
    mutationFn: (roleId: string) => userRolesService.setPrincipalRole(userId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles', userId] });
      toast.success('Rol principal actualizado');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Error al actualizar rol principal');
    },
  });

  // Actualizar datos de rol
  const updateRoleDataMutation = useMutation({
    mutationFn: ({ roleId, data }: { roleId: string; data: Record<string, any> }) => 
      userRolesService.updateRoleData(userId, roleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles', userId] });
      toast.success('Datos de rol actualizados');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Error al actualizar datos');
    },
  });

  // Helpers
  const hasMultipleRoles = (activeRoles?.length || 0) > 1;
  const canSwitchView = hasMultipleRoles;

  return {
    // Data
    rolesActivos: rolesData?.activos || [],
    rolesHistoricos: rolesData?.historicos || [],
    activeRoles: activeRoles || [],
    principalRole,
    hasMultipleRoles,
    canSwitchView,

    // Loading
    isLoading,

    // Mutations
    addRole: addRoleMutation.mutate,
    deactivateRole: deactivateRoleMutation.mutate,
    setPrincipalRole: setPrincipalMutation.mutate,
    updateRoleData: updateRoleDataMutation.mutate,

    // Mutation states
    isAddingRole: addRoleMutation.isPending,
    isDeactivating: deactivateRoleMutation.isPending,
    isSettingPrincipal: setPrincipalMutation.isPending,
    isUpdatingData: updateRoleDataMutation.isPending,
  };
}

export default useUserRoles;

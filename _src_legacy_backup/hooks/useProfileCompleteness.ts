
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileCompletenessService } from '../services/api/profileCompletenessService';
import { toast } from '../utils/toast';

export function useProfileCompleteness(userId: string) {
  const queryClient = useQueryClient();

  // Obtener completitud de perfil
  const { data: completeness, isLoading } = useQuery({
    queryKey: ['profile-completeness', userId],
    queryFn: () => profileCompletenessService.getByUserId(userId),
    enabled: !!userId,
    staleTime: 30000, // 30 segundos
  });

  // Recalcular completitud
  const recalculateMutation = useMutation({
    mutationFn: () => profileCompletenessService.recalculate(userId),
    onSuccess: (data) => {
      queryClient.setQueryData(['profile-completeness', userId], data);
      toast.success('Completitud de perfil actualizada');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Error al recalcular completitud');
    },
  });

  // Actualizar perfil
  const updateProfileMutation = useMutation({
    mutationFn: (data: { seccion: string; datos: Record<string, any> }) => 
      profileCompletenessService.updateProfile(userId, data as any),
    onSuccess: (response) => {
      queryClient.setQueryData(['profile-completeness', userId], response.completeness);
      queryClient.invalidateQueries({ queryKey: ['users', userId] });
      toast.success('Perfil actualizado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Error al actualizar perfil');
    },
  });

  // Enviar recordatorio
  const sendReminderMutation = useMutation({
    mutationFn: () => profileCompletenessService.sendReminder(userId),
    onSuccess: () => {
      toast.success('Recordatorio enviado');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Error al enviar recordatorio');
    },
  });

  // Helpers
  const isComplete = completeness?.porcentaje_total === 100;
  const needsAttention = (completeness?.porcentaje_total || 0) < 50;
  const canAccessAllServices = isComplete;

  return {
    // Data
    completeness,
    porcentaje: completeness?.porcentaje_total || 0,
    isComplete,
    needsAttention,
    canAccessAllServices,
    camposFaltantes: completeness?.campos_faltantes || {
      obligatorios: [],
      importantes: [],
      documentos: [],
    },

    // Loading
    isLoading,

    // Mutations
    recalculate: recalculateMutation.mutate,
    updateProfile: updateProfileMutation.mutate,
    sendReminder: sendReminderMutation.mutate,

    // Mutation states
    isRecalculating: recalculateMutation.isPending,
    isUpdating: updateProfileMutation.isPending,
    isSendingReminder: sendReminderMutation.isPending,
  };
}

export default useProfileCompleteness;

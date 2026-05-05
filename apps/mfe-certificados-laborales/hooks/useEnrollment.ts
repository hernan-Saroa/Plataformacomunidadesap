import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { enrollmentService } from '../services/api/enrollmentService';
import { toast } from '../utils/toast';

export function useEnrollment() {
  const queryClient = useQueryClient();

  // Obtener todas las solicitudes
  const { data: requests, isLoading: isLoadingRequests } = useQuery({
    queryKey: ['enrollment', 'requests'],
    queryFn: () => enrollmentService.getAll(),
  });

  // Obtener solicitudes pendientes
  const { data: pendingRequests, isLoading: isLoadingPending } = useQuery({
    queryKey: ['enrollment', 'pending'],
    queryFn: () => enrollmentService.getPending(),
    refetchInterval: 30000, // Refetch cada 30 segundos
  });

  // Obtener estadísticas
  const { data: stats } = useQuery({
    queryKey: ['enrollment', 'stats'],
    queryFn: () => enrollmentService.getStats(),
    refetchInterval: 60000, // Refetch cada minuto
  });

  // Crear solicitud
  const createMutation = useMutation({
    mutationFn: enrollmentService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollment'] });
      toast.success('Solicitud de enrolamiento creada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Error al crear solicitud');
    },
  });

  // Aprobar solicitud
  const approveMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data?: any }) => 
      enrollmentService.approve(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollment'] });
      toast.success('Solicitud aprobada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Error al aprobar solicitud');
    },
  });

  // Rechazar solicitud
  const rejectMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { motivo_rechazo: string } }) => 
      enrollmentService.reject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollment'] });
      toast.success('Solicitud rechazada');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Error al rechazar solicitud');
    },
  });

  // Marcar como en revisión
  const reviewMutation = useMutation({
    mutationFn: (id: string) => enrollmentService.markAsReviewing(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollment'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Error al actualizar estado');
    },
  });

  return {
    // Data
    requests: requests?.data || [],
    totalRequests: requests?.total || 0,
    pendingRequests: pendingRequests || [],
    stats,

    // Loading states
    isLoadingRequests,
    isLoadingPending,

    // Mutations
    createEnrollment: createMutation.mutate,
    approveEnrollment: approveMutation.mutate,
    rejectEnrollment: rejectMutation.mutate,
    markAsReviewing: reviewMutation.mutate,

    // Mutation states
    isCreating: createMutation.isPending,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
  };
}

export default useEnrollment;

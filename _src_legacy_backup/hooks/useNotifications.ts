import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsService, type Notification } from '../services/api/notificationsService';
import { toast } from '../utils/toast';

export function useNotifications(userId: string) {
  const queryClient = useQueryClient();

  // Obtener notificaciones
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => notificationsService.getUserNotifications(userId),
    enabled: !!userId,
    refetchInterval: 30000, // Refetch cada 30 segundos
  });

  // Obtener contador de no leídas
  const { data: unreadCount } = useQuery({
    queryKey: ['notifications', userId, 'unread-count'],
    queryFn: () => notificationsService.getUnreadCount(userId),
    enabled: !!userId,
    refetchInterval: 15000, // Refetch cada 15 segundos
  });

  // Marcar como leída
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => 
      notificationsService.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
    },
  });

  // Marcar todas como leídas
  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsService.markAllAsRead(userId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
      if (data.count > 0) {
        toast.success(`${data.count} notificaciones marcadas como leídas`);
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Error al marcar como leídas');
    },
  });

  // Archivar notificación
  const archiveMutation = useMutation({
    mutationFn: (notificationId: string) => 
      notificationsService.archive(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
      toast.success('Notificación archivada');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Error al archivar');
    },
  });

  // Eliminar notificación
  const deleteMutation = useMutation({
    mutationFn: (notificationId: string) => 
      notificationsService.delete(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
      toast.success('Notificación eliminada');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Error al eliminar');
    },
  });

  // Crear notificación
  const createMutation = useMutation({
    mutationFn: notificationsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notificación creada');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Error al crear notificación');
    },
  });

  // Helpers
  const notifications = notificationsData?.data || [];
  const totalNotifications = notificationsData?.total || 0;
  const unreadNotifications = notificationsData?.no_leidas || 0;
  const hasUnread = (unreadCount || 0) > 0;

  // Filtrar notificaciones
  const getByPriority = (priority: string) => 
    notifications.filter((n: Notification) => n.prioridad === priority);
  
  const getByCategory = (category: string) => 
    notifications.filter((n: Notification) => n.categoria === category);

  const getUnreadOnly = () => 
    notifications.filter((n: Notification) => !n.leida);

  return {
    // Data
    notifications,
    totalNotifications,
    unreadNotifications,
    unreadCount: unreadCount || 0,
    hasUnread,

    // Helpers
    getByPriority,
    getByCategory,
    getUnreadOnly,

    // Loading
    isLoading,

    // Mutations
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    archive: archiveMutation.mutate,
    deleteNotification: deleteMutation.mutate,
    createNotification: createMutation.mutate,

    // Mutation states
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
    isArchiving: archiveMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isCreating: createMutation.isPending,
  };
}

export default useNotifications;

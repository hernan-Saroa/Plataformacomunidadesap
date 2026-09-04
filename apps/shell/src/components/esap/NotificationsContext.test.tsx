import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { NotificationsProvider, useNotifications, GlobalNotification } from './NotificationsContext';
import { notificationsService } from '../../services/api/notificationsService';
import { authService } from '../../services/api/authService';

// Bug reportado: los usuarios con rol RESUELVE_GESTION_LEGAL no veían notificaciones en la
// campanita (solo les llegaba correo al asignarles un proceso). La causa raíz era que este
// contexto filtraba las notificaciones visibles por `categoria` según el módulo activo, y la
// lista permitida para 'gestion-legal' (['ENVIADO', 'REENVIO', 'RESPUESTA']) nunca coincidía
// con la categoria real que envía el backend de gestión legal ('gestion-legal'), dejando la
// campanita vacía para CUALQUIER usuario mientras navegaba dentro del módulo.

vi.mock('../../services/api/notificationsService', () => ({
  notificationsService: {
    getUserNotifications: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    archive: vi.fn(),
    toggleFavorite: vi.fn(),
  },
}));

vi.mock('../../services/api/authService', () => ({
  authService: {
    getCurrentUser: vi.fn(),
  },
}));

function buildApiNotification(overrides: Partial<GlobalNotification> = {}) {
  return {
    id_notificacion: 'n-1',
    tipo_notificacion: 'PROCESO_ASIGNADO',
    titulo: 'Proceso asignado',
    mensaje: 'Se te asignó el proceso RAD-1',
    descripcion_corta: 'RAD-1 asignado',
    icono: 'Briefcase',
    color: '#1D4ED8',
    prioridad: 'Alta' as const,
    categoria: 'gestion-legal',
    leida: false,
    archivada: false,
    fecha_creacion: new Date().toISOString(),
    tiene_accion: true,
    email_enviado: false,
    email_abierto: false,
    ...overrides,
  };
}

function renderWithModule(currentModule?: string) {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <NotificationsProvider currentModule={currentModule}>{children}</NotificationsProvider>
  );
  return renderHook(() => useNotifications(), { wrapper });
}

describe('NotificationsContext — filtro de categoria por módulo (bug RESUELVE sin notificaciones)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (authService.getCurrentUser as any).mockReturnValue({ id: 'user-resuelve-1' });
  });

  it('gestion-legal: SÍ debe mostrar notificaciones reales del backend (categoria "gestion-legal")', async () => {
    (notificationsService.getUserNotifications as any).mockResolvedValue([
      buildApiNotification({ id_notificacion: 'n-1', categoria: 'gestion-legal' }),
    ]);

    const { result } = renderWithModule('gestion-legal');

    await waitFor(() => expect(result.current.notifications).toHaveLength(1));
    expect(result.current.unreadCount).toBe(1);
  });

  it('gestion-legal: una notificación de asignación de TAREA (TAREA_ASIGNADA, categoria "gestion-legal") también debe ser visible', async () => {
    (notificationsService.getUserNotifications as any).mockResolvedValue([
      buildApiNotification({
        id_notificacion: 'n-2',
        tipo_notificacion: 'TAREA_ASIGNADA',
        categoria: 'gestion-legal',
      }),
    ]);

    const { result } = renderWithModule('gestion-legal');

    await waitFor(() => expect(result.current.notifications).toHaveLength(1));
    expect(result.current.notifications[0].tipo_notificacion).toBe('TAREA_ASIGNADA');
  });

  it('gestion-legal: NO debe mostrar filas cuya categoria sea un valor de clasificación de correo (ENVIADO/REENVIO/RESPUESTA) — esas son de CorreoJuridico, no notificaciones', async () => {
    (notificationsService.getUserNotifications as any).mockResolvedValue([
      buildApiNotification({ id_notificacion: 'n-3', categoria: 'ENVIADO' }),
      buildApiNotification({ id_notificacion: 'n-4', categoria: 'REENVIO' }),
      buildApiNotification({ id_notificacion: 'n-5', categoria: 'RESPUESTA' }),
    ]);

    const { result } = renderWithModule('gestion-legal');

    await waitFor(() => expect(notificationsService.getUserNotifications).toHaveBeenCalled());
    // Da tiempo a que el setState posterior al await se resuelva antes de aserciones finales.
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.notifications).toHaveLength(0);
    expect(result.current.unreadCount).toBe(0);
  });

  it('control-disciplinario: sigue filtrando solo categoria DISCIPLINARIO (el fix no debe afectar otros módulos)', async () => {
    (notificationsService.getUserNotifications as any).mockResolvedValue([
      buildApiNotification({ id_notificacion: 'n-6', categoria: 'DISCIPLINARIO' }),
      buildApiNotification({ id_notificacion: 'n-7', categoria: 'gestion-legal' }),
    ]);

    const { result } = renderWithModule('control-disciplinario');

    await waitFor(() => expect(result.current.notifications).toHaveLength(1));
    expect(result.current.notifications[0].id_notificacion).toBe('n-6');
  });

  it('un módulo sin entrada en MODULE_NOTIFICATION_CATEGORIAS no filtra nada', async () => {
    (notificationsService.getUserNotifications as any).mockResolvedValue([
      buildApiNotification({ id_notificacion: 'n-8', categoria: 'gestion-legal' }),
      buildApiNotification({ id_notificacion: 'n-9', categoria: 'cualquier-otra' }),
    ]);

    const { result } = renderWithModule('modulo-sin-filtro-registrado');

    await waitFor(() => expect(result.current.notifications).toHaveLength(2));
  });

  it('sin currentModule (fuera de cualquier módulo, p.ej. dashboard raíz): muestra todas las notificaciones sin filtrar', async () => {
    (notificationsService.getUserNotifications as any).mockResolvedValue([
      buildApiNotification({ id_notificacion: 'n-10', categoria: 'gestion-legal' }),
      buildApiNotification({ id_notificacion: 'n-11', categoria: 'DISCIPLINARIO' }),
    ]);

    const { result } = renderWithModule(undefined);

    await waitFor(() => expect(result.current.notifications).toHaveLength(2));
  });
});

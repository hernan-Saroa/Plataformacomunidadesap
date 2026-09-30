/**
 * CONTEXTO GLOBAL DE NOTIFICACIONES
 * Sistema centralizado que integra notificaciones de todos los módulos
 */

'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// ============ TIPOS ============

export type TipoNotificacion =
  | 'info'
  | 'warning'
  | 'error'
  | 'success'
  | 'critical';

export type CategoriaNotificacion =
  | 'control-interno'
  | 'gestion-personas'
  | 'gestion-academica'
  | 'gestion-legal'
  | 'sistema'
  | 'general';

export interface Notificacion {
  id: string;
  categoria: CategoriaNotificacion;
  tipo: TipoNotificacion;
  titulo: string;
  descripcion: string;
  fecha: string;
  leida: boolean;
  url?: string; // URL de acción (ej: "/control-interno/plan-anual")
  metadata?: {
    modulo?: string;
    entidadId?: string;
    criticidad?: 'baja' | 'media' | 'alta' | 'critica';
    [key: string]: any;
  };
}

interface NotificacionesContextType {
  notificaciones: Notificacion[];
  notificacionesNoLeidas: number;
  agregarNotificacion: (notificacion: Omit<Notificacion, 'id' | 'fecha' | 'leida'>) => void;
  marcarComoLeida: (id: string) => void;
  marcarTodasComoLeidas: (categoria?: CategoriaNotificacion) => void;
  eliminarNotificacion: (id: string) => void;
  limpiarNotificaciones: (categoria?: CategoriaNotificacion) => void;
  obtenerPorCategoria: (categoria: CategoriaNotificacion) => Notificacion[];
  obtenerNoLeidasPorCategoria: (categoria: CategoriaNotificacion) => number;
}

// ============ CONTEXTO ============

const NotificacionesContext = createContext<NotificacionesContextType | undefined>(undefined);

// ============ PROVIDER ============

export function NotificacionesProvider({ children }: { children: React.ReactNode }) {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);

  // Inicializar con notificaciones mock
  useEffect(() => {
    const notificacionesMock: Notificacion[] = [
      {
        id: 'notif-001',
        categoria: 'control-interno',
        tipo: 'critical',
        titulo: 'Actividad Vencida',
        descripcion: 'La actividad "Informe Ejecutivo Trimestral a Dirección" está retrasada 10 días.',
        fecha: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        leida: false,
        url: '/control-interno/plan-anual',
        metadata: {
          modulo: 'Plan Anual de Auditoría',
          criticidad: 'critica'
        }
      },
      {
        id: 'notif-002',
        categoria: 'control-interno',
        tipo: 'critical',
        titulo: 'Actividad Vencida',
        descripcion: 'La actividad "Asesoría en Política de Gestión de Riesgos" está retrasada 239 días.',
        fecha: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        leida: false,
        url: '/control-interno/plan-anual',
        metadata: {
          modulo: 'Plan Anual de Auditoría',
          criticidad: 'critica'
        }
      },
      {
        id: 'notif-003',
        categoria: 'control-interno',
        tipo: 'critical',
        titulo: 'Actividad Vencida',
        descripcion: 'La actividad "Capacitación en Cultura de Control" está retrasada 239 días.',
        fecha: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        leida: false,
        url: '/control-interno/plan-anual',
        metadata: {
          modulo: 'Plan Anual de Auditoría',
          criticidad: 'critica'
        }
      },
      {
        id: 'notif-004',
        categoria: 'control-interno',
        tipo: 'warning',
        titulo: 'Hallazgo pendiente de respuesta',
        descripcion: 'El hallazgo H-2025-001 requiere plan de mejoramiento en 5 días.',
        fecha: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        leida: false,
        url: '/control-interno/hallazgos',
        metadata: {
          modulo: 'Gestión de Hallazgos',
          criticidad: 'alta'
        }
      },
      {
        id: 'notif-005',
        categoria: 'control-interno',
        tipo: 'warning',
        titulo: 'Controversia pendiente',
        descripcion: 'Tienes 1 controversia de hallazgo pendiente de respuesta.',
        fecha: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        leida: false,
        url: '/control-interno/hallazgos?tab=controversias',
        metadata: {
          modulo: 'Controversias',
          criticidad: 'alta'
        }
      },
      {
        id: 'notif-006',
        categoria: 'control-interno',
        tipo: 'warning',
        titulo: 'Evidencias pendientes de validación',
        descripcion: '3 evidencias de planes de mejoramiento requieren tu revisión.',
        fecha: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        leida: false,
        url: '/control-interno/planes-mejoramiento?tab=evidencias',
        metadata: {
          modulo: 'Planes de Mejoramiento',
          criticidad: 'media'
        }
      },
      {
        id: 'notif-007',
        categoria: 'control-interno',
        tipo: 'info',
        titulo: 'Nueva auditoría asignada',
        descripcion: 'Se te ha asignado como auditor líder de "Auditoría de Gestión Contractual".',
        fecha: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        leida: false,
        url: '/control-interno/auditorias/AUD-2025-015',
        metadata: {
          modulo: 'Gestión de Auditorías',
          criticidad: 'media'
        }
      },
      {
        id: 'notif-008',
        categoria: 'control-interno',
        tipo: 'info',
        titulo: 'Documento aprobado',
        descripcion: 'El informe de auditoría AUD-2025-012 ha sido aprobado.',
        fecha: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
        leida: false,
        url: '/control-interno/auditorias/AUD-2025-012',
        metadata: {
          modulo: 'Gestión de Auditorías',
          criticidad: 'baja'
        }
      },
      {
        id: 'notif-009',
        categoria: 'control-interno',
        tipo: 'success',
        titulo: 'Plan de mejoramiento completado',
        descripcion: 'El plan PM-2024-018 ha sido completado exitosamente.',
        fecha: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        leida: false,
        url: '/control-interno/planes-mejoramiento/PM-2024-018',
        metadata: {
          modulo: 'Planes de Mejoramiento',
          criticidad: 'baja'
        }
      },
      // Notificaciones de otros módulos (ejemplos)
      {
        id: 'notif-010',
        categoria: 'gestion-personas',
        tipo: 'warning',
        titulo: 'Documentos pendientes',
        descripcion: 'Tienes 2 documentos personales pendientes de actualización.',
        fecha: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
        leida: false,
        url: '/personas/mi-perfil',
        metadata: {
          modulo: 'Gestión de Personas',
          criticidad: 'media'
        }
      },
      {
        id: 'notif-011',
        categoria: 'gestion-academica',
        tipo: 'info',
        titulo: 'Nueva inscripción',
        descripcion: 'Se ha registrado una nueva inscripción al curso de Ética Pública.',
        fecha: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
        leida: false,
        url: '/academica/inscripciones',
        metadata: {
          modulo: 'Gestión Académica',
          criticidad: 'baja'
        }
      },
      {
        id: 'notif-012',
        categoria: 'sistema',
        tipo: 'info',
        titulo: 'Actualización de sistema',
        descripcion: 'El sistema se actualizará el domingo a las 2:00 AM.',
        fecha: new Date(Date.now() - 120 * 60 * 60 * 1000).toISOString(),
        leida: false,
        metadata: {
          modulo: 'Sistema',
          criticidad: 'baja'
        }
      }
    ];

    setNotificaciones(notificacionesMock);
  }, []);

  // ============ FUNCIONES ============

  const agregarNotificacion = useCallback((
    notif: Omit<Notificacion, 'id' | 'fecha' | 'leida'>
  ) => {
    const nuevaNotificacion: Notificacion = {
      ...notif,
      id: `notif-${Date.now()}`,
      fecha: new Date().toISOString(),
      leida: false,
    };

    setNotificaciones((prev) => [nuevaNotificacion, ...prev]);
  }, []);

  const marcarComoLeida = useCallback((id: string) => {
    setNotificaciones((prev) =>
      prev.map((notif) => (notif.id === id ? { ...notif, leida: true } : notif))
    );
  }, []);

  const marcarTodasComoLeidas = useCallback((categoria?: CategoriaNotificacion) => {
    setNotificaciones((prev) =>
      prev.map((notif) =>
        categoria
          ? notif.categoria === categoria
            ? { ...notif, leida: true }
            : notif
          : { ...notif, leida: true }
      )
    );
  }, []);

  const eliminarNotificacion = useCallback((id: string) => {
    setNotificaciones((prev) => prev.filter((notif) => notif.id !== id));
  }, []);

  const limpiarNotificaciones = useCallback((categoria?: CategoriaNotificacion) => {
    setNotificaciones((prev) =>
      categoria ? prev.filter((notif) => notif.categoria !== categoria) : []
    );
  }, []);

  const obtenerPorCategoria = useCallback(
    (categoria: CategoriaNotificacion) => {
      return notificaciones.filter((notif) => notif.categoria === categoria);
    },
    [notificaciones]
  );

  const obtenerNoLeidasPorCategoria = useCallback(
    (categoria: CategoriaNotificacion) => {
      return notificaciones.filter(
        (notif) => notif.categoria === categoria && !notif.leida
      ).length;
    },
    [notificaciones]
  );

  const notificacionesNoLeidas = notificaciones.filter((n) => !n.leida).length;

  // ============ VALOR DEL CONTEXTO ============

  const value: NotificacionesContextType = {
    notificaciones,
    notificacionesNoLeidas,
    agregarNotificacion,
    marcarComoLeida,
    marcarTodasComoLeidas,
    eliminarNotificacion,
    limpiarNotificaciones,
    obtenerPorCategoria,
    obtenerNoLeidasPorCategoria,
  };

  return (
    <NotificacionesContext.Provider value={value}>
      {children}
    </NotificacionesContext.Provider>
  );
}

// ============ HOOK ============

export function useNotificaciones() {
  const context = useContext(NotificacionesContext);
  if (context === undefined) {
    throw new Error('useNotificaciones debe usarse dentro de NotificacionesProvider');
  }
  return context;
}

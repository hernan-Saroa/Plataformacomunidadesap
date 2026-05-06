/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MÓDULO DE CONFIGURACIÓN DE NOTIFICACIONES - ESAP
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ❓ ¿CÓMO FUNCIONA ESTE MÓDULO?
 * 
 * Este módulo NO ES un centro de notificaciones para VER notificaciones.
 * Este módulo es para CONFIGURAR qué eventos del sistema generan notificaciones
 * automáticas y a quién se envían.
 * 
 * 📌 ORIGEN DE LAS NOTIFICACIONES:
 * Las notificaciones se generan automáticamente cuando ocurren eventos en:
 * - Kanban: Cambio de etapa, SLA próximo a vencer
 * - Auditorías: Nueva asignación, vencimiento de plazo
 * - Planes de Mejoramiento: Seguimiento próximo, evidencia rechazada
 * - Aprobaciones: Documento aprobado/rechazado
 * - Sistema: Nuevas asignaciones, cambios importantes
 * 
 * 📩 VISUALIZACIÓN DE NOTIFICACIONES:
 * Las notificaciones se muestran en:
 * - El ícono de campana en el header (badge con contador)
 * - Panel desplegable al hacer clic en la campana
 * - Emails automáticos (si está configurado)
 * 
 * ⚙️ ESTE MÓDULO PERMITE:
 * - ✅ CREAR notificaciones personalizadas nuevas
 * - Activar/desactivar tipos de notificaciones
 * - Configurar destinatarios por rol
 * - Definir canales (sistema, email, ambos)
 * - Establecer condiciones y umbrales
 * - Ver historial de notificaciones enviadas
 * 
 * ÚLTIMA ACTUALIZACIÓN: 24 Diciembre 2025
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell, Settings, Plus, Edit2, Trash2, Save, X, 
  AlertTriangle, CheckCircle2, Info, Clock, Mail,
  Users, Zap, Eye, Filter, ChevronRight, Play, Pause,
  History, TrendingUp, MessageSquare, Calendar, Sparkles, Loader2, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { controlInternoService } from '../../../services/api/controlInternoService';
import { HeaderSeccionConfig } from './HeaderSeccionConfig';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

// Evento del sistema que puede generar notificación
interface EventoNotificable {
  id: string;
  categoria: 'Kanban' | 'Auditorías' | 'Planes Mejoramiento' | 'Aprobaciones' | 'Sistema' | 'Personalizada';
  nombre: string;
  descripcion: string;
  activo: boolean;
  canal: 'sistema' | 'email' | 'ambos';
  destinatarios: string[]; // Roles que reciben la notificación
  condicion?: string; // Condición para disparar (ej: "5 días antes del vencimiento")
  plantillaEmail?: string;
  esPersonalizada?: boolean; // Indica si fue creada por el usuario
}

// Historial de notificación enviada
interface NotificacionEnviada {
  id: string;
  eventoId: string;
  titulo: string;
  mensaje: string;
  destinatario: string;
  canal: 'sistema' | 'email' | 'ambos';
  fechaEnvio: string;
  leida: boolean;
  accion?: {
    url: string;
  };
}

// Roles del sistema
const ROLES_SISTEMA = [
  'Jefe OCIG',
  'Auditor Líder',
  'Auditor Equipo',
  'Auditado',
  'Jefe Dependencia',
  'Responsable Plan Mejoramiento',
  'Administrador Sistema'
];

// Categorías disponibles
const CATEGORIAS_DISPONIBLES = [
  'Kanban',
  'Auditorías',
  'Planes Mejoramiento',
  'Aprobaciones',
  'Sistema',
  'Personalizada'
] as const;

// ════════════════════════════════════════════════════════════════════════════
// DATOS MOCK - CONFIGURACIÓN DE EVENTOS NOTIFICABLES
// ════════════════════════════════════════════════════════════════════════════

const EVENTOS_NOTIFICABLES_MOCK: EventoNotificable[] = [
  // KANBAN
  {
    id: 'EVT-KANBAN-001',
    categoria: 'Kanban',
    nombre: 'Auditoría movida de etapa',
    descripcion: 'Notifica cuando una auditoría cambia de etapa en el Kanban',
    activo: true,
    canal: 'sistema',
    destinatarios: ['Auditor Líder', 'Jefe OCIG'],
    condicion: 'Al mover tarjeta entre columnas'
  },
  {
    id: 'EVT-KANBAN-002',
    categoria: 'Kanban',
    nombre: 'SLA próximo a vencer',
    descripcion: 'Alerta cuando una auditoría está por vencer su SLA en la etapa actual',
    activo: true,
    canal: 'ambos',
    destinatarios: ['Auditor Líder', 'Jefe OCIG'],
    condicion: '3 días antes del vencimiento',
    plantillaEmail: 'La auditoría [NOMBRE] vence en [DÍAS] días en etapa [ETAPA]'
  },
  {
    id: 'EVT-KANBAN-003',
    categoria: 'Kanban',
    nombre: 'SLA vencido',
    descripcion: 'Notifica cuando una auditoría supera el SLA de su etapa',
    activo: true,
    canal: 'ambos',
    destinatarios: ['Auditor Líder', 'Jefe OCIG'],
    condicion: 'Al vencer el SLA'
  },
  {
    id: 'EVT-KANBAN-004',
    categoria: 'Kanban',
    nombre: 'Límite WIP alcanzado',
    descripcion: 'Alerta cuando una columna alcanza su límite de trabajo en progreso',
    activo: true,
    canal: 'sistema',
    destinatarios: ['Jefe OCIG'],
    condicion: 'Al alcanzar límite WIP'
  },

  // AUDITORÍAS
  {
    id: 'EVT-AUD-001',
    categoria: 'Auditorías',
    nombre: 'Nueva auditoría asignada',
    descripcion: 'Notifica al auditor cuando se le asigna una nueva auditoría',
    activo: true,
    canal: 'ambos',
    destinatarios: ['Auditor Líder', 'Auditor Equipo'],
    condicion: 'Al asignar auditor',
    plantillaEmail: 'Has sido asignado a la auditoría [NOMBRE] con rol de [ROL]'
  },
  {
    id: 'EVT-AUD-002',
    categoria: 'Auditorías',
    nombre: 'Reunión de apertura programada',
    descripcion: 'Recordatorio de reunión de apertura',
    activo: true,
    canal: 'ambos',
    destinatarios: ['Auditor Líder', 'Auditor Equipo', 'Auditado', 'Jefe Dependencia'],
    condicion: '1 día antes de la reunión'
  },
  {
    id: 'EVT-AUD-003',
    categoria: 'Auditorías',
    nombre: 'Plazo de respuesta próximo',
    descripcion: 'Alerta al auditado sobre plazo de respuesta',
    activo: true,
    canal: 'ambos',
    destinatarios: ['Auditado', 'Jefe Dependencia'],
    condicion: '5 días antes del vencimiento'
  },
  {
    id: 'EVT-AUD-004',
    categoria: 'Auditorías',
    nombre: 'Auditoría finalizada',
    descripcion: 'Notifica cuando una auditoría se completa',
    activo: true,
    canal: 'sistema',
    destinatarios: ['Auditor Líder', 'Jefe OCIG', 'Auditado'],
    condicion: 'Al marcar como finalizada'
  },

  // PLANES DE MEJORAMIENTO
  {
    id: 'EVT-PM-001',
    categoria: 'Planes Mejoramiento',
    nombre: 'Seguimiento trimestral próximo',
    descripcion: 'Recordatorio de seguimiento trimestral del plan de mejoramiento',
    activo: true,
    canal: 'ambos',
    destinatarios: ['Responsable Plan Mejoramiento', 'Jefe OCIG'],
    condicion: '7 días antes del seguimiento',
    plantillaEmail: 'El seguimiento trimestral del PM [CÓDIGO] vence el [FECHA]'
  },
  {
    id: 'EVT-PM-002',
    categoria: 'Planes Mejoramiento',
    nombre: 'Evidencia rechazada',
    descripcion: 'Notifica cuando se rechaza una evidencia cargada',
    activo: true,
    canal: 'ambos',
    destinatarios: ['Responsable Plan Mejoramiento'],
    condicion: 'Al rechazar evidencia'
  },
  {
    id: 'EVT-PM-003',
    categoria: 'Planes Mejoramiento',
    nombre: 'Acción vencida sin cumplir',
    descripcion: 'Alerta cuando una acción supera su fecha de cumplimiento',
    activo: true,
    canal: 'ambos',
    destinatarios: ['Responsable Plan Mejoramiento', 'Jefe Dependencia', 'Jefe OCIG'],
    condicion: 'Al día siguiente del vencimiento'
  },

  // APROBACIONES
  {
    id: 'EVT-APR-001',
    categoria: 'Aprobaciones',
    nombre: 'Documento aprobado',
    descripcion: 'Notifica cuando un documento es aprobado',
    activo: true,
    canal: 'sistema',
    destinatarios: ['Auditor Líder'],
    condicion: 'Al aprobar documento'
  },
  {
    id: 'EVT-APR-002',
    categoria: 'Aprobaciones',
    nombre: 'Documento rechazado',
    descripcion: 'Notifica cuando un documento es rechazado con observaciones',
    activo: true,
    canal: 'ambos',
    destinatarios: ['Auditor Líder'],
    condicion: 'Al rechazar documento',
    plantillaEmail: 'El documento [NOMBRE] fue rechazado. Motivo: [MOTIVO]'
  },

  // SISTEMA
  {
    id: 'EVT-SYS-001',
    categoria: 'Sistema',
    nombre: 'Carga de trabajo alta',
    descripcion: 'Alerta cuando un auditor supera 90% de su capacidad',
    activo: true,
    canal: 'sistema',
    destinatarios: ['Jefe OCIG'],
    condicion: 'Al superar 90% de capacidad'
  },
  {
    id: 'EVT-SYS-002',
    categoria: 'Sistema',
    nombre: 'Nuevo documento en repositorio',
    descripcion: 'Notifica cuando se sube un nuevo documento compartido',
    activo: false,
    canal: 'sistema',
    destinatarios: ['Todos'],
    condicion: 'Al cargar documento'
  }
];

// ════════════════════════════════════════════════════════════════════════════
// MOCK - HISTORIAL DE NOTIFICACIONES ENVIADAS
// ════════════════════════════════════════════════════════════════════════════

const NOTIFICACIONES_ENVIADAS_MOCK: NotificacionEnviada[] = [
  {
    id: 'N-001',
    eventoId: 'EVT-PM-001',
    titulo: 'Seguimiento Trimestral Próximo',
    mensaje: 'El seguimiento trimestral del Plan de Mejoramiento PM-2025-005 vence en 7 días (15 de Octubre).',
    destinatario: 'Mario Oswaldo Bernal Rodríguez',
    canal: 'sistema',
    fechaEnvio: '2025-10-08T09:00:00',
    leida: false,
    accion: {
      texto: 'Ir al Seguimiento',
      url: '/seguimiento-plan/PM-2025-005'
    }
  },
  {
    id: 'N-002',
    eventoId: 'EVT-APR-001',
    titulo: 'Informe Aprobado',
    mensaje: 'El Informe Pormenorizado 2025-S1 ha sido aprobado por el Jefe de OCIG.',
    destinatario: 'Ana María López Gómez',
    canal: 'sistema',
    fechaEnvio: '2025-09-30T14:22:00',
    leida: true
  },
  {
    id: 'N-003',
    eventoId: 'EVT-AUD-003',
    titulo: 'Plazo de Respuesta Próximo',
    mensaje: 'El plazo de respuesta para la auditoría AUD-2025-008 vence en 5 días.',
    destinatario: 'Carlos Andrés Mendoza Silva',
    canal: 'email',
    fechaEnvio: '2025-10-05T10:15:00',
    leida: true
  },
  {
    id: 'N-004',
    eventoId: 'EVT-KANBAN-002',
    titulo: 'SLA Próximo a Vencer',
    mensaje: 'La auditoría AUD-2025-010 en etapa "Ejecución" vence en 3 días.',
    destinatario: 'Ana María López Gómez',
    canal: 'sistema',
    fechaEnvio: '2025-10-07T08:00:00',
    leida: false
  }
];

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export function NotificacionesModule() {
  const [eventos, setEventos] = useState<EventoNotificable[]>(EVENTOS_NOTIFICABLES_MOCK);
  const [historial, setHistorial] = useState<NotificacionEnviada[]>([]);
  const [tabActiva, setTabActiva] = useState<'configuracion' | 'historial'>('configuracion');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('Todas');
  const [eventoEditando, setEventoEditando] = useState<EventoNotificable | null>(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  
  // ✅ Estados para conexión con backend
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const yaCargadoRef = useRef(false); // ✅ Ref para evitar múltiples cargas (no causa re-render)

  // ✅ Obtener el usuarioId del localStorage
  const getUsuarioId = useCallback(() => {
    try {
      // Intentar con la key principal: esap_user_data
      let userStr = sessionStorage.getItem('esap_user_data');
      console.log('[NotificacionesModule] sessionStorage esap_user_data:', userStr?.slice(0, 200));
      
      if (userStr) {
        const user = JSON.parse(userStr);
        console.log('[NotificacionesModule] User object parsed:', user);
        // Buscar en diferentes propiedades donde puede estar el ID
        const userId = user.id || user.userId || user.id_user || user.uid || user.terceroId;
        console.log('[NotificacionesModule] UserId extraído:', userId, '| tipo:', typeof userId);
        if (userId) return String(userId);
      }
      
      // Fallback: esap_auth_user (legacy)
      userStr = localStorage.getItem('esap_auth_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        const userId = user.id || user.userId || user.id_user || user.uid || user.terceroId;
        if (userId) return String(userId);
      }
    } catch (e) {
      console.error('[NotificacionesModule] Error parsing localStorage:', e);
    }
    console.log('[NotificacionesModule] Usando fallback admin');
    return 'admin';
  }, []);

  // ✅ Cargar configuración desde el backend
  const cargarConfiguracion = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const usuarioId = getUsuarioId();
      console.log('[NotificacionesModule] Cargando configuración para usuario:', usuarioId);
      
      // Cargar preferencias de notificación
      const preferencias = await controlInternoService.getPreferenciasNotificacion(usuarioId);
      console.log('[NotificacionesModule] Preferencias recibidas:', JSON.stringify(preferencias, null, 2));
      
      // Mapear preferencias del backend a eventos del frontend
      if (preferencias?.tiposNotificacion) {
        const tiposBackend = preferencias.tiposNotificacion;
        
        // ✅ Crear nuevos eventos actualizados directamente desde el MOCK
        const eventosActualizados = EVENTOS_NOTIFICABLES_MOCK.map(evento => {
          const configBackend = tiposBackend[evento.id];
          if (configBackend) {
            const nuevoCanal = (configBackend.email && configBackend.sistema) ? 'ambos' as const : 
                              configBackend.email ? 'email' as const : 'sistema' as const;
            console.log(`[NotificacionesModule] Aplicando config backend para ${evento.id}: activo=${configBackend.activo}, canal=${nuevoCanal}`);
            return {
              ...evento,
              activo: configBackend.activo === true || configBackend.activo === 'true',
              canal: nuevoCanal
            };
          }
          console.log(`[NotificacionesModule] Sin config backend para ${evento.id}, usando default`);
          return evento;
        });
        
        console.log('[NotificacionesModule] Eventos actualizados:', 
          eventosActualizados.map(e => ({ id: e.id, activo: e.activo, canal: e.canal }))
        );
        
        // Actualizar estado con los nuevos eventos
        setEventos(eventosActualizados);
      }

      // Cargar historial de notificaciones (TODAS las del sistema para visibilidad completa)
      try {
        console.log('[NotificacionesModule] Solicitando historial de notificaciones...');
        // Intentar cargar TODAS las notificaciones del sistema (para Jefe OCI / Admin)
        // Si falla, cargar solo las del usuario actual
        let notificaciones: any[] = [];
        try {
          notificaciones = await controlInternoService.getTodasNotificaciones();
          console.log('[NotificacionesModule] Notificaciones del sistema recibidas:', notificaciones?.length || 0);
        } catch {
          // Fallback: cargar solo las del usuario actual
          notificaciones = await controlInternoService.getNotificacionesUsuario(usuarioId);
          console.log('[NotificacionesModule] Notificaciones del usuario recibidas:', notificaciones?.length || 0);
        }
        
        console.log('[NotificacionesModule] Respuesta completa:', JSON.stringify(notificaciones)?.slice(0, 500));
        if (Array.isArray(notificaciones)) {
          const historialMapeado = notificaciones.map((n: any) => ({
            id: n.id,
            eventoId: n.tipoNotificacion || n.tipo || 'EVT-SISTEMA',
            titulo: n.titulo,
            mensaje: n.mensaje,
            destinatario: n.nombreUsuario || n.usuarioId || usuarioId,
            // Mapear canal correctamente: 'email' | 'sistema' | 'ambos'
            canal: n.canal === 'email' ? 'email' as const : 
                   n.canal === 'ambos' ? 'ambos' as const : 'sistema' as const,
            fechaEnvio: n.createdAt || n.fechaCreacion,
            leida: n.leida ?? false,
            accion: n.accionUrl ? { texto: 'Ver', url: n.accionUrl } : undefined
          }));
          console.log('[NotificacionesModule] Historial mapeado:', historialMapeado.length, 'items');
          setHistorial(historialMapeado);
        }
      } catch (histErr) {
        console.warn('[NotificacionesModule] Error cargando historial:', histErr);
        // No bloquear por error del historial - mostrar vacío
        setHistorial([]);
      }
      
    } catch (err: any) {
      console.error('[NotificacionesModule] Error al cargar configuración:', err);
      // No mostrar error si es 404 - usar datos mock
      if (err?.response?.status !== 404 && !err?.message?.includes('404')) {
        setError('Error al cargar configuración. Usando datos locales.');
      }
    } finally {
      setCargando(false);
    }
  }, [getUsuarioId]);

  // ✅ Guardar configuración en el backend
  const guardarConfiguracionBackend = useCallback(async (eventosActualizados: EventoNotificable[]) => {
    setGuardando(true);
    try {
      const usuarioId = getUsuarioId();
      
      // Convertir eventos a formato de preferencias del backend
      const tiposNotificacion: Record<string, { email: boolean; sistema: boolean; activo: boolean }> = {};
      eventosActualizados.forEach(evento => {
        tiposNotificacion[evento.id] = {
          email: evento.canal === 'email' || evento.canal === 'ambos',
          sistema: evento.canal === 'sistema' || evento.canal === 'ambos',
          activo: evento.activo
        };
      });

      await controlInternoService.updatePreferenciasNotificacion(usuarioId, {
        tiposNotificacion,
        recibirEmail: eventosActualizados.some(e => e.activo && (e.canal === 'email' || e.canal === 'ambos')),
        recibirSistema: eventosActualizados.some(e => e.activo && (e.canal === 'sistema' || e.canal === 'ambos'))
      });

      return true;
    } catch (err) {
      console.error('Error al guardar configuración:', err);
      toast.error('Error al guardar en el servidor. Cambios guardados localmente.');
      return false;
    } finally {
      setGuardando(false);
    }
  }, [getUsuarioId]);

  // ✅ Cargar al montar (solo una vez)
  useEffect(() => {
    // Evitar múltiples cargas (por StrictMode o HMR)
    if (yaCargadoRef.current) {
      console.log('[NotificacionesModule] Ya se cargó, omitiendo...');
      return;
    }
    yaCargadoRef.current = true;
    console.log('[NotificacionesModule] useEffect ejecutándose - cargando configuración...');
    cargarConfiguracion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Ejecutar solo al montar

  // Filtrar eventos por categoría
  const eventosFiltrados = useMemo(() => {
    if (categoriaFiltro === 'Todas') return eventos;
    return eventos.filter(e => e.categoria === categoriaFiltro);
  }, [eventos, categoriaFiltro]);

  // Log para debug: mostrar estado actual de eventos
  useEffect(() => {
    const activos = eventos.filter(e => e.activo).map(e => e.id);
    const inactivos = eventos.filter(e => !e.activo).map(e => e.id);
    console.log('[NotificacionesModule] Estado actual de eventos:', {
      activos: activos.length,
      inactivos: inactivos.length,
      inactivosIds: inactivos
    });
  }, [eventos]);

  // Estadísticas
  const estadisticas = useMemo(() => {
    const totalEventos = eventos.length;
    const eventosActivos = eventos.filter(e => e.activo).length;
    const notificacionesEnviadas = historial.length;
    const noLeidas = historial.filter(n => !n.leida).length;

    return { totalEventos, eventosActivos, notificacionesEnviadas, noLeidas };
  }, [eventos, historial]);

  // Handlers - ✅ CONECTADOS AL BACKEND
  const handleToggleEvento = async (id: string) => {
    const eventosActualizados = eventos.map(e => (e.id === id ? { ...e, activo: !e.activo } : e));
    setEventos(eventosActualizados);
    
    const evento = eventos.find(e => e.id === id);
    const nuevoEstado = !evento?.activo;
    
    // Guardar en backend
    await guardarConfiguracionBackend(eventosActualizados);
    
    toast.success(
      nuevoEstado
        ? '✅ Notificación activada'
        : '✅ Notificación desactivada'
    );
  };

  const handleEditarEvento = (evento: EventoNotificable) => {
    setEventoEditando(evento);
    setMostrarModal(true);
  };

  const handleGuardarEvento = async (evento: EventoNotificable) => {
    const eventosActualizados = eventos.map(e => (e.id === evento.id ? evento : e));
    setEventos(eventosActualizados);
    setMostrarModal(false);
    setEventoEditando(null);
    
    // Guardar en backend
    await guardarConfiguracionBackend(eventosActualizados);
    toast.success('✅ Configuración de notificación actualizada');
  };

  const handleCrearNueva = () => {
    // Crear evento vacío para nueva notificación
    const nuevoEvento: EventoNotificable = {
      id: `EVT-CUSTOM-${Date.now()}`,
      categoria: 'Personalizada',
      nombre: '',
      descripcion: '',
      activo: true,
      canal: 'sistema',
      destinatarios: [],
      esPersonalizada: true
    };
    setEventoEditando(nuevoEvento);
    setMostrarModal(true);
  };

  const handleGuardarNuevo = async (evento: EventoNotificable) => {
    if (!evento.nombre.trim()) {
      toast.error('❌ El nombre de la notificación es obligatorio');
      return;
    }
    if (evento.destinatarios.length === 0) {
      toast.error('❌ Debes seleccionar al menos un destinatario');
      return;
    }

    // Si es nuevo (no existe en la lista)
    const existe = eventos.find(e => e.id === evento.id);
    let eventosActualizados: EventoNotificable[];
    
    if (!existe) {
      eventosActualizados = [...eventos, evento];
      setEventos(eventosActualizados);
      toast.success('✅ Notificación personalizada creada exitosamente');
    } else {
      eventosActualizados = eventos.map(e => (e.id === evento.id ? evento : e));
      setEventos(eventosActualizados);
      toast.success('✅ Notificación actualizada exitosamente');
    }
    
    // Guardar en backend
    await guardarConfiguracionBackend(eventosActualizados);
    
    setMostrarModal(false);
    setEventoEditando(null);
  };

  const handleEliminarEvento = async (id: string) => {
    const evento = eventos.find(e => e.id === id);
    if (!evento?.esPersonalizada) {
      toast.error('❌ Solo puedes eliminar notificaciones personalizadas');
      return;
    }
    
    const eventosActualizados = eventos.filter(e => e.id !== id);
    setEventos(eventosActualizados);
    
    // Guardar en backend
    await guardarConfiguracionBackend(eventosActualizados);
    toast.success('🗑️ Notificación personalizada eliminada');
  };

  // ✅ Ejecutar job de notificaciones automáticas manualmente
  const handleEjecutarJob = useCallback(async () => {
    try {
      toast.loading('⚙️ Ejecutando job de notificaciones...', { id: 'job-notif' });
      const resultado = await controlInternoService.ejecutarJobNotificaciones();
      toast.dismiss('job-notif');
      if (resultado?.success !== false) {
        const enviadas = resultado?.resultado?.notificacionesEnviadas ?? resultado?.notificacionesEnviadas ?? '?';
        toast.success(`✅ Job ejecutado: ${enviadas} notificaciones generadas`);
        // Recargar historial después de ejecutar el job
        await cargarConfiguracion();
      } else {
        toast.error(`❌ Error al ejecutar job: ${resultado?.message || 'Error desconocido'}`);
      }
    } catch (err: any) {
      toast.dismiss('job-notif');
      toast.error(`❌ Error al ejecutar job: ${err?.message || 'Error de red'}`);
      console.error('[NotificacionesModule] Error ejecutando job:', err);
    }
  }, [cargarConfiguracion]);

  return (
    <div className="p-3 w-full">
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ESTADO DE CARGA */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {cargando && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-blue-600">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-lg font-medium">Cargando configuración...</span>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ERROR */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {error && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <span className="text-amber-800">{error}</span>
          <button 
            onClick={cargarConfiguracion}
            className="ml-auto flex items-center gap-1 text-amber-700 hover:text-amber-900"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* INDICADOR DE GUARDADO */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {guardando && (
        <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm font-medium">Guardando...</span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <HeaderSeccionConfig
        icon={<Settings className="w-full h-full" />}
        titulo="Configuración de Notificaciones"
        subtitulo="Configura qué eventos del sistema generan notificaciones automáticas"
      />

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ESTADÍSTICAS */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* TABS */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-5">
        <div className="flex gap-1.5 p-1.5">
          <button
            onClick={() => setTabActiva('configuracion')}
            className={`flex-1 px-4 py-2.5 font-semibold text-sm transition-all flex items-center justify-center gap-2 rounded-lg ${
              tabActiva === 'configuracion'
                ? 'bg-[#2962FF] text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            }`}
          >
            <Settings className="w-4 h-4" />
            Configuración de Eventos
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              tabActiva === 'configuracion'
                ? 'bg-white/20 text-white'
                : 'bg-gray-100 text-gray-500'
            }`}>
              {eventos.length}
            </span>
          </button>
          <button
            onClick={() => setTabActiva('historial')}
            className={`flex-1 px-4 py-2.5 font-semibold text-sm transition-all flex items-center justify-center gap-2 rounded-lg ${
              tabActiva === 'historial'
                ? 'bg-[#7C3AED] text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            }`}
          >
            <History className="w-4 h-4" />
            Historial de Notificaciones
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              tabActiva === 'historial'
                ? 'bg-white/20 text-white'
                : 'bg-gray-100 text-gray-500'
            }`}>
              {historial.length}
            </span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CONTENIDO POR TAB */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
        {tabActiva === 'configuracion' && (
          <TabConfiguracion
            key="configuracion"
            eventos={eventosFiltrados}
            categoriaFiltro={categoriaFiltro}
            onCambiarCategoria={setCategoriaFiltro}
            onToggle={handleToggleEvento}
            onEditar={handleEditarEvento}
            onCrear={handleCrearNueva}
            onEliminar={handleEliminarEvento}
          />
        )}
        {tabActiva === 'historial' && (
          <TabHistorial
            key="historial"
            historial={historial}
            onEjecutarJob={handleEjecutarJob}
            onRecargar={cargarConfiguracion}
          />
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL EDITAR EVENTO */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {mostrarModal && eventoEditando && (
        <ModalEditarEvento
          evento={eventoEditando}
          onGuardar={handleGuardarNuevo}
          onCerrar={() => {
            setMostrarModal(false);
            setEventoEditando(null);
          }}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: CONFIGURACIÓN DE EVENTOS
// ════════════════════════════════════════════════════════════════════════════

interface TabConfiguracionProps {
  eventos: EventoNotificable[];
  categoriaFiltro: string;
  onCambiarCategoria: (categoria: string) => void;
  onToggle: (id: string) => void;
  onEditar: (evento: EventoNotificable) => void;
  onCrear: () => void;
  onEliminar: (id: string) => void;
}

function TabConfiguracion({
  eventos,
  categoriaFiltro,
  onCambiarCategoria,
  onToggle,
  onEditar,
  onCrear,
  onEliminar
}: TabConfiguracionProps) {
  const categorias = ['Todas', 'Kanban', 'Auditorías', 'Planes Mejoramiento', 'Aprobaciones', 'Sistema', 'Personalizada'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {/* Filtro de categorías */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filtrar por categoría</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {categorias.map(cat => (
            <button
              key={cat}
              onClick={() => onCambiarCategoria(cat)}
              className={`px-3.5 py-1.5 rounded-lg font-semibold text-xs transition-all ${
                categoriaFiltro === cat
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de eventos */}
      <div className="space-y-3">
        {eventos.map((evento) => (
          <TarjetaEvento
            key={evento.id}
            evento={evento}
            onToggle={onToggle}
            onEditar={onEditar}
            onEliminar={onEliminar}
          />
        ))}
      </div>

      {/* Botón para crear nueva notificación */}
      <button
        onClick={onCrear}
        className="flex items-center gap-2 px-4 py-2.5 bg-[#2962FF] hover:bg-[#1e50d4] text-white rounded-lg font-semibold text-sm transition-all shadow-sm"
      >
        <Plus className="w-4 h-4" />
        Crear Notificación Personalizada
      </button>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE: TARJETA DE EVENTO
// ════════════════════════════════════════════════════════════════════════════

interface TarjetaEventoProps {
  evento: EventoNotificable;
  onToggle: (id: string) => void;
  onEditar: (evento: EventoNotificable) => void;
  onEliminar: (id: string) => void;
}

function TarjetaEvento({ evento, onToggle, onEditar, onEliminar }: TarjetaEventoProps) {
  const getCategoriaHex = (categoria: string) => {
    switch (categoria) {
      case 'Kanban': return '#2962FF';
      case 'Auditorías': return '#7C3AED';
      case 'Planes Mejoramiento': return '#16A34A';
      case 'Aprobaciones': return '#EAB308';
      case 'Sistema': return '#6B7280';
      case 'Personalizada': return '#EC4899';
      default: return '#6B7280';
    }
  };

  const getCategoriaColor = (categoria: string) => {
    switch (categoria) {
      case 'Kanban': return { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', icon: 'bg-blue-600' };
      case 'Auditorías': return { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700', icon: 'bg-purple-600' };
      case 'Planes Mejoramiento': return { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700', icon: 'bg-green-600' };
      case 'Aprobaciones': return { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-700', icon: 'bg-yellow-600' };
      case 'Sistema': return { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-700', icon: 'bg-gray-600' };
      case 'Personalizada': return { bg: 'bg-pink-50', border: 'border-pink-300', text: 'text-pink-700', icon: 'bg-pink-600' };
      default: return { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-700', icon: 'bg-gray-600' };
    }
  };

  const color = getCategoriaColor(evento.categoria);

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-all ${!evento.activo && 'opacity-50'}`} style={{ borderLeft: `3px solid ${getCategoriaHex(evento.categoria)}` }}>
      <div className="flex items-start gap-4">
        {/* Icono */}
        <div className={`${color.icon} p-3 rounded-xl flex-shrink-0`}>
          <Bell className="w-5 h-5 text-white" />
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-0.5">{evento.nombre}</h3>
              <p className="text-xs text-gray-500">{evento.descripcion}</p>
            </div>

            {/* Toggle */}
            <button
              onClick={() => onToggle(evento.id)}
              className={`relative inline-flex h-7 w-[52px] items-center rounded-full transition-colors flex-shrink-0 m-0 p-0 border-0 focus:outline-none ${
                evento.activo ? 'bg-green-600' : 'bg-gray-300'
              }`}
              title={evento.activo ? 'Desactivar' : 'Activar'}
            >
              <span className="sr-only">Toggle notification</span>
              <span
                className={`inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white transition-transform duration-200 shadow-sm ${
                  evento.activo ? 'translate-x-[28px]' : 'translate-x-[4px]'
                }`}
              >
                {evento.activo ? (
                  <Play className="w-3 h-3 text-green-600 ml-0.5" strokeWidth={3} />
                ) : (
                  <Pause className="w-3 h-3 text-gray-400" strokeWidth={3} />
                )}
              </span>
            </button>
          </div>

          {/* Detalles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-3 mt-3">
            <div className={`${color.bg} border ${color.border} rounded-lg px-2.5 py-1.5`}>
              <div className="text-[10px] font-medium text-gray-400 mb-0.5">Categoría</div>
              <div className={`text-xs font-bold ${color.text}`}>{evento.categoria}</div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
              <div className="text-[10px] font-medium text-gray-400 mb-0.5">Canal</div>
              <div className="flex items-center gap-1 text-xs font-bold text-gray-700">
                {evento.canal === 'sistema' && <Bell className="w-3 h-3" />}
                {evento.canal === 'email' && <Mail className="w-3 h-3" />}
                {evento.canal === 'ambos' && (
                  <>
                    <Bell className="w-3 h-3" />
                    <Mail className="w-3 h-3" />
                  </>
                )}
                <span className="capitalize">{evento.canal}</span>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
              <div className="text-[10px] font-medium text-gray-400 mb-0.5">Destinatarios</div>
              <div className="text-xs font-bold text-gray-700">
                {evento.destinatarios.length} rol(es)
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
              <div className="text-[10px] font-medium text-gray-400 mb-0.5">Condición</div>
              <div className="text-[11px] text-gray-600 line-clamp-1" title={evento.condicion}>
                {evento.condicion || 'Inmediato'}
              </div>
            </div>
          </div>

          {/* Destinatarios */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-gray-500" />
            {evento.destinatarios.map((rol, idx) => (
              <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                {rol}
              </span>
            ))}
          </div>

          {/* Botones editar y eliminar */}
          <div className="flex gap-2">
            <button
              onClick={() => onEditar(evento)}
              className="px-3 py-1.5 bg-white border border-gray-200 hover:border-gray-400 text-gray-600 hover:text-gray-900 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all"
            >
              <Edit2 className="w-4 h-4" />
              Configurar
            </button>
            {evento.esPersonalizada && (
              <button
                onClick={() => onEliminar(evento.id)}
                className="px-3 py-1.5 bg-red-50 border border-red-200 hover:border-red-400 text-red-600 hover:text-red-700 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: HISTORIAL DE NOTIFICACIONES
// ════════════════════════════════════════════════════════════════════════════

interface TabHistorialProps {
  historial: NotificacionEnviada[];
  onEjecutarJob: () => void;
  onRecargar: () => void;
}

function TabHistorial({ historial, onEjecutarJob, onRecargar }: TabHistorialProps) {
  const [ejecutandoJob, setEjecutandoJob] = useState(false);

  const handleEjecutar = async () => {
    setEjecutandoJob(true);
    await onEjecutarJob();
    setTimeout(() => setEjecutandoJob(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-3"
    >
      {/* Cabecera informativa + acciones */}
      <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <strong>Historial de notificaciones enviadas</strong>
              <p className="mt-1">
                Aquí se muestran las notificaciones que el sistema ha generado y enviado
                según las reglas configuradas. Total: <strong>{historial.length}</strong> registro(s).
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={onRecargar}
              className="px-3 py-1.5 bg-white border border-blue-300 hover:bg-blue-100 text-blue-700 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all"
              title="Recargar historial"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Recargar
            </button>
            <button
              onClick={handleEjecutar}
              disabled={ejecutandoJob}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all"
              title="Ejecutar job de notificaciones ahora"
            >
              {ejecutandoJob ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5" />
              )}
              Ejecutar Job
            </button>
          </div>
        </div>
      </div>

      {historial.map((notif) => (
        <div
          key={notif.id}
          className={`bg-white rounded-xl border-2 p-4 hover:shadow-md transition-all ${
            !notif.leida ? 'border-blue-400 bg-blue-50/30' : 'border-gray-200'
          }`}
        >
          <div className="flex items-start gap-4">
            {/* Ícono de canal */}
            <div className={`p-3 rounded-xl flex-shrink-0 ${
              notif.canal === 'ambos' ? 'bg-green-600' :
              notif.canal === 'email' ? 'bg-purple-600' : 'bg-blue-600'
            }`}>
              {notif.canal === 'ambos' ? (
                <Zap className="w-5 h-5 text-white" />
              ) : notif.canal === 'email' ? (
                <Mail className="w-5 h-5 text-white" />
              ) : (
                <Bell className="w-5 h-5 text-white" />
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-black text-gray-900 mb-1">{notif.titulo}</h3>
                  <p className="text-sm text-gray-600 mb-2">{notif.mensaje}</p>
                </div>
                {!notif.leida && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {notif.fechaEnvio ? new Date(notif.fechaEnvio).toLocaleString('es-CO') : 'Sin fecha'}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {notif.destinatario}
                </span>
                <span className={`px-2 py-1 rounded font-semibold ${
                  notif.canal === 'ambos'
                    ? 'bg-green-100 text-green-700'
                    : notif.canal === 'email'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {notif.canal === 'ambos' ? '📨 Email + Sistema' :
                   notif.canal === 'email' ? '✉️ Email' : '🔔 Sistema'}
                </span>
                {notif.leida && (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="w-3 h-3" />
                    Leída
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {historial.length === 0 && (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-12 text-center">
          <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-bold text-gray-500">No hay notificaciones en el historial</p>
          <p className="text-sm text-gray-400 mt-2 max-w-md mx-auto">
            Las notificaciones se generan automáticamente cuando ocurren eventos del sistema
            (auditorías, planes de mejoramiento, aprobaciones). Puede ejecutar el job manual
            usando el botón <strong>&quot;Ejecutar Job&quot;</strong> para generar notificaciones de vencimientos ahora.
          </p>
          <button
            onClick={handleEjecutar}
            disabled={ejecutandoJob}
            className="mt-6 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl font-semibold text-sm flex items-center gap-2 mx-auto transition-all"
          >
            {ejecutandoJob ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            Ejecutar Job de Notificaciones
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL: EDITAR EVENTO
// ════════════════════════════════════════════════════════════════════════════

interface ModalEditarEventoProps {
  evento: EventoNotificable;
  onGuardar: (evento: EventoNotificable) => void;
  onCerrar: () => void;
}

function ModalEditarEvento({ evento, onGuardar, onCerrar }: ModalEditarEventoProps) {
  // ✅ BUG 4 FIX: Asegurar que destinatarios sea siempre un array al inicializar
  // y que el estado inicial capture correctamente los datos del evento
  const [form, setForm] = useState({
    ...evento,
    destinatarios: Array.isArray(evento.destinatarios) ? [...evento.destinatarios] : []
  });

  // ✅ BUG 3 FIX: Guardar el nombre original del evento padre para el subtítulo
  // para que no cambie mientras el usuario edita el campo "Nombre"
  const nombreEventoPadre = evento.nombre || 'Configurar notificación';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGuardar(form);
  };

  const toggleDestinatario = (rol: string) => {
    if (form.destinatarios.includes(rol)) {
      setForm({
        ...form,
        destinatarios: form.destinatarios.filter(r => r !== rol)
      });
    } else {
      setForm({
        ...form,
        destinatarios: [...form.destinatarios, rol]
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onCerrar}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black">Configurar Notificación</h2>
                <p className="text-sm text-blue-100 mt-1">Evento: {nombreEventoPadre}</p>
              </div>
              <button
                type="button"
                onClick={onCerrar}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Formulario */}
          <div className="p-6 space-y-6">
            {/* Nombre y Descripción (solo para nuevas) */}
            {evento.esPersonalizada && (
              <>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Nombre de la Notificación <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    placeholder="Ej: Revisión mensual de informes"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={form.descripcion}
                    onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                    placeholder="Describe cuándo se debe enviar esta notificación..."
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Categoría
                  </label>
                  <select
                    value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value as any })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none font-semibold"
                  >
                    {CATEGORIAS_DISPONIBLES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Canal */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Canal de Notificación
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['sistema', 'email', 'ambos'] as const).map(canal => (
                  <button
                    key={canal}
                    type="button"
                    onClick={() => setForm({ ...form, canal })}
                    className={`px-4 py-3 rounded-lg font-semibold text-sm transition-all border-2 ${
                      form.canal === canal
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {canal === 'sistema' && <Bell className="w-4 h-4 mx-auto mb-1" />}
                    {canal === 'email' && <Mail className="w-4 h-4 mx-auto mb-1" />}
                    {canal === 'ambos' && <Zap className="w-4 h-4 mx-auto mb-1" />}
                    <span className="capitalize">{canal}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Destinatarios */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Destinatarios (Roles)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES_SISTEMA.map(rol => (
                  <button
                    key={rol}
                    type="button"
                    onClick={() => toggleDestinatario(rol)}
                    className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all border-2 text-left ${
                      form.destinatarios.includes(rol)
                        ? 'bg-blue-100 text-blue-700 border-blue-400'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                        form.destinatarios.includes(rol)
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-400'
                      }`}>
                        {form.destinatarios.includes(rol) && (
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <span>{rol}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Condición */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Condición de Disparo
              </label>
              <input
                type="text"
                value={form.condicion || ''}
                onChange={(e) => setForm({ ...form, condicion: e.target.value })}
                placeholder="Ej: 5 días antes del vencimiento"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Plantilla Email (si canal incluye email) */}
            {(form.canal === 'email' || form.canal === 'ambos') && (
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Plantilla de Email
                </label>
                <textarea
                  value={form.plantillaEmail || ''}
                  onChange={(e) => setForm({ ...form, plantillaEmail: e.target.value })}
                  placeholder="Usa variables como [NOMBRE], [FECHA], [DÍAS], etc."
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Variables disponibles: [NOMBRE], [CODIGO], [FECHA], [DÍAS], [ETAPA], [ROL], [MOTIVO]
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 border-t-2 border-gray-200 p-6 rounded-b-xl flex gap-3">
            <button
              type="button"
              onClick={onCerrar}
              className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 hover:bg-gray-100 rounded-lg font-bold text-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
            >
              <Save className="w-5 h-5" />
              Guardar Configuración
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default NotificacionesModule;

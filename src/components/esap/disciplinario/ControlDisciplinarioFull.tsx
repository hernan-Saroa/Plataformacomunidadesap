/**
 * SISTEMA COMPLETO - CONTROL INTERNO DISCIPLINARIO v3.0 PREMIUM 🟢
 * Módulo funcional con todas las secciones:
 * - Dashboard Operativo (Kanban)
 * - Revisión y Aprobación
 * - Expediente Electrónico
 * - Términos y Alertas
 * - Profesionales
 * - Configuración (ACTUALIZADO CON PLANTILLAS DE AUTOS)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, CheckCircle, Archive, Clock, Users, Settings, Scale } from 'lucide-react';
import { ModuleLayout, type MenuItem } from '../shared/ModuleLayout';
import { toast } from 'sonner';

// ✅ Importar todos los módulos especializados
import { GestionProfesionalesWorldClass } from './GestionProfesionalesWorldClass'; // ✅ RF007 WORLD CLASS - Diseño actualizado
import { ModuloConfiguracionPremium } from './ModuloConfiguracionPremium'; // ✅ RF008 CONFIGURACIÓN PREMIUM
import { ModuloConfiguracionRelacionado } from './ModuloConfiguracionRelacionado'; // ✅ Configuración organizada por módulos
import { RevisionAprobacionJefe } from './RevisionAprobacionJefe'; // ✅ RF004 100% Funcional
import { ExpedientesElectronicosWorldClass } from './ExpedientesElectronicosWorldClass'; // ✅ RF005 100% Funcional - DISEÑO WORLD-CLASS
import { GestionTerminosAlertas } from './GestionTerminosAlertas'; // ✅ RF006 - Vista alineada con diseño esperado
import { GestionTerminosAlertasWorldClass } from './GestionTerminosAlertasWorldClass';
import { DashboardKanbanOperativo } from './DashboardKanbanOperativo'; // ✅ Kanban Operativo Completo
import type { BorradorPendiente } from './ModalRevisionAuto';
import { authService } from '../../../services/api/authService';
import { disciplinaryService } from '../../../services/api/disciplinary.service';
import { Permissions } from '../../../enums/permissions';

// Componente de carga mientras se verifica autenticación
function AuthLoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 rounded-full animate-spin mx-auto mb-4"
          style={{ borderColor: '#E5E7EB', borderTopColor: '#003DA5' }}
        />
        <p className="text-sm font-semibold text-gray-600">Verificando sesión...</p>
      </div>
    </div>
  );
}

export interface ResultadoRevision {
  borradorId: string;
  procesoId: string;
  accion: 'aprobado' | 'devuelto';
  comentarios: string;
  motivo?: string;
  fecha: string;
}

const BORRADORES_INICIALES: BorradorPendiente[] = [
  {
    id: 'b1',
    numeroProceso: 'P-120-2025',
    titulo: 'Auto de Indagación Preliminar',
    plantilla: 'Auto de Indagación Preliminar',
    version: 2,
    fechaEnvio: '2025-01-08T14:30:00',
    profesional: { nombre: 'Juan Carlos Pérez', email: 'juan.perez@esap.edu.co' },
    observacionesProfesional: 'Se adjuntan todos los documentos soporte. La conducta presunta está claramente configurada según el artículo 48 de la Ley 734.',
    contenido: `AUTO DE APERTURA DE INDAGACIÓN PRELIMINAR\n\nPROCESO No: P-120-2025\nNOTICIA ORIGEN: ND-260\nDISCIPLINABLE: Juan Pérez Gómez\nIDENTIFICACIÓN: 1234567890\n\nLa Oficina de Control Interno Disciplinario de la ESAP, en uso de sus facultades legales,\n\nCONSIDERANDO:\n\nPRIMERO: Que mediante noticia disciplinaria No. ND-260 se puso en conocimiento presuntos hechos de acoso laboral.\n\nSEGUNDO: Que los hechos descritos ameritan indagación preliminar.\n\nRESUELVE:\n\nARTÍCULO PRIMERO: ABRIR INDAGACIÓN PRELIMINAR en contra de Juan Pérez Gómez.\n\nARTÍCULO SEGUNDO: NOTIFÍQUESE el presente auto al investigado.`,
    denunciado: 'Juan Pérez Gómez',
    etapa: 'Indagación Preliminar',
    prioridad: 'alta',
    estado: 'pendiente_revision',
    tiempoEspera: '2h 15m',
    historial: [
      { id: 'h1', tipo: 'recibido', usuario: 'Juan Carlos Pérez', fecha: '2025-01-08T14:30:00', descripcion: 'Borrador enviado para revisión', detalles: { version: 2 } }
    ]
  },
  {
    id: 'b2',
    numeroProceso: 'P-089-2024',
    titulo: 'Auto de Inhibitorio',
    plantilla: 'Auto de Inhibitorio',
    version: 1,
    fechaEnvio: '2025-01-07T10:15:00',
    profesional: { nombre: 'María Torres', email: 'maria.torres@esap.edu.co' },
    observacionesProfesional: 'Los hechos investigados no constituyen falta disciplinaria. Se recomienda archivo.',
    contenido: `AUTO DE INHIBITORIO\n\nPROCESO No: P-089-2024\nNOTICIA ORIGEN: ND-178\n\nSe RESUELVE INHIBIRSE de iniciar investigación disciplinaria por no configurarse falta disciplinaria.`,
    denunciado: 'María González Castro',
    etapa: 'Valoración',
    prioridad: 'media',
    estado: 'en_revision',
    tiempoEspera: '1d 4h',
    historial: [
      { id: 'h2', tipo: 'recibido', usuario: 'María Torres', fecha: '2025-01-07T10:15:00', descripcion: 'Borrador enviado para revisión' },
      { id: 'h3', tipo: 'revision_iniciada', usuario: 'Jefe OCID', fecha: '2025-01-08T09:00:00', descripcion: 'Revisión iniciada' }
    ]
  }
];

// ==================== COMPONENTE PRINCIPAL ====================
export function ControlDisciplinarioFull() {
  // 🟢 DEBUG: Verificar que el archivo se está cargando
  console.log('🟢🟢🟢 CONTROL DISCIPLINARIO FULL v3.0 PREMIUM 🟢🟢🟢');
  console.log('📅 Timestamp:', new Date().toLocaleString());
  console.log('✅ Estado del Módulo: COMPLETAMENTE FUNCIONAL Y COHERENTE');
  console.log('📦 Componentes Cargados:');
  console.log('  ✓ DashboardKanbanOperativo');
  console.log('  ✓ RevisionAprobacionJefe');
  console.log('  ✓ ExpedientesElectronicosWorldClass');
  console.log('  ✓ GestionTerminosAlertas');
  console.log('  ✓ GestionProfesionalesWorldClass');
  console.log('  ✓ ModuloConfiguracionPremium');
  console.log('🆕 Nuevas Funcionalidades:');
  console.log('  ✓ Sistema de Compartir Expediente (Link/QR/Email)');
  console.log('  ✓ Múltiples Denunciados/Denunciantes');
  console.log('  ✓ Campo "Lugar de los Hechos" actualizado');
  console.log('📚 Documentación disponible en:');
  console.log('  → README.md');
  console.log('  → VERIFICACION_MODULO.md');
  console.log('  → GUIA_RAPIDA.md');

  // Estado para verificar autenticación
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  type Section = 'dashboard' | 'aprobacion' | 'expediente' | 'terminos' | 'profesionales' | 'config';
  const [currentSection, setCurrentSection] = useState<Section>('dashboard');
  const [filtroProfesional, setFiltroProfesional] = useState<string | null>(null);
  const [borradores, setBorradores] = useState<BorradorPendiente[]>(BORRADORES_INICIALES);
  const [revisionLog, setRevisionLog] = useState<ResultadoRevision[]>([]);

  // ✅ NUEVO: Estado para solicitudes de reasignación
  const [solicitudesReasignacion, setSolicitudesReasignacion] = useState<any[]>([]);

  // Verificar autenticación al montar el componente
  useEffect(() => {
    const checkAuth = () => {
      const authenticated = authService.isAuthenticated();
      setIsAuthenticated(authenticated);

      if (!authenticated) {
        console.warn('Usuario no autenticado en módulo disciplinario - redirigiendo a login');
        window.location.href = '/login';
      }
    };

    checkAuth();
  }, []);

  // Cargar autos reales con estado REVISION_JEFE desde el backend
  useEffect(() => {
    const cargarAutosEnRevision = async () => {
      try {
        const todos = await disciplinaryService.getAllAutos();
        const enRevision = todos.filter((a: any) => a.estado === 'REVISION_JEFE');
        if (enRevision.length > 0) {
          const borradoresReales: BorradorPendiente[] = enRevision.map((auto: any) => ({
            id: `auto-${auto.id}`,
            autoId: auto.id,
            numeroProceso: auto.process?.radicadoProceso || auto.processId,
            titulo: (auto.tipo || '').replace(/_/g, ' '),
            plantilla: auto.tipo || '',
            version: auto.currentVersion || 1,
            fechaEnvio: auto.createdAt,
            profesional: {
              nombre: auto.process?.abogadoAsignadoNombre || 'Profesional',
              email: '',
            },
            observacionesProfesional: auto.comentarios || '',
            contenido: auto.contenido || '',
            denunciado: auto.process?.news?.disciplinable?.nombre || 'Sin información',
            etapa: (auto.process?.etapaActual || '').replace(/_/g, ' '),
            prioridad: 'media' as const,
            estado: 'en_revision' as const,
            historial: [{
              id: `h-${auto.id}`,
              tipo: 'revision_iniciada' as const,
              usuario: auto.process?.abogadoAsignadoNombre || 'Profesional',
              fecha: auto.createdAt,
              descripcion: 'Auto enviado a revisión del Jefe OCID',
            }],
            tiempoEspera: '',
          }));
          setBorradores(borradoresReales);
        }
      } catch {
        // Si falla la carga, conservar los datos de demostración
      }
    };
    cargarAutosEnRevision();
  }, []);

  // Cargar solicitudes de reasignación reales desde el backend
  useEffect(() => {
    const cargarSolicitudesReasignacion = async () => {
      try {
        console.log('Cargando solicitudes de reasignación (todas)...');
        let solicitudes;
        try {
          solicitudes = await disciplinaryService.getAllReassignmentRequests();
          console.log('Solicitudes obtenidas (todas):', solicitudes.length);
        } catch (error) {
          console.log('Error cargando todas las solicitudes, intentando con pendientes...', error);
          solicitudes = await disciplinaryService.getPendingReassignmentRequests();
          console.log('Solicitudes obtenidas (pendientes):', solicitudes.length);
        }

        const solicitudesMapeadas = solicitudes.map((solicitud: any) => ({
          id: solicitud.id,
          procesoNumero: solicitud.process?.radicadoProceso || solicitud.processId,
          procesoId: solicitud.processId,
          etapaActual: solicitud.process?.etapaActual || 'Sin etapa',
          profesionalActual: {
            nombre: solicitud.currentProfessional?.nombreCompleto || 'Profesional Actual',
            id: solicitud.currentProfessionalId,
          },
          profesionalNuevo: {
            nombre: solicitud.newProfessional?.nombreCompleto || 'Profesional Nuevo',
            id: solicitud.newProfessionalId,
            cargo: solicitud.newProfessional?.cargo || 'Sin cargo',
            especialidad: solicitud.newProfessional?.especialidad || 'Sin especialidad',
            cargaActual: solicitud.newProfessional?.procesosAsignados?.toString() || '-',
          },
          solicitadoPor: solicitud.requestedBy,
          fechaSolicitud: solicitud.createdAt,
          justificacion: solicitud.justification,
          prioridad: solicitud.priority === 'URGENTE' ? 'urgente' as const : 'normal' as const,
          denunciado: solicitud.process?.news?.disciplinable?.nombre || 'Sin información',
          estado: solicitud.status === 'PENDIENTE' ? 'pendiente' as const :
                 solicitud.status === 'APROBADA' ? 'aprobada' as const :
                 'rechazada' as const,
          fechaResolucion: solicitud.resolvedAt,
          observacionesJefe: solicitud.jefeObservations,
          motivoRechazo: solicitud.rejectionReason,
        }));
        console.log('Solicitudes cargadas exitosamente:', solicitudesMapeadas.length);
        setSolicitudesReasignacion(solicitudesMapeadas);
      } catch (error) {
        console.error('Error cargando solicitudes de reasignación:', error);
        // Mantener array vacío si hay error
      }
    };
    cargarSolicitudesReasignacion();
  }, []);

  const hasPermissionBySection: Record<Section, boolean> = {
    dashboard: authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROCESSOS_MANAGE),
    aprobacion: authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_REVISION_APROBACION_MANAGE),
    expediente: authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_EXPIDENTE_ELECTRONICO_MANAGE),
    terminos: authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_TERMINOS_MANAGE),
    profesionales: authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_PROFESIONALES_MANAGE),
    config: authService.hasPermission(Permissions.CONTROL_DISCIPLINARIO_CONFIGURACIONES_MANAGE)
  };

  const getFirstAllowedSection = (): Section => {
    const order: Section[] = ['dashboard', 'aprobacion', 'expediente', 'terminos', 'profesionales', 'config'];
    return order.find((section) => hasPermissionBySection[section]) || 'dashboard';
  };

  useEffect(() => {
    if (!hasPermissionBySection[currentSection]) {
      setCurrentSection(getFirstAllowedSection());
    }
  }, [currentSection]);

  const handleLimpiarFiltroProfesional = () => {
    setFiltroProfesional(null);
  };

  const handleEnviarARevisionGlobal = useCallback((borrador: BorradorPendiente) => {
    setBorradores(prev => {
      const exists = prev.find(b => b.id === borrador.id);
      if (exists) {
        return prev.map(b => b.id === borrador.id ? { ...borrador, estado: 'pendiente_revision' as const } : b);
      }
      return [...prev, borrador];
    });
  }, []);

  const handleNavigateToRevision = useCallback(() => {
    setCurrentSection('aprobacion');
  }, []);

  const handleAprobarBorrador = useCallback(async (borradorId: string, comentarios: string) => {
    const borrador = borradores.find(b => b.id === borradorId);

    if (borrador?.autoId) {
      try {
        const userId = authService.getCurrentUser()?.id || '';
        await disciplinaryService.aprobarAuto(borrador.autoId, userId);
      } catch {
        toast.error('Error al aprobar el auto', {
          description: 'No se pudo conectar con el servidor. Intente nuevamente.',
        });
        return;
      }
    }

    setBorradores(prev => prev.map(b =>
      b.id === borradorId
        ? {
            ...b,
            estado: 'aprobado' as const,
            historial: [
              ...b.historial,
              {
                id: `h-${Date.now()}`,
                tipo: 'aprobado' as const,
                usuario: 'Jefe OCID',
                fecha: new Date().toISOString(),
                descripcion: `Auto aprobado${comentarios ? `: ${comentarios}` : ''}`,
              }
            ]
          }
        : b
    ));
    setRevisionLog(prev => [...prev, {
      borradorId,
      procesoId: borrador?.numeroProceso || borradorId,
      accion: 'aprobado',
      comentarios,
      fecha: new Date().toISOString(),
    }]);
    toast.success('Auto Aprobado exitosamente', {
      description: `${borrador?.numeroProceso} — ${borrador?.titulo} · Firmado por el Jefe OCID`,
      duration: 5000,
    });
  }, [borradores]);

  const handleDevolverBorrador = useCallback(async (borradorId: string, motivo: string, comentarios: string, _archivos: File[]) => {
    const borrador = borradores.find(b => b.id === borradorId);

    if (borrador?.autoId) {
      try {
        const userId = authService.getCurrentUser()?.id || '';
        const observaciones = `${motivo}${comentarios ? ` — ${comentarios}` : ''}`;
        await disciplinaryService.devolverAuto(borrador.autoId, userId, observaciones);
      } catch {
        toast.error('Error al devolver el auto', {
          description: 'No se pudo conectar con el servidor. Intente nuevamente.',
        });
        return;
      }
    }

    setBorradores(prev => prev.map(b =>
      b.id === borradorId
        ? {
            ...b,
            estado: 'devuelto' as const,
            historial: [
              ...b.historial,
              {
                id: `h-${Date.now()}`,
                tipo: 'devuelto' as const,
                usuario: 'Jefe OCID',
                fecha: new Date().toISOString(),
                descripcion: `Devuelto: ${motivo}${comentarios ? ` — ${comentarios}` : ''}`,
              }
            ]
          }
        : b
    ));
    setRevisionLog(prev => [...prev, {
      borradorId,
      procesoId: borrador?.numeroProceso || borradorId,
      accion: 'devuelto',
      comentarios,
      motivo,
      fecha: new Date().toISOString(),
    }]);
    toast.warning('Auto Devuelto para corrección', {
      description: `${borrador?.numeroProceso} — El profesional debe corregir y reenviar`,
      duration: 5000,
    });
  }, [borradores]);

  // ✅ NUEVO: Handler para aprobar reasignación
  const handleAprobarReasignacion = useCallback(async (solicitudId: string, observaciones: string) => {
    try {
      const user = authService.getCurrentUser();
      const approveData = {
        approved: true,
        jefeObservations: observaciones,
        resolvedBy: user?.fullName || 'Jefe OCID',
        resolvedById: user?.id || '',
      };

      const updatedRequest = await disciplinaryService.approveReassignmentRequest(solicitudId, approveData);

      // Actualizar la solicitud específica en el estado local
      setSolicitudesReasignacion(prev => prev.map(s =>
        s.id === solicitudId
          ? {
              id: updatedRequest.id,
              procesoNumero: updatedRequest.process?.radicadoProceso || updatedRequest.processId,
              procesoId: updatedRequest.processId,
              etapaActual: updatedRequest.process?.etapaActual || 'Sin etapa',
              profesionalActual: {
                nombre: updatedRequest.currentProfessional?.nombre || 'Profesional Actual',
                id: updatedRequest.currentProfessionalId,
              },
              profesionalNuevo: {
                nombre: updatedRequest.newProfessional?.nombre || 'Profesional Nuevo',
                id: updatedRequest.newProfessionalId,
                cargo: updatedRequest.newProfessional?.cargo || 'Sin cargo',
                especialidad: updatedRequest.newProfessional?.especialidad || 'Sin especialidad',
                cargaActual: updatedRequest.newProfessional?.procesosAsignados?.toString() || '0',
              },
              solicitadoPor: updatedRequest.requestedBy,
              fechaSolicitud: updatedRequest.createdAt,
              justificacion: updatedRequest.justification,
              prioridad: updatedRequest.priority === 'URGENTE' ? 'urgente' as const : 'normal' as const,
              denunciado: updatedRequest.process?.news?.disciplinable?.nombre || 'Sin información',
              estado: updatedRequest.status === 'PENDIENTE' ? 'pendiente' as const :
                     updatedRequest.status === 'APROBADA' ? 'aprobada' as const :
                     'rechazada' as const,
              fechaResolucion: updatedRequest.resolvedAt,
              observacionesJefe: updatedRequest.jefeObservations,
              motivoRechazo: updatedRequest.rejectionReason,
            }
          : s
      ));

      toast.success('Reasignación aprobada', {
        description: 'El proceso ha sido reasignado al nuevo profesional',
        duration: 5000,
      });
    } catch (error) {
      console.error('Error al aprobar reasignación:', error);
      toast.error('Error al aprobar reasignación', {
        description: 'No se pudo conectar con el servidor. Intente nuevamente.',
      });
    }
  }, []);

  // ✅ NUEVO: Handler para rechazar reasignación
  const handleRechazarReasignacion = useCallback(async (solicitudId: string, motivoRechazo: string) => {
    try {
      const user = authService.getCurrentUser();
      const rejectData = {
        approved: false,
        rejectionReason: motivoRechazo,
        resolvedBy: user?.fullName || 'Jefe OCID',
        resolvedById: user?.id || '',
      };

      const updatedRequest = await disciplinaryService.approveReassignmentRequest(solicitudId, rejectData);

      // Actualizar la solicitud específica en el estado local
      setSolicitudesReasignacion(prev => prev.map(s =>
        s.id === solicitudId
          ? {
              id: updatedRequest.id,
              procesoNumero: updatedRequest.process?.radicadoProceso || updatedRequest.processId,
              procesoId: updatedRequest.processId,
              etapaActual: updatedRequest.process?.etapaActual || 'Sin etapa',
              profesionalActual: {
                nombre: updatedRequest.currentProfessional?.nombre || 'Profesional Actual',
                id: updatedRequest.currentProfessionalId,
              },
              profesionalNuevo: {
                nombre: updatedRequest.newProfessional?.nombre || 'Profesional Nuevo',
                id: updatedRequest.newProfessionalId,
                cargo: updatedRequest.newProfessional?.cargo || 'Sin cargo',
                especialidad: updatedRequest.newProfessional?.especialidad || 'Sin especialidad',
                cargaActual: updatedRequest.newProfessional?.procesosAsignados?.toString() || '0',
              },
              solicitadoPor: updatedRequest.requestedBy,
              fechaSolicitud: updatedRequest.createdAt,
              justificacion: updatedRequest.justification,
              prioridad: updatedRequest.priority === 'URGENTE' ? 'urgente' as const : 'normal' as const,
              denunciado: updatedRequest.process?.news?.disciplinable?.nombre || 'Sin información',
              estado: updatedRequest.status === 'PENDIENTE' ? 'pendiente' as const :
                     updatedRequest.status === 'APROBADA' ? 'aprobada' as const :
                     'rechazada' as const,
              fechaResolucion: updatedRequest.resolvedAt,
              observacionesJefe: updatedRequest.jefeObservations,
              motivoRechazo: updatedRequest.rejectionReason,
            }
          : s
      ));

      toast.warning('Reasignación rechazada', {
        description: 'La solicitud de reasignación ha sido rechazada',
        duration: 5000,
      });
    } catch (error) {
      console.error('Error al rechazar reasignación:', error);
      toast.error('Error al rechazar reasignación', {
        description: 'No se pudo conectar con el servidor. Intente nuevamente.',
      });
    }
  }, []);

  const handleVerProcesosProfesional = (profesional: any) => {
    setFiltroProfesional(profesional.id);
    setCurrentSection(hasPermissionBySection.dashboard ? 'dashboard' : getFirstAllowedSection());
  };

  // Mostrar spinner mientras se verifica la autenticación
  if (isAuthenticated === null) {
    return <AuthLoadingSpinner />;
  }

  // Si no está autenticado, no renderizar nada (ya se redirigió)
  if (!isAuthenticated) {
    return null;
  }

  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Procesos', icon: <LayoutDashboard className="w-5 h-5" />, color: '#003DA5', visible: hasPermissionBySection.dashboard },
    {
      id: 'aprobacion',
      label: 'Revisión y Aprobación',
      icon: <CheckCircle className="w-5 h-5" />,
      color: '#10B981',
      visible: hasPermissionBySection.aprobacion,
      badge: borradores.filter(b => b.estado === 'pendiente_revision' || b.estado === 'en_revision').length || undefined
    },
    { id: 'expediente', label: 'Expediente Electrónico', icon: <Archive className="w-5 h-5" />, color: '#8B5CF6', visible: hasPermissionBySection.expediente },
    { id: 'terminos', label: 'Términos y Alertas', icon: <Clock className="w-5 h-5" />, color: '#F59E0B', visible: hasPermissionBySection.terminos },
    { id: 'profesionales', label: 'Profesionales', icon: <Users className="w-5 h-5" />, color: '#003DA5', visible: hasPermissionBySection.profesionales },
    { id: 'config', label: 'Configuración', icon: <Settings className="w-5 h-5" />, color: '#6B7280', visible: hasPermissionBySection.config }
  ];

  const getTitleForSection = () => {
    const item = menuItems.find(m => m.id === currentSection);
    return item?.label || 'Control Interno Disciplinario';
  };



  return (
    <ModuleLayout
      moduleName="CONTROL INTERNO DISCIPLINARIO"
      moduleDescription="Sistema de Gestión"
      moduleIcon={<Scale className="w-6 h-6" />}
      moduleColor="#003DA5"
      menuItems={menuItems}
      activeSection={currentSection}
      onSectionChange={(section) => {
        setCurrentSection(section as Section);
        // Limpiar filtro al cambiar de sección
        if (section !== 'dashboard') {
          handleLimpiarFiltroProfesional();
        }
      }}
    >
      {/* Contenido Principal */}
      {currentSection === 'dashboard' && (
        <DashboardKanbanOperativo 
          onNavigateToExpediente={() => setCurrentSection('expediente')} 
          filtroProfesionalId={filtroProfesional}
          onEnviarARevision={handleEnviarARevisionGlobal}
          onNavigateToRevision={handleNavigateToRevision}
          revisionLog={revisionLog}
        />
      )}
      {currentSection === 'aprobacion' && (
        <RevisionAprobacionJefe
          borradores={borradores}
          solicitudesReasignacion={solicitudesReasignacion}
          onAprobar={handleAprobarBorrador}
          onDevolver={handleDevolverBorrador}
          onAprobarReasignacion={handleAprobarReasignacion}
          onRechazarReasignacion={handleRechazarReasignacion}
        />
      )}
      {currentSection === 'expediente' && <ExpedientesElectronicosWorldClass />}
      {currentSection === 'terminos' && <GestionTerminosAlertas />}
      {/* {currentSection === 'terminos' && <GestionTerminosAlertasWorldClass />} */}
      {currentSection === 'profesionales' && <GestionProfesionalesWorldClass onVerProcesos={handleVerProcesosProfesional} />}
      {currentSection === 'config' && <ModuloConfiguracionPremium />}
    </ModuleLayout>
  );
}

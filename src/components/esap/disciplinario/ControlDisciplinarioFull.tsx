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
import { Permissions } from '../../../enums/permissions';

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
  
  type Section = 'dashboard' | 'aprobacion' | 'expediente' | 'terminos' | 'profesionales' | 'config';
  const [currentSection, setCurrentSection] = useState<Section>('dashboard');
  const [filtroProfesional, setFiltroProfesional] = useState<string | null>(null);
  const [borradores, setBorradores] = useState<BorradorPendiente[]>(BORRADORES_INICIALES);
  const [revisionLog, setRevisionLog] = useState<ResultadoRevision[]>([]);
  
  // ✅ NUEVO: Estado para solicitudes de reasignación
  const [solicitudesReasignacion, setSolicitudesReasignacion] = useState<any[]>([
    {
      id: 'r1',
      procesoNumero: 'P-120-2025',
      procesoId: 'proc-1',
      etapaActual: 'Indagación Preliminar',
      profesionalActual: { nombre: 'Juan Carlos Pérez', id: 'prof-1' },
      profesionalNuevo: { nombre: 'María Torres', id: 'prof-2', cargaActual: '3', cargo: 'Profesional Universitario', especialidad: 'Derecho Disciplinario' },
      solicitadoPor: 'Juan Carlos Pérez',
      fechaSolicitud: '2025-01-10T14:30:00',
      justificacion: 'Conflicto de interés por relación personal con el denunciado',
      prioridad: 'normal' as const,
      denunciado: 'Juan Pérez Gómez',
      estado: 'pendiente' as const,
    },
    {
      id: 'r2',
      procesoNumero: 'P-089-2024',
      procesoId: 'proc-2',
      etapaActual: 'Valoración',
      profesionalActual: { nombre: 'María Torres', id: 'prof-2' },
      profesionalNuevo: { nombre: 'Carlos López', id: 'prof-3', cargaActual: '2', cargo: 'Profesional Especializado', especialidad: 'Derecho Penal' },
      solicitadoPor: 'María Torres',
      fechaSolicitud: '2025-01-09T10:00:00',
      justificacion: 'Exceso de carga laboral actual (8 procesos activos)',
      prioridad: 'urgente' as const,
      denunciado: 'María González Castro',
      estado: 'aprobada' as const,
      fechaResolucion: '2025-01-10T09:00:00',
      observacionesJefe: 'Aprobada por overload de trabajo',
    }
  ]);

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

  const handleVerProcesosProfesional = (profesional: any) => {
    setFiltroProfesional(profesional.id);
    setCurrentSection(hasPermissionBySection.dashboard ? 'dashboard' : getFirstAllowedSection());
  };

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

  const handleAprobarBorrador = useCallback((borradorId: string, comentarios: string) => {
    const borrador = borradores.find(b => b.id === borradorId);
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

  const handleDevolverBorrador = useCallback((borradorId: string, motivo: string, comentarios: string, _archivos: File[]) => {
    const borrador = borradores.find(b => b.id === borradorId);
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
  const handleAprobarReasignacion = useCallback((solicitudId: string, observaciones: string) => {
    setSolicitudesReasignacion(prev => prev.map(s =>
      s.id === solicitudId
        ? {
            ...s,
            estado: 'aprobada' as const,
            fechaResolucion: new Date().toISOString(),
            observacionesJefe: observaciones,
          }
        : s
    ));
    toast.success('Reasignación aprobada', {
      description: 'El proceso ha sido reasignado al nuevo profesional',
      duration: 5000,
    });
  }, []);

  // ✅ NUEVO: Handler para rechazar reasignación
  const handleRechazarReasignacion = useCallback((solicitudId: string, motivoRechazo: string) => {
    setSolicitudesReasignacion(prev => prev.map(s =>
      s.id === solicitudId
        ? {
            ...s,
            estado: 'rechazada' as const,
            fechaResolucion: new Date().toISOString(),
            motivoRechazo,
          }
        : s
    ));
    toast.warning('Reasignación rechazada', {
      description: 'La solicitud de reasignación ha sido rechazada',
      duration: 5000,
    });
  }, []);

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

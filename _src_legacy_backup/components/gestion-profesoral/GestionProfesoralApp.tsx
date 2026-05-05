/**
 * APLICACIÓN PRINCIPAL DE GESTIÓN PROFESORAL - ESAP
 * 
 * Orquestador principal que maneja la navegación entre:
 * - Dashboard/Visualizador (para aprobadores)
 * - Wizard de Creación PTA (para docentes)
 * - Vista Detalle PTA (lectura/edición)
 * 
 * Integra todos los módulos del sistema PTA
 */

import { useState, useEffect } from 'react';
import { PTAProvider } from '../../contexts/PTAContext';
import { VisualizadorPTAAjustes } from './VisualizadorPTAAjustes';
import { WizardCrearPTA } from './WizardCrearPTA';
import { DashboardDocente } from './DashboardDocente';
import { DashboardAprobadorIntegrado } from './DashboardAprobadorIntegrado';
import { VistaDetallePTA } from './VistaDetallePTA';
import { ModalAprobacion, type AccionAprobacion } from './ModalAprobacion';
import { NotificationCenter } from '../notifications/NotificationCenter';
import { notificationService, type Notificacion } from '../../services/notificationService';

// ============================================================================
// TIPOS
// ============================================================================

type Vista = 'dashboard' | 'crear-pta' | 'detalle-pta';

interface Usuario {
  nombre: string;
  email: string;
  rol: 'docente' | 'coordinador' | 'director' | 'subdirector' | 'admin';
  cedula?: string;
}

interface DocenteInfo {
  cedula: string;
  nombreCompleto: string;
  perfilAcademico: 'Especialización' | 'Maestría' | 'Doctorado';
  categoria: 'Auxiliar' | 'Asistente' | 'Asociado' | 'Titular';
  sedeVinculacion: string;
  tipoVinculacion: 'Carrera1' | 'Carrera2' | 'Periodo Prueba' | 'Ocasional' | 'Visitante' | 'Especial';
  tipoDedicacion: 'TC' | 'MT';
  nucleoTematico: string;
  horasProgramables: number;
}

// ============================================================================
// DATOS MOCK (temporal - vendrán del backend)
// ============================================================================

const DOCENTE_MOCK: DocenteInfo = {
  cedula: '1234567890',
  nombreCompleto: 'Dr. Carlos Alberto Méndez Rivera',
  perfilAcademico: 'Doctorado',
  categoria: 'Asociado',
  sedeVinculacion: 'Territorial Meta',
  tipoVinculacion: 'Carrera2',
  tipoDedicacion: 'TC',
  nucleoTematico: 'Estado y Poder',
  horasProgramables: 800
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

interface GestionProfesoralAppProps {
  usuario: Usuario;
  onLogout: () => void;
}

export function GestionProfesoralApp({ usuario, onLogout }: GestionProfesoralAppProps) {
  const [vistaActual, setVistaActual] = useState<Vista>('dashboard');
  const [ptaSeleccionado, setPTASeleccionado] = useState<string | null>(null);
  const [modalAprobacionVisible, setModalAprobacionVisible] = useState(false);
  const [accionAprobacion, setAccionAprobacion] = useState<AccionAprobacion | null>(null);

  // ============================================================================
  // INICIALIZAR NOTIFICACIONES MOCK
  // ============================================================================

  useEffect(() => {
    // Inicializar notificaciones mock según el rol del usuario
    const esDocente = usuario.rol === 'docente';
    notificationService.inicializarMock(
      usuario.cedula || '1234567890',
      usuario.email,
      esDocente
    );
  }, [usuario]);

  // ============================================================================
  // HANDLERS DE NOTIFICACIONES
  // ============================================================================

  const handleClickNotificacion = (notificacion: Notificacion) => {
    // Navegar según el tipo de acción
    if (notificacion.accion) {
      const { tipo, ptaId } = notificacion.accion;

      switch (tipo) {
        case 'ver-pta':
          handleVerDetallePTA(ptaId);
          break;
        case 'editar-pta':
          handleEditarPTA(ptaId);
          break;
        case 'aprobar-pta':
          handleVerDetallePTA(ptaId);
          break;
      }
    }
  };

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleCrearNuevoPTA = () => {
    setVistaActual('crear-pta');
  };

  const handleGuardarPTA = (pta: any) => {
    console.log('Guardando PTA:', pta);
    // TODO: Llamar API para guardar borrador
  };

  const handleEnviarPTA = (pta: any) => {
    console.log('Enviando PTA a aprobación:', pta);
    // TODO: Llamar API para enviar a aprobación
    alert('¡PTA enviado a aprobación exitosamente!');
    setVistaActual('dashboard');
  };

  const handleCancelarCreacion = () => {
    if (confirm('¿Seguro que quieres cancelar? Los cambios no guardados se perderán.')) {
      setVistaActual('dashboard');
    }
  };

  const handleVerDetallePTA = (ptaId: string) => {
    setPTASeleccionado(ptaId);
    setVistaActual('detalle-pta');
  };

  const handleEditarPTA = (ptaId: string) => {
    setPTASeleccionado(ptaId);
    setVistaActual('crear-pta'); // TODO: Cargar datos del PTA para edición
  };

  const handleDuplicarPTA = (ptaId: string) => {
    console.log('Duplicando PTA:', ptaId);
    // TODO: Cargar datos del PTA y crear uno nuevo
    alert('Funcionalidad de duplicar PTA próximamente');
  };

  const handleEliminarPTA = (ptaId: string) => {
    console.log('Eliminando PTA:', ptaId);
    // TODO: Llamar API para eliminar
  };

  const handleAbrirModalAprobacion = (ptaId: string, accion: AccionAprobacion) => {
    setPTASeleccionado(ptaId);
    setAccionAprobacion(accion);
    setModalAprobacionVisible(true);
  };

  const handleCerrarModalAprobacion = () => {
    setModalAprobacionVisible(false);
  };

  const handleAprobarPTA = (ptaId: string) => {
    console.log('Aprobando PTA:', ptaId);
    // TODO: Llamar API para aprobar
    alert('¡PTA aprobado exitosamente!');
    setModalAprobacionVisible(false);
  };

  const handleRechazarPTA = (ptaId: string) => {
    console.log('Rechazando PTA:', ptaId);
    // TODO: Llamar API para rechazar
    alert('¡PTA rechazado exitosamente!');
    setModalAprobacionVisible(false);
  };

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // (Ya no necesitamos subscribirnos aquí, el NotificationCenter lo hace internamente)

  // ============================================================================
  // RENDER
  // ============================================================================

  // Vista según rol del usuario
  if (usuario.rol === 'docente') {
    if (vistaActual === 'crear-pta') {
      return (
        <PTAProvider>
          <WizardCrearPTA
            docenteInfo={DOCENTE_MOCK}
            onGuardar={handleGuardarPTA}
            onEnviar={handleEnviarPTA}
            onCancelar={handleCancelarCreacion}
          />
        </PTAProvider>
      );
    }

    // Dashboard del docente (mis PTAs)
    return (
      <PTAProvider>
        <DashboardDocente
          docente={{
            cedula: DOCENTE_MOCK.cedula,
            nombreCompleto: DOCENTE_MOCK.nombreCompleto,
            email: usuario.email
          }}
          onCrearNuevo={handleCrearNuevoPTA}
          onVerDetalle={handleVerDetallePTA}
          onEditar={handleEditarPTA}
          onDuplicar={handleDuplicarPTA}
          onEliminar={handleEliminarPTA}
        />
      </PTAProvider>
    );
  }

  // Vista para aprobadores (coordinador, director, subdirector, admin)
  // Determinar el nivel del aprobador
  const nivelAprobador = {
    coordinador: 1,
    director: 2,
    subdirector: 3,
    admin: 1 // Admin puede ver como nivel 1
  }[usuario.rol] as 1 | 2 | 3;

  // Si estamos viendo detalle de un PTA
  if (vistaActual === 'detalle-pta' && ptaSeleccionado) {
    return (
      <PTAProvider>
        <VistaDetallePTA
          ptaId={ptaSeleccionado}
          onClose={() => setVistaActual('dashboard')}
          onAprobar={() => handleAbrirModalAprobacion(ptaSeleccionado, 'aprobar')}
          onRechazar={() => handleAbrirModalAprobacion(ptaSeleccionado, 'rechazar')}
        />

        {modalAprobacionVisible && accionAprobacion && (
          <ModalAprobacion
            isOpen={modalAprobacionVisible}
            onClose={handleCerrarModalAprobacion}
            accion={accionAprobacion}
            ptaInfo={{
              id: ptaSeleccionado,
              docenteNombre: 'Dr. Carlos Alberto Méndez Rivera', // TODO: Cargar del PTA
              periodoAcademico: '2025-1' // TODO: Cargar del PTA
            }}
            nivelAprobador={nivelAprobador}
            onConfirmar={(observaciones) => {
              if (accionAprobacion === 'aprobar') {
                handleAprobarPTA(ptaSeleccionado);
              } else {
                handleRechazarPTA(ptaSeleccionado);
              }
            }}
          />
        )}
      </PTAProvider>
    );
  }

  // Dashboard de aprobadores
  return (
    <PTAProvider>
      <DashboardAprobadorIntegrado
        onVerDetalle={handleVerDetallePTA}
        onAprobar={(ptaId) => handleAbrirModalAprobacion(ptaId, 'aprobar')}
        onRechazar={(ptaId) => handleAbrirModalAprobacion(ptaId, 'rechazar')}
      />

      {modalAprobacionVisible && accionAprobacion && ptaSeleccionado && (
        <ModalAprobacion
          isOpen={modalAprobacionVisible}
          onClose={handleCerrarModalAprobacion}
          accion={accionAprobacion}
          ptaInfo={{
            id: ptaSeleccionado,
            docenteNombre: 'Dr. Carlos Alberto Méndez Rivera', // TODO: Cargar del PTA
            periodoAcademico: '2025-1' // TODO: Cargar del PTA
          }}
          nivelAprobador={nivelAprobador}
          onConfirmar={(observaciones) => {
            console.log('Observaciones:', observaciones);
            if (accionAprobacion === 'aprobar') {
              handleAprobarPTA(ptaSeleccionado);
            } else {
              handleRechazarPTA(ptaSeleccionado);
            }
          }}
        />
      )}

      {/* Centro de Notificaciones (fixed top-right) */}
      <div className="fixed top-4 right-4 z-50">
        <NotificationCenter 
          usuarioCedula={usuario.cedula || '000000'}
          usuarioEmail={usuario.email}
          onClickNotificacion={handleClickNotificacion}
        />
      </div>
    </PTAProvider>
  );
}
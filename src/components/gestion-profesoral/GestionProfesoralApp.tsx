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

type Vista = 'dashboard' | 'crear-pta' | 'detalle-pta' | 'dashboard-docente' | 'dashboard-aprobador' | 'visualizador-ajustes';

interface Usuario {
  nombre: string;
  email: string;
  rol: 'docente' | 'coordinador' | 'director' | 'subdirector' | 'admin' | 'superuser';
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

  // Verificar si es superuser o tiene acceso completo al módulo
  // Si el usuario llegó a este componente, tiene acceso al módulo de gestión-profesoral
  // Por lo tanto, se le debe mostrar el selector de vista para acceder a todos los componentes
  const esSuperuser = usuario.rol === 'superuser' || usuario.rol === 'admin';

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
  // RENDER - SELECTOR DE VISTA PARA SUPERUSER
  // ============================================================================

  if (esSuperuser) {
    return (
      <PTAProvider>
        <div className="min-h-screen bg-gray-50">
          {/* Header con selector de vista */}
          <div className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Gestión Profesoral</h1>
                  <p className="text-sm text-gray-600">Modo Superuser - Acceso a todos los componentes</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Usuario:</span>
                  <span className="text-sm font-medium text-gray-900">{usuario.nombre}</span>
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                    {usuario.rol.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Navegación de vistas */}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => setVistaActual('dashboard')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${vistaActual === 'dashboard'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  📊 Dashboard Principal
                </button>
                <button
                  onClick={() => setVistaActual('dashboard-docente')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${vistaActual === 'dashboard-docente'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  👨‍🏫 Dashboard Docente
                </button>
                <button
                  onClick={() => setVistaActual('dashboard-aprobador')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${vistaActual === 'dashboard-aprobador'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  ✅ Dashboard Aprobador
                </button>
                <button
                  onClick={() => setVistaActual('crear-pta')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${vistaActual === 'crear-pta'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  ➕ Crear PTA (Wizard)
                </button>
                <button
                  onClick={() => setVistaActual('visualizador-ajustes')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${vistaActual === 'visualizador-ajustes'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  ⚙️ Visualizador Ajustes
                </button>
              </div>
            </div>
          </div>

          {/* Contenido según vista seleccionada */}
          <div className="max-w-7xl mx-auto px-4 py-6">
            {vistaActual === 'dashboard' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Vista General - Todos los Componentes</h2>
                  <p className="text-gray-600 mb-4">Selecciona una vista específica del menú superior para ver cada componente.</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <h3 className="font-medium text-blue-900">👨‍🏫 Dashboard Docente</h3>
                      <p className="text-sm text-blue-700 mt-1">Vista del docente con sus PTAs</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <h3 className="font-medium text-green-900">✅ Dashboard Aprobador</h3>
                      <p className="text-sm text-green-700 mt-1">Vista del aprobador con PTAs pendientes</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                      <h3 className="font-medium text-purple-900">➕ Wizard Crear PTA</h3>
                      <p className="text-sm text-purple-700 mt-1">Formulario para crear nuevo PTA</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                      <h3 className="font-medium text-orange-900">⚙️ Visualizador Ajustes</h3>
                      <p className="text-sm text-orange-700 mt-1">Panel de ajustes del PTA</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                      <h3 className="font-medium text-red-900">📋 Vista Detalle PTA</h3>
                      <p className="text-sm text-red-700 mt-1">Detalle completo de un PTA</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h3 className="font-medium text-gray-900">🔔 Notificaciones</h3>
                      <p className="text-sm text-gray-700 mt-1">Centro de notificaciones</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {vistaActual === 'dashboard-docente' && (
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
            )}

            {vistaActual === 'dashboard-aprobador' && (
              <DashboardAprobadorIntegrado
                onVerDetalle={handleVerDetallePTA}
                onAprobar={(ptaId) => handleAbrirModalAprobacion(ptaId, 'aprobar')}
                onRechazar={(ptaId) => handleAbrirModalAprobacion(ptaId, 'rechazar')}
              />
            )}

            {vistaActual === 'crear-pta' && (
              <WizardCrearPTA
                docenteInfo={DOCENTE_MOCK}
                onGuardar={handleGuardarPTA}
                onEnviar={handleEnviarPTA}
                onCancelar={handleCancelarCreacion}
              />
            )}

            {vistaActual === 'visualizador-ajustes' && (
              <VisualizadorPTAAjustes
                usuario={{
                  nombre: usuario.nombre,
                  email: usuario.email
                }}
                onLogout={onLogout}
              />
            )}

            {vistaActual === 'detalle-pta' && ptaSeleccionado && (
              <VistaDetallePTA
                ptaId={ptaSeleccionado}
                onClose={() => setVistaActual('dashboard')}
                onAprobar={() => handleAbrirModalAprobacion(ptaSeleccionado, 'aprobar')}
                onRechazar={() => handleAbrirModalAprobacion(ptaSeleccionado, 'rechazar')}
              />
            )}
          </div>

          {/* Modal de Aprobación */}
          {modalAprobacionVisible && accionAprobacion && ptaSeleccionado && (
            <ModalAprobacion
              isOpen={modalAprobacionVisible}
              onClose={handleCerrarModalAprobacion}
              accion={accionAprobacion}
              ptaInfo={{
                id: ptaSeleccionado,
                docenteNombre: 'Dr. Carlos Alberto Méndez Rivera',
                periodoAcademico: '2025-1'
              }}
              nivelAprobador={1}
              onConfirmar={(observaciones) => {
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
        </div>
      </PTAProvider>
    );
  }

  // ============================================================================
  // RENDER - VISTA NORMAL (NO SUPERUSER)
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
    admin: 1, // Admin puede ver como nivel 1
    superuser: 1 // Superuser puede ver como nivel 1
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

  // Vista para aprobadores con acceso a todos los componentes
  // Mostrar selector de vista para que el usuario pueda acceder a todos los componentes
  return (
    <PTAProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Header con selector de vista */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestión Profesoral</h1>
                <p className="text-sm text-gray-600">Acceso a todos los componentes del módulo</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Usuario:</span>
                <span className="text-sm font-medium text-gray-900">{usuario.nombre}</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                  {usuario.rol.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Navegación de vistas */}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => setVistaActual('dashboard')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${vistaActual === 'dashboard'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                📊 Dashboard Principal
              </button>
              <button
                onClick={() => setVistaActual('dashboard-docente')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${vistaActual === 'dashboard-docente'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                👨‍🏫 Dashboard Docente
              </button>
              <button
                onClick={() => setVistaActual('dashboard-aprobador')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${vistaActual === 'dashboard-aprobador'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                ✅ Dashboard Aprobador
              </button>
              <button
                onClick={() => setVistaActual('crear-pta')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${vistaActual === 'crear-pta'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                ➕ Crear PTA (Wizard)
              </button>
              <button
                onClick={() => setVistaActual('visualizador-ajustes')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${vistaActual === 'visualizador-ajustes'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                ⚙️ Visualizador Ajustes
              </button>
            </div>
          </div>
        </div>

        {/* Contenido según vista seleccionada */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          {vistaActual === 'dashboard' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Vista General - Todos los Componentes</h2>
                <p className="text-gray-600 mb-4">Selecciona una vista específica del menú superior para ver cada componente.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <h3 className="font-medium text-blue-900">👨‍🏫 Dashboard Docente</h3>
                    <p className="text-sm text-blue-700 mt-1">Vista del docente con sus PTAs</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <h3 className="font-medium text-green-900">✅ Dashboard Aprobador</h3>
                    <p className="text-sm text-green-700 mt-1">Vista del aprobador con PTAs pendientes</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <h3 className="font-medium text-purple-900">➕ Wizard Crear PTA</h3>
                    <p className="text-sm text-purple-700 mt-1">Formulario para crear nuevo PTA</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                    <h3 className="font-medium text-orange-900">⚙️ Visualizador Ajustes</h3>
                    <p className="text-sm text-orange-700 mt-1">Panel de ajustes del PTA</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <h3 className="font-medium text-red-900">📋 Vista Detalle PTA</h3>
                    <p className="text-sm text-red-700 mt-1">Detalle completo de un PTA</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="font-medium text-gray-900">🔔 Notificaciones</h3>
                    <p className="text-sm text-gray-700 mt-1">Centro de notificaciones</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {vistaActual === 'dashboard-docente' && (
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
          )}

          {vistaActual === 'dashboard-aprobador' && (
            <DashboardAprobadorIntegrado
              onVerDetalle={handleVerDetallePTA}
              onAprobar={(ptaId) => handleAbrirModalAprobacion(ptaId, 'aprobar')}
              onRechazar={(ptaId) => handleAbrirModalAprobacion(ptaId, 'rechazar')}
            />
          )}

          {vistaActual === 'crear-pta' && (
            <WizardCrearPTA
              docenteInfo={DOCENTE_MOCK}
              onGuardar={handleGuardarPTA}
              onEnviar={handleEnviarPTA}
              onCancelar={handleCancelarCreacion}
            />
          )}

          {vistaActual === 'visualizador-ajustes' && (
            <VisualizadorPTAAjustes
              usuario={{
                nombre: usuario.nombre,
                email: usuario.email
              }}
              onLogout={onLogout}
            />
          )}
        </div>

        {/* Modal de Aprobación */}
        {modalAprobacionVisible && accionAprobacion && ptaSeleccionado && (
          <ModalAprobacion
            isOpen={modalAprobacionVisible}
            onClose={handleCerrarModalAprobacion}
            accion={accionAprobacion}
            ptaInfo={{
              id: ptaSeleccionado,
              docenteNombre: 'Dr. Carlos Alberto Méndez Rivera',
              periodoAcademico: '2025-1'
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

        {/* Centro de Notificaciones (fixed top-right) */}
        <div className="fixed top-4 right-4 z-50">
          <NotificationCenter
            usuarioCedula={usuario.cedula || '000000'}
            usuarioEmail={usuario.email}
            onClickNotificacion={handleClickNotificacion}
          />
        </div>
      </div>
    </PTAProvider>
  );
}

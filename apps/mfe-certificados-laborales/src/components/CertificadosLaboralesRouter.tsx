import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  QrCode, 
  BarChart3, 
  History, 
  FileText, 
  Bell, 
  Code,
  ChevronLeft,
  Settings,
  ClipboardCheck,
  BookOpenCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '@esap-mfe/shared-ui/sonner';
import { CertificadosLaboralesDashboard } from './CertificadosLaboralesDashboard';
import { ValidarCertificadoQR } from './ValidarCertificadoQR';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { HistoricoValidaciones } from './HistoricoValidaciones';
import { GeneradorReportes } from './GeneradorReportes';
import { NotificacionesValidacion } from './NotificacionesValidacion';
import { APIDocumentacion } from './APIDocumentacion';
import { ConfiguracionPlantilla } from './ConfiguracionPlantilla';
import { CertificateCorrectionRequests } from './CertificateCorrectionRequests';
import { LaborFunctionsManager } from './LaborFunctionsManager';

type Vista = 
  | 'dashboard' 
  | 'validar-qr' 
  | 'analytics' 
  | 'historico' 
  | 'reportes' 
  | 'notificaciones' 
  | 'api-docs'
  | 'configuracion-plantilla'
  | 'solicitudes-correccion'
  | 'funciones-laborales';

interface MenuOption {
  id: Vista;
  label: string;
  icon: React.ReactNode;
  description: string;
  color: string;
}

interface CertificadosLaboralesRouterProps {
  userRoles?: string[];
  userEmail?: string;
  userPermissions?: string[];
}

export function CertificadosLaboralesRouter({ userEmail, userPermissions = [] }: CertificadosLaboralesRouterProps) {
  const [vistaActual, setVistaActual] = useState<Vista>('dashboard');

  const hasCertPerm = useMemo(() => (suffix: string) =>
    userPermissions.includes(`certificados-laborales.${suffix}`) ||
    userPermissions.includes(`cl.${suffix}`),
  [userPermissions]);

  const canManageTemplate = useMemo(() => hasCertPerm('template.manage'), [hasCertPerm]);
  const canEditPrima = useMemo(() => hasCertPerm('config.edit'), [hasCertPerm]);
  const canManageFunctions = useMemo(() => hasCertPerm('functions.manage'), [hasCertPerm]);
  const canExportReport = useMemo(() => hasCertPerm('export.report'), [hasCertPerm]);
  const canDeliver = useMemo(() => hasCertPerm('certificate.deliver'), [hasCertPerm]);
  const canVerify = useMemo(() => hasCertPerm('certificate.verify'), [hasCertPerm]);
  const canManageCorrections = useMemo(() => hasCertPerm('correction.manage'), [hasCertPerm]);

  const handleNavigate = (vista: Vista) => {
    if (vista === 'solicitudes-correccion' && !canManageCorrections) {
      toast.error('No tienes permiso para aprobar solicitudes de corrección.');
      return;
    }
    if (vista === 'funciones-laborales' && !canManageFunctions) {
      toast.error('No tienes permiso para gestionar las funciones laborales.');
      return;
    }
    setVistaActual(vista);
  };

  useEffect(() => {
    const lostCorrectionAccess =
      vistaActual === 'solicitudes-correccion' && !canManageCorrections;
    const lostFunctionsAccess =
      vistaActual === 'funciones-laborales' && !canManageFunctions;

    if (lostCorrectionAccess || lostFunctionsAccess) {
      setVistaActual('dashboard');
    }
  }, [canManageCorrections, canManageFunctions, vistaActual]);

  useEffect(() => {
    const lastPublished = localStorage.getItem('cert-template-last-published');
    if (!lastPublished) return;
    const lastSeen = sessionStorage.getItem('cert-template-last-seen');
    if (lastSeen === lastPublished) return;

    toast.info('Plantilla de certificados actualizada', {
      description: 'Se aplicó una nueva versión de la plantilla de certificados laborales.'
    });
    sessionStorage.setItem('cert-template-last-seen', lastPublished);
  }, []);

  const menuOpciones: MenuOption[] = [
    {
      id: 'dashboard',
      label: 'Dashboard Principal',
      icon: <LayoutDashboard className="w-5 h-5" />,
      description: 'Gestión de certificados laborales',
      color: '#003DA5'
    },
    {
      id: 'validar-qr',
      label: 'Validar Certificado',
      icon: <QrCode className="w-5 h-5" />,
      description: 'Portal público de validación QR',
      color: '#10B981'
    },
    {
      id: 'analytics',
      label: 'Analíticas',
      icon: <BarChart3 className="w-5 h-5" />,
      description: 'Dashboard de métricas y gráficas',
      color: '#8B5CF6'
    },
    {
      id: 'historico',
      label: 'Histórico',
      icon: <History className="w-5 h-5" />,
      description: 'Registro de validaciones',
      color: '#F59E0B'
    },
    {
      id: 'reportes',
      label: 'Reportes',
      icon: <FileText className="w-5 h-5" />,
      description: 'Generador de reportes PDF/CSV',
      color: '#EF4444'
    },
    {
      id: 'notificaciones',
      label: 'Notificaciones',
      icon: <Bell className="w-5 h-5" />,
      description: 'Config de alertas automáticas',
      color: '#06B6D4'
    },
    {
      id: 'api-docs',
      label: 'API Pública',
      icon: <Code className="w-5 h-5" />,
      description: 'Documentación de API REST',
      color: '#EC4899'
    },
    {
      id: 'configuracion-plantilla',
      label: 'Configuración de Plantilla',
      icon: <Settings className="w-5 h-5" />,
      description: 'Configuración de la plantilla de certificados',
      color: '#FF9900'
    },
    {
      id: 'solicitudes-correccion',
      label: 'Solicitudes de corrección',
      icon: <ClipboardCheck className="w-5 h-5" />,
      description: 'Revisión y respuesta de correcciones',
      color: '#F59E0B'
    },
    {
      id: 'funciones-laborales',
      label: 'Funciones laborales',
      icon: <BookOpenCheck className="w-5 h-5" />,
      description: 'Matriz normalizada de funciones por cargo',
      color: '#0F766E'
    }
  ];

  // Si no estamos en dashboard, mostrar la vista específica
  if (vistaActual !== 'dashboard') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Navegación de regreso - Mobile optimized */}
        <div className="certificate-subview-navigation sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-3 py-3 backdrop-blur sm:px-6 sm:py-4">
          <motion.button
            type="button"
            onClick={() => setVistaActual('dashboard')}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 430, damping: 25 }}
            className="certificate-dashboard-back"
            aria-label="Volver al dashboard de certificados laborales"
          >
            <span className="certificate-dashboard-back__icon" aria-hidden="true">
              <ChevronLeft className="h-5 w-5" />
            </span>
            <span className="min-w-0 text-left">
              <span className="certificate-dashboard-back__label">Volver al dashboard</span>
              <span className="certificate-dashboard-back__subtitle">Certificados laborales</span>
            </span>
          </motion.button>
        </div>

        {/* Contenido de la vista */}
        <AnimatePresence mode="wait">
          <motion.div
            key={vistaActual}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="p-3 sm:p-4 md:p-6"
          >
            {vistaActual === 'validar-qr' && <ValidarCertificadoQR />}
            {vistaActual === 'analytics' && <AnalyticsDashboard />}
            {vistaActual === 'historico' && <HistoricoValidaciones />}
            {vistaActual === 'reportes' && <GeneradorReportes />}
            {vistaActual === 'notificaciones' && <NotificacionesValidacion />}
            {vistaActual === 'api-docs' && <APIDocumentacion />}
            {vistaActual === 'configuracion-plantilla' && (
              <ConfiguracionPlantilla 
                canEdit={canManageTemplate}
                currentUserEmail={userEmail || ''}
              />
            )}
            {vistaActual === 'solicitudes-correccion' && canManageCorrections && (
              <CertificateCorrectionRequests canResend={canDeliver} />
            )}
            {vistaActual === 'funciones-laborales' && canManageFunctions && (
              <LaborFunctionsManager />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // Vista principal: Dashboard con las funcionalidades integradas
  return (
    <>
    <Toaster position="bottom-right" richColors />
    <CertificadosLaboralesDashboard
      onNavigate={(vista) => handleNavigate(vista as Vista)}
      canManageTemplates={canManageTemplate}
      canEditPrima={canEditPrima}
      canManageFunctions={canManageFunctions}
      canExportReport={canExportReport}
      canDeliver={canDeliver}
      canVerify={canVerify}
      canManageCorrections={canManageCorrections}
    />
    </>
  );
}

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
  Settings
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { CertificadosLaboralesDashboard } from './CertificadosLaboralesDashboard';
import { ValidarCertificadoQR } from './ValidarCertificadoQR';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { HistoricoValidaciones } from './HistoricoValidaciones';
import { GeneradorReportes } from './GeneradorReportes';
import { NotificacionesValidacion } from './NotificacionesValidacion';
import { APIDocumentacion } from './APIDocumentacion';
import { ConfiguracionPlantilla } from './ConfiguracionPlantilla';
import { Button } from '@esap-mfe/shared-ui/button';

type Vista = 
  | 'dashboard' 
  | 'validar-qr' 
  | 'analytics' 
  | 'historico' 
  | 'reportes' 
  | 'notificaciones' 
  | 'api-docs'
  | 'configuracion-plantilla';

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
}

export function CertificadosLaboralesRouter({ userRoles = [], userEmail }: CertificadosLaboralesRouterProps) {
  const [vistaActual, setVistaActual] = useState<Vista>('dashboard');

  const canManageTemplate = useMemo(() => {
    const emailLower = (userEmail || '').toLowerCase();
    return userRoles.includes('Coordinador de Certificados Laborales') || emailLower === 'cerlaboral@esap.edu.co';
  }, [userEmail, userRoles]);

  const handleNavigate = (vista: Vista) => {
    setVistaActual(vista);
  };

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
    }
  ];

  // Si no estamos en dashboard, mostrar la vista específica
  if (vistaActual !== 'dashboard') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Botón Volver - Mobile optimized */}
        <div className="bg-white border-b px-3 sm:px-6 py-3 sm:py-4 sticky top-0 z-10">
          <Button
            variant="ghost"
            onClick={() => setVistaActual('dashboard')}
            className="hover:bg-gray-100 min-h-[44px]"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            <span className="text-sm sm:text-base">Volver al Dashboard</span>
          </Button>
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
                currentUserEmail={userEmail}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // Vista principal: Dashboard con las funcionalidades integradas
  return (
    <>
    <Toaster position="top-right" richColors />
    <CertificadosLaboralesDashboard
      onNavigate={handleNavigate}
      canManageTemplates={canManageTemplate}
    />
    </>
  );
}

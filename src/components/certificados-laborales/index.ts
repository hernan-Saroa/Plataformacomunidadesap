/**
 * Exportaciones centralizadas del módulo de Certificados Laborales
 * Sistema completo de gestión y validación con código QR
 */

// Router Principal
export { CertificadosLaboralesRouter } from './CertificadosLaboralesRouter';

// Componentes principales
export { CertificadosLaboralesDashboard } from './CertificadosLaboralesDashboard';
export { ValidarCertificadoQR } from './ValidarCertificadoQR';
export { ValidarCertificadoPublico } from './ValidarCertificadoPublico';
export { SolicitarCertificadoForm } from './SolicitarCertificadoForm';
export { GenerarCertificadoModal } from './GenerarCertificadoModal';
export { CertificadoDetalleModal } from './CertificadoDetalleModal';
export { ConfiguracionPlantilla } from './ConfiguracionPlantilla';
export { PrimaTecnicaModal } from './PrimaTecnicaModal';

// Sistema QR
export { QRScannerModal } from './QRScannerModal';

// Analíticas y Reportes
export { AnalyticsDashboard } from './AnalyticsDashboard';
export { HistoricoValidaciones } from './HistoricoValidaciones';
export { GeneradorReportes } from './GeneradorReportes';

// Notificaciones y Configuración
export { NotificacionesValidacion } from './NotificacionesValidacion';

// API y Documentación
export { APIDocumentacion } from './APIDocumentacion';

// Utilidades
export { PDFViewerModal } from './PDFViewerModal';

import { motion } from 'motion/react';
import { 
  Award, 
  Eye, 
  QrCode, 
  CheckCircle, 
  Clock, 
  Mail, 
  Building2, 
  User,
  FileCheck
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

export interface CertificateVerificationCardProps {
  id: string;
  certificateNumber: string;
  graduate: {
    fullName: string;
    documentNumber: string;
    programName: string;
  };
  requester: {
    name: string;
    email: string;
    type: 'empresa' | 'graduado';
  };
  status: 'active' | 'revoked' | 'expired';
  generatedAt: string;
  viewCount: number;
  qrScanCount: number;
  scanHistoryCount: number;
  onViewDetails?: () => void;
}

/**
 * Componente unificado de carta de certificado de verificación
 * Diseño premium para mostrar certificados emitidos con trazabilidad
 */
export function CertificateVerificationCard({
  certificateNumber,
  graduate,
  requester,
  status,
  generatedAt,
  viewCount,
  qrScanCount,
  scanHistoryCount,
  onViewDetails,
}: CertificateVerificationCardProps) {
  
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return {
          label: 'Activo',
          bg: 'bg-blue-100',
          text: 'text-[#1e5da8]',
          border: 'border-blue-200',
          gradient: 'from-[#1e5da8] to-[#154a85]',
        };
      case 'revoked':
        return {
          label: 'Revocado',
          bg: 'bg-slate-100',
          text: 'text-slate-700',
          border: 'border-slate-200',
          gradient: 'from-slate-500 to-slate-600',
        };
      case 'expired':
        return {
          label: 'Expirado',
          bg: 'bg-gray-100',
          text: 'text-gray-700',
          border: 'border-gray-200',
          gradient: 'from-gray-500 to-slate-600',
        };
      default:
        return {
          label: 'Desconocido',
          bg: 'bg-gray-100',
          text: 'text-gray-700',
          border: 'border-gray-200',
          gradient: 'from-gray-500 to-slate-600',
        };
    }
  };

  const statusConfig = getStatusConfig(status);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const RequesterIcon = requester.type === 'empresa' ? Building2 : User;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden hover:shadow-2xl hover:border-[#1e5da8]/40 transition-all duration-300"
    >
      {/* Header con gradiente verde (certificado activo) */}
      <div className={`h-12 relative bg-gradient-to-r ${statusConfig.gradient}`}>
        {/* Icono flotante */}
        <div className="absolute -bottom-6 left-4">
          <div className="w-12 h-12 rounded-xl bg-white border-3 border-white flex items-center justify-center shadow-lg">
            <Award className={`w-6 h-6 ${statusConfig.text.replace('text-', 'text-')}`} strokeWidth={2} />
          </div>
        </div>
        
        {/* Badge de estado */}
        <div className="absolute top-2 right-2">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="pt-8 px-4 pb-4">
        {/* Información del graduado */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Award className="w-3.5 h-3.5 text-[#1e5da8]" />
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Graduado</p>
          </div>
          <h3 className="font-bold text-gray-900 mb-1">
            {graduate.fullName}
          </h3>
          <p className="text-xs text-gray-600 font-mono mb-1">{graduate.documentNumber}</p>
          <p className="text-xs text-gray-600">{graduate.programName}</p>
        </div>

        {/* Información del solicitante */}
        <div className="mb-4 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-1.5 mb-1.5">
            <RequesterIcon className="w-3.5 h-3.5 text-gray-500" />
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              {requester.type === 'empresa' ? 'Empresa' : 'Solicitante'}
            </p>
          </div>
          <p className="text-sm font-semibold text-gray-900 mb-1">
            {requester.name}
          </p>
          <p className="text-xs text-gray-600 flex items-center gap-1">
            <Mail className="w-3 h-3" />
            {requester.email}
          </p>
        </div>

        {/* Métricas en grid - Unificado en azul */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {/* Escaneos QR */}
          <div className="text-center p-2 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex items-center justify-center mb-1">
              <QrCode className="w-4 h-4 text-[#1e5da8]" />
            </div>
            <p className="text-xl font-bold text-[#1e5da8]">{qrScanCount}</p>
            <p className="text-[10px] text-gray-600">Escaneos</p>
          </div>

          {/* Vistas */}
          <div className="text-center p-2 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex items-center justify-center mb-1">
              <Eye className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xl font-bold text-blue-600">{viewCount}</p>
            <p className="text-[10px] text-gray-600">Vistas</p>
          </div>

          {/* Registros */}
          <div className="text-center p-2 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex items-center justify-center mb-1">
              <CheckCircle className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-xl font-bold text-blue-500">{scanHistoryCount}</p>
            <p className="text-[10px] text-gray-600">Registros</p>
          </div>
        </div>

        {/* Fecha de generación */}
        <div className="flex items-center gap-2 text-xs text-gray-600 mb-4">
          <Clock className="w-3.5 h-3.5" />
          <span>Generado: {formatDate(generatedAt)}</span>
        </div>

        {/* Botón de acción */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onViewDetails}
              className="w-full px-4 py-3 bg-gradient-to-r from-[#1e5da8] to-[#154a85] text-white rounded-xl font-semibold hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4" strokeWidth={2} />
              <span className="text-sm">Ver Detalles y Trazabilidad</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>Ver información completa y historial de escaneos</TooltipContent>
        </Tooltip>
      </div>
    </motion.div>
  );
}

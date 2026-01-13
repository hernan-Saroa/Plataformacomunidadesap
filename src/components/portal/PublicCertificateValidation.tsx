/**
 * PÁGINA PÚBLICA DE VALIDACIÓN DE CERTIFICADOS
 * - Accesible vía QR o URL pública sin autenticación
 * - Muestra si el certificado es válido/activo
 * - Registra cada escaneo/validación con trazabilidad completa
 * - Diseño mobile-first para escaneos desde celular
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  CheckCircle, 
  XCircle, 
  Shield, 
  AlertTriangle,
  QrCode,
  User,
  Calendar,
  Building2,
  FileText,
  Hash,
  MapPin,
  Clock,
  Award,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { toast } from 'sonner@2.0.3';
import { copyToClipboard } from '../../utils/clipboard';

interface CertificateValidationData {
  qrCode: string;
  status: 'active' | 'revoked' | 'expired';
  certificateNumber: string;
  certificateHash: string;
  graduate: {
    fullName: string;
    document: string;
    program: string;
    graduationDate: string;
  };
  requester: {
    name: string;
    type: 'entidad' | 'graduado';
    email: string;
  };
  generatedAt: string;
  generatedBy: string;
  qrScanCount: number;
  lastScanAt: string | null;
}

interface PublicCertificateValidationProps {
  qrCodeParam?: string; // Parámetro de URL o escaneo
}

export default function PublicCertificateValidation({ qrCodeParam }: PublicCertificateValidationProps) {
  const [loading, setLoading] = useState(true);
  const [certificateData, setCertificateData] = useState<CertificateValidationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFullDetails, setShowFullDetails] = useState(false);
  const [validationTime] = useState(new Date());

  // Extraer código QR de URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const qrFromUrl = urlParams.get('qr') || qrCodeParam;

    if (!qrFromUrl) {
      setError('Código QR no proporcionado');
      setLoading(false);
      return;
    }

    // Simular llamada a API de validación
    validateCertificate(qrFromUrl);
  }, [qrCodeParam]);

  const validateCertificate = async (qrCode: string) => {
    try {
      setLoading(true);
      
      // TODO: Reemplazar con llamada real a API
      // const response = await fetch(`/api/public/validate-certificate?qr=${qrCode}`);
      // const data = await response.json();
      
      // Mock data para demostración
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockData: CertificateValidationData = {
        qrCode: qrCode,
        status: 'active',
        certificateNumber: 'CERT-2025-001',
        certificateHash: 'a3f5e8c9d2b1f4a7e6c8b9d0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9',
        graduate: {
          fullName: 'María Fernanda Rodríguez García',
          document: '1.234.567.890',
          program: 'Maestría en Administración Pública',
          graduationDate: '2024-12-15'
        },
        requester: {
          name: 'Empresa ABC S.A.S.',
          type: 'entidad',
          email: 'rrhh@empresaabc.com.co'
        },
        generatedAt: '2025-01-10T10:30:00Z',
        generatedBy: 'Admin ESAP',
        qrScanCount: 8,
        lastScanAt: '2025-01-12T14:20:00Z'
      };

      setCertificateData(mockData);
      setError(null);
      
      // Registrar este escaneo
      registerScan(qrCode);
    } catch (err) {
      setError('Error al validar el certificado. Intente nuevamente.');
      console.error('Validation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const registerScan = async (qrCode: string) => {
    try {
      // TODO: Registrar escaneo en backend
      // await fetch('/api/public/register-scan', {
      //   method: 'POST',
      //   body: JSON.stringify({
      //     qrCode,
      //     scannedAt: new Date().toISOString(),
      //     userAgent: navigator.userAgent,
      //     // La IP y ubicación se capturan en el backend
      //   })
      // });
      
      console.log('Scan registered for QR:', qrCode);
    } catch (err) {
      console.error('Error registering scan:', err);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Validando certificado...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50 p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center"
        >
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-12 h-12 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Error de Validación</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            Reintentar
          </button>
        </motion.div>
      </div>
    );
  }

  if (!certificateData) {
    return null;
  }

  const isValid = certificateData.status === 'active';
  const isRevoked = certificateData.status === 'revoked';
  const isExpired = certificateData.status === 'expired';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header con Logo ESAP */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Shield className="w-8 h-8" style={{ color: '#003DA5' }} />
            <h1 className="text-2xl font-bold" style={{ color: '#003DA5' }}>
              ESAP
            </h1>
          </div>
          <p className="text-gray-600 text-sm">
            Escuela Superior de Administración Pública
          </p>
        </div>

        {/* Card de Validación Principal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6"
        >
          {/* Header de Estado */}
          <div 
            className={`p-6 ${
              isValid ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
              isRevoked ? 'bg-gradient-to-r from-red-500 to-rose-600' :
              'bg-gradient-to-r from-orange-500 to-amber-600'
            }`}
          >
            <div className="flex items-center justify-center gap-3 text-white">
              {isValid ? (
                <CheckCircle className="w-12 h-12" strokeWidth={2.5} />
              ) : (
                <XCircle className="w-12 h-12" strokeWidth={2.5} />
              )}
              <div>
                <h2 className="text-2xl font-bold">
                  {isValid ? '✓ CERTIFICADO VÁLIDO' : 
                   isRevoked ? '✗ CERTIFICADO REVOCADO' : 
                   '⚠ CERTIFICADO EXPIRADO'}
                </h2>
                <p className="text-sm text-white/90 mt-1">
                  {isValid ? 'Este certificado está activo y es auténtico' :
                   isRevoked ? 'Este certificado ha sido invalidado por ESAP' :
                   'Este certificado ya no es válido'}
                </p>
              </div>
            </div>
          </div>

          {/* Datos del Certificado */}
          <div className="p-6 space-y-6">
            {/* Datos del Graduado */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-600" />
                Graduado Certificado
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 mb-0.5">Nombre Completo</p>
                    <p className="font-semibold text-gray-900">{certificateData.graduate.fullName}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 mb-0.5">Documento</p>
                    <p className="font-semibold text-gray-900">{certificateData.graduate.document}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 md:col-span-2">
                  <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                    <Award className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 mb-0.5">Programa Académico</p>
                    <p className="font-semibold text-gray-900">{certificateData.graduate.program}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 mb-0.5">Fecha de Graduación</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(certificateData.graduate.graduationDate).toLocaleDateString('es-CO', {
                        year: 'numeric',
                        month: 'long',
                        day: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Separador */}
            <div className="border-t border-gray-200"></div>

            {/* Datos del Certificado */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                Información del Certificado
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-600">Número de Certificado</span>
                  </div>
                  <span className="font-mono font-semibold text-gray-900">{certificateData.certificateNumber}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-600">Solicitado por</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{certificateData.requester.name}</p>
                    <Badge variant="outline" className="text-xs mt-1">
                      {certificateData.requester.type === 'graduado' ? 'Graduado' : 'Entidad'}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-600">Fecha de Emisión</span>
                  </div>
                  <span className="font-semibold text-gray-900">
                    {new Date(certificateData.generatedAt).toLocaleDateString('es-CO', {
                      year: 'numeric',
                      month: 'long',
                      day: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Detalles Adicionales Expandibles */}
            <div>
              <button
                onClick={() => setShowFullDetails(!showFullDetails)}
                className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <span className="font-medium text-blue-900">Detalles Técnicos</span>
                {showFullDetails ? (
                  <ChevronUp className="w-5 h-5 text-blue-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-blue-600" />
                )}
              </button>

              {showFullDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 space-y-3"
                >
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Hash de Verificación</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs font-mono text-gray-900 break-all bg-white p-2 rounded border border-gray-200">
                        {certificateData.certificateHash}
                      </code>
                      <button
                        onClick={() => copyToClipboard(certificateData.certificateHash, 'Hash')}
                        className="p-2 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                        title="Copiar hash"
                      >
                        <FileText className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Código QR</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs font-mono text-gray-900 bg-white p-2 rounded border border-gray-200">
                        {certificateData.qrCode}
                      </code>
                      <button
                        onClick={() => copyToClipboard(certificateData.qrCode, 'Código QR')}
                        className="p-2 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                        title="Copiar QR"
                      >
                        <QrCode className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Emisor</p>
                      <p className="font-medium text-gray-900 text-sm">{certificateData.generatedBy}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Veces Escaneado</p>
                      <p className="font-bold text-lg" style={{ color: '#003DA5' }}>{certificateData.qrScanCount}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Card de Información de Validación */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6"
        >
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 mb-2">Información de esta Validación</h4>
              <div className="space-y-1 text-sm text-blue-800">
                <p><strong>Validado el:</strong> {validationTime.toLocaleString('es-CO', {
                  year: 'numeric',
                  month: 'long',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}</p>
                <p><strong>Estado:</strong> {isValid ? 'ACTIVO Y VÁLIDO' : 'INVÁLIDO'}</p>
                <p className="text-xs text-blue-700 mt-2">
                  🔒 Esta validación ha sido registrada en el sistema ESAP con fines de trazabilidad y seguridad.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Advertencia de Seguridad */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-amber-50 border border-amber-200 rounded-xl p-6"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-amber-900 mb-2">Instrucciones de Validación</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-amber-800">
                <li>Verifique que los datos mostrados coincidan exactamente con el documento físico</li>
                <li>Compare el nombre completo, número de documento y programa académico</li>
                <li>Un certificado VÁLIDO debe mostrar el badge verde "✓ CERTIFICADO VÁLIDO"</li>
                <li>Si tiene dudas, contacte directamente a ESAP para verificación adicional</li>
                <li>Este sistema NO valida la identidad de la persona que presenta el certificado</li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-600">
          <p>© {new Date().getFullYear()} ESAP - Escuela Superior de Administración Pública</p>
          <p className="mt-1">Sistema de Validación de Certificados v1.0</p>
        </div>
      </div>
    </div>
  );
}

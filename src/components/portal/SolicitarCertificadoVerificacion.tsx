/**
 * SOLICITUD DE CERTIFICADO DE VERIFICACIÓN (PORTAL GRADUADOS)
 * - Permite a graduados o entidades solicitar certificado con QR único
 * - Si ya existe la combinación (graduado + entidad), reutiliza el QR
 * - Muestra historial de solicitudes y QR para descarga
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Award, 
  QrCode, 
  Download, 
  CheckCircle, 
  Clock,
  Building2,
  User,
  FileText,
  ArrowLeft,
  Calendar,
  Hash,
  Shield,
  ExternalLink,
  Copy,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'sonner@2.0.3';

interface CertificadoSolicitado {
  id: string;
  certificateNumber: string;
  qrCode: string;
  status: 'active' | 'revoked' | 'expired';
  requestCount: number;
  qrScanCount: number;
  firstRequestedAt: string;
  lastRequestedAt: string;
  graduate: {
    fullName: string;
    document: string;
    program: string;
    graduationDate: string;
  };
  requester: {
    name: string;
    type: 'entidad' | 'graduado';
  };
}

interface SolicitarCertificadoVerificacionProps {
  onBack: () => void;
  userData: {
    nombre: string;
    documento: string;
    programa: string;
    fechaGraduacion: string;
  };
}

export function SolicitarCertificadoVerificacion({ onBack, userData }: SolicitarCertificadoVerificacionProps) {
  const [view, setView] = useState<'list' | 'request' | 'detail'>('list');
  const [selectedCertificado, setSelectedCertificado] = useState<CertificadoSolicitado | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Configuración de la solicitud
  const [solicitante, setSolicitante] = useState({
    tipo: 'graduado' as 'graduado' | 'entidad',
    nombreEntidad: '',
    emailEntidad: ''
  });

  // Mock data - certificados ya solicitados
  const [certificados] = useState<CertificadoSolicitado[]>([
    {
      id: 'CERT-001',
      certificateNumber: 'CERT-2025-001',
      qrCode: 'QR-ESAP-8f3a9b2c1d4e5f6a',
      status: 'active',
      requestCount: 3,
      qrScanCount: 12,
      firstRequestedAt: '2025-01-10T09:00:00Z',
      lastRequestedAt: '2025-01-11T16:30:00Z',
      graduate: {
        fullName: userData.nombre,
        document: userData.documento,
        program: userData.programa,
        graduationDate: userData.fechaGraduacion
      },
      requester: {
        name: 'Empresa ABC S.A.S.',
        type: 'entidad'
      }
    }
  ]);

  const handleSolicitarCertificado = async () => {
    setIsSubmitting(true);

    // Simular solicitud
    await new Promise(resolve => setTimeout(resolve, 2000));

    toast.success('Certificado Generado', {
      description: 'Tu certificado con QR único está listo para descargar'
    });

    setIsSubmitting(false);
    setView('list');
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  };

  const getPublicValidationUrl = (qrCode: string) => {
    return `${window.location.origin}/validar-certificado?qr=${qrCode}`;
  };

  // VISTA: Detalle del certificado
  if (view === 'detail' && selectedCertificado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pb-20 lg:pb-8">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => setView('list')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a mis certificados
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Certificado de Verificación</h1>
          </div>

          {/* Código QR */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg p-8 mb-6 text-center"
          >
            <div className="w-64 h-64 mx-auto bg-gray-100 rounded-lg flex items-center justify-center mb-4">
              <QrCode className="w-32 h-32 text-gray-400" />
              <p className="absolute text-xs text-gray-500 mt-40">Código QR #{selectedCertificado.certificateNumber}</p>
            </div>
            
            <div className="flex items-center justify-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <Badge className="bg-green-100 text-green-800 border-green-300">
                ACTIVO Y VÁLIDO
              </Badge>
            </div>

            <div className="flex gap-3 justify-center">
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Descargar QR
              </Button>
              <Button variant="outline" className="gap-2">
                <FileText className="w-4 h-4" />
                Descargar Certificado PDF
              </Button>
            </div>
          </motion.div>

          {/* Info del certificado */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-lg p-6 mb-6"
          >
            <h3 className="font-semibold text-gray-900 mb-4">Información del Certificado</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-600">Número</span>
                </div>
                <span className="font-mono font-semibold">{selectedCertificado.certificateNumber}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-600">Veces Solicitado</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold">{selectedCertificado.requestCount}</span>
                  {selectedCertificado.requestCount > 1 && (
                    <p className="text-xs text-blue-600">QR reutilizado {selectedCertificado.requestCount - 1} veces</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-600">Veces Escaneado</span>
                </div>
                <span className="font-semibold text-green-600">{selectedCertificado.qrScanCount}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-600">Primera Solicitud</span>
                </div>
                <span className="font-semibold">
                  {new Date(selectedCertificado.firstRequestedAt).toLocaleDateString('es-CO')}
                </span>
              </div>
            </div>
          </motion.div>

          {/* URL Pública */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-blue-50 border border-blue-200 rounded-xl p-6"
          >
            <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              URL de Validación Pública
            </h4>
            <div className="flex items-center gap-2 p-3 bg-white rounded border border-blue-200">
              <code className="flex-1 text-xs font-mono text-blue-600 break-all">
                {getPublicValidationUrl(selectedCertificado.qrCode)}
              </code>
              <button
                onClick={() => copyToClipboard(getPublicValidationUrl(selectedCertificado.qrCode), 'URL')}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <Copy className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <p className="text-xs text-blue-700 mt-2">
              Comparte esta URL para que cualquier entidad pueda validar tu certificado
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  // VISTA: Formulario de solicitud
  if (view === 'request') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pb-20 lg:pb-8">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="mb-6">
            <button
              onClick={() => setView('list')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Solicitar Certificado de Verificación</h1>
            <p className="text-gray-600 mt-2">
              Genera un certificado con QR único para validación de tu título
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <div className="space-y-6">
              {/* Tipo de solicitante */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ¿Quién solicita el certificado?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSolicitante({ ...solicitante, tipo: 'graduado' })}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      solicitante.tipo === 'graduado'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <User className="w-6 h-6 mx-auto mb-2" style={{ color: solicitante.tipo === 'graduado' ? '#003DA5' : '#6B7280' }} />
                    <p className="font-medium text-sm">Yo (Graduado)</p>
                  </button>
                  <button
                    onClick={() => setSolicitante({ ...solicitante, tipo: 'entidad' })}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      solicitante.tipo === 'entidad'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Building2 className="w-6 h-6 mx-auto mb-2" style={{ color: solicitante.tipo === 'entidad' ? '#003DA5' : '#6B7280' }} />
                    <p className="font-medium text-sm">Entidad</p>
                  </button>
                </div>
              </div>

              {/* Campos si es entidad */}
              {solicitante.tipo === 'entidad' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre de la Entidad
                    </label>
                    <input
                      type="text"
                      value={solicitante.nombreEntidad}
                      onChange={(e) => setSolicitante({ ...solicitante, nombreEntidad: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                      placeholder="Ej: Empresa ABC S.A.S."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email de la Entidad
                    </label>
                    <input
                      type="email"
                      value={solicitante.emailEntidad}
                      onChange={(e) => setSolicitante({ ...solicitante, emailEntidad: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                      placeholder="rrhh@empresa.com"
                    />
                  </div>
                </motion.div>
              )}

              {/* Info */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-semibold mb-1">Importante:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Si ya existe un certificado con estos datos, se reutilizará el QR existente</li>
                      <li>El QR es único e irrepetible para cada combinación graduado-entidad</li>
                      <li>Podrás compartir el QR para validación pública</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setView('list')}
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSolicitarCertificado}
                  className="flex-1 bg-[#003DA5] hover:bg-[#002d7a]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Generando...' : 'Generar Certificado'}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // VISTA: Lista de certificados
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pb-20 lg:pb-8">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al dashboard
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                Certificados de Verificación
              </h1>
              <p className="text-gray-600 mt-2">
                Solicita y gestiona tus certificados con QR único para validación
              </p>
            </div>
            <Button
              onClick={() => setView('request')}
              className="bg-[#003DA5] hover:bg-[#002d7a] gap-2"
            >
              <Award className="w-4 h-4" />
              Solicitar Certificado
            </Button>
          </div>
        </div>

        {/* Lista de certificados */}
        {certificados.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg p-12 text-center"
          >
            <QrCode className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No tienes certificados todavía
            </h3>
            <p className="text-gray-600 mb-6">
              Solicita tu primer certificado de verificación con QR único
            </p>
            <Button
              onClick={() => setView('request')}
              className="bg-[#003DA5] hover:bg-[#002d7a]"
            >
              Solicitar Ahora
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {certificados.map((cert, index) => (
              <motion.div
                key={cert.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => {
                  setSelectedCertificado(cert);
                  setView('detail');
                }}
              >
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="bg-white/20 text-white border-white/30">
                      {cert.certificateNumber}
                    </Badge>
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <p className="text-sm">Solicitado por</p>
                  <p className="font-semibold">{cert.requester.name}</p>
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Veces solicitado</span>
                    <span className="font-semibold">{cert.requestCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Veces escaneado</span>
                    <span className="font-semibold text-green-600">{cert.qrScanCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Última solicitud</span>
                    <span className="font-semibold">
                      {new Date(cert.lastRequestedAt).toLocaleDateString('es-CO', {
                        day: '2-digit',
                        month: 'short'
                      })}
                    </span>
                  </div>
                </div>

                <div className="px-4 pb-4">
                  <Button variant="outline" className="w-full gap-2" size="sm">
                    Ver Detalles
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

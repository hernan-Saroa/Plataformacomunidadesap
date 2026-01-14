import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  QrCode,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Award,
  User,
  Calendar,
  Building,
  Shield,
  GraduationCap,
  Camera,
  FileText,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

interface VerificacionTituloResult {
  isValid: boolean;
  certificado?: {
    certificateNumber: string;
    qrCode: string;
    graduado: {
      nombre: string;
      documento: string;
      programa: string;
      tipoTitulo: string;
      fechaGrado: string;
      diplomaNumber: string;
      promedio?: number;
      honores?: string;
    };
    solicitante: {
      nombre: string;
      email: string;
      tipo: string;
    };
    fechaGeneracion: string;
    estado: 'ACTIVO' | 'REVOCADO';
    viewCount: number;
    qrScanCount: number;
  };
  error?: string;
}

export function VerificarCertificadoTitulo() {
  const [codigoCertificado, setCodigoCertificado] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<VerificacionTituloResult | null>(null);

  const handleValidar = async () => {
    if (!codigoCertificado.trim()) {
      toast.error('Por favor ingresa un código de certificado o QR');
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    // Simular llamado al servicio de validación
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock de respuesta - En producción sería una llamada real al backend
    // ✅ AQUÍ SE VALIDARÍA CONTRA LA BASE DE DATOS DE CERTIFICADOS GENERADOS
    const mockResult: VerificacionTituloResult = {
      isValid: codigoCertificado.length > 5, // Simulación simple
      certificado: codigoCertificado.length > 5 ? {
        certificateNumber: 'ESAP-CERT-2025-AB12C3',
        qrCode: codigoCertificado,
        graduado: {
          nombre: 'Laura Marcela Rodríguez Gutiérrez',
          documento: '52.987.654',
          programa: 'Administración Pública Territorial',
          tipoTitulo: 'Pregrado',
          fechaGrado: '2024-12-01',
          diplomaNumber: 'ESAP-2024-001234',
          promedio: 4.5,
          honores: 'Cum Laude'
        },
        solicitante: {
          nombre: 'Banco Nacional',
          email: 'rrhh@banconacional.com',
          tipo: 'Empresa'
        },
        fechaGeneracion: '2025-01-10T10:30:00',
        estado: 'ACTIVO',
        viewCount: 5,
        qrScanCount: 2
      } : undefined,
      error: codigoCertificado.length <= 5 ? 'Código de certificado inválido o no encontrado' : undefined
    };

    setValidationResult(mockResult);
    setIsValidating(false);

    if (mockResult.isValid) {
      toast.success('Certificado de título validado correctamente');
    } else {
      toast.error('Certificado no válido o no encontrado');
    }
  };

  const handleReset = () => {
    setCodigoCertificado('');
    setValidationResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0F6FF] to-[#E0EEFF] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div 
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{
              background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)',
              boxShadow: '0 8px 24px rgba(0, 61, 165, 0.25)'
            }}
          >
            <Award className="w-10 h-10 text-white" strokeWidth={2.5} />
          </div>
          
          <h1 
            className="font-bold mb-3"
            style={{
              fontSize: '36px',
              lineHeight: '44px',
              letterSpacing: '-0.5px',
              color: '#1F2937'
            }}
          >
            Verificar Certificado de Título
          </h1>
          
          <p 
            className="font-normal max-w-2xl mx-auto"
            style={{
              fontSize: '16px',
              lineHeight: '24px',
              color: '#6B7280'
            }}
          >
            Verifica la autenticidad de un certificado de título ESAP ingresando el código del certificado o escaneando el QR
          </p>
        </motion.div>

        {/* Card Principal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="bg-white rounded-2xl p-8 shadow-xl border-2 border-[#E5E7EB]">
            {/* Formulario de Validación */}
            {!validationResult && (
              <div className="space-y-6">
                <div>
                  <label 
                    htmlFor="codigoCertificado"
                    className="block font-semibold mb-3"
                    style={{
                      fontSize: '14px',
                      lineHeight: '20px',
                      color: '#1F2937'
                    }}
                  >
                    Código del Certificado o QR
                  </label>
                  <div className="relative">
                    <QrCode 
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
                      style={{ color: '#9CA3AF' }}
                    />
                    <input
                      id="codigoCertificado"
                      type="text"
                      placeholder="Ej: ESAP-CERT-2025-ABC123 o QR-XXXXXX"
                      value={codigoCertificado}
                      onChange={(e) => setCodigoCertificado(e.target.value.toUpperCase())}
                      className="w-full pl-12 pr-14 py-6 text-base border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5] focus:border-transparent"
                      disabled={isValidating}
                      onKeyPress={(e) => e.key === 'Enter' && handleValidar()}
                    />
                    <button
                      type="button"
                      onClick={() => toast.info('Función de escaneo próximamente')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#003DA5] transition-colors"
                      title="Escanear con cámara"
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                  </div>
                  <p 
                    className="mt-2 text-sm"
                    style={{ color: '#6B7280' }}
                  >
                    El código del certificado y el QR se encuentran en la parte superior del certificado de validación de título
                  </p>
                </div>

                {/* Info Card */}
                <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 
                        className="font-semibold mb-1"
                        style={{
                          fontSize: '14px',
                          color: '#1F2937'
                        }}
                      >
                        Sistema de Verificación Seguro
                      </h4>
                      <p 
                        className="text-sm"
                        style={{ color: '#6B7280' }}
                      >
                        Todos los certificados de título emitidos por el servicio público de la ESAP incluyen un código único que permite verificar su autenticidad en tiempo real. Este sistema garantiza la integridad y validez del documento.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Botón de Validar */}
                <button
                  onClick={handleValidar}
                  disabled={isValidating || !codigoCertificado.trim()}
                  className="w-full py-6 text-base font-semibold transition-all rounded-xl flex items-center justify-center gap-2"
                  style={{
                    background: isValidating || !codigoCertificado.trim() ? '#D1D5DB' : '#003DA5',
                    color: '#FFFFFF',
                    cursor: isValidating || !codigoCertificado.trim() ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Verificando certificado...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      Verificar Certificado
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Resultado de Validación */}
            {validationResult && (
              <div className="space-y-6">
                {validationResult.isValid && validationResult.certificado ? (
                  <>
                    {/* Header de Éxito */}
                    <div className="text-center py-6">
                      <div 
                        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                        style={{
                          background: validationResult.certificado.estado === 'ACTIVO' 
                            ? '#ECFDF5' 
                            : '#FEE2E2'
                        }}
                      >
                        {validationResult.certificado.estado === 'ACTIVO' ? (
                          <CheckCircle className="w-8 h-8 text-green-600" strokeWidth={2.5} />
                        ) : (
                          <XCircle className="w-8 h-8 text-red-600" strokeWidth={2.5} />
                        )}
                      </div>
                      
                      <h2 
                        className="font-bold mb-2"
                        style={{
                          fontSize: '24px',
                          lineHeight: '32px',
                          color: '#1F2937'
                        }}
                      >
                        {validationResult.certificado.estado === 'ACTIVO' 
                          ? 'Certificado Válido y Activo' 
                          : 'Certificado Revocado'}
                      </h2>
                      
                      <div 
                        className={`inline-flex items-center gap-2 text-sm px-4 py-1 rounded-full border-2 ${
                          validationResult.certificado.estado === 'ACTIVO'
                            ? 'bg-green-100 text-green-800 border-green-300'
                            : 'bg-red-100 text-red-800 border-red-300'
                        }`}
                      >
                        {validationResult.certificado.estado}
                      </div>
                    </div>

                    {/* Detalles del Certificado */}
                    <div className="p-6 bg-gray-50 border-2 border-gray-200 rounded-xl">
                      <h3 
                        className="font-bold mb-4"
                        style={{
                          fontSize: '16px',
                          lineHeight: '24px',
                          color: '#1F2937'
                        }}
                      >
                        Información del Certificado
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label 
                            className="text-xs font-semibold uppercase tracking-wide mb-1 block"
                            style={{ color: '#6B7280' }}
                          >
                            Número de Certificado
                          </label>
                          <p 
                            className="font-semibold"
                            style={{
                              fontSize: '14px',
                              color: '#003DA5'
                            }}
                          >
                            {validationResult.certificado.certificateNumber}
                          </p>
                        </div>

                        <div>
                          <label 
                            className="text-xs font-semibold uppercase tracking-wide mb-1 block"
                            style={{ color: '#6B7280' }}
                          >
                            Código QR
                          </label>
                          <p 
                            className="font-mono font-semibold"
                            style={{
                              fontSize: '14px',
                              color: '#1F2937'
                            }}
                          >
                            {validationResult.certificado.qrCode}
                          </p>
                        </div>

                        <div>
                          <label 
                            className="text-xs font-semibold uppercase tracking-wide mb-1 block"
                            style={{ color: '#6B7280' }}
                          >
                            <User className="w-3 h-3 inline mr-1" />
                            Graduado
                          </label>
                          <p 
                            className="font-medium"
                            style={{
                              fontSize: '14px',
                              color: '#1F2937'
                            }}
                          >
                            {validationResult.certificado.graduado.nombre}
                          </p>
                        </div>

                        <div>
                          <label 
                            className="text-xs font-semibold uppercase tracking-wide mb-1 block"
                            style={{ color: '#6B7280' }}
                          >
                            Documento
                          </label>
                          <p 
                            className="font-medium"
                            style={{
                              fontSize: '14px',
                              color: '#1F2937'
                            }}
                          >
                            CC {validationResult.certificado.graduado.documento}
                          </p>
                        </div>

                        <div>
                          <label 
                            className="text-xs font-semibold uppercase tracking-wide mb-1 block"
                            style={{ color: '#6B7280' }}
                          >
                            <GraduationCap className="w-3 h-3 inline mr-1" />
                            Programa Académico
                          </label>
                          <p 
                            className="font-medium"
                            style={{
                              fontSize: '14px',
                              color: '#1F2937'
                            }}
                          >
                            {validationResult.certificado.graduado.programa}
                          </p>
                        </div>

                        <div>
                          <label 
                            className="text-xs font-semibold uppercase tracking-wide mb-1 block"
                            style={{ color: '#6B7280' }}
                          >
                            Tipo de Título
                          </label>
                          <p 
                            className="font-medium"
                            style={{
                              fontSize: '14px',
                              color: '#1F2937'
                            }}
                          >
                            {validationResult.certificado.graduado.tipoTitulo}
                          </p>
                        </div>

                        <div>
                          <label 
                            className="text-xs font-semibold uppercase tracking-wide mb-1 block"
                            style={{ color: '#6B7280' }}
                          >
                            <Calendar className="w-3 h-3 inline mr-1" />
                            Fecha de Grado
                          </label>
                          <p 
                            className="font-medium"
                            style={{
                              fontSize: '14px',
                              color: '#1F2937'
                            }}
                          >
                            {new Date(validationResult.certificado.graduado.fechaGrado).toLocaleDateString('es-CO', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>

                        <div>
                          <label 
                            className="text-xs font-semibold uppercase tracking-wide mb-1 block"
                            style={{ color: '#6B7280' }}
                          >
                            Número de Diploma
                          </label>
                          <p 
                            className="font-medium"
                            style={{
                              fontSize: '14px',
                              color: '#1F2937'
                            }}
                          >
                            {validationResult.certificado.graduado.diplomaNumber}
                          </p>
                        </div>

                        {validationResult.certificado.graduado.promedio && (
                          <div>
                            <label 
                              className="text-xs font-semibold uppercase tracking-wide mb-1 block"
                              style={{ color: '#6B7280' }}
                            >
                              <TrendingUp className="w-3 h-3 inline mr-1" />
                              Promedio
                            </label>
                            <p 
                              className="font-medium"
                              style={{
                                fontSize: '14px',
                                color: '#1F2937'
                              }}
                            >
                              {validationResult.certificado.graduado.promedio.toFixed(1)} / 5.0
                            </p>
                          </div>
                        )}

                        {validationResult.certificado.graduado.honores && (
                          <div>
                            <label 
                              className="text-xs font-semibold uppercase tracking-wide mb-1 block"
                              style={{ color: '#6B7280' }}
                            >
                              <Award className="w-3 h-3 inline mr-1" />
                              Honores
                            </label>
                            <p 
                              className="font-medium"
                              style={{
                                fontSize: '14px',
                                color: '#1F2937'
                              }}
                            >
                              {validationResult.certificado.graduado.honores}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Información del Solicitante */}
                    <div className="p-6 bg-blue-50 border-2 border-blue-200 rounded-xl">
                      <h3 
                        className="font-bold mb-4"
                        style={{
                          fontSize: '16px',
                          lineHeight: '24px',
                          color: '#1F2937'
                        }}
                      >
                        Información del Solicitante
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label 
                            className="text-xs font-semibold uppercase tracking-wide mb-1 block"
                            style={{ color: '#6B7280' }}
                          >
                            <Building className="w-3 h-3 inline mr-1" />
                            Solicitado por
                          </label>
                          <p 
                            className="font-medium"
                            style={{
                              fontSize: '14px',
                              color: '#1F2937'
                            }}
                          >
                            {validationResult.certificado.solicitante.nombre}
                          </p>
                        </div>

                        <div>
                          <label 
                            className="text-xs font-semibold uppercase tracking-wide mb-1 block"
                            style={{ color: '#6B7280' }}
                          >
                            Tipo
                          </label>
                          <p 
                            className="font-medium"
                            style={{
                              fontSize: '14px',
                              color: '#1F2937'
                            }}
                          >
                            {validationResult.certificado.solicitante.tipo}
                          </p>
                        </div>

                        <div>
                          <label 
                            className="text-xs font-semibold uppercase tracking-wide mb-1 block"
                            style={{ color: '#6B7280' }}
                          >
                            Fecha de Generación
                          </label>
                          <p 
                            className="font-medium"
                            style={{
                              fontSize: '14px',
                              color: '#1F2937'
                            }}
                          >
                            {new Date(validationResult.certificado.fechaGeneracion).toLocaleDateString('es-CO', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>

                        <div>
                          <label 
                            className="text-xs font-semibold uppercase tracking-wide mb-1 block"
                            style={{ color: '#6B7280' }}
                          >
                            Estadísticas
                          </label>
                          <p 
                            className="font-medium text-sm"
                            style={{
                              fontSize: '14px',
                              color: '#1F2937'
                            }}
                          >
                            {validationResult.certificado.viewCount} visualizaciones • {validationResult.certificado.qrScanCount} escaneos QR
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Alerta si está revocado */}
                    {validationResult.certificado.estado === 'REVOCADO' && (
                      <div className="p-4 bg-red-50 border-2 border-red-300 rounded-xl">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 
                              className="font-semibold mb-1"
                              style={{
                                fontSize: '14px',
                                color: '#1F2937'
                              }}
                            >
                              Certificado Revocado
                            </h4>
                            <p 
                              className="text-sm"
                              style={{ color: '#6B7280' }}
                            >
                              Este certificado ha sido revocado y no tiene validez. Por favor contacte con Registro Académico ESAP para más información.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* Resultado Inválido */
                  <div className="text-center py-8">
                    <div 
                      className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                      style={{
                        background: '#FEE2E2'
                      }}
                    >
                      <XCircle className="w-8 h-8 text-red-600" strokeWidth={2.5} />
                    </div>
                    
                    <h2 
                      className="font-bold mb-2"
                      style={{
                        fontSize: '24px',
                        lineHeight: '32px',
                        color: '#1F2937'
                      }}
                    >
                      Certificado No Válido
                    </h2>
                    
                    <p 
                      className="text-base mb-6"
                      style={{ color: '#6B7280' }}
                    >
                      {validationResult.error || 'No se encontró ningún certificado con el código ingresado'}
                    </p>

                    <div className="p-4 bg-red-50 border-2 border-red-200 text-left rounded-xl">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 
                            className="font-semibold mb-1"
                            style={{
                              fontSize: '14px',
                              color: '#1F2937'
                            }}
                          >
                            ¿Qué significa esto?
                          </h4>
                          <ul 
                            className="text-sm space-y-1 list-disc list-inside"
                            style={{ color: '#6B7280' }}
                          >
                            <li>El código ingresado no corresponde a ningún certificado emitido por la ESAP</li>
                            <li>El certificado puede haber sido falsificado</li>
                            <li>Puede haber un error en el código ingresado</li>
                            <li>El certificado puede haber sido generado en un sistema diferente</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Botón de Nueva Validación */}
                <button
                  onClick={handleReset}
                  className="w-full py-4 border-2 border-gray-300 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                  style={{ color: '#1F2937' }}
                >
                  Verificar Otro Certificado
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Footer Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mt-8"
        >
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl">
            <Shield className="w-5 h-5 text-[#003DA5]" />
            <span 
              className="font-medium"
              style={{
                fontSize: '14px',
                color: '#1F2937'
              }}
            >
              Sistema oficial de verificación - Escuela Superior de Administración Pública
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

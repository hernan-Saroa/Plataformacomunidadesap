import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  QrCode,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  FileText,
  User,
  Calendar,
  Building,
  Shield,
  ExternalLink,
  Camera
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { QRScannerModal } from './QRScannerModal';

interface ValidacionResult {
  isValid: boolean;
  certificado?: {
    consecutivo: string;
    codigoQR: string;
    empleado: {
      nombre: string;
      documento: string;
      cargo: string;
      dependencia: string;
    };
    fechaEmision: string;
    fechaVigencia?: string;
    firmadoPor: string;
    estado: 'VIGENTE' | 'VENCIDO' | 'ANULADO';
  };
  error?: string;
}

export function ValidarCertificadoQR() {
  const [codigoQR, setCodigoQR] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidacionResult | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const handleValidar = async () => {
    if (!codigoQR.trim()) {
      toast.error('Por favor ingresa un código QR');
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    // Simular llamado al servicio de validación
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock de respuesta - En producción sería una llamada real al backend
    const mockResult: ValidacionResult = {
      isValid: codigoQR.length > 5, // Simulación simple
      certificado: codigoQR.length > 5 ? {
        consecutivo: '001-2025-TH',
        codigoQR: codigoQR,
        empleado: {
          nombre: 'María Fernanda Rodríguez López',
          documento: '52.345.678',
          cargo: 'Docente Tiempo Completo',
          dependencia: 'Dirección Territorial Bogotá'
        },
        fechaEmision: '2025-11-20T08:35:00',
        fechaVigencia: '2026-11-20',
        firmadoPor: 'Dr. Juan Carlos Pérez - Director Talento Humano ESAP',
        estado: 'VIGENTE'
      } : undefined,
      error: codigoQR.length <= 5 ? 'Código QR inválido o certificado no encontrado' : undefined
    };

    setValidationResult(mockResult);
    setIsValidating(false);

    if (mockResult.isValid) {
      toast.success('Certificado validado correctamente');
    } else {
      toast.error('Certificado no válido');
    }
  };

  const handleReset = () => {
    setCodigoQR('');
    setValidationResult(null);
  };

  const handleQRCodeScanned = (scannedCode: string) => {
    setCodigoQR(scannedCode);
    setIsScannerOpen(false);
    handleValidar();
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
            <QrCode className="w-10 h-10 text-white" strokeWidth={2.5} />
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
            Validar Certificado Laboral
          </h1>
          
          <p 
            className="font-normal max-w-2xl mx-auto"
            style={{
              fontSize: '16px',
              lineHeight: '24px',
              color: '#6B7280'
            }}
          >
            Verifica la autenticidad de un certificado laboral emitido por la ESAP ingresando el código QR
          </p>
        </motion.div>

        {/* Card Principal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="bg-white rounded-2xl p-8 shadow-xl border-2 border-[#E5E7EB]">
            {/* Formulario de Validación */}
            {!validationResult && (
              <div className="space-y-6">
                <div>
                  <label 
                    htmlFor="codigoQR"
                    className="block font-semibold mb-3"
                    style={{
                      fontSize: '14px',
                      lineHeight: '20px',
                      color: '#1F2937'
                    }}
                  >
                    Código QR del Certificado
                  </label>
                  <div className="relative">
                    <QrCode 
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
                      style={{ color: '#9CA3AF' }}
                    />
                    <Input
                      id="codigoQR"
                      type="text"
                      placeholder="Ej: ESAP-CERT-2025-ABC123XYZ"
                      value={codigoQR}
                      onChange={(e) => setCodigoQR(e.target.value.toUpperCase())}
                      className="pl-12 pr-14 py-6 text-base border-2"
                      disabled={isValidating}
                      onKeyPress={(e) => e.key === 'Enter' && handleValidar()}
                    />
                    <button
                      type="button"
                      onClick={() => setIsScannerOpen(true)}
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
                    El código QR se encuentra impreso en la parte inferior del certificado
                  </p>
                </div>

                {/* Info Card */}
                <Card className="p-4 bg-blue-50 border-2 border-blue-200">
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
                        Todos los certificados laborales emitidos por la ESAP incluyen un código QR único que permite verificar su autenticidad en tiempo real. Este sistema garantiza la integridad y validez del documento.
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Botón de Validar */}
                <Button
                  onClick={handleValidar}
                  disabled={isValidating || !codigoQR.trim()}
                  className="w-full py-6 text-base font-semibold transition-all"
                  style={{
                    background: isValidating || !codigoQR.trim() ? '#D1D5DB' : '#003DA5',
                    color: '#FFFFFF'
                  }}
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Validando certificado...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5 mr-2" />
                      Validar Certificado
                    </>
                  )}
                </Button>
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
                          background: validationResult.certificado.estado === 'VIGENTE' 
                            ? '#ECFDF5' 
                            : validationResult.certificado.estado === 'VENCIDO'
                            ? '#FEF3C7'
                            : '#FEE2E2'
                        }}
                      >
                        {validationResult.certificado.estado === 'VIGENTE' ? (
                          <CheckCircle className="w-8 h-8 text-green-600" strokeWidth={2.5} />
                        ) : validationResult.certificado.estado === 'VENCIDO' ? (
                          <AlertCircle className="w-8 h-8 text-yellow-600" strokeWidth={2.5} />
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
                        {validationResult.certificado.estado === 'VIGENTE' 
                          ? 'Certificado Válido' 
                          : validationResult.certificado.estado === 'VENCIDO'
                          ? 'Certificado Vencido'
                          : 'Certificado Anulado'}
                      </h2>
                      
                      <Badge 
                        variant="outline"
                        className={`text-sm px-4 py-1 ${
                          validationResult.certificado.estado === 'VIGENTE'
                            ? 'bg-green-100 text-green-800 border-green-300'
                            : validationResult.certificado.estado === 'VENCIDO'
                            ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                            : 'bg-red-100 text-red-800 border-red-300'
                        }`}
                      >
                        {validationResult.certificado.estado}
                      </Badge>
                    </div>

                    {/* Detalles del Certificado */}
                    <Card className="p-6 bg-gray-50 border-2">
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
                            Consecutivo
                          </label>
                          <p 
                            className="font-semibold"
                            style={{
                              fontSize: '14px',
                              color: '#003DA5'
                            }}
                          >
                            {validationResult.certificado.consecutivo}
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
                            {validationResult.certificado.codigoQR}
                          </p>
                        </div>

                        <div>
                          <label 
                            className="text-xs font-semibold uppercase tracking-wide mb-1 block"
                            style={{ color: '#6B7280' }}
                          >
                            <User className="w-3 h-3 inline mr-1" />
                            Nombre Completo
                          </label>
                          <p 
                            className="font-medium"
                            style={{
                              fontSize: '14px',
                              color: '#1F2937'
                            }}
                          >
                            {validationResult.certificado.empleado.nombre}
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
                            CC {validationResult.certificado.empleado.documento}
                          </p>
                        </div>

                        <div>
                          <label 
                            className="text-xs font-semibold uppercase tracking-wide mb-1 block"
                            style={{ color: '#6B7280' }}
                          >
                            <FileText className="w-3 h-3 inline mr-1" />
                            Cargo
                          </label>
                          <p 
                            className="font-medium"
                            style={{
                              fontSize: '14px',
                              color: '#1F2937'
                            }}
                          >
                            {validationResult.certificado.empleado.cargo}
                          </p>
                        </div>

                        <div>
                          <label 
                            className="text-xs font-semibold uppercase tracking-wide mb-1 block"
                            style={{ color: '#6B7280' }}
                          >
                            <Building className="w-3 h-3 inline mr-1" />
                            Dependencia
                          </label>
                          <p 
                            className="font-medium"
                            style={{
                              fontSize: '14px',
                              color: '#1F2937'
                            }}
                          >
                            {validationResult.certificado.empleado.dependencia}
                          </p>
                        </div>

                        <div>
                          <label 
                            className="text-xs font-semibold uppercase tracking-wide mb-1 block"
                            style={{ color: '#6B7280' }}
                          >
                            <Calendar className="w-3 h-3 inline mr-1" />
                            Fecha de Emisión
                          </label>
                          <p 
                            className="font-medium"
                            style={{
                              fontSize: '14px',
                              color: '#1F2937'
                            }}
                          >
                            {new Date(validationResult.certificado.fechaEmision).toLocaleDateString('es-CO', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>

                        {validationResult.certificado.fechaVigencia && (
                          <div>
                            <label 
                              className="text-xs font-semibold uppercase tracking-wide mb-1 block"
                              style={{ color: '#6B7280' }}
                            >
                              Fecha de Vigencia
                            </label>
                            <p 
                              className="font-medium"
                              style={{
                                fontSize: '14px',
                                color: '#1F2937'
                              }}
                            >
                              {new Date(validationResult.certificado.fechaVigencia).toLocaleDateString('es-CO', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-300">
                        <label 
                          className="text-xs font-semibold uppercase tracking-wide mb-1 block"
                          style={{ color: '#6B7280' }}
                        >
                          <Shield className="w-3 h-3 inline mr-1" />
                          Firmado Electrónicamente Por
                        </label>
                        <p 
                          className="font-medium"
                          style={{
                            fontSize: '14px',
                            color: '#1F2937'
                          }}
                        >
                          {validationResult.certificado.firmadoPor}
                        </p>
                      </div>
                    </Card>

                    {/* Alerta adicional si está vencido o anulado */}
                    {validationResult.certificado.estado !== 'VIGENTE' && (
                      <Card className={`p-4 border-2 ${
                        validationResult.certificado.estado === 'VENCIDO'
                          ? 'bg-yellow-50 border-yellow-300'
                          : 'bg-red-50 border-red-300'
                      }`}>
                        <div className="flex items-start gap-3">
                          <AlertCircle 
                            className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                              validationResult.certificado.estado === 'VENCIDO'
                                ? 'text-yellow-600'
                                : 'text-red-600'
                            }`}
                          />
                          <div>
                            <h4 
                              className="font-semibold mb-1"
                              style={{
                                fontSize: '14px',
                                color: '#1F2937'
                              }}
                            >
                              {validationResult.certificado.estado === 'VENCIDO'
                                ? 'Certificado Vencido'
                                : 'Certificado Anulado'}
                            </h4>
                            <p 
                              className="text-sm"
                              style={{ color: '#6B7280' }}
                            >
                              {validationResult.certificado.estado === 'VENCIDO'
                                ? 'Este certificado ha superado su fecha de vigencia. Para obtener un certificado actualizado, el empleado debe solicitarlo nuevamente.'
                                : 'Este certificado ha sido anulado y no tiene validez. Por favor contacte con Talento Humano ESAP para más información.'}
                            </p>
                          </div>
                        </div>
                      </Card>
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
                      {validationResult.error || 'No se encontró ningún certificado con el código QR ingresado'}
                    </p>

                    <Card className="p-4 bg-red-50 border-2 border-red-200 text-left">
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
                            <li>El código QR ingresado no corresponde a ningún certificado emitido</li>
                            <li>El certificado puede haber sido falsificado</li>
                            <li>Puede haber un error en el código ingresado</li>
                          </ul>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}

                {/* Botón de Nueva Validación */}
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="w-full py-4 border-2 font-semibold"
                >
                  Validar Otro Certificado
                </Button>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Footer Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mt-8"
        >
          <Card className="inline-flex items-center gap-2 px-6 py-3 bg-white/80 backdrop-blur-sm border-2">
            <Shield className="w-5 h-5 text-[#003DA5]" />
            <span 
              className="font-medium"
              style={{
                fontSize: '14px',
                color: '#1F2937'
              }}
            >
              Sistema oficial de validación - Escuela Superior de Administración Pública
            </span>
          </Card>
        </motion.div>
      </div>
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onQRDetected={handleQRCodeScanned}
      />
    </div>
  );
}